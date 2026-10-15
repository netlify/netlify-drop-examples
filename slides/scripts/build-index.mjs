// Pre-build step: empties dist/ and writes dist/index.html, a static page that
// links to every deck in decks/. The deck builds then fill in dist/<slug>/.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { distDir, listDecks } from './decks.mjs'

const escapeHtml = text => text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

const decks = listDecks()
if (decks.some(deck => deck.slug === 'about'))
  throw new Error('decks/about.md would be served at /about/, which is the About page: rename the deck')

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

// The /about/ page, adapted from the app-pack template's About page: one card each for what
// the app is, where edits live, who can change things and how to publish. The home page only
// carries a short blurb that links here.
const icon = (inner, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`
const aboutCards = [
  { icon: '<path d="M2 3h20"/><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"/><path d="m7 21 5-5 5 5"/>', title: 'Your decks',
    description: 'Every deck on the home page is its own presentation.',
    body: 'To add or change a deck, edit its file in the decks folder. Your original slides always stay exactly as you wrote them.' },
  { icon: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>', title: 'Edits and notes',
    description: 'Text edits and slide notes are saved with Netlify.',
    body: 'Edits are saved on top of your slides, so the original is never changed. Edits show for everyone who opens the deck; notes stay private to people who are signed in.' },
  { icon: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>', title: 'Sign-in and permissions',
    description: 'Anyone who is signed in can change text and add notes.',
    body: 'Sign in from the pencil at the top of a deck. Invite only the people you want, since anyone who can sign in can edit. Sign-in is checked behind the scenes, not just hidden from view.' },
  { icon: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>', title: 'Publishing',
    description: 'Publish this app on Netlify when you are ready.', body: 'Deploy it from your Netlify dashboard. No GitHub account or code experience needed.' },
]
const aboutBody = `
    <section class="about" aria-labelledby="about-title">
      <a class="back" href="/">All decks</a>
      <div class="about-head">
        <h1 id="about-title">About Slides</h1>
      </div>
      <p class="about-intro">Make your own slide decks, let your team edit the text and add notes, and publish to Netlify.</p>
      <div class="about-cards">${aboutCards.map(card => `
        <article class="card">
          <span class="card-icon">${icon(card.icon)}</span>
          <div><h3>${escapeHtml(card.title)}</h3><p class="card-desc">${escapeHtml(card.description)}</p><p>${escapeHtml(card.body)}</p></div>
        </article>`).join('')}
      </div>
    </section>`

// Short blurb under the decks; the detail lives on /about/.
const blurb = `
    <section class="blurb" aria-labelledby="blurb-title">
      <h2 id="blurb-title">About this app</h2>
      <p>Make your own slide decks, let your team edit the text and add notes, and publish it all to Netlify in one click.</p>
      <a class="blurb-link" href="/about/">See everything you can configure${icon('<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>')}</a>
    </section>`


// Thumbnails are live, scaled-down copies of each deck's first slide, so they never
// go stale and the build needs no browser. They are hidden (and so never loaded) in
// the list view.
const head = title => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
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

    .blurb { display: grid; justify-items: start; gap: .5rem; max-width: 40rem; margin-top: 3rem; padding-top: 2rem; border-top: 1px solid var(--rule); }
    .blurb h2 { margin: 0; color: var(--ink); font-size: 1.25rem; letter-spacing: -.01em; }
    .blurb p { margin: 0; color: var(--muted); }
    a.blurb-link, a.back { display: inline-flex; align-items: center; gap: .4rem; border: 0; border-radius: 4px; background: none; color: var(--accent); font-weight: 600; }
    a.blurb-link:hover, a.back:hover { text-decoration: underline; }
    .blurb-link svg { width: 1rem; height: 1rem; }
    .about { display: grid; gap: .75rem; }
    a.back { justify-self: start; margin-bottom: 1rem; font-size: .9rem; }
    a.back::before { content: "\\2190"; }
    .about-head { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; }
    .about h1 { margin-right: .25rem; }
    .about p { margin: 0; }
    .about-intro { max-width: 48rem; color: var(--muted); }
    .about-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(420px, 100%), 1fr)); gap: 1rem; margin-top: .5rem; }
    .card { display: flex; gap: .75rem; padding: 1.1rem; border: 1px solid var(--rule); border-radius: 12px; background: var(--paper); }
    .card-icon { display: grid; place-items: center; width: 2.25rem; height: 2.25rem; flex: none; border-radius: 8px; background: var(--stage); color: var(--muted); }
    .card-icon svg { width: 1rem; height: 1rem; }
    .card h3 { margin: 0; color: var(--ink); font-size: 1rem; }
    .about .card-desc { margin: .15rem 0 .6rem; color: var(--muted); font-size: .9rem; }
    .card p:last-child { font-size: .875rem; line-height: 1.55; }

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
</head>`

const html = `${head('Slides')}
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
    </header>${sections}${blurb}
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
const aboutHtml = `${head('About Slides')}
<body>
  <main>${aboutBody}
  </main>
</body>
</html>
`
mkdirSync(path.join(distDir, 'about'))
writeFileSync(path.join(distDir, 'about', 'index.html'), aboutHtml)
console.log(`index: ${decks.length} decks -> dist/index.html, dist/about/index.html`)
