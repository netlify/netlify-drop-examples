# For coding agents

This repo is a Slidev deck template. It is not an app.

- **Decks** are the flat Markdown files in `decks/`, one per deck, served at
  `/<file name>/`. Nested folders don't work (see README > Decks). Slides are
  separated by `---`. Per-slide frontmatter
  (for example `class: hero-slide`) goes right after a separator.
- **All CSS lives in `decks/style.css`.** Colours, fonts and the corner mark come from
  the token block in `:root`. Use the tokens; don't hardcode colours. Dark mode overrides live in the
  `html.dark` block, so a new token needs a dark value there if it should change.
- **Assets** go in `decks/public/`. Reference images with
  `<DeckImg src="/screens/x.png" alt="..." />`, which adds the deck's base path.
  Shared files (`style.css`, `components/`, `setup/`, `public/`, the panel files)
  must stay in `decks/`: Slidev only reads them from the deck folder.
- **Layout classes** are listed in `README.md`. Reuse them before adding new CSS.
- **Slide panel** (thumbnail sidebar) lives in `decks/global-top.vue`, with its
  state in `decks/sidebar.ts`, the toggle in `decks/custom-nav-controls.vue` and
  the `b` shortcut in `decks/setup/shortcuts.ts`. Its styles are at the end of `style.css`. It imports
  Slidev client internals (`@slidev/client/...`), so re-check it after any
  Slidev upgrade. Presenter mode is off (`presenter: false`).
- **Build** with `npm run build`: `scripts/build-index.mjs` writes the home page,
  then `scripts/build-decks.mjs` builds each deck into `dist/<slug>/`. Check
  `dist/_redirects` lists every deck so deep links work on Netlify.
- **Text editing and slide notes** are the app features: `netlify/functions/edits.mts`
  and `notes.mts` (Blobs, sharing `netlify/lib/store.mts`) and `identity.mts`, with the
  client in `decks/edits.ts`, `decks/notes.ts`, `edits-core.ts`,
  `decks/components/EditLogin.vue`, `decks/components/NotesPane.vue` and the nav
  button in `decks/custom-nav-controls.vue`. Edits are an overlay keyed by a hash
  of the original text; the deck file is never rewritten, and edits are stored per
  deck. Notes are keyed by slide number plus a hash of the slide's title, and
  unlike edits they are readable only by logged-in editors. Both are off by
  default (`editing: false` in the deck's headmatter, the demo setting);
  `editing: true` enables them.
- **Don't reintroduce other app code.** No further server routes, database or UI
  component libraries. The TanStack Start template this repo started from was
  removed on purpose.
