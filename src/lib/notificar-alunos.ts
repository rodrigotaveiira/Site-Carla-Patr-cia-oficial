import { getStore } from '@netlify/blobs'
import { enviarEmail } from './email'

// Mesmo nome de store usado em sessions.ts (histórico de login por aluno) —
// é dali que vem a lista de e-mails pra avisar. O site não tem um diretório
// completo de alunos (a aprovação de conta é feita direto no Netlify
// Identity, fora do código), então isso só alcança quem já logou pelo menos
// uma vez: um aluno recém-aprovado que ainda não entrou não recebe até o
// primeiro login.
function sessionHistoryStore() {
  return getStore({ name: 'session-history', consistency: 'strong' })
}

/** Teto de espera pelo lote de avisos. Ver a explicação no `Promise.race` abaixo. */
const LOTE_TIMEOUT_MS = 6000

/**
 * Manda um e-mail para todo aluno conhecido, montado individualmente (o texto
 * costuma trazer o primeiro nome de quem recebe).
 *
 * Nunca lança. Estes avisos são sempre disparados DEPOIS que a coisa avisada já
 * foi salva, então uma falha de e-mail não pode virar erro na tela da professora
 * nem desfazer o que ela acabou de publicar — o problema fica no log.
 *
 * @param contexto identificação curta pro log, ex.: 'material' ou 'conteúdo'.
 */
export async function avisarTodosOsAlunos(
  contexto: string,
  montarEmail: (aluno: { nome: string }) => { assunto: string; html: string; texto: string },
): Promise<void> {
  try {
    const store = sessionHistoryStore()
    const { blobs } = await store.list()

    const registros = await Promise.all(
      blobs.map(async (blob) => {
        const registro = (await store.get(blob.key, { type: 'json' })) as { email?: string; name?: string } | null
        return registro?.email ? { email: registro.email, nome: registro.name || 'Aluno(a)' } : null
      }),
    )

    await avisarAlunos(contexto, registros.filter((r) => r !== null), montarEmail)
  } catch (error) {
    console.error(`[${contexto}] não foi possível avisar os alunos:`, error)
  }
}

/**
 * Manda o e-mail só pros alunos da lista, montado individualmente.
 *
 * É o par de `avisarTodosOsAlunos` pra quando o aviso não é pra turma: mudança
 * ou cancelamento de um horário de mentoria, por exemplo, interessa a quem está
 * inscrito nele e a mais ninguém. A lista vem do próprio registro salvo (os
 * inscritos do horário), não do histórico de sessões — então aqui não existe a
 * limitação de "só quem já logou uma vez".
 *
 * Nunca lança, pelo mesmo motivo de `avisarTodosOsAlunos`: é sempre disparado
 * DEPOIS que a alteração já foi gravada.
 *
 * @param contexto identificação curta pro log, ex.: 'mentoria-cancelada'.
 */
export async function avisarAlunos(
  contexto: string,
  alunos: { email: string; nome: string }[],
  montarEmail: (aluno: { nome: string }) => { assunto: string; html: string; texto: string },
): Promise<void> {
  if (alunos.length === 0) return

  try {
    const envios = Promise.allSettled(
      alunos.map(async ({ email, nome }) => {
        const { assunto, html, texto } = montarEmail({ nome })
        const resultado = await enviarEmail({ para: email, assunto, html, texto })
        if (resultado.status === 'erro') {
          console.error(`[${contexto}] falha ao avisar ${email}:`, resultado.motivo)
        }
      }),
    )

    // Teto de tempo pro lote inteiro. Com turma grande, mesmo cada envio tendo
    // seu próprio timeout, a soma pode passar do tempo que a função tem pra
    // responder — e aí quem publicou o arquivo trava esperando. Estourado o
    // teto, o aviso é abandonado e a publicação responde na mesma hora.
    const estourou = Symbol('tempo esgotado')
    const resultado = await Promise.race([
      envios,
      new Promise<typeof estourou>((resolve) => setTimeout(() => resolve(estourou), LOTE_TIMEOUT_MS)),
    ])
    if (resultado === estourou) {
      console.error(`[${contexto}] aviso por e-mail passou de ${LOTE_TIMEOUT_MS}ms e foi abandonado.`)
    }
  } catch (error) {
    console.error(`[${contexto}] não foi possível avisar os alunos:`, error)
  }
}
