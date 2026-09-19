#!/usr/bin/env python3
"""Focus: hybrid Europe — incidentenlijst voor Argus (19 sep 2026).

Haalt twee openbare lijsten op, voegt ze samen en kent een ernst toe volgens VASTE, navolgbare regels:
  1. Saha "Everywhere War"-tracker  (WordPress REST, ~500 incidenten sinds 2022; type + status van toeschrijving)
  2. Grey Zone Europe               (XLSX, incidenten van 2026 mét coördinaten en twee bronlinks)
Uitvoer: data/hybrid-incidents.json. Cron: elke 6 uur.

Wat we WEL overnemen: titel, datum, land, plaats, type, toeschrijving zoals de bron die geeft, en links naar de bron.
Wat we NIET overnemen: beschrijvende tekst van de trackers (geen licentie vermeld → alleen titel + link).
Toeschrijving: nooit zelf "Rusland" invullen; we tonen wat de bron zegt (confirmed / suspected / unknown).
"""
import json, os, re, sys, zipfile, io, html, urllib.request, urllib.parse
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
CENTROID = {'estonia': (58.6, 25.0), 'latvia': (56.9, 24.6), 'lithuania': (55.2, 23.9), 'poland': (52.0, 19.4), 'germany': (51.2, 10.4), 'finland': (62.0, 26.0), 'sweden': (60.1, 15.0), 'norway': (61.0, 9.0), 'denmark': (56.0, 9.5), 'netherlands': (52.2, 5.3), 'belgium': (50.6, 4.6), 'france': (46.6, 2.4), 'united-kingdom': (54.0, -2.0), 'uk': (54.0, -2.0), 'ireland': (53.2, -8.0), 'romania': (45.9, 25.0), 'bulgaria': (42.7, 25.4), 'moldova': (47.2, 28.5), 'czech-republic': (49.8, 15.5), 'czechia': (49.8, 15.5), 'slovakia': (48.7, 19.7), 'hungary': (47.2, 19.4), 'austria': (47.6, 14.1), 'italy': (42.8, 12.6), 'spain': (40.2, -3.6), 'portugal': (39.6, -8.0), 'greece': (39.1, 22.9), 'turkey': (39.0, 35.0), 'iceland': (64.9, -18.6), 'switzerland': (46.8, 8.2), 'croatia': (45.1, 15.4), 'slovenia': (46.1, 14.8), 'serbia': (44.0, 20.9), 'montenegro': (42.7, 19.3), 'albania': (41.1, 20.1), 'north-macedonia': (41.6, 21.7), 'kosovo': (42.6, 20.9), 'bosnia-and-herzegovina': (44.2, 17.8), 'luxembourg': (49.8, 6.1), 'ukraine': (49.0, 31.4), 'georgia': (42.3, 43.4), 'united-states': (39.8, -98.6), 'usa': (39.8, -98.6), 'canada': (56.1, -106.3), 'japan': (36.2, 138.3), 'south-korea': (36.5, 127.9), 'baltic-sea': (57.5, 19.5), 'north-sea': (56.0, 3.5), 'black-sea': (43.4, 34.0)}
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

def saha():
    out, page = [], 1
    skip = ('military-drills', 'transfer-of-troops', 'construction-of-new-bases', 'relocation-of-nuclear', 'potential-military-threats', 'hostile-space')
    while page <= 12:
        try: rows = json.loads(get(f'https://sahasec.org/tracker/wp-json/wp/v2/incidents?per_page=100&page={page}&_fields=id,date,link,title,content,class_list'))
        except Exception: break
        if not rows: break
        for r in rows:
            cl = r.get('class_list') or []
            types = [c[len('incident-type-'):] for c in cl if c.startswith('incident-type-')]
            if not types or all(any(s in t for s in skip) for t in types): continue   # troepenverplaatsingen en oefeningen zijn geen prikacties
            sub = ' '.join(types)
            typ = 'drone' if 'drones' in sub else 'sabotage' if 'sabotage' in sub else 'maritime' if 'maritime' in sub else 'jamming' if 'electronic-warfare' in sub else 'cyber' if 'cyber' in sub else 'airspace' if 'airspace' in sub else 'other'
            countries = [c[len('countries-'):] for c in cl if c.startswith('countries-')]
            title = html.unescape(re.sub(r'<[^>]+>', '', (r.get('title') or {}).get('rendered', ''))).strip().rstrip('.')
            text = html.unescape(re.sub(r'<[^>]+>', ' ', (r.get('content') or {}).get('rendered', '')))
            posted = r['date'][:10]
            when = date_from_text(text, int(posted[:4]))
            if when and when > posted: when = f'{int(posted[:4]) - 1}{when[4:]}'   # 'On December 28' gepubliceerd in januari
            attr = 'confirmed' if any('officially-attributed' in c for c in cl) else 'suspected' if any('fitting-the-pattern' in c for c in cl) else 'unknown'
            sev, why = severity(title, typ, sub)
            lat, lon = CENTROID.get(countries[0], (None, None)) if countries else (None, None)
            out.append({'id': f'saha-{r["id"]}', 'date': when or posted, 'dateApprox': when is None, 'countries': [nice(c) for c in countries], 'place': None, 'lat': lat, 'lon': lon, 'coordApprox': True,
                        'type': typ, 'title': title, 'attribution': attr, 'actor': 'Russia' if attr == 'confirmed' else None, 'severity': sev, 'severityWhy': why,
                        'sources': [{'name': 'Saha tracker', 'url': r['link']}], 'origin': 'saha'})
        page += 1
    return out

