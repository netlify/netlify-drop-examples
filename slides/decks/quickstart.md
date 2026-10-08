---
theme: default
title: Quickstart Guide
info: |
  A short guide to adding a deck. Shows that more than one deck can live in
  this repo.
class: text-left cover no-mark
highlighter: shiki
drawings:
  persist: false
# No `transition:` here, so slides change instantly. Add e.g. `transition: slide-left` to animate.
mdc: true
presenter: false
# Turns off Slidev's right-click menu (the browser's own menu still opens).
contextMenu: false
# Text editing. Set to false for a demo with no editing and no Netlify Identity calls.
editing: false
fonts:
  sans: Inter
  mono: IBM Plex Mono
---

<div class="cover-shell">
  <div class="cover-head">
    <div class="cover-mark">
      <span class="cover-series">Slides App Pack</span>
    </div>
    <p class="cover-series">Guide</p>
  </div>

  <div></div>

  <div class="cover-body">
    <h1>Add a deck<br />in three steps.</h1>
    <p class="subtitle">
      Every Markdown file in <code>decks/</code> becomes its own deck on its own path.
    </p>
    <p class="cover-author">A second demo deck, to show multiple decks in one site.</p>
  </div>
</div>

---

<span class="section-mark">The steps</span>

# From file to live URL

<div class="split">
  <div class="screen-note">
    <p>Each deck is one Markdown file with its own title in the frontmatter.</p>
    <ul>
      <li>Create <code>decks/my-deck.md</code></li>
      <li>Run <code>npm run dev -- my-deck</code></li>
      <li>Push, and it appears at <code>/my-deck/</code></li>
    </ul>
  </div>
  <div class="screen-frame">
    <DeckImg src="/screens/quickstart-steps.svg" alt="Diagram of the three steps: write, preview, deploy" />
  </div>
</div>

---

<span class="section-mark">Good to know</span>

# What every deck shares

<p class="subtitle">One theme, one set of layouts and one slide panel, so new decks match the others.</p>

<div class="security-list">
  <div class="security-item">
    <span class="check">✓</span>
    <div><strong>Styles</strong><p>Colours and fonts come from the token block in <code>decks/style.css</code>.</p></div>
  </div>
  <div class="security-item">
    <span class="check">✓</span>
    <div><strong>Index page</strong><p>The home page lists every deck, with its title from the frontmatter.</p></div>
  </div>
  <div class="security-item">
    <span class="check">✓</span>
    <div><strong>Edits</strong><p>Text edits are saved per deck, so decks never overwrite each other.</p></div>
  </div>
</div>
