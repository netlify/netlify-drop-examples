// `npm run dev -- <deck>` and `npm run export -- <deck>`: runs Slidev on decks/<deck>.md
// (the first deck alphabetically when none is given).
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { listDecks, root } from './decks.mjs'

const [command, name, ...rest] = process.argv.slice(2)
const decks = listDecks()
const deck = name && !name.startsWith('-') ? decks.find(d => d.slug === name.replace(/^decks\//, '').replace(/\.md$/, '')) : decks[0]
if (!deck) {
  console.error(`No deck named "${name}". Available: ${decks.map(d => d.slug).join(', ')}`)
  process.exit(1)
}
const extra = name?.startsWith('-') ? [name, ...rest] : rest
const args = command === 'dev' ? [deck.file, '--remote', ...extra] : [command, deck.file, '--output', `${deck.slug}.pdf`, ...extra]
const result = spawnSync(path.join(root, 'node_modules', '.bin', 'slidev'), args, { cwd: root, stdio: 'inherit' })
process.exit(result.status ?? 1)
