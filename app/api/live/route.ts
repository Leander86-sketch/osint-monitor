import { NextResponse } from 'next/server';

interface ChannelConfig {
  name: string;
  ytHandle: string;
}

const CHANNELS: ChannelConfig[] = [
  { name: 'Sky News', ytHandle: '@SkyNews' },
  { name: 'Al Jazeera AR', ytHandle: '@aljazeera' },
  { name: 'Al Jazeera EN', ytHandle: '@AlJazeeraEnglish' },
  { name: 'France 24', ytHandle: '@FRANCE24English' },
  { name: 'France 24 FR', ytHandle: '@FRANCE24' },
  { name: 'Euronews', ytHandle: '@euronews' },
  { name: 'DW News DE', ytHandle: '@dwdeutsch' },
  { name: 'DW News EN', ytHandle: '@DWNews' },
  { name: 'Al Arabiya', ytHandle: '@AlArabiya' },
  { name: 'CNBC', ytHandle: '@CNBCtelevision' },
  { name: 'NBC News', ytHandle: '@NBCNews' },
  { name: 'TRT World', ytHandle: '@trtworld' },
  { name: 'WION', ytHandle: '@WION' },
  { name: 'CNA', ytHandle: '@channelnewsasia' },
  { name: 'NHK World', ytHandle: '@NHKWorldJapan' },
  { name: 'ABC News AU', ytHandle: '@abcnewsaustralia' },
  { name: 'India Today', ytHandle: '@indiatoday' },
  { name: 'LiveNOW FOX', ytHandle: '@livenowfox' },
  { name: 'Bloomberg', ytHandle: '@markets' },
  { name: 'Intel Cams', ytHandle: '@intelcamslive' },
  { name: 'Jerusalem Cam', ytHandle: '@earthcam' },
  { name: 'Bosphorus Cam', ytHandle: '@bosphorustraffic' },
];

// Cache live video IDs for 10 minutes
let cache: { videoIds: Record<string, string>; timestamp: number } = {
  videoIds: {},
  timestamp: 0,
};

async function fetchLiveVideoId(handle: string): Promise<string | null> {
  try {
    const url = `https://www.youtube.com/${handle}/live`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      redirect: 'follow',
    });
    const html = await res.text();

    // Extract video ID from canonical URL or og:url
    const videoIdMatch = html.match(/\"videoId\":\"([a-zA-Z0-9_-]{11})\"/);
    if (videoIdMatch) return videoIdMatch[1];

    // Fallback: check for live indicator + video ID
    const canonicalMatch = html.match(/watch\?v=([a-zA-Z0-9_-]{11})/);
    if (canonicalMatch) return canonicalMatch[1];

    return null;
  } catch (error) {
    console.error(`[Live] Error fetching ${handle}:`, error);
    return null;
  }
}

export async function GET() {
  const now = Date.now();

  // Return cache if less than 10 minutes old
  if (now - cache.timestamp < 600000 && Object.keys(cache.videoIds).length > 0) {
    return NextResponse.json({ channels: cache.videoIds, cached: true });
  }

  // Fetch all live video IDs in parallel
  const results = await Promise.allSettled(
    CHANNELS.map(async (ch) => {
      const videoId = await fetchLiveVideoId(ch.ytHandle);
      return { name: ch.name, videoId };
    })
  );

  const videoIds: Record<string, string> = {};
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.videoId) {
      videoIds[result.value.name] = result.value.videoId;
    }
  }

  cache = { videoIds, timestamp: now };

  return NextResponse.json({ channels: videoIds, cached: false });
}
