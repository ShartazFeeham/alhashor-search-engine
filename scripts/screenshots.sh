#!/bin/bash
# Usage: scripts/screenshots.sh <base-url> <out-dir> [<width>x<height>]
# Takes screenshots (1200x900 unless a size is given) of the main pages with headless Chrome.
set -u
BASE="$1"; OUT="$2"; SIZE="${3:-1200x900}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
mkdir -p "$OUT"
shoot() { # <name> <route>
  local name="$1" route="$2" file="$OUT/$1.png" profile pid
  profile="$(mktemp -d)"
  rm -f "$file"
  "$CHROME" --headless=new --disable-gpu --no-sandbox --hide-scrollbars \
    --user-data-dir="$profile" --window-size=${SIZE/x/,} --virtual-time-budget=5000 \
    --screenshot="$file" "$BASE$route" >/dev/null 2>&1 &
  pid=$!
  for _ in $(seq 1 30); do [ -s "$file" ] && break; sleep 1; done
  kill "$pid" 2>/dev/null
  pkill -9 -f "$profile" 2>/dev/null
  rm -rf "$profile"
  if [ -s "$file" ]; then echo "ok   $name"; else echo "FAIL $name"; fi
}
shoot home /
shoot topics /topics
shoot search /search
shoot results /search?q=%E0%A6%B0%E0%A7%8B%E0%A6%9C%E0%A6%BE
shoot books /books
shoot not-found /no-such-page
shoot hadis /hadis/bukhari/6628
shoot hadis-long /hadis/bukhari/307
