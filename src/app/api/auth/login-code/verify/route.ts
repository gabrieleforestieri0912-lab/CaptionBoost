import { NextResponse } from 'next/server';
import { findUserByEmail, verifyVerificationToken, updateUserLastLogin, generateToken } from '@/lib/db';
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
        NextResponse.json({ error: 'Invalid email or code' }, { status: 401 }),
        request
      );
    }

    const isValid = await verifyVerificationToken(user.id, code, 'login');
    if (!isValid) {
      return addCorsHeaders(
        NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 }),
        request
      );
    }

    await updateUserLastLogin(user.id);

    const token = await generateToken(user);

    const { password: _, ...userWithoutPassword } = user as { password?: string };

    return addCorsHeaders(
      NextResponse.json({ message: 'Login successful', user: userWithoutPassword, token }, { status: 200 }),
      request
    );
  } catch (error) {
    console.error('Verify login code error:', error);
    return addCorsHeaders(
      NextResponse.json({ error: 'Failed to verify login code' }, { status: 500 }),
      request
    );
  }
}
