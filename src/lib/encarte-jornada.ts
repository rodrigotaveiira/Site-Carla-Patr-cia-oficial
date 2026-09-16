// Gera e baixa o encarte (PNG) dos marcos de 15 e 30 dias seguidos de estudo —
// uma lembrança de que o aluno está construindo o próprio sonho, pra guardar
// ou compartilhar. Reusa a mesma paleta que a coleção de conquistas já usa
// pra esses dois marcos (raridade "diamante" nos 15 dias, "lendária" nos 30 —
// ver .raridade-diamante/.raridade-lendaria em styles.css e os ícones
// "subindo"/"louros" no catálogo), então o encarte é a mesma identidade que o
// selo já tem, só ampliada pra uma peça de compartilhar.
//
// Os dois marcos têm composições diferentes de propósito (não é o mesmo
// template recolorido): 15 dias é mais gráfico e direto (fundo escuro, sem
// cartão, número em destaque); 30 dias é mais cerimonial (cartão branco,
// moldura dupla, ramo de louros) — o marco maior pede uma peça com mais peso.

import { downloadDataUrl } from '@/lib/download-file'

const WIDTH = 1080
const HEIGHT = 1080

const NAVY = '#0f2d52'
const NAVY_DARK = '#091e39'
const PURPLE = '#6d28d9'
const GOLD = '#c8a24d'
const MUTED = '#667085'

// Mesmas cores das raridades "diamante" e "lendária" do catálogo de
// conquistas (conquistas-catalogo.ts / styles.css) — ver comentário acima.
const DIAMANTE_CLARO = '#78c8e6'
const DIAMANTE_ESCURO = '#125a78'

async function fontesProntas() {
  if (document.fonts?.ready) {
    try { await document.fonts.ready } catch { /* segue com a fonte padrão do sistema */ }
  }
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function wrapCenteredText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ')
  let line = ''
  let lineY = y
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, lineY)
      line = word
      lineY += lineHeight
    } else {
      line = testLine
    }
  }
  ctx.fillText(line, x, lineY)
  return lineY
}

// Selo com uma seta dupla apontando pra cima — o mesmo gesto do ícone
// "subindo" (TrendingUp) que o catálogo já usa pro marco de 15 dias.
function drawChevronUp(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = size * 0.16
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const offset of [-size * 0.42, 0]) {
    ctx.beginPath()
    ctx.moveTo(cx - size * 0.5, cy + size * 0.32 + offset)
    ctx.lineTo(cx, cy - size * 0.28 + offset)
    ctx.lineTo(cx + size * 0.5, cy + size * 0.32 + offset)
    ctx.stroke()
  }
}

// Contorno facetado de gema, bem discreto, só como textura de fundo — ecoa o
// ícone "diamante" da raridade sem competir com o texto.
function drawGemOutline(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.10)'
  ctx.lineWidth = 3
  const topY = cy - r
  const midY = cy - r * 0.35
  const botY = cy + r * 0.85
  ctx.beginPath()
  ctx.moveTo(cx, topY)
  ctx.lineTo(cx - r * 0.95, midY)
  ctx.lineTo(cx - r * 0.55, botY)
  ctx.lineTo(cx + r * 0.55, botY)
  ctx.lineTo(cx + r * 0.95, midY)
  ctx.closePath()
  ctx.stroke()
  // Facetas internas.
  ctx.beginPath(); ctx.moveTo(cx - r * 0.95, midY); ctx.lineTo(cx, topY + r * 0.05); ctx.lineTo(cx + r * 0.95, midY); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx - r * 0.55, botY); ctx.lineTo(cx, midY + r * 0.1); ctx.lineTo(cx + r * 0.55, botY); ctx.stroke()
  ctx.restore()
}

