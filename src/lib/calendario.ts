import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { z } from 'zod'
import { getServerUser } from './auth'
import { userHasRole, isStaff, getStudentIdentity } from './roles'
import { STORES } from './blob-stores'
import { watermarkPdfDataUrl } from './watermark'
import { validateUpload } from './upload-validation'
import { boundedText, dataUrl as dataUrlSchema, fileName as fileNameSchema, id as idSchema, isoDate, optionalHhmm, optionalIsoDate } from './schemas'
import { instanteInicioDoDiaSimulado, instanteInicioSimulado } from './lembrete-simulado-horario'

const MAX_FILE_DATA_URL_LENGTH = 16_000_000
const MAX_PDF_BYTES = 12 * 1024 * 1024

// A correção de um simulado é uma "sub-agenda" dentro do próprio evento: pode
// cair em outro dia, tem seu próprio horário, link (Zoom) e descrição, e gera
// os mesmos lembretes que o simulado. Só simulado/simuladão têm correção.
const correctionInput = z.object({
  date: optionalIsoDate,
  time: optionalHhmm,
  endTime: optionalHhmm,
  link: z.string().trim().max(2000),
  description: z.string().trim().max(2000),
})

// PDF anexado a um simulado. Ausente (undefined) = manter o que já está;
// null = remover; objeto = trocar pelo enviado.
const pdfUploadInput = z
  .object({ fileName: fileNameSchema, fileDataUrl: dataUrlSchema(MAX_FILE_DATA_URL_LENGTH) })
  .nullish()

const calendarEventInput = z.object({
  date: isoDate,
  time: optionalHhmm,
  endTime: optionalHhmm,
  type: z.string().trim().min(1).max(50),
  title: boundedText(300),
  link: z.string().trim().max(2000),
  correction: correctionInput.nullable(),
  prova: pdfUploadInput,
  gabarito: pdfUploadInput,
})

type PdfUpload = z.infer<typeof pdfUploadInput>
type SimuladoFileKind = 'prova' | 'gabarito'

// Eventos da agenda ficam num store próprio em vez de virarem campo de data
// dentro de Lesson e Simulado. Aula gravada e simulado são *conteúdo*: ficam
// disponíveis pro aluno quando ele quiser, e não deixam de existir quando a
// data passa. O que tem data é o aviso ("dia 14 tem Simuladão"), não o conteúdo.
export const CALENDAR_EVENT_TYPES = ['aula-ao-vivo', 'aula', 'simulado', 'simuladao', 'outro'] as const

export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number]

export const CALENDAR_EVENT_LABELS: Record<CalendarEventType, string> = {
  'aula-ao-vivo': 'Aula ao vivo',
  aula: 'Aula liberada',
  simulado: 'Simulado',
  simuladao: 'Simuladão',
  outro: 'Outro',
}

// Correção do simulado, quando cadastrada. Campos de data/hora seguem o mesmo
// formato do evento; '' quando não informado.
export type CalendarCorrection = {
  date: string // 'AAAA-MM-DD'
  time: string // 'HH:MM' — início
  endTime: string // 'HH:MM' — término
  link: string
  description: string
}

export type CalendarEvent = {
  id: string
  date: string // formato 'AAAA-MM-DD'
  time: string // formato 'HH:MM', ou '' quando o evento não tem hora marcada
  endTime: string // 'HH:MM' de término, ou '' — só simulado/simuladão usam
  type: CalendarEventType
  title: string
  link: string // opcional: Zoom da aula ao vivo, material de apoio, etc.
  correction: CalendarCorrection | null // só simulado/simuladão
  provaFileName: string // '' quando não tem PDF de prova anexado — só simulado/simuladão
  gabaritoFileName: string // '' quando não tem PDF de gabarito comentado — só simulado/simuladão
  createdAt: string
}

function isSimuladoType(type: string) {
  return type === 'simulado' || type === 'simuladao'
}

function simuladoArquivosStore() {
  return getStore({ name: STORES.simuladoArquivos, consistency: 'strong' })
}

