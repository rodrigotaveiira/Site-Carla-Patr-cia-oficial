// Quando disparar o lembrete de uma mentoria.
//
// A regra pedida foi "12h antes, salvo ao meio-dia, que aí são 16h". A intenção
// por trás disso é não mandar e-mail de madrugada: 12h antes de uma mentoria ao
// meio-dia cai exatamente à meia-noite.
//
// Só que o mesmo problema pega outros horários — mentoria às 13h dispararia à
// 1h da manhã, às 14h dispararia às 2h. Tratar só o meio-dia deixaria a tarde
// inteira quebrada. Por isso a regra aqui é a forma geral do mesmo pedido:
//
//   envia 12h antes; se isso cair na madrugada, joga pras 20h da véspera.
//
// Pro meio-dia o resultado é idêntico ao pedido original: 20h do dia anterior,
// ou seja 16h de antecedência.
//
// Datas e horas são tratadas como horário local de Brasília, sem conversão de
// fuso — mesma convenção do resto do projeto (ver live-class.ts).

export const HORAS_DE_ANTECEDENCIA = 12

// Janela de silêncio: nada é enviado com hora de início dentro dela.
export const MADRUGADA_INICIO = 22 // 22h inclusive
export const MADRUGADA_FIM = 8 // 8h exclusive

// Pra onde o envio é empurrado quando cairia na madrugada.
export const HORA_ALTERNATIVA = 20

export function parseDataHora(date: string, time: string): Date {
  const [ano, mes, dia] = date.split('-').map(Number)
  const [hora, minuto] = time.split(':').map(Number)
  return new Date(ano, mes - 1, dia, hora, minuto, 0, 0)
}

function estaNaMadrugada(hora: number) {
  return hora >= MADRUGADA_INICIO || hora < MADRUGADA_FIM
}

/**
 * Momento em que o lembrete daquela mentoria deve sair.
 * `date` no formato 'AAAA-MM-DD' e `time` no formato 'HH:MM'.
 */
export function calcularEnvioDoLembrete(date: string, time: string): Date {
  const mentoria = parseDataHora(date, time)

  const envio = new Date(mentoria)
  envio.setHours(envio.getHours() - HORAS_DE_ANTECEDENCIA)

  if (!estaNaMadrugada(envio.getHours())) return envio

  // Cairia na madrugada: joga pras 20h da véspera da mentoria.
  const alternativa = new Date(mentoria)
  alternativa.setDate(alternativa.getDate() - 1)
  alternativa.setHours(HORA_ALTERNATIVA, 0, 0, 0)
  return alternativa
}

/**
 * Se o lembrete dessa mentoria já deveria ter saído no instante `agora`.
 * Mentoria que já passou não gera lembrete — o aluno não tem mais o que confirmar.
 */
export function deveEnviarLembrete(date: string, time: string, agora: Date): boolean {
  const mentoria = parseDataHora(date, time)
  if (mentoria.getTime() <= agora.getTime()) return false
  return agora.getTime() >= calcularEnvioDoLembrete(date, time).getTime()
}
