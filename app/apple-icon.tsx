import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#050505',
          borderRadius: 36,
        }}
      >
        <svg width="140" height="140" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="28" fill="none" stroke="#00ff88" strokeWidth="1.5" />
          <ellipse cx="32" cy="32" rx="18" ry="28" fill="none" stroke="#00ff88" strokeWidth="1" />
          <ellipse cx="32" cy="32" rx="8" ry="28" fill="none" stroke="#00ff88" strokeWidth="1" />
          <line x1="4" y1="32" x2="60" y2="32" stroke="#00ff88" strokeWidth="1" />
          <ellipse cx="32" cy="20" rx="24" ry="6" fill="none" stroke="#00ff88" strokeWidth="1" />
          <ellipse cx="32" cy="44" rx="24" ry="6" fill="none" stroke="#00ff88" strokeWidth="1" />
          <circle cx="32" cy="32" r="2.5" fill="#00ff88" />
        </svg>
      </div>
    ),
    { ...size }
  )
}
