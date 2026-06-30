<script setup>
import { ref, computed } from 'vue'
import { useAuth } from './composables/useAuth'
import { useTheme } from './composables/useTheme'
import LoginScreen from './components/LoginScreen.vue'
import StatusCards from './components/StatusCards.vue'
import WeightChart from './components/WeightChart.vue'
import StepsChart from './components/StepsChart.vue'
import FoodSwaps from './components/FoodSwaps.vue'
import Journal from './components/Journal.vue'
import QuickEntry from './components/QuickEntry.vue'
import GoalsEditor from './components/GoalsEditor.vue'
import Modal from './components/Modal.vue'

const { session, loading, signOut } = useAuth()
const { isDark, toggleTheme } = useTheme()

// Entry/Goals now live in a modal opened from the sticky nav.
const entryOpen = ref(false)

// First name from the Google account (Supabase stamps OAuth profile fields into
// user_metadata), with graceful fallbacks if given_name is ever absent.
const firstName = computed(() => {
  const m = session.value?.user?.user_metadata ?? {}
  return (
    m.given_name ||
    (m.full_name || m.name || '').trim().split(' ')[0] ||
    session.value?.user?.email?.split('@')[0] ||
    'there'
  )
})

// Rotating greetings so the banner feels personable — one is picked at random
// each time the app loads (i.e. each login / refresh).
const greetings = [
  (n) => `Hello, ${n}`,
  (n) => `Welcome back, ${n}`,
  (n) => `Hey ${n} 👋`,
  (n) => `Good to see you, ${n}`,
  (n) => `Let's crush it today, ${n}`,
  (n) => `Looking strong, ${n}`,
  (n) => `Ready to log, ${n}?`,
  (n) => `Rise and grind, ${n}`,
]
const greetingIndex = Math.floor(Math.random() * greetings.length)
const greeting = computed(() => greetings[greetingIndex](firstName.value))
</script>

<template>
  <!-- Loading: we don't yet know whether a stored session exists. -->
  <div
    v-if="loading"
    class="flex min-h-screen items-center justify-center bg-canvas dark:bg-night"
  >
    <p class="text-slate-400">Loading…</p>
  </div>

  <!-- No session → login. -->
  <LoginScreen v-else-if="!session" />

  <!-- Authed → dashboard. -->
  <main v-else class="min-h-screen bg-canvas dark:bg-night">
    <header
      class="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/90 px-6 py-3 backdrop-blur dark:border-white/10 dark:bg-surf-dark/90"
    >
      <div class="flex items-center gap-2">
        <div class="h-7 w-7 rounded-lg bg-gradient-to-br from-brand to-cyan-400"></div>
        <span class="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white">
          Health &amp; Fitness
        </span>
      </div>
      <div class="flex items-center gap-2 text-sm">
        <button
          @click="entryOpen = true"
          class="rounded-xl bg-gradient-to-br from-brand to-cyan-400 px-4 py-2 font-semibold text-white shadow-sm transition hover:opacity-90"
        >
          ＋ Log today
        </button>
        <button
          @click="toggleTheme"
          class="rounded-xl p-2 text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-100 dark:text-slate-300 dark:ring-white/15 dark:hover:bg-white/10"
          :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        >
          {{ isDark ? '☀️' : '🌙' }}
        </button>
        <button
          @click="signOut"
          class="rounded-xl px-3 py-2 font-medium text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-100 dark:text-slate-300 dark:ring-white/15 dark:hover:bg-white/10"
        >
          Sign out
        </button>
      </div>
    </header>

    <div class="mx-auto max-w-4xl space-y-6 p-6">
      <h2 class="font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        {{ greeting }}
      </h2>
      <StatusCards />
      <WeightChart />
      <StepsChart />
      <FoodSwaps />
      <Journal />
    </div>

    <!-- Log Today + Goals, together in one modal over a shaded overlay. -->
    <Modal :open="entryOpen" size="lg" title="Log today" @close="entryOpen = false">
      <div class="space-y-6">
        <QuickEntry />
        <GoalsEditor />
      </div>
    </Modal>
  </main>
</template>
