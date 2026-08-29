import { createFileRoute, redirect } from '@tanstack/react-router'
import { Download, FileText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole, isStaff } from '@/lib/roles'
import {
  CONTENT_SECTIONS, getContentItemFile, isContentSection,
  listContentItems, type ContentItem, type ContentSection,
} from '@/lib/content-library'

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

function ConteudoPage() {
  const { secao } = Route.useParams()
  const section = secao as ContentSection
  const sectionLabel = CONTENT_SECTIONS[section]

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
      <h1>{sectionLabel}</h1>
      <p className="panel-subtitle">Materiais em PDF enviados pela professora Carla. Cada download é protegido com seu nome e CPF.</p>

      {error && <p className="form-error">{error}</p>}
      {loading && <p className="panel-subtitle">Carregando...</p>}

      <div style={{ display: 'grid', gap: 12, marginTop: 20 }}>
        {items.map((item) => (
          <div key={item.id} className="list-row">
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', minWidth: 0 }}>
              <FileText color="var(--purple)" style={{ marginTop: 2, flexShrink: 0 }} />
              <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                <b style={{ color: 'var(--navy)' }}>{item.title}</b>
                {item.description && <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{item.description}</div>}
              </div>
            </div>
            <button onClick={() => handleDownload(item.id)} disabled={downloadingId === item.id} className="btn btn-primary btn-sm">
              <Download size={15} /> {downloadingId === item.id ? 'Baixando...' : 'Baixar'}
            </button>
          </div>
        ))}
        {!loading && items.length === 0 && <p className="empty-state">Nenhum arquivo disponível ainda nesta seção.</p>}
      </div>
    </div>
  )
}
