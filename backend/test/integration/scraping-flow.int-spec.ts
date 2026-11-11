import type { INestApplication } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { createServer } from 'http';
import type { IncomingMessage, Server, ServerResponse } from 'http';
import type { AddressInfo } from 'net';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/configure-app';
import { PageStatus } from '../../src/modules/scraping/domain/enums/page-status.enum';
import { PrismaService } from '../../src/modules/scraping/infrastructure/persistence/prisma.service';
import type {
  PageLinksResponse,
  PageResponse,
} from '../../src/modules/scraping/presentation/dto/page.response';
import { WorkerModule } from '../../src/worker.module';

const LINK_COUNT = 23;
const SLOW_RESPONSE_MS = 1500;

const CATALOG = `
  <html><head><title>Google Product</title></head><body>
    ${Array.from(
      { length: LINK_COUNT - 1 },
      (_, i) => `<a href="/products/${i}">Product ${i}</a>`,
    ).join('\n')}
    <a href="/assets/image.png"><img src="something.png" onerror="steal()"></a>
    <a href="javascript:void(0)">Ignored</a>
  </body></html>`;

type Route = (res: ServerResponse) => void;

const html =
  (body: string, status = 200): Route =>
  (res) => {
    res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(body);
  };

const ROUTES: Record<string, Route> = {
  '/catalog': html(CATALOG),
  '/fast': html('<title>Fast</title><a href="/x">X</a>'),
  '/slow': (res) =>
    setTimeout(() => html('<title>Slow</title>')(res), SLOW_RESPONSE_MS),
  '/missing': html('Not found', 404),
  '/broken': html('boom', 500),
  '/report.pdf': (res) => {
    res.writeHead(200, { 'Content-Type': 'application/pdf' });
    res.end('%PDF-1.7');
  },
};

/**
 * End-to-end flow against real PostgreSQL and Redis: the HTTP API enqueues a
 * job and a separately booted worker scrapes a local fixture server.
 */
describe('Scraping flow (PostgreSQL + Redis)', () => {
  let app: INestApplication<App>;
  let worker: TestingModule;
  let fixtureServer: Server;
  let fixtureOrigin: string;
  const hits = new Map<string, number>();

  beforeAll(async () => {
    Logger.overrideLogger(['error']);

    fixtureServer = createServer((req: IncomingMessage, res) => {
      const path = req.url ?? '';
      hits.set(path, (hits.get(path) ?? 0) + 1);
      (ROUTES[path] ?? html('Not found', 404))(res);
    });
    await new Promise<void>((resolve) =>
      fixtureServer.listen(0, '127.0.0.1', resolve),
    );
    fixtureOrigin = `http://127.0.0.1:${(fixtureServer.address() as AddressInfo).port}`;

    // API and worker boot from their own root modules, exactly as
    // `node dist/main` and `node dist/worker` do in production.
    const apiModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = apiModule.createNestApplication();
    configureApp(app);
    await app.init();

    worker = await Test.createTestingModule({
      imports: [WorkerModule],
    }).compile();
    await worker.init();

    await app
      .get(PrismaService)
      .$executeRawUnsafe('TRUNCATE TABLE links, scraped_pages CASCADE');
  });

  afterAll(async () => {
    await worker.close();
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
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
      const response = await request(app.getHttpServer())
        .get('/pages')
        .query({ limit: 100 })
        .expect(200);
      const page = (response.body as { data: PageResponse[] }).data.find(
        (item) => item.id === id,
      );
      if (page && page.status !== PageStatus.IN_PROGRESS) {
        return page;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Page ${id} was not processed in time`);
  }

  it('reports PostgreSQL and Redis as healthy', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      info: { database: { status: 'up' }, redis: { status: 'up' } },
    });
  });

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

  it('does not let a slow page hold back a fast one', async () => {
    const slow = await addPage('/slow');
    const fast = await addPage('/fast');

    const fastResult = await waitUntilProcessed(fast.id);
    const slowAtThatMoment = await request(app.getHttpServer())
      .get(`/pages/${slow.id}/links`)
      .expect(200);

    expect(fastResult.status).toBe('COMPLETED');
    expect((slowAtThatMoment.body as PageLinksResponse).page.status).toBe(
      'IN_PROGRESS',
    );
    await expect(waitUntilProcessed(slow.id)).resolves.toMatchObject({
      status: 'COMPLETED',
      title: 'Slow',
    });
  });

  it('retries transient failures and fails the page once attempts run out', async () => {
    const created = await addPage('/broken');

    const processed = await waitUntilProcessed(created.id);

    expect(processed.status).toBe('FAILED');
    expect(processed.errorMessage).toContain('500');
    expect(hits.get('/broken')).toBe(3);
  });

  it.each([
    ['/missing', 'status code 404'],
    ['/report.pdf', 'Unsupported content type application/pdf'],
  ])('fails %s on the first attempt', async (path, message) => {
    const created = await addPage(path);

    const processed = await waitUntilProcessed(created.id);

    expect(processed.status).toBe('FAILED');
    expect(processed.errorMessage).toContain(message);
    expect(hits.get(path)).toBe(1);
  });
});
