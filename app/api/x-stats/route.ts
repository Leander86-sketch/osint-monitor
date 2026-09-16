import { NextRequest, NextResponse } from 'next/server';
import { appendFileSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { myMetrics, myMetricsRaw } from '@/lib/x-client';
import { isAdmin } from '@/lib/admin-key';

// Volgersmeting @ArgusDashboard (16 sep 2026): elke 3 uur via cron (localhost) één regel in data/argus-thermometer.jsonl.
const FILE = join(process.cwd(), 'data', 'argus-thermometer.jsonl');

export async function GET(req: NextRequest) {
  const host = req.headers.get('host') || '';
  if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) && !isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (req.nextUrl.searchParams.get('last') === '1') {
    try { const lines = readFileSync(FILE, 'utf-8').trim().split('\n'); return NextResponse.json(JSON.parse(lines[lines.length - 1])); } catch { return NextResponse.json(null); }
  }
  if (req.nextUrl.searchParams.get('debug') === '1') return NextResponse.json(await myMetricsRaw());
  const m = await myMetrics();
  if (!m) return NextResponse.json({ error: 'X niet bereikbaar of geen creds' }, { status: 502 });
  const row = { ts: new Date().toISOString(), ...m };
  mkdirSync(join(process.cwd(), 'data'), { recursive: true });
  appendFileSync(FILE, JSON.stringify(row) + '\n');
  return NextResponse.json(row);
}
