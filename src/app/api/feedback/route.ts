import { NextResponse } from 'next/server'
import { saveFeedback } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/get-user'
import { sendEmail } from '@/lib/resend'

export async function POST(request: Request) {
  const { user } = await getAuthenticatedUser(request)
  const userId = user?.id || null
  const userEmail = user?.email || 'anonymous'
  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || 'Anonymous'

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

    // Email di notifica (Resend). Destinatario fisso del proprietario:
    // i feedback arrivano SEMPRE qui, indipendentemente da RESEND_ADMIN_EMAIL
    // (usata invece per le notifiche delle email inbound).
    const FEEDBACK_DESTINATION = 'gabriele.forestieri0912@gmail.com'
    try {
      await sendEmail({
        to: FEEDBACK_DESTINATION,
        subject: `CaptionBoost Feedback: ${type || 'general'}`,
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #0f172a;">Nuovo Feedback Ricevuto</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; font-weight: bold; color: #475569;">Tipo</td><td style="padding: 8px 0; color: #1e293b;">${type || 'general'}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #475569;">Utente</td><td style="padding: 8px 0; color: #1e293b;">${userName} (${userEmail})</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #475569;">Rating</td><td style="padding: 8px 0; color: #1e293b;">${rating ? '★'.repeat(rating) + '☆'.repeat(5 - rating) : 'Non fornito'}</td></tr>
            </table>
            <div style="margin-top: 16px; padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #1e293b; white-space: pre-wrap;">${message.trim()}</p>
            </div>
            <p style="margin-top: 16px; font-size: 12px; color: #94a3b8;">Feedback ID: ${result.id || 'N/A'}</p>
          </div>
        `,
      })
    } catch (emailError) {
      console.error('Feedback email send error:', emailError)
    }

    return NextResponse.json({ feedback: result }, { status: 201 })
  } catch (error) {
    console.error('Feedback save error:', error)
    return NextResponse.json(
      { error: 'Failed to save feedback' },
      { status: 500 }
    )
  }
}
