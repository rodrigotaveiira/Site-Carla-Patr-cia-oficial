import sanitizeHtml from 'sanitize-html'

// Sanitização do HTML da devolutiva da redação (editor rico). É a barreira de
// segurança de verdade: o que sai daqui é gravado e depois renderizado com
// dangerouslySetInnerHTML na tela do aluno. Qualquer coisa fora da lista —
// script, iframe, on*, href, url(), classes — é descartada; só sobram as tags
// de formatação e as cores (principalmente o marca-texto do Google Docs).

const COLOR = [
  /^#[0-9a-f]{3,8}$/i,
  /^rgba?\(\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*(,\s*(0|1|0?\.\d+)\s*)?\)$/i,
  /^[a-z]{3,20}$/i,
]

// O Google Docs embrulha o conteúdo copiado num <b style="font-weight:normal">
// que não é negrito de verdade — sem isso, a devolutiva inteira ficaria em negrito.
function isFakeBold(style: string | undefined) {
  return !!style && /font-weight\s*:\s*(normal|[1-5]00)\b/i.test(style)
}

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'mark', 'span', 'ul', 'ol', 'li'],
  allowedAttributes: { '*': ['style'] },
  allowedStyles: {
    '*': {
      color: COLOR,
      'background-color': COLOR,
      'font-weight': [/^(bold|[6-9]00)$/i],
      'font-style': [/^italic$/i],
      'text-decoration': [/^(underline|line-through)(\s+(underline|line-through))?$/i],
      'text-decoration-line': [/^(underline|line-through)$/i],
      'text-align': [/^(left|right|center|justify)$/i],
    },
  },
  allowedSchemes: [],
  // Blocos que não fazem parte da lista viram parágrafo em vez de sumirem com o texto.
  transformTags: {
    b: (_tagName, attribs) => (isFakeBold(attribs.style) ? { tagName: 'span', attribs: {} } : { tagName: 'strong', attribs: {} }),
    div: 'p',
    h1: 'p', h2: 'p', h3: 'p', h4: 'p', h5: 'p', h6: 'p',
    blockquote: 'p',
  },
  disallowedTagsMode: 'discard',
}

export function sanitizeRichText(html: string) {
  return sanitizeHtml(html, OPTIONS).trim()
}

// true quando o HTML não tem nenhum texto visível (ex.: "<p><br></p>").
export function isRichTextEmpty(html: string) {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/&nbsp;|\s/g, '') === ''
}
