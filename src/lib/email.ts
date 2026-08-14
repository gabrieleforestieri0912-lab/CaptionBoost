import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendLoginCodeEmail(
  email: string,
  code: string
): Promise<boolean> {
  // Stampa il codice nel terminale per testare l'accesso senza SMTP configurato
  console.log('\n📧 LOGIN CODE per', email, '→', code, '\n')

  try {
    const info = await transporter.sendMail({
      from:
        process.env.SMTP_FROM || '"CaptionBoost" <noreply@captionboost.it>',
      to: email,
      subject: 'Il tuo codice di accesso - CaptionBoost',
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 24px; color: #0f172a; margin: 0;">CaptionBoost</h1>
          </div>
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px;">
            <h2 style="font-size: 20px; color: #0f172a; margin: 0 0 8px;">Codice di accesso</h2>
            <p style="color: #64748b; margin: 0 0 24px; line-height: 1.5;">
              Usa il codice qui sotto per accedere a CaptionBoost. Il codice scade tra 10 minuti.
            </p>
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="display: inline-block; background: #EDF4FF; border: 2px dashed #4C94FF; border-radius: 12px; padding: 16px 32px; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #4C94FF;">
                ${code}
              </div>
            </div>
            <p style="color: #94a3b8; font-size: 13px; margin: 0; text-align: center;">
              Se non hai richiesto questo codice, puoi ignorare questa email.
            </p>
          </div>
        </div>
      `,
    })

    return true
  } catch (error) {
    console.error(
      '❌ Failed to send login code email:',
      (error as Error).message
    )
    return false
  }
}

export async function sendPasswordResetEmail(
  email: string,
  code: string
): Promise<boolean> {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const resetUrl = `${appUrl}/reset-password?email=${encodeURIComponent(email)}`

  try {
    const info = await transporter.sendMail({
      from:
        process.env.SMTP_FROM || '"CaptionBoost" <noreply@captionboost.it>',
      to: email,
      subject: 'Password Reset - CaptionBoost',
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 24px; color: #0f172a; margin: 0;">CaptionBoost</h1>
          </div>
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px;">
            <h2 style="font-size: 20px; color: #0f172a; margin: 0 0 8px;">Password Reset</h2>
            <p style="color: #64748b; margin: 0 0 24px; line-height: 1.5;">
              Use the code below to reset your password. This code expires in 10 minutes.
            </p>
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="display: inline-block; background: #EDF4FF; border: 2px dashed #4C94FF; border-radius: 12px; padding: 16px 32px; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #4C94FF;">
                ${code}
              </div>
            </div>
            <p style="color: #64748b; margin: 0 0 24px; line-height: 1.5;">
              Or click the button below to reset your password:
            </p>
            <div style="text-align: center; margin-bottom: 24px;">
              <a href="${resetUrl}" style="display: inline-block; background: #4C94FF; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">
                Reset Password
              </a>
            </div>
            <p style="color: #94a3b8; font-size: 13px; margin: 0; text-align: center;">
              If you didn't request this, you can safely ignore this email.
            </p>
          </div>
        </div>
      `,
    })

    return true
  } catch (error) {
    console.error(
      '❌ Failed to send password reset email:',
      (error as Error).message
    )
    return false
  }
}
