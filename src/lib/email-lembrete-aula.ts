import { formatarHora } from './formato'

// E-mail de lembrete de aula ao vivo, 30 min antes do horário marcado.
// Separado do envio pra poder ser conferido sem chave do Resend e sem rede —
// mesmo padrão de email-lembrete-simulado.ts.

const NAVY = '#0f2d52'
const ROXO = '#6d28d9'
const DOURADO = '#c8a24d'
const SITE_URL = 'https://carlapatriciamedina.com'

function formatarDataLonga(date: string) {
  const [ano, mes, dia] = date.split('-').map(Number)
  const texto = new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

// Título vem do cadastro do evento: escapa antes de entrar no HTML.
function escapar(texto: string) {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function moldura(conteudo: string, tituloCabecalho: string) {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f1fc;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#f5f1fc;">
    <tr><td align="center" style="padding:28px 14px;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;border-collapse:collapse;background:#ffffff;border-radius:14px;overflow:hidden;font-family:Helvetica,Arial,sans-serif;">
        <tr><td style="padding:28px 30px;background:${NAVY};">
          <div style="color:${DOURADO};font-size:11px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;">Carla Patrícia Medina</div>
          <div style="margin-top:8px;color:#ffffff;font-size:21px;font-weight:700;">${escapar(tituloCabecalho)}</div>
        </td></tr>
        <tr><td style="padding:28px 30px;">${conteudo}</td></tr>
        <tr><td style="padding:18px 30px;background:#f8f7fb;color:#667085;font-size:12px;line-height:1.6;">
          Você recebeu este aviso porque é aluno(a) da plataforma da Carla Patrícia Medina — Redação e Gramática.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

/** Lembrete de aula ao vivo, 30 min antes de começar. */
export function montarEmailLembreteAula(params: {
  nomeAluno: string
  titulo: string
  data: string
  hora: string
  link?: string
  linkConfirmacao: string
}) {
  const { nomeAluno, titulo, data, hora, link, linkConfirmacao } = params
  const primeiroNome = nomeAluno.trim().split(/\s+/)[0] || 'Aluno(a)'
  const dataLonga = formatarDataLonga(data)
  const linkCalendario = `${SITE_URL}/calendario`

  const assunto = `Aula ao vivo em ~30 min: ${titulo}`

  const botaoLink = link
    ? `<a href="${escapar(link)}" style="display:inline-block;margin-right:10px;padding:12px 22px;background:${ROXO};color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;">Entrar na aula</a>`
    : ''

  const html = moldura(
    `<p style="margin:0 0 16px;color:${NAVY};font-size:15px;line-height:1.6;">
       Olá, ${escapar(primeiroNome)}! Sua aula ao vivo começa em cerca de 30 minutos.
     </p>
     <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#f5f1fc;border-radius:10px;">
       <tr><td style="padding:16px 18px;">
         <div style="color:${DOURADO};font-size:11px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;">Aula ao vivo</div>
         <div style="margin-top:6px;color:${NAVY};font-size:16px;font-weight:700;">${escapar(titulo)}</div>
         <div style="margin-top:4px;color:${ROXO};font-size:15px;font-weight:700;">${escapar(dataLonga)} · ${escapar(formatarHora(hora))}</div>
       </td></tr>
     </table>
     <table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 6px;">
       <tr><td style="border-radius:8px;background:${ROXO};">
         <a href="${linkConfirmacao}" style="display:inline-block;padding:13px 26px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Confirmar presença</a>
       </td></tr>
     </table>
     <p style="margin:12px 0 0;">
       ${botaoLink}<a href="${linkCalendario}" style="display:inline-block;padding:12px 22px;background:${link ? '#ffffff' : ROXO};color:${link ? ROXO : '#ffffff'};border:1px solid ${ROXO};font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;">Ver no calendário</a>
     </p>`,
    'Sua aula começa em breve',
  )

  const texto = [
    `Olá, ${primeiroNome}!`,
    '',
    'Sua aula ao vivo começa em cerca de 30 minutos.',
    '',
    `${titulo}`,
    `${dataLonga} às ${formatarHora(hora)}`,
    ...(link ? ['', `Link da aula: ${link}`] : []),
    '',
    `Confirmar presença: ${linkConfirmacao}`,
    `Ver no calendário: ${linkCalendario}`,
  ].join('\n')

  return { assunto, html, texto }
}
