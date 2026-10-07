<script setup lang="ts">
import { createFixedClicks } from '@slidev/client/composables/useClicks.ts'
import { useNav } from '@slidev/client/composables/useNav.ts'
import { CLICKS_MAX } from '@slidev/client/constants.ts'
import SlideContainer from '@slidev/client/internals/SlideContainer.vue'
import SlideWrapper from '@slidev/client/internals/SlideWrapper.vue'
import { isDark, toggleDark } from '@slidev/client/logic/dark.ts'
import { disableTransition, fullscreen } from '@slidev/client/state/index.ts'
import { useEventListener } from '@vueuse/core'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue'
import EditLogin from './components/EditLogin.vue'
import NotesPane from './components/NotesPane.vue'
import { initEdits } from './edits'
import { notesAvailable, notesOpen } from './notes'
import { drawerOpen, isSmallScreen, sidebarOpen } from './sidebar'

const THUMB_WIDTH = 148
const { currentSlideNo, go, slides, isPrintMode, isEmbedded } = useNav()

// Only the main play view gets a sidebar. This component also mounts for the
// overview, print and export renders, which must stay clean.
const isMainView = computed(() => !isPrintMode.value && !isEmbedded.value)
onMounted(() => {
  // Embedded copies (the home page thumbnails) show saved edits but skip Identity.
  if (!isPrintMode.value)
    initEdits({ identity: !isEmbedded.value })
})

// Built decks live under /<slug>/; the site root is the index of all decks.
const hasIndex = import.meta.env.BASE_URL !== '/'

const canShow = computed(() => isMainView.value && !fullscreen.isFullscreen.value)
// Wide screens pin the panel to the left; small ones use a bottom drawer.
const pinned = computed(() => canShow.value && !isSmallScreen.value && sidebarOpen.value)
const drawer = computed(() => canShow.value && isSmallScreen.value && drawerOpen.value)

// When hidden, hovering the left edge slides the panel over the slide.
const peeking = ref(false)
let leaveTimer: ReturnType<typeof setTimeout> | undefined
function peek() {
  if (isSmallScreen.value)
    return
  clearTimeout(leaveTimer)
  peeking.value = true
}
function unpeek() {
  clearTimeout(leaveTimer)
  leaveTimer = setTimeout(() => { peeking.value = false }, 250)
}
function hide() {
  clearTimeout(leaveTimer)
  peeking.value = false
  sidebarOpen.value = false
}
// Fullscreen hides the panel, so this is the "Present" view.
function present() {
  peeking.value = false
  drawerOpen.value = false
  fullscreen.enter()
}
const visible = computed(() => drawer.value || (canShow.value && !isSmallScreen.value && (pinned.value || peeking.value)))
onBeforeUnmount(() => clearTimeout(leaveTimer))
useEventListener('keydown', (e) => {
  if (e.key === 'Escape' && drawerOpen.value)
    drawerOpen.value = false
})

const list = ref<HTMLElement>()

const notesShown = computed(() => canShow.value && notesAvailable.value && notesOpen.value)

// Reserve room for the panels; style.css reads these on #page-root.
watchEffect(() => {
  document.documentElement.style.setProperty('--deck-notes-h', notesShown.value ? (isSmallScreen.value ? '140px' : '180px') : '0px')
  document.documentElement.style.setProperty('--deck-sidebar-w', pinned.value ? '200px' : '0px')
  document.documentElement.style.setProperty('--deck-stage-pad', pinned.value ? '24px' : '0px')
})
onBeforeUnmount(() => {
  document.documentElement.style.removeProperty('--deck-sidebar-w')
  document.documentElement.style.removeProperty('--deck-stage-pad')
  document.documentElement.style.removeProperty('--deck-notes-h')
})

// Jumping via a thumbnail should cut straight to the slide, not slide in.
async function jumpTo(no: number) {
  disableTransition.value = true
  go(no)
  await nextTick()
  setTimeout(() => { disableTransition.value = false }, 100)
  drawerOpen.value = false
}

watch([currentSlideNo, visible], async () => {
  await nextTick()
  list.value?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}, { immediate: true, flush: 'post' })
</script>

