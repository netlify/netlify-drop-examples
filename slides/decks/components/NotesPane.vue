<script setup lang="ts">
import type { SlideNote } from '../notes'
import { useNav } from '@slidev/client/composables/useNav.ts'
import { lockShortcuts } from '@slidev/client/state/index.ts'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { noteFor, notesError, notesSaving, saveNote, slideLabel } from '../notes'

const { currentSlideNo, slides } = useNav()

const note = computed(() => noteFor(currentSlideNo.value, slideLabel(slides.value[currentSlideNo.value - 1])))

const draft = ref('')
const focused = ref(false)
let unlock: (() => void) | undefined
// The note being edited, so a save after a slide change still lands on the right slide.
let editing: SlideNote | undefined

// Follow the slide (and saved notes) unless the user is typing.
watch(note, (next) => {
  if (!focused.value)
    draft.value = next.text
}, { immediate: true })

function onFocus() {
  focused.value = true
  editing = note.value
  unlock = lockShortcuts()
}

async function save() {
  const target = editing ?? note.value
  if (draft.value.trim() === target.text.trim() && !target.orphan)
    return
  if (!await saveNote(target, draft.value))
    return
  draft.value = draft.value.trim()
}

async function onBlur() {
  await save()
  focused.value = false
  editing = undefined
  unlock?.()
  unlock = undefined
  draft.value = note.value.text
}

function onKeydown(event: KeyboardEvent) {
  const el = event.target as HTMLTextAreaElement
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    el.blur()
  }
  else if (event.key === 'Escape') {
    draft.value = editing?.text ?? note.value.text
    el.blur()
  }
}

onBeforeUnmount(() => unlock?.())
</script>

<template>
  <aside class="deck-notes" aria-label="Slide notes">
    <div class="deck-notes-head">
      <span>Notes</span>
      <span v-if="notesSaving" class="deck-notes-status">Saving…</span>
      <span v-else-if="notesError" class="deck-notes-status is-error" role="alert">{{ notesError }}</span>
    </div>
    <p v-if="note.orphan" class="deck-notes-hint">
      This note was written for an earlier version of this slide. Click in and leave the box to attach it here.
    </p>
    <textarea
      v-model="draft"
      class="deck-notes-text"
      placeholder="Add a note for this slide. Only logged-in editors can see it."
      maxlength="5000"
      aria-label="Notes for this slide"
      @focus="onFocus"
      @blur="onBlur"
      @keydown="onKeydown"
    />
  </aside>
</template>
