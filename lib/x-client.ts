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
  // OAuth 1.0a: query-parameters horen in de parameterstring, de basis-URL zonder query (16 sep 2026 — GET users/me?user.fields gaf 401)
  const [baseUrl, qs] = url.split('?');
  const all: Record<string, string> = { ...op };
  if (qs) for (const [k, v] of new URLSearchParams(qs)) all[k] = v;
  const ps = Object.keys(all).sort().map(k => `${pct(k)}=${pct(all[k])}`).join('&');
  const base = `${method}&${pct(baseUrl)}&${pct(ps)}`;
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

/** Publieke metrics van het eigen account (volgers, volgend, posts). Leesrecht op /2/users/me. */
export async function myMetrics(): Promise<{ username: string; followers: number; following: number; tweets: number } | null> {
  try {
    const url = `${API}/users/me?user.fields=public_metrics`;
    const res = await fetch(url, { headers: { Authorization: oauthHeader('GET', url) }, signal: AbortSignal.timeout(15000) });
    const json = await res.json();
    const d = json?.data; if (!d) return null;
    const pm = d.public_metrics || {};
    return { username: d.username, followers: Number(pm.followers_count ?? 0), following: Number(pm.following_count ?? 0), tweets: Number(pm.tweet_count ?? 0) };
  } catch {
    return null;
  }
}

/** Debug (alleen localhost via /api/x-stats?debug=1): ruwe status + body van users/me. */
export async function myMetricsRaw(): Promise<{ hasCreds: boolean; status?: number; body?: string; error?: string }> {
  if (!hasXCreds()) return { hasCreds: false };
  try {
    const url = `${API}/users/me?user.fields=public_metrics`;
    const res = await fetch(url, { headers: { Authorization: oauthHeader('GET', url) }, signal: AbortSignal.timeout(15000) });
    return { hasCreds: true, status: res.status, body: (await res.text()).slice(0, 400) };
  } catch (e) { return { hasCreds: true, error: String(e).slice(0, 200) }; }
}
