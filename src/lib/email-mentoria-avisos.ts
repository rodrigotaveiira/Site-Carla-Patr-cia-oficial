import { formatarHora } from './formato'

// E-mails sobre a agenda de mentorias em si: horário novo aberto, horário
// alterado e horário cancelado. Separados do envio pra poder ser conferidos
// sem chave do Resend e sem rede — mesmo padrão de email-novo-material.ts.
//
// Os de alteração e cancelamento vão só pra quem já está inscrito; o de
// horário novo vai pra turma inteira. Quem decide isso é notificar-mentoria.ts.

const NAVY = '#0f2d52'
const ROXO = '#6d28d9'
const DOURADO = '#c8a24d'
const VERMELHO = '#b91c1c'
const SITE_URL = 'https://carlapatriciamedina.com'

// Título e descrição vêm do cadastro feito pela professora: escapa antes de
// entrar no HTML.
function escapar(texto: string) {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatarDataLonga(date: string) {
  const [ano, mes, dia] = date.split('-').map(Number)
  const texto = new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function primeiroNomeDe(nome: string) {
  return nome.trim().split(/\s+/)[0] || 'Aluno(a)'
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

function linkDa(emGrupo: boolean) {
  return `${SITE_URL}${emGrupo ? '/mentorias-grupo' : '/mentorias'}`
}

function rotuloDe(emGrupo: boolean) {
  return emGrupo ? 'mentoria em grupo' : 'mentoria individual'
}

/** Horário novo aberto na agenda — vai pra turma inteira, é convite. */
export function montarEmailNovaMentoria(params: {
  nomeAluno: string
  emGrupo: boolean
  data: string
  hora: string
  horaFim?: string
  titulo?: string
  descricao?: string
}) {
  const { nomeAluno, emGrupo, data, hora, horaFim, titulo, descricao } = params
  const primeiroNome = primeiroNomeDe(nomeAluno)
  const dataLonga = formatarDataLonga(data)
  const faixaHoraria = horaFim ? `${formatarHora(hora)} às ${formatarHora(horaFim)}` : formatarHora(hora)
  const link = linkDa(emGrupo)

  const assunto = `Novo horário de ${rotuloDe(emGrupo)}: ${dataLonga.toLowerCase()}, ${faixaHoraria}`

  const html = moldura(
    `<p style="margin:0 0 16px;color:${NAVY};font-size:15px;line-height:1.6;">
       Olá, ${escapar(primeiroNome)}! A Carla abriu um horário novo de
       ${escapar(rotuloDe(emGrupo))} na agenda.
     </p>
     <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#f5f1fc;border-radius:10px;">
       <tr><td style="padding:16px 18px;">
         ${titulo ? `<div style="color:${NAVY};font-size:16px;font-weight:700;">${escapar(titulo)}</div>` : ''}
         <div style="${titulo ? 'margin-top:4px;' : ''}color:${NAVY};font-size:15px;font-weight:700;">${escapar(dataLonga)}, ${escapar(faixaHoraria)}</div>
         ${descricao ? `<div style="margin-top:6px;color:#667085;font-size:13px;line-height:1.5;">${escapar(descricao)}</div>` : ''}
       </td></tr>
     </table>
     <p style="margin:16px 0 0;color:#667085;font-size:13px;line-height:1.6;">
       As vagas são por ordem de chegada — quem entrar primeiro fica com o horário.
     </p>
     <p style="margin:22px 0 0;">
       <a href="${link}" style="display:inline-block;padding:12px 22px;background:${ROXO};color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;">Garantir meu lugar</a>
     </p>`,
    'Horário novo na agenda',
  )

  const texto = `Olá, ${primeiroNome}!\n\n`
    + `A Carla abriu um horário novo de ${rotuloDe(emGrupo)} na agenda:\n`
    + (titulo ? `${titulo}\n` : '')
    + `${dataLonga}, ${faixaHoraria}\n`
    + (descricao ? `${descricao}\n` : '')
    + `\nAs vagas são por ordem de chegada.\n\nAcesse: ${link}`

  return { assunto, html, texto }
}

/**
 * Horário que o aluno já tinha reservado mudou — vai só pra quem está inscrito.
 * Mostra o antes e o depois porque a pessoa já anotou o horário antigo em algum
 * lugar: dizer só o novo deixa ela sem saber o que exatamente mudou.
 */
export function montarEmailMentoriaAlterada(params: {
  nomeAluno: string
  emGrupo: boolean
  data: string
  horaAntes: string
  horaFimAntes?: string
  tituloAntes?: string
  horaDepois: string
  horaFimDepois?: string
  tituloDepois?: string
}) {
  const { nomeAluno, emGrupo, data, horaAntes, horaFimAntes, tituloAntes, horaDepois, horaFimDepois, tituloDepois } = params
  const primeiroNome = primeiroNomeDe(nomeAluno)
  const dataLonga = formatarDataLonga(data)
  const antes = horaFimAntes ? `${formatarHora(horaAntes)} às ${formatarHora(horaFimAntes)}` : formatarHora(horaAntes)
  const depois = horaFimDepois ? `${formatarHora(horaDepois)} às ${formatarHora(horaFimDepois)}` : formatarHora(horaDepois)
  const link = linkDa(emGrupo)

  const assunto = `Mudou o horário da sua ${rotuloDe(emGrupo)} de ${dataLonga.toLowerCase()}`

  const html = moldura(
    `<p style="margin:0 0 16px;color:${NAVY};font-size:15px;line-height:1.6;">
       Olá, ${escapar(primeiroNome)}! A ${escapar(rotuloDe(emGrupo))} em que você está
       inscrito(a) foi alterada. Anote o horário novo:
     </p>
     <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#f5f1fc;border-radius:10px;">
       <tr><td style="padding:16px 18px;">
         <div style="color:#667085;font-size:13px;line-height:1.5;text-decoration:line-through;">
           ${tituloAntes ? `${escapar(tituloAntes)} — ` : ''}${escapar(dataLonga)}, ${escapar(antes)}
         </div>
         <div style="margin-top:8px;color:${NAVY};font-size:16px;font-weight:700;">
           ${tituloDepois ? `${escapar(tituloDepois)} — ` : ''}${escapar(dataLonga)}, ${escapar(depois)}
         </div>
       </td></tr>
     </table>
     <p style="margin:16px 0 0;color:#667085;font-size:13px;line-height:1.6;">
       Sua vaga continua garantida — não precisa se inscrever de novo.
     </p>
     <p style="margin:22px 0 0;">
       <a href="${link}" style="display:inline-block;padding:12px 22px;background:${ROXO};color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;">Ver na plataforma</a>
     </p>`,
    'Mudança no seu horário',
  )

  const texto = `Olá, ${primeiroNome}!\n\n`
    + `A ${rotuloDe(emGrupo)} em que você está inscrito(a) foi alterada.\n\n`
    + `Antes: ${tituloAntes ? `${tituloAntes} — ` : ''}${dataLonga}, ${antes}\n`
    + `Agora: ${tituloDepois ? `${tituloDepois} — ` : ''}${dataLonga}, ${depois}\n\n`
    + `Sua vaga continua garantida — não precisa se inscrever de novo.\n\nAcesse: ${link}`

  return { assunto, html, texto }
}

/** Horário cancelado — vai só pra quem estava inscrito. */
export function montarEmailMentoriaCancelada(params: {
  nomeAluno: string
  emGrupo: boolean
  data: string
  hora: string
  horaFim?: string
  titulo?: string
}) {
  const { nomeAluno, emGrupo, data, hora, horaFim, titulo } = params
  const primeiroNome = primeiroNomeDe(nomeAluno)
  const dataLonga = formatarDataLonga(data)
  const faixaHoraria = horaFim ? `${formatarHora(hora)} às ${formatarHora(horaFim)}` : formatarHora(hora)
  const link = linkDa(emGrupo)

  const assunto = `Cancelada: sua ${rotuloDe(emGrupo)} de ${dataLonga.toLowerCase()}, ${faixaHoraria}`

  const html = moldura(
    `<p style="margin:0 0 16px;color:${NAVY};font-size:15px;line-height:1.6;">
       Olá, ${escapar(primeiroNome)}! A ${escapar(rotuloDe(emGrupo))} em que você estava
       inscrito(a) foi cancelada. Você não precisa comparecer.
     </p>
     <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#fef2f2;border-radius:10px;">
       <tr><td style="padding:16px 18px;color:${VERMELHO};font-size:15px;font-weight:700;text-decoration:line-through;">
         ${titulo ? `${escapar(titulo)} — ` : ''}${escapar(dataLonga)}, ${escapar(faixaHoraria)}
       </td></tr>
     </table>
     <p style="margin:16px 0 0;color:#667085;font-size:13px;line-height:1.6;">
       Sua vaga foi liberada: você já pode escolher outro horário na plataforma.
     </p>
     <p style="margin:22px 0 0;">
       <a href="${link}" style="display:inline-block;padding:12px 22px;background:${ROXO};color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;">Escolher outro horário</a>
     </p>`,
    'Horário cancelado',
  )

  const texto = `Olá, ${primeiroNome}!\n\n`
    + `A ${rotuloDe(emGrupo)} em que você estava inscrito(a) foi cancelada:\n`
    + `${titulo ? `${titulo} — ` : ''}${dataLonga}, ${faixaHoraria}\n\n`
    + `Você não precisa comparecer. Sua vaga foi liberada e você já pode escolher outro horário.\n\n`
    + `Acesse: ${link}`

  return { assunto, html, texto }
}
