import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAuthenticatedUser, verifyUserToken } from '@/lib/auth';
import { queryHealthD1 } from '@/lib/digilockerHelper';

export const dynamic = 'force-dynamic';

/**
 * GET /api/digilocker/authorize
 * Initiates DigiLocker OAuth2 with PKCE and HMAC state signature
 */
export async function GET(req: NextRequest) {
  // Check auth from cookie or query token
  let authUser = getAuthenticatedUser();
  const tokenParam = req.nextUrl.searchParams.get('token');
  if (!authUser && tokenParam) {
    authUser = verifyUserToken(tokenParam);
  }

  const host = req.headers.get('host') || 'localhost:3000';
  const protocol = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  const defaultClientUrl = `${protocol}://${host}`;

  if (!authUser) {
    return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent('/profile')}`, defaultClientUrl));
  }

  const clientId = 'MK0F1D807D';
  const redirectUri = 'https://medizoserver.vercel.app/api/digilocker/callback';
  const baseUrl = 'https://digilocker.meripehchaan.gov.in';

  // Generate PKCE code verifier and challenge
  const state = crypto.randomBytes(16).toString('hex');
  const nonce = crypto.randomBytes(16).toString('hex');
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  // Originating client url to return to after verification
  let clientUrl = req.nextUrl.searchParams.get('client_url') || defaultClientUrl;
  try {
    const parsed = new URL(clientUrl);
    clientUrl = `${parsed.protocol}//${parsed.host}`;
  } catch (e) {
    clientUrl = defaultClientUrl;
  }
  const encodedClientUrl = Buffer.from(clientUrl).toString('base64url');

  // Pre-seed and ensure student exists in Health D1 database as an exam bridge record
  // (Uses role 'exam_student' so it never shows as a doctor/patient in the health application)
  try {
    const parts = (authUser.name || 'Student User').trim().split(' ');
    const firstName = parts[0] || 'Student';
    const lastName = parts.slice(1).join(' ') || '.';
    await queryHealthD1(
      'INSERT INTO users (id, firstName, lastName, email, role, status) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET id=excluded.id, firstName=excluded.firstName, lastName=excluded.lastName, role=excluded.role, status=excluded.status',
      [authUser.userId, firstName, lastName, (authUser.email || '').toLowerCase().trim(), 'exam_student', 'exam_portal_bridge']
    );
  } catch (err) {
    console.warn('[Authorize] Health D1 pre-seed warning:', err);
  }

  // Sign state payload using HMAC with the shared key recognized by the callback gateway
  const secret = 'medizo_jwt_secret_key_2026_health';
  const rawPayload = `${state}|${authUser.userId}|${encodedClientUrl}|${codeVerifier}`;
  const hmacSig = crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');
  const signedState = `${rawPayload}|${hmacSig}`;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state: signedState,
    scope: 'openid',
    nonce: nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const authUrl = `${baseUrl}/public/oauth2/1/authorize?${params.toString()}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redirecting to DigiLocker MeriPehchaan Gateway...</title>
  <meta http-equiv="refresh" content="2;url=${authUrl}">
  <style>
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0B192C;
      color: #F8FAFC;
    }
    .card {
      text-align: center;
      padding: 2.5rem;
      background: rgba(30, 41, 59, 0.7);
      border: 1px solid rgba(56, 189, 248, 0.25);
      border-radius: 24px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      max-width: 420px;
      width: 90%;
    }
    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid rgba(56, 189, 248, 0.2);
      border-top-color: #38BDF8;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1.5rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h2 { font-size: 1.25rem; font-weight: 800; margin: 0 0 0.5rem; color: #FFFFFF; }
    p { color: #94A3B8; font-size: 0.875rem; margin: 0; line-height: 1.5; }
    .badge {
      display: inline-block;
      margin-top: 1.25rem;
      padding: 0.35rem 0.85rem;
      background: rgba(56, 189, 248, 0.15);
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      color: #38BDF8;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h2>Connecting to DigiLocker</h2>
    <p>Establishing secure 256-bit SSL encrypted connection with Govt. of India MeriPehchaan Depository...</p>
    <div class="badge">National Academic Depository Gateway</div>
  </div>
  <script>
    setTimeout(function() {
      window.location.href = ${JSON.stringify(authUrl)};
    }, 400);
  </script>
</body>
</html>`;

  const response = new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
    },
  });

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 600, // 10 minutes
    path: '/',
  };

  response.cookies.set('examizo_dl_state', signedState, cookieOptions);
  response.cookies.set('examizo_dl_code_verifier', codeVerifier, cookieOptions);
  response.cookies.set('examizo_dl_uid', authUser.userId, cookieOptions);

  return response;
}
