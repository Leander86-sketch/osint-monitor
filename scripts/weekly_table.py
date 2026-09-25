#!/opt/homebrew/bin/python3
"""Weektabel distributie (maandag, Minutes Groeiplan 25 sep 2026): per kanaal wat er gebeurde in de laatste 7 dagen.
Bronnen: data/x-reach.jsonl (X + Bluesky), go-clicks.log (Hub-campagnes), data/visits-ref.json (Argus-verwijzers),
data/visits.json (Argus uniek/dag), motorsport-hub-web/visits.log (Hub web uniek/dag + ref), data/briefing-stats.jsonl (leden),
data/bsky-replies.jsonl (geplaatste replies), Estate (Hub actief/7d). Gebruik: weekly_table.py [dagen=7]"""
import os, sys, json, datetime, collections, urllib.request
ROOT = os.path.expanduser("~/Clawd/osint-monitor"); DAYS = int(sys.argv[1]) if len(sys.argv) > 1 else 7
now = datetime.datetime.now(datetime.timezone.utc); since = now - datetime.timedelta(days=DAYS); since_d = since.date().isoformat()
def jl(p):
    try: return [json.loads(l) for l in open(p) if l.strip()]
    except FileNotFoundError: return []
def load(p, default):
    try: return json.load(open(p))
    except Exception: return default
print(f"WEEKTABEL {since.date()} → {now.date()} (UTC)\n")
# hoofdgetallen
try:
    est = json.loads(urllib.request.urlopen("http://localhost:3000/api/estate", timeout=20).read())
    for r in est.get("residents", est.get("houses", [])):
        if r.get("id") == "motorsport":
            for k in (r.get("metrics") or {}).get("kpis", []) or []: print("HUB", k["label"], "=", k["value"], "(", k.get("sub", ""), ")")
except Exception as e: print("estate:", e)
v = load(os.path.join(ROOT, "data", "visits.json"), {}); days = sorted(d for d in v if d >= since_d)
print("ARGUS uniek/dag:", " ".join(f"{d[5:]}={len(v[d])}" for d in days), "| totaal", sum(len(v[d]) for d in days))
hub = collections.defaultdict(set); hubref = collections.Counter(); hubq = collections.Counter()
for j in jl(os.path.expanduser("~/Clawd/motorsport-hub-web/visits.log")):
    if j.get("ts", "")[:10] >= since_d and j.get("path") == "/":
        hub[j["ts"][:10]].add(j.get("ip")); r = j.get("ref", "")
        if r: hubref[r.split("/")[2] if "//" in r else r] += 1
        if j.get("q"): hubq[j["q"][:40]] += 1
print("HUB web uniek/dag:", " ".join(f"{d[5:]}={len(hub[d])}" for d in sorted(hub)), "| verwijzers:", dict(hubref.most_common(6)), "| campagnes:", dict(hubq.most_common(6)))
refs = load(os.path.join(ROOT, "data", "visits-ref.json"), {}); agg = collections.Counter()
for d, m in refs.items():
    if d >= since_d: agg.update(m)
print("ARGUS verwijzers:", dict(agg.most_common(10)))
go = collections.Counter()
for j in jl(os.path.expanduser("~/Clawd/motorsport-hub-site/go-clicks.log")):
    if j.get("at", "")[:10] >= since_d: go[j.get("campaign")] += 1
print("HUB /go-klikken:", dict(go.most_common(10)))
runs = jl(os.path.join(ROOT, "data", "x-reach.jsonl"))
if runs:
    first = next((r for r in runs if r["ts"][:10] >= since_d), runs[0]); last = runs[-1]
    print("\nX (volgers begin → eind; posts in periode: imp):")
    for h, a in last["accounts"].items():
        if "error" in a: continue
        f0 = first["accounts"].get(h, {}).get("followers"); items = [t for t in a["items"] if t["at"][:10] >= since_d]
        print(f"  @{h}: {f0} → {a['followers']} | {len(items)} posts, imp {sum(t['imp'] for t in items)}, replies-imp gem {round(sum(t['imp'] for t in items if t['kind']=='reply')/max(1,len([t for t in items if t['kind']=='reply'])),1)}")
    print("Bluesky (volgers begin → eind; likes/reposts in periode):")
    for h, b in (last.get("bluesky") or {}).items():
        if "error" in b: continue
        f0 = (first.get("bluesky") or {}).get(h, {}).get("followers"); items = [t for t in b["items"] if t["at"][:10] >= since_d]
        print(f"  @{h}: {f0} → {b['followers']} | {len(items)} posts, ♥{sum(t['likes'] for t in items)} ⟳{sum(t['reposts'] for t in items)} ↩{sum(t['replies'] for t in items)}")
reps = [j for j in jl(os.path.join(ROOT, "data", "bsky-replies.jsonl")) if j.get("ts", "")[:10] >= since_d]
print(f"Bluesky replies geplaatst: {len(reps)}")
bs = [j for j in jl(os.path.join(ROOT, "data", "briefing-stats.jsonl")) if j.get("ts", "")[:10] >= since_d]
if bs: print(f"ARGUS Daily: leden {bs[0].get('members')} → {bs[-1].get('members')} ({len(bs)} briefings)")
