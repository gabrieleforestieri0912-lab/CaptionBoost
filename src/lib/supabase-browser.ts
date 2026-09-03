import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

/**
 * Crea (una sola volta) il client Supabase per il browser (componenti client).
 *
 * Usa @supabase/ssr (storage basato sui cookie) invece di createClient di
 * supabase-js (localStorage): il flusso OAuth con PKCE salva il code verifier
 * nei cookie lato browser, così il server può leggerlo in /auth/callback
 * durante exchangeCodeForSession. Con localStorage lo scambio falliva con
 * AuthPKCECodeVerifierMissingError.
 *
 * Il singleton evita anche il warning "Multiple GoTrueClient instances detected
 * in the same browser context".
 *
 * Con `cookies.encode: "tokens-only"` nel cookie di sessione finiscono solo
 * access/refresh token (piccoli), mentre l'oggetto user (che con l'OAuth di
 * Google può essere enorme) va in localStorage. Senza, il cookie supera il
 * limite di header di Node (~16KB) e il server risponde 431 "Request Header
 * Fields Too Large" a ogni richiesta, bloccando il sito.
 */
export function createBrowserSupabase(): SupabaseClient {
  if (client) return client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) are not configured'
    )
  }

  client = createBrowserClient(url, anonKey, {
    // Solo i token nel cookie (vedi sopra): deve combaciare con il server.
    cookies: { encode: 'tokens-only' },
  })
  return client
}
