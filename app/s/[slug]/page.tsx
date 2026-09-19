import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSituationBySlug, computeSituations } from '@/lib/situations';
import { ensureFeedsLoaded, getNewsItems } from '@/lib/store';
import { NewsItem } from '@/lib/types';
import { VIEW_COLOR, VIEW_LABEL, viewOf, isStateMedia } from '@/lib/viewpoints';

export const dynamic = 'force-dynamic';
// Vindbare, deelbare pagina per situatie (19 sep 2026). Volledig op de server opgebouwd, zodat zoekmachines en
// linkvoorbeelden de echte koppen zien; het plaatje voor X, WhatsApp en Telegram komt uit ./opengraph-image.
const SEV_COLOR: Record<string, string> = { critical: '#dc2626', high: '#f97316', medium: '#eab308', low: '#6b7280' };
const sans = { fontFamily: 'var(--font-geist-sans), sans-serif' };
const ago = (iso: string) => { const m = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000)); return m < 60 ? `${m} min ago` : m < 1440 ? `${Math.floor(m / 60)} h ago` : `${Math.floor(m / 1440)} d ago`; };

async function load(slug: string) {
  await ensureFeedsLoaded();
  const s = getSituationBySlug(slug); if (!s) return null;
  const byId = new Map(getNewsItems(2000, 0).map(i => [i.id, i]));
  const items = s.itemIds.map(id => byId.get(id)).filter((i): i is NewsItem => !!i).sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
  return { s, items };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const d = await load(slug); if (!d) return { title: 'ARGUS' };
  const title = `${d.s.title} — ${d.s.severity.toUpperCase()} · ARGUS`;
  const description = d.s.latestHeadline ? `Latest: ${d.s.latestHeadline}. ${d.s.metadata.velocity24h} reports in 24 hours from ${new Set(d.items.map(i => i.source)).size} sources, corroboration ${d.s.metadata.corroboration}.` : `Live OSINT tracking of ${d.s.title}.`;
  return { title, description, alternates: { canonical: `/s/${slug}` }, openGraph: { title, description, siteName: 'ARGUS', type: 'article', url: `/s/${slug}` }, twitter: { card: 'summary_large_image', title, description, site: '@ArgusDashboard' } };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const d = await load(slug); if (!d) notFound();
  const { s, items } = d; const sev = SEV_COLOR[s.severity] || '#6b7280';
  const others = computeSituations().filter(x => x.slug !== s.slug).slice(0, 8);
  const sources = [...new Set(items.map(i => i.source))];
  return (
    <main className="min-h-screen bg-[#050505] text-[#ccc]">
      <header className="border-b border-[#1a1a1a] flex items-center gap-4 px-5 py-4">
        <a href="/" className="flex items-center gap-2.5"><span className="w-2 h-2 rounded-full bg-[#e8760a]" /><span className="text-sm font-bold tracking-[0.15em] uppercase text-[#e8760a]">ARGUS</span></a>
        <span className="text-[11px] font-mono text-[#888] uppercase tracking-[0.2em]">Situation</span>
        <a href={`/?dossier=${s.slug}`} className="ml-auto text-[11px] font-mono text-[#050505] bg-[#e8760a] hover:bg-white uppercase tracking-[0.15em] px-3 py-1.5">Open live dashboard →</a>
      </header>
      <article className="max-w-[1000px] mx-auto px-6 py-9">
        <div className="border-l-4 pl-5" style={{ borderColor: sev }}>
          <div className="text-[11px] font-mono uppercase tracking-[0.25em]" style={{ color: sev }}>{s.severity} · {s.status} · corroboration {s.metadata.corroboration}</div>
          <h1 className="text-[40px] leading-tight text-white mt-1" style={sans}>{s.title}</h1>
          <p className="mt-3 text-[13px] font-mono text-[#999]">{s.metadata.velocity1h} reports in the last hour · {s.metadata.velocity24h} in 24 hours · {sources.length} sources · updated {s.latestPubDate ? ago(s.latestPubDate) : '—'}</p>
        </div>
        <h2 className="mt-9 mb-3 text-[11px] font-mono font-bold text-[#ddd] uppercase tracking-[0.22em]">Latest reports</h2>
        <ol className="border border-[#1a1a1a] divide-y divide-[#141414]">
          {items.slice(0, 25).map(i => { const v = viewOf(i); return (
            <li key={i.id} className="bg-[#080808] px-4 py-3.5">
              <a href={i.link} target="_blank" rel="noopener noreferrer" className="block text-[16px] leading-snug text-[#f0f0f0] hover:text-[#e8760a]" style={sans}>{i.title}</a>
              <div className="mt-1.5 text-[10px] font-mono text-[#888]"><span style={{ color: VIEW_COLOR[v] }}>{VIEW_LABEL[v].toUpperCase()}</span> · {i.source}{isStateMedia(i.source) && <span className="ml-1.5 text-[#a16207]">state</span>} · T{i.sourceTier || 3} · <time dateTime={new Date(i.pubDate).toISOString()}>{ago(i.pubDate)}</time></div>
            </li>); })}
          {items.length === 0 && <li className="bg-[#080808] px-4 py-10 text-center text-[11px] font-mono text-[#555] uppercase">No reports right now</li>}
        </ol>
        <p className="mt-4 text-[12px] font-mono text-[#666] leading-relaxed">ARGUS clusters open, public sources into live situations. Every line is a named source you can check yourself. Severity follows the volume and rank of reporting; corroboration A means several independent top-rank sources carry it.</p>
        <h2 className="mt-9 mb-3 text-[11px] font-mono font-bold text-[#ddd] uppercase tracking-[0.22em]">Other situations</h2>
        <div className="flex flex-wrap gap-2">{others.map(o => <a key={o.slug} href={`/s/${o.slug}`} className="text-[11px] font-mono uppercase tracking-[0.12em] px-2.5 py-1.5 border border-[#222] hover:border-[#e8760a] hover:text-[#e8760a]" style={{ boxShadow: `inset 3px 0 0 ${SEV_COLOR[o.severity]}` }}>{o.title}</a>)}</div>
      </article>
    </main>
  );
}
