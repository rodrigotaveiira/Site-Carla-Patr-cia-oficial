import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { CalendarDays, PenLine } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { isStaff } from '@/lib/roles'
import { addTema, deleteTema, listTemas, type TemaRedacao } from '@/lib/temas-redacao'

export const Route = createFileRoute('/temas-redacao-admin')({
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
  component: TemasRedacaoAdminPage,
})

function TemasRedacaoAdminPage() {
  const [temas, setTemas] = useState<TemaRedacao[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [proposta, setProposta] = useState('')
  const [prazo, setPrazo] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      setTemas(await listTemas())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!title.trim()) { setError('Dê um título para o tema.'); return }

    setSaving(true)
    try {
      await addTema({ data: { title, proposta, prazo: prazo || undefined } })
      setTitle('')
      setProposta('')
      setPrazo('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o tema.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este tema de redação?')) return
    await deleteTema({ data: { id } })
    await load()
  }

  return (
    <main className="panel">
      <Link to="/redacoes-admin" className="panel-back">← Voltar para correção de redações</Link>
      <h1><PenLine /> Temas de redação</h1>
      <p className="panel-subtitle">
        Cadastre os temas e as propostas de redação que os alunos devem desenvolver. Eles aparecem, em ordem
        de publicação, na área de "Redações" do aluno.
      </p>

      <form onSubmit={handleSubmit} className="panel-card">
        <div className="field">
          <label>Título do tema</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Os desafios da mobilidade urbana no Brasil" />
        </div>
        <div className="field">
          <label>Proposta / texto motivador</label>
          <textarea
            value={proposta}
            onChange={(e) => setProposta(e.target.value)}
            placeholder="Cole aqui a proposta completa, com textos motivadores, comando da redação, etc."
            rows={7}
            style={{ lineHeight: 1.5 }}
          />
        </div>
        <div className="field" style={{ maxWidth: 220 }}>
          <label>Prazo de entrega (opcional)</label>
          <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
        </div>
        <button type="submit" disabled={saving} className="btn btn-primary" style={{ width: 'fit-content' }}>
          {saving ? 'Publicando...' : 'Publicar tema'}
        </button>
        {error && <p className="form-error" style={{ margin: 0 }}>{error}</p>}
      </form>

      <section>
        <h2 className="panel-section-title">Temas publicados</h2>
        {loading && <p className="panel-subtitle">Carregando...</p>}
        <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
          {temas.map((tema, index) => (
            <div key={tema.id} className="panel-card plain" style={{ marginTop: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <PenLine size={16} color="var(--purple)" style={{ flexShrink: 0 }} />
                  <b style={{ color: 'var(--navy)', wordBreak: 'break-word' }}>{tema.title}</b>
                  {index === 0 && <span className="badge badge-brand">ATUAL</span>}
                </div>
                <button onClick={() => handleDelete(tema.id)} className="btn btn-danger btn-sm">Excluir</button>
              </div>
              {tema.proposta && <p style={{ color: '#4b5563', fontSize: 14, marginTop: 10, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{tema.proposta}</p>}
              <div style={{ display: 'flex', gap: 12, marginTop: 10, color: '#9ca3af', fontSize: 12 }}>
                <span>Publicado em {new Date(tema.createdAt).toLocaleDateString('pt-BR')}</span>
                {tema.prazo && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CalendarDays size={13} /> Entrega até {new Date(`${tema.prazo}T00:00:00`).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>
            </div>
          ))}
          {!loading && temas.length === 0 && <p className="empty-state">Nenhum tema publicado ainda.</p>}
        </div>
      </section>
    </main>
  )
}
