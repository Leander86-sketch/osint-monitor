#!/usr/bin/env python3
"""Extractiestap voor situatiedossiers (6 okt 2026). Standaard ZONDER API-kosten: het script doet het deterministische
werk, het lezen/extraheren doet Claude in de sessie (ochtendronde), review door Leander, dan --apply.

  dossier_extract.py <slug> bundle [--since H] [--max N]   artikelen ophalen → data/dossiers/proposals/<slug>-<t>.bundle.json
  dossier_extract.py <slug> verify <proposal.json>         citaten in het voorstel checken tegen de bundel, .md renderen
  dossier_extract.py <slug> apply <proposal.json>          geverifieerde regels overnemen in het dossier (backup erbij)
  dossier_extract.py <slug> propose --cli [--since H]     onbemand: zelfde extractie via claude -p op de Mini (abonnement, geen API-kosten)
  dossier_extract.py <slug> propose --api [--model M]      OPTIONEEL: via de betaalde Anthropic API (~€0,10/run); staat uit

Bundel: artikelen van de situatie (via /api/situations + /api/feed) van de laatste H uur — ankerbronnen eerst,
Google-News-wrappers overgeslagen (geen tekst). Voorstel = diff t.o.v. het dossier: cijfers, claims met status,
tijdlijnregels, elk met bron-url én letterlijk citaat. verify eist dat elk citaat in de bundeltekst staat; een regel
zonder vindbaar citaat heet unverified en wordt door apply nooit overgenomen.
"""
import json, os, re, sys, time, html, datetime as dt
import requests
from bs4 import BeautifulSoup

ROOT = os.path.expanduser('~/Clawd/osint-monitor')
API = 'http://localhost:3003'
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36'
MODEL = 'claude-sonnet-5-5'

def env_key():
    for f in (os.path.expanduser('~/Clawd/osint-monitor/.env.local'), os.path.expanduser('~/Clawd/butler-dashboard/.env.local')):
        try:
            for line in open(f):
                if line.startswith('ANTHROPIC_API_KEY='):
                    v = line.split('=', 1)[1].strip().strip('"').strip("'")
                    if v: return v
        except FileNotFoundError: pass
    sys.exit('ANTHROPIC_API_KEY not found in .env.local')

def load_dossier(slug):
    return json.load(open(f'{ROOT}/data/dossiers/{slug}.json', encoding='utf-8'))

def situation_items(slug, since_h):
    sits = requests.get(f'{API}/api/situations', timeout=30).json()['situations']
    s = next((x for x in sits if x['slug'] == slug), None)
    if not s: sys.exit(f'situation {slug} not found')
    feed = requests.get(f'{API}/api/feed?limit=3200', timeout=60).json()
    feed = feed if isinstance(feed, list) else feed.get('items', [])
    by = {i['id']: i for i in feed}
    items = [by[i] for i in s['itemIds'] if i in by]
    cutoff = time.time() - since_h * 3600
    out = []
    for i in items:
        try: ts = dt.datetime.strptime(i['pubDate'][:25].strip(), '%a, %d %b %Y %H:%M:%S').timestamp() if ',' in i['pubDate'] else dt.datetime.fromisoformat(i['pubDate'].replace('Z', '+00:00')).timestamp()
        except Exception: ts = time.time()
        if ts >= cutoff: out.append(i)
    return s, out

def fetch_text(url):
    try:
        r = requests.get(url, headers={'User-Agent': UA, 'Accept-Language': 'en'}, timeout=20, allow_redirects=True)
        if r.status_code != 200: return None, f'http {r.status_code}'
        soup = BeautifulSoup(r.text, 'html.parser')
        for t in soup(['script', 'style', 'nav', 'header', 'footer', 'aside', 'form']): t.decompose()
        art = soup.find('article') or soup.find('main') or soup.body
        paras = [p.get_text(' ', strip=True) for p in (art or soup).find_all(['p', 'h2', 'li'])]
        text = '\n'.join(p for p in paras if len(p) > 40)
        text = re.sub(r'\s+', ' ', text)
        if len(text) < 400: return None, 'too short (paywall or JS page)'
        return text[:6000], 'ok'
    except Exception as e:
        return None, f'error {type(e).__name__}'

def pick_articles(d, items, max_n):
    anchors = [re.compile(a['match'], re.I) for a in d.get('anchors', [])]
    def rank(i):
        if any(a.search(i['source']) for a in anchors): return 0
        return 1 if i.get('sourceTier') == 1 else 2
    cand = [i for i in items if 'news.google.com' not in i['link']]
    cand.sort(key=lambda i: (rank(i), i['pubDate']), reverse=False)
    skipped = [i for i in items if 'news.google.com' in i['link']]
    got, log = [], []
    for i in cand:
        if len(got) >= max_n: break
        text, why = fetch_text(i['link'])
        log.append((i['source'], i['title'][:80], why))
        if text: got.append({'source': i['source'], 'title': i['title'], 'url': i['link'], 'date': i['pubDate'], 'text': text})
    return got, skipped, log

