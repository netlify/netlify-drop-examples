<script setup lang="ts">
import { computed } from 'vue'

// An <img> for files in decks/public. Each deck is served under its own base path
// (/<slug>/), so a bare "/screens/x.svg" would miss. This adds the base.
// Usage in a deck: <DeckImg src="/screens/x.svg" alt="Description" />
const props = defineProps<{ src: string, alt?: string }>()
const url = computed(() => import.meta.env.BASE_URL.replace(/\/$/, '') + (props.src.startsWith('/') ? props.src : `/${props.src}`))
</script>

<template>
  <img :src="url" :alt="alt ?? ''">
</template>
