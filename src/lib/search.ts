import { createServerFn } from '@tanstack/react-start'
import { getServerUser } from './auth'
import { userHasRole, isStaff } from './roles'
import { listLessons } from './aulas'
import { listMaterials } from './materials'
import { listTemas } from './temas-redacao'
import { listSimulados } from './simulados'
import { listContentItems, CONTENT_SECTIONS, type ContentSection } from './content-library'

export type SearchResultType = 'aula' | 'material' | 'tema' | 'simulado' | ContentSection

export type SearchResult = {
  id: string
  type: SearchResultType
  title: string
  subtitle: string
  href: string
}

const SECTION_HREF: Record<ContentSection, string> = {
  biblioteca: '/conteudo/biblioteca',
  questoes: '/conteudo/questoes',
  simulados: '/conteudo/simulados',
  repertorios: '/conteudo/repertorios',
  dicas: '/conteudo/dicas',
  gabaritos: '/conteudo/gabaritos',
}

function matches(query: string, ...fields: Array<string | undefined | null>): boolean {
  return fields.some((field) => !!field && field.toLowerCase().includes(query))
}

// Busca em todo o conteúdo real da plataforma (aulas, materiais, temas de redação,
// simulados e as bibliotecas de PDF) para alimentar a busca da topbar do dashboard.
export const searchContent = createServerFn({ method: 'GET' })
  .inputValidator((data: { query: string }) => data)
  .handler(async ({ data }): Promise<SearchResult[]> => {
    const user = await getServerUser()
    if (!user || (!userHasRole(user, 'aprovado') && !isStaff(user))) return []

    const query = data.query.trim().toLowerCase()
    if (query.length < 2) return []

    const sectionKeys = Object.keys(CONTENT_SECTIONS) as ContentSection[]

    const [lessons, materials, temas, simulados, ...sections] = await Promise.all([
      listLessons().catch(() => []),
      listMaterials().catch(() => []),
      listTemas().catch(() => []),
      listSimulados().catch(() => []),
      ...sectionKeys.map((section) => listContentItems({ data: { section } }).catch(() => [])),
    ])

    const results: SearchResult[] = []

    for (const lesson of lessons) {
      if (matches(query, lesson.title, lesson.module, lesson.description)) {
        results.push({ id: `aula-${lesson.id}`, type: 'aula', title: lesson.title, subtitle: lesson.module, href: '/aulas' })
      }
    }

    for (const material of materials) {
      if (matches(query, material.title, material.description, material.tag)) {
        results.push({ id: `material-${material.id}`, type: 'material', title: material.title, subtitle: material.tag, href: '/materiais' })
      }
    }

    for (const tema of temas) {
      if (matches(query, tema.title, tema.proposta)) {
        results.push({ id: `tema-${tema.id}`, type: 'tema', title: tema.title, subtitle: 'Tema de redação', href: '/redacoes' })
      }
    }

    for (const simulado of simulados) {
      if (matches(query, simulado.title)) {
        results.push({
          id: `simulado-${simulado.id}`,
          type: 'simulado',
          title: simulado.title,
          subtitle: `${simulado.totalQuestions} questão${simulado.totalQuestions === 1 ? '' : 'ões'}`,
          href: '/simulados',
        })
      }
    }

    sections.forEach((items, index) => {
      const section = sectionKeys[index]
      for (const item of items) {
        if (matches(query, item.title, item.description)) {
          results.push({ id: `${section}-${item.id}`, type: section, title: item.title, subtitle: CONTENT_SECTIONS[section], href: SECTION_HREF[section] })
        }
      }
    })

    return results.slice(0, 20)
  })
