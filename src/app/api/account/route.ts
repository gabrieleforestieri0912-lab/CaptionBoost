import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { updateUser, updateUserPassword } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/get-user'

export async function GET(request: Request) {
  const { session, user } = await getAuthenticatedUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const planInfo = {
    plan: user.subscriptionPlan || 'free',
    maxVideos: user.planMaxVideos || 10,
    translatedVideosCount: user.translatedVideosCount || 0,
    subscriptionStatus: user.subscriptionStatus || 'none',
  }

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name || '',
      email: user.email || '',
      image: user.image || null,
      hasPassword: Boolean(user.password),
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

    if (!user.password) {
      return NextResponse.json(
        { error: 'Password change is not available for this account' },
        { status: 400 }
      )
    }

    if (!currentPassword || typeof currentPassword !== 'string') {
      return NextResponse.json(
        { error: 'Current password is required' },
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
