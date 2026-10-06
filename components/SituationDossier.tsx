// Situatie-tracker (6 okt 2026, Leander: "wat is belangrijk, wat is de stand, wat is nieuw — visueel; en liefst
// zelfverversend"). Twee lagen in ARGUS-idioom:
//  AUTOMATISCH (elke situatie, ververst met de feeds): pols (24 u per uur), windstreken van de bronnen, plaatsen
//    uit de koppen op de kaart, kopkolommen per windstreek.
//  REDACTIONEEL (alleen als data/dossiers/<slug>.json bestaat): de stand in zinnen, kerncijfers met bron,
//    claim-grootboek met status per bewering, spelden op gebouwniveau, tijdlijn met wie-zegt-wat, achtergrond, bronnen.
// Servercomponent; alleen de kaart is client-side.
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
const Label = ({ children, auto, right }: { children: React.ReactNode; auto?: boolean; right?: React.ReactNode }) => (
  <div className="flex items-baseline gap-3 mb-3 flex-wrap">
    <h2 className="text-[11px] font-mono font-bold text-[#ddd] uppercase tracking-[0.22em]">{children}</h2>
    <span className={`text-[9px] font-mono uppercase tracking-[0.15em] px-1.5 py-px border ${auto ? 'text-[#4ade80] border-[#1f4d2e]' : 'text-[#e8760a] border-[#5a3a0a]'}`}>{auto ? 'automatic · live' : 'reviewed · quote-checked'}</span>
    {right && <span className="ml-auto text-[10px] font-mono text-[#555]">{right}</span>}
  </div>
);
const Src = ({ s }: { s: { name: string; url: string; date?: string } }) => (
  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-[#8ab4f8] hover:text-[#e8760a] border-b border-[#2a3a5a]">{s.name}</a>
);

export default function SituationDossier({ d, s, items }: { d: Dossier | null; s: Situation; items: NewsItem[] }) {
  // --- automatische laag -------------------------------------------------------------------------------------
  const now = Date.now();
  const spark = s.metadata.sparkline || [];
  const maxSpark = Math.max(1, ...spark);
  const views = new Map<View, number>(); let state = 0;
  items.forEach(i => { const v = viewOf(i); views.set(v, (views.get(v) || 0) + 1); if (isStateMedia(i.source)) state++; });
  const viewRows = VIEWS.map(v => [v, views.get(v) || 0] as [View, number]).filter(x => x[1] > 0);
  const outlets = new Set(items.map(i => i.source)).size;
  // plaatsen uit de koppen: de meest specifieke plaats per kop, geteld
  const mentions = new Map<string, { lat: number; lon: number; n: number; name: string }>();
  // Gazetteer-treffers (plaatsen ≥ 5.000 inwoners op hoofdletterwoorden) geven valse positieven op achternamen —
  // "Rubio" is ook een stadje in Venezuela. Daarom: een treffer buiten de ruim genomen situatie-bbox telt alleen mee
  // als hij uit de gecureerde landen-/hoofdstedenlijst komt.
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
  const last24 = items.filter(i => now - new Date(i.pubDate).getTime() < 86400000).length;
  // ankerbronnen: per dossier instelbaar (WHO, Reuters, AP); zonder dossier de wires. Hun nieuwste kop = de laatste
  // stand volgens die bron — een regel, geen weging. Daarom staat deze band boven het grootboek.
  const anchors = d?.anchors?.length ? d.anchors : [{ label: 'Reuters', match: '^Reuters' }, { label: 'AP', match: '^AP News' }, { label: 'BBC', match: '^BBC' }, { label: 'AFP', match: 'AFP|France 24' }];
  const anchorRows = anchors.map(a => { const re = new RegExp(a.match, 'i'); const hits = items.filter(i => re.test(i.source)); return { ...a, hits, latest: hits[0] }; });
  const anyAnchor = anchorRows.some(a => a.hits.length > 0);

  return (
    <section className="mt-7">
      {/* ── pols: automatisch, elke situatie ───────────────────────────────────────────── */}
      <div className="border border-[#1a1a1a] bg-[#080808] grid md:grid-cols-[1.1fr_1fr_0.9fr] divide-y md:divide-y-0 md:divide-x divide-[#1a1a1a]">
        <div className="px-5 py-4">
          <Label auto right={`newest ${s.latestPubDate ? ago(s.latestPubDate) : '—'}`}>Pulse · 24 h</Label>
          <div className="flex items-end gap-[2px] h-14">{spark.map((v, k) => <div key={k} title={`${v} reports`} className="flex-1" style={{ height: `${Math.max(4, (v / maxSpark) * 100)}%`, background: k === spark.length - 1 ? '#e8760a' : '#2a2a2a' }} />)}</div>
          <div className="mt-2 flex gap-4 text-[10px] font-mono text-[#888] uppercase tracking-[0.15em]"><span><b className="text-[#eee] text-[14px] normal-case tracking-normal">{s.metadata.velocity1h}</b> last hour</span><span><b className="text-[#eee] text-[14px] normal-case tracking-normal">{last24}</b> 24 h</span><span><b className="text-[#eee] text-[14px] normal-case tracking-normal">{s.metadata.articleCount}</b> total</span></div>
        </div>
        <div className="px-5 py-4">
          <Label auto right={`${outlets} outlets · ${state} state media`}>Who is reporting</Label>
          <div className="flex h-2.5 w-full overflow-hidden bg-[#141414]">{viewRows.map(([v, n]) => <div key={v} title={`${VIEW_LABEL[v]}: ${n}`} style={{ width: `${(n / items.length) * 100}%`, background: VIEW_COLOR[v] }} />)}</div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono text-[#888]">{viewRows.map(([v, n]) => <span key={v}><span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" style={{ background: VIEW_COLOR[v] }} />{VIEW_LABEL[v]} <b className="text-[#ddd]">{n}</b></span>)}</div>
          <div className="mt-2 text-[10px] font-mono text-[#666]">Corroboration <b className="text-[#ddd]">{s.metadata.corroboration}</b> · tier 1 <b className="text-[#ddd]">{s.metadata.sourceTierCounts.t1}</b> · tier 2 <b className="text-[#ddd]">{s.metadata.sourceTierCounts.t2}</b> · tier 3 <b className="text-[#ddd]">{s.metadata.sourceTierCounts.t3}</b></div>
        </div>
        <div className="px-5 py-4">
          <Label auto>Named most</Label>
          <ol className="space-y-1">{mentionList.slice(0, 5).map(m => <li key={m.name} className="flex items-center gap-2 text-[11px] font-mono"><span className="text-[#ddd] truncate">{m.name}</span><span className="flex-1 h-px bg-[#1a1a1a]" /><span className="text-[#888] tabular-nums">{m.n}</span></li>)}{mentionList.length === 0 && <li className="text-[10px] font-mono text-[#555]">no places recognised in the headlines</li>}</ol>
        </div>
      </div>

      {/* ── ankerlijn: automatisch — de laatste kop van elke ankerbron ──────────────── */}
      <div className="mt-3 border border-[#1a1a1a] bg-[#080808] px-5 py-4" style={{ boxShadow: 'inset 3px 0 0 #60a5fa' }}>
        <Label auto right="the newest headline from each anchor source is the latest word from that source — a rule, not a judgement">Anchor line · {anchors.map(a => a.label).join(' · ')}</Label>
        <div className="grid md:grid-cols-3 gap-x-6 gap-y-3">
          {anchorRows.map(a => (
            <div key={a.label} className="min-w-0">
              <div className="flex items-baseline gap-2 text-[10px] font-mono uppercase tracking-[0.18em]"><span className="font-bold text-[#8ab4f8]">{a.label}</span><span className="text-[#555]">{a.hits.length} report{a.hits.length === 1 ? '' : 's'}{a.latest ? ` · ${ago(a.latest.pubDate)}` : ''}</span></div>
              {a.latest ? <a href={a.latest.link} target="_blank" rel="noopener noreferrer" className="block mt-1 text-[14px] leading-snug text-[#eee] hover:text-[#e8760a]" style={sans}>{a.latest.title.replace(/\s+-\s+(Reuters|AP News|BBC|AP)$/i, '')}</a> : <div className="mt-1 text-[12px] font-mono text-[#555]">nothing from this source yet</div>}
              {a.latest && <div className="mt-0.5 text-[9px] font-mono text-[#666]">{a.latest.source}</div>}
            </div>))}
        </div>
        {!anyAnchor && <div className="text-[11px] font-mono text-[#555]">No anchor source has reported on this situation yet.</div>}
      </div>

      {d && (<>
        {/* ── de stand + kerncijfers: redactioneel ──────────────────────────────────── */}
        <div className="mt-3 border border-[#1a1a1a] bg-[#080808] px-5 py-4" style={{ boxShadow: 'inset 3px 0 0 #e8760a' }}>
          <Label right={`dossier updated ${fmt(d.updatedAt)}`}>The stand</Label>
          <p className="text-[16px] leading-relaxed text-[#e6e6e6] max-w-4xl" style={sans}>{d.stand}</p>
          <div className="mt-3 flex flex-wrap gap-2">{d.figures.map(f => (
            <a key={f.label} href={f.src.url} target="_blank" rel="noopener noreferrer" title={`${f.src.name}${f.src.date ? ' · ' + f.src.date : ''}`} className="group flex items-baseline gap-2 border border-[#222] hover:border-[#e8760a] px-3 py-1.5">
              <span className="text-[20px] font-mono font-light tabular-nums leading-none" style={{ color: f.color || '#fff' }}>{f.value}</span>
              <span className="text-[10px] font-mono text-[#999] uppercase tracking-[0.12em]">{f.label}</span>
              <span className="text-[9px] font-mono text-[#555] group-hover:text-[#e8760a]">{f.src.name}{f.src.date ? ` · ${f.src.date}` : ''}</span>
            </a>))}</div>
        </div>

        {/* ── claim-grootboek ─────────────────────────────────────────────────────────── */}
        <div className="mt-3 border border-[#1a1a1a] bg-[#080808]">
          <div className="px-5 pt-4 pb-1"><Label right="one line per claim · status is ARGUS' reading of the sources, not a verdict">Claim ledger</Label></div>
          <div className="px-5 pb-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono text-[#777]">{(Object.keys(STATUS) as (keyof typeof STATUS)[]).map(k => <span key={k} title={STATUS[k].hint}><span className="inline-block w-2 h-2 mr-1.5 align-middle" style={{ background: STATUS[k].color }} />{STATUS[k].label} <span className="text-[#555]">— {STATUS[k].hint}</span></span>)}</div>
          <div className="divide-y divide-[#141414] border-t border-[#1a1a1a]">
            {d.claims.map((c, k) => (
              <div key={k} className="grid grid-cols-[6.2rem_1fr] gap-3 px-5 py-3" style={{ boxShadow: `inset 3px 0 0 ${STATUS[c.status].color}` }}>
                <div className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] pt-1" style={{ color: STATUS[c.status].color }}>{STATUS[c.status].label}</div>
                <div>
                  <div className={`text-[14px] leading-snug ${c.status === 'debunked' ? 'text-[#999]' : 'text-[#eee]'}`} style={sans}>{c.text}</div>
                  <div className="mt-1 text-[12px] leading-snug text-[#aaa]" style={sans}>{c.by}</div>
                  <div className="mt-1 text-[10px] font-mono text-[#666]">{c.sources.map((x, j) => <span key={j}>{j > 0 && ' · '}<Src s={x} />{x.date && <span className="text-[#555]"> {x.date}</span>}</span>)}</div>
                </div>
              </div>))}
          </div>
        </div>
      </>)}

      {/* ── kaart: automatisch (koppen) + redactioneel (spelden) ────────────────────────── */}
      {(autoPoints.length > 0 || pinPoints.length > 0) && (
        <div className="mt-3 border border-[#1a1a1a] bg-[#080808] grid lg:grid-cols-[1.2fr_1fr]">
          <div className="border-b lg:border-b-0 lg:border-r border-[#1a1a1a]">
            <div className="px-5 pt-4"><Label auto={!d}>On the map</Label></div>
            <div className="h-[360px]"><DossierMap points={[...autoPoints, ...pinPoints]} center={d?.map?.center || [s.center.lat, s.center.lng]} zoom={d?.map?.zoom || s.zoom} /></div>
            <div className="px-5 py-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono text-[#888]">
              <span><span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle border border-[#60a5fa] bg-[#60a5fa]/30" />places in the headlines, size = mentions (automatic)</span>
              {d && [...new Set(d.places.map(p => p.kind))].map(k => <span key={k}><span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" style={{ background: KIND[k].color }} />{KIND[k].label}</span>)}
            </div>
          </div>
          <div className="px-5 py-4">
            {d && d.places.length > 0 && (<>
              <Label>Pins</Label>
              <div className="space-y-2 mb-4">{d.places.map(p => <div key={p.name} className="grid grid-cols-[10px_1fr] gap-2.5"><span className="w-2 h-2 rounded-full mt-1.5" style={{ background: KIND[p.kind].color }} /><div className="text-[12px] leading-snug text-[#ddd]" style={sans}>{p.name} <span className="text-[#777]">· {p.where}</span><div className="text-[11px] text-[#999]">{p.role}</div></div></div>)}</div>
            </>)}
            <Label auto>In the headlines</Label>
            <div className="flex flex-wrap gap-1.5">{mentionList.slice(0, 12).map(m => <span key={m.name} className="text-[10px] font-mono border border-[#222] px-2 py-1 text-[#bbb]">{m.name} <b className="text-[#60a5fa]">{m.n}</b></span>)}{mentionList.length === 0 && <span className="text-[10px] font-mono text-[#555]">none recognised</span>}</div>
          </div>
        </div>
      )}

      {d && (
        /* ── tijdlijn: wie zegt wat, wanneer ─────────────────────────────────────────── */
        <div className="mt-3 border border-[#1a1a1a] bg-[#080808] px-5 py-4">
          <Label right={<span className="flex flex-wrap gap-x-3">{(Object.keys(EVENT) as (keyof typeof EVENT)[]).map(k => <span key={k}><span className="inline-block w-2 h-2 mr-1 align-middle" style={{ background: EVENT[k].color }} />{EVENT[k].label}</span>)}</span>}>Timeline</Label>
          <ol className="relative border-l border-[#222] ml-[5.2rem]">
            {d.timeline.map((e, k) => (
              <li key={k} className="relative pl-5 py-2">
                <span className="absolute -left-[5px] top-[15px] w-[9px] h-[9px] rounded-full border-2 border-[#080808]" style={{ background: EVENT[e.kind].color }} />
                <span className="absolute -left-[5.2rem] top-[11px] w-[4.6rem] text-right text-[11px] font-mono tabular-nums text-[#ddd]">{e.date}</span>
                <div className="text-[13px] leading-snug text-[#e6e6e6]" style={sans}><span className="text-[9px] font-mono uppercase tracking-[0.12em] mr-2" style={{ color: EVENT[e.kind].color }}>{EVENT[e.kind].label}</span>{e.text}</div>
                <div className="mt-0.5 text-[10px] font-mono text-[#666]">{e.sources.map((x, j) => <span key={j}>{j > 0 && ' · '}<Src s={x} /></span>)}</div>
              </li>))}
          </ol>
        </div>
      )}

      {/* ── kopkolommen per windstreek: automatisch ──────────────────────────────────── */}
      {viewRows.length > 1 && (
        <div className="mt-3 border border-[#1a1a1a] bg-[#080808] px-5 py-4">
          <Label auto right="newest three headlines per viewpoint">Who says what</Label>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{viewRows.slice(0, 6).map(([v]) => (
            <div key={v}>
              <div className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] mb-1.5" style={{ color: VIEW_COLOR[v] }}>{VIEW_LABEL[v]}</div>
              <ul className="space-y-1.5">{byView(v).map(i => <li key={i.id}><a href={i.link} target="_blank" rel="noopener noreferrer" className="text-[12px] leading-snug text-[#ddd] hover:text-[#e8760a]" style={sans}>{i.title}</a><div className="text-[9px] font-mono text-[#666]">{i.source}{isStateMedia(i.source) ? ' · state' : ''} · {ago(i.pubDate)}</div></li>)}</ul>
            </div>))}</div>
        </div>
      )}

      {d && (<>
        {d.background && (
          <details className="mt-3 border border-[#1a1a1a] bg-[#080808] px-5 py-3 group">
            <summary className="cursor-pointer list-none flex items-baseline gap-3"><span className="text-[11px] font-mono font-bold text-[#ddd] uppercase tracking-[0.22em]">{d.background.title}</span><span className="text-[10px] font-mono text-[#555]">background · click to open</span><span className="ml-auto text-[#555] group-open:rotate-180 transition-transform">▾</span></summary>
            {d.background.note && <p className="mt-3 text-[11px] font-mono text-[#f59e0b]">{d.background.note}</p>}
            <ul className="mt-2 list-disc pl-5 space-y-1.5">{d.background.bullets.map((b, k) => <li key={k} className="text-[13px] leading-snug text-[#ccc]" style={sans}>{b}</li>)}</ul>
            {d.background.source && <div className="mt-2 text-[10px] font-mono text-[#666]">Source: <Src s={d.background.source} /></div>}
          </details>
        )}
        <details className="mt-3 border border-[#1a1a1a] bg-[#080808] px-5 py-3 group">
          <summary className="cursor-pointer list-none flex items-baseline gap-3"><span className="text-[11px] font-mono font-bold text-[#ddd] uppercase tracking-[0.22em]">Sources used for this dossier</span><span className="text-[10px] font-mono text-[#555]">{d.sources.length} · click to open</span><span className="ml-auto text-[#555] group-open:rotate-180 transition-transform">▾</span></summary>
          <table className="w-full text-[12px] mt-3"><tbody>{d.sources.map((x, k) => <tr key={k} className="border-t border-[#141414] align-top"><td className="py-2 pr-3 text-[#ddd] font-mono text-[11px] whitespace-nowrap">{x.who}</td><td className="py-2 pr-3 text-[#bbb]" style={sans}>{x.what} <a href={x.url} target="_blank" rel="noopener noreferrer" className="text-[#8ab4f8] hover:text-[#e8760a] font-mono text-[10px]">link</a></td><td className="py-2 text-right font-mono text-[11px] text-[#888] whitespace-nowrap">{x.date}</td></tr>)}</tbody></table>
        </details>
        {d.disclaimer && <p className="mt-3 text-[11px] font-mono text-[#666] leading-relaxed">{d.disclaimer}</p>}
      </>)}
    </section>
  );
}
