#!/opt/homebrew/bin/python3
"""Reply-radar (25 sep 2026): kandidaten op Bluesky waar Argus of de Hub iets aan toe te voegen heeft.

Argus: recente posts (36 h) van de 16 gevolgde accounts + zoekresultaten op de drie situaties met de meeste beweging,
gematcht op titel/keywords van de actieve situaties; per kandidaat de feiten die de reply kan dragen
(nieuwe berichten per 24 h, ernst, laatste kop, situatiepagina). Hub: zoekopdrachten "where to watch" + serienamen (48 h).
Uitvoer: data/reply-radar-<datum>.json + leesbare lijst. Replies schrijft Claude in de ochtendronde; Leander zegt go.
--auto: autonome stand (uit tot 8 okt 2026; zie Minutes Reply-first).
Gebruik: reply_radar.py [argus|hub|all] [--auto]"""
import sys, os, json, re, datetime, urllib.request, urllib.parse

ROOT = os.path.expanduser("~/Clawd/osint-monitor"); API = "http://localhost:3003"; PUB = "https://public.api.bsky.app/xrpc/"
AUTO_FROM = datetime.date(2026, 10, 8)
UA = {"User-Agent": "ARGUS-radar/1.0"}
STOP = {"the", "and", "for", "with", "from", "front", "war", "news", "live", "of", "in", "on", "to", "a"}

def get(url, q=None):
    with urllib.request.urlopen(urllib.request.Request(url + ("?" + urllib.parse.urlencode(q, doseq=True) if q else ""), headers=UA), timeout=40) as r: return json.loads(r.read())

def bsky_url(post): return f"https://bsky.app/profile/{post['author']['handle']}/post/{post['uri'].split('/')[-1]}"

def recent_posts(handle, hours):
    out = []; since = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=hours)
    try: feed = get(PUB + "app.bsky.feed.getAuthorFeed", {"actor": handle, "limit": 30, "filter": "posts_no_replies"})
    except Exception: return out
    for it in feed.get("feed", []):
        po = it["post"]
        if po["author"]["handle"] != handle or it.get("reason"): continue
        try: at = datetime.datetime.fromisoformat(po["record"]["createdAt"].replace("Z", "+00:00"))
        except Exception: continue
        if at < since: continue
        out.append(po)
    return out

def search(q, hours, limit=15):
    since = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=hours)).isoformat().replace("+00:00", "Z")
    try: return get(PUB + "app.bsky.feed.searchPosts", {"q": q, "sort": "latest", "since": since, "limit": limit, "lang": "en"}).get("posts", [])
    except Exception: return []

def terms(s):
    words = set(re.findall(r"[a-z][a-z-]{2,}", (s.get("title", "") + " " + " ".join(s.get("keywords", []) or []) + " " + " ".join(s.get("actors", []) or [])).lower()))
    return {w for w in words if w not in STOP}

def argus():
    sits = get(API + "/api/situations"); sits = sits if isinstance(sits, list) else sits.get("situations", [])
    sits = [s for s in sits if s.get("status") in (None, "active")]
    for s in sits:
        s["_terms"] = terms(s); s["_v"] = int((s.get("metadata") or {}).get("velocity24h") or 0)
        s["_title"] = {w for w in re.findall(r"[a-z][a-z-]{2,}", s.get("title", "").lower()) if w not in STOP}
    top = sorted(sits, key=lambda s: -s["_v"])[:3]
    from bsky_follow import PROJECTS  # noqa (zelfde map)
    sys.path.insert(0, os.path.join(ROOT, "lib"))
    handles = re.findall(r"handle:\s*'([^']+)'", open(os.path.join(ROOT, "lib", "fetchers", "bluesky.ts")).read())
    pool = {}
    for h in handles:
        for po in recent_posts(h, 36): pool[po["uri"]] = po
    for s in top:
        for po in search(s["title"].split("/")[0].strip(), 24):
            if po["author"].get("followersCount", 0) >= 300 or po["author"]["handle"] in handles: pool[po["uri"]] = po
    cands = []
    for po in pool.values():
        text = po["record"].get("text", ""); low = text.lower(); words = set(re.findall(r"[a-z][a-z-]{2,}", low))
        best, score = None, 0
        for s in sits:
            if not (words & s["_title"]): continue  # minstens één woord uit de situatietitel zelf
            hit = len(words & s["_terms"])
            if hit > score: best, score = s, hit
        if not best or score < 2: continue
        if po.get("replyCount", 0) > 40: continue  # al druk, reply verdwijnt
        cands.append({"score": score * 10 + min(po.get("likeCount", 0), 50) / 10, "url": bsky_url(po), "uri": po["uri"], "cid": po["cid"], "author": po["author"]["handle"],
                      "followers": po["author"].get("followersCount"), "at": po["record"].get("createdAt", "")[:16], "text": text[:220],
                      "situation": best["title"], "slug": best["slug"], "severity": best.get("severity"), "new24h": best["_v"],
                      "latest": best.get("latestHeadline", "")[:120], "page": f"https://argus.prototipo.nl/s/{best['slug']}"})
    cands.sort(key=lambda c: -c["score"])
    out, per = [], {}
    for c in cands:
        if per.get(c["author"], 0) >= 2: continue
        per[c["author"]] = per.get(c["author"], 0) + 1; out.append(c)
        if len(out) >= 8: break
    fill_followers(out); return out

