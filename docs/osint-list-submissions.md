# ARGUS — aanmeldingen bij OSINT-lijsten (voorbereid 24 sep 2026, wacht op Go van Leander)

## 1. awesome-osint (github.com/jivoi/awesome-osint) — PR
Regels: één PR per toevoeging, alfabetisch, formaat `[Naam](link) - info.`, zelfpromotie melden. Precedent: World Monitor (PR #840, merged 2026-03-19), Pharos AI. Acceptatie ~18 van 100 PR's.
Sectie `## Geospatial Research and Mapping Tools`, tussen `ArcGIS` en `Atlas`:
```
* [ARGUS](https://argus.prototipo.nl) - Free, no-login OSINT dashboard with a live conflict map (ADS-B flights incl. notable military aircraft, ships at chokepoints, NASA FIRMS thermal detections, DeepState frontline, NGA navigational warnings, Ukraine air-raid alerts, earthquakes, Cloudflare outages), 165 news feeds grouped by viewpoint, 46 live video channels, per-situation pages and a European hybrid-warfare dossier.
```
PR-titel: `Add ARGUS to Geospatial Research and Mapping Tools`
PR-tekst: Adds ARGUS (https://argus.prototipo.nl) to Geospatial Research and Mapping Tools, alphabetically after ArcGIS. Disclosure: I am the author (solo project, Netherlands). Free, no login, no tracking; hosted, not open source. Comparable to the existing World Monitor / Liveuamap entries.

## 2. OSINT Framework (github.com/lockfale/OSINT-Framework) — PR op `public/arf.json` + issue
Node: Geolocation Tools / Maps → Map Reporting Tools (naast Beholder, LiveUaMap). 64 open PR's, traag; doe PR én issue.
```json
{"name":"ARGUS","type":"url","url":"https://argus.prototipo.nl","description":"Free, no-login OSINT dashboard: live conflict map (ADS-B flights incl. notable military aircraft, ships at chokepoints, NASA FIRMS thermal detections, DeepState frontline, NGA navigational warnings, Ukraine air-raid alerts, earthquakes, Cloudflare outages), 165 tiered news feeds grouped by viewpoint (West/Russia/Ukraine/Middle East/Asia), 46 live video channels, per-situation pages, national terror threat levels and a European hybrid-warfare dossier built on Leiden University's CC BY dataset.","status":"live","pricing":"free","bestFor":"Real-time situational awareness of conflicts and hybrid threats from one map plus multi-viewpoint news","input":"None (browse map, situation pages, feeds)","output":"Live map layers, news feed timeline, video streams, situation dossiers","opsec":"passive","opsecNote":"No login, no tracking; reads public feeds only.","localInstall":false,"googleDork":false,"registration":false,"editUrl":false,"api":false,"invitationOnly":false,"deprecated":false}
```
Titel: `Add ARGUS to Geolocation Tools / Maps > Map Reporting Tools`. Tekst: zelfde disclosure + de JSON.

## 3. Bellingcat Online Investigation Toolkit — Google Form https://forms.gle/dZvsJzuEjTNjJ9HWA
Blokkade: "Please do not suggest your own tools." → alleen via een echte gebruiker. Categorie Conflict (nu: ACLED, LiveUAMap, OSMP, EJAtlas). Conceptantwoorden voor een derde:
- Why relevant: I use it as a single first screen when something breaks: ADS-B flights (flagged military aircraft), ships at chokepoints, NASA FIRMS fire detections, the DeepState frontline, NGA navigational warnings, Ukraine air-raid alerts and earthquakes on one map, next to 165 news feeds sorted by viewpoint and 46 live video channels. Per-situation pages (e.g. /s/europe-airspace-drones) collect the relevant layers and sources for one event.
- Description: ARGUS is a free, login-free OSINT dashboard built by a single developer in the Netherlands. It combines a live conflict map, tiered multi-viewpoint news feeds, live video channels, national terror threat levels, situation pages and a hybrid-warfare dossier for Europe based on Leiden University's CC BY dataset. It aggregates public feeds and does not host original data.
- Cost: Free, no paid tier, no ads, no tracking. Difficulty: 1. Requirements: a modern browser, no account.
- Limitations: aggregator only (upstream reliability; DeepState is a Ukrainian source); single self-hosted machine, occasional downtime; no archive/export; closed source.
- Ethical: near-real-time aircraft/vessel positions — consider operational risk before republishing; viewpoint grouping surfaces state-aligned media deliberately.
- Provider: Leander Bloot, independent developer, Netherlands (prototipo.nl). Submitter adds: "I am not affiliated with the tool."

## Overige (mechanisme)
- cipher387/osint_stuff_tool_collection (8,9k sterren; secties Politics/conflicts, aviation, maritime) — PR op README.
- OSINT4ALL — formulier https://osint4all.com/submit-a-tool/ (zelfaanmelding welkom).
- osintelligence.net (repo intelseclab/osintelligence) — PR volgens CONTRIBUTING.
- tools.osintnewsletter.com — PR volgens submission guide (URL gaf 404 via fetch; in browser nakijken).
- Product Hunt — eigen account, launch 12:01 PT; bereik, geen OSINT-lijst.
- Hue-Jhan/OSINT-War-Room — issue met "similar tools".
