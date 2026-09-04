import { formatarHora } from './formato'

// E-mails disparados na hora em que o aluno marca uma mentoria: um pro aluno,
// confirmando, e um pra Carla, avisando. Separado do envio pra poder ser
// conferido sem chave do Resend e sem rede.
//
// O lembrete de 12h antes é outro e-mail, em email-lembrete-mentoria.ts.

const NAVY = '#0f2d52'
const ROXO = '#6d28d9'
const DOURADO = '#c8a24d'

function formatarDataLonga(date: string) {
  const [ano, mes, dia] = date.split('-').map(Number)
  const texto = new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

// Nome e título vêm do cadastro do aluno e do banco: escapa antes de entrar no HTML.
function escapar(texto: string) {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function moldura(conteudo: string, titulo: string) {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f1fc;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#f5f1fc;">
    <tr><td align="center" style="padding:28px 14px;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;border-collapse:collapse;background:#ffffff;border-radius:14px;overflow:hidden;font-family:Helvetica,Arial,sans-serif;">
        <tr><td style="padding:28px 30px;background:${NAVY};">
          <div style="color:${DOURADO};font-size:11px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;">Carla Patrícia Medina</div>
          <div style="margin-top:8px;color:#ffffff;font-size:21px;font-weight:700;">${escapar(titulo)}</div>
        </td></tr>
        <tr><td style="padding:28px 30px;">${conteudo}</td></tr>
        <tr><td style="padding:18px 30px;background:#f8f7fb;color:#667085;font-size:12px;line-height:1.6;">
          Plataforma da Carla Patrícia Medina — Redação e Gramática.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function caixaHorario(dataLonga: string, hora: string, duracao: number) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#f5f1fc;border-radius:10px;">
    <tr><td style="padding:16px 18px;">
      <div style="color:${NAVY};font-size:16px;font-weight:700;">${escapar(dataLonga)}</div>
      <div style="margin-top:4px;color:${ROXO};font-size:15px;font-weight:700;">${escapar(formatarHora(hora))} · ${duracao} minutos</div>
    </td></tr>
  </table>`
}

/** Confirmação que vai pro aluno assim que ele marca. */
export function montarEmailAgendamentoAluno(params: {
  nomeAluno: string
  data: string
  hora: string
  duracao: number
  emGrupo: boolean
}) {
  const { nomeAluno, data, hora, duracao, emGrupo } = params
  const dataLonga = formatarDataLonga(data)
  const primeiroNome = nomeAluno.trim().split(/\s+/)[0] || 'Aluno(a)'
  const tipo = emGrupo ? 'sua mentoria em grupo' : 'sua mentoria individual com a Carla'

  const assunto = `Agendamento confirmado — ${emGrupo ? 'mentoria em grupo' : 'mentoria individual'} em ${dataLonga.toLowerCase()}`

  const html = moldura(
    `<p style="margin:0 0 16px;color:${NAVY};font-size:15px;line-height:1.6;">
       Olá, ${escapar(primeiroNome)}! Está marcada — ${tipo} ficou assim:
     </p>
     ${caixaHorario(dataLonga, hora, duracao)}
     <p style="margin:20px 0 0;color:${NAVY};font-size:15px;line-height:1.6;">
       Você vai receber outro e-mail pedindo pra confirmar presença, um pouco antes do encontro.
     </p>
     <p style="margin:14px 0 0;color:#667085;font-size:13px;line-height:1.6;">
       Se algo mudar, cancele pela plataforma para liberar o horário para outro aluno.
     </p>`,
    'Agendamento confirmado',
  )

  const texto = [
    `Olá, ${primeiroNome}!`,
    '',
    `Está marcada — ${tipo} ficou assim:`,
    `${dataLonga} às ${formatarHora(hora)} (${duracao} minutos).`,
    '',
    'Você vai receber outro e-mail pedindo pra confirmar presença, um pouco antes do encontro.',
    'Se algo mudar, cancele pela plataforma para liberar o horário para outro aluno.',
  ].join('\n')

  return { assunto, html, texto }
}

/** Aviso que vai pra Carla quando um aluno marca. */
export function montarEmailAgendamentoProfessora(params: {
  nomeAluno: string
  emailAluno: string
  data: string
  hora: string
  duracao: number
  emGrupo: boolean
  ocupacaoGrupo?: { inscritos: number; capacidade: number }
}) {
  const { nomeAluno, emailAluno, data, hora, duracao, emGrupo, ocupacaoGrupo } = params
  const dataLonga = formatarDataLonga(data)
  const tipo = emGrupo ? 'Mentoria em grupo' : 'Mentoria individual'

  const assunto = `Novo agendamento: ${nomeAluno} — ${dataLonga.toLowerCase()} às ${formatarHora(hora)}`

  const linhaGrupo = ocupacaoGrupo
    ? `<p style="margin:14px 0 0;color:${NAVY};font-size:14px;">
         Grupo com <strong>${ocupacaoGrupo.inscritos} de ${ocupacaoGrupo.capacidade}</strong> vagas ocupadas.
       </p>`
    : ''

  const html = moldura(
    `<p style="margin:0 0 16px;color:${NAVY};font-size:15px;line-height:1.6;">
       <strong>${escapar(nomeAluno)}</strong> acabou de marcar um horário.
     </p>
     ${caixaHorario(dataLonga, hora, duracao)}
     <p style="margin:18px 0 0;color:${NAVY};font-size:14px;line-height:1.7;">
       <strong>Tipo:</strong> ${escapar(tipo)}<br>
       <strong>Aluno:</strong> ${escapar(nomeAluno)}<br>
       <strong>E-mail:</strong> ${escapar(emailAluno)}
     </p>
     ${linhaGrupo}`,
    'Novo agendamento',
  )

  const texto = [
    `${nomeAluno} acabou de marcar um horário.`,
    '',
    `${dataLonga} às ${formatarHora(hora)} (${duracao} minutos).`,
    `Tipo: ${tipo}`,
    `Aluno: ${nomeAluno}`,
    `E-mail: ${emailAluno}`,
    ...(ocupacaoGrupo ? [`Grupo com ${ocupacaoGrupo.inscritos} de ${ocupacaoGrupo.capacidade} vagas ocupadas.`] : []),
  ].join('\n')

  return { assunto, html, texto }
}
