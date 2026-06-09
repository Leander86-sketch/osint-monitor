import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#050505',
          borderRadius: '50%',
        }}
      >
        <svg width="28" height="28" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="28" fill="none" stroke="#00ff88" strokeWidth="2" />
          <ellipse cx="32" cy="32" rx="18" ry="28" fill="none" stroke="#00ff88" strokeWidth="1.5" />
          <ellipse cx="32" cy="32" rx="8" ry="28" fill="none" stroke="#00ff88" strokeWidth="1.5" />
          <line x1="4" y1="32" x2="60" y2="32" stroke="#00ff88" strokeWidth="1.5" />
          <ellipse cx="32" cy="20" rx="24" ry="6" fill="none" stroke="#00ff88" strokeWidth="1.5" />
          <ellipse cx="32" cy="44" rx="24" ry="6" fill="none" stroke="#00ff88" strokeWidth="1.5" />
          <circle cx="32" cy="32" r="3" fill="#00ff88" />
        </svg>
      </div>
    ),
    { ...size }
  )
}
