<script setup>
import { reactive, ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuth } from '../composables/useAuth'

// goals.id IS the user id (the PK), and there's no default auth.uid() on it —
// unlike daily_log, so we must supply it. We read it off the logged-in session.
const { session } = useAuth()

const form = reactive({
  step_goal: '',
  calorie_goal: '',
  protein_goal: '',
})

const status = ref('loading') // 'loading' | 'idle' | 'saving' | 'saved' | 'error'
const errorMsg = ref(null)

const numOrNull = (v) => (v === '' || v === null ? null : Number(v))

onMounted(loadGoals)

async function loadGoals() {
  status.value = 'loading'
  // RLS scopes this to the owner; at most one row exists (PK = user id).
  const { data, error } = await supabase.from('goals').select('*').maybeSingle()

  if (error) {
    status.value = 'error'
    errorMsg.value = error.message
    return
  }
  if (data) {
    form.step_goal = data.step_goal ?? ''
    form.calorie_goal = data.calorie_goal ?? ''
    form.protein_goal = data.protein_goal ?? ''
  }
  status.value = 'idle'
}

async function save() {
  status.value = 'saving'
  errorMsg.value = null

  // upsert with the user id as PK: first save inserts the row, every later save
  // updates that same row. No onConflict needed — it defaults to the primary key.
  const { error } = await supabase.from('goals').upsert({
    id: session.value.user.id,
    step_goal: numOrNull(form.step_goal),
    calorie_goal: numOrNull(form.calorie_goal),
    protein_goal: numOrNull(form.protein_goal),
  })

  if (error) {
    status.value = 'error'
    errorMsg.value = error.message
    return
  }
  status.value = 'saved'
}
</script>

<template>
  <section class="rounded-xl bg-white p-6 shadow ring-1 ring-slate-200">
    <h2 class="text-lg font-bold text-slate-800">Goals</h2>
    <p class="mt-1 text-sm text-slate-400">Your current targets. New daily entries snapshot these.</p>

    <form @submit.prevent="save" class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <label class="flex flex-col gap-1 text-sm">
        <span class="font-medium text-slate-600">Daily steps</span>
        <input
          v-model.number="form.step_goal"
          type="number" inputmode="numeric" placeholder="—"
          class="rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-slate-500 focus:outline-none"
        />
      </label>

      <label class="flex flex-col gap-1 text-sm">
        <span class="font-medium text-slate-600">Daily calories</span>
        <input
          v-model.number="form.calorie_goal"
          type="number" inputmode="numeric" placeholder="—"
          class="rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-slate-500 focus:outline-none"
        />
      </label>

      <label class="flex flex-col gap-1 text-sm">
        <span class="font-medium text-slate-600">Daily protein (g)</span>
        <input
          v-model.number="form.protein_goal"
          type="number" inputmode="numeric" placeholder="—"
          class="rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-slate-500 focus:outline-none"
        />
      </label>

      <div class="flex items-center gap-3 sm:col-span-3">
        <button
          type="submit"
          :disabled="status === 'saving' || status === 'loading'"
          class="rounded-lg bg-slate-800 px-4 py-2 font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
        >
          {{ status === 'saving' ? 'Saving…' : 'Save goals' }}
        </button>
        <span v-if="status === 'saved'" class="text-sm text-emerald-600">✅ Saved</span>
        <span v-if="status === 'loading'" class="text-sm text-slate-400">Loading…</span>
      </div>
    </form>

    <p v-if="status === 'error'" class="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">
      {{ errorMsg }}
    </p>
  </section>
</template>
