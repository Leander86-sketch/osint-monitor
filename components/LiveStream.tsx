'use client';

import { useState, useEffect } from 'react';

interface ChannelDef {
  name: string;
  shortName: string;
  color: string;
}

const CHANNELS: ChannelDef[] = [
  { name: 'Sky News', shortName: 'SKY', color: '#c42020' },
  { name: 'Al Jazeera EN', shortName: 'AJ', color: '#e8760a' },
  { name: 'France 24 FR', shortName: 'F24', color: '#2563eb' },
  { name: 'Euronews', shortName: 'EURO', color: '#1d8348' },
  { name: 'DW News EN', shortName: 'DW', color: '#555' },
  { name: 'Al Arabiya', shortName: 'ARAB', color: '#b45309' },
  { name: 'CNBC', shortName: 'CNBC', color: '#0284c7' },
  { name: 'NBC News', shortName: 'NBC', color: '#7c3aed' },
  { name: 'Al Jazeera AR', shortName: 'AJ-AR', color: '#d97706' },
  { name: 'DW News DE', shortName: 'DW-DE', color: '#525252' },
  { name: 'TRT World', shortName: 'TRT', color: '#dc2626' },
  { name: 'WION', shortName: 'WION', color: '#0891b2' },
  { name: 'CNA', shortName: 'CNA', color: '#b91c1c' },
  { name: 'NHK World', shortName: 'NHK', color: '#64748b' },
  { name: 'ABC News AU', shortName: 'ABC-AU', color: '#0ea5e9' },
  { name: 'India Today', shortName: 'INDIA', color: '#ef4444' },
  { name: 'LiveNOW FOX', shortName: 'FOX', color: '#1e40af' },
  { name: 'Bloomberg', shortName: 'BBG', color: '#f59e0b' },
  { name: 'Intel Cams', shortName: 'CAMS', color: '#10b981' },
  { name: 'Jerusalem Cam', shortName: 'JLM', color: '#eab308' },
  { name: 'Bosphorus Cam', shortName: 'BOSP', color: '#06b6d4' },
  { name: 'i24NEWS', shortName: 'I24', color: '#2563eb' },
  { name: 'United24 UA', shortName: 'U24', color: '#facc15' },
  { name: 'Espreso TV', shortName: 'ESPR', color: '#0ea5e9' },
  { name: 'Sky News Arabia', shortName: 'SKY-AR', color: '#0f766e' },
  { name: 'AP News', shortName: 'AP', color: '#dc2626' },
  { name: 'CNN', shortName: 'CNN', color: '#cc0000' },
  { name: 'ABC News US', shortName: 'ABC', color: '#1d4ed8' },
  { name: 'Africanews', shortName: 'AFR', color: '#16a34a' },
  { name: 'TVP World', shortName: 'TVP', color: '#b91c1c' },
  { name: 'NDTV', shortName: 'NDTV', color: '#e11d48' },
  { name: 'Firstpost', shortName: 'FP', color: '#7c2d12' },
  { name: 'Euronews FR', shortName: 'EUR-FR', color: '#15803d' },
];

