import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib'
import JSZip from 'jszip'

function dataUrlToBuffer(dataUrl: string): Buffer {
  const base64 = dataUrl.split(',')[1] ?? ''
  return Buffer.from(base64, 'base64')
}

function watermarkLabel(name: string, cpf: string) {
  const cpfPart = cpf ? `CPF ${cpf}` : 'CPF não informado'
  return `${name} · ${cpfPart} · Uso exclusivo e intransferível`
}

// Carimba nome e CPF do aluno em todas as páginas do PDF (marca d'água diagonal + rodapé).
export async function watermarkPdfDataUrl(dataUrl: string, name: string, cpf: string): Promise<string> {
  const bytes = dataUrlToBuffer(dataUrl)
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false })
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const label = watermarkLabel(name, cpf)
  const pages = pdfDoc.getPages()

  for (const page of pages) {
    const { width, height } = page.getSize()
    const diagonalSize = 16

    page.drawText(label, {
      x: width * 0.12,
      y: height * 0.45,
      size: diagonalSize,
      font,
      color: rgb(0.55, 0.55, 0.6),
      opacity: 0.28,
      rotate: degrees(35),
    })

    page.drawText(label, {
      x: 18,
      y: 14,
      size: 8,
      font,
      color: rgb(0.4, 0.4, 0.45),
      opacity: 0.85,
    })
  }

  const outBytes = await pdfDoc.save()
  return `data:application/pdf;base64,${Buffer.from(outBytes).toString('base64')}`
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Carimba nome e CPF do aluno no rodapé de todas as páginas de um .docx.
// Se o documento já tiver rodapé próprio, o aviso é adicionado dentro dele;
// caso contrário, um rodapé novo é criado e vinculado a todas as seções do documento.
export async function watermarkDocxDataUrl(dataUrl: string, name: string, cpf: string): Promise<string> {
  const buffer = dataUrlToBuffer(dataUrl)
  const zip = await JSZip.loadAsync(buffer)

  const documentPath = 'word/document.xml'
  const documentFile = zip.file(documentPath)
  if (!documentFile) throw new Error('Arquivo Word inválido: word/document.xml não encontrado.')

  let documentXml = await documentFile.async('string')
  const label = escapeXml(watermarkLabel(name, cpf))
  const watermarkParagraph =
    `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:color w:val="999999"/></w:rPr>` +
    `<w:t xml:space="preserve">${label}</w:t></w:r></w:p>`

  const footerRIds = [
    ...documentXml.matchAll(/<w:footerReference[^>]*w:type="default"[^>]*r:id="([^"]+)"/g),
  ].map((m) => m[1])

  if (footerRIds.length > 0) {
    const relsPath = 'word/_rels/document.xml.rels'
    const relsXml = (await zip.file(relsPath)?.async('string')) ?? ''
    for (const rId of footerRIds) {
      const relMatch = relsXml.match(new RegExp(`<Relationship[^>]*Id="${rId}"[^>]*Target="([^"]+)"`))
      if (!relMatch) continue
      const target = relMatch[1].replace(/^\/?word\//, '')
      const footerPath = `word/${target}`
      const footerFile = zip.file(footerPath)
      if (!footerFile) continue
      const footerXml = await footerFile.async('string')
      if (footerXml.includes(label)) continue // já carimbado
      const injected = footerXml.replace('</w:ftr>', `${watermarkParagraph}</w:ftr>`)
      zip.file(footerPath, injected)
    }
  } else {
    const footerXml =
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
      `<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${watermarkParagraph}</w:ftr>`
    zip.file('word/footer1.xml', footerXml)

    const contentTypesPath = '[Content_Types].xml'
    let contentTypesXml = (await zip.file(contentTypesPath)?.async('string')) ?? ''
    if (contentTypesXml && !contentTypesXml.includes('/word/footer1.xml')) {
      contentTypesXml = contentTypesXml.replace(
        '</Types>',
        '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>',
      )
      zip.file(contentTypesPath, contentTypesXml)
    }

    const relsPath = 'word/_rels/document.xml.rels'
    const newRId = 'rIdWatermarkFooter'
    let relsXml = await zip.file(relsPath)?.async('string')
    const relationshipTag =
      `<Relationship Id="${newRId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>`
    if (relsXml) {
      relsXml = relsXml.replace('</Relationships>', `${relationshipTag}</Relationships>`)
    } else {
      relsXml =
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationshipTag}</Relationships>`
    }
    zip.file(relsPath, relsXml)

    const footerRefTag = `<w:footerReference w:type="default" r:id="${newRId}"/>`
    const before = documentXml
    documentXml = documentXml.replace(/<w:sectPr(\s[^>]*)?>/g, (match) => `${match}${footerRefTag}`)
    if (documentXml === before) {
      // Não encontrou nenhuma seção para vincular o rodapé — devolve o arquivo original sem marca.
      throw new Error('Não foi possível localizar a seção do documento para aplicar o rodapé.')
    }
  }

  zip.file(documentPath, documentXml)

  const outBuffer = await zip.generateAsync({ type: 'nodebuffer' })
  return `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${outBuffer.toString('base64')}`
}

// Aplica a marca d'água de acordo com a extensão do arquivo.
// Se não for possível (extensão não suportada, arquivo corrompido), devolve o arquivo original.
export async function watermarkFileDataUrl(
  dataUrl: string,
  fileName: string,
  name: string,
  cpf: string,
): Promise<string> {
  const extension = fileName.toLowerCase().slice(fileName.lastIndexOf('.'))
  try {
    if (extension === '.pdf') return await watermarkPdfDataUrl(dataUrl, name, cpf)
    if (extension === '.docx') return await watermarkDocxDataUrl(dataUrl, name, cpf)
  } catch {
    // Se a marca d'água falhar por qualquer motivo, o aluno ainda recebe o arquivo original
    // em vez de ficar sem conseguir baixar o material.
  }
  return dataUrl
}
