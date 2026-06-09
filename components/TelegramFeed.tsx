'use client';

import { useState, useEffect, useCallback } from 'react';

interface TelegramMsg {
  id: string;
  channel: string;
  channelLabel: string;
  text: string;
  date: string;
  topic: string;
}

const TOPIC_COLORS: Record<string, string> = {
  breaking: '#dc2626',
  conflict: '#f97316',
  osint: '#06b6d4',
  ukraine: '#facc15',
  middleeast: '#e8760a',
  politics: '#8b5cf6',
  cyber: '#22d3ee',
};

const TOPICS = ['all', 'breaking', 'conflict', 'osint', 'ukraine', 'middleeast', 'cyber'];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`;
  return `${Math.floor(diff / 86400000)}d`;
}

export default function TelegramFeed() {
  const [messages, setMessages] = useState<TelegramMsg[]>([]);
  const [topic, setTopic] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/telegram?topic=${topic}&limit=30`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [topic]);

  useEffect(() => {
    setLoading(true);
    fetchMessages();
    const interval = setInterval(fetchMessages, 60000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1a1a1a] bg-[#080808]">
        <div className="flex items-center gap-2">
          <h2 className="text-[11px] font-mono font-bold text-[#ddd]2 uppercase tracking-[0.2em]">Telegram Intel</h2>
          <span className="text-[11px] text-[#ccc] font-mono">{messages.length}</span>
        </div>
      </div>

      {/* Topic filter */}
      <div className="flex gap-0.5 px-4 py-1.5 border-b border-[#111] bg-[#080808] overflow-x-auto">
        {TOPICS.map(t => (
          <button
            key={t}
            onClick={() => setTopic(t)}
            className={`text-[12px] px-2 py-0.5 font-mono uppercase tracking-wider rounded transition-colors ${
              topic === t
                ? 'bg-[#1a1a1a] text-[#e8760a]'
                : 'text-[#ccc] hover:text-[#ddd]2'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-3 h-3 border border-[#e8760a]/30 border-t-[#e8760a] rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-[11px] text-[#ccc] font-mono text-center py-8">
            No messages from Telegram channels
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className="px-4 py-2.5 border-b border-[#0d0d0d] hover:bg-[#0a0a0a] transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-[7px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider"
                  style={{
                    backgroundColor: `${TOPIC_COLORS[msg.topic] || '#333'}15`,
                    color: TOPIC_COLORS[msg.topic] || '#555',
                  }}
                >
                  {msg.topic}
                </span>
                <span className="text-[12px] text-[#e8760a]/60 font-mono font-bold">
                  @{msg.channel}
                </span>
                <span className="text-[12px] text-[#222] font-mono ml-auto">
                  {timeAgo(msg.date)}
                </span>
              </div>
              <p className="text-[11px] text-[#bbb] font-mono leading-relaxed line-clamp-3">
                {msg.text}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
