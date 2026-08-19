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
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px', fontFamily: 'sans-serif' }}>
      <Link to="/redacoes-admin" style={{ color: '#6d28d9', fontWeight: 700, textDecoration: 'none' }}>← Voltar para correção de redações</Link>
      <h1 style={{ fontFamily: 'var(--serif, serif)', color: '#0f2342', marginTop: 16 }}>Temas de redação</h1>
      <p style={{ color: '#6b7280' }}>
        Cadastre os temas e as propostas de redação que os alunos devem desenvolver. Eles aparecem, em ordem
        de publicação, na área de "Redações" do aluno.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12, marginTop: 24, background: '#f9f8fd', border: '1px solid #ece8f7', borderRadius: 12, padding: 22 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#0f2342', fontWeight: 600 }}>Título do tema</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Os desafios da mobilidade urbana no Brasil"
            style={{ width: '100%', padding: 10, border: '1px solid #e0dcf0', borderRadius: 8, boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#0f2342', fontWeight: 600 }}>Proposta / texto motivador</label>
          <textarea
            value={proposta}
            onChange={(e) => setProposta(e.target.value)}
            placeholder="Cole aqui a proposta completa, com textos motivadores, comando da redação, etc."
            rows={7}
            style={{ width: '100%', padding: 10, border: '1px solid #e0dcf0', borderRadius: 8, boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.5 }}
          />
        </div>
        <div style={{ maxWidth: 220 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#0f2342', fontWeight: 600 }}>Prazo de entrega (opcional)</label>
          <input
            type="date"
            value={prazo}
            onChange={(e) => setPrazo(e.target.value)}
            style={{ width: '100%', padding: 10, border: '1px solid #e0dcf0', borderRadius: 8, boxSizing: 'border-box' }}
          />
        </div>
        <button type="submit" disabled={saving} style={{ background: '#6d28d9', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 20px', fontWeight: 700, cursor: 'pointer', width: 'fit-content' }}>
          {saving ? 'Publicando...' : 'Publicar tema'}
        </button>
        {error && <p style={{ color: '#dc2626', margin: 0 }}>{error}</p>}
      </form>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 18, color: '#0f2342' }}>Temas publicados</h2>
        {loading && <p style={{ color: '#6b7280' }}>Carregando...</p>}
        <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
          {temas.map((tema, index) => (
            <div key={tema.id} style={{ background: '#fff', border: '1px solid #e0dcf0', borderRadius: 10, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <PenLine size={16} color="#6d28d9" style={{ flexShrink: 0 }} />
                  <b style={{ color: '#0f2342', wordBreak: 'break-word' }}>{tema.title}</b>
                  {index === 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#6d28d9', background: '#f1e9fd', padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>ATUAL</span>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(tema.id)}
                  style={{ color: '#dc2626', background: 'none', border: '1px solid #fecaca', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}
                >
                  Excluir
                </button>
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
          {!loading && temas.length === 0 && <p style={{ color: '#6b7280' }}>Nenhum tema publicado ainda.</p>}
        </div>
      </section>
    </main>
  )
}
