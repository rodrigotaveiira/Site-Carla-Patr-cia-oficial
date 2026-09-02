// O `__root.tsx` emite `robots: index, follow` como padrao global, entao toda pagina
// que nao deve aparecer na busca precisa sobrescrever isso — nao basta so nao declarar.
//
// Vale so pras paginas que respondem 200 pra visitante anonimo. As rotas com
// `beforeLoad` redirecionam quem nao esta logado pro /login, entao o buscador nunca
// chega a renderizar o HTML delas e nunca leria esta meta; essas ficam no robots.txt.
export const noindexHead = () => ({
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})
