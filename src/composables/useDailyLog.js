import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

// Format a Date as YYYY-MM-DD in the user's *local* zone (not UTC), so "today"
// means today where the user is. Shared single source of truth for dates.
function localDateOf(d) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}
export function todayLocalDate() {
  return localDateOf(new Date())
}

// Module-level singleton: one shared copy of the daily_log data for the whole
// app. QuickEntry writes then calls refresh(); StatusCards (and later the
// charts) just read. The DB schema is untouched — this is only a client cache.
const rows = ref([]) // all daily_log rows, newest entry_date first
const loading = ref(true)
const error = ref(null)
let initialized = false

const today = todayLocalDate()

// Today's row, or null if today hasn't been logged yet.
const todayRow = computed(() => rows.value.find((r) => r.entry_date === today) ?? null)

// Workout streak, computed at read time from workout_done (never stored as a
// counter — see CLAUDE.md). Rule: start at today; if today isn't worked-out yet
// (no row, or logged false), step back a day first so an "in progress" today
// never zeroes the streak. Then count consecutive prior days that are
// workout_done=true, stopping at the first false/missing day.
const workoutStreak = computed(() => {
  const done = new Map(rows.value.map((r) => [r.entry_date, r.workout_done]))
  const cursor = new Date(today + 'T00:00:00') // local midnight today
  if (done.get(today) !== true) {
    cursor.setDate(cursor.getDate() - 1)
  }
  let streak = 0
  while (done.get(localDateOf(cursor)) === true) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
})

async function refresh() {
  loading.value = true
  error.value = null
  // No user_id filter: RLS scopes the read to the logged-in owner.
  const { data, error: err } = await supabase
    .from('daily_log')
    .select(
      'entry_date, weight_lbs, steps, calories, protein_g, workout_done, step_goal, calorie_goal, protein_goal'
    )
    .order('entry_date', { ascending: false })

  if (err) {
    error.value = err.message
  } else {
    rows.value = data
  }
  loading.value = false
}

function init() {
  if (initialized) return
  initialized = true
  refresh()
}

export function useDailyLog() {
  init()
  return { rows, todayRow, workoutStreak, loading, error, refresh, today }
}
