<script setup>
import { ref, computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Filler,
} from 'chart.js'
import 'chartjs-adapter-date-fns' // teaches the time axis how to parse/format dates
import { useDailyLog } from '../composables/useDailyLog'
import { useTheme } from '../composables/useTheme'

// Register only the Chart.js pieces this line chart uses (tree-shaking).
// vue-chartjs registers the line *controller* itself; we add elements + scales.
ChartJS.register(LineElement, PointElement, LinearScale, TimeScale, Tooltip, Filler)

const { rows, today } = useDailyLog()
const { isDark } = useTheme()

const ranges = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: 'All', days: null },
]
const rangeDays = ref(30)

const hasAnyWeight = computed(() => rows.value.some((r) => r.weight_lbs != null))

// Points as {x: Date, y: weight}. x is a real Date (local midnight) so the time
// axis spaces them proportionally — skipped days show an honest gap.
const points = computed(() => {
  const withWeight = rows.value
    .filter((r) => r.weight_lbs != null)
    .map((r) => ({ x: new Date(r.entry_date + 'T00:00:00'), y: r.weight_lbs }))
    .sort((a, b) => a.x - b.x)

  if (rangeDays.value == null) return withWeight
  const cutoff = new Date(today + 'T00:00:00')
  cutoff.setDate(cutoff.getDate() - (rangeDays.value - 1))
  return withWeight.filter((p) => p.x >= cutoff)
})

// Brand line, brighter on dark surfaces for contrast.
const lineColor = computed(() => (isDark.value ? '#818cf8' : '#6366f1'))

const chartData = computed(() => ({
  datasets: [
    {
      label: 'Weight (lbs)',
      data: points.value,
      borderColor: lineColor.value,
      backgroundColor: isDark.value ? 'rgba(129,140,248,0.15)' : 'rgba(99,102,241,0.12)',
      fill: true,
      tension: 0.3,
      pointRadius: 3,
      pointHoverRadius: 5,
      pointBackgroundColor: lineColor.value,
    },
  ],
}))

const chartOptions = computed(() => {
  const tick = isDark.value ? '#94a3b8' : '#94a3b8'
  const grid = isDark.value ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'
  return {
    responsive: true,
    maintainAspectRatio: false, // fill the fixed-height container, don't overflow
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (c) => `${c.parsed.y} lbs` } },
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day', // force day-level ticks so a sparse axis can't drop to
          // time-of-day labels
          tooltipFormat: 'MMM d, yyyy',
          displayFormats: { day: 'ddMMMyy', week: 'ddMMMyy', month: 'ddMMMyy' },
        },
        // Allow up to 45° so labels angle (not overlap) when space is tight on
        // mobile, while staying flat on wider screens where they fit.
        ticks: { maxRotation: 45, autoSkip: true, maxTicksLimit: 8, color: tick },
        grid: { display: false },
      },
      y: { beginAtZero: false, ticks: { color: tick }, grid: { color: grid } },
    },
  }
})
</script>

<template>
  <section class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-surf-dark dark:shadow-none dark:ring-white/10">
    <div class="flex items-center justify-between">
      <h2 class="font-display text-lg font-bold text-slate-900 dark:text-white">Weight trend</h2>
      <div class="flex gap-1">
        <button
          v-for="r in ranges"
          :key="r.label"
          @click="rangeDays = r.days"
          class="rounded-md px-2.5 py-1 text-xs font-medium transition"
          :class="
            rangeDays === r.days
              ? 'bg-brand text-white'
              : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10'
          "
        >
          {{ r.label }}
        </button>
      </div>
    </div>

    <div v-if="points.length" class="mt-4 h-64">
      <Line :data="chartData" :options="chartOptions" />
    </div>
    <p v-else class="mt-4 flex h-64 items-center justify-center text-sm text-slate-400">
      {{ hasAnyWeight ? 'No weight logged in this range.' : 'Log your weight to see the trend.' }}
    </p>
  </section>
</template>
