#!/bin/bash
# One-liner: point this repo at the tracked hooks dir (survives clones via core.hooksPath).
git config core.hooksPath .githooks
echo "hooks enabled: $(git config core.hooksPath)"
ls -l .githooks/