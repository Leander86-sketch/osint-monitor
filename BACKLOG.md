# ARGUS - Backlog

Event-centric redesign shipped 2026-06-09 (see git log). This tracks remaining work.

## Blocked on external
- **ACLED API data access** - account needs approval at developer.acleddata.com (read returns 403 until then). Layer is built + creds set; auto-fills when granted.

## Bucket 3 - new live map layers
- ISW / DeepStateMap frontline GeoJSON - control-of-terrain polygons (Ukraine). Unofficial endpoint, breakage/licensing risk. [M]
- AIS chokepoint shipping density - Hormuz/Suez/Bab-el-Mandab vessel counts + anomalies. Websocket awkward on in-memory Next; polling fallback. [L]
- NOTAM / airspace closures - leading indicator; needs ICAO/FAA key. [M]

## Bucket 4 - layout & UX (LOGGED, not started)
- Real hero->rail map-morph: map shrinks into a sticky strip on scroll so it stays visible. Fragile single-map height-tween; ship behind fixed-height fallback. [M]
- [x] Cmd-K command palette: fuzzy jump to a situation / toggle a layer. DONE 2026-06-10.
- [x] Kiosk / wall fullscreen mode (/kiosk): auto-rotating situation display. DONE 2026-06-10.
- Responsive / mobile + PWA install: phone layout; manifest already present. [L]
- Temporal scrubber: time-slider to replay last 24-72h of events on the map. [M]
- [x] Situation-level escalation alerts: severity-rise + velocity-surge detection, in-app strip. DONE 2026-06-10.

## Bucket 5 - architecture (in progress 2026-06-09)
- [x] Persistence: disk snapshot of news store; survives launchd restart, instant warm (data/news-snapshot.json, gitignored).
- [~] Auto-clustering Phase 2: better auto-titles + expanded LOCATION_MAP for new-flashpoint detection. TUNE while testing; watch for false clusters.
- [ ] Long-term history (weeks): keep > 1000 items / time-series for trends. Bigger effort.

## Parked
- F1 as a separate self-running stream-selector domain (NL/EN streams, language + resolution). Separate project.

## Done 2026-06-10 (also)
- Layer toggle tooltips (hover explains each of the 11 map layers + its source).
- Moved to argus.prototipo.nl; Ko-fi support + custom-monitor CTA in footer/README.

## Known minor
- CISA feed uses 2-digit year ("Jun 26") -> JS parses as 1926 -> sinks out of the window (harmless; cyber tangential).
- Per-article geo accuracy limited by LOCATION_MAP; improves with ACLED/FIRMS real coords (now partly added).
