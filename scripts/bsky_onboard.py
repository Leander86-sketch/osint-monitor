#!/opt/homebrew/bin/python3
"""Bluesky-onboarding voor een productaccount (Argus of Motorsport Hub) — 24 sep 2026.

Leander maakt het account en één app-password; dit script doet de rest:
  profile   → displayName, bio en avatar zetten
  handle    → eigen domein als handle: zet /.well-known/atproto-did op de site en vraagt Bluesky de handle te wisselen
  post      → één post (met linkkaart) om te controleren dat alles werkt
  status    → wie ben ik, handle, volgers

Gebruik:  bsky_onboard.py <argus|hub> status|profile|handle|post ["tekst"]
Leest BSKY_HANDLE / BSKY_APP_PASSWORD uit het .env.local van het project.
"""
import sys, os, json, re, urllib.request, urllib.parse, datetime

PROJECTS = {
    "argus": {"env": "~/Clawd/osint-monitor/.env.local", "domain": "argus.prototipo.nl", "did_file": "~/Clawd/osint-monitor/data/atproto-did.txt",
              "displayName": "ARGUS", "avatar": "~/Clawd/osint-monitor/public/icon-512.png",
              "description": "Always monitoring the situation. Free, no-login OSINT dashboard: live conflict map (flights, ships, thermal, frontline, NAVWARN, air alerts), 165 feeds by viewpoint, 46 live channels, shareable situation pages. Runs on one Mac mini in NL.\nargus.prototipo.nl"},
    "hub": {"env": "~/Clawd/motorsport-addon/.env.local", "domain": "motorsport.prototipo.nl", "did_file": "~/Clawd/motorsport-hub-site/.well-known/atproto-did",
            "displayName": "Motorsport Hub", "avatar": "~/Clawd/motorsport-hub-site/mhub-logo.png",
            "description": "Every free & legal motorsport stream in one place. 96 official sources, F1 to MotoGP to King of the Hammers. Stremio, Kodi, web, Samsung TV. No ads, no tracking, spoiler-free.\nmotorsport.prototipo.nl"},
}
PDS = "https://bsky.social/xrpc"
UA = {"User-Agent": "ARGUS-bsky-onboard/1.0"}

def env(path):
    out = {}
    for l in open(os.path.expanduser(path)):
        l = l.strip()
        if "=" in l and not l.startswith("#"):
            k, v = l.split("=", 1); out[k.strip()] = v.strip().strip('"').strip("'")
    return out

def call(method, jwt=None, params=None, body=None, raw=None, mime=None):
    url = f"{PDS}/{method}" + ("?" + urllib.parse.urlencode(params) if params else "")
    h = dict(UA)
    if jwt: h["Authorization"] = f"Bearer {jwt}"
    data = None
    if raw is not None: data = raw; h["Content-Type"] = mime
    elif body is not None: data = json.dumps(body).encode(); h["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=h, method="POST" if data is not None else "GET")
    try:
        with urllib.request.urlopen(req, timeout=30) as r: return json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        raise SystemExit(f"{method} → {e.code}: {e.read().decode()[:300]}")

def login(p):
    e = env(p["env"]); h, pw = e.get("BSKY_HANDLE"), e.get("BSKY_APP_PASSWORD")
    if not h or not pw: raise SystemExit(f"BSKY_HANDLE / BSKY_APP_PASSWORD ontbreken in {p['env']}")
    s = call("com.atproto.server.createSession", body={"identifier": h, "password": pw})
    return s["did"], s["accessJwt"], s["handle"]

def facets(text):
    out = []
    for m in re.finditer(r"https?://[^\s)]+", text):
        start = len(text[:m.start()].encode()); end = start + len(m.group().encode())
        out.append({"index": {"byteStart": start, "byteEnd": end}, "features": [{"$type": "app.bsky.richtext.facet#link", "uri": m.group()}]})
    return out

def og(url):
    html = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=15).read().decode("utf-8", "ignore")
    def meta(p):
        m = re.search(r'<meta[^>]+(?:property|name)=["\']%s["\'][^>]+content=["\']([^"\']*)' % re.escape(p), html, re.I)
        return m.group(1) if m else ""
    title = meta("og:title") or (re.search(r"<title[^>]*>([^<]*)", html, re.I) or [None, url])[1]
    return title, meta("og:description") or meta("description"), meta("og:image")

