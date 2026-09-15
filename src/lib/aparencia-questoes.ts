// Aparência das "Questões para treino": cor, tamanho e tipo de letra de cada
// parte da questão, definidos pela professora no painel e valendo para todas
// as atividades.
//
// Os valores caem em `style` inline na tela do aluno, então os três são
// validados aqui antes de gravar — cor só em #rrggbb, tamanho dentro de uma
// faixa e fonte só da lista. Sem isso o campo viraria porta de entrada de CSS
// arbitrário pra dentro da página.

import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { z } from 'zod'
import { getServerUser } from './auth'
import { userHasRole, isStaff } from './roles'

/** As três partes que o aluno vê numa questão. */
export const PARTES = {
  textoBase: 'Texto-base',
  enunciado: 'Enunciado',
  alternativas: 'Alternativas',
} as const

export type ParteQuestao = keyof typeof PARTES

// Só fontes que já estão disponíveis: a da plataforma e duas pilhas do
// sistema. Nada aqui carrega arquivo novo nem depende de rede.
export const FONTES = {
  padrao: { nome: 'Padrão da plataforma', valor: 'var(--sans)' },
  serifa: { nome: 'Serifa (estilo prova impressa)', valor: "Georgia, 'Times New Roman', serif" },
  neutra: { nome: 'Neutra (Arial)', valor: 'Arial, Helvetica, sans-serif' },
} as const

export type FonteQuestao = keyof typeof FONTES

export const TAMANHO_MINIMO = 11
export const TAMANHO_MAXIMO = 26

export type EstiloParte = {
  cor: string // '#rrggbb'
  tamanho: number // px
  fonte: FonteQuestao
}

export type AparenciaQuestoes = Record<ParteQuestao, EstiloParte>

// Exatamente o que a tela já mostrava antes deste ajuste existir: quem não
// mexer em nada não vê diferença nenhuma.
export const APARENCIA_PADRAO: AparenciaQuestoes = {
  textoBase: { cor: '#0f2d52', tamanho: 14, fonte: 'padrao' },
  enunciado: { cor: '#0f2d52', tamanho: 14, fonte: 'padrao' },
  alternativas: { cor: '#0f2d52', tamanho: 13, fonte: 'padrao' },
}

const corSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use uma cor no formato #rrggbb.')
const estiloSchema = z.object({
  cor: corSchema,
  tamanho: z.number().int().min(TAMANHO_MINIMO).max(TAMANHO_MAXIMO),
  fonte: z.enum(['padrao', 'serifa', 'neutra']),
})
const aparenciaSchema = z.object({
  textoBase: estiloSchema,
  enunciado: estiloSchema,
  alternativas: estiloSchema,
})

/**
 * Normaliza o que veio do blob. Campo faltando ou fora da faixa cai no padrão
 * em vez de derrubar a tela do aluno — aparência quebrada não pode impedir
 * ninguém de responder as questões.
 */
export function normalizarAparencia(valor: unknown): AparenciaQuestoes {
  const resultado = aparenciaSchema.safeParse(valor)
  if (resultado.success) return resultado.data

  const bruto = (valor ?? {}) as Partial<Record<ParteQuestao, unknown>>
  const partes = Object.keys(APARENCIA_PADRAO) as ParteQuestao[]
  return partes.reduce((acc, parte) => {
    const umaParte = estiloSchema.safeParse(bruto[parte])
    acc[parte] = umaParte.success ? umaParte.data : APARENCIA_PADRAO[parte]
    return acc
  }, {} as AparenciaQuestoes)
}

/** O que vai no `style` de cada parte. Puro — serve no admin e na tela do aluno. */
export function estiloDaParte(aparencia: AparenciaQuestoes, parte: ParteQuestao) {
  const estilo = aparencia[parte]
  return {
    color: estilo.cor,
    fontSize: estilo.tamanho,
    fontFamily: FONTES[estilo.fonte].valor,
  }
}

function aparenciaStore() {
  return getStore({ name: 'simulado-aparencia', consistency: 'strong' })
}

const CHAVE = 'atual'

// Quem pode ler: o aluno também, porque é a tela dele que aplica a aparência.
export const getAparenciaQuestoes = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AparenciaQuestoes> => {
    const user = await getServerUser()
    if (!user || (!userHasRole(user, 'aprovado') && !isStaff(user))) {
      throw new Error('Acesso negado.')
    }

    try {
      const valor = await aparenciaStore().get(CHAVE, { type: 'json' })
      if (!valor) return APARENCIA_PADRAO
      return normalizarAparencia(valor)
    } catch (error) {
      console.error('Não foi possível ler a aparência das questões:', error)
      return APARENCIA_PADRAO
    }
  },
)

// Quem pode gravar: só admin.
export const salvarAparenciaQuestoes = createServerFn({ method: 'POST' })
  .validator(aparenciaSchema)
  .handler(async ({ data }): Promise<AparenciaQuestoes> => {
    const user = await getServerUser()
    if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')

    await aparenciaStore().setJSON(CHAVE, data)
    return data
  })
