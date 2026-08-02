'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { ShipPosition } from '@/lib/fetchers/ais';

const CircleMarker = dynamic(() => import('react-leaflet').then(mod => mod.CircleMarker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(mod => mod.Tooltip), { ssr: false });

// Compass direction from degrees
function compass(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

// Flag state from the MMSI MID (first 3 digits) - flags of convenience are an OSINT signal
const MID_FLAGS: Record<string, string> = {
  '205': 'Belgium', '209': 'Cyprus', '210': 'Cyprus', '211': 'Germany', '212': 'Cyprus', '215': 'Malta',
  '218': 'Germany', '219': 'Denmark', '220': 'Denmark', '224': 'Spain', '225': 'Spain', '226': 'France',
  '227': 'France', '228': 'France', '229': 'Malta', '230': 'Finland', '232': 'UK', '233': 'UK', '234': 'UK',
  '235': 'UK', '236': 'Gibraltar', '237': 'Greece', '238': 'Greece', '239': 'Greece', '240': 'Greece',
  '241': 'Greece', '242': 'Morocco', '244': 'Netherlands', '245': 'Netherlands', '246': 'Netherlands',
  '247': 'Italy', '248': 'Malta', '249': 'Malta', '250': 'Ireland', '251': 'Iceland', '253': 'Luxembourg',
  '255': 'Portugal (Madeira)', '256': 'Malta', '257': 'Norway', '258': 'Norway', '259': 'Norway',
  '261': 'Poland', '263': 'Portugal', '264': 'Romania', '265': 'Sweden', '266': 'Sweden', '267': 'Slovakia',
  '269': 'Switzerland', '271': 'Turkey', '272': 'Ukraine', '273': 'Russia', '275': 'Latvia', '276': 'Estonia',
  '277': 'Lithuania', '278': 'Slovenia', '279': 'Serbia', '304': 'Antigua & Barbuda', '305': 'Antigua & Barbuda',
  '306': 'Curacao', '308': 'Bahamas', '309': 'Bahamas', '311': 'Bahamas', '312': 'Belize', '314': 'Barbados',
  '316': 'Canada', '319': 'Cayman Islands', '323': 'Cuba', '327': 'Dominican Rep.', '332': 'Guatemala',
  '334': 'Honduras', '338': 'USA', '339': 'Jamaica', '345': 'Mexico', '351': 'Panama', '352': 'Panama',
  '353': 'Panama', '354': 'Panama', '355': 'Panama', '356': 'Panama', '357': 'Panama', '362': 'Trinidad & Tobago',
  '366': 'USA', '367': 'USA', '368': 'USA', '369': 'USA', '370': 'Panama', '371': 'Panama', '372': 'Panama',
  '373': 'Panama', '375': 'St Vincent', '376': 'St Vincent', '377': 'St Vincent', '378': 'British Virgin Isl.',
  '403': 'Saudi Arabia', '405': 'Bangladesh', '408': 'Bahrain', '412': 'China', '413': 'China', '414': 'China',
  '416': 'Taiwan', '417': 'Sri Lanka', '419': 'India', '422': 'Iran', '423': 'Azerbaijan', '425': 'Iraq',
  '428': 'Israel', '431': 'Japan', '432': 'Japan', '436': 'Kazakhstan', '438': 'Jordan', '440': 'South Korea',
  '441': 'South Korea', '445': 'North Korea', '447': 'Kuwait', '450': 'Lebanon', '457': 'Mongolia',
  '461': 'Oman', '463': 'Pakistan', '466': 'Qatar', '468': 'Syria', '470': 'UAE', '471': 'UAE', '473': 'Yemen',
  '475': 'Yemen', '477': 'Hong Kong', '503': 'Australia', '506': 'Myanmar', '511': 'Palau', '512': 'New Zealand',
  '514': 'Cambodia', '515': 'Cambodia', '518': 'Cook Islands', '520': 'Fiji', '525': 'Indonesia',
  '529': 'Kiribati', '533': 'Malaysia', '538': 'Marshall Islands', '544': 'Nauru', '548': 'Philippines',
  '553': 'Papua New Guinea', '563': 'Singapore', '564': 'Singapore', '565': 'Singapore', '566': 'Singapore',
  '567': 'Thailand', '570': 'Tonga', '572': 'Tuvalu', '574': 'Vietnam', '576': 'Vanuatu', '577': 'Vanuatu',
  '601': 'South Africa', '605': 'Algeria', '613': 'Cameroon', '615': 'Congo', '616': 'Comoros',
  '617': 'Cape Verde', '620': 'Comoros', '621': 'Djibouti', '622': 'Egypt', '626': 'Gabon', '627': 'Ghana',
  '634': 'Kenya', '636': 'Liberia', '637': 'Liberia', '642': 'Libya', '645': 'Mauritius', '650': 'Mozambique',
  '654': 'Mauritania', '657': 'Nigeria', '659': 'Namibia', '662': 'Sudan', '663': 'Senegal', '664': 'Seychelles',
  '666': 'Somalia', '667': 'Sierra Leone', '671': 'Togo', '672': 'Tunisia', '674': 'Tanzania', '677': 'Tanzania',
  '678': 'Zambia', '701': 'Argentina', '710': 'Brazil', '725': 'Chile', '730': 'Colombia', '735': 'Ecuador',
  '760': 'Peru', '770': 'Uruguay', '775': 'Venezuela',
};
function flagOf(mmsi: number): string | null {
  return MID_FLAGS[String(mmsi).slice(0, 3)] || null;
}

// AIS type code -> category + color
function shipStyle(t: number | null): { label: string; color: string } {
  if (t === null) return { label: 'Vessel', color: '#64748b' };
  if (t === 35) return { label: 'Military ops', color: '#ef4444' };
  if (t >= 80 && t <= 89) return { label: 'Tanker', color: '#f59e0b' };
  if (t >= 70 && t <= 79) return { label: 'Cargo', color: '#2dd4bf' };
  if (t >= 60 && t <= 69) return { label: 'Passenger', color: '#a78bfa' };
  if (t === 30) return { label: 'Fishing', color: '#84cc16' };
  if (t >= 50 && t <= 59) return { label: 'Special craft', color: '#38bdf8' };
  return { label: `Type ${t}`, color: '#64748b' };
}

const NAV_STATUS: Record<number, string> = {
  0: 'under way', 1: 'at anchor', 2: 'not under command', 3: 'restricted manoeuvre',
  5: 'moored', 6: 'aground', 7: 'fishing', 8: 'under sail',
};

export default function ShipsLayer() {
  const [ships, setShips] = useState<ShipPosition[]>([]);
  const [warming, setWarming] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/ships');
      const d = await res.json();
      setShips(d.ships || []);
      setWarming(!!d.warming);
    } catch (err) {
      console.error('Ships fetch failed:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Faster polling while the stream warms up after idle
    const interval = setInterval(fetchData, warming ? 10000 : 60000);
    return () => clearInterval(interval);
  }, [fetchData, warming]);

  return (
    <>
      {ships.map(s => {
        const st = shipStyle(s.shipType);
        return (
          <CircleMarker
            key={s.mmsi}
            center={[s.lat, s.lng]}
            radius={s.shipType === 35 ? 6 : 3.5}
            pathOptions={{ color: st.color, fillColor: st.color, fillOpacity: 0.6, weight: 1, opacity: 0.8 }}
          >
            <Tooltip direction="top" offset={[0, -5]} opacity={0.95}>
              <div style={{ fontFamily: 'monospace', fontSize: '11px', maxWidth: '220px', color: '#111' }}>
                <div style={{ fontWeight: 'bold', color: st.color }}>{s.name || `Vessel ${s.mmsi}`}</div>
                <div>{st.label}{flagOf(s.mmsi) ? ` · flag: ${flagOf(s.mmsi)}` : ''}{typeof s.speed === 'number' ? ` · ${s.speed.toFixed(1)} kn` : ''}</div>
              </div>
            </Tooltip>
            <Popup>
              <div className="text-[12px] max-w-[250px] font-mono">
                <div className="font-bold text-[#ccc] mb-1 leading-snug">{s.name || `Unnamed vessel`}</div>
                <div className="text-[#bbb] space-y-0.5 text-[11px]">
                  <div>{st.label}{s.navStatus !== null && NAV_STATUS[s.navStatus] ? `, ${NAV_STATUS[s.navStatus]}` : ''}{s.shipType === null ? ' (type not yet broadcast)' : ''}</div>
                  {typeof s.speed === 'number' && (
                    <div>
                      Speed: {s.speed.toFixed(1)} kn (~{Math.round(s.speed * 1.852)} km/h)
                      {typeof s.course === 'number' ? ` heading ${compass(s.course)}` : ''}
                    </div>
                  )}
                  {s.destination && <div>Sailing to: {s.destination}</div>}
                  {flagOf(s.mmsi) && <div>Flag state: {flagOf(s.mmsi)}</div>}
                  <div className="text-[#777]">MMSI {s.mmsi}</div>
                </div>
                <a href={`https://www.vesselfinder.com/vessels/details/${s.mmsi}`} target="_blank" rel="noopener" className="text-[#d4a012] hover:underline mt-1.5 block text-[11px]">VESSEL DETAILS →</a>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}
