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
      const { error } = await supabase.auth.exchangeCodeForSession(code)

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
