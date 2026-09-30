#!/bin/bash
# Usage: scripts/smoke.sh <base-url>
# Checks the running site: data files and images are served, a missing data file is a real 404,
# and deep links render in a real browser.
set -u
BASE="$1"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
fail=0
status() { curl -s -o /dev/null -w '%{http_code}' "$BASE$1"; }
expect_status() { # <path> <code>
  got="$(status "$1")"
  if [ "$got" = "$2" ]; then echo "ok   $1 -> $got"; else echo "FAIL $1 -> $got (wanted $2)"; fail=1; fi
}
dump() { # <route> -> page HTML after scripts ran
  local profile out pid; profile="$(mktemp -d)"; out="$(mktemp)"
  "$CHROME" --headless=new --disable-gpu --no-sandbox --user-data-dir="$profile" \
    --virtual-time-budget=12000 --dump-dom "$BASE$1" >"$out" 2>/dev/null &
  pid=$!
  for _ in $(seq 1 40); do kill -0 "$pid" 2>/dev/null || break; sleep 1; done
  kill "$pid" 2>/dev/null; pkill -9 -f "$profile" 2>/dev/null
  cat "$out"; rm -rf "$profile" "$out"
}
expect_text() { # <route> <text> <what>
  if dump "$1" | grep -q "$2"; then echo "ok   $3"; else echo "FAIL $3"; fail=1; fi
}

expect_title() { # <route> <exact title> <what>
  got="$(dump "$1" | grep -o '<title>[^<]*</title>' | head -1 | sed -e 's/<title>//' -e 's/<\/title>//')"
  if [ "$got" = "$2" ]; then echo "ok   $3"; else echo "FAIL $3 (got: $got)"; fail=1; fi
}

expect_status /json/hadis/Bukhari/0001/text.txt 200
expect_status "/json/tags/%E0%A6%B0%E0%A7%8B.json" 200
expect_status /photos/copy.png 200
expect_status /json/tags/qqqq.json 404        # Review Focus 3: a missing data file is a real 404
expect_status /no-such-page 404

expect_text "/search?q=%E0%A6%B0%E0%A7%8B%E0%A6%9C%E0%A6%BE&page=2" "মোট ৪০৩" "deep link to page 2 of a Bengali search renders (Review Focus 1)"
expect_text "/search?q=zzzz" "কোনো ফলাফল" "an unknown word shows the not-found note (Review Focus 3)"
expect_text "/topics?topic=%E0%A6%88%E0%A6%AE%E0%A6%BE%E0%A6%A8" "হাদীস নং" "a topic deep link renders hadis"
expect_text /books "নিচে থেকে যেকোনো একটি বই ক্লিক করুন" "the books page renders"
expect_text /no-such-page "পৃষ্ঠাটি পাওয়া যায়নি" "the not-found page renders"
# Page titles on a fresh load (Next.js used to overwrite the page title with the layout's title)
expect_title / "BoiKotha - হাদীস সম্ভার" "home title"
expect_title /books "হাদীসের বই - BoiKotha" "books title on a fresh load"
expect_title "/search?q=%E0%A6%B0%E0%A7%8B%E0%A6%9C%E0%A6%BE&page=2" "রোজা - হাদীস সার্চ - BoiKotha" "search title on a fresh load of page 2"
expect_title "/topics?topic=%E0%A6%88%E0%A6%AE%E0%A6%BE%E0%A6%A8" "ঈমান - বিষয়ভিত্তিক হাদীস - BoiKotha" "topics title on a fresh load"
expect_title /no-such-page "পৃষ্ঠাটি পাওয়া যায়নি - BoiKotha" "not-found title"
exit $fail
