import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Bluesky domein-handle: /.well-known/atproto-did moet de DID van het account teruggeven.
// Wordt gevuld door scripts/bsky_onboard.py argus handle (data/atproto-did.txt), zonder rebuild.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const did = fs.readFileSync(path.join(process.cwd(), 'data', 'atproto-did.txt'), 'utf8').trim();
    if (!did.startsWith('did:')) throw new Error('no did');
    return new Response(did, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  } catch {
    return NextResponse.json({ error: 'not configured' }, { status: 404 });
  }
}
