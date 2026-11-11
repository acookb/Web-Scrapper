import { randomUUID } from 'crypto';
import { PageStatus } from '../../src/modules/scraping/domain/enums/page-status.enum';
import { PrismaLinkRepository } from '../../src/modules/scraping/infrastructure/persistence/prisma-link.repository';
import { PrismaScrapedPageRepository } from '../../src/modules/scraping/infrastructure/persistence/prisma-scraped-page.repository';
import { PrismaService } from '../../src/modules/scraping/infrastructure/persistence/prisma.service';

describe('Prisma repositories (PostgreSQL)', () => {
  const prisma = new PrismaService();
  const pages = new PrismaScrapedPageRepository(prisma);
  const links = new PrismaLinkRepository(prisma);

  beforeAll(() => prisma.$connect());
  afterAll(() => prisma.$disconnect());
  beforeEach(() =>
    prisma.$executeRawUnsafe('TRUNCATE TABLE links, scraped_pages CASCADE'),
  );

  function createPage(url = 'https://example.com/') {
    return pages.create({ id: randomUUID(), url });
  }

  it('creates pages in progress with no links', async () => {
    const page = await createPage();

    expect(page).toMatchObject({
      status: PageStatus.IN_PROGRESS,
      title: null,
      linkCount: 0,
    });
    await expect(pages.findById(page.id)).resolves.toEqual(page);
  });

  it('returns null for an unknown page', async () => {
    await expect(pages.findById(randomUUID())).resolves.toBeNull();
  });

  it('lists the most recently added pages first', async () => {
    const createdAt = (minute: number) =>
      new Date(`2024-01-01T00:0${minute}:00.000Z`);
    const [first, second, third] = await Promise.all(
      [1, 2, 3].map((minute) =>
        prisma.scrapedPage.create({
          data: {
            id: randomUUID(),
            url: `https://${minute}.example/`,
            createdAt: createdAt(minute),
          },
        }),
      ),
    );

    const firstPage = await pages.findPaginated({ page: 1, limit: 2 });
    const secondPage = await pages.findPaginated({ page: 2, limit: 2 });

    expect(firstPage.items.map((p) => p.id)).toEqual([third.id, second.id]);
    expect(secondPage.items.map((p) => p.id)).toEqual([first.id]);
    expect(firstPage).toMatchObject({ total: 3, totalPages: 2 });
  });

  it('stores the title and links when a page completes', async () => {
    const page = await createPage();

    const completed = await pages.markCompleted({
      pageId: page.id,
      title: 'Example Domain',
      links: [
        { href: 'https://a.example/', name: 'A' },
        { href: 'https://b.example/', name: '<img src="b.png">' },
      ],
    });

    expect(completed).toMatchObject({
      status: PageStatus.COMPLETED,
      title: 'Example Domain',
      linkCount: 2,
    });
    const stored = await links.findByPageId(page.id, { page: 1, limit: 10 });
    expect(stored.items.map((l) => [l.name, l.href])).toEqual([
      ['A', 'https://a.example/'],
      ['<img src="b.png">', 'https://b.example/'],
    ]);
  });

  it('paginates links in document order', async () => {
    const page = await createPage();
    const scraped = Array.from({ length: 25 }, (_, i) => ({
      href: `https://example.com/${i}`,
      name: `Link ${i}`,
    }));
    await pages.markCompleted({ pageId: page.id, title: 'T', links: scraped });

    const third = await links.findByPageId(page.id, { page: 3, limit: 10 });

    expect(third.items.map((l) => l.name)).toEqual([
      'Link 20',
      'Link 21',
      'Link 22',
      'Link 23',
      'Link 24',
    ]);
    expect(third).toMatchObject({ total: 25, totalPages: 3 });
  });

  it('replaces previous links when a page is processed again', async () => {
    const page = await createPage();
    await pages.markCompleted({
      pageId: page.id,
      title: 'T',
      links: [{ href: 'https://old.example/', name: 'Old' }],
    });

    await pages.markCompleted({
      pageId: page.id,
      title: 'T',
      links: [{ href: 'https://new.example/', name: 'New' }],
    });

    const stored = await links.findByPageId(page.id, { page: 1, limit: 10 });
    expect(stored.items.map((l) => l.name)).toEqual(['New']);
  });

  it('records the error when an in-progress page fails', async () => {
    const page = await createPage();

    await expect(
      pages.markFailed({ pageId: page.id, errorMessage: 'timeout' }),
    ).resolves.toBe(true);

    await expect(pages.findById(page.id)).resolves.toMatchObject({
      status: PageStatus.FAILED,
      errorMessage: 'timeout',
    });
  });

  it('never fails a page that already completed', async () => {
    const page = await createPage();
    await pages.markCompleted({ pageId: page.id, title: 'Done', links: [] });

    await expect(
      pages.markFailed({ pageId: page.id, errorMessage: 'late failure' }),
    ).resolves.toBe(false);
    await expect(pages.findById(page.id)).resolves.toMatchObject({
      status: PageStatus.COMPLETED,
      errorMessage: null,
    });
  });

  it('fails only pages that have been in progress for too long', async () => {
    const stale = await createPage('https://stale.example/');
    const finished = await createPage('https://finished.example/');
    await pages.markCompleted({ pageId: finished.id, title: 'T', links: [] });
    const cutoff = new Date(Date.now() + 1000);
    const fresh = await prisma.scrapedPage.create({
      data: {
        id: randomUUID(),
        url: 'https://fresh.example/',
        createdAt: new Date(cutoff.getTime() + 60_000),
      },
    });

    await expect(pages.failStale(cutoff, 'Processing timed out')).resolves.toBe(
      1,
    );

    await expect(pages.findById(stale.id)).resolves.toMatchObject({
      status: PageStatus.FAILED,
      errorMessage: 'Processing timed out',
    });
    await expect(pages.findById(finished.id)).resolves.toMatchObject({
      status: PageStatus.COMPLETED,
    });
    await expect(pages.findById(fresh.id)).resolves.toMatchObject({
      status: PageStatus.IN_PROGRESS,
    });
  });
});
