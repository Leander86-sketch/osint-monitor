'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Situation } from '@/lib/types';
import EventMap from '@/components/EventMap';
import LiveStream from '@/components/LiveStream';
import Dashboard from '@/components/Dashboard';
import { computeThreat, threatColor } from '@/components/ThreatGauge';
import SituationOverview from '@/components/SituationOverview';
import TypeOnHeadline from '@/components/TypeOnHeadline';
import LiveFeed from '@/components/LiveFeed';
import AlertPanel from '@/components/AlertPanel';
import EscalationStrip from '@/components/EscalationStrip';
import CommandPalette from '@/components/CommandPalette';
import TelegramFeed from '@/components/TelegramFeed';
import HumanitarianFeed from '@/components/HumanitarianFeed';
import SanctionsFeed from '@/components/SanctionsFeed';
import SourcesPanel from '@/components/SourcesPanel';
import BlueskyFeed from '@/components/BlueskyFeed';
import SatellitePanel from '@/components/SatellitePanel';
import ArmsPanel from '@/components/ArmsPanel';
import BreakingBand from '@/components/BreakingBand';
import ThreatLevels from '@/components/ThreatLevels';
import BreakingRail from '@/components/BreakingRail';
import Dossier from '@/components/Dossier';

const SEV_COLOR: Record<string, string> = { critical: '#dc2626', high: '#f97316', medium: '#eab308', low: '#6b7280' };
type Panel = 'feed' | 'alerts' | 'telegram' | 'bluesky' | 'humanitarian' | 'sanctions' | 'satellite' | 'arms' | 'markets';
type Stage = 'split' | 'live' | 'map';
const quiet = (iso?: string) => { if (!iso) return ''; const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000); return m >= 60 ? `quiet ${Math.floor(m / 60)}h` : m >= 30 ? `quiet ${m}m` : ''; };

