'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center font-mono">
      <div className="text-center">
        <div className="text-[#e8760a] text-sm uppercase tracking-[0.2em] mb-3">ARGUS — temporarily unavailable</div>
        <button onClick={reset} className="text-[11px] text-[#888] border border-[#1a1a1a] rounded px-3 py-1.5 hover:text-[#e8760a] hover:border-[#e8760a]/30 uppercase tracking-wider">Retry</button>
      </div>
    </div>
  );
}
