#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"

if [ "$#" -gt 0 ] && [ "$1" = "dev" ]; then
  if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    echo "For API development, install Node.js 20+ and npm." >&2
    exit 1
  fi
  npm run dev
else
  if command -v open >/dev/null 2>&1; then
    open index.html
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open index.html
  else
    echo "Open index.html in your browser."
  fi
fi
