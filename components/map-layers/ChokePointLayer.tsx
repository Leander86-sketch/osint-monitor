'use client';

import dynamic from 'next/dynamic';

const CircleMarker = dynamic(() => import('react-leaflet').then(mod => mod.CircleMarker), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(mod => mod.Tooltip), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

// Strategic maritime chokepoints and shipping lanes
const CHOKEPOINTS = [
  { name: 'Strait of Hormuz', lat: 26.57, lng: 56.25, traffic: '21M bbl/day oil', risk: 'critical', desc: 'Controls ~20% of global oil supply. Iran can threaten closure.' },
  { name: 'Bab al-Mandab', lat: 12.60, lng: 43.32, traffic: '6.2M bbl/day', risk: 'high', desc: 'Connects Red Sea to Gulf of Aden. Houthi attacks disrupting shipping.' },
  { name: 'Suez Canal', lat: 30.46, lng: 32.35, traffic: '12% global trade', risk: 'medium', desc: 'Egypt-controlled. 19,000+ ships/year. Blockable by single vessel.' },
  { name: 'Strait of Malacca', lat: 2.50, lng: 101.50, traffic: '16M bbl/day', risk: 'medium', desc: 'Busiest shipping lane. China energy imports dependent.' },
  { name: 'Taiwan Strait', lat: 24.50, lng: 119.50, traffic: '~50% container ships', risk: 'high', desc: 'Potential flashpoint. ~88% of largest container ships transit.' },
  { name: 'Danish Straits', lat: 55.70, lng: 12.60, traffic: 'Baltic access', risk: 'low', desc: 'NATO-Russia tension point. Baltic fleet access route.' },
  { name: 'Strait of Gibraltar', lat: 35.96, lng: -5.35, traffic: 'Med-Atlantic link', risk: 'low', desc: 'NATO controlled. Mediterranean access point.' },
  { name: 'Bosphorus', lat: 41.12, lng: 29.05, traffic: 'Black Sea access', risk: 'medium', desc: 'Turkey controls. Russian Black Sea Fleet must transit.' },
  { name: 'Panama Canal', lat: 9.08, lng: -79.68, traffic: '5% global trade', risk: 'low', desc: 'Drought-affected capacity. US strategic interest.' },
  { name: 'Cape of Good Hope', lat: -34.36, lng: 18.47, traffic: 'Alt Suez route', risk: 'low', desc: 'Alternative to Suez. 10-14 days longer. Used during Red Sea disruptions.' },
  { name: 'Lombok Strait', lat: -8.40, lng: 115.70, traffic: 'Alt Malacca route', risk: 'low', desc: 'Deep water alternative to Malacca for large vessels.' },
  { name: 'GIUK Gap', lat: 63.00, lng: -15.00, traffic: 'Sub detection zone', risk: 'medium', desc: 'NATO submarine surveillance zone. Russian sub transit route.' },
];

const RISK_COLORS: Record<string, string> = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#eab308',
  low: '#6b7280',
};

export default function ChokePointLayer() {
  return (
    <>
      {CHOKEPOINTS.map((cp) => {
        const color = RISK_COLORS[cp.risk];
        return (
          <CircleMarker
            key={cp.name}
            center={[cp.lat, cp.lng]}
            radius={cp.risk === 'critical' ? 12 : cp.risk === 'high' ? 10 : 8}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.15,
              weight: 2,
              opacity: 0.6,
              dashArray: '6 3',
            }}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
              <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#111', maxWidth: '200px' }}>
                <div style={{ fontWeight: 'bold', color }}>⚓ {cp.name}</div>
                <div>{cp.traffic}</div>
                <div style={{ color: '#666' }}>Risk: {cp.risk.toUpperCase()}</div>
              </div>
            </Tooltip>
            <Popup>
              <div className="text-[12px] max-w-[240px] font-mono">
                <div className="font-bold text-[#ccc] mb-1">⚓ {cp.name}</div>
                <div className="text-[#bbb] space-y-0.5 text-[11px]">
                  <div>Traffic: {cp.traffic}</div>
                  <div>Risk level: <span style={{ color }}>{cp.risk}</span></div>
                  <div className="text-[#888] mt-1">{cp.desc}</div>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}
