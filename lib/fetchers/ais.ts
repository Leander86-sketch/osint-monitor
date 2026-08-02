// AISStream.io live ship positions at strategic chokepoints.
// Requires AISSTREAM_KEY in .env.local (free key from aisstream.io/apikeys).
// One persistent websocket per server process (lazy-started, idle-stopped):
// terrestrial AIS coverage, so coastal chokepoints work well, open ocean not.

export interface ShipPosition {
  mmsi: number;
  name: string;
  lat: number;
  lng: number;
  speed: number | null;    // knots (Sog)
  course: number | null;   // degrees (Cog)
  navStatus: number | null;
  shipType: number | null; // AIS type code (from ShipStaticData)
  destination: string;
  lastSeen: number;
}

// [[lat_sw, lon_sw], [lat_ne, lon_ne]] per chokepoint
const CHOKEPOINT_BOXES: [number, number][][] = [
  [[23.5, 54.0], [28.0, 58.5]],   // Strait of Hormuz + Persian Gulf approach
  [[11.5, 41.0], [16.0, 44.5]],   // Bab al-Mandab + southern Red Sea
  [[26.0, 32.0], [31.5, 35.0]],   // Suez approach + northern Red Sea
  [[40.8, 27.5], [46.8, 33.5]],   // Bosphorus + western Black Sea (Odesa)
  [[22.0, 117.0], [26.5, 121.5]], // Taiwan Strait
];

const PRUNE_MS = 30 * 60_000;   // drop ships not seen for 30 min
const IDLE_STOP_MS = 20 * 60_000; // close socket when the layer isn't being polled
const MAX_SHIPS = 4000;

interface AisState {
  ships: Map<number, ShipPosition>;
  ws: WebSocket | null;
  connecting: boolean;
  lastPoll: number;
  reconnectDelay: number;
  pruneTimer: ReturnType<typeof setInterval> | null;
}

const g = globalThis as unknown as { __aisState?: AisState };
if (!g.__aisState) {
  g.__aisState = { ships: new Map(), ws: null, connecting: false, lastPoll: 0, reconnectDelay: 10_000, pruneTimer: null };
}

function prune(st: AisState): void {
  const cutoff = Date.now() - PRUNE_MS;
  for (const [mmsi, s] of st.ships) {
    if (s.lastSeen < cutoff) st.ships.delete(mmsi);
  }
  // Idle: nobody is looking at the layer -> close the stream (restarts on next poll)
  if (st.ws && Date.now() - st.lastPoll > IDLE_STOP_MS) {
    try { st.ws.close(); } catch { /* ignore */ }
    st.ws = null;
  }
}

async function handleMessage(st: AisState, data: unknown): Promise<void> {
  const txt = typeof data === 'string' ? data : await (data as Blob).text();
  let m: {
    MessageType?: string;
    MetaData?: { MMSI?: number; ShipName?: string; latitude?: number; longitude?: number };
    Message?: {
      PositionReport?: { Sog?: number; Cog?: number; NavigationalStatus?: number };
      ShipStaticData?: { Type?: number; Destination?: string };
    };
  };
  try { m = JSON.parse(txt); } catch { return; }
  const meta = m.MetaData;
  if (!meta || typeof meta.MMSI !== 'number') return;

  const prev = st.ships.get(meta.MMSI);
  const ship: ShipPosition = prev || {
    mmsi: meta.MMSI, name: '', lat: 0, lng: 0, speed: null, course: null,
    navStatus: null, shipType: null, destination: '', lastSeen: 0,
  };
  ship.name = (meta.ShipName || ship.name || '').trim();
  if (typeof meta.latitude === 'number') ship.lat = meta.latitude;
  if (typeof meta.longitude === 'number') ship.lng = meta.longitude;
  ship.lastSeen = Date.now();

  if (m.MessageType === 'PositionReport' && m.Message?.PositionReport) {
    const p = m.Message.PositionReport;
    if (typeof p.Sog === 'number') ship.speed = p.Sog;
    if (typeof p.Cog === 'number') ship.course = p.Cog;
    if (typeof p.NavigationalStatus === 'number') ship.navStatus = p.NavigationalStatus;
  } else if (m.MessageType === 'ShipStaticData' && m.Message?.ShipStaticData) {
    const sd = m.Message.ShipStaticData;
    if (typeof sd.Type === 'number') ship.shipType = sd.Type;
    if (typeof sd.Destination === 'string') ship.destination = sd.Destination.trim();
  }

  if (st.ships.size < MAX_SHIPS || st.ships.has(meta.MMSI)) st.ships.set(meta.MMSI, ship);
}

function connect(st: AisState, key: string): void {
  if (st.ws || st.connecting) return;
  st.connecting = true;
  try {
    const ws = new WebSocket('wss://stream.aisstream.io/v0/stream');
    ws.onopen = () => {
      st.connecting = false;
      st.ws = ws;
      st.reconnectDelay = 10_000;
      ws.send(JSON.stringify({
        APIKey: key,
        BoundingBoxes: CHOKEPOINT_BOXES.map(b => [b[0], b[1]]),
        FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
      }));
      console.log('[AIS] stream connected');
    };
    ws.onmessage = (e) => { void handleMessage(st, e.data); };
    ws.onerror = () => { /* onclose follows */ };
    ws.onclose = (e) => {
      st.ws = null;
      st.connecting = false;
      console.warn(`[AIS] stream closed (${e.code}) ${String(e.reason || '').slice(0, 80)}`);
      // Reconnect only while the layer is actively polled (beta service: expect drops)
      if (Date.now() - st.lastPoll < IDLE_STOP_MS) {
        setTimeout(() => connect(st, key), st.reconnectDelay);
        st.reconnectDelay = Math.min(st.reconnectDelay * 2, 5 * 60_000);
      }
    };
  } catch (err) {
    st.connecting = false;
    console.error('[AIS] connect failed:', err);
  }
}

export function getShips(): { available: boolean; ships: ShipPosition[] } {
  const key = process.env.AISSTREAM_KEY;
  if (!key) return { available: false, ships: [] };
  const st = g.__aisState!;
  st.lastPoll = Date.now();
  if (!st.pruneTimer) st.pruneTimer = setInterval(() => prune(st), 60_000);
  connect(st, key);
  return { available: true, ships: [...st.ships.values()] };
}
