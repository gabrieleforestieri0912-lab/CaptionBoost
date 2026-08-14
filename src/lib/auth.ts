import type { User as SupabaseUser } from '@supabase/supabase-js'
import { findUserById, updateUser } from '@/lib/db'
import { getSupabase } from '@/lib/supabase'
import type { User } from '@/lib/types'

function profileName(user: SupabaseUser): string | null {
  const meta = user.user_metadata || {}
  return meta.name || meta.full_name || null
}

function profileImage(user: SupabaseUser): string | null {
  const meta = user.user_metadata || {}
  return meta.avatar_url || meta.picture || null
}

/**
 * Garantisce che per ogni utente di Supabase Auth esista una riga nella tabella
 * `users` (profilo dell'app, con piani e abbonamenti). Se esiste già, aggiorna
 * nome e immagine quando cambiano.
 */
export async function ensureUserProfile(
  user: SupabaseUser
): Promise<User | null> {
  const existing = await findUserById(user.id)
  const name = profileName(user)
  const image = profileImage(user)

  if (existing) {
    if (
      (name && existing.name !== name) ||
      (image && existing.image !== image)
    ) {
      await updateUser(user.id, { name, image })
    }
    return existing
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('users')
    .insert({
      id: user.id,
      email: user.email || '',
      name: name || null,
      image: image || null,
      password: null, // la password è gestita da Supabase Auth
    })
    .select()
    .single()

  if (error) {
    console.error('ensureUserProfile insert error:', error)
    return null
  }

  return data as User
}
