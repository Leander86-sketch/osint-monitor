#!/usr/bin/env python3
"""Focus: hybrid Europe — incidentenlijst voor Argus (herbouwd 22 sep 2026).

Twee bronnen, allebei zonder toestemmingsvraag:
  1. Russian Operations Against Europe Dataset 2022–2025 (Bart Schuurman, Universiteit Leiden; Harvard Dataverse
     doi:10.7910/DVN/TQ0FMQ, licentie CC BY 4.0). Geschiedenis: sabotage, brandstichting, aanslagen, verkenning,
     fysieke beïnvloeding. Geen coördinaten → landmidden, 'bij benadering'.
  2. Eigen detectie uit de nieuwsfeeds van Argus (data/news-snapshot.json): koppen over drones, sabotage, kabels,
     GPS-storing, spionage in Europa. Elke kop die we ooit zagen wordt bewaard in data/hybrid-own.json, zodat de
     lijst groeit voorbij het venster van de feed. Plaatsbepaling = die van Argus zelf (gazetteer).
Uitvoer: data/hybrid-incidents.json. Cron: elke 6 uur. Ernst volgens dezelfde vaste regels als voorheen.
De Saha-tracker en Grey Zone Europe (geen licentie) zijn per 22 sep niet meer in gebruik.
"""
import json, os, re, sys, zipfile, io, html, urllib.request, urllib.parse, time
from email.utils import parsedate_to_datetime
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

ROOT = os.path.expanduser('~/Clawd/osint-monitor')
OUT = os.path.join(ROOT, 'data', 'hybrid-incidents.json')
UA = {'User-Agent': 'ARGUS-dashboard/1.0 (+https://argus.prototipo.nl)'}

def get(url, timeout=60):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout).read()

def clean_url(u):
    if not u: return None
    p = urllib.parse.urlsplit(u.strip())
    q = [(k, v) for k, v in urllib.parse.parse_qsl(p.query, keep_blank_values=True) if not k.lower().startswith('utm_')]
    return urllib.parse.urlunsplit((p.scheme, p.netloc, p.path, urllib.parse.urlencode(q), ''))

# ── landmiddens voor incidenten zonder coördinaten (kaart toont ze dan als 'bij benadering') ──
CENTROID = {'baltic sea': (57.5, 20.0), 'north sea': (56.0, 3.5), 'czechia': (49.8, 15.5), 'uk': (54.0, -2.5), 'united kingdom': (54.0, -2.5), 'moldova': (47.0, 28.5), 'greece': (39.0, 22.0), 'croatia': (45.3, 16.0), 'slovenia': (46.1, 14.8), 'serbia': (44.0, 20.9), 'estonia': (58.6, 25.0), 'latvia': (56.9, 24.6), 'lithuania': (55.2, 23.9), 'poland': (52.0, 19.4), 'germany': (51.2, 10.4), 'finland': (62.0, 26.0), 'sweden': (60.1, 15.0), 'norway': (61.0, 9.0), 'denmark': (56.0, 9.5), 'netherlands': (52.2, 5.3), 'belgium': (50.6, 4.6), 'france': (46.6, 2.4), 'united-kingdom': (54.0, -2.0), 'uk': (54.0, -2.0), 'ireland': (53.2, -8.0), 'romania': (45.9, 25.0), 'bulgaria': (42.7, 25.4), 'moldova': (47.2, 28.5), 'czech-republic': (49.8, 15.5), 'czechia': (49.8, 15.5), 'slovakia': (48.7, 19.7), 'hungary': (47.2, 19.4), 'austria': (47.6, 14.1), 'italy': (42.8, 12.6), 'spain': (40.2, -3.6), 'portugal': (39.6, -8.0), 'greece': (39.1, 22.9), 'turkey': (39.0, 35.0), 'iceland': (64.9, -18.6), 'switzerland': (46.8, 8.2), 'croatia': (45.1, 15.4), 'slovenia': (46.1, 14.8), 'serbia': (44.0, 20.9), 'montenegro': (42.7, 19.3), 'albania': (41.1, 20.1), 'north-macedonia': (41.6, 21.7), 'kosovo': (42.6, 20.9), 'bosnia-and-herzegovina': (44.2, 17.8), 'luxembourg': (49.8, 6.1), 'ukraine': (49.0, 31.4), 'georgia': (42.3, 43.4), 'united-states': (39.8, -98.6), 'usa': (39.8, -98.6), 'canada': (56.1, -106.3), 'japan': (36.2, 138.3), 'south-korea': (36.5, 127.9), 'baltic-sea': (57.5, 19.5), 'north-sea': (56.0, 3.5), 'black-sea': (43.4, 34.0)}
def nice(slug): return ' '.join(w.capitalize() if w not in ('and', 'of') else w for w in slug.split('-')).replace('Usa', 'USA').replace('Uk', 'UK')

