'use client';

import { useEffect } from 'react';

// A stale tab from before a redeploy fails to lazy-load old chunk hashes
// (ChunkLoadError). A hard reload fetches the new build - do it once,
// automatically, instead of showing the error screen.
function isStaleChunkError(error: Error): boolean {
  const msg = `${error.name} ${error.message}`;
  return /ChunkLoadError|Loading chunk|dynamically imported module|import\(\) failed/i.test(msg);
}

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    if (!isStaleChunkError(error)) return;
    const KEY = 'argus-chunk-reload';
    if (sessionStorage.getItem(KEY)) return; // avoid a reload loop
    sessionStorage.setItem(KEY, '1');
    window.location.reload();
  }, [error]);

  useEffect(() => {
    // Successful render of a later visit clears the guard
    const t = setTimeout(() => sessionStorage.removeItem('argus-chunk-reload'), 30000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center font-mono">
      <div className="text-center">
        <div className="text-[#e8760a] text-sm uppercase tracking-[0.2em] mb-3">ARGUS — temporarily unavailable</div>
        <button onClick={() => window.location.reload()} className="text-[11px] text-[#888] border border-[#1a1a1a] rounded px-3 py-1.5 hover:text-[#e8760a] hover:border-[#e8760a]/30 uppercase tracking-wider">Retry</button>
      </div>
    </div>
  );
}
