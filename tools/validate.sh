#!/bin/bash
# Validate that every inline <script> in every .html page parses, and every
# standalone .js file parses. Exit 0 if OK, 1 if broken.
# Portable: finds node via PATH, Homebrew, or nvm.
set -u

if command -v git >/dev/null 2>&1; then
  ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
fi
[ -n "${ROOT:-}" ] || ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 0

NODE=""
if command -v node >/dev/null 2>&1; then NODE="$(command -v node)"
elif [ -x /opt/homebrew/bin/node ]; then NODE=/opt/homebrew/bin/node
elif [ -x /usr/local/bin/node ]; then NODE=/usr/local/bin/node
else
  for cand in "$HOME"/.nvm/versions/node/*/bin/node; do
    [ -x "$cand" ] && NODE="$cand" && break
  done
fi

if [ -z "$NODE" ]; then
  echo "validate.sh: node not found - skipping" >&2
  exit 0
fi

FAIL=0

# 1. Every inline <script> (no src) inside each HTML page.
for f in index.html page.html plan.html practice.html spending.html more.html; do
  [ -f "$f" ] || continue
  "$NODE" -e '
    const fs = require("fs");
    const h = fs.readFileSync(process.argv[1], "utf8");
    const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
    let m, n = 0, ok = true;
    while ((m = re.exec(h))) {
      n++;
      try { new Function(m[1]); } catch (e) { console.error(process.argv[1] + ": inline script " + n + " does not parse: " + e.message); ok = false; }
    }
    // A page may legitimately have all its scripts external (e.g. plan.html).
    if (!/<script\b/i.test(h)) { console.error(process.argv[1] + ": NO SCRIPT TAG"); ok = false; }
    if (!ok) process.exit(1);
  ' "$f" || { echo "validate.sh: $f failed - commit blocked" >&2; FAIL=1; }
done

# 2. Every standalone JS file.
for f in data/schedule.js assets/js/*.js; do
  [ -f "$f" ] || continue
  "$NODE" -e '
    const fs = require("fs");
    try { new Function(fs.readFileSync(process.argv[1], "utf8")); }
    catch (e) { console.error(process.argv[1] + ": does not parse: " + e.message); process.exit(1); }
  ' "$f" || { echo "validate.sh: $f failed - commit blocked" >&2; FAIL=1; }
done

if [ "$FAIL" -eq 0 ]; then
  echo "validate.sh: PARSE OK"
  exit 0
fi
exit 1
