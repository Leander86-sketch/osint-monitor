#!/opt/homebrew/bin/python3
"""Pin een post op een productaccount: bsky_pin.py <argus|hub> <rkey>  (25 sep 2026)"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bsky_onboard import PROJECTS, login, call
p = PROJECTS[sys.argv[1]]; rkey = sys.argv[2]
did, jwt, handle = login(p)
uri = f"at://{did}/app.bsky.feed.post/{rkey}"
post = call("app.bsky.feed.getPosts", jwt, params={"uris": uri})["posts"][0]
cur = call("com.atproto.repo.getRecord", jwt, params={"repo": did, "collection": "app.bsky.actor.profile", "rkey": "self"})
rec = dict(cur["value"]); rec["pinnedPost"] = {"uri": uri, "cid": post["cid"]}
call("com.atproto.repo.putRecord", jwt, body={"repo": did, "collection": "app.bsky.actor.profile", "rkey": "self", "record": rec, "swapRecord": cur["cid"]})
print("gepind:", f"https://bsky.app/profile/{handle}/post/{rkey}")
