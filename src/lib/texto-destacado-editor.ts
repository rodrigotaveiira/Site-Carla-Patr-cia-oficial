// Ponte entre o editor visual de "Questões para treino" e o texto com
// marcadores (`==negrito==`, `~~itálico~~`, `##cor##`, ver texto-destacado.tsx).
//
// O que fica salvo continua sendo texto puro com marcadores — o parser, o
// servidor e a prova do aluno não mudam. O editor só troca a digitação dos
// marcadores à mão por negrito/itálico/cor de verdade na tela, e mantém os
// destaques de um texto colado do Google Docs, Word ou PDF.
//
// Só roda no navegador (usa DOM).

import { escapeHtml, normalizePastedHtml } from './rich-text'

type Marcas = { negrito: boolean; italico: boolean; cor: boolean }
type Trecho = { texto: string; marcas: Marcas }

const SEM_MARCAS: Marcas = { negrito: false, italico: false, cor: false }
const BLOCO = new Set(['P', 'DIV', 'LI', 'UL', 'OL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE', 'TR', 'SECTION', 'ARTICLE'])

// Começo de linha que o parser usa pra reconhecer a estrutura (cabeçalho de
// texto-base, número da questão, letra da alternativa). Se vier em negrito do
// documento original ("**QUESTÃO 1**"), o marcador na frente esconderia o
// número do parser — então esse pedaço sai sempre sem destaque.
const INICIO_ESTRUTURAL = [
  /^\s*textos?\s*\d*\s*[:.\-–]?\s*$/i,
  /^\s*(?:quest[ãa]o|pergunta)\s*(?:n[º°.]?\s*)?\d{1,3}\s*[).:\-–]?\s*/i,
  /^\s*\d{1,3}\)\s*/,
  /^\s*\d{1,3}\s*[.\-–]\s+/,
  /^\s*\(?\s*[A-Ea-e]\s*(?:\)|[.\-–])\s*/,
]

