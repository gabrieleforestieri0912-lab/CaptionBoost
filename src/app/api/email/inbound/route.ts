import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { saveInboundEmail } from '@/lib/db'
import { sendEmail } from '@/lib/resend'

export const dynamic = 'force-dynamic'

/**
 * Verifica la firma HMAC-SHA256 (X-Resend-Signature) sul body grezzo,
 * usando il webhook signing secret configurato nel dashboard Resend (Inbound).
 */
function verifySignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) return false

  try {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex')
    const received = Buffer.from(signature, 'hex')
    const expectedBuf = Buffer.from(expected, 'hex')
    return (
      received.length === expectedBuf.length &&
      crypto.timingSafeEqual(received, expectedBuf)
    )
  } catch {
    return false
  }
}

/**
 * Webhook Inbound di Resend: riceve le email mandate a un indirizzo del dominio
 * (es. supporto@captionboost.it), le salva in `inbound_emails` e notifica
 * l'admin con un riepilogo (la risposta dell'admin può usare Reply-To per
 * rispondere al mittente originale).
 *
 * Configurazione in Resend: Domains > Inbound > Route con webhook POST verso
 * `${NEXT_PUBLIC_APP_URL}/api/email/inbound` e salva il signing secret in
 * RESEND_WEBHOOK_SECRET.
 */
export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-resend-signature')

  if (!verifySignature(rawBody, signature)) {
    console.warn('⚠️ Inbound email: firma non valida, richiesta scartata')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const form = new URLSearchParams(rawBody)
  const from = form.get('From') || ''
  const to = form.get('To') || ''
  const subject = form.get('Subject') || ''
  const textBody = form.get('text') || ''
  const htmlBody = form.get('html') || ''
  const messageId = form.get('Message-Id') || ''

  try {
    const saved = await saveInboundEmail({
      from,
      to,
      subject,
      textBody,
      htmlBody,
      messageId,
    })

    // Notifica l'admin con un riepilogo; rispondendo da questa email si risponde
    // direttamente al mittente originale (reply_to).
    const adminEmail = process.env.RESEND_ADMIN_EMAIL
    if (adminEmail && from) {
      await sendEmail({
        to: adminEmail,
        subject: `📬 Nuova email ricevuta: ${subject || '(nessun oggetto)'}`,
        replyTo: from,
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #0f172a;">Nuova email ricevuta</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
              <tr><td style="padding: 6px 0; font-weight: bold; color: #475569;">Da</td><td style="padding: 6px 0; color: #1e293b;">${from}</td></tr>
              <tr><td style="padding: 6px 0; font-weight: bold; color: #475569;">Oggetto</td><td style="padding: 6px 0; color: #1e293b;">${subject || '—'}</td></tr>
              <tr><td style="padding: 6px 0; font-weight: bold; color: #475569;">Message-ID</td><td style="padding: 6px 0; color: #1e293b;">${messageId || '—'}</td></tr>
            </table>
            <div style="padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #1e293b; white-space: pre-wrap;">${(textBody || '—').slice(0, 5000)}</p>
            </div>
            <p style="margin-top: 16px; font-size: 12px; color: #94a3b8;">
              Rispondi a questa email per rispondere direttamente a ${from}. ID: ${saved?.id || 'N/A'}
            </p>
          </div>
        `,
      })
    }

    return NextResponse.json({ received: true, id: saved?.id || null })
  } catch (error) {
    console.error('Inbound email processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process inbound email' },
      { status: 500 }
    )
  }
}
