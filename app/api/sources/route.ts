import { NextResponse } from 'next/server';
import { MAP_LAYERS, INTEL_PANELS, LIVESTREAMS, DERIVED_SIGNALS, feedStats } from '@/lib/sources-manifest';

export async function GET() {
  return NextResponse.json({
    manifesto: 'ARGUS clusters open, public data into live conflict situations. No AI in the pipeline, no paywall, no editorial filter — every layer below is a named, verifiable source you can check yourself.',
    layers: MAP_LAYERS,
    intel: INTEL_PANELS,
    feeds: feedStats(),
    livestreams: LIVESTREAMS,
    derived: DERIVED_SIGNALS,
    caveats: [
      'GDELT layers (CONFLICT, TONE) are a signal, not ground truth — machine-coded from news volume.',
      'Carrier positions are approximate, derived from the weekly USNI tracker.',
      'AIS is terrestrial: coastal chokepoints are well covered, open ocean is not.',
      'Situation clustering favours precision over recall — a quiet situation may simply be under-reported.',
    ],
  });
}
