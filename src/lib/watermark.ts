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

// Versão curta da marca (só nome + CPF), usada nas repetições em grade para caber mais
// cópias por página sem virar uma poluição visual de texto longo sobreposto.
function watermarkShortLabel(name: string, cpf: string) {
  return cpf ? `${name} · ${cpf}` : name
}

// Quantas colunas/linhas de marca d'água repetida cobrem cada página.
// Mais linhas e colunas = mais cópias da marca = mais difícil de recortar/escurecer no print.
const TILE_COLUMNS = 3
const TILE_ROWS = 6

// Carimba nome e CPF do aluno em todas as páginas do PDF: uma marca central de destaque,
// uma grade de marcas repetidas cobrindo a página inteira, e uma linha discreta no rodapé.
export async function watermarkPdfDataUrl(dataUrl: string, name: string, cpf: string): Promise<string> {
  const bytes = dataUrlToBuffer(dataUrl)
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false })
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const label = watermarkLabel(name, cpf)
  const shortLabel = watermarkShortLabel(name, cpf)
  const pages = pdfDoc.getPages()

  for (const page of pages) {
    const { width, height } = page.getSize()

    // Grade de marcas repetidas cobrindo a página inteira (a "maior quantidade" pedida).
    for (let row = 0; row < TILE_ROWS; row++) {
      for (let col = 0; col < TILE_COLUMNS; col++) {
        const x = (width / TILE_COLUMNS) * (col + 0.15)
        const y = (height / TILE_ROWS) * (row + 0.4)
        page.drawText(shortLabel, {
          x,
          y,
          size: 10,
          font,
          color: rgb(0.55, 0.55, 0.6),
          opacity: 0.13,
          rotate: degrees(35),
        })
      }
    }

    // Marca central maior, com o texto completo, mais visível que as repetições da grade.
    page.drawText(label, {
      x: width * 0.12,
      y: height * 0.45,
      size: 16,
      font,
      color: rgb(0.55, 0.55, 0.6),
      opacity: 0.3,
      rotate: degrees(35),
    })

    // Linha discreta e legível no rodapé, para identificação rápida sem precisar procurar na página.
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

// Tamanho de página padrão (A4 retrato, em pontos) usado quando o .docx não declara w:pgSz.
const DEFAULT_PAGE_WIDTH_PT = 595.3
const DEFAULT_PAGE_HEIGHT_PT = 841.9

// Lê o tamanho da página (em pontos) a partir do <w:pgSz> do document.xml, se existir.
function getPageSizePt(documentXml: string): { widthPt: number; heightPt: number } {
  const tagMatch = documentXml.match(/<w:pgSz\b[^>]*\/>/)
  if (!tagMatch) return { widthPt: DEFAULT_PAGE_WIDTH_PT, heightPt: DEFAULT_PAGE_HEIGHT_PT }
  const wMatch = tagMatch[0].match(/w:w="(\d+)"/)
  const hMatch = tagMatch[0].match(/w:h="(\d+)"/)
  if (!wMatch || !hMatch) return { widthPt: DEFAULT_PAGE_WIDTH_PT, heightPt: DEFAULT_PAGE_HEIGHT_PT }
  // w:pgSz vem em twips (1/20 de ponto).
  return { widthPt: Number(wMatch[1]) / 20, heightPt: Number(hMatch[1]) / 20 }
}

// Quantas colunas/linhas de marca d'água repetida cobrem cada página do .docx.
const DOCX_TILE_COLUMNS = 2
const DOCX_TILE_ROWS = 4
const DOCX_SHAPE_WIDTH_PT = 260
const DOCX_SHAPE_HEIGHT_PT = 90

// Monta o XML do cabeçalho com uma grade de marcas d'água repetidas (texto girado, translúcido),
// espalhadas pela página inteira — a mesma ideia da grade aplicada nos PDFs.
// Devolve o cabeçalho completo (pra quando o .docx ainda não tem cabeçalho) e também só os
// parágrafos das marcas (pra injetar dentro de um cabeçalho que o aluno já tinha).
function buildWatermarkHeaderXml(shortLabel: string, widthPt: number, heightPt: number): { fullHeaderXml: string; shapesXml: string } {
  const escapedLabel = escapeXml(shortLabel)
  const shapes: string[] = []
  let index = 0
  for (let row = 0; row < DOCX_TILE_ROWS; row++) {
    for (let col = 0; col < DOCX_TILE_COLUMNS; col++) {
      index++
      const centerX = (widthPt / DOCX_TILE_COLUMNS) * (col + 0.5)
      const centerY = (heightPt / DOCX_TILE_ROWS) * (row + 0.5)
      const left = (centerX - DOCX_SHAPE_WIDTH_PT / 2).toFixed(1)
      const top = (centerY - DOCX_SHAPE_HEIGHT_PT / 2).toFixed(1)
      shapes.push(
        `<v:shape id="CpmWatermark${index}" o:spid="_x0000_s${2000 + index}" type="#_x0000_t136" ` +
        `style="position:absolute;left:${left}pt;top:${top}pt;width:${DOCX_SHAPE_WIDTH_PT}pt;` +
        `height:${DOCX_SHAPE_HEIGHT_PT}pt;rotation:315;z-index:${-251654144 + index};` +
        `mso-position-horizontal-relative:page;mso-position-vertical-relative:page" ` +
        `o:allowincell="f" fillcolor="silver" stroked="f">` +
        `<v:fill opacity=".4"/><v:textpath style="font-family:'Calibri';font-size:1pt" string="${escapedLabel}"/>` +
        `</v:shape>`,
      )
    }
  }

  const shapetypeXml =
    `<v:shapetype id="_x0000_t136" coordsize="1600,21600" o:spt="136" adj="10800" ` +
    `path="m@7,0l@8,5400,@5,10800@6,16200@7,21600,@4,16200@3,10800@2,5400xe">` +
    `<v:formulas><v:f eqn="sum #0 0 10800"/><v:f eqn="prod #0 2 1"/><v:f eqn="sum 21600 0 @1"/>` +
    `<v:f eqn="sum 0 0 @2"/><v:f eqn="sum 21600 0 @3"/><v:f eqn="if @0 @3 0"/><v:f eqn="if @0 21600 @1"/>` +
    `<v:f eqn="if @0 0 @2"/><v:f eqn="if @0 @4 21600"/><v:f eqn="mid @5 @6"/><v:f eqn="mid @8 @5"/>` +
    `<v:f eqn="mid @7 @8"/><v:f eqn="mid @6 @7"/><v:f eqn="sum @6 0 @5"/></v:formulas>` +
    `<v:path textpathok="t" o:connecttype="custom" o:connectlocs="@9,0;@10,10800;@11,21600;@12,10800" ` +
    `o:connectangles="270,180,90,0"/><v:textpath on="t" fitshape="t"/>` +
    `<v:handles><v:h position="#0,bottomRight" xrange="0,21600"/></v:handles></v:shapetype>`

  // Cada marca da grade vira seu próprio parágrafo/run/pict — colocar todas dentro de um único
  // <w:pict> faz alguns leitores (ex.: LibreOffice) renderizarem só a última forma da lista.
  const shapesXml = shapes
    .map((shape, i) => `<w:p><w:r><w:pict>${i === 0 ? shapetypeXml : ''}${shape}</w:pict></w:r></w:p>`)
    .join('')

  const fullHeaderXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ` +
    `xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">` +
    `<w:p><w:pPr><w:pStyle w:val="Header"/></w:pPr></w:p>${shapesXml}</w:hdr>`

  return { fullHeaderXml, shapesXml }
}

// Carimba nome e CPF do aluno em todas as páginas de um .docx: uma grade de marcas d'água
// repetidas no cabeçalho (cobrindo a página inteira, girada e translúcida) e uma linha
// legível no rodapé. Se o documento já tiver cabeçalho/rodapé próprio, a marca é adicionada
// dentro deles; caso contrário, um cabeçalho/rodapé novo é criado e vinculado ao documento.
export async function watermarkDocxDataUrl(dataUrl: string, name: string, cpf: string): Promise<string> {
  const buffer = dataUrlToBuffer(dataUrl)
  const zip = await JSZip.loadAsync(buffer)

  const documentPath = 'word/document.xml'
  const documentFile = zip.file(documentPath)
  if (!documentFile) throw new Error('Arquivo Word inválido: word/document.xml não encontrado.')

  let documentXml = await documentFile.async('string')
  const label = escapeXml(watermarkLabel(name, cpf))
  const shortLabel = watermarkShortLabel(name, cpf)
  const watermarkParagraph =
    `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:color w:val="999999"/></w:rPr>` +
    `<w:t xml:space="preserve">${label}</w:t></w:r></w:p>`

  const relsPath = 'word/_rels/document.xml.rels'
  const contentTypesPath = '[Content_Types].xml'

  async function resolvePartPath(rId: string): Promise<string | null> {
    const relsXml = (await zip.file(relsPath)?.async('string')) ?? ''
    const relMatch = relsXml.match(new RegExp(`<Relationship[^>]*Id="${rId}"[^>]*Target="([^"]+)"`))
    if (!relMatch) return null
    return `word/${relMatch[1].replace(/^\/?word\//, '')}`
  }

  // --- Rodapé: uma linha legível com nome, CPF e aviso de uso exclusivo. ---
  const footerRIds = [
    ...documentXml.matchAll(/<w:footerReference[^>]*w:type="default"[^>]*r:id="([^"]+)"/g),
  ].map((m) => m[1])

  if (footerRIds.length > 0) {
    for (const rId of footerRIds) {
      const footerPath = await resolvePartPath(rId)
      if (!footerPath) continue
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

    let contentTypesXml = (await zip.file(contentTypesPath)?.async('string')) ?? ''
    if (contentTypesXml && !contentTypesXml.includes('/word/footer1.xml')) {
      contentTypesXml = contentTypesXml.replace(
        '</Types>',
        '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>',
      )
      zip.file(contentTypesPath, contentTypesXml)
    }

    const newFooterRId = 'rIdWatermarkFooter'
    let relsXml = await zip.file(relsPath)?.async('string')
    const footerRelationshipTag =
      `<Relationship Id="${newFooterRId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>`
    if (relsXml) {
      relsXml = relsXml.replace('</Relationships>', `${footerRelationshipTag}</Relationships>`)
    } else {
      relsXml =
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${footerRelationshipTag}</Relationships>`
    }
    zip.file(relsPath, relsXml)

    const footerRefTag = `<w:footerReference w:type="default" r:id="${newFooterRId}"/>`
    const beforeFooter = documentXml
    documentXml = documentXml.replace(/<w:sectPr(\s[^>]*)?>/g, (match) => `${match}${footerRefTag}`)
    if (documentXml === beforeFooter) {
      // Não encontrou nenhuma seção para vincular o rodapé — devolve o arquivo original sem marca.
      throw new Error('Não foi possível localizar a seção do documento para aplicar o rodapé.')
    }
  }

  // --- Cabeçalho: grade de marcas repetidas cobrindo a página inteira ("maior quantidade"). ---
  const { widthPt, heightPt } = getPageSizePt(documentXml)
  const { fullHeaderXml, shapesXml } = buildWatermarkHeaderXml(shortLabel, widthPt, heightPt)

  const headerRIds = [
    ...documentXml.matchAll(/<w:headerReference[^>]*w:type="default"[^>]*r:id="([^"]+)"/g),
  ].map((m) => m[1])

  if (headerRIds.length > 0) {
    for (const rId of headerRIds) {
      const headerPath = await resolvePartPath(rId)
      if (!headerPath) continue
      const headerFile = zip.file(headerPath)
      if (!headerFile) continue
      const existingHeaderXml = await headerFile.async('string')
      if (existingHeaderXml.includes('CpmWatermark1')) continue // já carimbado
      // Insere a grade de marcas dentro do cabeçalho existente, preservando o conteúdo original.
      const injected = existingHeaderXml.replace('</w:hdr>', `${shapesXml}</w:hdr>`)
      zip.file(headerPath, injected)
    }
  } else {
    zip.file('word/header1.xml', fullHeaderXml)

    let contentTypesXml = (await zip.file(contentTypesPath)?.async('string')) ?? ''
    if (contentTypesXml && !contentTypesXml.includes('/word/header1.xml')) {
      contentTypesXml = contentTypesXml.replace(
        '</Types>',
        '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/></Types>',
      )
      zip.file(contentTypesPath, contentTypesXml)
    }

    const newHeaderRId = 'rIdWatermarkHeader'
    let relsXml = await zip.file(relsPath)?.async('string')
    const headerRelationshipTag =
      `<Relationship Id="${newHeaderRId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>`
    if (relsXml) {
      relsXml = relsXml.replace('</Relationships>', `${headerRelationshipTag}</Relationships>`)
    } else {
      relsXml =
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${headerRelationshipTag}</Relationships>`
    }
    zip.file(relsPath, relsXml)

    const headerRefTag = `<w:headerReference w:type="default" r:id="${newHeaderRId}"/>`
    const beforeHeader = documentXml
    documentXml = documentXml.replace(/<w:sectPr(\s[^>]*)?>/g, (match) => `${match}${headerRefTag}`)
    if (documentXml === beforeHeader) {
      // Não encontrou nenhuma seção para vincular o cabeçalho — segue só com o rodapé já aplicado.
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
