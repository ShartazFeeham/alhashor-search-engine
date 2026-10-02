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
  # Chrome can linger after printing the page, so stop as soon as the closing tag is in the output.
  for _ in $(seq 1 80); do kill -0 "$pid" 2>/dev/null || break; grep -q '</html>' "$out" 2>/dev/null && break; sleep 0.5; done
  kill "$pid" 2>/dev/null; pkill -9 -f "$profile" 2>/dev/null
  cat "$out"; rm -rf "$profile" "$out"
}
expect_text() { # <route> <text> <what>
  if dump "$1" | grep -q "$2"; then echo "ok   $3"; else echo "FAIL $3"; fail=1; fi
}

expect_html() { # <route> <text> <what>: the page as the server sends it, before any script runs
  if curl -s "$BASE$1" | grep -q "$2"; then echo "ok   $3"; else echo "FAIL $3"; fail=1; fi
}

expect_title() { # <route> <exact title> <what>
  got="$(dump "$1" | grep -o '<title>[^<]*</title>' | head -1 | sed -e 's/<title>//' -e 's/<\/title>//')"
  if [ "$got" = "$2" ]; then echo "ok   $3"; else echo "FAIL $3 (got: $got)"; fail=1; fi
}

expect_status /json/hadis/Bukhari/0001/text.txt 200
expect_status "/json/tags/%E0%A6%B0%E0%A7%8B.json" 200
expect_status /photos/copy.png 200
expect_status "/json/tags3/%E0%A6%B0%E0%A7%8B%E0%A6%9C.json" 200  # the 3-letter word files (search switch idx=3)
expect_status /json/tags3/qqqq.json 404
expect_status /json/tags/qqqq.json 404        # Review Focus 3: a missing data file is a real 404
expect_status /no-such-page 404
expect_status /hadis/bukhari/6628 200
expect_status /hadis/bukhari/0 404
expect_status /hadis/bukhari/99999 404
expect_status /hadis/nobook/1 404
expect_status /books/muslim 200
expect_status /books/nobook 404
expect_status "/daily?tab=plans&plan=ramadan-30" 200
expect_status /share/bukhari/6628 200         # the quote-card page of a hadis
expect_status /share/bukhari/0 404
expect_status /narrators 200                  # narrator index: a static page, the address holds the narrator, page and book
expect_status "/narrators?name=abu-hurayrah&page=2&book=muslim" 200
expect_status /json/narrators/index.json 200  # built once by scripts/build-narrators.mjs
expect_status /json/narrators/abu-hurayrah.json 200
expect_status /json/narrators/no-such-narrator.json 404
expect_status /hadis/bukhari/63 200           # a gap number is a valid address; the page says so

