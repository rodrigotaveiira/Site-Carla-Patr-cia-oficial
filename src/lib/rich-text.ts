// Utilitários do lado do navegador para a devolutiva em texto rico.
// A segurança de verdade fica no servidor (rich-text.server.ts); aqui o
// objetivo é só deixar o HTML colado do Google Docs limpo e consistente.

export function escapeHtml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Devolutivas antigas foram salvas como texto puro — converte pra HTML
// preservando parágrafos e quebras de linha.
export function plainTextToHtml(text: string) {
  if (!text.trim()) return ''
  return text
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

const SKIP = new Set(['SCRIPT', 'STYLE', 'META', 'TITLE', 'HEAD', 'LINK', 'IMG', 'SVG', 'IFRAME', 'OBJECT', 'EMBED', 'VIDEO', 'AUDIO', 'CANVAS', 'INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'TEMPLATE', 'NOSCRIPT'])
const BLOCK = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'TR', 'PRE', 'SECTION', 'ARTICLE'])

function isDefaultColor(value: string) {
  return /^(#000(000)?|black|rgb\(\s*0\s*,\s*0\s*,\s*0\s*\)|initial|inherit|windowtext)$/i.test(value)
}

function isNoBackground(value: string) {
  return /^(transparent|#fff(fff)?|white|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)|rgba\(.*,\s*0\s*\)|initial|inherit|none)$/i.test(value)
}

type Marks = { bold: boolean; italic: boolean; underline: boolean; strike: boolean; color: string; background: string }

// Lê o estilo inline de um elemento e as tags semânticas (<b>, <i>, <u>, <mark>)
// e devolve a formatação herdada pelos filhos.
function marksFor(el: HTMLElement, inherited: Marks): Marks {
  const marks = { ...inherited }
  const tag = el.tagName
  const style = el.style

  if (tag === 'STRONG') marks.bold = true
  // O Google Docs embrulha tudo num <b style="font-weight:normal"> — não é negrito.
  if (tag === 'B') marks.bold = !/^(normal|[1-5]00)$/.test(style.fontWeight)
  if (tag === 'EM' || tag === 'I') marks.italic = true
  if (tag === 'U' || tag === 'INS') marks.underline = true
  if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL') marks.strike = true
  if (tag === 'MARK') marks.background = style.backgroundColor || '#ffff00'

  const weight = style.fontWeight
  if (weight) marks.bold = weight === 'bold' || weight === 'bolder' || Number(weight) >= 600
  if (style.fontStyle) marks.italic = style.fontStyle === 'italic' || style.fontStyle === 'oblique'
  const decoration = style.textDecorationLine || style.textDecoration
  if (decoration) {
    if (/underline/.test(decoration)) marks.underline = true
    if (/line-through/.test(decoration)) marks.strike = true
  }
  if (style.color) marks.color = isDefaultColor(style.color) ? '' : style.color
  if (style.backgroundColor) marks.background = isNoBackground(style.backgroundColor) ? marks.background : style.backgroundColor
  return marks
}

function wrapText(doc: Document, text: string, marks: Marks): Node {
  let node: Node = doc.createTextNode(text)
  if (marks.color || marks.background) {
    const span = doc.createElement('span')
    if (marks.color) span.style.color = marks.color
    if (marks.background) span.style.backgroundColor = marks.background
    span.appendChild(node)
    node = span
  }
  for (const [flag, tag] of [[marks.strike, 's'], [marks.underline, 'u'], [marks.italic, 'em'], [marks.bold, 'strong']] as const) {
    if (!flag) continue
    const wrapper = doc.createElement(tag)
    wrapper.appendChild(node)
    node = wrapper
  }
  return node
}

function convert(doc: Document, source: Node, target: Node, marks: Marks, insideList: boolean) {
  for (const child of Array.from(source.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent ?? ''
      // Quebras de linha do HTML-fonte não são conteúdo (fora de <pre>).
      if (!text.trim() && /\n/.test(text)) continue
      if (text) target.appendChild(wrapText(doc, text.replace(/\n/g, ' '), marks))
      continue
    }
    if (!(child instanceof HTMLElement)) continue
    const tag = child.tagName
    if (SKIP.has(tag)) continue
    const childMarks = marksFor(child, marks)

    if (tag === 'BR') {
      target.appendChild(doc.createElement('br'))
    } else if (tag === 'UL' || tag === 'OL') {
      const list = doc.createElement(tag.toLowerCase())
      convert(doc, child, list, childMarks, true)
      target.appendChild(list)
    } else if (tag === 'LI') {
      const item = doc.createElement('li')
      convert(doc, child, item, childMarks, true)
      target.appendChild(item)
    } else if (BLOCK.has(tag)) {
      // Dentro de <li> o Google Docs põe um <p> — desembrulha pra não sobrar margem extra.
      if (insideList) {
        convert(doc, child, target, childMarks, insideList)
      } else {
        const paragraph = doc.createElement('p')
        const align = child.style.textAlign
        if (/^(center|right|justify)$/.test(align)) paragraph.style.textAlign = align
        convert(doc, child, paragraph, childMarks, false)
        target.appendChild(paragraph)
      }
    } else {
      // span, b, i, font, a, td... — só a formatação importa, o elemento em si some.
      convert(doc, child, target, childMarks, insideList)
    }
  }
}

// Converte o HTML da área de transferência (Google Docs, Word, páginas web) numa
// estrutura enxuta: <p>, <br>, <ul>/<ol>/<li>, <strong>, <em>, <u>, <s> e
// <span style="color / background-color"> — o grifo vira sempre um span com
// background-color, no trecho exato em que estava.
export function normalizePastedHtml(html: string) {
  const parsed = new DOMParser().parseFromString(html, 'text/html')
  const out = document.implementation.createHTMLDocument('')
  const root = out.createElement('div')
  const noMarks: Marks = { bold: false, italic: false, underline: false, strike: false, color: '', background: '' }
  convert(out, parsed.body, root, noMarks, false)
  return root.innerHTML
}
