// Dispara o download de um arquivo que chega do servidor como data: URL
// (materiais, redações, fotos de correção, imagem de conquista).
//
// O Safari (desktop e iOS) não honra de forma confiável o atributo `download`
// de um <a> apontando direto pra uma data: URL clicado fora do DOM — em vez de
// baixar o arquivo com o nome certo, ele às vezes só abre/navega pra dentro da
// própria data URL. Convertendo pra um blob: URL e anexando o link ao body
// antes do clique, o download funciona igual no Chrome e no Safari.
export function downloadDataUrl(fileName: string, dataUrl: string) {
  const blobUrl = dataUrlToBlobUrl(dataUrl)
  const link = document.createElement('a')
  link.download = fileName
  link.href = blobUrl
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // dá um tempo pro navegador iniciar o download antes de liberar a memória
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000)
}

function dataUrlToBlobUrl(dataUrl: string): string {
  const [header, base64] = dataUrl.split(',')
  const mime = /data:(.*?);base64/.exec(header)?.[1] || 'application/octet-stream'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return URL.createObjectURL(new Blob([bytes], { type: mime }))
}
