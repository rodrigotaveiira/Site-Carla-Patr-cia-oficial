import { enviarEmail } from './email'
import { montarEmailRecadoRespondido } from './email-recado-respondido'

// Avisa o aluno por e-mail quando a professora responde o recado dele.
//
// Chamada de dentro de replyRecado, DEPOIS que a resposta já foi salva — por
// isso nunca lança: a resposta salva é o que importa, e-mail é consequência.
// Se o Resend falhar, a resposta continua disponível na plataforma mesmo
// assim, e o problema fica só no log em vez de virar erro na tela da
// professora depois que ela já respondeu.
export async function notificarRecadoRespondido(params: {
  nomeAluno: string
  emailAluno: string
  mensagemOriginal: string
  resposta: string
}): Promise<void> {
  try {
    if (!params.emailAluno) return

    const { assunto, html, texto } = montarEmailRecadoRespondido(params)
    const resultado = await enviarEmail({ para: params.emailAluno, assunto, html, texto })
    if (resultado.status === 'erro') {
      console.error(`[recado] falha ao avisar ${params.emailAluno} sobre resposta:`, resultado.motivo)
    }
  } catch (error) {
    console.error('[recado] erro inesperado ao notificar resposta de recado:', error)
  }
}
