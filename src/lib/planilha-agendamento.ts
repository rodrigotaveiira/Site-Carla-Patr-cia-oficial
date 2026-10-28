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

// Cria a aba "Individual" com cabeçalho se ela ainda não existir. Se dois
// agendamentos chegarem juntos na primeira vez, o segundo addSheet falha com
// "já existe" — tudo bem, a aba existe e o append logo depois funciona.
async function garantirAbaIndividual(conexao: Conexao, aba: string): Promise<boolean> {
  const meta = await requisicao(conexao, '?fields=sheets.properties.title')
  if (!meta.ok) {
    console.error('[planilha-agendamento] falha ao ler as abas da planilha —', await meta.text())
    return false
  }

  const { sheets } = (await meta.json()) as { sheets?: { properties?: { title?: string } }[] }
  if (sheets?.some((s) => s.properties?.title === aba)) return true

  const criacao = await requisicao(conexao, ':batchUpdate', {
    method: 'POST',
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title: aba } } }] }),
  })
  if (!criacao.ok) {
    console.log(`[planilha-agendamento] não criou a aba "${aba}" (pode já existir) —`, await criacao.text())
    return true
  }

  const cabecalho = await requisicao(conexao, `/values/${encodeURIComponent(aba)}!A1:G1?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [CABECALHO_INDIVIDUAL] }),
  })
  if (!cabecalho.ok) {
    console.error(`[planilha-agendamento] aba "${aba}" criada, mas falhou o cabeçalho —`, await cabecalho.text())
  } else {
    console.log(`[planilha-agendamento] aba "${aba}" criada com cabeçalho`)
  }
  return true
}

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
    if (!(await garantirAbaIndividual(conexao, aba))) return

    const linha = [
      formatarDataCurta(params.data),
      diaDaSemana(params.data),
      formatarHora(params.hora),
      `${params.duracao} min`,
      params.nomeAluno,
      STATUS_AGENDADO,
      agoraEmBrasilia(),
    ]

    // RAW: a data fica como texto "dd/mm/aaaa", igual ao que o cancelamento
    // procura depois — USER_ENTERED viraria data do Sheets e mudaria o texto.
    const escrita = await requisicao(
      conexao,
      `/values/${encodeURIComponent(aba)}!A:G:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      { method: 'POST', body: JSON.stringify({ values: [linha] }) },
    )

    if (!escrita.ok) {
      console.error('[planilha-agendamento] falha ao registrar mentoria individual —', await escrita.text())
    } else {
      console.log(`[planilha-agendamento] mentoria individual registrada na aba "${aba}"`)
    }
  } catch (erro) {
    // Rede caiu, timeout, chave inválida: o agendamento já está gravado.
    console.error('[planilha-agendamento] erro inesperado ao registrar mentoria individual —', erro)
  }
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

    const leitura = await requisicao(conexao, `/values/${encodeURIComponent(aba)}!A1:G5000`)
    if (!leitura.ok) {
      console.error('[planilha-agendamento] falha ao ler a aba individual —', await leitura.text())
      return
    }

    const { values } = (await leitura.json()) as { values?: string[][] }
    const linhas = values ?? []
    const dataBusca = formatarDataCurta(params.data)
    const horaBusca = formatarHora(params.hora)
    const alunoBusca = params.nomeAluno.trim().toLowerCase()

    // De baixo pra cima: se o mesmo horário foi marcado, cancelado e marcado
    // de novo, o que vale é o agendamento mais recente ainda "Agendado".
    let indice = -1
    for (let i = linhas.length - 1; i >= 0; i--) {
      const l = linhas[i] ?? []
      if (
        (l[IND_COLUNA_DATA] ?? '').trim() === dataBusca &&
        (l[IND_COLUNA_HORARIO] ?? '').trim() === horaBusca &&
        (l[IND_COLUNA_ALUNO] ?? '').trim().toLowerCase() === alunoBusca &&
        (l[IND_COLUNA_STATUS] ?? '').trim() === STATUS_AGENDADO
      ) {
        indice = i
        break
      }
    }

    if (indice === -1) {
      console.log(
        `[planilha-agendamento] nenhuma linha "Agendado" de "${params.nomeAluno}" em ${dataBusca} às ${horaBusca} na aba "${aba}" — nada foi alterado`,
      )
      return
    }

    const linhaPlanilha = indice + 1 // values[] é 0-based; a planilha é 1-based
    const escrita = await requisicao(
      conexao,
      `/values/${encodeURIComponent(aba)}!F${linhaPlanilha}?valueInputOption=RAW`,
      { method: 'PUT', body: JSON.stringify({ values: [[STATUS_CANCELADO]] }) },
    )

    if (!escrita.ok) {
      console.error('[planilha-agendamento] falha ao marcar cancelamento —', await escrita.text())
    } else {
      console.log(`[planilha-agendamento] linha ${linhaPlanilha} da aba "${aba}" marcada como cancelada`)
    }
  } catch (erro) {
    // Rede caiu, timeout, chave inválida: o cancelamento já está gravado.
    console.error('[planilha-agendamento] erro inesperado ao marcar cancelamento —', erro)
  }
}
