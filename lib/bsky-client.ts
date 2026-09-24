// Bluesky (AT Protocol) client voor het ARGUS-account — 24 sep 2026.
// Zelfde rol als x-client.ts: alleen posten naar ons eigen account, en de teruggegeven uri controleren.
// Inloggen met een app-password (BSKY_HANDLE + BSKY_APP_PASSWORD in .env.local); het hoofdwachtwoord komt hier nooit.
// Links worden als facet gemarkeerd (anders zijn ze niet klikbaar) en de eerste link krijgt een linkkaart
// (external embed) op basis van de Open Graph-tags van de pagina.

const PDS = 'https://bsky.social/xrpc';

function creds() {
  const { BSKY_HANDLE, BSKY_APP_PASSWORD } = process.env;
  if (!BSKY_HANDLE || !BSKY_APP_PASSWORD) return null;
  return { handle: BSKY_HANDLE, password: BSKY_APP_PASSWORD };
}

export function hasBskyCreds(): boolean {
  return creds() !== null;
}

interface Session { did: string; accessJwt: string }
let cached: { s: Session; at: number } | null = null;

async function session(): Promise<Session> {
  if (cached && Date.now() - cached.at < 30 * 60_000) return cached.s;
  const c = creds();
  if (!c) throw new Error('Bluesky credentials not configured');
  const res = await fetch(`${PDS}/com.atproto.server.createSession`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: c.handle, password: c.password }), signal: AbortSignal.timeout(20000),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.accessJwt) throw new Error(`Bluesky login failed (${res.status}): ${JSON.stringify(j).slice(0, 200)}`);
  cached = { s: { did: j.did, accessJwt: j.accessJwt }, at: Date.now() };
  return cached.s;
}

// Byte-posities (UTF-8) van links in de tekst, zoals AT Protocol ze wil.
function linkFacets(text: string) {
  const enc = new TextEncoder(); const out: unknown[] = []; const re = /https?:\/\/[^\s)]+/g; let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const start = enc.encode(text.slice(0, m.index)).length; const end = start + enc.encode(m[0]).length;
    out.push({ index: { byteStart: start, byteEnd: end }, features: [{ $type: 'app.bsky.richtext.facet#link', uri: m[0] }] });
  }
  return out;
}

async function uploadBlob(s: Session, bytes: ArrayBuffer, mime: string) {
  const res = await fetch(`${PDS}/com.atproto.repo.uploadBlob`, {
    method: 'POST', headers: { Authorization: `Bearer ${s.accessJwt}`, 'Content-Type': mime }, body: bytes, signal: AbortSignal.timeout(30000),
  });
  const j = await res.json().catch(() => ({}));
  return res.ok ? j.blob : null;
}

// Linkkaart uit de Open Graph-tags van de pagina; mislukt dit, dan gaat de post zonder kaart.
async function externalEmbed(s: Session, url: string) {
  try {
    const html = await (await fetch(url, { headers: { 'user-agent': 'ARGUS-bsky/1.0' }, signal: AbortSignal.timeout(15000) })).text();
    const meta = (p: string) => html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]+content=["']([^"']*)`, 'i'))?.[1]
      || html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${p}["']`, 'i'))?.[1] || '';
    const title = meta('og:title') || html.match(/<title[^>]*>([^<]*)/i)?.[1] || url;
    const description = meta('og:description') || meta('description') || '';
    const img = meta('og:image');
    const external: Record<string, unknown> = { uri: url, title: title.slice(0, 200), description: description.slice(0, 300) };
    if (img) {
      const r = await fetch(new URL(img, url).toString(), { signal: AbortSignal.timeout(20000) });
      const mime = r.headers.get('content-type')?.split(';')[0] || 'image/png';
      const bytes = await r.arrayBuffer();
      if (r.ok && bytes.byteLength < 950_000) { const blob = await uploadBlob(s, bytes, mime); if (blob) external.thumb = blob; }
    }
    return { $type: 'app.bsky.embed.external', external };
  } catch { return undefined; }
}

export interface BskyRef { uri: string; cid: string }

export async function postBsky(text: string, opts: { replyTo?: BskyRef; root?: BskyRef; card?: string } = {}): Promise<BskyRef> {
  const s = await session();
  const record: Record<string, unknown> = { $type: 'app.bsky.feed.post', text, createdAt: new Date().toISOString(), langs: ['en'] };
  const facets = linkFacets(text); if (facets.length) record.facets = facets;
  const cardUrl = opts.card || text.match(/https?:\/\/[^\s)]+/)?.[0];
  if (cardUrl) { const e = await externalEmbed(s, cardUrl); if (e) record.embed = e; }
  if (opts.replyTo) record.reply = { root: opts.root || opts.replyTo, parent: opts.replyTo };
  const res = await fetch(`${PDS}/com.atproto.repo.createRecord`, {
    method: 'POST', headers: { Authorization: `Bearer ${s.accessJwt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo: s.did, collection: 'app.bsky.feed.post', record }), signal: AbortSignal.timeout(20000),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.uri) throw new Error(`Bluesky post failed (${res.status}): ${JSON.stringify(j).slice(0, 300)}`);
  return { uri: j.uri, cid: j.cid };
}

// at://did/app.bsky.feed.post/rkey → https://bsky.app/profile/<handle>/post/<rkey>
export function bskyUrl(uri: string): string {
  const rkey = uri.split('/').pop(); const c = creds();
  return `https://bsky.app/profile/${c?.handle || ''}/post/${rkey}`;
}
