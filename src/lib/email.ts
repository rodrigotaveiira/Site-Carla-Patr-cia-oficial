// Envio de e-mail pelo Resend, via HTTP — sem SDK, porque é uma requisição só e
// a função agendada fica mais leve sem mais uma dependência no bundle.
//
// A chave vem de RESEND_API_KEY nas variáveis de ambiente da Netlify e nunca
// fica no código. Sem a chave configurada, `enviarEmail` não tenta enviar e
// devolve `nao-configurado` — a função agendada segue rodando sem quebrar,
// e nada é marcado como enviado.

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

/** Teto de espera por envio. Curto de propósito: ver abaixo, no `signal`. */
const ENVIO_TIMEOUT_MS = 5000

// Precisa ser um endereço do domínio verificado no Resend, senão o envio é
// recusado. Dá pra sobrescrever por variável de ambiente sem mexer no código.
const REMETENTE_PADRAO = 'Carla Patrícia Medina <noreply@carlapatriciamedina.com>'

// Sai de um noreply, mas resposta de aluno nao pode cair num buraco: o Reply-To
// manda pro endereco de contato de verdade.
const RESPONDER_PARA_PADRAO = 'contato.carlapatriciamedina@gmail.com'

export type ResultadoEnvio =
  | { status: 'enviado'; id: string }
  | { status: 'nao-configurado' }
  // `ambiguo: true` = não sabemos se saiu (timeout ou erro de rede: o Resend
  // pode muito bem ter recebido e processado a requisição, só a resposta não
  // voltou a tempo). `ambiguo` ausente/false = o Resend respondeu recusando
  // de verdade (domínio, chave, destinatário) — aí sim é seguro tentar de
  // novo, porque temos certeza de que não saiu. Quem chama em loop com
  // reserva de idempotência (lembrete-simulado, lembrete-mentoria) usa essa
  // distinção pra só liberar a reserva na recusa confirmada — ver ali por quê.
  | { status: 'erro'; motivo: string; ambiguo?: boolean }

export async function enviarEmail(params: {
  para: string
  assunto: string
  html: string
  texto: string
  /** Teto de espera pra esta chamada. Default: ENVIO_TIMEOUT_MS (5s, calibrado
   *  pra envio síncrono com alguém olhando spinner). Uma função agendada, sem
   *  ninguém esperando, pode passar um valor maior — reduz quantas vezes cai
   *  no caso ambíguo acima. */
  timeoutMs?: number
}): Promise<ResultadoEnvio> {
  // Guarda contra bundle de cliente: la nao existe `process`.
  const apiKey = typeof process !== 'undefined' ? process.env.RESEND_API_KEY : undefined
  if (!apiKey) return { status: 'nao-configurado' }

  const remetente = (typeof process !== 'undefined' && process.env.EMAIL_REMETENTE) || REMETENTE_PADRAO
  const responderPara = (typeof process !== 'undefined' && process.env.EMAIL_RESPONDER_PARA) || RESPONDER_PARA_PADRAO

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      // Sem timeout, um Resend lento segura a função inteira até a plataforma
      // matá-la — e quem publicou o arquivo fica preso em "Enviando..." sem
      // nunca receber resposta. Melhor desistir do aviso do que travar a tela.
      signal: AbortSignal.timeout(params.timeoutMs ?? ENVIO_TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: remetente,
        to: [params.para],
        subject: params.assunto,
        reply_to: responderPara,
        html: params.html,
        text: params.texto,
      }),
    })

    if (!response.ok) {
      // O Resend respondeu — e recusou. Isso é uma recusa confirmada, não
      // ambígua: temos certeza de que o e-mail não saiu.
      const corpo = await response.text()
      return { status: 'erro', motivo: `HTTP ${response.status}: ${corpo.slice(0, 300)}` }
    }

    const data = (await response.json()) as { id?: string }
    return { status: 'enviado', id: data.id ?? '' }
  } catch (erro) {
    // Timeout (AbortSignal) ou falha de rede: não temos a resposta do Resend,
    // então não sabemos se a requisição foi processada antes da conexão
    // cair. Ambíguo — ver o comentário em ResultadoEnvio.
    return { status: 'erro', motivo: erro instanceof Error ? erro.message : String(erro), ambiguo: true }
  }
}
