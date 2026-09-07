// Gera e baixa uma imagem compartilhável (PNG) do selo "Excelência sustentada",
// pra o aluno postar nas redes ou mandar pra família/amigos.

import { downloadDataUrl } from '@/lib/download-file'

const WIDTH = 1080
const HEIGHT = 1080

const NAVY = '#0f2d52'
const NAVY_DARK = '#091e39'
const PURPLE = '#6d28d9'
const GOLD = '#c8a24d'
const MUTED = '#667085'

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, outerR: number, innerR: number) {
  const spikes = 5
  const step = Math.PI / spikes
  ctx.beginPath()
  let rot = -Math.PI / 2
  ctx.moveTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR)
  for (let i = 0; i < spikes; i++) {
    rot += step
    ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR)
    rot += step
    ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR)
  }
  ctx.closePath()
}

export async function downloadAchievementImage(studentName: string, thresholdGrade: number, windowDays: number) {
  if (document.fonts?.ready) {
    try { await document.fonts.ready } catch { /* segue com a fonte padrão do sistema */ }
  }

  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Fundo em degradê, na paleta da marca.
  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT)
  bg.addColorStop(0, NAVY_DARK)
  bg.addColorStop(1, PURPLE)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  // Anéis decorativos sutis, ecoando o anel de progresso do dashboard.
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(WIDTH - 60, 60, 220, 0, Math.PI * 2); ctx.stroke()
  ctx.beginPath(); ctx.arc(60, HEIGHT - 60, 260, 0, Math.PI * 2); ctx.stroke()

  // Card branco central.
  const cardX = 90, cardY = 150, cardW = WIDTH - 180, cardH = HEIGHT - 300
  ctx.save()
  ctx.shadowColor = 'rgba(9, 30, 57, 0.35)'
  ctx.shadowBlur = 60
  ctx.shadowOffsetY = 30
  roundedRect(ctx, cardX, cardY, cardW, cardH, 32)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.restore()
  roundedRect(ctx, cardX, cardY, cardW, cardH, 32)
  ctx.strokeStyle = GOLD
  ctx.lineWidth = 3
  ctx.stroke()

  const centerX = WIDTH / 2

  // Selo dourado com estrela.
  const badgeCy = cardY + 150
  const badgeGrad = ctx.createRadialGradient(centerX, badgeCy, 10, centerX, badgeCy, 90)
  badgeGrad.addColorStop(0, '#f3e2b8')
  badgeGrad.addColorStop(1, GOLD)
  ctx.beginPath()
  ctx.arc(centerX, badgeCy, 88, 0, Math.PI * 2)
  ctx.fillStyle = badgeGrad
  ctx.fill()
  drawStar(ctx, centerX, badgeCy, 46, 20)
  ctx.fillStyle = '#ffffff'
  ctx.fill()

  // Título.
  ctx.fillStyle = NAVY
  ctx.textAlign = 'center'
  ctx.font = '64px "DM Serif Display", Georgia, serif'
  ctx.fillText('Excelência sustentada', centerX, cardY + 320)

  // Subtítulo.
  ctx.fillStyle = MUTED
  ctx.font = '30px Manrope, sans-serif'
  wrapCenteredText(
    ctx,
    `Notas acima de ${thresholdGrade}/40 nos últimos ${windowDays} dias`,
    centerX,
    cardY + 380,
    cardW - 160,
    40,
  )

  // Nome do aluno, em destaque.
  ctx.fillStyle = PURPLE
  ctx.font = '700 46px Manrope, sans-serif'
  ctx.fillText(studentName, centerX, cardY + 500)

  // Linha divisória.
  ctx.strokeStyle = '#ece8f7'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(cardX + 80, cardY + cardH - 130)
  ctx.lineTo(cardX + cardW - 80, cardY + cardH - 130)
  ctx.stroke()

  // Assinatura da marca.
  ctx.fillStyle = NAVY
  ctx.font = '700 30px "DM Serif Display", Georgia, serif'
  ctx.fillText('Carla Patrícia Medina', centerX, cardY + cardH - 75)
  ctx.fillStyle = MUTED
  ctx.font = '24px Manrope, sans-serif'
  ctx.fillText('Redação e Língua Portuguesa', centerX, cardY + cardH - 38)

  const dataUrl = canvas.toDataURL('image/png')
  downloadDataUrl('excelencia-sustentada.png', dataUrl)
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
}
