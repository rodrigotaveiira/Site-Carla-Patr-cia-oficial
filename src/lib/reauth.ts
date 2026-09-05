import { AuthError, login } from '@netlify/identity'
import { readLocalUsers } from './identity-context'

// Confere a senha da conta que JA esta logada, antes de uma acao que compromete
// a agenda da Carla. Serve pro caso pratico de aparelho logado deixado aberto ou
// conta emprestada — nao e barreira de servidor: quem chamar a server function
// direto continua marcando sem senha (ver README da issue #11).

type LocalUserWithPasswordHash = { email?: string; passwordHash?: string }

// Mesmo criterio de ambiente usado na tela de login: só é `true` numa build
// de desenvolvimento (`vite dev`); qualquer deploy do Netlify (produção ou
// preview) é `vite build`, que resolve `import.meta.env.DEV` pra `false`.
function isLocalDemoMode() {
  return import.meta.env.DEV && typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
}

async function hashPassword(password: string): Promise<string> {
  const bytes = new TextEncoder().encode(password)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * `true` se a senha confere, `false` se nao confere.
 * Erros de rede/servidor sobem como excecao, pra tela nao dizer "senha errada"
 * quando na verdade a internet caiu.
 */
export async function verifyPassword(email: string, password: string): Promise<boolean> {
  if (!email) throw new Error('Não foi possível identificar sua conta. Entre novamente.')
  if (!password) return false

  if (isLocalDemoMode()) {
    const users = readLocalUsers() as LocalUserWithPasswordHash[]
    const hash = await hashPassword(password)
    return users.some(
      (user) => user.email?.toLowerCase() === email.toLowerCase() && user.passwordHash === hash,
    )
  }

  try {
    // Revalida no proprio Netlify Identity. A senha vai pro endpoint de auth,
    // que e onde ela deve ir — nao pro endpoint de agendamento.
    //
    // Isso NAO derruba a sessao deste aparelho: `ensureSessionTracked` so
    // registra login novo quando nao existe sessao salva no localStorage, e
    // aqui ela existe (o aluno ja esta logado).
    await login(email, password)
    return true
  } catch (error) {
    if (error instanceof AuthError) return false
    throw error
  }
}
