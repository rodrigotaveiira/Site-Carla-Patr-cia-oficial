import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { z } from 'zod'
import { getServerUser } from './auth'
import { userHasRole } from './roles'
import { STORES } from './blob-stores'
import { optionalText, id as idSchema } from './schemas'
import { MENTORIA_GRUPO_TITULO_PADRAO, terminoDoGrupo, type MentoriaGrupoSlot } from './mentorias-grupo'
import { montarEmailConviteMentorias, montarLembreteConviteMentorias, type GrupoComVaga } from './email-convite-mentorias'
import { avisarTodosOsAlunos } from './notificar-alunos'
import { nomeDoAutor, salvarLembrete } from './lembretes'

// Convite pras mentorias em grupo que ainda têm vaga: a professora escolhe
// quais grupos entram, escreve um recado e dispara de uma vez pra turma.
//
// É diferente do aviso automático de `notificar-mentoria.ts`, que sai sozinho
// quando um horário é criado. Este é manual e junta vários horários — serve
// pra chamar de novo quem não reservou na primeira vez.

function slotsStore() {
  return getStore({ name: STORES.mentoriasGrupo, consistency: 'strong' })
}

/**
 * O que a tela do admin precisa saber de cada grupo com vaga.
 *
 * Note o que NÃO está aqui: a lista de inscritos. A tela só precisa contar
 * quantos são, e `MentoriaGrupoSlot` carrega nome e e-mail de cada aluno —
 * mandar isso pro navegador seria expor dado de aluno numa tela que não usa.
 */
export type VagaMentoriaGrupo = {
  id: string
  date: string
  time: string
  endTime: string
  titulo: string
  capacidade: number
  inscritos: number
  vagas: number
}

/**
 * Data de hoje em 'AAAA-MM-DD'. Mesma convenção do resto do projeto: as datas
 * são tratadas como horário de Brasília sem conversão de fuso (ver
 * live-class.ts). Um grupo de hoje continua na lista o dia inteiro — o corte é
 * por dia, não por hora, porque quem convida está olhando a agenda da semana.
 */
function hoje() {
  return new Date().toISOString().slice(0, 10)
}

function paraVaga(slot: MentoriaGrupoSlot): VagaMentoriaGrupo {
  const inscritos = slot.students?.length ?? 0
  return {
    id: slot.id,
    date: slot.date,
    time: slot.time,
    endTime: terminoDoGrupo(slot),
    titulo: slot.title?.trim() || MENTORIA_GRUPO_TITULO_PADRAO,
    capacidade: slot.capacity,
    inscritos,
    vagas: Math.max(0, slot.capacity - inscritos),
  }
}

async function lerGruposComVaga(): Promise<VagaMentoriaGrupo[]> {
  const store = slotsStore()
  const { blobs } = await store.list()
  const limite = hoje()

  const vagas: VagaMentoriaGrupo[] = []
  for (const blob of blobs) {
    const value = (await store.get(blob.key, { type: 'json' })) as MentoriaGrupoSlot | null
    if (!value || value.date < limite) continue
    const vaga = paraVaga(value)
    if (vaga.vagas > 0) vagas.push(vaga)
  }

  vagas.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  return vagas
}

/** Grupos futuros que ainda têm lugar. Só admin — é a tela de disparo. */
export const listVagasMentoriaGrupo = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getServerUser()
  if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')
  return lerGruposComVaga()
})

/**
 * Dispara o convite: e-mail pra turma e um aviso no sininho.
 *
 * Os dados dos grupos são relidos do store aqui, e só os ids chegam do
 * navegador. É de propósito: o que a tela mostrou pode estar velho (alguém
 * pode ter entrado no grupo enquanto a professora escrevia), e o aluno não
 * pode receber e-mail dizendo que há vaga num grupo que acabou de lotar.
 */
export const enviarConviteMentorias = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      slotIds: z.array(idSchema).min(1).max(50),
      mensagem: optionalText(2000),
    }),
  )
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')

    const escolhidos = new Set(data.slotIds)
    const grupos = (await lerGruposComVaga()).filter((vaga) => escolhidos.has(vaga.id))

    if (grupos.length === 0) {
      throw new Error('Nenhum dos grupos escolhidos ainda tem vaga. Atualize a página e escolha de novo.')
    }

    const mensagem = (data.mensagem ?? '').trim()
    const paraEmail: GrupoComVaga[] = grupos.map(({ date, time, endTime, titulo, capacidade, vagas }) => ({
      date, time, endTime, titulo, capacidade, vagas,
    }))

    // E-mail primeiro, sino depois. Nenhum dos dois derruba o outro: se o
    // Resend falhar, `avisarTodosOsAlunos` só registra no log, e o aviso do
    // sino ainda acontece.
    await avisarTodosOsAlunos('convite-mentorias', ({ nome }) =>
      montarEmailConviteMentorias({ nomeAluno: nome, mensagem, grupos: paraEmail }),
    )

    try {
      await salvarLembrete(montarLembreteConviteMentorias({ mensagem, grupos: paraEmail }), nomeDoAutor(user))
    } catch (erro) {
      console.error('[convite-mentorias] não foi possível publicar o aviso no sininho:', erro)
    }

    return { grupos: grupos.length, vagas: grupos.reduce((soma, grupo) => soma + grupo.vagas, 0) }
  })
