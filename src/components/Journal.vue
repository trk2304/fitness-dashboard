<script setup>
import { ref, reactive, onMounted } from 'vue'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { todayLocalDate } from '../composables/useDailyLog'
import Modal from './Modal.vue'

const PAGE_SIZE = 5

// Local state — single consumer, so no shared composable.
const posts = ref([])
const open = ref(new Set()) // ids of expanded entries
const loading = ref(true) // initial page
const loadingMore = ref(false) // subsequent pages
const saving = ref(false)
const hasMore = ref(false)
// Keyset cursor = the oldest loaded entry's sort key. Content-based, so adding
// or deleting entries never shifts our paging window (unlike offset paging).
const cursor = ref(null)
const errorMsg = ref(null)
const pendingDelete = ref(null) // entry awaiting delete confirmation, or null

const form = reactive({ entry_date: todayLocalDate(), title: '', content: '' })

onMounted(loadMore)

function sortPosts() {
  posts.value.sort((a, b) =>
    a.entry_date !== b.entry_date
      ? b.entry_date.localeCompare(a.entry_date)
      : b.created_at.localeCompare(a.created_at)
  )
}

const fmtDate = (d) => format(new Date(d + 'T00:00:00'), 'MMM d, yyyy')

const isOpen = (id) => open.value.has(id)
function toggle(id) {
  const s = new Set(open.value)
  s.has(id) ? s.delete(id) : s.add(id)
  open.value = s
}

async function loadMore() {
  const first = cursor.value === null
  first ? (loading.value = true) : (loadingMore.value = true)
  errorMsg.value = null

  let query = supabase
    .from('journal')
    .select('*')
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE)

  // "older than the cursor": earlier date, OR same date but earlier created_at.
  if (cursor.value) {
    const { entry_date: d, created_at: c } = cursor.value
    query = query.or(`entry_date.lt.${d},and(entry_date.eq.${d},created_at.lt.${c})`)
  }

  const { data, error } = await query
  if (error) {
    errorMsg.value = error.message
  } else {
    const seen = new Set(posts.value.map((p) => p.id)) // dedupe defensively
    posts.value.push(...data.filter((d) => !seen.has(d.id)))
    sortPosts()
    if (data.length) {
      const last = data[data.length - 1] // oldest in this page
      cursor.value = { entry_date: last.entry_date, created_at: last.created_at }
    }
    hasMore.value = data.length === PAGE_SIZE
  }
  loading.value = false
  loadingMore.value = false
}

async function add() {
  if (!form.content.trim()) return
  saving.value = true
  errorMsg.value = null
  // No user_id: default auth.uid() stamps the owner.
  const { data, error } = await supabase
    .from('journal')
    .insert({
      entry_date: form.entry_date,
      title: form.title.trim() || null,
      content: form.content.trim(),
    })
    .select()
    .single()

  if (error) {
    errorMsg.value = error.message
    saving.value = false
    return
  }
  posts.value.unshift(data)
  sortPosts() // place correctly even when back-dated
  open.value = new Set(open.value).add(data.id) // auto-expand the new entry
  form.title = ''
  form.content = ''
  form.entry_date = todayLocalDate()
  saving.value = false
}

async function confirmDelete() {
  if (!pendingDelete.value) return
  const id = pendingDelete.value.id
  errorMsg.value = null
  const { error } = await supabase.from('journal').delete().eq('id', id)
  if (error) {
    errorMsg.value = error.message
    pendingDelete.value = null
    return
  }
  posts.value = posts.value.filter((p) => p.id !== id)
  pendingDelete.value = null
}
</script>

<template>
  <section class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-surf-dark dark:shadow-none dark:ring-white/10">
    <h2 class="font-display text-lg font-bold text-slate-900 dark:text-white">Journal</h2>

    <form @submit.prevent="add" class="mt-4 space-y-3">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr]">
        <input
          v-model="form.entry_date" type="date"
          class="min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-slate-500 focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder-slate-500"
        />
        <input
          v-model="form.title" type="text" placeholder="Title (optional)"
          class="w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-slate-500 focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder-slate-500"
        />
      </div>
      <textarea
        v-model="form.content" rows="3" placeholder="What happened today?"
        class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-slate-500 focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder-slate-500"
      ></textarea>
      <div class="flex justify-end">
        <button
          type="submit"
          :disabled="saving || !form.content.trim()"
          class="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-strong disabled:opacity-50"
        >
          Add entry
        </button>
      </div>
    </form>

    <p v-if="errorMsg" class="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20">
      {{ errorMsg }}
    </p>

    <p v-if="loading" class="mt-4 text-sm text-slate-400">Loading…</p>

    <ul v-else-if="posts.length" class="mt-5">
      <li v-for="p in posts" :key="p.id" class="border-t border-slate-100 dark:border-white/10">
        <div class="flex items-center justify-between gap-3 py-3">
          <button
            type="button"
            @click="toggle(p.id)"
            class="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <svg
              class="h-4 w-4 shrink-0 text-slate-400 transition-transform"
              :class="isOpen(p.id) ? 'rotate-90' : ''"
              viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
            >
              <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02z" clip-rule="evenodd" />
            </svg>
            <span class="min-w-0 truncate">
              <span class="font-medium text-slate-800 dark:text-slate-100">{{ p.title || fmtDate(p.entry_date) }}</span>
              <span v-if="p.title" class="ml-2 text-xs text-slate-400">{{ fmtDate(p.entry_date) }}</span>
            </span>
          </button>
          <button
            @click="pendingDelete = p"
            class="shrink-0 rounded-md px-2 py-1 text-sm text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
            title="Delete entry"
          >
            ✕
          </button>
        </div>
        <p v-if="isOpen(p.id)" class="whitespace-pre-wrap pb-4 pl-6 text-sm text-slate-600 dark:text-slate-300">
          {{ p.content }}
        </p>
      </li>
    </ul>

    <p v-else class="mt-4 text-sm text-slate-400">No entries yet — write your first above.</p>

    <div v-if="hasMore" class="mt-4 text-center">
      <button
        @click="loadMore"
        :disabled="loadingMore"
        class="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-300 transition hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:ring-white/15 dark:hover:bg-white/10"
      >
        {{ loadingMore ? 'Loading…' : 'Load older entries' }}
      </button>
    </div>

    <Modal :open="!!pendingDelete" title="Delete this entry?" @close="pendingDelete = null">
      <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
        Are you sure you want to delete this entry
        <span class="font-semibold text-slate-800 dark:text-white">({{ pendingDelete?.title || (pendingDelete && fmtDate(pendingDelete.entry_date)) }})</span>?
        This can’t be undone.
      </p>
      <div class="mt-6 flex justify-end gap-3">
        <button
          @click="pendingDelete = null"
          class="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-300 transition hover:bg-slate-100 dark:text-slate-300 dark:ring-white/15 dark:hover:bg-white/10"
        >
          Cancel
        </button>
        <button
          @click="confirmDelete"
          class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
        >
          Delete
        </button>
      </div>
    </Modal>
  </section>
</template>
