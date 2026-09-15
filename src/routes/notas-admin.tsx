import { createFileRoute, redirect } from '@tanstack/react-router'
import { ChevronDown, ChevronUp, GraduationCap, Search } from 'lucide-react'
import { useMemo, useState, useEffect } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { isStaff } from '@/lib/roles'
import { listAllRedacoes, type RedacaoSubmission } from '@/lib/redacoes'
import { listAllSimuladoAttempts, type SimuladoAttempt } from '@/lib/simulados'
import { VoltarAoPainel } from '@/components/VoltarAoPainel'

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

type SubmissionMeta = Omit<RedacaoSubmission, 'fileDataUrl' | 'correctedFileDataUrl'>

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

// Testinho já vem em percentual (0-100), então o corte é direto — sem
// precisar reduzir a uma escala como a nota de redação (que é /40).
function percentColor(percent: number) {
  if (percent >= 70) return '#15803d'
  if (percent >= 50) return '#a16207'
  return '#dc2626'
}

type AttemptGroup = {
  email: string
  name: string
  attempts: SimuladoAttempt[]
  averagePercent: number | null
}

function groupAttemptsByStudent(attempts: SimuladoAttempt[]): AttemptGroup[] {
  const byEmail = new Map<string, SimuladoAttempt[]>()
  for (const attempt of attempts) {
    const list = byEmail.get(attempt.studentEmail) ?? []
    list.push(attempt)
    byEmail.set(attempt.studentEmail, list)
  }

  const groups: AttemptGroup[] = []
  for (const [email, list] of byEmail) {
    const sorted = [...list].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    const averagePercent = Math.round((sorted.reduce((sum, a) => sum + a.percent, 0) / sorted.length) * 100) / 100
    groups.push({ email, name: list[0].studentName || 'Aluno', attempts: sorted, averagePercent })
  }

  groups.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  return groups
}

