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
// Opt-in overlay: superimpose calorie intake on a second axis to eyeball how
// eating tracks against the scale. Off by default — weight trend stays clean.
const showCalories = ref(false)

const hasAnyWeight = computed(() => rows.value.some((r) => r.weight_lbs != null))

// Start of the visible window (null = all time). Both series filter by this so
// weight and calories always cover the same date span when overlaid.
const cutoff = computed(() => {
  if (rangeDays.value == null) return null
  const c = new Date(today + 'T00:00:00')
  c.setDate(c.getDate() - (rangeDays.value - 1))
  return c
})

// Build {x: Date, y} points for a numeric field, dropping unlogged days. x is a
// real Date (local midnight) so the TIME axis spaces points proportionally —
// skipped days show an honest gap, and calories align to weight by actual date
// (not by index), so mismatched logging days never smear.
function seriesFor(field) {
  const pts = rows.value
    .filter((r) => r[field] != null)
    .map((r) => ({ x: new Date(r.entry_date + 'T00:00:00'), y: r[field] }))
    .sort((a, b) => a.x - b.x)
  return cutoff.value ? pts.filter((p) => p.x >= cutoff.value) : pts
}

const points = computed(() => seriesFor('weight_lbs'))
const caloriePoints = computed(() => seriesFor('calories'))

// Chart renders if either series has something to show in the window.
const hasData = computed(
  () => points.value.length > 0 || (showCalories.value && caloriePoints.value.length > 0)
)

// Brand line, brighter on dark surfaces for contrast.
const lineColor = computed(() => (isDark.value ? '#818cf8' : '#6366f1'))

// Amber for calories — clearly distinct from the violet weight line, and not a
// semantic green/red (those are reserved for goal states on the bar charts).
const calorieColor = '#f59e0b'

const chartData = computed(() => {
  const datasets = [
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
      yAxisID: 'y',
    },
  ]
  if (showCalories.value) {
    datasets.push({
      label: 'Calories',
      data: caloriePoints.value,
      borderColor: calorieColor,
      backgroundColor: calorieColor,
      fill: false,
      tension: 0.3,
      pointRadius: 3,
      pointHoverRadius: 5,
      pointBackgroundColor: calorieColor,
      yAxisID: 'y1', // second axis — calories (~2000) dwarf lbs (~180) otherwise
    })
  }
  return { datasets }
})

const chartOptions = computed(() => {
  const tick = isDark.value ? '#94a3b8' : '#94a3b8'
  const grid = isDark.value ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'
  return {
    responsive: true,
    maintainAspectRatio: false, // fill the fixed-height container, don't overflow
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (c) =>
            c.dataset.yAxisID === 'y1'
              ? `${c.parsed.y.toLocaleString()} cal`
              : `${c.parsed.y} lbs`,
        },
      },
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
      // Right-hand calorie axis, only present when the overlay is on. drawn
      // without its own gridlines so it doesn't double up on the weight grid.
      y1: {
        display: showCalories.value,
        position: 'right',
        beginAtZero: true,
        ticks: { color: calorieColor, precision: 0 },
        grid: { drawOnChartArea: false },
      },
    },
  }
})
</script>

<template>
  <section class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-surf-dark dark:shadow-none dark:ring-white/10">
    <div class="flex items-center justify-between">
      <h2 class="font-display text-lg font-bold text-slate-900 dark:text-white">Weight trend</h2>
      <div class="flex items-center gap-2">
        <!-- Overlay toggle: amber to match the calorie line/axis it reveals. -->
        <button
          @click="showCalories = !showCalories"
          class="rounded-md px-2.5 py-1 text-xs font-medium transition"
          :class="
            showCalories
              ? 'bg-amber-500 text-white'
              : 'text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100 dark:text-slate-400 dark:ring-white/15 dark:hover:bg-white/10'
          "
          :aria-pressed="showCalories"
        >
          ＋ Calories
        </button>
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
    </div>

    <div v-if="hasData" class="mt-4 h-64">
      <Line :data="chartData" :options="chartOptions" />
    </div>
    <p v-else class="mt-4 flex h-64 items-center justify-center text-sm text-slate-400">
      {{ hasAnyWeight ? 'No weight logged in this range.' : 'Log your weight to see the trend.' }}
    </p>
  </section>
</template>
