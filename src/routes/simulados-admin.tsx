import { createFileRoute, redirect } from '@tanstack/react-router'
import { AlertTriangle, CalendarClock, CheckCircle2, ChevronDown, ChevronUp, ClipboardList, Palette, Trash2, XCircle } from 'lucide-react'
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
import { VoltarAoPainel } from '@/components/VoltarAoPainel'
import {
  APARENCIA_PADRAO, FONTES, PARTES, TAMANHO_MAXIMO, TAMANHO_MINIMO,
  estiloDaParte, getAparenciaQuestoes, salvarAparenciaQuestoes,
  type AparenciaQuestoes, type EstiloParte, type FonteQuestao, type ParteQuestao,
} from '@/lib/aparencia-questoes'

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

// Amostra usada só na prévia do editor de aparência.
const PASSAGEM_DE_EXEMPLO = { id: 'exemplo', label: 'TEXTO 1', content: 'Ler todo dia não é sobre quantidade. É sobre deixar o repertório a um passo de distância na hora em que a folha em branco aparece.' }
const ALTERNATIVAS_DE_EXEMPLO = [
  'a) a leitura diária muda o repertório do estudante.',
  'b) o repertório vem apenas da sala de aula.',
]
// Editor da aparência das questões: cor, tamanho e tipo de letra de cada
// parte, com prévia ao vivo do que o aluno vai ver.
function AparenciaEditor() {
  const showToast = useToast()
  const [aparencia, setAparencia] = useState<AparenciaQuestoes>(APARENCIA_PADRAO)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    getAparenciaQuestoes()
      .then(setAparencia)
      .catch(() => setErro('Não foi possível carregar a aparência salva. Mostrando o padrão.'))
      .finally(() => setCarregando(false))
  }, [])

  function alterar(parte: ParteQuestao, campo: keyof EstiloParte, valor: string | number) {
    setAparencia((atual) => ({ ...atual, [parte]: { ...atual[parte], [campo]: valor } }))
  }

  async function salvar() {
    setSalvando(true)
    setErro('')
    try {
      const salva = await salvarAparenciaQuestoes({ data: aparencia })
      setAparencia(salva)
      showToast('Aparência salva. As questões já aparecem assim para os alunos.', 'success')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar.')
    } finally {
      setSalvando(false)
    }
  }

  const partes = Object.keys(PARTES) as ParteQuestao[]

  return (
    <section className="panel-card plain" style={{ marginTop: 16 }}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: 0, background: 'none', border: 0, cursor: 'pointer', textAlign: 'left' }}
        aria-expanded={aberto}
      >
        <Palette size={17} color="var(--purple)" />
        <h2 className="panel-section-title" style={{ margin: 0, flex: 1 }}>Aparência das questões</h2>
        {aberto ? <ChevronUp size={16} color="var(--muted)" /> : <ChevronDown size={16} color="var(--muted)" />}
      </button>
      <p className="panel-card-hint" style={{ margin: '6px 0 0' }}>
        Cor, tamanho e tipo de letra de cada parte. Vale para todas as questões, na tela de responder e na de resultado.
      </p>

      {aberto && (
        <>
          {carregando && <p className="panel-subtitle" style={{ marginTop: 14 }}>Carregando...</p>}

          {!carregando && (
            <>
              <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
                {partes.map((parte) => (
                  <div key={parte} style={{ display: 'grid', gap: 8, padding: 14, background: 'var(--cream)', border: '1px solid var(--line)', borderRadius: 10 }}>
                    <div className="field-label">{PARTES[parte]}</div>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                      <label style={{ display: 'grid', gap: 5 }}>
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>Cor</span>
                        <input
                          type="color"
                          value={aparencia[parte].cor}
                          onChange={(e) => alterar(parte, 'cor', e.target.value)}
                          style={{ width: 54, height: 36, padding: 2, cursor: 'pointer' }}
                          aria-label={`Cor do ${PARTES[parte].toLowerCase()}`}
                        />
                      </label>
                      <label style={{ display: 'grid', gap: 5, flex: 1, minWidth: 190 }}>
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>Tamanho: {aparencia[parte].tamanho}px</span>
                        <input
                          type="range"
                          min={TAMANHO_MINIMO}
                          max={TAMANHO_MAXIMO}
                          step={1}
                          value={aparencia[parte].tamanho}
                          onChange={(e) => alterar(parte, 'tamanho', Number(e.target.value))}
                          aria-label={`Tamanho do ${PARTES[parte].toLowerCase()}`}
                        />
                      </label>
                      <label style={{ display: 'grid', gap: 5, minWidth: 210 }}>
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>Tipo de letra</span>
                        <select
                          value={aparencia[parte].fonte}
                          onChange={(e) => alterar(parte, 'fonte', e.target.value)}
                          aria-label={`Tipo de letra do ${PARTES[parte].toLowerCase()}`}
                        >
                          {(Object.keys(FONTES) as FonteQuestao[]).map((chave) => (
                            <option key={chave} value={chave}>{FONTES[chave].nome}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 18 }}>
                <div className="field-label" style={{ marginBottom: 8 }}>Como o aluno vê</div>
                <div style={{ padding: 16, background: '#fff', border: '1px solid var(--line)', borderRadius: 10 }}>
                  <TextoBase passage={PASSAGEM_DE_EXEMPLO} estilo={estiloDaParte(aparencia, 'textoBase')} />
                  <div style={{ marginTop: 12 }}>
                    <b style={estiloDaParte(aparencia, 'enunciado')}>1) De acordo com o texto, o autor defende que</b>
                    <div style={{ display: 'grid', gap: 5, marginTop: 10 }}>
                      {ALTERNATIVAS_DE_EXEMPLO.map((alternativa) => (
                        <span key={alternativa} style={estiloDaParte(aparencia, 'alternativas')}>{alternativa}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
                <button type="button" onClick={() => void salvar()} disabled={salvando} className="btn btn-primary">
                  {salvando ? 'Salvando...' : 'Salvar aparência'}
                </button>
                <button type="button" onClick={() => setAparencia(APARENCIA_PADRAO)} disabled={salvando} className="btn">
                  Restaurar padrão
                </button>
              </div>
              {erro && <p className="form-error">{erro}</p>}
            </>
          )}
        </>
      )}
    </section>
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
      <VoltarAoPainel />
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
            Cada questão começa numa linha nova — <b>QUESTÃO 1</b> ou <b>1)</b> — e cada alternativa com <b>(A)</b>, <b>A)</b> ou <b>a)</b>.
            Texto-base é opcional: comece com uma linha <b>TEXTO 1</b> e cole o texto embaixo;
            ele vale para as questões que vierem depois, até aparecer um novo bloco TEXTO. Linha cortada no meio pelo
            PDF é remontada sozinha.
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
          <label>Gabarito <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(aceita "1) d", "1-d", "QUESTÃO 1 - D" ou tudo numa linha só)</span></label>
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
        <p className="field-hint" style={{ color: 'var(--muted)', fontSize: 12, margin: '6px 0 0' }}>
          Em branco, libera na hora. Antes da data/horário, o aluno não vê nem consegue responder.
        </p>
        <button type="submit" disabled={saving} className="btn btn-primary" style={{ width: 'fit-content' }}>
          {saving ? 'Processando...' : 'Publicar'}
        </button>
        {error && <p className="form-error">{error}</p>}
        {notice && <p className="form-success">{notice}</p>}
      </form>

      <AparenciaEditor />

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
