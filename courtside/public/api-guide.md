# Courtside API v1

The website loads real ESPN schedules; it does not ship simulated games. Browser preferences are saved locally and must be passed explicitly to API requests. US broadcast matching is a convenience, not an entitlement check.

## Docker and local Node hosting

The website and API run together on one Node server. No ChatGPT sign-in, Cloudflare account, or hosted service is needed. ESPN and provider assets still require internet access.

```
cp .env.example .env
docker compose up -d --build
```

Open http://localhost:8788. For Home Assistant or other LAN devices, set `BIND_ADDRESS=0.0.0.0` in `.env`, run `docker compose up -d`, and use your host's LAN IP instead of localhost. Do not forward this port to the internet without configuring your own access controls.

Without Docker (Node 22.13+):

```
npm ci
npm run build:local
npm start
```

Node defaults to loopback; set `HOST=0.0.0.0` for LAN access. PORT defaults to 8788. Browser preferences are stored on each device, not in a container volume.

Optional authentication: configure `COURTSIDE_API_KEY` with at least 24 characters. API requests then require an `Authorization: Bearer ...` header, except the non-sensitive health check. Enter the key in website Preferences → Local server access; it is kept only in session storage. In Home Assistant, put the header in secrets.yaml. If no key is set, omit the example authorization header.

The former hosted copy is owner-only pending deletion. Node/Docker is the supported deployment; Docker does not connect to the hosted copy or publish your local instance.

## Routes

- GET /api/v1/health — server health (does not test ESPN).
- GET /api/v1/services — provider and league IDs.
- GET /api/v1/events?date=2026-10-28&leagues=nba,nhl&services=espn&state=in — schedules; date is US Eastern by default. Optional team matches ESPN team ID or abbreviation. states: pre, in, post. Errors per league indicate partial responses. All leagues failing returns 502. Data is cached for 45 seconds per process/isolate, with bounded upstream fetches.
- POST /api/v1/resolve — resolve one ESPN event. Request JSON:

```json
{"league":"nba","event_id":"401909884","services":["espn","peacock"],"overrides":[]}
```

Or pass `attributes` containing Team Tracker `sport_path`, `league_path`, `event_url`, `date`, `team_id`, `opponent_id`. `team_tracker.attributes` is also accepted. There is no assumption of a Team Tracker event_id attribute: the resolver extracts the ESPN gameId from event_url. If unavailable, it requires a unique schedule match by date and team IDs. Ambiguous matches return 409.

The result includes `event`, `options` (filtered by selected services), `watch_url`, `link_kind`, `launchable`, `device_verified`, `autoplay_safe`, `reason`, `resolved_at`, `link_catalog_available`. `watch_url` is null unless an exact event link was found. `apple_tv_url` is an event-link candidate for an installed provider app; it excludes browser-only CBS Sports pages. `launchable` means such a candidate exists, not that a device has been tested. Use `apple_tv_url` with Home Assistant on Apple TV; `watch_url` may instead be a browser-only event page. `device_verified` and `autoplay_safe` remain false. Callers should check HTTP status, live state, link kind, and device compatibility.

Links include URL, service, provenance, lookup time, subscription requirement and, when supplied by ESPN, feed, language, authentication types, packages, out-of-market restriction and native app URI. `verifiedAt` is metadata retrieval time; it is not a playback test. Web and native URI support varies by tvOS app.

## Your services

Starting selections: Xfinity, Disney+, Paramount+, Peacock, HBO Max, ESPN, OTA. Select your actual Xfinity/OTA channels in the website. No package/channel entitlement is assumed. Disney+ alone is not an ESPN subscription; ESPN Select and Unlimited are distinct. HBO Max sports need an eligible tier. OTA on Apple TV requires a tuner plus compatible app. Xfinity on Apple TV generally requires the home Xfinity network.

Service matching is conservative: Peacock and Paramount+ require those explicit broadcast names, rather than inferring all NBC/CBS matches. Browser channel choices can show possible TV coverage, but do not manufacture provider playback URLs.

## Exact link overrides

For providers without an accessible event catalog, save a provider's real event URL in the game dialog. Export from Preferences, then include the objects in `overrides`:

