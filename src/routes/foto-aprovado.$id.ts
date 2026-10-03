import { createFileRoute } from '@tanstack/react-router'
import { lerFotoAprovado } from '@/lib/aprovados.server'

// Foto pública da Galeria dos Aprovados, servida como imagem de verdade em vez
// de base64 dentro do HTML da home (issue #316). Pública como a própria
// galeria: só devolve a foto que a professora cadastrou pra vitrine.
export const Route = createFileRoute('/foto-aprovado/$id')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const foto = await lerFotoAprovado(params.id)
        if (!foto) return new Response('Not found', { status: 404 })
        return new Response(foto.bytes, {
          headers: {
            'Content-Type': foto.mime,
            // Ver toPublic em aprovados.ts: id único + foto não editável.
            'Cache-Control': 'public, max-age=31536000, immutable',
            // Na CDN, só 1 dia: se a professora excluir um aprovado, a foto
            // para de ser servida publicamente no dia seguinte, não daqui a um ano.
            'Netlify-CDN-Cache-Control': 'public, max-age=86400',
          },
        })
      },
    },
  },
})
