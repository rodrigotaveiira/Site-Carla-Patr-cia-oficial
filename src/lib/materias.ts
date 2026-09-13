import { z } from 'zod'

// As duas frentes que a professora ensina. Usado tanto nas Dicas quanto nos
// Materiais — é o mesmo conceito nas duas telas, e duas listas separadas
// divergiriam na primeira vez que alguém mexesse numa só.
export const MATERIAS = {
  gramatica: 'Gramática',
  redacao: 'Redação',
} as const

export type Materia = keyof typeof MATERIAS

export const materiaSchema = z.enum(['gramatica', 'redacao'])

/** Arquivo publicado antes das frentes existirem entra em Redação. */
export function resolveMateria(item: { subject?: Materia }): Materia {
  return item.subject ?? 'redacao'
}
