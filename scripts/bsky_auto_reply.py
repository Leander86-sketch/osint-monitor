#!/opt/homebrew/bin/python3
"""Autonome Bluesky-replies vanaf @argus.prototipo.nl (besluit 8 okt 2026; Minutes Reply-first 24 sep, limieten vastgelegd).

Harde limieten (in code, niet in een prompt):
  - alleen onder posts van accounts die Argus volgt (lib/fetchers/bluesky.ts);
  - de post moet het ONDERSCHEIDENDE woord van de situatie bevatten (MUST-regex per dossier) — tegen de radar-bug
    waarbij 'Russia' in een dronepost als plague werd gelezen;
  - alleen situaties mét dossier; tekst = kop + één geverifieerd feit + dossierlink ?ref=br, deterministisch (geen LLM);
  - max 1 reply per account per dag, max 2 replies per run, max 3 per dag; nooit twee keer onder dezelfde post;
    nooit dezelfde tekst twee keer; niet onder posts met >40 replies;
  - kill switch: bestand data/bsky-auto.off → doet niets. --dry toont wat er zou gebeuren.
Log: data/bsky-replies.jsonl (zelfde als handmatig) + data/bsky-auto.log.
"""
import sys, os, re, json, datetime, hashlib
ROOT = os.path.expanduser('~/Clawd/osint-monitor')
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
import reply_radar as radar
from bsky_onboard import PROJECTS, login, call, facets

MUST = {
    'russia-plague-irkutsk': r'plague|irkutsk|shelekhov|pneumonic',
    'strait-of-hormuz': r'hormuz',
    'red-sea-bab-al-mandab': r'houthi|red sea|yemen|bab al|aden',
    'gaza': r'gaza',
    'lebanon': r'lebanon|hezbollah|beirut',
    'iran-israel': r'\biran',
    'nato-eastern-flank': r'nato|baltic|lithuania|estonia|latvia|kaliningrad|poland',
    'ukraine-front': r'ukrain|kyiv|kharkiv|odesa|zaporizh',
    'taiwan-strait': r'taiwan',
    'korea-peninsula': r'korea|dmz|pyongyang',
    'sudan': r'sudan|darfur|\brsf\b',
    'syria': r'syria|damascus|sweida',
    'europe-airspace-drones': r'drone|airspace|black sea|cable|sabotage',
}
MAX_PER_RUN, MAX_PER_DAY, MAX_LEN = 2, 3, 300
SITUATION_TITLE = {'russia-plague-irkutsk': 'russia plague irkutsk', 'strait-of-hormuz': 'strait hormuz', 'red-sea-bab-al-mandab': 'red sea bab mandab', 'gaza': 'gaza', 'lebanon': 'lebanon hezbollah', 'iran-israel': 'iran israel', 'nato-eastern-flank': 'nato eastern flank poland', 'ukraine-front': 'ukraine front', 'taiwan-strait': 'taiwan strait', 'korea-peninsula': 'korean peninsula korea', 'sudan': 'sudan', 'syria': 'syria', 'europe-airspace-drones': 'europe airspace drones'}
LOG = os.path.join(ROOT, 'data', 'bsky-replies.jsonl'); ALOG = os.path.join(ROOT, 'data', 'bsky-auto.log')
KILL = os.path.join(ROOT, 'data', 'bsky-auto.off')

def log(msg):
    line = f"{datetime.datetime.now().isoformat(timespec='seconds')} {msg}"; print(line)
    with open(ALOG, 'a') as fh: fh.write(line + '\n')

def history():
    rows = []
    try:
        for l in open(LOG): rows.append(json.loads(l))
    except FileNotFoundError: pass
    return rows

GENERIC = set('russia russian russians ukraine ukrainian ukrainians korea korean north south china chinese iran iranian israel israeli europe european nato military drone drones attack attacks strike strikes war forces troops government officials president minister ministry city region border people killed'.split())
STOP = set('the and for with from that this after over into says said amid will have has are was were its his her their about than then them they what when where which while would could should been being because before between during under more most some such only also just like into onto very much many news report reports reported'.split())
def words(t): return {w for w in re.findall(r"[a-z][a-z'-]{3,}", (t or '').lower()) if w not in STOP}

def dossier(slug): return json.load(open(os.path.join(ROOT, 'data', 'dossiers', f'{slug}.json')))

def overlap(slug, post_text):
    """Inhoudelijke overlap tussen de post en het dossier zelf (kop + stand + claims): de titelwoorden van de situatie
    zijn te grof ('Russia', 'drone'). Eis ≥3 gedeelde woorden, anders geen reply."""
    d = dossier(slug)
    dw = words(d.get('headline', '')) | words(d.get('stand', '')) | set().union(*(words(c['text']) for c in d.get('claims', []))) if d.get('claims') else words(d.get('stand', ''))
    shared = words(post_text) & dw
    specific = {w for w in shared if w not in GENERIC and w not in words(SITUATION_TITLE.get(slug, ''))}
    return sorted(shared), sorted(specific)

