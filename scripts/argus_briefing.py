#!/opt/homebrew/bin/python3
"""ARGUS daily briefing → Telegram-kanaal (24 sep 2026).

Elke ochtend 07:00 (launchd nl.leander.argus-briefing): de drie situaties met de meeste beweging in de
laatste 24 uur, dreigingsniveaus, opvallende toestellen in de lucht, luchtalarmen, en de link naar de
situatiepagina (Telegram maakt daar de kaartpreview van, via de Open Graph-afbeelding).
Zonder ARGUS_BRIEFING_CHAT in .env.local: alleen een proefdruk op stdout. Ledental wordt per run
gelogd in data/briefing-stats.jsonl (doel 23 okt: 100).

Gebruik: argus_briefing.py [--dry] [--send]
"""
import os, sys, json, urllib.request, urllib.parse, datetime, email.utils, collections

ROOT = os.path.expanduser("~/Clawd/osint-monitor")
API = "http://localhost:3003"
SITE = "https://argus.prototipo.nl"
UA = {"User-Agent": "ARGUS-briefing/1.0"}

def env(path):
    out = {}
    try:
        for l in open(os.path.expanduser(path)):
            l = l.strip()
            if "=" in l and not l.startswith("#"):
                k, v = l.split("=", 1); out[k.strip()] = v.strip().strip('"').strip("'")
    except FileNotFoundError: pass
    return out

def get(path):
    with urllib.request.urlopen(urllib.request.Request(API + path, headers=UA), timeout=60) as r: return json.loads(r.read())

def ts(pub):
    try: return email.utils.parsedate_to_datetime(pub).timestamp() * 1000
    except Exception:
        try: return datetime.datetime.fromisoformat(pub.replace("Z", "+00:00")).timestamp() * 1000
        except Exception: return 0

def build():
    now = datetime.datetime.now(datetime.timezone.utc); since = now.timestamp() * 1000 - 24 * 3600e3
    sits = get("/api/situations"); sits = sits if isinstance(sits, list) else sits.get("situations", [])
    feed = get("/api/feed?limit=3200").get("items", [])
    fresh = {i["id"] for i in feed if ts(i.get("pubDate", "")) >= since}
    try: esc = json.load(open(os.path.join(ROOT, "data", "situation-escalations.json")))
    except Exception: esc = []
    esc = esc if isinstance(esc, list) else esc.get("escalations", [])
    esc24 = collections.defaultdict(list)
    for e in esc:
        if e.get("at", 0) >= since: esc24[e["slug"]].append(e)
    sev_rank = {"critical": 3, "high": 2, "medium": 1, "low": 0}
    rows = []
    for s in sits:
        if s.get("status") not in (None, "active"): continue
        new = len(set(s.get("itemIds", [])) & fresh)
        rows.append((len(esc24[s["slug"]]) * 10 + new + sev_rank.get(s.get("severity"), 0), new, s))
    rows.sort(key=lambda r: -r[0]); top = rows[:3]

    threat = get("/api/threat-levels").get("levels", [])
    tl = " · ".join(f"{t['code']} {t['level']}{t.get('scale','')}" for t in threat if t.get("ok") and t.get("level"))
    fl = get("/api/flights"); notable = fl.get("notable", [])
    badges = collections.Counter(n.get("badge") for n in notable)
    air = get("/api/airalerts"); alerts = [s["name"].replace(" oblast", "") for s in air.get("states", []) if s.get("alert")]
    try: nav = len(get("/api/navwarn").get("warnings", []))
    except Exception: nav = None

    local = now.astimezone(datetime.timezone(datetime.timedelta(hours=2)))  # CEST
    lines = [f"<b>ARGUS daily briefing</b> · {local.strftime('%a %d %b %Y, %H:%M')} CEST", ""]
    for i, (_, new, s) in enumerate(top, 1):
        e = esc24[s["slug"]]
        change = f"{new} new reports" + (f", {e[-1]['detail'].lower()}" if e else "")
        lines.append(f"{i}. <b>{s['title']}</b> — {s.get('severity','?')} · {change}")
        if s.get("latestHeadline"): lines.append(f"   ↳ {s['latestHeadline'][:140]}")
        lines.append(f"   {SITE}/s/{s['slug']}")
    lines.append("")
    if tl: lines.append(f"<b>Threat levels</b> {tl}")
    if notable:
        lines.append(f"<b>In the air</b> {len(notable)} notable aircraft: " + ", ".join(f"{b} ×{n}" for b, n in badges.most_common(4)))
    lines.append(f"<b>Air raid alerts</b> Ukraine: " + (", ".join(alerts) if alerts else "none active"))
    if nav: lines.append(f"<b>Navigational warnings</b> {nav} in force at sea")
    lines.append(""); lines.append(f"Live map, 165 sources, 46 channels: {SITE}")
    text = "\n".join(lines)
    top_url = f"{SITE}/s/{top[0][2]['slug']}" if top else SITE
    return text, top_url

def send(text, preview_url, token, chat):
    body = {"chat_id": chat, "text": text, "parse_mode": "HTML",
            "link_preview_options": {"url": preview_url, "prefer_large_media": True, "show_above_text": True}}
    req = urllib.request.Request(f"https://api.telegram.org/bot{token}/sendMessage", data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r: j = json.loads(r.read())
    if not j.get("ok"): raise SystemExit(f"telegram: {j}")
    return j["result"]["message_id"]

def members(token, chat):
    try:
        with urllib.request.urlopen(f"https://api.telegram.org/bot{token}/getChatMemberCount?chat_id={urllib.parse.quote(chat)}", timeout=20) as r:
            return json.loads(r.read()).get("result")
    except Exception: return None

def main():
    e = {**env("~/Clawd/butler-dashboard/.env.local"), **env(os.path.join(ROOT, ".env.local"))}
    token = e.get("ARGUS_BRIEFING_BOT_TOKEN") or e.get("TELEGRAM_BOT_TOKEN"); chat = e.get("ARGUS_BRIEFING_CHAT")
    text, url = build()
    if "--dry" in sys.argv or not (token and chat):
        print(text); print("\n[preview]", url); 
        if not chat: print("[dry] ARGUS_BRIEFING_CHAT niet gezet in osint-monitor/.env.local")
        return
    mid = send(text, url, token, chat)
    n = members(token, chat)
    with open(os.path.join(ROOT, "data", "briefing-stats.jsonl"), "a") as f:
        f.write(json.dumps({"ts": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"), "chat": chat, "message_id": mid, "members": n, "top": url}) + "\n")
    print("verstuurd", mid, "leden", n)

if __name__ == "__main__": main()
