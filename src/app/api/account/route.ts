import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { updateUser, updateUserPassword } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/get-user'
import { createServerSupabase } from '@/lib/supabase-server'
import { checkTranslationLimit } from '@/lib/usage-limit'

export async function GET(request: Request) {
  const { user } = await getAuthenticatedUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Con Supabase Auth la password è gestita da Supabase: la rileviamo dal provider
  // dell'utente (email = password, google = accesso sociale).
  let hasPassword = Boolean(user.password)
  try {
    const supabase = await createServerSupabase()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (authUser?.app_metadata?.provider === 'email') hasPassword = true
    if (authUser?.app_metadata?.provider === 'google') hasPassword = false
  } catch {
    // nessuna sessione Supabase: resta il valore legacy
  }

  const planInfo: {
    plan: string
    maxVideos: number
    translatedVideosCount: number
    subscriptionStatus: string
    translationsUsed?: number
    translationsLimit?: number | 'unlimited'
    translationsRemaining?: number | null
  } = {
    plan: user.subscriptionPlan || 'free',
    maxVideos: user.planMaxVideos || 10,
    translatedVideosCount: user.translatedVideosCount || 0,
    subscriptionStatus: user.subscriptionStatus || 'none',
  }

  // Quota traduzioni mensile calcolata lato server (il popup non deve più
  // fare affidamento su contatori locali manipolabili).
  try {
    const quota = await checkTranslationLimit(user)
    planInfo.translationsUsed = quota.used
    planInfo.translationsLimit = quota.limit
    planInfo.translationsRemaining = quota.remaining
  } catch (error) {
    console.error('Translation quota check error:', error)
  }

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name || '',
      email: user.email || '',
      image: user.image || null,
      hasPassword,
    },
    plan: planInfo,
  })
}

export async function PATCH(request: Request) {
  const { user } = await getAuthenticatedUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { name } = await request.json() as { name?: string }
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Name must be at least 2 characters' },
        { status: 400 }
      )
    }

    const updated = await updateUser(user.id, { name: name.trim() })
    return NextResponse.json({ user: updated })
  } catch (error) {
    console.error('Account profile update error:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  const { user } = await getAuthenticatedUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { currentPassword, newPassword } = await request.json() as {
      currentPassword?: string
      newPassword?: string
    }

    if (
      !newPassword ||
      typeof newPassword !== 'string' ||
      newPassword.length < 8
    ) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters' },
        { status: 400 }
      )
    }

    if (!currentPassword || typeof currentPassword !== 'string') {
      return NextResponse.json(
        { error: 'Current password is required' },
        { status: 400 }
      )
    }

    // Percorso Supabase Auth (web): la password è gestita da Supabase
    try {
      const supabase = await createServerSupabase()
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (authUser) {
        if (authUser.app_metadata?.provider === 'google') {
          return NextResponse.json(
            { error: 'Password change is not available for this account' },
            { status: 400 }
          )
        }

        const { error: verifyErr } = await supabase.auth.signInWithPassword({
          email: authUser.email || '',
          password: currentPassword,
        })
        if (verifyErr) {
          return NextResponse.json(
            { error: 'Current password is incorrect' },
            { status: 400 }
          )
        }

        const { error: updateErr } = await supabase.auth.updateUser({
          password: newPassword,
        })
        if (updateErr) {
          console.error('Supabase password update error:', updateErr)
          return NextResponse.json(
            { error: 'Failed to update password' },
            { status: 500 }
          )
        }

        return NextResponse.json({ message: 'Password updated successfully' })
      }
    } catch (error) {
      console.error('Supabase password update error:', error)
    }

    // Percorso legacy (token Bearer / utenti con password nella tabella users)
    if (!user.password) {
      return NextResponse.json(
        { error: 'Password change is not available for this account' },
        { status: 400 }
      )
    }

    const isValid = await bcrypt.compare(currentPassword, user.password)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      )
    }

    await updateUserPassword(user.id, newPassword)
    return NextResponse.json({ message: 'Password updated successfully' })
  } catch (error) {
    console.error('Account password update error:', error)
    return NextResponse.json(
      { error: 'Failed to update password' },
      { status: 500 }
    )
  }
}
