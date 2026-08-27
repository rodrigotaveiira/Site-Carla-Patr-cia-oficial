import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Bell } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { isStaff } from '@/lib/roles'
import { createLembrete, deleteLembrete, listLembretes, type Lembrete } from '@/lib/lembretes'
import { useToast } from '@/lib/toast'

export const Route = createFileRoute('/lembretes-admin')({
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
  component: LembretesAdminPage,
})

function LembretesAdminPage() {
  const showToast = useToast()
  const [lembretes, setLembretes] = useState<Lembrete[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      setLembretes(await listLembretes())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!message.trim()) { setError('Escreva o texto do lembrete.'); return }

    setSaving(true)
    try {
      await createLembrete({ data: { message } })
      setMessage('')
      await load()
      showToast('Lembrete enviado.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o lembrete.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este lembrete?')) return
    try {
      await deleteLembrete({ data: { id } })
      await load()
      showToast('Lembrete excluído.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Não foi possível excluir o lembrete.', 'error')
    }
  }

  return (
    <main className="panel">
      <Link to="/dashboard" className="panel-back">← Voltar ao dashboard</Link>
      <h1><Bell /> Lembretes para os alunos</h1>
      <p className="panel-subtitle">Escreva um aviso curto. Ele aparece no sininho de notificações de todos os alunos, no dashboard.</p>

      <form onSubmit={handleSubmit} className="panel-card">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ex.: Não esqueçam de entregar a redação até sexta-feira!"
          rows={3}
        />
        <button type="submit" disabled={saving} className="btn btn-primary" style={{ width: 'fit-content' }}>
          {saving ? 'Enviando...' : 'Enviar lembrete'}
        </button>
        {error && <p className="form-error" style={{ margin: 0 }}>{error}</p>}
      </form>

      <section>
        <h2 className="panel-section-title">Lembretes recentes</h2>
        {loading && <p className="panel-subtitle">Carregando...</p>}
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          {lembretes.map((lembrete) => (
            <div key={lembrete.id} className="list-row">
              <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                <p style={{ margin: 0, color: 'var(--navy)' }}>{lembrete.message}</p>
                <div className="list-meta" style={{ marginTop: 6 }}>
                  {lembrete.authorName} · {new Date(lembrete.createdAt).toLocaleDateString('pt-BR')}
                </div>
              </div>
              <button onClick={() => handleDelete(lembrete.id)} className="btn btn-danger btn-sm">Excluir</button>
            </div>
          ))}
          {!loading && lembretes.length === 0 && <p className="empty-state">Nenhum lembrete enviado ainda.</p>}
        </div>
      </section>
    </main>
  )
}
