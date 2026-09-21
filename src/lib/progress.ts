import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { getServerUser } from './auth'
import { userHasRole } from './roles'
import { CONTENT_SECTIONS, type ContentSection } from './content-library'
import { isReleased, type Material } from './materials'
import { lerMateriaisBaixados } from './material-downloads'
import { isReleased as isSimuladoReleased } from './simulado-release'
import type { Simulado, SimuladoAttempt } from './simulados'
import type { Lesson } from './aulas'

export type ContentCounts = {
  aulas: number
  materiais: number
  bibliotecas: Record<ContentSection, number>
  totalArquivos: number
}

async function countBlobs(storeName: string) {
  const store = getStore({ name: storeName, consistency: 'strong' })
  const { blobs } = await store.list()
  return blobs.length
}

// Conta quantas aulas, materiais e arquivos (PDF/Word) existem hoje na plataforma,
// pra alimentar a área "Meu progresso" com números reais em vez de fixos.
export const getContentCounts = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getServerUser()
  if (!user || (!userHasRole(user, 'aprovado') && !userHasRole(user, 'admin'))) {
    throw new Error('Acesso negado.')
  }

  const [aulas, materiais] = await Promise.all([
    countBlobs('lessons'),
    countBlobs('student-materials'),
  ])

  const sectionKeys = Object.keys(CONTENT_SECTIONS) as ContentSection[]
  const sectionCounts = await Promise.all(
    sectionKeys.map((section) => countBlobs(`content-library-${section}`)),
  )

  const bibliotecas = Object.fromEntries(
    sectionKeys.map((section, index) => [section, sectionCounts[index]]),
  ) as Record<ContentSection, number>

  const totalArquivos = materiais + sectionCounts.reduce((sum, count) => sum + count, 0)

  const result: ContentCounts = { aulas, materiais, bibliotecas, totalArquivos }
  return result
})

// O curso lança em 15/09/2026. Tudo que foi publicado antes disso é conteúdo
// de teste e preparação — não é a jornada que o aluno comprou. O progresso
// conta só a partir da meia-noite de 14/09 no horário de Brasília (UTC-3 o ano
// todo), pra o aluno começar o curso do zero em vez de já entrar com a barra
// cheia herdada do período de montagem.
//
// Vale para as três fatias: aulas, materiais e redações.
export const PROGRESSO_CONTA_A_PARTIR_DE = '2026-09-14T03:00:00.000Z'

export type StudentProgress = {
  overallPercent: number
  aulasAssistidas: number
  aulasDisponiveis: number
  aulasPercent: number
  aulasTracked: boolean // false = ainda não tem nenhuma aula no período contado; a fatia não entra na média
  materiaisBaixados: number
  materiaisDisponiveis: number
  materiaisPercent: number
  materiaisTracked: boolean // false = nenhum material liberado no período contado
  simuladosRespondidos: number
  simuladosDisponiveis: number
  simuladosPercent: number
  simuladosTracked: boolean // false = nenhum conjunto de questões liberado no período contado
  redacoesEntregues: number
  redacoesPercent: number
}

// Meta de engajamento usada só para calcular a fatia de "redações" do progresso geral:
// entregar 5 redações conta como 100% nessa fatia. É um número de referência, não uma
// quantidade mínima obrigatória — pode ser ajustado aqui se fizer sentido mudar.
export const REDACOES_META_PROGRESSO = 5

