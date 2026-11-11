import { Inject, Injectable } from '@nestjs/common';
import axios from 'axios';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { decodeBuffer } from 'encoding-sniffer';
import { PermanentScrapeError } from '../../domain/errors/permanent-scrape-error';
import type {
  ScrapeResult,
  ScraperPort,
} from '../../domain/services/scraper.port';
import {
  BLOCKED_DESTINATION_CODE,
  assertPublicIpLiteral,
  publicOnlyLookup,
} from './destination-guard';
import { extractPageData } from './html-link-extractor';
import { SCRAPER_OPTIONS } from './scraper-options';
import type { ScraperOptions } from './scraper-options';

const HTML_MIME_TYPES = new Set(['text/html', 'application/xhtml+xml']);
const SUPPORTED_PROTOCOLS = new Set(['http:', 'https:']);
/** 4xx responses worth retrying; every other 4xx is permanent. */
const RETRYABLE_CLIENT_STATUSES = new Set([408, 425, 429]);

@Injectable()
export class AxiosCheerioScraper implements ScraperPort {
  constructor(
    @Inject(SCRAPER_OPTIONS) private readonly options: ScraperOptions,
  ) {}

  /**
   * Redirects are followed manually so that every hop goes through the SSRF
   * guard and relative links resolve against the final URL.
   */
  async scrape(url: string): Promise<ScrapeResult> {
    let currentUrl = url;

    for (let redirects = 0; ; redirects += 1) {
      const response = await this.request(currentUrl);
      if (response.status < 300) {
        return this.parse(response, currentUrl);
      }

      const location: unknown = response.headers['location'];
      if (typeof location !== 'string' || !location) {
        throw new PermanentScrapeError(
          `Redirect (${response.status}) without a Location header`,
        );
      }
      if (redirects >= this.options.maxRedirects) {
        throw new PermanentScrapeError(
          `More than ${this.options.maxRedirects} redirects`,
        );
      }
      currentUrl = new URL(location, currentUrl).toString();
    }
  }

  private async request(url: string): Promise<AxiosResponse<ArrayBuffer>> {
    const target = new URL(url);
    if (!SUPPORTED_PROTOCOLS.has(target.protocol)) {
      throw new PermanentScrapeError(`Unsupported protocol ${target.protocol}`);
    }
    if (!this.options.allowPrivateHosts) {
      assertPublicIpLiteral(target);
    }

    const config: AxiosRequestConfig = {
      responseType: 'arraybuffer',
      timeout: this.options.timeoutMs,
      maxContentLength: this.options.maxBytes,
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WebScraperTechnicalTest/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
    };
    if (!this.options.allowPrivateHosts) {
      config.lookup = publicOnlyLookup as AxiosRequestConfig['lookup'];
    }

    try {
      return await axios.get<ArrayBuffer>(url, config);
    } catch (error) {
      throw this.classify(error, target.hostname);
    }
  }

  private parse(
    response: AxiosResponse<ArrayBuffer>,
    url: string,
  ): ScrapeResult {
    const contentType = String(response.headers['content-type'] ?? '');
    const mimeType = contentType.split(';')[0].trim().toLowerCase();
    if (mimeType && !HTML_MIME_TYPES.has(mimeType)) {
      throw new PermanentScrapeError(`Unsupported content type ${mimeType}`);
    }

    const charset = /charset=["']?([^;"'\s]+)/i.exec(contentType)?.[1];
    const html = decodeBuffer(Buffer.from(response.data), {
      transportLayerEncodingLabel: charset,
    });
    return extractPageData(html, url);
  }

  /** Errors that retrying cannot fix become PermanentScrapeError. */
  private classify(error: unknown, host: string): unknown {
    if (!axios.isAxiosError(error)) {
      return error;
    }
    if (error.code === BLOCKED_DESTINATION_CODE) {
      return new PermanentScrapeError(error.message);
    }

    const status = error.response?.status;
    if (status !== undefined) {
      return status < 500 && !RETRYABLE_CLIENT_STATUSES.has(status)
        ? new PermanentScrapeError(`Request failed with status code ${status}`)
        : error;
    }
    if (error.code === 'ENOTFOUND') {
      return new PermanentScrapeError(`Host ${host} could not be resolved`);
    }
    if (error.message.includes('maxContentLength')) {
      return new PermanentScrapeError(
        `Response is larger than ${this.options.maxBytes} bytes`,
      );
    }
    return error;
  }
}