# ── ernst: vaste regels op titel + type; de reden gaat mee in de uitvoer zodat het controleerbaar is ──
HARM = re.compile(r'\b(killed|dead|deaths?|injur\w+|wounded|explod\w*|explosion|blast|bomb\w*|arson|set on fire|fire at|derail\w*|poison\w*|assassinat\w*|destroy\w*|destructive)\b', re.I)
INFRA = re.compile(r'\b(critical infrastructure|energy infrastructure|power (plant|grid|station)|substation|pipeline|(undersea|subsea|data|power|telecom\w*) cables?|water (supply|plant)|railway|rail line|oil storage|nuclear|hospital|airport)\b', re.I)
SIGHT = re.compile(r'\b(spotted|sightings?|reported over|observed|seen (over|near)|activity over|flew over|fl(y|ies|ying) over)\b', re.I)
ACT = re.compile(r'\b(sabotag\w*|attack\w*|damag\w*|cut|sever\w*|cyber\w*|hack\w*|disrupt\w*|hit)\b', re.I)
MED = re.compile(r'\b((closed|shut|suspend\w*|halt\w*|divert\w*|cancel\w*|ground\w*)|airspace|violat\w+|jamm\w+|spoof\w+|gps|sho(o)?ts? down|shot down|downed|intercept\w*|scrambl\w*|crash\w*|debris|fragments?|explosive\w*|warship|submarine|shadow fleet|ransomware|ddos|vandal\w*|weapons?|damag\w*)\b', re.I)
def severity(title, typ, sub=''):
    """critical = mensen geraakt, brand of explosie, of vitale infrastructuur aangevallen (niet alleen overvlogen);
       medium   = verstoring of schending zonder slachtoffers (vliegveld dicht, kabel, luchtruim, onderschepping, wrakstukken, cyber);
       small    = waarneming of vondst zonder gevolg."""
    t = f'{title} {sub}'
    if HARM.search(t): return 'critical', 'casualties, fire or explosion'
    if (INFRA.search(t) or 'critical-infrastructure' in sub) and ACT.search(t) and not SIGHT.search(t): return 'critical', 'vital infrastructure attacked'
    if MED.search(t) or (INFRA.search(t) and SIGHT.search(t)) or typ in ('airspace', 'maritime', 'jamming', 'cyber', 'sabotage'): return 'medium', 'disruption or violation without casualties'
    return 'small', 'sighting or find without consequence'

MONTHS = {m.lower(): i + 1 for i, m in enumerate(['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'])}
def date_from_text(text, fallback_year):
    """Saha zet de datum van het incident in de tekst ('On June 12, …'); de datum van de post is de publicatiedatum."""
    m = re.search(r'\b(?:on|in the (?:night|early hours) of)\s+(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([A-Z][a-z]+)(?:,?\s+(20\d\d))?', text) or None
    if m and m.group(2).lower() in MONTHS: d, mo, y = int(m.group(1)), MONTHS[m.group(2).lower()], m.group(3)
    else:
        m = re.search(r'\b(?:On|on)\s+([A-Z][a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(20\d\d))?', text)
        if not (m and m.group(1).lower() in MONTHS): return None
        mo, d, y = MONTHS[m.group(1).lower()], int(m.group(2)), m.group(3)
    try: return datetime(int(y) if y else fallback_year, mo, d).strftime('%Y-%m-%d')
    except ValueError: return None


DATAVERSE = 'https://dataverse.harvard.edu/api/datasets/:persistentId/?persistentId=doi:10.7910/DVN/TQ0FMQ'
XLSX_CACHE = os.path.join(ROOT, 'data', 'schuurman.xlsx')
OWN = os.path.join(ROOT, 'data', 'hybrid-own.json')

