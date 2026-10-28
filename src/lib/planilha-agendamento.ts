import { formatarHora } from './formato'

// Atualiza a planilha de mentoria em grupo quando um aluno agenda ou
// cancela: acha a linha da sessão certa (por data + horário) e junta ou
// tira o nome do aluno da coluna de inscritos, sem nunca criar ou apagar
// linha. As linhas são pré-cadastradas manualmente pela Carla (Grupo 1,
// Grupo 2, ..., Grupão 1, Grupão 2), então uma sessão sem linha
// correspondente só gera um aviso no log — a automação nunca escreve fora
// da estrutura que já existe.
//
// Autentica como service account do Google (JWT bearer flow assinado com a
// chave privada, via fetch puro — sem SDK googleapis, mesma filosofia de
// email.ts).
//
// Mentoria individual funciona diferente (ver o fim do arquivo): a aba
// "Individual" é um registro, uma linha por agendamento, criada pelo site.
//
// Chamada de dentro de bookMentoriaGrupoSlot / leaveMentoriaGrupoSlot /
// removeMentoriaGrupoStudent (e, pra individual, de bookMentoriaSlot /
// cancelMentoriaSlot / deleteMentoriaSlot), DEPOIS que a reserva/saída já foi gravada e do
// aviso por e-mail. Nunca lança: se a service account não estiver
// configurada, a planilha tiver sido desconectada ou o Google estiver fora
// do ar, o agendamento do aluno continua valendo — o problema fica só no log.

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'
const REQUISICAO_TIMEOUT_MS = 5000

// Planilha e aba combinadas com a Carla. Dá pra apontar pra outra via
// variável de ambiente sem mexer no código.
const PLANILHA_ID_PADRAO = '1LL96bvAFov1xTTXaDevVSoQSYcxoi01ZQC_60AAh7k8'
const ABA_GRUPOS_PADRAO = 'Grupos'

// Colunas da aba "Grupos": A Grupo | B Dia | C Data | D Horário | E Nomes dos alunos | F Vagas preenchidas
const COLUNA_DATA = 2
const COLUNA_HORARIO = 3
const COLUNA_NOMES = 4
const PLACEHOLDER_VAZIO = 'nenhum aluno inscrito'

function base64url(input: Buffer | string): string {
  const buffer = typeof input === 'string' ? Buffer.from(input) : input
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function obterAccessToken(clientEmail: string, privateKey: string): Promise<string | null> {
  const agora = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = base64url(
    JSON.stringify({
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: TOKEN_ENDPOINT,
      iat: agora,
      exp: agora + 3600,
    }),
  )
  const semAssinar = `${header}.${claims}`

  // Import dinâmico: 'node:crypto' não existe no navegador, e este módulo
  // pode ser puxado pelo bundle do cliente por causa do createServerFn.
  const { createSign } = await import('node:crypto')
  const assinatura = createSign('RSA-SHA256').update(semAssinar).sign(privateKey)
  const jwt = `${semAssinar}.${base64url(assinatura)}`

  const resposta = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    signal: AbortSignal.timeout(REQUISICAO_TIMEOUT_MS),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!resposta.ok) {
    console.error('[planilha-agendamento] falha ao autenticar —', await resposta.text())
    return null
  }

  const dados = (await resposta.json()) as { access_token?: string }
  return dados.access_token ?? null
}

function formatarDataCurta(data: string): string {
  const [ano, mes, dia] = data.split('-')
  if (!ano || !mes || !dia) return data
  return `${dia}/${mes}/${ano}`
}

// A coluna "Horário" tem texto livre digitado à mão — já vimos "19h30 às
// 20h30", "16h as 17h" (sem acento) e "09:30 às 11h" (com dois-pontos em vez
// de "h"). Em vez de comparar a célula inteira, extrai só o horário de
// início e compara com o horário do agendamento — tolerante a como a Carla
// escreveu a célula.
function horarioInicioDaCelula(celula: string): string | null {
  const match = celula.match(/^(\d{1,2})(?:h(\d{2})?|:(\d{2}))/)
  if (!match) return null
  const hh = match[1]!.padStart(2, '0')
  const mm = match[2] ?? match[3] ?? '00'
  return `${hh}:${mm}`
}

type LinhaEncontrada = {
  accessToken: string
  planilhaId: string
  aba: string
  linhaPlanilha: number
  nomesAtuais: string
}

type Conexao = { accessToken: string; planilhaId: string }

