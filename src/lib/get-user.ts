import { findUserById, verifyToken } from '@/lib/db'
import { createServerSupabase } from '@/lib/supabase-server'
import { ensureUserProfile } from '@/lib/auth'
import type { User } from '@/lib/types'

/**
 * Restituisce l'utente autenticato.
 * 1) Sessione Supabase Auth (cookie di sessione nel browser).
 * 2) Fallback: token Bearer JWT (estensione / client API).
 */
export async function getAuthenticatedUser(
  request?: Request
): Promise<{ user: User | null; session: unknown | null }> {
  try {
    const supabase = await createServerSupabase()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (authUser) {
      const profile = await ensureUserProfile(authUser)
      return { user: profile, session: { user: authUser } }
    }
  } catch (error) {
    console.error('Supabase session check error:', error)
  }

  if (request) {
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const decoded = await verifyToken(token)
      if (decoded?.id) {
        const user = await findUserById(decoded.id)
        return { user, session: null }
      }
    }
  }

  return { user: null, session: null }
}
