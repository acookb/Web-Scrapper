import { load } from 'cheerio';
import { MAX_HREF_LENGTH, extractPageData } from './html-link-extractor';
import { MAX_LINK_NAME_LENGTH } from './link-name';

const PAGE_URL = 'https://example.com/docs/index.html';

function page(body: string, head = '<title>Docs</title>'): string {
  return `<html><head>${head}</head><body>${body}</body></html>`;
}

function linkNames(body: string): string[] {
  return extractPageData(page(body), PAGE_URL).links.map((link) => link.name);
}

function isWellFormed(fragment: string): boolean {
  return load(fragment, null, false).html() === fragment;
}

describe('extractPageData', () => {
  describe('page title', () => {
    it('uses the document title with whitespace collapsed', () => {
      const result = extractPageData(
        page('', '<title>\n  My   Page \n</title>'),
        PAGE_URL,
      );
      expect(result.title).toBe('My Page');
    });

    it('returns an empty title when the document has none', () => {
      expect(extractPageData(page('', ''), PAGE_URL).title).toBe('');
    });

    it('ignores <title> elements of inline SVG icons', () => {
      const html = page('<svg><title>Close icon</title></svg>', '');
      expect(extractPageData(html, PAGE_URL).title).toBe('');
    });

    it('prefers the head title over SVG titles in the body', () => {
      const html = page(
        '<svg><title>Icon</title></svg>',
        '<title>Real</title>',
      );
      expect(extractPageData(html, PAGE_URL).title).toBe('Real');
    });
  });

  describe('link URL', () => {
    it('uses the href as the link and the body as the name', () => {
      const { links } = extractPageData(
        page('<a href="https://www.w3schools.com"> Visit W3Schools.com! </a>'),
        PAGE_URL,
      );
      expect(links).toEqual([
        { href: 'https://www.w3schools.com/', name: 'Visit W3Schools.com!' },
      ]);
    });

    it('keeps links in document order', () => {
      expect(
        linkNames(
          '<a href="/a">A</a><p><a href="/b">B</a></p><a href="/c">C</a>',
        ),
      ).toEqual(['A', 'B', 'C']);
    });

    it('resolves relative hrefs against the page URL', () => {
      const { links } = extractPageData(
        page(
          '<a href="/about">About</a><a href="guide.html">Guide</a><a href="../up">Up</a>',
        ),
        PAGE_URL,
      );
      expect(links.map((link) => link.href)).toEqual([
        'https://example.com/about',
        'https://example.com/docs/guide.html',
        'https://example.com/up',
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

    it('keeps every <a href> except javascript: pseudo-links', () => {
      const { links } = extractPageData(
        page(
          [
            '<a href="#top">Top</a>',
            '<a href="mailto:hi@example.com">Mail</a>',
            '<a href="JavaScript:void(0)">Script</a>',
            '<a href=" java\tscript:alert(1)">Obfuscated</a>',
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

    it('truncates huge hrefs such as data: URIs', () => {
      const { links } = extractPageData(
        page(`<a href="data:text/plain,${'x'.repeat(5000)}">Data</a>`),
        PAGE_URL,
      );
      expect(links[0].href).toHaveLength(MAX_HREF_LENGTH + 1);
      expect(links[0].href.endsWith('…')).toBe(true);
    });
  });

  describe('link name as text', () => {
    it('separates words split by <br> and block elements', () => {
      expect(
        linkNames(
          '<a href="/a">Hello<br>World</a><a href="/b"><div>Block A</div><div>Block B</div></a>',
        ),
      ).toEqual(['Hello World', 'Block A Block B']);
    });

    it('collapses line breaks and decodes entities', () => {
      expect(
        linkNames('<a href="/x">\n  Fish &amp;\n Chips&nbsp;now </a>'),
      ).toEqual(['Fish & Chips now']);
    });

    it('prefers the visible text when the body mixes elements and text', () => {
      expect(
        linkNames(
          '<a href="/p"><img src="i.png"> <strong>This is</strong> a product</a>',
        ),
      ).toEqual(['This is a product']);
    });

    it('does not treat script or style contents as text', () => {
      expect(
        linkNames(
          '<a href="/s"><script>track()</script><style>a{}</style>Visible</a>',
        ),
      ).toEqual(['Visible']);
    });

    it('truncates very long names', () => {
      const [name] = linkNames(
        `<a href="/long">${'x'.repeat(MAX_LINK_NAME_LENGTH + 50)}</a>`,
      );
      expect(name).toHaveLength(MAX_LINK_NAME_LENGTH + 1);
      expect(name.endsWith('…')).toBe(true);
    });
  });

  describe('link name as HTML fragment', () => {
    it('stores the inner HTML when the body has no text', () => {
      expect(
        linkNames('<a href="/home"><img src="logo.png" alt="Logo"></a>'),
      ).toEqual(['<img src="logo.png" alt="Logo">']);
    });

    it('removes event handlers, scripts and javascript: URLs', () => {
      const [name] = linkNames(
        '<a href="/x"><img src="javascript:alert(1)" onerror="alert(2)" alt=""><script>evil()</script><iframe src="//e"></iframe></a>',
      );
      expect(name).toBe('<img alt="">');
    });

    it('cuts on node boundaries so the fragment stays well-formed', () => {
      const [name] = linkNames(
        `<a href="/g"><span><img src="a.png"></span>${'<img src="b.png">'.repeat(40)}</a>`,
      );
      expect(name.length).toBeLessThanOrEqual(MAX_LINK_NAME_LENGTH + 1);
      expect(name.endsWith('<img src="b.png">…')).toBe(true);
      expect(isWellFormed(name)).toBe(true);
    });

    it('shortens the attributes of a single oversized element', () => {
      const [name] = linkNames(
        `<a href="/d"><img src="${'y'.repeat(MAX_LINK_NAME_LENGTH)}.png" alt="Logo"></a>`,
      );
      expect(name.length).toBeLessThanOrEqual(MAX_LINK_NAME_LENGTH + 1);
      expect(name).toMatch(/^<img src="y+…" alt="Logo">…$/);
      expect(isWellFormed(name)).toBe(true);
    });

    it('shortens nested elements while keeping them closed', () => {
      const [name] = linkNames(
        `<a href="/n"><span class="icon"><img src="${'z'.repeat(MAX_LINK_NAME_LENGTH)}.png"></span></a>`,
      );
      expect(name).toMatch(/^<span class="icon"><img src="z+…">…<\/span>…$/);
      expect(isWellFormed(name)).toBe(true);
    });

    it('drops short attributes when shortening values is not enough', () => {
      const attributes = Array.from(
        { length: 80 },
        (_, i) => `data-a${i}="v"`,
      ).join(' ');
      const [name] = linkNames(`<a href="/m"><img ${attributes}></a>`);
      expect(name.length).toBeLessThanOrEqual(MAX_LINK_NAME_LENGTH + 1);
      expect(isWellFormed(name)).toBe(true);
    });

    it('ignores comments when building the fragment', () => {
      const [name] = linkNames(
        `<a href="/c"><!--${'c'.repeat(MAX_LINK_NAME_LENGTH)}--></a>`,
      );
      expect(name).toBe('…');
    });

    it('returns an empty name for an empty anchor', () => {
      expect(linkNames('<a href="/empty"></a>')).toEqual(['']);
    });
  });
});
