import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { CirclePlay } from 'lucide-react'
import { useEffect, useState } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole } from '@/lib/roles'
import { listLessons, type Lesson } from '@/lib/aulas'

export const Route = createFileRoute('/aulas')({
  beforeLoad: async () => {
    if (typeof window !== 'undefined') {
      const localUser = readLocalUser()
      if (localUser) return { user: localUser }
    }

    const user = await getServerUser()
    if (!user) throw redirect({ to: '/login' })
    if (!userHasRole(user, 'aprovado') && !userHasRole(user, 'admin')) throw redirect({ to: '/aguardando-aprovacao' })
    return { user }
  },
  component: AulasPage,
})

function toEmbedUrl(videoUrl: string): { type: 'iframe' | 'video'; src: string } {
  try {
    const url = new URL(videoUrl)
    if (url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be')) {
      let videoId = url.searchParams.get('v')
      if (!videoId && url.hostname.includes('youtu.be')) videoId = url.pathname.slice(1)
      if (!videoId && url.pathname.startsWith('/embed/')) videoId = url.pathname.replace('/embed/', '')
      if (videoId) return { type: 'iframe', src: `https://www.youtube.com/embed/${videoId}` }
    }
    if (url.hostname.includes('vimeo.com')) {
      const videoId = url.pathname.split('/').filter(Boolean).pop()
      if (videoId) return { type: 'iframe', src: `https://player.vimeo.com/video/${videoId}` }
    }
  } catch {
    // ignora e cai no vídeo direto abaixo
  }
  return { type: 'video', src: videoUrl }
}

function AulasPage() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Lesson | null>(null)

  useEffect(() => {
    listLessons()
      .then((data) => {
        setLessons(data)
        if (data.length > 0) setSelected(data[0])
      })
      .finally(() => setLoading(false))
  }, [])

  const grouped = lessons.reduce<Record<string, Lesson[]>>((acc, lesson) => {
    acc[lesson.module] = acc[lesson.module] || []
    acc[lesson.module].push(lesson)
    return acc
  }, {})

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px', fontFamily: 'sans-serif' }}>
      <Link to="/dashboard" style={{ color: '#6d28d9', fontWeight: 700, textDecoration: 'none' }}>← Voltar ao dashboard</Link>
      <h1 style={{ fontFamily: 'var(--serif, serif)', color: '#0f2342', marginTop: 16 }}>Aulas</h1>

      {loading && <p style={{ color: '#6b7280' }}>Carregando...</p>}
      {!loading && lessons.length === 0 && <p style={{ color: '#6b7280' }}>Nenhuma aula publicada ainda. Volte em breve!</p>}

      {selected && (
        <div style={{ marginTop: 20 }}>
          <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#000', borderRadius: 10, overflow: 'hidden' }}>
            {toEmbedUrl(selected.videoUrl).type === 'iframe' ? (
              <iframe
                key={selected.id}
                src={toEmbedUrl(selected.videoUrl).src}
                title={selected.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
              />
            ) : (
              <video key={selected.id} src={toEmbedUrl(selected.videoUrl).src} controls style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
            )}
          </div>
          <div style={{ color: '#6d28d9', fontSize: 12, fontWeight: 700, marginTop: 14 }}>{selected.module}</div>
          <h2 style={{ fontFamily: 'var(--serif, serif)', color: '#0f2342', margin: '4px 0' }}>{selected.title}</h2>
          {selected.description && <p style={{ color: '#6b7280' }}>{selected.description}</p>}
        </div>
      )}

      {Object.keys(grouped).length > 0 && (
        <div style={{ display: 'grid', gap: 24, marginTop: 32 }}>
          {Object.entries(grouped).map(([moduleName, moduleLessons]) => (
            <div key={moduleName}>
              <h3 style={{ fontSize: 15, color: '#0f2342' }}>{moduleName}</h3>
              <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                {moduleLessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => setSelected(lesson)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', padding: '12px 14px',
                      background: selected?.id === lesson.id ? '#f2eafd' : '#fff', border: '1px solid #e0dcf0',
                      borderRadius: 8, cursor: 'pointer', color: '#0f2342', fontWeight: 600,
                    }}
                  >
                    <CirclePlay size={18} color="#6d28d9" /> {lesson.title}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