function arquivoKey(eventId: string, kind: SimuladoFileKind) {
  return `${eventId}__${kind}`
}

// Aplica a intenção do formulário pra um PDF (manter / remover / trocar) e
// devolve o nome de arquivo que deve ficar gravado no evento.
async function applySimuladoFile(
  eventId: string,
  kind: SimuladoFileKind,
  input: PdfUpload,
  currentFileName: string,
): Promise<string> {
  if (input === undefined) return currentFileName // manter
  const store = simuladoArquivosStore()
  const key = arquivoKey(eventId, kind)
  if (input === null) {
    await store.delete(key)
    return ''
  }
  validateUpload({
    dataUrl: input.fileDataUrl,
    fileName: input.fileName,
    allowed: ['pdf'],
    maxDecodedBytes: MAX_PDF_BYTES,
  })
  await store.setJSON(key, { fileName: input.fileName, fileDataUrl: input.fileDataUrl })
  return input.fileName
}

// Instante (epoch ms) a partir do qual o aluno pode baixar prova/gabarito:
// o horário do simulado, ou a meia-noite do dia quando não tem horário.
function liberacaoArquivosMs(event: Pick<CalendarEvent, 'date' | 'time'>): number {
  return event.time ? instanteInicioSimulado(event.date, event.time) : instanteInicioDoDiaSimulado(event.date)
}

// Normaliza os campos de simulado: fim da prova e correção só valem pra
// simulado/simuladão, e a correção só "existe" quando tem data.
function normalizeSimuladoFields(input: z.infer<typeof calendarEventInput>) {
  if (!isSimuladoType(input.type)) {
    return { endTime: '', correction: null }
  }
  const correction: CalendarCorrection | null =
    input.correction && input.correction.date
      ? {
          date: input.correction.date,
          time: input.correction.time,
          endTime: input.correction.endTime,
          link: input.correction.link,
          description: input.correction.description,
        }
      : null
  return { endTime: input.endTime, correction }
}

function eventsStore() {
  return getStore({ name: STORES.eventosCalendario, consistency: 'strong' })
}

function isValidType(value: unknown): value is CalendarEventType {
  return CALENDAR_EVENT_TYPES.includes(value as CalendarEventType)
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// Precisa de login e conta aprovada: a agenda revela o planejamento do curso
// (quando tem aula ao vivo, quando cai simulado), que é conteúdo de quem pagou.
// Esta função fica exposta como endpoint independente da tela, então a checagem
// tem que estar aqui e não só no `beforeLoad` da rota.
export const listCalendarEvents = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getServerUser()
  if (!user || (!userHasRole(user, 'aprovado') && !userHasRole(user, 'admin'))) {
    throw new Error('Acesso negado.')
  }

  const store = eventsStore()
  const { blobs } = await store.list()
  const events: CalendarEvent[] = []

  for (const blob of blobs) {
    const value = await store.get(blob.key, { type: 'json' })
    // Eventos antigos não têm os campos novos — completa o formato pra que a
    // tela não precise checar `undefined` em todo lugar.
    if (value) {
      const raw = value as Partial<CalendarEvent>
      events.push({ endTime: '', correction: null, provaFileName: '', gabaritoFileName: '', ...raw } as CalendarEvent)
    }
  }

  events.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  return events
})

export const createCalendarEvent = createServerFn({ method: 'POST' })
  .validator(calendarEventInput)
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')

    if (!isValidType(data.type)) throw new Error('Tipo de evento inválido.')

    const { endTime, correction } = normalizeSimuladoFields(data)
    const id = makeId()
    const isSimulado = isSimuladoType(data.type)
    const provaFileName = isSimulado ? await applySimuladoFile(id, 'prova', data.prova, '') : ''
    const gabaritoFileName = isSimulado ? await applySimuladoFile(id, 'gabarito', data.gabarito, '') : ''

    const event: CalendarEvent = {
      id,
      date: data.date,
      time: data.time,
      endTime,
      type: data.type,
      title: data.title,
      link: data.link,
      correction,
      provaFileName,
      gabaritoFileName,
      createdAt: new Date().toISOString(),
    }

    await eventsStore().setJSON(event.id, event)
    return event
  })

