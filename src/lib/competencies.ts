import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { z } from 'zod'
import { getServerUser } from './auth'
import { isStaff } from './roles'

const competencyInput = z.object({
  id: z.string().trim().min(1).max(100),
  label: z.string().trim().min(1).max(200),
  maxValue: z.number().gt(0).max(1000),
  levels: z
    .array(z.object({ range: z.string().max(100), description: z.string().max(2000) }))
    .max(50)
    .optional(),
})

export type CompetencyLevel = {
  range: string
  description: string
}

export type Competency = {
  id: string
  label: string
  maxValue: number
  levels?: CompetencyLevel[]
}

// Esquema padrão: critérios, pontuação máxima e níveis de julgamento da banca Econ Rio
// (Vestibular Unificado — Anexo de Critérios e Níveis de Julgamento da Prova de Redação).
// A nota bruta máxima da redação é 10,0, dividida de forma desigual entre os 5 critérios.
export const DEFAULT_COMPETENCY_SCHEME: Competency[] = [
  {
    id: 'c1',
    label: 'Abordagem do tema',
    maxValue: 2,
    levels: [
      { range: '0,0', description: 'Não aborda o tema, configurando fuga ao tema (leva a redação à nota zero).' },
      { range: '0,25 a 0,5', description: 'Tangencia o tema.' },
      { range: '0,75 a 1,0', description: 'Aborda o tema de forma previsível.' },
      { range: '1,25 a 2,0', description: 'Aborda o tema com marcas de autoria.' },
    ],
  },
  {
    id: 'c2',
    label: 'Desenvolvimento do tema',
    maxValue: 3,
    levels: [
      { range: '0,0', description: 'Cópia de partes do caderno de questões, paráfrase ou transcrição de textos já existentes (plágio — leva a redação à nota zero).' },
      { range: '0,25 a 1,25', description: 'Desenvolve o texto recorrendo a estratégias de desenvolvimento existentes.' },
      { range: '1,5 a 3,0', description: 'Desenvolve o texto de forma autoral, sem recorrer a estratégias de desenvolvimento existentes.' },
    ],
  },
  {
    id: 'c3',
    label: 'Organização textual (dissertação)',
    maxValue: 1,
    levels: [
      { range: '0,0', description: 'Não é claramente uma dissertação (leva a redação à nota zero).' },
      { range: '0,25 a 0,5', description: 'Modelo cristalizado de dissertação.' },
      { range: '0,75 a 1,0', description: 'Supera o modelo cristalizado de dissertação.' },
    ],
  },
  {
    id: 'c4',
    label: 'Coesão textual e coerência das ideias',
    maxValue: 2,
    levels: [
      { range: '0,25 a 0,5', description: 'Problemas frequentes, ou repertório lexical limitado.' },
      { range: '0,75 a 1,0', description: 'Problemas localizados, ou repertório lexical pouco diversificado.' },
      { range: '1,25 a 2,0', description: 'Sem problemas, ou bom repertório lexical.' },
    ],
  },
  {
    id: 'c5',
    label: 'Expressividade e domínio da norma-padrão',
    maxValue: 2,
    levels: [
      { range: '0,5', description: 'Problemas diversos e recorrentes.' },
      { range: '0,75 a 1,0', description: 'Poucos problemas.' },
      { range: '1,25 a 1,5', description: 'Bom domínio da norma-padrão (até 2 desvios).' },
      { range: '1,75 a 2,0', description: 'Excelente domínio da norma-padrão.' },
    ],
  },
]

function schemeStore() {
  return getStore({ name: 'correction-settings', consistency: 'strong' })
}

// Qualquer aluno logado pode ler o esquema (precisa pra entender a própria nota).
export const getCompetencyScheme = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getServerUser()
  if (!user) throw new Error('Você precisa estar logado.')

  const store = schemeStore()
  const saved = await store.get('scheme', { type: 'json' })
  return (saved as Competency[] | null) ?? DEFAULT_COMPETENCY_SCHEME
})

export const updateCompetencyScheme = createServerFn({ method: 'POST' })
  .validator(z.object({ scheme: z.array(competencyInput).min(1).max(50) }))
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !isStaff(user)) throw new Error('Acesso negado.')

    const store = schemeStore()
    await store.setJSON('scheme', data.scheme)
    return data.scheme
  })
