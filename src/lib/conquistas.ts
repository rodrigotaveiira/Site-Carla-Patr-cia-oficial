// Motor da área "Minhas Conquistas".
//
// Nada aqui é inventado: tudo sai do que o aluno já fez na plataforma —
// os dias de acesso (store `weekly-activity`), as aulas assistidas
// (`lesson-watch-progress`), as aulas cadastradas (`lessons`) e as tentativas
// de simulado (`simulado-attempts`). O único dado próprio desta área é a data
// em que cada conquista foi desbloqueada, guardada no store `achievements`
// pra a gente saber o que é novidade e animar só uma vez.
//
// Pra criar uma medalha nova: cadastre no catálogo (conquistas-catalogo.ts) e
// acrescente a regra em `calcularDesbloqueadas` aqui embaixo.

import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { z } from 'zod'
import { getServerUser } from './auth'
import { userHasRole, isStaff } from './roles'
import { id as idSchema } from './schemas'
import { WEEKLY_GOAL, startOfWeek, toISODate, weekDates } from './weekly-activity'
import { CONQUISTAS, JORNADA_SEMANAL, SEQUENCIAS } from './conquistas-catalogo'
import type { Lesson } from './aulas'
import type { SimuladoAttempt } from './simulados'

// Quantas questões contam como "Mestre da Prática".
export const META_QUESTOES = 100
// Nota mínima (em %) numa atividade pra valer o selo "Precisão".
export const META_PRECISAO = 90
// Aulas concluídas pra valer o selo "Explorador do Conhecimento".
export const META_AULAS = 5
// Dias seguidos pra valer o selo "Imparável".
export const META_IMPARAVEL = 14

function activityStore() {
  return getStore({ name: 'weekly-activity', consistency: 'strong' })
}

function achievementsStore() {
  return getStore({ name: 'achievements', consistency: 'strong' })
}

async function requireStudent() {
  const user = await getServerUser()
  if (!user || (!userHasRole(user, 'aprovado') && !isStaff(user))) {
    throw new Error('Acesso negado.')
  }
  return user
}

// ---------------------------------------------------------------------------
// Tipos devolvidos pro navegador
// ---------------------------------------------------------------------------

export type DiaDaSemana = { data: string; concluido: boolean; hoje: boolean }

export type ProximaConquista = {
  id: string
  // Quantos dias de estudo ainda faltam pra desbloquear.
  faltam: number
}

export type MissaoDeHoje = {
  id: string
  titulo: string
  descricao: string
  href: string
  cta: string
}

export type EstadoConquistas = {
  semana: {
    diasConcluidos: number
    meta: number
    percentual: number
    dias: DiaDaSemana[]
    diaGarantido: boolean // hoje já conta na meta?
  }
  sequencia: {
    atual: number
    recorde: number
  }
  // A próxima recompensa a perseguir: primeiro a jornada da semana, e quando
  // ela termina, o próximo marco de sequência. É o que gera expectativa.
  proxima: ProximaConquista | null
  proximaSequencia: ProximaConquista | null
  desbloqueadas: { id: string; em: string }[]
  // Desbloqueadas que o aluno ainda não viu — é o que dispara a animação.
  novas: string[]
  numeros: {
    aulasAssistidas: number
    totalAulas: number
    questoesResolvidas: number
    melhorPercentual: number
    semanasBatidas: number
  }
  missao: MissaoDeHoje
}

// ---------------------------------------------------------------------------
// Cálculos sobre os dias de estudo
// ---------------------------------------------------------------------------

const UM_DIA_MS = 24 * 60 * 60 * 1000

function timestampDe(data: string) {
  return Date.parse(`${data}T00:00:00Z`)
}

// Meia-noite LOCAL do dia, e não `new Date(timestampDe(...))` (que é meia-noite
// UTC): startOfWeek e toISODate raciocinam no fuso local, então uma data lida
// como UTC cairia no dia anterior em qualquer fuso negativo — e a semana toda
// sairia deslocada.
function dataLocal(data: string) {
  const [ano, mes, dia] = data.split('-').map(Number)
  return new Date(ano ?? 1970, (mes ?? 1) - 1, dia ?? 1)
}