// Lê as credenciais da service account e troca por um access token. Cada
// branch de falha já loga o motivo; quem chama só checa `null`.
async function conectar(): Promise<Conexao | null> {
  const clientEmail = typeof process !== 'undefined' ? process.env.GOOGLE_SHEETS_CLIENT_EMAIL : undefined
  const chaveBruta = typeof process !== 'undefined' ? process.env.GOOGLE_SHEETS_PRIVATE_KEY : undefined
  if (!clientEmail || !chaveBruta) {
    console.log('[planilha-agendamento] não configurado — faltam GOOGLE_SHEETS_CLIENT_EMAIL/GOOGLE_SHEETS_PRIVATE_KEY')
    return null
  }

  const planilhaId = (typeof process !== 'undefined' && process.env.GOOGLE_SHEETS_ID) || PLANILHA_ID_PADRAO
  // No painel da Netlify a chave vira uma linha só; as quebras chegam como "\n" literal.
  const chavePrivada = chaveBruta.replace(/\\n/g, '\n')

  const accessToken = await obterAccessToken(clientEmail, chavePrivada)
  if (!accessToken) {
    console.log('[planilha-agendamento] sem access token — ver erro de autenticação acima')
    return null
  }

  return { accessToken, planilhaId }
}

// Autentica, lê a aba inteira e acha a linha da sessão certa por Data +
// Horário. Cada branch de falha já loga o motivo, então quem chama só
// precisa checar `null` e voltar.
async function localizarLinhaGrupo(params: { data: string; hora: string }): Promise<LinhaEncontrada | null> {
  const conexao = await conectar()
  if (!conexao) return null
  const { accessToken, planilhaId } = conexao
  const aba = (typeof process !== 'undefined' && process.env.GOOGLE_SHEETS_ABA_GRUPOS) || ABA_GRUPOS_PADRAO

  const dataFormatada = formatarDataCurta(params.data)
  const horarioBusca = params.hora

  const leitura = await fetch(`${SHEETS_API}/${planilhaId}/values/${encodeURIComponent(aba)}!A1:F1000`, {
    signal: AbortSignal.timeout(REQUISICAO_TIMEOUT_MS),
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!leitura.ok) {
    console.error('[planilha-agendamento] falha ao ler a planilha —', await leitura.text())
    return null
  }

  const { values } = (await leitura.json()) as { values?: string[][] }
  const linhas = values ?? []

  const indice = linhas.findIndex((linha) => {
    const data = (linha[COLUNA_DATA] ?? '').trim()
    const horario = horarioInicioDaCelula((linha[COLUNA_HORARIO] ?? '').trim())
    return data === dataFormatada && horario === horarioBusca
  })

  if (indice === -1) {
    console.log(
      `[planilha-agendamento] nenhuma linha encontrada na aba "${aba}" para ${dataFormatada} às ${formatarHora(horarioBusca)} — nada foi alterado`,
    )
    return null
  }

  return {
    accessToken,
    planilhaId,
    aba,
    linhaPlanilha: indice + 1, // values[] é 0-based; a planilha é 1-based
    nomesAtuais: (linhas[indice]?.[COLUNA_NOMES] ?? '').trim(),
  }
}

async function escreverNomesEVagas(alvo: LinhaEncontrada, novosNomes: string, totalInscritos: number): Promise<void> {
  const escrita = await fetch(
    `${SHEETS_API}/${alvo.planilhaId}/values/${encodeURIComponent(alvo.aba)}!E${alvo.linhaPlanilha}:F${alvo.linhaPlanilha}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      signal: AbortSignal.timeout(REQUISICAO_TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${alvo.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [[novosNomes, totalInscritos]] }),
    },
  )

  if (!escrita.ok) {
    console.error('[planilha-agendamento] falha ao atualizar a linha —', await escrita.text())
  } else {
    console.log(`[planilha-agendamento] linha ${alvo.linhaPlanilha} da aba "${alvo.aba}" atualizada`)
  }
}

export async function registrarAgendamentoGrupoNaPlanilha(params: {
  nomeAluno: string
  data: string
  hora: string
  totalInscritos: number
}): Promise<void> {
  try {
    const alvo = await localizarLinhaGrupo(params)
    if (!alvo) return

    const jaTemAluno = alvo.nomesAtuais.length > 0 && alvo.nomesAtuais.toLowerCase() !== PLACEHOLDER_VAZIO
    const novosNomes = jaTemAluno ? `${alvo.nomesAtuais}\n${params.nomeAluno}` : params.nomeAluno

    await escreverNomesEVagas(alvo, novosNomes, params.totalInscritos)
  } catch (erro) {
    // Rede caiu, timeout, chave inválida: o agendamento já está gravado.
    console.error('[planilha-agendamento] erro inesperado ao registrar —', erro)
  }
}

export async function removerAgendamentoGrupoNaPlanilha(params: {
  nomeAluno: string
  data: string
  hora: string
  totalInscritos: number
}): Promise<void> {
  try {
    const alvo = await localizarLinhaGrupo(params)
    if (!alvo) return

    const linhasDeNomes = alvo.nomesAtuais.split('\n').map((n) => n.trim()).filter(Boolean)
    const posicao = linhasDeNomes.findIndex((n) => n.toLowerCase() === params.nomeAluno.trim().toLowerCase())

    if (posicao === -1) {
      console.log(
        `[planilha-agendamento] nome "${params.nomeAluno}" não encontrado na linha ${alvo.linhaPlanilha} da aba "${alvo.aba}" — nada foi alterado`,
      )
      return
    }

    linhasDeNomes.splice(posicao, 1)
    const novosNomes = linhasDeNomes.length > 0 ? linhasDeNomes.join('\n') : 'Nenhum aluno inscrito'

    await escreverNomesEVagas(alvo, novosNomes, params.totalInscritos)
  } catch (erro) {
    // Rede caiu, timeout, chave inválida: o cancelamento já está gravado.
    console.error('[planilha-agendamento] erro inesperado ao remover —', erro)
  }
}

// ---------------------------------------------------------------------------
// Mentoria individual
//
// Ao contrário da aba de grupos, a aba "Individual" não é pré-cadastrada pela
// Carla: é um registro, uma linha por agendamento, e o site cria a aba (com
// cabeçalho) na primeira vez que precisar. Cancelar não apaga a linha — só
// troca o Status pra "Cancelado", pra ficar o histórico de quem marcou e
// desmarcou. Só o nome do aluno vai pra planilha, nunca o e-mail.
// ---------------------------------------------------------------------------

const ABA_INDIVIDUAL_PADRAO = 'Individual'

// Colunas: A Data | B Dia | C Horário | D Duração | E Aluno | F Status | G Registrado em
const CABECALHO_INDIVIDUAL = ['Data', 'Dia', 'Horário', 'Duração', 'Aluno', 'Status', 'Registrado em']
const IND_COLUNA_DATA = 0
const IND_COLUNA_HORARIO = 2
const IND_COLUNA_ALUNO = 4
const IND_COLUNA_STATUS = 5
const STATUS_AGENDADO = 'Agendado'
const STATUS_CANCELADO = 'Cancelado'

const DIAS_DA_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

function abaIndividual(): string {
  return (typeof process !== 'undefined' && process.env.GOOGLE_SHEETS_ABA_INDIVIDUAL) || ABA_INDIVIDUAL_PADRAO
}

function diaDaSemana(data: string): string {
  // Meio-dia UTC: a data 'AAAA-MM-DD' cai no mesmo dia em qualquer fuso.
  const dia = new Date(`${data}T12:00:00Z`).getUTCDay()
  return DIAS_DA_SEMANA[dia] ?? ''
}

function agoraEmBrasilia(): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date())
}

async function requisicao(conexao: Conexao, caminho: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${SHEETS_API}/${conexao.planilhaId}${caminho}`, {
    ...init,
    signal: AbortSignal.timeout(REQUISICAO_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${conexao.accessToken}`,
      'Content-Type': 'application/json',
    },
  })
}

async function idDaAba(conexao: Conexao, aba: string): Promise<number | null | undefined> {
  const meta = await requisicao(conexao, '?fields=sheets.properties(sheetId,title)')
  if (!meta.ok) {
    console.error('[planilha-agendamento] falha ao ler as abas da planilha —', await meta.text())
    return undefined
  }

  const { sheets } = (await meta.json()) as { sheets?: { properties?: { sheetId?: number; title?: string } }[] }
  return sheets?.find((s) => s.properties?.title === aba)?.properties?.sheetId ?? null
}

// Devolve o id interno da aba "Individual", criando-a com cabeçalho se ela
// ainda não existir (`null` = não deu pra ler nem criar). Se dois
// agendamentos chegarem juntos na primeira vez, o segundo addSheet falha com
// "já existe" — tudo bem, relê e segue com a aba que o outro criou.
async function garantirAbaIndividual(conexao: Conexao, aba: string): Promise<number | null> {
  const existente = await idDaAba(conexao, aba)
  if (existente === undefined) return null
  if (existente !== null) return existente

  const criacao = await requisicao(conexao, ':batchUpdate', {
    method: 'POST',
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title: aba } } }] }),
  })
  if (!criacao.ok) {
    console.log(`[planilha-agendamento] não criou a aba "${aba}" (pode já existir) —`, await criacao.text())
    return (await idDaAba(conexao, aba)) ?? null
  }

  const { replies } = (await criacao.json()) as {
    replies?: { addSheet?: { properties?: { sheetId?: number } } }[]
  }
  const sheetId = replies?.[0]?.addSheet?.properties?.sheetId ?? null

  const cabecalho = await requisicao(conexao, `/values/${encodeURIComponent(aba)}!A1:G1?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [CABECALHO_INDIVIDUAL] }),
  })
  if (!cabecalho.ok) {
    console.error(`[planilha-agendamento] aba "${aba}" criada, mas falhou o cabeçalho —`, await cabecalho.text())
  } else {
    console.log(`[planilha-agendamento] aba "${aba}" criada com cabeçalho`)
  }
  return sheetId
}

