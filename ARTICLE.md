# I Built a Real-Time Global Intelligence Dashboard on a Mac Mini in My Apartment. Here's Everything It Monitors.

Most people consume global news through algorithm-curated feeds designed to maximize engagement, not accuracy. CNN shows you what gets clicks. Twitter shows you what gets rage. Nobody shows you the raw signal — tiered by reliability, cross-referenced across 120 sources, with nuclear facilities and military bases plotted on a live map.

So I built it myself.

It's called ARGUS. It runs on a Mac Mini in my apartment in the Netherlands. And it monitors the entire world in real time.

---

## The Problem With Every Existing OSINT Dashboard

I spent weeks evaluating every global monitoring tool I could find. The pattern was always the same:

- **Paywalled.** The serious ones (Janes, Recorded Future, Dataminr) cost $10,000-$50,000/year. Built for defense contractors, not independent analysts.
- **US-centric.** Most dashboards treat "world news" as "things that affect America." European, African, and Asian coverage is an afterthought.
- **No source reliability scoring.** Reuters and RT appear side by side with zero distinction. A wire service report and a state propaganda outlet get equal weight.
- **No raw feed access.** Everything is pre-filtered, pre-curated, pre-interpreted. You never see the unprocessed signal.

I wanted one thing: **"What's happening in the world right now, and how much should I trust the source telling me?"**

No subscriptions. No vendor lock-in. No editorial filter between me and the data.

---

## 120 RSS Feeds With 3-Tier Reliability Scoring

ARGUS ingests 120 RSS feeds from every continent, organized into a three-tier reliability system I built from scratch.

### Tier 1 — Wire Services & Major Broadcasters (Reliability: 80-97)

These are ground truth. When they report something, it happened.

Reuters (97), Associated Press (96), BBC World (95), BBC Middle East (95), BBC Europe (95), BBC Asia (95), BBC Africa (95), Al Jazeera (82), France 24 (88), Deutsche Welle (88), CNN World (80), NPR (90), PBS NewsHour (92), Le Monde (90), The Guardian (88), ABC Australia (90), Tagesschau (92), Haaretz (85), Wall Street Journal (90).

### Tier 2 — Regional Specialists & Analysis (Reliability: 65-90)

Deep expertise in specific regions or domains. Essential for context.

**Ukraine/Russia:** Kyiv Independent (80), Ukrinform (72), Moscow Times (75), Meduza (78), Novaya Gazeta (78)
**Middle East:** Times of Israel (78), Middle East Eye (75), Arab News (70), Iran International (68), Rudaw (65)
**Asia-Pacific:** South China Morning Post (78), The Diplomat (82), Nikkei Asia (85), Yonhap (80), CNA Singapore (82)
**Africa:** Africanews (75), News24 SA (72), Premium Times (70), Jeune Afrique (75)
**Defense:** Defense One (82), Defense News (82), The War Zone (78), USNI News (80), Naval News (78), Military Times (78)
**Think Tanks:** Foreign Policy (88), CSIS (88), Brookings (88), RAND (90), Carnegie (88), Atlantic Council (85), Chatham House (88), RUSI (85), War on the Rocks (82)
**Nuclear & Arms:** Arms Control Association (90), Bulletin of Atomic Scientists (92), NTI (90), FAS (88)
**Crisis:** IAEA (95), WHO (95), UNHCR (92), UN News (90), ReliefWeb (88)
**Cyber:** Bellingcat (85), Krebs on Security (88), The Hacker News (78), BleepingComputer (78)

### Tier 3 — Niche, State Media & Blogs (Reliability: 30-70)

You need to hear what they're saying. You also need to know they're state media.

TASS (35), RT (30), Xinhua (50), Fox News World (60), various regional outlets.

**Why include sources with reliability scores of 30?** Because what Russian state media chooses to report — and how they frame it — is intelligence in itself. The absence of coverage is a signal. The framing is a signal. You just need to see it labeled clearly.

Every article in the ARGUS feed shows its tier badge: **T1** (green), **T2** (gold), **T3** (grey). At a glance, you know exactly how much weight to give each source. Filter by tier when you need signal over noise.

---

## Telegram OSINT — The Real-Time Layer

RSS feeds are reliable but slow. Most outlets publish 5-30 minutes after an event. The real breaking intelligence hits Telegram first.

ARGUS scrapes 13 public OSINT Telegram channels in real time — no API keys needed, no Telegram account required, no MTProto protocol complexity. Just direct web scraping of public channel previews.

**Breaking & Global:**
- BNO News — fastest breaking news alerts globally
- The Spectator Index — geopolitical developments as they happen
- NEXTA — Eastern European breaking news

**Verified OSINT:**
- Aurora Intel — military movements and verified open-source intelligence
- OSINT Defender — conflict tracking with source verification
- Bellingcat — investigative open-source intelligence

**Conflict-Specific:**
- Clash Report — global conflict monitoring
- DeepState UA — Ukraine front line mapping and updates
- Middle East Spectator — regional conflict coverage
- Abu Ali Express EN — Middle Eastern conflict intelligence

**Cyber Threats:**
- Dark Web Informer — data breaches, ransomware, threat actor activity

Messages are parsed, timestamped, deduplicated, and filterable by topic: breaking, conflict, OSINT, Ukraine, Middle East, cyber.

---

## The Map — Nuclear Facilities, Military Bases, and Undersea Cables

The interactive map runs on Leaflet with a dark CartoDB basemap. Real-time news events appear as color-coded dots: red for military, blue for diplomatic, green for humanitarian, gold for protests. Dot size scales with event severity.

But the real power is in the three toggleable intelligence layers:

### Nuclear Facilities — 65+ Sites Worldwide

