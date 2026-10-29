# Watch-link research

Verified October 28, 2026. These findings distinguish provider-published event links from successful authenticated playback; no paid account playback or television launch was tested.

## ESPN: real event links discovered

The public [ESPN Watch home JSON](https://watch.product.api.espn.com/api/product/v3/watchespn/web/home) returned HTTP 200 and 449,452 bytes. Its `page.buckets[].contents[]` records expose `eventId` (ESPN scoreboard ID), sometimes `event.gameId`, and `streams[].links.web` (the actual event player URL). This is a direct ID join, not fuzzy matching or a fabricated UUID.

Examples returned by the provider:

| ESPN event | Broadcast | Provider-published player URL |
| --- | --- | --- |
| 401909884 | Philadelphia 76ers vs. Indiana Pacers, ESPN | https://www.espn.com/watch/player?id=960a0879-e849-467e-9692-2cfdce4580ac |
| 401909891 | Oklahoma City Thunder vs. Dallas Mavericks, ESPN | https://www.espn.com/watch/player?id=621266d2-6c5d-4fc5-b0ab-f95cf9737d0b |
| 401892597 | Calgary Flames vs. Edmonton Oilers, ESPN+ | https://www.espn.com/watch/player?id=165cee95-72c9-4251-8c04-bfa01bed32a8 |
| 401892598 | New Jersey Devils vs. Colorado Avalanche, Avalanche feed | https://www.espn.com/watch/player?id=4026a05d-f10c-4073-b091-984a950e12d6 |
| 401892598 | New Jersey Devils vs. Colorado Avalanche, Devils feed | https://www.espn.com/watch/player?id=57ea7de3-88c4-488f-86a5-d43cc55cb277 |

Keep all matching stream variants. `source.name`, `source.lang`, `tier`, `name`, `authTypes`, `packages`, and `isOnlyOOM` help select a preferred language/feed and explain subscription requirements. For example, the primary 76ers stream is ESPN with `authTypes: ["mvpd"]`; an Above the Rim alternative names ESPN Unlimited and `authTypes: ["direct"]`. ESPN+ NHL streams name `packages: ["ESPN_PLUS"]`.

A stream may expose `links.appPlay`, such as `sportscenter://x-callback-url/showWatchStream?playID=960a0879-e849-467e-9692-2cfdce4580ac`. Preserve only provider-returned values; mobile ESPN URI support does not establish Android TV/Roku support. `links.play` points to ESPN playback metadata, sometimes a linear network, and should not replace the human-facing `links.web` link.

Critical replay trap: `status: "live"` may describe a currently airing replay. A Duke/Virginia item had `pillMetadata.displayType: "Reair"` despite live status. Do not label the match live solely from its broadcast. Use the scoreboard competition status for match status and reject Reair/replay options for live-match resolution.

The home response is curated and incomplete. Its Upcoming bucket exposes a provider-owned `links.self` URL: [Upcoming bucket](https://watch.product.api.espn.com/api/product/v3/watchespn/web/bucket?bucketId=30601&tz=America%2FNew_York&lang=en). That URL also returned HTTP 200 (155,365 bytes), with the same page/buckets structure. Follow provider-returned catalog and bucket URLs with a strict ESPN host allowlist, request bounds, caching, and timeouts. Do not claim completeness merely because the home response succeeded.

Current [NBA scoreboard](https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard), [NHL scoreboard](https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard), and [college football scoreboard](https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard) contained no `watch` URLs when inspected. These remain the schedule/status authority. Summary `broadcasts` was empty for college football event 401859185; NBA summary event 401909884 listed a regional DAZN station but no playback URL. Summary broadcasts are insufficient as the sole resolver.

## NBA native player investigation

Both [scheduleLeagueV2_1.json](https://cdn.nba.com/static/json/staticData/scheduleLeagueV2_1.json) and [scheduleLeagueV2.json](https://cdn.nba.com/static/json/staticData/scheduleLeagueV2.json) returned HTTP 403 from this environment, including a browser User-Agent and NBA Referer. The public [NBA schedule page](https://www.nba.com/schedule) returned HTML, but its embedded Next.js page props contained layout and schedule settings without game IDs. Therefore an NBA native `/game/{slug}-{NBA_ID}?watch` event-link mapping was not verified. Never substitute ESPN IDs into NBA native URLs. ESPN's actual NBA player links above are usable event-level alternatives for matching ESPN broadcasts.

## TeamTracker and Home Assistant

[TeamTracker's primary README](https://github.com/vasqued2/ha-teamtracker/blob/master/README.md) documents sensor attributes `event_url`, `sport_path`, `league_path`, `date`, `team_id`, `opponent_id`, and `tv_network`. It does not document an `event_id` attribute. Extract an ESPN ID from `event_url` where possible; otherwise require league, both teams and date to match unambiguously. States are PRE, IN, POST, BYE and NOT_FOUND. The event URL is a game information page, not necessarily a stream.

[Home Assistant RESTful Command](https://www.home-assistant.io/integrations/rest_command/) supports templated JSON requests and `response_variable`; its response dictionary includes status, content and headers. A resolver endpoint can accept TeamTracker attributes and subscription preferences and return selected provider, actual web URL, native URI if present, link provenance and availability caveats.

[Android TV Remote](https://www.home-assistant.io/integrations/androidtv_remote/) supports `media_player.play_media` with media type `url`, and `remote.turn_on` with `activity` for app-supported deep links. A URL is not automatically a Cast-playable media stream. Device launch remains unverified until tested with the relevant installed app.

## Availability and honest confidence labels

[ESPN blackout policy](https://support.espn.com/hc/en-us/articles/360001482992-What-is-the-Blackout-Policy) confirms region-dependent restrictions. A subscription preference is not a verified entitlement. [Disney's ESPN help](https://help.disneyplus.com/article/disneyplus-watch-espn-plus) distinguishes ESPN Select (ESPN+ library) from ESPN Unlimited. Do not equate ESPN+ with all linear ESPN channels.

Recommended confidence: `provider_event` means the URL came directly from provider data for that ESPN event; it does not mean authenticated playback was tested. Track source URL, fetched timestamp, airing status, language/feed, and entitlement requirements. Channel and provider-home fallbacks must be labeled as such. Persist explicit user event overrides for providers lacking an accessible catalog.

## Apple TV: correct Home Assistant launch action

The user's playback device is Apple TV. [Official Home Assistant Apple TV documentation](https://www.home-assistant.io/integrations/apple_tv/) explicitly supports deep links using `media_player.play_media` with `media_content_type: url`. This is the correct integration-specific action shape:

```yaml
# Replace entity ID and supply the resolver's actual provider event URL.
action: media_player.play_media
target:
  entity_id: media_player.living_room_apple_tv
data:
  media_content_type: url
  media_content_id: "{{ watch_response.content.url }}"
```

The [Home Assistant implementation](https://github.com/home-assistant/core/blob/dev/homeassistant/components/apple_tv/media_player.py) routes URL and APP media types into `atv.apps.launch_app(media_id)`. Other types can take the AirPlay streaming path. Therefore do not pass a provider webpage as type `video`. [pyatv's Apps API](https://pyatv.dev/api/interface/) documents `launch_app(bundle_id_or_url)` and Companion protocol support. The paired Apple TV must expose that feature.

The docs recommend shared iOS/macOS content links or web content links, but warn that apps with separate iOS/tvOS implementations may handle them differently. Provider source verification is not tvOS launch verification: ESPN's `sportscenter://...` URI is returned by ESPN, but has not been tested against this user's television. Prefer the actual event web link as a first test, retain a per-provider/per-device override for a confirmed working URI, and never claim autoplay merely because HA accepted an action.

An app-only fallback uses the installed app name from the entity's `source_list`:

```yaml
action: media_player.select_source
target:
  entity_id: media_player.living_room_apple_tv
data:
  source: ESPN
```

That opens the app; it does not select the game. Only offer it under an explicit app-launch fallback label.

## User's other services: inspected discovery paths

- **Xfinity:** [official Apple TV FAQ](https://www.xfinity.com/support/articles/stream-on-apple-tv-faqs) confirms Xfinity Stream on Apple TV and requires the in-home Xfinity network for its TV services. Exact content depends on the subscribed TV lineup. An Xfinity subscription must not imply every sports channel. No stable public event/channel deep-link API was verified. A channel URL copied from the user's authenticated guide can be stored as a confirmed override. ESPN TV-provider authentication is a useful route for subscribed ESPN networks.
- **Peacock:** [official Premier League page](https://www.peacocktv.com/sports/premier-league) contains actual fixtures, but inspected game-tile anchors target an on-page subscription section, not an event player. Its HTML references an NBCU Atom content adapter, but an event-player feed was not verified. Do not expose the marketing tile as a direct game link. Premium/Premium Plus include live sports; confirm the user's tier rather than treating every Peacock plan equally.
- **Paramount+:** [official sports hub](https://www.paramountplus.com/collections/sports-hub/) has a featured live Liverpool/Chelsea item, but its Watch Live anchor points to a competition show page rather than a particular player. [Official support](https://cbsi.my.salesforce-sites.com/CBSi/articles/en_US/Knowledge/PD-How-to-stream-events-sports-or-CBS-shows-live-on-Paramount?data=&popup=false&template=ottShoTemplate) directs users to dedicated event pages or Live TV. No public event-ID mapping/API was verified. Store actual app share URLs or authenticated event links as overrides; label Live TV as a hub/channel fallback.
- **HBO Max:** [US sports documentation](https://help.hbomax.com/us/Answer/Detail/000002560) says live sports are included with Standard and Premium, subject to blackouts; do not assume the basic tier qualifies. It directs users to the Sports tab for events and offers a digital-assistant schedule, but no public player-ID feed was verified. Preserve provider share links where supplied. Current US documentation lists NHL/MLB and other sports; do not infer NBA availability from old TNT rights.
- **Disney+:** use only ESPN catalog entries with appropriate package entitlement or explicit Disney event links; having Disney+ is not proof of full ESPN sports access.
- **OTA antenna:** OTA availability is distinct from a web stream. Apple TV cannot tune an antenna by itself; automation requires a separately configured network tuner/app or TV input/channel action. Treat OTA as a viewing option without inventing a watch URL.

These provider findings describe tested discovery limitations, not proof that event deep links do not exist. The strongest working discovery pipeline in this research is ESPN Watch catalog → ESPN event ID → provider-issued event URL; other providers need authenticated share-link capture or a separately validated catalog adapter.

## Prime Video / Hurricanes Hockey Network — October 28, 2026

Found actual HHN event links in embedded JSON on https://www.primevideo.com/sports. The HHN channel page itself only returned an offer page when unauthenticated: https://www.primevideo.com/channel/17edab23-eb9f-95f2-999a-31e09e70f7d3 . The sports page returned nine upcoming HHN event cards in this inspection. This is a curated catalog, not guaranteed complete.

Confirmed event: Columbus Blue Jackets at Carolina Hurricanes, ESPN ID 401892603, October 29 at 7 PM EDT. Provider-issued URL: https://www.primevideo.com/detail/0JBVB7184081W2T923BPI7ETB7 . Prime's broadcast starts at 6:30 PM EDT, including pregame.

Implementation reads JSON script payloads (never executes scripts). Cards must identify an EVENT, LIVE/UPCOMING status, HHN entitlement cue, and a Prime-owned detail link. It then reads that detail page's primary headerDetail and checks both full team names, matching compactGti, live/upcoming state, and a full timestamp within 90 minutes before or 15 minutes after ESPN's scheduled start. Ambiguous matches are not selected. Explicit EDT/EST parsing handles the November clock change. Metadata is cached five minutes; requests are timeout/size bounded. Provider schema changes or missing catalogs fail closed. No account cookies, playback manifests, subscription purchases, or credentials are used.

The new prime-hhn subscription is distinct from base prime. Official subscription explanation: https://frontend.d3.nhle.com/hurricanes/news/hurricanes-games-to-be-available-as-a-subscription-on-prime-video . Coverage remains geographically restricted. No claim that all Canes games are HHN: links are attached only after metadata matching, or as clearly labeled HHN channel fallbacks when that broadcast is listed.

The web event URL is verified against published metadata, not authenticated playback. Apple TV app handling has not been tested. No invented Prime tvOS URI scheme or video URL is supplied. Use the existing Apple TV media type url action for a device test; retain device_verified=false until playback is actually observed.

## Deeper provider and Apple TV investigation — October 28, 2026

This section supersedes the earlier Peacock discovery limitation and adds a browser route for some Paramount+ games. It does **not** establish successful Apple TV playback for any provider.

### Why Apple TV can do this

Apple's [app integration overview](https://tvpartners.apple.com/support/3705-integrating-your-app-with-apple-tv-app) explicitly says providers deliver catalog feeds plus territory-specific availability feeds containing **open and play deep links**. Their apps must handle those playback links. The user's observation is correct: these links exist. Obtaining the current provider content ID, its entitlement and its device-specific route remains the integration problem.

Apple's public MLS page embeds sports-event URLs and a catalog configuration, including sports and search routes. Attempts to retrieve its advertised sports/search endpoints from both uts-api.itunes.apple.com and the tv.apple.com/api proxy returned HTTP 404 in this investigation. No third-party provider playback feed was obtained. This is an observed limitation of these requests, not proof that Apple's internal catalog cannot supply links. We did not use Apple account tokens or private partner feeds.

### Provider results

| Service | Verified discovery | Current implementation | Missing verification |
| --- | --- | --- | --- |
| ESPN / ESPN+ | ESPN Watch publishes event IDs, web player URLs and optional sportscenter app links. | Existing exact ESPN event-ID resolver. | Launch/play on this Apple TV; account entitlement. |
| Prime Video / HHN | Public sports cards and detail metadata contain native Prime event IDs, titles, date/time and subscription cues. | HHN retained; expanded to explicit base-Prime cards. | Launch/play on Apple TV; catalog is curated, not comprehensive. |
| Peacock | Public page JSON has individual live/upcoming events, display timestamps, game paths and `watchEndpoint.base`. AASA registers `/watch/*` and `/deeplink/*`. | New automatic resolver for supported competition pages. | tvOS handling and playback; AASA is supporting app-link evidence, not a television playback test. |
| Paramount+ | AASA registers `/live-tv/stream/*/` and show/video routes. CBS Sports publishes exact games requiring Paramount+ authentication. | New CBS browser event resolver for Carabao Cup and Serie A. | Native Paramount+ game ID and tvOS handoff. CBS `deepLink` was null for inspected games. |
| HBO Max | `play.hbomax.com` publishes app associations for production WBD apps. | Corrected saved-link host support for HBO Max/Max. | Authenticated sports catalog and event ID; no automatic resolver claimed. |
| Disney+ | AASA explicitly includes `/play/*`, `/video/*`, `/browse/*` and `/espn`. | Corrected saved-link host support; ESPN remains separately entitled. | Disney-specific event ID/catalog and Apple TV handoff. |
| Xfinity Stream | Its **Stream-specific** association file registers `/stream/watch/*` and `/stream/live/*`. | Corrected saved-link host support. | Account/market-specific channel and program IDs from the user's guide; Apple TV launch. |
| OTA | No provider internet event URL is inherent in antenna television. | Availability option only. | User's tuner app and its channel-link format. |

### Peacock: exact event routes implemented

Inspect [Premier League](https://www.peacocktv.com/sports/premier-league), [NFL](https://www.peacocktv.com/sports/nfl), [NBA](https://www.peacocktv.com/sports/nba), [Big Ten football](https://www.peacocktv.com/sports/big-ten-football), and [MLB](https://www.peacocktv.com/sports/mlb). Their `__NEXT_DATA__` includes:

- `type: ASSET/SLE`, title, `url`, `eventDetails.eventStage`, `eventDetails.eventDisplayStartDate` and `contentId`.
- Provider configuration `watchEndpoint.base: /watch/asset`.
- Paths like `/sports/hull-city-v.-ipswich-town/03652be3-3e30-3ac2-b883-546442b7a658`.

The resulting provider-derived link is [Hull City vs Ipswich](https://www.peacocktv.com/watch/asset/sports/hull-city-v.-ipswich-town/03652be3-3e30-3ac2-b883-546442b7a658), ESPN event 401878763, October 31, 2026 at 15:00 UTC. The watch endpoint returned HTTP 200; it is a client app shell, so HTTP success alone does not establish playback. The ID, matchup and time are corroborated in Peacock metadata and ESPN.

A live fixture comparison found six October 31 Premier League matches, including English/Spanish Manchester City–Brighton variants. Aliases such as Spurs/Tottenham and Man City/Manchester City are explicit; we do not fuzzy-match arbitrary names. NBA and NFL nicknames are restricted to those leagues; college teams use ESPN's short display names. Start times can precede kickoff by up to 90 minutes for pregame. Replays, wrong opponents/dates and ambiguous duplicate same-language entries are excluded. Broad roundup programs such as Goal Rush are not mislabeled as individual matches.

[Peacock's app association](https://www.peacocktv.com/.well-known/apple-app-site-association) lists production app `W76B757YRY.com.peacocktv.peacock` for `/watch/*` and `/deeplink/*`. This is evidence for using the event web URL as a device-test candidate. We did not invent a `peacock://` URL.

### Paramount+: useful event links, with a real device distinction

[Carabao Cup catalog](https://www.cbssports.com/watch/carabao-cup) and [Serie A catalog](https://www.cbssports.com/watch/serie-a) embed structured game records, competition IDs, scheduled kickoff timestamps, home/away teams, `authentication: [paramountplus]`, and `network: PARAMOUNTPLUS`. Actual event anchors appear in the same document.

Example: [Liverpool vs Chelsea](https://www.cbssports.com/watch/carabao-cup/LET-211534907), October 28, 2026, ESPN 401921842. Its structured game record matches 20:00 UTC kickoff; the broadcast starts earlier. The automatic resolver matched three Carabao and two Serie A games in the inspected catalog. Some other tiles lack a structured game record and remain unresolved.

These are **CBS Sports browser player pages using Paramount+ login**, not Paramount+ tvOS deep links. The native `deepLink` fields were null. We do not substitute the CBS LET ID into a Paramount URL, and we do not expose underlying media manifests. Automatic CBS links carry `playbackTarget: browser_only`.

[Paramount's AASA](https://www.paramountplus.com/.well-known/apple-app-site-association) confirms live-TV and show/video routes. Its public page also declares a `pplus://` prefix, but that alone does not specify an event payload. Direct show/video pages inspected returned HTTP 500; `/live-tv/` redirected to signup. This pass did not obtain a validated automatic native Paramount event-ID mapping.

### Prime: expanded, without conflating channel subscriptions

The catalog has both explicit base-Prime cues (`Watch with a free Prime trial`) and separate channel cues (`Free trial of Paramount+`, `Free trial of Hurricanes Hockey Network`). Only explicit base-Prime cards join service `prime`; HHN cards join `prime-hhn`. Paramount+ purchased separately does not automatically authorize Amazon's Paramount channel.

Provider example: [Knicks vs 76ers](https://www.primevideo.com/detail/0G0HX72L0PP0ZHB4W5F4DDA0H6), October 30, 2026, 7 PM EDT. Detail metadata supplies the matching compactGti, event type, upcoming state and full timestamp. Base-Prime matching uses the primary game title rather than synopsis text that may mention the next game in a doubleheader.

### HBO Max, Disney+, Xfinity: established routes, missing catalog IDs

- [HBO Max association file](https://play.hbomax.com/.well-known/apple-app-site-association): production `com.wbd.stream` and `com.wbd.hbomax` associations, broad path support with account-management exclusions. The public sports marketing page has no individual event watch links in its embedded data. The app root is accessible, but the inspected sports route redirected to marketing and its app configuration enables anonymous redirects. No signed-in catalog was inspected.
- [Disney+ association file](https://www.disneyplus.com/.well-known/apple-app-site-association): content routes are explicitly registered. The public homepage returned marketing data, and the inspected `/espn` URL returned 404 from this environment despite being registered. An ESPN playID cannot safely be reused as a Disney content ID.
- [Xfinity Stream association file](https://www.xfinity.com/stream/apple-app-site-association): `RNN5TDL4W6.com.comcast.cim.x2` with `/stream/watch/*` and `/stream/live/*`. The root xfinity.com association file concerns another Xfinity app; using it alone would miss Stream. The public Stream shell does not provide this user's channel lineup. A channel link must use the user's actual guide ID. It is a channel link, not automatically a specific game link.

The next evidence needed for these native routes is an actual provider-shared event/channel URL from a signed-in session, matched to the game, followed by a launch test on the paired Apple TV. Credentials need not be exported or embedded in Courtside. No such device test was performed here.

### API and operational changes

`watch_url` remains the best exact browser event page. New `apple_tv_url` excludes known browser-only links and may select another subscribed provider. `launchable` follows that app-link candidate; `device_verified` and `autoplay_safe` remain false. The downloadable Home Assistant YAML now uses `apple_tv_url` with media type `url`.

Provider HTML fetches are bounded, cached for five minutes, deduplicated in flight and parsed as JSON without executing scripts. The Node/Docker runtime includes the new adapter. Saved event links now accept Disney+, HBO Max/Max, Xfinity and CBS Sports domains, which the previous allowlist accidentally omitted. No cloud deployment is involved.
