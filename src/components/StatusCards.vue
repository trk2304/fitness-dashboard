<script setup>
import { computed } from 'vue'
import { useDailyLog } from '../composables/useDailyLog'

const { todayRow, workoutStreak } = useDailyLog()

// goalType: 'floor' (reach/beat = good: steps, protein) | 'ceiling' (stay
// at/under = good, exceeding is bad: calories).
const metrics = computed(() => {
  const r = todayRow.value
  return [
    { label: 'Steps', value: r?.steps ?? null, goal: r?.step_goal ?? null, unit: '', goalType: 'floor' },
    { label: 'Calories', value: r?.calories ?? null, goal: r?.calorie_goal ?? null, unit: '', goalType: 'ceiling' },
    { label: 'Protein', value: r?.protein_g ?? null, goal: r?.protein_goal ?? null, unit: 'g', goalType: 'floor' },
  ]
})

const fmt = (n) => (n == null ? '—' : n.toLocaleString())
const pct = (value, goal) => (value == null || !goal ? 0 : Math.min(100, Math.round((value / goal) * 100)))
const isGood = (m) =>
  m.value != null && m.goal != null && (m.goalType === 'ceiling' ? m.value <= m.goal : m.value >= m.goal)
const isOver = (m) => m.goalType === 'ceiling' && m.value != null && m.goal != null && m.value > m.goal

// Over a ceiling = red; goal met = green; otherwise brand violet (in progress).
const barColor = (m) => (isOver(m) ? 'bg-rose-500' : isGood(m) ? 'bg-emerald-500' : 'bg-brand')
</script>

<template>
  <section class="grid gap-4 md:grid-cols-3">
    <!-- The score: workout streak, the signature element. -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand via-violet-500 to-cyan-400 p-5 text-white shadow-lg">
      <div class="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10"></div>
      <p class="text-sm font-medium text-white/80">Workout streak</p>
      <p class="font-display mt-2 text-5xl font-extrabold leading-none">{{ workoutStreak }}</p>
      <p class="mt-1 text-sm text-white/80">
        {{ workoutStreak === 1 ? 'day' : 'days' }} trained 🔥
      </p>
    </div>

    <!-- Metric cards -->
    <div class="grid grid-cols-3 gap-4 md:col-span-2">
      <div
        v-for="m in metrics"
        :key="m.label"
        class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 dark:bg-surf-dark dark:shadow-none dark:ring-white/10"
      >
        <p class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ m.label }}</p>
        <p
          class="font-display mt-1 text-2xl font-bold"
          :class="isOver(m) ? 'text-rose-500' : 'text-slate-900 dark:text-white'"
        >
          {{ fmt(m.value) }}<span class="text-base font-normal text-slate-400">{{ m.unit }}</span>
        </p>
        <p class="text-xs text-slate-400 dark:text-slate-500">
          {{ m.goalType === 'ceiling' ? 'limit' : 'goal' }} {{ fmt(m.goal) }}{{ m.unit }}
        </p>
        <div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
          <div
            class="h-full rounded-full transition-all"
            :class="barColor(m)"
            :style="{ width: pct(m.value, m.goal) + '%' }"
          ></div>
        </div>
      </div>
    </div>
  </section>
</template>
