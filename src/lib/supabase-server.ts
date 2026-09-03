import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Crea un client Supabase lato server legato ai cookie della richiesta.
 * Da usare nelle Route Handler e nei Server Component per leggere la sessione.
 */
export async function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) are not configured'
    )
  }

  const cookieStore = await cookies()

  return createServerClient(url, anonKey, {
    cookies: {
      // Solo i token nel cookie di sessione (l'utente resta in memoria): deve
      // combaciare con createBrowserClient, altrimenti il cookie con i metadati
      // OAuth di Google supera il limite header di Node (~16KB) -> 431.
      encode: 'tokens-only',
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Chiamato da un Server Component: il set dei cookie non è consentito, ignora
        }
      },
    },
  })
}
