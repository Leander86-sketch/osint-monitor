import { ImageResponse } from 'next/og'

export const alt = 'ARGUS — Real-time Global Intelligence Dashboard'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#050505',
          fontFamily: 'monospace',
        }}
      >
        {/* Globe wireframe */}
        <svg width="120" height="120" viewBox="0 0 64 64" style={{ marginBottom: 24 }}>
          <circle cx="32" cy="32" r="28" fill="none" stroke="#00ff88" strokeWidth="1.5" />
          <ellipse cx="32" cy="32" rx="18" ry="28" fill="none" stroke="#00ff88" strokeWidth="1" />
          <ellipse cx="32" cy="32" rx="8" ry="28" fill="none" stroke="#00ff88" strokeWidth="1" />
          <line x1="4" y1="32" x2="60" y2="32" stroke="#00ff88" strokeWidth="1" />
          <ellipse cx="32" cy="20" rx="24" ry="6" fill="none" stroke="#00ff88" strokeWidth="1" />
          <ellipse cx="32" cy="44" rx="24" ry="6" fill="none" stroke="#00ff88" strokeWidth="1" />
          <circle cx="32" cy="32" r="2.5" fill="#00ff88" />
        </svg>
        <div style={{ fontSize: 64, fontWeight: 700, color: '#00ff88', letterSpacing: 12, display: 'flex' }}>
          ARGUS
        </div>
        <div style={{ fontSize: 18, color: '#666', marginTop: 12, letterSpacing: 4, display: 'flex' }}>
          ALWAYS MONITORING THE SITUATION
        </div>
        <div style={{ display: 'flex', gap: 32, marginTop: 40, color: '#444', fontSize: 14 }}>
          <span style={{ display: 'flex' }}>120 FEEDS</span>
          <span style={{ display: 'flex' }}>3 TIERS</span>
          <span style={{ display: 'flex' }}>13 TELEGRAM CHANNELS</span>
          <span style={{ display: 'flex' }}>LIVE MAP</span>
        </div>
      </div>
    ),
    { ...size }
  )
}
