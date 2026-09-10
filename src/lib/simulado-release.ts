// Quando um conjunto de "Questões para treino" fica disponível para o aluno.
//
// A professora escolhe uma data ('AAAA-MM-DD') e, opcionalmente, um horário
// ('HH:MM'), no horário de Brasília. Sem data, o conjunto já nasce liberado.
//
// América/São_Paulo é UTC-3 o ano todo (sem horário de verão desde 2019), então
// a conta de fuso é uma soma fixa — mesmo padrão de materials.ts. Via Date.UTC
// pra ficar correto independente do fuso onde o código roda.

const BRASILIA_UTC_OFFSET_MS = 3 * 60 * 60 * 1000

export type ComReleaseTime = {
  releaseDate?: string | null
  releaseTime?: string | null
}

// Instante (epoch ms) em que o conjunto libera, ou null quando não tem data
// (libera na criação). Sem horário, considera 00:00 do dia.
export function releaseInstantMs(item: ComReleaseTime): number | null {
  if (!item.releaseDate) return null
  const [ano, mes, dia] = item.releaseDate.split('-').map(Number)
  const [hora, minuto] = (item.releaseTime || '00:00').split(':').map(Number)
  return Date.UTC(ano, mes - 1, dia, hora, minuto) + BRASILIA_UTC_OFFSET_MS
}

// Se o conjunto já está disponível para o aluno no instante `now` (epoch ms).
export function isReleased(item: ComReleaseTime, now: number = Date.now()): boolean {
  const at = releaseInstantMs(item)
  return at === null || at <= now
}
