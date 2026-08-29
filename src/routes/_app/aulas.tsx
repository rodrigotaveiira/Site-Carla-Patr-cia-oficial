import { createFileRoute, redirect } from '@tanstack/react-router'
import { CheckCircle2, CirclePlay } from 'lucide-react'
import { useEffect, useState } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole, isStaff } from '@/lib/roles'
import { listLessons, type Lesson } from '@/lib/aulas'
import { getMyWatchedLessons, markLessonWatched } from '@/lib/lesson-progress'
import { EmptyState } from '@/components/EmptyState'
import { ListSkeleton } from '@/components/ListSkeleton'

export const Route = createFileRoute('/_app/aulas')({
  beforeLoad: async () => {
    if (typeof window !== 'undefined') {
      const localUser = readLocalUser()
      if (localUser) return { user: localUser }
    }

    const user = await getServerUser()
    if (!user) throw redirect({ to: '/login' })
    if (!userHasRole(user, 'aprovado') && !isStaff(user)) throw redirect({ to: '/aguardando-aprovacao' })
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
  const [watchedIds, setWatchedIds] = useState<string[]>([])

  useEffect(() => {
    listLessons()
      .then((data) => {
        setLessons(data)
        if (data.length > 0) selectLesson(data[0])
      })
      .finally(() => setLoading(false))
    getMyWatchedLessons().then(setWatchedIds).catch(() => { /* mantém lista vazia */ })
  }, [])

  function selectLesson(lesson: Lesson) {
    setSelected(lesson)
    if (!watchedIds.includes(lesson.id)) {
      setWatchedIds((prev) => [...prev, lesson.id])
      markLessonWatched({ data: { lessonId: lesson.id } }).catch(() => { /* tenta de novo na próxima aula */ })
    }
  }

  const grouped = lessons.reduce<Record<string, Lesson[]>>((acc, lesson) => {
    acc[lesson.module] = acc[lesson.module] || []
    acc[lesson.module].push(lesson)
    return acc
  }, {})

  return (
    <div className="panel panel-wide">
      <h1>Aulas</h1>

      {loading && <div style={{ marginTop: 20 }}><ListSkeleton rows={4} /></div>}
      {!loading && lessons.length === 0 && (
        <EmptyState icon={CirclePlay} title="Nenhuma aula publicada ainda" description="Assim que a professora publicar a primeira aula, ela aparece aqui. Volte em breve!" />
      )}

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
          <div style={{ color: 'var(--purple)', fontSize: 12, fontWeight: 700, marginTop: 14 }}>{selected.module}</div>
          <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 400, color: 'var(--navy)', margin: '4px 0' }}>{selected.title}</h2>
          {selected.description && <p style={{ color: 'var(--muted)' }}>{selected.description}</p>}
        </div>
      )}

      {Object.keys(grouped).length > 0 && (
        <div style={{ display: 'grid', gap: 24, marginTop: 32 }}>
          {Object.entries(grouped).map(([moduleName, moduleLessons]) => (
            <div key={moduleName}>
              <h3 style={{ fontSize: 15, color: 'var(--navy)' }}>{moduleName}</h3>
              <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                {moduleLessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => selectLesson(lesson)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', padding: '12px 14px',
                      background: selected?.id === lesson.id ? 'var(--lilac-tint)' : '#fff', border: '1px solid var(--line)',
                      borderRadius: 8, cursor: 'pointer', color: 'var(--navy)', fontWeight: 600,
                    }}
                  >
                    <CirclePlay size={18} color="var(--purple)" /> <span style={{ flex: 1 }}>{lesson.title}</span>
                    {watchedIds.includes(lesson.id) && <CheckCircle2 size={16} color="#15803d" />}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
