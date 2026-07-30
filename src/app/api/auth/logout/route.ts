import { NextResponse } from 'next/server';
import { addCorsHeaders } from '@/lib/cors';

export async function OPTIONS(request: Request) {
  return addCorsHeaders(new NextResponse(null, { status: 204 }), request)
}

export async function POST(request: Request) {
  return addCorsHeaders(
    NextResponse.json({ message: 'Logged out successfully' }, { status: 200 }),
    request
  );
}
