import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { ChevronDown, ChevronUp, Monitor, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole } from '@/lib/roles'
import { listAllSessionHistories, type StudentSessionHistory } from '@/lib/sessions'

export const Route = createFileRoute('/sessoes-admin')({
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
  component: SessoesAdminPage,
})

function formatWhen(iso: string) {
  const date = new Date(iso)
  return `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

function StudentSessionCard({ student }: { student: StudentSessionHistory }) {
  const [open, setOpen] = useState(false)
  const current = student.history[0]
  const distinctDevices = new Set(student.history.map((h) => h.device)).size

  return (
    <div className="panel-card plain" style={{ marginTop: 0 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
      >
        <div style={{ minWidth: 0 }}>
          <b style={{ color: 'var(--navy)', fontSize: 15 }}>{student.name}</b>
          <div className="list-meta">{student.email}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy)' }}>{current ? current.device : '—'}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>
              atual · {distinctDevices} aparelho{distinctDevices === 1 ? '' : 's'} diferente{distinctDevices === 1 ? '' : 's'} no histórico
            </div>
          </div>
          {open ? <ChevronUp size={18} color="var(--purple)" /> : <ChevronDown size={18} color="var(--purple)" />}
        </div>
      </button>

      {open && (
        <div style={{ display: 'grid', gap: 6, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
          {student.history.map((entry, index) => (
            <div key={entry.sessionId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: 'var(--lilac-tint)', borderRadius: 8, padding: '9px 12px' }}>
              <span style={{ fontSize: 13, color: 'var(--navy)', fontWeight: index === 0 ? 700 : 400 }}>
                {entry.device} {index === 0 && <span style={{ color: '#15803d', fontWeight: 700, fontSize: 11 }}>· atual</span>}
              </span>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>{formatWhen(entry.loginAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SessoesAdminPage() {
  const [students, setStudents] = useState<StudentSessionHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    listAllSessionHistories()
      .then(setStudents)
      .catch((err) => setError(err instanceof Error ? err.message : 'Não foi possível carregar os aparelhos.'))
      .finally(() => setLoading(false))
  }, [])

  const query = search.trim().toLowerCase()
  const filtered = useMemo(
    () => (query ? students.filter((s) => s.name.toLowerCase().includes(query) || s.email.toLowerCase().includes(query)) : students),
    [students, query],
  )

  return (
    <main className="panel">
      <Link to="/admin" className="panel-back">← Voltar ao painel admin</Link>
      <h1><Monitor /> Aparelhos conectados</h1>
      <p className="panel-subtitle">
        Cada aluno só pode usar a conta em um aparelho por vez — um login novo derruba o anterior automaticamente.
        Aqui fica o histórico de logins de cada um.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 20, background: '#fff', border: '1px solid var(--line)', borderRadius: 8, padding: '10px 12px', maxWidth: 400 }}>
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
        {filtered.map((student) => <StudentSessionCard key={student.email} student={student} />)}
        {!loading && !error && filtered.length === 0 && (
          <p className="empty-state">
            {query ? 'Nenhum aluno encontrado para essa busca.' : 'Nenhum login registrado ainda.'}
          </p>
        )}
      </div>
    </main>
  )
}
