# Working on this site

A single-page profile site. Static HTML, CSS, and one small JavaScript file.
There is no build step, no package manager, and no framework.

## Where things are

- `index.html`, the entire page. The icon sprite (`<symbol>` definitions) sits
  at the bottom; reference an icon with `<use href="#icon-name" />`.
- `styles.css`, all styling. Every color, font, rule, and width is a custom
  property in the `:root` block at the top of the file.
- `script.js`, theme toggle and copy-link button. Both are progressive
  enhancements; the toolbar is `hidden` in the markup until this file runs.
- `assets/avatar.svg`, `favicon.svg`, images.

Blocks that a person is likely to want changed are wrapped in `EDIT ME`
comments. Prefer editing inside those blocks over restructuring around them.

## Rules

**Do not add a `package.json`, a lockfile, or a `netlify.toml` with a `[build]`
section.** This site is published by uploading the folder exactly as it is, and
those files turn it into something that has to be built first.

For the same reason, do not introduce a bundler, a CSS preprocessor, a
framework, or anything that turns `index.html` into generated output. If a
change seems to need a build step, it does not belong in this project.

Also avoid:

- Directories named `dist`, `build`, or `node_modules`. Nothing here should be
  generated output, and upload tools routinely strip those names.
- Renaming `index.html`. It must stay at the folder's root.
- External requests at runtime (CDN fonts, analytics, remote images). The site
  should work opened straight from disk, offline.

## The design is flat on purpose

No gradients, no drop shadows, no rounded corners, no transitions, no keyframe
animation. Hierarchy comes from hairline rules, alignment, and type size.

Keep it that way unless asked otherwise. In particular, do not "improve" the
link list into cards with shadows and hover lifts. The flat rows are the design,
not an unfinished state.

There is currently no `prefers-reduced-motion` block in `styles.css` because
nothing moves. If you ever do add motion, add that block back and gate the
motion behind it.

## Conventions

- Semantic HTML first: `<button>`, `<a>`, `<nav>`, `<ul>`. Reach for ARIA only
  when no element does the job.
- One `<h1>` (the person's name); section headings are `<h2>`.
- Add new colors as custom properties in `:root` and in **both** dark-theme
  blocks in `styles.css`, the `[data-theme='dark']` selector and the
  `prefers-color-scheme: dark` media query. They are kept in sync by hand.
- Keep decorative images, icons, and the link numbers out of the accessibility
  tree (`alt=""` or `aria-hidden="true"`).
- The link numbers are hand-written. Renumber them if you add or reorder links.
- SVG files are XML, so **a comment inside one can never contain two hyphens in
  a row**. Writing a custom property name such as the accent color token into an
  SVG comment makes the whole file fail to parse, and the browser shows a broken
  image with no console error.
- Keep the whole site comfortably under a megabyte. Prefer SVG over photos.

## Checking your work

Open `index.html` in a browser. That is the full test suite. Confirm:

1. Light and dark both look right. The toggle in the top-right corner writes to
   `localStorage`, so clear that key if you want to re-test the operating-system
   default.
2. Tab through the page: skip link first, then every link and button reachable
   with a visible focus outline.
3. Narrow the window to phone width; nothing should overflow sideways.
4. Disable JavaScript; the page should still read correctly, minus the toolbar.
5. If you touched an SVG, confirm the image still renders. A malformed SVG fails
   silently.
