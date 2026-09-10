// Quando disparar cada lembrete de um simulado (ou simuladão) da agenda.
//
// A professora cadastra o simulado no Calendário do curso com data ('AAAA-MM-DD')
// e, opcionalmente, horário ('HH:MM'). O aluno recebe dois lembretes:
//
//   1. Véspera: sempre às 18h do dia ANTERIOR ao simulado. Horário fixo e
//      previsível, nunca de madrugada — não depende da hora do simulado e
//      funciona mesmo quando o evento não tem horário marcado.
//   2. 30 minutos antes: 30 min antes do horário de início. Só existe quando o
//      evento tem horário; sem horário, esse lembrete não é enviado.
//
// América/São_Paulo é UTC-3 o ano todo (sem horário de verão desde 2019), então
// a conta de fuso é uma soma fixa — mesma convenção de materials.ts. Fazer via
// Date.UTC deixa o cálculo correto independível do fuso onde a função agendada
// roda (a Netlify roda em UTC).

const BRASILIA_UTC_OFFSET_MS = 3 * 60 * 60 * 1000
const MEIA_HORA_MS = 30 * 60 * 1000

export type FaseLembreteSimulado = 'vespera' | '30min'

// Instante (epoch ms) de início do simulado. Sem horário, assume 08:00 —
// só serve pra saber se o evento "já passou"; a véspera não usa esse valor.
export function instanteInicioSimulado(date: string, time: string): number {
  const [ano, mes, dia] = date.split('-').map(Number)
  const [hora, minuto] = (time || '08:00').split(':').map(Number)
  return Date.UTC(ano, mes - 1, dia, hora, minuto) + BRASILIA_UTC_OFFSET_MS
}

// Instante (epoch ms) do lembrete de véspera: 18h de Brasília do dia anterior.
export function instanteLembreteVespera(date: string): number {
  const [ano, mes, dia] = date.split('-').map(Number)
  // Date.UTC normaliza dia 0 / negativo pro mês anterior sozinho.
  return Date.UTC(ano, mes - 1, dia - 1, 18, 0) + BRASILIA_UTC_OFFSET_MS
}

// Meia-noite de Brasília do dia do simulado — separa o "amanhã" do "hoje" no
// aviso do sino do dashboard.
export function instanteInicioDoDiaSimulado(date: string): number {
  const [ano, mes, dia] = date.split('-').map(Number)
  return Date.UTC(ano, mes - 1, dia, 0, 0) + BRASILIA_UTC_OFFSET_MS
}

// Instante (epoch ms) do lembrete de 30 min antes, ou null quando o evento não
// tem horário marcado.
export function instanteLembrete30min(date: string, time: string): number | null {
  if (!time) return null
  return instanteInicioSimulado(date, time) - MEIA_HORA_MS
}

/**
 * Se o lembrete daquela fase já deveria ter saído no instante `agora`.
 * Simulado que já começou não gera mais lembrete nenhum.
 */
export function deveEnviarLembreteSimulado(
  fase: FaseLembreteSimulado,
  date: string,
  time: string,
  agora: Date,
): boolean {
  const agoraMs = agora.getTime()
  if (agoraMs >= instanteInicioSimulado(date, time)) return false

  const alvo = fase === 'vespera' ? instanteLembreteVespera(date) : instanteLembrete30min(date, time)
  if (alvo === null) return false
  return agoraMs >= alvo
}
