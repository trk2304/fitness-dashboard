<script setup>
import { ref, computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js'
import { format } from 'date-fns'
import { useDailyLog } from '../composables/useDailyLog'
import { useTheme } from '../composables/useTheme'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip)

const { rows, today } = useDailyLog()
const { isDark } = useTheme()

const ranges = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: 'All', days: null },
]
const rangeDays = ref(7)

const hasAnySteps = computed(() => rows.value.some((r) => r.steps != null))

// One entry per calendar day across the range (missing days filled with 0), so
// the bars form a continuous "consistency calendar" rather than hiding gaps.
const days = computed(() => {
  const byDate = new Map(rows.value.map((r) => [r.entry_date, r]))
  const end = new Date(today + 'T00:00:00')

  let start
  if (rangeDays.value == null) {
    const earliest = rows.value.map((r) => r.entry_date).sort()[0]
    start = new Date((earliest ?? today) + 'T00:00:00')
  } else {
    start = new Date(today + 'T00:00:00')
    start.setDate(start.getDate() - (rangeDays.value - 1))
  }

  const out = []
  for (const cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
    const r = byDate.get(format(cur, 'yyyy-MM-dd'))
    out.push({ date: new Date(cur), steps: r?.steps ?? 0, goal: r?.step_goal ?? null })
  }
  return out
})

const metGoal = (d) => d.goal != null && d.steps >= d.goal

const chartData = computed(() => ({
  labels: days.value.map((d) => format(d.date, 'ddMMMyy')),
  datasets: [
    {
      label: 'Steps',
      data: days.value.map((d) => d.steps),
      // green when the day hit its step goal (a floor), brand violet otherwise.
      backgroundColor: days.value.map((d) =>
        metGoal(d) ? '#10b981' : isDark.value ? '#3b4252' : '#c7d2fe'
      ),
      borderRadius: 4,
    },
  ],
}))

const chartOptions = computed(() => {
  const tick = '#94a3b8'
  const grid = isDark.value ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (c) => `${c.parsed.y.toLocaleString()} steps` } },
    },
    scales: {
      x: {
        grid: { display: false },
        // Up to 45° so dates angle instead of overlapping on narrow mobile.
        ticks: { maxRotation: 45, autoSkip: true, maxTicksLimit: 8, color: tick },
      },
      y: { beginAtZero: true, ticks: { precision: 0, color: tick }, grid: { color: grid } },
    },
  }
})
</script>

<template>
  <section class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-surf-dark dark:shadow-none dark:ring-white/10">
    <div class="flex items-center justify-between">
      <h2 class="font-display text-lg font-bold text-slate-900 dark:text-white">Daily steps</h2>
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

    <div v-if="hasAnySteps" class="mt-4 h-64">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
    <p v-else class="mt-4 flex h-64 items-center justify-center text-sm text-slate-400">
      Log your steps to see daily activity.
    </p>
  </section>
</template>
