#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
if [ "${1:-open}" = "dev" ]; then
  command -v node >/dev/null 2>&1 || { echo "Install Node.js 20+ first." >&2; exit 1; }
  npx --yes vercel@latest dev
elif command -v open >/dev/null 2>&1; then
  open index.html
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open index.html
else
  echo "Open index.html in your browser."
fi