def greyzone():
    z = zipfile.ZipFile(io.BytesIO(get('https://greyzoneeurope.eu/data/incidents.xlsx')))
    ns = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}; T = '{%s}t' % ns['m']
    ss = [''.join(t.text or '' for t in si.iter(T)) for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si', ns)] if 'xl/sharedStrings.xml' in z.namelist() else []
    rows = []
    for r in ET.fromstring(z.read('xl/worksheets/sheet1.xml')).iter('{%s}row' % ns['m']):
        row = {}
        for c in r.findall('m:c', ns):
            col = re.match(r'[A-Z]+', c.get('r')).group(0); v = c.find('m:v', ns)
            row[col] = ''.join(x.text or '' for x in c.iter(T)) if c.get('t') == 'inlineStr' else ((ss[int(v.text)] if c.get('t') == 's' else v.text) if v is not None else '')
        rows.append(row)
    head = {k: v for k, v in rows[0].items()}; out = []
    for row in rows[1:]:
        g = {head[k]: v for k, v in row.items() if k in head}
        if not g.get('title') or not g.get('date'): continue
        cat = (g.get('category') or '').lower()
        typ = 'drone' if 'drone' in cat else 'sabotage' if any(x in cat for x in ('sabot', 'arson', 'vandal')) else 'maritime' if any(x in cat for x in ('marit', 'cable', 'vessel')) else 'jamming' if any(x in cat for x in ('jam', 'gps', 'electronic')) else 'cyber' if 'cyber' in cat else 'airspace' if 'air' in cat else 'other'
        a = (g.get('attribution') or '').lower()
        attr = 'confirmed' if any(x in a for x in ('attributed', 'confirmed', 'official')) else 'suspected' if 'suspect' in a else 'unknown'
        srcs = [{'name': g.get(f'source_{i}_name') or 'source', 'url': clean_url(g.get(f'source_{i}_url'))} for i in (1, 2) if g.get(f'source_{i}_url')]
        if not srcs: continue   # zonder controleerbare bron komt een regel er niet in
        sev, why = severity(g['title'], typ, f"{g.get('target', '')} {cat}")
        try: lat, lon = float(g.get('lat')), float(g.get('lon'))
        except (TypeError, ValueError): lat = lon = None
        actor = (g.get('actor') or '').strip()
        raw = str(g['date']).strip()
        if re.fullmatch(r'\d{5}(\.\d+)?', raw):   # Excel-datum: dagen sinds 1899-12-30
            from datetime import timedelta
            raw = (datetime(1899, 12, 30) + timedelta(days=int(float(raw)))).strftime('%Y-%m-%d')
        out.append({'id': f"gz-{g.get('id')}", 'date': raw[:10], 'dateApprox': False, 'countries': [g.get('country')] if g.get('country') else [], 'place': g.get('location') or None, 'lat': lat, 'lon': lon, 'coordApprox': False,
                    'type': typ, 'title': g['title'].strip(), 'attribution': attr, 'actor': actor if actor and actor.lower() != 'unknown' else None, 'severity': sev, 'severityWhy': why,
                    'campaign': g.get('campaign_name') or None, 'sources': srcs, 'origin': 'greyzone'})
    return out

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
try: A = saha()
except Exception as e: A = []; errors.append(f'saha: {e}')
try: B = greyzone()
except Exception as e: B = []; errors.append(f'greyzone: {e}')
if not A and not B: sys.exit('geen enkele bron bereikbaar: ' + '; '.join(errors))
inc = sorted(merge(A, B), key=lambda x: x['date'], reverse=True)
snap = {'generatedAt': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'), 'errors': errors,
        'counts': {'total': len(inc), 'saha': len(A), 'greyzone': len(B), 'bySeverity': {k: sum(1 for i in inc if i['severity'] == k) for k in ('critical', 'medium', 'small')}},
        'credits': [{'name': 'Saha — Everywhere War tracker', 'url': 'https://sahasec.org/tracker/'}, {'name': 'Grey Zone Europe', 'url': 'https://greyzoneeurope.eu/'}],
        'incidents': inc}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump(snap, open(OUT, 'w'), ensure_ascii=False)
print(snap['generatedAt'], snap['counts'], errors or '')
