#!/usr/bin/env bash
set -euo pipefail

# Run from repo root; this script detects the preferred package manager
# and runs the appropriate install command.

cd "$(dirname "$0")/.."

echo "Project directory: $PWD"

# Prefer manager by lockfile, else by what is available
if [ -f pnpm-lock.yaml ]; then
  PREFER="pnpm"
elif [ -f yarn.lock ]; then
  PREFER="yarn"
elif [ -f package-lock.json ]; then
  PREFER="npm"
else
  PREFER=""
fi

run_cmd() {
  echo "+ $*"
  "$@"
}

if [ -n "$PREFER" ]; then
  if command -v "$PREFER" >/dev/null 2>&1; then
    run_cmd "$PREFER" install
    exit 0
  else
    echo "Found $PREFER lockfile but $PREFER is not installed. Falling back to other managers."
  fi
fi

if command -v pnpm >/dev/null 2>&1; then
  run_cmd pnpm install
  exit 0
fi

if command -v yarn >/dev/null 2>&1; then
  run_cmd yarn install
  exit 0
fi

if command -v npm >/dev/null 2>&1; then
  run_cmd npm install
  exit 0
fi

echo "No package manager (pnpm, yarn, or npm) found in PATH. Please install one and re-run." >&2
exit 1
