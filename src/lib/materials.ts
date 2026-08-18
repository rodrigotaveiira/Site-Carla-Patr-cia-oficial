import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { getServerUser } from './auth'
import { userHasRole, getStudentIdentity } from './roles'
import { watermarkFileDataUrl } from './watermark'

export type Material = {
  id: string
  title: string
  description: string
  tag: string
  accent: string
  fileName: string
  fileDataUrl: string // base64 (data:application/...;base64,....)
  createdAt: string
}

// Tamanho máximo aceito para o arquivo em base64 (~12MB de arquivo original).
const MAX_FILE_DATA_URL_LENGTH = 16_000_000

const ALLOWED_EXTENSIONS = ['.docx', '.pdf']

function materialsStore() {
  return getStore({ name: 'student-materials', consistency: 'strong' })
}

async function requireAdmin() {
  const user = await getServerUser()
  if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')
  return user
}

// Lista visível para qualquer aluno logado (aprovado ou admin) — usada no dashboard.
export const listMaterials = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getServerUser()
  if (!user || (!userHasRole(user, 'aprovado') && !userHasRole(user, 'admin'))) {
    throw new Error('Acesso negado.')
  }

  const store = materialsStore()
  const { blobs } = await store.list()
  const materials: Material[] = []

  for (const blob of blobs) {
    const value = await store.get(blob.key, { type: 'json' })
    if (value) materials.push(value as Material)
  }

  materials.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  // Não manda o arquivo inteiro na listagem (pesado) — só os metadados.
  return materials.map(({ fileDataUrl: _omit, ...meta }) => meta)
})

// Busca o arquivo de um material específico (só quando o aluno clica em baixar).
// O arquivo é carimbado na hora com o nome e o CPF de quem está baixando.
export const getMaterialFile = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || (!userHasRole(user, 'aprovado') && !userHasRole(user, 'admin'))) {
      throw new Error('Acesso negado.')
    }
    const store = materialsStore()
    const material = await store.get(data.id, { type: 'json' })
    if (!material) throw new Error('Material não encontrado.')
    const { fileName, fileDataUrl } = material as Material
    const { name, cpf } = getStudentIdentity(user)
    const watermarked = await watermarkFileDataUrl(fileDataUrl, fileName, name, cpf)
    return { fileName, fileDataUrl: watermarked }
  })

export const addMaterial = createServerFn({ method: 'POST' })
  .inputValidator((data: {
    title: string
    description: string
    tag: string
    accent: string
    fileName: string
    fileDataUrl: string
  }) => data)
  .handler(async ({ data }) => {
    await requireAdmin()

    if (!data.title.trim()) throw new Error('Dê um título para o material.')
    if (!data.fileDataUrl || !data.fileName) throw new Error('Escolha um arquivo para enviar.')

    const extension = data.fileName.toLowerCase().slice(data.fileName.lastIndexOf('.'))
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      throw new Error('Envie um arquivo Word (.docx) ou PDF.')
    }

    if (data.fileDataUrl.length > MAX_FILE_DATA_URL_LENGTH) {
      throw new Error('Esse arquivo é muito grande. Envie um arquivo de até 12MB.')
    }

    const store = materialsStore()
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const material: Material = {
      id,
      title: data.title.trim(),
      description: data.description.trim(),
      tag: data.tag.trim() || 'Material',
      accent: data.accent || '#6d28d9',
      fileName: data.fileName,
      fileDataUrl: data.fileDataUrl,
      createdAt: new Date().toISOString(),
    }

    await store.setJSON(id, material)
    const { fileDataUrl: _omit, ...meta } = material
    return meta
  })

export const deleteMaterial = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin()
    const store = materialsStore()
    await store.delete(data.id)
    return { ok: true }
  })
