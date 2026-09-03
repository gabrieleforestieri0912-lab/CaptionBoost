import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { ensureUserProfile } from '@/lib/auth'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') || '/'
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin

  if (code) {
    try {
      const supabase = await createServerSupabase()
      // Il flusso OAuth di supabase-js (>= 2.8x) salva il code verifier PKCE in
      // una chiave per-flow e la riferisce nell'URL di redirect con `sb_flow_id`.
      // Senza passarla, exchangeCodeForSession cerca la chiave legacy (mai
      // scritta) e fallisce con AuthPKCECodeVerifierMissingError.
      const flowId = searchParams.get('sb_flow_id')
      const { error } = await supabase.auth.exchangeCodeForSession(
        code,
        flowId ? { flowId } : undefined
      )

      if (!error) {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          await ensureUserProfile(user)
        }
        return NextResponse.redirect(`${origin}${next}`)
      }

      console.error('OAuth code exchange error:', error)
    } catch (error) {
      console.error('OAuth callback error:', error)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`)
}
