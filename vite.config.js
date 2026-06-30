import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// Tailwind v4 plugin flow: tailwindcss() runs alongside vue() here.
// No postcss.config.js / tailwind.config.js — those are the legacy v3 path.
export default defineConfig({
  plugins: [vue(), tailwindcss()],
})
