import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { CheckCircle2, ChevronRight, Circle, ClipboardList, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole, isStaff } from '@/lib/roles'
import {
  getSimuladoToTake, listMySimuladoAttempts, listSimulados, submitSimuladoAttempt,
  type SimuladoAttempt, type SimuladoForStudent,
} from '@/lib/simulados'

export const Route = createFileRoute('/simulados')({
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
  component: SimuladosPage,
})

type SummaryItem = { id: string; title: string; createdAt: string; totalQuestions: number }
type Correction = { questionId: string; correctLetter: string | null; chosenLetter: string | null; correct: boolean }
type Result = { attempt: SimuladoAttempt; corrections: Correction[] }

function SimuladosPage() {
  const [summaries, setSummaries] = useState<SummaryItem[]>([])
  const [attempts, setAttempts] = useState<SimuladoAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [active, setActive] = useState<SimuladoForStudent | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [starting, setStarting] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [takeError, setTakeError] = useState('')
  const [result, setResult] = useState<Result | null>(null)

  async function load() {
    setLoading(true)
    setLoadError('')
    try {
      const [simuladosList, attemptsList] = await Promise.all([listSimulados(), listMySimuladoAttempts()])
      setSummaries(simuladosList)
      setAttempts(attemptsList)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Não foi possível carregar os simulados.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function handleStart(id: string) {
    setTakeError('')
    setStarting(id)
    try {
      const simulado = await getSimuladoToTake({ data: { id } })
      setActive(simulado)
      setAnswers({})
      setResult(null)
    } catch (err) {
      setTakeError(err instanceof Error ? err.message : 'Não foi possível abrir esse simulado.')
    } finally {
      setStarting(null)
    }
  }

  async function handleSubmit() {
    if (!active) return
    setTakeError('')
    setSubmitting(true)
    try {
      const outcome = await submitSimuladoAttempt({ data: { id: active.id, answers } })
      setResult(outcome)
      await load()
    } catch (err) {
      setTakeError(err instanceof Error ? err.message : 'Não foi possível enviar suas respostas.')
    } finally {
      setSubmitting(false)
    }
  }

  function backToList() {
    setActive(null)
    setResult(null)
    setAnswers({})
    setTakeError('')
  }

  const chronological = useMemo(() => [...attempts].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)), [attempts])

  // --- Tela de resultado ---------------------------------------------
  if (active && result) {
    return (
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px', fontFamily: 'sans-serif' }}>
        <button onClick={backToList} style={{ color: '#6d28d9', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>← Voltar aos simulados</button>
        <h1 style={{ fontFamily: 'var(--serif, serif)', color: '#0f2342', marginTop: 16 }}>{active.title}</h1>

        <div style={{ marginTop: 20, background: '#f4f2fb', border: '1px solid #e0dcf0', borderRadius: 12, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Sua nota</div>
          <div style={{ fontSize: 40, fontWeight: 800, color: '#6d28d9', marginTop: 6 }}>{result.attempt.score}/{result.attempt.total}</div>
          <div style={{ color: '#6b7280', marginTop: 4 }}>{result.attempt.percent}% de acerto</div>
        </div>

        <div style={{ display: 'grid', gap: 10, marginTop: 24 }}>
          {active.questions.map((question) => {
            const correction = result.corrections.find((c) => c.questionId === question.id)
            return (
              <div key={question.id} style={{ background: '#fff', border: '1px solid #e0dcf0', borderRadius: 10, padding: 16 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  {correction?.correct ? <CheckCircle2 size={18} color="#15803d" style={{ flexShrink: 0, marginTop: 1 }} /> : <XCircle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />}
                  <b style={{ color: '#0f2342', fontSize: 14 }}>{question.number}) {question.statement}</b>
                </div>
                <div style={{ display: 'grid', gap: 4, marginTop: 10, marginLeft: 26 }}>
                  {question.options.map((option) => {
                    const isChosen = correction?.chosenLetter === option.letter
                    const isCorrect = correction?.correctLetter === option.letter
                    let color = '#4b5563'
                    if (isCorrect) color = '#15803d'
                    else if (isChosen && !isCorrect) color = '#dc2626'
                    return (
                      <div key={option.letter} style={{ fontSize: 13, color, fontWeight: isCorrect || isChosen ? 700 : 400 }}>
                        {option.letter}) {option.text} {isChosen && !isCorrect ? '(sua resposta)' : ''} {isCorrect ? '✓' : ''}
                      </div>
                    )
                  })}
                  {!correction?.correctLetter && <div style={{ fontSize: 12, color: '#a16207' }}>Essa questão não tinha gabarito cadastrado.</div>}
                </div>
              </div>
            )
          })}
        </div>
      </main>
    )
  }

  // --- Tela de responder o simulado -----------------------------------
  if (active) {
    const answeredCount = Object.keys(answers).length
    return (
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px', fontFamily: 'sans-serif' }}>
        <button onClick={backToList} style={{ color: '#6d28d9', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>← Voltar aos simulados</button>
        <h1 style={{ fontFamily: 'var(--serif, serif)', color: '#0f2342', marginTop: 16 }}>{active.title}</h1>
        <p style={{ color: '#6b7280' }}>{answeredCount} de {active.questions.length} respondidas</p>

        <div style={{ display: 'grid', gap: 14, marginTop: 20 }}>
          {active.questions.map((question) => (
            <div key={question.id} style={{ background: '#fff', border: '1px solid #e0dcf0', borderRadius: 10, padding: 16 }}>
              <b style={{ color: '#0f2342', fontSize: 14 }}>{question.number}) {question.statement}</b>
              <div style={{ display: 'grid', gap: 6, marginTop: 12 }}>
                {question.options.map((option) => {
                  const checked = answers[question.id] === option.letter
                  return (
                    <label
                      key={option.letter}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
                        border: `1px solid ${checked ? '#6d28d9' : '#e0dcf0'}`, background: checked ? '#f4f2fb' : '#fff',
                      }}
                    >
                      <input
                        type="radio"
                        name={question.id}
                        checked={checked}
                        onChange={() => setAnswers((prev) => ({ ...prev, [question.id]: option.letter }))}
                        style={{ accentColor: '#6d28d9' }}
                      />
                      {checked ? <CheckCircle2 size={15} color="#6d28d9" /> : <Circle size={15} color="#c9befd" />}
                      <span style={{ fontSize: 13, color: '#0f2342' }}>{option.letter}) {option.text}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting || answeredCount === 0}
          style={{ marginTop: 20, background: '#6d28d9', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 22px', fontWeight: 700, cursor: 'pointer' }}
        >
          {submitting ? 'Enviando...' : 'Finalizar simulado'}
        </button>
        {takeError && <p style={{ color: '#dc2626', marginTop: 10 }}>{takeError}</p>}
      </main>
    )
  }

  // --- Lista de simulados disponíveis ----------------------------------
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px', fontFamily: 'sans-serif' }}>
      <Link to="/dashboard" style={{ color: '#6d28d9', fontWeight: 700, textDecoration: 'none' }}>← Voltar ao dashboard</Link>
      <h1 style={{ fontFamily: 'var(--serif, serif)', color: '#0f2342', marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <ClipboardList color="#6d28d9" /> Simulados
      </h1>
      <p style={{ color: '#6b7280' }}>Faça o simulado e acompanhe seu crescimento, sua aprovação está a caminho.</p>

      {takeError && <p style={{ color: '#dc2626', marginTop: 12 }}>{takeError}</p>}
      {loadError && <p style={{ color: '#dc2626', marginTop: 12 }}>{loadError}</p>}

      {chronological.length >= 2 && (
        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 18, color: '#0f2342' }}>Sua evolução</h2>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Percentual de acerto nos últimos simulados, na ordem em que você fez.</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginTop: 16, height: 130, padding: '0 4px', overflowX: 'auto' }}>
            {chronological.map((attempt) => (
              <div key={attempt.id} title={attempt.simuladoTitle} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 44 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#0f2342' }}>{attempt.percent}%</span>
                <div style={{ width: 24, height: `${Math.max(6, (attempt.percent / 100) * 80)}px`, background: 'linear-gradient(180deg, #a855f7, #6d28d9)', borderRadius: 4 }} />
                <span style={{ fontSize: 10, color: '#9ca3af' }}>{new Date(attempt.submittedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 18, color: '#0f2342' }}>Disponíveis</h2>
        {loading && <p style={{ color: '#6b7280' }}>Carregando...</p>}
        <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
          {summaries.map((summary) => (
            <div key={summary.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, background: '#fff', border: '1px solid #e0dcf0', borderRadius: 10, padding: 16 }}>
              <div>
                <b style={{ color: '#0f2342' }}>{summary.title}</b>
                <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>{summary.totalQuestions} questões</div>
              </div>
              <button
                onClick={() => handleStart(summary.id)}
                disabled={starting === summary.id}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#6d28d9', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontWeight: 700, cursor: 'pointer' }}
              >
                {starting === summary.id ? 'Abrindo...' : 'Começar'} <ChevronRight size={15} />
              </button>
            </div>
          ))}
          {!loading && summaries.length === 0 && <p style={{ color: '#6b7280' }}>Nenhum simulado disponível ainda.</p>}
        </div>
      </section>

      {attempts.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 18, color: '#0f2342' }}>Seu histórico</h2>
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            {[...attempts].reverse().map((attempt) => (
              <div key={attempt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, background: '#f9f8fd', border: '1px solid #ece8f7', borderRadius: 10, padding: 14 }}>
                <div>
                  <b style={{ color: '#0f2342', fontSize: 14 }}>{attempt.simuladoTitle}</b>
                  <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>{new Date(attempt.submittedAt).toLocaleDateString('pt-BR')}</div>
                </div>
                <span style={{ fontWeight: 800, color: '#6d28d9' }}>{attempt.score}/{attempt.total} · {attempt.percent}%</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
