import fs from 'fs';
import path from 'path';
import { computeSituations } from './situations';
import { postTweet, hasXCreds } from './x-client';

// Escalation -> alert tweet pipeline for @ArgusDashboard.
// Phase 1 is semi-manual: the route serves SUGGESTIONS; nothing is posted
// without an explicit authorized send. Day budget capped; link goes in the
// reply (links in the main post kill reach); every send verifies the tweet id.

const SITE = 'https://argus.prototipo.nl';
const JOURNAL = path.join(process.cwd(), 'data', 'x-alerts-journal.json');
const DAY_BUDGET = 5;
const MAX_AGE_MS = 6 * 3600_000; // only suggest escalations from the last 6h

export interface AlertSuggestion {
  escalationId: string;
  slug: string;
  text: string;
  reply: string;
  detectedAt: number;
}

interface Journal {
  posted: Record<string, { tweetId: string; at: number; text: string }>;
  skipped: Record<string, number>;
}

interface Escalation { id: string; at: number; slug: string; title: string; kind: string; severity?: string; detail: string }

function loadJournal(): Journal {
  try { return JSON.parse(fs.readFileSync(JOURNAL, 'utf8')); } catch { return { posted: {}, skipped: {} }; }
}
function saveJournal(j: Journal): void {
  fs.writeFileSync(JOURNAL, JSON.stringify(j, null, 2));
}

function readEscalations(): Escalation[] {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'situation-escalations.json'), 'utf8'));
    return Array.isArray(d) ? d : d.escalations || [];
  } catch { return []; }
}

export function postedToday(j?: Journal): number {
  const jj = j || loadJournal();
  const dayStart = new Date().setHours(0, 0, 0, 0);
  return Object.values(jj.posted).filter(p => p.at >= dayStart).length;
}

function formatAlert(e: Escalation): { text: string; reply: string } | null {
  const sit = computeSituations().find(s => s.slug === e.slug);
  const stats = sit ? ` ${sit.metadata.articleCount} reports tracked, sourcing ${sit.metadata.corroboration === 'A' ? 'strong' : sit.metadata.corroboration === 'B' ? 'moderate' : 'thin'}.` : '';
  let head: string;
  if (e.kind === 'severity_up') {
    head = `⚠ ${e.title.toUpperCase()} — ${e.detail.toLowerCase()}.`;
  } else if (e.kind === 'velocity_surge' || e.kind === 'surge') {
    head = `⚠ ${e.title.toUpperCase()} — report volume surging.`;
  } else if (e.kind === 'new') {
    head = `◉ NEW SITUATION — ${e.title}.`;
  } else {
    head = `⚠ ${e.title.toUpperCase()} — ${e.detail}.`;
  }
  const text = `${head}${stats}`.slice(0, 275);
  const reply = `Live dossier → ${SITE}/?sit=${e.slug}`;
  return { text, reply };
}

export function buildSuggestions(): { budgetLeft: number; suggestions: AlertSuggestion[] } {
  const j = loadJournal();
  const budgetLeft = Math.max(0, DAY_BUDGET - postedToday(j));
  const cutoff = Date.now() - MAX_AGE_MS;
  const seenSlug = new Set<string>();
  const suggestions: AlertSuggestion[] = [];
  for (const e of readEscalations()) {
    if (e.at < cutoff) continue;
    if (j.posted[e.id] || j.skipped[e.id]) continue;
    if (seenSlug.has(e.slug)) continue; // one suggestion per situation
    const f = formatAlert(e);
    if (!f) continue;
    seenSlug.add(e.slug);
    suggestions.push({ escalationId: e.id, slug: e.slug, text: f.text, reply: f.reply, detectedAt: e.at });
    if (suggestions.length >= 8) break;
  }
  return { budgetLeft, suggestions };
}

export async function sendAlert(escalationId: string): Promise<{ tweetId: string; replyId: string }> {
  if (!hasXCreds()) throw new Error('X credentials not configured');
  const j = loadJournal();
  if (j.posted[escalationId]) throw new Error('already posted');
  if (postedToday(j) >= DAY_BUDGET) throw new Error('day budget reached');
  const { suggestions } = buildSuggestions();
  const s = suggestions.find(x => x.escalationId === escalationId);
  if (!s) throw new Error('suggestion not found (stale or already handled)');

  const tweetId = await postTweet(s.text);
  let replyId = '';
  try {
    replyId = await postTweet(s.reply, tweetId);
  } catch { /* main alert stands even if the link reply fails */ }

  j.posted[escalationId] = { tweetId, at: Date.now(), text: s.text };
  saveJournal(j);
  return { tweetId, replyId };
}

export function skipAlert(escalationId: string): void {
  const j = loadJournal();
  j.skipped[escalationId] = Date.now();
  saveJournal(j);
}