SYSTEM = """You are the extraction step for ARGUS, an open-source situation monitor. You read news articles and propose
updates to a hand-compiled dossier. Rules, strictly:
1. Use ONLY the article texts given. No outside knowledge. If the texts do not say it, do not propose it.
2. Every proposed line carries: the source url (from the articles given) and a VERBATIM quote of at most 25 words copied
   exactly from that article's text, which supports the line. No paraphrase in the quote field.
3. Status of a claim: "confirmed" = stated by a health/government authority or an international body as fact;
   "reported" = media report not confirmed by an authority; "disputed" = one side claims, another denies;
   "debunked" = checked and found false. Attribute: who says, who denies.
4. Do not repeat what the dossier already says unless the article CHANGES it (new number, new date, a denial, a
   confirmation). For a change, give action "change" and name what changed.
5. Figures: only propose a figure if an article states the number; say which source and date.
6. Dates in the timeline as "6 Oct" style. Prefer the article's own dating of events over its publication date.
7. Be sparse and precise. Short sentences. Name the actor. British spelling. English output.
8. Output ONE JSON object, nothing else, with this shape:
{"summary": "2-3 sentences: what changed since the dossier was last updated",
 "stand": "a proposed replacement paragraph for the stand (max 90 words), or null if no change needed",
 "figures": [{"action":"new|change","label":"...","value":"...","src":{"name":"...","url":"...","date":"6 Oct"},"quote":"..."}],
 "claims": [{"action":"new|change","status":"confirmed|reported|disputed|debunked","text":"...","by":"Says: ... Denies: ...","sources":[{"name":"...","url":"...","date":"6 Oct"}],"quote":"..."}],
 "timeline": [{"date":"6 Oct","kind":"official|media|denial|factcheck|reaction","text":"...","sources":[{"name":"...","url":"..."}],"quote":"..."}],
 "questions": ["open questions a human editor should check, if any"]}"""

def build_prompt(d, arts):
    compact = json.loads(json.dumps({k: d.get(k) for k in ('slug', 'updatedAt', 'stand', 'figures', 'claims', 'timeline')}))
    for c in compact.get('claims', []): c.pop('sources', None)
    for t in compact.get('timeline', []): t.pop('sources', None)
    for f in compact.get('figures', []): f['src'] = f['src']['name'] if isinstance(f.get('src'), dict) else f.get('src')
    user = 'CURRENT DOSSIER (JSON):\n' + json.dumps(compact, ensure_ascii=False) + '\n\nARTICLES:\n'
    for k, a in enumerate(arts, 1):
        user += f'\n--- ARTICLE {k} · {a["source"]} · {a["date"]} · {a["url"]}\nTITLE: {a["title"]}\n{a["text"]}\n'
    user += '\nPropose the update as the JSON object described. Output JSON only, no prose, no code fence.'
    return user

def parse_json(txt):
    m = re.search(r'\{.*\}', txt, re.S)
    if not m: sys.exit('no JSON in answer:\n' + txt[:500])
    return json.loads(m.group(0))

def propose_cli(d, arts, model='sonnet'):
    """Zelfde extractie via Claude Code op de Mini (claude -p): loopt op het abonnement, geen API-kosten."""
    import subprocess
    prompt = SYSTEM + '\n\n' + build_prompt(d, arts)
    r = subprocess.run(['/opt/homebrew/bin/claude', '-p', '--model', model, '--output-format', 'text'], input=prompt, capture_output=True, text=True, timeout=900, cwd=ROOT)
    if r.returncode != 0: sys.exit('claude -p failed: ' + r.stderr[:400])
    return parse_json(r.stdout)

def propose(d, arts, model, key):
    user = build_prompt(d, arts)
    r = requests.post('https://api.anthropic.com/v1/messages', headers={'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json'},
                      json={'model': model, 'max_tokens': 4000, 'system': SYSTEM, 'messages': [{'role': 'user', 'content': user}]}, timeout=180)
    if r.status_code != 200: sys.exit(f'API {r.status_code}: {r.text[:300]}')
    j = r.json()
    return parse_json(''.join(b.get('text', '') for b in j['content'])), j.get('usage', {}), len(user)

def norm(s): return re.sub(r'[^a-z0-9]+', ' ', html.unescape(s or '').lower()).strip()

