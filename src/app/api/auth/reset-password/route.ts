import { NextResponse } from 'next/server';
import { findUserByEmail, verifyVerificationToken, updateUserPassword } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { email, code, password } = await request.json() as { email: string; code: string; password: string };

    if (!email || !code || !password) {
      return NextResponse.json(
        { error: 'Email, code, and new password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired code' },
        { status: 400 }
      );
    }

    const isValid = await verifyVerificationToken(user.id, code, 'password-reset');
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid or expired code' },
        { status: 400 }
      );
    }

    await updateUserPassword(user.id, password);

    return NextResponse.json(
      { message: 'Password reset successfully. You can now sign in.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}
