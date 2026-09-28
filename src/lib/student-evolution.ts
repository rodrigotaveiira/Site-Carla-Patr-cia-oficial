import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { admin as identityAdmin } from '@netlify/identity'
import { getServerUser } from './auth'
import { userHasRole, isStaff } from './roles'
import type { RedacaoSubmission } from './redacoes'
import type { MaterialDownloadRecord } from './material-downloads'
import type { Simulado, SimuladoAttempt } from './simulados'
import type { Lesson } from './aulas'
import { isReleased as isMaterialReleased, type Material } from './materials'
import { isReleased as isSimuladoReleased } from './simulado-release'
import { PROGRESSO_CONTA_A_PARTIR_DE, REDACOES_META_PROGRESSO } from './progress'

// Visão de "como os alunos estão" pro painel admin, separada em blocos
// (Redação, Materiais, Testes, Progresso).
//
// O diretório de alunos vem de `admin.listUsers()`, do próprio pacote
// @netlify/identity — server-only, usa o token de operador que já vem de
// graça em toda Netlify Function, sem segredo novo pra configurar. Antes a
// lista vinha do store `session-history` (só quem já tinha logado
// alguma vez): um aluno aprovado que nunca entrou no site simplesmente não
// aparecia, mesmo com a conta liberada. `listUsers` traz todo mundo que
// existe de verdade no Identity, então a lista aqui reflete a turma real.
export async function listApprovedStudents() {
  const PER_PAGE = 200
  const MAX_PAGINAS = 20 // trava de segurança — não afeta hoje: 200*20 = 4000 contas.
  const todos: Awaited<ReturnType<typeof identityAdmin.listUsers>> = []
  for (let page = 1; page <= MAX_PAGINAS; page++) {
    const pagina = await identityAdmin.listUsers({ page, perPage: PER_PAGE })
    todos.push(...pagina)
    if (pagina.length < PER_PAGE) break
  }
  // Só quem tem a conta liberada como aluno — de fora ficam quem ainda está
  // "aguardando aprovação" (sem essa role ainda) e a equipe (admin/professor),
  // que não é "aluno" pra fins deste relatório.
  return todos.filter((u) => userHasRole(u, 'aprovado') && !isStaff(u))
}

function redacoesStore() {
  return getStore({ name: 'redacoes-submissions', consistency: 'strong' })
}

function materialDownloadsStore() {
  return getStore({ name: 'material-downloads', consistency: 'strong' })
}

// Mesmo store de src/lib/simulados.ts — lido direto aqui (em vez de chamar a
// server function de lá) pelo mesmo motivo de redação/materiais acima: um
// acesso a mais ao store é mais simples e barato do que reentrar noutra
// createServerFn de dentro desta.
function simuladoAttemptsStore() {
  return getStore({ name: 'simulado-attempts', consistency: 'strong' })
}

function simuladosCatalogoStore() {
  return getStore({ name: 'simulados', consistency: 'strong' })
}

function lessonsStore() {
  return getStore({ name: 'lessons', consistency: 'strong' })
}

// Mesmo índice usado em progress.ts pra saber quais aulas cada aluno já
// assistiu — chave = e-mail, valor = lista de ids de aula.
function lessonWatchProgressStore() {
  return getStore({ name: 'lesson-watch-progress', consistency: 'strong' })
}

function materiaisCatalogoStore() {
  return getStore({ name: 'student-materials', consistency: 'strong' })
}

// Mesmo índice usado em progress.ts (ver material-downloads.ts) pra saber
// quais materiais cada aluno já baixou — chave = e-mail, valor = lista de ids.
function materialDownloadProgressoStore() {
  return getStore({ name: 'material-download-progress', consistency: 'strong' })
}

export type RedacaoResumo = {
  id: string
  title: string
  submittedAt: string
  status: 'pendente' | 'corrigida'
  grade: number | null
}

export type MaterialDownloadResumo = {
  materialTitle: string
  downloadedAt: string
}

export type SimuladoAttemptResumo = {
  simuladoTitle: string
  score: number
  total: number
  percent: number
  submittedAt: string
}

