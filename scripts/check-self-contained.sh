#!/bin/bash
# Usage: scripts/check-self-contained.sh <base-url> [extra-route ...]
# Loads the main pages in headless Chrome and records every network request. The check fails if
# the page asks for any host other than this site (no CDN fonts, analytics, outside APIs).
# Chrome's own background traffic (updates, sync) is not the page's and is ignored.
set -u
BASE="$1"; shift
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
ROUTES=("/" "/search?q=%E0%A6%B0%E0%A7%8B%E0%A6%9C%E0%A6%BE" "/topics" "/books" "$@")
fail=0
for route in "${ROUTES[@]}"; do
  profile="$(mktemp -d)"; netlog="$(mktemp)"; dom="$(mktemp)"
  "$CHROME" --headless=new --disable-gpu --no-sandbox --user-data-dir="$profile" \
    --disable-background-networking --disable-component-update --disable-sync --no-first-run \
    --disable-default-apps --disable-domain-reliability \
    --log-net-log="$netlog" --virtual-time-budget=8000 --dump-dom "$BASE$route" >"$dom" 2>/dev/null &
  pid=$!
  for _ in $(seq 1 40); do kill -0 "$pid" 2>/dev/null || break; sleep 1; done
  kill "$pid" 2>/dev/null; pkill -9 -f "$profile" 2>/dev/null
  hosts="$(python3 "$(dirname "$0")/outside-hosts.py" "$netlog" "$(echo "$BASE" | sed -E 's#^(https?://[^/]+).*#\1#')")"
  if [ -n "$hosts" ]; then
    echo "FAIL $route reached other hosts: $(echo "$hosts" | tr '\n' ' ')"; fail=1
  elif [ ! -s "$dom" ]; then
    echo "FAIL $route produced no page"; fail=1
  else
    echo "ok   $route"
  fi
  rm -rf "$profile" "$netlog" "$dom"
done
exit $fail
