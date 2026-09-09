// E-mail disparado quando a professora responde um recado do aluno — avisa
// na caixa de entrada, além do aviso que aparece no sino do dashboard.
// Separado do envio pra poder ser conferido sem chave do Resend e sem rede.

const NAVY = '#0f2d52'
const ROXO = '#6d28d9'
const DOURADO = '#c8a24d'
const SITE_URL = 'https://carlapatriciamedina.com'

// Mensagem e resposta vêm do aluno/professora: escapa antes de entrar no HTML.
function escapar(texto: string) {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Preserva quebras de linha da mensagem original dentro do HTML.
function escaparComQuebras(texto: string) {
  return escapar(texto).replace(/\n/g, '<br>')
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

/** Aviso de resposta pronta, mandado pro aluno assim que a professora responde o recado. */
export function montarEmailRecadoRespondido(params: { nomeAluno: string; mensagemOriginal: string; resposta: string }) {
  const { nomeAluno, mensagemOriginal, resposta } = params
  const primeiroNome = nomeAluno.trim().split(/\s+/)[0] || 'Aluno(a)'
  const link = `${SITE_URL}/perfil`

  const assunto = 'A Carla respondeu seu recado'

  const html = moldura(
    `<p style="margin:0 0 16px;color:${NAVY};font-size:15px;line-height:1.6;">
       Olá, ${escapar(primeiroNome)}! A Carla respondeu o recado que você mandou.
     </p>
     <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#f5f1fc;border-radius:10px;">
       <tr><td style="padding:16px 18px;">
         <div style="color:#667085;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">Sua mensagem</div>
         <div style="margin-top:6px;color:${NAVY};font-size:14px;line-height:1.6;">${escaparComQuebras(mensagemOriginal)}</div>
       </td></tr>
     </table>
     <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#f1e9fd;border-radius:10px;margin-top:12px;">
       <tr><td style="padding:16px 18px;">
         <div style="color:${ROXO};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">Resposta da Carla</div>
         <div style="margin-top:6px;color:${NAVY};font-size:14px;line-height:1.6;">${escaparComQuebras(resposta)}</div>
       </td></tr>
     </table>
     <p style="margin:22px 0 0;">
       <a href="${link}" style="display:inline-block;padding:12px 22px;background:${ROXO};color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;">Ver na plataforma</a>
     </p>`,
    'Recado respondido',
  )

  const texto = [
    `Olá, ${primeiroNome}!`,
    '',
    'A Carla respondeu o recado que você mandou.',
    '',
    'Sua mensagem:',
    mensagemOriginal,
    '',
    'Resposta da Carla:',
    resposta,
    '',
    `Acesse a plataforma: ${link}`,
  ].join('\n')

  return { assunto, html, texto }
}
