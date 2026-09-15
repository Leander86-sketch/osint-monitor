import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin-key';
import { ingestItem, regeocodeAll } from '@/lib/store';
import { extractLocation } from '@/lib/geo-extract';

// Onderhoud, alleen vanaf de Mini zelf: GET /api/ingest?regeo=1 plaatst alle items opnieuw (na een woordenboek- of registerwijziging)
export async function GET(request: NextRequest) {
  const host = request.headers.get('host') || '';
  if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return NextResponse.json({ error: 'alleen lokaal' }, { status: 403 });
  if (request.nextUrl.searchParams.get('regeo') !== '1') return NextResponse.json({ error: 'onbekende actie' }, { status: 400 });
  const changed = regeocodeAll(extractLocation);
  return NextResponse.json({ ok: true, changed });
}

// Webhook endpoint for n8n or external integrations
export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const body = await request.json();

    // Support single item or array
    const items = Array.isArray(body) ? body : [body];
    const ingested = [];

    for (const item of items) {
      const result = ingestItem(item);
      if (result) ingested.push(result);
    }

    return NextResponse.json({
      success: true,
      ingested: ingested.length,
      items: ingested,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
