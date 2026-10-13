import { appConfig } from '@/config/app'

/**
 * Emits CSS custom properties for the brand colors declared in
 * `src/config/app.ts`. Rendered as a plain `<style>` tag directly in
 * `<head>` (see `__root.tsx`) so it's part of the initial server-rendered
 * HTML — no flash of unstyled content, and no client-side effect required.
 *
 * To rebrand the app, edit `src/config/app.ts`'s `colors` — never edit this
 * file or `styles.css` directly.
 */
export function BrandTheme() {
  const { light, dark } = appConfig.colors

  const css = `
:root {
  --primary: hsl(${light.primary});
  --primary-foreground: hsl(${light.primaryForeground});
}
.dark {
  --primary: hsl(${dark.primary});
  --primary-foreground: hsl(${dark.primaryForeground});
}
`.trim()

  return <style id="brand-theme" dangerouslySetInnerHTML={{ __html: css }} />
}
