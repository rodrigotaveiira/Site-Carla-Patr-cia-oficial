export const SITE_URL = 'https://carlapatriciamedina.com'

// Páginas privadas: sobrescreve o padrão e some da busca.
//
// Vale só pras páginas que respondem 200 pra visitante anônimo. As rotas com
// `beforeLoad` redirecionam quem não está logado pro /login, então o buscador
// nunca chega a renderizar o HTML delas e nunca leria esta meta; essas ficam no
// robots.txt.
export const noindexHead = () => ({
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

/**
 * Canonical apontando pra própria página.
 *
 * Existe porque o `__root.tsx` emitia um canonical fixo da home em TODAS as
 * rotas — o que fazia /lgpd, /privacidade e /termos se declararem duplicatas da
 * home e pedirem pra sair do índice. Canonical é por página, nunca global.
 *
 * `path` começa com barra: canonicalHead('/lgpd').
 */
export function canonicalHead(path: string) {
  const href = path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`
  return () => ({
    links: [{ rel: 'canonical', href }],
    meta: [{ property: 'og:url', content: href }],
  })
}
