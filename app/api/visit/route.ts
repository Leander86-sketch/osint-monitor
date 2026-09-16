import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { isAdmin } from '@/lib/admin-key';

// Bezoekersmeting (16 sep 2026): de pagina stuurt één POST per sessie; we bewaren per dag een set
// gehashte IP's (dag-salt, dus niet herleidbaar over dagen). GET geeft uniek vandaag / 7 dagen.
const FILE = join(process.cwd(), 'data', 'visits.json');
const KEEP_DAYS = 60;
type Visits = Record<string, string[]>;

function load(): Visits { try { return JSON.parse(readFileSync(FILE, 'utf-8')); } catch { return {}; } }
function save(v: Visits) { mkdirSync(join(process.cwd(), 'data'), { recursive: true }); writeFileSync(FILE, JSON.stringify(v)); }
function day(d = new Date()): string { return d.toISOString().slice(0, 10); }

function visitorStats(v: Visits = load()): { today: number; week: number; days: Record<string, number> } {
  const days: Record<string, number> = {}; for (const [k, arr] of Object.entries(v)) days[k] = arr.length;
  const week = new Set<string>(); const now = Date.now();
  for (let i = 0; i < 7; i++) for (const h of v[day(new Date(now - i * 86400000))] || []) week.add(h);
  return { today: (v[day()] || []).length, week: week.size, days };
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const ua = req.headers.get('user-agent') || '';
  if (/bot|crawl|spider|curl|wget|python|monitor|headless/i.test(ua)) return NextResponse.json({ ok: true, skipped: 'bot' });
  const today = day();
  const h = createHash('sha256').update(`${today}|${ip}|${process.env.ARGUS_ADMIN_KEY || 'salt'}`).digest('hex').slice(0, 16);
  const v = load();
  const cutoff = day(new Date(Date.now() - KEEP_DAYS * 86400000));
  for (const k of Object.keys(v)) if (k < cutoff) delete v[k];
  v[today] = v[today] || [];
  if (!v[today].includes(h)) { v[today].push(h); save(v); }
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const host = req.headers.get('host') || '';
  if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) && !isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json(visitorStats());
}
