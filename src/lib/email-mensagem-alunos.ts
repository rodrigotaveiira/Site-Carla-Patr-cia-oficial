// E-mail livre da professora pra turma: diferente dos avisos automáticos (nova
// mentoria, novo material...), aqui o assunto e o corpo são escritos por ela na
// hora — o caso de uso original é lembrar da importância de fazer os
// exercícios e as redações, mas o texto é livre pra qualquer recado.
//
// Separado do envio pra poder ser conferido sem chave do Resend e sem rede —
// mesmo padrão de email-convite-mentorias.ts.

const NAVY = '#0f2d52'
const DOURADO = '#c8a24d'

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

export function montarEmailMensagemAlunos(params: {
  nomeAluno: string
  assunto: string
  mensagem: string
}) {
  const { nomeAluno, assunto, mensagem } = params
  const primeiroNome = nomeAluno.trim().split(/\s+/)[0] || 'Aluno(a)'

  const html = moldura(
    `<p style="margin:0 0 16px;color:${NAVY};font-size:15px;line-height:1.6;">
       Olá, ${escapar(primeiroNome)}!
     </p>
     <p style="margin:0;color:${NAVY};font-size:15px;line-height:1.7;">
       ${escapar(mensagem).replace(/\n/g, '<br>')}
     </p>`,
    assunto,
  )

  const texto = `Olá, ${primeiroNome}!\n\n${mensagem}`

  return { assunto, html, texto }
}
