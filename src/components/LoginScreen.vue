<script setup>
import { useAuth } from '../composables/useAuth'

const { signInWithGoogle, authError } = useAuth()
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-canvas p-6 dark:bg-night">
    <div class="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white p-10 text-center shadow-xl ring-1 ring-slate-100 dark:bg-surf-dark dark:shadow-none dark:ring-white/10">
      <div class="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br from-brand to-cyan-400 opacity-20 blur-2xl dark:opacity-30"></div>
      <div class="relative">
        <div class="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-cyan-400 text-xl">🔥</div>
        <h1 class="font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Health &amp; Fitness</h1>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Your daily score, in one place.</p>

      <button
        @click="signInWithGoogle"
        class="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:border-slate-300 hover:shadow dark:bg-white/5 dark:text-white dark:ring-white/15 dark:hover:bg-white/10"
      >
        <svg class="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
        </svg>
        Continue with Google
      </button>

        <p
          v-if="authError"
          class="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20"
        >
          {{ authError }}
        </p>
      </div>
    </div>
  </main>
</template>
