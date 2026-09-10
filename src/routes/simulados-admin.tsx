import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { AlertTriangle, CalendarClock, CheckCircle2, ChevronDown, ChevronUp, ClipboardList, Trash2, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole } from '@/lib/roles'
import { createSimulado, deleteSimulado, listAllSimulados, updateSimuladoRelease, type Simulado } from '@/lib/simulados'
import { agruparPorTextoBase, parseActivityText, parseGabaritoText } from '@/lib/simulado-parser'
import { releaseInstantMs } from '@/lib/simulado-release'
import { formatarHora } from '@/lib/formato'
import { TextoBase } from '@/components/TextoBase'
import { useToast } from '@/lib/toast'

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

const QUESTIONS_PLACEHOLDER = `TEXTO 1

Onicofagia — o hábito de roer as unhas

Onicofagia é o termo médico para nomear o hábito de roer as unhas.
Segundo a OMS, cerca de 30% das crianças apresentam o hábito.

Fonte: Revista Saúde, 2024.

TEXTO 2

A onicofagia é caracterizada por repetidas injúrias ao leito ungueal.

1) Os textos 1 e 2 concordam que:
a) os casos de onicofagia são muito raros.
b) o ato de roer as unhas ocorre somente na infância.
c) as consequências atingem apenas as unhas.
d) a onicofagia pode estar ligada a outros transtornos.

2) O texto 2 se diferencia do texto 1 porque:
a) utiliza linguagem mais especializada.
b) não apresenta informações médicas.
c) trata de assunto completamente diferente.
d) apresenta linguagem informal.`

const GABARITO_PLACEHOLDER = `1) d
2) a
3) c

(também aceita 1-d, 1. d ou 1 d)`

// "12/03 às 19h" a partir de releaseDate ('AAAA-MM-DD') e releaseTime ('HH:MM').
function formatarLiberacao(date: string, time: string) {
  const [ano, mes, dia] = date.split('-').map(Number)
  const d = `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`
  return time ? `${d} às ${formatarHora(time)}` : d
}

function ReleaseStatus({ simulado }: { simulado: Simulado }) {
  const at = releaseInstantMs(simulado)
  if (at === null || at <= Date.now()) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#15803d', fontSize: 12, fontWeight: 700 }}>
        <CheckCircle2 size={13} /> Liberado
      </span>
    )
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#a16207', fontSize: 12, fontWeight: 700 }}>
      <CalendarClock size={13} /> Libera em {formatarLiberacao(simulado.releaseDate, simulado.releaseTime)}
    </span>
  )
}

