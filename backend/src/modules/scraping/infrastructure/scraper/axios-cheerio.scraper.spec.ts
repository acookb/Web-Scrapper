import axios, { AxiosError, AxiosHeaders } from 'axios';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { PermanentScrapeError } from '../../domain/errors/permanent-scrape-error';
import { AxiosCheerioScraper } from './axios-cheerio.scraper';
import { BLOCKED_DESTINATION_CODE } from './destination-guard';
import type { ScraperOptions } from './scraper-options';

const OPTIONS: ScraperOptions = {
  timeoutMs: 30_000,
  maxBytes: 1024 * 1024,
  maxRedirects: 2,
  allowPrivateHosts: false,
};
const HTML =
  '<html><head><title>Docs</title></head><body><a href="/about">About</a></body></html>';

function response(
  status: number,
  body: string | Buffer = '',
  headers: Record<string, string> = { 'content-type': 'text/html' },
): AxiosResponse<ArrayBuffer> {
  return {
    status,
    statusText: '',
    data: (typeof body === 'string' ? Buffer.from(body) : body) as never,
    headers,
    config: { headers: new AxiosHeaders() },
  };
}

function axiosError(code?: string, status?: number): AxiosError {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
  return new AxiosError(
    status ? `Request failed with status code ${status}` : `failed (${code})`,
    code,
    config,
    {},
    status ? response(status) : undefined,
  );
}

describe('AxiosCheerioScraper', () => {
  const get = jest.spyOn(axios, 'get');
  const scraper = new AxiosCheerioScraper(OPTIONS);

  beforeEach(() => get.mockReset());
  afterAll(() => get.mockRestore());

  it('downloads the page and extracts its title and links', async () => {
    get.mockResolvedValue(response(200, HTML));

    const result = await scraper.scrape('https://example.com/');

    expect(get).toHaveBeenCalledWith(
      'https://example.com/',
      expect.objectContaining({
        responseType: 'arraybuffer',
        timeout: OPTIONS.timeoutMs,
        maxContentLength: OPTIONS.maxBytes,
        maxRedirects: 0,
        lookup: expect.any(Function) as unknown,
      }),
    );
    expect(result).toEqual({
      title: 'Docs',
      links: [{ href: 'https://example.com/about', name: 'About' }],
    });
  });

  it('follows redirects and resolves links against the final URL', async () => {
    get
      .mockResolvedValueOnce(
        response(301, '', { location: 'https://www.example.org/en/' }),
      )
      .mockResolvedValueOnce(response(200, HTML));

    const result = await scraper.scrape('https://example.com/');

    expect(get).toHaveBeenLastCalledWith(
      'https://www.example.org/en/',
      expect.any(Object),
    );
    expect(result.links[0].href).toBe('https://www.example.org/about');
  });

  it('stops after too many redirects', async () => {
    get.mockResolvedValue(response(302, '', { location: '/again' }));

    await expect(scraper.scrape('https://example.com/')).rejects.toThrow(
      new PermanentScrapeError('More than 2 redirects'),
    );
    expect(get).toHaveBeenCalledTimes(3);
  });

  it.each([
    'http://127.0.0.1/',
    'http://169.254.169.254/latest/meta-data/',
    'http://10.0.0.8/',
    'http://[::1]/',
  ])('refuses the private destination %s', async (url) => {
    await expect(scraper.scrape(url)).rejects.toBeInstanceOf(
      PermanentScrapeError,
    );
    expect(get).not.toHaveBeenCalled();
  });

  it('refuses a redirect to a private address', async () => {
    get.mockResolvedValueOnce(
      response(302, '', { location: 'http://169.254.169.254/' }),
    );

    await expect(scraper.scrape('https://example.com/')).rejects.toThrow(
      /not a public address/,
    );
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('allows private destinations when explicitly enabled', async () => {
    get.mockResolvedValue(response(200, HTML));
    const permissive = new AxiosCheerioScraper({
      ...OPTIONS,
      allowPrivateHosts: true,
    });

    await expect(permissive.scrape('http://127.0.0.1/')).resolves.toMatchObject(
      {
        title: 'Docs',
      },
    );
    expect(get.mock.calls[0][1]).not.toHaveProperty('lookup');
  });

  it('rejects content that is not HTML', async () => {
    get.mockResolvedValue(
      response(200, '%PDF-1.7', { 'content-type': 'application/pdf' }),
    );

    await expect(
      scraper.scrape('https://example.com/file.pdf'),
    ).rejects.toThrow(
      new PermanentScrapeError('Unsupported content type application/pdf'),
    );
  });

  it('decodes the charset announced by the server', async () => {
    const latin1 = Buffer.from(
      '<html><head><title>Caf\xe9</title></head><a href="/m">Men\xfa</a></html>',
      'latin1',
    );
    get.mockResolvedValue(
      response(200, latin1, {
        'content-type': 'text/html; charset=ISO-8859-1',
      }),
    );

    const result = await scraper.scrape('https://example.com/');

    expect(result.title).toBe('Café');
    expect(result.links[0].name).toBe('Menú');
  });

  it.each([
    [404, true],
    [403, true],
    [429, false],
    [408, false],
    [500, false],
    [503, false],
  ])('classifies HTTP %i as permanent=%p', async (status, permanent) => {
    get.mockRejectedValue(axiosError('ERR_BAD_RESPONSE', status));

    const error: unknown = await scraper
      .scrape('https://example.com/')
      .catch((e: unknown) => e);

    expect(error instanceof PermanentScrapeError).toBe(permanent);
    expect((error as Error).message).toContain(String(status));
  });

  it.each([
    [BLOCKED_DESTINATION_CODE, true],
    ['ENOTFOUND', true],
    ['ECONNABORTED', false],
    ['ECONNRESET', false],
  ])('classifies network error %s as permanent=%p', async (code, permanent) => {
    get.mockRejectedValue(axiosError(code));

    const error: unknown = await scraper
      .scrape('https://example.com/')
      .catch((e: unknown) => e);

    expect(error instanceof PermanentScrapeError).toBe(permanent);
  });

  it('treats an oversized response as permanent', async () => {
    const error = axiosError('ERR_BAD_RESPONSE');
    error.message = 'maxContentLength size of 1048576 exceeded';
    get.mockRejectedValue(error);

    await expect(scraper.scrape('https://example.com/')).rejects.toThrow(
      new PermanentScrapeError('Response is larger than 1048576 bytes'),
    );
  });
});
