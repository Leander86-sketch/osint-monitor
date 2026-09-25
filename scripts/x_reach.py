#!/opt/homebrew/bin/python3
"""X-bereik per tweet voor @LeanderLbb en @ArgusDashboard (23 sep 2026).

Elke run: volgers + de laatste 20 tweets met openbare cijfers (impressies, likes, replies, reposts,
bookmarks), één JSON-regel per run in data/x-reach.jsonl. `report` toont per account de laatste
stand per tweet en de groei sinds de vorige run. Leest met de Argus-sleutels (OAuth 1.0a); alleen
openbare cijfers, dus geen profielbezoeken of link-klikken."""
import os, sys, json, time, secrets, hmac, hashlib, base64, urllib.request, urllib.parse
from datetime import datetime, timezone

ROOT = os.path.expanduser("~/Clawd/osint-monitor")
OUT = os.path.join(ROOT, "data", "x-reach.jsonl")
HANDLES = ["LeanderLbb", "ArgusDashboard", "MotorsportHubTv"]
BSKY = ["argus.prototipo.nl", "motorsport.prototipo.nl"]  # 25 sep 2026: Bluesky via de publieke API, geen login nodig

def load_env():
    env = {}
    for l in open(os.path.join(ROOT, ".env.local")):
        l = l.strip()
        if "=" in l and not l.startswith("#"):
            k, v = l.split("=", 1); env[k.strip()] = v.strip().strip('"').strip("'")
    return env

def pct(s): return urllib.parse.quote(str(s), safe="~")

def get(env, url, params):
    o = {"oauth_consumer_key": env["X_API_KEY"], "oauth_nonce": secrets.token_hex(16), "oauth_signature_method": "HMAC-SHA1",
         "oauth_timestamp": str(int(time.time())), "oauth_token": env["X_ACCESS_TOKEN"], "oauth_version": "1.0"}
    allp = {**params, **o}; base = "&".join(f"{pct(k)}={pct(allp[k])}" for k in sorted(allp))
    key = f"{pct(env['X_API_SECRET'])}&{pct(env['X_ACCESS_SECRET'])}".encode()
    o["oauth_signature"] = base64.b64encode(hmac.new(key, f"GET&{pct(url)}&{pct(base)}".encode(), hashlib.sha1).digest()).decode()
    hdr = "OAuth " + ", ".join(f'{pct(k)}="{pct(v)}"' for k, v in sorted(o.items()))
    req = urllib.request.Request(url + "?" + urllib.parse.urlencode(params), headers={"Authorization": hdr})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

def collect():
    env = load_env(); run = {"ts": datetime.now(timezone.utc).isoformat(timespec="seconds"), "accounts": {}}
    for h in HANDLES:
        try:
            u = get(env, f"https://api.twitter.com/2/users/by/username/{h}", {"user.fields": "public_metrics"})["data"]
            t = get(env, f"https://api.twitter.com/2/users/{u['id']}/tweets",
                    {"max_results": "20", "tweet.fields": "public_metrics,created_at,referenced_tweets", "exclude": "retweets"})
            tweets = []
            for x in t.get("data", []):
                m = x["public_metrics"]; ref = (x.get("referenced_tweets") or [{}])[0].get("type", "post")
                tweets.append({"id": x["id"], "at": x["created_at"], "kind": {"replied_to": "reply", "quoted": "quote"}.get(ref, "post"),
                               "imp": m.get("impression_count", 0), "likes": m.get("like_count", 0), "replies": m.get("reply_count", 0),
                               "reposts": m.get("retweet_count", 0), "bookmarks": m.get("bookmark_count", 0), "text": x["text"][:90]})
            pm = u["public_metrics"]
            run["accounts"][h] = {"followers": pm["followers_count"], "tweets": pm["tweet_count"], "items": tweets}
        except Exception as e:
            run["accounts"][h] = {"error": str(e)[:200]}
        time.sleep(2)
    run["bluesky"] = {}
    for h in BSKY:
        try:
            pub = "https://public.api.bsky.app/xrpc/"
            def pget(m, q):
                with urllib.request.urlopen(urllib.request.Request(pub + m + "?" + urllib.parse.urlencode(q), headers={"User-Agent": "ARGUS-reach/1.0"}), timeout=30) as r: return json.loads(r.read())
            prof = pget("app.bsky.actor.getProfile", {"actor": h})
            feed = pget("app.bsky.feed.getAuthorFeed", {"actor": h, "limit": 20, "filter": "posts_no_replies"})
            items = []
            for it in feed.get("feed", []):
                po = it["post"]
                if po["author"]["handle"] != h: continue
                items.append({"uri": po["uri"], "at": po["record"].get("createdAt", ""), "likes": po.get("likeCount", 0), "reposts": po.get("repostCount", 0),
                              "replies": po.get("replyCount", 0), "quotes": po.get("quoteCount", 0), "text": po["record"].get("text", "")[:90]})
            run["bluesky"][h] = {"followers": prof.get("followersCount", 0), "follows": prof.get("followsCount", 0), "posts": prof.get("postsCount", 0), "items": items}
        except Exception as e:
            run["bluesky"][h] = {"error": str(e)[:200]}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "a") as f: f.write(json.dumps(run, ensure_ascii=False) + "\n")
    return run

def runs():
    try: return [json.loads(l) for l in open(OUT) if l.strip()]
    except FileNotFoundError: return []

def report():
    rs = runs()
    if not rs: print("nog geen runs"); return
    last = rs[-1]; prev = rs[-2] if len(rs) > 1 else None
    print(f"stand {last['ts']}" + (f" (vorige {prev['ts']})" if prev else ""))
    for h, a in last["accounts"].items():
        if "error" in a: print(f"\n@{h}: fout {a['error']}"); continue
        pf = prev["accounts"].get(h, {}).get("followers") if prev else None
        print(f"\n@{h}: {a['followers']} volgers" + (f" ({a['followers']-pf:+d})" if pf is not None else ""))
        pi = {t["id"]: t for t in prev["accounts"].get(h, {}).get("items", [])} if prev else {}
        for t in a["items"][:12]:
            d = f" (+{t['imp']-pi[t['id']]['imp']})" if t["id"] in pi else ""
            print(f"  {t['at'][5:16]} {t['kind']:5} imp {t['imp']:>5}{d:8} ♥{t['likes']} ↩{t['replies']} ⟳{t['reposts']}  {t['text'][:60]}")
    for h, b in (last.get("bluesky") or {}).items():
        if "error" in b: print(f"\nBluesky @{h}: fout {b['error']}"); continue
        pf = (prev or {}).get("bluesky", {}).get(h, {}).get("followers") if prev else None
        print(f"\nBluesky @{h}: {b['followers']} volgers" + (f" ({b['followers']-pf:+d})" if pf is not None else "") + f", {b['posts']} posts")
        for t in b["items"][:8]:
            print(f"  {t['at'][5:16]}       ♥{t['likes']} ↩{t['replies']} ⟳{t['reposts']} \"{t['quotes']}  {t['text'][:60]}")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "report": report()
    else:
        r = collect(); print(json.dumps({h: (a.get("followers"), len(a.get("items", [])), a.get("error")) for h, a in r["accounts"].items()}))
