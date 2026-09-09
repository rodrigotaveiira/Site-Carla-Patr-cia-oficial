import { enviarEmail } from './email'
import { montarEmailNovaRedacao } from './email-nova-redacao'

// Avisa a Carla por e-mail quando um aluno envia uma redação (upload ou
// entrega presencial).
//
// Chamada de dentro de submitRedacao/submitRedacaoPresencial, DEPOIS que a
// redação já foi salva — por isso nunca lança: a redação salva é o que
// importa, e-mail é consequência. Se o Resend falhar, a redação continua na
// fila de correção mesmo assim, e o problema fica só no log.
const EMAIL_PROFESSORA_PADRAO = 'contato.carlapatriciamedina@gmail.com'

export async function notificarNovaRedacao(params: {
  nomeAluno: string
  emailAluno: string
  titulo: string
  deliveryMethod: 'upload' | 'presencial'
}): Promise<void> {
  try {
    const paraProfessora =
      (typeof process !== 'undefined' && process.env.EMAIL_PROFESSORA) || EMAIL_PROFESSORA_PADRAO

    const { assunto, html, texto } = montarEmailNovaRedacao(params)
    const resultado = await enviarEmail({ para: paraProfessora, assunto, html, texto })
    if (resultado.status === 'erro') {
      console.error('[redacao] falha ao avisar a professora sobre nova redação:', resultado.motivo)
    }
  } catch (error) {
    console.error('[redacao] erro inesperado ao notificar nova redação:', error)
  }
}
