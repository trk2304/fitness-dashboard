import { ref } from 'vue'

// The initial class was set pre-paint by the inline script in index.html;
// we just mirror it into reactive state here and keep the two in sync.
const isDark = ref(document.documentElement.classList.contains('dark'))

function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

export function useTheme() {
  return { isDark, toggleTheme }
}
