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
];

export default function LiveStream() {
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

  const channel = CHANNELS[activeChannel];
  const videoId = videoIds[channel.name];

  const getEmbedUrl = () => {
    if (!videoId) return '';
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${muted ? '1' : '0'}&controls=1&modestbranding=1&rel=0`;
  };

  const availableCount = Object.keys(videoIds).length;

  return (
    <div className="border-b border-[#1a1a1a]">
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
            {CHANNELS.map((ch, i) => {
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
