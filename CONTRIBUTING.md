# Contributing

The mechanics behind the projects in this repo. If you only want to publish one,
the [README](README.md) is all you need.

## Adding a project

1. Create a directory named for the **category**, not the design: `resume`, not
   `blue-serif-resume`. The path is a public URL and the dashboard fetches it by
   name, so it should outlive any redesign.
2. Put a `manifest.json` at that directory's root listing every file to publish.
   A file missing from the manifest is silently left out of the published site.
   No hidden files: Netlify does not serve them, so the dashboard's fetch of a
   `.gitignore` or `.nvmrc` 404s and the whole example fails to load.
3. Declare whether it is static or a build project — see below.
4. Add a row to the table in the README and a card to the root `index.html`.

The `check-examples` workflow enforces 2 and 3 for every project on every push.

## Static and build projects

Both work. They differ in what a logged-out visitor gets.

### Static

The default — a project is static unless its manifest says otherwise. Drop
uploads the files as-is and the site is live immediately, with no account and no
signup.

A static project must have `index.html` at its root, or the published site
404s. It must not contain `package.json`, a lockfile, or a `netlify.toml` with
a `[build]` section: Drop decides whether a project needs building by looking
for exactly those, so one arriving by accident turns a static example into a
build example.

### Build

An Astro or Vite template, say. It declares itself in the manifest:

```json
{
  "build": true,
  "files": ["package.json", "astro.config.mjs", "src/pages/index.astro"]
}
```

Drop detects the framework, zips the source, synthesises a `netlify.toml` from
the detected settings and builds it. A logged-in visitor gets a built site
directly. A logged-out one is sent to signup first — there is no anonymous
build API — and their project is stashed in the browser and deploys once they
have an account.

Requirements:

- A `package.json` at the project root. That is what detection keys off; without
  one, Drop publishes the source unbuilt.
- No committed file whose path contains `node_modules/`, `dist/` or `build/`.
  Drop strips those when it zips the source, so such a file is silently missing
  from the build. That is a substring match, not a path segment — `mydist/` is
  caught too.
- Pin Node with `NODE_VERSION` under `[build.environment]` in `netlify.toml`.
  `.nvmrc` is a hidden file, so it never reaches the dashboard.

## How the dashboard uses this

It fetches `/<project>/manifest.json`, then each listed file, and feeds them into
the same upload path a dragged folder takes — build detection included. Nothing
here is vendored into the dashboard, so changes go live on push without a
dashboard deploy.

`app.netlify.com/drop?example=<project>` publishes a project directly. The
parameter is the directory name, which is the other reason it should outlive a
redesign.

`_headers` allows cross-origin reads, which is what lets the dashboard fetch it.

Every project is also live at its own path, so the URL is both the demo and the
source the dashboard fetches.
