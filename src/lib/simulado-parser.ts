// Leitura do texto colado pela professora em "Questões para treino".
//
// Módulo puro de propósito (sem Netlify Blobs, sem server function): assim a
// mesma leitura roda no servidor, na hora de publicar, e no navegador, pra
// mostrar a conferência antes de publicar.
//
// Formato aceito:
//
//   TEXTO 1
//   <título e parágrafos do texto-base>
//
//   TEXTO 2
//   <outro texto-base>
//
//   1) Enunciado
//   a) alternativa
//   b) alternativa
//
//   TEXTO 3
//   <texto-base do próximo bloco>
//
//   2) Enunciado
//   ...
//
// Os textos-base valem para as questões que vêm depois deles, até aparecer um
// novo bloco TEXTO. Tudo que estiver antes da primeira questão é texto-base,
// mesmo sem o cabeçalho "TEXTO N".

/** Cabeçalho de texto-base: "TEXTO 1", "Texto 2:", "TEXTOS 3" — a linha inteira. */
const PASSAGE_HEADING = /^\s*textos?\s*\d*\s*[:.\-–]?\s*$/i

// Três jeitos de marcar o começo de uma questão. O estilo é escolhido POR
// DOCUMENTO (ver detectarMarcador): aceitar todos ao mesmo tempo faria
// qualquer enumeração ou data dentro do texto-base ("2. Segundo o autor...")
// virar uma questão fantasma.

/** "QUESTÃO 1", "Questao 2:", "PERGUNTA 3 -" — o número vem depois da palavra. */
const QUESTION_HEADING = /^\s*(?:quest[ãa]o|pergunta)\s*(?:n[º°.]?\s*)?(\d{1,3})\s*[).:\-–]?\s*(.*)$/i

/** "1)" — o formato que a plataforma já aceitava. */
const QUESTION_PAREN = /^\s*(\d{1,3})\)\s*(.*)$/

/** "1." ou "1 -": só entra quando nenhum dos outros dois aparece no texto. */
const QUESTION_LOOSE = /^\s*(\d{1,3})\s*[.\-–]\s+(\S.*)$/

/**
 * Alternativa: "(A)", "A)", "A.", "a -" — os quatro jeitos que aparecem nos
 * materiais. O parêntese de abertura é opcional porque as provas colam tanto
 * "(A) texto" quanto "A) texto".
 */
const OPTION_START = /^\s*\(?\s*([A-Ea-e])\s*(?:\)|[.\-–])\s*(.*)$/

