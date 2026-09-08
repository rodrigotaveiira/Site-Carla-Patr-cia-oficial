import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { ChevronDown, ChevronUp, Download, Flame, PenLine, Search, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { isStaff } from '@/lib/roles'
import { getStudentEvolution, type StudentEvolution, type StudentEvolutionSummary } from '@/lib/student-evolution'

export const Route = createFileRoute('/evolucao-admin')({
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
  component: EvolucaoAdminPage,
})

function gradeColor(grade: number) {
  if (grade >= 32) return '#15803d'
  if (grade >= 24) return '#a16207'
  return '#dc2626'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

function Bar({ percent, color }: { percent: number; color: string }) {
  const width = Math.max(0, Math.min(100, percent))
  return (
    <div style={{ height: 6, borderRadius: 4, background: '#eceaf3', overflow: 'hidden' }}>
      <div style={{ width: `${width}%`, height: '100%', borderRadius: 4, background: color, transition: 'width .4s ease' }} />
    </div>
  )
}

function StudentRow({ student, maxDownloads }: { student: StudentEvolution; maxDownloads: number }) {
  const [open, setOpen] = useState(false)
  const { redacao, materiais, progresso } = student
  const initials = student.name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?'

  const redacaoPercent = redacao.average !== null ? (redacao.average / 40) * 100 : 0
  const redacaoColor = redacao.average !== null ? gradeColor(redacao.average) : '#c7c5d1'
  const materiaisPercent = maxDownloads > 0 ? (materiais.totalDownloads / maxDownloads) * 100 : 0
  const progressoPercent = (progresso.completedThisWeek / progresso.weeklyGoal) * 100

  return (
    <div className="panel-card plain" style={{ marginTop: 0 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="evolution-row-head"
        style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left' }}
      >
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--lilac-tint)', color: 'var(--purple)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
          {initials}
        </div>

        <div className="evolution-name">
          <b style={{ color: 'var(--navy)', fontSize: 14, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.name}</b>
          <div className="list-meta" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.email}</div>
        </div>

        <div className="evolution-metrics">
          <div style={{ flex: 1, minWidth: 90 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
              <span>Redação</span>
              <span style={{ fontWeight: 700, color: redacaoColor, fontVariantNumeric: 'tabular-nums' }}>
                {redacao.average !== null ? `${redacao.average}/40` : '—'}
              </span>
            </div>
            <Bar percent={redacaoPercent} color={redacaoColor} />
          </div>

          <div style={{ flex: 1, minWidth: 90 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
              <span>Materiais</span>
              <span style={{ fontWeight: 700, color: 'var(--navy)', fontVariantNumeric: 'tabular-nums' }}>{materiais.totalDownloads}</span>
            </div>
            <Bar percent={materiaisPercent} color="var(--gold)" />
          </div>

          <div style={{ flex: 1, minWidth: 90 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
              <span>Progresso</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 700, color: 'var(--purple)', fontVariantNumeric: 'tabular-nums' }}>
                <Flame size={12} /> {progresso.streak}
              </span>
            </div>
            <Bar percent={progressoPercent} color="var(--purple)" />
          </div>
        </div>

        {open ? <ChevronUp size={18} color="var(--purple)" style={{ flexShrink: 0 }} /> : <ChevronDown size={18} color="var(--purple)" style={{ flexShrink: 0 }} />}
      </button>

      {open && (
        <div style={{ display: 'grid', gap: 18, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--navy)', fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
              <PenLine size={14} /> Redação
            </div>
            <p className="list-meta" style={{ margin: '0 0 8px' }}>
              {redacao.correctedCount}/{redacao.totalCount} corrigida{redacao.correctedCount === 1 ? '' : 's'}
            </p>
            {redacao.recent.length === 0 && <p className="list-meta">Nenhuma redação enviada.</p>}
            <div style={{ display: 'grid', gap: 6 }}>
              {redacao.recent.map((r) => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, minWidth: 0, background: 'var(--lilac-tint)', borderRadius: 8, padding: '7px 10px', fontSize: 12 }}>
                  <span style={{ color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{r.title}</span>
                  {r.status === 'corrigida' && r.grade !== null
                    ? <b style={{ color: gradeColor(r.grade), flexShrink: 0 }}>{r.grade}/40</b>
                    : <span className="badge badge-warning" style={{ flexShrink: 0 }}>Aguardando</span>}
                </div>
              ))}
            </div>
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--navy)', fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
              <Download size={14} /> Materiais
            </div>
            <p className="list-meta" style={{ margin: '0 0 8px' }}>{materiais.totalDownloads} download{materiais.totalDownloads === 1 ? '' : 's'} registrado{materiais.totalDownloads === 1 ? '' : 's'}</p>
            {materiais.recent.length === 0 && <p className="list-meta">Nenhum download registrado ainda.</p>}
            <div style={{ display: 'grid', gap: 6 }}>
              {materiais.recent.map((d, i) => (
                <div key={`${d.materialTitle}-${d.downloadedAt}-${i}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, minWidth: 0, background: 'var(--lilac-tint)', borderRadius: 8, padding: '7px 10px', fontSize: 12 }}>
                  <span style={{ color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{d.materialTitle}</span>
                  <span style={{ color: 'var(--muted)', flexShrink: 0 }}>{formatDate(d.downloadedAt)}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--navy)', fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
              <TrendingUp size={14} /> Progresso
            </div>
            <p className="list-meta" style={{ margin: '0 0 8px' }}>
              Sequência de {progresso.streak} dia{progresso.streak === 1 ? '' : 's'} · meta semanal {progresso.completedThisWeek}/{progresso.weeklyGoal}
            </p>
            <Bar percent={progressoPercent} color="var(--purple)" />
          </div>
        </div>
      )}
    </div>
  )
}

function EvolucaoAdminPage() {
  const [data, setData] = useState<StudentEvolutionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    getStudentEvolution()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Não foi possível carregar a evolução dos alunos.'))
      .finally(() => setLoading(false))
  }, [])

  const students = data?.students ?? []
  const maxDownloads = useMemo(() => Math.max(1, ...students.map((s) => s.materiais.totalDownloads)), [students])

  const query = search.trim().toLowerCase()
  const filtered = query
    ? students.filter((s) => s.name.toLowerCase().includes(query) || s.email.toLowerCase().includes(query))
    : students

  return (
    <main className="panel panel-wide">
      <Link to="/admin" className="panel-back">← Voltar ao painel admin</Link>
      <h1><TrendingUp /> Evolução dos alunos</h1>
      <p className="panel-subtitle">Como cada aluno está indo, separado por bloco: redação, materiais e progresso geral. Toque em um aluno para ver o detalhe.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginTop: 24 }}>
        <div style={{ background: 'var(--lilac-tint)', borderRadius: 10, padding: '14px 16px' }}>
          <div className="list-meta" style={{ marginTop: 0 }}>Alunos acompanhados</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)', fontVariantNumeric: 'tabular-nums' }}>{students.length}</div>
        </div>
        <div style={{ background: 'var(--lilac-tint)', borderRadius: 10, padding: '14px 16px' }}>
          <div className="list-meta" style={{ marginTop: 0 }}>Média de redação da turma</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)', fontVariantNumeric: 'tabular-nums' }}>
            {data?.classRedacaoAverage !== null && data?.classRedacaoAverage !== undefined ? `${data.classRedacaoAverage}/40` : '—'}
          </div>
        </div>
        <div style={{ background: 'var(--lilac-tint)', borderRadius: 10, padding: '14px 16px' }}>
          <div className="list-meta" style={{ marginTop: 0 }}>Downloads de materiais</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)', fontVariantNumeric: 'tabular-nums' }}>{data?.totalDownloads ?? 0}</div>
        </div>
        <div style={{ background: 'var(--lilac-tint)', borderRadius: 10, padding: '14px 16px' }}>
          <div className="list-meta" style={{ marginTop: 0 }}>Sequência média</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)', fontVariantNumeric: 'tabular-nums' }}>
            {data?.averageStreak !== null && data?.averageStreak !== undefined ? `${data.averageStreak} dias` : '—'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid var(--line)', borderRadius: 8, padding: '10px 12px', marginTop: 20 }}>
        <Search size={16} color="#9ca3af" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar aluno por nome ou e-mail..."
          style={{ border: 'none', outline: 'none', flex: 1, fontSize: 14, padding: 0 }}
        />
      </div>

      {loading && <p className="panel-subtitle" style={{ marginTop: 20 }}>Carregando...</p>}
      {error && <p className="form-error" style={{ marginTop: 20 }}>{error}</p>}

      <div style={{ display: 'grid', gap: 10, marginTop: 20 }}>
        {filtered.map((student) => <StudentRow key={student.email} student={student} maxDownloads={maxDownloads} />)}
        {!loading && !error && filtered.length === 0 && (
          <p className="empty-state">
            {query ? 'Nenhum aluno encontrado para essa busca.' : 'Nenhum aluno logou no site ainda — a lista aparece assim que o primeiro aluno acessar.'}
          </p>
        )}
      </div>
    </main>
  )
}
