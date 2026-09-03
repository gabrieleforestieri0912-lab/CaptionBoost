import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { ensureUserProfile } from '@/lib/auth';
import { generateToken } from '@/lib/db';
import { addCorsHeaders } from '@/lib/cors';

export async function OPTIONS(request: Request) {
  return addCorsHeaders(new NextResponse(null, { status: 204 }), request)
}

/**
 * Sincronizza l'autenticazione sito → estensione.
 *
 * Riceve il token di accesso Supabase della sessione del sito (letto dai cookie
 * dal content script bridge.js) e lo scambia con un JWT dell'app (30 giorni):
 * così l'estensione usa lo stesso meccanismo Bearer di sempre, senza dipendere
 * dal cookie di sessione del sito (SameSite=Lax, non inviato da chrome-extension://)
 * o dalla scadenza oraria del token Supabase.
 */
export async function POST(request: Request) {
  try {
    const { token } = await request.json() as { token?: string };

    if (!token || typeof token !== 'string') {
      return addCorsHeaders(
        NextResponse.json({ error: 'Token is required' }, { status: 400 }),
        request
      );
    }

    // Valida il token Supabase tramite il server Auth (nessun secret extra):
    // supabase.auth.getUser(jwt) verifica firma, scadenza e restituisce l'utente.
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return addCorsHeaders(
        NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }),
        request
      );
    }

    const profile = await ensureUserProfile(data.user);
    if (!profile) {
      return addCorsHeaders(
        NextResponse.json({ error: 'Failed to load user profile' }, { status: 500 }),
        request
      );
    }

    const appToken = await generateToken(profile);

    return addCorsHeaders(
      NextResponse.json({ message: 'Sync successful', token: appToken, user: profile }, { status: 200 }),
      request
    );
  } catch (error) {
    console.error('Auth sync error:', error);
    return addCorsHeaders(
      NextResponse.json({ error: 'Failed to sync authentication' }, { status: 500 }),
      request
    );
  }
}
