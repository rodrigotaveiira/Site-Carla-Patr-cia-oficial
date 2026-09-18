// Token de recuperação de senha em trânsito.
//
// O link do e-mail chega em qualquer página do site como `#recovery_token=...`.
// O `CallbackHandler` tira o token da URL e guarda aqui *sem gastá-lo*; quem
// redime é o formulário de `/redefinir-senha`, na hora em que o aluno envia a
// senha nova. Enquanto o token está aqui ele não vale sessão nenhuma — só o
// envio do formulário loga a pessoa.
//
// Guardado no `sessionStorage` (e não no `localStorage`) porque ele deve durar
// só o tempo daquela aba: some quando ela é fechada, não é visto por outras
// abas e não fica no aparelho depois. A cópia em memória é o plano B pra
// navegador que bloqueia storage (modo anônimo restrito, por exemplo), onde o
// fluxo ainda funciona desde que a pessoa não recarregue a página.

const RECOVERY_TOKEN_KEY = 'cpm:recovery-token'

let tokenInMemory: string | null = null

export function stashRecoveryToken(token: string) {
  tokenInMemory = token
  try {
    window.sessionStorage.setItem(RECOVERY_TOKEN_KEY, token)
  } catch {
    // storage bloqueado — segue só com a cópia em memória
  }
}

export function readRecoveryToken(): string | null {
  if (tokenInMemory) return tokenInMemory
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage.getItem(RECOVERY_TOKEN_KEY)
  } catch {
    return null
  }
}

export function clearRecoveryToken() {
  tokenInMemory = null
  try {
    window.sessionStorage.removeItem(RECOVERY_TOKEN_KEY)
  } catch {
    // nada a limpar se o storage nunca aceitou a escrita
  }
}
