import { Resend } from 'resend'

let resendClient: Resend | null = null

/** Client Resend singleton. Ritorna null se RESEND_API_KEY non è configurata. */
export function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  if (!resendClient) resendClient = new Resend(apiKey)
  return resendClient
}

/** Mittente predefinito: usa RESEND_EMAIL_FROM se configurato (dominio verificato). */
export function getEmailFrom(): string {
  return (
    process.env.RESEND_EMAIL_FROM ||
    '"CaptionBoost" <noreply@captionboost.it>'
  )
}

export interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
  from?: string
}

/**
 * Invia un'email via Resend.
 * Senza RESEND_API_KEY (es. sviluppo) logga il contenuto e ritorna
 * { sent: false, dev: true } così i flussi restano testabili in locale.
 */
export async function sendEmail(
  params: SendEmailParams
): Promise<{ sent: boolean; id?: string; dev?: boolean }> {
  const resend = getResend()
  if (!resend) {
    console.log(
      `\n📧 [RESEND NON CONFIGURATO — aggiungi RESEND_API_KEY]\n   A: ${params.to}\n   Oggetto: ${params.subject}\n   Reply-To: ${params.replyTo || '—'}\n`
    )
    return { sent: false, dev: true }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: params.from || getEmailFrom(),
      to: params.to,
      subject: params.subject,
      html: params.html,
      ...(params.replyTo ? { reply_to: params.replyTo } : {}),
    })

    if (error) {
      console.error('❌ Resend send error:', error.message)
      return { sent: false }
    }

    return { sent: true, id: data?.id }
  } catch (error) {
    console.error('❌ Resend send error:', (error as Error).message)
    return { sent: false }
  }
}
