<script setup>
import { useAuth } from '../composables/useAuth'

const { signInWithGoogle, authError } = useAuth()
</script>

<template>
  <main class="min-h-screen bg-slate-50 flex items-center justify-center p-6">
    <div class="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow ring-1 ring-slate-200">
      <h1 class="text-xl font-bold text-slate-800">Health &amp; Fitness</h1>
      <p class="mt-1 text-sm text-slate-500">Sign in to your dashboard</p>

      <button
        @click="signInWithGoogle"
        class="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 font-medium text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50"
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
        class="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200"
      >
        {{ authError }}
      </p>
    </div>
  </main>
</template>
