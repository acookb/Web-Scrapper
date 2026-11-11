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
    const first = await createPage('https://one.example/');
    const second = await createPage('https://two.example/');
    const third = await createPage('https://three.example/');

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

  it('records the error when a page fails', async () => {
    const page = await createPage();

    const failed = await pages.markFailed({
      pageId: page.id,
      errorMessage: 'timeout',
    });

    expect(failed).toMatchObject({
      status: PageStatus.FAILED,
      errorMessage: 'timeout',
    });
  });
});
