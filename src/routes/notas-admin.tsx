import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { ChevronDown, ChevronUp, GraduationCap, Search } from 'lucide-react'
import { useMemo, useState, useEffect } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { isStaff } from '@/lib/roles'
import { listAllRedacoes, type RedacaoSubmission } from '@/lib/redacoes'

export const Route = createFileRoute('/notas-admin')({
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
  component: NotasAdminPage,
})

type SubmissionMeta = Omit<RedacaoSubmission, 'fileDataUrl'>

type StudentGroup = {
  email: string
  name: string
  submissions: SubmissionMeta[]
  corrected: SubmissionMeta[]
  average: number | null
}

function groupByStudent(submissions: SubmissionMeta[]): StudentGroup[] {
  const byEmail = new Map<string, SubmissionMeta[]>()
  for (const submission of submissions) {
    const list = byEmail.get(submission.studentEmail) ?? []
    list.push(submission)
    byEmail.set(submission.studentEmail, list)
  }

  const groups: StudentGroup[] = []
  for (const [email, list] of byEmail) {
    const sorted = [...list].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    const corrected = sorted.filter((s) => s.status === 'corrigida' && s.grade !== null)
    const average = corrected.length > 0
      ? Math.round((corrected.reduce((sum, s) => sum + (s.grade ?? 0), 0) / corrected.length) * 100) / 100
      : null
    groups.push({ email, name: list[0].studentName || 'Aluno', submissions: sorted, corrected, average })
  }

  groups.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  return groups
}

function gradeColor(grade: number) {
  if (grade >= 32) return '#15803d'
  if (grade >= 24) return '#a16207'
  return '#dc2626'
}

function StudentCard({ group }: { group: StudentGroup }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ background: '#fff', border: '1px solid #e0dcf0', borderRadius: 10, padding: 16 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
      >
        <div style={{ minWidth: 0 }}>
          <b style={{ color: '#0f2342', fontSize: 15 }}>{group.name}</b>
          <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>{group.email}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: group.average !== null ? gradeColor(group.average) : '#9ca3af' }}>
              {group.average !== null ? `${group.average}/40` : '—'}
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>
              média · {group.corrected.length}/{group.submissions.length} corrigida{group.corrected.length === 1 ? '' : 's'}
            </div>
          </div>
          {open ? <ChevronUp size={18} color="#6d28d9" /> : <ChevronDown size={18} color="#6d28d9" />}
        </div>
      </button>

      {open && (
        <div style={{ display: 'grid', gap: 8, marginTop: 14, paddingTop: 14, borderTop: '1px solid #ece8f7' }}>
          {group.submissions.map((submission) => (
            <div key={submission.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: '#f9f8fd', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                <div style={{ color: '#0f2342', fontSize: 13, fontWeight: 600 }}>{submission.title}</div>
                <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 2 }}>
                  Enviada em {new Date(submission.submittedAt).toLocaleDateString('pt-BR')}
                  {submission.deliveryMethod === 'presencial' && ' · presencial'}
                </div>
              </div>
              {submission.status === 'corrigida' && submission.grade !== null ? (
                <span style={{ fontWeight: 700, fontSize: 13, color: gradeColor(submission.grade) }}>{submission.grade}/40</span>
              ) : (
                <span style={{ fontSize: 12, fontWeight: 700, color: '#a16207', background: '#fef9c3', borderRadius: 20, padding: '3px 10px' }}>Aguardando</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function NotasAdminPage() {
  const [submissions, setSubmissions] = useState<SubmissionMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    listAllRedacoes()
      .then(setSubmissions)
      .catch((err) => setError(err instanceof Error ? err.message : 'Não foi possível carregar as notas.'))
      .finally(() => setLoading(false))
  }, [])

  const groups = useMemo(() => groupByStudent(submissions), [submissions])
  const query = search.trim().toLowerCase()
  const filtered = query
    ? groups.filter((g) => g.name.toLowerCase().includes(query) || g.email.toLowerCase().includes(query))
    : groups

  const classAverage = useMemo(() => {
    const withGrade = groups.filter((g) => g.average !== null)
    if (withGrade.length === 0) return null
    return Math.round((withGrade.reduce((sum, g) => sum + (g.average ?? 0), 0) / withGrade.length) * 100) / 100
  }, [groups])

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px', fontFamily: 'sans-serif' }}>
      <Link to="/admin" style={{ color: '#6d28d9', fontWeight: 700, textDecoration: 'none' }}>← Voltar ao painel admin</Link>
      <h1 style={{ fontFamily: 'var(--serif, serif)', color: '#0f2342', marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <GraduationCap color="#6d28d9" /> Notas dos alunos
      </h1>
      <p style={{ color: '#6b7280' }}>Todas as notas de redação, organizadas por aluno. Toque em um aluno para ver o histórico completo.</p>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 220, background: '#fff', border: '1px solid #e0dcf0', borderRadius: 8, padding: '10px 12px' }}>
          <Search size={16} color="#9ca3af" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar aluno por nome ou e-mail..."
            style={{ border: 'none', outline: 'none', flex: 1, fontSize: 14 }}
          />
        </div>
        {classAverage !== null && (
          <div style={{ background: '#f4f2fb', border: '1px solid #e0dcf0', borderRadius: 8, padding: '10px 16px', whiteSpace: 'nowrap' }}>
            <span style={{ color: '#6b7280', fontSize: 12 }}>Média da turma: </span>
            <b style={{ color: '#0f2342' }}>{classAverage}/40</b>
          </div>
        )}
      </div>

      {loading && <p style={{ color: '#6b7280', marginTop: 20 }}>Carregando...</p>}
      {error && <p style={{ color: '#dc2626', marginTop: 20 }}>{error}</p>}

      <div style={{ display: 'grid', gap: 10, marginTop: 20 }}>
        {filtered.map((group) => <StudentCard key={group.email} group={group} />)}
        {!loading && !error && filtered.length === 0 && (
          <p style={{ color: '#6b7280' }}>
            {query ? 'Nenhum aluno encontrado para essa busca.' : 'Nenhuma redação enviada ainda.'}
          </p>
        )}
      </div>
    </main>
  )
}
