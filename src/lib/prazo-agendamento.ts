// Prazo pra agendar uma mentoria (individual ou em grupo): quando a Carla
// cadastra um horário, os alunos têm PRAZO_AGENDAMENTO_HORAS pra marcar.
// Depois disso o horário fecha pra agendamento, mesmo que ainda esteja livre.
//
// O prazo é gravado no próprio horário (`bookingDeadline`, um instante ISO),
// não calculado na hora a partir de `createdAt` — assim dá pra estender o de
// um horário específico sem mexer na regra. Horários sem o campo (criados
// antes dele existir) ficam abertos.

export const PRAZO_AGENDAMENTO_HORAS = 24

export function prazoPadraoDeAgendamento(agora = new Date()): string {
  return new Date(agora.getTime() + PRAZO_AGENDAMENTO_HORAS * 60 * 60 * 1000).toISOString()
}

export function agendamentoEncerrado(slot: { bookingDeadline?: string }, agora = Date.now()): boolean {
  return !!slot.bookingDeadline && agora > Date.parse(slot.bookingDeadline)
}

/** "03/11 às 15h" / "03/11 às 15h30", no horário de Brasília. */
export function formatarPrazo(iso: string): string {
  const partes = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso))
  const p = (tipo: string) => partes.find((x) => x.type === tipo)?.value ?? ''
  const minuto = p('minute')
  return `${p('day')}/${p('month')} às ${p('hour')}h${minuto === '00' ? '' : minuto}`
}
