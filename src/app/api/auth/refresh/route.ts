import { NextResponse } from 'next/server';
import { verify, sign, JwtPayload } from 'jsonwebtoken';
import { findUserById } from '@/lib/db';
import { addCorsHeaders } from '@/lib/cors';

export async function OPTIONS(request: Request) {
  return addCorsHeaders(new NextResponse(null, { status: 204 }), request)
}

export async function POST(request: Request) {
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

    const oldToken = authHeader.substring(7);

    let decoded: JwtPayload & { id?: string; email?: string };
    try {
      decoded = verify(oldToken, JWT_SECRET) as JwtPayload & { id?: string; email?: string };
    } catch {
      return addCorsHeaders(
        NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }),
        request
      );
    }

    if (!decoded.id) {
      return addCorsHeaders(
        NextResponse.json({ error: 'Invalid token payload' }, { status: 401 }),
        request
      );
    }

    const user = await findUserById(decoded.id);
    if (!user) {
      return addCorsHeaders(
        NextResponse.json({ error: 'User not found' }, { status: 404 }),
        request
      );
    }

    const newToken = sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return addCorsHeaders(
      NextResponse.json({
        message: 'Token refreshed',
        token: newToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      }, { status: 200 }),
      request
    );
  } catch (error) {
    console.error('Refresh error:', error);
    return addCorsHeaders(
      NextResponse.json({ error: 'Failed to refresh token' }, { status: 500 }),
      request
    );
  }
}
