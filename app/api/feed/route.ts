import { NextRequest, NextResponse } from 'next/server';
import { getNewsItems, getNewsItemCount, refreshFeeds, getLastFetchTime, ensureFeedsLoaded } from '@/lib/store';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');
  const source = searchParams.get('source');
  const keyword = searchParams.get('keyword');

  await ensureFeedsLoaded();
  let items = getNewsItems(500, 0);

  // Filter by source
  if (source) {
    items = items.filter(i => i.source.toLowerCase() === source.toLowerCase());
  }

  // Filter by keyword
  if (keyword) {
    const kw = keyword.toLowerCase();
    items = items.filter(i =>
      i.title.toLowerCase().includes(kw) ||
      i.description.toLowerCase().includes(kw) ||
      i.keywords.some(k => k.toLowerCase().includes(kw))
    );
  }

  const total = items.length;
  items = items.slice(offset, offset + limit);

  return NextResponse.json({
    items,
    total,
    lastFetch: getLastFetchTime(),
    hasMore: offset + limit < total,
  });
}

let _refreshInFlight = false;

export async function POST() {
  // Throttle + dedup: a public page can have many tabs POSTing; cap real crawls.
  if (_refreshInFlight || Date.now() - getLastFetchTime() < 240000) {
    return NextResponse.json({ success: true, throttled: true, total: getNewsItemCount(), lastFetch: getLastFetchTime() });
  }
  _refreshInFlight = true;
  try {
    const result = await refreshFeeds();
    return NextResponse.json({
      success: true,
      ...result,
      lastFetch: getLastFetchTime(),
    });
  } catch (error) {
    console.error('[API/feed] Refresh error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to refresh feeds' },
      { status: 500 }
    );
  } finally {
    _refreshInFlight = false;
  }
}