def xl_rows(z, sheet):
    ss = []
    try: ss = [html.unescape(re.sub(r'<[^>]+>', '', m)) for m in re.findall(r'<si>(.*?)</si>', z.read('xl/sharedStrings.xml').decode('utf-8'), re.S)]
    except KeyError: pass
    sh = z.read(sheet).decode('utf-8'); rows = []
    for r in re.findall(r'<row [^>]*>(.*?)</row>', sh, re.S):
        d = {}
        for m in re.finditer(r'<c r="([A-Z]+)\d+"([^>]*)>(.*?)</c>', r, re.S):
            col, attr, inner = m.groups(); v = re.search(r'<v>(.*?)</v>', inner, re.S); v = v.group(1) if v else ''
            if 't="s"' in attr and v: v = ss[int(v)]
            if 't="inlineStr"' in attr: v = html.unescape(re.sub(r'<[^>]+>', '', inner))
            d[col] = v
        rows.append(d)
    return rows

def excel_date(v):
    try: return (datetime(1899, 12, 30) + __import__('datetime').timedelta(days=float(v))).strftime('%Y-%m-%d')
    except Exception: return None

CAT2TYPE = {'sabotage': 'sabotage', 'arson': 'sabotage', 'vandalism': 'sabotage', 'terrorism': 'sabotage', 'assassination': 'other', 'reconnaissance': 'other', 'influence operation': 'other', 'disruption': 'other', 'disruptive immigration': 'other', 'unknown': 'other'}

def schuurman():
    """Eén keer per week opnieuw ophalen; daartussen uit de cache."""
    fresh = os.path.exists(XLSX_CACHE) and time.time() - os.path.getmtime(XLSX_CACHE) < 7 * 86400
    if not fresh:
        meta = json.loads(get(DATAVERSE)); f = meta['data']['latestVersion']['files'][0]['dataFile']
        open(XLSX_CACHE, 'wb').write(get(f'https://dataverse.harvard.edu/api/access/datafile/{f["id"]}', 120))
    z = zipfile.ZipFile(XLSX_CACHE)
    wb = z.read('xl/workbook.xml').decode(); rels = z.read('xl/_rels/workbook.xml.rels').decode()
    rid = dict(re.findall(r'<sheet [^>]*name="([^"]+)"[^>]*r:id="(rId\d+)"', wb))['EventData']
    target = re.search(r'Id="' + rid + r'"[^>]*Target="([^"]+)"', rels) or re.search(r'Target="([^"]+)"[^>]*Id="' + rid + r'"', rels)
    rows = xl_rows(z, 'xl/' + target.group(1).lstrip('/').replace('xl/', ''))
    hdr = {v: k for k, v in rows[0].items()}; out = []
    for n, r in enumerate(rows[1:]):
        what = (r.get(hdr['What']) or '').strip(); where = (r.get(hdr['Where']) or '').strip()
        year = str(r.get(hdr['IncidentYear']) or '').strip()
        if not what or not re.fullmatch(r'20\d\d', year): continue   # notities/ToDo-regels onderaan het blad overslaan
        start = excel_date(r.get(hdr['IncidentDateStart'])) or f"{year}-01-01"
        approx = (r.get(hdr['IncidentDateRange']) or '').lower() == 'yes'
        cats = [c.strip() for c in (r.get(hdr['EventCategory']) or '', r.get(hdr['EventCategory2']) or '') if c and c.lower() != 'does not apply']
        countries = [c.strip() for c in re.split(r'[;,/]', where) if c.strip()]
        ALIAS = {'the netherlands': 'netherlands', 'united kingdom': 'uk', 'baltic sea': 'baltic sea', 'north sea': 'north sea', 'czech republic': 'czechia', 'czechia': 'czechia'}
        key = ALIAS.get(countries[0].lower(), countries[0].lower()) if countries else ''
        lat, lon = CENTROID.get(key, (None, None))
        typ = CAT2TYPE.get((cats[0] if cats else 'unknown').split(' (')[0].lower(), 'other')
        # ernst uit de categorie van de dataset zelf (navolgbaar): uitgevoerde sabotage/brandstichting/terreur/aanslag = critical;
        # poging, voorbereiding, vandalisme, verstoring, complot = medium; verkenning, beïnvloeding, onbekend = small
        c0 = (cats[0] if cats else 'unknown').lower()
        if c0 in ('sabotage', 'arson', 'terrorism', 'assassination'): sev, why = 'critical', f'{c0} carried out (dataset category)'
        elif c0 in ('sabotage (preparation)', 'sabotage (attempt)', 'vandalism', 'disruption', 'assassination (plot)', 'assassination (attempt)', 'disruptive immigration'): sev, why = 'medium', f'{c0} (dataset category)'
        else: sev, why = 'small', f'{c0} (dataset category)'
        out.append({'id': f'sch-{n}', 'date': start, 'dateApprox': approx, 'countries': countries, 'place': None, 'lat': lat, 'lon': lon, 'coordApprox': True,
                    'type': typ, 'title': what.rstrip('.'), 'category': ' / '.join(cats) or None, 'goal': (r.get(hdr['ApparentGoal1']) or None), 'target': (r.get(hdr['TargetType']) or None),
                    'attribution': 'suspected', 'actor': None, 'severity': sev, 'severityWhy': why,
                    'sources': [{'name': 'Russian Operations Against Europe Dataset (Schuurman, CC BY 4.0)', 'url': 'https://doi.org/10.7910/DVN/TQ0FMQ'}], 'origin': 'schuurman'})
    return out

