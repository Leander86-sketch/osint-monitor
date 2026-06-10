import fs from 'fs';
import path from 'path';
import { Situation } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'situation-state.json');
const ESCALATIONS_FILE = path.join(DATA_DIR, 'situation-escalations.json');

const SEV_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export interface Escalation {
  id: string;
  at: number;
  slug: string;
  title: string;
  kind: 'new' | 'severity_up' | 'surge';
  detail: string;
  severity: string;
}

interface SitState { severity: string; itemCount: number; firstSeen: number; }
type StateMap = Record<string, SitState>;

function load<T>(file: string, fallback: T): T {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function save(file: string, data: unknown) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data));
  } catch (e) { console.error('[situation-tracker] save failed', file, e); }
}

// Compares current situations against the last persisted state, records escalations.
// Deterministic timestamp via `now` (passed in) so behaviour is testable.
export function detectEscalations(situations: Situation[], now: number): Escalation[] {
  const prev = load<StateMap>(STATE_FILE, {});
  const events = load<Escalation[]>(ESCALATIONS_FILE, []);
  const fresh: Escalation[] = [];
  const next: StateMap = {};
  const coldStart = Object.keys(prev).length === 0; // first ever run: establish baseline silently

  for (const s of situations) {
    const count = s.itemIds?.length ?? 0;
    const old = prev[s.slug];
    next[s.slug] = { severity: s.severity, itemCount: count, firstSeen: old?.firstSeen ?? now };

    if (!old) {
      // New situation worth flagging only if it arrives hot (suppressed on cold start)
      if (!coldStart && (s.severity === 'critical' || s.severity === 'high' || s.status === 'breaking')) {
        fresh.push({ id: `${s.slug}-${now}-new`, at: now, slug: s.slug, title: s.title,
          kind: 'new', severity: s.severity, detail: `New ${s.severity} situation (${s.status})` });
      }
      continue;
    }
    // Severity rose (lower rank = more severe)
    if (SEV_RANK[s.severity] < SEV_RANK[old.severity]) {
      fresh.push({ id: `${s.slug}-${now}-sev`, at: now, slug: s.slug, title: s.title,
        kind: 'severity_up', severity: s.severity, detail: `Severity ${old.severity} → ${s.severity}` });
    }
    // Velocity surge: item count jumped meaningfully
    const grew = count - old.itemCount;
    if (grew >= Math.max(5, Math.ceil(old.itemCount * 0.5)) && count >= 8) {
      fresh.push({ id: `${s.slug}-${now}-surge`, at: now, slug: s.slug, title: s.title,
        kind: 'surge', severity: s.severity, detail: `+${grew} new reports (now ${count})` });
    }
  }

  save(STATE_FILE, next);
  if (fresh.length) {
    const merged = [...fresh, ...events].slice(0, 100);
    save(ESCALATIONS_FILE, merged);
  }
  return fresh;
}

export function getEscalations(limit = 40): Escalation[] {
  return load<Escalation[]>(ESCALATIONS_FILE, []).slice(0, limit);
}
