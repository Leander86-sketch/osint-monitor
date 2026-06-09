import { NextRequest, NextResponse } from 'next/server';
import { ingestItem } from '@/lib/store';

// Webhook endpoint for n8n or external integrations
export async function POST(request: NextRequest) {
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
