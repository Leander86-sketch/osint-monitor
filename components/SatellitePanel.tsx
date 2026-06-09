'use client';

// Satellite Imagery Quick Access — links to Sentinel Hub EO Browser
// Pre-configured views of conflict zones with recent imagery

const CONFLICT_VIEWS = [
  {
    name: 'Gaza Strip',
    desc: 'Infrastructure damage monitoring',
    lat: 31.45, lng: 34.40, zoom: 13,
    layer: 'NDVI',
  },
  {
    name: 'Kharkiv, Ukraine',
    desc: 'Urban damage assessment',
    lat: 49.99, lng: 36.25, zoom: 12,
    layer: 'TRUE-COLOR',
  },
  {
    name: 'Zaporizhzhia NPP',
    desc: 'Nuclear facility monitoring',
    lat: 47.51, lng: 34.59, zoom: 14,
    layer: 'TRUE-COLOR',
  },
  {
    name: 'Natanz, Iran',
    desc: 'Nuclear enrichment facility',
    lat: 33.72, lng: 51.73, zoom: 14,
    layer: 'TRUE-COLOR',
  },
  {
    name: 'Khartoum, Sudan',
    desc: 'Conflict zone monitoring',
    lat: 15.50, lng: 32.56, zoom: 12,
    layer: 'TRUE-COLOR',
  },
  {
    name: 'Strait of Hormuz',
    desc: 'Maritime chokepoint',
    lat: 26.57, lng: 56.25, zoom: 10,
    layer: 'TRUE-COLOR',
  },
  {
    name: 'Bab al-Mandab',
    desc: 'Red Sea chokepoint — Houthi attacks',
    lat: 12.60, lng: 43.32, zoom: 10,
    layer: 'TRUE-COLOR',
  },
  {
    name: 'Sevastopol, Crimea',
    desc: 'Russian Black Sea Fleet HQ',
    lat: 44.61, lng: 33.52, zoom: 13,
    layer: 'TRUE-COLOR',
  },
];

function buildEOBrowserUrl(lat: number, lng: number, zoom: number): string {
  return `https://apps.sentinel-hub.com/eo-browser/?zoom=${zoom}&lat=${lat}&lng=${lng}&themeId=DEFAULT-THEME&visualizationUrl=https%3A%2F%2Fservices.sentinel-hub.com%2Fogc%2Fwms%2Fbd86bcc0-f318-402b-a145-015f85b9427e&datasetId=S2L2A&fromTime=2026-03-01T00%3A00%3A00.000Z&toTime=2026-04-07T23%3A59%3A59.999Z&layerId=1_TRUE_COLOR`;
}

export default function SatellitePanel() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#1a1a1a]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono text-[#888] uppercase tracking-wider">Sentinel-2 Imagery</span>
          <span className="text-[10px] font-mono text-[#555]">Copernicus / ESA</span>
        </div>
        <div className="text-[10px] font-mono text-[#444] mt-1">Click to open recent satellite imagery in EO Browser</div>
      </div>

      {/* Location Grid */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-2 gap-2">
          {CONFLICT_VIEWS.map(view => (
            <a
              key={view.name}
              href={buildEOBrowserUrl(view.lat, view.lng, view.zoom)}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-2.5 border border-[#1a1a1a] rounded hover:border-[#e8760a]/30 hover:bg-[#0d0d0d] transition-all group"
            >
              <div className="text-[11px] font-mono font-bold text-[#ccc] group-hover:text-[#e8760a] transition-colors">{view.name}</div>
              <div className="text-[10px] font-mono text-[#666] mt-0.5 leading-snug">{view.desc}</div>
              <div className="text-[9px] font-mono text-[#444] mt-1">{view.lat.toFixed(2)}°, {view.lng.toFixed(2)}°</div>
            </a>
          ))}
        </div>
        <div className="text-[9px] font-mono text-[#333] mt-3 text-center">
          Powered by Copernicus Sentinel-2 · Free access via EU Data Space
        </div>
      </div>
    </div>
  );
}
