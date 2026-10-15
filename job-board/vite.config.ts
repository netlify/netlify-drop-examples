import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import netlify from '@netlify/vite-plugin-tanstack-start'

export default defineConfig({
  server: { port: 3000 },
  // Resolves the `@/*` alias declared in tsconfig.json. Vite 8 supports this
  // natively — no need for the `vite-tsconfig-paths` plugin.
  resolve: { tsconfigPaths: true },
  plugins: [tailwindcss(), tanstackStart(), viteReact(), netlify()],
})
