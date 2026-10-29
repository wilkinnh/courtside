#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

mode="${1:-auto}"
case "$mode" in
  --help|-h)
    cat <<'HELP'
Usage: ./start-local.sh [--node|--docker]

Default: use Docker Compose when its daemon is running; otherwise use Node.
--node    Build and run in this terminal. Ctrl+C stops the server.
--docker  Build and run in the background. Stop with: docker compose down

Reads .env if present; creates it from .env.example on first run.
Defaults to http://localhost:8788, accessible only on this computer.
For LAN access, set BIND_ADDRESS=0.0.0.0 in .env.
HELP
    exit 0 ;;
  auto|--node|--docker) ;;
  *) echo "Unknown option: $mode. Use --help." >&2; exit 2 ;;
esac

if [[ "$mode" != "--node" ]] && command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  [[ -f .env ]] || cp .env.example .env
  docker compose up -d --build
  echo "Courtside is running in Docker. Open http://localhost:8788 (or your configured PORT)."
  echo "Logs: docker compose logs -f courtside"
  echo "Stop: docker compose down"
  exit 0
fi

if [[ "$mode" == "--docker" ]]; then
  echo "Docker Compose is unavailable or its daemon is stopped. Start Docker and retry, or use --node." >&2
  exit 1
fi
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Install Node.js 22.13+ (with npm), or install and start Docker, then run this script again." >&2
  exit 1
fi
exec node scripts/start-local.mjs
