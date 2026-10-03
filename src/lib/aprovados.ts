import { createServerFn } from '@tanstack/react-start'
import { getServerUser } from './auth'
import { userHasRole } from './roles'
import { aprovadosStore, type StoredApprovedStudent } from './aprovados.server'

// O que sai pro navegador. A foto NÃO vai junto em base64: é servida como
// imagem de verdade em /foto-aprovado/<id> (routes/foto-aprovado.$id.ts).
// Embutida, cada foto aparecia duas vezes no HTML da home (no <img> e no
// payload de hidratação do loader) — com 16 aprovados a home passou de 4,7 MB,
// e o Google só lê os primeiros ~2 MB de uma página (issue #316).
export type ApprovedStudent = Omit<StoredApprovedStudent, 'photoDataUrl'> & { photoUrl: string }

// O id nunca é reaproveitado e a foto não é editável (só excluir e cadastrar
// de novo), então a URL pode ter cache longo sem risco de mostrar foto velha.
function toPublic({ photoDataUrl: _omit, ...item }: StoredApprovedStudent): ApprovedStudent {
  return { ...item, photoUrl: `/foto-aprovado/${item.id}` }
}

// Tamanho máximo aceito pra foto já comprimida (base64). O admin redimensiona
// e comprime no navegador antes de enviar, então isso raramente é atingido —
// é só um teto de segurança contra fotos enormes escapando da compressão.
const MAX_PHOTO_DATA_URL_LENGTH = 2_500_000

async function requireAdmin() {
  const user = await getServerUser()
  if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')
  return user
}

// Lista completa da galeria — pública (sem exigir login), já que agora é uma
// seção da home pra visitante ainda não-aluno ver como prova social. Só o
// nome, foto, faculdade, curso e depoimento de quem a professora cadastrou
// (dados que já nascem pra serem públicos, ver addAprovado) ficam visíveis;
// nenhum outro dado do aluno passa por aqui.
export const listAprovados = createServerFn({ method: 'GET' }).handler(async (): Promise<ApprovedStudent[]> => {
  const store = aprovadosStore()
  const { blobs } = await store.list()
  const items: ApprovedStudent[] = []
  for (const blob of blobs) {
    const value = await store.get(blob.key, { type: 'json' })
    if (value) items.push(toPublic(value as StoredApprovedStudent))
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
    const item: StoredApprovedStudent = {
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
    return toPublic(item)
  })

export const deleteAprovado = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin()
    const store = aprovadosStore()
    await store.delete(data.id)
    return { ok: true }
  })
