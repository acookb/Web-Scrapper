import axios from 'axios';
import { AxiosCheerioScraper } from './axios-cheerio.scraper';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AxiosCheerioScraper', () => {
  const scraper = new AxiosCheerioScraper();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('extracts the page title and anchor links', async () => {
    mockedAxios.get.mockResolvedValue({
      data: `
        <html>
          <head><title>Docs Home</title></head>
          <body>
            <a href="/about">About Us</a>
            <a href="https://external.test"><img src="/logo.png" alt="Logo" /></a>
            <a href="javascript:void(0)">Ignore me</a>
          </body>
        </html>
      `,
      status: 200,
    } as never);

    const result = await scraper.scrape('https://example.com/docs');

    expect(result.title).toBe('Docs Home');
    expect(result.links).toEqual(
      expect.arrayContaining([
        {
          href: 'https://example.com/about',
          name: 'About Us',
        },
      ]),
    );
    expect(result.links.some((link) => link.href.includes('javascript'))).toBe(
      false,
    );
    const complex = result.links.find((link) =>
      link.href.startsWith('https://external.test'),
    );
    expect(complex?.name).toContain('<img');
  });

  it('propagates axios failures', async () => {
    mockedAxios.get.mockRejectedValue(new Error('network down'));
    await expect(scraper.scrape('https://example.com')).rejects.toThrow(
      'network down',
    );
  });
});
