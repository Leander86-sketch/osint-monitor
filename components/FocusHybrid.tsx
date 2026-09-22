'use client';

// Focus: hybrid Europe (19 sep 2026) — een verdiepingsstuk naast de lopende situaties.
// Een situatie volgt één brandhaard; dit dossier volgt één PATROON over veel landen: drones, sabotage, kabels, storing, cyber.
// Elke regel heeft een bron, een toeschrijving zoals de bron die geeft, en een ernst volgens vaste regels (zie "How severity is assigned").
import { useEffect, useMemo, useState } from 'react';
import FocusMap, { MapPoint } from '@/components/FocusMap';

type Sev = 'critical' | 'medium' | 'small';
interface Incident { id: string; date: string; dateApprox: boolean; countries: string[]; place: string | null; lat: number | null; lon: number | null; coordApprox: boolean; type: string; title: string; attribution: 'confirmed' | 'suspected' | 'unknown'; actor: string | null; severity: Sev; severityWhy: string; campaign?: string | null; sources: { name: string; url: string }[]; origin: string }
interface Data { generatedAt: string | null; counts: { total: number }; credits: { name: string; url: string }[]; incidents: Incident[] }

const SEV_COLOR: Record<Sev, string> = { critical: '#dc2626', medium: '#f59e0b', small: '#6b7280' };
const TYPES: [string, string][] = [['drone', 'Drones'], ['sabotage', 'Sabotage'], ['maritime', 'Sea & cables'], ['airspace', 'Airspace'], ['jamming', 'GPS jamming'], ['cyber', 'Cyber'], ['other', 'Other']];
const ATTR_LABEL: Record<string, string> = { confirmed: 'officially attributed', suspected: 'suspected', unknown: 'unattributed' };
const sans = { fontFamily: 'var(--font-geist-sans), sans-serif' };
const RANGES: [string, number][] = [['30 days', 30], ['90 days', 90], ['This year', -1], ['All', 0]];

