import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { z } from 'zod'
import { getServerUser } from './auth'
import { userHasRole, getStudentIdentity } from './roles'
import { watermarkFileDataUrl } from './watermark'
import { validateUpload } from './upload-validation'
import { boundedText, dataUrl as dataUrlSchema, fileName as fileNameSchema, id as idSchema, isoDate } from './schemas'

export type Material = {
  id: string
  title: string
  description: string
  tag: string
  accent: string
  fileName: string
  fileDataUrl: string // base64 (data:application/...;base64,....)
  createdAt: string
  classDate: string | null // data da aula (YYYY-MM-DD); material libera 1 dia antes. null = sem restrição.
}

// Formato devolvido pela listagem: sem o arquivo (pesado), com o status de liberação calculado.
export type MaterialListItem = Omit<Material, 'fileDataUrl'> & {
  released: boolean
  releaseDate: string | null
}

// Tamanho máximo aceito para o arquivo em base64 (~12MB de arquivo original).
const MAX_FILE_DATA_URL_LENGTH = 16_000_000


function materialsStore() {
  return getStore({ name: 'student-materials', consistency: 'strong' })
}

async function requireAdmin() {
  const user = await getServerUser()
  if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')
  return user
}

// Data (YYYY-MM-DD) em que o material libera: um dia antes da data da aula.
// Sem data da aula definida, o material já nasce liberado.
function releaseDateFor(classDate: string | null): string | null {
  if (!classDate) return null
  const date = new Date(`${classDate}T00:00:00`)
  date.setDate(date.getDate() - 1)
  return date.toISOString().slice(0, 10)
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10)
}

function isReleased(material: Material): boolean {
  const releaseDate = releaseDateFor(material.classDate)
  if (!releaseDate) return true
  return todayDateString() >= releaseDate
}

// Lista visível para qualquer aluno logado (aprovado ou admin) — usada no dashboard.
// Admin vê todos os materiais (mesmo os que ainda não liberaram, pra gerenciar).
// Aluno só vê os materiais sem data de aula, ou os que já liberaram (1 dia antes da aula).
export const listMaterials = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getServerUser()
  if (!user || (!userHasRole(user, 'aprovado') && !userHasRole(user, 'admin'))) {
    throw new Error('Acesso negado.')
  }
  const isAdmin = userHasRole(user, 'admin')

  const store = materialsStore()
  const { blobs } = await store.list()
  const materials: Material[] = []

  for (const blob of blobs) {
    const value = await store.get(blob.key, { type: 'json' })
    if (value) materials.push(value as Material)
  }

  materials.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const visible = isAdmin ? materials : materials.filter(isReleased)

  // Não manda o arquivo inteiro na listagem (pesado) — só os metadados,
  // com o status de liberação calculado pra exibir na tela.
  return visible.map(({ fileDataUrl: _omit, ...meta }) => ({
    ...meta,
    released: isReleased(meta as Material),
    releaseDate: releaseDateFor(meta.classDate),
  }))
})

// Busca o arquivo de um material específico (só quando o aluno clica em baixar).
// O arquivo é carimbado na hora com o nome e o CPF de quem está baixando.
export const getMaterialFile = createServerFn({ method: 'GET' })
  .validator(z.object({ id: idSchema }))
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || (!userHasRole(user, 'aprovado') && !userHasRole(user, 'admin'))) {
      throw new Error('Acesso negado.')
    }
    const store = materialsStore()
    const material = await store.get(data.id, { type: 'json' })
    if (!material) throw new Error('Material não encontrado.')
    const materialData = material as Material

    if (!userHasRole(user, 'admin') && !isReleased(materialData)) {
      throw new Error('Este material ainda não foi liberado.')
    }

    const { fileName, fileDataUrl } = materialData
    const { name, cpf } = getStudentIdentity(user)
    const watermarked = await watermarkFileDataUrl(fileDataUrl, fileName, name, cpf)
    return { fileName, fileDataUrl: watermarked }
  })

export const addMaterial = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      title: boundedText(300),
      description: z.string().trim().max(2000),
      tag: z.string().trim().max(60),
      accent: z.string().trim().max(20),
      fileName: fileNameSchema,
      fileDataUrl: dataUrlSchema(MAX_FILE_DATA_URL_LENGTH),
      classDate: z.union([isoDate, z.literal('')]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin()

    validateUpload({
      dataUrl: data.fileDataUrl,
      fileName: data.fileName,
      allowed: ['pdf', 'docx'],
      maxDecodedBytes: 12 * 1024 * 1024,
    })

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
      classDate: data.classDate?.trim() || null,
    }

    await store.setJSON(id, material)
    const { fileDataUrl: _omit, ...meta } = material
    return meta
  })

export const deleteMaterial = createServerFn({ method: 'POST' })
  .validator(z.object({ id: idSchema }))
  .handler(async ({ data }) => {
    await requireAdmin()
    const store = materialsStore()
    await store.delete(data.id)
    return { ok: true }
  })
