import axios from 'axios';
import { AxiosCheerioScraper } from './axios-cheerio.scraper';

jest.mock('axios');
const mockedGet = jest.mocked(axios.get);

describe('AxiosCheerioScraper', () => {
  const scraper = new AxiosCheerioScraper();
  const html =
    '<html><head><title>Docs</title></head><body><a href="/about">About</a></body></html>';

  beforeEach(() => jest.resetAllMocks());

  it('downloads the page as text and extracts its data', async () => {
    mockedGet.mockResolvedValue({ data: html, request: {} });

    const result = await scraper.scrape('https://example.com/');

    expect(mockedGet).toHaveBeenCalledWith(
      'https://example.com/',
      expect.objectContaining({ responseType: 'text', timeout: 30_000 }),
    );
    expect(result).toEqual({
      title: 'Docs',
      links: [{ href: 'https://example.com/about', name: 'About' }],
    });
  });

  it('resolves relative links against the URL reached after redirects', async () => {
    mockedGet.mockResolvedValue({
      data: html,
      request: { res: { responseUrl: 'https://www.example.org/en/' } },
    });

    const result = await scraper.scrape('https://example.com/');

    expect(result.links[0].href).toBe('https://www.example.org/about');
  });

  it('propagates HTTP failures to the caller', async () => {
    mockedGet.mockRejectedValue(
      new Error('Request failed with status code 404'),
    );

    await expect(scraper.scrape('https://example.com/missing')).rejects.toThrow(
      'status code 404',
    );
  });
});
