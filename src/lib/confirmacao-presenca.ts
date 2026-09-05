import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { STORES } from './blob-stores'

// Esta é a única server function do projeto sem checagem de login, e é de
// propósito: ela atende o link do e-mail de lembrete, e exigir login ali
// derrotaria o objetivo de um lembrete rápido de "confirmo que vou".
//
// Por isso a resposta é deliberadamente pobre: devolve só a data e a hora da
// mentoria — que quem recebeu o e-mail já sabe, porque estava escrito nele.
// Nunca devolve nome, e-mail, quem mais está no grupo, nem qualquer outro dado
// de aluno. O token é um UUID aleatório gerado no envio, então não dá pra
// adivinhar nem enumerar, e vale só pra uma mentoria de um aluno.

type RegistroLembrete = {
  chave: string
  slotId: string
  email: string
  token: string
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

function lembretesStore() {
  return getStore({ name: STORES.lembretesMentoria, consistency: 'strong' })
}

export const confirmarPresenca = createServerFn({ method: 'POST' })
  .validator(z.object({ token: z.string().trim().min(1).max(200) }))
  .handler(async ({ data }): Promise<ResultadoConfirmacao> => {
    const token = (data.token || '').trim()
    if (!token) return { ok: false, motivo: 'token-invalido' }

    const store = lembretesStore()
    const registro = (await store.get(`token__${token}`, { type: 'json' })) as RegistroLembrete | null
    if (!registro) return { ok: false, motivo: 'token-invalido' }

    const jaConfirmado = registro.confirmadoEm !== null

    if (!jaConfirmado) {
      const atualizado: RegistroLembrete = { ...registro, confirmadoEm: new Date().toISOString() }
      await store.setJSON(`token__${token}`, atualizado)
      await store.setJSON(registro.chave, atualizado)
    }

    // Busca a mentoria só pra mostrar data e hora na tela de volta.
    const individuais = getStore({ name: STORES.mentorias, consistency: 'strong' })
    const grupos = getStore({ name: STORES.mentoriasGrupo, consistency: 'strong' })

    const slot =
      ((await individuais.get(registro.slotId, { type: 'json' })) as MentoriaSlot | null) ??
      ((await grupos.get(registro.slotId, { type: 'json' })) as MentoriaGrupoSlot | null)

    return {
      ok: true,
      jaConfirmado,
      data: slot?.date,
      hora: slot?.time,
      duracao: slot?.duration,
    }
  })
