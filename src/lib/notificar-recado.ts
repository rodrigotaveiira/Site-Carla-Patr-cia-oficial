import { enviarEmail } from './email'
import { montarEmailNovoRecado } from './email-novo-recado'

// Avisa a Carla por e-mail quando um aluno manda um recado.
//
// Chamada de dentro de sendRecado, DEPOIS que o recado já foi salvo — por
// isso nunca lança: o recado salvo é o que importa, e-mail é consequência.
// Se o Resend falhar, o recado continua lá pra ela ver na plataforma mesmo
// assim, e o problema fica só no log.
const EMAIL_PROFESSORA_PADRAO = 'contato.carlapatriciamedina@gmail.com'

export async function notificarNovoRecado(params: {
  nomeAluno: string
  emailAluno: string
  mensagem: string
}): Promise<void> {
  try {
    const paraProfessora =
      (typeof process !== 'undefined' && process.env.EMAIL_PROFESSORA) || EMAIL_PROFESSORA_PADRAO

    const { assunto, html, texto } = montarEmailNovoRecado(params)
    const resultado = await enviarEmail({ para: paraProfessora, assunto, html, texto })
    if (resultado.status === 'erro') {
      console.error('[recado] falha ao avisar a professora sobre novo recado:', resultado.motivo)
    }
  } catch (error) {
    console.error('[recado] erro inesperado ao notificar novo recado:', error)
  }
}
