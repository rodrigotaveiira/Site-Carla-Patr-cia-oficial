import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'

// Casca comum dos três documentos legais (/termos, /privacidade, /lgpd).
// Eles são páginas públicas fora do `_app`, então não herdam nem o cabeçalho da
// landing nem o do painel — o caminho de volta pro site precisa vir daqui.

/** Data em que a versão atual dos três documentos passou a valer. */
export const VIGENCIA_LEGAL = '10 de setembro de 2026'

export const CONTATO_LEGAL = 'contato.carlapatriciamedina@gmail.com'

const DOCUMENTOS = [
  { href: '/termos', label: 'Termos de Uso' },
  { href: '/privacidade', label: 'Política de Privacidade' },
  { href: '/lgpd', label: 'LGPD e seus direitos' },
] as const

export function PaginaLegal({
  atual,
  titulo,
  resumo,
  children,
}: {
  /** Rota deste documento, pra não se auto-linkar no rodapé. */
  atual: (typeof DOCUMENTOS)[number]['href']
  titulo: string
  resumo: ReactNode
  children: ReactNode
}) {
  return (
    <main className="legal-page">
      <header className="legal-bar">
        <a className="brand" href="/" aria-label="Carla Patrícia Medina — início">
          <span className="brand-mark">
            <img src="/logo-icone.png" alt="" />
          </span>
          <span>
            <b>Carla Patrícia Medina</b>
            <small>Redação e Gramática</small>
          </span>
        </a>
        <a className="text-link" href="/">
          Voltar ao site
        </a>
      </header>

      <article className="legal-doc">
        <p className="eyebrow">
          <span />
          Documentos legais
        </p>
        <h1>{titulo}</h1>
        <p className="legal-vigencia">Versão em vigor desde {VIGENCIA_LEGAL}</p>
        <p className="legal-resumo">{resumo}</p>
        {children}
      </article>

      <footer className="legal-foot">
        <nav className="legal-outros">
          {DOCUMENTOS.filter((doc) => doc.href !== atual).map((doc) => (
            <a key={doc.href} href={doc.href}>
              {doc.label}
            </a>
          ))}
          <Link to="/login">Área do aluno</Link>
        </nav>
        <span>© 2026 Carla Patrícia Medina. Todos os direitos reservados.</span>
      </footer>
    </main>
  )
}

/**
 * Linha de base legal fechando uma seção — "Base legal: art. 7º, V, da LGPD".
 * É o formato que os documentos de proteção de dados usam pra amarrar cada
 * tratamento descrito ao dispositivo que o autoriza (art. 9º da LGPD).
 */
export function BaseLegal({ children }: { children: ReactNode }) {
  return (
    <p className="legal-base">
      <b>Base legal:</b> {children}
    </p>
  )
}
