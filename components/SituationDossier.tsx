// Situatie-dossier, krantopmaak (6 okt 2026, Leander: "in één oogopslag; leest als een krant"). Hiërarchie:
//  masthead-strook (automatisch, één dunne regel: pols, windstreken, corroboratie) → LEDE (de stand, groot, smalle
//  kolom) → twee kolommen: links de tekst (grootboek, tijdlijn, wie-zegt-wat), rechts de rail (cijfers, ankerlijn,
//  kaart, spelden). Drie tekstmaten: lede 21 / tekst 13 / meta 10. Lijnen in plaats van kaders.
// Twee lagen blijven zichtbaar: LIVE (ververst met de feeds) en REVIEWED (extractie + citaatcheck).
import type { Dossier } from '@/lib/dossiers';
import type { NewsItem, Situation } from '@/lib/types';
import { KIND, STATUS, EVENT } from '@/lib/dossier-kinds';
import { VIEWS, VIEW_COLOR, VIEW_LABEL, viewOf, isStateMedia, View } from '@/lib/viewpoints';
import { extractLocation, extractAllLocations } from '@/lib/geo-extract';
import DossierMap from '@/components/DossierMap';
import type { MapPoint } from '@/components/FocusMap';

const sans = { fontFamily: 'var(--font-geist-sans), sans-serif' };
const fmt = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' }) + ' CET';
const ago = (iso: string) => { const m = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000)); return m < 60 ? `${m} min ago` : m < 1440 ? `${Math.floor(m / 60)} h ago` : `${Math.floor(m / 1440)} d ago`; };
const Tag = ({ auto }: { auto?: boolean }) => <span className={`text-[8px] font-mono uppercase tracking-[0.15em] px-1 py-px border ${auto ? 'text-[#4ade80]/80 border-[#1f4d2e]' : 'text-[#e8760a]/80 border-[#5a3a0a]'}`}>{auto ? 'live' : 'reviewed'}</span>;
const H = ({ children, auto, right }: { children: React.ReactNode; auto?: boolean; right?: React.ReactNode }) => (
  <div className="flex items-baseline gap-2.5 border-b border-[#2a2a2a] pb-1.5 mb-3"><h2 className="text-[10px] font-mono font-bold text-[#eee] uppercase tracking-[0.24em]">{children}</h2><Tag auto={auto} />{right && <span className="ml-auto text-[9px] font-mono text-[#555]">{right}</span>}</div>
);
const Src = ({ s }: { s: { name: string; url: string; date?: string } }) => (
  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-[#8ab4f8] hover:text-[#e8760a]">{s.name}</a>
);

export default function SituationDossier({ d, s, items }: { d: Dossier | null; s: Situation; items: NewsItem[] }) {
  const now = Date.now();
  const spark = s.metadata.sparkline || []; const maxSpark = Math.max(1, ...spark);
  const views = new Map<View, number>(); let state = 0;
  items.forEach(i => { const v = viewOf(i); views.set(v, (views.get(v) || 0) + 1); if (isStateMedia(i.source)) state++; });
  const viewRows = VIEWS.map(v => [v, views.get(v) || 0] as [View, number]).filter(x => x[1] > 0);
  const outlets = new Set(items.map(i => i.source)).size;
  const last24 = items.filter(i => now - new Date(i.pubDate).getTime() < 86400000).length;
  // plaatsen uit de koppen (gazetteer-treffers buiten de bbox tellen niet: "Rubio" is een stadje in Venezuela)
  const mentions = new Map<string, { lat: number; lon: number; n: number; name: string }>();
  const [s0, w0, n0, e0] = s.bbox; const pad = 12;
  items.forEach(i => {
    const g = extractLocation(i.title); if (!g) return;
    const curated = extractAllLocations(i.title).some(c => c.name === g.name);
    const inside = g.lat >= s0 - pad && g.lat <= n0 + pad && g.lng >= w0 - pad && g.lng <= e0 + pad;
    if (!curated && !inside) return;
    const m = mentions.get(g.name); if (m) m.n++; else mentions.set(g.name, { lat: g.lat, lon: g.lng, n: 1, name: g.name });
  });
  const mentionList = [...mentions.values()].sort((a, b) => b.n - a.n);
  const autoPoints: MapPoint[] = mentionList.slice(0, 40).map(m => ({ id: `m-${m.name}`, lat: m.lat, lon: m.lon, color: '#60a5fa', big: m.n >= 3, approx: true, label: `${m.name} · ${m.n} headline${m.n === 1 ? '' : 's'}` }));
  const pinPoints: MapPoint[] = (d?.places || []).map((p, i) => ({ id: `p-${i}`, lat: p.lat, lon: p.lon, color: KIND[p.kind].color, big: p.kind === 'event' || p.kind === 'site', approx: false, label: `${p.name} — ${p.role}` }));
  const byView = (v: View) => items.filter(i => viewOf(i) === v).slice(0, 3);
  const anchors = d?.anchors?.length ? d.anchors : [{ label: 'Reuters', match: '^Reuters' }, { label: 'AP', match: '^AP News' }, { label: 'BBC', match: '^BBC' }, { label: 'AFP', match: 'AFP|France 24' }];
  const anchorRows = anchors.map(a => { const re = new RegExp(a.match, 'i'); const hits = items.filter(i => re.test(i.source)); return { ...a, hits, latest: hits[0] }; });
  const figures = d?.figures || []; const claims = d?.claims || []; const timeline = d?.timeline || []; const places = d?.places || [];

  return (
    <section className="mt-5">
      {/* ── masthead-strook: automatisch, één regel ─────────────────────────────────── */}
      <div className="border-y border-[#2a2a2a] py-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[10px] font-mono text-[#888]">
        <span className="flex items-center gap-2"><span className="flex items-end gap-[1px] h-4 w-20">{spark.map((v, k) => <span key={k} className="flex-1" style={{ height: `${Math.max(8, (v / maxSpark) * 100)}%`, background: k === spark.length - 1 ? '#e8760a' : '#333' }} />)}</span><b className="text-[#ddd]">{s.metadata.velocity1h}</b> h · <b className="text-[#ddd]">{last24}</b> 24 h · <b className="text-[#ddd]">{s.metadata.articleCount}</b> total</span>
        <span className="flex items-center gap-2"><span className="flex h-1.5 w-24 overflow-hidden bg-[#141414]">{viewRows.map(([v, n]) => <span key={v} title={`${VIEW_LABEL[v]}: ${n}`} style={{ width: `${(n / items.length) * 100}%`, background: VIEW_COLOR[v] }} />)}</span>{viewRows.slice(0, 4).map(([v, n]) => <span key={v}><span style={{ color: VIEW_COLOR[v] }}>{VIEW_LABEL[v]}</span> {n}</span>)}</span>
        <span>{outlets} outlets · {state} state · corroboration <b className="text-[#ddd]">{s.metadata.corroboration}</b></span>
        <span className="ml-auto flex items-center gap-2">newest <b className="text-[#ddd]">{s.latestPubDate ? ago(s.latestPubDate) : '—'}</b><Tag auto /></span>
      </div>

      <div className="mt-6 grid lg:grid-cols-[minmax(0,1fr)_300px] gap-x-10 gap-y-7">
        {/* ── hoofdkolom ───────────────────────────────────────────────────────────────── */}
        <div className="min-w-0">
          {/* ── lede: de stand ─────────────────────────────────────────────────────────────── */}
      {d && d.stand && (
        <div className="max-w-[62ch] mb-8">
          <div className="w-10 h-[3px] bg-[#e8760a] mb-3" />
          <p className="text-[21px] leading-[1.45] text-[#f2f2f2]" style={sans}>{d.stand}</p>
          <div className="mt-2.5 flex items-center gap-2.5 text-[10px] font-mono text-[#666]"><span>Dossier updated {fmt(d.updatedAt)}</span><Tag /></div>
        </div>
      )}

          {claims.length > 0 && (
            <div>
              <H right="status is ARGUS' reading of the sources">Claim ledger</H>
              <div className="divide-y divide-[#1a1a1a]">
                {claims.map((c, k) => (
                  <div key={k} className="py-2.5 grid grid-cols-[5.4rem_1fr] gap-3">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-[0.14em] pt-[3px]" style={{ color: STATUS[c.status].color }}>{STATUS[c.status].label}</span>
                    <div className="min-w-0">
                      <div className={`text-[13.5px] leading-snug ${c.status === 'debunked' ? 'text-[#888]' : 'text-[#e8e8e8]'}`} style={sans}>{c.text}</div>
                      <div className="mt-0.5 text-[11px] leading-snug text-[#8a8a8a]" style={sans}>{c.by}{c.sources.length > 0 && <span className="font-mono text-[10px]"> — {c.sources.map((x, j) => <span key={j}>{j > 0 && ', '}<Src s={x} />{x.date && <span className="text-[#555]"> {x.date}</span>}</span>)}</span>}</div>
                    </div>
                  </div>))}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 text-[9px] font-mono text-[#555]">{(Object.keys(STATUS) as (keyof typeof STATUS)[]).map(k => <span key={k}><span style={{ color: STATUS[k].color }}>{STATUS[k].label}</span> {STATUS[k].hint.toLowerCase()}</span>)}</div>
            </div>
          )}

          {timeline.length > 0 && (
            <div className="mt-8">
              <H right={<span className="flex gap-2.5">{(Object.keys(EVENT) as (keyof typeof EVENT)[]).map(k => <span key={k} style={{ color: EVENT[k].color }}>{EVENT[k].label}</span>)}</span>}>Timeline</H>
              <ol className="relative border-l border-[#222] ml-[4.6rem]">
                {timeline.map((e, k) => (
                  <li key={k} className="relative pl-4 py-1.5">
                    <span className="absolute -left-[4px] top-[11px] w-[7px] h-[7px] rounded-full" style={{ background: EVENT[e.kind].color }} />
                    <span className="absolute -left-[4.6rem] top-[7px] w-[4rem] text-right text-[10px] font-mono tabular-nums text-[#aaa]">{e.date}</span>
                    <div className="text-[12.5px] leading-snug text-[#ddd]" style={sans}>{e.text} <span className="font-mono text-[9px] text-[#666]">{e.sources.map((x, j) => <span key={j}>{j > 0 && ', '}<Src s={x} /></span>)}</span></div>
                  </li>))}
              </ol>
            </div>
          )}

          {viewRows.length > 1 && (
            <div className="mt-8">
              <H auto right="newest three per viewpoint">Who says what</H>
              <div className="grid md:grid-cols-3 gap-x-5 gap-y-4">{viewRows.slice(0, 6).map(([v]) => (
                <div key={v}>
                  <div className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] mb-1" style={{ color: VIEW_COLOR[v] }}>{VIEW_LABEL[v]}</div>
                  <ul className="space-y-1.5">{byView(v).map(i => <li key={i.id}><a href={i.link} target="_blank" rel="noopener noreferrer" className="text-[12px] leading-snug text-[#ccc] hover:text-[#e8760a]" style={sans}>{i.title}</a><div className="text-[9px] font-mono text-[#666]">{i.source}{isStateMedia(i.source) ? ' · state' : ''} · {ago(i.pubDate)}</div></li>)}</ul>
                </div>))}</div>
            </div>
          )}

          {d?.background && (
            <details className="mt-8 group">
              <summary className="cursor-pointer list-none flex items-baseline gap-2.5 border-b border-[#2a2a2a] pb-1.5"><span className="text-[10px] font-mono font-bold text-[#eee] uppercase tracking-[0.24em]">{d.background.title}</span><span className="text-[9px] font-mono text-[#555]">background · open</span><span className="ml-auto text-[#555] group-open:rotate-180 transition-transform text-[10px]">▾</span></summary>
              {d.background.note && <p className="mt-3 text-[10px] font-mono text-[#f59e0b]">{d.background.note}</p>}
              <ul className="mt-2 list-disc pl-5 space-y-1">{d.background.bullets.map((b, k) => <li key={k} className="text-[12.5px] leading-snug text-[#bbb]" style={sans}>{b}</li>)}</ul>
              {d.background.source && <div className="mt-2 text-[9px] font-mono text-[#666]">Source: <Src s={d.background.source} /></div>}
            </details>
          )}
          {d && (d.sources || []).length > 0 && (
            <details className="mt-5 group">
              <summary className="cursor-pointer list-none flex items-baseline gap-2.5 border-b border-[#2a2a2a] pb-1.5"><span className="text-[10px] font-mono font-bold text-[#eee] uppercase tracking-[0.24em]">Sources</span><span className="text-[9px] font-mono text-[#555]">{d.sources.length} · open</span><span className="ml-auto text-[#555] group-open:rotate-180 transition-transform text-[10px]">▾</span></summary>
              <table className="w-full text-[11.5px] mt-2"><tbody>{d.sources.map((x, k) => <tr key={k} className="border-b border-[#141414] align-top"><td className="py-1.5 pr-3 text-[#ccc] font-mono text-[10px] whitespace-nowrap">{x.who}</td><td className="py-1.5 pr-3 text-[#999]" style={sans}>{x.what} <a href={x.url} target="_blank" rel="noopener noreferrer" className="text-[#8ab4f8] hover:text-[#e8760a] font-mono text-[9px]">link</a></td><td className="py-1.5 text-right font-mono text-[10px] text-[#777] whitespace-nowrap">{x.date}</td></tr>)}</tbody></table>
            </details>
          )}
          {d?.disclaimer && <p className="mt-5 text-[10px] font-mono text-[#555] leading-relaxed">{d.disclaimer}</p>}
        </div>

        {/* ── rail ─────────────────────────────────────────────────────────────────────── */}
        <aside className="min-w-0 space-y-7">
          {figures.length > 0 && (
            <div>
              <H>By the numbers</H>
              <div className="divide-y divide-[#1a1a1a]">{figures.map(f => (
                <a key={f.label} href={f.src.url} target="_blank" rel="noopener noreferrer" className="block py-2 group">
                  <div className="text-[22px] font-mono font-light tabular-nums leading-none" style={{ color: f.color || '#fff' }}>{f.value}</div>
                  <div className="mt-1 text-[10px] font-mono text-[#aaa] uppercase tracking-[0.1em]">{f.label}</div>
                  <div className="text-[9px] font-mono text-[#555] group-hover:text-[#e8760a]">{f.src.name}{f.src.date ? ` · ${f.src.date}` : ''}</div>
                </a>))}</div>
            </div>
          )}
          <div>
            <H auto>Anchor line</H>
            <div className="space-y-2.5">{anchorRows.map(a => (
              <div key={a.label}>
                <div className="text-[9px] font-mono uppercase tracking-[0.16em]"><span className="font-bold text-[#8ab4f8]">{a.label}</span><span className="text-[#555]"> · {a.hits.length}{a.latest ? ` · ${ago(a.latest.pubDate)}` : ''}</span></div>
                {a.latest ? <a href={a.latest.link} target="_blank" rel="noopener noreferrer" className="block text-[12px] leading-snug text-[#ddd] hover:text-[#e8760a]" style={sans}>{a.latest.title.replace(/\s+-\s+(Reuters|AP News|BBC|AP)$/i, '')}</a> : <div className="text-[10px] font-mono text-[#444]">nothing yet</div>}
              </div>))}</div>
            <div className="mt-1.5 text-[9px] font-mono text-[#444]">newest headline per anchor source — a rule, not a judgement</div>
          </div>
          {(autoPoints.length > 0 || pinPoints.length > 0) && (
            <div>
              <H auto={places.length === 0}>On the map</H>
              <div className="h-[230px] border border-[#1a1a1a]"><DossierMap points={[...autoPoints, ...pinPoints]} center={d?.map?.center || [s.center.lat, s.center.lng]} zoom={d?.map?.zoom || s.zoom} /></div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] font-mono text-[#666]"><span><span className="inline-block w-2 h-2 rounded-full mr-1 align-middle border border-[#60a5fa] bg-[#60a5fa]/30" />headlines, size = mentions</span>{[...new Set(places.map(p => p.kind))].map(k => <span key={k}><span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ background: KIND[k].color }} />{KIND[k].label}</span>)}</div>
              {places.length > 0 && <div className="mt-2 space-y-1.5">{places.map(p => <div key={p.name} className="grid grid-cols-[8px_1fr] gap-2"><span className="w-2 h-2 rounded-full mt-1" style={{ background: KIND[p.kind].color }} /><div className="text-[11px] leading-snug text-[#ccc]" style={sans}>{p.name} <span className="text-[#666]">· {p.where}</span><div className="text-[10px] text-[#888]">{p.role}</div></div></div>)}</div>}
              {mentionList.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{mentionList.slice(0, 10).map(m => <span key={m.name} className="text-[9px] font-mono border border-[#222] px-1.5 py-0.5 text-[#aaa]">{m.name} <b className="text-[#60a5fa]">{m.n}</b></span>)}</div>}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
