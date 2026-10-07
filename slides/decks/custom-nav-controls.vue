<script setup lang="ts">
import { useNav } from '@slidev/client/composables/useNav.ts'
import IconButton from '@slidev/client/internals/IconButton.vue'
import { canEdit, cancelEditing, editing, identityEnabled, loginOpen, logOut, resetSlide, saveEditing, saving, startEditing, userEmail } from './edits'
import { sidebarOpen } from './sidebar'

const { currentSlideNo } = useNav()

function onEdit() {
  if (!canEdit.value)
    loginOpen.value = true
  else if (editing.value)
    cancelEditing()
  else
    startEditing(currentSlideNo.value)
}
</script>

<template>
  <IconButton
    :title="sidebarOpen ? 'Hide slide panel (b)' : 'Show slide panel (b)'"
    :active="sidebarOpen"
    @click="sidebarOpen = !sidebarOpen"
  >
    <div class="i-carbon:side-panel-open" />
  </IconButton>

  <template v-if="identityEnabled">
    <IconButton
      :title="!canEdit ? 'Log in to edit text' : editing ? 'Stop editing' : 'Edit text on this slide'"
      :active="editing"
      @click="onEdit"
    >
      <div class="i-carbon:edit" />
    </IconButton>
    <template v-if="editing">
      <IconButton :title="saving ? 'Saving…' : 'Save changes'" :disabled="saving" @click="saveEditing">
        <div class="i-carbon:checkmark" />
      </IconButton>
      <IconButton title="Restore this slide's original text" :disabled="saving" @click="resetSlide(currentSlideNo)">
        <div class="i-carbon:reset" />
      </IconButton>
    </template>
    <IconButton v-if="userEmail" :title="`Log out (${userEmail})`" @click="logOut">
      <div class="i-carbon:logout" />
    </IconButton>
  </template>
</template>
