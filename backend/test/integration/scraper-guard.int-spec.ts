import { createServer } from 'http';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { PermanentScrapeError } from '../../src/modules/scraping/domain/errors/permanent-scrape-error';
import { AxiosCheerioScraper } from '../../src/modules/scraping/infrastructure/scraper/axios-cheerio.scraper';

/**
 * Real network requests against a local server, with the SSRF guard on: a
 * public scraper must never reach services on the host or its private network.
 */
describe('Scraper SSRF guard (real sockets)', () => {
  let server: Server;
  let port: number;
  let requests = 0;
  const scraper = new AxiosCheerioScraper({
    timeoutMs: 5000,
    maxBytes: 1024 * 1024,
    maxRedirects: 5,
    allowPrivateHosts: false,
  });

  beforeAll(async () => {
    server = createServer((_req, res) => {
      requests += 1;
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<title>Internal admin</title>');
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    port = (server.address() as AddressInfo).port;
  });

  afterAll(() => new Promise((resolve) => server.close(resolve)));

  it.each(['127.0.0.1', 'localhost', '[::1]'])(
    'refuses to connect to %s',
    async (host) => {
      await expect(
        scraper.scrape(`http://${host}:${port}/`),
      ).rejects.toBeInstanceOf(PermanentScrapeError);
      expect(requests).toBe(0);
    },
  );
});