function jump(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

// Writes/clears one query param in place (deep-link state: ?sit= &layers= &panel=)
function setUrlParam(key: string, value: string | null) {
  const url = new URL(window.location.href);
  if (value) url.searchParams.set(key, value);
  else url.searchParams.delete(key);
  window.history.replaceState(null, '', url);
}

// Homepage sinds 19 sep 2026 (was /next, 18 sep): nieuwe bovenkant — breaking-band, feed die kiest, podium met grote stream of kaart.
// De vorige homepage (HomeClient) blijft bereikbaar op /classic, zodat terugdraaien één handeling is.
export default function NextClient({ initialSituations = [] }: { initialSituations?: Situation[] } = {}) {
  const [stage, setStage] = useState<Stage>('split');
  const [focus, setFocus] = useState<{ total: number; last30: number; critical30: number; last365: number; critical365: number; criticalTotal: number } | null>(null);
  useEffect(() => { fetch('/api/hybrid?summary=1').then(r => r.json()).then(d => { if (d && typeof d.last30 === 'number') setFocus(d); }).catch(() => {}); }, []);
  const [dossier, setDossier] = useState<string | null>(null); // open dossier (slug); ook via ?dossier=
  const [demoBreaking, setDemoBreaking] = useState(false); // ?breaking=1 toont de band ook als er nu niets breekt (alleen om te beoordelen)
  const [situations, setSituations] = useState<Situation[]>(initialSituations);
  const [time, setTime] = useState('');
  const [keywordFilter, setKeywordFilter] = useState('');
  const [panel, setPanel] = useState<Panel>('feed');
  const [focusBbox, setFocusBbox] = useState<[number, number, number, number] | null>(null);
  const [copied, setCopied] = useState(false);
  const pendingSitRef = useRef<string | null>(null);

  // bezoekersmeting: één beacon per sessie (16 sep 2026)
  useEffect(() => {
    try { if (!sessionStorage.getItem('argus_v')) { sessionStorage.setItem('argus_v', '1'); fetch('/api/visit', { method: 'POST', keepalive: true }).catch(() => {}); } } catch { /* privé-modus */ }
  }, []);
  useEffect(() => {
    const u = () => setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    u();
    const i = setInterval(u, 1000);
    return () => clearInterval(i);
  }, []);

  // Deep link: restore ?sit= and ?panel= on load; ?layers= is handled inside EventMap
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const p = q.get('panel');
    if (p && ['feed', 'alerts', 'telegram', 'bluesky', 'humanitarian', 'sanctions', 'satellite', 'arms', 'markets'].includes(p)) setPanel(p as Panel);
    pendingSitRef.current = q.get('sit');
    setDemoBreaking(q.get('breaking') === '1');
    if (q.get('dossier')) setDossier(q.get('dossier'));
  }, []);

  useEffect(() => {
    setUrlParam('panel', panel === 'feed' ? null : panel);
  }, [panel]);
  useEffect(() => { setUrlParam('dossier', dossier); }, [dossier]);

  const fetchSituations = useCallback(async () => {
    try {
      const r = await fetch('/api/situations');
      const d = await r.json();
      setSituations(d.situations || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchSituations();
    const i = setInterval(fetchSituations, 30000);
    return () => clearInterval(i);
  }, [fetchSituations]);

  useEffect(() => {
    const refresh = () => fetch('/api/feed', { method: 'POST' }).then(fetchSituations).catch(() => {});
    refresh();
    const i = setInterval(refresh, 300000);
    return () => clearInterval(i);
  }, [fetchSituations]);

  useEffect(() => {
    if (!pendingSitRef.current || situations.length === 0) return;
    const slug = pendingSitRef.current;
    pendingSitRef.current = null;
    const sit = situations.find(x => x.slug === slug);
    if (sit?.bbox) {
      setFocusBbox([...sit.bbox] as [number, number, number, number]);
      setTimeout(() => document.getElementById('situation-map')?.scrollIntoView({ behavior: 'smooth' }), 400);
    }
  }, [situations]);

  const onFilter = (kw: string) => {
    setKeywordFilter(kw);
    setPanel('feed');
    jump('band-raw');
  };

  const onFocus = (bbox: [number, number, number, number]) => {
    setFocusBbox([...bbox] as [number, number, number, number]);
    jump('band-hero');
  };

  const threat = computeThreat(situations);
  const tColor = threatColor(threat);
  const top = situations.slice(0, 6);

  const onFocusSlug = useCallback((slug: string) => {
    const sit = situations.find(x => x.slug === slug);
    if (sit?.bbox) setFocusBbox(sit.bbox);
    setUrlParam('sit', slug);
    document.getElementById('situation-map')?.scrollIntoView({ behavior: 'smooth' });
  }, [situations]);

  const topList = (
    <>
      <h2 className="text-[11px] font-mono font-bold text-[#888] uppercase tracking-[0.2em] mb-2">Top Situations</h2>
      <div className="space-y-1">
        {top.map((s, i) => (
          <button key={s.id} onClick={() => { onFocus(s.bbox); if (stage === 'live') setStage('map'); }} className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#0e0e0e] border-l-2" style={{ borderColor: SEV_COLOR[s.severity] }}>
            <span className="text-[10px] font-mono text-[#444] tabular-nums">{String(i + 1).padStart(2, '0')}</span>
            <span className="text-[11px] font-mono text-[#ccc] uppercase truncate flex-1">{s.title}</span>
            <span role="button" title="Open dossier" onClick={(e) => { e.stopPropagation(); setDossier(s.slug); }} className="text-[10px] font-mono text-[#666] hover:text-[#e8760a] px-1">▤</span>
            {s.status === 'breaking' && <span className="w-1.5 h-1.5 rounded-full bg-[#dc2626] animate-pulse" />}
            <span className="text-[10px] font-mono tabular-nums" title={quiet(s.latestPubDate) ? 'No news' : 'Last hour'} style={{ color: quiet(s.latestPubDate) ? '#555' : SEV_COLOR[s.severity] }}>{quiet(s.latestPubDate) || (s.metadata.velocity1h > 0 ? '+' + s.metadata.velocity1h : s.severity.slice(0, 3).toUpperCase())}</span>
          </button>
        ))}
        {top.length === 0 && <div className="text-[10px] font-mono text-[#333] py-8 text-center uppercase">Monitoring...</div>}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-[#ccc]">
      <CommandPalette situations={situations} onFocusSituation={onFocusSlug} />
      <EscalationStrip onFocus={onFocusSlug} />
      <div className="sticky top-0 z-40 bg-[#080808]/95 backdrop-blur border-b border-[#1a1a1a]">
        <header className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-2 h-2 rounded-full bg-[#e8760a]" />
                <div className="absolute inset-0 w-2 h-2 rounded-full bg-[#e8760a] animate-ping opacity-30" />
              </div>
              <h1 className="text-sm font-bold tracking-[0.15em] uppercase"><span className="text-[#e8760a]">ARGUS</span></h1>
            </div>
            <div className="h-3 w-px bg-[#1a1a1a]" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-[#888] uppercase tracking-wider">Threat</span>
              <span className="text-sm font-mono font-bold tabular-nums" style={{ color: tColor }}>{threat}</span>
              <div className="w-16 h-1.5 bg-[#111] rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${threat}%`, backgroundColor: tColor }} /></div>
            </div>
            <div className="hidden md:flex items-center gap-1 ml-2">
              {[['band-hero', 'GLANCE'], ['band-situations', 'SITUATIONS'], ['band-raw', 'RAW'], ['band-ref', 'REF']].map(([id, label]) => (
                <button key={id} onClick={() => jump(id)} className="text-[10px] font-mono px-2 py-1 rounded text-[#888] hover:text-[#e8760a] hover:bg-[#0f0f0f] uppercase tracking-wider transition-colors">{label}</button>
              ))}
              <a href="/focus" title="Hybrid Europe" className="text-[10px] font-mono px-2 py-1 rounded text-[#e8760a] border border-[#b85a08]/60 hover:bg-[#e8760a]/10 uppercase tracking-wider transition-colors ml-1">Focus</a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden lg:block text-[11px] font-mono text-[#888] uppercase tracking-wider">By Leander Bloot</span>
            <SourcesPanel />
            <a href="https://t.me/argusdaily" target="_blank" rel="noopener noreferrer" title="ARGUS Daily: one briefing every morning at 07:00 CET, on Telegram" className="hidden lg:block text-[11px] font-mono text-[#888] hover:text-[#e8760a] uppercase tracking-wider transition-colors">Daily briefing</a>
            <a href="https://bsky.app/profile/argus.prototipo.nl" target="_blank" rel="noopener noreferrer" title="ARGUS alerts on Bluesky" className="hidden lg:block text-[11px] font-mono text-[#888] hover:text-[#e8760a] uppercase tracking-wider transition-colors">Bluesky</a>
            <a href="https://x.com/ArgusDashboard" target="_blank" rel="noopener noreferrer" title="ARGUS alerts on X" className="hidden lg:block text-[11px] font-mono text-[#888] hover:text-[#e8760a] tracking-wider transition-colors">𝕏</a>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href)
                  .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
                  .catch(() => {});
              }}
              title="Copy a link to this exact view (situation, layers, panel)"
              className="hidden lg:block text-[11px] font-mono text-[#888] hover:text-[#e8760a] uppercase tracking-wider transition-colors"
            >{copied ? '\u2713 Copied' : '\u29c9 Share'}</button>
            <a href="https://ko-fi.com/lb377260" target="_blank" rel="noopener noreferrer" className="hidden lg:block text-[11px] font-mono text-[#888] hover:text-[#e8760a] uppercase tracking-wider transition-colors">&#9749; Support</a>
            <div className="h-3 w-px bg-[#1a1a1a]" />
            <span className="text-[12px] text-[#ccc] font-mono tracking-wider tabular-nums">{time}</span>
          </div>
        </header>
      </div>

      <BreakingBand situations={situations} demo={demoBreaking} onDossier={setDossier} onFocus={onFocusSlug} onWatch={() => { setStage('live'); jump('band-hero'); }} />

      <section id="band-hero" className="scroll-mt-32 border-b border-[#1a1a1a] bg-[#1a1a1a]">
        {stage === 'split' && (
          <div className="grid grid-cols-1 lg:grid-cols-[30rem_1fr_22rem] gap-px">
            <div className="bg-[#080808] h-[72vh] min-h-[420px] order-2 lg:order-none"><BreakingRail situations={situations} /></div>
            <div id="situation-map" className="bg-[#050505] relative h-[72vh] min-h-[420px] overflow-hidden">
              <EventMap focusBbox={focusBbox} situations={situations} />
              <div className="hero-glow" /><div className="vignette" /><div className="scanlines" />
              <div className="absolute bottom-0 left-0 right-0 z-[500] pointer-events-none px-3 pb-2.5"><TypeOnHeadline situations={situations} /></div>
              <button title="Bigger map" onClick={() => setStage('map')} className="absolute top-24 right-3 z-[600] text-[10px] font-mono uppercase tracking-[0.15em] text-[#bbb] hover:text-[#e8760a] bg-[#050505]/85 border border-[#222] hover:border-[#e8760a] px-2.5 py-1.5">⤢ Enlarge map</button>
            </div>
            <div className="bg-[#080808] overflow-y-auto h-[72vh] min-h-[420px]">
              <div className="border-b border-[#1a1a1a]"><LiveStream /></div>
              <div className="px-3 pt-2"><button title="Bigger video" onClick={() => setStage('live')} className="w-full text-[10px] font-mono uppercase tracking-[0.15em] text-[#bbb] hover:text-[#e8760a] border border-[#222] hover:border-[#e8760a] px-2.5 py-1.5">⤢ Enlarge live stream</button></div>
              <div className="p-3">{topList}</div>
            </div>
          </div>
        )}
        {stage === 'live' && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_20rem] gap-px">
            <div className="bg-black h-[78vh] min-h-[460px]"><LiveStream variant="stage" /></div>
            <div className="bg-[#080808] h-[78vh] min-h-[460px] overflow-y-auto flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a1a1a]"><span className="text-[10px] font-mono text-[#888] uppercase tracking-[0.2em]">Live stream enlarged</span><button title="Normal view" onClick={() => setStage('split')} className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#bbb] hover:text-[#e8760a] border border-[#222] px-2 py-1">⤡ Back</button></div>
              <button onClick={() => setStage('map')} title="Show map" className="relative h-44 shrink-0 border-b border-[#1a1a1a] overflow-hidden text-left group">
                <div className="absolute inset-0 pointer-events-none"><EventMap key="mini" focusBbox={focusBbox} situations={situations} bare /></div>
                <span className="absolute left-2 bottom-2 z-[600] text-[10px] font-mono uppercase tracking-[0.15em] text-[#bbb] group-hover:text-[#e8760a] bg-[#050505]/85 border border-[#222] px-2 py-1">⤢ Map</span>
              </button>
              <div className="flex-1 min-h-0"><BreakingRail situations={situations} compact /></div>
            </div>
          </div>
        )}
        {stage === 'map' && (
          <div id="situation-map" className="bg-[#050505] relative h-[78vh] min-h-[460px] overflow-hidden">
            <EventMap key="big" focusBbox={focusBbox} situations={situations} />
            <div className="hero-glow" /><div className="vignette" />
            <button title="Normal view" onClick={() => setStage('split')} className="absolute top-24 right-3 z-[600] text-[10px] font-mono uppercase tracking-[0.15em] text-[#bbb] hover:text-[#e8760a] bg-[#050505]/85 border border-[#222] px-2.5 py-1.5">⤡ Back</button>
            <div className="absolute right-4 bottom-4 z-[600] w-[22rem] max-w-[40vw] border border-[#222] bg-black shadow-[0_10px_40px_rgba(0,0,0,.7)]">
              <div className="h-[12.4rem]"><LiveStream variant="pip" /></div>
              <button title="Bigger video" onClick={() => setStage('live')} className="w-full text-[10px] font-mono uppercase tracking-[0.15em] text-[#bbb] hover:text-[#e8760a] bg-[#080808] border-t border-[#222] px-2 py-1.5">⤢ Enlarge live stream</button>
            </div>
          </div>
        )}
      </section>

      {/* Verwijzing naar het verdiepingsstuk: één patroon over veel landen */}
      <a href="/focus" title="Hybrid Europe" className="group flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 border-b border-[#1a1a1a] bg-[#0a0806] hover:bg-[#120d07] transition-colors">
        <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#e8760a] border border-[#b85a08] px-2 py-0.5">Focus</span>
        <span className="text-[16px] text-white" style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}>Hybrid Europe: drones, sabotage and cut cables below the threshold of war</span>
        {focus && <span className="text-[11px] font-mono text-[#999]">{focus.total} incidents since 2022 · {focus.criticalTotal} critical</span>}
        <span className="ml-auto text-[11px] font-mono text-[#e8760a] group-hover:text-white">read the analysis →</span>
      </a>

      {/* Officiële terreurdreigingsniveaus (NL, UK, US) — 23 sep 2026 */}
      <ThreatLevels />

      <section id="band-situations" className="scroll-mt-32 px-4 py-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" />
          <h2 className="text-[11px] font-mono font-bold text-[#ddd] uppercase tracking-[0.2em]">Live Situations</h2>
          <span className="text-[11px] font-mono text-[#555]">{situations.length}</span>
          <span className="text-[10px] font-mono text-[#444] ml-2">click a card to open its dossier</span>
        </div>
        <SituationOverview situations={situations} onFilter={onFilter} onFocus={onFocus} onOpen={setDossier} />
        {dossier && <Dossier situations={situations} slug={dossier} onClose={() => setDossier(null)} onGo={setDossier} onLocate={(sl) => { setDossier(null); setStage('split'); onFocusSlug(sl); }} />}
      </section>

      <section id="band-raw" className="scroll-mt-32 px-4 py-6 border-t border-[#111] bg-[#070707]">
        <h2 className="text-[11px] font-mono font-bold text-[#ddd] uppercase tracking-[0.2em] mb-3">Intel — conflict only · markets have their own tab</h2>
        <div className="border border-[#1a1a1a] rounded bg-[#080808] overflow-hidden" style={{ height: '70vh' }}>
          <div className="flex border-b border-[#1a1a1a] overflow-x-auto">
            {([['feed', 'Intel Feed'], ['alerts', 'Alerts'], ['telegram', 'Telegram'], ['bluesky', 'BSKY'], ['humanitarian', 'Aid'], ['sanctions', 'Sanctions'], ['satellite', 'SAT'], ['arms', 'Arms'], ['markets', 'Markets']] as [Panel, string][]).map(([k, label]) => (
              <button key={k} title={k === 'markets' ? 'Business news' : k === 'feed' ? 'Conflict news' : undefined} onClick={() => setPanel(k)} className={`flex-1 whitespace-nowrap text-[11px] py-2.5 px-3 font-mono uppercase tracking-[0.15em] transition-colors ${panel === k ? 'text-[#e8760a] border-b border-[#e8760a] bg-[#e8760a]/5' : 'text-[#888] hover:text-[#ccc]'}`}>{label}</button>
            ))}
          </div>
          <div className="overflow-hidden" style={{ height: 'calc(70vh - 41px)' }}>
            {panel === 'feed' && <LiveFeed mode="conflict" keywordFilter={keywordFilter} onClearFilter={() => setKeywordFilter('')} />}
            {panel === 'markets' && <LiveFeed mode="markets" />}
            {panel === 'alerts' && <AlertPanel />}
            {panel === 'telegram' && <TelegramFeed />}
            {panel === 'bluesky' && <BlueskyFeed />}
            {panel === 'humanitarian' && <HumanitarianFeed />}
            {panel === 'sanctions' && <SanctionsFeed />}
            {panel === 'satellite' && <SatellitePanel />}
            {panel === 'arms' && <ArmsPanel />}
          </div>
        </div>
      </section>

      <section id="band-ref" className="scroll-mt-32 px-4 py-6 border-t border-[#111]">
        <h2 className="text-[11px] font-mono font-bold text-[#666] uppercase tracking-[0.2em] mb-3">Reference — Bedrock</h2>
        <div className="border border-[#1a1a1a] rounded bg-[#080808] max-h-[600px] overflow-y-auto"><Dashboard /></div>
      </section>

      <footer className="px-5 py-4 border-t border-[#1a1a1a] flex items-center justify-between text-[10px] font-mono text-[#444]">
        <span>ARGUS // OSINT - Built by Leander Bloot - <a href="https://leanderbloot.nl/contact" target="_blank" rel="noopener noreferrer" className="text-[#666] hover:text-[#e8760a] transition-colors">Want a custom monitor for your sector? Get in touch</a> - <a href="https://ko-fi.com/lb377260" target="_blank" rel="noopener noreferrer" className="text-[#666] hover:text-[#e8760a] transition-colors">Support</a></span>
        <button onClick={() => jump('band-hero')} className="hover:text-[#e8760a] uppercase tracking-wider">Back to Mission Control</button>
      </footer>
    </div>
  );
}
