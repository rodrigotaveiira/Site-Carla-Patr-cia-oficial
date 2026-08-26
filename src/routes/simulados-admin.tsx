import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { AlertTriangle, ChevronDown, ChevronUp, ClipboardList, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole } from '@/lib/roles'
import { createSimulado, deleteSimulado, listAllSimulados, type Simulado } from '@/lib/simulados'

export const Route = createFileRoute('/simulados-admin')({
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
  component: SimuladosAdminPage,
})

const QUESTIONS_PLACEHOLDER = `1) Qual a capital do Brasil?
a) São Paulo
b) Rio de Janeiro
c) Brasília
d) Salvador
e) Belo Horizonte

2) Próxima questão...
a) ...
b) ...`

const GABARITO_PLACEHOLDER = `1) C
2) A
3) E
...`

function SimuladoCard({ simulado, onDeleted }: { simulado: Simulado; onDeleted: () => void }) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const semGabarito = simulado.questions.filter((q) => !q.correctLetter).length

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteSimulado({ data: { id: simulado.id } })
      onDeleted()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e0dcf0', borderRadius: 10, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <b style={{ color: '#0f2342' }}>{simulado.title}</b>
          <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>
            {new Date(simulado.createdAt).toLocaleDateString('pt-BR')} · {simulado.questions.length} questões
          </div>
          {semGabarito > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#a16207', fontSize: 12, marginTop: 4, fontWeight: 700 }}>
              <AlertTriangle size={13} /> {semGabarito} questão{semGabarito === 1 ? '' : 'ões'} sem gabarito reconhecido
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setOpen((v) => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6d28d9', background: 'none', border: '1px solid #e0dcf0', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
          >
            {open ? 'Fechar' : 'Ver questões'} {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#dc2626', background: 'none', border: '1px solid #fecaca', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
          >
            <Trash2 size={14} /> {deleting ? '...' : 'Excluir'}
          </button>
        </div>
      </div>

      {open && (
        <div style={{ display: 'grid', gap: 10, marginTop: 14, paddingTop: 14, borderTop: '1px solid #ece8f7' }}>
          {simulado.questions.map((question) => (
            <div key={question.id} style={{ background: '#f9f8fd', borderRadius: 8, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <b style={{ color: '#0f2342', fontSize: 13 }}>{question.number}) {question.statement}</b>
                {question.correctLetter ? (
                  <span style={{ color: '#15803d', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>Gabarito: {question.correctLetter}</span>
                ) : (
                  <span style={{ color: '#a16207', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>Sem gabarito</span>
                )}
              </div>
              <div style={{ display: 'grid', gap: 3, marginTop: 6 }}>
                {question.options.map((option) => (
                  <div key={option.letter} style={{ fontSize: 12, color: option.letter === question.correctLetter ? '#15803d' : '#4b5563', fontWeight: option.letter === question.correctLetter ? 700 : 400 }}>
                    {option.letter}) {option.text}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SimuladosAdminPage() {
  const [simulados, setSimulados] = useState<Simulado[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [questionsText, setQuestionsText] = useState('')
  const [gabaritoText, setGabaritoText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function load() {
    setLoading(true)
    try {
      setSimulados(await listAllSimulados())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!title.trim() || !questionsText.trim()) {
      setError('Preencha o nome do simulado e cole o texto das questões.')
      return
    }
    setSaving(true)
    try {
      const result = await createSimulado({ data: { title, questionsText, gabaritoText } })
      setNotice(
        result.answersMatched < result.questionsFound
          ? `${result.questionsFound} questões reconhecidas, mas só ${result.answersMatched} com gabarito. Confira o texto do gabarito.`
          : `${result.questionsFound} questões reconhecidas e todas com gabarito. Simulado publicado!`,
      )
      setTitle('')
      setQuestionsText('')
      setGabaritoText('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar o simulado.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px', fontFamily: 'sans-serif' }}>
      <Link to="/admin" style={{ color: '#6d28d9', fontWeight: 700, textDecoration: 'none' }}>← Voltar ao painel admin</Link>
      <h1 style={{ fontFamily: 'var(--serif, serif)', color: '#0f2342', marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <ClipboardList color="#6d28d9" /> Simulados interativos
      </h1>
      <p style={{ color: '#6b7280' }}>
        Cole o texto das questões e do gabarito — o sistema separa tudo automaticamente em questões de múltipla escolha
        para o aluno responder no site, com correção e nota na hora.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14, marginTop: 24, background: '#f9f8fd', border: '1px solid #ece8f7', borderRadius: 10, padding: 20 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#0f2342', fontWeight: 600 }}>Nome do simulado</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Simulado ENEM — 1º Bimestre"
            style={{ width: '100%', padding: 10, border: '1px solid #e0dcf0', borderRadius: 8, boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#0f2342', fontWeight: 600 }}>
            Questões (cole o texto — cada questão começa com "1)", cada alternativa com "a)")
          </label>
          <textarea
            value={questionsText}
            onChange={(e) => setQuestionsText(e.target.value)}
            placeholder={QUESTIONS_PLACEHOLDER}
            rows={10}
            style={{ width: '100%', padding: 10, border: '1px solid #e0dcf0', borderRadius: 8, boxSizing: 'border-box', fontFamily: 'monospace', fontSize: 13 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#0f2342', fontWeight: 600 }}>
            Gabarito (cole o texto — "número + letra" em qualquer formato: "1) C", "1 - C", "1C"...)
          </label>
          <textarea
            value={gabaritoText}
            onChange={(e) => setGabaritoText(e.target.value)}
            placeholder={GABARITO_PLACEHOLDER}
            rows={5}
            style={{ width: '100%', padding: 10, border: '1px solid #e0dcf0', borderRadius: 8, boxSizing: 'border-box', fontFamily: 'monospace', fontSize: 13 }}
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          style={{ background: '#6d28d9', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 20px', fontWeight: 700, cursor: 'pointer', width: 'fit-content' }}
        >
          {saving ? 'Processando...' : 'Publicar simulado'}
        </button>
        {error && <p style={{ color: '#dc2626', margin: 0 }}>{error}</p>}
        {notice && <p style={{ color: '#15803d', margin: 0 }}>{notice}</p>}
      </form>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 18, color: '#0f2342' }}>Simulados publicados</h2>
        {loading && <p style={{ color: '#6b7280' }}>Carregando...</p>}
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          {simulados.map((simulado) => (
            <SimuladoCard key={simulado.id} simulado={simulado} onDeleted={load} />
          ))}
          {!loading && simulados.length === 0 && <p style={{ color: '#6b7280' }}>Nenhum simulado publicado ainda.</p>}
        </div>
      </section>
    </main>
  )
}