// Número de série de data do Sheets (dias desde 30/12/1899). Gravar a data
// como número — e não como texto — é o que deixa a ordenação cronológica; o
// formato dd/mm/aaaa vai junto na célula, então ela continua aparecendo (e
// sendo lida pelo cancelamento) como "30/10/2026".
function serialDeData(data: string): number {
  const [ano, mes, dia] = data.split('-').map(Number)
  return (Date.UTC(ano!, mes! - 1, dia!) - Date.UTC(1899, 11, 30)) / 86_400_000
}

const texto = (valor: string) => ({ userEnteredValue: { stringValue: valor } })

export async function registrarMentoriaIndividualNaPlanilha(params: {
  nomeAluno: string
  data: string
  hora: string
  duracao: number
}): Promise<void> {
  try {
    const conexao = await conectar()
    if (!conexao) return
    const aba = abaIndividual()
    const sheetId = await garantirAbaIndividual(conexao, aba)
    if (sheetId === null) return

    // Valores tipados (stringValue/numberValue), não "USER_ENTERED": um nome
    // de aluno começando com "=" fica texto, nunca vira fórmula.
    const linha = {
      values: [
        {
          userEnteredValue: { numberValue: serialDeData(params.data) },
          userEnteredFormat: { numberFormat: { type: 'DATE', pattern: 'dd/mm/yyyy' } },
        },
        texto(diaDaSemana(params.data)),
        // "09h30": o zero à esquerda faz a ordem alfabética bater com a do relógio.
        texto(formatarHora(params.hora)),
        texto(`${params.duracao} min`),
        texto(params.nomeAluno),
        texto(STATUS_AGENDADO),
        texto(agoraEmBrasilia()),
      ],
    }

    // Acrescenta a linha e reordena tudo abaixo do cabeçalho por Data e depois
    // Horário — na mesma chamada, então a planilha nunca fica no meio do
    // caminho. Dias com várias mentorias ficam agrupados, em ordem de horário.
    const escrita = await requisicao(conexao, ':batchUpdate', {
      method: 'POST',
      body: JSON.stringify({
        requests: [
          { appendCells: { sheetId, rows: [linha], fields: 'userEnteredValue,userEnteredFormat.numberFormat' } },
          {
            sortRange: {
              range: { sheetId, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: CABECALHO_INDIVIDUAL.length },
              sortSpecs: [
                { dimensionIndex: IND_COLUNA_DATA, sortOrder: 'ASCENDING' },
                { dimensionIndex: IND_COLUNA_HORARIO, sortOrder: 'ASCENDING' },
              ],
            },
          },
        ],
      }),
    })

    if (!escrita.ok) {
      console.error('[planilha-agendamento] falha ao registrar mentoria individual —', await escrita.text())
    } else {
      console.log(`[planilha-agendamento] mentoria individual registrada e ordenada na aba "${aba}"`)
    }
  } catch (erro) {
    // Rede caiu, timeout, chave inválida: o agendamento já está gravado.
    console.error('[planilha-agendamento] erro inesperado ao registrar mentoria individual —', erro)
  }
}

