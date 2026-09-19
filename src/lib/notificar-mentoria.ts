import {
  montarEmailMentoriaAlterada,
  montarEmailMentoriaCancelada,
  montarEmailNovaMentoria,
} from './email-mentoria-avisos'
import { avisarAlunos, avisarTodosOsAlunos } from './notificar-alunos'

// Avisos sobre a agenda de mentorias. Chamados de dentro das server functions
// DEPOIS que a alteração já está gravada — e nenhum deles lança: o horário
// salvo é o que importa, e-mail é consequência. Se o Resend estiver fora do ar,
// sem chave ou sem domínio verificado, a professora não vê erro nenhum na tela
// depois de já ter salvo, e o problema fica no log.
//
// Quem recebe muda conforme o aviso:
//
// - horário NOVO vai pra turma inteira: é convite, e quem ainda não se
//   inscreveu é justamente o público;
// - MUDANÇA e CANCELAMENTO vão só pra quem está inscrito naquele horário —
//   mandar pra turma toda seria avisar sobre um compromisso que a pessoa nem
//   tinha.

/** Horário novo aberto na agenda — convite pra turma inteira. */
export async function notificarNovaMentoria(params: {
  emGrupo: boolean
  data: string
  hora: string
  horaFim?: string
  titulo?: string
  descricao?: string
}): Promise<void> {
  await avisarTodosOsAlunos('mentoria-nova', ({ nome }) =>
    montarEmailNovaMentoria({ nomeAluno: nome, ...params }),
  )
}

/** Horário alterado — só pra quem já está inscrito nele. */
export async function notificarMentoriaAlterada(params: {
  alunos: { email: string; name: string }[]
  emGrupo: boolean
  data: string
  horaAntes: string
  horaFimAntes?: string
  tituloAntes?: string
  horaDepois: string
  horaFimDepois?: string
  tituloDepois?: string
}): Promise<void> {
  const { alunos, ...dados } = params
  await avisarAlunos(
    'mentoria-alterada',
    alunos.map(({ email, name }) => ({ email, nome: name })),
    ({ nome }) => montarEmailMentoriaAlterada({ nomeAluno: nome, ...dados }),
  )
}

/** Horário cancelado — só pra quem estava inscrito nele. */
export async function notificarMentoriaCancelada(params: {
  alunos: { email: string; name: string }[]
  emGrupo: boolean
  data: string
  hora: string
  horaFim?: string
  titulo?: string
}): Promise<void> {
  const { alunos, ...dados } = params
  await avisarAlunos(
    'mentoria-cancelada',
    alunos.map(({ email, name }) => ({ email, nome: name })),
    ({ nome }) => montarEmailMentoriaCancelada({ nomeAluno: nome, ...dados }),
  )
}
