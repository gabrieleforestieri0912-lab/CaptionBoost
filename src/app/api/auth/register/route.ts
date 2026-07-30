import { NextResponse } from 'next/server';
import { createUser } from '@/lib/db';
import { addCorsHeaders } from '@/lib/cors';

export async function OPTIONS(request: Request) {
  return addCorsHeaders(new NextResponse(null, { status: 204 }), request)
}

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json() as { email: string; password: string; name: string };

    if (!email || !password || !name) {
      return addCorsHeaders(
        NextResponse.json({ error: 'Email, password, and name are required' }, { status: 400 }),
        request
      );
    }

    if (password.length < 8) {
      return addCorsHeaders(
        NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 }),
        request
      );
    }

    const user = await createUser({ email, password, name });

    return addCorsHeaders(
      NextResponse.json({ message: 'User registered successfully', user }, { status: 201 }),
      request
    );
  } catch (error) {
    console.error('Registration error:', error);
    const message = error instanceof Error ? error.message : 'Failed to register user';
    const statusCode = message === 'User already exists with this email' ? 409 : 500;
    return addCorsHeaders(
      NextResponse.json({ error: message }, { status: statusCode }),
      request
    );
  }
}
