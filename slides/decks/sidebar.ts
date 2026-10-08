import { useLocalStorage, useMediaQuery } from '@vueuse/core'
import { ref } from 'vue'

// Shared by global-top.vue, custom-nav-controls.vue and setup/shortcuts.ts.
export const sidebarOpen = useLocalStorage('deck-sidebar-open', true)

// Below Slidev's `md` breakpoint the panel becomes a drawer from the bottom.
// Keep in sync with the media query in style.css.
export const isSmallScreen = useMediaQuery('(max-width: 767px)')
export const drawerOpen = ref(false)

export function toggleSlidePanel() {
  if (isSmallScreen.value)
    drawerOpen.value = !drawerOpen.value
  else
    sidebarOpen.value = !sidebarOpen.value
}
