import { NextResponse } from 'next/server';
import { findUserByEmail, verifyVerificationToken, updateUser } from '@/lib/db';
import { addCorsHeaders } from '@/lib/cors';

export async function OPTIONS(request: Request) {
  return addCorsHeaders(new NextResponse(null, { status: 204 }), request)
}

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json() as { email: string; code: string };

    if (!email || !code) {
      return addCorsHeaders(
        NextResponse.json({ error: 'Email and code are required' }, { status: 400 }),
        request
      );
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return addCorsHeaders(
        NextResponse.json({ error: 'Invalid verification data' }, { status: 400 }),
        request
      );
    }

    const isValid = await verifyVerificationToken(user.id, code, 'email-verification');
    if (!isValid) {
      return addCorsHeaders(
        NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 400 }),
        request
      );
    }

    await updateUser(user.id, { emailVerified: new Date().toISOString() } as never);

    return addCorsHeaders(
      NextResponse.json({ message: 'Email verified successfully' }, { status: 200 }),
      request
    );
  } catch (error) {
    console.error('Email verification error:', error);
    return addCorsHeaders(
      NextResponse.json({ error: 'Failed to verify email' }, { status: 500 }),
      request
    );
  }
}
