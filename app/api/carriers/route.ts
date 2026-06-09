import { NextResponse } from 'next/server';
import { fetchCarrierGroups } from '@/lib/fetchers/gdelt-carriers';
import { getStore } from '@/lib/layer-store';

export async function GET() {
  // If carriers have cached data, return immediately
  const store = getStore().carriers;
  if (store.data.length > 0) {
    return NextResponse.json({ total: store.data.length, carriers: store.data });
  }

  // Otherwise fetch — the fetcher has a built-in delay to avoid GDELT rate limits
  const carriers = await fetchCarrierGroups();
  return NextResponse.json({ total: carriers.length, carriers });
}
