import { NextResponse } from 'next/server';
import { findUserByEmail, createUser } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { code, redirectUri } = await request.json() as { code: string; redirectUri?: string };

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Google OAuth is not configured' },
        { status: 500 }
      );
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri || process.env.NEXTAUTH_URL || '',
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Google token exchange error:', error);
      return NextResponse.json(
        { error: 'Failed to exchange authorization code' },
        { status: 400 }
      );
    }

    const tokenData = await tokenResponse.json() as { access_token: string };

    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to get user info' },
        { status: 400 }
      );
    }

    const userInfo = await userInfoResponse.json() as { email: string; name?: string; picture?: string };

    const existingUser = await findUserByEmail(userInfo.email);

    if (existingUser) {
      const { password: _, ...userWithoutPassword } = existingUser;

      return NextResponse.json(
        {
          message: 'Google login successful',
          user: userWithoutPassword,
          token: tokenData.access_token,
        },
        { status: 200 }
      );
    }

    const newUser = await createUser({
      email: userInfo.email,
      name: userInfo.name || null,
      image: userInfo.picture || null,
      password: null,
    });

    return NextResponse.json(
      {
        message: 'Google login successful',
        user: newUser,
        token: tokenData.access_token,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Google auth error:', error);
    return NextResponse.json(
      { error: 'Failed to authenticate with Google' },
      { status: 500 }
    );
  }
}