Every active nuclear reactor, weapons production facility, uranium enrichment plant, research reactor, and nuclear waste site on the planet.

**Weapons states:** Los Alamos, Sandia, Pantex, Oak Ridge, Y-12 (USA). Sarov, Mayak, Seversk, Novaya Zemlya (Russia). Lop Nor, Lanzhou (China). AWE Aldermaston (UK). La Hague, Tricastin (France). Kahuta, Khushab (Pakistan). Dimona (Israel). Yongbyon, Punggye-ri (North Korea). Natanz, Fordow, Isfahan (Iran).

**Conflict-adjacent reactors:** Zaporizhzhia NPP (Ukraine, largest in Europe, on the front line). Kursk NPP (Russia, near Ukrainian incursion zone). Bushehr (Iran, potential strike target). Barakah (UAE, first Arab nuclear plant). Akkuyu (Turkey, under construction by Rosatom).

Click any facility to see its type, status, and country.

### Military Bases — 45+ Major Global Installations

US global force projection mapped: Ramstein (Germany), Incirlik (Turkey), Al Udeid (Qatar), Al Dhafra (UAE), Camp Humphreys (South Korea), Kadena (Japan), Yokosuka (Japan), Diego Garcia (Indian Ocean), Guam, Pearl Harbor, Norfolk, Camp Lemonnier (Djibouti), Rota (Spain), Sigonella (Italy), Thule (Greenland), Pine Gap (Australia).

Russian naval and air power: Sevastopol (Crimea), Tartus (Syria), Khmeimim (Syria), Murmansk (Northern Fleet), Vladivostok (Pacific Fleet), Kaliningrad, Engels Air Base.

Chinese power projection: Yulin Naval Base (Hainan), Djibouti Support Base, and three artificial island bases in the South China Sea — Fiery Cross Reef, Subi Reef, Mischief Reef.

NATO missile defense: Redzikowo (Poland), Deveselu (Romania), Ämari (Estonia).

Middle East: Prince Sultan Air Base (Saudi Arabia), Nevatim and Hatzerim (Israel).

### Undersea Cables — 25+ Major Routes

The invisible backbone of the global internet, rendered as dashed cyan lines across every ocean.

**Trans-Atlantic:** MAREA (Microsoft/Meta, 6,600 km), Grace Hopper (Google, 6,250 km), Dunant (Google, 6,400 km), Amitié (Google/Meta/Vodafone, 6,800 km), Havfrue (Aqua Comms/Google, 7,200 km).

**Trans-Pacific:** FASTER (Google/KDDI/SingTel, 11,600 km), Japan-US Cable (NTT/KDDI, 21,000 km), PLCN (Google/Meta, 12,800 km), Curie (Google, 10,476 km).

**Africa & Global:** 2Africa (Meta, 45,000 km — the longest submarine cable ever), Equiano (Google, 12,000 km).

**Strategic chokepoints:** Cables through the Strait of Hormuz and Strait of Malacca — where a single act of sabotage could disrupt billions of dollars in data traffic.

Why map cables? Because in modern warfare, undersea cable cutting is a real and growing threat. Russia's Yantar spy ship has been tracked near cable routes. China controls landing points for dozens of cables across Asia. Understanding cable geography is understanding digital vulnerability.

---

## Market Intelligence

A continuous ticker bar shows real-time cryptocurrency prices with 24-hour change percentages: Bitcoin, Ethereum, and the top 5 by market cap, plus total crypto market capitalization. Data from CoinGecko API, refreshed every 5 minutes.

Why crypto on an OSINT dashboard? Because cryptocurrency markets react to geopolitical events faster than any other asset class. Iranian missile launches move Bitcoin before they move oil. Sanctions announcements move stablecoins before they move forex.

---

## Watchword Alert System

Configure keyword alerts for topics you track: ceasefire, nuclear, Taiwan, sanctions, cyberattack, or any custom term.

ARGUS monitors every incoming article across all 120 feeds for your watchwords. Each alert shows a live trigger count, and clicking any watchword instantly filters the entire feed to matching articles only.

Default watchwords include: ceasefire, airstrike, missile, nuclear, Ukraine, Gaza, Iran, Taiwan, sanctions, tariff, cyberattack.

---

## The Tech Stack

Everything runs on a single Mac Mini M2 in an apartment in the Netherlands.

- **Next.js 16** (App Router) — full-stack React framework
- **Leaflet** — interactive mapping with CartoDB dark tiles
- **PM2** — Node.js process manager for zero-downtime
- **Cloudflare Tunnel** — secure public access without port forwarding
- **CoinGecko API** — real-time crypto market data
- **Direct web scraping** — Telegram channel monitoring via t.me/s/
- **RSS Parser** — 120 feeds with batched parallel fetching
- **DALL-E 3** — AI-generated daily news paintings (via companion agent)

No Docker. No Kubernetes. No AWS bill. No vendor dependencies. Total infrastructure cost: the electricity bill for a Mac Mini.

---

## Why Self-Host Your Intelligence Feed?

Because the moment you depend on someone else's intelligence feed, you've introduced a filter you can't see and can't control.

ARGUS shows me TASS and Reuters side by side — clearly labeled, clearly scored. It maps Chinese military installations next to American ones. It tracks Iranian enrichment facilities and Israeli weapons sites on the same map. It doesn't decide what's important. I do.

Every curated dashboard makes editorial choices about what you see. Those choices reflect someone else's priorities, someone else's threat model, someone else's politics.

Raw signal with clear reliability scoring beats curated narrative every time.

---

## Try It

ARGUS is live at **argus.prototipo.nl**

Built by Leander Bloot (@LeanderLBB)
Powered by a Mac Mini and stubbornness.
