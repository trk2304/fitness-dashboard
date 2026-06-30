import { ref } from 'vue'
import { supabase } from '../lib/supabase'

// Module-level singleton state: created once when this file is first imported,
// not per-component. Every useAuth() call returns these same refs, so the whole
// app shares one source of truth for "who's logged in".
const session = ref(null)
const loading = ref(true) // true until we've checked for an existing session
const authError = ref(null)

let initialized = false

function readOAuthErrorFromUrl() {
  // When OAuth fails (e.g. the allowlist trigger rejects a signup), Supabase
  // sends the user back with the error in the URL *hash* (#...), not the query
  // string. Parse it so we can show a real message instead of a blank login.
  const hash = window.location.hash.slice(1)
  if (!hash) return
  const params = new URLSearchParams(hash) // decodes %xx and + automatically
  const error = params.get('error')
  if (!error) return
  authError.value = params.get('error_description') || error
  // Strip the hash so a refresh doesn't resurrect a stale error.
  history.replaceState(null, '', window.location.pathname + window.location.search)
}

function init() {
  if (initialized) return // guard: run the wiring below exactly once
  initialized = true

  readOAuthErrorFromUrl()

  // 1) Is there already a session? A stored token means a page refresh keeps
  //    you logged in — this resolves that initial state.
  supabase.auth.getSession().then(({ data }) => {
    session.value = data.session
    loading.value = false
  })

  // 2) React to every later change for the app's lifetime: sign-in, sign-out,
  //    token refresh, and the OAuth redirect landing back here.
  supabase.auth.onAuthStateChange((_event, newSession) => {
    session.value = newSession
    loading.value = false
  })
}

export function useAuth() {
  init()

  async function signInWithGoogle() {
    authError.value = null
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      // After Google + Supabase finish, come back to this exact origin —
      // which is why localhost:5174 must be on Supabase's redirect allow-list.
      options: { redirectTo: window.location.origin },
    })
    if (error) authError.value = error.message
  }

  async function signOut() {
    await supabase.auth.signOut() // onAuthStateChange will null out the session
  }

  return { session, loading, authError, signInWithGoogle, signOut }
}