// Um ramo de louros feito de pequenas folhas (elipses) ao longo de uma curva —
// ecoa o ícone "louros" (Award) que o catálogo já usa pro marco de 30 dias.
// `lado` é -1 (ramo da esquerda) ou 1 (direita), espelhando o desenho.
function drawLaurelBranch(ctx: CanvasRenderingContext2D, cx: number, cy: number, lado: 1 | -1) {
  const folhas = 7
  ctx.save()
  ctx.fillStyle = GOLD
  for (let i = 0; i < folhas; i++) {
    const t = i / (folhas - 1)
    // Leque curto e alto, só emoldurando os lados do número — não pode descer
    // a ponto de esbarrar na legenda "DIAS SEGUIDOS DE ESTUDO" logo abaixo.
    const angulo = -Math.PI * 0.05 + t * Math.PI * 0.4
    const raio = 45 + t * 55
    const x = cx + Math.cos(angulo) * raio * lado
    const y = cy + Math.sin(angulo) * raio
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate((angulo + Math.PI / 2) * lado)
    ctx.beginPath()
    ctx.ellipse(0, 0, 9 + t * 5, 20 + t * 8, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  ctx.restore()
}

function drawSignature(ctx: CanvasRenderingContext2D, centerX: number, y: number, corTitulo: string, corTexto: string) {
  ctx.fillStyle = corTitulo
  ctx.font = '700 30px "DM Serif Display", Georgia, serif'
  ctx.fillText('Carla Patrícia Medina', centerX, y)
  ctx.fillStyle = corTexto
  ctx.font = '24px Manrope, sans-serif'
  ctx.fillText('Redação e Língua Portuguesa', centerX, y + 36)
}

async function desenhar15Dias(ctx: CanvasRenderingContext2D, studentName: string) {
  const centerX = WIDTH / 2

  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT)
  bg.addColorStop(0, NAVY_DARK)
  bg.addColorStop(1, DIAMANTE_ESCURO)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  drawGemOutline(ctx, WIDTH - 190, 210, 230)
  drawGemOutline(ctx, 150, HEIGHT - 150, 140)

  // Selo circular no topo.
  const badgeCy = 260
  const badgeGrad = ctx.createRadialGradient(centerX, badgeCy, 10, centerX, badgeCy, 92)
  badgeGrad.addColorStop(0, DIAMANTE_CLARO)
  badgeGrad.addColorStop(1, DIAMANTE_ESCURO)
  ctx.save()
  ctx.shadowColor = 'rgba(18,90,120,0.55)'
  ctx.shadowBlur = 50
  ctx.shadowOffsetY = 18
  ctx.beginPath()
  ctx.arc(centerX, badgeCy, 90, 0, Math.PI * 2)
  ctx.fillStyle = badgeGrad
  ctx.fill()
  ctx.restore()
  drawChevronUp(ctx, centerX, badgeCy + 8, 62)

  // Número gigante, o gesto central da peça.
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.font = '700 210px "DM Serif Display", Georgia, serif'
  ctx.fillText('15', centerX, 610)

  ctx.fillStyle = DIAMANTE_CLARO
  ctx.font = '700 34px Manrope, sans-serif'
  ctx.fillText('DIAS SEGUIDOS DE ESTUDO', centerX, 660)

  // Mensagem central.
  ctx.fillStyle = '#ffffff'
  ctx.font = '52px "DM Serif Display", Georgia, serif'
  wrapCenteredText(ctx, 'Você está construindo o seu sonho.', centerX, 760, WIDTH - 220, 62)

  ctx.fillStyle = 'rgba(255,255,255,0.72)'
  ctx.font = '26px Manrope, sans-serif'
  wrapCenteredText(ctx, 'Cada dia de estudo é um tijolo a mais nessa construção. Continue firme.', centerX, 850, WIDTH - 320, 36)

  // Nome do aluno.
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(centerX - 220, 910); ctx.lineTo(centerX + 220, 910); ctx.stroke()
  ctx.fillStyle = DIAMANTE_CLARO
  ctx.font = '700 40px Manrope, sans-serif'
  ctx.fillText(studentName, centerX, 962)

  drawSignature(ctx, centerX, 1030, '#ffffff', 'rgba(255,255,255,0.6)')
}

async function desenhar30Dias(ctx: CanvasRenderingContext2D, studentName: string) {
  const centerX = WIDTH / 2

  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT)
  bg.addColorStop(0, NAVY_DARK)
  bg.addColorStop(0.55, PURPLE)
  bg.addColorStop(1, '#7a5a16')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  // Cartão cerimonial, com moldura dupla — o marco maior pede mais peso que
  // o traço único do encarte de 15 dias e do selo de excelência.
  const cardX = 80, cardY = 130, cardW = WIDTH - 160, cardH = HEIGHT - 260
  ctx.save()
  ctx.shadowColor = 'rgba(9, 30, 57, 0.4)'
  ctx.shadowBlur = 70
  ctx.shadowOffsetY = 34
  roundedRect(ctx, cardX, cardY, cardW, cardH, 28)
  ctx.fillStyle = '#fffdf7'
  ctx.fill()
  ctx.restore()
  roundedRect(ctx, cardX, cardY, cardW, cardH, 28)
  ctx.strokeStyle = GOLD
  ctx.lineWidth = 3
  ctx.stroke()
  roundedRect(ctx, cardX + 14, cardY + 14, cardW - 28, cardH - 28, 20)
  ctx.strokeStyle = 'rgba(200,162,77,0.45)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Layout sequencial (cada bloco parte de onde o anterior terminou) — evita
  // números de posição chutados que furam por baixo do cartão quando o texto
  // quebra em mais ou menos linhas do que o previsto.
  let y = cardY + 175

  // Ramo de louros emoldurando o número, ecoando o ícone do marco no catálogo.
  drawLaurelBranch(ctx, centerX - 55, y, -1)
  drawLaurelBranch(ctx, centerX + 55, y, 1)

  ctx.fillStyle = NAVY
  ctx.textAlign = 'center'
  ctx.font = '700 150px "DM Serif Display", Georgia, serif'
  ctx.fillText('30', centerX, y + 55)
  y += 55 + 75

  ctx.fillStyle = '#96731f'
  ctx.font = '700 30px Manrope, sans-serif'
  ctx.fillText('DIAS SEGUIDOS DE ESTUDO', centerX, y)
  y += 85

  ctx.fillStyle = NAVY
  ctx.font = '46px "DM Serif Display", Georgia, serif'
  y = wrapCenteredText(ctx, 'Um mês inteiro construindo o sonho.', centerX, y, cardW - 60, 54)
  y += 55

  ctx.fillStyle = MUTED
  ctx.font = '26px Manrope, sans-serif'
  y = wrapCenteredText(ctx, 'Disciplina que já virou rotina. É isso que separa quem chega até o fim.', centerX, y, cardW - 260, 36)
  y += 55

  // Linha de "certificado", com o nome do aluno.
  ctx.strokeStyle = '#ece8f7'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(cardX + 100, y)
  ctx.lineTo(cardX + cardW - 100, y)
  ctx.stroke()
  y += 50

  ctx.fillStyle = MUTED
  ctx.font = '22px Manrope, sans-serif'
  ctx.fillText('ESTE MARCO PERTENCE A', centerX, y)
  y += 50

  ctx.fillStyle = PURPLE
  ctx.font = '700 46px Manrope, sans-serif'
  ctx.fillText(studentName, centerX, y)
  y += 65

  drawSignature(ctx, centerX, y, NAVY, MUTED)
}

export async function downloadJornadaEncarte(studentName: string, dias: 15 | 30) {
  await fontesProntas()

  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  if (dias === 15) await desenhar15Dias(ctx, studentName)
  else await desenhar30Dias(ctx, studentName)

  const dataUrl = canvas.toDataURL('image/png')
  downloadDataUrl(`jornada-${dias}-dias.png`, dataUrl)
}