/** Gabarito numa linha só: "1) d", "1-d", "1. d", "1 d". */
const ANSWER_LINE = /^\s*(?:quest[ãa]o|pergunta)?\s*(\d{1,3})\s*[).\-–:]?\s*\(?\s*([A-Ea-e])\s*[).]?\s*$/i
/** Mesma ideia, mas varrendo uma linha com vários pares: "1) C 2) A 3) E". */
const ANSWER_SCAN = /(\d{1,3})\s*[).\-–:]?\s*\(?\s*([A-Ea-e])\b/g

export type SimuladoPassage = {
  id: string // 'p1', 'p2'...
  label: string // 'TEXTO 1' — como veio; '' quando o texto não tinha cabeçalho
  content: string // corpo do texto, com as quebras de linha preservadas
}

export type ParsedOption = { letter: string; text: string }

export type ParsedQuestion = {
  id: string
  number: number
  statement: string
  options: ParsedOption[]
  /** Textos-base que valem pra essa questão, na ordem em que aparecem. */
  passageIds: string[]
}

export type ParseIssue = {
  level: 'erro' | 'aviso'
  message: string
}

export type ParsedActivity = {
  passages: SimuladoPassage[]
  questions: ParsedQuestion[]
  issues: ParseIssue[]
}

// Tira linhas em branco das pontas, mantendo as do meio (parágrafos).
function trimBlankEdges(lines: string[]): string[] {
  let start = 0
  let end = lines.length
  while (start < end && lines[start].trim() === '') start += 1
  while (end > start && lines[end - 1].trim() === '') end -= 1
  return lines.slice(start, end)
}

// Enunciado vira uma linha só (é como sempre foi exibido). As quebras de linha
// que importam preservar são as do texto-base, não as do enunciado.
//
// Texto copiado de PDF quebra a linha no meio da palavra ("tornar-\nse"). Sem
// desfazer isso, o aluno lia "tornar- se".
// Pronomes que vêm depois de hífen em português. Servem pra separar o hífen
// que faz parte da palavra do hífen que o PDF inventou ao quebrar a linha.
const ENCLITICOS = new Set(['se','me','te','lhe','lhes','nos','vos','o','a','os','as','lo','la','los','las','no','na','nas','los','me'])

export function juntarLinhas(lines: string[]): string {
  let saida = ''
  for (const linha of lines) {
    const atual = linha.trim()
    if (!atual) continue
    if (!saida) { saida = atual; continue }
    // Linha cortada no meio de uma palavra hifenizada. Dois casos diferentes:
    // "tornar-" + "se" é hífen de verdade (pronome enclítico) e fica;
    // "infraestru-" + "tura" é só quebra do PDF e o hífen sai.
    if (/[A-Za-zÀ-ÿ]-$/.test(saida) && /^[a-zà-ÿ]/.test(atual)) {
      const primeiraPalavra = atual.split(/[^A-Za-zÀ-ÿ]/)[0].toLowerCase()
      saida = ENCLITICOS.has(primeiraPalavra) ? saida + atual : saida.slice(0, -1) + atual
    } else {
      saida = saida + ' ' + atual
    }
  }
  return saida.replace(/\s+/g, ' ').trim()
}

function joinStatement(lines: string[]): string {
  return juntarLinhas(lines)
}

/**
 * Descobre como ESTE documento marca as questões, antes de varrer linha a
 * linha. "QUESTÃO 1" e "1)" são inequívocos; "1." e "1 -" só valem quando
 * nenhum dos dois aparece E o bloco tem alternativas de verdade — senão uma
 * lista numerada dentro do texto-base viraria questão.
 */
function detectarMarcador(lines: string[]): RegExp | null {
  if (lines.some((linha) => QUESTION_HEADING.test(linha))) return QUESTION_HEADING
  if (lines.some((linha) => QUESTION_PAREN.test(linha))) return QUESTION_PAREN

  const candidatos = lines.filter((linha) => QUESTION_LOOSE.test(linha))
  if (candidatos.length < 2) return null

  // Cada candidato precisa ter pelo menos duas alternativas antes do próximo.
  let blocosValidos = 0
  let alternativasNoBloco = 0
  let dentroDeBloco = false
  for (const linha of lines) {
    if (QUESTION_LOOSE.test(linha)) {
      if (dentroDeBloco && alternativasNoBloco >= 2) blocosValidos++
      dentroDeBloco = true
      alternativasNoBloco = 0
      continue
    }
    if (dentroDeBloco && OPTION_START.test(linha)) alternativasNoBloco++
  }
  if (dentroDeBloco && alternativasNoBloco >= 2) blocosValidos++

  return blocosValidos >= 2 ? QUESTION_LOOSE : null
}

export function parseActivityText(raw: string): ParsedActivity {
  const lines = (raw ?? '').replace(/\r\n/g, '\n').split('\n')
  const marcadorDeQuestao = detectarMarcador(lines)

  const passages: SimuladoPassage[] = []
  const questions: ParsedQuestion[] = []
  const issues: ParseIssue[] = []

  // Textos-base que valem pras próximas questões.
  let activePassageIds: string[] = []
  // Texto-base sendo acumulado agora.
  let pending: { label: string; lines: string[] } | null = null
  // Questão sendo acumulada agora.
  let current: { number: number; lines: string[] } | null = null
  // Já apareceu questão desde o último bloco de textos? Se sim, o próximo
  // cabeçalho TEXTO começa um grupo novo (regra 6).
  let sawQuestionInGroup = false

  function flushPassage() {
    if (!pending) return
    const body = trimBlankEdges(pending.lines).join('\n')
    if (!body.trim()) {
      if (pending.label) issues.push({ level: 'aviso', message: `"${pending.label}" não tem nenhum texto embaixo — esse bloco foi ignorado.` })
      pending = null
      return
    }
    const id = `p${passages.length + 1}`
    passages.push({ id, label: pending.label, content: body })
    activePassageIds.push(id)
    pending = null
  }

  function flushQuestion() {
    if (!current) return
    const statementLines: string[] = []
    const options: ParsedOption[] = []
    let openOption: ParsedOption | null = null

    for (const line of current.lines) {
      const optionMatch = line.match(OPTION_START)
      if (optionMatch) {
        openOption = { letter: optionMatch[1].toUpperCase(), text: optionMatch[2].trim() }
        options.push(openOption)
      } else if (openOption) {
        // continuação da alternativa anterior (alternativa que quebrou em 2 linhas)
        const extra = line.trim()
        if (extra) openOption.text = juntarLinhas([openOption.text, extra])
      } else {
        statementLines.push(line)
      }
    }

    const number = current.number
    const statement = joinStatement(statementLines)
    current = null

    if (!statement) {
      issues.push({ level: 'erro', message: `Questão ${number} está sem enunciado — não foi incluída.` })
      return
    }
    if (options.length < 2) {
      issues.push({
        level: 'erro',
        message: `Questão ${number} encontrada, mas tem ${options.length === 0 ? 'nenhuma alternativa' : 'só 1 alternativa'} — não dá pra responder, então não foi incluída.`,
      })
      return
    }

    questions.push({ id: '', number, statement, options, passageIds: [...activePassageIds] })
  }

  for (const line of lines) {
    if (PASSAGE_HEADING.test(line)) {
      flushQuestion()
      if (sawQuestionInGroup) {
        // Bloco novo de textos depois de questões: recomeça o grupo.
        activePassageIds = []
        sawQuestionInGroup = false
      }
      flushPassage()
      pending = { label: line.trim(), lines: [] }
      continue
    }

    const questionMatch = marcadorDeQuestao ? line.match(marcadorDeQuestao) : null
    if (questionMatch) {
      flushQuestion()
      flushPassage()
      current = { number: Number(questionMatch[1]), lines: [questionMatch[2]] }
      sawQuestionInGroup = true
      continue
    }

    if (current) current.lines.push(line)
    else if (pending) pending.lines.push(line)
    // Conteúdo solto antes de qualquer cabeçalho ou questão: também é
    // texto-base da atividade (regra 2), só que sem rótulo.
    else if (line.trim()) pending = { label: '', lines: [line] }
  }

  flushQuestion()
  // Texto-base sobrando no fim (sem questão depois) ainda é conteúdo da
  // atividade — entra como último bloco.
  flushPassage()

  // Ids únicos e estáveis. Número repetido geraria dois `q7`, o que juntaria os
  // grupos de radio na tela de resposta.
  const usedIds = new Set<string>()
  const seenNumbers = new Set<number>()
  for (const question of questions) {
    if (seenNumbers.has(question.number)) {
      issues.push({ level: 'aviso', message: `O número ${question.number} aparece em mais de uma questão.` })
    }
    seenNumbers.add(question.number)

    let id = `q${question.number}`
    let suffix = 2
    while (usedIds.has(id)) id = `q${question.number}-${suffix++}`
    usedIds.add(id)
    question.id = id
  }

  // Aviso de contagem desigual de alternativas: quase sempre é alternativa que
  // ficou colada no enunciado ou letra faltando.
  if (questions.length > 1) {
    const counts = new Map<number, number>()
    for (const q of questions) counts.set(q.options.length, (counts.get(q.options.length) ?? 0) + 1)
    let common = 0
    let commonHits = 0
    for (const [size, hits] of counts) {
      if (hits > commonHits) { common = size; commonHits = hits }
    }
    for (const q of questions) {
      if (q.options.length !== common) {
        issues.push({
          level: 'aviso',
          message: `Questão ${q.number} encontrada, mas possui apenas ${q.options.length} alternativas (as outras têm ${common}).`,
        })
      }
    }
  }

  if (questions.length === 0) {
    issues.push({
      level: 'erro',
      message: 'Nenhuma questão reconhecida. Comece cada questão numa linha nova com "QUESTÃO 1" ou "1)", e cada alternativa com "(A)" ou "a)".',
    })
  }

  return { passages, questions, issues }
}

/**
 * Agrupa questões consecutivas que compartilham os mesmos textos-base, pra que
 * o texto apareça uma vez só acima do bloco de questões dele. Atividade antiga
 * (sem textos-base) vira um grupo só, sem texto — exatamente como era antes.
 */
export function agruparPorTextoBase<T extends { passageIds?: string[] }>(
  questions: T[],
  passages: SimuladoPassage[],
): Array<{ key: string; passages: SimuladoPassage[]; questions: T[] }> {
  const porId = new Map(passages.map((p) => [p.id, p]))
  const grupos: Array<{ key: string; passages: SimuladoPassage[]; questions: T[] }> = []

  for (const question of questions) {
    const ids = question.passageIds ?? []
    const key = ids.join('|')
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.key === key) {
      ultimo.questions.push(question)
      continue
    }
    grupos.push({
      key,
      passages: ids.map((id) => porId.get(id)).filter((p): p is SimuladoPassage => !!p),
      questions: [question],
    })
  }

  return grupos
}

/**
 * Lê o gabarito. Aceita "1) d", "1-d", "1. d", "1 d" — uma linha por questão ou
 * tudo na mesma linha ("1) C 2) A 3) E").
 */
export function parseGabaritoText(raw: string): Map<number, string> {
  const map = new Map<number, string>()

  for (const line of (raw ?? '').replace(/\r\n/g, '\n').split('\n')) {
    if (!line.trim()) continue

    const direct = line.match(ANSWER_LINE)
    if (direct) {
      map.set(Number(direct[1]), direct[2].toUpperCase())
      continue
    }

    // Linha com vários pares. Só aceita se, tirando os pares, não sobrar texto
    // de verdade — senão uma frase como "Prova 2 a distância" viraria "2 = A".
    ANSWER_SCAN.lastIndex = 0
    const found: Array<[number, string]> = []
    const residue = line.replace(ANSWER_SCAN, (_all, num: string, letter: string) => {
      found.push([Number(num), letter.toUpperCase()])
      return ' '
    })
    if (found.length > 0 && residue.replace(/[\s,;|/]+/g, '') === '') {
      for (const [num, letter] of found) map.set(num, letter)
    }
  }

  return map
}
