import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { CreateScrapeJobUseCase } from '../src/modules/scraping/application/use-cases/create-scrape-job.use-case';
import { ListPageLinksUseCase } from '../src/modules/scraping/application/use-cases/list-page-links.use-case';
import { ListPagesUseCase } from '../src/modules/scraping/application/use-cases/list-pages.use-case';
import { SCRAPE_QUEUE_PORT } from '../src/modules/scraping/application/ports/scrape-queue.port';
import { LINK_REPOSITORY } from '../src/modules/scraping/domain/repositories/link.repository';
import { SCRAPED_PAGE_REPOSITORY } from '../src/modules/scraping/domain/repositories/scraped-page.repository';
import { ScrapedPage } from '../src/modules/scraping/domain/entities/scraped-page.entity';
import { Link } from '../src/modules/scraping/domain/entities/link.entity';
import { PageStatus } from '../src/modules/scraping/domain/enums/page-status.enum';
import { PagesController } from '../src/modules/scraping/presentation/controllers/pages.controller';
import { buildPaginatedResult } from '../src/shared/pagination';

describe('PagesController (e2e)', () => {
  let app: INestApplication<App>;
  const pages = new Map<string, ScrapedPage>();
  const linksByPage = new Map<string, Link[]>();

  const scrapedPageRepository = {
    create: jest.fn(async ({ id, url }: { id: string; url: string }) => {
      const page = ScrapedPage.createInProgress(id, url);
      pages.set(id, page);
      linksByPage.set(id, []);
      return page;
    }),
    findById: jest.fn(async (id: string) => pages.get(id) ?? null),
    findPaginated: jest.fn(
      async ({ page, limit }: { page: number; limit: number }) => {
        const items = Array.from(pages.values());
        const start = (page - 1) * limit;
        return buildPaginatedResult(
          items.slice(start, start + limit),
          items.length,
          page,
          limit,
        );
      },
    ),
    markCompleted: jest.fn(),
    markFailed: jest.fn(),
    updateStatus: jest.fn(),
  };

  const linkRepository = {
    findByPageId: jest.fn(
      async (
        pageId: string,
        { page, limit }: { page: number; limit: number },
      ) => {
        const items = linksByPage.get(pageId) ?? [];
        const start = (page - 1) * limit;
        return buildPaginatedResult(
          items.slice(start, start + limit),
          items.length,
          page,
          limit,
        );
      },
    ),
  };

  const scrapeQueue = {
    enqueue: jest.fn(async () => undefined),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PagesController],
      providers: [
        CreateScrapeJobUseCase,
        ListPagesUseCase,
        ListPageLinksUseCase,
        {
          provide: SCRAPED_PAGE_REPOSITORY,
          useValue: scrapedPageRepository,
        },
        {
          provide: LINK_REPOSITORY,
          useValue: linkRepository,
        },
        {
          provide: SCRAPE_QUEUE_PORT,
          useValue: scrapeQueue,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    pages.clear();
    linksByPage.clear();
    jest.clearAllMocks();
  });

  it('POST /pages creates a scrape job and returns in progress', async () => {
    const response = await request(app.getHttpServer())
      .post('/pages')
      .send({ url: 'https://example.com' })
      .expect(201);

    expect(response.body.status).toBe(PageStatus.IN_PROGRESS);
    expect(response.body.url).toBe('https://example.com/');
    expect(scrapeQueue.enqueue).toHaveBeenCalled();
  });

  it('POST /pages rejects invalid payloads', async () => {
    await request(app.getHttpServer())
      .post('/pages')
      .send({ url: 'not-valid' })
      .expect(400);
  });

  it('GET /pages returns paginated scraped pages', async () => {
    const page = ScrapedPage.createInProgress(
      '11111111-1111-1111-1111-111111111111',
      'https://example.com',
    );
    pages.set(page.id, page);

    const response = await request(app.getHttpServer())
      .get('/pages')
      .query({ page: 1, limit: 10 })
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].displayValue).toBe('in progress');
    expect(response.body.meta.total).toBe(1);
  });

  it('GET /pages/:id/links returns page links', async () => {
    const pageId = '11111111-1111-1111-1111-111111111111';
    const page = new ScrapedPage(
      pageId,
      'https://example.com',
      'Example',
      PageStatus.COMPLETED,
      1,
      null,
      new Date(),
      new Date(),
    );
    pages.set(pageId, page);
    linksByPage.set(pageId, [
      new Link('link-1', pageId, 'https://iana.org', 'IANA', new Date()),
    ]);

    const response = await request(app.getHttpServer())
      .get(`/pages/${pageId}/links`)
      .expect(200);

    expect(response.body.page.title).toBe('Example');
    expect(response.body.data[0]).toEqual(
      expect.objectContaining({
        name: 'IANA',
        href: 'https://iana.org',
      }),
    );
  });
});
