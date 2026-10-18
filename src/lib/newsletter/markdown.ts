/**
 * A deliberately tiny markdown subset for newsletter issues, rendered for email.
 *
 * Supported: paragraphs (blank line between them), line breaks, "- " bullet lines, **bold** and
 * [label](https://…) links. Everything else is shown as literal text: admins can never inject HTML,
 * because every character of input is escaped before the few allowed constructs are rebuilt.
 * Only http(s) and mailto links are allowed; any other link is rendered as plain text.
 */

export type MarkdownStyles = { paragraph: string; list: string; listItem: string; link: string }

const DEFAULT_STYLES: MarkdownStyles = {
  paragraph: 'margin:0 0 16px 0;',
  list: 'margin:0 0 16px 0;padding:0 0 0 22px;',
  listItem: 'margin:0 0 6px 0;',
  link: 'color:#102536;text-decoration:underline;',
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Returns the URL when it is an absolute http(s) or mailto link, otherwise null. */
export function safeLinkUrl(raw: string): string | null {
  const value = raw.trim()
  if (!/^(https?:\/\/|mailto:)/i.test(value)) return null
  if (/[\s<>"'`\\]/.test(value)) return null
  try {
    const url = new URL(value)
    if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) return null
    if (url.protocol !== 'mailto:' && !url.hostname) return null
  } catch {
    return null
  }
  return value
}

const LINK = /\[([^\]\n]{1,300})\]\(([^)\s]{1,2000})\)/g
const BOLD = /\*\*([^*\n]{1,500}?)\*\*/g

/** Renders one line of inline markdown to safe HTML. */
export function renderInline(text: string, styles: MarkdownStyles = DEFAULT_STYLES): string {
  let html = ''
  let last = 0
  for (const match of text.matchAll(LINK)) {
    const [whole, label = '', href = ''] = match
    const index = match.index ?? 0
    html += renderBold(escapeHtml(text.slice(last, index)))
    const url = safeLinkUrl(href)
    html += url
      ? `<a href="${escapeHtml(url)}" style="${styles.link}">${renderBold(escapeHtml(label))}</a>`
      : renderBold(escapeHtml(whole))
    last = index + whole.length
  }
  html += renderBold(escapeHtml(text.slice(last)))
  return html
}

// Runs on already-escaped text: `*` is never produced by escaping, so this cannot reintroduce HTML.
function renderBold(escaped: string): string {
  return escaped.replace(BOLD, '<strong>$1</strong>')
}

type Block = { type: 'paragraph'; lines: string[] } | { type: 'list'; items: string[] }

export function parseBlocks(source: string): Block[] {
  const blocks: Block[] = []
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  let current: Block | null = null
  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    if (line.trim() === '') {
      current = null
      continue
    }
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line)
    if (bullet) {
      if (current?.type !== 'list') {
        current = { type: 'list', items: [] }
        blocks.push(current)
      }
      current.items.push(bullet[1]!.trim())
      continue
    }
    if (current?.type !== 'paragraph') {
      current = { type: 'paragraph', lines: [] }
      blocks.push(current)
    }
    current.lines.push(line.trim())
  }
  return blocks
}

export function renderMarkdownToHtml(source: string, styles: MarkdownStyles = DEFAULT_STYLES): string {
  return parseBlocks(source)
    .map((block) =>
      block.type === 'list'
        ? `<ul style="${styles.list}">${block.items.map((item) => `<li style="${styles.listItem}">${renderInline(item, styles)}</li>`).join('')}</ul>`
        : `<p style="${styles.paragraph}">${block.lines.map((line) => renderInline(line, styles)).join('<br>')}</p>`,
    )
    .join('\n')
}

/** Plain-text alternative: markup removed, links written as "label (url)". */
export function renderMarkdownToText(source: string): string {
  const inline = (text: string) =>
    text
      .replace(LINK, (whole, label: string, href: string) => {
        const url = safeLinkUrl(href)
        return url ? `${label} (${url})` : whole
      })
      .replace(BOLD, '$1')
  return parseBlocks(source)
    .map((block) =>
      block.type === 'list' ? block.items.map((item) => `• ${inline(item)}`).join('\n') : block.lines.map(inline).join('\n'),
    )
    .join('\n\n')
}
