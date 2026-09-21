import { formatarHora } from './formato'

// Acrescenta uma linha na planilha de agendamentos, autenticando como
// service account do Google (JWT bearer flow assinado com a chave privada,
// via fetch puro — sem SDK googleapis, mesma filosofia de email.ts).
//
// Chamada de dentro das server functions de agendamento, DEPOIS que a
// reserva já foi gravada e do aviso por e-mail. Nunca lança: se a service
// account não estiver configurada, a planilha tiver sido desconectada ou o
// Google estiver fora do ar, o agendamento do aluno continua valendo — o
// problema fica só no log.
//
// Sem client e-mail/chave configurados, `registrarAgendamentoNaPlanilha` não
// tenta nada — permite subir o site sem essa integração ligada.

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'
const REQUISICAO_TIMEOUT_MS = 5000

// Planilha combinada com a Carla. Dá pra apontar pra outra via variável de
// ambiente sem mexer no código.
const PLANILHA_ID_PADRAO = '1LL96bvAFov1xTTXaDevVSoQSYcxoi01ZQC_60AAh7k8'

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

// A aba não é fixa no código: em vez de assumir "Sheet1"/"Página1", pergunta
// pro Google qual é a primeira aba da planilha.
async function obterPrimeiraAba(planilhaId: string, accessToken: string): Promise<string | null> {
  const resposta = await fetch(`${SHEETS_API}/${planilhaId}?fields=sheets.properties.title`, {
    signal: AbortSignal.timeout(REQUISICAO_TIMEOUT_MS),
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!resposta.ok) {
    console.error('[planilha-agendamento] falha ao ler a planilha —', await resposta.text())
    return null
  }

  const dados = (await resposta.json()) as { sheets?: Array<{ properties?: { title?: string } }> }
  return dados.sheets?.[0]?.properties?.title ?? null
}

function formatarDataCurta(data: string): string {
  const [ano, mes, dia] = data.split('-')
  if (!ano || !mes || !dia) return data
  return `${dia}/${mes}/${ano}`
}

export async function registrarAgendamentoNaPlanilha(params: {
  nomeAluno: string
  data: string
  hora: string
  emGrupo: boolean
}): Promise<void> {
  const clientEmail = typeof process !== 'undefined' ? process.env.GOOGLE_SHEETS_CLIENT_EMAIL : undefined
  const chaveBruta = typeof process !== 'undefined' ? process.env.GOOGLE_SHEETS_PRIVATE_KEY : undefined
  if (!clientEmail || !chaveBruta) {
    console.log('[planilha-agendamento] não configurado — faltam GOOGLE_SHEETS_CLIENT_EMAIL/GOOGLE_SHEETS_PRIVATE_KEY')
    return
  }

  const planilhaId = (typeof process !== 'undefined' && process.env.GOOGLE_SHEETS_ID) || PLANILHA_ID_PADRAO
  // No painel da Netlify a chave vira uma linha só; as quebras chegam como "\n" literal.
  const chavePrivada = chaveBruta.replace(/\\n/g, '\n')

  try {
    const accessToken = await obterAccessToken(clientEmail, chavePrivada)
    if (!accessToken) {
      console.log('[planilha-agendamento] sem access token — ver erro de autenticação acima')
      return
    }

    const aba = await obterPrimeiraAba(planilhaId, accessToken)
    if (!aba) {
      console.log('[planilha-agendamento] não achei a primeira aba da planilha — ver erro acima')
      return
    }

    const linha = [params.nomeAluno, formatarDataCurta(params.data), formatarHora(params.hora), params.emGrupo ? 'Em grupo' : 'Individual']

    const resposta = await fetch(
      `${SHEETS_API}/${planilhaId}/values/${encodeURIComponent(aba)}!A:D:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        signal: AbortSignal.timeout(REQUISICAO_TIMEOUT_MS),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [linha] }),
      },
    )

    if (!resposta.ok) {
      console.error('[planilha-agendamento] falha ao gravar a linha —', await resposta.text())
    } else {
      console.log(`[planilha-agendamento] linha gravada na aba "${aba}"`)
    }
  } catch (erro) {
    // Rede caiu, timeout, chave inválida: o agendamento já está gravado.
    console.error('[planilha-agendamento] erro inesperado ao registrar —', erro)
  }
}
