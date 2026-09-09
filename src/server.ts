import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server'

// Entry do TanStack Start pro SSR — não existia antes (o framework usa um
// handler interno quando este arquivo não existe). Precisou ser criado só
// pra isto: a Netlify NUNCA aplica o `[[headers]]` do netlify.toml a
// respostas de Functions/SSR, só a arquivos estáticos servidos direto do
// backing store (confirmado na documentação da Netlify e ao vivo em
// produção — `curl -I` no robots.txt trazia todos os cabeçalhos, mas em `/`,
// `/login` etc. só sobrava o Strict-Transport-Security e o
// X-Content-Type-Options que a própria Netlify injeta). Então os mesmos
// cabeçalhos do netlify.toml precisam ser setados aqui também — mantenha os
// dois em sincronia se um mudar.
const SECURITY_HEADERS: [string, string][] = [
  ['X-Frame-Options', 'DENY'],
  ['X-Content-Type-Options', 'nosniff'],
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  ['Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()'],
  ['Cross-Origin-Opener-Policy', 'same-origin'],
  [
    'Content-Security-Policy',
    "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; "
      + "img-src 'self' data: blob: https:; font-src 'self' https://fonts.gstatic.com; "
      + "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self' 'unsafe-inline'; "
      + "connect-src 'self'; frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com; "
      + "worker-src 'self' blob:",
  ],
]

const handler = createStartHandler((ctx) => {
  for (const [name, value] of SECURITY_HEADERS) {
    ctx.responseHeaders.set(name, value)
  }
  return defaultStreamHandler(ctx)
})

export default { fetch: handler }
