import type { INestApplication } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createServer } from 'http';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import request from 'supertest';
import type { App } from 'supertest/types';
import { configureApp } from '../../src/configure-app';
import { CoreModule } from '../../src/core.module';
import { PageStatus } from '../../src/modules/scraping/domain/enums/page-status.enum';
import { PrismaService } from '../../src/modules/scraping/infrastructure/persistence/prisma.service';
import type {
  PageLinksResponse,
  PageResponse,
} from '../../src/modules/scraping/presentation/dto/page.response';
import { ScrapingWorkerModule } from '../../src/modules/scraping/scraping-worker.module';

const LINK_COUNT = 23;

const FIXTURES: Record<string, string> = {
  '/catalog': `
    <html><head><title>Google Product</title></head><body>
      ${Array.from(
        { length: LINK_COUNT - 1 },
        (_, i) => `<a href="/products/${i}">Product ${i}</a>`,
      ).join('\n')}
      <a href="/assets/image.png"><img src="something.png"></a>
      <a href="javascript:void(0)">Ignored</a>
    </body></html>`,
};

/**
 * End-to-end flow against real PostgreSQL and Redis: the HTTP API enqueues a
 * job and an in-process BullMQ worker scrapes a local fixture server.
 */
describe('Scraping flow (PostgreSQL + Redis)', () => {
  let app: INestApplication<App>;
  let fixtureServer: Server;
  let fixtureOrigin: string;

  beforeAll(async () => {
    Logger.overrideLogger(['error']);

    fixtureServer = createServer((req, res) => {
      const body = FIXTURES[req.url ?? ''];
      res.writeHead(body ? 200 : 500, { 'Content-Type': 'text/html' });
      res.end(body ?? 'boom');
    });
    await new Promise<void>((resolve) =>
      fixtureServer.listen(0, '127.0.0.1', resolve),
    );
    fixtureOrigin = `http://127.0.0.1:${(fixtureServer.address() as AddressInfo).port}`;

    const moduleRef = await Test.createTestingModule({
      imports: [CoreModule, ScrapingWorkerModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    await app
      .get(PrismaService)
      .$executeRawUnsafe('TRUNCATE TABLE links, scraped_pages CASCADE');
  });

  afterAll(async () => {
    await app.close();
    await new Promise((resolve) => fixtureServer.close(resolve));
  });

  async function addPage(path: string): Promise<PageResponse> {
    const response = await request(app.getHttpServer())
      .post('/pages')
      .send({ url: `${fixtureOrigin}${path}` })
      .expect(201);
    return response.body as PageResponse;
  }

  async function waitUntilProcessed(id: string): Promise<PageResponse> {
    const deadline = Date.now() + 25_000;
    while (Date.now() < deadline) {
      const response = await request(app.getHttpServer())
        .get('/pages')
        .expect(200);
      const page = (response.body as { data: PageResponse[] }).data.find(
        (item) => item.id === id,
      );
      if (page && page.status !== PageStatus.IN_PROGRESS) {
        return page;
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    throw new Error(`Page ${id} was not processed in time`);
  }

  it('scrapes a page in the background and paginates its links', async () => {
    const created = await addPage('/catalog');
    expect(created.status).toBe('IN_PROGRESS');

    const processed = await waitUntilProcessed(created.id);
    expect(processed).toMatchObject({
      status: 'COMPLETED',
      title: 'Google Product',
      linkCount: LINK_COUNT,
    });

    const lastPage = await request(app.getHttpServer())
      .get(`/pages/${created.id}/links`)
      .query({ page: 3, limit: 10 })
      .expect(200);
    const body = lastPage.body as PageLinksResponse;

    expect(body.meta).toEqual({
      total: LINK_COUNT,
      page: 3,
      limit: 10,
      totalPages: 3,
    });
    expect(body.data.map((link) => [link.name, link.href])).toEqual([
      ['Product 20', `${fixtureOrigin}/products/20`],
      ['Product 21', `${fixtureOrigin}/products/21`],
      ['<img src="something.png">', `${fixtureOrigin}/assets/image.png`],
    ]);
  });

  it('marks the page as failed once every retry is exhausted', async () => {
    const created = await addPage('/broken');

    const processed = await waitUntilProcessed(created.id);

    expect(processed.status).toBe('FAILED');
    expect(processed.errorMessage).toContain('500');
  });
});
