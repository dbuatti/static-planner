#!/bin/bash
# Run the unit tests via Node's built-in test runner (node:test, node >= 18).
# Exits 0 if they pass. Skips gracefully when node is missing or too old so it
# never blocks a commit on a machine that can't run them (e.g. the Mini).
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
  echo "test.sh: node not found - skipping" >&2
  exit 0
fi

MAJOR="$("$NODE" -e 'process.stdout.write(String(process.versions.node.split(".")[0]))')"
if [ -z "$MAJOR" ] || [ "$MAJOR" -lt 18 ]; then
  echo "test.sh: node ${MAJOR:-?} < 18 (no node:test) - skipping" >&2
  exit 0
fi

"$NODE" --test
