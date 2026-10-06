#!/bin/zsh
# Eenmalig (6 okt 2026): alle gecureerde situaties zonder dossier → init + propose --cli + apply. Log per stap.
cd ~/Clawd/osint-monitor || exit 1
export PATH=/opt/homebrew/bin:/usr/bin:/bin
PY=/opt/homebrew/bin/python3
for slug in ukraine-front nato-eastern-flank gaza red-sea-bab-al-mandab strait-of-hormuz iran-israel sudan syria korea-peninsula lebanon taiwan-strait; do
  echo "== $(date '+%T') $slug"
  [[ -f data/dossiers/$slug.json ]] || $PY scripts/dossier_extract.py $slug init
  out=$($PY scripts/dossier_extract.py $slug propose --cli --since 72 2>&1 | tail -1)
  echo "$out"
  if [[ "$out" == *.md ]]; then
    $PY scripts/dossier_extract.py $slug apply "${out%.md}.json" 2>&1 | tail -1
  fi
done
echo "== $(date '+%T') klaar"
