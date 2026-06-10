'use client';

import { useState, useEffect, useRef, memo } from 'react';
import dynamic from 'next/dynamic';
import { GeoEvent, LayerType, Situation } from '@/lib/types';
import type { Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then(mod => mod.CircleMarker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(mod => mod.Tooltip), { ssr: false });

// Layer components
const FlightLayer = dynamic(() => import('./map-layers/FlightLayer'), { ssr: false });
const SatelliteLayer = dynamic(() => import('./map-layers/SatelliteLayer'), { ssr: false });
const ConflictLayer = dynamic(() => import('./map-layers/ConflictLayer'), { ssr: false });
const CarrierLayer = dynamic(() => import('./map-layers/CarrierLayer'), { ssr: false });
const CameraLayer = dynamic(() => import('./map-layers/CameraLayer'), { ssr: false });
const SentimentLayer = dynamic(() => import('./map-layers/SentimentLayer'), { ssr: false });
const DisplacementLayer = dynamic(() => import('./map-layers/DisplacementLayer'), { ssr: false });
const ChokePointLayer = dynamic(() => import('./map-layers/ChokePointLayer'), { ssr: false });
const HazardsLayer = dynamic(() => import('./map-layers/HazardsLayer'), { ssr: false });
const FirmsLayer = dynamic(() => import('./map-layers/FirmsLayer'), { ssr: false });
const AcledLayer = dynamic(() => import('./map-layers/AcledLayer'), { ssr: false });

const TYPE_COLORS: Record<string, string> = {
  military: '#dc2626',
  diplomatic: '#4488aa',
  humanitarian: '#16a34a',
  protest: '#d4a012',
  other: '#333333',
};

const SEVERITY_RADIUS: Record<string, number> = {
  critical: 14,
  high: 10,
  medium: 7,
  low: 5,
};

const SIT_SEV: Record<string, string> = { critical: '#dc2626', high: '#f97316', medium: '#eab308', low: '#6b7280' };

const LAYER_CONFIG: { id: LayerType; label: string; color: string; desc: string }[] = [
  { id: 'flights', label: 'FLIGHT', color: '#38bdf8', desc: 'Live aircraft positions (OpenSky) - watch for unusual military traffic' },
  { id: 'satellites', label: 'SATELLITE', color: '#a78bfa', desc: 'Satellite positions overhead (CelesTrak) - recon & comms orbits' },
  { id: 'conflicts', label: 'CONFLICT', color: '#ff4444', desc: 'Conflict-related events detected in global news (GDELT)' },
  { id: 'carriers', label: 'CVN', color: '#f59e0b', desc: 'US carrier strike group positions, derived from news reports' },
  { id: 'cameras', label: 'CAM', color: '#8b5cf6', desc: 'Public live cameras - visual ground truth on the map' },
  { id: 'sentiment', label: 'TONE', color: '#eab308', desc: 'News tone heatmap (GDELT) - where global coverage turns dark' },
  { id: 'displacement', label: 'DISP', color: '#f59e0b', desc: 'Refugee & displacement statistics (UNHCR)' },
  { id: 'chokepoints', label: 'CHOKE', color: '#ef4444', desc: 'Strategic maritime chokepoints: Hormuz, Suez, Bab al-Mandab & more' },
  { id: 'hazards', label: 'HAZARD', color: '#9ca3af', desc: 'Natural hazards: USGS earthquakes + GDACS disaster alerts' },
  { id: 'firms', label: 'THERMAL', color: '#ff6a00', desc: 'NASA FIRMS satellite thermal detections - fires, strikes, explosions' },
  { id: 'acled', label: 'ACLED', color: '#dc2626', desc: 'Armed conflict event database (ACLED) - battles, explosions, riots' },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`;
  return `${Math.floor(diff / 86400000)}d`;
}

function EventMap({ focusBbox, situations }: { focusBbox?: [number, number, number, number] | null; situations?: Situation[] }) {
  const [events, setEvents] = useState<GeoEvent[]>([]);
  const [mounted, setMounted] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [activeLayers, setActiveLayers] = useState<Set<LayerType>>(new Set());
  const [bounds, setBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  const updateBounds = () => {
    if (!mapRef.current) return;
    const b = mapRef.current.getBounds();
    setBounds({
      north: b.getNorth(),
      south: b.getSouth(),
      east: b.getEast(),
      west: b.getWest(),
    });
  };

  useEffect(() => {
    setMounted(true);
    fetchEvents();
    const interval = setInterval(fetchEvents, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!focusBbox || !mapRef.current) return;
    const [s, w, n, e] = focusBbox;
    mapRef.current.flyToBounds([[s, w], [n, e]], { maxZoom: 7, duration: 0.8 });
  }, [focusBbox]);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      setEvents(data.events || []);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    }
  };

  const toggleLayer = (layer: LayerType) => {
    setActiveLayers(prev => {
      const next = new Set(prev);
      if (next.has(layer)) {
        next.delete(layer);
      } else {
        next.add(layer);
      }
      return next;
    });
  };

  useEffect(() => {
    const onToggle = (e: Event) => {
      const id = (e as CustomEvent).detail as LayerType;
      if (id) toggleLayer(id);
    };
    window.addEventListener('argus:toggle-layer', onToggle);
    return () => window.removeEventListener('argus:toggle-layer', onToggle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredEvents = typeFilter === 'all' ? events : events.filter(e => e.type === typeFilter);

  if (!mounted) {
    return (
      <div className="h-full flex items-center justify-center bg-[#050505]">
        <div className="w-4 h-4 border border-[#d4a012]/30 border-t-[#d4a012] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Map Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1a1a1a] bg-[#080808]">
        <div className="flex items-center gap-2">
          <h2 className="text-[11px] font-mono font-bold text-[#aaa] uppercase tracking-[0.2em]">Theatre Map</h2>
          <span className="text-[11px] text-[#aaa] font-mono">{filteredEvents.length}</span>
        </div>
        <div className="flex gap-0.5">
          {['all', 'military', 'diplomatic', 'humanitarian', 'protest'].map(type => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`text-[12px] px-2 py-1 font-mono uppercase tracking-wider rounded transition-colors ${
                typeFilter === type
                  ? 'bg-[#1a1a1a] text-[#d4a012]'
                  : 'text-[#aaa] hover:text-[#ccc]'
              }`}
            >
              {type === 'all' ? 'All' : type.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {/* Layer Controls + Legend */}
      <div className="flex flex-wrap items-center justify-between gap-y-1.5 px-4 py-1.5 border-b border-[#111] bg-[#080808]">
        <div className="flex items-center gap-4">
          {Object.entries(TYPE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color, opacity: 0.7 }} />
              <span className="text-[12px] text-[#aaa] capitalize font-mono">{type}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1">
          <span className="text-[12px] text-[#aaa] font-mono uppercase tracking-[0.15em] mr-1">Layers</span>
          {LAYER_CONFIG.map(layer => (
            <button
              key={layer.id}
              title={layer.desc}
              onClick={() => toggleLayer(layer.id)}
              className={`text-[12px] px-1.5 py-0.5 font-mono uppercase tracking-wider rounded border transition-all ${
                activeLayers.has(layer.id)
                  ? 'border-current opacity-100'
                  : 'border-[#1a1a1a] text-[#aaa] opacity-60 hover:opacity-100'
              }`}
              style={activeLayers.has(layer.id) ? { color: layer.color, borderColor: layer.color } : undefined}
            >
              {layer.label}
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={[25, 35]}
          zoom={3}
          className="h-full w-full"
          style={{ background: '#050505' }}
          attributionControl={false}
          preferCanvas={true}
          ref={(map) => {
            if (map && mapRef.current !== map) {
              mapRef.current = map;
              map.on('moveend zoomend', updateBounds);
              updateBounds();
            }
          }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
          />

          {/* RSS-based geo events (always shown) */}
          {filteredEvents.slice(0, 350).map(event => (
            <CircleMarker
              key={event.id}
              center={[event.location.lat, event.location.lng]}
              radius={SEVERITY_RADIUS[event.severity] || 6}
              pathOptions={{
                color: TYPE_COLORS[event.type] || '#333',
                fillColor: TYPE_COLORS[event.type] || '#333',
                fillOpacity: 0.35,
                weight: 1,
                opacity: 0.6,
              }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                <div style={{ fontFamily: 'monospace', fontSize: '11px', maxWidth: '220px', color: '#111' }}>
                  <div style={{ fontWeight: 'bold', color: TYPE_COLORS[event.type] || '#333' }}>{event.location.name}</div>
                  <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.title}</div>
                  <div style={{ color: '#666' }}>{event.type} · {event.severity} · {timeAgo(event.timestamp)}</div>
                </div>
              </Tooltip>
              <Popup>
                <div className="text-[12px] max-w-[240px] font-mono">
                  <div className="font-bold text-[#ccc] mb-1 leading-snug">{event.title}</div>
                  <div className="text-[#bbb] space-y-0.5 text-[11px]">
                    <div>LOC: {event.location.name}{event.location.country ? ` / ${event.location.country}` : ''}</div>
                    <div>TYPE: {event.type.toUpperCase()} | SEV: {event.severity.toUpperCase()}</div>
                    <div>SRC: {event.source} | {timeAgo(event.timestamp)}</div>
                  </div>
                  <a href={event.link} target="_blank" rel="noopener" className="text-[#d4a012] hover:underline mt-1.5 block text-[11px]">
                    OPEN SOURCE →
                  </a>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* Situation markers (event-centric overlay) */}
          {(situations || []).map(sit => (
            <CircleMarker
              key={`sit-${sit.id}`}
              center={[sit.center.lat, sit.center.lng]}
              radius={Math.min(10 + sit.metadata.articleCount / 3, 24)}
              pathOptions={{ color: SIT_SEV[sit.severity] || '#888', fillColor: SIT_SEV[sit.severity] || '#888', fillOpacity: 0.15, weight: 2, opacity: 0.9 }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                <div style={{ fontFamily: 'monospace', fontSize: '11px', maxWidth: '240px', color: '#111' }}>
                  <div style={{ fontWeight: 'bold' }}>{sit.title} · {sit.severity.toUpperCase()}</div>
                  <div style={{ color: '#666' }}>{sit.status.toUpperCase()} · {sit.metadata.velocity1h}/h · {sit.metadata.articleCount} reports</div>
                </div>
              </Tooltip>
              <Popup>
                <div className="text-[12px] max-w-[260px] font-mono">
                  <div className="font-bold text-[#ccc] mb-1 leading-snug">{sit.title}</div>
                  <div className="text-[#bbb] text-[11px] mb-1">{sit.status.toUpperCase()} · SEV {sit.severity.toUpperCase()} · {sit.metadata.velocity1h}/1h · CORR {sit.metadata.corroboration}</div>
                  {sit.latestHeadline && <div className="text-[#999] text-[11px] leading-snug">{sit.latestHeadline}</div>}
                  {sit.latestLink && <a href={sit.latestLink} target="_blank" rel="noopener" className="text-[#d4a012] hover:underline mt-1.5 block text-[11px]">OPEN SOURCE →</a>}
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* Toggle-able data layers */}
          {activeLayers.has('flights') && <FlightLayer bounds={bounds} />}
          {activeLayers.has('satellites') && <SatelliteLayer bounds={bounds} />}
          {activeLayers.has('conflicts') && <ConflictLayer />}
          {activeLayers.has('carriers') && <CarrierLayer />}
          {activeLayers.has('cameras') && <CameraLayer />}
          {activeLayers.has('sentiment') && <SentimentLayer />}
          {activeLayers.has('displacement') && <DisplacementLayer />}
          {activeLayers.has('chokepoints') && <ChokePointLayer />}
          {activeLayers.has('hazards') && <HazardsLayer />}
          {activeLayers.has('firms') && <FirmsLayer />}
          {activeLayers.has('acled') && <AcledLayer />}
        </MapContainer>
      </div>
    </div>
  );
}

export default memo(EventMap);
