#!/opt/homebrew/bin/python3
"""Wekelijkse weekendpost van Motorsport Hub op Bluesky (do 18:00, launchd nl.leander.hub-weekend) — 25 sep 2026.
Bron: snapshot.live (aangekondigde livestreams, komende 4 dagen) + calendar. Max 300 tekens, tijden CEST/CET, link met https.
Gebruik: hub_weekend_post.py [--dry]"""
import sys, os, json, datetime, zoneinfo
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
SNAP = "/Users/clawdbot/Clawd/motorsport-hub-web/data/snapshot.json"
AMS = zoneinfo.ZoneInfo("Europe/Amsterdam")

def shorten(t, n=34):
    t = t.replace("LIVE:", "").replace("🔴", "").replace("LIVE!", "").strip()
    for cut in (" | ", " - ", " – ", " — "):
        if cut in t and len(t) > n: t = t.split(cut)[0].strip()
    return t if len(t) <= n else t[:n-1].rstrip() + "…"

def build():
    s = json.load(open(SNAP)); now = datetime.datetime.now(datetime.timezone.utc)
    horizon = now + datetime.timedelta(days=4)
    live = [l for l in s["live"] if l.get("upcoming") and l.get("startMs") and now.timestamp()*1000 <= l["startMs"] <= horizon.timestamp()*1000]
    live.sort(key=lambda l: l["startMs"])
    tz = datetime.datetime.now(AMS).strftime("%Z")
    lines = []
    for l in live[:5]:
        t = datetime.datetime.fromtimestamp(l["startMs"]/1000, AMS)
        name = shorten(l["title"]); src = shorten(l.get("sourceName", ""), 26)
        if len(name) < 8 or name.lower() in ("live", "live stream"): name = src
        lines.append(f"{t.strftime('%a %H:%M')} {name}")
    stamp = now.astimezone(AMS).strftime("%m%d")
    link = f"https://motorsport.prototipo.nl/go/wknd-{stamp}"
    head = f"Free & legal racing this weekend in Motorsport Hub ({tz}):"
    tail = f"All live, no login. {link}"
    while True:
        text = "\n".join([head, *lines, tail])
        if len(text) <= 300 or not lines: break
        lines.pop()
    if not lines: text = f"No confirmed free live streams this weekend yet; 96 official sources, replays and highlights in Motorsport Hub. {link}"
    return text

if __name__ == "__main__":
    text = build(); print(text); print(f"[{len(text)} tekens]")
    if "--dry" in sys.argv: sys.exit(0)
    import bsky_onboard as B
    sys.argv = ["x", "hub", "post", text]; B.main()