<template>
  <EditLogin v-if="isMainView" />
  <Teleport v-if="isMainView" to="body">
    <div v-if="canShow && !isSmallScreen && !sidebarOpen" class="deck-sidebar-edge" @mouseenter="peek" />
    <button
      v-if="canShow && isSmallScreen"
      type="button"
      class="deck-drawer-trigger"
      :class="{ 'is-hidden': drawer }"
      :inert="drawer"
      @click="drawerOpen = true"
    >
      <div class="i-carbon:chevron-up" />
      <span>{{ currentSlideNo }} / {{ slides.length }}</span>
      <span class="sr-only">Open slide panel</span>
    </button>
    <NotesPane v-if="notesShown" />
    <div v-if="drawer" class="deck-drawer-backdrop" @click="drawerOpen = false" />
    <aside
      class="deck-sidebar"
      :class="{ 'is-shown': visible, 'is-peek': !pinned && !drawer }"
      :inert="!visible"
      aria-label="Slides"
      @mouseenter="peek"
      @mouseleave="unpeek"
    >
      <div class="deck-sidebar-head">
        <span>Slides</span>
        <div class="deck-sidebar-actions">
          <button v-if="isSmallScreen" type="button" title="Close" @click="drawerOpen = false">
            <div class="i-carbon:close" />
            <span class="sr-only">Close slide panel</span>
          </button>
          <button v-if="isSmallScreen" type="button" :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'" @click="toggleDark()">
            <div :class="isDark ? 'i-carbon:sun' : 'i-carbon:moon'" />
            <span class="sr-only">{{ isDark ? 'Switch to light mode' : 'Switch to dark mode' }}</span>
          </button>
          <button v-if="isSmallScreen && notesAvailable" type="button" :title="notesOpen ? 'Hide notes' : 'Show notes'" :aria-pressed="notesOpen" @click="notesOpen = !notesOpen">
            <div class="i-carbon:notebook" />
            <span class="sr-only">{{ notesOpen ? 'Hide notes' : 'Show notes' }}</span>
          </button>
          <a v-if="hasIndex" href="/" title="All decks">
            <div class="i-carbon:grid" />
            <span class="sr-only">All decks</span>
          </a>
          <button type="button" title="Present (p)" @click="present">
            <div class="i-carbon:play-filled-alt" />
            <span class="sr-only">Present</span>
          </button>
          <button
            v-if="pinned"
            type="button"
            title="Hide slide panel (b)"
            @click="hide"
          >
            <div class="i-carbon:side-panel-close" />
            <span class="sr-only">Hide slide panel</span>
          </button>
          <button
            v-else-if="!isSmallScreen"
            type="button"
            title="Keep slide panel open (b)"
            @click="sidebarOpen = true"
          >
            <div class="i-carbon:side-panel-open" />
            <span class="sr-only">Keep slide panel open</span>
          </button>
        </div>
      </div>
      <ol ref="list" class="deck-sidebar-list">
        <li v-for="route of slides" :key="route.no">
          <button
            type="button"
            class="deck-thumb"
            :aria-current="route.no === currentSlideNo"
            :aria-label="`Go to slide ${route.no}`"
            @click="jumpTo(route.no)"
          >
            <span class="deck-thumb-no">{{ route.no }}</span>
            <SlideContainer :no="route.no" :width="THUMB_WIDTH" class="deck-thumb-frame pointer-events-none">
              <SlideWrapper
                :clicks-context="createFixedClicks(route, CLICKS_MAX)"
                :route="route"
                render-context="overview"
              />
            </SlideContainer>
          </button>
        </li>
      </ol>
      <div v-if="!isSmallScreen" class="deck-sidebar-foot">
        <button v-if="notesAvailable" type="button" :class="{ 'is-on': notesOpen }" :title="notesOpen ? 'Hide notes' : 'Show notes'" :aria-pressed="notesOpen" @click="notesOpen = !notesOpen">
          <div class="i-carbon:notebook" />
          <span class="sr-only">{{ notesOpen ? 'Hide notes' : 'Show notes' }}</span>
        </button>
        <button type="button" :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'" @click="toggleDark()">
          <div :class="isDark ? 'i-carbon:sun' : 'i-carbon:moon'" />
          <span class="sr-only">{{ isDark ? 'Switch to light mode' : 'Switch to dark mode' }}</span>
        </button>
      </div>
    </aside>
  </Teleport>
</template>
