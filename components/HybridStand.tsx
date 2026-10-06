'use client';

// Hybrid Europe · tracker 2.0 (6 okt 2026). Geïnspireerd op plague.somethingbig.ai: één stand in gewone zinnen,
// twee stempels (laatste incident / bronnen gecontroleerd), elk cijfer met zijn bron en periode, en een harde scheiding
// tussen DOCUMENTED (de Leiden-dataset 2022–2025, CC BY) en REPORTED (ARGUS' eigen detectie uit open feeds sinds 22 sep 2026,
// niet onafhankelijk geverifieerd). Alles is deterministisch uit de incidentenlijst afgeleid — geen LLM-tekst.
import { useMemo } from 'react';

type Sev = 'critical' | 'medium' | 'small';
interface Inc { id: string; date: string; countries: string[]; place: string | null; type: string; title: string; severity: Sev; origin: string; sources: { name: string; url: string }[]; attribution: string; actor?: string | null }
interface Props { all: Inc[]; generatedAt: string | null; credits: { name: string; url: string }[]; onPick: (id: string) => void }

const SEV_COLOR: Record<Sev, string> = { critical: '#dc2626', medium: '#f59e0b', small: '#6b7280' };
const TYPE_LABEL: Record<string, string> = { drone: 'drones', sabotage: 'sabotage', maritime: 'sea & cables', airspace: 'airspace violations', jamming: 'GPS jamming', cyber: 'cyber', other: 'other incidents' };
const sans = { fontFamily: 'var(--font-geist-sans), sans-serif' };
const DAY = 86400000;
// eigen detectie: hybrid_fetch.py draait sinds 22 sep 2026 en las de feed-opslag terug tot 11 sep; twee oudere items kwamen via archief-feeds (mil.ee)
const COVERAGE_FROM = '2026-09-11';
const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' }) + ' CET' : '—';
const fmtDay = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const plural = (n: number, w: string) => n === 1 ? `1 ${w}` : `${n} ${w.endsWith('y') ? w.slice(0, -1) + 'ies' : w + 's'}`;

