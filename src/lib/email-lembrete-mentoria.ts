// Monta o e-mail de confirmação de presença. Separado do envio pra poder ser
// conferido sem precisar de chave do Resend nem de rede.

export type CompromissoDoDia = {
  hora: string // 'HH:MM', ou '' quando é do dia inteiro
  titulo: string
  tipo: string
}

const NAVY = '#0f2d52'
const ROXO = '#6d28d9'
const DOURADO = '#c8a24d'

function formatarDataLonga(date: string) {
  const [ano, mes, dia] = date.split('-').map(Number)
  const texto = new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

// Conteúdo vindo do banco entra em HTML de e-mail: escapa pra um título com
// aspas ou "&" não quebrar a marcação.
function escapar(texto: string) {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function montarEmailLembrete(params: {
  nomeAluno: string
  data: string
  hora: string
  duracao: number
  emGrupo: boolean
  compromissos: CompromissoDoDia[]
  linkConfirmacao: string
}) {
  const { nomeAluno, data, hora, duracao, emGrupo, compromissos, linkConfirmacao } = params
  const dataLonga = formatarDataLonga(data)
  const tipoMentoria = emGrupo ? 'mentoria em grupo' : 'encontro individual com a Carla'
  const primeiroNome = nomeAluno.trim().split(/\s+/)[0] || 'Aluno(a)'

  const assunto = `Confirme sua presença — ${emGrupo ? 'mentoria em grupo' : 'encontro individual'} ${dataLonga.toLowerCase()} às ${hora}`

  const outros = compromissos.filter((c) => c.hora !== hora || !c.titulo.includes('mentoria'))

  const linhasOutros = outros
    .map(
      (c) => `
      <tr>
        <td style="padding:6px 0;color:${NAVY};font-size:14px;">
          <strong style="color:${ROXO};">${escapar(c.hora || 'Dia todo')}</strong>
          &nbsp;·&nbsp;${escapar(c.titulo)}
          <span style="color:#667085;">(${escapar(c.tipo)})</span>
        </td>
      </tr>`,
    )
    .join('')

  const blocoOutros = outros.length
    ? `
      <p style="margin:26px 0 8px;color:${NAVY};font-size:15px;font-weight:700;">Também no seu dia</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">${linhasOutros}</table>`
    : ''

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f1fc;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#f5f1fc;">
    <tr><td align="center" style="padding:28px 14px;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;border-collapse:collapse;background:#ffffff;border-radius:14px;overflow:hidden;font-family:Helvetica,Arial,sans-serif;">

        <tr><td style="padding:28px 30px;background:${NAVY};">
          <div style="color:${DOURADO};font-size:11px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;">Carla Patrícia Medina</div>
          <div style="margin-top:8px;color:#ffffff;font-size:21px;font-weight:700;">Confirme sua presença</div>
        </td></tr>

        <tr><td style="padding:28px 30px;">
          <p style="margin:0 0 16px;color:${NAVY};font-size:15px;line-height:1.6;">
            Olá, ${escapar(primeiroNome)}! Você tem um ${tipoMentoria} marcado.
          </p>

          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#f5f1fc;border-radius:10px;">
            <tr><td style="padding:16px 18px;">
              <div style="color:${NAVY};font-size:16px;font-weight:700;">${escapar(dataLonga)}</div>
              <div style="margin-top:4px;color:${ROXO};font-size:15px;font-weight:700;">${escapar(hora)} · ${duracao} minutos</div>
            </td></tr>
          </table>

          ${blocoOutros}

          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 6px;">
            <tr><td style="border-radius:8px;background:${ROXO};">
              <a href="${linkConfirmacao}" style="display:inline-block;padding:13px 26px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Confirmar presença</a>
            </td></tr>
          </table>

          <p style="margin:16px 0 0;color:#667085;font-size:13px;line-height:1.6;">
            Se não puder comparecer, cancele pela plataforma para liberar o horário para outro aluno.
          </p>
        </td></tr>

        <tr><td style="padding:18px 30px;background:#f8f7fb;color:#667085;font-size:12px;line-height:1.6;">
          Você recebeu este e-mail porque marcou uma mentoria na plataforma da Carla Patrícia Medina.
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`

  const texto = [
    `Olá, ${primeiroNome}!`,
    '',
    `Você tem um ${tipoMentoria} marcado.`,
    `${dataLonga} às ${hora} (${duracao} minutos).`,
    ...(outros.length
      ? ['', 'Também no seu dia:', ...outros.map((c) => `- ${c.hora || 'Dia todo'} · ${c.titulo} (${c.tipo})`)]
      : []),
    '',
    'Confirme sua presença:',
    linkConfirmacao,
    '',
    'Se não puder comparecer, cancele pela plataforma para liberar o horário para outro aluno.',
  ].join('\n')

  return { assunto, html, texto }
}