// Dias seguidos até hoje. Hoje ainda sem acesso não quebra a sequência — a
// mesma regra do badge de sequência do dashboard (weekly-activity.ts).
function sequenciaAtual(dias: Set<string>) {
  const cursor = new Date()
  if (!dias.has(toISODate(cursor))) cursor.setDate(cursor.getDate() - 1)

  let atual = 0
  while (dias.has(toISODate(cursor))) {
    atual++
    cursor.setDate(cursor.getDate() - 1)
  }
  return atual
}

// Maior sequência já alcançada, em qualquer momento do histórico.
function maiorSequencia(diasOrdenados: string[]) {
  let melhor = 0
  let atual = 0
  let anterior: number | null = null

  for (const dia of diasOrdenados) {
    const ts = timestampDe(dia)
    if (Number.isNaN(ts)) continue
    atual = anterior !== null && ts - anterior === UM_DIA_MS ? atual + 1 : 1
    anterior = ts
    if (atual > melhor) melhor = atual
  }
  return melhor
}

type ResumoSemana = { total: number; temDomingo: boolean }

// Agrupa o histórico por semana (segunda a domingo) pra responder "quantas
// semanas ele bateu a meta", "teve alguma semana 7/7" e "alguma vez ele bateu
// a meta no último dia possível".
function semanas(diasOrdenados: string[]) {
  const mapa = new Map<string, ResumoSemana>()
  for (const dia of diasOrdenados) {
    if (Number.isNaN(timestampDe(dia))) continue
    const local = dataLocal(dia)
    const chave = toISODate(startOfWeek(local))
    const resumo = mapa.get(chave) ?? { total: 0, temDomingo: false }
    resumo.total += 1
    // Domingo é o último dia da semana no nosso calendário (segunda a domingo).
    if (local.getDay() === 0) resumo.temDomingo = true
    mapa.set(chave, resumo)
  }
  return Array.from(mapa.values())
}

// ---------------------------------------------------------------------------
// Leitura dos dados do aluno
// ---------------------------------------------------------------------------

type DadosDoAluno = {
  diasEstudo: string[]
  aulasAssistidas: number
  totalAulas: number
  moduloConcluido: boolean
  questoesResolvidas: number
  melhorPercentual: number
  fezRevisao: boolean // refez alguma atividade que já tinha entregue
  revisaoPerfeita: boolean // 100% numa refeita
  superouAnterior: boolean
  temAulaNaoAssistida: boolean
  fezAlgumaAtividade: boolean
}

async function lerDiasDeEstudo(userId: string) {
  // Uma chamada só traz todas as datas do aluno — as chaves do store são
  // `${userId}:${AAAA-MM-DD}`, então o prefixo já filtra por aluno.
  const prefixo = `${userId}:`
  const { blobs } = await activityStore().list({ prefix: prefixo })
  return blobs.map((blob) => blob.key.slice(prefixo.length)).filter(Boolean).sort()
}

async function lerAulas(email: string | undefined) {
  const lessonsStore = getStore({ name: 'lessons', consistency: 'strong' })
  const { blobs } = await lessonsStore.list()

  const aulas: Lesson[] = []
  for (const blob of blobs) {
    const value = (await lessonsStore.get(blob.key, { type: 'json' })) as Lesson | null
    if (value) aulas.push(value)
  }

  const watchStore = getStore({ name: 'lesson-watch-progress', consistency: 'strong' })
  const assistidasBrutas = email
    ? ((await watchStore.get(email, { type: 'json' })) as string[] | null) ?? []
    : []

  // Só conta aula assistida que ainda existe hoje — igual ao progresso geral
  // (progress.ts): aula excluída pela professora não pode inflar o número.
  const idsAtuais = new Set(aulas.map((aula) => aula.id))
  const assistidas = new Set(assistidasBrutas.filter((id) => idsAtuais.has(id)))

  // "Módulo Concluído": algum módulo com pelo menos uma aula, todas assistidas.
  const porModulo = new Map<string, Lesson[]>()
  for (const aula of aulas) {
    const lista = porModulo.get(aula.module) ?? []
    lista.push(aula)
    porModulo.set(aula.module, lista)
  }
  const moduloConcluido = Array.from(porModulo.values()).some(
    (lista) => lista.length > 0 && lista.every((aula) => assistidas.has(aula.id)),
  )

  return {
    totalAulas: aulas.length,
    aulasAssistidas: assistidas.size,
    moduloConcluido,
    temAulaNaoAssistida: aulas.some((aula) => !assistidas.has(aula.id)),
  }
}