export const updateCalendarEvent = createServerFn({ method: 'POST' })
  .validator(calendarEventInput.extend({ id: idSchema }))
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')

    if (!isValidType(data.type)) throw new Error('Tipo de evento inválido.')

    const store = eventsStore()
    const existing = (await store.get(data.id, { type: 'json' })) as CalendarEvent | null
    if (!existing) throw new Error('Esse evento não existe mais. Atualize a página.')

    const { endTime, correction } = normalizeSimuladoFields(data)
    const isSimulado = isSimuladoType(data.type)

    let provaFileName = ''
    let gabaritoFileName = ''
    if (isSimulado) {
      provaFileName = await applySimuladoFile(data.id, 'prova', data.prova, existing.provaFileName ?? '')
      gabaritoFileName = await applySimuladoFile(data.id, 'gabarito', data.gabarito, existing.gabaritoFileName ?? '')
    } else {
      // Deixou de ser simulado: os PDFs anexados não fazem mais sentido.
      await simuladoArquivosStore().delete(arquivoKey(data.id, 'prova'))
      await simuladoArquivosStore().delete(arquivoKey(data.id, 'gabarito'))
    }

    const updated: CalendarEvent = {
      ...existing,
      date: data.date,
      time: data.time,
      endTime,
      type: data.type,
      title: data.title,
      link: data.link,
      correction,
      provaFileName,
      gabaritoFileName,
    }

    await store.setJSON(data.id, updated)
    return updated
  })

export const deleteCalendarEvent = createServerFn({ method: 'POST' })
  .validator(z.object({ id: idSchema }))
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')

    await eventsStore().delete(data.id)
    // Limpa os PDFs anexados (prova e gabarito), se houver.
    const arquivos = simuladoArquivosStore()
    await arquivos.delete(arquivoKey(data.id, 'prova'))
    await arquivos.delete(arquivoKey(data.id, 'gabarito'))
    return { ok: true }
  })

// Download da prova ou do gabarito comentado de um simulado. Precisa de conta
// aprovada; o aluno só baixa a partir do horário do simulado (a equipe baixa
// sempre, pra conferir). O arquivo sai com marca d'água de nome + CPF.
async function baixarArquivoSimulado(eventId: string, kind: SimuladoFileKind) {
  const user = await getServerUser()
  if (!user || (!userHasRole(user, 'aprovado') && !userHasRole(user, 'admin'))) {
    throw new Error('Acesso negado.')
  }

  const event = (await eventsStore().get(eventId, { type: 'json' })) as CalendarEvent | null
  if (!event) throw new Error('Simulado não encontrado.')

  if (!isStaff(user) && Date.now() < liberacaoArquivosMs(event)) {
    throw new Error('Disponível a partir do horário do simulado.')
  }

  const rec = (await simuladoArquivosStore().get(arquivoKey(eventId, kind), { type: 'json' })) as
    | { fileName: string; fileDataUrl: string }
    | null
  if (!rec) throw new Error('Arquivo não encontrado.')

  const { name, cpf } = getStudentIdentity(user)
  let watermarked = rec.fileDataUrl
  try {
    watermarked = await watermarkPdfDataUrl(rec.fileDataUrl, name, cpf)
  } catch {
    // se a marca d'água falhar, o aluno ainda recebe o arquivo original
  }
  return { fileName: rec.fileName, fileDataUrl: watermarked }
}

export const getSimuladoProvaFile = createServerFn({ method: 'GET' })
  .validator(z.object({ id: idSchema }))
  .handler(async ({ data }) => baixarArquivoSimulado(data.id, 'prova'))

export const getSimuladoGabaritoFile = createServerFn({ method: 'GET' })
  .validator(z.object({ id: idSchema }))
  .handler(async ({ data }) => baixarArquivoSimulado(data.id, 'gabarito'))
