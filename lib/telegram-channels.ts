export interface TelegramChannel {
  handle: string;
  label: string;
  topic: 'conflict' | 'osint' | 'breaking' | 'politics' | 'middleeast' | 'cyber' | 'ukraine';
  tier: number;
  enabled: boolean;
  region: string;
}

export const TELEGRAM_CHANNELS: TelegramChannel[] = [
  // Tier 1 — Breaking news & top OSINT
  { handle: 'BNONews', label: 'BNO News', topic: 'breaking', tier: 1, enabled: true, region: 'global' },
  { handle: 'spectatorindex', label: 'The Spectator Index', topic: 'breaking', tier: 1, enabled: true, region: 'global' },
  { handle: 'AuroraIntel', label: 'Aurora Intel', topic: 'osint', tier: 1, enabled: true, region: 'global' },
  { handle: 'OSINTdefender', label: 'OSINT Defender', topic: 'osint', tier: 1, enabled: true, region: 'global' },
  { handle: 'ClashReport', label: 'Clash Report', topic: 'conflict', tier: 1, enabled: true, region: 'global' },
  { handle: 'nexaborta_live', label: 'NEXTA', topic: 'breaking', tier: 1, enabled: true, region: 'europe' },

  // Tier 2 — Regional conflict
  { handle: 'DeepStateUA', label: 'DeepState Ukraine', topic: 'ukraine', tier: 2, enabled: true, region: 'europe' },
  { handle: 'laborofdefense', label: 'The Defender Dome', topic: 'middleeast', tier: 2, enabled: true, region: 'mideast' },
  { handle: 'MiddleEastSpectator', label: 'ME Spectator', topic: 'middleeast', tier: 2, enabled: true, region: 'mideast' },
  { handle: 'AbuAliEnglish', label: 'Abu Ali Express EN', topic: 'middleeast', tier: 2, enabled: true, region: 'mideast' },

  // Tier 2 — OSINT community
  { handle: 'belaborlingcat', label: 'Bellingcat', topic: 'osint', tier: 2, enabled: true, region: 'global' },
  { handle: 'DDGeopolitics', label: 'DD Geopolitics', topic: 'politics', tier: 2, enabled: true, region: 'global' },

  // Tier 3 — Cyber
  { handle: 'darkwebinformer', label: 'Dark Web Informer', topic: 'cyber', tier: 3, enabled: true, region: 'global' },
];
