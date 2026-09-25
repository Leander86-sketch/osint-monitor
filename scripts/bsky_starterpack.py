#!/opt/homebrew/bin/python3
"""Starter pack "Conflict OSINT, live" vanaf @argus.prototipo.nl (25 sep 2026). Publiceren alleen na go van Leander.
  bsky_starterpack.py preview   → toont naam, beschrijving en de leden (Argus + de 16 bronnen die Argus leest)
  bsky_starterpack.py publish   → maakt de lijst (app.bsky.graph.list, curatelist) + het pack (app.bsky.graph.starterpack)"""
import sys, os, re, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bsky_onboard import PROJECTS, login, call
NAME = "Conflict OSINT, live"
DESC = "Accounts that report conflicts and hybrid threats from open sources, plus ARGUS, the free dashboard that puts their reporting on one live map with flights, ships, thermal detections, frontline and air-raid alerts."
def members():
    hs = re.findall(r"handle:\s*'([^']+)'", open(os.path.expanduser("~/Clawd/osint-monitor/lib/fetchers/bluesky.ts")).read())
    return ["argus.prototipo.nl"] + hs
def now(): return datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")
def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "preview"
    ms = members(); print(NAME, "—", DESC, "\nleden:", len(ms), ms)
    if cmd != "publish": return
    did, jwt, handle = login(PROJECTS["argus"])
    lst = call("com.atproto.repo.createRecord", jwt, body={"repo": did, "collection": "app.bsky.graph.list", "record": {"$type": "app.bsky.graph.list", "purpose": "app.bsky.graph.defs#referencelist", "name": NAME, "description": DESC, "createdAt": now()}})
    for h in ms:
        sub = call("com.atproto.identity.resolveHandle", params={"handle": h})["did"]
        call("com.atproto.repo.createRecord", jwt, body={"repo": did, "collection": "app.bsky.graph.listitem", "record": {"$type": "app.bsky.graph.listitem", "subject": sub, "list": lst["uri"], "createdAt": now()}})
    sp = call("com.atproto.repo.createRecord", jwt, body={"repo": did, "collection": "app.bsky.graph.starterpack", "record": {"$type": "app.bsky.graph.starterpack", "name": NAME, "description": DESC, "list": lst["uri"], "feeds": [], "createdAt": now()}})
    print("starter pack:", f"https://bsky.app/starter-pack/{handle}/{sp['uri'].split('/')[-1]}")
if __name__ == "__main__": main()
