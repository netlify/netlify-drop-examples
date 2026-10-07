<script setup lang="ts">
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import { isDark } from '@slidev/client/logic/dark.ts'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

// Chart.js chart that reads its colours and fonts from the tokens in style.css.
// Usage in slides.md:
//   <SlideChart type="bar" :labels="['Q1', 'Q2']" :series="[{ label: 'Sales', data: [3, 5] }]" />
Chart.register(BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend)

const props = withDefaults(defineProps<{
  type?: 'bar' | 'line'
  labels: string[]
  series: { label: string, data: number[] }[]
}>(), { type: 'bar' })

const canvas = ref<HTMLCanvasElement>()
let chart: Chart | undefined

function build() {
  chart?.destroy()
  const css = getComputedStyle(document.documentElement)
  const token = (name: string) => css.getPropertyValue(name).trim()
  const palette = [token('--accent'), token('--accent-2'), token('--muted')]
  const font = { family: token('--font-body'), size: 14 }

  chart = new Chart(canvas.value!, {
    type: props.type,
    data: {
      labels: props.labels,
      datasets: props.series.map((s, i) => ({
        label: s.label,
        data: s.data,
        backgroundColor: palette[i % palette.length],
        borderColor: palette[i % palette.length],
        borderRadius: props.type === 'bar' ? 4 : 0,
        tension: 0.3,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: token('--body'), font, usePointStyle: true, boxWidth: 8 } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: token('--muted'), font } },
        y: { beginAtZero: true, grid: { color: token('--rule') }, border: { display: false }, ticks: { color: token('--muted'), font } },
      },
    },
  })
}

onMounted(build)
// Colours are read from the tokens, so rebuild when the theme flips.
watch(isDark, async () => {
  await nextTick()
  build()
})
onBeforeUnmount(() => chart?.destroy())
</script>

<template>
  <div class="slide-chart">
    <canvas ref="canvas" />
  </div>
</template>
