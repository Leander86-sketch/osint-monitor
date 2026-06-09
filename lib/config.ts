import { FeedConfig, AnchorSituation } from './types';

// ============================================================
// RSS FEEDS — 120+ sources with tiering & reliability scoring
// Tier 1: Major wire services & broadcasters (highest priority)
// Tier 2: Regional quality outlets
// Tier 3: Niche, blogs, think tanks
// ============================================================

export const RSS_FEEDS: FeedConfig[] = [
  // ===================== TIER 1 — WIRE SERVICES & GLOBAL BROADCASTERS =====================
  // These are fetched first and have highest reliability
  { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'world', enabled: true, tier: 1, reliability: 95, region: 'global' },
  { name: 'Reuters World', url: 'https://news.google.com/rss/search?q=site:reuters.com+world&hl=en', category: 'world', enabled: true, tier: 1, reliability: 97, region: 'global' },
  { name: 'AP News', url: 'https://news.google.com/rss/search?q=site:apnews.com+world&hl=en', category: 'world', enabled: true, tier: 1, reliability: 96, region: 'global' },
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'world', enabled: true, tier: 1, reliability: 82, region: 'global' },
  { name: 'France 24', url: 'https://www.france24.com/en/rss', category: 'world', enabled: true, tier: 1, reliability: 88, region: 'global' },
  { name: 'DW News', url: 'https://rss.dw.com/rdf/rss-en-world', category: 'world', enabled: true, tier: 1, reliability: 88, region: 'global' },
  { name: 'CNN World', url: 'https://rss.cnn.com/rss/edition_world.rss', category: 'world', enabled: true, tier: 1, reliability: 80, region: 'global' },

  // ===================== TIER 1 — MIDDLE EAST =====================
  { name: 'BBC Middle East', url: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml', category: 'mideast', enabled: true, tier: 1, reliability: 95, region: 'mideast' },
  { name: 'Al Arabiya', url: 'https://www.alarabiya.net/tools/rss', category: 'mideast', enabled: true, tier: 1, reliability: 75, region: 'mideast' },
  { name: 'Times of Israel', url: 'https://www.timesofisrael.com/feed/', category: 'mideast', enabled: true, tier: 1, reliability: 78, region: 'mideast' },
  { name: 'Middle East Eye', url: 'https://www.middleeasteye.net/rss', category: 'mideast', enabled: true, tier: 2, reliability: 75, region: 'mideast' },
  { name: 'Haaretz', url: 'https://www.haaretz.com/srv/haaretz-latest-rss', category: 'mideast', enabled: true, tier: 1, reliability: 85, region: 'mideast' },
  { name: 'Arab News', url: 'https://www.arabnews.com/rss.xml', category: 'mideast', enabled: true, tier: 2, reliability: 70, region: 'mideast' },
  { name: 'The National UAE', url: 'https://www.thenationalnews.com/rss', category: 'mideast', enabled: true, tier: 2, reliability: 72, region: 'mideast' },
  { name: 'Iran International', url: 'https://news.google.com/rss/search?q=site:iranintl.com&hl=en', category: 'mideast', enabled: true, tier: 2, reliability: 68, region: 'mideast' },
  { name: 'Rudaw', url: 'https://www.rudaw.net/english/rss', category: 'mideast', enabled: true, tier: 2, reliability: 65, region: 'mideast' },

  // ===================== TIER 1 — EUROPE / UKRAINE / NATO =====================
  { name: 'BBC Europe', url: 'https://feeds.bbci.co.uk/news/world/europe/rss.xml', category: 'europe', enabled: true, tier: 1, reliability: 95, region: 'europe' },
  { name: 'Kyiv Independent', url: 'https://kyivindependent.com/feed/', category: 'europe', enabled: true, tier: 1, reliability: 80, region: 'europe' },
  { name: 'Ukrinform', url: 'https://www.ukrinform.net/rss/block-lastnews', category: 'europe', enabled: true, tier: 2, reliability: 72, region: 'europe' },
  { name: 'Guardian World', url: 'https://www.theguardian.com/world/rss', category: 'europe', enabled: true, tier: 1, reliability: 88, region: 'europe' },
  { name: 'EuroNews', url: 'https://www.euronews.com/rss', category: 'europe', enabled: true, tier: 2, reliability: 78, region: 'europe' },
  { name: 'Le Monde', url: 'https://www.lemonde.fr/en/rss/une.xml', category: 'europe', enabled: true, tier: 1, reliability: 90, region: 'europe' },
  { name: 'Der Spiegel', url: 'https://www.spiegel.de/international/index.rss', category: 'europe', enabled: true, tier: 1, reliability: 88, region: 'europe' },
  { name: 'Moscow Times', url: 'https://www.themoscowtimes.com/rss/news', category: 'europe', enabled: true, tier: 2, reliability: 75, region: 'europe' },
  { name: 'Meduza', url: 'https://meduza.io/rss/en/all', category: 'europe', enabled: true, tier: 2, reliability: 78, region: 'europe' },
  { name: 'NOS Nieuws', url: 'https://feeds.nos.nl/nosnieuwsalgemeen', category: 'europe', enabled: true, tier: 2, reliability: 90, region: 'europe' },
  { name: 'NRC', url: 'https://www.nrc.nl/rss/', category: 'europe', enabled: true, tier: 2, reliability: 88, region: 'europe' },
  { name: 'Tagesschau', url: 'https://www.tagesschau.de/xml/rss2', category: 'europe', enabled: true, tier: 1, reliability: 92, region: 'europe' },
  { name: 'BBC Turkce', url: 'https://feeds.bbci.co.uk/turkce/rss.xml', category: 'europe', enabled: true, tier: 2, reliability: 90, region: 'europe' },
  { name: 'TVN24', url: 'https://tvn24.pl/najnowsze.xml', category: 'europe', enabled: true, tier: 2, reliability: 80, region: 'europe' },

  // ===================== TIER 1 — ASIA-PACIFIC =====================
  { name: 'BBC Asia', url: 'https://feeds.bbci.co.uk/news/world/asia/rss.xml', category: 'asia', enabled: true, tier: 1, reliability: 95, region: 'asia' },
  { name: 'SCMP', url: 'https://www.scmp.com/rss/91/feed', category: 'asia', enabled: true, tier: 1, reliability: 78, region: 'asia' },
  { name: 'The Diplomat', url: 'https://thediplomat.com/feed/', category: 'asia', enabled: true, tier: 2, reliability: 82, region: 'asia' },
  { name: 'Nikkei Asia', url: 'https://news.google.com/rss/search?q=site:asia.nikkei.com&hl=en', category: 'asia', enabled: true, tier: 1, reliability: 85, region: 'asia' },
  { name: 'Japan Today', url: 'https://japantoday.com/feed', category: 'asia', enabled: true, tier: 2, reliability: 72, region: 'asia' },
  { name: 'Yonhap News', url: 'https://en.yna.co.kr/RSS/news.xml', category: 'asia', enabled: true, tier: 2, reliability: 80, region: 'asia' },
  { name: 'The Hindu', url: 'https://www.thehindu.com/news/international/feeder/default.rss', category: 'asia', enabled: true, tier: 2, reliability: 80, region: 'asia' },
  { name: 'NDTV', url: 'https://feeds.feedburner.com/ndtvnews-world-news', category: 'asia', enabled: true, tier: 2, reliability: 75, region: 'asia' },
  { name: 'CNA Singapore', url: 'https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml', category: 'asia', enabled: true, tier: 2, reliability: 82, region: 'asia' },
  { name: 'Bangkok Post', url: 'https://www.bangkokpost.com/rss/data/topstories.xml', category: 'asia', enabled: true, tier: 2, reliability: 72, region: 'asia' },
  { name: 'Xinhua', url: 'https://news.google.com/rss/search?q=site:xinhuanet.com+english&hl=en', category: 'asia', enabled: true, tier: 2, reliability: 50, region: 'asia' },
  { name: 'ABC Australia', url: 'https://www.abc.net.au/news/feed/2942460/rss.xml', category: 'asia', enabled: true, tier: 1, reliability: 90, region: 'asia' },

  // ===================== TIER 1 — AFRICA =====================
  { name: 'BBC Africa', url: 'https://feeds.bbci.co.uk/news/world/africa/rss.xml', category: 'africa', enabled: true, tier: 1, reliability: 95, region: 'africa' },
  { name: 'Africanews', url: 'https://www.africanews.com/feed/', category: 'africa', enabled: true, tier: 2, reliability: 75, region: 'africa' },
  { name: 'News24 SA', url: 'https://feeds.news24.com/articles/news24/TopStories/rss', category: 'africa', enabled: true, tier: 2, reliability: 72, region: 'africa' },
  { name: 'Premium Times NG', url: 'https://www.premiumtimesng.com/feed', category: 'africa', enabled: true, tier: 2, reliability: 70, region: 'africa' },
  { name: 'Daily Trust', url: 'https://dailytrust.com/feed/', category: 'africa', enabled: true, tier: 3, reliability: 65, region: 'africa' },
  { name: 'Jeune Afrique', url: 'https://www.jeuneafrique.com/feed/', category: 'africa', enabled: true, tier: 2, reliability: 75, region: 'africa' },

  // ===================== TIER 1 — AMERICAS =====================
  { name: 'BBC Latin America', url: 'https://feeds.bbci.co.uk/news/world/latin_america/rss.xml', category: 'americas', enabled: true, tier: 1, reliability: 95, region: 'americas' },
  { name: 'NPR News', url: 'https://feeds.npr.org/1001/rss.xml', category: 'americas', enabled: true, tier: 1, reliability: 90, region: 'americas' },
  { name: 'PBS NewsHour', url: 'https://www.pbs.org/newshour/feeds/rss/headlines', category: 'americas', enabled: true, tier: 1, reliability: 92, region: 'americas' },
  { name: 'Politico', url: 'https://rss.politico.com/politics-news.xml', category: 'americas', enabled: true, tier: 1, reliability: 82, region: 'americas' },
  { name: 'The Hill', url: 'https://thehill.com/feed/', category: 'americas', enabled: true, tier: 2, reliability: 78, region: 'americas' },
  { name: 'InSight Crime', url: 'https://insightcrime.org/feed/', category: 'americas', enabled: true, tier: 2, reliability: 80, region: 'americas' },

  // ===================== TIER 1 — MARKETS & FINANCE =====================
  { name: 'CNBC World', url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100727362', category: 'markets', enabled: true, tier: 1, reliability: 85, region: 'global' },
  { name: 'MarketWatch', url: 'https://feeds.marketwatch.com/marketwatch/topstories/', category: 'markets', enabled: true, tier: 1, reliability: 82, region: 'global' },
  { name: 'Financial Times', url: 'https://news.google.com/rss/search?q=site:ft.com+world&hl=en', category: 'markets', enabled: true, tier: 1, reliability: 92, region: 'global' },
  { name: 'Yahoo Finance', url: 'https://finance.yahoo.com/news/rssindex', category: 'markets', enabled: true, tier: 2, reliability: 75, region: 'global' },
  { name: 'Reuters Business', url: 'https://news.google.com/rss/search?q=site:reuters.com+business&hl=en', category: 'markets', enabled: true, tier: 1, reliability: 95, region: 'global' },

  // ===================== TIER 2 — DEFENSE & MILITARY =====================
  { name: 'Defense One', url: 'https://www.defenseone.com/rss/', category: 'defense', enabled: true, tier: 2, reliability: 82, region: 'global' },
  { name: 'The War Zone', url: 'https://www.thedrive.com/the-war-zone/feed', category: 'defense', enabled: true, tier: 2, reliability: 78, region: 'global' },
  { name: 'Defense News', url: 'https://www.defensenews.com/arc/outboundfeeds/rss/?outputType=xml', category: 'defense', enabled: true, tier: 2, reliability: 82, region: 'global' },
  { name: 'Military Times', url: 'https://www.militarytimes.com/arc/outboundfeeds/rss/?outputType=xml', category: 'defense', enabled: true, tier: 2, reliability: 78, region: 'global' },
  { name: 'USNI News', url: 'https://news.usni.org/feed', category: 'defense', enabled: true, tier: 2, reliability: 80, region: 'global' },
  { name: 'gCaptain', url: 'https://gcaptain.com/feed/', category: 'defense', enabled: true, tier: 3, reliability: 72, region: 'global' },
  { name: 'Naval News', url: 'https://www.navalnews.com/feed/', category: 'defense', enabled: true, tier: 2, reliability: 78, region: 'global' },

  // ===================== TIER 2 — THINK TANKS & ANALYSIS =====================
  { name: 'Foreign Policy', url: 'https://foreignpolicy.com/feed/', category: 'thinktank', enabled: true, tier: 2, reliability: 88, region: 'global' },
  { name: 'Atlantic Council', url: 'https://www.atlanticcouncil.org/feed/', category: 'thinktank', enabled: true, tier: 2, reliability: 85, region: 'global' },
  { name: 'CSIS', url: 'https://www.csis.org/analysis/feed', category: 'thinktank', enabled: true, tier: 2, reliability: 88, region: 'global' },
  { name: 'Brookings', url: 'https://www.brookings.edu/feed/', category: 'thinktank', enabled: true, tier: 2, reliability: 88, region: 'global' },
  { name: 'Carnegie', url: 'https://carnegieendowment.org/rss/solr/?feed_id=global', category: 'thinktank', enabled: true, tier: 2, reliability: 88, region: 'global' },
  { name: 'RAND', url: 'https://www.rand.org/content/rand/blog.xml', category: 'thinktank', enabled: true, tier: 2, reliability: 90, region: 'global' },
  { name: 'War on the Rocks', url: 'https://warontherocks.com/feed/', category: 'thinktank', enabled: true, tier: 2, reliability: 82, region: 'global' },
  { name: 'RUSI', url: 'https://www.rusi.org/rss.xml', category: 'thinktank', enabled: true, tier: 2, reliability: 85, region: 'global' },
  { name: 'Chatham House', url: 'https://www.chathamhouse.org/feed', category: 'thinktank', enabled: true, tier: 2, reliability: 88, region: 'global' },
  { name: 'Responsible Statecraft', url: 'https://responsiblestatecraft.org/feed/', category: 'thinktank', enabled: true, tier: 2, reliability: 78, region: 'global' },
  { name: 'Jamestown Foundation', url: 'https://jamestown.org/feed/', category: 'thinktank', enabled: true, tier: 3, reliability: 80, region: 'global' },

  // ===================== TIER 2 — CRISIS & HUMANITARIAN =====================
  { name: 'IAEA News', url: 'https://www.iaea.org/feeds/topnews', category: 'crisis', enabled: true, tier: 2, reliability: 95, region: 'global' },
  { name: 'WHO News', url: 'https://www.who.int/rss-feeds/news-english.xml', category: 'crisis', enabled: true, tier: 2, reliability: 95, region: 'global' },
  { name: 'UNHCR', url: 'https://www.unhcr.org/rss/news.xml', category: 'crisis', enabled: true, tier: 2, reliability: 92, region: 'global' },
  { name: 'UN News', url: 'https://news.un.org/feed/subscribe/en/news/all/rss.xml', category: 'crisis', enabled: true, tier: 1, reliability: 90, region: 'global' },
  { name: 'ReliefWeb', url: 'https://reliefweb.int/updates/rss.xml', category: 'crisis', enabled: true, tier: 2, reliability: 88, region: 'global' },

  // ===================== TIER 2 — GOVERNMENT =====================
  { name: 'White House', url: 'https://www.whitehouse.gov/feed/', category: 'gov', enabled: true, tier: 2, reliability: 85, region: 'americas' },
  { name: 'US State Dept', url: 'https://www.state.gov/rss-feed/press-releases/feed/', category: 'gov', enabled: true, tier: 2, reliability: 88, region: 'americas' },
  { name: 'Pentagon', url: 'https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=945', category: 'gov', enabled: true, tier: 2, reliability: 88, region: 'americas' },
  { name: 'UK MOD', url: 'https://www.gov.uk/government/organisations/ministry-of-defence.atom', category: 'gov', enabled: true, tier: 2, reliability: 88, region: 'europe' },

  // ===================== TIER 2 — OSINT & CYBERSECURITY =====================
  { name: 'Bellingcat', url: 'https://www.bellingcat.com/feed/', category: 'osint', enabled: true, tier: 2, reliability: 85, region: 'global' },
  { name: 'Krebs Security', url: 'https://krebsonsecurity.com/feed/', category: 'cyber', enabled: true, tier: 2, reliability: 88, region: 'global' },
  { name: 'The Hacker News', url: 'https://feeds.feedburner.com/TheHackersNews', category: 'cyber', enabled: true, tier: 2, reliability: 78, region: 'global' },
  { name: 'BleepingComputer', url: 'https://www.bleepingcomputer.com/feed/', category: 'cyber', enabled: true, tier: 2, reliability: 78, region: 'global' },

  // ===================== TIER 2 — ENERGY & COMMODITIES =====================
  { name: 'Reuters Energy', url: 'https://news.google.com/rss/search?q=site:reuters.com+energy+oil+gas&hl=en', category: 'energy', enabled: true, tier: 2, reliability: 92, region: 'global' },
  { name: 'Oil & Gas Journal', url: 'https://www.ogj.com/rss', category: 'energy', enabled: true, tier: 2, reliability: 80, region: 'global' },
  { name: 'Nuclear Eng Intl', url: 'https://www.neimagazine.com/feed/', category: 'energy', enabled: true, tier: 3, reliability: 82, region: 'global' },

  // ===================== TIER 2 — CRYPTO =====================
  { name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', category: 'crypto', enabled: true, tier: 2, reliability: 75, region: 'global' },
  { name: 'Cointelegraph', url: 'https://cointelegraph.com/rss', category: 'crypto', enabled: true, tier: 2, reliability: 72, region: 'global' },
  { name: 'Decrypt', url: 'https://decrypt.co/feed', category: 'crypto', enabled: true, tier: 2, reliability: 72, region: 'global' },

  // ===================== TIER 2 — NUCLEAR & ARMS CONTROL =====================
  { name: 'Arms Control Assn', url: 'https://www.armscontrol.org/rss.xml', category: 'nuclear', enabled: true, tier: 2, reliability: 90, region: 'global' },
  { name: 'Bulletin Atomic Scientists', url: 'https://thebulletin.org/feed/', category: 'nuclear', enabled: true, tier: 2, reliability: 92, region: 'global' },
  { name: 'NTI', url: 'https://www.nti.org/rss/all/', category: 'nuclear', enabled: false, tier: 2, reliability: 90, region: 'global' }, // dead: RSS format error
  { name: 'FAS', url: 'https://fas.org/feed/', category: 'nuclear', enabled: true, tier: 2, reliability: 88, region: 'global' },

  // ===================== TIER 3 — REGIONAL EXTRAS =====================
  { name: 'TASS', url: 'https://tass.com/rss/v2.xml', category: 'europe', enabled: true, tier: 3, reliability: 35, region: 'europe' },
  { name: 'RT', url: 'https://www.rt.com/rss/', category: 'europe', enabled: false, tier: 3, reliability: 30, region: 'europe' }, // dead: ECONNREFUSED
  { name: 'Hurriyet', url: 'https://www.hurriyetdailynews.com/rss', category: 'europe', enabled: true, tier: 3, reliability: 65, region: 'europe' },
  { name: 'El Pais English', url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/english.elpais.com/portada', category: 'europe', enabled: true, tier: 2, reliability: 85, region: 'europe' },
  { name: 'ANSA', url: 'https://www.ansa.it/english/news/rss.xml', category: 'europe', enabled: false, tier: 2, reliability: 80, region: 'europe' }, // dead: 404
  { name: 'Novaya Gazeta EU', url: 'https://novayagazeta.eu/rss/en', category: 'europe', enabled: false, tier: 2, reliability: 78, region: 'europe' }, // dead: 404
  { name: 'Indian Express', url: 'https://indianexpress.com/section/world/feed/', category: 'asia', enabled: false, tier: 2, reliability: 75, region: 'asia' }, // dead: 403
  { name: 'VnExpress Intl', url: 'https://e.vnexpress.net/rss/news/latest.rss', category: 'asia', enabled: false, tier: 3, reliability: 68, region: 'asia' }, // dead: 404
  { name: 'Clarin', url: 'https://www.clarin.com/rss/latest/', category: 'americas', enabled: false, tier: 3, reliability: 70, region: 'americas' }, // dead: 404
  { name: 'Mexico News Daily', url: 'https://mexiconewsdaily.com/feed/', category: 'americas', enabled: true, tier: 3, reliability: 65, region: 'americas' },
  { name: 'Folha SP', url: 'https://feeds.folha.uol.com.br/mundo/rss091.xml', category: 'americas', enabled: true, tier: 2, reliability: 78, region: 'americas' },

  // ===================== TIER 3 — US NATIONAL =====================
  { name: 'WSJ', url: 'https://news.google.com/rss/search?q=site:wsj.com+world&hl=en', category: 'americas', enabled: true, tier: 1, reliability: 90, region: 'americas' },
  { name: 'ABC News', url: 'https://abcnews.go.com/abcnews/internationalheadlines', category: 'americas', enabled: true, tier: 2, reliability: 82, region: 'americas' },
  { name: 'CBS News', url: 'https://www.cbsnews.com/latest/rss/world', category: 'americas', enabled: true, tier: 2, reliability: 82, region: 'americas' },
  { name: 'NBC News', url: 'https://feeds.nbcnews.com/nbcnews/public/world', category: 'americas', enabled: true, tier: 2, reliability: 82, region: 'americas' },
  { name: 'Fox News World', url: 'https://moxie.foxnews.com/google-publisher/world.xml', category: 'americas', enabled: true, tier: 2, reliability: 60, region: 'americas' },
  { name: 'Axios', url: 'https://api.axios.com/feed/', category: 'americas', enabled: true, tier: 2, reliability: 80, region: 'americas' },

  // ===================== TIER 3 — FAO & FOOD SECURITY =====================
  { name: 'FAO News', url: 'https://www.fao.org/news/rss-feed/en/', category: 'crisis', enabled: false, tier: 3, reliability: 90, region: 'global' }, // dead: 404

  // ===================== BBC REGIONS (fill gaps) =====================
  { name: 'BBC US/Canada', url: 'https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml', category: 'americas', enabled: true, tier: 1, reliability: 95, region: 'americas' },
  { name: 'BBC Latin America', url: 'https://feeds.bbci.co.uk/news/world/latin_america/rss.xml', category: 'americas', enabled: true, tier: 1, reliability: 95, region: 'americas' },
  // ===================== POLITICS / CONFLICT (added) =====================
  { name: 'Long War Journal', url: 'https://www.longwarjournal.org/feed', category: 'defense', enabled: true, tier: 2, reliability: 80, region: 'global' },
  { name: 'CISA Advisories', url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml', category: 'cyber', enabled: true, tier: 1, reliability: 92, region: 'global' },
  { name: 'Al-Monitor', url: 'https://www.al-monitor.com/rss', category: 'mideast', enabled: true, tier: 2, reliability: 80, region: 'mideast' },
  { name: 'OC Media', url: 'https://oc-media.org/feed/', category: 'europe', enabled: true, tier: 2, reliability: 75, region: 'europe' },
  { name: 'Balkan Insight', url: 'https://balkaninsight.com/feed/', category: 'europe', enabled: true, tier: 2, reliability: 78, region: 'europe' },

  // ===================== SPORT - FORMULA 1 =====================
  { name: 'F1 Official', url: 'https://www.formula1.com/en/latest/all.xml', category: 'sport', enabled: true, tier: 2, reliability: 90, region: 'global' },
  { name: 'BBC Sport F1', url: 'https://feeds.bbci.co.uk/sport/formula1/rss.xml', category: 'sport', enabled: true, tier: 2, reliability: 95, region: 'global' },
  { name: 'Motorsport F1', url: 'https://www.motorsport.com/rss/f1/news/', category: 'sport', enabled: true, tier: 2, reliability: 80, region: 'global' },
];

export const CONFLICT_KEYWORDS = [
  // --- Middle East ---
  'Gaza', 'West Bank', 'Rafah', 'Khan Younis', 'Jerusalem', 'Tel Aviv',
  'Beirut', 'Lebanon', 'Syria', 'Damascus', 'Iran', 'Tehran', 'Yemen',
  'Sanaa', 'Iraq', 'Golan Heights', 'Ramallah', 'Jenin', 'Nablus',
  'Hamas', 'Hezbollah', 'IDF', 'Houthis', 'Islamic Jihad', 'Netanyahu',
  'IRGC', 'UNRWA', 'UNIFIL',
  // --- Europe / Russia-Ukraine ---
  'Ukraine', 'Kyiv', 'Kharkiv', 'Odesa', 'Crimea', 'Donbas', 'Zaporizhzhia',
  'Russia', 'Moscow', 'Putin', 'Zelensky', 'NATO', 'Wagner', 'Bakhmut',
  'Kherson', 'Mariupol', 'Avdiivka', 'Kursk',
  // --- Asia-Pacific ---
  'Taiwan', 'South China Sea', 'North Korea', 'Pyongyang', 'Kim Jong',
  'China', 'Beijing', 'Xi Jinping', 'Philippines', 'AUKUS',
  'India', 'Pakistan', 'Kashmir', 'Myanmar', 'Rohingya',
  // --- Africa ---
  'Sudan', 'Khartoum', 'Ethiopia', 'Tigray', 'Somalia', 'Sahel',
  'Mali', 'Niger', 'Burkina Faso', 'Congo', 'Mozambique',
  // --- Military / Conflict ---
  'airstrike', 'ceasefire', 'hostage', 'hostages', 'missile', 'rocket',
  'bombing', 'invasion', 'occupation', 'blockade', 'siege', 'casualties',
  'drone', 'UAV', 'ground operation', 'nuclear', 'submarine',
  'military', 'troops', 'deployment', 'naval', 'aircraft carrier',
  'hypersonic', 'ICBM', 'ballistic missile', 'cruise missile',
  'war', 'conflict', 'battle', 'offensive', 'counteroffensive',
  'shelling', 'artillery', 'sniper', 'ambush', 'convoy',
  // --- Diplomatic / Geopolitics ---
  'peace talks', 'negotiations', 'sanctions', 'UN resolution',
  'humanitarian', 'refugee', 'displacement', 'ICC', 'ICJ',
  'G7', 'G20', 'BRICS', 'EU', 'ASEAN',
  'trade war', 'tariff', 'embargo',
  // --- Markets / Economic ---
  'oil price', 'crude oil', 'Brent', 'WTI', 'OPEC',
  'gold price', 'dollar', 'yuan', 'euro',
  'stock market', 'S&P 500', 'recession', 'inflation',
  'supply chain', 'semiconductor', 'rare earth',
  'central bank', 'interest rate', 'Fed', 'ECB',
  // --- Cybersecurity / Tech ---
  'cyberattack', 'ransomware', 'data breach', 'APT',
  'disinformation', 'deepfake', 'election interference',
  'AI weapons', 'autonomous weapons',
  // --- Nuclear ---
  'nuclear test', 'enrichment', 'uranium', 'plutonium', 'warhead',
  'nonproliferation', 'arms control', 'deterrence',
  // --- Energy ---
  'pipeline', 'LNG', 'energy crisis', 'blackout', 'power grid',
  'oil embargo', 'gas pipeline', 'Nord Stream',
];

export const LOCATION_MAP: Record<string, { lat: number; lng: number; country: string }> = {
  // --- Middle East ---
  'gaza': { lat: 31.3547, lng: 34.3088, country: 'Palestine' },
  'gaza city': { lat: 31.5, lng: 34.47, country: 'Palestine' },
  'rafah': { lat: 31.2969, lng: 34.2455, country: 'Palestine' },
  'khan younis': { lat: 31.3462, lng: 34.3061, country: 'Palestine' },
  'west bank': { lat: 31.9466, lng: 35.3027, country: 'Palestine' },
  'ramallah': { lat: 31.9038, lng: 35.2034, country: 'Palestine' },
  'jenin': { lat: 32.4637, lng: 35.2942, country: 'Palestine' },
  'nablus': { lat: 32.2211, lng: 35.2544, country: 'Palestine' },
  'hebron': { lat: 31.5326, lng: 35.0998, country: 'Palestine' },
  'jerusalem': { lat: 31.7683, lng: 35.2137, country: 'Israel/Palestine' },
  'tel aviv': { lat: 32.0853, lng: 34.7818, country: 'Israel' },
  'haifa': { lat: 32.7940, lng: 34.9896, country: 'Israel' },
  'israel': { lat: 31.0461, lng: 34.8516, country: 'Israel' },
  'beirut': { lat: 33.8938, lng: 35.5018, country: 'Lebanon' },
  'lebanon': { lat: 33.8547, lng: 35.8623, country: 'Lebanon' },
  'south lebanon': { lat: 33.2721, lng: 35.2033, country: 'Lebanon' },
  'syria': { lat: 34.8021, lng: 38.9968, country: 'Syria' },
  'damascus': { lat: 33.5138, lng: 36.2765, country: 'Syria' },
  'aleppo': { lat: 36.2021, lng: 37.1343, country: 'Syria' },
  'iran': { lat: 32.4279, lng: 53.6880, country: 'Iran' },
  'tehran': { lat: 35.6892, lng: 51.3890, country: 'Iran' },
  'isfahan': { lat: 32.6546, lng: 51.6680, country: 'Iran' },
  'yemen': { lat: 15.5527, lng: 48.5164, country: 'Yemen' },
  'sanaa': { lat: 15.3694, lng: 44.1910, country: 'Yemen' },
  'hodeida': { lat: 14.7979, lng: 42.9545, country: 'Yemen' },
  'iraq': { lat: 33.2232, lng: 43.6793, country: 'Iraq' },
  'baghdad': { lat: 33.3152, lng: 44.3661, country: 'Iraq' },
  'golan heights': { lat: 33.0000, lng: 35.7500, country: 'Syria/Israel' },
  'red sea': { lat: 20.0000, lng: 38.0000, country: 'International' },
  'strait of hormuz': { lat: 26.5700, lng: 56.2500, country: 'Iran/Oman' },
  'hormuz': { lat: 26.5700, lng: 56.2500, country: 'Iran/Oman' },
  'bandar abbas': { lat: 27.1833, lng: 56.2667, country: 'Iran' },
  'bab al-mandab': { lat: 12.6000, lng: 43.3200, country: 'Red Sea' },
  'gulf of oman': { lat: 24.5000, lng: 58.5000, country: 'International' },
  'tyre': { lat: 33.2700, lng: 35.1900, country: 'Lebanon' },
  'sidon': { lat: 33.5600, lng: 35.3800, country: 'Lebanon' },
  'nabatieh': { lat: 33.3800, lng: 35.4800, country: 'Lebanon' },
  'idlib': { lat: 35.9300, lng: 36.6300, country: 'Syria' },
  'homs': { lat: 34.7300, lng: 36.7200, country: 'Syria' },
  'latakia': { lat: 35.5200, lng: 35.7900, country: 'Syria' },
  'mosul': { lat: 36.3400, lng: 43.1300, country: 'Iraq' },
  'basra': { lat: 30.5100, lng: 47.7800, country: 'Iraq' },
  'erbil': { lat: 36.1900, lng: 44.0100, country: 'Iraq' },
  'aden': { lat: 12.7900, lng: 45.0400, country: 'Yemen' },
  'taiz': { lat: 13.5800, lng: 44.0200, country: 'Yemen' },
  'dnipro': { lat: 48.4600, lng: 35.0500, country: 'Ukraine' },
  'lviv': { lat: 49.8400, lng: 24.0300, country: 'Ukraine' },
  'sumy': { lat: 50.9100, lng: 34.8000, country: 'Ukraine' },
  'mykolaiv': { lat: 46.9700, lng: 32.0000, country: 'Ukraine' },
  'goma': { lat: -1.6600, lng: 29.2200, country: 'DRC' },
  'port-au-prince': { lat: 18.5900, lng: -72.3100, country: 'Haiti' },
  'bamako': { lat: 12.6400, lng: -8.0000, country: 'Mali' },
  'maiduguri': { lat: 11.8300, lng: 13.1500, country: 'Nigeria' },
  'peshawar': { lat: 34.0100, lng: 71.5800, country: 'Pakistan' },
  'el fasher': { lat: 13.6300, lng: 25.3500, country: 'Sudan' },
  'juba': { lat: 4.8500, lng: 31.5800, country: 'South Sudan' },
  'nagorno-karabakh': { lat: 39.8400, lng: 46.7600, country: 'Azerbaijan' },
  'suez canal': { lat: 30.4550, lng: 32.3500, country: 'Egypt' },
  'egypt': { lat: 26.8206, lng: 30.8025, country: 'Egypt' },
  'cairo': { lat: 30.0444, lng: 31.2357, country: 'Egypt' },
  'jordan': { lat: 30.5852, lng: 36.2384, country: 'Jordan' },
  'amman': { lat: 31.9454, lng: 35.9284, country: 'Jordan' },
  'saudi arabia': { lat: 23.8859, lng: 45.0792, country: 'Saudi Arabia' },
  'riyadh': { lat: 24.7136, lng: 46.6753, country: 'Saudi Arabia' },
  'turkey': { lat: 38.9637, lng: 35.2433, country: 'Turkey' },
  'ankara': { lat: 39.9334, lng: 32.8597, country: 'Turkey' },
  'istanbul': { lat: 41.0082, lng: 28.9784, country: 'Turkey' },
  // --- Europe / Russia-Ukraine ---
  'ukraine': { lat: 48.3794, lng: 31.1656, country: 'Ukraine' },
  'kyiv': { lat: 50.4501, lng: 30.5234, country: 'Ukraine' },
  'kharkiv': { lat: 49.9935, lng: 36.2304, country: 'Ukraine' },
  'odesa': { lat: 46.4825, lng: 30.7233, country: 'Ukraine' },
  'crimea': { lat: 44.9521, lng: 34.1024, country: 'Ukraine' },
  'donbas': { lat: 48.0159, lng: 37.8028, country: 'Ukraine' },
  'zaporizhzhia': { lat: 47.8388, lng: 35.1396, country: 'Ukraine' },
  'bakhmut': { lat: 48.5953, lng: 38.0008, country: 'Ukraine' },
  'kherson': { lat: 46.6354, lng: 32.6169, country: 'Ukraine' },
  'mariupol': { lat: 47.0958, lng: 37.5433, country: 'Ukraine' },
  'avdiivka': { lat: 48.1397, lng: 37.7453, country: 'Ukraine' },
  'kursk': { lat: 51.7373, lng: 36.1874, country: 'Russia' },
  'russia': { lat: 61.5240, lng: 105.3188, country: 'Russia' },
  'moscow': { lat: 55.7558, lng: 37.6173, country: 'Russia' },
  'st petersburg': { lat: 59.9343, lng: 30.3351, country: 'Russia' },
  'poland': { lat: 51.9194, lng: 19.1451, country: 'Poland' },
  'romania': { lat: 45.9432, lng: 24.9668, country: 'Romania' },
  'baltic states': { lat: 56.8796, lng: 24.6032, country: 'Baltic' },
  'finland': { lat: 61.9241, lng: 25.7482, country: 'Finland' },
  'germany': { lat: 51.1657, lng: 10.4515, country: 'Germany' },
  'berlin': { lat: 52.5200, lng: 13.4050, country: 'Germany' },
  'france': { lat: 46.2276, lng: 2.2137, country: 'France' },
  'paris': { lat: 48.8566, lng: 2.3522, country: 'France' },
  'london': { lat: 51.5074, lng: -0.1278, country: 'UK' },
  'united kingdom': { lat: 55.3781, lng: -3.4360, country: 'UK' },
  'netherlands': { lat: 52.1326, lng: 5.2913, country: 'Netherlands' },
  // --- Asia-Pacific ---
  'taiwan': { lat: 23.6978, lng: 120.9605, country: 'Taiwan' },
  'taipei': { lat: 25.0330, lng: 121.5654, country: 'Taiwan' },
  'south china sea': { lat: 12.0000, lng: 114.0000, country: 'Disputed' },
  'china': { lat: 35.8617, lng: 104.1954, country: 'China' },
  'beijing': { lat: 39.9042, lng: 116.4074, country: 'China' },
  'shanghai': { lat: 31.2304, lng: 121.4737, country: 'China' },
  'hong kong': { lat: 22.3193, lng: 114.1694, country: 'China' },
  'north korea': { lat: 40.3399, lng: 127.5101, country: 'North Korea' },
  'pyongyang': { lat: 39.0392, lng: 125.7625, country: 'North Korea' },
  'south korea': { lat: 35.9078, lng: 127.7669, country: 'South Korea' },
  'seoul': { lat: 37.5665, lng: 126.9780, country: 'South Korea' },
  'japan': { lat: 36.2048, lng: 138.2529, country: 'Japan' },
  'tokyo': { lat: 35.6762, lng: 139.6503, country: 'Japan' },
  'philippines': { lat: 12.8797, lng: 121.7740, country: 'Philippines' },
  'india': { lat: 20.5937, lng: 78.9629, country: 'India' },
  'new delhi': { lat: 28.6139, lng: 77.2090, country: 'India' },
  'pakistan': { lat: 30.3753, lng: 69.3451, country: 'Pakistan' },
  'islamabad': { lat: 33.6844, lng: 73.0479, country: 'Pakistan' },
  'kashmir': { lat: 34.0837, lng: 74.7973, country: 'India/Pakistan' },
  'myanmar': { lat: 21.9162, lng: 95.9560, country: 'Myanmar' },
  'afghanistan': { lat: 33.9391, lng: 67.7100, country: 'Afghanistan' },
  'kabul': { lat: 34.5553, lng: 69.2075, country: 'Afghanistan' },
  'australia': { lat: -25.2744, lng: 133.7751, country: 'Australia' },
  'singapore': { lat: 1.3521, lng: 103.8198, country: 'Singapore' },
  'vietnam': { lat: 14.0583, lng: 108.2772, country: 'Vietnam' },
  'thailand': { lat: 15.8700, lng: 100.9925, country: 'Thailand' },
  'indonesia': { lat: -0.7893, lng: 113.9213, country: 'Indonesia' },
  'malaysia': { lat: 4.2105, lng: 101.9758, country: 'Malaysia' },
  // --- Africa ---
  'sudan': { lat: 12.8628, lng: 30.2176, country: 'Sudan' },
  'khartoum': { lat: 15.5007, lng: 32.5599, country: 'Sudan' },
  'ethiopia': { lat: 9.1450, lng: 40.4897, country: 'Ethiopia' },
  'addis ababa': { lat: 8.9806, lng: 38.7578, country: 'Ethiopia' },
  'somalia': { lat: 5.1521, lng: 46.1996, country: 'Somalia' },
  'mogadishu': { lat: 2.0469, lng: 45.3182, country: 'Somalia' },
  'mali': { lat: 17.5707, lng: -3.9962, country: 'Mali' },
  'niger': { lat: 17.6078, lng: 8.0817, country: 'Niger' },
  'burkina faso': { lat: 12.2383, lng: -1.5616, country: 'Burkina Faso' },
  'nigeria': { lat: 9.0820, lng: 8.6753, country: 'Nigeria' },
  'congo': { lat: -4.0383, lng: 21.7587, country: 'DRC' },
  'libya': { lat: 26.3351, lng: 17.2283, country: 'Libya' },
  'tripoli': { lat: 32.8872, lng: 13.1913, country: 'Libya' },
  'mozambique': { lat: -18.6657, lng: 35.5296, country: 'Mozambique' },
  'south africa': { lat: -30.5595, lng: 22.9375, country: 'South Africa' },
  'kenya': { lat: -0.0236, lng: 37.9062, country: 'Kenya' },
  'nairobi': { lat: -1.2921, lng: 36.8219, country: 'Kenya' },
  // --- Americas ---
  'washington': { lat: 38.9072, lng: -77.0369, country: 'USA' },
  'pentagon': { lat: 38.8719, lng: -77.0563, country: 'USA' },
  'new york': { lat: 40.7128, lng: -74.0060, country: 'USA' },
  'venezuela': { lat: 6.4238, lng: -66.5897, country: 'Venezuela' },
  'colombia': { lat: 4.5709, lng: -74.2973, country: 'Colombia' },
  'mexico': { lat: 23.6345, lng: -102.5528, country: 'Mexico' },
  'brazil': { lat: -14.2350, lng: -51.9253, country: 'Brazil' },
  'argentina': { lat: -38.4161, lng: -63.6167, country: 'Argentina' },
  'canada': { lat: 56.1304, lng: -106.3468, country: 'Canada' },
  'cuba': { lat: 21.5218, lng: -77.7812, country: 'Cuba' },
};

export const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export const SEVERITY_KEYWORDS: Record<string, string[]> = {
  critical: ['massacre', 'nuclear', 'invasion', 'war declared', 'mass casualties', 'chemical weapon', 'ICBM', 'nuclear test', 'nuclear strike', 'genocide'],
  high: ['airstrike', 'bombing', 'missile', 'rocket attack', 'ground operation', 'hostage', 'killed', 'shot down', 'sunk', 'cyberattack', 'assassination', 'coup'],
  medium: ['ceasefire', 'sanctions', 'deployment', 'escalation', 'clash', 'protest', 'wounded', 'tariff', 'embargo', 'crash', 'pipeline', 'blackout'],
  low: ['negotiations', 'peace talks', 'humanitarian', 'diplomatic', 'aid', 'refugee', 'trade deal', 'summit', 'election'],
};

// Source tier descriptions for UI
export const TIER_LABELS: Record<number, string> = {
  1: 'Wire Service / Major Broadcaster',
  2: 'Regional / Specialist',
  3: 'Niche / Blog / State Media',
};


// ============================================================
// SITUATIONS - curated anchor situations for the event-centric layer.
// An item joins the FIRST anchor whose keywords it matches; order = priority.
// Specific/local anchors first, broad ones last.
// ============================================================
export const SITUATIONS: AnchorSituation[] = [
  { id: 'gaza', slug: 'gaza', title: 'Gaza', type: 'conflict', anchorKeywords: ['Gaza','Rafah','Khan Younis','Khan Yunis','Hamas','IDF','Jenin','Nablus'], center: { lat: 31.45, lng: 34.40 }, bbox: [31.0,34.0,31.7,34.7], zoom: 11, actors: ['Hamas','IDF','Israel'] },
  { id: 'lebanon', slug: 'lebanon', title: 'Lebanon / Hezbollah', type: 'conflict', anchorKeywords: ['Lebanon','Beirut','Hezbollah','UNIFIL'], center: { lat: 33.85, lng: 35.50 }, bbox: [33.0,35.0,34.7,36.6], zoom: 9, actors: ['Hezbollah','IDF','Lebanon'] },
  { id: 'hormuz', slug: 'strait-of-hormuz', title: 'Strait of Hormuz', type: 'maritime', anchorKeywords: ['Hormuz','tanker','IRGC','Bandar Abbas'], center: { lat: 26.57, lng: 56.25 }, bbox: [24.0,53.0,29.0,59.0], zoom: 8, actors: ['Iran','IRGC','US Navy'] },
  { id: 'red-sea', slug: 'red-sea-bab-al-mandab', title: 'Red Sea / Bab al-Mandab', type: 'maritime', anchorKeywords: ['Houthi','Houthis','Red Sea','Bab al-Mandab','Hodeida','Sanaa','Yemen'], center: { lat: 12.60, lng: 43.32 }, bbox: [10.0,41.0,16.0,45.0], zoom: 8, actors: ['Houthis','Yemen','US Navy'] },
  { id: 'iran-israel', slug: 'iran-israel', title: 'Iran-Israel', type: 'conflict', anchorKeywords: ['Iran','Israel','Tel Aviv','Natanz','enrichment','uranium','Isfahan','Tehran','ballistic missile'], center: { lat: 32.0, lng: 45.0 }, bbox: [28.0,34.0,37.0,54.0], zoom: 5, requireStrong: true, actors: ['Iran','Israel','IRGC'] },
  { id: 'ukraine', slug: 'ukraine-front', title: 'Ukraine Front', type: 'conflict', anchorKeywords: ['Ukraine','Kyiv','Kharkiv','Donbas','Zaporizhzhia','Bakhmut','Kherson','Avdiivka','Kursk','Odesa'], center: { lat: 49.0, lng: 36.2 }, bbox: [44.0,29.0,53.0,41.0], zoom: 6, actors: ['Russia','Ukraine','NATO'] },
  { id: 'taiwan', slug: 'taiwan-strait', title: 'Taiwan Strait', type: 'conflict', anchorKeywords: ['Taiwan','South China Sea','Taiwan Strait','PLA'], center: { lat: 24.0, lng: 119.5 }, bbox: [21.0,117.0,26.5,122.5], zoom: 7, actors: ['China','Taiwan','US'] },
  { id: 'korea', slug: 'korea-peninsula', title: 'Korean Peninsula', type: 'nuclear', anchorKeywords: ['North Korea','Pyongyang','Kim Jong','ICBM'], center: { lat: 39.0, lng: 127.5 }, bbox: [37.0,124.0,42.0,131.0], zoom: 6, actors: ['North Korea','South Korea','US'] },
  { id: 'sudan', slug: 'sudan', title: 'Sudan', type: 'humanitarian', anchorKeywords: ['Sudan','Khartoum','RSF'], center: { lat: 15.50, lng: 32.56 }, bbox: [9.0,22.0,18.0,38.0], zoom: 6, actors: ['SAF','RSF'] },
  { id: 'syria', slug: 'syria', title: 'Syria', type: 'conflict', anchorKeywords: ['Syria','Damascus','Aleppo'], center: { lat: 34.8, lng: 38.99 }, bbox: [32.0,35.5,37.5,42.0], zoom: 6, actors: ['Syria'] },
];
