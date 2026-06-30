import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// Tailwind v4 plugin flow: tailwindcss() runs alongside vue() here.
// No postcss.config.js / tailwind.config.js — those are the legacy v3 path.
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  // Pin the dev port: it must match the redirect URL whitelisted in Supabase.
  // strictPort = fail loudly if 5174 is taken, rather than silently drifting
  // to 5175 and breaking the OAuth return hop.
  server: { port: 5174, strictPort: true },
})
