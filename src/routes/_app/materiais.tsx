import { createFileRoute, redirect } from '@tanstack/react-router'
import { Download, Files, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole, isStaff } from '@/lib/roles'
import { getMaterialFile, listMaterials, type MaterialListItem } from '@/lib/materials'
import { downloadDataUrl } from '@/lib/download-file'
import { EmptyState } from '@/components/EmptyState'
import { ListSkeleton } from '@/components/ListSkeleton'

export const Route = createFileRoute('/_app/materiais')({
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
      downloadDataUrl(fileName, fileDataUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível baixar o material.')
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="panel">
      <h1><ShieldCheck /> Materiais</h1>
      <p className="panel-subtitle">
        Arquivos em Word e PDF enviados pela professora. Cada download é protegido com seu nome e CPF.
      </p>
      {!loading && !error && materials.length > 0 && (
        <p className="panel-meta-strip">
          {materials.length} {materials.length === 1 ? 'material disponível' : 'materiais disponíveis'} · o mais recente é de {new Date(materials[0].createdAt).toLocaleDateString('pt-BR')}
        </p>
      )}

      {error && <p className="form-error">{error}</p>}
      {loading && <div style={{ marginTop: 20 }}><ListSkeleton rows={4} /></div>}

      <div style={{ display: 'grid', gap: 12, marginTop: 20 }}>
        {materials.map((material) => (
          <div key={material.id} className="list-row">
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', minWidth: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: material.accent, background: `${material.accent}1a`, padding: '4px 10px', borderRadius: 20, flexShrink: 0, marginTop: 2 }}>
                {material.tag}
              </span>
              <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                <b style={{ color: 'var(--navy)' }}>{material.title}</b>
                {material.description && <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{material.description}</div>}
                <div className="list-meta">Adicionado em {new Date(material.createdAt).toLocaleDateString('pt-BR')}</div>
              </div>
            </div>
            <button onClick={() => handleDownload(material.id)} disabled={downloadingId === material.id} className="btn btn-primary btn-sm">
              <Download size={15} /> {downloadingId === material.id ? 'Baixando...' : 'Baixar'}
            </button>
          </div>
        ))}
        {!loading && materials.length === 0 && (
          <EmptyState icon={Files} title="Nenhum material disponível ainda" description="A professora vai adicionar arquivos em breve. Assim que liberar, eles aparecem aqui." />
        )}
      </div>
    </div>
  )
}
