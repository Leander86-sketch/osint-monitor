#!/opt/homebrew/bin/python3
"""Plaats een reply vanaf een productaccount na go van Leander: bsky_reply.py <argus|hub> <post-url> "tekst"  (25 sep 2026)
Logt naar data/bsky-replies.jsonl. Max 300 tekens, links als facet."""
import sys, os, json, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bsky_onboard import PROJECTS, login, call, facets

def main():
    proj, url, text = sys.argv[1], sys.argv[2], sys.argv[3]
    assert len(text) <= 300, f"te lang: {len(text)}"
    handle, rkey = url.split("/profile/")[1].split("/post/")
    tdid = call("com.atproto.identity.resolveHandle", params={"handle": handle})["did"]
    uri = f"at://{tdid}/app.bsky.feed.post/{rkey}"
    did, jwt, me = login(PROJECTS[proj])
    post = call("app.bsky.feed.getPosts", jwt, params={"uris": uri})["posts"][0]
    parent = {"uri": post["uri"], "cid": post["cid"]}
    root = (post["record"].get("reply") or {}).get("root") or parent
    rec = {"$type": "app.bsky.feed.post", "text": text, "createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z"),
           "langs": ["en"], "reply": {"root": root, "parent": parent}}
    f = facets(text)
    if f: rec["facets"] = f
    r = call("com.atproto.repo.createRecord", jwt, body={"repo": did, "collection": "app.bsky.feed.post", "record": rec})
    out = f"https://bsky.app/profile/{me}/post/{r['uri'].split('/')[-1]}"
    with open(os.path.expanduser("~/Clawd/osint-monitor/data/bsky-replies.jsonl"), "a") as fh:
        fh.write(json.dumps({"ts": rec["createdAt"], "account": me, "to": url, "reply": out, "text": text}) + "\n")
    print("reply geplaatst:", out)

if __name__ == "__main__": main()
