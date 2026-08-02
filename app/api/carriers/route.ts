import { NextResponse } from 'next/server';
import { fetchUsniCarriers } from '@/lib/fetchers/usni-carriers';
import { KNOWN_POSITIONS } from '@/lib/fetchers/gdelt-carriers';
import { getStore } from '@/lib/layer-store';

// Weekly USNI Fleet Tracker (via RSS) is the primary source; the curated
// KNOWN_POSITIONS snapshot fills homeport/maintenance hulls and acts as
// the offline fallback. Never block the response on the network.
let refreshing = false;
let lastKick = 0;
const RETRY_MS = 30 * 60_000;

export async function GET() {
  const store = getStore().carriers;

  if (store.data.length === 0) {
    store.data = KNOWN_POSITIONS.map(k => ({ ...k }));
  }

  if (!refreshing && Date.now() - lastKick > RETRY_MS) {
    refreshing = true;
    lastKick = Date.now();
    fetchUsniCarriers()
      .then(groups => { if (groups.length > 0) { store.data = groups; store.lastFetch = Date.now(); } })
      .catch(() => {})
      .finally(() => { refreshing = false; });
  }

  return NextResponse.json({ total: store.data.length, carriers: store.data });
}
