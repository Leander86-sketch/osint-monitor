export interface NewsItem {
  id: string;
  title: string;
  description: string;
  link: string;
  source: string;
  sourceIcon?: string;
  pubDate: string;
  category?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  sentimentScore?: number;
  location?: GeoLocation;
  keywords: string[];
  sourceReliability?: number;
  sourceTier?: number;
  imageUrl?: string;
}

export interface GeoLocation {
  lat: number;
  lng: number;
  name: string;
  country?: string;
}

export interface GeoEvent {
  id: string;
  title: string;
  location: GeoLocation;
  type: 'military' | 'diplomatic' | 'humanitarian' | 'protest' | 'other';
  timestamp: string;
  source: string;
  link: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface Alert {
  id: string;
  keyword: string;
  enabled: boolean;
  createdAt: string;
  lastTriggered?: string;
  triggerCount: number;
}

export interface AlertEvent {
  id: string;
  alertId: string;
  keyword: string;
  newsItem: NewsItem;
  triggeredAt: string;
  notified: boolean;
}

export interface DashboardStats {
  totalArticles: number;
  articlesLastHour: number;
  articlesLast24h: number;
  sentimentBreakdown: {
    positive: number;
    negative: number;
    neutral: number;
  };
  topSources: { name: string; count: number }[];
  topKeywords: { word: string; count: number }[];
  trendData: { hour: string; count: number; sentiment: number }[];
}

export interface FeedConfig {
  name: string;
  url: string;
  category: string;
  enabled: boolean;
  tier?: number;
  reliability?: number;
  region?: string;
}

// --- Live Data Layer Types ---

export interface Flight {
  icao: string;
  callsign: string;
  originCountry: string;
  lat: number;
  lng: number;
  altitude: number;
  speed: number;
  heading: number;
  verticalRate: number;
  onGround: boolean;
  military: boolean;
  type?: string;
  registration?: string;
  notable?: { badge: string; category: string; operator: string; type: string; link?: string }; // plane-alert-db (ODbL), 22 sep 2026
}

export interface Satellite {
  id: string;
  name: string;
  lat: number;
  lng: number;
  altitude: number;
  speed: number;
  heading: number;
  noradId: number;
  intlDesignator?: string;
  tle1?: string;
  tle2?: string;
}

export interface ConflictEvent {
  id: string;
  title: string;
  lat: number;
  lng: number;
  locationName?: string;
  eventCode: string;
  goldsteinScale: number;
  numArticles: number;
  sources: string[];
  timestamp: string;
  url?: string;
}

export interface CarrierGroup {
  id: string;
  name: string;
  hullNumber: string;
  lat: number;
  lng: number;
  region: string;
  lastSeen: string;
  source?: string;
  sourceUrl?: string;
}

export interface Camera {
  id: string;
  name: string;
  lat: number;
  lng: number;
  imageUrl: string;
  network: string;
  city: string;
  lastUpdated?: string;
}

export type LayerType = 'flights' | 'satellites' | 'conflicts' | 'carriers' | 'cameras' | 'sentiment' | 'displacement' | 'chokepoints' | 'hazards' | 'firms' | 'frontline' | 'outages' | 'ships' | 'navwarn';

export interface TelegramMessage {
  id: string;
  channel: string;
  channelLabel: string;
  text: string;
  date: string;
  topic: string;
}

export interface NuclearFacility {
  name: string;
  lat: number;
  lng: number;
  country: string;
  type: string;
  status: string;
}

export interface MilitaryBase {
  name: string;
  lat: number;
  lng: number;
  country: string;
  operator: string;
  type: string;
}

export interface UnderseaCable {
  name: string;
  coordinates: Array<[number, number]>;
  owners: string;
  lengthKm: number;
}


// --- Situations (derived event-clustering layer) ---

export interface AnchorSituation {
  id: string;
  slug: string;
  title: string;
  type: 'conflict' | 'maritime' | 'nuclear' | 'humanitarian';
  anchorKeywords: string[];
  center: { lat: number; lng: number };
  bbox: [number, number, number, number]; // [south, west, north, east]
  zoom: number;
  actors: string[];
  requireStrong?: boolean;
  /** regex (bron): koppen die hierop matchen horen NIET bij deze situatie (bv. Oekraïne-oorlog buiten 'Europees luchtruim') */
  exclude?: string;
  /** regex (bron): de kop MOET hierop matchen (bv. een Europees land of 'airport'), anders hoort hij er niet bij */
  requireAny?: string;
  /** regex (bron) op de kop als alternatief voor anchorKeywords — voor onderwerpen die niet in vaste woordgroepen te vangen zijn */
  anchorRegex?: string;
  /** false = de bbox dient alleen om de kaart te richten en onderdrukt geen automatisch opkomende situaties in dat gebied */
  coversRegion?: boolean;
}

export interface Situation {
  id: string;
  slug: string;
  title: string;
  type: string;
  curated: boolean;
  center: { lat: number; lng: number };
  bbox: [number, number, number, number];
  zoom: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'breaking' | 'active' | 'cooling';
  itemIds: string[];
  actors: string[];
  keywords: string[];
  latestHeadline: string;
  latestLink: string;
  latestPubDate: string;
  metadata: {
    articleCount: number;
    velocity1h: number;
    velocity24h: number;
    sourceTierCounts: { t1: number; t2: number; t3: number };
    corroboration: 'A' | 'B' | 'C';
    sparkline: number[];
    lastUpdated: string;
  };
}

export interface HazardEvent {
  id: string;
  kind: string;
  lat: number;
  lng: number;
  title: string;
  magnitude: number | null;
  alert: string | null;
  date: string;
  url: string;
}

export interface FirePoint {
  id: string;
  lat: number;
  lng: number;
  frp: number;
  confidence: string;
  date: string;
}