export default function FocusHybrid() {
  const [data, setData] = useState<Data | null>(null);
  const [range, setRange] = useState(0); // 0 = alles: de dataset loopt tot 2025, de eigen detectie begint 22 sep 2026
  const [types, setTypes] = useState<Set<string>>(new Set());
  const [sevs, setSevs] = useState<Set<Sev>>(new Set());
  const [country, setCountry] = useState('');
  const [attr, setAttr] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);

  useEffect(() => { fetch('/api/hybrid').then(r => r.json()).then(setData).catch(() => setData({ generatedAt: null, counts: { total: 0 }, credits: [], incidents: [] })); }, []);

  const all = data?.incidents || [];
  const now = Date.now();
  const inRange = useMemo(() => all.filter(i => { if (range === 0) return true; if (range === -1) return i.date.startsWith(String(new Date().getFullYear())); return now - new Date(i.date).getTime() < range * 86400000; }), [all, range]); // eslint-disable-line react-hooks/exhaustive-deps
  const list = useMemo(() => inRange.filter(i => (!types.size || types.has(i.type)) && (!sevs.size || sevs.has(i.severity)) && (!country || i.countries.includes(country)) && (!attr || i.attribution === attr)), [inRange, types, sevs, country, attr]);
  const countries = useMemo(() => { const m = new Map<string, number>(); inRange.forEach(i => i.countries.forEach(c => m.set(c, (m.get(c) || 0) + 1))); return [...m.entries()].sort((a, b) => b[1] - a[1]); }, [inRange]);

  // tijdlijn: laatste 24 maanden, gestapeld op ernst (altijd over alle incidenten, zodat je de groei ziet)
  const months = useMemo(() => { const out: { key: string; c: number; m: number; s: number }[] = []; const d = new Date(); d.setDate(1);
    for (let k = 23; k >= 0; k--) { const x = new Date(d.getFullYear(), d.getMonth() - k, 1); out.push({ key: `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`, c: 0, m: 0, s: 0 }); }
    const idx = new Map(out.map((o, i) => [o.key, i])); all.forEach(i => { const j = idx.get(i.date.slice(0, 7)); if (j === undefined) return; if (i.severity === 'critical') out[j].c++; else if (i.severity === 'medium') out[j].m++; else out[j].s++; }); return out; }, [all]);
  const maxMonth = Math.max(1, ...months.map(m => m.c + m.m + m.s));

  const points: MapPoint[] = useMemo(() => list.filter(i => i.lat != null && i.lon != null).slice(0, 400).map(i => ({ id: i.id, lat: i.lat as number, lon: i.lon as number, color: SEV_COLOR[i.severity], big: i.severity === 'critical', approx: i.coordApprox, label: `${i.date} · ${i.title.slice(0, 70)}` })), [list]);
  const toggle = <T,>(set: Set<T>, v: T, fn: (s: Set<T>) => void) => { const n = new Set(set); if (n.has(v)) n.delete(v); else n.add(v); fn(n); };
  const count = (s: Sev) => inRange.filter(i => i.severity === s).length;
  const last30 = all.filter(i => now - new Date(i.date).getTime() < 30 * 86400000).length;
  const prev30 = all.filter(i => { const a = now - new Date(i.date).getTime(); return a >= 30 * 86400000 && a < 60 * 86400000; }).length;
  const chip = (on: boolean) => `text-[11px] font-mono uppercase tracking-[0.12em] px-2.5 py-1.5 border transition-colors ${on ? 'text-[#050505] bg-[#e8760a] border-[#e8760a]' : 'text-[#aaa] border-[#222] hover:border-[#e8760a] hover:text-[#e8760a]'}`;

  useEffect(() => { if (picked) document.getElementById(`inc-${picked}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, [picked]);

  return (
    <div className="min-h-screen bg-[#050505] text-[#ccc]">
      <header className="sticky top-0 z-40 bg-[#080808]/95 backdrop-blur border-b border-[#1a1a1a] flex items-center gap-4 px-5 py-4">
        <a href="/" title="Back to dashboard" className="flex items-center gap-2.5"><span className="w-2 h-2 rounded-full bg-[#e8760a]" /><span className="text-sm font-bold tracking-[0.15em] uppercase text-[#e8760a]">ARGUS</span></a>
        <span className="text-[11px] font-mono text-[#888] uppercase tracking-[0.2em]">Focus</span>
        <a href="/" title="Back to dashboard" className="ml-auto text-[11px] font-mono text-[#bbb] hover:text-[#e8760a] uppercase tracking-[0.15em] border border-[#222] px-3 py-1.5">‹ Dashboard</a>
      </header>

      <div className="max-w-[1500px] mx-auto px-6">
        <section className="py-9 border-b border-[#1a1a1a]">
          <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#e8760a]">Focus · one pattern, many countries</div>
          <h1 className="text-[40px] leading-tight text-white mt-2" style={sans}>Hybrid Europe</h1>
          <p className="mt-3 max-w-3xl text-[16px] leading-relaxed text-[#bbb]" style={sans}>Below the threshold of war: drones over airports and bases, fires and devices at substations, cut cables, jammed GPS, cyberattacks. Each one is small. Together they form a pattern. This page lists every incident with its source and how serious it was. 2022–2025 comes from the <i>Russian Operations Against Europe Dataset</i> (Bart Schuurman, Leiden University, CC BY 4.0); from 2026 ARGUS detects incidents itself in the news feeds it reads, with the reporting outlets linked per incident.</p>
          <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-px bg-[#1a1a1a] border border-[#1a1a1a]">
            {[['Incidents tracked', String(all.length), 'since 2022'], ['Last 30 days', String(last30), prev30 ? `${last30 >= prev30 ? '+' : ''}${last30 - prev30} vs the 30 days before` : ''], ['Critical', String(count('critical')), 'in this period'], ['Medium', String(count('medium')), 'in this period'], ['Small', String(count('small')), 'in this period']].map(([k, v, sub], n) => (
              <div key={k} className="bg-[#080808] px-4 py-4"><div className="text-[30px] font-mono font-light tabular-nums" style={{ color: n === 2 ? SEV_COLOR.critical : n === 3 ? SEV_COLOR.medium : '#fff' }}>{v}</div><div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#888] mt-1">{k}</div><div className="text-[10px] font-mono text-[#555] mt-0.5">{sub}</div></div>
            ))}
          </div>
        </section>

        <section className="py-7 border-b border-[#1a1a1a]">
          <div className="flex items-baseline gap-3 mb-3"><h2 className="text-[11px] font-mono font-bold text-[#ddd] uppercase tracking-[0.22em]">Incidents per month · last two years</h2><span className="text-[10px] font-mono text-[#555]">stacked by severity</span></div>
          <div className="flex items-end gap-[3px] h-32">
            {months.map(m => { const t = m.c + m.m + m.s; return (
              <div key={m.key} title={`${m.key}: ${t} incidents (${m.c} critical)`} className="flex-1 flex flex-col justify-end h-full">
                <div style={{ height: `${(m.s / maxMonth) * 100}%`, background: SEV_COLOR.small }} /><div style={{ height: `${(m.m / maxMonth) * 100}%`, background: SEV_COLOR.medium }} /><div style={{ height: `${(m.c / maxMonth) * 100}%`, background: SEV_COLOR.critical }} />
              </div>); })}
          </div>
          <div className="flex justify-between text-[9px] font-mono text-[#555] mt-1.5"><span>{months[0]?.key}</span><span>{months[11]?.key}</span><span>{months[23]?.key}</span></div>
        </section>

        <section className="py-6 border-b border-[#1a1a1a] flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="flex gap-1">{RANGES.map(([l, v]) => <button key={l} title="Period" onClick={() => setRange(v)} className={chip(range === v)}>{l}</button>)}</div>
          <div className="flex gap-1 flex-wrap">{TYPES.map(([k, l]) => <button key={k} title="Incident type" onClick={() => toggle(types, k, setTypes)} className={chip(types.has(k))}>{l}</button>)}</div>
          <div className="flex gap-1">{(['critical', 'medium', 'small'] as Sev[]).map(s => <button key={s} title="Severity" onClick={() => toggle(sevs, s, setSevs)} className={chip(sevs.has(s))}><span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: SEV_COLOR[s] }} />{s}</button>)}</div>
          <select title="Country" value={country} onChange={e => setCountry(e.target.value)} className="bg-[#080808] border border-[#222] text-[11px] font-mono text-[#ccc] uppercase tracking-[0.1em] px-2 py-1.5"><option value="">All countries</option>{countries.map(([c, n]) => <option key={c} value={c}>{c} · {n}</option>)}</select>
          <select title="Attribution" value={attr} onChange={e => setAttr(e.target.value)} className="bg-[#080808] border border-[#222] text-[11px] font-mono text-[#ccc] uppercase tracking-[0.1em] px-2 py-1.5"><option value="">Any attribution</option><option value="confirmed">Officially attributed</option><option value="suspected">Suspected</option><option value="unknown">Unattributed</option></select>
          <button title="The rules" onClick={() => setShowRules(v => !v)} className="ml-auto text-[11px] font-mono text-[#e8760a] border-b border-[#b85a08]">how severity is assigned {showRules ? '▴' : '▾'}</button>
        </section>
        {showRules && (
          <section className="py-5 border-b border-[#1a1a1a] grid md:grid-cols-3 gap-5 text-[13px] leading-relaxed text-[#bbb]" style={sans}>
            <div><b className="font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: SEV_COLOR.critical }}>Critical</b><br />People hurt or killed, a fire or explosion, or vital infrastructure actually attacked: power, pipelines, cables, rail, water.</div>
            <div><b className="font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: SEV_COLOR.medium }}>Medium</b><br />A disruption or violation without casualties: an airport closed, airspace violated, a drone shot down or crashed, debris found, jamming, a cyberattack, drones over a sensitive site.</div>
            <div><b className="font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: SEV_COLOR.small }}>Small</b><br />A sighting, a find or a foiled plot without consequence. For 2022–2025 the label follows the dataset&apos;s own category (carried out / attempted or prepared / reconnaissance); for news-detected incidents it follows fixed rules on the headline, not judgement. Attribution is always the source&apos;s, never ours; many drone reports turn out to be hobby drones.</div>
          </section>
        )}

        <section className="py-7 grid lg:grid-cols-[1fr_1.15fr] gap-6">
          <div className="h-[70vh] min-h-[460px] border border-[#1a1a1a] sticky top-24 self-start w-full"><FocusMap points={points} onPick={setPicked} /></div>
          <div>
            <div className="flex items-baseline gap-3 mb-3"><h2 className="text-[11px] font-mono font-bold text-[#ddd] uppercase tracking-[0.22em]">{list.length} incidents</h2><span className="text-[10px] font-mono text-[#555]">newest first · dashed dots on the map are placed at the country, not the exact spot</span></div>
            <div className="border border-[#1a1a1a] divide-y divide-[#141414]">
              {list.slice(0, 250).map(i => (
                <div key={i.id} id={`inc-${i.id}`} className={`grid grid-cols-[5.6rem_1fr] gap-3 px-4 py-3.5 ${picked === i.id ? 'bg-[#e8760a]/[0.07]' : 'bg-[#080808]'}`} style={{ boxShadow: `inset 3px 0 0 ${SEV_COLOR[i.severity]}` }}>
                  <div className="text-[12px] font-mono tabular-nums text-[#ddd]">{i.date}{i.dateApprox && <span title="Date published" className="text-[#555]"> ~</span>}<div title={i.severityWhy} className="mt-1.5 text-[9px] uppercase tracking-[0.18em]" style={{ color: SEV_COLOR[i.severity] }}>{i.severity}</div></div>
                  <div className="min-w-0">
                    <a href={i.sources[0]?.url} target="_blank" rel="noopener noreferrer" title="Open source" className="block text-[15px] leading-snug text-[#f0f0f0] hover:text-[#e8760a]" style={sans}>{i.title}</a>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] font-mono text-[#888]">
                      <span className="text-[#bbb]">{i.countries.join(' · ') || '—'}{i.place ? ` · ${i.place}` : ''}</span>
                      <span title="Incident type" className="px-1.5 border border-[#222] uppercase">{TYPES.find(t => t[0] === i.type)?.[1] || i.type}</span>
                      <span title="Attribution" style={{ color: i.attribution === 'confirmed' ? '#f87171' : i.attribution === 'suspected' ? '#fbbf24' : '#777' }}>{ATTR_LABEL[i.attribution]}{i.actor && i.attribution !== 'unknown' ? ` · ${i.actor}` : ''}</span>
                      {i.campaign && <span title="Campaign" className="text-[#777]">{i.campaign}</span>}
                      {i.sources.map((s, k) => <a key={k} href={s.url} target="_blank" rel="noopener noreferrer" title="Open source" className="text-[#e8760a] border-b border-[#b85a08]/60 hover:text-white">{s.name}</a>)}
                    </div>
                  </div>
                </div>
              ))}
              {list.length === 0 && <div className="bg-[#080808] text-[11px] font-mono text-[#555] py-14 text-center uppercase tracking-[0.2em]">{data ? 'No incidents match these filters' : 'Loading...'}</div>}
            </div>
            {list.length > 250 && <div className="text-[10px] font-mono text-[#555] mt-2">Showing the newest 250 of {list.length}. Narrow the filters to see older ones.</div>}
          </div>
        </section>

        <footer className="py-8 border-t border-[#1a1a1a] text-[11px] font-mono text-[#666] leading-relaxed">
          Data: {(data?.credits || []).map((c, k) => <span key={c.url}>{k > 0 && ' · '}<a href={c.url} target="_blank" rel="noopener noreferrer" className="text-[#aaa] hover:text-[#e8760a] border-b border-[#333]">{c.name}</a></span>)}. ARGUS shows headline, date, place and a link; the research and the wording belong to those projects and the outlets they cite. Updated {data?.generatedAt ? new Date(data.generatedAt).toUTCString() : '—'}.
        </footer>
      </div>
    </div>
  );
}
