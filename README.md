# Courtside — self-hosted sports dashboard

A Node.js website and REST API for finding sports across your services, including ESPN event links and Home Assistant / Apple TV automation. The Docker version is independent of ChatGPT, Sites and Cloudflare. Local Node/Docker hosting is the only supported deployment for this project. The previous hosted copy has been restricted to its owner; the available hosting tools could not delete it.

## One-command startup

```sh
./start-local.sh
```

The script works from any directory, creates `.env` only if missing, and uses Docker Compose when its daemon is running. Otherwise it installs dependencies as needed, builds the website and starts Node in the foreground. Existing `.env` settings are preserved.

Force a mode with `./start-local.sh --node` or `./start-local.sh --docker`. Node stops with Ctrl+C; Docker runs in the background and stops with `docker compose down`. Use `./start-local.sh --help` for options.

## Docker (recommended)

From this directory:

```sh
cp .env.example .env
docker compose up -d --build
```

Open **http://localhost:8788**. By default, only the Docker host can connect.

For other devices and Home Assistant on your home network, change `.env` to:

```dotenv
BIND_ADDRESS=0.0.0.0
PORT=8788
COURTSIDE_API_KEY=
```

Then run `docker compose up -d`. Visit **http://YOUR_SERVER_LAN_IP:8788**. No router port forwarding is needed. This LAN setting makes the dashboard available to devices able to reach your host; do not expose it to the internet without your own access controls.

An optional `COURTSIDE_API_KEY` (at least 24 characters) protects API endpoints. Enter it in the website's Preferences → Local server access and send `Authorization: Bearer YOUR_KEY` from Home Assistant. The page shell and liveness check remain readable; browser key storage is session-only. The dashboard contains no streaming-service passwords and does not sign you into providers.

```sh
docker compose logs -f courtside  # logs
docker compose down              # stop
```

After changing source, rebuild with `docker compose up -d --build`.

## Node without Docker

Requires Node 22.13+:

```sh
npm ci
npm run build:local
npm start
```

Open http://localhost:8788. To listen on your LAN:

```sh
HOST=0.0.0.0 npm start
```

`PORT` defaults to 8788. `ASSET_DIRECTORY` defaults to `dist-local`. Both the frontend and `/api/v1/*` run on the same server. `npm run api` is an alias for the same Node server.

The Docker image builds browser assets in one stage and runs a non-root Node process in the second. Runtime needs no npm packages, database, Cloudflare process, or hosting credentials. Compose uses a read-only filesystem. Preferences, services, saved games and overrides are stored per browser, so no container data volume is needed. Upstream metadata cache is in memory and resets on restart. Home Assistant requests must supply their own service preferences.

The server needs outbound HTTPS access to ESPN for schedules and watch catalogs. Browsers load provider logos and Google Fonts from the internet. Watching still requires your provider subscription, login and compatible app; local hosting does not remove blackouts.

## Home Assistant / Apple TV

Use `http://YOUR_SERVER_LAN_IP:8788/api/v1/resolve` in [home-assistant.yaml](public/home-assistant.yaml). Replace the Team Tracker and Apple TV entity IDs. If the local API has no key, remove the example `headers` / `authorization` entries; if it has a key, configure the matching secret.

The Apple TV action opens a provider URL with media type `url`. Test the installed tvOS app's handling before enabling the optional game-start automation. Exact ESPN player URLs are resolved from provider metadata; other providers may have labeled service-page fallbacks or saved manual event links.

See [API guide](public/api-guide.md) and [deep-link research](docs/research.md).

## Development and verification

- `npm test`: resolver and HTTP server tests.
- `npx tsc --noEmit`: type checking.
- `npm run build:local`: standalone browser build.
- `npm run dev`: local Vite frontend; run `npm start` in another terminal for its API proxy.
- `npm run build`: standalone browser build (same as `build:local`).

Do not publish this project to Sites or Cloudflare. `.openai/hosting.json` retains the old Site ID only for cleanup tracking; it is excluded from Docker and unused by the Node build.
