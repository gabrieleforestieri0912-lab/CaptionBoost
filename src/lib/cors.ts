import { NextResponse } from 'next/server'

const ALLOWED_ORIGINS = [
  'chrome-extension://',
  'moz-extension://',
  'edge-extension://',
]

export function addCorsHeaders(response: NextResponse, request: Request) {
  const origin = request.headers.get('origin') || ''
  const isExt = ALLOWED_ORIGINS.some((p) => origin.startsWith(p))
  if (isExt) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  }
  return response
}

export function corsResponse(body: unknown, init: ResponseInit, request: Request) {
  const resp = NextResponse.json(body, init)
  return addCorsHeaders(resp, request)
}
