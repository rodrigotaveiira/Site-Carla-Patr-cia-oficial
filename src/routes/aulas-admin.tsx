import { createFileRoute, Link, redirect } from '@tanstack/react-router'
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
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px', fontFamily: 'sans-serif' }}>
      <Link to="/admin" style={{ color: '#6d28d9', fontWeight: 700, textDecoration: 'none' }}>← Voltar ao painel admin</Link>
      <h1 style={{ fontFamily: 'var(--serif, serif)', color: '#0f2342', marginTop: 16 }}>Aulas em vídeo</h1>
      <p style={{ color: '#6b7280' }}>
        Cadastre suas aulas aqui. Como os vídeos são arquivos grandes, o recomendado é subir o vídeo primeiro no
        YouTube (como "não listado", pra não aparecer em buscas) ou no Vimeo, e colar o link aqui — a plataforma
        mostra o vídeo embutido para o aluno, sem precisar sair do site.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12, marginTop: 24, maxWidth: 480 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#0f2342', fontWeight: 600 }}>Título da aula</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', padding: 10, border: '1px solid #e0dcf0', borderRadius: 8, boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#0f2342', fontWeight: 600 }}>Módulo</label>
          <input value={moduleName} onChange={(e) => setModuleName(e.target.value)} placeholder="Ex.: Módulo 04 · Redação" style={{ width: '100%', padding: 10, border: '1px solid #e0dcf0', borderRadius: 8, boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#0f2342', fontWeight: 600 }}>Descrição</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ width: '100%', padding: 10, border: '1px solid #e0dcf0', borderRadius: 8, boxSizing: 'border-box', fontFamily: 'inherit' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#0f2342', fontWeight: 600 }}>Link do vídeo (YouTube, Vimeo ou link direto)</label>
          <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." style={{ width: '100%', padding: 10, border: '1px solid #e0dcf0', borderRadius: 8, boxSizing: 'border-box' }} />
        </div>
        <button type="submit" disabled={saving} style={{ background: '#6d28d9', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 20px', fontWeight: 700, cursor: 'pointer', width: 'fit-content' }}>
          {saving ? 'Salvando...' : 'Adicionar aula'}
        </button>
        {error && <p style={{ color: '#dc2626', margin: 0 }}>{error}</p>}
      </form>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 18, color: '#0f2342' }}>Aulas cadastradas</h2>
        {loading && <p>Carregando...</p>}
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          {lessons.map((lesson) => (
            <div key={lesson.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid #e0dcf0', borderRadius: 10, padding: 14 }}>
              <div>
                <div style={{ color: '#6d28d9', fontSize: 12, fontWeight: 700 }}>{lesson.module}</div>
                <b>{lesson.title}</b>
              </div>
              <button onClick={() => handleDelete(lesson.id)} style={{ color: '#dc2626', background: 'none', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}>Excluir</button>
            </div>
          ))}
          {!loading && lessons.length === 0 && <p style={{ color: '#6b7280' }}>Nenhuma aula cadastrada ainda.</p>}
        </div>
      </section>
    </main>
  )
}
