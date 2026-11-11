import { InvalidUrlError } from '../errors/invalid-url.error';
import { PageUrl } from './page-url';

describe('PageUrl', () => {
  it('normalizes a valid http(s) URL', () => {
    expect(PageUrl.create('  https://example.com  ').value).toBe(
      'https://example.com/',
    );
  });

  it.each([
    ['', 'URL is required'],
    ['   ', 'URL is required'],
    ['not-a-url', 'Invalid URL'],
    ['ftp://files.example.com', 'Only HTTP and HTTPS URLs are supported'],
  ])('rejects %p', (input, message) => {
    expect(() => PageUrl.create(input)).toThrow(new InvalidUrlError(message));
  });
});
