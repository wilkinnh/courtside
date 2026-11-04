# Paramount+ live-event Apple TV investigation

Investigated November 4, 2026 during Slavia Praha vs. Arsenal. Status: user verified correct Arsenal playback with the native live-event URL ending in a trailing slash and without referral parameters, after force quitting Paramount+ and launching fresh. Warm-app behavior remains unreliable in the reported tests. No resolver behavior was changed by this investigation.

## Exact game and URLs

Apple's public event metadata identifies:

| Field | Value |
| --- | --- |
| Match | SK Slavia Praha vs. Arsenal FC |
| Competition | UEFA Champions League |
| Kickoff | November 4, 2026, 20:00 UTC / 3:00 p.m. EST |
| ESPN event | `401915381` |
| Apple event | `umc.cse.3kwsie6gl99cg2i04jxcbyvxo` |
| Paramount event | `aadcb004-4ada-46a0-9f46-2afa641e981f` |
| Apple provider/channel | `tvs.sbd.10120` — Paramount+ |
| App bundle | `com.cbsvideo.app` |
| Service | `US Digital Sports` / `com.CBS.CBSTV.US.ebs.sub-v3` |
| Airing / language | Live / English (United States) |

Apple's `punchoutUrls.play`, copied verbatim:

```text
pplus://www.paramountplus.com/live-tv/stream/uefa-champions-league/aadcb004-4ada-46a0-9f46-2afa641e981f?searchReferral=appleatv&source=spotlight
```

Apple's `punchoutUrls.open`, copied verbatim:

```text
pplus://www.paramountplus.com/live-tv/stream/uefa-champions-league/aadcb004-4ada-46a0-9f46-2afa641e981f?searchReferral=appleatv&source=spotlight#open
```

The only difference is `#open`. Prefer the `play` value for a playback test. The distinction comes from Apple's field names; this is not a claim that both actions were tested on tvOS. Preserve the original query and path, including the absence of a trailing slash.

A secondary, derived HTTPS candidate replaces only the scheme:

```text
https://www.paramountplus.com/live-tv/stream/uefa-champions-league/aadcb004-4ada-46a0-9f46-2afa641e981f?searchReferral=appleatv&source=spotlight
```

This HTTPS variant is a transformation, not the URL Apple returned. It is a fallback device experiment if the native scheme fails, not a verified browser or TV playback URL.

## Evidence and discovery

