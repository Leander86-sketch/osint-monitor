#!/bin/zsh
# ARGUS-hartslag. Zonder dit ververst er niets: de crawl en de situatie-clustering
# draaien alleen wanneer een endpoint wordt aangeroepen, en er staat geen enkele
# scheduler in de app (alleen een AIS-prune-timer). Gemeten 6 aug 2026: de store
# stond 12 uur stil, waardoor het dashboard oude data toonde en de X-alertpipeline
# nul suggesties had — niet omdat er geen nieuws was, maar omdat niemand aanklopte.
#
# Volgorde is niet vrijblijvend: eerst het nieuws ophalen, dan pas clusteren,
# anders draait de escalatiedetectie over de vorige ronde.

BASE=http://localhost:3003
LOG=/Users/clawdbot/Clawd/osint-monitor/data/pulse.log
STAMP=$(date '+%Y-%m-%dT%H:%M:%S')

feed=$(curl -s -X POST "$BASE/api/feed" -m 180 -w '\n%{http_code}' 2>/dev/null)
feed_code=${feed##*$'\n'}
added=$(print -r -- "$feed" | sed -n 's/.*"added":\([0-9]*\).*/\1/p' | head -1)

sit=$(curl -s "$BASE/api/situation-alerts" -m 60 -w '\n%{http_code}' 2>/dev/null)
sit_code=${sit##*$'\n'}
esc=$(print -r -- "$sit" | grep -o '"id":' | wc -l | tr -d ' ')

print -r -- "$STAMP feed=$feed_code added=${added:-0} situations=$sit_code escalations=$esc" >> "$LOG"

# log begrensd houden
tail -500 "$LOG" > "$LOG.tmp" 2>/dev/null && mv "$LOG.tmp" "$LOG"