// variant (18 sep 2026, /next): 'stage' = speler vult het podium, bediening in een smalle balk ONDER het beeld
// (YouTube staat geen elementen óver de speler toe); 'pip' = klein, zonder bediening, altijd gedempt.
export default function LiveStream({ variant = 'default' }: { variant?: 'default' | 'stage' | 'pip' } = {}) {
  const [showList, setShowList] = useState(false);
  const [activeChannel, setActiveChannel] = useState(0);
  const [muted, setMuted] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [videoIds, setVideoIds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVideoIds();
    // Refresh video IDs every 15 minutes
    const interval = setInterval(fetchVideoIds, 900000);
    return () => clearInterval(interval);
  }, []);

  // Situation dossiers can switch the stream: 'argus:watch-channel' with a channel name
  useEffect(() => {
    const onWatch = (e: Event) => {
      const name = (e as CustomEvent).detail as string;
      const idx = CHANNELS.findIndex(c => c.name === name);
      if (idx >= 0) {
        setActiveChannel(idx);
        setCollapsed(false);
        setTimeout(() => document.getElementById('live-stream')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
      }
    };
    window.addEventListener('argus:watch-channel', onWatch);
    return () => window.removeEventListener('argus:watch-channel', onWatch);
  }, []);

  useEffect(() => {
    try { const name = sessionStorage.getItem('argus_ch'); if (!name) return;
      const ord = [...CHANNELS].sort((a, b) => (videoIds[a.name] ? 0 : 1) - (videoIds[b.name] ? 0 : 1) || CHANNELS.indexOf(a) - CHANNELS.indexOf(b));
      const idx = ord.findIndex(c => c.name === name); if (idx >= 0 && videoIds[name]) setActiveChannel(idx);
    } catch { /* privé-modus */ }
  }, [videoIds]);

  const fetchVideoIds = async () => {
    try {
      const res = await fetch('/api/live');
      const data = await res.json();
      setVideoIds(data.channels || {});
    } catch (err) {
      console.error('Failed to fetch live video IDs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Met 33 kanalen is de tabrij te lang om er dode tabs in te laten staan:
  // wat nu uitzendt hoort vooraan. De volgorde binnen elke groep blijft gelijk,
  // zodat de rij niet bij elke poll onder je vinger verspringt.
  const ordered = [...CHANNELS].sort((a, b) => {
    const la = videoIds[a.name] ? 0 : 1;
    const lb = videoIds[b.name] ? 0 : 1;
    return la - lb || CHANNELS.indexOf(a) - CHANNELS.indexOf(b);
  });

  const channel = ordered[activeChannel] || ordered[0];
  // onthoud de gekozen zender op naam, zodat wisselen tussen klein en groot niet terugspringt naar de eerste
  const pick = (i: number) => { setActiveChannel(i); try { sessionStorage.setItem('argus_ch', ordered[i]?.name || ''); } catch { /* privé-modus */ } };
  const videoId = channel ? videoIds[channel.name] : undefined;

  const getEmbedUrl = () => {
    if (!videoId) return '';
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${muted ? '1' : '0'}&controls=1&modestbranding=1&rel=0`;
  };

  const availableCount = Object.keys(videoIds).length;

  if (variant !== 'default') {
    const liveIdx = ordered.map((c, i) => (videoIds[c.name] ? i : -1)).filter(i => i >= 0);
    const step = (d: number) => { if (!liveIdx.length) return; const at = Math.max(0, liveIdx.indexOf(activeChannel)); pick(liveIdx[(at + d + liveIdx.length) % liveIdx.length]); };
    const isMuted = variant === 'pip' ? true : muted;
    return (
      <div className="flex flex-col h-full bg-black">
        <div className="relative flex-1 min-h-0 flex items-center justify-center bg-black">
          {loading ? (
            <div className="w-4 h-4 border border-[#e8760a]/30 border-t-[#e8760a] rounded-full animate-spin" />
          ) : videoId ? (
            <div className="h-full max-w-full" style={{ aspectRatio: '16/9' }}>
              <iframe key={`${videoId}-${isMuted}-${variant}`} src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${isMuted ? '1' : '0'}&controls=1&modestbranding=1&rel=0`} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ border: 'none' }} />
            </div>
          ) : (
            <span className="text-[12px] font-mono text-[#333] uppercase">No live stream available</span>
          )}
        </div>
        {variant === 'stage' && (
          <div className="bg-[#080808] border-t border-[#1a1a1a]">
            {showList && (
              <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-[#111]">
                {ordered.map((ch, i) => videoIds[ch.name] ? (
                  <button key={ch.name} onClick={() => { pick(i); setShowList(false); }} className="text-[11px] px-2 py-1 font-mono uppercase tracking-wider rounded" style={i === activeChannel ? { backgroundColor: ch.color, color: '#fff' } : { color: '#bbb', border: '1px solid #1a1a1a' }}>{ch.shortName}</button>
                ) : null)}
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#dc2626] animate-pulse" />
              <span className="text-[10px] font-mono text-[#888] uppercase tracking-[0.2em]">Live</span>
              <button onClick={() => step(-1)} aria-label="Previous channel" className="text-[13px] font-mono text-[#ccc] hover:text-[#e8760a] px-2 border border-[#1a1a1a] rounded">&lsaquo;</button>
              <span className="text-[12px] font-mono text-white uppercase tracking-[0.15em] min-w-[9rem] text-center">{channel?.name || '—'}</span>
              <button onClick={() => step(1)} aria-label="Next channel" className="text-[13px] font-mono text-[#ccc] hover:text-[#e8760a] px-2 border border-[#1a1a1a] rounded">&rsaquo;</button>
              <button onClick={() => setShowList(v => !v)} className="text-[10px] font-mono text-[#aaa] hover:text-[#e8760a] uppercase tracking-[0.15em] px-2 py-1 border border-[#1a1a1a] rounded ml-1">Channels · {availableCount} {showList ? '▴' : '▾'}</button>
              <button onClick={() => setMuted(!muted)} title={muted ? 'Unmute' : 'Mute'} className="text-[12px] font-mono text-[#ccc] hover:text-[#e8760a] px-2 ml-auto">{muted ? '◁× sound off' : '◁)) sound on'}</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div id="live-stream" className="border-b border-[#1a1a1a]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1a1a1a] bg-[#080808]">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-1.5 h-1.5 rounded-full bg-[#dc2626]" />
            <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-[#dc2626] animate-ping opacity-40" />
          </div>
          <span className="text-[11px] font-mono font-bold text-[#ddd]2 uppercase tracking-[0.2em]">Live Nieuws</span>
          <span className="text-[11px] font-mono text-[#dc2626]">●</span>
          <span className="text-[11px] font-mono text-[#ccc]">{availableCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMuted(!muted)}
            className="text-[12px] font-mono text-[#ccc] hover:text-[#e8760a] transition-colors px-1"
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? '◁×' : '◁))'}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-[12px] font-mono text-[#ccc] hover:text-[#e8760a] transition-colors px-1"
          >
            {collapsed ? '▼' : '▲'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Channel Tabs */}
          <div className="flex overflow-x-auto px-2 py-1.5 gap-0.5 border-b border-[#111] bg-[#070707]">
            {ordered.map((ch, i) => {
              const hasStream = !!videoIds[ch.name];
              return (
                <button
                  key={ch.name}
                  onClick={() => setActiveChannel(i)}
                  disabled={!hasStream && !loading}
                  className={`text-[12px] px-2 py-1 font-mono uppercase tracking-wider rounded whitespace-nowrap transition-all ${
                    i === activeChannel
                      ? 'font-bold'
                      : hasStream
                        ? 'text-[#ccc] hover:text-[#bbb]'
                        : 'text-[#1a1a1a] cursor-not-allowed'
                  }`}
                  style={i === activeChannel && hasStream ? {
                    backgroundColor: ch.color,
                    color: '#fff',
                  } : {}}
                >
                  {ch.shortName}
                </button>
              );
            })}
          </div>

          {/* Video Player */}
          <div className="relative bg-black" style={{ aspectRatio: '16/9' }}>
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4 h-4 border border-[#e8760a]/30 border-t-[#e8760a] rounded-full animate-spin" />
              </div>
            ) : videoId ? (
              <iframe
                key={`${videoId}-${muted}`}
                src={getEmbedUrl()}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ border: 'none' }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[12px] font-mono text-[#222] uppercase">No live stream available</span>
              </div>
            )}
            {/* Channel indicator overlay */}
            {videoId && (
              <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/70 px-2 py-1 rounded">
                <div className="w-1.5 h-1.5 rounded-full bg-[#dc2626] animate-pulse" />
                <span className="text-[12px] font-mono text-white/80 uppercase tracking-wider">{channel.name}</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
