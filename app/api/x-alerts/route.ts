import { NextResponse } from 'next/server';
import { buildSuggestions, sendAlert, skipAlert, postedToday } from '@/lib/x-alerts';
import { hasXCreds, whoAmI } from '@/lib/x-client';

// Suggestions are readable with the key; SENDING requires the same key and
// an explicit action - the public site can never make the account tweet.
function authorized(req: Request): boolean {
  const key = process.env.X_ALERTS_KEY;
  if (!key) return false;
  const url = new URL(req.url);
  return req.headers.get('x-alerts-key') === key || url.searchParams.get('key') === key;
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { budgetLeft, suggestions } = buildSuggestions();
  return NextResponse.json({
    account: hasXCreds() ? (await whoAmI())?.username || 'auth-failed' : 'no-creds',
    postedToday: postedToday(),
    budgetLeft,
    suggestions,
  });
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { action, escalationId } = body as { action?: string; escalationId?: string };
  if (!escalationId) return NextResponse.json({ error: 'escalationId required' }, { status: 400 });
  try {
    if (action === 'skip') {
      skipAlert(escalationId);
      return NextResponse.json({ skipped: escalationId });
    }
    const result = await sendAlert(escalationId);
    return NextResponse.json({ sent: true, ...result, url: `https://x.com/ArgusDashboard/status/${result.tweetId}` });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
