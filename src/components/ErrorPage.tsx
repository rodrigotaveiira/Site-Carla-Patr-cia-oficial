import { RotateCw } from 'lucide-react'
import { useEffect } from 'react'

// Tela de erro do site inteiro.
//
// Registrada como `defaultErrorComponent` do router, em src/router.tsx, e nao
// como `errorComponent` do __root: o errorComponent da raiz so pega erro da
// propria raiz. Um erro no loader de /, que foi o caso da #342, pertence a
// rota / — sem o default no router, ele cai no componente padrao da biblioteca
// mesmo com a raiz tendo o seu. Verificado renderizando o bundle de servidor.
//
// Sem isto, qualquer falha de renderizacao cai no ErrorComponent padrao do
// TanStack Router: "Something went wrong! / Show Error", em ingles, numa pagina
// sem mais nada. Em outubro/2026 essa tela foi parar no Google COMO O TITULO E
// A DESCRICAO do site (ver #342): o Googlebot executa JavaScript e indexa o DOM
// renderizado, entao ele guardou a tela de erro em vez da home — e como nao
// sobrava nenhum outro texto na pagina, a unica frase visivel virou o nome do
// site no resultado da busca.
//
// A regra desta tela, por isso, e: mesmo quebrada, a pagina continua se
// apresentando como o site da Carla.
//
//  - NAO mexe no title nem na description: os do __root (ou os da propria
//    pagina) seguem valendo, entao o resultado da busca continua lendo
//    "Carla Patricia Medina | Redacao e Gramatica".
//  - O texto visivel comeca pelo nome e pelo que ela faz, nao pelo erro. Se o
//    buscador reescrever o snippet a partir do que esta na tela — foi o que
//    aconteceu em outubro — ele tem conteudo de verdade pra usar.
//  - O aviso da falha vem depois, discreto, com o caminho de volta.
//
// Sem `noindex` de proposito: numa falha na home, pedir pra desindexar e pior
// que o problema — tiraria a home da busca de vez. Melhor o buscador ler uma
// pagina magra, porem correta, do que nenhuma.
export function ErrorPage({ error }: { error: Error }) {
  // A falha em si nao pode sumir: fica no console pra quem for investigar.
  useEffect(() => {
    console.error('Erro na renderizacao da pagina:', error)
  }, [error])

  return (
    <main className="panel" style={{ textAlign: 'center' }}>
      <a
        className="brand"
        href="/"
        aria-label="Carla Patrícia Medina — início"
        style={{ margin: '0 auto' }}
      >
        <span className="brand-mark">
          <img src="/logo-icone.png" alt="Carla Patrícia Medina" />
        </span>

        <span>
          <b>Carla Patrícia Medina</b>
          <small>Redação e Gramática</small>
        </span>
      </a>

      <p
        style={{
          maxWidth: 440,
          margin: '22px auto 0',
          fontSize: 14.5,
          lineHeight: 1.6,
          color: 'var(--muted)',
        }}
      >
        Carla Patrícia Medina é professora de Redação e Gramática. Aulas,
        correções personalizadas e preparação para ENEM, vestibulares e
        concursos.
      </p>

      <div className="designed-empty" style={{ padding: '30px 0 18px' }}>
        <span className="designed-empty-icon">
          <RotateCw />
        </span>

        <b style={{ fontSize: 17 }}>Esta página não carregou agora</b>

        <p>
          Costuma ser passageiro — recarregar já resolve. Se continuar assim, é
          só chamar a professora que ela dá um jeito.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 10,
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => window.location.reload()}
        >
          Recarregar a página
        </button>

        <a className="btn btn-ghost" href="/">
          Ir para o início
        </a>
      </div>

      <p style={{ marginTop: 26, fontSize: 13, color: 'var(--muted)' }}>
        <a href="https://wa.me/5522999325306">WhatsApp</a>
        {' · '}
        <a href="https://instagram.com/carlapatricia.medina">Instagram</a>
        {' · '}
        <a href="mailto:contato.carlapatriciamedina@gmail.com">E-mail</a>
      </p>
    </main>
  )
}
