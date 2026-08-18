import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Download, FileText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole } from '@/lib/roles'
import {
  CONTENT_SECTIONS, getContentItemFile, isContentSection,
  listContentItems, type ContentItem, type ContentSection,
} from '@/lib/content-library'

export const Route = createFileRoute('/conteudo/$secao')({
  beforeLoad: async ({ params }) => {
    if (!isContentSection(params.secao)) throw redirect({ to: '/dashboard' })

    if (typeof window !== 'undefined') {
      const localUser = readLocalUser()
      if (localUser) return { user: localUser }
    }

    const user = await getServerUser()
    if (!user) throw redirect({ to: '/login' })
    if (!userHasRole(user, 'aprovado') && !userHasRole(user, 'admin')) throw redirect({ to: '/aguardando-aprovacao' })
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
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px', fontFamily: 'sans-serif' }}>
      <Link to="/dashboard" style={{ color: '#6d28d9', fontWeight: 700, textDecoration: 'none' }}>← Voltar ao dashboard</Link>
      <h1 style={{ fontFamily: 'var(--serif, serif)', color: '#0f2342', marginTop: 16 }}>{sectionLabel}</h1>
      <p style={{ color: '#6b7280' }}>Materiais em PDF enviados pela professora Carla.</p>

      {error && <p style={{ color: '#dc2626' }}>{error}</p>}
      {loading && <p style={{ color: '#6b7280' }}>Carregando...</p>}

      <div style={{ display: 'grid', gap: 12, marginTop: 20 }}>
        {items.map((item) => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, background: '#f9f8fd', border: '1px solid #ece8f7', borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', minWidth: 0 }}>
              <FileText color="#6d28d9" style={{ marginTop: 2, flexShrink: 0 }} />
              <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                <b style={{ color: '#0f2342' }}>{item.title}</b>
                {item.description && <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>{item.description}</div>}
              </div>
            </div>
            <button
              onClick={() => handleDownload(item.id)}
              disabled={downloadingId === item.id}
              style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', color: 'white', background: '#6d28d9', border: 0, borderRadius: 6, padding: '9px 14px', fontWeight: 700, cursor: 'pointer' }}
            >
              <Download size={15} /> {downloadingId === item.id ? 'Baixando...' : 'Baixar'}
            </button>
          </div>
        ))}
        {!loading && items.length === 0 && <p style={{ color: '#6b7280' }}>Nenhum arquivo disponível ainda nesta seção.</p>}
      </div>
    </main>
  )
}
