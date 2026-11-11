import { MAX_LINK_NAME_LENGTH, extractPageData } from './html-link-extractor';

const PAGE_URL = 'https://example.com/docs/index.html';

function page(body: string, head = '<title>Docs</title>'): string {
  return `<html><head>${head}</head><body>${body}</body></html>`;
}

describe('extractPageData', () => {
  it('uses the document title as the page name', () => {
    const result = extractPageData(
      page('', '<title>\n  My   Page \n</title>'),
      PAGE_URL,
    );
    expect(result.title).toBe('My Page');
  });

  it('returns an empty title when the document has none', () => {
    expect(extractPageData(page('', ''), PAGE_URL).title).toBe('');
  });

  it('uses the anchor href as the link and its text as the name', () => {
    const { links } = extractPageData(
      page('<a href="https://www.w3schools.com"> Visit W3Schools.com! </a>'),
      PAGE_URL,
    );
    expect(links).toEqual([
      { href: 'https://www.w3schools.com/', name: 'Visit W3Schools.com!' },
    ]);
  });

  it('keeps links in document order', () => {
    const { links } = extractPageData(
      page('<a href="/a">A</a><p><a href="/b">B</a></p><a href="/c">C</a>'),
      PAGE_URL,
    );
    expect(links.map((link) => link.name)).toEqual(['A', 'B', 'C']);
  });

  it('resolves relative hrefs against the page URL', () => {
    const { links } = extractPageData(
      page('<a href="/about">About</a><a href="guide.html">Guide</a>'),
      PAGE_URL,
    );
    expect(links.map((link) => link.href)).toEqual([
      'https://example.com/about',
      'https://example.com/docs/guide.html',
    ]);
  });

  it('honours the <base> element when resolving hrefs', () => {
    const { links } = extractPageData(
      page(
        '<a href="guide">Guide</a>',
        '<base href="https://cdn.example.org/v2/">',
      ),
      PAGE_URL,
    );
    expect(links[0].href).toBe('https://cdn.example.org/v2/guide');
  });

  it('stores the inner HTML when the body has no text', () => {
    const { links } = extractPageData(
      page('<a href="/home"><img src="logo.png" alt="Logo"></a>'),
      PAGE_URL,
    );
    expect(links[0].name).toBe('<img src="logo.png" alt="Logo">');
  });

  it('prefers the visible text when the body mixes elements and text', () => {
    const { links } = extractPageData(
      page(
        '<a href="/p"><img src="i.png"> <strong>This is</strong> a product</a>',
      ),
      PAGE_URL,
    );
    expect(links[0].name).toBe('This is a product');
  });

  it('truncates very long names', () => {
    const { links } = extractPageData(
      page(`<a href="/long">${'x'.repeat(MAX_LINK_NAME_LENGTH + 50)}</a>`),
      PAGE_URL,
    );
    expect(links[0].name).toHaveLength(MAX_LINK_NAME_LENGTH + 1);
    expect(links[0].name.endsWith('…')).toBe(true);
  });

  it('keeps every <a href> except javascript: pseudo-links', () => {
    const { links } = extractPageData(
      page(
        [
          '<a href="#top">Top</a>',
          '<a href="mailto:hi@example.com">Mail</a>',
          '<a href="JavaScript:void(0)">Script</a>',
          '<a name="anchor-without-href">No href</a>',
        ].join(''),
      ),
      PAGE_URL,
    );
    expect(links).toEqual([
      { href: 'https://example.com/docs/index.html#top', name: 'Top' },
      { href: 'mailto:hi@example.com', name: 'Mail' },
    ]);
  });

  it('keeps an href that cannot be parsed as a URL as-is', () => {
    const { links } = extractPageData(
      page('<a href="http://[bad">Bad</a>'),
      PAGE_URL,
    );
    expect(links[0].href).toBe('http://[bad');
  });
});
