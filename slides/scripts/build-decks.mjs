// Builds every deck in decks/ into dist/<slug>/ with its own base path, then
// writes dist/_redirects so deep links like /<slug>/3 reach the deck.
//
// Slidev builds one base path per call, and uses the folder of the first entry as
// its project root, so each deck gets its own `slidev build` call.
import { spawnSync } from 'node:child_process'
import { appendFileSync } from 'node:fs'
import path from 'node:path'
import { distDir, listDecks, root } from './decks.mjs'

const slidev = path.join(root, 'node_modules', '.bin', 'slidev')
const decks = listDecks()

for (const deck of decks) {
  console.log(`\n== ${deck.slug} (${deck.title}) -> dist/${deck.slug}/`)
  const result = spawnSync(
    slidev,
    ['build', deck.file, '--base', `/${deck.slug}/`, '--out', path.join(distDir, deck.slug)],
    { cwd: root, stdio: 'inherit' },
  )
  if (result.status !== 0)
    process.exit(result.status ?? 1)
}

// Slidev writes a _redirects file inside each deck folder, but Netlify only reads
// the one at the root of the publish directory.
appendFileSync(
  path.join(distDir, '_redirects'),
  `${decks.map(deck => `/${deck.slug}/*    /${deck.slug}/index.html   200`).join('\n')}\n`,
)
