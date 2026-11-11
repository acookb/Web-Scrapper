import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { load } from 'cheerio';
import {
  ScrapeResult,
  ScrapedLinkData,
  ScraperPort,
} from '../../domain/services/scraper.port';

const MAX_LINK_NAME_LENGTH = 500;
const REQUEST_TIMEOUT_MS = 30_000;

@Injectable()
export class AxiosCheerioScraper implements ScraperPort {
  async scrape(url: string): Promise<ScrapeResult> {
    const response = await axios.get<string>(url, {
      timeout: REQUEST_TIMEOUT_MS,
      responseType: 'text',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; WebScraperTechnicalTest/1.0; +https://example.local)',
        Accept: 'text/html,application/xhtml+xml',
      },
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400,
    });

    const $ = load(response.data);
    const title = $('title').first().text().trim() || url;
    const links: ScrapedLinkData[] = [];

    $('a[href]').each((_, element) => {
      const node = $(element);
      const href = (node.attr('href') || '').trim();
      if (!href) {
        return;
      }

      const absoluteHref = this.toAbsoluteUrl(url, href);
      if (!absoluteHref) {
        return;
      }

      links.push({
        href: absoluteHref,
        name: this.extractLinkName($, element),
      });
    });

    return { title, links };
  }

  // Cheerio's typings vary across versions; keep this adapter intentionally loose.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractLinkName($: any, element: any): string {
    const node = $(element);
    const hasComplexChildren =
      node.children().length > 0 &&
      node.find('img, svg, picture, video, iframe, object, embed').length > 0;

    let name: string;
    if (hasComplexChildren) {
      name = $.html(element) || node.text();
    } else {
      name =
        node.text().trim() ||
        node.attr('aria-label') ||
        node.attr('title') ||
        '';
      if (!name) {
        name = $.html(element) || absoluteFallback(node.attr('href'));
      }
    }

    const normalized = String(name).replace(/\s+/g, ' ').trim();
    if (normalized.length <= MAX_LINK_NAME_LENGTH) {
      return normalized || absoluteFallback(node.attr('href'));
    }

    return `${normalized.slice(0, MAX_LINK_NAME_LENGTH)}…`;
  }

  private toAbsoluteUrl(baseUrl: string, href: string): string | null {
    if (
      href.startsWith('javascript:') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.startsWith('#')
    ) {
      return null;
    }

    try {
      return new URL(href, baseUrl).toString();
    } catch {
      return null;
    }
  }
}

function absoluteFallback(href: string | undefined): string {
  return href?.trim() || '(empty)';
}
