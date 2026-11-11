import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { configureApp } from '../src/configure-app';
import { SCRAPE_QUEUE_PORT } from '../src/modules/scraping/application/ports/scrape-queue.port';
import { CreateScrapeJobUseCase } from '../src/modules/scraping/application/use-cases/create-scrape-job.use-case';
import { ListPageLinksUseCase } from '../src/modules/scraping/application/use-cases/list-page-links.use-case';
import { ListPagesUseCase } from '../src/modules/scraping/application/use-cases/list-pages.use-case';
import { ScrapedPage } from '../src/modules/scraping/domain/entities/scraped-page.entity';
import { PageStatus } from '../src/modules/scraping/domain/enums/page-status.enum';
import { LINK_REPOSITORY } from '../src/modules/scraping/domain/repositories/link.repository';
import { SCRAPED_PAGE_REPOSITORY } from '../src/modules/scraping/domain/repositories/scraped-page.repository';
import { PagesController } from '../src/modules/scraping/presentation/controllers/pages.controller';
import type {
  PageLinksResponse,
  PageResponse,
  PaginatedResponse,
} from '../src/modules/scraping/presentation/dto/page.response';
import {
  PAGE_ID,
  buildLink,
  buildPage,
  mockLinkRepository,
  mockScrapeQueue,
  mockScrapedPageRepository,
} from '../src/modules/scraping/testing/factories';

/**
 * HTTP contract tests: real controller, validation, filters and use cases,
 * with the persistence and queue ports replaced by mocks.
 */
describe('Pages HTTP API', () => {
  let app: INestApplication<App>;
  const pageRepository = mockScrapedPageRepository();
  const linkRepository = mockLinkRepository();
  const scrapeQueue = mockScrapeQueue();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PagesController],
      providers: [
        CreateScrapeJobUseCase,
        ListPagesUseCase,
        ListPageLinksUseCase,
        { provide: SCRAPED_PAGE_REPOSITORY, useValue: pageRepository },
        { provide: LINK_REPOSITORY, useValue: linkRepository },
        { provide: SCRAPE_QUEUE_PORT, useValue: scrapeQueue },
      ],
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
  });

  afterAll(() => app.close());

  beforeEach(() => jest.resetAllMocks());

  describe('POST /pages', () => {
    it('responds immediately with the page in progress and enqueues it', async () => {
      pageRepository.create.mockImplementation(({ id, url }) =>
        Promise.resolve(ScrapedPage.createInProgress(id, url)),
      );

      const response = await request(app.getHttpServer())
        .post('/pages')
        .send({ url: 'https://example.com' })
        .expect(201);

      const body = response.body as PageResponse;
      expect(body).toMatchObject({
        url: 'https://example.com/',
        status: PageStatus.IN_PROGRESS,
        title: null,
        linkCount: 0,
      });
      expect(scrapeQueue.enqueue).toHaveBeenCalledWith({
        pageId: body.id,
        url: 'https://example.com/',
      });
    });

    it.each([
      [{ url: 'not-a-url' }],
      [{ url: 'ftp://example.com' }],
      [{}],
      [{ url: 'https://example.com', extra: true }],
    ])('rejects the invalid payload %p with 400', async (payload) => {
      await request(app.getHttpServer())
        .post('/pages')
        .send(payload)
        .expect(400);
      expect(scrapeQueue.enqueue).not.toHaveBeenCalled();
    });

    it('returns 503 and fails the page when the queue is unavailable', async () => {
      pageRepository.create.mockImplementation(({ id, url }) =>
        Promise.resolve(ScrapedPage.createInProgress(id, url)),
      );
      scrapeQueue.enqueue.mockRejectedValue(new Error('Connection is closed'));

      const response = await request(app.getHttpServer())
        .post('/pages')
        .send({ url: 'https://example.com' })
        .expect(503);

      expect(response.body).toMatchObject({
        statusCode: 503,
        error: 'ScrapeQueueUnavailableError',
      });
      expect(pageRepository.markFailed).toHaveBeenCalled();
    });

    it('returns 500 rather than 400 when infrastructure fails', async () => {
      pageRepository.create.mockRejectedValue(new Error('database down'));

      await request(app.getHttpServer())
        .post('/pages')
        .send({ url: 'https://example.com' })
        .expect(500);
    });
  });

  describe('GET /pages', () => {
    it('returns a page of scraped pages with pagination metadata', async () => {
      pageRepository.findPaginated.mockResolvedValue({
        items: [buildPage({ status: PageStatus.IN_PROGRESS, title: null })],
        total: 11,
        page: 2,
        limit: 10,
        totalPages: 2,
      });

      const response = await request(app.getHttpServer())
        .get('/pages')
        .query({ page: 2, limit: 10 })
        .expect(200);

      const body = response.body as PaginatedResponse<PageResponse>;
      expect(body.data).toHaveLength(1);
      expect(body.data[0]).toMatchObject({
        id: PAGE_ID,
        status: 'IN_PROGRESS',
      });
      expect(body.meta).toEqual({
        total: 11,
        page: 2,
        limit: 10,
        totalPages: 2,
      });
      expect(pageRepository.findPaginated).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
      });
    });

    it.each([{ page: 0 }, { limit: 101 }, { page: 'abc' }])(
      'rejects invalid pagination %p with 400',
      async (query) => {
        await request(app.getHttpServer())
          .get('/pages')
          .query(query)
          .expect(400);
      },
    );
  });

  describe('GET /pages/:id/links', () => {
    it('returns the page and a page of its links', async () => {
      pageRepository.findById.mockResolvedValue(buildPage());
      linkRepository.findByPageId.mockResolvedValue({
        items: [buildLink()],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const response = await request(app.getHttpServer())
        .get(`/pages/${PAGE_ID}/links`)
        .expect(200);

      const body = response.body as PageLinksResponse;
      expect(body.page).toMatchObject({ id: PAGE_ID, title: 'Example Domain' });
      expect(body.data).toEqual([
        {
          id: 'link-1',
          name: 'More information...',
          href: 'https://www.iana.org/domains/example',
        },
      ]);
      expect(body.meta.totalPages).toBe(1);
    });

    it('returns 404 for an unknown page', async () => {
      pageRepository.findById.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get(`/pages/${PAGE_ID}/links`)
        .expect(404);
    });

    it('returns 400 for a malformed id', async () => {
      await request(app.getHttpServer())
        .get('/pages/not-a-uuid/links')
        .expect(400);
    });
  });
});
