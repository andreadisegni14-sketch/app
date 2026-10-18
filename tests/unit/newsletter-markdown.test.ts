import { describe, expect, it } from 'vitest'
import { escapeHtml, renderInline, renderMarkdownToHtml, renderMarkdownToText, safeLinkUrl } from '@/lib/newsletter/markdown'

describe('newsletter markdown → HTML', () => {
  it('renders paragraphs, line breaks, bullets, bold and links', () => {
    const html = renderMarkdownToHtml('Hello **friends**,\nwelcome.\n\n- One\n- Two with [a link](https://example.org/a?b=1&c=2)\n\nBye')
    expect(html).toContain('Hello <strong>friends</strong>,<br>welcome.')
    expect(html).toMatch(/<ul[^>]*><li[^>]*>One<\/li><li[^>]*>Two with <a href="https:\/\/example.org\/a\?b=1&amp;c=2"/)
    expect(html.match(/<p /g)).toHaveLength(2)
  })

  it('escapes any HTML typed by an admin', () => {
    const html = renderMarkdownToHtml('<script>alert(1)</script> <img src=x onerror=alert(1)> "quotes" & \'apostrophes\'')
    expect(html).not.toMatch(/<script|<img/i)
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).toContain('&quot;quotes&quot; &amp; &#39;apostrophes&#39;')
  })

  it('never produces dangerous links', () => {
    for (const href of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<b>x</b>', 'vbscript:x', '//evil.example', '/relative', 'ftp://example.org']) {
      const html = renderInline(`[click](${href})`)
      expect(html).not.toContain('<a ')
      expect(html).toContain('[click]')
    }
  })

  it('cannot break out of the href attribute', () => {
    const html = renderInline('[x](https://example.org/"onmouseover="alert(1))')
    expect(html).not.toMatch(/<a [^>]*onmouseover/)
    expect(renderInline('[x](https://example.org/?q=<b>)')).not.toContain('<b>')
  })

  it('allows only http, https and mailto URLs', () => {
    expect(safeLinkUrl('https://example.org/path')).toBe('https://example.org/path')
    expect(safeLinkUrl('http://example.org')).toBe('http://example.org')
    expect(safeLinkUrl('mailto:info@example.org')).toBe('mailto:info@example.org')
    expect(safeLinkUrl('javascript:alert(1)')).toBeNull()
    expect(safeLinkUrl('https://')).toBeNull()
    expect(safeLinkUrl('https://exa mple.org')).toBeNull()
  })

  it('escapes link labels and bold content', () => {
    expect(renderInline('[<b>hi</b>](https://example.org)')).toContain('>&lt;b&gt;hi&lt;/b&gt;</a>')
    expect(renderInline('**<i>x</i>**')).toBe('<strong>&lt;i&gt;x&lt;/i&gt;</strong>')
  })

  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;')
  })

  it('produces a readable plain-text alternative', () => {
    expect(renderMarkdownToText('**Hi** [site](https://example.org)\n\n- a\n- b')).toBe('Hi site (https://example.org)\n\n• a\n• b')
    expect(renderMarkdownToText('[bad](javascript:alert(1))')).toContain('[bad](javascript:alert(1)')
  })
})
