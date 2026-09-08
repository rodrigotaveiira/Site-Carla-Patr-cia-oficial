import { getStore } from '@netlify/blobs'
import { enviarEmail } from './email'
import { montarEmailNovoMaterial } from './email-novo-material'

// Mesmo nome de store usado em sessions.ts (histórico de login por aluno) —
// é dali que vem a lista de e-mails pra avisar. O site não tem um diretório
// completo de alunos (a aprovação de conta é feita direto no Netlify
// Identity, fora do código), então isso só alcança quem já logou pelo menos
// uma vez: um aluno recém-aprovado que ainda não entrou não recebe até o
// primeiro login.
function sessionHistoryStore() {
  return getStore({ name: 'session-history', consistency: 'strong' })
}

// Avisa por e-mail todo aluno conhecido sobre um material novo já liberado.
// Chamada de dentro de addMaterial, DEPOIS que o material já foi salvo — por
// isso nunca lança: o material salvo é o que importa, e-mail é consequência.
// Se o Resend falhar, estiver sem chave configurada, ou algum aluno específico
// der erro, o material continua liberado normalmente e o problema fica só no
// log, em vez de virar erro na tela da professora depois que ela já salvou.
export async function notificarNovoMaterial(params: { titulo: string; descricao: string }): Promise<void> {
  try {
    const store = sessionHistoryStore()
    const { blobs } = await store.list()

    await Promise.allSettled(
      blobs.map(async (blob) => {
        const registro = (await store.get(blob.key, { type: 'json' })) as { email?: string; name?: string } | null
        if (!registro?.email) return

        const { assunto, html, texto } = montarEmailNovoMaterial({
          nomeAluno: registro.name || 'Aluno(a)',
          titulo: params.titulo,
          descricao: params.descricao,
        })
        const resultado = await enviarEmail({ para: registro.email, assunto, html, texto })
        if (resultado.status === 'erro') {
          console.error(`Falha ao avisar ${registro.email} sobre material novo:`, resultado.motivo)
        }
      }),
    )
  } catch (error) {
    console.error('Não foi possível avisar os alunos sobre o material novo:', error)
  }
}
