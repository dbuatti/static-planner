#!/bin/bash
# Validate that the inline script in index.html parses. Exit 0 if OK, 1 if broken.
# Portable: finds node via PATH, Homebrew, or nvm.
set -u

if command -v git >/dev/null 2>&1; then
  ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
fi
[ -n "${ROOT:-}" ] || ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 0

[ -f index.html ] || exit 0

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

if "$NODE" -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=h.match(/<script>([\s\S]*?)<\/script>/);if(!m){console.error('NO SCRIPT TAG');process.exit(1)};new Function(m[1]);console.log('PARSE OK')" ; then
  exit 0
else
  echo "validate.sh: index.html does not parse - commit blocked" >&2
  exit 1
fi