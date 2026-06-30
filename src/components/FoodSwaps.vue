<script setup>
import { ref, reactive, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

// Local state — food_swaps has a single consumer, so no shared composable.
const swaps = ref([])
const loading = ref(true)
const saving = ref(false)
const errorMsg = ref(null)

const form = reactive({ from_item: '', to_item: '', note: '' })

onMounted(load)

async function load() {
  loading.value = true
  errorMsg.value = null
  // RLS scopes to the owner; standing list, so order by created_at (newest first).
  const { data, error } = await supabase
    .from('food_swaps')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) errorMsg.value = error.message
  else swaps.value = data
  loading.value = false
}

async function add() {
  if (!form.from_item.trim() || !form.to_item.trim()) return
  saving.value = true
  errorMsg.value = null
  // No user_id: default auth.uid() stamps the owner. Get the new row back and
  // prepend it — no refetch needed.
  const { data, error } = await supabase
    .from('food_swaps')
    .insert({
      from_item: form.from_item.trim(),
      to_item: form.to_item.trim(),
      note: form.note.trim() || null,
    })
    .select()
    .single()

  if (error) {
    errorMsg.value = error.message
    saving.value = false
    return
  }
  swaps.value.unshift(data)
  form.from_item = ''
  form.to_item = ''
  form.note = ''
  saving.value = false
}

async function remove(id) {
  errorMsg.value = null
  const { error } = await supabase.from('food_swaps').delete().eq('id', id)
  if (error) {
    errorMsg.value = error.message
    return
  }
  swaps.value = swaps.value.filter((s) => s.id !== id)
}
</script>

<template>
  <section class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-surf-dark dark:shadow-none dark:ring-white/10">
    <h2 class="font-display text-lg font-bold text-slate-900 dark:text-white">Food swaps</h2>
    <p class="mt-1 text-sm text-slate-400">Instead of X, reach for Y.</p>

    <form @submit.prevent="add" class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)_auto]">
      <input
        v-model="form.from_item" type="text" placeholder="Instead of…"
        class="w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-slate-500 focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder-slate-500"
      />
      <input
        v-model="form.to_item" type="text" placeholder="Have…"
        class="w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-slate-500 focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder-slate-500"
      />
      <input
        v-model="form.note" type="text" placeholder="Note (optional)"
        class="w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-slate-500 focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder-slate-500"
      />
      <button
        type="submit"
        :disabled="saving || !form.from_item.trim() || !form.to_item.trim()"
        class="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-strong disabled:opacity-50"
      >
        Add
      </button>
    </form>

    <p v-if="errorMsg" class="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20">
      {{ errorMsg }}
    </p>

    <p v-if="loading" class="mt-4 text-sm text-slate-400">Loading…</p>

    <ul v-else-if="swaps.length" class="mt-4 divide-y divide-slate-100 dark:divide-white/10">
      <li v-for="s in swaps" :key="s.id" class="flex items-center justify-between gap-3 py-3">
        <div class="min-w-0">
          <p class="truncate text-slate-800 dark:text-slate-200">
            <span class="text-slate-500 dark:text-slate-400">{{ s.from_item }}</span>
            <span class="mx-1 text-slate-400">→</span>
            <span class="font-medium">{{ s.to_item }}</span>
          </p>
          <p v-if="s.note" class="truncate text-sm text-slate-400">{{ s.note }}</p>
        </div>
        <button
          @click="remove(s.id)"
          class="shrink-0 rounded-md px-2 py-1 text-sm text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
          title="Remove swap"
        >
          ✕
        </button>
      </li>
    </ul>

    <p v-else class="mt-4 text-sm text-slate-400">No swaps yet — add one above.</p>
  </section>
</template>
