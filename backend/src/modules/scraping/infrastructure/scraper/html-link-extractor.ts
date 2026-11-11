import { load } from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import type {
  ScrapeResult,
  ScrapedLinkData,
} from '../../domain/services/scraper.port';
import { isJavascriptUrl } from './html-fragment';
import { extractLinkName } from './link-name';

export const MAX_HREF_LENGTH = 2048;

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
    if (isJavascriptUrl(rawHref)) {
      return;
    }

    links.push({
      href: truncate(toAbsoluteUrl(rawHref, baseUrl), MAX_HREF_LENGTH),
      name: extractLinkName($, anchor),
    });
  });

  return { title: extractTitle($), links };
}

/** The document title; `<title>` elements inside inline SVG icons are ignored. */
function extractTitle($: CheerioAPI): string {
  const headTitle = $('head > title').first().text();
  const title =
    headTitle ||
    $('title')
      .filter((_, element) => $(element).closest('svg').length === 0)
      .first()
      .text();
  return title.replace(/\s+/g, ' ').trim();
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

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}…`;
}