def verify(prop, arts):
    """Elk citaat moet letterlijk (genormaliseerd) in een opgehaalde tekst staan; anders unverified."""
    texts = {a['url']: norm(a['text']) for a in arts}
    alltext = ' '.join(texts.values())
    n_ok = n_bad = 0
    for sec in ('figures', 'claims', 'timeline'):
        for row in prop.get(sec, []) or []:
            q = norm(row.get('quote', ''))
            ok = bool(q) and len(q) >= 15 and q in alltext
            row['verified'] = ok
            if ok: n_ok += 1
            else: n_bad += 1
    return n_ok, n_bad

def render_md(slug, prop, arts, skipped, log, usage, model):
    L = [f'# Dossier proposal · {slug} · {dt.datetime.now().strftime("%d %b %Y %H:%M")}', '',
         f'_{len(arts)} articles read, {len(skipped)} Google-News links skipped (no text), model {model}, {usage.get("input_tokens", "?")} in / {usage.get("output_tokens", "?")} out tokens._', '',
         '## Summary', prop.get('summary', ''), '']
    if prop.get('stand'): L += ['## Proposed stand', prop['stand'], '']
    def srcs(xs): return ' · '.join(f'[{s.get("name")}]({s.get("url")})' + (f' {s["date"]}' if s.get('date') else '') for s in xs or [])
    if prop.get('figures'):
        L += ['## Figures']
        for f in prop['figures']: L += [f'- **{f.get("value")}** {f.get("label")} — {f.get("action")} · [{f["src"]["name"]}]({f["src"]["url"]}) {f["src"].get("date","")} {"✓" if f.get("verified") else "⚠ quote not found"}', f'  > {f.get("quote")}']
        L += ['']
    if prop.get('claims'):
        L += ['## Claims']
        for c in prop['claims']: L += [f'- **{c.get("status","").upper()}** ({c.get("action")}) {c.get("text")}', f'  {c.get("by","")}', f'  {srcs(c.get("sources"))} {"✓" if c.get("verified") else "⚠ quote not found"}', f'  > {c.get("quote")}']
        L += ['']
    if prop.get('timeline'):
        L += ['## Timeline']
        for t in prop['timeline']: L += [f'- **{t.get("date")}** · {t.get("kind")} · {t.get("text")} — {srcs(t.get("sources"))} {"✓" if t.get("verified") else "⚠ quote not found"}', f'  > {t.get("quote")}']
        L += ['']
    if prop.get('questions'): L += ['## Open questions for the editor'] + [f'- {q}' for q in prop['questions']] + ['']
    L += ['## Articles read'] + [f'- {a["source"]} · {a["title"]} · {a["url"]}' for a in arts] + ['', '## Fetch log'] + [f'- {s} · {t} · {w}' for s, t, w in log]
    return '\n'.join(L)

MONTHS = {m: i for i, m in enumerate(['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'], 1)}
def tkey(e):
    """'~25 Sep' / '1–2 Oct' / '6 Oct' → (maand, eerste dag); onbekend → achteraan. Stabiel, dus gelijke datums houden hun volgorde."""
    m = re.search(r'(\d{1,2})\D*([A-Za-z]{3})', e.get('date', ''))
    return (MONTHS.get(m.group(2).lower(), 13), int(m.group(1))) if m else (13, 0)
def sort_timeline(tl): return sorted(tl, key=tkey)

