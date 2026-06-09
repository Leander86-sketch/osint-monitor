import { Camera } from '../types';
import { getStore } from '../layer-store';

const CACHE_MS = 5 * 60_000; // 5 minutes

// Rijkswaterstaat Netherlands - highway cameras
async function fetchRWSCameras(): Promise<Camera[]> {
  try {
    const res = await fetch(
      'https://api.rwsverkeersinfo.nl/api/cameras/',
      {
        headers: {
          'Accept': 'application/json',
          'Origin': 'https://www.rwsverkeersinfo.nl',
        },
        signal: AbortSignal.timeout(15000),
      }
    );
    if (!res.ok) return [];
    const cams = await res.json();

    return (Array.isArray(cams) ? cams : [])
      .filter((c: Record<string, unknown>) => c.latitude && c.longitude)
      .map((c: Record<string, unknown>) => ({
        id: `rws-${c.id}`,
        name: String(c.near || c.road || 'RWS Camera'),
        lat: parseFloat(String(c.latitude)),
        lng: parseFloat(String(c.longitude)),
        imageUrl: String(c.stream_url || c.static_url || ''),
        network: 'Rijkswaterstaat',
        city: String(c.near || 'Netherlands'),
      }))
      .filter((c: Camera) => c.imageUrl);
  } catch (err) {
    console.error('[RWS] Fetch failed:', err);
    return [];
  }
}

// TfL JamCams - free, no key needed for basic access
async function fetchTfLCameras(): Promise<Camera[]> {
  try {
    const res = await fetch(
      'https://api.tfl.gov.uk/Place/Type/JamCam',
      { signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) return [];
    const places = await res.json();

    return places
      .filter((p: Record<string, unknown>) => p.lat && p.lon)
      .map((p: Record<string, unknown>) => {
        const props = (p.additionalProperties as Array<{ key: string; value: string }>) || [];
        const imageUrl = props.find(pr => pr.key === 'imageUrl')?.value || '';
        return {
          id: `tfl-${p.id}`,
          name: String(p.commonName || 'JamCam'),
          lat: Number(p.lat),
          lng: Number(p.lon),
          imageUrl,
          network: 'TfL London',
          city: 'London',
        };
      })
      .filter((c: Camera) => c.imageUrl);
  } catch (err) {
    console.error('[TfL] Fetch failed:', err);
    return [];
  }
}

// NYC DOT Traffic Cameras
async function fetchNYCCameras(): Promise<Camera[]> {
  try {
    const res = await fetch(
      'https://webcams.nyctmc.org/api/cameras/',
      { signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) return [];
    const cams = await res.json();

    return (Array.isArray(cams) ? cams : [])
      .filter((c: Record<string, unknown>) => c.latitude && c.longitude)
      .slice(0, 100) // Limit
      .map((c: Record<string, unknown>) => ({
        id: `nyc-${c.id}`,
        name: String(c.name || 'NYC Camera'),
        lat: Number(c.latitude),
        lng: Number(c.longitude),
        imageUrl: String(c.imageUrl || c.videoUrl || ''),
        network: 'NYC DOT',
        city: 'New York',
      }))
      .filter((c: Camera) => c.imageUrl);
  } catch (err) {
    console.error('[NYC DOT] Fetch failed:', err);
    return [];
  }
}

// DGT Spain - National road cameras
async function fetchDGTCameras(): Promise<Camera[]> {
  try {
    const res = await fetch(
      'https://infocar.dgt.es/etraffic/BuscadorCamaras?acession=&camera=&road=&pk=&province=&format=json',
      {
        headers: {
          'User-Agent': 'OSINT-Monitor/1.0',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(15000),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const cams = data.camaras || data || [];

    return (Array.isArray(cams) ? cams : [])
      .filter((c: Record<string, unknown>) => c.latitud && c.longitud)
      .slice(0, 100)
      .map((c: Record<string, unknown>) => ({
        id: `dgt-${c.idCamara || c.id}`,
        name: String(c.descripcion || c.carretera || 'DGT Camera'),
        lat: Number(c.latitud),
        lng: Number(c.longitud),
        imageUrl: String(c.urlImagen || c.imagen || ''),
        network: 'DGT Spain',
        city: String(c.provincia || 'Spain'),
      }))
      .filter((c: Camera) => c.imageUrl);
  } catch (err) {
    console.error('[DGT] Fetch failed:', err);
    return [];
  }
}

// Madrid Open Data cameras
async function fetchMadridCameras(): Promise<Camera[]> {
  try {
    const res = await fetch(
      'https://informo.madrid.es/informo/tmadrid/cam_samm.kml',
      { signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) return [];
    const text = await res.text();

    // Parse KML for camera locations
    const cameras: Camera[] = [];
    const placemarkRegex = /<Placemark>([\s\S]*?)<\/Placemark>/g;
    let match;

    while ((match = placemarkRegex.exec(text)) !== null && cameras.length < 50) {
      const block = match[1];
      const nameMatch = block.match(/<name>(.*?)<\/name>/);
      const coordMatch = block.match(/<coordinates>([\d.-]+),([\d.-]+)/);
      const imgMatch = block.match(/src="(https?:\/\/[^"]+\.jpg[^"]*)"/i);

      if (nameMatch && coordMatch) {
        cameras.push({
          id: `madrid-${cameras.length}`,
          name: nameMatch[1],
          lat: parseFloat(coordMatch[2]),
          lng: parseFloat(coordMatch[1]),
          imageUrl: imgMatch?.[1] || '',
          network: 'Madrid',
          city: 'Madrid',
        });
      }
    }

    return cameras.filter(c => c.imageUrl);
  } catch (err) {
    console.error('[Madrid] Fetch failed:', err);
    return [];
  }
}

export async function fetchAllCameras(): Promise<Camera[]> {
  const store = getStore().cameras;
  if (Date.now() - store.lastFetch < CACHE_MS && store.data.length > 0) {
    return store.data;
  }

  // Fetch all sources in parallel
  const [rws, tfl, nyc, dgt, madrid] = await Promise.all([
    fetchRWSCameras(),
    fetchTfLCameras(),
    fetchNYCCameras(),
    fetchDGTCameras(),
    fetchMadridCameras(),
  ]);

  const all = [...rws, ...tfl, ...nyc, ...dgt, ...madrid];
  all.forEach(c => { c.lastUpdated = new Date().toISOString(); });

  store.data = all;
  store.lastFetch = Date.now();

  return all;
}
