import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { z } from 'zod'
import { getServerUser } from './auth'
import { assertActiveSession } from './session-guard.server'
import { dataUrl as dataUrlSchema } from './schemas'
import { parseDataUrl, sniffKind } from './upload-validation'

// Tamanho máximo aceito para a foto (em base64). ~2MB de imagem original.
const MAX_DATA_URL_LENGTH = 3_000_000
const MAX_DECODED_BYTES = 2 * 1024 * 1024

function photosStore() {
  return getStore({ name: 'profile-photos', consistency: 'strong' })
}

// Busca a foto de perfil do aluno que está logado no momento.
// Retorna null se ele nunca enviou uma foto.
export const getMyProfilePhoto = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getServerUser()
  if (!user) return null

  const store = photosStore()
  const dataUrl = await store.get(user.id, { type: 'text' })
  return dataUrl ?? null
})

// Salva (ou substitui) a foto de perfil do aluno logado.
// "dataUrl" é o resultado de ler o arquivo escolhido com FileReader (base64).
export const saveMyProfilePhoto = createServerFn({ method: 'POST' })
  .validator(z.object({ dataUrl: dataUrlSchema(MAX_DATA_URL_LENGTH) }))
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user) throw new Error('Você precisa estar logado.')
    await assertActiveSession(user)

    // Valida pelo conteúdo: base64 íntegro, tamanho real e assinatura de bytes
    // de imagem — não basta o prefixo "data:image/" (é escolhido pelo cliente).
    const { bytes } = parseDataUrl(data.dataUrl, MAX_DECODED_BYTES)
    if (sniffKind(bytes) !== 'image') {
      throw new Error('Envie um arquivo de imagem válido (JPG, PNG ou WEBP).')
    }

    const store = photosStore()
    await store.set(user.id, data.dataUrl)
    return { ok: true }
  })
