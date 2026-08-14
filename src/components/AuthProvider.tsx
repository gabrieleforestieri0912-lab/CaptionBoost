'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { createBrowserSupabase } from '@/lib/supabase-browser'

export interface SessionUser {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  subscriptionPlan?: string
  subscriptionStatus?: string | null
}

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthContextValue {
  user: SessionUser | null
  status: AuthStatus
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  status: 'loading',
  signOut: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

function mapUser(supabaseUser: {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown>
}): SessionUser {
  const meta = supabaseUser.user_metadata || {}
  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    name: (meta.name as string) || (meta.full_name as string) || null,
    image: (meta.avatar_url as string) || (meta.picture as string) || null,
  }
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  useEffect(() => {
    let active = true
    const supabase = createBrowserSupabase()

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      if (data.session?.user) {
        setUser(mapUser(data.session.user))
        setStatus('authenticated')
      } else {
        setStatus('unauthenticated')
      }
    })

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return
        if (session?.user) {
          setUser(mapUser(session.user))
          setStatus('authenticated')
        } else {
          setUser(null)
          setStatus('unauthenticated')
        }
      }
    )

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  const signOut = useCallback(async () => {
    const supabase = createBrowserSupabase()
    await supabase.auth.signOut()
    setUser(null)
    setStatus('unauthenticated')
  }, [])

  return (
    <AuthContext.Provider value={{ user, status, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
