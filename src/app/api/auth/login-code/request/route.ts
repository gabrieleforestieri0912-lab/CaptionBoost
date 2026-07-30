import { NextResponse } from 'next/server';
import { findUserByEmail, createVerificationToken } from '@/lib/db';
import { sendLoginCodeEmail } from '@/lib/email';
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
        NextResponse.json({ message: 'If the email exists, a code has been sent' }, { status: 200 }),
        request
      );
    }

    const verificationToken = await createVerificationToken(user.id, 'login');

    const sent = await sendLoginCodeEmail(email, verificationToken.code);

    if (!sent) {
      return addCorsHeaders(
        NextResponse.json({ error: 'Failed to send verification code' }, { status: 500 }),
        request
      );
    }

    console.log(`✅ Verification code sent to ${email}`);

    return addCorsHeaders(
      NextResponse.json({ message: 'If the email exists, a code has been sent' }, { status: 200 }),
      request
    );
  } catch (error) {
    console.error('Request login code error:', error);
    return addCorsHeaders(
      NextResponse.json({ error: 'Failed to request login code' }, { status: 500 }),
      request
    );
  }
}