function eCorPadrao(valor: string) {
  return !valor || /^(#000(000)?|black|rgb\(\s*0\s*,\s*0\s*,\s*0\s*\)|initial|inherit|windowtext|currentcolor)$/i.test(valor)
}

function eSemFundo(valor: string) {
  return !valor || /^(transparent|#fff(fff)?|white|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)|rgba\(.*,\s*0\s*\)|initial|inherit|none)$/i.test(valor)
}

function marcasDe(el: HTMLElement, herdadas: Marcas): Marcas {
  const marcas = { ...herdadas }
  const tag = el.tagName
  const estilo = el.style
  if (tag === 'STRONG') marcas.negrito = true
  // O Google Docs embrulha tudo num <b style="font-weight:normal"> — não é negrito.
  if (tag === 'B') marcas.negrito = !/^(normal|[1-5]00)$/.test(estilo.fontWeight)
  if (tag === 'EM' || tag === 'I') marcas.italico = true
  if (tag === 'MARK' || el.classList.contains('texto-destacado-cor')) marcas.cor = true
  if (estilo.fontWeight) marcas.negrito = estilo.fontWeight === 'bold' || estilo.fontWeight === 'bolder' || Number(estilo.fontWeight) >= 600
  if (estilo.fontStyle) marcas.italico = estilo.fontStyle === 'italic' || estilo.fontStyle === 'oblique'
  // Cor de letra diferente do preto ou marca-texto: os dois viram `##cor##`.
  if (!eCorPadrao(estilo.color) || !eSemFundo(estilo.backgroundColor)) marcas.cor = true
  return marcas
}

/** Percorre o DOM e devolve as linhas, cada uma como uma lista de trechos com formatação. */
function linhasDe(raiz: Node): Trecho[][] {
  const linhas: Trecho[][] = [[]]
  const atual = () => linhas[linhas.length - 1]
  const quebrar = () => linhas.push([])
  // Bloco começa e termina em linha própria, sem criar linha vazia a mais.
  const garantirLinhaNova = () => { if (atual().length > 0) quebrar() }

  function visitar(no: Node, marcas: Marcas) {
    if (no.nodeType === Node.TEXT_NODE) {
      const texto = (no.textContent ?? '').replace(/ /g, ' ')
      // Quebra de linha do HTML-fonte não é conteúdo (o editor não usa <pre>).
      if (texto && !(/\n/.test(texto) && !texto.trim())) atual().push({ texto: texto.replace(/\n/g, ' '), marcas })
      return
    }
    if (!(no instanceof HTMLElement)) return
    if (no.tagName === 'BR') {
      quebrar()
      return
    }
    const filhas = marcasDe(no, marcas)
    const bloco = BLOCO.has(no.tagName)
    if (bloco) garantirLinhaNova()
    for (const filho of Array.from(no.childNodes)) visitar(filho, filhas)
    if (bloco) garantirLinhaNova()
  }

  for (const filho of Array.from(raiz.childNodes)) visitar(filho, SEM_MARCAS)
  // `<div>texto<br></div>` (o navegador põe esse <br> no fim) não é linha a mais.
  if (linhas.length > 1 && atual().length === 0) linhas.pop()
  return linhas
}

function mesmasMarcas(a: Marcas, b: Marcas) {
  return a.negrito === b.negrito && a.italico === b.italico && a.cor === b.cor
}

function linhaParaTexto(trechos: Trecho[]): string {
  const textoPuro = trechos.map((t) => t.texto).join('')
  let semDestaque = 0
  for (const padrao of INICIO_ESTRUTURAL) {
    const m = textoPuro.match(padrao)
    if (m) {
      semDestaque = m[0].length
      break
    }
  }

  // Tira a formatação do começo estrutural e junta trechos vizinhos iguais.
  const finais: Trecho[] = []
  let posicao = 0
  for (const trecho of trechos) {
    const partes: Trecho[] = []
    if (posicao < semDestaque) {
      const corte = Math.min(trecho.texto.length, semDestaque - posicao)
      partes.push({ texto: trecho.texto.slice(0, corte), marcas: SEM_MARCAS })
      if (corte < trecho.texto.length) partes.push({ texto: trecho.texto.slice(corte), marcas: trecho.marcas })
    } else {
      partes.push(trecho)
    }
    posicao += trecho.texto.length
    for (const parte of partes) {
      const anterior = finais[finais.length - 1]
      if (anterior && mesmasMarcas(anterior.marcas, parte.marcas)) anterior.texto += parte.texto
      else finais.push({ ...parte })
    }
  }

  return finais
    .map(({ texto, marcas }) => {
      // Espaço nas pontas fica fora do marcador: "== palavra ==" ficaria esquisito
      // e um trecho só de espaço não tem o que destacar.
      const m = texto.match(/^(\s*)([\s\S]*?)(\s*)$/)!
      let miolo = m[2]
      if (!miolo) return texto
      if (marcas.italico) miolo = `~~${miolo}~~`
      if (marcas.negrito) miolo = `==${miolo}==`
      if (marcas.cor) miolo = `##${miolo}##`
      return m[1] + miolo + m[3]
    })
    .join('')
}

/** Conteúdo do editor (DOM) → texto com marcadores, no formato que o parser lê. */
export function editorParaTexto(raiz: Node): string {
  return linhasDe(raiz).map(linhaParaTexto).join('\n')
}

const MARCADOR = /==(.+?)==|~~(.+?)~~|##(.+?)##/g

function linhaParaHtml(linha: string): string {
  let html = ''
  let ultimo = 0
  for (const m of linha.matchAll(MARCADOR)) {
    const indice = m.index ?? 0
    html += escapeHtml(linha.slice(ultimo, indice))
    if (m[1] !== undefined) html += `<strong>${linhaParaHtml(m[1])}</strong>`
    else if (m[2] !== undefined) html += `<em>${linhaParaHtml(m[2])}</em>`
    else html += `<span class="texto-destacado-cor">${linhaParaHtml(m[3])}</span>`
    ultimo = indice + m[0].length
  }
  return html + escapeHtml(linha.slice(ultimo))
}

/** Texto com marcadores → HTML pro editor: uma `<div>` por linha. */
export function textoParaEditor(texto: string): string {
  if (!texto) return ''
  return texto
    .split('\n')
    .map((linha) => `<div>${linhaParaHtml(linha) || '<br>'}</div>`)
    .join('')
}

/**
 * HTML colado (Google Docs, Word, página web) → HTML do editor, já reduzido
 * ao que dá pra salvar: negrito, itálico e cor. O que entra na tela é
 * exatamente o que vai aparecer pro aluno.
 */
export function colagemParaEditor(html: string): string {
  const raiz = document.createElement('div')
  raiz.innerHTML = normalizePastedHtml(html)
  return textoParaEditor(editorParaTexto(raiz))
}
