import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { z } from 'zod'
import { getServerUser } from './auth'
import { userHasRole } from './roles'
import { DOWNLOAD_CHUNK_CHARS } from './upload-limits'

// Entrega de arquivo grande em pedaços.
//
// A resposta de uma função da Netlify também para em 6MB, então um PDF de 10MB
// não volta de uma vez — nem carimbado, nem cru. Aqui o arquivo JÁ CARIMBADO é
// guardado num rascunho temporário, partido em pedaços, e o navegador puxa
// pedaço a pedaço e remonta.
//
// A marca d'água continua sendo aplicada no servidor, antes de guardar: se ela
// passasse pro navegador, o arquivo sem marca chegaria na máquina do aluno e a
// proteção deixaria de existir.

const partsStore = () => getStore({ name: 'download-parts', consistency: 'strong' })

type DownloadMeta = {
  totalChunks: number
  fileName: string
  mime: string
  /** Dono do rascunho. Sem isso, um aluno com o token baixaria o PDF carimbado de outro. */
  owner: string
  createdAt: string
}

const tokenSchema = z.string().trim().regex(/^[a-z0-9-]{8,64}$/, 'Download inválido.')

async function requireStudent() {
  const user = await getServerUser()
  if (!user || (!userHasRole(user, 'aprovado') && !userHasRole(user, 'admin') && !userHasRole(user, 'professor'))) {
    throw new Error('Acesso negado.')
  }
  return user
}

function idDoUsuario(user: unknown): string {
  const u = user as Record<string, any>
  return String(u?.id || u?.email || '')
}

/** O que o navegador precisa pra montar o arquivo de volta. */
export type PreparedDownload = {
  fileName: string
  /** Presente só quando o arquivo é pequeno: veio inteiro, sem rascunho. */
  fileDataUrl?: string
  /** Presente só quando o arquivo é grande e vai em pedaços. */
  token?: string
  totalChunks?: number
  mime?: string
}

/**
 * Decide como o arquivo volta: inteiro, se couber na resposta; em pedaços, se não.
 *
 * Chamada de dentro dos handlers de download, no servidor, depois da marca d'água.
 */
export async function prepareDownload(
  user: unknown,
  fileName: string,
  dataUrl: string,
): Promise<PreparedDownload> {
  const virgula = dataUrl.indexOf(',')
  const base64 = dataUrl.slice(virgula + 1)
  const mime = dataUrl.slice('data:'.length, virgula).replace(';base64', '') || 'application/octet-stream'

  if (base64.length <= DOWNLOAD_CHUNK_CHARS) {
    return { fileName, fileDataUrl: dataUrl }
  }

  const token = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  const store = partsStore()
  const totalChunks = Math.ceil(base64.length / DOWNLOAD_CHUNK_CHARS)

  for (let i = 0; i < totalChunks; i++) {
    await store.set(`${token}/${i}`, base64.slice(i * DOWNLOAD_CHUNK_CHARS, (i + 1) * DOWNLOAD_CHUNK_CHARS))
  }
  const meta: DownloadMeta = {
    totalChunks,
    fileName,
    mime,
    owner: idDoUsuario(user),
    createdAt: new Date().toISOString(),
  }
  await store.setJSON(`${token}/meta`, meta)

  return { fileName, token, totalChunks, mime }
}

export const getDownloadChunk = createServerFn({ method: 'GET' })
  .validator(z.object({ token: tokenSchema, index: z.number().int().min(0).max(999) }))
  .handler(async ({ data }) => {
    const user = await requireStudent()
    const store = partsStore()

    const meta = (await store.get(`${data.token}/meta`, { type: 'json' })) as DownloadMeta | null
    if (!meta) throw new Error('O download expirou. Tente baixar de novo.')
    if (meta.owner !== idDoUsuario(user)) throw new Error('Acesso negado.')
    if (data.index >= meta.totalChunks) throw new Error('Pedaço fora da sequência.')

    const chunk = await store.get(`${data.token}/${data.index}`, { type: 'text' })
    if (chunk == null) throw new Error('O download expirou. Tente baixar de novo.')

    return { chunk }
  })

export const finishChunkedDownload = createServerFn({ method: 'POST' })
  .validator(z.object({ token: tokenSchema }))
  .handler(async ({ data }) => {
    const user = await requireStudent()
    const store = partsStore()

    const meta = (await store.get(`${data.token}/meta`, { type: 'json' })) as DownloadMeta | null
    // Rascunho já apagado, ou de outro aluno: não há o que fazer, e não é erro
    // que valha estourar na tela de quem acabou de baixar o arquivo com sucesso.
    if (!meta || meta.owner !== idDoUsuario(user)) return { ok: true }

    const alvos = [`${data.token}/meta`, ...Array.from({ length: meta.totalChunks }, (_, i) => `${data.token}/${i}`)]
    await Promise.allSettled(alvos.map((chave) => store.delete(chave)))
    return { ok: true }
  })
