import { createClient } from '@supabase/supabase-js'

// Anon key is public-safe — RLS is what actually protects the data.
// These come from .env (Vite exposes only VITE_-prefixed vars to the client).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
