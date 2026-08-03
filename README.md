# netlify-drop-example-profile

A one-page profile site — your name, what you do, and the links you want people
to follow. Plain HTML, CSS, and a little JavaScript. No build step, no
dependencies, nothing to install.

This is the example site behind the **Start from an example** button on
[Netlify Drop](https://app.netlify.com/drop).

## Make it yours

Open `index.html` and `styles.css` in any editor. Everything you'd want to
change is marked with an `EDIT ME` comment:

| What                         | Where                                   |
| ---------------------------- | --------------------------------------- |
| Name, role, location         | `index.html` — the `<header>`           |
| Your links                   | `index.html` — the `<ul class="links">` |
| Other profiles               | `index.html` — the "Elsewhere" section  |
| Page title and share preview | `index.html` — the `<head>`             |
| Colors, fonts, spacing       | `styles.css` — the `:root` block at top |
| Profile picture              | `assets/avatar.svg`                     |

To use a photo instead of the illustrated avatar, drop it in `assets/` and
point the `<img class="profile__avatar">` `src` at it. Square images work best.

## Preview it

There is no dev server to run. Open `index.html` in your browser:

```sh
open index.html
```

## Publish it

Drag this folder onto [app.netlify.com/drop](https://app.netlify.com/drop) and
you'll get a live URL in a few seconds. No account needed to start.

## What's in here

```
index.html      the whole page, including the icon set at the bottom
styles.css      all the styling; design tokens live in :root
script.js       theme toggle and copy-link button (both optional)
assets/         profile picture
favicon.svg     browser tab icon
```

## About the design

Flat, by intention: no gradients, no drop shadows, no rounded corners, and no
animation anywhere. Structure comes from hairline rules, alignment, and the size
relationship between headings and body text. If you're changing the styling,
that's the thing worth keeping.

- Light and dark themes both work. The page follows your operating system
  setting, and the toggle in the corner overrides it and remembers your choice.
- Keyboard and screen-reader accessible: skip link, real `<button>` and `<a>`
  elements, visible focus outlines, and a single `<h1>`.
- The link numbers (`01`, `02`, …) are decorative and hidden from screen
  readers. If you add or reorder links, renumber them by hand.
- There is deliberately no `package.json`. Adding one turns this into a project
  that needs building, which means Netlify Drop can no longer publish it
  without asking you to sign in first.
