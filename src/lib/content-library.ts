import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { getServerUser } from './auth'
import { userHasRole, getStudentIdentity } from './roles'
import { watermarkPdfDataUrl } from './watermark'

// Seções de conteúdo em PDF geridas pela admin. Cada uma tem sua própria "gaveta" de arquivos.
export const CONTENT_SECTIONS = {
  biblioteca: 'Biblioteca',
  questoes: 'Questões',
  simulados: 'Simulados',
  repertorios: 'Repertórios',
  dicas: 'Dicas',
  gabaritos: 'Gabaritos dos Simulados',
} as const

export type ContentSection = keyof typeof CONTENT_SECTIONS

export function isContentSection(value: string): value is ContentSection {
  return Object.prototype.hasOwnProperty.call(CONTENT_SECTIONS, value)
}

export type ContentItem = {
  id: string
  title: string
  description: string
  fileName: string
  fileDataUrl: string
  createdAt: string
}

const MAX_FILE_DATA_URL_LENGTH = 16_000_000

function storeFor(section: ContentSection) {
  return getStore({ name: `content-library-${section}`, consistency: 'strong' })
}

async function requireAdmin(section: ContentSection) {
  const user = await getServerUser()
  if (!user) throw new Error('Acesso negado.')
  // "admin" pode gerenciar qualquer seção. "professor" só pode gerenciar Dicas e Gabaritos.
  const allowed = userHasRole(user, 'admin')
    || ((section === 'dicas' || section === 'gabaritos') && userHasRole(user, 'professor'))
  if (!allowed) throw new Error('Acesso negado.')
  return user
}

async function requireStudent() {
  const user = await getServerUser()
  if (!user || (!userHasRole(user, 'aprovado') && !userHasRole(user, 'admin'))) {
    throw new Error('Acesso negado.')
  }
  return user
}

export const listContentItems = createServerFn({ method: 'GET' })
  .inputValidator((data: { section: ContentSection }) => data)
  .handler(async ({ data }) => {
    await requireStudent()
    if (!isContentSection(data.section)) throw new Error('Seção inválida.')

    const store = storeFor(data.section)
    const { blobs } = await store.list()
    const items: ContentItem[] = []
    for (const blob of blobs) {
      const value = await store.get(blob.key, { type: 'json' })
      if (value) items.push(value as ContentItem)
    }
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return items.map(({ fileDataUrl: _omit, ...meta }) => meta)
  })

export const getContentItemFile = createServerFn({ method: 'GET' })
  .inputValidator((data: { section: ContentSection; id: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireStudent()
    if (!isContentSection(data.section)) throw new Error('Seção inválida.')

    const store = storeFor(data.section)
    const item = await store.get(data.id, { type: 'json' })
    if (!item) throw new Error('Arquivo não encontrado.')
    const { fileName, fileDataUrl } = item as ContentItem
    const { name, cpf } = getStudentIdentity(user)
    let watermarked = fileDataUrl
    try {
      watermarked = await watermarkPdfDataUrl(fileDataUrl, name, cpf)
    } catch {
      // se a marca d'água falhar, o aluno ainda recebe o arquivo original
    }
    return { fileName, fileDataUrl: watermarked }
  })

export const addContentItem = createServerFn({ method: 'POST' })
  .inputValidator((data: {
    section: ContentSection
    title: string
    description: string
    fileName: string
    fileDataUrl: string
  }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(data.section)
    if (!isContentSection(data.section)) throw new Error('Seção inválida.')
    if (!data.title.trim()) throw new Error('Dê um título para o arquivo.')
    if (!data.fileDataUrl || !data.fileName) throw new Error('Escolha um arquivo PDF para enviar.')

    const extension = data.fileName.toLowerCase().slice(data.fileName.lastIndexOf('.'))
    if (extension !== '.pdf') throw new Error('Envie um arquivo em PDF.')
    if (data.fileDataUrl.length > MAX_FILE_DATA_URL_LENGTH) {
      throw new Error('Esse arquivo é muito grande. Envie um PDF de até 12MB.')
    }

    const store = storeFor(data.section)
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const item: ContentItem = {
      id,
      title: data.title.trim(),
      description: data.description.trim(),
      fileName: data.fileName,
      fileDataUrl: data.fileDataUrl,
      createdAt: new Date().toISOString(),
    }
    await store.setJSON(id, item)
    const { fileDataUrl: _omit, ...meta } = item
    return meta
  })

export const deleteContentItem = createServerFn({ method: 'POST' })
  .inputValidator((data: { section: ContentSection; id: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(data.section)
    if (!isContentSection(data.section)) throw new Error('Seção inválida.')
    const store = storeFor(data.section)
    await store.delete(data.id)
    return { ok: true }
  })
