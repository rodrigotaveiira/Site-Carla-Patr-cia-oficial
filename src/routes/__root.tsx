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
        <span className="designed-empty-icon"><Compass /></span>
        <b style={{ fontSize: 17 }}>Essa página não existe</b>
        <p>O endereço que você tentou abrir não existe ou foi movido. Confira o link ou volte para um lugar conhecido.</p>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
        <Link to="/dashboard" className="btn btn-primary">Ir para o dashboard</Link>
        <Link to="/" className="btn btn-ghost">Voltar para o início</Link>
      </div>
    </main>
  )
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Carla Patrícia Medina | Redação e Língua Portuguesa' },
      {
        name: 'description',
        content:
          'Aulas de Redação, Gramática e Língua Portuguesa com correção personalizada para ENEM, vestibulares e concursos.',
      },
      { name: 'theme-color', content: '#0F2D52' },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: 'Carla Patrícia Medina | Sua aprovação começa aqui' },
      {
        property: 'og:description',
        content: 'Metodologia exclusiva, correção individual e acompanhamento completo para sua aprovação.',
      },
      { name: 'twitter:card', content: 'summary_large_image' },
      {
        property: 'og:image',
        content: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=85',
      },
    ],
    links: [
      { rel: 'canonical', href: 'https://carlapatriciamedina.com/' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
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
              '@type': 'EducationalOrganization',
              name: 'Carla Patrícia Medina',
              description: 'Cursos de Redação, Gramática e Língua Portuguesa.',
              url: 'https://carlapatriciamedina.com/',
              areaServed: 'Brasil',
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
