import { formatarHora } from './formato'

// E-mail que chama a turma pra reservar vaga nas mentorias em grupo que ainda
// têm lugar. Diferente dos avisos de `email-mentoria-avisos.ts`, que falam de
// UM horário (criado, alterado ou cancelado), este junta vários numa lista só:
// é o "olha o que está aberto" que a professora dispara quando quer.
//
// Separado do envio pra poder ser conferido sem chave do Resend e sem rede —
// mesmo padrão de email-novo-material.ts.

const NAVY = '#0f2d52'
const ROXO = '#6d28d9'
const DOURADO = '#c8a24d'
const SITE_URL = 'https://carlapatriciamedina.com'

export type GrupoComVaga = {
  date: string // 'AAAA-MM-DD'
  time: string // 'HH:MM'
  endTime: string // 'HH:MM'
  titulo: string
  capacidade: number
  vagas: number
}

// Título vem do cadastro e a mensagem é digitada pela professora: escapa os
// dois antes de entrar no HTML.
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

/** "1 vaga" / "3 vagas" — o singular aparece justamente na hora mais decisiva. */
function contarVagas(vagas: number) {
  return vagas === 1 ? '1 vaga' : `${vagas} vagas`
}

/** "grupo de 5 pessoas" — é assim que a professora e os alunos se referem a eles. */
function tamanhoDoGrupo(capacidade: number) {
  return `grupo de ${capacidade} pessoa${capacidade === 1 ? '' : 's'}`
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

/**
 * Monta o convite. `grupos` já vem filtrado e ordenado por quem chama — aqui
 * só é desenhado.
 */
export function montarEmailConviteMentorias(params: {
  nomeAluno: string
  mensagem: string
  grupos: GrupoComVaga[]
}) {
  const { nomeAluno, mensagem, grupos } = params
  const primeiroNome = nomeAluno.trim().split(/\s+/)[0] || 'Aluno(a)'
  const link = `${SITE_URL}/mentorias-grupo`

  const assunto =
    grupos.length === 1
      ? `Ainda há ${contarVagas(grupos[0].vagas)} na mentoria em grupo`
      : `Vagas abertas em ${grupos.length} mentorias em grupo`

  const linhas = grupos
    .map(
      (grupo) => `
       <tr><td style="padding:14px 18px;border-bottom:1px solid #e8e4f4;">
         <div style="color:${NAVY};font-size:15px;font-weight:700;">${escapar(grupo.titulo)}</div>
         <div style="margin-top:3px;color:${NAVY};font-size:14px;">
           ${escapar(formatarDataLonga(grupo.date))}, ${escapar(formatarHora(grupo.time))} às ${escapar(formatarHora(grupo.endTime))}
         </div>
         <div style="margin-top:4px;color:${ROXO};font-size:13px;font-weight:700;">
           ${escapar(contarVagas(grupo.vagas))} — ${escapar(tamanhoDoGrupo(grupo.capacidade))}
         </div>
       </td></tr>`,
    )
    .join('')

  const html = moldura(
    `<p style="margin:0 0 16px;color:${NAVY};font-size:15px;line-height:1.6;">
       Olá, ${escapar(primeiroNome)}!
     </p>
     ${mensagem
       ? `<p style="margin:0 0 20px;color:${NAVY};font-size:15px;line-height:1.6;">${escapar(mensagem).replace(/\n/g, '<br>')}</p>`
       : ''}
     <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#f5f1fc;border-radius:10px;overflow:hidden;">
       ${linhas}
     </table>
     <p style="margin:16px 0 0;color:#667085;font-size:13px;line-height:1.6;">
       As vagas são por ordem de chegada — quem reservar primeiro fica com o lugar.
     </p>
     <p style="margin:22px 0 0;">
       <a href="${link}" style="display:inline-block;padding:12px 22px;background:${ROXO};color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;">Reservar minha vaga</a>
     </p>`,
    grupos.length === 1 ? 'Ainda dá tempo de reservar' : 'Vagas abertas nas mentorias',
  )

  const listaTexto = grupos
    .map(
      (grupo) =>
        `- ${grupo.titulo}\n  ${formatarDataLonga(grupo.date)}, ${formatarHora(grupo.time)} às ${formatarHora(grupo.endTime)}\n  ${contarVagas(grupo.vagas)} — ${tamanhoDoGrupo(grupo.capacidade)}`,
    )
    .join('\n')

  const texto = `Olá, ${primeiroNome}!\n\n`
    + (mensagem ? `${mensagem}\n\n` : '')
    + `${listaTexto}\n\n`
    + `As vagas são por ordem de chegada — quem reservar primeiro fica com o lugar.\n\n`
    + `Reserve em: ${link}`

  return { assunto, html, texto }
}

/**
 * Versão curta do mesmo convite, pro sininho do dashboard. O sino não é lugar
 * de lista comprida: diz quantas vagas há e manda pra tela que tem o resto.
 */
export function montarLembreteConviteMentorias(params: { mensagem: string; grupos: GrupoComVaga[] }): string {
  const { mensagem, grupos } = params
  const totalVagas = grupos.reduce((soma, grupo) => soma + grupo.vagas, 0)

  const resumo =
    grupos.length === 1
      ? `Ainda há ${contarVagas(grupos[0].vagas)} na mentoria em grupo de ${formatarDataLonga(grupos[0].date).toLowerCase()}, ${formatarHora(grupos[0].time)}.`
      : `Há ${contarVagas(totalVagas)} abertas em ${grupos.length} mentorias em grupo.`

  return mensagem
    ? `${mensagem}\n\n${resumo} Reserve a sua em Mentorias em grupo.`
    : `${resumo} Reserve a sua em Mentorias em grupo.`
}
