import { NextResponse } from 'next/server'
import { saveFeedback } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/get-user'

export async function POST(request: Request) {
  const { user } = await getAuthenticatedUser(request)
  const userId = user?.id || null

  try {
    const { type, message, rating } = await request.json() as {
      type?: string
      message?: string
      rating?: number | null
    }

    if (
      !message ||
      typeof message !== 'string' ||
      message.trim().length < 3
    ) {
      return NextResponse.json(
        { error: 'Il messaggio deve avere almeno 3 caratteri' },
        { status: 400 }
      )
    }

    const result = await saveFeedback(userId, {
      type: type || 'general',
      message: message.trim(),
      rating: rating || null,
    })

    return NextResponse.json({ feedback: result }, { status: 201 })
  } catch (error) {
    console.error('Feedback save error:', error)
    return NextResponse.json(
      { error: 'Failed to save feedback' },
      { status: 500 }
    )
  }
}
