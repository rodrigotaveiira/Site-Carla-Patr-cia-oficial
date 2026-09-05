import { getStore } from '@netlify/blobs'

// Limites de uso por aluno — sem isso, um script (ou um clique compulsivo)
// consegue gerar redações, recados, tentativas de simulado ou reservas de
// mentoria sem nenhum freio, o que também dispara e-mail a cada ação (ver
// `notificarAgendamento`, `sendRecado`, etc.). Guardado como uma janela fixa
// por chave: `{ windowStart, count }`. Netlify Blobs não tem incremento
// atômico, então o avanço da contagem usa `onlyIfMatch` (o mesmo padrão de
// CAS já usado no resto do projeto para reservas de horário) com algumas
// tentativas em caso de disputa — más o "correto" fica quem escreveu primeiro
// dentro da janela, e o pior caso de disputa é permitir um pouco além do
// limite, nunca travar o aluno por um falso positivo de concorrência.

export type RateLimitRule = {
  /** Nome curto da ação, ex.: "redacao", "recado", "mentoria-agendamento". */
  action: string
  /** Duração da janela, em milissegundos. */
  windowMs: number
  /** Quantas ações são permitidas dentro da janela. */
  max: number
}

type RateLimitRecord = { windowStart: number; count: number }

function rateLimitStore() {
  return getStore({ name: 'rate-limits', consistency: 'strong' })
}

function rateLimitKey(action: string, email: string) {
  return `${action}:${email.toLowerCase()}`
}

const MAX_CAS_ATTEMPTS = 4

/**
 * Confere e já contabiliza uma ação contra o limite. Lança um Error com
 * mensagem amigável (em português, pronta pra exibir pro aluno) quando o
 * limite da janela foi atingido.
 */
export async function enforceRateLimit(rule: RateLimitRule, email: string): Promise<void> {
  if (!email) return // sem e-mail não há o que limitar por aluno — quem chama já valida login antes
  const store = rateLimitStore()
  const key = rateLimitKey(rule.action, email)
  const now = Date.now()

  for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt++) {
    const entry = await store.getWithMetadata(key, { type: 'json' })
    const record = entry?.data as RateLimitRecord | undefined
    const windowExpired = !record || now - record.windowStart >= rule.windowMs

    if (windowExpired) {
      const fresh: RateLimitRecord = { windowStart: now, count: 1 }
      const result = entry
        ? await store.setJSON(key, fresh, { onlyIfMatch: entry.etag })
        : await store.setJSON(key, fresh, { onlyIfNew: true })
      if (result?.modified) return
      continue // outra chamada concorrente já abriu a janela — tenta de novo
    }

    if (record.count >= rule.max) {
      const minutosRestantes = Math.ceil((rule.windowMs - (now - record.windowStart)) / 60_000)
      throw new Error(
        `Você atingiu o limite de uso por enquanto (${rule.max} a cada ${Math.round(rule.windowMs / 3_600_000)}h). ` +
          `Tente de novo em cerca de ${minutosRestantes} minuto${minutosRestantes === 1 ? '' : 's'}.`,
      )
    }

    const bumped: RateLimitRecord = { windowStart: record.windowStart, count: record.count + 1 }
    const result = await store.setJSON(key, bumped, { onlyIfMatch: entry!.etag })
    if (result?.modified) return
    // etag mudou entre o get e o set (outra chamada concorrente do mesmo
    // aluno) — tenta de novo lendo o valor atualizado.
  }

  // Não deveria chegar aqui em uso normal; se a disputa persistir por todas as
  // tentativas, deixa passar em vez de bloquear o aluno por um falso positivo.
}
