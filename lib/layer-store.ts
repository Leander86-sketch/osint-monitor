import { Flight, Satellite, ConflictEvent, CarrierGroup, Camera } from './types';

interface LayerStore {
  flights: { data: Flight[]; lastFetch: number };
  satellites: { data: Satellite[]; tles: string; lastTleFetch: number; lastFetch: number };
  conflicts: { data: ConflictEvent[]; lastFetch: number };
  carriers: { data: CarrierGroup[]; lastFetch: number };
  cameras: { data: Camera[]; lastFetch: number };
}

const g = globalThis as unknown as { __layerStore?: LayerStore };
if (!g.__layerStore) {
  g.__layerStore = {
    flights: { data: [], lastFetch: 0 },
    satellites: { data: [], tles: '', lastTleFetch: 0, lastFetch: 0 },
    conflicts: { data: [], lastFetch: 0 },
    carriers: { data: [], lastFetch: 0 },
    cameras: { data: [], lastFetch: 0 },
  };
}

export function getStore(): LayerStore {
  return g.__layerStore!;
}
