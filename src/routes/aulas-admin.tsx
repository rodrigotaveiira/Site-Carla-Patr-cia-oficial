import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Video } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole } from '@/lib/roles'
import { addLesson, deleteLesson, listLessons, type Lesson } from '@/lib/aulas'

export const Route = createFileRoute('/aulas-admin')({
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
  component: AulasAdminPage,
})

function AulasAdminPage() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [moduleName, setModuleName] = useState('')
  const [description, setDescription] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      setLessons(await listLessons())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      await addLesson({ data: { title, module: moduleName, description, videoUrl } })
      setTitle('')
      setModuleName('')
      setDescription('')
      setVideoUrl('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar a aula.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta aula?')) return
    await deleteLesson({ data: { id } })
    await load()
  }

  return (
    <main className="panel">
      <Link to="/admin" className="panel-back">← Voltar ao painel admin</Link>
      <h1><Video /> Aulas em vídeo</h1>
      <p className="panel-subtitle">
        Cadastre suas aulas aqui. Como os vídeos são arquivos grandes, o recomendado é subir o vídeo primeiro no
        YouTube (como "não listado", pra não aparecer em buscas) ou no Vimeo, e colar o link aqui — a plataforma
        mostra o vídeo embutido para o aluno, sem precisar sair do site.
      </p>

      <form onSubmit={handleSubmit} className="panel-card" style={{ maxWidth: 480 }}>
        <div className="field">
          <label>Título da aula</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label>Módulo</label>
          <input value={moduleName} onChange={(e) => setModuleName(e.target.value)} placeholder="Ex.: Módulo 04 · Redação" />
        </div>
        <div className="field">
          <label>Descrição</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>
        <div className="field">
          <label>Link do vídeo (YouTube, Vimeo ou link direto)</label>
          <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." />
        </div>
        <button type="submit" disabled={saving} className="btn btn-primary" style={{ width: 'fit-content' }}>
          {saving ? 'Salvando...' : 'Adicionar aula'}
        </button>
        {error && <p className="form-error" style={{ margin: 0 }}>{error}</p>}
      </form>

      <section>
        <h2 className="panel-section-title">Aulas cadastradas</h2>
        {loading && <p className="panel-subtitle">Carregando...</p>}
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          {lessons.map((lesson) => (
            <div key={lesson.id} className="list-row">
              <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                <div style={{ color: 'var(--purple)', fontSize: 12, fontWeight: 700 }}>{lesson.module}</div>
                <b style={{ color: 'var(--navy)' }}>{lesson.title}</b>
              </div>
              <button onClick={() => handleDelete(lesson.id)} className="btn btn-danger btn-sm">Excluir</button>
            </div>
          ))}
          {!loading && lessons.length === 0 && <p className="empty-state">Nenhuma aula cadastrada ainda.</p>}
        </div>
      </section>
    </main>
  )
}
