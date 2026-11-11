import type { Cheerio, CheerioAPI } from 'cheerio';
import type { Element } from 'domhandler';
import { sanitizeInPlace, serializeChildrenWithin } from './html-fragment';

export const MAX_LINK_NAME_LENGTH = 500;

const NON_VISIBLE_ELEMENTS = 'script, style, noscript, template';
const BLOCK_ELEMENTS =
  'address, article, aside, blockquote, dd, div, dl, dt, figcaption, figure, footer, h1, h2, h3, h4, h5, h6, header, li, main, nav, ol, p, pre, section, table, td, th, tr, ul';

/**
 * The name of a link is its visible text. When the body has no text (for
 * example an image-only link) a sanitized, well-formed portion of its inner
 * HTML is stored instead.
 */
export function extractLinkName(
  $: CheerioAPI,
  anchor: Cheerio<Element>,
): string {
  return visibleText(anchor) || htmlFragment($, anchor);
}

function visibleText(anchor: Cheerio<Element>): string {
  const copy = anchor.clone();
  copy.find(NON_VISIBLE_ELEMENTS).remove();
  copy.find('br').replaceWith(' ');
  // Block elements render on separate lines; keep their words apart.
  copy.find(BLOCK_ELEMENTS).after(' ');

  const text = copy.text().replace(/\s+/g, ' ').trim();
  return text.length <= MAX_LINK_NAME_LENGTH
    ? text
    : `${text.slice(0, MAX_LINK_NAME_LENGTH)}…`;
}

function htmlFragment($: CheerioAPI, anchor: Cheerio<Element>): string {
  const copy = anchor.clone().get(0);
  if (!copy) {
    return '';
  }
  sanitizeInPlace($, copy);
  return serializeChildrenWithin($, copy, MAX_LINK_NAME_LENGTH);
}
