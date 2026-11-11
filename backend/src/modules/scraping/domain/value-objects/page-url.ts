import { InvalidUrlError } from '../errors/invalid-url.error';

const SUPPORTED_PROTOCOLS = ['http:', 'https:'];

export class PageUrl {
  private constructor(public readonly value: string) {}

  static create(rawUrl: string): PageUrl {
    const trimmed = rawUrl.trim();
    if (!trimmed) {
      throw new InvalidUrlError('URL is required');
    }

    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      throw new InvalidUrlError('Invalid URL');
    }

    if (!SUPPORTED_PROTOCOLS.includes(parsed.protocol)) {
      throw new InvalidUrlError('Only HTTP and HTTPS URLs are supported');
    }

    return new PageUrl(parsed.toString());
  }
}
