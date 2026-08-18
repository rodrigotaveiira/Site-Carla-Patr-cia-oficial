import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useEffect, useState, type FormEvent } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { isStaff } from '@/lib/roles'
import { createLembrete, deleteLembrete, listLembretes, type Lembrete } from '@/lib/lembretes'

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o lembrete.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este lembrete?')) return
    await deleteLembrete({ data: { id } })
    await load()
  }

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px', fontFamily: 'sans-serif' }}>
      <Link to="/dashboard" style={{ color: '#6d28d9', fontWeight: 700, textDecoration: 'none' }}>← Voltar ao dashboard</Link>
      <h1 style={{ fontFamily: 'var(--serif, serif)', color: '#0f2342', marginTop: 16 }}>Lembretes para os alunos</h1>
      <p style={{ color: '#6b7280' }}>Escreva um aviso curto. Ele aparece no sininho de notificações de todos os alunos, no dashboard.</p>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 10, marginTop: 20 }}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ex.: Não esqueçam de entregar a redação até sexta-feira!"
          rows={3}
          style={{ width: '100%', padding: 10, border: '1px solid #e0dcf0', borderRadius: 8, boxSizing: 'border-box', fontFamily: 'inherit' }}
        />
        <button type="submit" disabled={saving} style={{ background: '#6d28d9', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 20px', fontWeight: 700, cursor: 'pointer', width: 'fit-content' }}>
          {saving ? 'Enviando...' : 'Enviar lembrete'}
        </button>
        {error && <p style={{ color: '#dc2626', margin: 0 }}>{error}</p>}
      </form>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 18, color: '#0f2342' }}>Lembretes recentes</h2>
        {loading && <p style={{ color: '#6b7280' }}>Carregando...</p>}
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          {lembretes.map((lembrete) => (
            <div key={lembrete.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', background: '#fff', border: '1px solid #e0dcf0', borderRadius: 10, padding: 14 }}>
              <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                <p style={{ margin: 0, color: '#0f2342' }}>{lembrete.message}</p>
                <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 6 }}>
                  {lembrete.authorName} · {new Date(lembrete.createdAt).toLocaleDateString('pt-BR')}
                </div>
              </div>
              <button
                onClick={() => handleDelete(lembrete.id)}
                style={{ color: '#dc2626', background: 'none', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}
              >
                Excluir
              </button>
            </div>
          ))}
          {!loading && lembretes.length === 0 && <p style={{ color: '#6b7280' }}>Nenhum lembrete enviado ainda.</p>}
        </div>
      </section>
    </main>
  )
}
