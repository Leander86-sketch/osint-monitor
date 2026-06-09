import { NextResponse } from 'next/server';
import { TELEGRAM_CHANNELS } from '@/lib/telegram-channels';
import { TelegramMessage } from '@/lib/types';

interface TelegramCache {
  messages: TelegramMessage[];
  fetchedAt: number;
}

const g = globalThis as unknown as { __tgCache?: TelegramCache };
const CACHE_TTL = 5 * 60 * 1000;

async function scrapeChannel(channel: typeof TELEGRAM_CHANNELS[0]): Promise<TelegramMessage[]> {
  try {
    const res = await fetch(`https://t.me/s/${channel.handle}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const html = await res.text();

    const messages: TelegramMessage[] = [];

    // Extract messages from the HTML
    // Each message is in a div.tgme_widget_message_wrap
    const msgRegex = /<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<\/div>)?\s*<div class="tgme_widget_message_footer/g;
    const dateRegex = /<time[^>]*datetime="([^"]+)"/g;
    
    // Simpler approach: extract text blocks and dates
    const textBlocks: string[] = [];
    const dates: string[] = [];
    
    let match;
    // Get message texts
    const textRegex = /<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
    while ((match = textRegex.exec(html)) !== null) {
      // Strip HTML tags, decode entities
      let text = match[1]
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (text.length > 10) {
        textBlocks.push(text.slice(0, 500));
      }
    }
    
    // Get dates
    while ((match = dateRegex.exec(html)) !== null) {
      dates.push(match[1]);
    }

    // Pair texts with dates (they appear in order)
    const count = Math.min(textBlocks.length, dates.length, 15);
    for (let i = 0; i < count; i++) {
      messages.push({
        id: `tg-${channel.handle}-${i}-${Date.now().toString(36)}`,
        channel: channel.handle,
        channelLabel: channel.label,
        text: textBlocks[i],
        date: dates[i] || new Date().toISOString(),
        topic: channel.topic,
      });
    }

    return messages;
  } catch (err) {
    console.error(`[TG] Error scraping ${channel.handle}:`, err);
    return [];
  }
}

async function fetchAllChannels(): Promise<TelegramMessage[]> {
  const enabled = TELEGRAM_CHANNELS.filter(c => c.enabled);
  
  // Fetch in batches of 4 to avoid overwhelming
  const all: TelegramMessage[] = [];
  for (let i = 0; i < enabled.length; i += 4) {
    const batch = enabled.slice(i, i + 4);
    const results = await Promise.allSettled(batch.map(c => scrapeChannel(c)));
    for (const r of results) {
      if (r.status === 'fulfilled') all.push(...r.value);
    }
  }
  
  all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // Deduplicate by text similarity
  const seen = new Set<string>();
  return all.filter(msg => {
    const key = msg.text.slice(0, 80).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 200);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const topic = searchParams.get('topic');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

    // Check cache
    if (g.__tgCache && Date.now() - g.__tgCache.fetchedAt < CACHE_TTL) {
      let msgs = g.__tgCache.messages;
      if (topic && topic !== 'all') msgs = msgs.filter(m => m.topic === topic);
      return NextResponse.json({ messages: msgs.slice(0, limit), cached: true, total: msgs.length });
    }

    const messages = await fetchAllChannels();
    g.__tgCache = { messages, fetchedAt: Date.now() };

    let filtered = messages;
    if (topic && topic !== 'all') filtered = messages.filter(m => m.topic === topic);

    return NextResponse.json({ messages: filtered.slice(0, limit), cached: false, total: filtered.length });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}
