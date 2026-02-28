// Supabase Edge Function — send an APNs push notification directly.
//
// Required secrets (set via Supabase Dashboard > Project Settings > Edge Functions,
// or via `npx supabase secrets set`):
//   APNS_KEY       — full contents of the .p8 file from Apple Developer portal
//   APNS_KEY_ID    — 10-character key ID shown on the Keys page
//   APNS_TEAM_ID   — 10-character team ID from Apple Developer portal
//   APNS_BUNDLE_ID — e.g. com.ivanxcc.ticket
//   APNS_SANDBOX   — "true" for dev/sandbox builds, "false" for production
//                    (defaults to "true" if unset)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  // Verify caller has a valid Supabase session
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: 'Unauthorized' }, 401);

  // Parse request body
  const { deviceToken, title, body, data } = await req.json() as {
    deviceToken: string;
    title: string;
    body: string;
    data?: Record<string, string>;
  };

  if (!deviceToken || !title || !body) {
    return json({ error: 'Missing required fields: deviceToken, title, body' }, 400);
  }

  // Read APNs secrets
  const apnsKey     = Deno.env.get('APNS_KEY');
  const apnsKeyId   = Deno.env.get('APNS_KEY_ID');
  const apnsTeamId  = Deno.env.get('APNS_TEAM_ID');
  const bundleId    = Deno.env.get('APNS_BUNDLE_ID') ?? 'com.ivanxcc.ticket';
  const sandbox     = Deno.env.get('APNS_SANDBOX') !== 'false';

  if (!apnsKey || !apnsKeyId || !apnsTeamId) {
    console.warn('[send-push] APNs secrets not configured');
    return json({ error: 'Push not configured' }, 503);
  }

  try {
    const jwt  = await buildApnsJwt(apnsKey, apnsKeyId, apnsTeamId);
    const host = sandbox ? 'api.sandbox.push.apple.com' : 'api.push.apple.com';

    const apnsRes = await fetch(`https://${host}/3/device/${deviceToken}`, {
      method: 'POST',
      headers: {
        authorization: `bearer ${jwt}`,
        'apns-topic': bundleId,
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        aps: { alert: { title, body }, sound: 'default' },
        ...(data ?? {}),
      }),
    });

    if (apnsRes.status === 200) return json({ ok: true }, 200);

    const apnsErr = await apnsRes.text();
    console.error(`[send-push] APNs ${apnsRes.status}:`, apnsErr);
    return json({ error: 'APNs error', detail: apnsErr }, 502);
  } catch (err) {
    console.error('[send-push] Exception:', err);
    return json({ error: String(err) }, 500);
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Builds a signed APNs provider JWT (ES256).
 * APNs requires the signature in IEEE P1363 format (raw 64-byte r||s),
 * NOT the DER format that crypto.subtle produces — hence the conversion.
 */
async function buildApnsJwt(p8Pem: string, keyId: string, teamId: string): Promise<string> {
  const header  = b64u(JSON.stringify({ alg: 'ES256', kid: keyId }));
  const payload = b64u(JSON.stringify({ iss: teamId, iat: Math.floor(Date.now() / 1000) }));
  const message = `${header}.${payload}`;

  const pemBody = p8Pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');

  const keyBytes = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );

  const derSig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(message),
  );

  // Convert DER → IEEE P1363 (raw r||s, 64 bytes)
  const sig = derToP1363(new Uint8Array(derSig));
  return `${message}.${b64u(sig)}`;
}

/** base64url-encode a string, Uint8Array, or ArrayBuffer */
function b64u(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Converts a DER-encoded ECDSA signature to IEEE P1363 (raw r||s, 64 bytes).
 * DER: SEQUENCE { INTEGER r, INTEGER s }
 * P1363: r left-padded to 32 bytes || s left-padded to 32 bytes
 */
function derToP1363(der: Uint8Array): Uint8Array {
  let pos = 2; // skip SEQUENCE tag + length
  if (der[1] & 0x80) pos += der[1] & 0x7f; // multi-byte length (rare)

  pos++;                         // skip INTEGER tag for r
  const rLen = der[pos++];
  const r    = der.slice(pos, pos + rLen); pos += rLen;

  pos++;                         // skip INTEGER tag for s
  const sLen = der[pos++];
  const s    = der.slice(pos, pos + sLen);

  const result   = new Uint8Array(64);
  const rTrimmed = r[0] === 0 ? r.slice(1) : r; // strip DER leading 0x00
  const sTrimmed = s[0] === 0 ? s.slice(1) : s;
  result.set(rTrimmed, 32 - rTrimmed.length);
  result.set(sTrimmed, 64 - sTrimmed.length);
  return result;
}