// Calcula o "progresso geral" do aluno logado, combinando aulas assistidas,
// materiais baixados e redações entregues — sempre dentro do período contado
// (ver PROGRESSO_CONTA_A_PARTIR_DE).
export const getStudentProgress = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getServerUser()
  if (!user || (!userHasRole(user, 'aprovado') && !userHasRole(user, 'admin'))) {
    throw new Error('Acesso negado.')
  }

  const corte = PROGRESSO_CONTA_A_PARTIR_DE

  // Aulas do período contado. Precisa ler cada aula (não só listar as chaves)
  // porque é o `createdAt` de dentro do blob que decide se ela entra.
  const lessonsStore = getStore({ name: 'lessons', consistency: 'strong' })
  const { blobs: lessonBlobs } = await lessonsStore.list()
  const aulasContadas = new Set<string>()
  for (const blob of lessonBlobs) {
    const value = (await lessonsStore.get(blob.key, { type: 'json' })) as Lesson | null
    if (value && value.createdAt >= corte) aulasContadas.add(value.id)
  }
  const totalLessons = aulasContadas.size

  const watchStore = getStore({ name: 'lesson-watch-progress', consistency: 'strong' })
  const watchedList = user.email
    ? ((await watchStore.get(user.email, { type: 'json' })) as string[] | null) ?? []
    : []
  // Conta só as aulas assistidas que ainda existem E entram no período — o registro de
  // "assistida" nunca é limpo quando uma aula é excluída (ex.: admin reorganizando
  // módulos), então sem esse filtro o aluno podia acabar com "5 aulas assistidas de 2
  // disponíveis" e o progresso ficava travado em 100%.
  const watchedCount = watchedList.filter((id) => aulasContadas.has(id)).length

  // Materiais do período contado que já estão liberados pro aluno. É esta
  // contagem que faz o progresso "andar junto" com o que a professora publica:
  // material novo liberado entra no denominador na hora.
  const materialsStore = getStore({ name: 'student-materials', consistency: 'strong' })
  const { blobs: materialBlobs } = await materialsStore.list()
  const materiaisContados = new Set<string>()
  for (const blob of materialBlobs) {
    const value = (await materialsStore.get(blob.key, { type: 'json' })) as Material | null
    if (!value || value.createdAt < corte) continue
    if (!isReleased(value)) continue
    materiaisContados.add(value.id)
  }
  const baixados = await lerMateriaisBaixados(user.email)
  const materiaisBaixados = baixados.filter((id) => materiaisContados.has(id)).length

  // Questões para treino do período contado que já abriram pro aluno. Mesma
  // regra dos materiais: conjunto agendado pro futuro não entra no denominador
  // enquanto não libera, senão a barra do aluno cairia por causa de uma prova
  // que ele ainda nem pode fazer.
  const simuladosStore = getStore({ name: 'simulados', consistency: 'strong' })
  const { blobs: simuladoBlobs } = await simuladosStore.list()
  const agora = Date.now()
  const simuladosContados = new Set<string>()
  for (const blob of simuladoBlobs) {
    const value = (await simuladosStore.get(blob.key, { type: 'json' })) as Simulado | null
    if (!value || value.createdAt < corte) continue
    if (!isSimuladoReleased(value, agora)) continue
    simuladosContados.add(value.id)
  }

  // Cada aluno responde cada conjunto uma vez só, mas a contagem passa por um
  // Set mesmo assim: se um dia existir mais de uma tentativa do mesmo conjunto,
  // ela não pode contar duas vezes e estourar o denominador.
  const attemptsStore = getStore({ name: 'simulado-attempts', consistency: 'strong' })
  const { blobs: attemptBlobs } = await attemptsStore.list()
  const simuladosRespondidosSet = new Set<string>()
  for (const blob of attemptBlobs) {
    const value = (await attemptsStore.get(blob.key, { type: 'json' })) as SimuladoAttempt | null
    if (!value || value.studentEmail !== user.email) continue
    if (simuladosContados.has(value.simuladoId)) simuladosRespondidosSet.add(value.simuladoId)
  }
  const simuladosRespondidos = simuladosRespondidosSet.size

  const redacoesStore = getStore({ name: 'redacoes-submissions', consistency: 'strong' })
  const { blobs } = await redacoesStore.list()
  let redacoesEntregues = 0
  for (const blob of blobs) {
    const value = (await redacoesStore.get(blob.key, { type: 'json' })) as { studentEmail?: string; submittedAt?: string } | null
    if (!value || value.studentEmail !== user.email) continue
    if (!value.submittedAt || value.submittedAt < corte) continue
    redacoesEntregues += 1
  }

  const aulasTracked = totalLessons > 0
  const aulasPercent = aulasTracked ? Math.min(100, (watchedCount / totalLessons) * 100) : 0

  const materiaisTracked = materiaisContados.size > 0
  const materiaisPercent = materiaisTracked ? Math.min(100, (materiaisBaixados / materiaisContados.size) * 100) : 0

  const simuladosTracked = simuladosContados.size > 0
  const simuladosPercent = simuladosTracked ? Math.min(100, (simuladosRespondidos / simuladosContados.size) * 100) : 0

  const redacoesPercent = Math.min(100, (redacoesEntregues / REDACOES_META_PROGRESSO) * 100)

  // Fatia sem nada pra contar fica de FORA da média em vez de entrar como 0% —
  // senão o progresso do aluno afundaria por causa de um conteúdo que ainda
  // nem existe pra consumir. Redações sempre contam: a meta é fixa, não
  // depende de a professora ter publicado alguma coisa.
  const fatias = [redacoesPercent]
  if (aulasTracked) fatias.push(aulasPercent)
  if (materiaisTracked) fatias.push(materiaisPercent)
  if (simuladosTracked) fatias.push(simuladosPercent)
  const overallPercent = Math.round(fatias.reduce((soma, valor) => soma + valor, 0) / fatias.length)

  const result: StudentProgress = {
    overallPercent,
    aulasAssistidas: watchedCount,
    aulasDisponiveis: totalLessons,
    aulasPercent: Math.round(aulasPercent),
    aulasTracked,
    materiaisBaixados,
    materiaisDisponiveis: materiaisContados.size,
    materiaisPercent: Math.round(materiaisPercent),
    materiaisTracked,
    simuladosRespondidos,
    simuladosDisponiveis: simuladosContados.size,
    simuladosPercent: Math.round(simuladosPercent),
    simuladosTracked,
    redacoesEntregues,
    redacoesPercent: Math.round(redacoesPercent),
  }
  return result
})