1. Fetched [Apple's public Arsenal sports search](https://tv.apple.com/us/collection/sports/uts.col.search.SE?searchTerm=Arsenal). Its `serialized-server-data` JSON contained the live Slavia–Arsenal event and an Apple event-page URL.
2. Fetched [the exact Apple event page](https://tv.apple.com/us/sporting-event/sk-slavia-praha-vs-arsenal-fc/umc.cse.3kwsie6gl99cg2i04jxcbyvxo). Its public page configuration provided the `getSportingEventById` route and the current default request parameters.
3. Requested `https://uts-api.itunes.apple.com/uts/v3/sporting-events/umc.cse.3kwsie6gl99cg2i04jxcbyvxo` with that configuration. HTTP 200 returned `data.content`, `data.channels`, and `data.playables`.
4. Matched the content's home/away teams, league, and kickoff, then selected the playable whose `channelId` maps to Paramount+, with `airingType: Live`, matching canonical event ID, and English locale.
5. Extracted `punchoutUrls.play` and `punchoutUrls.open` from that playable. No Paramount login, browser cookies, video manifest, or device control was used.

The request used Apple's web platform configuration. It provides an actual app handoff URL, but does not itself establish compatibility with this user's installed tvOS app. Apple's UTS endpoints are an undocumented website interface and may change.

The sanitized evidence is in [paramount-arsenal-2026-11-04.json](paramount-arsenal-2026-11-04.json). It excludes anonymous session/configuration tokens and unrelated providers. Its capture timestamp comes from the saved response. The event link is specific to this live airing; do not assume it becomes the replay link afterward.

Paramount's [app association file](https://www.paramountplus.com/.well-known/apple-app-site-association) associates `H443NM7F8H.com.cbsvideo.app` with live-TV and video routes. The [sports hub](https://www.paramountplus.com/collections/sports-hub/) also declares `CBS.Registry.DeepLinkPrefix = "pplus://"`. These corroborate the route family, but neither proves tvOS playback. In this fetch, the public competition page returned HTTP 500 and Live TV returned HTTP 403; the sports hub supplied only a competition-level watch link.

The public [FruitDeepLinks API research](https://github.com/kineticman/FruitDeepLinks/blob/main/docs/apple_uts_sports_api_notes.md) supplied the lead to inspect Apple's event metadata. Its [Paramount converter](https://github.com/kineticman/FruitDeepLinks/blob/main/bin/deeplink_converter.py) implements a scheme-to-HTTPS transformation. The concrete Arsenal URL above was independently obtained from Apple, not taken from that project's examples.

## Device test

User result, November 4: the exact native `pplus://` play URL opened Paramount+ but did not select the game. This confirms app launch only. It does not establish whether the app ignored the route, the live-event mapping was unusable, or another app-state condition interfered. Next test: the same URL with only `pplus://` changed to `https://`, keeping the path and query intact. The user also reported that the HTTPS variant "fails from home assistant." The exact error is `Failed to perform the action media_player.play_media. Unknown error`. The underlying exception is not yet available; this message alone does not establish whether tvOS rejected the URL or the integration failed earlier. Neither variant is verified for direct game playback.

Use [paramount-arsenal-test.yaml](paramount-arsenal-test.yaml) in Home Assistant Developer tools → Actions and replace the placeholder with the actual Apple TV media-player entity. This follows [Home Assistant's Apple TV deep-link action documentation](https://www.home-assistant.io/integrations/apple_tv/#launching-apps).

1. While the match is live and Paramount+ is signed in, send the exact `play` link using `media_player.play_media` and `media_content_type: url`.
2. Record whether it starts the correct live match, opens the match detail page, opens only Paramount's home screen, or produces an error.
3. If successful, repeat from the Apple TV home screen and while Paramount is already open to another title. Record app/tvOS versions and whether playback starts at the live edge.
4. If the native link fails, test the derived HTTPS variant separately. Do not treat opening the app alone as successful game routing.

The `open` link is a useful diagnostic comparison; it should not replace the play link in the initial test. A successful Home Assistant action response alone is not evidence of correct on-screen playback.

## Implications for Courtside

The current resolver has two separate gaps:

- Paramount catalog discovery covers only Carabao Cup and Serie A via CBS Sports browser pages; Champions League has no native event lookup.
- `safeUrl` and the Home Assistant handoff accept HTTPS plus a narrow ESPN scheme exception. A pasted `pplus://` URL is currently rejected. Run this experiment directly through Home Assistant, not Courtside's saved-link or player controls.

The next resolver implementation should match ESPN → Apple event by both teams, home/away, competition, and kickoff; select the direct Paramount provider rather than Paramount via Prime or a CBS Sports app entry; and preserve Apple's exact `play` URL as `appUrl`. Explicit aliases would cover Arsenal/Arsenal FC and Slavia Prague/SK Slavia Praha. It must reject mismatched dates, replays, and ambiguous duplicate feeds.

Add a narrowly validated Paramount scheme to the app-link and handoff paths rather than allowing arbitrary custom schemes. Keep browser and app destinations distinct; an HTTPS conversion should not be called a verified browser URL without separate evidence. Keep `deviceVerified` and `autoplay_safe` false pending the real device result. Any eventual device verification should record its scope and date rather than imply every Paramount game has been tested.

The CBS `LET-*`, ESPN numeric event ID, Apple `umc.cse.*`, and Paramount UUID are separate identities. Neither the league slug nor the Paramount UUID should be guessed from the other IDs.

## Native-scheme follow-up after unsuccessful tests

The exact Paramount live-event web route subsequently returned HTTP 200, redirecting to the same path with a trailing slash. Its page identifies `__content_id` as the same UUID and `__title` as Slavia Praha vs. Arsenal. Its JSON-LD WatchAction publishes an `IOSPlatform` destination:

```text
https://www.paramountplus.com/shows/stream/video/aadcb004-4ada-46a0-9f46-2afa641e981f/
```

The next native-scheme candidate is therefore:

```text
pplus://www.paramountplus.com/shows/stream/video/aadcb004-4ada-46a0-9f46-2afa641e981f/
```

This combines a provider-published iOS video path with Paramount's declared native scheme. It is an explicit experiment, not a verified tvOS format or a complete native URL observed in metadata. Test while Paramount is open and a profile is selected. No fabricated content ID or autoplay parameter is added.

Apple API platform probes returned the same Paramount links for `pfm=web` and `pfm=appletv`; `pfm=tvos` returned HTTP 400. This did not discover a different TV route and does not establish that the API actually honored a distinct device context. Public player JavaScript inspected did not expose the native route handler.

User follow-up: the signed-in browser uses the same live-event UUID and a trailing slash. After the latest native live-route suggestion (trailing slash, no referral query), the user reported that a stream opened labeled “Live TV,” but it was not the game. Exact channel and cause are unknown. This is not successful event routing. The separate native `/shows/stream/video/` candidate has no clearly attributed test result yet.

## Confirmed device result — fresh launch

The user corrected the preceding result: this exact URL **did open the correct game** after force quitting Paramount+ and launching fresh:

```text
pplus://www.paramountplus.com/live-tv/stream/uefa-champions-league/aadcb004-4ada-46a0-9f46-2afa641e981f/
```

Verification is limited to this event and the user's Apple TV from a fresh launch. The earlier generic Live TV result is retained as evidence of app-state sensitivity. These tests do not isolate whether the trailing slash or removed referral parameters matter; do not claim either is required. The `/shows/stream/video/` candidate is not the confirmed route. Automatic force quitting and warm-app reliability have not been established. No resolver code was changed.

## Implemented in Courtside

The resolver now discovers matching Apple catalog events for active Paramount+ broadcasts in Champions League, Serie A, and Carabao Cup, and emits the normalized native live-event URL. The website player selects the native URL, and the Home Assistant handoff accepts narrowly validated Paramount event routes. Browser URLs remain HTTPS. Live verification against Arsenal returned the exact user-tested URL with `provider_catalogs.paramount: true` and `launchable: true`. Per-game device verification remains false. The player includes the fresh-launch caveat. Historical statements above describing missing implementation apply to the investigation before these changes.
