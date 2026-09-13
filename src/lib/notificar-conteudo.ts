import { montarEmailNovoConteudo } from './email-novo-material'
import { avisarTodosOsAlunos } from './notificar-alunos'

// Avisa por e-mail todo aluno conhecido sobre um arquivo novo numa seção de
// conteúdo (Dicas, Biblioteca, Questões, Simulados, Repertórios, Gabaritos,
// Edital). Chamada de dentro de addContentItem, DEPOIS que o arquivo já foi
// salvo — por isso nunca lança: o arquivo publicado é o que importa, e-mail é
// consequência. Se o Resend falhar ou estiver sem chave configurada, o arquivo
// continua no ar normalmente e o problema fica só no log, em vez de virar erro
// na tela da professora depois que ela já enviou.
export async function notificarNovoConteudo(params: {
  secaoLabel: string
  secaoSlug: string
  titulo: string
  descricao: string
}): Promise<void> {
  await avisarTodosOsAlunos('conteúdo', ({ nome }) =>
    montarEmailNovoConteudo({
      nomeAluno: nome,
      secaoLabel: params.secaoLabel,
      secaoSlug: params.secaoSlug,
      titulo: params.titulo,
      descricao: params.descricao,
    }),
  )
}
