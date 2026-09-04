import { HeadContent, Link, Scripts, createRootRoute } from '@tanstack/react-router'
import { Compass } from 'lucide-react'
import { CallbackHandler } from '@/components/CallbackHandler'
import { IdentityProvider } from '@/lib/identity-context'
import { ToastProvider } from '@/lib/toast'
import '../styles.css'

function NotFoundPage() {
  return (
    <main className="panel" style={{ textAlign: 'center' }}>
      <div className="designed-empty" style={{ padding: '60px 0 20px' }}>
        <span className="designed-empty-icon">
          <Compass />
        </span>

        <b style={{ fontSize: 17 }}>Essa página não existe</b>

        <p>
          O endereço que você tentou abrir não existe ou foi movido.
          Confira o link ou volte para um lugar conhecido.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 10,
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginTop: 8,
        }}
      >
        <Link to="/dashboard" className="btn btn-primary">
          Ir para o dashboard
        </Link>

        <Link to="/" className="btn btn-ghost">
          Voltar para o início
        </Link>
      </div>
    </main>
  )
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },

      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },

      {
        title: 'Carla Patrícia Medina | Redação e Gramática',
      },

      {
        name: 'description',
        content:
          'Carla Patrícia Medina é professora de Redação e Gramática. Aulas, correções personalizadas e preparação para ENEM, vestibulares e concursos.',
      },

      {
        name: 'theme-color',
        content: '#0F2D52',
      },

      // Open Graph — Facebook, WhatsApp e outros compartilhamentos
      {
        property: 'og:type',
        content: 'website',
      },

      {
        property: 'og:site_name',
        content: 'Carla Patrícia Medina',
      },

      {
        property: 'og:locale',
        content: 'pt_BR',
      },

      {
        property: 'og:image',
        content:
          'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=85',
      },

      {
        property: 'og:image:alt',
        content: 'Carla Patrícia Medina — Redação e Gramática',
      },

      // Twitter / X
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },

      {
        name: 'twitter:image',
        content:
          'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=85',
      },
    ],

    links: [
      // O Google so usa o favicon nos resultados se ele estiver declarado numa tag
      // `icon` — achar /favicon.ico pelo caminho padrao nao basta. O .ico carrega
      // 16/32/48 e o PNG de 192 atende a preferencia do Google por >= 48px.
      {
        rel: 'icon',
        href: '/favicon.ico',
        sizes: '16x16 32x32 48x48',
      },

      {
        rel: 'icon',
        type: 'image/png',
        href: '/icon-192.png',
        sizes: '192x192',
      },

      // O iOS pinta transparencia de preto, entao este vai com fundo solido.
      {
        rel: 'apple-touch-icon',
        href: '/apple-touch-icon.png',
        sizes: '180x180',
      },

      {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },

      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },

      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Manrope:wght@400;500;600;700;800&display=swap',
      },
    ],
  }),

  shellComponent: RootDocument,
  notFoundComponent: NotFoundPage,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Person',

              name: 'Carla Patrícia Medina',

              jobTitle: 'Professora de Redação e Língua Portuguesa',

              description:
                'Professora de Redação e Gramática com mais de 22 anos de experiência, oferecendo aulas, correções e preparação para ENEM, vestibulares e concursos.',

              url: 'https://carlapatriciamedina.com/',

              sameAs: [
                'https://instagram.com/carlapatricia.medina',
              ],

              knowsAbout: [
                'Redação',
                'Gramática',
                'Língua Portuguesa',
                'ENEM',
                'Vestibulares',
                'Concursos',
              ],

              worksFor: {
                '@type': 'EducationalOrganization',
                name: 'Carla Patrícia Medina — Redação e Gramática',
                url: 'https://carlapatriciamedina.com/',
              },
            }),
          }}
        />
      </head>

      <body>
        <IdentityProvider>
          <ToastProvider>
            <CallbackHandler>{children}</CallbackHandler>
          </ToastProvider>
        </IdentityProvider>

        <Scripts />
      </body>
    </html>
  )
}