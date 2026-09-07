import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { getServerUser } from './auth'
import { userHasRole } from './roles'

export type ApprovedStudent = {
  id: string
  name: string
  university: string
  course: string // pode ficar vazio (opcional no cadastro)
  year: string // ano de aprovação (ex.: "2026") — opcional, usado pra ordenar a galeria
  quote: string // depoimento curto, opcional
  photoFileName: string
  photoDataUrl: string // base64 — já redimensionada/comprimida no navegador antes do envio
  createdAt: string
}

// Tamanho máximo aceito pra foto já comprimida (base64). O admin redimensiona
// e comprime no navegador antes de enviar, então isso raramente é atingido —
// é só um teto de segurança contra fotos enormes escapando da compressão.
const MAX_PHOTO_DATA_URL_LENGTH = 2_500_000

function aprovadosStore() {
  return getStore({ name: 'aprovados-galeria', consistency: 'strong' })
}

async function requireAdmin() {
  const user = await getServerUser()
  if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')
  return user
}

// Lista completa da galeria pra área do aluno (aprovado ou admin) — com foto,
// já que aqui (diferente de Materiais) a foto é pra ser vista na tela, não
// baixada com marca d'água.
export const listAprovados = createServerFn({ method: 'GET' }).handler(async (): Promise<ApprovedStudent[]> => {
  const user = await getServerUser()
  if (!user || (!userHasRole(user, 'aprovado') && !userHasRole(user, 'admin'))) {
    throw new Error('Acesso negado.')
  }

  const store = aprovadosStore()
  const { blobs } = await store.list()
  const items: ApprovedStudent[] = []
  for (const blob of blobs) {
    const value = await store.get(blob.key, { type: 'json' })
    if (value) items.push(value as ApprovedStudent)
  }

  // Mais recentes primeiro: ano de aprovação (desc), depois data de cadastro (desc).
  // Sem ano informado, o item entra no fim da lista.
  items.sort((a, b) => {
    if (a.year !== b.year) return (b.year || '0').localeCompare(a.year || '0')
    return b.createdAt.localeCompare(a.createdAt)
  })
  return items
})

export const addAprovado = createServerFn({ method: 'POST' })
  .inputValidator((data: {
    name: string
    university: string
    course?: string
    year?: string
    quote?: string
    photoFileName: string
    photoDataUrl: string
  }) => data)
  .handler(async ({ data }) => {
    await requireAdmin()

    if (!data.name.trim()) throw new Error('Informe o nome do aluno.')
    if (!data.university.trim()) throw new Error('Informe a faculdade/universidade.')
    if (!data.photoDataUrl || !data.photoFileName) throw new Error('Envie uma foto do aluno.')
    if (!data.photoDataUrl.startsWith('data:image/')) {
      throw new Error('Envie um arquivo de imagem válido (JPG, PNG ou WEBP).')
    }
    if (data.photoDataUrl.length > MAX_PHOTO_DATA_URL_LENGTH) {
      throw new Error('Essa imagem ainda está grande demais. Tente outra foto.')
    }
    if (data.year && !/^\d{4}$/.test(data.year.trim())) {
      throw new Error('Informe o ano de aprovação com 4 dígitos (ex.: 2026).')
    }

    const store = aprovadosStore()
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const item: ApprovedStudent = {
      id,
      name: data.name.trim(),
      university: data.university.trim(),
      course: data.course?.trim() || '',
      year: data.year?.trim() || '',
      quote: data.quote?.trim() || '',
      photoFileName: data.photoFileName,
      photoDataUrl: data.photoDataUrl,
      createdAt: new Date().toISOString(),
    }

    await store.setJSON(id, item)
    return item
  })

export const deleteAprovado = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin()
    const store = aprovadosStore()
    await store.delete(data.id)
    return { ok: true }
  })
