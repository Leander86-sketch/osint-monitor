import { NextResponse } from 'next/server';

interface ChannelConfig {
  name: string;
  ytHandle?: string;   // kanaal: /live wordt opgezocht (de video-ID wisselt per dag)
  videoId?: string;    // vaste stream (webcams die meerdere streams tegelijk uitzenden); wordt wel gecontroleerd op 'live'
}

const CHANNELS: ChannelConfig[] = [
  { name: 'Sky News', ytHandle: '@SkyNews' },
  { name: 'Al Jazeera AR', ytHandle: '@aljazeera' },
  { name: 'Al Jazeera EN', ytHandle: '@AlJazeeraEnglish' },
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
  { name: 'EarthCam', ytHandle: '@earthcam' },
  { name: 'Bosphorus Cam', ytHandle: '@bosphorustraffic' },
  { name: 'i24NEWS', ytHandle: '@i24NEWS_EN' },
  { name: 'United24 UA', ytHandle: '@United24media' },
  { name: 'Espreso TV', ytHandle: '@espresotv' },
  { name: 'Sky News Arabia', ytHandle: '@skynewsarabia' },
  { name: 'AP News', ytHandle: '@AssociatedPress' },
  { name: 'CNN', ytHandle: '@CNN' },
  { name: 'ABC News US', ytHandle: '@ABCNews' },
  { name: 'Africanews', ytHandle: '@africanews' },
  { name: 'TVP World', ytHandle: '@TVPWorld' },
  { name: 'NDTV', ytHandle: '@ndtv' },
  { name: 'Firstpost', ytHandle: '@Firstpost' },
  { name: 'Euronews FR', ytHandle: '@euronewsfr' },
  // ── toegevoegd 22 sep 2026 (bronnenronde): allemaal gecontroleerd op live + insluitbaar ──
  { name: 'CGTN', ytHandle: '@CGTN' },
  { name: 'UATV English', ytHandle: '@UATVEnglish' },
  { name: 'FREEДOM (RU)', ytHandle: '@FREEDOM_LIVE' },
  { name: 'TV Rain (RU)', ytHandle: '@tvrain' },
  { name: 'NASA ISS', ytHandle: '@NASA' },
  { name: 'Odesa Alarm Map', ytHandle: '@OdesaLive' },
  { name: 'Intel Cams UA', videoId: 'IcZ-7sFi1HM' },
  { name: 'Rotterdam Port', videoId: '_KVWehizoNU' },
  { name: 'Hamburg Port', ytHandle: '@hamburghafenlive24' },
  { name: 'Kiel Canal', videoId: '7AWAGFNept8' },
  { name: 'Helsinki Port', ytHandle: '@PortofHelsinki' },
  { name: 'Tallinn Cam', videoId: 'VhVgZi2lGv0' },
  { name: 'St Petersburg Cam', videoId: 'w_Dg2vC0tUE' },
  { name: 'Poland Cams', videoId: 'Rn_ga4yXkME' },
  { name: 'Taipei Cam', videoId: 'z_fY1pj1VBw' },
  { name: 'Prague Airport', videoId: 'Deo_lcwn8lk' },
];

// Cache live video IDs for 10 minutes
let cache: { videoIds: Record<string, string>; timestamp: number } = {
  videoIds: {},
  timestamp: 0,
};

async function fetchLiveVideoId(handle: string | undefined, videoId?: string): Promise<string | null> {
  try {
    const url = videoId ? `https://www.youtube.com/watch?v=${videoId}` : `https://www.youtube.com/${handle}/live`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept-Language': 'en',
      },
      redirect: 'follow',
    });
    const html = await res.text();

    // De vorige versie pakte simpelweg de eerste videoId op de pagina. Staat een
    // kanaal niet live, dan leidt /live door naar de kanaalpagina en werd een
    // willekeurige oude opname als "live" gepresenteerd — gemeten 7 sep 2026 bij
    // 3 van de 22 kanalen. Alleen ytInitialPlayerResponse is hier gezaghebbend:
    // een echte uitzending heeft isLive true EN playabilityStatus OK.
    // [\s\S] i.p.v. de s-flag: die vraagt een hogere TS-target dan dit project heeft
    const m = html.match(/ytInitialPlayerResponse\s*=\s*(\{[\s\S]+?\});\s*(?:var |<\/script>)/);
    if (!m) return null;
    let pr: { videoDetails?: { videoId?: string; isLive?: boolean }; playabilityStatus?: { status?: string } };
    try { pr = JSON.parse(m[1]); } catch { return null; }
    const vd = pr.videoDetails;
    if (vd?.isLive === true && pr.playabilityStatus?.status === 'OK' && vd.videoId) return vd.videoId;

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
      const videoId = await fetchLiveVideoId(ch.ytHandle, ch.videoId);
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
