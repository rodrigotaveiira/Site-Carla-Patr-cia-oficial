import { enviarEmail } from './email'
import { montarEmailRedacaoCorrigida } from './email-redacao-corrigida'

// Avisa o aluno por e-mail quando a professora corrige a redação dele.
//
// Chamada de dentro de correctRedacao, DEPOIS que a correção já foi salva —
// por isso nunca lança: a correção salva é o que importa, e-mail é
// consequência. Se o Resend falhar, a correção continua disponível na
// plataforma mesmo assim, e o problema fica só no log em vez de virar erro
// na tela da professora depois que ela já corrigiu.
export async function notificarRedacaoCorrigida(params: {
  nomeAluno: string
  emailAluno: string
  titulo: string
  grade: number
}): Promise<void> {
  try {
    if (!params.emailAluno) return

    const { assunto, html, texto } = montarEmailRedacaoCorrigida(params)
    const resultado = await enviarEmail({ para: params.emailAluno, assunto, html, texto })
    if (resultado.status === 'erro') {
      console.error(`[redacao] falha ao avisar ${params.emailAluno} sobre correção pronta:`, resultado.motivo)
    }
  } catch (error) {
    console.error('[redacao] erro inesperado ao notificar correção pronta:', error)
  }
}
