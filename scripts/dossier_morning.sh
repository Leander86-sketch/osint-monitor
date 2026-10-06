#!/bin/zsh
# Onbemande ochtendrun dossiers (6 okt 2026): per dossier bundelen → extraheren via claude -p (abonnement) →
# citaten verifiëren → voorstel als .md. Niets gaat live; de ochtendronde reviewt en doet 'apply'.
# Samenvatting naar Leander via de butler-bot.
cd ~/Clawd/osint-monitor || exit 1
PY=/opt/homebrew/bin/python3
export PATH=/opt/homebrew/bin:/usr/bin:/bin
LOG=~/Clawd/osint-monitor/dossier-morning.log
TOKEN=$(grep '^TELEGRAM_BOT_TOKEN=' ~/Clawd/butler-dashboard/.env.local | cut -d= -f2-)
CHAT=$(grep '^TELEGRAM_CHAT_ID=' ~/Clawd/butler-dashboard/.env.local | cut -d= -f2-)
MSG="📁 Dossier-voorstellen $(date '+%d %b %H:%M')"
for f in data/dossiers/*.json; do
  slug=$(basename "$f" .json)
  echo "== $(date '+%F %T') $slug" >> "$LOG"
  out=$($PY scripts/dossier_extract.py "$slug" propose --cli --since 26 2>&1 | tee -a "$LOG" | tail -1)
  md=$(ls -t data/dossiers/proposals/$slug-*.md 2>/dev/null | head -1)
  if [[ -n "$md" && "$md" -nt "$f" ]]; then
    v=$(grep -c '✓' "$md"); u=$(grep -c '⚠' "$md")
    sum=$(sed -n '/^## Summary/{n;p;}' "$md" | cut -c1-400)
    MSG="$MSG
• $slug: $v regels geverifieerd, $u niet. $sum"
  else
    MSG="$MSG
• $slug: $out"
  fi
done
[[ -n "$TOKEN" && -n "$CHAT" ]] && curl -s -X POST "https://api.telegram.org/bot$TOKEN/sendMessage" --data-urlencode "chat_id=$CHAT" --data-urlencode "text=$MSG" >/dev/null
echo "$MSG" >> "$LOG"
