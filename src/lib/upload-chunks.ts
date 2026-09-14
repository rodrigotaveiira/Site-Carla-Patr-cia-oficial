import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { z } from 'zod'
import { getServerUser } from './auth'
import { userHasRole } from './roles'
import { MAX_CHUNK_BYTES, MAX_CHUNKED_UPLOAD_BYTES, MAX_CHUNK_DATA_LENGTH } from './upload-limits'

// Envio de arquivo em pedaços.
//
// Um arquivo vai embutido na requisição, em base64, e as funções da Netlify
// recusam corpo acima de 6MB — o que limita um envio de uma vez só a ~4,4MB
// (ver #127). Aqui o navegador parte o arquivo em pedaços de ~3MB, manda um por
// requisição, e o servidor remonta no final. Cada requisição fica pequena, e o
// tamanho total deixa de esbarrar no limite.
//
// Os pedaços ficam num store separado e são apagados assim que o arquivo é
// remontado (ou quando o envio é abortado). Nada aqui é conteúdo publicado:
// é rascunho de trânsito.

const chunkStore = () => getStore({ name: 'upload-chunks', consistency: 'strong' })

/** Só quem pode publicar pode ocupar espaço com pedaços. */
async function requireUploader() {
  const user = await getServerUser()
  if (!user) throw new Error('Acesso negado.')
  if (!userHasRole(user, 'admin') && !userHasRole(user, 'professor')) {
    throw new Error('Acesso negado.')
  }
  return user
}

/** Quantos pedaços cabem no teto total — usado pra barrar envio absurdo. */
const MAX_CHUNKS = Math.ceil(MAX_CHUNKED_UPLOAD_BYTES / MAX_CHUNK_BYTES) + 1

const uploadIdSchema = z.string().trim().regex(/^[a-z0-9-]{8,64}$/, 'Envio inválido.')

/**
 * Como o formulário se refere a um arquivo que já subiu em pedaços, no lugar de
 * mandar a data URL inteira na requisição de publicação.
 */
export const chunkedUploadRefSchema = z.object({
  uploadId: uploadIdSchema,
  mime: z.string().trim().max(120).regex(/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i, 'Tipo de arquivo inválido.'),
})

export const startChunkedUpload = createServerFn({ method: 'POST' })
  .validator(z.object({ totalChunks: z.number().int().min(1).max(MAX_CHUNKS) }))
  .handler(async ({ data }) => {
    await requireUploader()
    const uploadId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    await chunkStore().setJSON(`${uploadId}/meta`, {
      totalChunks: data.totalChunks,
      createdAt: new Date().toISOString(),
    })
    return { uploadId }
  })

export const sendUploadChunk = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      uploadId: uploadIdSchema,
      index: z.number().int().min(0).max(MAX_CHUNKS - 1),
      // Só o base64 do pedaço, sem o prefixo `data:...;base64,` — o prefixo é
      // do arquivo inteiro e é remontado junto no final.
      chunk: z.string().min(1).max(MAX_CHUNK_DATA_LENGTH).regex(/^[A-Za-z0-9+/]*={0,2}$/, 'Pedaço inválido.'),
    }),
  )
  .handler(async ({ data }) => {
    await requireUploader()

    const meta = (await chunkStore().get(`${data.uploadId}/meta`, { type: 'json' })) as
      | { totalChunks: number }
      | null
    if (!meta) throw new Error('Envio expirado. Tente enviar o arquivo de novo.')
    if (data.index >= meta.totalChunks) throw new Error('Pedaço fora da sequência.')

    await chunkStore().set(`${data.uploadId}/${data.index}`, data.chunk)
    return { ok: true }
  })

/**
 * Remonta a data URL completa a partir dos pedaços e apaga o rascunho.
 *
 * Chamada de dentro de `addContentItem` / `addMaterial`, no servidor — não é
 * exposta como server function, porque quem valida o conteúdo (assinatura do
 * formato, tamanho, zip do .docx) é quem publica.
 */
export async function assembleUpload(uploadId: string, mime: string): Promise<string> {
  const store = chunkStore()
  const meta = (await store.get(`${uploadId}/meta`, { type: 'json' })) as { totalChunks: number } | null
  if (!meta) throw new Error('Envio expirado. Tente enviar o arquivo de novo.')

  const partes: string[] = []
  for (let i = 0; i < meta.totalChunks; i++) {
    const parte = await store.get(`${uploadId}/${i}`, { type: 'text' })
    if (parte == null) throw new Error('Um pedaço do arquivo não chegou. Tente enviar de novo.')
    partes.push(parte)
  }

  await discardUpload(uploadId, meta.totalChunks)

  const base64 = partes.join('')
  // Confere o tamanho já remontado: cada pedaço passou pequeno, mas a soma
  // precisa respeitar o teto total.
  const bytes = Math.floor((base64.length * 3) / 4)
  if (bytes > MAX_CHUNKED_UPLOAD_BYTES) {
    throw new Error('Esse arquivo é muito grande.')
  }

  return `data:${mime};base64,${base64}`
}

/** Apaga os pedaços de um envio — no fim dele ou quando o navegador desiste. */
export async function discardUpload(uploadId: string, totalChunks: number): Promise<void> {
  const store = chunkStore()
  const alvos = [`${uploadId}/meta`, ...Array.from({ length: totalChunks }, (_, i) => `${uploadId}/${i}`)]
  await Promise.allSettled(alvos.map((chave) => store.delete(chave)))
}

export const abortChunkedUpload = createServerFn({ method: 'POST' })
  .validator(z.object({ uploadId: uploadIdSchema, totalChunks: z.number().int().min(1).max(MAX_CHUNKS) }))
  .handler(async ({ data }) => {
    await requireUploader()
    await discardUpload(data.uploadId, data.totalChunks)
    return { ok: true }
  })
