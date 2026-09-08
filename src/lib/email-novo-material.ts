// E-mail disparado quando a professora adiciona um material novo que já
// nasce liberado (sem trava de data de aula futura) — avisa o aluno na caixa
// de entrada, além do aviso que já aparece no sino do dashboard. Separado do
// envio pra poder ser conferido sem chave do Resend e sem rede.

const NAVY = '#0f2d52'
const ROXO = '#6d28d9'
const DOURADO = '#c8a24d'
const SITE_URL = 'https://carlapatriciamedina.com'

// Título e descrição vêm do cadastro do material: escapa antes de entrar no HTML.
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

/** Aviso de material novo, mandado pro aluno assim que a professora libera. */
export function montarEmailNovoMaterial(params: { nomeAluno: string; titulo: string; descricao: string }) {
  const { nomeAluno, titulo, descricao } = params
  const primeiroNome = nomeAluno.trim().split(/\s+/)[0] || 'Aluno(a)'
  const link = `${SITE_URL}/materiais`

  const assunto = `Novo material disponível: ${titulo}`

  const html = moldura(
    `<p style="margin:0 0 16px;color:${NAVY};font-size:15px;line-height:1.6;">
       Olá, ${escapar(primeiroNome)}! A Carla acabou de liberar um material novo pra você.
     </p>
     <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#f5f1fc;border-radius:10px;">
       <tr><td style="padding:16px 18px;">
         <div style="color:${NAVY};font-size:16px;font-weight:700;">${escapar(titulo)}</div>
         ${descricao ? `<div style="margin-top:4px;color:#667085;font-size:13px;line-height:1.5;">${escapar(descricao)}</div>` : ''}
       </td></tr>
     </table>
     <p style="margin:22px 0 0;">
       <a href="${link}" style="display:inline-block;padding:12px 22px;background:${ROXO};color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;">Ver material</a>
     </p>`,
    'Material novo disponível',
  )

  const texto = `Olá, ${primeiroNome}!\n\n`
    + `A Carla acabou de liberar um material novo pra você: ${titulo}\n`
    + (descricao ? `${descricao}\n\n` : '\n')
    + `Acesse: ${link}`

  return { assunto, html, texto }
}
