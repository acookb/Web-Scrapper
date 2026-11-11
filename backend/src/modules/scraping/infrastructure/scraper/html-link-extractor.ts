import { load } from 'cheerio';
import type { Cheerio } from 'cheerio';
import type { Element } from 'domhandler';
import type {
  ScrapeResult,
  ScrapedLinkData,
} from '../../domain/services/scraper.port';

export const MAX_LINK_NAME_LENGTH = 500;

/**
 * Parses an HTML document and returns its title plus every `<a href>` anchor
 * in document order. Links created via JavaScript are out of scope, so only
 * `javascript:` pseudo-URLs are discarded.
 */
export function extractPageData(
  html: string,
  documentUrl: string,
): ScrapeResult {
  const $ = load(html);
  const baseUrl = resolveBaseUrl(
    $('base[href]').first().attr('href'),
    documentUrl,
  );

  const links: ScrapedLinkData[] = [];
  $('a[href]').each((_, element) => {
    const anchor = $(element);
    const rawHref = (anchor.attr('href') ?? '').trim();
    if (rawHref.toLowerCase().startsWith('javascript:')) {
      return;
    }

    links.push({
      href: toAbsoluteUrl(rawHref, baseUrl),
      name: extractLinkName(anchor),
    });
  });

  return {
    title: collapseWhitespace($('title').first().text()),
    links,
  };
}

/**
 * The visible text is used as the link name. When the body has no text
 * (e.g. an image-only link) a truncated fragment of its inner HTML is kept.
 */
function extractLinkName(anchor: Cheerio<Element>): string {
  const text = collapseWhitespace(anchor.text());
  const name = text || collapseWhitespace(anchor.html() ?? '');
  return truncate(name, MAX_LINK_NAME_LENGTH);
}

function resolveBaseUrl(
  baseHref: string | undefined,
  documentUrl: string,
): string {
  if (!baseHref) {
    return documentUrl;
  }
  try {
    return new URL(baseHref, documentUrl).toString();
  } catch {
    return documentUrl;
  }
}

function toAbsoluteUrl(href: string, baseUrl: string): string {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return href;
  }
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}…`;
}