function SimuladoCard({ simulado, onChanged }: { simulado: Simulado; onChanged: () => void }) {
  const showToast = useToast()
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [reagendando, setReagendando] = useState(false)
  const [relDate, setRelDate] = useState(simulado.releaseDate)
  const [relTime, setRelTime] = useState(simulado.releaseTime)
  const [savingRelease, setSavingRelease] = useState(false)
  const semGabarito = simulado.questions.filter((q) => !q.correctLetter).length

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteSimulado({ data: { id: simulado.id } })
      onChanged()
      showToast('Conjunto excluído.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Não foi possível excluir.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  async function handleSaveRelease() {
    setSavingRelease(true)
    try {
      await updateSimuladoRelease({ data: { id: simulado.id, releaseDate: relDate, releaseTime: relTime } })
      setReagendando(false)
      onChanged()
      showToast(relDate ? 'Liberação reagendada.' : 'Liberado agora.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Não foi possível salvar.', 'error')
    } finally {
      setSavingRelease(false)
    }
  }

  return (
    <div className="panel-card plain" style={{ marginTop: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <b style={{ color: 'var(--navy)' }}>{simulado.title}</b>
          <div className="list-meta">
            {new Date(simulado.createdAt).toLocaleDateString('pt-BR')} · {simulado.questions.length} questões
          </div>
          <div style={{ marginTop: 4 }}><ReleaseStatus simulado={simulado} /></div>
          {semGabarito > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#a16207', fontSize: 12, marginTop: 4, fontWeight: 700 }}>
              <AlertTriangle size={13} /> {semGabarito} questão{semGabarito === 1 ? '' : 'ões'} sem gabarito reconhecido
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setReagendando((v) => !v)} className="btn btn-ghost btn-sm">
            <CalendarClock size={14} /> Reagendar
          </button>
          <button onClick={() => setOpen((v) => !v)} className="btn btn-ghost btn-sm">
            {open ? 'Fechar' : 'Ver questões'} {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button onClick={handleDelete} disabled={deleting} className="btn btn-danger btn-sm">
            <Trash2 size={14} /> {deleting ? '...' : 'Excluir'}
          </button>
        </div>
      </div>

      {reagendando && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Data de liberação</label>
            <input type="date" value={relDate} onChange={(e) => setRelDate(e.target.value)} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Horário</label>
            <input type="time" value={relTime} onChange={(e) => setRelTime(e.target.value)} />
          </div>
          <button onClick={handleSaveRelease} disabled={savingRelease} className="btn btn-primary btn-sm">
            {savingRelease ? 'Salvando...' : 'Salvar'}
          </button>
          {relDate && (
            <button onClick={() => { setRelDate(''); setRelTime('') }} className="btn btn-ghost btn-sm" type="button">
              Liberar agora
            </button>
          )}
        </div>
      )}

      {open && (
        <div style={{ display: 'grid', gap: 10, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
          {agruparPorTextoBase(simulado.questions, simulado.passages ?? []).map((grupo) => (
            <div key={grupo.key || 'sem-texto'} style={{ display: 'grid', gap: 10 }}>
              {grupo.passages.map((passage) => <TextoBase key={passage.id} passage={passage} />)}
              {grupo.questions.map((question) => (
                <div key={question.id} style={{ background: 'var(--lilac-tint)', borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <b style={{ color: 'var(--navy)', fontSize: 13 }}>{question.number}) {question.statement}</b>
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
          ))}
        </div>
      )}
    </div>
  )
}

type Conferencia = ReturnType<typeof parseActivityText> & { semGabarito: Array<{ number: number }> }

// Painel de conferência mostrado enquanto a professora cola o texto, antes de
// publicar: quantas questões e textos o sistema reconheceu e o que está
// estranho, apontando a questão exata em vez de um erro genérico.
function Conferencia({ conferencia }: { conferencia: Conferencia }) {
  const { passages, questions, issues, semGabarito } = conferencia
  const erros = issues.filter((i) => i.level === 'erro')
  const avisos = issues.filter((i) => i.level === 'aviso')
  const ok = questions.length > 0 && erros.length === 0

  return (
    <div style={{ padding: 14, background: 'var(--cream)', border: '1px solid var(--line)', borderRadius: 10, display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: ok ? '#15803d' : '#dc2626', fontWeight: 700, fontSize: 14 }}>
        {ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
        {questions.length === 0
          ? 'Nenhuma questão reconhecida ainda.'
          : `${questions.length} ${questions.length === 1 ? 'questão reconhecida' : 'questões reconhecidas'}.`}
        {passages.length > 0 && (
          <span style={{ color: 'var(--muted)', fontWeight: 700 }}>
            · {passages.length} {passages.length === 1 ? 'texto-base' : 'textos-base'}
          </span>
        )}
      </div>

      {erros.map((issue, index) => (
        <div key={`erro-${index}`} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', color: '#dc2626', fontSize: 13 }}>
          <XCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} /> {issue.message}
        </div>
      ))}
      {avisos.map((issue, index) => (
        <div key={`aviso-${index}`} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', color: '#a16207', fontSize: 13 }}>
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} /> {issue.message}
        </div>
      ))}
      {questions.length > 0 && semGabarito.length > 0 && (
        <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start', color: '#a16207', fontSize: 13 }}>
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
          Sem gabarito reconhecido {semGabarito.length === 1 ? 'na questão' : 'nas questões'}{' '}
          {semGabarito.slice(0, 12).map((q) => q.number).join(', ')}
          {semGabarito.length > 12 ? '…' : ''}.
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
  const [releaseDate, setReleaseDate] = useState('')
  const [releaseTime, setReleaseTime] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // Conferência antes de publicar: a mesma leitura que roda no servidor, feita
  // aqui no navegador enquanto a professora cola o texto.
  const conferencia = useMemo(() => {
    if (!questionsText.trim()) return null
    const parsed = parseActivityText(questionsText)
    const gabarito = parseGabaritoText(gabaritoText)
    const semGabarito = parsed.questions.filter((q) => {
      const letra = gabarito.get(q.number)
      return !letra || !q.options.some((o) => o.letter === letra)
    })
    return { ...parsed, semGabarito }
  }, [questionsText, gabaritoText])

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
      setError('Preencha o título e cole o texto das questões.')
      return
    }
    setSaving(true)
    try {
      const result = await createSimulado({ data: { title, questionsText, gabaritoText, releaseDate, releaseTime } })
      const textos = result.passagesFound > 0
        ? ` e ${result.passagesFound} ${result.passagesFound === 1 ? 'texto-base' : 'textos-base'}`
        : ''
      setNotice(
        result.answersMatched < result.questionsFound
          ? `${result.questionsFound} questões reconhecidas${textos}, mas só ${result.answersMatched} com gabarito. Publicado — confira o texto do gabarito.`
          : `${result.questionsFound} questões reconhecidas${textos}, todas com gabarito. Publicado!`,
      )
      setTitle('')
      setQuestionsText('')
      setGabaritoText('')
      setReleaseDate('')
      setReleaseTime('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível publicar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="panel">
      <Link to="/admin" className="panel-back">← Voltar ao painel admin</Link>
      <h1><ClipboardList /> Questões para treino</h1>
      <p className="panel-subtitle">
        Cole os textos-base e as questões num campo só — o sistema separa tudo automaticamente em questões de múltipla
        escolha para o aluno responder no site, com correção e nota na hora. (O simulado presencial fica no Calendário
        do curso.)
      </p>

      <form onSubmit={handleSubmit} className="panel-card">
        <div className="field">
          <label>Título</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Questões de Linguagens — Semana 1" />
        </div>
        <div className="field">
          <label>Textos e questões</label>
          <p className="field-hint" style={{ color: 'var(--muted)', fontSize: 12, margin: '0 0 8px' }}>
            Comece um texto-base com uma linha <b>TEXTO 1</b>, <b>TEXTO 2</b>… e cole o texto embaixo. Cada questão
            começa numa linha nova com <b>1)</b>, <b>2)</b>… e cada alternativa com <b>a)</b>, <b>b)</b>… (maiúscula
            ou minúscula). Os textos valem para as questões que vierem depois deles, até aparecer um novo bloco TEXTO.
          </p>
          <textarea
            value={questionsText}
            onChange={(e) => setQuestionsText(e.target.value)}
            placeholder={QUESTIONS_PLACEHOLDER}
            rows={14}
            style={{ fontFamily: 'monospace', fontSize: 13 }}
          />
        </div>
        <div className="field">
          <label>Gabarito <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(aceita "1) d", "1-d", "1. d" ou "1 d")</span></label>
          <textarea
            value={gabaritoText}
            onChange={(e) => setGabaritoText(e.target.value)}
            placeholder={GABARITO_PLACEHOLDER}
            rows={5}
            style={{ fontFamily: 'monospace', fontSize: 13 }}
          />
        </div>

        {conferencia && <Conferencia conferencia={conferencia} />}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Liberar em <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(opcional)</span></label>
            <input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Horário <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(opcional)</span></label>
            <input type="time" value={releaseTime} onChange={(e) => setReleaseTime(e.target.value)} />
          </div>
        </div>
        <p className="field-hint" style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>
          Em branco, libera na hora. Antes da data/horário, o aluno não vê nem consegue responder.
        </p>
        <button type="submit" disabled={saving} className="btn btn-primary" style={{ width: 'fit-content' }}>
          {saving ? 'Processando...' : 'Publicar'}
        </button>
        {error && <p className="form-error" style={{ margin: 0 }}>{error}</p>}
        {notice && <p className="form-success" style={{ margin: 0 }}>{notice}</p>}
      </form>

      <section>
        <h2 className="panel-section-title">Publicadas</h2>
        {loading && <p className="panel-subtitle">Carregando...</p>}
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          {simulados.map((simulado) => (
            <SimuladoCard key={simulado.id} simulado={simulado} onChanged={load} />
          ))}
          {!loading && simulados.length === 0 && <p className="empty-state">Nenhum conjunto publicado ainda.</p>}
        </div>
      </section>
    </main>
  )
}
