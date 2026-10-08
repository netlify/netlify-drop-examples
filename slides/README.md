# Slides

A [Slidev](https://sli.dev) deck template. Write slides in Markdown, style them
with one CSS file, and deploy the result to Netlify as a static site. The repo
holds any number of decks, and the site's home page lists them all.

The demo decks are a seed pitch for an invented company, Echo, an AI note-taking
tool, and a short guide to adding decks. All names and figures in them are made
up. Replace them with your own.

Based on [netlify-labs/netlify-slidev-template](https://github.com/netlify-labs/netlify-slidev-template),
with a neutral look.

## Publish it

Pick this project on [Netlify Drop](https://app.netlify.com/drop?example=slides).
Drop detects the Slidev setup and builds it for you. Unlike the one-page
projects in the gallery, this one needs a build, so you will be asked to sign up
or log in first; your project is kept and deploys as soon as you have an account.

## Commands

```bash
npm install                  # install dependencies
npm run dev                  # dev server for the first deck (binds to the network, --remote)
npm run dev -- quickstart    # dev server for decks/quickstart.md
npm run build                # index page plus every deck, into dist/
npm run export -- echo       # PDF export of decks/echo.md to echo.pdf
```

`npm run export` needs a browser. Run `npx playwright install chromium` once
before the first export.

## Decks

Each Markdown file in `decks/` is a deck, served at `/<file name>/` (so
`decks/echo.md` is `/echo/`). The home page, `/`, lists every deck with its
`title` from the frontmatter (sorted by title), as a grid of cards with a thumbnail of
each deck's first slide, or as a dense list that also shows each deck's `info` line (toggle at the top right; the choice is
remembered). Thumbnails are live, scaled-down copies of the first slide, so they
never go stale and the build needs no browser. The list view doesn't load them.

To add a deck:

1. Create `decks/my-deck.md`. Use lowercase letters, numbers and dashes in the
   file name. Copy the headmatter from an existing deck.
2. Give it a `title`. Optionally set `info`, a one-line description shown in the
   list view of the home page.
3. Run `npm run dev -- my-deck` to preview it.

Decks must be flat files in `decks/`. Nested folders don't work: Slidev builds
each file into a folder named after the file alone, so two decks called `one.md`
in different folders would overwrite each other, and it only reads shared files
(`style.css`, `components/`, `public/`) from the folder of the first deck. Decks are listed together, sorted by title.

All decks share the theme, components and files in `decks/` (`style.css`,
`components/`, `setup/`, `public/`, and the slide panel files).

`npm run build` empties `dist/`, writes `dist/index.html` (`scripts/build-index.mjs`),
then runs `slidev build` once per deck with `--base /<slug>/` and
`--out dist/<slug>` (`scripts/build-decks.mjs`). Slidev takes one base path per
build, so a single call can't give each deck its own path. The script also writes
`dist/_redirects` so deep links such as `/echo/4` reach the deck.

The slide panel has an "All decks" icon that links back to the home page.

## Add a slide

Slides are separated by a line containing `---` in the deck file.

1. Copy a block that looks like the slide you want.
2. Paste it after a `---` separator.
3. Change the text.

To apply a class to a whole slide, add per-slide frontmatter right after the
separator:

```md
---
class: hero-slide
---
```


## Slide panel

The deck opens with a thumbnail panel on the left. Click a thumbnail to jump to
that slide.

- Press `b`, use the panel icon in the nav bar, or use the button at the top of
  the panel to hide or show it. The choice is remembered in the browser.
- While the panel is hidden, move the pointer to the left edge of the window to
  preview it over the slide. The pin button at the top of the preview keeps it
  open.
- Slides change instantly. To animate, add `transition: slide-left` (or another
  Slidev transition) to the deck's headmatter. Clicking a thumbnail always
  jumps without animation.
- Press `p` or click the play button at the top of the panel to present: the deck
  goes fullscreen from the current slide.
- Press `f` or use the fullscreen button in the nav bar to toggle fullscreen. The
  panel hides while fullscreen.
- On screens narrower than 768px the panel becomes a drawer from the bottom.
  Tap the slide-number pill to open it; Slidev's own nav bar is hidden there.
  The nav bar's edit buttons are hidden with it, so text editing needs a wider screen.
- Notes: signed-in editors see a notebook icon in the panel footer (in the
  drawer header on small screens). It opens a notes pane along the bottom of the
  page, and the slide shrinks to fit. Type a note for the slide and click away or
  press Cmd/Ctrl+Enter to save; Esc discards your changes. Notes need
  `editing: true` and Netlify Identity, are stored per deck in the same Netlify
  Blobs store as text edits, and are readable only by signed-in editors. A note
  is tied to the slide's number and title (or its opening text when it has no
  heading). Moving a slide keeps its note; renaming it detaches the note, so the
  pane shows it as an earlier note and saving re-attaches it.
- The panel does not appear in the overview (`o`) or in exported PDFs.

Slidev's right-click menu is turned off (`contextMenu: false`), so right-click
opens the browser's own menu.

Presenter mode is turned off (`presenter: false` in the deck's headmatter),
so there is no presenter view or speaker-notes screen.

## Edit text on a slide

Signed-in editors can change the text on any slide from the browser, and the
changes stay for everyone who opens the deck.

- Click the pencil in the nav bar (it appears when Netlify Identity is on).
  Signed-out visitors are asked to log in. Edit the dashed text, then use the
  check mark to save, or the pencil again to cancel. The reset icon restores the
  slide's original text.
- Editing changes text only. Layout, images and styles stay as written, and Enter
  and formatting are blocked.
- Edits are stored in Netlify Blobs, not in the deck file. Each one is matched by
  slide number and a hash of the original text, so reordering slides keeps them,
  and changing a line in the deck drops the edit for that line.
- Deploy Previews keep their own edits, separate from the live site.
- Edits show on the deployed site only. They don't appear in `npm run dev` or in
  `npm run export`.

### Set it up

Editing is off in this demo deck (`editing: false` in the deck's
headmatter): no pencil, no Identity calls, no `/api/edits` requests. Set
`editing: true` to turn it on, then:

1. In the Netlify dashboard, open Identity for the project and enable it.
2. Under Registration, choose Invite only.
3. Invite the people who should edit. Anyone who signs up from an invite becomes
   an editor (`netlify/functions/identity.mts`).

Identity doesn't run under `netlify dev`. Test sign-in on a deploy or a Deploy
Preview. With `editing: true` but Identity not enabled, the deck works as before and
the pencil is hidden.

## Dark mode

The deck follows the system colour scheme. The sun/moon button at the bottom of the
slide panel (and the sun/moon in the nav bar) flips it, and the choice is remembered in the browser. Slidev adds a `dark` class to the page, and the `html.dark` block in
`style.css` swaps the tokens. The chart redraws when the scheme changes. To pin
one scheme, set `colorSchema: light` or `colorSchema: dark` in the deck's
headmatter.

## Restyle the deck

All colours, fonts and the corner mark come from the token block at the top of
`decks/style.css`. To restyle:

1. Edit the values in `:root` (`--ink`, `--accent`, `--cover-from`, and so on).
   Dark mode values sit in the `html.dark` block just below, and only list the
   tokens that change.
2. Replace `decks/public/bg/content.svg` (small mark, bottom-right of content slides)
   and `decks/public/bg/cover.svg` (cover texture). Set `--cover-image: none` to drop
   the texture.
3. Change the `fonts:` entry in the deck's headmatter. Slidev loads the
   fonts from Google Fonts at build time.

## Layout classes

Defined in `decks/style.css`. The demo deck uses most of them. The others (`compare`,
`timeline`, `ladder`, `security-list`, `video`) are ready to copy from the
class names below.

| Class | Use |
| --- | --- |
| `cover`, `cover-shell`, `cover-body` | Title slide. Set `class: ... cover no-mark` in the headmatter. |
| `hero-slide`, `hero` | Full-bleed statement with a large title and a lead paragraph. |
| `section-mark`, `subtitle` | Small eyebrow above a heading, and a one-line subtitle. |
| `cols` | Four columns of mono heading plus text, no boxes. |
| `compare` | Two columns of list items, for before and after. |
| `timeline` | Four steps joined by a line. |
| `ladder`, `rung` | Label and description rows with thin rules. |
| `security-list`, `security-item` | Check list: a tick, a bold label and a line of detail. |
| `split`, `screen-frame`, `screen-note` | Text on the left, framed image on the right. |
| `chart-frame` + `<SlideChart>` | Chart.js bar or line chart that takes its colours from the tokens. Data is passed as `:labels` and `:series`. |
| `video`, `video feature` | Embedded video, full width or centred. |
| `story-slide`, `story` | Closing slide with three numbered acts. |
| `accent-mark`, `accent-mark-2` | Colour a word with the accent or secondary token. |
| `caption`, `tldr`, `badges` | Small helpers for notes and call-outs. |

## Slidev gotchas

- Images from `decks/public/` go through `<DeckImg src="/screens/shot.png" alt="..." />`.
  Decks are served under their own path (`/echo/`), and a plain `<img src="/...">`
  or `:src="'/...'"` would miss it. CSS `url(...)` values are fine.
- Put all custom CSS in `decks/style.css`. Slidev picks it up automatically.
- Files in `decks/public/` are copied into each deck's folder.
- The dev script uses `--remote`, so the dev server is reachable from other
  devices on your network.

## Deploy to Netlify

`netlify.toml` sets the build command (the index script, then the deck builds,
which is what `npm run build` runs) and publish directory (`dist`). The config
also sets `NODE_VERSION` and skips the
Playwright browser download, which only `npm run export` needs.

To keep deploying after the first publish, put the project in a Git repository
and link it in Netlify. It builds on every push. Pull requests get a
Deploy Preview.
