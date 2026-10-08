// Pre-build step: empties dist/ and writes dist/index.html, a static page that
// links to every deck in decks/. The deck builds then fill in dist/<slug>/.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { distDir, listDecks } from './decks.mjs'

const escapeHtml = text => text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

const decks = listDecks()

const sections = `
    <ul class="decks">${decks.map(deck => `
      <li>
        <a href="/${deck.slug}/">
          <span class="thumb" aria-hidden="true">
            <iframe src="/${deck.slug}/1?embedded" title="" tabindex="-1" loading="lazy"></iframe>
          </span>
          <span class="meta">
            <strong>${escapeHtml(deck.title)}</strong>
            ${deck.info ? `<span class="info">${escapeHtml(deck.info)}</span>` : ''}
          </span>
        </a>
      </li>`).join('')}
    </ul>`

// Thumbnails are live, scaled-down copies of each deck's first slide, so they never
// go stale and the build needs no browser. They are hidden (and so never loaded) in
// the list view.
const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Slides</title>
  <style>
    :root { --paper: #fff; --ink: #1b2230; --body: #3a4252; --muted: #667085; --accent: #4f46e5; --rule: rgba(27, 34, 48, .12); --stage: #e9ebf0; }
    @media (prefers-color-scheme: dark) {
      :root { --paper: #151a23; --ink: #f1f3f8; --body: #c3c9d6; --muted: #8f98a8; --accent: #8f91fa; --rule: rgba(255, 255, 255, .13); --stage: #0c0f15; }
    }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: var(--stage); color: var(--body); font: 16px/1.5 Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
    main { max-width: 1040px; margin: 0 auto; padding: 4rem 1.5rem; }
    header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; }
    h1 { margin: 0; color: var(--ink); font-size: 2rem; letter-spacing: -.01em; }
    .toggle { display: inline-flex; padding: 2px; border: 1px solid var(--rule); border-radius: 8px; background: var(--paper); }
    .toggle button { display: grid; place-items: center; width: 2rem; height: 1.75rem; padding: 0; border: 0; border-radius: 6px; background: transparent; color: var(--muted); cursor: pointer; }
    .toggle button:hover { color: var(--ink); }
    .toggle button[aria-pressed="true"] { background: var(--accent); color: var(--paper); }
    .toggle svg { width: 1rem; height: 1rem; }
    ul { margin: 0; padding: 0; list-style: none; }
    a { display: grid; border: 1px solid var(--rule); border-radius: 12px; background: var(--paper); color: inherit; text-decoration: none; overflow: hidden; }
    a:hover, a:focus-visible { border-color: var(--accent); outline: none; }
    strong { color: var(--ink); font-size: 1.05rem; }
    .info { color: var(--muted); font-size: .9rem; }
    [data-view="grid"] .info { display: none; }
    .meta { display: grid; gap: .25rem; padding: .9rem 1.1rem; }
    .thumb { position: relative; display: block; aspect-ratio: 16 / 9; overflow: hidden; background: var(--stage); border-bottom: 1px solid var(--rule); }
    .thumb iframe { position: absolute; top: 0; left: 0; width: 1280px; height: 720px; border: 0; transform-origin: 0 0; transform: scale(var(--s, .25)); pointer-events: none; }

    /* Grid view (default) */
    [data-view="grid"] .decks { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.25rem; }

    /* List view: dense rows, no thumbnails */
    [data-view="list"] .decks { display: grid; gap: .4rem; }
    [data-view="list"] a { grid-template-columns: minmax(10rem, 1fr) 2fr; align-items: baseline; border-radius: 8px; }
    [data-view="list"] .thumb { display: none; }
    [data-view="list"] .meta { display: contents; }
    [data-view="list"] strong { padding: .55rem 1rem; font-size: .95rem; }
    [data-view="list"] .info { padding: .55rem 1rem .55rem 0; font-size: .85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    @media (max-width: 560px) { [data-view="list"] a { grid-template-columns: 1fr; } [data-view="list"] .info { padding: 0 1rem .55rem; white-space: normal; } }
  </style>
</head>
<body>
  <main data-view="grid">
    <header>
      <h1>Slides</h1>
      <div class="toggle" role="group" aria-label="View">
        <button type="button" data-set-view="grid" aria-pressed="true" title="Grid view" aria-label="Grid view">
          <svg viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1.2"/><rect x="9" y="1" width="6" height="6" rx="1.2"/><rect x="1" y="9" width="6" height="6" rx="1.2"/><rect x="9" y="9" width="6" height="6" rx="1.2"/></svg>
        </button>
        <button type="button" data-set-view="list" aria-pressed="false" title="List view" aria-label="List view">
          <svg viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="2" width="14" height="2.4" rx="1.2"/><rect x="1" y="6.8" width="14" height="2.4" rx="1.2"/><rect x="1" y="11.6" width="14" height="2.4" rx="1.2"/></svg>
        </button>
      </div>
    </header>${sections}
  </main>
  <script>
    const main = document.querySelector('main')
    const buttons = document.querySelectorAll('[data-set-view]')
    function setView(view) {
      main.dataset.view = view
      buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.setView === view)))
      try { localStorage.setItem('index-view', view) } catch {}
      scale()
    }
    // Scale each 1280px-wide slide iframe to fit its card.
    function scale() {
      document.querySelectorAll('.thumb').forEach((t) => { if (t.clientWidth) t.style.setProperty('--s', t.clientWidth / 1280) })
    }
    buttons.forEach(b => b.addEventListener('click', () => setView(b.dataset.setView)))
    new ResizeObserver(scale).observe(main)
    let saved = null
    try { saved = localStorage.getItem('index-view') } catch {}
    setView(saved === 'list' ? 'list' : 'grid')
  </script>
</body>
</html>
`

rmSync(distDir, { recursive: true, force: true })
mkdirSync(distDir, { recursive: true })
writeFileSync(path.join(distDir, 'index.html'), html)
console.log(`index: ${decks.length} decks -> dist/index.html`)