type BuscaCancelamento = { nomeAluno: string; data: string; hora: string }

function ehALinha(l: string[], busca: BuscaCancelamento, status: string): boolean {
  return (
    (l[IND_COLUNA_DATA] ?? '').trim() === formatarDataCurta(busca.data) &&
    (l[IND_COLUNA_HORARIO] ?? '').trim() === formatarHora(busca.hora) &&
    (l[IND_COLUNA_ALUNO] ?? '').trim().toLowerCase() === busca.nomeAluno.trim().toLowerCase() &&
    (l[IND_COLUNA_STATUS] ?? '').trim() === status
  )
}

async function escreverStatus(conexao: Conexao, aba: string, linhaPlanilha: number, status: string) {
  return requisicao(conexao, `/values/${encodeURIComponent(aba)}!F${linhaPlanilha}?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [[status]] }),
  })
}

async function tentarMarcarCancelado(
  conexao: Conexao,
  aba: string,
  busca: BuscaCancelamento,
): Promise<'feito' | 'linha-mudou' | 'desistiu'> {
  const leitura = await requisicao(conexao, `/values/${encodeURIComponent(aba)}!A1:G5000`)
  if (!leitura.ok) {
    console.error('[planilha-agendamento] falha ao ler a aba individual —', await leitura.text())
    return 'desistiu'
  }

  const { values } = (await leitura.json()) as { values?: string[][] }
  // Só existe uma linha "Agendado" por aluno + data + horário: um horário
  // remarcado depois de cancelado deixa a antiga como "Cancelado".
  const indice = (values ?? []).findIndex((l) => ehALinha(l, busca, STATUS_AGENDADO))

  if (indice === -1) {
    console.log(
      `[planilha-agendamento] nenhuma linha "Agendado" de "${busca.nomeAluno}" em ${formatarDataCurta(busca.data)} às ${formatarHora(busca.hora)} na aba "${aba}" — nada foi alterado`,
    )
    return 'desistiu'
  }

  const linhaPlanilha = indice + 1 // values[] é 0-based; a planilha é 1-based
  const escrita = await escreverStatus(conexao, aba, linhaPlanilha, STATUS_CANCELADO)
  if (!escrita.ok) {
    console.error('[planilha-agendamento] falha ao marcar cancelamento —', await escrita.text())
    return 'desistiu'
  }

  const conferencia = await requisicao(conexao, `/values/${encodeURIComponent(aba)}!A${linhaPlanilha}:G${linhaPlanilha}`)
  if (conferencia.ok) {
    const { values: linhaAtual } = (await conferencia.json()) as { values?: string[][] }
    if (!ehALinha(linhaAtual?.[0] ?? [], busca, STATUS_CANCELADO)) {
      // Marcou a linha de outra pessoa. Devolve "Agendado" — o caso comum,
      // já que linhas recém-movidas são de agendamentos novos — e deixa no
      // log, caso aquela linha já estivesse "Cancelado" antes.
      await escreverStatus(conexao, aba, linhaPlanilha, STATUS_AGENDADO)
      console.warn(
        `[planilha-agendamento] linha ${linhaPlanilha} da aba "${aba}" foi marcada por engano e voltou pra "Agendado" — conferir à mão se ela já estava cancelada`,
      )
      return 'linha-mudou'
    }
  }

  console.log(`[planilha-agendamento] linha ${linhaPlanilha} da aba "${aba}" marcada como cancelada`)
  return 'feito'
}

export async function marcarMentoriaIndividualCanceladaNaPlanilha(params: {
  nomeAluno: string
  data: string
  hora: string
}): Promise<void> {
  try {
    const conexao = await conectar()
    if (!conexao) return
    const aba = abaIndividual()

    // O cancelamento escreve numa linha pelo número dela, mas um agendamento
    // de outro aluno no mesmo instante reordena a aba e pode mover as linhas
    // entre a leitura e a escrita. Por isso confere depois de escrever e, se
    // pegou a linha errada, desfaz e procura de novo (uma vez).
    for (let tentativa = 1; tentativa <= 2; tentativa++) {
      const resultado = await tentarMarcarCancelado(conexao, aba, params)
      if (resultado !== 'linha-mudou') return
      console.log(`[planilha-agendamento] a aba "${aba}" mudou durante o cancelamento — tentativa ${tentativa}`)
    }
  } catch (erro) {
    // Rede caiu, timeout, chave inválida: o cancelamento já está gravado.
    console.error('[planilha-agendamento] erro inesperado ao marcar cancelamento —', erro)
  }
}
