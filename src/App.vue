<script setup>
import { useAuth } from './composables/useAuth'
import LoginScreen from './components/LoginScreen.vue'
import QuickEntry from './components/QuickEntry.vue'
import StatusCards from './components/StatusCards.vue'
import GoalsEditor from './components/GoalsEditor.vue'

const { session, loading, signOut } = useAuth()
</script>

<template>
  <!-- Loading: we don't yet know whether a stored session exists. -->
  <div v-if="loading" class="min-h-screen bg-slate-50 flex items-center justify-center">
    <p class="text-slate-400">Loading…</p>
  </div>

  <!-- No session → login. -->
  <LoginScreen v-else-if="!session" />

  <!-- Authed → dashboard. -->
  <main v-else class="min-h-screen bg-slate-50">
    <header class="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <h1 class="font-bold text-slate-800">Health &amp; Fitness</h1>
      <div class="flex items-center gap-3 text-sm">
        <span class="text-slate-500">{{ session.user.email }}</span>
        <button
          @click="signOut"
          class="rounded-lg px-3 py-1.5 font-medium text-slate-600 ring-1 ring-slate-300 hover:bg-slate-100"
        >
          Sign out
        </button>
      </div>
    </header>
    <div class="mx-auto max-w-4xl space-y-6 p-6">
      <StatusCards />
      <QuickEntry />
      <GoalsEditor />
    </div>
  </main>
</template>