async function lerAtividades(email: string | undefined) {
  const vazio = {
    questoesResolvidas: 0,
    melhorPercentual: 0,
    fezRevisao: false,
    revisaoPerfeita: false,
    superouAnterior: false,
    fezAlgumaAtividade: false,
  }
  if (!email) return vazio

  const store = getStore({ name: 'simulado-attempts', consistency: 'strong' })
  const { blobs } = await store.list()

  const minhas: SimuladoAttempt[] = []
  for (const blob of blobs) {
    const value = (await store.get(blob.key, { type: 'json' })) as SimuladoAttempt | null
    if (value && value.studentEmail === email) minhas.push(value)
  }
  if (minhas.length === 0) return vazio

  minhas.sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))

  let questoesResolvidas = 0
  let melhorPercentual = 0
  let fezRevisao = false
  let revisaoPerfeita = false
  let superouAnterior = false

  const jaFeitos = new Set<string>()
  for (let i = 0; i < minhas.length; i++) {
    const tentativa = minhas[i]!
    questoesResolvidas += tentativa.total
    if (tentativa.percent > melhorPercentual) melhorPercentual = tentativa.percent

    // Refazer uma atividade já entregue é a "revisão programada" que a gente
    // consegue reconhecer de verdade com os dados que existem hoje.
    if (jaFeitos.has(tentativa.simuladoId)) {
      fezRevisao = true
      if (tentativa.percent >= 100) revisaoPerfeita = true
    }
    jaFeitos.add(tentativa.simuladoId)

    const anterior = i > 0 ? minhas[i - 1]! : null
    if (anterior && tentativa.percent > anterior.percent) superouAnterior = true
  }

  return {
    questoesResolvidas,
    melhorPercentual,
    fezRevisao,
    revisaoPerfeita,
    superouAnterior,
    fezAlgumaAtividade: true,
  }
}

// ---------------------------------------------------------------------------
// Regras de desbloqueio
// ---------------------------------------------------------------------------

function calcularDesbloqueadas(dados: DadosDoAluno) {
  const dias = new Set(dados.diasEstudo)
  const atual = sequenciaAtual(dias)
  const recorde = Math.max(atual, maiorSequencia(dados.diasEstudo))

  const datasDaSemana = weekDates(new Date())
  const diasDaSemana: DiaDaSemana[] = datasDaSemana.map((data) => ({
    data,
    concluido: dias.has(data),
    hoje: data === toISODate(new Date()),
  }))
  const diasConcluidos = diasDaSemana.filter((dia) => dia.concluido).length

  const resumoSemanas = semanas(dados.diasEstudo)
  const semanasBatidas = resumoSemanas.filter((s) => s.total >= WEEKLY_GOAL).length
  const semanaPerfeita = resumoSemanas.some((s) => s.total === 7)
  // Meta batida exatamente no domingo: o 5º dia foi o último disponível.
  const ultimoEsforco = resumoSemanas.some((s) => s.total === WEEKLY_GOAL && s.temDomingo)

  const desbloqueadas = new Set<string>()

  for (const etapa of JORNADA_SEMANAL) {
    if (diasConcluidos >= (etapa.dias ?? 0)) desbloqueadas.add(etapa.id)
  }
  for (const marco of SEQUENCIAS) {
    if (recorde >= (marco.dias ?? 0)) desbloqueadas.add(marco.id)
  }

  if (dados.aulasAssistidas >= META_AULAS) desbloqueadas.add('especial-aulas-5')
  if (dados.questoesResolvidas >= META_QUESTOES) desbloqueadas.add('especial-questoes-100')
  if (dados.melhorPercentual >= META_PRECISAO) desbloqueadas.add('especial-precisao')
  if (dados.fezRevisao) desbloqueadas.add('especial-revisao')
  if (semanaPerfeita) desbloqueadas.add('especial-semana-perfeita')
  if (ultimoEsforco) desbloqueadas.add('especial-ultimo-esforco')
  if (dados.revisaoPerfeita) desbloqueadas.add('especial-memoria')
  if (dados.superouAnterior) desbloqueadas.add('especial-evolucao')
  if (recorde >= META_IMPARAVEL) desbloqueadas.add('especial-imparavel')
  if (dados.moduloConcluido) desbloqueadas.add('especial-modulo')

  return {
    desbloqueadas,
    diasDaSemana,
    diasConcluidos,
    sequencia: { atual, recorde },
    semanasBatidas,
  }
}