```json
[{"event_id":"401909884","league":"nba","service":"espn","url":"https://www.espn.com/watch/player?id=960a0879-e849-467e-9692-2cfdce4580ac"}]
```

Overrides must use HTTPS on supported provider hosts; they are never fetched by the server. They are explicitly labeled user-supplied and not playback-verified. Browser overrides are not server-side persistent storage. Never include expiring playback manifests, session tokens or credentials in saved links.

## Apple TV and Home Assistant

Download `home-assistant.yaml` from the integration page. Replace example entity IDs and the API host and configure the authorization secret if you enabled the optional API key. Otherwise remove the headers/authorization lines. Use the Home Assistant Apple TV integration's `media_player.play_media` with `media_content_type: url`. This invokes app launch through Companion; `video` invokes AirPlay and is unsuitable for provider webpages. Launch a test URL manually to confirm the installed app handles it. A generic web URL or ESPN mobile `sportscenter:` URI is not guaranteed to launch tvOS playback.

If a provider does not support its web event links on tvOS, use Home Assistant `media_player.select_source` with the app name from the Apple TV entity's source_list, then navigate manually. The resolver does not pretend that opening an app selects a game.

The sample is a manually invoked script and an opt-in commented automation triggered by Team Tracker IN. It blocks service-page fallbacks and non-live events. It does not install anything into your Home Assistant account or control your Apple TV until you configure and run it.

## Data reliability

ESPN public scoreboards and Watch catalog are unofficial interfaces, without a stable API contract. Watch home and its returned upcoming/live buckets are not exhaustive. Replay entries are excluded. Provider outage leaves schedules available where possible and sets link_catalog_available=false. No streaming DRM, login or blackouts are bypassed. No authenticated playback was tested in development.

Research and primary sources: /link-research.md.

## Hurricanes Hockey Network on Prime Video

Select `prime-hhn` for HHN and `prime` for base Prime Video. HHN is a separate subscription. Both are included in the updated example YAML. The resolver now discovers HHN event URLs from Prime's sports catalog and validates both teams and the broadcast start time against the ESPN event. Catalog coverage is incomplete and may change; `prime_catalog_available` is false on lookup failure, null when no eligible Hurricanes event was queried, and true when discovery succeeded (not a guarantee of a matching event).

An exact HHN match returns a Prime `/detail/` URL in `watch_url` when `prime-hhn` is selected. That is an event page, not a raw video stream. Prime sign-in, regional eligibility, HHN subscription and Apple TV link handling still apply. Device playback remains unverified.


## Additional catalogs and Apple TV links

`provider_catalogs` reports `peacock` and `paramount` catalog fetch status: null means not requested for this set of games; false means at least one requested catalog failed; true means the requested catalogs loaded, not that every game has a link.

Peacock reads public event records for Premier League, NFL, NBA, Big Ten football and MLB pages. It matches both teams and scheduled time, excludes replays and ambiguous duplicate feeds, and builds the event path using Peacock's own published watch endpoint. Curated pages are incomplete. English and Spanish variants are retained separately.

Paramount+ Carabao Cup and Serie A matches can resolve to CBS Sports event pages that advertise Paramount+ login. These carry `playbackTarget: browser_only` and never populate `apple_tv_url`. They are not verified Paramount+ native links. Some CBS cards have no structured game metadata and are deliberately skipped.

Prime discovery now includes explicit base-Prime event cards as well as HHN, keeping their subscriptions separate. Third-party channel trials are not treated as included Prime access.

Options can include `sourceUrl` and `playbackTarget`. All automatic options remain `deviceVerified: false`. `apple_tv_url` may differ from `watch_url` when another selected provider has an app-link candidate. A successful HTTP response is not proof of playback, entitlement, or tvOS compatibility.


## Choose a team and playback device per call

The supplied `script.courtside_watch_team` requires two fields: `team` (a Team Tracker sensor entity) and `media_player` (the destination media player entity). The script reads attributes from the selected sensor and sends the resolved Apple TV URL to the selected player. The player must support app deep links with media type `url`; choosing a generic media player does not add that capability. The existing live-game requirement remains.

```yaml
action: script.courtside_watch_team
data:
  team: sensor.carolina_hurricanes
  media_player: media_player.living_room_apple_tv
```

Replace these example entity IDs with your own. Reload scripts after updating the script in Home Assistant.
