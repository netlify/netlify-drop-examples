<script setup lang="ts">
import { ref } from 'vue'
import { editError, logIn, loginOpen } from '../edits'

const email = ref('')
const password = ref('')
const busy = ref(false)
const error = ref('')

async function submit() {
  busy.value = true
  error.value = ''
  try {
    await logIn(email.value, password.value)
    password.value = ''
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not log in'
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="loginOpen" class="deck-dialog-backdrop" @click.self="loginOpen = false" @keydown.esc="loginOpen = false">
      <form class="deck-dialog" @submit.prevent="submit">
        <h2>Log in to edit</h2>
        <p>Editing is limited to invited people.</p>
        <label>Email<input v-model="email" type="email" autocomplete="username" required autofocus></label>
        <label>Password<input v-model="password" type="password" autocomplete="current-password" required></label>
        <p v-if="error" class="deck-dialog-error" role="alert">
          {{ error }}
        </p>
        <div class="deck-dialog-actions">
          <button type="button" @click="loginOpen = false">
            Cancel
          </button>
          <button type="submit" class="primary" :disabled="busy">
            {{ busy ? 'Logging in…' : 'Log in' }}
          </button>
        </div>
      </form>
    </div>
    <p v-if="editError" class="deck-toast" role="alert">
      {{ editError }}
    </p>
  </Teleport>
</template>