// A próxima recompensa da jornada semanal — ou, se a semana já está completa,
// o próximo marco de sequência. Sem isso o aluno não tem o que perseguir.
function calcularProxima(diasConcluidos: number, recorde: number) {
  const etapa = JORNADA_SEMANAL.find((item) => diasConcluidos < (item.dias ?? 0))
  const marco = SEQUENCIAS.find((item) => recorde < (item.dias ?? 0))

  const proximaSequencia: ProximaConquista | null = marco
    ? { id: marco.id, faltam: (marco.dias ?? 0) - recorde }
    : null
  const proxima: ProximaConquista | null = etapa
    ? { id: etapa.id, faltam: (etapa.dias ?? 0) - diasConcluidos }
    : proximaSequencia

  return { proxima, proximaSequencia }
}

// Uma tarefa curta e objetiva pra hoje, escolhida pela primeira coisa que
// ainda falta — assim a missão muda conforme o aluno avança em vez de repetir.
function calcularMissao(dados: DadosDoAluno): MissaoDeHoje {
  if (dados.temAulaNaoAssistida) {
    return {
      id: 'assistir-aula',
      titulo: 'Assista à próxima aula',
      descricao: 'Uma aula já garante o seu dia na meta semanal.',
      href: '/aulas',
      cta: 'Começar agora',
    }
  }
  if (dados.questoesResolvidas < META_QUESTOES) {
    return {
      id: 'resolver-questoes',
      titulo: 'Resolva 10 questões',
      descricao: `Você já resolveu ${dados.questoesResolvidas} de ${META_QUESTOES} questões.`,
      href: '/simulados',
      cta: 'Começar agora',
    }
  }
  if (dados.fezAlgumaAtividade && !dados.fezRevisao) {
    return {
      id: 'revisar',
      titulo: 'Faça uma revisão',
      descricao: 'Refaça uma atividade que você já entregou e veja o quanto fixou.',
      href: '/simulados',
      cta: 'Começar agora',
    }
  }
  return {
    id: 'estudar-20',
    titulo: 'Estude por 20 minutos',
    descricao: 'Abra a biblioteca e escolha um conteúdo pra hoje.',
    href: '/conteudo/biblioteca',
    cta: 'Começar agora',
  }
}

// ---------------------------------------------------------------------------
// Registro do que já foi desbloqueado
// ---------------------------------------------------------------------------

type Registro = {
  // Só as permanentes (sequência e especiais) — id da conquista -> quando saiu.
  desbloqueadas: Record<string, string>
  // Permanentes que o aluno já viu a animação.
  vistas: string[]
  // A jornada semanal reinicia toda segunda, então o que já foi celebrado
  // nesta semana é guardado à parte, junto da segunda-feira de referência.
  semana: string
  vistasSemana: string[]
}

function normalizarRegistro(valor: unknown): Registro {
  const bruto = (valor ?? {}) as Partial<Registro>
  return {
    desbloqueadas: bruto.desbloqueadas && typeof bruto.desbloqueadas === 'object' ? bruto.desbloqueadas : {},
    vistas: Array.isArray(bruto.vistas) ? bruto.vistas : [],
    semana: typeof bruto.semana === 'string' ? bruto.semana : '',
    vistasSemana: Array.isArray(bruto.vistasSemana) ? bruto.vistasSemana : [],
  }
}

const IDS_SEMANAIS = new Set(JORNADA_SEMANAL.map((etapa) => etapa.id))

// ---------------------------------------------------------------------------
// Server functions
// ---------------------------------------------------------------------------

