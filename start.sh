#!/usr/bin/env bash
set -euo pipefail

# Run from any directory. The Node launcher loads courtside/.env, installs
# dependencies when needed, builds the website, and starts the local server.
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
exec bash ./courtside/start-local.sh --node "$@"
