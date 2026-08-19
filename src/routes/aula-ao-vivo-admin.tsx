import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useEffect, useState, type FormEvent } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole } from '@/lib/roles'
import { getLiveClass, updateLiveClass } from '@/lib/live-class'

export const Route = createFileRoute('/aula-ao-vivo-admin')({
  beforeLoad: async () => {
    if (typeof window !== 'undefined') {
      const localUser = readLocalUser()
      if (localUser && userHasRole(localUser, 'admin')) return { user: localUser }
    }

    const user = await getServerUser()
    if (!user) throw redirect({ to: '/login' })
    if (!userHasRole(user, 'admin')) throw redirect({ to: '/dashboard' })
    return { user }
  },
  component: AulaAoVivoAdminPage,
})

function AulaAoVivoAdminPage() {
  const [title, setTitle] = useState('')
  const [moduleName, setModuleName] = useState('')
  const [description, setDescription] = useState('')
  const [dateTime, setDateTime] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(90)
  const [zoomLink, setZoomLink] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    getLiveClass()
      .then((liveClass) => {
        if (liveClass) {
          setTitle(liveClass.title)
          setModuleName(liveClass.module)
          setDescription(liveClass.description)
          setDateTime(liveClass.dateTime)
          setDurationMinutes(liveClass.durationMinutes)
          setZoomLink(liveClass.zoomLink)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSuccess(false)
    setSaving(true)
    try {
      await updateLiveClass({ data: { title, module: moduleName, description, dateTime, durationMinutes, zoomLink } })
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar a aula ao vivo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px', fontFamily: 'sans-serif' }}>
      <Link to="/admin" style={{ color: '#6d28d9', fontWeight: 700, textDecoration: 'none' }}>← Voltar ao painel admin</Link>
      <h1 style={{ fontFamily: 'var(--serif, serif)', color: '#0f2342', marginTop: 16 }}>Próxima aula ao vivo</h1>
      <p style={{ color: '#6b7280' }}>
        Configure os dados da próxima aula ao vivo. Eles aparecem no card "Próxima aula" do dashboard do aluno,
        com o botão "Entrar na aula" levando direto para o link do Zoom.
      </p>

      {loading ? (
        <p style={{ color: '#6b7280', marginTop: 20 }}>Carregando...</p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12, marginTop: 24 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#0f2342', fontWeight: 600 }}>Título da aula</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Projeto de texto: da tese à conclusão" style={{ width: '100%', padding: 10, border: '1px solid #e0dcf0', borderRadius: 8, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#0f2342', fontWeight: 600 }}>Módulo</label>
            <input value={moduleName} onChange={(e) => setModuleName(e.target.value)} placeholder="Ex.: Módulo 04 · Redação" style={{ width: '100%', padding: 10, border: '1px solid #e0dcf0', borderRadius: 8, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#0f2342', fontWeight: 600 }}>Descrição (opcional)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ width: '100%', padding: 10, border: '1px solid #e0dcf0', borderRadius: 8, boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#0f2342', fontWeight: 600 }}>Data e horário</label>
              <input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} style={{ width: '100%', padding: 10, border: '1px solid #e0dcf0', borderRadius: 8, boxSizing: 'border-box' }} />
            </div>
            <div style={{ width: 140 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#0f2342', fontWeight: 600 }}>Duração (min)</label>
              <input type="number" min={5} step={5} value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} style={{ width: '100%', padding: 10, border: '1px solid #e0dcf0', borderRadius: 8, boxSizing: 'border-box' }} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#0f2342', fontWeight: 600 }}>Link do Zoom</label>
            <input value={zoomLink} onChange={(e) => setZoomLink(e.target.value)} placeholder="https://zoom.us/j/..." style={{ width: '100%', padding: 10, border: '1px solid #e0dcf0', borderRadius: 8, boxSizing: 'border-box' }} />
          </div>
          <button type="submit" disabled={saving} style={{ background: '#6d28d9', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 20px', fontWeight: 700, cursor: 'pointer', width: 'fit-content' }}>
            {saving ? 'Salvando...' : 'Salvar aula ao vivo'}
          </button>
          {success && <p style={{ color: '#15803d', margin: 0 }}>Salvo! Já aparece no dashboard dos alunos.</p>}
          {error && <p style={{ color: '#dc2626', margin: 0 }}>{error}</p>}
        </form>
      )}
    </main>
  )
}
