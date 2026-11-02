// Prazo pra agendar uma mentoria (individual ou em grupo): a Carla escolhe,
// ao cadastrar o horário, a data e a hora em que o agendamento fecha — do
// mesmo jeito que escolhe a data/hora da aula nos materiais. Depois disso o
// horário sai da lista do aluno, mesmo que ainda esteja livre.
//
// Fica gravado no próprio horário (`bookingDeadline`, um instante ISO).
// Sem prazo (campo vazio, ou horário criado antes dele existir) = aberto até
// a mentoria acontecer.

// Brasília não tem horário de verão desde 2019: o fuso é sempre -03:00.
const FUSO_BRASILIA = '-03:00'

/** Data 'AAAA-MM-DD' + hora 'HH:MM' digitadas no admin (horário de Brasília) → instante ISO. */
export function prazoDeAgendamento(data: string, hora: string): string {
  return new Date(`${data}T${hora}:00${FUSO_BRASILIA}`).toISOString()
}

/** O inverso, pra preencher os campos de data e hora ao editar um horário. */
export function camposDoPrazo(iso: string | undefined): { data: string; hora: string } {
  if (!iso) return { data: '', hora: '' }
  const p = partesEmBrasilia(iso)
  return { data: `${p('year')}-${p('month')}-${p('day')}`, hora: `${p('hour')}:${p('minute')}` }
}

/**
 * Confere o prazo que veio do admin contra a data/hora da mentoria. Devolve o
 * instante ISO, `undefined` sem prazo, ou lança com a mensagem pra Carla.
 */
export function validarPrazoDeAgendamento(params: {
  prazoData?: string
  prazoHora?: string
  dataMentoria: string
  horaMentoria: string
}): string | undefined {
  const { prazoData, prazoHora } = params
  if (!prazoData && !prazoHora) return undefined
  if (!prazoData || !prazoHora) throw new Error('Informe a data e o horário em que o agendamento fecha.')

  const prazo = prazoDeAgendamento(prazoData, prazoHora)
  if (Date.parse(prazo) > Date.parse(prazoDeAgendamento(params.dataMentoria, params.horaMentoria))) {
    throw new Error('O agendamento precisa fechar antes da mentoria começar.')
  }
  return prazo
}

export function agendamentoEncerrado(slot: { bookingDeadline?: string }, agora = Date.now()): boolean {
  return !!slot.bookingDeadline && agora > Date.parse(slot.bookingDeadline)
}

function partesEmBrasilia(iso: string) {
  const partes = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso))
  return (tipo: string) => partes.find((x) => x.type === tipo)?.value ?? ''
}

/** "03/11 às 15h" / "03/11 às 15h30", no horário de Brasília. */
export function formatarPrazo(iso: string): string {
  const p = partesEmBrasilia(iso)
  const minuto = p('minute')
  return `${p('day')}/${p('month')} às ${p('hour')}h${minuto === '00' ? '' : minuto}`
}
