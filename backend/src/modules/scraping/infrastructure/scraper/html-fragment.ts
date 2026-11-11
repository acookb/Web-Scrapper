import type { CheerioAPI } from 'cheerio';
import { isTag, isText } from 'domhandler';
import type { AnyNode, Element } from 'domhandler';

const REMOVED_ELEMENTS =
  'script, style, iframe, object, embed, noscript, template, frame, frameset';
const URL_ATTRIBUTES = new Set([
  'href',
  'src',
  'xlink:href',
  'action',
  'formaction',
  'poster',
]);
const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
]);
const ELLIPSIS = '…';
const MIN_ATTRIBUTE_LENGTH = 8;

/**
 * Removes active content from a detached element tree: script-like elements,
 * `on*` event handlers and `javascript:` URLs. Whitespace in text is collapsed.
 */
export function sanitizeInPlace($: CheerioAPI, root: Element): void {
  const tree = $(root);
  tree.find(REMOVED_ELEMENTS).remove();

  tree.find('*').each((_, element) => {
    for (const [name, value] of Object.entries(element.attribs)) {
      if (name.startsWith('on') || isUnsafeUrlAttribute(name, value)) {
        delete element.attribs[name];
      }
    }
  });

  normalizeText(root);
}

/**
 * Serializes the children of `root` without exceeding `maxLength`, always
 * cutting on node boundaries so the result is well-formed HTML. When content
 * is dropped an ellipsis is appended.
 */
export function serializeChildrenWithin(
  $: CheerioAPI,
  root: Element,
  maxLength: number,
): string {
  return serializeNodes($, root.children, maxLength).trim();
}

function serializeNodes(
  $: CheerioAPI,
  nodes: AnyNode[],
  budget: number,
): string {
  let output = '';

  for (const node of nodes) {
    const html = $.html(node);
    if (output.length + html.length <= budget) {
      output += html;
      continue;
    }

    // Only shorten a node when nothing fits before it; otherwise stop at the
    // previous complete node.
    const tail = output ? '' : shortenNode($, node, budget);
    return output + tail + ELLIPSIS;
  }

  return output;
}

function shortenNode($: CheerioAPI, node: AnyNode, budget: number): string {
  if (isText(node)) {
    return (
      $('<i>')
        .text(node.data.slice(0, Math.max(0, budget)))
        .html() ?? ''
    );
  }
  if (!isTag(node)) {
    return '';
  }

  const attributes = fitAttributes($, node, budget);
  const copy = $(`<${node.name}>`).attr(attributes);
  if (VOID_ELEMENTS.has(node.name)) {
    return $.html(copy);
  }

  const emptyLength = $.html(copy).length;
  copy.html(serializeNodes($, node.children, budget - emptyLength));
  return $.html(copy);
}

/** Halves the longest attribute value until the opening tag fits `budget`. */
function fitAttributes(
  $: CheerioAPI,
  element: Element,
  budget: number,
): Record<string, string> {
  const attributes = { ...element.attribs };
  const tagLength = () =>
    $.html($(`<${element.name}>`).attr(attributes)).length;

  while (tagLength() > budget) {
    const [longest] = Object.entries(attributes).sort(
      ([, a], [, b]) => b.length - a.length,
    );
    if (!longest) {
      break;
    }

    const [name, value] = longest;
    if (value.length <= MIN_ATTRIBUTE_LENGTH) {
      delete attributes[name];
    } else {
      attributes[name] =
        value.slice(0, Math.floor(value.length / 2)) + ELLIPSIS;
    }
  }

  return attributes;
}

/**
 * Browsers ignore whitespace and control characters inside URL schemes, so
 * `java\tscript:` is still executable and must be detected too.
 */
export function isJavascriptUrl(value: string): boolean {
  const compact = Array.from(value)
    .filter((char) => char.charCodeAt(0) > 0x20)
    .join('');
  return compact.toLowerCase().startsWith('javascript:');
}

function isUnsafeUrlAttribute(name: string, value: string): boolean {
  return URL_ATTRIBUTES.has(name) && isJavascriptUrl(value);
}

function normalizeText(node: AnyNode): void {
  if (isText(node)) {
    node.data = node.data.replace(/\s+/g, ' ');
  } else if (isTag(node)) {
    node.children.forEach(normalizeText);
  }
}
