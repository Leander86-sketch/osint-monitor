import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
// Focus: hybrid Europe — leest de lijst die scripts/hybrid_fetch.py elke 6 uur samenstelt (Saha-tracker + Grey Zone Europe).
// ?summary=1 geeft alleen de tellingen (voor de verwijzing op de homepage), niet de hele lijst.
export async function GET(req: NextRequest) {
  try {
    const f = path.join(process.cwd(), 'data', 'hybrid-incidents.json');
    const d = JSON.parse(fs.readFileSync(f, 'utf-8')) as { generatedAt: string; incidents: Array<{ date: string; severity: string }> };
    if (req.nextUrl.searchParams.get('summary') === '1') {
      const now = Date.now(); const within = (a: number, b: number) => d.incidents.filter(i => { const age = now - new Date(i.date).getTime(); return age >= a * 86400000 && age < b * 86400000; });
      const l30 = within(0, 30);
      return NextResponse.json({ total: d.incidents.length, last30: l30.length, prev30: within(30, 60).length, critical30: l30.filter(i => i.severity === 'critical').length, generatedAt: d.generatedAt }, { headers: { 'Cache-Control': 'public, max-age=600' } });
    }
    return NextResponse.json(d, { headers: { 'Cache-Control': 'public, max-age=300' } });
  } catch {
    return NextResponse.json({ generatedAt: null, counts: { total: 0 }, credits: [], incidents: [] });
  }
}
