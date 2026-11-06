# Disney+ event-link investigation — November 5, 2026

The supplied Disney+ page identifies Carolina Hurricanes vs. New York Islanders. ESPN's scheduled event is `401892652`, November 5 at 7 PM Eastern. Disney's official [unlocked NHL schedule](https://www.disneyplus.com/explore/articles/watch-nhl-games-disney-plus-espn) lists this matchup on November 5.

## Verified identifiers

- Disney entity: `803f8774-b180-4727-92c3-9cf3893c164c`
- Disney event URL: `https://www.disneyplus.com/browse/entity-803f8774-b180-4727-92c3-9cf3893c164c`
- ESPN Watch airing: `f2c07653-48e8-4f13-a042-fc21db9b109c`
- Apple event: `umc.cse.c5de2ycyf6u54rs9jv7txmjw`

The ESPN stream includes `D+_ESPN_Basic` among its packages. This is evidence about this feed; it does not mean all ESPN games are included in a standalone Disney+ subscription. Disney availability and HHN availability remain independent.

## Discovery result

The Disney entity UUID is different from the ESPN event and airing IDs. No conversion or public cross-reference was found. Do not construct a Disney UUID from an ESPN ID or hardcode a team/match mapping.

Checked public sources:

- ESPN scoreboard, Watch home and the airing's playback metadata: event identity and Disney package indicator, but no Disney entity URL.
- Apple sporting-event catalog: structured identity matches, but the record exposes only ESPN, not Disney+.
- Disney public entity page: title and `isReplayTitle: false`, but no scheduled start or ESPN event ID to validate repeat matchups.
- Disney sports hub, Explore pages and unlocked NHL schedule: availability evidence, but no direct entity link for this game.
- Disney public browse search route: returned a 404 with and without the query format used by its website code.

Browser access was not approved, so the signed-in Disney catalog was not inspected. Automatic entity discovery is not implemented. A next investigation needs a Disney catalog/search response that associates the entity UUID with an ESPN event/airing ID or with teams plus a scheduled start. Credentials are not needed in stored evidence and must not be committed.

## Apple TV

The supplied HTTPS URL identifies an event page. Opening or starting that game on Apple TV via Home Assistant has not been verified. No custom Disney URL scheme or autoplay path is inferred from this browser URL.

Existing saved-event overrides can use the supplied URL with service `disney`. No game-specific runtime override was added by this investigation. Compact observed metadata is retained in `disney-hurricanes-2026-11-05.json`.

## Follow-up: supplied search response

The user supplied a response from `https://disney.api.edge.bamgrid.com/explore/v1.21/search?query=hurricanes`. This resolves the entity-discovery question: each search result includes structured actions, event timing, league and title.

For the live Hurricanes–Islanders result:

- `visuals.title`: Carolina Hurricanes vs. New York Islanders
- `visuals.metastringParts.sportsLeague.name`: National Hockey League
- `visuals.badging.airingEventState.state`: live
- `visuals.badging.airingEventState.timeline.startTime`: 2026-11-05T23:58:02Z (coverage begins 1m58s before the scheduled game)
- Nested browse action `pageId`: entity-803f8774-b180-4727-92c3-9cf3893c164c
- Nested playback action `deeplinkId`: 803f8774-b180-4727-92c3-9cf3893c164c

The browser URL is `https://www.disneyplus.com/browse/` plus the validated browse action `pageId`. This reproduces the supplied URL without team-specific rules or splitting the composite search-result ID. Match both teams, league, coverage start window and live/upcoming state; reject replay, unavailable, wrong-date and ambiguous entries. The captured result also distinguishes `from_live` and `from_beginning` playback actions, but those internal action options do not establish public URL parameters for Apple TV.

An anonymous request to this exact endpoint returned HTTP 401 with `access-token.invalid` / `auth.missing`. The remaining blocker is authenticated catalog retrieval and secure session renewal, not URL formatting. Do not embed a captured bearer token in source, browser-delivered application code, committed fixtures or logs. No signed-in session integration was implemented. The user-supplied response remains in the attachment; only the non-sensitive fields above are recorded here.

## Public collection discovery

Following the NHL link under “Live Sports This November” on Disney's [monthly release page](https://www.disneyplus.com/explore/articles/new-to-disney-plus) reveals a public league collection:

- [NHL collection](https://www.disneyplus.com/browse/entity-7fc0cd37-bb18-4f01-9015-107b80d4da3e)
- [NCAA football collection](https://www.disneyplus.com/browse/entity-67d48152-056a-4fc1-bd99-e943cfe56481)
- [NFL collection](https://www.disneyplus.com/browse/entity-e03d1df5-565d-4954-87e5-f6ad5c46fb9d)
- [NBA collection](https://www.disneyplus.com/browse/entity-ada690d9-2834-4e3a-9547-b5c0a318d484)

The NHL page returns HTTP 200 without credentials. Its `__NEXT_DATA__` → `props.pageProps.stitchDocument.mainContent` contains `SetGroup` / `Slider` / `ImageCard` records with a game `title`, `url` and `badgeText`. This is a verified public source of actual Disney game entity links, unlike the text-only season schedule. A small extracted snapshot is in `disney-public-nhl-2026-11-05.json`.

The observed NHL listing contains ten replay cards and no live/upcoming cards. The known Hurricanes–Islanders entity is absent. Requesting it again with a cache-busting query and `Cache-Control: no-cache` returned the same listing. The NCAA football page likewise exposes replays; the inspected NFL and NBA pages expose shows/films instead of live game cards. This proves public game-link listing exists, but does not yet establish sufficient coverage for live automatic resolution. Do not use a same-team replay as the live game.

The sitemap index contains 184 numbered content sitemaps plus a static index. Targeted samples and both UUID ranges containing the known Hurricanes entity did not list it; this was not an exhaustive crawl. The sitemap records provide opaque URLs and locale alternatives, not matchup/time metadata, so they are not currently a practical live-event resolver source.
