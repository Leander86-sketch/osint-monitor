import crypto from 'crypto';

// Minimal OAuth 1.0a client for posting to the ARGUS X account (@ArgusDashboard).
// Write-only by design: posts to our own account and verifies the returned
// tweet id (lesson learned: never trust an HTTP 200 without an id).

const API = 'https://api.x.com/2';

function creds() {
  const { X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET } = process.env;
  if (!X_API_KEY || !X_API_SECRET || !X_ACCESS_TOKEN || !X_ACCESS_SECRET) return null;
  return { ck: X_API_KEY, cs: X_API_SECRET, at: X_ACCESS_TOKEN, ats: X_ACCESS_SECRET };
}

export function hasXCreds(): boolean {
  return creds() !== null;
}

function pct(s: string): string {
  return encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function oauthHeader(method: string, url: string): string {
  const c = creds()!;
  const op: Record<string, string> = {
    oauth_consumer_key: c.ck,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: c.at,
    oauth_version: '1.0',
  };
  const ps = Object.keys(op).sort().map(k => `${pct(k)}=${pct(op[k])}`).join('&');
  const base = `${method}&${pct(url)}&${pct(ps)}`;
  const key = `${pct(c.cs)}&${pct(c.ats)}`;
  op.oauth_signature = crypto.createHmac('sha1', key).update(base).digest('base64');
  return 'OAuth ' + Object.keys(op).sort().map(k => `${pct(k)}="${pct(op[k])}"`).join(', ');
}

export async function postTweet(text: string, replyToId?: string): Promise<string> {
  const url = `${API}/tweets`;
  const body: { text: string; reply?: { in_reply_to_tweet_id: string } } = { text };
  if (replyToId) body.reply = { in_reply_to_tweet_id: replyToId };
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: oauthHeader('POST', url), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const json = await res.json().catch(() => ({}));
  const id = json?.data?.id;
  if (!res.ok || !id) {
    throw new Error(`X post failed (${res.status}): ${JSON.stringify(json).slice(0, 300)}`);
  }
  return id;
}

export async function whoAmI(): Promise<{ username: string; id: string } | null> {
  try {
    const url = `${API}/users/me`;
    const res = await fetch(url, { headers: { Authorization: oauthHeader('GET', url) }, signal: AbortSignal.timeout(15000) });
    const json = await res.json();
    return json?.data ? { username: json.data.username, id: json.data.id } : null;
  } catch {
    return null;
  }
}