# ── eigen detectie uit de feeds van Argus ──
HYB = re.compile(r'\b(drones?|drohnen?|uavs?|unmanned aircraft|airspace|luftraum|gps (jamming|interference|spoofing)|jamming|hybrid (attacks?|warfare)|(undersea|subsea|data|power|telecom\w*) cables?|cable (cut|damage)|shadow fleet|sabotag\w*|arson|espionage|spy(ing)? (ring|case|charges)|spies|saboteurs?|explosives?|incendiar\w*|parcel bombs?|rail(way)? (sabotage|attack)|substation attack)\b', re.I)
EU = re.compile(r'\b(german\w*|poland|polish|denmark|danish|norw\w+|swed\w+|finland|finnish|estonia\w*|latvia\w*|lithuania\w*|baltic|nordic|netherlands|dutch|belgi\w+|luxemb\w+|swiss|switzerland|france|french|romania\w*|bulgaria\w*|czech\w*|slovak\w*|hungar\w+|austria\w*|ital\w+|spain|spanish|portug\w+|ireland|irish|britain|british|\buk\b|nato|\beu\b|europe\w*|moldova\w*|greece|greek|croatia\w*|slovenia\w*|serbia\w*|munich|berlin|frankfurt|hamburg|copenhagen|oslo|stockholm|helsinki|warsaw|vilnius|riga|tallinn|brussels|amsterdam|schiphol|paris|london|north sea|bundeswehr)\b', re.I)
EXCL = re.compile(r'ukrain|kyiv|kiev|kharkiv|odesa|odessa|dnipro|zaporizh|lviv|kherson|sumy|donetsk|crimea|belgorod|moscow|kursk|kremlin|in russia|russian region|gaza|israel|iran|houthi|yemen|sudan|lebanon|syria|iraq|red sea|hormuz|taiwan|korea|india|pakistan|africa|far east|siberia|election commission|drone show|light show|delivery|start-?up|funding|contract|procure|\bbuys?\b|purchase|export|manufactur|drone maker|shares|stocks?\b|opinion|analysis:|explainer', re.I)
NOT_EU_COUNTRIES = {'Ukraine', 'Russia', 'Belarus', 'Israel', 'Iran', 'United States', 'China', 'Turkey'}

