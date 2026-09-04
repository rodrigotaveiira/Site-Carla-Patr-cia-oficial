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

type PageSeo = {
  /** Caminho da própria página, começando com barra: '/lgpd'. */
  path: string
  /** Sem isto a página herda o título da home e some no meio dos resultados. */
  title?: string
  description?: string
  /**
   * Só vale a pena declarar quando a intenção precisa ficar explícita — sem
   * nenhuma meta `robots`, o padrão do Google já é indexar.
   */
  robots?: string
}

/**
 * Head de uma página pública: canonical, og:url e, quando informados, título e
 * descrição próprios.
 *
 * Existe porque o `__root.tsx` falava pelas outras rotas. O canonical fixo da
 * home fazia /lgpd, /privacidade e /termos se declararem duplicatas dela, e o
 * título e a descrição de fallback faziam as três aparecerem na busca com o
 * mesmo texto da home. As duas coisas são por página, nunca globais.
 */
export function pageHead({ path, title, description, robots }: PageSeo) {
  const href = path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`

  const meta: Record<string, string>[] = [{ property: 'og:url', content: href }]

  if (robots) meta.push({ name: 'robots', content: robots })

  if (title) {
    meta.push({ title })
    meta.push({ property: 'og:title', content: title })
    meta.push({ name: 'twitter:title', content: title })
  }

  if (description) {
    meta.push({ name: 'description', content: description })
    meta.push({ property: 'og:description', content: description })
    meta.push({ name: 'twitter:description', content: description })
  }

  return () => ({
    meta,
    links: [{ rel: 'canonical', href }],
  })
}