function StudentCard({ group }: { group: StudentGroup }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="panel-card plain" style={{ marginTop: 0 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
      >
        <div style={{ minWidth: 0 }}>
          <b style={{ color: 'var(--navy)', fontSize: 15 }}>{group.name}</b>
          <div className="list-meta">{group.email}</div>
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
          {open ? <ChevronUp size={18} color="var(--purple)" /> : <ChevronDown size={18} color="var(--purple)" />}
        </div>
      </button>

      {open && (
        <div style={{ display: 'grid', gap: 8, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
          {group.submissions.map((submission) => (
            <div key={submission.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: 'var(--lilac-tint)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                <div style={{ color: 'var(--navy)', fontSize: 13, fontWeight: 600 }}>{submission.title}</div>
                <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 2 }}>
                  Enviada em {new Date(submission.submittedAt).toLocaleDateString('pt-BR')}
                  {submission.deliveryMethod === 'presencial' && ' · presencial'}
                </div>
              </div>
              {submission.status === 'corrigida' && submission.grade !== null ? (
                <span style={{ fontWeight: 700, fontSize: 13, color: gradeColor(submission.grade) }}>{submission.grade}/40</span>
              ) : (
                <span className="badge badge-warning">Aguardando</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AttemptStudentCard({ group }: { group: AttemptGroup }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="panel-card plain" style={{ marginTop: 0 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
      >
        <div style={{ minWidth: 0 }}>
          <b style={{ color: 'var(--navy)', fontSize: 15 }}>{group.name}</b>
          <div className="list-meta">{group.email}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: group.averagePercent !== null ? percentColor(group.averagePercent) : '#9ca3af' }}>
              {group.averagePercent !== null ? `${group.averagePercent}%` : '—'}
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>
              média · {group.attempts.length} série{group.attempts.length === 1 ? '' : 's'} respondida{group.attempts.length === 1 ? '' : 's'}
            </div>
          </div>
          {open ? <ChevronUp size={18} color="var(--purple)" /> : <ChevronDown size={18} color="var(--purple)" />}
        </div>
      </button>

      {open && (
        <div style={{ display: 'grid', gap: 8, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
          {group.attempts.map((attempt) => (
            <div key={attempt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: 'var(--lilac-tint)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                <div style={{ color: 'var(--navy)', fontSize: 13, fontWeight: 600 }}>{attempt.simuladoTitle}</div>
                <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 2 }}>
                  Respondida em {new Date(attempt.submittedAt).toLocaleDateString('pt-BR')}
                </div>
              </div>
              <span style={{ fontWeight: 700, fontSize: 13, color: percentColor(attempt.percent) }}>
                {attempt.score}/{attempt.total} · {attempt.percent}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function NotasAdminPage() {
  const [aba, setAba] = useState<'redacao' | 'testinhos'>('redacao')
  const [search, setSearch] = useState('')

  const [submissions, setSubmissions] = useState<SubmissionMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [attempts, setAttempts] = useState<SimuladoAttempt[]>([])
  const [attemptsLoading, setAttemptsLoading] = useState(true)
  const [attemptsError, setAttemptsError] = useState('')

  useEffect(() => {
    listAllRedacoes()
      .then(setSubmissions)
      .catch((err) => setError(err instanceof Error ? err.message : 'Não foi possível carregar as notas.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    listAllSimuladoAttempts()
      .then(setAttempts)
      .catch((err) => setAttemptsError(err instanceof Error ? err.message : 'Não foi possível carregar as notas dos testinhos.'))
      .finally(() => setAttemptsLoading(false))
  }, [])

  const groups = useMemo(() => groupByStudent(submissions), [submissions])
  const attemptGroups = useMemo(() => groupAttemptsByStudent(attempts), [attempts])

  const query = search.trim().toLowerCase()
  const filtered = query
    ? groups.filter((g) => g.name.toLowerCase().includes(query) || g.email.toLowerCase().includes(query))
    : groups
  const filteredAttempts = query
    ? attemptGroups.filter((g) => g.name.toLowerCase().includes(query) || g.email.toLowerCase().includes(query))
    : attemptGroups

  const classAverage = useMemo(() => {
    const withGrade = groups.filter((g) => g.average !== null)
    if (withGrade.length === 0) return null
    return Math.round((withGrade.reduce((sum, g) => sum + (g.average ?? 0), 0) / withGrade.length) * 100) / 100
  }, [groups])

  const classAverageTestinhos = useMemo(() => {
    if (attemptGroups.length === 0) return null
    return Math.round((attemptGroups.reduce((sum, g) => sum + (g.averagePercent ?? 0), 0) / attemptGroups.length) * 100) / 100
  }, [attemptGroups])

  return (
    <main className="panel">
      <VoltarAoPainel />
      <h1><GraduationCap /> Notas dos alunos</h1>
      <p className="panel-subtitle">
        {aba === 'redacao'
          ? 'Todas as notas de redação, organizadas por aluno. Toque em um aluno para ver o histórico completo.'
          : 'Notas das questões para treino, organizadas por aluno. Cada série vale uma tentativa.'}
      </p>

      <div className="tab-switch" style={{ marginTop: 16 }} role="tablist">
        <button type="button" role="tab" aria-selected={aba === 'redacao'} onClick={() => setAba('redacao')} className={`tab-switch-btn${aba === 'redacao' ? ' is-active' : ''}`}>
          Redação
        </button>
        <button type="button" role="tab" aria-selected={aba === 'testinhos'} onClick={() => setAba('testinhos')} className={`tab-switch-btn${aba === 'testinhos' ? ' is-active' : ''}`}>
          Testinhos
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 220, background: '#fff', border: '1px solid var(--line)', borderRadius: 8, padding: '10px 12px' }}>
          <Search size={16} color="#9ca3af" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar aluno por nome ou e-mail..."
            style={{ border: 'none', outline: 'none', flex: 1, fontSize: 14, padding: 0 }}
          />
        </div>
        {aba === 'redacao' && classAverage !== null && (
          <div style={{ background: 'var(--lilac-tint)', border: '1px solid var(--line)', borderRadius: 8, padding: '10px 16px', whiteSpace: 'nowrap' }}>
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>Média da turma: </span>
            <b style={{ color: 'var(--navy)' }}>{classAverage}/40</b>
          </div>
        )}
        {aba === 'testinhos' && classAverageTestinhos !== null && (
          <div style={{ background: 'var(--lilac-tint)', border: '1px solid var(--line)', borderRadius: 8, padding: '10px 16px', whiteSpace: 'nowrap' }}>
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>Média da turma: </span>
            <b style={{ color: 'var(--navy)' }}>{classAverageTestinhos}%</b>
          </div>
        )}
      </div>

      {aba === 'redacao' && (
        <>
          {loading && <p className="panel-subtitle" style={{ marginTop: 20 }}>Carregando...</p>}
          {error && <p className="form-error" style={{ marginTop: 20 }}>{error}</p>}

          <div style={{ display: 'grid', gap: 10, marginTop: 20 }}>
            {filtered.map((group) => <StudentCard key={group.email} group={group} />)}
            {!loading && !error && filtered.length === 0 && (
              <p className="empty-state">
                {query ? 'Nenhum aluno encontrado para essa busca.' : 'Nenhuma redação enviada ainda.'}
              </p>
            )}
          </div>
        </>
      )}

      {aba === 'testinhos' && (
        <>
          {attemptsLoading && <p className="panel-subtitle" style={{ marginTop: 20 }}>Carregando...</p>}
          {attemptsError && <p className="form-error" style={{ marginTop: 20 }}>{attemptsError}</p>}

          <div style={{ display: 'grid', gap: 10, marginTop: 20 }}>
            {filteredAttempts.map((group) => <AttemptStudentCard key={group.email} group={group} />)}
            {!attemptsLoading && !attemptsError && filteredAttempts.length === 0 && (
              <p className="empty-state">
                {query ? 'Nenhum aluno encontrado para essa busca.' : 'Nenhuma tentativa registrada ainda.'}
              </p>
            )}
          </div>
        </>
      )}
    </main>
  )
}