export const getMyAchievements = createServerFn({ method: 'GET' }).handler(
  async (): Promise<EstadoConquistas | null> => {
    const user = await requireStudent()
    if (!user.id) return null

    const [diasEstudo, aulas, atividades] = await Promise.all([
      lerDiasDeEstudo(user.id),
      lerAulas(user.email),
      lerAtividades(user.email),
    ])

    const dados: DadosDoAluno = { diasEstudo, ...aulas, ...atividades }
    const calculo = calcularDesbloqueadas(dados)

    const store = achievementsStore()
    const registro = normalizarRegistro(await store.get(user.id, { type: 'json' }))

    const segunda = toISODate(startOfWeek(new Date()))
    let mudou = false
    // Semana nova: a jornada recomeça do zero e volta a poder ser celebrada.
    if (registro.semana !== segunda) {
      registro.semana = segunda
      registro.vistasSemana = []
      mudou = true
    }

    const agora = new Date().toISOString()
    for (const id of calculo.desbloqueadas) {
      if (IDS_SEMANAIS.has(id)) continue // a semanal não vira histórico permanente
      if (!registro.desbloqueadas[id]) {
        registro.desbloqueadas[id] = agora
        mudou = true
      }
    }
    // A jornada semanal é a única que pode "desdesbloquear" (na virada da
    // semana), então ela nunca entra em `desbloqueadas` — é sempre recalculada.
    const vistasSemanaValidas = registro.vistasSemana.filter((id) => calculo.desbloqueadas.has(id))
    if (vistasSemanaValidas.length !== registro.vistasSemana.length) {
      registro.vistasSemana = vistasSemanaValidas
      mudou = true
    }
    if (mudou) await store.setJSON(user.id, registro)

    const novas = Array.from(calculo.desbloqueadas).filter((id) =>
      IDS_SEMANAIS.has(id) ? !registro.vistasSemana.includes(id) : !registro.vistas.includes(id),
    )

    const desbloqueadas = Array.from(calculo.desbloqueadas).map((id) => ({
      id,
      em: IDS_SEMANAIS.has(id) ? `${segunda}T00:00:00.000Z` : registro.desbloqueadas[id] ?? agora,
    }))

    const { proxima, proximaSequencia } = calcularProxima(calculo.diasConcluidos, calculo.sequencia.recorde)

    return {
      semana: {
        diasConcluidos: calculo.diasConcluidos,
        meta: WEEKLY_GOAL,
        percentual: Math.min(100, Math.round((calculo.diasConcluidos / WEEKLY_GOAL) * 100)),
        dias: calculo.diasDaSemana,
        diaGarantido: calculo.diasDaSemana.some((dia) => dia.hoje && dia.concluido),
      },
      sequencia: calculo.sequencia,
      proxima,
      proximaSequencia,
      desbloqueadas,
      novas,
      numeros: {
        aulasAssistidas: dados.aulasAssistidas,
        totalAulas: dados.totalAulas,
        questoesResolvidas: dados.questoesResolvidas,
        melhorPercentual: dados.melhorPercentual,
        semanasBatidas: calculo.semanasBatidas,
      },
      missao: calcularMissao(dados),
    }
  },
)

const IDS_VALIDOS = new Set(CONQUISTAS.map((conquista) => conquista.id))

// Marca as conquistas que o aluno acabou de ver, pra a animação de desbloqueio
// não aparecer de novo na próxima visita.
export const markAchievementsSeen = createServerFn({ method: 'POST' })
  .validator(z.object({ ids: z.array(idSchema).max(CONQUISTAS.length) }))
  .handler(async ({ data }) => {
    const user = await requireStudent()
    if (!user.id) return { ok: false }

    const ids = data.ids.filter((id) => IDS_VALIDOS.has(id))
    if (ids.length === 0) return { ok: true }

    const store = achievementsStore()
    const registro = normalizarRegistro(await store.get(user.id, { type: 'json' }))

    const segunda = toISODate(startOfWeek(new Date()))
    if (registro.semana !== segunda) {
      registro.semana = segunda
      registro.vistasSemana = []
    }

    const vistas = new Set(registro.vistas)
    const vistasSemana = new Set(registro.vistasSemana)
    for (const id of ids) {
      if (IDS_SEMANAIS.has(id)) vistasSemana.add(id)
      else vistas.add(id)
    }
    registro.vistas = Array.from(vistas)
    registro.vistasSemana = Array.from(vistasSemana)

    await store.setJSON(user.id, registro)
    return { ok: true }
  })
