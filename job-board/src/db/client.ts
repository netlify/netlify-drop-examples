import { Pool, neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/netlify-db'
import { getDatabaseConnection } from '@/config/flags'

// This app uses Drizzle's plain query builder (`db.select().from(jobs)`,
// etc.), so table objects are imported directly from `./schema` wherever
// needed instead of being registered here.
// `drizzle` is overloaded many times over; `ReturnType<typeof drizzle>`
// on its own resolves to whichever overload TS happens to pick (not
// necessarily the zero-arg one we actually call), which then disagrees
// with the real call below. Routing through this unexported helper pins
// the cached type to the exact zero-arg call we make.
function createDb() {
  const { url, useServerDriver } = getDatabaseConnection()
  if (useServerDriver) {
    // Only the zero-arg form switches to node-postgres for
    // NETLIFY_DB_DRIVER=server; `drizzle({ connection })` always builds the
    // Neon HTTP client, which can't reach a plain local Postgres.
    return drizzle()
  }

  // drizzle-orm's netlify-db driver calls the Neon HTTP client as
  // `http(sqlText, params, options)`. @neondatabase/serverless 1.x (which
  // @netlify/database pulls in) throws on that form — "This function can now
  // be called only as a tagged-template function" — so every query fails on a
  // deployed site. Neon's `.query()` is the conventional-call form, so route
  // the call there. Drop this wrapper and go back to a bare `drizzle()` once
  // drizzle-orm's adapter does the same.
  const http = neon(url)
  const compatHttp = Object.assign(
    (text: string, params?: unknown[], options?: Parameters<typeof http.query>[2]) =>
      http.query(text, params, options),
    http,
  )
  return drizzle({ client: { http: compatHttp, pool: new Pool({ connectionString: url }) } })
}

let cached: ReturnType<typeof createDb> | undefined

/**
 * Lazily creates (and caches) the Drizzle client on first use.
 *
 * IMPORTANT: `drizzle-orm/netlify-db`'s `drizzle()` throws synchronously if
 * `NETLIFY_DB_URL` isn't set. Building the client eagerly at module scope
 * would therefore crash the whole app on import in demo mode (no database
 * configured). Every caller lives in the `else` branch of an
 * `if (isDemoMode())` check in `src/data/*.ts`, so this only ever runs when
 * a real database is expected to exist.
 */
export function getDb() {
  if (!cached) {
    cached = createDb()
  }
  return cached
}
