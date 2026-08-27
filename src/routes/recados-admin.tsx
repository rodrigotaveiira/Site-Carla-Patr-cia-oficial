import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { MessageCircleHeart } from 'lucide-react'
import { useEffect, useState } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { isStaff } from '@/lib/roles'
import { listAllRecados, markRecadoRead, type Recado } from '@/lib/recados'

export const Route = createFileRoute('/recados-admin')({
  beforeLoad: async () => {
    if (typeof window !== 'undefined') {
      const localUser = readLocalUser()
      if (localUser && isStaff(localUser)) return { user: localUser }
    }

    const user = await getServerUser()
    if (!user) throw redirect({ to: '/login' })
    if (!isStaff(user)) throw redirect({ to: '/dashboard' })
    return { user }
  },
  component: RecadosAdminPage,
})

function RecadosAdminPage() {
  const [recados, setRecados] = useState<Recado[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [markingId, setMarkingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      setRecados(await listAllRecados())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os recados.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function handleMarkRead(id: string) {
    setMarkingId(id)
    try {
      await markRecadoRead({ data: { id } })
      setRecados((prev) => prev.map((r) => (r.id === id ? { ...r, read: true } : r)))
    } finally {
      setMarkingId(null)
    }
  }

  const unreadCount = recados.filter((r) => !r.read).length

  return (
    <main className="panel">
      <Link to="/admin" className="panel-back">← Voltar ao painel admin</Link>
      <h1><MessageCircleHeart /> Recados dos alunos</h1>
      <p className="panel-subtitle">
        Mensagens que os alunos mandaram pelo perfil deles.
        {unreadCount > 0 && <span style={{ color: '#a16207', fontWeight: 700 }}> {unreadCount} não lido{unreadCount === 1 ? '' : 's'}.</span>}
      </p>

      {loading && <p className="panel-subtitle" style={{ marginTop: 20 }}>Carregando...</p>}
      {error && <p className="form-error" style={{ marginTop: 20 }}>{error}</p>}

      <div style={{ display: 'grid', gap: 10, marginTop: 20 }}>
        {recados.map((recado) => (
          <div
            key={recado.id}
            className="panel-card plain"
            style={{
              marginTop: 0,
              background: recado.read ? '#fff' : 'var(--lilac-tint)',
              borderColor: recado.read ? 'var(--line)' : '#c9befd',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <b style={{ color: 'var(--navy)' }}>{recado.studentName}</b>
                <div className="list-meta">
                  {recado.studentEmail} · {new Date(recado.createdAt).toLocaleDateString('pt-BR')} às {new Date(recado.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              {!recado.read && (
                <button onClick={() => handleMarkRead(recado.id)} disabled={markingId === recado.id} className="btn btn-ghost btn-sm">
                  {markingId === recado.id ? '...' : 'Marcar como lido'}
                </button>
              )}
            </div>
            <p style={{ margin: '12px 0 0', color: '#374151', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{recado.message}</p>
          </div>
        ))}
        {!loading && !error && recados.length === 0 && <p className="empty-state">Nenhum recado ainda.</p>}
      </div>
    </main>
  )
}
