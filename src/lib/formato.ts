// Horário no formato que se lê em português: 18h30, e 18h quando é hora exata
// (não "18h00"). Os dados continuam gravados como 'HH:MM' — isto é só a forma
// de exibir, então nada muda no banco nem nas comparações de ordenação.
export function formatarHora(hora: string): string {
  if (!hora) return ''

  const [h, m] = hora.split(':')
  if (h === undefined || m === undefined) return hora

  return m === '00' ? `${h}h` : `${h}h${m}`
}
