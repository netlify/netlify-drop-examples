<script setup lang="ts">
import type { AuthProvider } from '@netlify/identity'
import { computed, ref, watch } from 'vue'
import { editError, friendlyAuthError, identitySettings, logIn, logInWith, loginMode, loginNotice, loginOpen, sendPasswordReset, setPassword, signUp } from '../edits'

const PROVIDER_LABELS: Record<AuthProvider, string> = {
  google: 'Google',
  github: 'GitHub',
  gitlab: 'GitLab',
  bitbucket: 'Bitbucket',
  facebook: 'Facebook',
  email: 'Email',
}
// Brand marks for providers that have one in decks/public. Others show text only.
const PROVIDER_ICONS: Partial<Record<AuthProvider, string>> = {
  google: `${import.meta.env.BASE_URL}google.svg`,
}

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const busy = ref(false)
const error = ref('')

watch([loginOpen, loginMode], () => {
  error.value = ''
  password.value = ''
  confirmPassword.value = ''
})

// What Identity's Registration and provider settings mean for this dialog.
const signupDisabled = computed(() => !!identitySettings.value?.disableSignup)
const providers = computed(() => {
  const settings = identitySettings.value
  return settings ? (Object.keys(settings.providers) as AuthProvider[]).filter(p => p !== 'email' && settings.providers[p]) : []
})
// Email and password is hidden only when Identity says it's off and a provider is on.
// getSettings() also reports `email: false` when the field is missing, so with no
// provider to fall back on, keep the form rather than show nobody a way in.
const emailEnabled = computed(() => !identitySettings.value || identitySettings.value.providers.email || !providers.value.length)
const providerOnly = computed(() => !emailEnabled.value)
const settingPassword = computed(() => loginMode.value === 'invite' || loginMode.value === 'recovery')

const title = computed(() => ({
  'login': 'Log in to edit',
  'signup': 'Create an account',
  'forgot': 'Reset your password',
  'reset-sent': 'Check your email',
  'check-email': 'Check your email',
  'invite': 'Set your password',
  'recovery': 'Choose a new password',
})[loginMode.value])

const submitLabel = computed(() => loginMode.value === 'signup' ? 'Sign up' : loginMode.value === 'forgot' ? 'Send reset link' : settingPassword.value ? 'Set password' : 'Log in')

async function submit() {
  busy.value = true
  error.value = ''
  try {
    if (loginMode.value === 'signup') {
      await signUp(email.value, password.value)
    }
    else if (loginMode.value === 'forgot') {
      await sendPasswordReset(email.value)
    }
    else if (settingPassword.value) {
      if (password.value !== confirmPassword.value)
        throw new Error('Passwords do not match.')
      await setPassword(password.value)
    }
    else {
      await logIn(email.value, password.value)
    }
    password.value = ''
    confirmPassword.value = ''
  }
  catch (e) {
    error.value = friendlyAuthError(e, loginMode.value)
  }
  finally {
    busy.value = false
  }
}

function close() {
  loginOpen.value = false
}
</script>

<template>
  <Teleport to="body">
    <div v-if="loginOpen" class="deck-dialog-backdrop" @click.self="close" @keydown.esc="close">
      <div v-if="loginMode === 'check-email' || loginMode === 'reset-sent'" class="deck-dialog" role="dialog" :aria-label="title">
        <h2>{{ title }}</h2>
        <p v-if="loginMode === 'check-email'">
          We sent a confirmation link to <strong>{{ email }}</strong>. Open it to finish signing up.
        </p>
        <p v-else>
          Check <strong>{{ email }}</strong> for a link to reset your password.
        </p>
        <p>If it doesn't arrive, check your spam folder.</p>
        <div class="deck-dialog-actions">
          <button type="button" @click="loginMode = 'login'">
            Back to log in
          </button>
        </div>
      </div>

      <form v-else class="deck-dialog" @submit.prevent="submit">
        <h2>{{ title }}</h2>
        <p v-if="loginNotice && loginMode === 'login'" class="deck-dialog-error" role="alert">
          {{ loginNotice }}
        </p>

        <template v-if="settingPassword">
          <p>{{ loginMode === 'invite' ? 'Set a password to finish creating your account.' : 'Enter a new password for your account.' }}</p>
          <label>New password<input v-model="password" type="password" autocomplete="new-password" minlength="8" required autofocus></label>
          <label>Confirm password<input v-model="confirmPassword" type="password" autocomplete="new-password" minlength="8" required></label>
        </template>

        <template v-else-if="loginMode === 'forgot'">
          <p>Enter your email and we'll send you a link to reset your password.</p>
          <label>Email<input v-model="email" type="email" autocomplete="username" required autofocus></label>
        </template>

        <template v-else>
          <p v-if="signupDisabled">
            Sign-up is by invitation only. Ask for an invite.
          </p>
          <p v-else-if="providerOnly">
            Continue with your {{ providers.map(p => PROVIDER_LABELS[p]).join(' or ') }} account.
          </p>
          <p v-else>
            {{ loginMode === 'login' ? "Don't have an account?" : 'Already have an account?' }}
            <button type="button" class="deck-dialog-link" @click="loginMode = loginMode === 'login' ? 'signup' : 'login'">
              {{ loginMode === 'login' ? 'Sign up' : 'Log in' }}
            </button>
          </p>
          <template v-if="emailEnabled">
            <label>Email<input v-model="email" type="email" autocomplete="username" required autofocus></label>
            <div class="deck-dialog-field">
              <span class="deck-dialog-label-row">
                <label for="deck-login-password">Password</label>
                <button v-if="loginMode === 'login'" type="button" class="deck-dialog-link" @click="loginMode = 'forgot'">
                  Forgot password?
                </button>
              </span>
              <input
                id="deck-login-password" v-model="password" type="password" required
                :autocomplete="loginMode === 'login' ? 'current-password' : 'new-password'"
                :minlength="loginMode === 'signup' ? 8 : undefined"
              >
            </div>
          </template>
        </template>

        <p v-if="error" class="deck-dialog-error" role="alert">
          {{ error }}
        </p>
        <div v-if="emailEnabled || settingPassword || loginMode === 'forgot'" class="deck-dialog-actions">
          <button v-if="loginMode === 'forgot'" type="button" @click="loginMode = 'login'">
            Back
          </button>
          <button v-else type="button" @click="close">
            Cancel
          </button>
          <button type="submit" class="primary" :disabled="busy">
            {{ busy ? 'Please wait…' : submitLabel }}
          </button>
        </div>

        <template v-if="providers.length && (loginMode === 'login' || loginMode === 'signup')">
          <p v-if="emailEnabled" class="deck-dialog-divider">
            or continue with
          </p>
          <button v-for="provider in providers" :key="provider" type="button" class="deck-dialog-provider" @click="logInWith(provider)">
            <img v-if="PROVIDER_ICONS[provider]" :src="PROVIDER_ICONS[provider]" alt="" width="16" height="16">
            {{ providerOnly ? `Continue with ${PROVIDER_LABELS[provider]}` : PROVIDER_LABELS[provider] }}
          </button>
          <button v-if="providerOnly" type="button" class="deck-dialog-link" @click="close">
            Cancel
          </button>
        </template>
      </form>
    </div>
    <p v-if="editError" class="deck-toast" role="alert">
      {{ editError }}
    </p>
  </Teleport>
</template>
