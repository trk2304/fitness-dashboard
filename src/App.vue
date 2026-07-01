<script setup>
import { ref, computed, watch } from 'vue'
import { useAuth } from './composables/useAuth'
import { useTheme } from './composables/useTheme'
import LoginScreen from './components/LoginScreen.vue'
import StatusCards from './components/StatusCards.vue'
import WeightChart from './components/WeightChart.vue'
import StepsChart from './components/StepsChart.vue'
import CalorieChart from './components/CalorieChart.vue'
import FoodSwaps from './components/FoodSwaps.vue'
import Journal from './components/Journal.vue'
import QuickEntry from './components/QuickEntry.vue'
import GoalsEditor from './components/GoalsEditor.vue'
import Modal from './components/Modal.vue'

const { session, loading, signOut } = useAuth()
const { isDark, toggleTheme } = useTheme()

// Entry/Goals live in a modal opened from the nav.
const entryOpen = ref(false)
// Mobile slide-out nav.
const navOpen = ref(false)

watch(navOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

function openEntry() {
  navOpen.value = false
  entryOpen.value = true
}
function doSignOut() {
  navOpen.value = false
  signOut()
}

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

      <!-- Desktop: inline actions -->
      <div class="hidden items-center gap-2 text-sm md:flex">
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

      <!-- Mobile: hamburger (custom asymmetric-bars mark in a gradient tile) -->
      <button
        @click="navOpen = !navOpen"
        class="rounded-xl bg-gradient-to-br from-brand to-cyan-400 p-2.5 text-white shadow-sm md:hidden"
        :aria-label="navOpen ? 'Close menu' : 'Open menu'"
        :aria-expanded="navOpen"
      >
        <svg v-if="!navOpen" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="15" y2="12" />
          <line x1="4" y1="17" x2="11" y2="17" />
        </svg>
        <svg v-else class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </svg>
      </button>
    </header>

    <div class="mx-auto max-w-4xl space-y-6 p-6">
      <h2 class="font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        {{ greeting }}
      </h2>
      <StatusCards />
      <WeightChart />
      <StepsChart />
      <CalorieChart />
      <FoodSwaps />
      <Journal />
    </div>

    <!-- Mobile slide-out nav -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="navOpen"
          class="fixed inset-0 z-50 bg-slate-900/50 md:hidden"
          @click="navOpen = false"
        ></div>
      </Transition>
      <Transition name="slide">
        <aside
          v-if="navOpen"
          class="fixed right-0 top-0 z-50 flex h-full w-64 flex-col gap-2 bg-white p-4 shadow-xl dark:bg-surf-dark md:hidden"
        >
          <div class="mb-2 flex items-center justify-between">
            <span class="font-display font-bold text-slate-900 dark:text-white">Menu</span>
            <button
              @click="navOpen = false"
              aria-label="Close menu"
              class="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-white"
            >
              ✕
            </button>
          </div>
          <button
            @click="openEntry"
            class="w-full rounded-xl bg-gradient-to-br from-brand to-cyan-400 px-4 py-3 text-left font-semibold text-white"
          >
            ＋ Log today
          </button>
          <button
            @click="toggleTheme"
            class="w-full rounded-xl px-4 py-3 text-left font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100 dark:text-slate-200 dark:ring-white/15 dark:hover:bg-white/10"
          >
            {{ isDark ? '☀️ Light mode' : '🌙 Dark mode' }}
          </button>
          <button
            @click="doSignOut"
            class="w-full rounded-xl px-4 py-3 text-left font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100 dark:text-slate-200 dark:ring-white/15 dark:hover:bg-white/10"
          >
            Sign out
          </button>
        </aside>
      </Transition>
    </Teleport>

    <!-- Log Today + Goals, together in one modal over a shaded overlay. -->
    <Modal :open="entryOpen" size="lg" title="Log entry" @close="entryOpen = false">
      <div class="space-y-6">
        <QuickEntry />
        <GoalsEditor />
      </div>
    </Modal>
  </main>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.25s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}
</style>
