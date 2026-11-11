import { validateEnvironment } from './environment';

const DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';

describe('validateEnvironment', () => {
  it('applies defaults and converts numeric strings', () => {
    const environment = validateEnvironment({
      DATABASE_URL,
      REDIS_PORT: '6380',
      SCRAPE_CONCURRENCY: '8',
    });

    expect(environment).toMatchObject({
      DATABASE_URL,
      REDIS_HOST: 'localhost',
      REDIS_PORT: 6380,
      SCRAPE_CONCURRENCY: 8,
      SCRAPE_ATTEMPTS: 3,
      SCRAPER_ALLOW_PRIVATE_HOSTS: false,
    });
  });

  it.each([
    ['true', true],
    ['1', true],
    ['false', false],
    ['0', false],
  ])('parses SCRAPER_ALLOW_PRIVATE_HOSTS=%p as %p', (value, expected) => {
    expect(
      validateEnvironment({ DATABASE_URL, SCRAPER_ALLOW_PRIVATE_HOSTS: value })
        .SCRAPER_ALLOW_PRIVATE_HOSTS,
    ).toBe(expected);
  });

  it('fails fast when a required variable is missing', () => {
    expect(() => validateEnvironment({})).toThrow(/DATABASE_URL/);
  });

  it('rejects out-of-range values', () => {
    expect(() =>
      validateEnvironment({ DATABASE_URL, SCRAPE_CONCURRENCY: '0' }),
    ).toThrow(/SCRAPE_CONCURRENCY/);
  });
});
