import { Link } from '@tanstack/react-router'
import { Button, NotFoundState } from 'app-packs-ui'

/** Used as the router's `defaultNotFoundComponent`. */
export function NotFound() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6">
      <NotFoundState
        action={
          <Button asChild size="small">
            <Link to="/">Back home</Link>
          </Button>
        }
      />
    </div>
  )
}
