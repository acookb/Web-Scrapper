import { Injectable } from '@nestjs/common';
import axios from 'axios';
import type {
  ScrapeResult,
  ScraperPort,
} from '../../domain/services/scraper.port';
import { extractPageData } from './html-link-extractor';

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RESPONSE_BYTES = 10 * 1024 * 1024;

@Injectable()
export class AxiosCheerioScraper implements ScraperPort {
  async scrape(url: string): Promise<ScrapeResult> {
    const response = await axios.get<string>(url, {
      timeout: REQUEST_TIMEOUT_MS,
      maxContentLength: MAX_RESPONSE_BYTES,
      maxRedirects: 5,
      responseType: 'text',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WebScraperTechnicalTest/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    return extractPageData(response.data, finalUrl(response.request, url));
  }
}

/** Relative links must be resolved against the URL reached after redirects. */
function finalUrl(request: unknown, requestedUrl: string): string {
  const responseUrl = (
    request as { res?: { responseUrl?: unknown } } | undefined
  )?.res?.responseUrl;
  return typeof responseUrl === 'string' ? responseUrl : requestedUrl;
}
