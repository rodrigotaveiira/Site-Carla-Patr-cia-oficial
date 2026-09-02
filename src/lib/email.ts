// Envio de e-mail pelo Resend, via HTTP — sem SDK, porque é uma requisição só e
// a função agendada fica mais leve sem mais uma dependência no bundle.
//
// A chave vem de RESEND_API_KEY nas variáveis de ambiente da Netlify e nunca
// fica no código. Sem a chave configurada, `enviarEmail` não tenta enviar e
// devolve `nao-configurado` — a função agendada segue rodando sem quebrar,
// e nada é marcado como enviado.

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

// Precisa ser um endereço do domínio verificado no Resend, senão o envio é
// recusado. Dá pra sobrescrever por variável de ambiente sem mexer no código.
const REMETENTE_PADRAO = 'Carla Patrícia Medina <contato@carlapatriciamedina.com>'

export type ResultadoEnvio =
  | { status: 'enviado'; id: string }
  | { status: 'nao-configurado' }
  | { status: 'erro'; motivo: string }

export async function enviarEmail(params: {
  para: string
  assunto: string
  html: string
  texto: string
}): Promise<ResultadoEnvio> {
  // Guarda contra bundle de cliente: la nao existe `process`.
  const apiKey = typeof process !== 'undefined' ? process.env.RESEND_API_KEY : undefined
  if (!apiKey) return { status: 'nao-configurado' }

  const remetente = (typeof process !== 'undefined' && process.env.EMAIL_REMETENTE) || REMETENTE_PADRAO

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: remetente,
        to: [params.para],
        subject: params.assunto,
        html: params.html,
        text: params.texto,
      }),
    })

    if (!response.ok) {
      // O corpo do erro do Resend explica o motivo (domínio não verificado,
      // chave inválida, destinatário recusado). Vale no log pra diagnóstico.
      const corpo = await response.text()
      return { status: 'erro', motivo: `HTTP ${response.status}: ${corpo.slice(0, 300)}` }
    }

    const data = (await response.json()) as { id?: string }
    return { status: 'enviado', id: data.id ?? '' }
  } catch (erro) {
    return { status: 'erro', motivo: erro instanceof Error ? erro.message : String(erro) }
  }
}
