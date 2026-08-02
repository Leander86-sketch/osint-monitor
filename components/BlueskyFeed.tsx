'use client';

import { useEffect, useState, useCallback } from 'react';

interface BskyPost {
  id: string;
  author: string;
  handle: string;
  text: string;
  createdAt: string;
  link: string;
}

function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.floor(m / 60)}h`;
  return `${Math.floor(m / 1440)}d`;
}

export default function BlueskyFeed() {
  const [posts, setPosts] = useState<BskyPost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/bluesky');
      const d = await res.json();
      setPosts(d.posts || []);
    } catch (err) {
      console.error('Bluesky fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return <div className="flex items-center justify-center h-full text-[#666] text-[12px] font-mono">Loading OSINT posts...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-[#1a1a1a] flex items-center justify-between">
        <span className="text-[11px] font-mono text-[#888] uppercase tracking-wider">Curated OSINT accounts (Bluesky)</span>
        <span className="text-[11px] font-mono text-[#555]">{posts.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {posts.map(p => (
          <a
            key={p.id}
            href={p.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-3 py-2.5 border-b border-[#111] hover:bg-[#0d0d0d] transition-colors"
          >
            <div className="flex items-center gap-2 text-[11px] font-mono mb-1">
              <span className="font-bold text-[#38bdf8]">{p.author}</span>
              <span className="text-[#555]">@{p.handle.replace('.bsky.social', '')}</span>
              <span className="text-[#555] ml-auto">{timeAgo(p.createdAt)}</span>
            </div>
            <div className="text-[12px] text-[#ccc] font-mono leading-snug whitespace-pre-wrap">{p.text}</div>
          </a>
        ))}
        {posts.length === 0 && (
          <div className="text-center text-[#555] text-[12px] font-mono py-8">Waiting for posts from curated accounts…</div>
        )}
      </div>
    </div>
  );
}
