// Shared by the build scripts: finds the decks in decks/ and reads their frontmatter.
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const decksDir = path.join(root, 'decks')
export const distDir = path.join(root, 'dist')

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/

function readFrontmatter(file) {
  const match = readFileSync(file, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/)
  return match ? (parse(match[1]) ?? {}) : {}
}

/** One entry per decks/<slug>.md, sorted by title. */
export function listDecks() {
  const decks = readdirSync(decksDir)
    .filter(name => name.endsWith('.md'))
    .map((name) => {
      const slug = name.slice(0, -3)
      if (!SLUG_RE.test(slug))
        throw new Error(`decks/${name}: file names must be lowercase letters, numbers and dashes`)
      const data = readFrontmatter(path.join(decksDir, name))
      return {
        slug,
        file: path.join('decks', name),
        title: String(data.title ?? slug),
        info: data.info ? String(data.info).trim().replace(/\s+/g, ' ') : '',
      }
    })
    .sort((a, b) => a.title.localeCompare(b.title))
  if (!decks.length)
    throw new Error('No decks found: add a Markdown file to decks/')
  return decks
}
