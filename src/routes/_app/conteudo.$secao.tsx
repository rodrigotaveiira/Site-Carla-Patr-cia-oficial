import { createFileRoute, redirect } from '@tanstack/react-router'
import { BookCheck, BookMarked, CircleHelp, Download, Library, Target, Zap, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole, isStaff } from '@/lib/roles'
import {
  CONTENT_SECTIONS, getContentItemFile, isContentSection,
  listContentItems, type ContentItem, type ContentSection,
} from '@/lib/content-library'
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

type ItemMeta = Omit<ContentItem, 'fileDataUrl'>

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
    description: 'Recados rápidos e orientações da professora Carla sobre redação e rotina de estudo.',
    emptyTitle: 'Nenhuma dica publicada ainda',
    emptyDescription: 'Assim que a professora enviar uma dica, ela aparece aqui.',
  },
  gabaritos: {
    icon: BookCheck,
    description: 'Gabaritos comentados dos simulados, com a resolução completa de cada questão.',
    emptyTitle: 'Nenhum gabarito disponível ainda',
    emptyDescription: 'Assim que um simulado for corrigido, o gabarito aparece aqui.',
  },
}

function ConteudoPage() {
  const { secao } = Route.useParams()
  const section = secao as ContentSection
  const sectionLabel = CONTENT_SECTIONS[section]
  const meta = SECTION_META[section]
  const Icon = meta.icon

  const [items, setItems] = useState<ItemMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    listContentItems({ data: { section } })
      .then((data) => setItems(data as ItemMeta[]))
      .catch(() => setError('Não foi possível carregar os arquivos agora.'))
      .finally(() => setLoading(false))
  }, [section])

  async function handleDownload(id: string) {
    setDownloadingId(id)
    setError('')
    try {
      const { fileName, fileDataUrl } = await getContentItemFile({ data: { section, id } })
      const link = document.createElement('a')
      link.download = fileName
      link.href = fileDataUrl
      link.click()
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
          {items.length === 0
            ? 'Protegido com seu nome e CPF em cada download.'
            : `${items.length} ${items.length === 1 ? 'arquivo disponível' : 'arquivos disponíveis'} · o mais recente é de ${new Date(items[0].createdAt).toLocaleDateString('pt-BR')}`}
        </p>
      )}

      {error && <p className="form-error">{error}</p>}
      {loading && <div style={{ marginTop: 20 }}><ListSkeleton rows={3} /></div>}

      <div style={{ display: 'grid', gap: 12, marginTop: 20 }}>
        {items.map((item) => (
          <div key={item.id} className="list-row">
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', minWidth: 0 }}>
              <Icon color="var(--purple)" style={{ marginTop: 2, flexShrink: 0 }} />
              <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span className="list-title">{item.title}</span>
                  <span className="badge badge-brand" style={{ padding: '2px 9px', fontSize: 11 }}>PDF</span>
                </div>
                {item.description && <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{item.description}</div>}
                <div className="list-meta">Adicionado em {new Date(item.createdAt).toLocaleDateString('pt-BR')}</div>
              </div>
            </div>
            <button onClick={() => handleDownload(item.id)} disabled={downloadingId === item.id} className="btn btn-primary btn-sm">
              <Download size={15} /> {downloadingId === item.id ? 'Baixando...' : 'Baixar'}
            </button>
          </div>
        ))}
        {!loading && items.length === 0 && (
          <EmptyState icon={Icon} title={meta.emptyTitle} description={meta.emptyDescription} />
        )}
      </div>
    </div>
  )
}
