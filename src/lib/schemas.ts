import { z } from 'zod'

// Peças de validação reaproveitadas pelos `inputValidator` das server
// functions. Antes, todas as server functions usavam
// `.validator((data) => data)` — ou seja, o que o cliente mandasse era
// aceito como veio, e cada handler conferia (ou não) campo por campo na mão.
// Aqui a validação passa a ser real e centralizada: tipo, obrigatoriedade,
// tamanho e formato (datas, horários, URLs) barrados na porta de entrada.

/** Texto obrigatório, sem espaços nas pontas, com teto de tamanho. */
export const boundedText = (max: number) => z.string().trim().min(1).max(max)

/** Texto opcional (pode vir vazio), com teto de tamanho. */
export const optionalText = (max: number) => z.string().trim().max(max).optional()

/** Identificador de registro (chave de blob) — string curta e não vazia. */
export const id = z.string().trim().min(1).max(200)

/** Data no formato 'AAAA-MM-DD'. */
export const isoDate = z.iso.date()

/** Horário no formato 'HH:MM' (24h). */
export const hhmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário inválido (use HH:MM).')

/** Duração de mentoria/aula em minutos — inteiro entre 5 e 480. */
export const durationMinutes = z.coerce.number().int().min(5).max(480)

/** Número de vagas de um grupo — inteiro entre 1 e 100. */
export const capacity = z.coerce.number().int().min(1).max(100)

/** URL http(s) — usada em link de aula ao vivo, vídeo do YouTube, etc. */
export const httpUrl = z
  .url()
  .refine((value) => /^https?:\/\//i.test(value), 'O link precisa começar com http:// ou https://')

/** URL http(s) opcional (campo de link que pode ficar em branco). */
export const optionalHttpUrl = z
  .union([httpUrl, z.literal('')])
  .optional()

/** data URL em base64 (`data:<mime>;base64,<...>`) com teto de tamanho da string. */
export const dataUrl = (maxStringLength: number) =>
  z
    .string()
    .min(1)
    .max(maxStringLength)
    .regex(/^data:[a-z0-9.+/-]*;base64,[A-Za-z0-9+/]*={0,2}$/i, 'Arquivo inválido.')

/** Nome de arquivo enviado pelo aluno/professora. */
export const fileName = z.string().trim().min(1).max(255)

/** Nota de competência de redação: 0 a `maxValue`, com no máx. uma casa decimal. */
export const competencyScore = z.object({
  id: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  maxValue: z.number().min(0).max(1000),
  value: z.number().min(0).max(1000),
})