export type StudentEvolution = {
  email: string
  name: string
  redacao: {
    average: number | null
    correctedCount: number
    totalCount: number
    recent: RedacaoResumo[]
  }
  materiais: {
    totalDownloads: number
    recent: MaterialDownloadResumo[]
  }
  testes: {
    averagePercent: number | null
    attemptsCount: number
    recent: SimuladoAttemptResumo[]
  }
  /**
   * Mesma lógica de `getStudentProgress` (src/lib/progress.ts) — o que o
   * aluno vê em "Meu progresso" — só que calculada pra turma inteira de uma
   * vez em vez de pro usuário logado. Antes esse bloco mostrava a sequência
   * de acesso (dias abrindo o dashboard), que não tinha nada a ver com os
   * outros três blocos (todos medem trabalho de verdade, não login).
   */
  progresso: {
    overallPercent: number
    aulasAssistidas: number
    aulasDisponiveis: number
    aulasTracked: boolean
    materiaisBaixados: number
    materiaisDisponiveis: number
    materiaisTracked: boolean
    simuladosRespondidos: number
    simuladosDisponiveis: number
    simuladosTracked: boolean
    redacoesEntregues: number
    redacoesPercent: number
  }
}

export type StudentEvolutionSummary = {
  students: StudentEvolution[]
  classRedacaoAverage: number | null
  totalDownloads: number
  classTestesAverage: number | null
  averageProgress: number | null
}

