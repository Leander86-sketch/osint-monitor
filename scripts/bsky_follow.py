#!/opt/homebrew/bin/python3
"""Volg accounts vanaf een productaccount: bsky_follow.py <argus|hub> handle [handle…]  (24 sep 2026)
Slaat over wat al gevolgd wordt; logt naar data/bsky-follows.jsonl."""
import sys, os, json, datetime, urllib.request, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bsky_onboard import PROJECTS, login, call  # zelfde login/app-password

def main():
    p = PROJECTS[sys.argv[1]]; handles = sys.argv[2:]
    did, jwt, me = login(p)
    have = set(); cursor = None
    while True:
        r = call("app.bsky.graph.getFollows", jwt, params={"actor": did, "limit": 100, **({"cursor": cursor} if cursor else {})})
        have |= {f["handle"] for f in r.get("follows", [])}; cursor = r.get("cursor")
        if not cursor: break
    done = []
    for h in handles:
        if h in have: print("al gevolgd:", h); continue
        try:
            subj = call("com.atproto.identity.resolveHandle", params={"handle": h})["did"]
        except SystemExit as e: print("onbekend:", h, e); continue
        rec = {"$type": "app.bsky.graph.follow", "subject": subj, "createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")}
        call("com.atproto.repo.createRecord", jwt, body={"repo": did, "collection": "app.bsky.graph.follow", "record": rec})
        done.append(h); print("volgt nu:", h)
    with open(os.path.expanduser("~/Clawd/osint-monitor/data/bsky-follows.jsonl"), "a") as f:
        f.write(json.dumps({"ts": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"), "account": me, "followed": done}) + "\n")
    print(f"{me}: {len(done)} nieuw, {len(have)} al")

if __name__ == "__main__": main()
