// Descreve o aparelho/navegador a partir do user agent, só com pistas (o
// navegador não entrega o modelo exato do celular). Ex.: "iPhone · Safari".
export function describeDevice(): string {
  if (typeof navigator === 'undefined') return 'Desconhecido'
  const ua = navigator.userAgent

  let os = 'Desconhecido'
  if (/iPhone/.test(ua)) os = 'iPhone'
  else if (/iPad/.test(ua)) os = 'iPad'
  else if (/Android/.test(ua)) os = 'Android'
  else if (/Macintosh|Mac OS X/.test(ua)) os = 'Mac'
  else if (/Windows/.test(ua)) os = 'Windows'
  else if (/Linux/.test(ua)) os = 'Linux'

  let browser = 'Navegador'
  if (/Edg\//.test(ua)) browser = 'Edge'
  else if (/OPR\/|Opera/.test(ua)) browser = 'Opera'
  else if (/SamsungBrowser/.test(ua)) browser = 'Samsung Internet'
  else if (/Firefox\//.test(ua)) browser = 'Firefox'
  else if (/CriOS/.test(ua)) browser = 'Chrome'
  else if (/Chrome\//.test(ua)) browser = 'Chrome'
  else if (/Safari\//.test(ua)) browser = 'Safari'

  return `${os} · ${browser}`
}
