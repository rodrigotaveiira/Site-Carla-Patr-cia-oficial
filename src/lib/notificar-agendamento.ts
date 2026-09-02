import { enviarEmail } from './email'
import { montarEmailAgendamentoAluno, montarEmailAgendamentoProfessora } from './email-agendamento'

// Dispara os dois e-mails de "acabou de marcar": confirmação pro aluno e aviso
// pra Carla.
//
// Chamada de dentro das server functions de agendamento, DEPOIS que a reserva
// já foi gravada. Isso é de propósito: o agendamento é o que importa, e-mail é
// consequência. Por isso esta função NUNCA lança — se o Resend estiver fora do
// ar, com chave errada ou sem domínio verificado, o aluno continua com o
// horário marcado e o problema fica no log, em vez de virar um erro na tela
// depois de a vaga já ter sido tomada.
//
// Enviar daqui, e não de um endpoint chamado pelo React, também evita que
// alguém dispare e-mail em nome da Carla pra um destinatário qualquer: aqui os
// dados vêm da sessão e do próprio registro gravado, não do cliente.

const EMAIL_PROFESSORA_PADRAO = 'contato@carlapatriciamedina.com.br'

export async function notificarAgendamento(params: {
  nomeAluno: string
  emailAluno: string
  data: string
  hora: string
  duracao: number
  emGrupo: boolean
  ocupacaoGrupo?: { inscritos: number; capacidade: number }
}): Promise<void> {
  const { nomeAluno, emailAluno, data, hora, duracao, emGrupo, ocupacaoGrupo } = params

  try {
    if (emailAluno) {
      const aluno = montarEmailAgendamentoAluno({ nomeAluno, data, hora, duracao, emGrupo })
      const resultado = await enviarEmail({
        para: emailAluno,
        assunto: aluno.assunto,
        html: aluno.html,
        texto: aluno.texto,
      })
      if (resultado.status === 'erro') {
        console.error('[agendamento] falha no e-mail do aluno —', resultado.motivo)
      }
    }

    const paraProfessora =
      (typeof process !== 'undefined' && process.env.EMAIL_PROFESSORA) || EMAIL_PROFESSORA_PADRAO

    const professora = montarEmailAgendamentoProfessora({
      nomeAluno,
      emailAluno,
      data,
      hora,
      duracao,
      emGrupo,
      ocupacaoGrupo,
    })
    const resultado = await enviarEmail({
      para: paraProfessora,
      assunto: professora.assunto,
      html: professora.html,
      texto: professora.texto,
    })
    if (resultado.status === 'erro') {
      console.error('[agendamento] falha no aviso pra professora —', resultado.motivo)
    }
  } catch (erro) {
    // Rede caiu, DNS falhou, qualquer coisa: o agendamento já está gravado.
    console.error('[agendamento] erro inesperado ao notificar —', erro)
  }
}
