// E-mail disparado pra Carla quando um aluno envia uma redação — por upload
// de arquivo ou entrega presencial. Mesmo padrão de email-agendamento.ts /
// email-novo-material.ts.

const NAVY = '#0f2d52'

// Nome e título vêm do aluno/cadastro: escapa antes de entrar no HTML.
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
          <div style="color:#c8a24d;font-size:11px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;">Carla Patrícia Medina</div>
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

export function montarEmailNovaRedacao(params: {
  nomeAluno: string
  emailAluno: string
  titulo: string
  deliveryMethod: 'upload' | 'presencial'
}) {
  const { nomeAluno, emailAluno, titulo, deliveryMethod } = params

  const assunto = `Nova redação: ${nomeAluno} — ${titulo}`

  const linhaEntrega = deliveryMethod === 'presencial'
    ? 'Entregue presencialmente em sala — já está na fila de correção, sem arquivo pra baixar.'
    : 'Enviada por upload — o arquivo já está disponível pra correção na plataforma.'

  const html = moldura(
    `<p style="margin:0 0 16px;color:${NAVY};font-size:15px;line-height:1.6;">
       <strong>${escapar(nomeAluno)}</strong> enviou uma redação nova.
     </p>
     <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#f5f1fc;border-radius:10px;">
       <tr><td style="padding:16px 18px;">
         <div style="color:${NAVY};font-size:16px;font-weight:700;">${escapar(titulo)}</div>
         <div style="margin-top:6px;color:#667085;font-size:13px;line-height:1.6;">${linhaEntrega}</div>
       </td></tr>
     </table>
     <p style="margin:18px 0 0;color:#667085;font-size:13px;line-height:1.6;">
       <strong>Aluno:</strong> ${escapar(nomeAluno)}<br>
       <strong>E-mail:</strong> ${escapar(emailAluno)}
     </p>`,
    'Nova redação enviada',
  )

  const texto = [
    `${nomeAluno} enviou uma redação nova: ${titulo}`,
    '',
    linhaEntrega,
    '',
    `Aluno: ${nomeAluno}`,
    `E-mail: ${emailAluno}`,
  ].join('\n')

  return { assunto, html, texto }
}
