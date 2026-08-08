import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { getServerUser } from './auth'

// Tamanho máximo aceito para a foto (em base64). ~2MB de imagem original.
const MAX_DATA_URL_LENGTH = 3_000_000

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
  .inputValidator((data: { dataUrl: string }) => data)
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user) throw new Error('Você precisa estar logado.')

    if (!data.dataUrl || !data.dataUrl.startsWith('data:image/')) {
      throw new Error('Envie um arquivo de imagem válido (JPG, PNG ou WEBP).')
    }

    if (data.dataUrl.length > MAX_DATA_URL_LENGTH) {
      throw new Error('Essa imagem é muito grande. Escolha uma foto de até 2MB.')
    }

    const store = photosStore()
    await store.set(user.id, data.dataUrl)
    return { ok: true }
  })
