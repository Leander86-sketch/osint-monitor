import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
// Focus: hybrid Europe — leest de lijst die scripts/hybrid_fetch.py elke 6 uur samenstelt (Saha-tracker + Grey Zone Europe).
export async function GET() {
  try {
    const f = path.join(process.cwd(), 'data', 'hybrid-incidents.json');
    return NextResponse.json(JSON.parse(fs.readFileSync(f, 'utf-8')), { headers: { 'Cache-Control': 'public, max-age=300' } });
  } catch {
    return NextResponse.json({ generatedAt: null, counts: { total: 0 }, credits: [], incidents: [] });
  }
}
