import { ACLEDEvent } from '../types';

interface Tok { access: string; refresh: string; exp: number; }
const tok: Tok = { access: '', refresh: '', exp: 0 };
let cache: { ts: number; value: ACLEDEvent[] } = { ts: 0, value: [] };

async function mint(grant: 'password' | 'refresh'): Promise<void> {
  const body = new URLSearchParams();
  body.set('client_id', 'acled');
  if (grant === 'refresh') {
    body.set('grant_type', 'refresh_token');
    body.set('refresh_token', tok.refresh);
  } else {
    body.set('grant_type', 'password');
    body.set('username', process.env.ACLED_EMAIL || '');
    body.set('password', process.env.ACLED_PASSWORD || '');
    body.set('scope', 'authenticated');
  }
  const r = await fetch('https://acleddata.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(12000),
  });
  if (!r.ok) throw new Error('ACLED auth ' + r.status);
  const d = await r.json();
  tok.access = d.access_token;
  tok.refresh = d.refresh_token || tok.refresh;
  tok.exp = Date.now() + ((d.expires_in || 86400) * 1000);
}

async function getToken(): Promise<string> {
  if (tok.access && Date.now() < tok.exp - 60000) return tok.access;
  if (!process.env.ACLED_EMAIL || !process.env.ACLED_PASSWORD) throw new Error('ACLED creds missing');
  try {
    if (tok.refresh) await mint('refresh'); else await mint('password');
  } catch {
    tok.refresh = '';
    await mint('password');
  }
  return tok.access;
}

export async function fetchAcled(): Promise<ACLEDEvent[]> {
  if (cache.value.length && Date.now() - cache.ts < 21600000) return cache.value; // 6h
  let token: string;
  try { token = await getToken(); } catch (e) { console.error('[acled] auth failed', e); return cache.value; }
  try {
    const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const url = `https://acleddata.com/api/acled/read?_format=json&event_date=${since}&event_date_where=%3E%3D&limit=1500`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) { console.error('[acled] read', r.status); return cache.value; }
    const j = await r.json();
    const rows = j.data || [];
    const out: ACLEDEvent[] = [];
    for (const e of rows) {
      const lat = parseFloat(e.latitude), lng = parseFloat(e.longitude);
      if (isNaN(lat) || isNaN(lng)) continue;
      out.push({
        id: 'acled-' + (e.event_id_cnty || (lat + ',' + lng + ',' + e.event_date)),
        lat, lng,
        eventType: e.event_type || '',
        actor1: e.actor1 || '', actor2: e.actor2 || '',
        country: e.country || '', location: e.location || '',
        fatalities: parseInt(e.fatalities) || 0,
        date: e.event_date || '',
        notes: (e.notes || '').slice(0, 300),
        source: e.source || '',
      });
    }
    cache = { ts: Date.now(), value: out };
    return out;
  } catch (e) { console.error('[acled] fetch failed', e); return cache.value; }
}
