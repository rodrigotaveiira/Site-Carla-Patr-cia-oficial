import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { MessageCircleHeart, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { isStaff } from '@/lib/roles'
import { listAllRecados, markRecadoRead, replyRecado, type Recado } from '@/lib/recados'
import { useToast } from '@/lib/toast'

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

function RecadoCard({ recado, onMarkRead, markingId, onReplied }: {
  recado: Recado
  onMarkRead: (id: string) => void
  markingId: string | null
  onReplied: (updated: Recado) => void
}) {
  const showToast = useToast()
  const [replyText, setReplyText] = useState('')
  const [editingReply, setEditingReply] = useState(false)
  const [sendingReply, setSendingReply] = useState(false)
  const [replyError, setReplyError] = useState('')

  async function handleSendReply() {
    if (!replyText.trim()) { setReplyError('Escreva uma resposta antes de enviar.'); return }
    setReplyError('')
    setSendingReply(true)
    try {
      const updated = await replyRecado({ data: { id: recado.id, reply: replyText } })
      onReplied(updated)
      setEditingReply(false)
      setReplyText('')
      showToast('Resposta enviada.')
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : 'Não foi possível enviar a resposta.')
    } finally {
      setSendingReply(false)
    }
  }

  return (
    <div
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
          <button onClick={() => onMarkRead(recado.id)} disabled={markingId === recado.id} className="btn btn-ghost btn-sm">
            {markingId === recado.id ? '...' : 'Marcar como lido'}
          </button>
        )}
      </div>
      <p style={{ margin: '12px 0 0', color: '#374151', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{recado.message}</p>

      {recado.reply && !editingReply ? (
        <div style={{ marginTop: 12, background: 'var(--lilac-tint)', borderRadius: 8, padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <b style={{ fontSize: 12, color: 'var(--purple)' }}>Sua resposta</b>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>
              {recado.repliedAt && `${new Date(recado.repliedAt).toLocaleDateString('pt-BR')} às ${new Date(recado.repliedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
            </span>
          </div>
          <p style={{ margin: '8px 0 0', color: '#374151', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{recado.reply}</p>
          <button
            type="button"
            onClick={() => { setReplyText(recado.reply ?? ''); setEditingReply(true) }}
            style={{ marginTop: 8, color: 'var(--purple)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, padding: 0 }}
          >
            Editar resposta
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Responder para o aluno..."
            rows={3}
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={handleSendReply} disabled={sendingReply} className="btn btn-primary btn-sm">
              <Send size={13} /> {sendingReply ? 'Enviando...' : 'Responder'}
            </button>
            {editingReply && (
              <button type="button" onClick={() => { setEditingReply(false); setReplyText('') }} className="btn btn-ghost btn-sm">
                Cancelar
              </button>
            )}
          </div>
          {replyError && <p className="form-error" style={{ margin: 0 }}>{replyError}</p>}
        </div>
      )}
    </div>
  )
}

function RecadosAdminPage() {
  const showToast = useToast()
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
      showToast('Marcado como lido.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Não foi possível marcar como lido.', 'error')
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
          <RecadoCard
            key={recado.id}
            recado={recado}
            markingId={markingId}
            onMarkRead={handleMarkRead}
            onReplied={(updated) => setRecados((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))}
          />
        ))}
        {!loading && !error && recados.length === 0 && <p className="empty-state">Nenhum recado ainda.</p>}
      </div>
    </main>
  )
}
