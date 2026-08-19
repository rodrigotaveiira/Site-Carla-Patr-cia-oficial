import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Download, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole, isStaff } from '@/lib/roles'
import { getMaterialFile, listMaterials, type MaterialListItem } from '@/lib/materials'

export const Route = createFileRoute('/materiais')({
  beforeLoad: async () => {
    if (typeof window !== 'undefined') {
      const localUser = readLocalUser()
      if (localUser) return { user: localUser }
    }

    const user = await getServerUser()
    if (!user) throw redirect({ to: '/login' })
    if (!userHasRole(user, 'aprovado') && !isStaff(user)) throw redirect({ to: '/aguardando-aprovacao' })
    return { user }
  },
  component: MateriaisPage,
})

function MateriaisPage() {
  const [materials, setMaterials] = useState<MaterialListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => {
    listMaterials()
      .then(setMaterials)
      .catch(() => setError('Não foi possível carregar os materiais agora.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleDownload(id: string) {
    setDownloadingId(id)
    setError('')
    try {
      const { fileName, fileDataUrl } = await getMaterialFile({ data: { id } })
      const link = document.createElement('a')
      link.download = fileName
      link.href = fileDataUrl
      link.click()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível baixar o material.')
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px', fontFamily: 'sans-serif' }}>
      <Link to="/dashboard" style={{ color: '#6d28d9', fontWeight: 700, textDecoration: 'none' }}>← Voltar ao dashboard</Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
        <h1 style={{ fontFamily: 'var(--serif, serif)', color: '#0f2342', margin: 0 }}>Materiais</h1>
        <ShieldCheck color="#6d28d9" size={22} />
      </div>
      <p style={{ color: '#6b7280' }}>
        Arquivos em Word e PDF enviados pela professora. Cada download é protegido com seu nome e CPF.
      </p>

      {error && <p style={{ color: '#dc2626' }}>{error}</p>}
      {loading && <p style={{ color: '#6b7280' }}>Carregando...</p>}

      <div style={{ display: 'grid', gap: 12, marginTop: 20 }}>
        {materials.map((material) => (
          <div
            key={material.id}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', background: '#f9f8fd', border: '1px solid #ece8f7', borderRadius: 10, padding: 16 }}
          >
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', minWidth: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: material.accent, background: `${material.accent}1a`, padding: '4px 10px', borderRadius: 20, flexShrink: 0, marginTop: 2 }}>
                {material.tag}
              </span>
              <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                <b style={{ color: '#0f2342' }}>{material.title}</b>
                {material.description && <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>{material.description}</div>}
              </div>
            </div>
            <button
              onClick={() => handleDownload(material.id)}
              disabled={downloadingId === material.id}
              style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', color: 'white', background: '#6d28d9', border: 0, borderRadius: 6, padding: '9px 14px', fontWeight: 700, cursor: 'pointer' }}
            >
              <Download size={15} /> {downloadingId === material.id ? 'Baixando...' : 'Baixar'}
            </button>
          </div>
        ))}
        {!loading && materials.length === 0 && <p style={{ color: '#6b7280' }}>Nenhum material disponível ainda. A professora vai adicionar em breve.</p>}
      </div>
    </main>
  )
}
