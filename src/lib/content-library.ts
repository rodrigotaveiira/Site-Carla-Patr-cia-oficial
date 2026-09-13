import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { z } from 'zod'
import { getServerUser } from './auth'
import { userHasRole, getStudentIdentity } from './roles'
import { watermarkPdfDataUrl } from './watermark'
import { validateUpload } from './upload-validation'
import { boundedText, dataUrl as dataUrlSchema, fileName as fileNameSchema, id as idSchema } from './schemas'
import { notificarNovoConteudo } from './notificar-conteudo'
import { MATERIAS, materiaSchema, type Materia } from './materias'

const contentSectionSchema = z.enum(['biblioteca', 'questoes', 'simulados', 'repertorios', 'dicas', 'gabaritos', 'edital'])

// Seções de conteúdo em PDF geridas pela admin. Cada uma tem sua própria "gaveta" de arquivos.
export const CONTENT_SECTIONS = {
  biblioteca: 'Biblioteca',
  questoes: 'Questões',
  simulados: 'Simulados',
  repertorios: 'Repertórios',
  dicas: 'Dicas',
  gabaritos: 'Gabaritos dos Simulados',
  edital: 'Edital da prova',
} as const

export type ContentSection = keyof typeof CONTENT_SECTIONS

export function isContentSection(value: string): value is ContentSection {
  return Object.prototype.hasOwnProperty.call(CONTENT_SECTIONS, value)
}

// Dicas é dividida nas duas frentes que a professora ensina: o aluno escolhe se
// quer ver o material de gramática ou o de redação. Materiais usa as mesmas
// frentes, por isso os rótulos moram em `materias.ts` — os nomes daqui seguem
// exportados como apelido pra não mexer nas telas que já os importam.
export const DICA_CATEGORIES = MATERIAS
export type DicaCategory = Materia
const dicaCategorySchema = materiaSchema

// Paleta fechada para o título e a descrição. São tokens, não hex livre: assim a
// professora não consegue escolher uma cor ilegível e o site mantém a identidade visual.
export const CONTENT_TEXT_COLORS = {
  navy: { label: 'Azul-marinho', value: '#0f2d52' },
  purple: { label: 'Roxo', value: '#6d28d9' },
  gold: { label: 'Dourado', value: '#8a6d1f' },
  green: { label: 'Verde', value: '#15803d' },
  red: { label: 'Vermelho', value: '#c0392b' },
  muted: { label: 'Cinza', value: '#667085' },
} as const

export type ContentTextColor = keyof typeof CONTENT_TEXT_COLORS

const contentTextColorSchema = z.enum(['navy', 'purple', 'gold', 'green', 'red', 'muted'])

// Cores usadas hoje pela lista — mantidas como padrão para que um item sem cor
// escolhida continue aparecendo exatamente como antes.
export const DEFAULT_TITLE_COLOR: ContentTextColor = 'navy'
export const DEFAULT_DESCRIPTION_COLOR: ContentTextColor = 'muted'

export function textColorValue(color: ContentTextColor | undefined, fallback: ContentTextColor) {
  return CONTENT_TEXT_COLORS[color ?? fallback].value
}

export type ContentItem = {
  id: string
  title: string
  description: string
  fileName: string
  fileDataUrl: string
  createdAt: string
  /** Só em Dicas. Ausente nos PDFs enviados antes das categorias existirem. */
  category?: DicaCategory
  titleColor?: ContentTextColor
  descriptionColor?: ContentTextColor
}

/** O que as telas recebem: o item sem o arquivo, mais o nome já montado. */
export type ContentItemMeta = Omit<ContentItem, 'fileDataUrl'> & { label: string }

const MAX_FILE_DATA_URL_LENGTH = 16_000_000

function storeFor(section: ContentSection) {
  return getStore({ name: `content-library-${section}`, consistency: 'strong' })
}

/** PDF de Dicas enviado antes das categorias existirem entra em Redação. */
export function resolveDicaCategory(item: { category?: DicaCategory }): DicaCategory {
  return item.category ?? 'redacao'
}

