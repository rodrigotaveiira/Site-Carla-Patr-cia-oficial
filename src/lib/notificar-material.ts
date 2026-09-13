import { montarEmailNovoMaterial } from './email-novo-material'
import { avisarTodosOsAlunos } from './notificar-alunos'

// Avisa por e-mail todo aluno conhecido sobre um material novo já liberado.
// Chamada de dentro de addMaterial, DEPOIS que o material já foi salvo — por
// isso nunca lança: o material salvo é o que importa, e-mail é consequência.
// Se o Resend falhar, estiver sem chave configurada, ou algum aluno específico
// der erro, o material continua liberado normalmente e o problema fica só no
// log, em vez de virar erro na tela da professora depois que ela já salvou.
export async function notificarNovoMaterial(params: { titulo: string; descricao: string }): Promise<void> {
  await avisarTodosOsAlunos('material', ({ nome }) =>
    montarEmailNovoMaterial({
      nomeAluno: nome,
      titulo: params.titulo,
      descricao: params.descricao,
    }),
  )
}
