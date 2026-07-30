import { NextResponse } from 'next/server';
import { verify, JwtPayload } from 'jsonwebtoken';
import { addCorsHeaders } from '@/lib/cors';

export async function OPTIONS(request: Request) {
  return addCorsHeaders(new NextResponse(null, { status: 204 }), request)
}

export async function GET(request: Request) {
  try {
    const JWT_SECRET = process.env.NEXTAUTH_SECRET
    if (!JWT_SECRET) {
      return addCorsHeaders(
        NextResponse.json({ error: 'Server configuration error' }, { status: 500 }),
        request
      )
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return addCorsHeaders(
        NextResponse.json({ error: 'Authorization header required' }, { status: 401 }),
        request
      );
    }

    const token = authHeader.substring(7);

    try {
      const decoded = verify(token, JWT_SECRET) as JwtPayload;
      return addCorsHeaders(
        NextResponse.json({ valid: true, user: decoded }, { status: 200 }),
        request
      );
    } catch {
      return addCorsHeaders(
        NextResponse.json({ valid: false, error: 'Invalid or expired token' }, { status: 401 }),
        request
      );
    }
  } catch (error) {
    console.error('Verify error:', error);
    return addCorsHeaders(
      NextResponse.json({ error: 'Failed to verify token' }, { status: 500 }),
      request
    );
  }
}
