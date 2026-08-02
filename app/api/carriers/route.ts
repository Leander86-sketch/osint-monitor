import { NextResponse } from 'next/server';
import { fetchCarrierGroups, KNOWN_POSITIONS, CARRIERS_CACHE_MS } from '@/lib/fetchers/gdelt-carriers';
import { getStore } from '@/lib/layer-store';

// Never block the response on GDELT (429-prone): serve what we have and
// refresh in the background through the shared GDELT queue.
let refreshing = false;
let lastKick = 0;
const RETRY_MS = 10 * 60_000;

export async function GET() {
  const store = getStore().carriers;

  // Cold start: seed with the USNI Fleet Tracker fallback so the layer is never empty
  if (store.data.length === 0) {
    store.data = KNOWN_POSITIONS.map(k => ({ ...k }));
  }

  const stale = Date.now() - store.lastFetch > CARRIERS_CACHE_MS;
  if (stale && !refreshing && Date.now() - lastKick > RETRY_MS) {
    refreshing = true;
    lastKick = Date.now();
    fetchCarrierGroups().catch(() => {}).finally(() => { refreshing = false; });
  }

  return NextResponse.json({ total: store.data.length, carriers: store.data });
}
