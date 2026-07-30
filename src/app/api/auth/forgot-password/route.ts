import { NextResponse } from 'next/server';
import { findUserByEmail, createVerificationToken } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';
import { addCorsHeaders } from '@/lib/cors';

export async function OPTIONS(request: Request) {
  return addCorsHeaders(new NextResponse(null, { status: 204 }), request)
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json() as { email: string };

    if (!email) {
      return addCorsHeaders(
        NextResponse.json({ error: 'Email is required' }, { status: 400 }),
        request
      );
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return addCorsHeaders(
        NextResponse.json({ message: 'Se l\'email esiste, riceverai un codice di reset.' }, { status: 200 }),
        request
      );
    }

    const resetToken = await createVerificationToken(user.id, 'password-reset');
    const emailSent = await sendPasswordResetEmail(email, resetToken.code);

    if (emailSent) {
      return addCorsHeaders(
        NextResponse.json({ message: 'Codice di reset inviato alla tua email.' }, { status: 200 }),
        request
      );
    }

    if (process.env.NODE_ENV === 'development') {
      return addCorsHeaders(
        NextResponse.json({ message: 'Codice di reset (dev mode)', code: resetToken.code, dev: true }),
        request
      );
    }

    return addCorsHeaders(
      NextResponse.json({ message: 'Se l\'email esiste, riceverai un codice di reset.' }, { status: 200 }),
      request
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    return addCorsHeaders(
      NextResponse.json({ error: 'Failed to request password reset' }, { status: 500 }),
      request
    );
  }
}
