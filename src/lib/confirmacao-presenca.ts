import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { z } from 'zod'
import { STORES } from './blob-stores'

// Esta é a única server function do projeto sem checagem de login, e é de
// propósito: ela atende o link do e-mail de lembrete (mentoria, simulado ou
// aula ao vivo), e exigir login ali derrotaria o objetivo de um lembrete
// rápido de "confirmo que vou".
//
// Por isso a resposta é deliberadamente pobre: devolve só a data e a hora do
// compromisso — que quem recebeu o e-mail já sabe, porque estava escrito
// nele. Nunca devolve nome, e-mail, quem mais está no grupo, nem qualquer
// outro dado de aluno. O token é um UUID aleatório gerado no envio, então não
// dá pra adivinhar nem enumerar, e vale só pra um lembrete de um aluno.
//
// O token não diz de qual dos três lembretes ele veio — por isso procura nos
// três stores, na ordem abaixo. UUIDs não colidem entre si, então não tem
// ambiguidade real em fazer isso.

type RegistroLembreteMentoria = {
  chave: string
  slotId: string
  email: string
  token: string
  enviadoEm: string
  confirmadoEm: string | null
}

// Simulado e aula já guardam data/hora direto no registro do lembrete (não
// precisam de uma segunda busca pra achar o evento original).
type RegistroLembreteGenerico = {
  chave: string
  email: string
  token: string
  data: string
  hora: string
  enviadoEm: string
  confirmadoEm: string | null
}

type MentoriaSlot = { id: string; date: string; time: string; duration: number }
type MentoriaGrupoSlot = { id: string; date: string; time: string; duration: number }

// O que a tela recebe. Note que não há nada identificável aqui.
export type ResultadoConfirmacao = {
  ok: boolean
  motivo?: 'token-invalido'
  data?: string
  hora?: string
  duracao?: number
  jaConfirmado?: boolean
}

function lembretesMentoriaStore() {
  return getStore({ name: STORES.lembretesMentoria, consistency: 'strong' })
}

// Marca confirmadoEm (se ainda não tiver) nas duas cópias do registro
// (índice por token e a chave original) e devolve o resultado pra tela.
async function confirmarNoStore(
  store: ReturnType<typeof getStore>,
  token: string,
  registro: RegistroLembreteGenerico,
): Promise<ResultadoConfirmacao> {
  const jaConfirmado = registro.confirmadoEm !== null
  if (!jaConfirmado) {
    const atualizado: RegistroLembreteGenerico = { ...registro, confirmadoEm: new Date().toISOString() }
    await store.setJSON(`token__${token}`, atualizado)
    await store.setJSON(registro.chave, atualizado)
  }
  return { ok: true, jaConfirmado, data: registro.data, hora: registro.hora }
}

export const confirmarPresenca = createServerFn({ method: 'POST' })
  .validator(z.object({ token: z.string().trim().min(1).max(200) }))
  .handler(async ({ data }): Promise<ResultadoConfirmacao> => {
    const token = (data.token || '').trim()
    if (!token) return { ok: false, motivo: 'token-invalido' }

    const mentoriaStore = lembretesMentoriaStore()
    const registroMentoria = (await mentoriaStore.get(`token__${token}`, { type: 'json' })) as RegistroLembreteMentoria | null
    if (registroMentoria) {
      const jaConfirmado = registroMentoria.confirmadoEm !== null
      if (!jaConfirmado) {
        const atualizado: RegistroLembreteMentoria = { ...registroMentoria, confirmadoEm: new Date().toISOString() }
        await mentoriaStore.setJSON(`token__${token}`, atualizado)
        await mentoriaStore.setJSON(registroMentoria.chave, atualizado)
      }

      // Busca a mentoria só pra mostrar data e hora na tela de volta — só
      // esse tipo de registro precisa disso (não guarda data/hora direto).
      const individuais = getStore({ name: STORES.mentorias, consistency: 'strong' })
      const grupos = getStore({ name: STORES.mentoriasGrupo, consistency: 'strong' })
      const slot =
        ((await individuais.get(registroMentoria.slotId, { type: 'json' })) as MentoriaSlot | null) ??
        ((await grupos.get(registroMentoria.slotId, { type: 'json' })) as MentoriaGrupoSlot | null)

      return { ok: true, jaConfirmado, data: slot?.date, hora: slot?.time, duracao: slot?.duration }
    }

    const simuladoStore = getStore({ name: STORES.lembretesSimulado, consistency: 'strong' })
    const registroSimulado = (await simuladoStore.get(`token__${token}`, { type: 'json' })) as RegistroLembreteGenerico | null
    if (registroSimulado) return confirmarNoStore(simuladoStore, token, registroSimulado)

    const aulaStore = getStore({ name: STORES.lembretesAula, consistency: 'strong' })
    const registroAula = (await aulaStore.get(`token__${token}`, { type: 'json' })) as RegistroLembreteGenerico | null
    if (registroAula) return confirmarNoStore(aulaStore, token, registroAula)

    return { ok: false, motivo: 'token-invalido' }
  })
