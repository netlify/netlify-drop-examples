import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { NotFound } from '@/components/states/not-found'
import { RouteErrorBoundary } from '@/components/states/error-state'
import { LoadingState } from '@/components/states/loading-state'

export function getRouter() {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultNotFoundComponent: NotFound,
    defaultErrorComponent: RouteErrorBoundary,
    defaultPendingComponent: () => <LoadingState variant="page" />,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