def apply(slug, pfile):
    d = load_dossier(slug); prop = json.load(open(pfile, encoding='utf-8'))
    bak = f'{ROOT}/data/dossiers/{slug}.json.bak-{dt.datetime.now().strftime("%Y%m%d-%H%M")}'
    json.dump(d, open(bak, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    n = 0
    for f in prop.get('figures', []) or []:
        if not f.get('verified'): continue
        row = {'label': f['label'], 'value': f['value'], 'color': '#f59e0b', 'src': f['src']}
        ex = next((x for x in d['figures'] if x['label'].lower() == f['label'].lower()), None)
        if ex: ex.update(row)
        else: d['figures'].append(row)
        n += 1
    def words(t): return set(re.findall(r'[a-z]{4,}', (t or '').lower()))
    for c in prop.get('claims', []) or []:
        if not c.get('verified'): continue
        row = {'status': c['status'], 'text': c['text'], 'by': c.get('by', ''), 'sources': c.get('sources', [])}
        if c.get('action') == 'change':
            # vervang de bestaande claim met de grootste woordoverlap (de bronnen van de oude regel blijven staan)
            w = words(c['text']); best, score = None, 0.0
            for ex in d['claims']:
                o = len(w & words(ex['text'])) / max(1, len(w | words(ex['text'])))
                if o > score: best, score = ex, o
            if best and score >= 0.12:
                row['sources'] = best.get('sources', []) + [x for x in row['sources'] if x.get('url') not in {y.get('url') for y in best.get('sources', [])}]
                d['claims'][d['claims'].index(best)] = row; n += 1; continue
        d['claims'].append(row); n += 1
    for t in prop.get('timeline', []) or []:
        if not t.get('verified'): continue
        d['timeline'].append({'date': t['date'], 'kind': t.get('kind', 'media'), 'text': t['text'], 'sources': t.get('sources', [])}); n += 1
    d['timeline'] = sort_timeline(d['timeline'])
    if prop.get('stand') and prop.get('apply_stand'): d['stand'] = prop['stand']; n += 1
    d['updatedAt'] = dt.datetime.now().astimezone().isoformat(timespec='minutes')
    json.dump(d, open(f'{ROOT}/data/dossiers/{slug}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print(f'applied {n} verified lines to {slug}; backup {bak}')

def main():
    if len(sys.argv) < 3: sys.exit(__doc__)
    slug, cmd, args = sys.argv[1], sys.argv[2], sys.argv[3:]
    os.makedirs(f'{ROOT}/data/dossiers/proposals', exist_ok=True)
    stamp = dt.datetime.now().strftime('%Y%m%d-%H%M')
    if cmd == 'bundle':
        d = load_dossier(slug)
        since = float(args[args.index('--since') + 1]) if '--since' in args else 24
        max_n = int(args[args.index('--max') + 1]) if '--max' in args else 14
        s, items = situation_items(slug, since)
        arts, skipped, log = pick_articles(d, items, max_n)
        out = f'{ROOT}/data/dossiers/proposals/{slug}-{stamp}.bundle.json'
        json.dump({'slug': slug, 'since_h': since, 'items': len(items), 'skipped_google': len(skipped), 'log': log, 'articles': arts, 'dossier_updatedAt': d['updatedAt']}, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(f'{s["title"]}: {len(items)} items in the last {since:g} h; {len(arts)} article texts fetched, {len(skipped)} Google-News links skipped')
        for src, t, w in log: print(f'  {w:36s} {src} · {t}')
        print('bundle:', out)
    elif cmd in ('verify', 'apply'):
        pfile = args[0]; prop = json.load(open(pfile, encoding='utf-8'))
        bfile = prop.get('_bundle') or args[args.index('--bundle') + 1]
        b = json.load(open(bfile, encoding='utf-8')); arts = b['articles']
        ok, bad = verify(prop, arts)
        prop['_meta'] = {'slug': slug, 'verified': ok, 'unverified': bad, 'at': dt.datetime.now().isoformat(timespec='minutes'), 'mode': prop.get('_meta', {}).get('mode', 'in-session (no API cost)')}
        json.dump(prop, open(pfile, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        md = render_md(slug, prop, arts, [None] * b.get('skipped_google', 0), b.get('log', []), {}, prop['_meta']['mode'])
        open(pfile.replace('.json', '.md'), 'w', encoding='utf-8').write(md)
        print(f'{ok} quotes verified, {bad} not → {pfile.replace(".json", ".md")}')
        if cmd == 'apply': apply(slug, pfile)
    elif cmd == 'propose':
        if '--api' not in args and '--cli' not in args: sys.exit('propose needs --cli (claude -p on this machine, subscription) or --api (paid Anthropic API).')
        d = load_dossier(slug)
        since = float(args[args.index('--since') + 1]) if '--since' in args else 26
        s, items = situation_items(slug, since); arts, skipped, log = pick_articles(d, items, 14)
        if not arts: print(f'{slug}: no article text in the last {since:g} h — nothing to propose'); return
        if '--cli' in args:
            model = args[args.index('--model') + 1] if '--model' in args else 'sonnet'
            prop = propose_cli(d, arts, model); usage = {}; mode = f'claude -p {model} (subscription)'
        else:
            key = env_key(); model = args[args.index('--model') + 1] if '--model' in args else MODEL
            prop, usage, _ = propose(d, arts, model, key); mode = f'api {model}'
        ok, bad = verify(prop, arts)
        bfile = f'{ROOT}/data/dossiers/proposals/{slug}-{stamp}.bundle.json'
        json.dump({'slug': slug, 'since_h': since, 'items': len(items), 'skipped_google': len(skipped), 'log': log, 'articles': arts, 'dossier_updatedAt': d['updatedAt']}, open(bfile, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        prop['_bundle'] = bfile
        prop['_meta'] = {'slug': slug, 'mode': mode, 'usage': usage, 'verified': ok, 'unverified': bad, 'at': dt.datetime.now().isoformat(timespec='minutes')}
        base = f'{ROOT}/data/dossiers/proposals/{slug}-{stamp}'
        json.dump(prop, open(base + '.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        open(base + '.md', 'w', encoding='utf-8').write(render_md(slug, prop, arts, skipped, log, usage, model)); print(base + '.md')
    else: sys.exit(__doc__)

if __name__ == '__main__': main()
