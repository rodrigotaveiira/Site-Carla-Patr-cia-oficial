import { createFileRoute, redirect } from '@tanstack/react-router'
import { BookCheck, BookMarked, CircleHelp, Download, Library, ScrollText, Target, Zap, type LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole, isStaff } from '@/lib/roles'
import {
  CONTENT_SECTIONS, DEFAULT_DESCRIPTION_COLOR, DEFAULT_TITLE_COLOR, DICA_CATEGORIES,
  getContentItemFile, isContentSection, listContentItems, resolveDicaCategory, textColorValue,
  type ContentItemMeta, type ContentSection, type DicaCategory,
} from '@/lib/content-library'
import { downloadDataUrl } from '@/lib/download-file'
import { EmptyState } from '@/components/EmptyState'
import { ListSkeleton } from '@/components/ListSkeleton'

export const Route = createFileRoute('/_app/conteudo/$secao')({
  beforeLoad: async ({ params }) => {
    if (!isContentSection(params.secao)) throw redirect({ to: '/dashboard' })

    if (typeof window !== 'undefined') {
      const localUser = readLocalUser()
      if (localUser) return { user: localUser }
    }

    const user = await getServerUser()
    if (!user) throw redirect({ to: '/login' })
    if (!userHasRole(user, 'aprovado') && !isStaff(user)) throw redirect({ to: '/aguardando-aprovacao' })
    return { user }
  },
  component: ConteudoPage,
})

// Cada seção usa o mesmo componente de lista, mas tem seu próprio ícone e sua própria
// razão de existir — sem isso, as 5 abas viravam a mesma página com o título trocado.
const SECTION_META: Record<ContentSection, {
  icon: LucideIcon
  description: string
  emptyTitle: string
  emptyDescription: string
}> = {
  biblioteca: {
    icon: Library,
    description: 'Textos e leituras selecionadas pela professora Carla para ampliar seu repertório de argumentação.',
    emptyTitle: 'Nenhuma leitura disponível ainda',
    emptyDescription: 'A professora vai adicionar textos em breve. Assim que liberar, eles aparecem aqui.',
  },
  questoes: {
    icon: CircleHelp,
    description: 'Listas de exercícios em PDF para treinar o conteúdo visto nas aulas.',
    emptyTitle: 'Nenhuma lista de questões ainda',
    emptyDescription: 'Assim que a professora enviar exercícios, eles aparecem aqui.',
  },
  simulados: {
    icon: Target,
    description: 'Arquivos de apoio para os simulados aplicados na turma.',
    emptyTitle: 'Nenhum arquivo de simulado ainda',
    emptyDescription: 'Assim que a professora enviar material de apoio, ele aparece aqui.',
  },
  repertorios: {
    icon: BookMarked,
    description: 'Repertórios socioculturais prontos para usar na redação, organizados por tema.',
    emptyTitle: 'Nenhum repertório ainda',
    emptyDescription: 'Assim que a professora adicionar repertórios, eles aparecem aqui.',
  },
  dicas: {
    icon: Zap,
    description: 'Orientações rápidas da professora Carla, separadas em gramática e redação. Escolha a aba e baixe as dicas.',
    emptyTitle: 'Nenhuma dica publicada ainda',
    emptyDescription: 'Assim que a professora enviar uma dica, ela aparece aqui.',
  },
  gabaritos: {
    icon: BookCheck,
    description: 'Gabaritos comentados dos simulados, com a resolução completa de cada questão.',
    emptyTitle: 'Nenhum gabarito disponível ainda',
    emptyDescription: 'Assim que um simulado for corrigido, o gabarito aparece aqui.',
  },
  edital: {
    icon: ScrollText,
    description: 'O edital oficial da prova, com datas, regras de inscrição e conteúdo cobrado. Baixe e leia com atenção.',
    emptyTitle: 'Nenhum edital publicado ainda',
    emptyDescription: 'Assim que o edital da prova for divulgado, a professora publica ele aqui.',
  },
}

