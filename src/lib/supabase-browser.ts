import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Crea un client Supabase per il browser (componenti client).
 * Usato per le azioni di autenticazione (signInWithPassword, signInWithOAuth, signOut).
 */
export function createBrowserSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) are not configured'
    )
  }

  return createClient(url, anonKey)
}
