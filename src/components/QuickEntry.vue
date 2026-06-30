<script setup>
import { reactive, ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

// Today's date in the user's *local* zone as YYYY-MM-DD. We send this
// explicitly rather than leaning on the DB's current_date default (which is
// UTC and could roll to "tomorrow" late at night), and the upsert matches the
// existing row on (user_id, entry_date) using it.
function todayLocal() {
  const now = new Date()
  const tzOffsetMs = now.getTimezoneOffset() * 60000
  return new Date(now - tzOffsetMs).toISOString().slice(0, 10)
}
const today = todayLocal()

const form = reactive({
  weight_lbs: '',
  steps: '',
  calories: '',
  protein_g: '',
  workout_done: false,
})

const status = ref('idle') // 'idle' | 'loading' | 'saving' | 'saved' | 'error'
const errorMsg = ref(null)
const savedRow = ref(null)

// Empty number inputs come through as '' — a numeric/int column rejects that,
// so blanks become null (every metric column is nullable by design).
const numOrNull = (v) => (v === '' || v === null ? null : Number(v))

onMounted(loadToday)

async function loadToday() {
  status.value = 'loading'
  // No user_id filter: RLS scopes the read to the logged-in owner for us.
  // maybeSingle() = "0 or 1 row" — null when today hasn't been logged yet.
  const { data, error } = await supabase
    .from('daily_log')
    .select('*')
    .eq('entry_date', today)
    .maybeSingle()

  if (error) {
    status.value = 'error'
    errorMsg.value = error.message
    return
  }
  if (data) {
    form.weight_lbs = data.weight_lbs ?? ''
    form.steps = data.steps ?? ''
    form.calories = data.calories ?? ''
    form.protein_g = data.protein_g ?? ''
    form.workout_done = data.workout_done
    savedRow.value = data
  }
  status.value = 'idle'
}

async function save() {
  status.value = 'saving'
  errorMsg.value = null

  const payload = {
    entry_date: today,
    weight_lbs: numOrNull(form.weight_lbs),
    steps: numOrNull(form.steps),
    calories: numOrNull(form.calories),
    protein_g: numOrNull(form.protein_g),
    workout_done: form.workout_done,
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
          :disabled="status === 'saving' || status === 'loading'"
          class="rounded-lg bg-slate-800 px-4 py-2 font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
        >
          {{ status === 'saving' ? 'Saving…' : 'Save' }}
        </button>
        <span v-if="status === 'saved'" class="text-sm text-emerald-600">✅ Saved</span>
        <span v-if="status === 'loading'" class="text-sm text-slate-400">Loading today…</span>
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
    </div>
  </section>
</template>
