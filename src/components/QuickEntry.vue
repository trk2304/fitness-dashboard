<script setup>
import { reactive, ref, computed, watch } from 'vue'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useDailyLog } from '../composables/useDailyLog'

// Reads flow through the shared cache (it holds every day's row). `today` and
// refresh() come from there too, so writer and readers agree on one "today".
const { today, rows, refresh } = useDailyLog()

// Which day we're logging — defaults to today; the date picker allows editing
// past days. Capped at today (no logging the future).
const selectedDate = ref(today)
const isToday = computed(() => selectedDate.value === today)
const prettyDate = computed(() =>
  format(new Date(selectedDate.value + 'T00:00:00'), 'EEEE, MMMM d')
)

// The cached row for the selected day, or null if that day isn't logged yet.
const selectedRow = computed(
  () => rows.value.find((r) => r.entry_date === selectedDate.value) ?? null
)

const form = reactive({
  weight_lbs: '',
  steps: '',
  calories: '',
  protein_g: '',
  workout_done: false,
})

const status = ref('idle') // 'idle' | 'saving' | 'saved' | 'error'
const errorMsg = ref(null)

// Empty number inputs come through as '' — a numeric/int column rejects that,
// so blanks become null (every metric column is nullable by design).
const numOrNull = (v) => (v === '' || v === null ? null : Number(v))

// Fill the form from the selected day's row, or clear it when that day has no
// entry yet (so values don't bleed across dates). Also reset the saved state.
watch(
  selectedRow,
  (row) => {
    form.weight_lbs = row?.weight_lbs ?? ''
    form.steps = row?.steps ?? ''
    form.calories = row?.calories ?? ''
    form.protein_g = row?.protein_g ?? ''
    form.workout_done = row?.workout_done ?? false
    status.value = 'idle'
  },
  { immediate: true }
)

async function save() {
  status.value = 'saving'
  errorMsg.value = null

  // Goal snapshot rule:
  //  • today                       → freeze CURRENT goals (today tracks "now")
  //  • editing an existing past row → PRESERVE its snapshot ("aimed for then")
  //  • backfilling a past day       → current goals (best-effort; the true
  //    historical goal for a never-logged day isn't recorded anywhere)
  let goalSnap
  if (selectedRow.value && !isToday.value) {
    const r = selectedRow.value
    goalSnap = { step_goal: r.step_goal, calorie_goal: r.calorie_goal, protein_goal: r.protein_goal }
  } else {
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('step_goal, calorie_goal, protein_goal')
      .maybeSingle()
    if (goalsError) {
      status.value = 'error'
      errorMsg.value = goalsError.message
      return
    }
    goalSnap = {
      step_goal: goals?.step_goal ?? null,
      calorie_goal: goals?.calorie_goal ?? null,
      protein_goal: goals?.protein_goal ?? null,
    }
  }

  const payload = {
    entry_date: selectedDate.value,
    weight_lbs: numOrNull(form.weight_lbs),
    steps: numOrNull(form.steps),
    calories: numOrNull(form.calories),
    protein_g: numOrNull(form.protein_g),
    workout_done: form.workout_done,
    ...goalSnap, // frozen goal snapshot per the rule above
    // No user_id: default auth.uid() stamps the owner from the verified login.
  }

  // upsert = insert-or-update on the (user_id, entry_date) unique constraint,
  // so re-saving today edits today's row instead of erroring.
  const { error } = await supabase
    .from('daily_log')
    .upsert(payload, { onConflict: 'user_id,entry_date' })

  if (error) {
    status.value = 'error'
    errorMsg.value = error.message
    return
  }
  status.value = 'saved'
  // Update the shared cache so StatusCards (streak + vs-goal) reflect the save.
  await refresh()
}
</script>

<template>
  <div>
    <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
      <input
        v-model="selectedDate"
        type="date"
        :max="today"
        class="min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-slate-500 focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder-slate-500"
      />
      <span class="text-sm text-slate-400">
        {{ prettyDate }}<span v-if="isToday"> · today</span>
      </span>
    </div>

    <form @submit.prevent="save" class="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
      <label class="flex flex-col gap-1 text-sm">
        <span class="font-medium text-slate-600 dark:text-slate-300">Weight (lbs)</span>
        <input
          v-model.number="form.weight_lbs"
          type="number" step="0.1" inputmode="decimal" placeholder="—"
          class="rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-slate-500 focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder-slate-500"
        />
      </label>

      <label class="flex flex-col gap-1 text-sm">
        <span class="font-medium text-slate-600 dark:text-slate-300">Steps</span>
        <input
          v-model.number="form.steps"
          type="number" inputmode="numeric" placeholder="—"
          class="rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-slate-500 focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder-slate-500"
        />
      </label>

      <label class="flex flex-col gap-1 text-sm">
        <span class="font-medium text-slate-600 dark:text-slate-300">Calories</span>
        <input
          v-model.number="form.calories"
          type="number" inputmode="numeric" placeholder="—"
          class="rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-slate-500 focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder-slate-500"
        />
      </label>

      <label class="flex flex-col gap-1 text-sm">
        <span class="font-medium text-slate-600 dark:text-slate-300">Protein (g)</span>
        <input
          v-model.number="form.protein_g"
          type="number" inputmode="numeric" placeholder="—"
          class="rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-slate-500 focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder-slate-500"
        />
      </label>

      <label class="col-span-2 flex items-center gap-2 md:col-span-4">
        <input v-model="form.workout_done" type="checkbox" class="h-4 w-4 rounded border-slate-300" />
        <span class="text-sm font-medium text-slate-600 dark:text-slate-300">Worked out today</span>
      </label>

      <div class="col-span-2 flex items-center gap-3 md:col-span-4">
        <button
          type="submit"
          :disabled="status === 'saving'"
          class="rounded-lg bg-brand px-4 py-2 font-medium text-white transition hover:bg-brand-strong disabled:opacity-50"
        >
          {{ status === 'saving' ? 'Saving…' : 'Save' }}
        </button>
        <span v-if="status === 'saved'" class="text-sm text-emerald-600 dark:text-emerald-400">✅ Saved</span>
      </div>
    </form>

    <p v-if="status === 'error'" class="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20">
      {{ errorMsg }}
    </p>
  </div>
</template>
