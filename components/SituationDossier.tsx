// Dossier-weergave op de situatiepagina (6 okt 2026, Leander: "wat is belangrijk, wat is de stand, wat is nieuw —
// visueel makkelijk"). Servercomponent; alleen de kaart is client-side. Volgorde = leesvolgorde: stand → tellers →
// kaart + plaatsen → wat vaststaat / wat niet → tijdlijn → context → bronnen. De automatische feedlijst komt eronder.
import type { Dossier } from '@/lib/dossiers';
import { KIND } from '@/lib/dossier-kinds';
import DossierMap from '@/components/DossierMap';

const sans = { fontFamily: 'var(--font-geist-sans), sans-serif' };
const fmt = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' }) + ' CET';
const H = ({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) => (
  <div className="flex items-baseline justify-between gap-3 mb-3"><h2 className="text-[11px] font-mono font-bold text-[#ddd] uppercase tracking-[0.22em]">{children}</h2>{right && <span className="text-[10px] font-mono text-[#555]">{right}</span>}</div>
);
const Src = ({ s }: { s: { name: string; url: string; date?: string } }) => (
  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-[#8ab4f8] hover:text-[#e8760a] border-b border-[#2a3a5a]">{s.name}</a>
);

export default function SituationDossier({ d, feedChecked }: { d: Dossier; feedChecked?: string }) {
  const kindsUsed = [...new Set(d.places.map(p => p.kind))];
  return (
    <section className="mt-8">
      {/* stand */}
      <div className="border border-[#1a1a1a] bg-[#080808] px-5 py-4">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#e8760a]">Where it stands</div>
          {d.subtitle && <div className="text-[11px] font-mono text-[#777]">{d.subtitle}</div>}
        </div>
        <p className="mt-2 text-[16px] leading-relaxed text-[#e6e6e6]" style={sans}>{d.stand}</p>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[10px] font-mono text-[#777] uppercase tracking-[0.15em]">
          <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-[#4ade80] mr-1.5 align-middle" />Dossier updated <b className="text-[#ddd] normal-case tracking-normal">{fmt(d.updatedAt)}</b></span>
          {feedChecked && <span>Newest report in feed <b className="text-[#ddd] normal-case tracking-normal">{fmt(feedChecked)}</b></span>}
        </div>
      </div>

      {/* tellers met bron */}
      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-px bg-[#1a1a1a] border border-[#1a1a1a]">
        {d.counters.map(c => (
          <div key={c.label} className="bg-[#080808] px-4 py-4 flex flex-col">
            <div className="text-[10px] font-mono text-[#888] uppercase tracking-[0.18em]">{c.label}</div>
            <div className="text-[34px] font-mono font-light tabular-nums leading-none mt-2" style={{ color: c.color || '#fff' }}>{c.value}</div>
            <div className="mt-2 text-[12px] leading-snug text-[#bbb]" style={sans}>{c.note}</div>
            <div className="mt-auto pt-3 text-[10px] font-mono text-[#666] leading-relaxed">{c.sources.map((s, k) => <span key={k}>{k > 0 && ' · '}<Src s={s} />{s.date && <span className="text-[#555]"> · {s.date}</span>}</span>)}</div>
          </div>
        ))}
      </div>

      {/* kaart + plaatsen */}
      {d.places.length > 0 && (
        <div className="mt-3 grid lg:grid-cols-[1.1fr_1fr] gap-3">
          <div className="border border-[#1a1a1a] bg-[#080808]">
            <div className="px-4 pt-3 pb-2 flex items-baseline gap-3"><h2 className="text-[11px] font-mono font-bold text-[#ddd] uppercase tracking-[0.22em]">Map</h2><span className="text-[10px] font-mono text-[#555]">pins mark places named in the reports · town-level, not exact buildings</span></div>
            <div className="h-[380px] border-t border-[#1a1a1a]"><DossierMap places={d.places} center={d.map?.center} zoom={d.map?.zoom} /></div>
            <div className="px-4 py-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono text-[#888]">{kindsUsed.map(k => <span key={k}><span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" style={{ background: KIND[k].color }} />{KIND[k].label}</span>)}</div>
          </div>
          <div className="border border-[#1a1a1a] bg-[#080808]">
            <div className="px-4 pt-3 pb-2"><h2 className="text-[11px] font-mono font-bold text-[#ddd] uppercase tracking-[0.22em]">Places in the reports</h2></div>
            <div className="divide-y divide-[#141414]">
              {d.places.map(p => (
                <div key={p.name} className="px-4 py-2.5 grid grid-cols-[10px_1fr] gap-3">
                  <span className="w-2 h-2 rounded-full mt-1.5" style={{ background: KIND[p.kind].color }} />
                  <div><div className="text-[13px] text-[#eee] leading-snug" style={sans}>{p.name}</div><div className="text-[10px] font-mono text-[#777] mt-0.5">{p.where}</div><div className="text-[12px] text-[#aaa] mt-0.5 leading-snug" style={sans}>{p.role}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* wat vaststaat / wat niet */}
      <div className="mt-3 grid md:grid-cols-2 gap-3">
        <div className="border border-[#1a1a1a] bg-[#080808] px-5 py-4" style={{ boxShadow: 'inset 3px 0 0 #4ade80' }}>
          <H>What we know</H>
          <ul className="space-y-2.5">{d.known.map((c, k) => <li key={k} className="text-[13px] leading-snug text-[#ddd]" style={sans}>{c.text}<span className="block text-[10px] font-mono text-[#666] mt-0.5">{c.src}</span></li>)}</ul>
        </div>
        <div className="border border-[#1a1a1a] bg-[#080808] px-5 py-4" style={{ boxShadow: 'inset 3px 0 0 #f59e0b' }}>
          <H>What&apos;s not confirmed</H>
          <ul className="space-y-2.5">{d.unconfirmed.map((c, k) => <li key={k} className="text-[13px] leading-snug text-[#ddd]" style={sans}>{c.text}<span className="block text-[10px] font-mono text-[#666] mt-0.5">{c.src}</span></li>)}</ul>
        </div>
      </div>

      {/* tijdlijn */}
      <div className="mt-3 border border-[#1a1a1a] bg-[#080808] px-5 py-4">
        <H right="claims and denials side by side · every line links to its source">Timeline</H>
        <ol className="divide-y divide-[#141414]">
          {d.timeline.map((e, k) => (
            <li key={k} className="grid grid-cols-[6rem_1fr] gap-3 py-2.5">
              <div className="text-[12px] font-mono tabular-nums text-[#ddd]">{e.date}{e.status === 'unconfirmed' && <div className="mt-1 text-[9px] uppercase tracking-[0.12em] text-[#f59e0b]">unconfirmed</div>}</div>
              <div><div className="text-[13px] leading-snug text-[#e6e6e6]" style={sans}>{e.text}</div><div className="mt-1 text-[10px] font-mono text-[#666]">{e.sources.map((s, j) => <span key={j}>{j > 0 && ' · '}<Src s={s} /></span>)}</div></div>
            </li>
          ))}
        </ol>
      </div>

      {/* context */}
      {d.context && (
        <div className="mt-3 border border-[#1a1a1a] bg-[#080808] px-5 py-4">
          <H>{d.context.title}</H>
          {d.context.note && <p className="text-[12px] font-mono text-[#f59e0b] mb-2">{d.context.note}</p>}
          <ul className="list-disc pl-5 space-y-1.5">{d.context.bullets.map((b, k) => <li key={k} className="text-[13px] leading-snug text-[#ccc]" style={sans}>{b}</li>)}</ul>
          {d.context.source && <div className="mt-2 text-[10px] font-mono text-[#666]">Source: <Src s={d.context.source} /></div>}
        </div>
      )}

      {/* bronnen */}
      <div className="mt-3 border border-[#1a1a1a] bg-[#080808]">
        <div className="px-5 pt-4 pb-2"><H>Sources</H></div>
        <table className="w-full text-[12px]">
          <thead><tr className="text-[9px] font-mono uppercase tracking-[0.15em] text-[#666]"><th className="text-left font-normal px-5 py-1">Who</th><th className="text-left font-normal px-2 py-1">What</th><th className="text-right font-normal px-5 py-1">Date</th></tr></thead>
          <tbody>{d.sources.map((s, k) => (
            <tr key={k} className="border-t border-[#141414] align-top"><td className="px-5 py-2 text-[#ddd] font-mono text-[11px] whitespace-nowrap">{s.who}</td><td className="px-2 py-2 text-[#bbb]" style={sans}>{s.what} <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-[#8ab4f8] hover:text-[#e8760a] font-mono text-[10px]">Link</a></td><td className="px-5 py-2 text-right font-mono text-[11px] text-[#888] whitespace-nowrap">{s.date}</td></tr>
          ))}</tbody>
        </table>
        {d.disclaimer && <p className="px-5 py-3 border-t border-[#141414] text-[11px] font-mono text-[#666] leading-relaxed">{d.disclaimer}</p>}
      </div>
    </section>
  );
}
