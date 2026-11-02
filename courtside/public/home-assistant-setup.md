# Home Assistant playback setup

1. Install [home-assistant-play.yaml](/home-assistant-play.yaml). Merge into configuration.yaml, or omit `script:` and unindent once for scripts.yaml. In the UI script YAML editor paste only the contents below `courtside_play:` and ensure the entity ID is `script.courtside_play`. Reload scripts.
2. Create a Long-Lived Access Token in your Home Assistant profile's Security section.
3. Edit `courtside/.env` alongside compose.yaml:

```dotenv
HOME_ASSISTANT_URL=http://192.168.1.100:8123
HOME_ASSISTANT_TOKEN=YOUR_HOME_ASSISTANT_LONG_LIVED_TOKEN
HOME_ASSISTANT_SCRIPT=script.courtside_play
```

Use your real Home Assistant LAN address. Docker's localhost is the Courtside container. For Home Assistant on the Docker host, `http://host.docker.internal:8123` also works (Compose includes Linux host-gateway mapping), provided HA listens on an address reachable from the container. A shared Docker network and service name also work. Use HTTPS when available; HTTP sends the token over your LAN. Do not disable certificate verification.

4. From `courtside/`, run `docker compose up -d --build`. For Node run `npm run build:local` and `npm start`; the server reads .env. Restart after credential changes.
5. Open a game's watch options, select a player, provider link and Live / From beginning, then press **Play on selected player**. Refresh players queries Home Assistant again; unavailable players are disabled.

## Authentication

HOME_ASSISTANT_TOKEN authenticates Courtside → Home Assistant and stays on the server. COURTSIDE_API_KEY is a separate optional key protecting browser / Home Assistant → Courtside calls. Set it to 24+ characters and enter it in Courtside Preferences → Local server access when you want to restrict who can request playback. Anyone who can reach an unprotected Courtside API can control playback. Keep .env private and out of source control. Tokens are not embedded in the image or browser bundle; Docker administrators can inspect container environment variables.

## Provider navigation

The script receives `media_player`, `media_url`, `provider` and `start_mode` (`live` or `beginning`). Provider IDs include `prime`, `prime-hhn`, `espn`, `espn-plus`, `peacock`, `paramount`, `disney`, `max` and `xfinity`. The selected link determines the provider.

The default action opens a URL with media type `url`, suitable for Apple TV app launching. Other integrations may need a different action/content type. All media players are listed; this does not guarantee URL support. Browser-only links or service pages may need manual navigation or may not work on your TV.

For Apple TV, fill in `remotes` with the real player → remote entity mapping. Replace `provider_steps: {}` with your tested provider mappings using the commented examples as a starting point. The example button sequences are illustrative, not verified recipes. Test each provider's overview page and live/beginning dialog, then adjust the initial eight-second delay and two-second button delays. Screens vary with login, ads and app updates. Leave maps empty for providers that need no additional buttons. No button presses are guessed by default.

Requests are queued to avoid overlapping button sequences. “Request sent” means the script was accepted, not that video is playing. Inspect Home Assistant script traces for playback failures. Check the TV and trace before retrying a timeout. Revoke and replace an exposed token.

## API

- GET `/api/v1/home-assistant/players`: `{players: [{entity_id, name, state}]}`.
- POST `/api/v1/home-assistant/play`: JSON `{media_player, media_url, provider, start_mode}`. Returns 202 when accepted; calls the configured script using `script.turn_on` with these variables.

The existing Team Tracker example in home-assistant.yaml remains independent.

References: [REST API](https://developers.home-assistant.io/docs/api/rest/), [Apple TV remote commands](https://www.home-assistant.io/integrations/apple_tv/).

## No script traces after pressing Play

Check the script's actual entity ID in Home Assistant. Creating a script in the UI from the alias “Courtside — play selected game” can produce `script.courtside_play_selected_game`, which differs from the example `script.courtside_play`. Set `HOME_ASSISTANT_SCRIPT` in `.env` to the actual entity ID, then stop and restart Courtside. Courtside checks that the script exists before submitting playback and shows the targeted script in its success message. The server terminal also logs submission or the stage that failed without logging tokens or media URLs.