def compose(slug):
    d = dossier(slug)
    head = (d.get('headline') or '').strip().rstrip('.')
    # feit = eerste zin van de stand (redactioneel, met toeschrijving) — niet een kale claim als eigen bewering
    fact = (d.get('stand') or '').split('. ')[0]
    link = f'https://argus.prototipo.nl/s/{slug}?ref=br'
    tail = f' Claim by claim, with sources: {link}'
    room = MAX_LEN - len(tail) - len(head) - 2
    fact = fact.strip()
    if len(fact) > room: fact = fact[:room - 1].rsplit(' ', 1)[0] + '…'
    text = f'{head}. {fact}{tail}' if head else f'{fact}{tail}'
    return text if len(text) <= MAX_LEN else None

def post_reply(url, text):
    handle, rkey = url.split('/profile/')[1].split('/post/')
    tdid = call('com.atproto.identity.resolveHandle', params={'handle': handle})['did']
    uri = f'at://{tdid}/app.bsky.feed.post/{rkey}'
    did, jwt, me = login(PROJECTS['argus'])
    post = call('app.bsky.feed.getPosts', jwt, params={'uris': uri})['posts'][0]
    parent = {'uri': post['uri'], 'cid': post['cid']}; root = (post['record'].get('reply') or {}).get('root') or parent
    rec = {'$type': 'app.bsky.feed.post', 'text': text, 'createdAt': datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00', 'Z'), 'langs': ['en'], 'reply': {'root': root, 'parent': parent}}
    f = facets(text)
    if f: rec['facets'] = f
    r = call('com.atproto.repo.createRecord', jwt, body={'repo': did, 'collection': 'app.bsky.feed.post', 'record': rec})
    out = f"https://bsky.app/profile/{me}/post/{r['uri'].split('/')[-1]}"
    with open(LOG, 'a') as fh: fh.write(json.dumps({'ts': rec['createdAt'], 'account': me, 'to': url, 'reply': out, 'text': text, 'auto': True}) + '\n')
    return out

def main():
    dry = '--dry' in sys.argv
    if os.path.exists(KILL): log('kill switch aan (data/bsky-auto.off) — niets gedaan'); return
    followed = set(re.findall(r"handle:\s*'([^']+)'", open(os.path.join(ROOT, 'lib', 'fetchers', 'bluesky.ts')).read()))
    today = datetime.date.today().isoformat()
    hist = history(); todays = [h for h in hist if h['ts'][:10] == today]
    if len(todays) >= MAX_PER_DAY: log(f'daglimiet bereikt ({len(todays)})'); return
    done_posts = {h['to'] for h in hist}; done_text = {hashlib.sha1(h['text'].encode()).hexdigest() for h in hist}
    done_authors_today = {h['to'].split('/profile/')[1].split('/')[0] for h in todays}
    cands = radar.argus(); placed = 0; used_slugs = set()
    for c in cands:
        slug = c.get('slug'); url = c['url']; author = c['author']; why = None
        if author not in followed: why = 'niet gevolgd'
        elif slug not in MUST: why = 'geen dossier'
        elif not re.search(MUST[slug], c['text'], re.I): why = f'post noemt {slug} niet (must-regex)'
        elif url in done_posts: why = 'al gereageerd'
        elif author in done_authors_today: why = 'account vandaag al gehad'
        elif slug in used_slugs: why = 'dossier deze run al gebruikt'
        if not why:
            ov, spec = overlap(slug, c['text'])
            if len(ov) < 3 or len(spec) < 3: why = f'te weinig specifieke overlap met het dossier (alles: {", ".join(ov) or "geen"} · specifiek: {", ".join(spec) or "geen"})'
        if why: log(f'skip @{author} → {slug}: {why}'); continue
        text = compose(slug)
        if not text: log(f'skip @{author}: tekst te lang'); continue
        if hashlib.sha1(text.encode()).hexdigest() in done_text: log(f'skip @{author}: tekst al gebruikt'); continue
        used_slugs.add(slug)
        if dry: log(f'DRY zou plaatsen onder @{author} ({c["followers"]} volgers) {url} · overlap: {", ".join(ov)} · specifiek: {", ".join(spec)}\n    {text}'); placed += 1
        else:
            out = post_reply(url, text); log(f'geplaatst onder @{author} ({c["followers"]} volgers) {url} → {out}\n    {text}'); placed += 1
            done_authors_today.add(author); done_text.add(hashlib.sha1(text.encode()).hexdigest())
        if placed >= MAX_PER_RUN or len(todays) + placed >= MAX_PER_DAY: break
    log(f'klaar: {placed} {"(dry)" if dry else "geplaatst"} van {len(cands)} kandidaten')

if __name__ == '__main__': main()
