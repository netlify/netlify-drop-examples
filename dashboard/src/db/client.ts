import { drizzle } from 'drizzle-orm/netlify-db'

// NOTE: the installed drizzle-orm (1.0.0-rc.4) netlify-db driver's `drizzle()`
// config type does not accept a `schema` object (that option was removed in
// favor of the newer `relations` API for the relational query builder). This
// app only uses the plain query builder (`db.select().from(records)`, etc.),
// so table objects are imported directly from `./schema` wherever needed
// instead of being registered here.
// `drizzle` is overloaded many times over; `ReturnType<typeof drizzle>`
// on its own resolves to whichever overload TS happens to pick (not
// necessarily the zero-arg one we actually call), which then disagrees
// with the real call below. Routing through this unexported helper pins
// the cached type to the exact zero-arg call we make.
function createDb() {
  return drizzle()
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
