import { formatarHora } from './formato'

// Atualiza a planilha de mentoria em grupo quando um aluno agenda: acha a
// linha da sessão certa (por data + horário) e junta o nome do aluno na
// coluna de inscritos, sem nunca criar linha nova. As linhas são pré-
// cadastradas manualmente pela Carla (Grupo 1, Grupo 2, ..., Grupão 1,
// Grupão 2), então uma sessão sem linha correspondente só gera um aviso no
// log — a automação nunca escreve fora da estrutura que já existe.
//
// Autentica como service account do Google (JWT bearer flow assinado com a
// chave privada, via fetch puro — sem SDK googleapis, mesma filosofia de
// email.ts). Mentoria individual não entra aqui: só grupo tem essa planilha.
//
// Chamada de dentro de bookMentoriaGrupoSlot, DEPOIS que a reserva já foi
// gravada e do aviso por e-mail. Nunca lança: se a service account não
// estiver configurada, a planilha tiver sido desconectada ou o Google
// estiver fora do ar, o agendamento do aluno continua valendo — o problema
// fica só no log.

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

// A coluna "Horário" tem texto livre digitado à mão ("19h30 às 20h30", mas
// também já vimos "16h as 17h" sem acento) — em vez de comparar a célula
// inteira, extrai só o horário de início ("19h30" -> "19:30") e compara com
// o horário do agendamento. Mais tolerante a como a Carla escreveu a célula.
function horarioInicioDaCelula(celula: string): string | null {
  const match = celula.match(/^(\d{1,2})h(\d{2})?/)
  if (!match) return null
  const hh = match[1]!.padStart(2, '0')
  const mm = match[2] ?? '00'
  return `${hh}:${mm}`
}

export async function registrarAgendamentoGrupoNaPlanilha(params: {
  nomeAluno: string
  data: string
  hora: string
  totalInscritos: number
}): Promise<void> {
  const clientEmail = typeof process !== 'undefined' ? process.env.GOOGLE_SHEETS_CLIENT_EMAIL : undefined
  const chaveBruta = typeof process !== 'undefined' ? process.env.GOOGLE_SHEETS_PRIVATE_KEY : undefined
  if (!clientEmail || !chaveBruta) {
    console.log('[planilha-agendamento] não configurado — faltam GOOGLE_SHEETS_CLIENT_EMAIL/GOOGLE_SHEETS_PRIVATE_KEY')
    return
  }

  const planilhaId = (typeof process !== 'undefined' && process.env.GOOGLE_SHEETS_ID) || PLANILHA_ID_PADRAO
  const aba = (typeof process !== 'undefined' && process.env.GOOGLE_SHEETS_ABA_GRUPOS) || ABA_GRUPOS_PADRAO
  // No painel da Netlify a chave vira uma linha só; as quebras chegam como "\n" literal.
  const chavePrivada = chaveBruta.replace(/\\n/g, '\n')

  try {
    const accessToken = await obterAccessToken(clientEmail, chavePrivada)
    if (!accessToken) {
      console.log('[planilha-agendamento] sem access token — ver erro de autenticação acima')
      return
    }

    const dataFormatada = formatarDataCurta(params.data)
    const horarioBusca = params.hora

    const leitura = await fetch(`${SHEETS_API}/${planilhaId}/values/${encodeURIComponent(aba)}!A1:F1000`, {
      signal: AbortSignal.timeout(REQUISICAO_TIMEOUT_MS),
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!leitura.ok) {
      console.error('[planilha-agendamento] falha ao ler a planilha —', await leitura.text())
      return
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
      return
    }

    const linhaPlanilha = indice + 1 // values[] é 0-based; a planilha é 1-based
    const nomesAtuais = (linhas[indice]?.[COLUNA_NOMES] ?? '').trim()
    const jaTemAluno = nomesAtuais.length > 0 && nomesAtuais.toLowerCase() !== PLACEHOLDER_VAZIO
    const novosNomes = jaTemAluno ? `${nomesAtuais}\n${params.nomeAluno}` : params.nomeAluno

    const escrita = await fetch(
      `${SHEETS_API}/${planilhaId}/values/${encodeURIComponent(aba)}!E${linhaPlanilha}:F${linhaPlanilha}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        signal: AbortSignal.timeout(REQUISICAO_TIMEOUT_MS),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [[novosNomes, params.totalInscritos]] }),
      },
    )

    if (!escrita.ok) {
      console.error('[planilha-agendamento] falha ao atualizar a linha —', await escrita.text())
    } else {
      console.log(`[planilha-agendamento] linha ${linhaPlanilha} da aba "${aba}" atualizada`)
    }
  } catch (erro) {
    // Rede caiu, timeout, chave inválida: o agendamento já está gravado.
    console.error('[planilha-agendamento] erro inesperado ao registrar —', erro)
  }
}
