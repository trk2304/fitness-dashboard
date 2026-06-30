<script setup>
import { watch, onBeforeUnmount, ref, nextTick, computed } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  size: { type: String, default: 'md' }, // 'md' (dialogs) | 'lg' (forms)
})
const emit = defineEmits(['close'])

const boxRef = ref(null)
const maxW = computed(() => (props.size === 'lg' ? 'max-w-2xl' : 'max-w-md'))

function focusables() {
  if (!boxRef.value) return []
  return [
    ...boxRef.value.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ),
  ]
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    emit('close')
    return
  }
  // Focus trap: keep Tab cycling inside the dialog.
  if (e.key === 'Tab') {
    const f = focusables()
    if (!f.length) return
    const first = f[0]
    const last = f[f.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }
}

// While open: trap Esc/Tab and lock background scroll; focus the first control.
watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      document.addEventListener('keydown', onKeydown)
      document.body.style.overflow = 'hidden'
      await nextTick()
      focusables()[0]?.focus()
    } else {
      document.removeEventListener('keydown', onKeydown)
      document.body.style.overflow = ''
    }
  }
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <!-- Teleport to body so the overlay isn't clipped by any parent's overflow. -->
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- shaded overlay; click outside the box closes -->
        <div class="absolute inset-0 bg-slate-900/50" @click="emit('close')"></div>

        <!-- box: pinned header + scrollable body -->
        <div
          ref="boxRef"
          role="dialog"
          aria-modal="true"
          class="relative z-10 flex max-h-[90vh] w-full flex-col rounded-2xl bg-white shadow-xl dark:bg-surf-dark"
          :class="maxW"
        >
          <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-white/10">
            <h2 class="font-display text-lg font-bold text-slate-900 dark:text-white">{{ title }}</h2>
            <button
              @click="emit('close')"
              aria-label="Close"
              class="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-white"
            >
              ✕
            </button>
          </div>
          <div class="overflow-y-auto p-6">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.15s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
