// Curated Bluesky OSINT accounts via the free Jetstream firehose (no key).
// Signal comes from curation (fixed DID list), not from content filtering -
// deliberately no AI. Backfill via the public appview so the panel is never
// empty; Jetstream keeps it live afterwards.

export interface BskyPost {
  id: string;
  author: string;   // display name
  handle: string;
  text: string;
  createdAt: string;
  link: string;
}

export const OSINT_ACCOUNTS: { did: string; handle: string; name: string }[] = [
  { did: 'did:plc:sb54dpdfefflykmf5bcfvr7t', handle: 'bellingcat.com', name: 'Bellingcat' },
  { did: 'did:plc:yazbevg3wkzp5llnzb44tqgh', handle: 'kyivindependent.com', name: 'Kyiv Independent' },
  { did: 'did:plc:2ywby725qcwv7rqdotimk7mp', handle: 'osinttechnical.bsky.social', name: 'OSINTtechnical' },
  { did: 'did:plc:yuehqkmrnpetb6qcjq7udo4m', handle: 'defmon3.bsky.social', name: 'Def Mon' },
  { did: 'did:plc:3ilzhrzkar3icae4mfyupmqp', handle: 'wartranslated.bsky.social', name: 'WarTranslated' },
  { did: 'did:plc:nnt57kyodgh7kafgdccx2dj4', handle: 'julianroepcke.bsky.social', name: 'Julian Roepcke' },
  { did: 'did:plc:ofynyovkpjeroci32n7df6if', handle: 'calibreobscura.bsky.social', name: 'Calibre Obscura' },
  { did: 'did:plc:ojva4awugljr25xzrdhcy6my', handle: 'grozev.bsky.social', name: 'Christo Grozev' },
  { did: 'did:plc:g6zr2ewmnzymmlm4ropipqcl', handle: 'emilkastehelmi.bsky.social', name: 'Emil Kastehelmi' },
  { did: 'did:plc:ernjxefnyk2hhwhbd3zblykf', handle: 'tendar.bsky.social', name: 'Tendar' },
  { did: 'did:plc:re24z43mpixzjrgazz45yjuk', handle: 'oalexanderdk.bsky.social', name: 'OAlexanderDK' },
  { did: 'did:plc:ppwyadxe5yhqyqfbxudy4tb2', handle: 'christiaantriebert.bsky.social', name: 'Christiaan Triebert' },
  { did: 'did:plc:mnaig7rtn6g75v3gynnrmarf', handle: 'sentdefender.bsky.social', name: 'OSINTdefender' },
  { did: 'did:plc:has7turt7qb4fvgd7rtep7ph', handle: 'faytuks.bsky.social', name: 'Faytuks' },
  { did: 'did:plc:35bb6zc4k7n6ejqffj2hsu4o', handle: 'clashreport.bsky.social', name: 'Clash Report' },
  { did: 'did:plc:onfgiwffamoux7ugdqqgh5hi', handle: 'warmonitor.bsky.social', name: 'WarMonitor' },
];
const BY_DID = new Map(OSINT_ACCOUNTS.map(a => [a.did, a]));

const JETSTREAM = 'wss://jetstream2.us-east.bsky.network/subscribe';
const MAX_POSTS = 120;
const PRUNE_MS = 48 * 3600_000;
const IDLE_STOP_MS = 20 * 60_000;

interface BskyState {
  posts: Map<string, BskyPost>;
  ws: WebSocket | null;
  connecting: boolean;
  backfilled: boolean;
  lastPoll: number;
  reconnectDelay: number;
}
const g = globalThis as unknown as { __bskyState?: BskyState };
if (!g.__bskyState) g.__bskyState = { posts: new Map(), ws: null, connecting: false, backfilled: false, lastPoll: 0, reconnectDelay: 10_000 };

function addPost(st: BskyState, did: string, rkey: string, text: string, createdAt: string): void {
  const acc = BY_DID.get(did);
  if (!acc || !text) return;
  const id = `${did}/${rkey}`;
  st.posts.set(id, {
    id, author: acc.name, handle: acc.handle, text: text.slice(0, 600), createdAt,
    link: `https://bsky.app/profile/${acc.handle}/post/${rkey}`,
  });
  if (st.posts.size > MAX_POSTS) {
    const sorted = [...st.posts.values()].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    for (const p of sorted.slice(0, st.posts.size - MAX_POSTS)) st.posts.delete(p.id);
  }
}

async function backfill(st: BskyState): Promise<void> {
  if (st.backfilled) return;
  st.backfilled = true;
  await Promise.all(OSINT_ACCOUNTS.map(async acc => {
    try {
      const res = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${acc.did}&limit=5&filter=posts_no_replies`, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) return;
      const d = await res.json();
      for (const item of d.feed || []) {
        const post = item.post;
        if (!post?.record || post.author?.did !== acc.did) continue; // skip reposts of others
        const rkey = (post.uri || '').split('/').pop() || '';
        addPost(st, acc.did, rkey, post.record.text || '', post.record.createdAt || post.indexedAt || new Date().toISOString());
      }
    } catch { /* per-account failure is fine */ }
  }));
}

function connect(st: BskyState): void {
  if (st.ws || st.connecting) return;
  st.connecting = true;
  try {
    const params = ['wantedCollections=app.bsky.feed.post', ...OSINT_ACCOUNTS.map(a => `wantedDids=${a.did}`)].join('&');
    const ws = new WebSocket(`${JETSTREAM}?${params}`);
    ws.onopen = () => { st.connecting = false; st.ws = ws; st.reconnectDelay = 10_000; console.log('[bluesky] jetstream connected'); };
    ws.onmessage = async (e) => {
      try {
        const txt = typeof e.data === 'string' ? e.data : await (e.data as Blob).text();
        const m = JSON.parse(txt);
        if (m.kind !== 'commit' || m.commit?.operation !== 'create' || m.commit?.collection !== 'app.bsky.feed.post') return;
        const rec = m.commit.record || {};
        if (rec.reply) return; // top-level posts only
        addPost(st, m.did, m.commit.rkey, rec.text || '', rec.createdAt || new Date().toISOString());
      } catch { /* ignore malformed frames */ }
    };
    ws.onclose = (e) => {
      st.ws = null; st.connecting = false;
      console.warn(`[bluesky] jetstream closed (${e.code})`);
      if (Date.now() - st.lastPoll < IDLE_STOP_MS) {
        setTimeout(() => connect(st), st.reconnectDelay);
        st.reconnectDelay = Math.min(st.reconnectDelay * 2, 5 * 60_000);
      }
    };
    ws.onerror = () => { /* onclose follows */ };
  } catch (err) {
    st.connecting = false;
    console.error('[bluesky] connect failed:', err);
  }
}

export async function getBskyPosts(): Promise<BskyPost[]> {
  const st = g.__bskyState!;
  st.lastPoll = Date.now();
  await backfill(st);
  connect(st);
  const cutoff = Date.now() - PRUNE_MS;
  return [...st.posts.values()]
    .filter(p => new Date(p.createdAt).getTime() > cutoff)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