def own_detect():
    """Nieuwe koppen uit de Argus-feed die op een hybride prikactie in Europa wijzen; bewaard in hybrid-own.json."""
    try: kept = json.load(open(OWN))
    except Exception: kept = {}
    try: items = json.load(open(os.path.join(ROOT, 'data', 'news-snapshot.json')))['newsItems']
    except Exception: items = []
    for it in items:
        t = it.get('title') or ''
        if not HYB.search(t) or not EU.search(t) or EXCL.search(t): continue
        if re.search(r'\b(says|said|warns?|warning|calls? for|urges?|vows?|could|may|might|should|must|plans?|to (protect|boost|counter)|debate|interview)\b', t, re.I) and not HARM.search(t): continue   # mening of voornemen, geen gebeurtenis
        loc = it.get('location') or {}
        if loc.get('country') in NOT_EU_COUNTRIES: continue
        try: day = parsedate_to_datetime(it['pubDate']).strftime('%Y-%m-%d')
        except Exception: continue
        if day < '2026-01-01': continue
        link = clean_url(it.get('link')) or it.get('id')
        # zelfde gebeurtenis al bewaard (binnen 2 dagen, ≥3 gedeelde kernwoorden)? → bron erbij
        twin = None
        for k, v in kept.items():
            if abs((datetime.fromisoformat(v['date']) - datetime.fromisoformat(day)).days) <= 2 and len(words(v['title']) & words(t)) >= 3: twin = v; break
        if twin:
            if all(s['url'] != link for s in twin['sources']) and len(twin['sources']) < 4: twin['sources'].append({'name': it.get('source') or 'news', 'url': link})
            continue
        typ = 'drone' if re.search(r'\bdrones?|drohnen?|uavs?\b', t, re.I) else 'jamming' if re.search(r'jamm|spoof|gps', t, re.I) else 'airspace' if re.search(r'airspace|luftraum', t, re.I) else 'cyber' if re.search(r'cyber|hack', t, re.I) else 'maritime' if re.search(r'cable|shadow fleet|vessel|ship', t, re.I) else 'sabotage'
        sev, why = severity(t, typ)
        country = loc.get('country'); place = loc.get('name') if loc.get('name') and loc.get('name') != country else None
        lat, lon = (loc.get('lat'), loc.get('lng')) if loc.get('lat') is not None else CENTROID.get((country or '').lower(), (None, None))
        kept[link] = {'id': 'own-' + re.sub(r'[^a-z0-9]+', '-', (it.get('id') or link).lower())[:40], 'date': day, 'dateApprox': False, 'countries': [country] if country else [], 'place': place, 'lat': lat, 'lon': lon, 'coordApprox': place is None,
                      'type': typ, 'title': html.unescape(t).strip().rstrip('.'), 'attribution': 'unknown', 'actor': None, 'severity': sev, 'severityWhy': why,
                      'sources': [{'name': it.get('source') or 'news', 'url': link}], 'origin': 'argus'}
    json.dump(kept, open(OWN, 'w'), ensure_ascii=False)
    return list(kept.values())

STOP = {'the', 'and', 'for', 'with', 'from', 'that', 'over', 'into', 'after', 'near', 'found', 'reported'}
def words(t): return {w for w in re.sub(r'[^a-z0-9 ]+', ' ', t.lower()).split() if len(w) > 3 and w not in STOP}
def merge(a, b):
    """Zelfde incident in beide lijsten: datum binnen 3 dagen, zelfde land, ≥3 gedeelde kernwoorden → Grey Zone (coördinaten, bronnen) wint, Saha-link erbij."""
    out = list(b)
    for s in a:
        twin = None
        for g in out:
            if g['origin'] != 'greyzone' or not (set(s['countries']) & set(g['countries'])): continue
            try: dd = abs((datetime.fromisoformat(s['date']) - datetime.fromisoformat(g['date'])).days)
            except ValueError: continue
            if dd <= 3 and len(words(s['title']) & words(g['title'])) >= 3: twin = g; break
        if twin: twin['sources'] = (twin['sources'] + s['sources'])[:3]; twin['attribution'] = 'confirmed' if 'confirmed' in (twin['attribution'], s['attribution']) else twin['attribution']
        else: out.append(s)
    return out


errors = []
try: A = schuurman()
except Exception as e: A = []; errors.append(f'schuurman: {e}')
try: B = own_detect()
except Exception as e: B = []; errors.append(f'own: {e}')
if not A and not B: sys.exit('geen enkele bron: ' + '; '.join(errors))
inc = sorted(A + B, key=lambda x: x['date'], reverse=True)
snap = {'generatedAt': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'), 'errors': errors,
        'counts': {'total': len(inc), 'schuurman': len(A), 'argus': len(B), 'bySeverity': {k: sum(1 for i in inc if i['severity'] == k) for k in ('critical', 'medium', 'small')}},
        'credits': [{'name': 'Russian Operations Against Europe Dataset 2022–2025 — Bart Schuurman, Leiden University (CC BY 4.0)', 'url': 'https://doi.org/10.7910/DVN/TQ0FMQ'}, {'name': 'ARGUS news detection (2026–), sources linked per incident', 'url': 'https://argus.prototipo.nl/sources'}],
        'incidents': inc}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump(snap, open(OUT, 'w'), ensure_ascii=False)
print(snap['generatedAt'], snap['counts'], errors or '')