def fill_followers(cands):
    hs = sorted({c["author"] for c in cands})
    if not hs: return
    try:
        profs = get(PUB + "app.bsky.actor.getProfiles", [("actors", h) for h in hs]).get("profiles", [])
        fc = {p["handle"]: p.get("followersCount") for p in profs}
        for c in cands: c["followers"] = fc.get(c["author"], c["followers"])
    except Exception: pass

def hub():
    series = ["MotoGP", "WEC", "IMSA", "NASCAR", "IndyCar", "WRC", "Formula E", "WorldSBK", "BTCC", "DTM", "Supercars", "F1"]
    pool = {}
    for q in ["\"where to watch\" race", "\"where can I watch\" racing", "stream motorsport free", "\"how to watch\" MotoGP", "\"how to watch\" WEC", "\"how to watch\" IndyCar"]:
        for po in search(q, 48, 20): pool[po["uri"]] = po
    cands = []
    for po in pool.values():
        text = po["record"].get("text", ""); low = text.lower()
        if not re.search(r"where (to|can i) watch|how to watch|stream", low): continue
        hit = [s for s in series if s.lower() in low]
        if not hit and "race" not in low and "racing" not in low: continue
        cands.append({"score": len(hit) * 10 + min(po.get("likeCount", 0), 30), "url": bsky_url(po), "uri": po["uri"], "cid": po["cid"], "author": po["author"]["handle"],
                      "followers": po["author"].get("followersCount"), "at": po["record"].get("createdAt", "")[:16], "text": text[:220], "series": hit,
                      "page": "https://motorsport.prototipo.nl/watch/"})
    cands.sort(key=lambda c: -c["score"]); cands = cands[:6]; fill_followers(cands); return cands

def main():
    which = next((a for a in sys.argv[1:] if a in ("argus", "hub", "all")), "all")
    if "--auto" in sys.argv and datetime.date.today() < AUTO_FROM: print(f"autonome stand uit tot {AUTO_FROM} (Minutes Reply-first 24 sep)"); 
    out = {"ts": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")}
    if which in ("argus", "all"): out["argus"] = argus()
    if which in ("hub", "all"): out["hub"] = hub()
    os.makedirs(os.path.join(ROOT, "data"), exist_ok=True)
    day = datetime.date.today().isoformat()
    json.dump(out, open(os.path.join(ROOT, "data", f"reply-radar-{day}.json"), "w"), ensure_ascii=False, indent=1)
    for k in ("argus", "hub"):
        if k not in out: continue
        print(f"\n== {k.upper()} ({len(out[k])} kandidaten)")
        for i, c in enumerate(out[k], 1):
            extra = f"→ {c['situation']} · {c['severity']} · {c['new24h']} new/24h · {c['page']}" if k == "argus" else f"→ {', '.join(c['series']) or 'racing'} · {c['page']}"
            print(f"{i}. @{c['author']} ({c['followers']} volgers, {c['at']}) {c['url']}\n   \"{c['text'][:160]}\"\n   {extra}")

if __name__ == "__main__": main()