export const getStudentEvolution = createServerFn({ method: 'GET' }).handler(
  async (): Promise<StudentEvolutionSummary> => {
    const user = await getServerUser()
    if (!user || !isStaff(user)) throw new Error('Acesso negado.')

    let directory: { id: string; email: string; name: string }[] = []
    try {
      const aprovados = await listApprovedStudents()
      directory = aprovados
        .filter((u): u is typeof u & { email: string } => !!u.email)
        .map((u) => ({ id: u.id, email: u.email, name: u.name || 'Aluno' }))
    } catch (error) {
      console.error('Evolução dos alunos: falha ao listar o diretório de alunos (Identity):', error)
    }

    const redByEmail = new Map<string, RedacaoSubmission[]>()
    try {
      const store = redacoesStore()
      const { blobs } = await store.list()
      for (const blob of blobs) {
        try {
          const value = (await store.get(blob.key, { type: 'json' })) as RedacaoSubmission | null
          if (!value) continue
          const list = redByEmail.get(value.studentEmail) ?? []
          list.push(value)
          redByEmail.set(value.studentEmail, list)
        } catch (error) {
          console.error(`Evolução dos alunos: falha ao ler redação "${blob.key}":`, error)
        }
      }
    } catch (error) {
      console.error('Evolução dos alunos: falha ao listar redações:', error)
    }

    const downloadsByEmail = new Map<string, MaterialDownloadResumo[]>()
    try {
      const store = materialDownloadsStore()
      const { blobs } = await store.list()
      for (const blob of blobs) {
        try {
          const value = (await store.get(blob.key, { type: 'json' })) as MaterialDownloadRecord | null
          if (!value) continue
          const list = downloadsByEmail.get(value.studentEmail) ?? []
          list.push({ materialTitle: value.materialTitle, downloadedAt: value.downloadedAt })
          downloadsByEmail.set(value.studentEmail, list)
        } catch (error) {
          console.error(`Evolução dos alunos: falha ao ler download "${blob.key}":`, error)
        }
      }
    } catch (error) {
      console.error('Evolução dos alunos: falha ao listar downloads de materiais:', error)
    }

    const attemptsByEmail = new Map<string, SimuladoAttempt[]>()
    try {
      const store = simuladoAttemptsStore()
      const { blobs } = await store.list()
      for (const blob of blobs) {
        try {
          const value = (await store.get(blob.key, { type: 'json' })) as SimuladoAttempt | null
          if (!value) continue
          const list = attemptsByEmail.get(value.studentEmail) ?? []
          list.push(value)
          attemptsByEmail.set(value.studentEmail, list)
        } catch (error) {
          console.error(`Evolução dos alunos: falha ao ler tentativa de teste "${blob.key}":`, error)
        }
      }
    } catch (error) {
      console.error('Evolução dos alunos: falha ao listar tentativas de teste:', error)
    }

    // Denominadores do bloco "Progresso" — comuns a todo mundo, calculados
    // uma vez só (mesmo corte e mesma regra de "já liberado" de progress.ts).
    const corte = PROGRESSO_CONTA_A_PARTIR_DE
    const agora = Date.now()

    const aulasContadas = new Set<string>()
    try {
      const store = lessonsStore()
      const { blobs } = await store.list()
      for (const blob of blobs) {
        const value = (await store.get(blob.key, { type: 'json' })) as Lesson | null
        if (value && value.createdAt >= corte) aulasContadas.add(value.id)
      }
    } catch (error) {
      console.error('Evolução dos alunos: falha ao listar aulas:', error)
    }

    const materiaisContados = new Set<string>()
    try {
      const store = materiaisCatalogoStore()
      const { blobs } = await store.list()
      for (const blob of blobs) {
        const value = (await store.get(blob.key, { type: 'json' })) as Material | null
        if (value && value.createdAt >= corte && isMaterialReleased(value)) materiaisContados.add(value.id)
      }
    } catch (error) {
      console.error('Evolução dos alunos: falha ao listar materiais:', error)
    }

    const simuladosContados = new Set<string>()
    try {
      const store = simuladosCatalogoStore()
      const { blobs } = await store.list()
      for (const blob of blobs) {
        const value = (await store.get(blob.key, { type: 'json' })) as Simulado | null
        if (value && value.createdAt >= corte && isSimuladoReleased(value, agora)) simuladosContados.add(value.id)
      }
    } catch (error) {
      console.error('Evolução dos alunos: falha ao listar questões para treino:', error)
    }

    // Numeradores: os mesmos índices por e-mail que progress.ts já usa pro
    // aluno logado, aqui lidos de uma vez pra turma inteira.
    const assistidasByEmail = new Map<string, Set<string>>()
    try {
      const store = lessonWatchProgressStore()
      const { blobs } = await store.list()
      for (const blob of blobs) {
        const value = (await store.get(blob.key, { type: 'json' })) as string[] | null
        if (Array.isArray(value)) assistidasByEmail.set(blob.key, new Set(value))
      }
    } catch (error) {
      console.error('Evolução dos alunos: falha ao listar aulas assistidas:', error)
    }

    const baixadosByEmail = new Map<string, Set<string>>()
    try {
      const store = materialDownloadProgressoStore()
      const { blobs } = await store.list()
      for (const blob of blobs) {
        const value = (await store.get(blob.key, { type: 'json' })) as string[] | null
        if (Array.isArray(value)) baixadosByEmail.set(blob.key, new Set(value))
      }
    } catch (error) {
      console.error('Evolução dos alunos: falha ao listar materiais baixados:', error)
    }

    const students: StudentEvolution[] = []
    for (const entry of directory) {
      const submissions = (redByEmail.get(entry.email) ?? []).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
      const corrected = submissions.filter((s) => s.status === 'corrigida' && s.grade !== null)
      const average = corrected.length > 0
        ? Math.round((corrected.reduce((sum, s) => sum + (s.grade ?? 0), 0) / corrected.length) * 100) / 100
        : null

      const downloads = (downloadsByEmail.get(entry.email) ?? []).sort((a, b) => b.downloadedAt.localeCompare(a.downloadedAt))

      const attempts = (attemptsByEmail.get(entry.email) ?? []).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
      const averagePercent = attempts.length > 0
        ? Math.round((attempts.reduce((sum, a) => sum + a.percent, 0) / attempts.length) * 100) / 100
        : null

      const aulasDisponiveis = aulasContadas.size
      const aulasAssistidas = [...(assistidasByEmail.get(entry.email) ?? [])].filter((id) => aulasContadas.has(id)).length
      const aulasTracked = aulasDisponiveis > 0
      const aulasPercent = aulasTracked ? Math.min(100, (aulasAssistidas / aulasDisponiveis) * 100) : 0

      const materiaisDisponiveis = materiaisContados.size
      const materiaisBaixados = [...(baixadosByEmail.get(entry.email) ?? [])].filter((id) => materiaisContados.has(id)).length
      const materiaisTracked = materiaisDisponiveis > 0
      const materiaisProgressoPercent = materiaisTracked ? Math.min(100, (materiaisBaixados / materiaisDisponiveis) * 100) : 0

      const simuladosDisponiveis = simuladosContados.size
      const simuladosRespondidos = new Set(
        attempts.filter((a) => simuladosContados.has(a.simuladoId)).map((a) => a.simuladoId),
      ).size
      const simuladosTracked = simuladosDisponiveis > 0
      const simuladosPercent = simuladosTracked ? Math.min(100, (simuladosRespondidos / simuladosDisponiveis) * 100) : 0

      const redacoesEntregues = submissions.filter((s) => s.submittedAt >= corte).length
      const redacoesPercent = Math.min(100, (redacoesEntregues / REDACOES_META_PROGRESSO) * 100)

      // Fatia sem nada pra contar fica de fora da média — mesma regra de
      // progress.ts, pra não afundar o progresso por causa de conteúdo que
      // ainda nem existe.
      const fatias = [redacoesPercent]
      if (aulasTracked) fatias.push(aulasPercent)
      if (materiaisTracked) fatias.push(materiaisProgressoPercent)
      if (simuladosTracked) fatias.push(simuladosPercent)
      const overallPercent = Math.round(fatias.reduce((soma, valor) => soma + valor, 0) / fatias.length)

      students.push({
        email: entry.email,
        name: entry.name,
        redacao: {
          average,
          correctedCount: corrected.length,
          totalCount: submissions.length,
          recent: submissions.slice(0, 5).map((s) => ({ id: s.id, title: s.title, submittedAt: s.submittedAt, status: s.status, grade: s.grade })),
        },
        materiais: {
          totalDownloads: downloads.length,
          recent: downloads.slice(0, 5),
        },
        testes: {
          averagePercent,
          attemptsCount: attempts.length,
          recent: attempts.slice(0, 5).map((a) => ({ simuladoTitle: a.simuladoTitle, score: a.score, total: a.total, percent: a.percent, submittedAt: a.submittedAt })),
        },
        progresso: {
          overallPercent,
          aulasAssistidas,
          aulasDisponiveis,
          aulasTracked,
          materiaisBaixados,
          materiaisDisponiveis,
          materiaisTracked,
          simuladosRespondidos,
          simuladosDisponiveis,
          simuladosTracked,
          redacoesEntregues,
          redacoesPercent: Math.round(redacoesPercent),
        },
      })
    }

    students.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

    const withGrade = students.filter((s) => s.redacao.average !== null)
    const classRedacaoAverage = withGrade.length > 0
      ? Math.round((withGrade.reduce((sum, s) => sum + (s.redacao.average ?? 0), 0) / withGrade.length) * 100) / 100
      : null

    const totalDownloads = students.reduce((sum, s) => sum + s.materiais.totalDownloads, 0)

    const withTestes = students.filter((s) => s.testes.averagePercent !== null)
    const classTestesAverage = withTestes.length > 0
      ? Math.round((withTestes.reduce((sum, s) => sum + (s.testes.averagePercent ?? 0), 0) / withTestes.length) * 100) / 100
      : null

    // Diferente das médias acima, ninguém fica de fora aqui: overallPercent
    // sempre existe (a fatia de redação sempre entra na conta, mesmo em 0%),
    // então um aluno que nunca acessou pesa na média com 0% — é isso que
    // torna esse número útil pra turma: mostra quem realmente está de fora.
    const averageProgress = students.length > 0
      ? Math.round(students.reduce((sum, s) => sum + s.progresso.overallPercent, 0) / students.length)
      : null

    return { students, classRedacaoAverage, totalDownloads, classTestesAverage, averageProgress }
  },
)
