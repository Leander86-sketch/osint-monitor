import { ImageResponse } from 'next/og';
import { getSituationBySlug } from '@/lib/situations';
import { ensureFeedsLoaded } from '@/lib/store';

// Deelbaar plaatje per situatie (19 sep 2026): titel, niveau, laatste kop en cijfers — voor X, WhatsApp en Telegram.
export const alt = 'ARGUS situation';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const dynamic = 'force-dynamic';
const SEV: Record<string, string> = { critical: '#dc2626', high: '#f97316', medium: '#eab308', low: '#6b7280' };

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; await ensureFeedsLoaded();
  const s = getSituationBySlug(slug);
  const sev = s ? SEV[s.severity] || '#6b7280' : '#6b7280';
  const head = s?.latestHeadline ? (s.latestHeadline.length > 130 ? s.latestHeadline.slice(0, 127) + '…' : s.latestHeadline) : 'Always monitoring the situation';
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#050505', padding: '56px 64px', fontFamily: 'monospace', borderLeft: `18px solid ${sev}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}><div style={{ width: 16, height: 16, borderRadius: 16, background: '#e8760a', marginRight: 16 }} /><div style={{ fontSize: 30, color: '#e8760a', letterSpacing: 10, fontWeight: 700, display: 'flex' }}>ARGUS</div></div>
          <div style={{ fontSize: 22, color: sev, letterSpacing: 6, display: 'flex' }}>{s ? `${s.severity.toUpperCase()} · ${s.status.toUpperCase()}` : 'LIVE'}</div>
        </div>
        <div style={{ fontSize: s && s.title.length > 26 ? 66 : 84, color: '#ffffff', marginTop: 54, lineHeight: 1.05, display: 'flex', fontFamily: 'sans-serif' }}>{s ? s.title : 'ARGUS'}</div>
        <div style={{ fontSize: 34, color: '#c9c9c9', marginTop: 30, lineHeight: 1.3, display: 'flex', fontFamily: 'sans-serif' }}>{head}</div>
        <div style={{ display: 'flex', marginTop: 'auto', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', fontSize: 22, color: '#8a8a8a', letterSpacing: 2 }}>{s ? `${s.metadata.velocity24h} REPORTS / 24H  ·  CORROBORATION ${s.metadata.corroboration}  ·  T1 ${s.metadata.sourceTierCounts.t1}  T2 ${s.metadata.sourceTierCounts.t2}` : ''}</div>
          <div style={{ display: 'flex', fontSize: 22, color: '#e8760a', letterSpacing: 2 }}>argus.prototipo.nl</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