def upload(jwt, path_or_url):
    if path_or_url.startswith("http"):
        r = urllib.request.urlopen(urllib.request.Request(path_or_url, headers=UA), timeout=20); data = r.read(); mime = r.headers.get_content_type()
    else:
        data = open(os.path.expanduser(path_or_url), "rb").read(); mime = "image/png" if path_or_url.endswith(".png") else "image/jpeg"
    if len(data) > 950_000: raise SystemExit(f"afbeelding te groot voor Bluesky ({len(data)} bytes, max ~950 kB): {path_or_url}")
    return call("com.atproto.repo.uploadBlob", jwt, raw=data, mime=mime)["blob"]

def main():
    if len(sys.argv) < 3 or sys.argv[1] not in PROJECTS: raise SystemExit(__doc__)
    p = PROJECTS[sys.argv[1]]; cmd = sys.argv[2]
    did, jwt, handle = login(p)
    if cmd == "status":
        prof = call("app.bsky.actor.getProfile", jwt, params={"actor": did})
        print(json.dumps({k: prof.get(k) for k in ("handle", "displayName", "followersCount", "followsCount", "postsCount")}, ensure_ascii=False))
    elif cmd == "profile":
        cur = call("com.atproto.repo.getRecord", jwt, params={"repo": did, "collection": "app.bsky.actor.profile", "rkey": "self"}) if True else {}
        rec = dict(cur.get("value", {})); rec["$type"] = "app.bsky.actor.profile"
        rec["displayName"] = p["displayName"]; rec["description"] = p["description"]
        rec["avatar"] = upload(jwt, p["avatar"])
        call("com.atproto.repo.putRecord", jwt, body={"repo": did, "collection": "app.bsky.actor.profile", "rkey": "self", "record": rec, **({"swapRecord": cur["cid"]} if cur.get("cid") else {})})
        print("profiel gezet:", p["displayName"])
    elif cmd == "handle":
        df = os.path.expanduser(p["did_file"]); os.makedirs(os.path.dirname(df), exist_ok=True)
        open(df, "w").write(did)
        url = f"https://{p['domain']}/.well-known/atproto-did"
        got = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=15).read().decode().strip()
        if got != did: raise SystemExit(f"{url} geeft '{got[:60]}' i.p.v. de DID — wordt .well-known geserveerd?")
        call("com.atproto.identity.updateHandle", jwt, body={"handle": p["domain"]})
        print("handle gewisseld naar", p["domain"])
    elif cmd == "post":
        text = sys.argv[3] if len(sys.argv) > 3 else f"{p['displayName']} is now on Bluesky. https://{p['domain']}"
        rec = {"$type": "app.bsky.feed.post", "text": text, "createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z"), "langs": ["en"]}
        f = facets(text)
        if f:
            rec["facets"] = f; url = f[0]["features"][0]["uri"]
            try:
                title, desc, img = og(url); ext = {"uri": url, "title": title[:200], "description": desc[:300]}
                if img: ext["thumb"] = upload(jwt, urllib.parse.urljoin(url, img))
                rec["embed"] = {"$type": "app.bsky.embed.external", "external": ext}
            except Exception as e: print("geen linkkaart:", e)
        r = call("com.atproto.repo.createRecord", jwt, body={"repo": did, "collection": "app.bsky.feed.post", "record": rec})
        print("gepost:", f"https://bsky.app/profile/{handle}/post/{r['uri'].split('/')[-1]}")
    else: raise SystemExit(__doc__)

if __name__ == "__main__": main()