// A numeração é calculada na hora de listar, e não gravada no arquivo: assim, se a
// professora excluir a "Dica 2", as seguintes se renumeram sozinhas e a lista nunca
// fica com buraco no meio.
function dicaLabels(items: ContentItem[]) {
  const ascending = [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const counters: Record<DicaCategory, number> = { gramatica: 0, redacao: 0 }
  const labels = new Map<string, string>()
  for (const item of ascending) {
    if (!item.category) {
      // Item antigo: mantém o título que a professora tinha escrito, para nada sumir.
      labels.set(item.id, item.title)
      continue
    }
    counters[item.category] += 1
    labels.set(item.id, `Dica ${counters[item.category]} · ${DICA_CATEGORIES[item.category]}`)
  }
  return labels
}

/**
 * Nome do arquivo como o aluno vê. Em Dicas o nome é montado na hora de listar
 * ("Dica 1 · Gramática") e o campo `title` fica vazio no que foi salvo — usar
 * `item.title` direto faria o e-mail sair sem nome nenhum.
 */
async function displayNameFor(section: ContentSection, item: ContentItem): Promise<string> {
  if (section !== 'dicas') return item.title

  const store = storeFor(section)
  const { blobs } = await store.list()
  const items: ContentItem[] = []
  for (const blob of blobs) {
    const value = await store.get(blob.key, { type: 'json' })
    if (value) items.push(value as ContentItem)
  }
  return dicaLabels(items).get(item.id) ?? item.title
}

function toMeta(section: ContentSection, items: ContentItem[]): ContentItemMeta[] {
  const labels = section === 'dicas' ? dicaLabels(items) : null
  return items.map(({ fileDataUrl: _omit, ...meta }) => ({
    ...meta,
    label: labels?.get(meta.id) ?? meta.title,
  }))
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
  .validator(z.object({ section: contentSectionSchema }))
  .handler(async ({ data }): Promise<ContentItemMeta[]> => {
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
    return toMeta(data.section, items)
  })

export const getContentItemFile = createServerFn({ method: 'GET' })
  .validator(z.object({ section: contentSectionSchema, id: idSchema }))
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
      // Em Dicas a professora põe a marca d'água dela no meio da página, então a
      // faixa central fica livre das marcas de segurança pra não sobrepor as duas.
      watermarked = await watermarkPdfDataUrl(fileDataUrl, name, cpf, {
        clearCenter: data.section === 'dicas',
      })
    } catch {
      // se a marca d'água falhar, o aluno ainda recebe o arquivo original
    }
    return { fileName, fileDataUrl: watermarked }
  })

export const addContentItem = createServerFn({ method: 'POST' })
  .validator(
    z
      .object({
        section: contentSectionSchema,
        // Em Dicas o título é gerado ("Dica 1 · Gramática"), então chega vazio.
        title: z.string().trim().max(300),
        description: z.string().trim().max(2000),
        fileName: fileNameSchema,
        fileDataUrl: dataUrlSchema(MAX_FILE_DATA_URL_LENGTH),
        category: dicaCategorySchema.optional(),
        titleColor: contentTextColorSchema.optional(),
        descriptionColor: contentTextColorSchema.optional(),
      })
      .superRefine((data, ctx) => {
        if (data.section === 'dicas') {
          if (!data.category) {
            ctx.addIssue({ code: 'custom', path: ['category'], message: 'Escolha se a dica é de Gramática ou de Redação.' })
          }
          return
        }
        if (!boundedText(300).safeParse(data.title).success) {
          ctx.addIssue({ code: 'custom', path: ['title'], message: 'Dê um título para o arquivo.' })
        }
      }),
  )
  .handler(async ({ data }) => {
    await requireAdmin(data.section)

    validateUpload({
      dataUrl: data.fileDataUrl,
      fileName: data.fileName,
      allowed: ['pdf'],
      maxDecodedBytes: 12 * 1024 * 1024,
    })

    const store = storeFor(data.section)
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const item: ContentItem = {
      id,
      title: data.title.trim(),
      description: data.description.trim(),
      fileName: data.fileName,
      fileDataUrl: data.fileDataUrl,
      createdAt: new Date().toISOString(),
      ...(data.section === 'dicas' && data.category ? { category: data.category } : {}),
      ...(data.titleColor ? { titleColor: data.titleColor } : {}),
      ...(data.descriptionColor ? { descriptionColor: data.descriptionColor } : {}),
    }
    await store.setJSON(id, item)

    // Aviso por e-mail vem DEPOIS de salvar e nunca derruba a publicação: se
    // algo aqui falhar, o arquivo continua no ar e o erro fica só no log, em
    // vez de virar erro na tela da professora depois que ela já enviou.
    try {
      await notificarNovoConteudo({
        secaoLabel: CONTENT_SECTIONS[data.section],
        secaoSlug: data.section,
        titulo: await displayNameFor(data.section, item),
        descricao: item.description,
      })
    } catch (error) {
      console.error('[conteúdo] não foi possível avisar sobre o arquivo novo:', error)
    }

    const { fileDataUrl: _omit, ...meta } = item
    return meta
  })

export const deleteContentItem = createServerFn({ method: 'POST' })
  .validator(z.object({ section: contentSectionSchema, id: idSchema }))
  .handler(async ({ data }) => {
    await requireAdmin(data.section)
    if (!isContentSection(data.section)) throw new Error('Seção inválida.')
    const store = storeFor(data.section)
    await store.delete(data.id)
    return { ok: true }
  })
