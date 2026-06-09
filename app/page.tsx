'use client';

import { useState, useEffect, useCallback } from 'react';
import { Situation } from '@/lib/types';
import EventMap from '@/components/EventMap';
import MarketTicker from '@/components/MarketTicker';
import LiveStream from '@/components/LiveStream';
import Dashboard from '@/components/Dashboard';
import ThreatGauge, { computeThreat, threatColor } from '@/components/ThreatGauge';
import SituationOverview from '@/components/SituationOverview';
import TypeOnHeadline from '@/components/TypeOnHeadline';
import LiveFeed from '@/components/LiveFeed';
import AlertPanel from '@/components/AlertPanel';
import TelegramFeed from '@/components/TelegramFeed';
import HumanitarianFeed from '@/components/HumanitarianFeed';
import SanctionsFeed from '@/components/SanctionsFeed';
import SatellitePanel from '@/components/SatellitePanel';
import ArmsPanel from '@/components/ArmsPanel';

const SEV_COLOR: Record<string, string> = { critical: '#dc2626', high: '#f97316', medium: '#eab308', low: '#6b7280' };
type Panel = 'feed' | 'alerts' | 'telegram' | 'humanitarian' | 'sanctions' | 'satellite' | 'arms';

function jump(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export default function Home() {
  const [situations, setSituations] = useState<Situation[]>([]);
  const [time, setTime] = useState('');
  const [keywordFilter, setKeywordFilter] = useState('');
  const [panel, setPanel] = useState<Panel>('feed');
  const [focusBbox, setFocusBbox] = useState<[number, number, number, number] | null>(null);

  useEffect(() => {
    const u = () => setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    u();
    const i = setInterval(u, 1000);
    return () => clearInterval(i);
  }, []);

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

  return (
    <div className="min-h-screen bg-[#050505] text-[#ccc]">
      <div className="sticky top-0 z-40 bg-[#080808]/95 backdrop-blur border-b border-[#1a1a1a]">
        <header className="flex items-center justify-between px-5 py-2.5">
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
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="https://leanderbloot.nl" target="_blank" rel="noopener noreferrer" className="hidden lg:block text-[11px] font-mono text-[#888] hover:text-[#e8760a] uppercase tracking-wider transition-colors">By Leander Bloot</a>
            <a href="https://x.com/LeanderLBB" target="_blank" rel="noopener noreferrer" className="text-[11px] font-mono text-[#888] hover:text-[#ccc] transition-colors">@LeanderLBB</a>
            <div className="h-3 w-px bg-[#1a1a1a]" />
            <span className="text-[12px] text-[#ccc] font-mono tracking-wider tabular-nums">{time}</span>
          </div>
        </header>
        <MarketTicker />
      </div>

      <section id="band-hero" className="scroll-mt-32 grid grid-cols-1 lg:grid-cols-[18rem_1fr_22rem] gap-px bg-[#1a1a1a] border-b border-[#1a1a1a]">
        <div className="bg-[#080808] p-3 flex flex-col gap-3">
          <ThreatGauge situations={situations} />
          <div className="text-[10px] font-mono text-[#555] uppercase tracking-[0.2em] mt-auto animate-pulse">Descend for {situations.length} situations</div>
        </div>
        <div className="bg-[#050505] relative h-[72vh] min-h-[420px] overflow-hidden">
          <EventMap focusBbox={focusBbox} />
          <div className="hero-glow" />
          <div className="vignette" />
          <div className="scanlines" />
          <div className="absolute bottom-0 left-0 right-0 z-[500] pointer-events-none px-3 pb-2.5">
            <TypeOnHeadline situations={situations} />
          </div>
        </div>
        <div className="bg-[#080808] p-3 overflow-y-auto h-[72vh] min-h-[420px]">
          <h2 className="text-[11px] font-mono font-bold text-[#888] uppercase tracking-[0.2em] mb-2">Top Situations</h2>
          <div className="space-y-1">
            {top.map((s, i) => (
              <button key={s.id} onClick={() => onFocus(s.bbox)} className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#0e0e0e] border-l-2" style={{ borderColor: SEV_COLOR[s.severity] }}>
                <span className="text-[10px] font-mono text-[#444] tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-[11px] font-mono text-[#ccc] uppercase truncate flex-1">{s.title}</span>
                {s.status === 'breaking' && <span className="w-1.5 h-1.5 rounded-full bg-[#dc2626] animate-pulse" />}
                <span className="text-[10px] font-mono tabular-nums" style={{ color: SEV_COLOR[s.severity] }}>{s.metadata.velocity1h > 0 ? '+' + s.metadata.velocity1h : s.severity.slice(0, 3).toUpperCase()}</span>
              </button>
            ))}
            {top.length === 0 && <div className="text-[10px] font-mono text-[#333] py-8 text-center uppercase">Monitoring...</div>}
          </div>
        </div>
      </section>

      <section id="band-situations" className="scroll-mt-32 px-4 py-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" />
          <h2 className="text-[11px] font-mono font-bold text-[#ddd] uppercase tracking-[0.2em]">Live Situations</h2>
          <span className="text-[11px] font-mono text-[#555]">{situations.length}</span>
          <span className="text-[10px] font-mono text-[#444] ml-2">click a card to drill into the latest developments</span>
        </div>
        <SituationOverview situations={situations} onFilter={onFilter} onFocus={onFocus} />
      </section>

      <section id="band-raw" className="scroll-mt-32 px-4 py-6 border-t border-[#111] bg-[#070707]">
        <h2 className="text-[11px] font-mono font-bold text-[#ddd] uppercase tracking-[0.2em] mb-3">Raw Intel — Unfiltered</h2>
        <div className="border border-[#1a1a1a] rounded bg-[#080808] overflow-hidden" style={{ height: '70vh' }}>
          <div className="flex border-b border-[#1a1a1a] overflow-x-auto">
            {([['feed', 'Intel Feed'], ['alerts', 'Alerts'], ['telegram', 'Telegram'], ['humanitarian', 'Aid'], ['sanctions', 'Sanctions'], ['satellite', 'SAT'], ['arms', 'Arms']] as [Panel, string][]).map(([k, label]) => (
              <button key={k} onClick={() => setPanel(k)} className={`flex-1 whitespace-nowrap text-[11px] py-2.5 px-3 font-mono uppercase tracking-[0.15em] transition-colors ${panel === k ? 'text-[#e8760a] border-b border-[#e8760a] bg-[#e8760a]/5' : 'text-[#888] hover:text-[#ccc]'}`}>{label}</button>
            ))}
          </div>
          <div className="overflow-hidden" style={{ height: 'calc(70vh - 41px)' }}>
            {panel === 'feed' && <LiveFeed keywordFilter={keywordFilter} onClearFilter={() => setKeywordFilter('')} />}
            {panel === 'alerts' && <AlertPanel />}
            {panel === 'telegram' && <TelegramFeed />}
            {panel === 'humanitarian' && <HumanitarianFeed />}
            {panel === 'sanctions' && <SanctionsFeed />}
            {panel === 'satellite' && <SatellitePanel />}
            {panel === 'arms' && <ArmsPanel />}
          </div>
        </div>
      </section>

      <section id="band-ref" className="scroll-mt-32 px-4 py-6 border-t border-[#111]">
        <h2 className="text-[11px] font-mono font-bold text-[#666] uppercase tracking-[0.2em] mb-3">Reference — Bedrock</h2>
        <div className="grid grid-cols-1 lg:grid-cols-[22rem_1fr] gap-4">
          <div className="border border-[#1a1a1a] rounded overflow-hidden"><LiveStream /></div>
          <div className="border border-[#1a1a1a] rounded bg-[#080808] max-h-[600px] overflow-y-auto"><Dashboard /></div>
        </div>
      </section>

      <footer className="px-5 py-4 border-t border-[#1a1a1a] flex items-center justify-between text-[10px] font-mono text-[#444]">
        <span>ARGUS // OSINT - Built by Leander Bloot</span>
        <button onClick={() => jump('band-hero')} className="hover:text-[#e8760a] uppercase tracking-wider">Back to Mission Control</button>
      </footer>
    </div>
  );
}
