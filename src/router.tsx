import { createRouter } from '@tanstack/react-router'

// Import the generated route tree
import { ErrorPage } from './components/ErrorPage'
import { routeTree } from './routeTree.gen'

// Create a new router instance
export const getRouter = () => {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,

    // Vale pra toda rota que nao declare a sua. Ver src/components/ErrorPage.tsx.
    defaultErrorComponent: ErrorPage,
  })

  return router
}
