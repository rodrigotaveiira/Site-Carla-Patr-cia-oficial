import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Radio } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole } from '@/lib/roles'
import { getLiveClass, updateLiveClass } from '@/lib/live-class'
import { useToast } from '@/lib/toast'

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
  const showToast = useToast()
  const [title, setTitle] = useState('')
  const [moduleName, setModuleName] = useState('')
  const [description, setDescription] = useState('')
  const [dateTime, setDateTime] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(90)
  const [zoomLink, setZoomLink] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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
    setSaving(true)
    try {
      await updateLiveClass({ data: { title, module: moduleName, description, dateTime, durationMinutes, zoomLink } })
      showToast('Salvo! Já aparece no dashboard dos alunos.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar a aula ao vivo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="panel">
      <Link to="/admin" className="panel-back">← Voltar ao painel admin</Link>
      <h1><Radio /> Próxima aula ao vivo</h1>
      <p className="panel-subtitle">
        Configure os dados da próxima aula ao vivo. Eles aparecem no card "Próxima aula" do dashboard do aluno,
        com o botão "Entrar na aula" levando direto para o link do Zoom.
      </p>

      {loading ? (
        <p className="panel-subtitle" style={{ marginTop: 20 }}>Carregando...</p>
      ) : (
        <form onSubmit={handleSubmit} className="panel-card">
          <div className="field">
            <label>Título da aula</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Projeto de texto: da tese à conclusão" />
          </div>
          <div className="field">
            <label>Módulo</label>
            <input value={moduleName} onChange={(e) => setModuleName(e.target.value)} placeholder="Ex.: Módulo 04 · Redação" />
          </div>
          <div className="field">
            <label>Descrição (opcional)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div className="field" style={{ flex: 1, minWidth: 200 }}>
              <label>Data e horário</label>
              <input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} />
            </div>
            <div className="field" style={{ width: 140 }}>
              <label>Duração (min)</label>
              <input type="number" min={5} step={5} value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} />
            </div>
          </div>
          <div className="field">
            <label>Link do Zoom</label>
            <input value={zoomLink} onChange={(e) => setZoomLink(e.target.value)} placeholder="https://zoom.us/j/..." />
          </div>
          <button type="submit" disabled={saving} className="btn btn-primary" style={{ width: 'fit-content' }}>
            {saving ? 'Salvando...' : 'Salvar aula ao vivo'}
          </button>
          {error && <p className="form-error" style={{ margin: 0 }}>{error}</p>}
        </form>
      )}
    </main>
  )
}
