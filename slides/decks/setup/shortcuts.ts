import { fullscreen } from '@slidev/client/state/index.ts'
import { defineShortcutsSetup } from '@slidev/types'
import { toggleSlidePanel } from '../sidebar'

export default defineShortcutsSetup((_nav, base) => [
  ...base,
  { name: 'present', key: 'p', fn: () => { fullscreen.enter() } },
  { name: 'toggle_sidebar', key: 'b', fn: toggleSlidePanel },
])
