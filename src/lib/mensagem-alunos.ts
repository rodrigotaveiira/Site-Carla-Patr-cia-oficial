import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getServerUser } from './auth'
import { isStaff } from './roles'
import { boundedText } from './schemas'
import { listApprovedStudents } from './student-evolution'
import { montarEmailMensagemAlunos } from './email-mensagem-alunos'
import { avisarAlunos } from './notificar-alunos'
import { nomeDoAutor, salvarLembrete } from './lembretes'

// Mensagem livre da professora pra turma toda — o caso de uso original é
// lembrar da importância de fazer os exercícios e as redações, mas o texto é
// livre.
//
// A lista de destinatários vem de `listApprovedStudents()` (Netlify Identity),
// não do histórico de sessões: o objetivo é alcançar quem pode estar sumido
// ou atrasado, e é justamente esse aluno que pode nunca ter logado desde a
// aprovação da conta.

async function alunosAprovados(): Promise<{ email: string; nome: string }[]> {
  const aprovados = await listApprovedStudents()
  return aprovados
    .filter((u): u is typeof u & { email: string } => !!u.email)
    .map((u) => ({ email: u.email, nome: u.name || 'Aluno(a)' }))
}

/** Quantos alunos aprovados existem hoje — mostrado antes de confirmar o envio. */
export const contarAlunosParaMensagem = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getServerUser()
  if (!user || !isStaff(user)) throw new Error('Acesso negado.')
  const alunos = await alunosAprovados()
  return { total: alunos.length }
})

/**
 * Dispara a mensagem: e-mail pra turma inteira e um aviso no sininho — mesmo
 * padrão dual do convite pras mentorias em grupo.
 */
export const enviarMensagemAlunos = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      assunto: boundedText(150),
      mensagem: boundedText(5000),
    }),
  )
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !isStaff(user)) throw new Error('Acesso negado.')

    const alunos = await alunosAprovados()
    if (alunos.length === 0) {
      throw new Error('Nenhum aluno aprovado encontrado.')
    }

    await avisarAlunos('mensagem-alunos', alunos, ({ nome }) =>
      montarEmailMensagemAlunos({ nomeAluno: nome, assunto: data.assunto, mensagem: data.mensagem }),
    )

    try {
      await salvarLembrete(data.mensagem, nomeDoAutor(user))
    } catch (erro) {
      console.error('[mensagem-alunos] não foi possível publicar o aviso no sininho:', erro)
    }

    return { total: alunos.length }
  })
