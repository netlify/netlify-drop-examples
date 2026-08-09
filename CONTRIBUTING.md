# Contributing

The mechanics behind the projects in this repo. If you only want to publish one,
the [README](README.md) is all you need.

## Adding a project

1. Create a directory named for the **category**, not the design: `resume`, not
   `blue-serif-resume`. The path is a public URL and the dashboard fetches it by
   name, so it should outlive any redesign.
2. Put `index.html` at that directory's root, plus a `manifest.json` listing
   every file to publish.
3. Keep it static. **No `package.json`, no lockfile, no `netlify.toml` with a
   `[build]` section.** Netlify Drop decides whether a project needs building by
   looking for exactly those, and a project that needs building can't be
   published by a logged-out visitor, which is the whole point of these.
4. Add a row to the table in the README and a card to the root `index.html`.

The `stays-static` workflow enforces 2 and 3 for every project on every push.

## How the dashboard uses this

It fetches `/<project>/manifest.json`, then each listed file, and feeds them into
the same upload path a dragged folder takes. Nothing here is vendored into the
dashboard, so changes go live on push without a dashboard deploy.

`_headers` allows cross-origin reads, which is what lets the dashboard fetch it.

Every project is also live at its own path, so the URL is both the demo and the
source the dashboard fetches.