expect_text "/search?q=%E0%A6%B0%E0%A7%8B%E0%A6%9C%E0%A6%BE&page=2" "মোট ৪০৩" "deep link to page 2 of a Bengali search renders (Review Focus 1)"
expect_text "/search?q=zzzz" "কোনো ফলাফল" "an unknown word shows the not-found note (Review Focus 3)"
expect_text /topics "একটি বিষয় বেছে নিন" "the topics page renders its index and prompt"
expect_text "/topics?topic=%E0%A6%88%E0%A6%AE%E0%A6%BE%E0%A6%A8" "হাদীস নং" "a topic deep link renders hadis"
expect_text "/topics?topic=%E0%A6%88%E0%A6%AE%E0%A6%BE%E0%A6%A8" "এখান থেকে শুরু করুন" "a topic with curated picks shows the start-here block"
expect_text "/topics?topic=%E0%A6%88%E0%A6%AE%E0%A6%BE%E0%A6%A8&page=2" "২১ - ৪০ পর্যন্ত দেখানো হচ্ছে" "a deep link to page 2 of a topic renders (20 to a page)"
expect_text /hadis/bukhari/6628 "হাদীস নং" "a hadis page renders"
expect_text /hadis/bukhari/63 "এই হাদীসটি পাওয়া যায়নি" "a gap hadis says it is not found"
expect_text /books "একটি গ্রন্থ বেছে নিন" "the books page renders"
expect_text /books/muslim "মোট ৭,২৮১ টি হাদীস" "a book page renders"
expect_text "/books/bukhari?page=4" "হাদীস নং ৬১ - ৮১" "a deep link to page 4 of a book renders (63 is skipped)"
expect_html /books/muslim "<h1>মুসলিম শরীফ</h1>" "a book page is pre-built with its header (not blank before scripts run)"
expect_text /share/bukhari/6628 "ছবি ডাউনলোড" "the share page renders its card and buttons"
expect_text /daily "গত ৭ দিন" "the daily page renders today's hadis and the last seven days (the short-hadis list loads)"
expect_text "/daily?tab=plans" "রমযানের ৩০ দিন" "the plans tab lists the reading plans"
expect_text "/daily?tab=plans&plan=ramadan-30" "দিন ৩০" "a plan deep link renders its day-by-day checklist"
expect_text /narrators "স্বয়ংক্রিয়ভাবে বাছাই করা" "the narrators page renders its list and the note about the names"
expect_text /narrators "বর্ণনাকারীসূচি" "the narrators page renders its side menu"
expect_text "/narrators?name=abu-hurayrah" "হাদীস নং" "a narrator deep link renders hadis cards"
expect_text "/narrators?name=abu-hurayrah" "১ - ২০ পর্যন্ত দেখানো হচ্ছে" "a narrator deep link shows the first twenty of the narrator's hadis"
expect_text "/narrators?name=abu-hurayrah&page=2&book=muslim" "২১ - ৪০ পর্যন্ত দেখানো হচ্ছে" "page 2 of one narrator and one book renders (20 to a page)"
expect_text /no-such-page "পৃষ্ঠাটি পাওয়া যায়নি" "the not-found page renders"
# Page titles on a fresh load (Next.js used to overwrite the page title with the layout's title)
expect_title / "Alhashor - হাদীস সম্ভার" "home title"
expect_title /books "হাদীসের বই - Alhashor" "books title on a fresh load"
expect_title /books/muslim "মুসলিম শরীফ - হাদীসের বই - Alhashor" "a book's title on a fresh load"
expect_title "/books/muslim?page=3" "মুসলিম শরীফ - হাদীসের বই - Alhashor" "a later book page keeps the book's title on a fresh load"
expect_title "/search?q=%E0%A6%B0%E0%A7%8B%E0%A6%9C%E0%A6%BE&page=2" "রোজা - হাদীস সার্চ - Alhashor" "search title on a fresh load of page 2"
expect_title "/topics?topic=%E0%A6%88%E0%A6%AE%E0%A6%BE%E0%A6%A8" "ঈমান - বিষয়ভিত্তিক হাদীস - Alhashor" "topics title on a fresh load"
expect_title /hadis/bukhari/6628 "বুখারী শরীফ - হাদীস নং ৬,৬২৮ - Alhashor" "hadis title on a fresh load"
expect_title /share/bukhari/6628 "শেয়ার - বুখারী শরীফ - হাদীস নং ৬,৬২৮ - Alhashor" "share page title on a fresh load"
expect_title /daily "আজকের হাদীস - Alhashor" "daily title on a fresh load"
expect_title "/daily?tab=plans" "আজকের হাদীস - Alhashor" "plans tab keeps the one daily title on a fresh load"
expect_title /narrators "বর্ণনাকারী - Alhashor" "narrators title on a fresh load"
expect_text "/narrators?name=abu-hurayrah&page=2" "<title>[^<][^<]* - বর্ণনাকারী - Alhashor</title>" "a narrator's title on a fresh load of page 2 names the narrator"
expect_title /no-such-page "পৃষ্ঠাটি পাওয়া যায়নি - Alhashor" "not-found title"
exit $fail
