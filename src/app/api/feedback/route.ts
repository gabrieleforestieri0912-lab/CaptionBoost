import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { saveFeedback } from '@/lib/db'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id || null

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
