import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { BookMarked, CircleHelp, CirclePlay, Files, Library, Target, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole, isStaff } from '@/lib/roles'
import { getContentCounts, getStudentProgress, type ContentCounts, type StudentProgress } from '@/lib/progress'

export const Route = createFileRoute('/progresso')({
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
  component: ProgressoPage,
})

function ProgressoPage() {
  const [counts, setCounts] = useState<ContentCounts | null>(null)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<StudentProgress | null>(null)

  useEffect(() => {
    getContentCounts()
      .then(setCounts)
      .finally(() => setLoading(false))
    getStudentProgress().then(setProgress).catch(() => { /* seção de evolução some se der erro */ })
  }, [])

  const rows = counts
    ? [
        { icon: CirclePlay, label: 'Aulas', count: counts.aulas, to: '/aulas' },
        { icon: Files, label: 'Materiais', count: counts.materiais, to: '/dashboard#materiais' },
        { icon: Library, label: 'Biblioteca', count: counts.bibliotecas.biblioteca, to: '/conteudo/biblioteca' },
        { icon: CircleHelp, label: 'Questões', count: counts.bibliotecas.questoes, to: '/conteudo/questoes' },
        { icon: Target, label: 'Simulados', count: counts.bibliotecas.simulados, to: '/conteudo/simulados' },
        { icon: BookMarked, label: 'Repertórios', count: counts.bibliotecas.repertorios, to: '/conteudo/repertorios' },
        { icon: Zap, label: 'Dicas', count: counts.bibliotecas.dicas, to: '/conteudo/dicas' },
      ]
    : []

  const maxCount = Math.max(1, ...rows.map((r) => r.count))

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px', fontFamily: 'sans-serif' }}>
      <Link to="/dashboard" style={{ color: '#6d28d9', fontWeight: 700, textDecoration: 'none' }}>← Voltar ao dashboard</Link>
      <h1 style={{ fontFamily: 'var(--serif, serif)', color: '#0f2342', marginTop: 16, marginBottom: 4 }}>Meu progresso</h1>
      <p style={{ color: '#6b7280' }}>Sua evolução na plataforma, com base nas aulas assistidas e nas redações entregues.</p>

      {progress && (
        <div style={{ marginTop: 20, padding: '20px', background: 'linear-gradient(135deg, #6d28d9, #9333ea)', borderRadius: 12, color: '#fff' }}>
          <div style={{ fontSize: 32, fontWeight: 800 }}>{progress.overallPercent}%</div>
          <div style={{ opacity: 0.9, fontSize: 14, marginBottom: 14 }}>progresso geral</div>
          <div style={{ display: 'grid', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span>Aulas assistidas</span>
                <span>{progress.aulasAssistidas} de {progress.aulasDisponiveis}</span>
              </div>
              <div style={{ marginTop: 4, height: 6, background: 'rgba(255,255,255,0.25)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${progress.aulasPercent}%`, height: '100%', background: '#fff' }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span>Redações entregues</span>
                <span>{progress.redacoesEntregues}</span>
              </div>
              <div style={{ marginTop: 4, height: 6, background: 'rgba(255,255,255,0.25)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${progress.redacoesPercent}%`, height: '100%', background: '#fff' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      <p style={{ color: '#6b7280', marginTop: 24 }}>Quantidade de conteúdo disponível na plataforma hoje, por seção.</p>

      {loading && <p style={{ color: '#6b7280', marginTop: 20 }}>Carregando...</p>}

      {counts && (
        <>
          <div style={{ marginTop: 24, padding: '18px 20px', background: '#f4f2fb', border: '1px solid #e0dcf0', borderRadius: 10, fontWeight: 700, color: '#0f2342' }}>
            {counts.totalArquivos + counts.aulas} conteúdo(s) disponíveis no total ({counts.aulas} aula{counts.aulas === 1 ? '' : 's'} em vídeo e {counts.totalArquivos} arquivo{counts.totalArquivos === 1 ? '' : 's'} em PDF/Word)
          </div>

          <div style={{ display: 'grid', gap: 12, marginTop: 20 }}>
            {rows.map((row) => (
              <a
                key={row.label}
                href={row.to}
                style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', color: 'inherit', background: '#fff', border: '1px solid #e0dcf0', borderRadius: 10, padding: '14px 18px' }}
              >
                <row.icon color="#6d28d9" size={20} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f2342', fontWeight: 700 }}>
                    <span>{row.label}</span>
                    <span>{row.count}</span>
                  </div>
                  <div style={{ marginTop: 6, height: 6, background: '#f0f1f4', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${(row.count / maxCount) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #a855f7, #6d28d9)' }} />
                  </div>
                </div>
              </a>
            ))}
          </div>
        </>
      )}
    </main>
  )
}