function ConteudoPage() {
  const { secao } = Route.useParams()
  const section = secao as ContentSection
  const sectionLabel = CONTENT_SECTIONS[section]
  const meta = SECTION_META[section]
  const Icon = meta.icon
  const isDicas = section === 'dicas'

  const [items, setItems] = useState<ContentItemMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [category, setCategory] = useState<DicaCategory>('gramatica')

  useEffect(() => {
    setLoading(true)
    listContentItems({ data: { section } })
      .then((data) => setItems(data))
      .catch(() => setError('Não foi possível carregar os arquivos agora.'))
      .finally(() => setLoading(false))
  }, [section])

  // Em Dicas o aluno vê uma aba por vez; nas outras seções a lista inteira.
  const visibleItems = useMemo(
    () => (isDicas ? items.filter((item) => resolveDicaCategory(item) === category) : items),
    [items, isDicas, category],
  )

  async function handleDownload(id: string) {
    setDownloadingId(id)
    setError('')
    try {
      const { fileName, fileDataUrl } = await getContentItemFile({ data: { section, id } })
      downloadDataUrl(fileName, fileDataUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível baixar o arquivo.')
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="panel">
      <h1><Icon /> {sectionLabel}</h1>
      <p className="panel-subtitle">{meta.description}</p>
      {!loading && !error && (
        <p className="panel-meta-strip">
          {visibleItems.length === 0
            ? 'Protegido com seu nome e CPF em cada download.'
            : `${visibleItems.length} ${visibleItems.length === 1 ? 'arquivo disponível' : 'arquivos disponíveis'} · o mais recente é de ${new Date(visibleItems[0].createdAt).toLocaleDateString('pt-BR')}`}
        </p>
      )}

      {isDicas && (
        <div className="tab-switch" style={{ marginTop: 16 }} role="tablist">
          {(Object.keys(DICA_CATEGORIES) as DicaCategory[]).map((key) => {
            const count = items.filter((item) => resolveDicaCategory(item) === key).length
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={category === key}
                onClick={() => setCategory(key)}
                className={`tab-switch-btn${category === key ? ' is-active' : ''}`}
              >
                {DICA_CATEGORIES[key]}
                {!loading && count > 0 && <span className="tab-switch-count">{count}</span>}
              </button>
            )
          })}
        </div>
      )}

      {error && <p className="form-error">{error}</p>}
      {loading && <div style={{ marginTop: 20 }}><ListSkeleton rows={3} /></div>}

      <div style={{ display: 'grid', gap: 12, marginTop: 20 }}>
        {visibleItems.map((item) => (
          <div key={item.id} className="list-row">
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', minWidth: 0 }}>
              <Icon color="var(--purple)" style={{ marginTop: 2, flexShrink: 0 }} />
              <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span className="list-title" style={{ color: textColorValue(item.titleColor, DEFAULT_TITLE_COLOR) }}>
                    {item.label}
                  </span>
                  <span className="badge badge-brand" style={{ padding: '2px 9px', fontSize: 11 }}>PDF</span>
                </div>
                {item.description && (
                  <div style={{ color: textColorValue(item.descriptionColor, DEFAULT_DESCRIPTION_COLOR), fontSize: 13, marginTop: 4 }}>
                    {item.description}
                  </div>
                )}
                <div className="list-meta">Adicionado em {new Date(item.createdAt).toLocaleDateString('pt-BR')}</div>
              </div>
            </div>
            <button onClick={() => handleDownload(item.id)} disabled={downloadingId === item.id} className="btn btn-primary btn-sm">
              <Download size={15} /> {downloadingId === item.id ? 'Baixando...' : 'Baixar'}
            </button>
          </div>
        ))}
        {!loading && visibleItems.length === 0 && (
          <EmptyState
            icon={Icon}
            title={isDicas ? `Nenhuma dica de ${DICA_CATEGORIES[category].toLowerCase()} ainda` : meta.emptyTitle}
            description={meta.emptyDescription}
          />
        )}
      </div>
    </div>
  )
}
