import fs from 'fs';
import path from 'path';
import { computeSituations } from './situations';
import { postTweet, hasXCreds } from './x-client';
import { postBsky, hasBskyCreds } from './bsky-client';

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
  posted: Record<string, { tweetId: string; at: number; text: string; bskyUri?: string }>;
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

// De kop die de escalatie veroorzaakte, ingekort tot iets dat in een tweet past.
function triggerLine(headline?: string): string {
  if (!headline) return '';
  let h = headline.replace(/\s+/g, ' ').trim().replace(/[.\s]+$/, '');
  if (h.length > 115) h = h.slice(0, 112).replace(/\s+\S*$/, '') + '…';
  return `\n${h}.`;
}

function formatAlert(e: Escalation): { text: string; reply: string } | null {
  const sit = computeSituations().find(s => s.slug === e.slug);
  const m = sit?.metadata as { articleCount?: number; corroboration?: string; sourceTierCounts?: { t1?: number } } | undefined;
  // Zonder de aanleiding is een alert een cijfermelding: "severity high → critical"
  // vertelt niet WAT er gebeurd is, en daar reageert niemand op. De kop staat in
  // de situatiedata; die hoort in de tweet.
  const trigger = triggerLine((sit as { latestHeadline?: string } | undefined)?.latestHeadline);
  const tier1 = m?.sourceTierCounts?.t1;
  const strength = m?.corroboration === 'A' ? 'strong' : m?.corroboration === 'B' ? 'moderate' : 'thin';
  const stats = m?.articleCount
    ? `\n${m.articleCount} reports in 24h${tier1 ? ` across ${tier1} tier-1 sources` : ''}, corroboration ${strength}.`
    : '';
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
  const text = `${head}${trigger}${stats}`.slice(0, 275);
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

export async function sendAlert(escalationId: string): Promise<{ tweetId: string; replyId: string; bskyUri?: string }> {
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

  // Bluesky krijgt dezelfde melding (24 sep 2026); de X-post staat al, dus een Bluesky-fout is niet fataal.
  let bskyUri: string | undefined;
  if (hasBskyCreds()) {
    try {
      const main = await postBsky(s.text);
      bskyUri = main.uri;
      try { await postBsky(s.reply, { replyTo: main, root: main }); } catch { /* link-reply optioneel */ }
    } catch (e) { console.error('[bsky] alert failed:', (e as Error).message); }
  }

  j.posted[escalationId] = { tweetId, at: Date.now(), text: s.text, bskyUri };
  saveJournal(j);
  return { tweetId, replyId, bskyUri };
}

export function skipAlert(escalationId: string): void {
  const j = loadJournal();
  j.skipped[escalationId] = Date.now();
  saveJournal(j);
}
