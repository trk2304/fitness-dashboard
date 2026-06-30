<script setup>
import { reactive, ref, watch } from 'vue'
import { supabase } from '../lib/supabase'
import { useDailyLog } from '../composables/useDailyLog'

// Reads flow through the shared cache; `today` (local YYYY-MM-DD) and refresh()
// come from there too, so this writer and the readers agree on one "today".
const { today, todayRow, refresh } = useDailyLog()

const form = reactive({
  weight_lbs: '',
  steps: '',
  calories: '',
  protein_g: '',
  workout_done: false,
})

const status = ref('idle') // 'idle' | 'saving' | 'saved' | 'error'
const errorMsg = ref(null)
const savedRow = ref(null)

// Empty number inputs come through as '' — a numeric/int column rejects that,
// so blanks become null (every metric column is nullable by design).
const numOrNull = (v) => (v === '' || v === null ? null : Number(v))

// Pre-fill the form whenever today's row loads or changes (e.g. after refresh).
watch(
  todayRow,
  (row) => {
    if (!row) return
    form.weight_lbs = row.weight_lbs ?? ''
    form.steps = row.steps ?? ''
    form.calories = row.calories ?? ''
    form.protein_g = row.protein_g ?? ''
    form.workout_done = row.workout_done
    savedRow.value = row
  },
  { immediate: true }
)

async function save() {
  status.value = 'saving'
  errorMsg.value = null

  // Read current goals to FREEZE into this day's row — the intentional snapshot
  // ("the bar judged against then"). RLS scopes to the owner; one row at most.
  const { data: goals, error: goalsError } = await supabase
    .from('goals')
    .select('step_goal, calorie_goal, protein_goal')
    .maybeSingle()

  if (goalsError) {
    status.value = 'error'
    errorMsg.value = goalsError.message
    return
  }

  const payload = {
    entry_date: today,
    weight_lbs: numOrNull(form.weight_lbs),
    steps: numOrNull(form.steps),
    calories: numOrNull(form.calories),
    protein_g: numOrNull(form.protein_g),
    workout_done: form.workout_done,
    // Frozen goal snapshot (null if goals aren't set yet).
    step_goal: goals?.step_goal ?? null,
    calorie_goal: goals?.calorie_goal ?? null,
    protein_goal: goals?.protein_goal ?? null,
    // No user_id: default auth.uid() stamps the owner from the verified login.
  }

  // upsert = insert-or-update on the (user_id, entry_date) unique constraint,
  // so re-saving today edits today's row instead of erroring.
  const { data, error } = await supabase
    .from('daily_log')
    .upsert(payload, { onConflict: 'user_id,entry_date' })
    .select()
    .single()

  if (error) {
    status.value = 'error'
    errorMsg.value = error.message
    return
  }
  savedRow.value = data
  status.value = 'saved'
  // Update the shared cache so StatusCards (streak + vs-goal) reflect the save.
  await refresh()
}
</script>

<template>
  <section class="rounded-xl bg-white p-6 shadow ring-1 ring-slate-200">
    <div class="flex items-baseline justify-between">
      <h2 class="text-lg font-bold text-slate-800">Log today</h2>
      <span class="text-sm text-slate-400">{{ today }}</span>
    </div>

    <form @submit.prevent="save" class="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
      <label class="flex flex-col gap-1 text-sm">
        <span class="font-medium text-slate-600">Weight (lbs)</span>
        <input
          v-model.number="form.weight_lbs"
          type="number" step="0.1" inputmode="decimal" placeholder="—"
          class="rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-slate-500 focus:outline-none"
        />
      </label>

      <label class="flex flex-col gap-1 text-sm">
        <span class="font-medium text-slate-600">Steps</span>
        <input
          v-model.number="form.steps"
          type="number" inputmode="numeric" placeholder="—"
          class="rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-slate-500 focus:outline-none"
        />
      </label>

      <label class="flex flex-col gap-1 text-sm">
        <span class="font-medium text-slate-600">Calories</span>
        <input
          v-model.number="form.calories"
          type="number" inputmode="numeric" placeholder="—"
          class="rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-slate-500 focus:outline-none"
        />
      </label>

      <label class="flex flex-col gap-1 text-sm">
        <span class="font-medium text-slate-600">Protein (g)</span>
        <input
          v-model.number="form.protein_g"
          type="number" inputmode="numeric" placeholder="—"
          class="rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-slate-500 focus:outline-none"
        />
      </label>

      <label class="col-span-2 flex items-center gap-2 md:col-span-4">
        <input v-model="form.workout_done" type="checkbox" class="h-4 w-4 rounded border-slate-300" />
        <span class="text-sm font-medium text-slate-600">Worked out today</span>
      </label>

      <div class="col-span-2 flex items-center gap-3 md:col-span-4">
        <button
          type="submit"
          :disabled="status === 'saving'"
          class="rounded-lg bg-slate-800 px-4 py-2 font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
        >
          {{ status === 'saving' ? 'Saving…' : 'Save' }}
        </button>
        <span v-if="status === 'saved'" class="text-sm text-emerald-600">✅ Saved</span>
      </div>
    </form>

    <p v-if="status === 'error'" class="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">
      {{ errorMsg }}
    </p>

    <!-- Read-back: proves the row round-tripped through the DB. -->
    <div v-if="savedRow" class="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-500">
      <p class="font-medium text-slate-600">Saved row (read back from Supabase):</p>
      <dl class="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 md:grid-cols-5">
        <div><dt class="text-slate-400">Weight</dt><dd>{{ savedRow.weight_lbs ?? '—' }}</dd></div>
        <div><dt class="text-slate-400">Steps</dt><dd>{{ savedRow.steps ?? '—' }}</dd></div>
        <div><dt class="text-slate-400">Calories</dt><dd>{{ savedRow.calories ?? '—' }}</dd></div>
        <div><dt class="text-slate-400">Protein</dt><dd>{{ savedRow.protein_g ?? '—' }}</dd></div>
        <div><dt class="text-slate-400">Workout</dt><dd>{{ savedRow.workout_done ? 'Yes' : 'No' }}</dd></div>
      </dl>
      <p class="mt-3 text-xs text-slate-400">
        Goal snapshot frozen for {{ today }}:
        {{ savedRow.step_goal ?? '—' }} steps ·
        {{ savedRow.calorie_goal ?? '—' }} cal ·
        {{ savedRow.protein_goal ?? '—' }}g protein
      </p>
    </div>
  </section>
</template>
