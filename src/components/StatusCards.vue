<script setup>
import { computed } from 'vue'
import { useDailyLog } from '../composables/useDailyLog'

const { todayRow, workoutStreak } = useDailyLog()

// goalType encodes the direction the goal is judged in:
//   'floor'   — reach it or beat it is good (steps, protein)
//   'ceiling' — stay at or under it is good; exceeding is bad (calories)
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

// In a "good" state for its direction? Floor: at/above goal. Ceiling: at/under.
const isGood = (m) =>
  m.value != null && m.goal != null && (m.goalType === 'ceiling' ? m.value <= m.goal : m.value >= m.goal)
// Over a ceiling is the explicit "bad" state (only ceilings can be exceeded badly).
const isOver = (m) => m.goalType === 'ceiling' && m.value != null && m.goal != null && m.value > m.goal

const barColor = (m) => (isOver(m) ? 'bg-rose-500' : isGood(m) ? 'bg-emerald-500' : 'bg-slate-400')
</script>

<template>
  <section class="grid grid-cols-2 gap-4 md:grid-cols-4">
    <div
      v-for="m in metrics"
      :key="m.label"
      class="rounded-xl bg-white p-4 shadow ring-1 ring-slate-200"
    >
      <p class="text-sm font-medium text-slate-500">{{ m.label }}</p>
      <p class="mt-1 text-2xl font-bold" :class="isOver(m) ? 'text-rose-600' : 'text-slate-800'">
        {{ fmt(m.value) }}<span class="text-base font-normal text-slate-400">{{ m.unit }}</span>
      </p>
      <p class="text-xs text-slate-400">
        {{ m.goalType === 'ceiling' ? 'limit' : 'goal' }} {{ fmt(m.goal) }}{{ m.unit }}
      </p>
      <div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          class="h-full rounded-full transition-all"
          :class="barColor(m)"
          :style="{ width: pct(m.value, m.goal) + '%' }"
        ></div>
      </div>
    </div>

    <!-- The score: workout streak -->
    <div class="rounded-xl bg-slate-800 p-4 text-white shadow">
      <p class="text-sm font-medium text-slate-300">Workout streak</p>
      <p class="mt-1 text-2xl font-bold">
        🔥 {{ workoutStreak }} <span class="text-base font-normal text-slate-300">{{ workoutStreak === 1 ? 'day' : 'days' }}</span>
      </p>
      <p class="text-xs text-slate-400">consecutive days trained</p>
    </div>
  </section>
</template>