export default function HybridStand({ all, generatedAt, credits, onPick }: Props) {
  const now = Date.now();
  const s = useMemo(() => {
    const doc = all.filter(i => i.origin === 'schuurman');
    const rep = all.filter(i => i.origin === 'argus');
    const age = (i: Inc) => now - new Date(i.date).getTime();
    const last30 = all.filter(i => age(i) < 30 * DAY);
    const prev30 = all.filter(i => { const a = age(i); return a >= 30 * DAY && a < 60 * DAY; });
    const crit30 = last30.filter(i => i.severity === 'critical');
    const countBy = (list: Inc[], key: (i: Inc) => string[]) => { const m = new Map<string, number>(); list.forEach(i => key(i).forEach(k => k && m.set(k, (m.get(k) || 0) + 1))); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
    const c30 = countBy(last30, i => i.countries);
    const t30 = countBy(last30, i => [i.type]);
    const cRep = countBy(rep, i => i.countries);
    const cDoc = countBy(doc, i => i.countries);
    const latest = all.reduce<string | null>((m, i) => (!m || i.date > m) ? i.date : m, null);
    const docRange = doc.length ? [doc.reduce((m, i) => i.date < m ? i.date : m, doc[0].date).slice(0, 4), doc.reduce((m, i) => i.date > m ? i.date : m, doc[0].date).slice(0, 4)] : ['', ''];
    const repFrom = rep.length ? rep.reduce((m, i) => i.date < m ? i.date : m, rep[0].date) : null;
    const recent = all.filter(i => age(i) < 14 * DAY).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
    // landen-tabel: alle landen met ≥1 incident, dataset en 2026 naast elkaar, gesorteerd op 2026
    const allC = new Map<string, { doc: number; rep: number; last30: number }>();
    cDoc.forEach(([c, n]) => allC.set(c, { doc: n, rep: 0, last30: 0 }));
    cRep.forEach(([c, n]) => allC.set(c, { ...(allC.get(c) || { doc: 0, rep: 0, last30: 0 }), rep: n }));
    c30.forEach(([c, n]) => allC.set(c, { ...(allC.get(c) || { doc: 0, rep: 0, last30: 0 }), last30: n }));
    const table = [...allC.entries()].sort((a, b) => (b[1].rep - a[1].rep) || (b[1].doc - a[1].doc)).slice(0, 12);
    return { doc, rep, last30, prev30, crit30, c30, t30, cRep, latest, docRange, repFrom, recent, table };
  }, [all, now]);

  const delta = s.last30.length - s.prev30.length;
  const prevStart = new Date(now - 60 * DAY).toISOString().slice(0, 10);
  const comparable = prevStart >= COVERAGE_FROM; // pas als het vorige venster helemaal binnen de dekking valt is de vergelijking eerlijk
  const deltaTxt = !comparable ? `with no like-for-like comparison yet (feed coverage starts ${fmtDay(COVERAGE_FROM)})` : s.prev30.length === 0 && s.last30.length === 0 ? 'nothing in either window' : delta === 0 ? 'the same as the 30 days before' : `${delta > 0 ? 'up' : 'down'} from ${s.prev30.length} in the 30 days before`;
  const topC = s.c30[0]; const topT = s.t30[0];
  const stand = all.length === 0 ? null : [
    `In the last 30 days ARGUS logged ${plural(s.last30.length, 'incident')} across ${plural(s.c30.length, 'country')}, ${deltaTxt}${s.crit30.length ? `; ${s.crit30.length} of them critical` : ''}.`,
    topC && topT ? `Most reports came from ${topC[0]} (${topC[1]}); the most common pattern was ${TYPE_LABEL[topT[0]] || topT[0]} (${topT[1]}).` : null,
    `The documented record covers ${s.doc.length} incidents from ${s.docRange[0]}–${s.docRange[1]}; the ${s.rep.length} entries from 2026 are ARGUS' own detections from open feeds (coverage from ${fmtDay(COVERAGE_FROM)}) and are not independently verified.`,
  ].filter(Boolean).join(' ');

  const credit = credits[0];
  const box = 'bg-[#080808] px-4 py-4 flex flex-col';
  const label = 'text-[10px] font-mono text-[#888] uppercase tracking-[0.18em] mt-1';
  const src = 'text-[10px] font-mono text-[#555] mt-auto pt-2 leading-snug';

  return (
    <div className="mt-6">
      {/* stand in gewone zinnen */}
      <div className="border border-[#1a1a1a] bg-[#080808] px-5 py-4">
        <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#e8760a] mb-2">Where it stands</div>
        <p className="text-[16px] leading-relaxed text-[#e6e6e6] max-w-4xl" style={sans}>{stand || 'Loading the incident record…'}</p>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[10px] font-mono text-[#777] uppercase tracking-[0.15em]">
          <span>Last incident <b className="text-[#ddd] normal-case tracking-normal">{s.latest ? fmtDay(s.latest) : '—'}</b></span>
          <span>Sources checked <b className="text-[#ddd] normal-case tracking-normal">{fmt(generatedAt)}</b></span>
          <span>Refresh <b className="text-[#ddd] normal-case tracking-normal">every 6 h</b></span>
        </div>
      </div>

      {/* tellers, elk met bron en periode */}
      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-px bg-[#1a1a1a] border border-[#1a1a1a]">
        <div className={box}><div className="text-[30px] font-mono font-light tabular-nums text-[#7fb2e0]">{s.doc.length}</div><div className={label}>Documented {s.docRange[0]}–{s.docRange[1]}</div><div className={src}>{credit ? <a href={credit.url} target="_blank" rel="noopener noreferrer" className="text-[#888] hover:text-[#e8760a] border-b border-[#333]">{credit.name}</a> : 'dataset'} · attribution as given by the source</div></div>
        <div className={box}><div className="text-[30px] font-mono font-light tabular-nums text-[#e8a04a]">{s.rep.length}</div><div className={label}>Reported {s.repFrom ? s.repFrom.slice(0, 4) : '2026'} by ARGUS</div><div className={src}>own detection · feed coverage from {fmtDay(COVERAGE_FROM)} · not independently verified</div></div>
        <div className={box}><div className="text-[30px] font-mono font-light tabular-nums" style={{ color: s.crit30.length ? SEV_COLOR.critical : '#fff' }}>{s.last30.length}<span className="text-[14px] text-[#777] ml-2">{s.crit30.length} critical</span></div><div className={label}>Last 30 days</div><div className={src}>{comparable ? `${s.prev30.length} in the 30 days before · both windows end today` : `no comparison yet · coverage from ${fmtDay(COVERAGE_FROM)}`}</div></div>
        <div className={box}><div className="text-[30px] font-mono font-light tabular-nums text-white">{s.cRep.length}</div><div className={label}>Countries with reports {s.repFrom ? s.repFrom.slice(0, 4) : ''}</div><div className={src}>{s.cRep.slice(0, 3).map(([c, n]) => `${c} ${n}`).join(' · ') || '—'}</div></div>
      </div>

      <div className="mt-3 grid lg:grid-cols-[1fr_1.3fr] gap-3">
        {/* landen: dataset naast 2026 */}
        <div className="border border-[#1a1a1a] bg-[#080808]">
          <div className="px-4 pt-3 pb-2 flex items-baseline justify-between"><h3 className="text-[11px] font-mono font-bold text-[#ddd] uppercase tracking-[0.22em]">By country</h3><span className="text-[10px] font-mono text-[#555]">top {s.table.length}, sorted on 2026</span></div>
          <table className="w-full text-[12px] font-mono tabular-nums">
            <thead><tr className="text-[9px] uppercase tracking-[0.15em] text-[#666]"><th className="text-left font-normal px-4 py-1">Country</th><th className="text-right font-normal px-2 py-1 text-[#7fb2e0]">Documented</th><th className="text-right font-normal px-2 py-1 text-[#e8a04a]">Reported</th><th className="text-right font-normal px-4 py-1">30 d</th></tr></thead>
            <tbody>{s.table.map(([c, v]) => (
              <tr key={c} className="border-t border-[#141414] text-[#ccc]"><td className="px-4 py-1.5">{c}</td><td className="text-right px-2 py-1.5">{v.doc || <span className="text-[#333]">·</span>}</td><td className="text-right px-2 py-1.5">{v.rep || <span className="text-[#333]">·</span>}</td><td className="text-right px-4 py-1.5">{v.last30 || <span className="text-[#333]">·</span>}</td></tr>
            ))}</tbody>
          </table>
        </div>
        {/* wat er veranderde: laatste 14 dagen */}
        <div className="border border-[#1a1a1a] bg-[#080808]">
          <div className="px-4 pt-3 pb-2 flex items-baseline justify-between"><h3 className="text-[11px] font-mono font-bold text-[#ddd] uppercase tracking-[0.22em]">What changed · last 14 days</h3><span className="text-[10px] font-mono text-[#555]">newest first · click to open in the list</span></div>
          <div className="divide-y divide-[#141414]">
            {s.recent.map(i => (
              <button key={i.id} onClick={() => onPick(i.id)} className="w-full text-left grid grid-cols-[5.2rem_1fr] gap-3 px-4 py-2.5 hover:bg-[#e8760a]/[0.06]" style={{ boxShadow: `inset 3px 0 0 ${SEV_COLOR[i.severity]}` }}>
                <div className="text-[11px] font-mono tabular-nums text-[#ddd]">{i.date}<div className={`mt-1 text-[9px] uppercase tracking-[0.12em] ${i.origin === 'schuurman' ? 'text-[#7fb2e0]' : 'text-[#e8a04a]'}`}>{i.origin === 'schuurman' ? 'dataset' : 'reported'}</div></div>
                <div className="min-w-0"><div className="text-[13px] leading-snug text-[#eee] truncate" style={sans}>{i.title}</div><div className="mt-0.5 text-[10px] font-mono text-[#777] truncate">{i.countries.join(' · ') || '—'}{i.place ? ` · ${i.place}` : ''} · {TYPE_LABEL[i.type] || i.type} · {i.sources.map(x => x.name).slice(0, 2).join(', ')}</div></div>
              </button>
            ))}
            {s.recent.length === 0 && <div className="text-[11px] font-mono text-[#555] py-8 text-center uppercase tracking-[0.2em]">{all.length ? 'No incidents in the last 14 days' : 'Loading…'}</div>}
          </div>
        </div>
      </div>

      <p className="mt-3 text-[11px] font-mono text-[#666] leading-relaxed max-w-4xl">
        <span className="text-[#7fb2e0]">Documented</span> = taken from a published, cited dataset; attribution is the source&apos;s. <span className="text-[#e8a04a]">Reported</span> = detected by ARGUS in open news feeds (coverage from 11 Sep 2026) and placed by keyword; it can contain noise and duplicates and is not independently verified. Counts change when the record is corrected. Every line below links to its source.
      </p>
    </div>
  );
}
