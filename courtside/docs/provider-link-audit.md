# Provider link audit — November 4, 2026

Discovery is triggered by broadcast/provider metadata. Event URLs use IDs and routes supplied by the source catalog; team names never generate a content ID.

| Provider | Event discovery and Apple TV handling |
| --- | --- |
| ESPN | Joins Watch catalog entries by ESPN event ID; preserves provider playback metadata. |
| Paramount+ | Searches Apple catalog for the scheduled teams, validates structured event and Paramount provider identity, formats the supplied route/UUID as `pplus://` with a trailing slash. |
| HBO Max | Uses the same structured Apple event matching across configured leagues; requires an actual HBO Max playable before exposing its sports URL. TNT/TBS/truTV merely trigger lookup. |
| Prime / HHN | Broadcast or provider link triggers lookup; all active NHL games are also checked because schedule metadata may omit regional HHN broadcasts. No Carolina team requirement. Validates teams, start time and subscription; uses provider full GTI for Apple TV. HHN remains a distinct subscription. |
| Peacock | Validates teams and start time in supported league catalogs; uses the supplied asset UUID in the playback payload. |
| USA / Xfinity | Validates structured teams, league and time; published event URLs remain browser-only. |
| CBS Sports fallback | Validates Paramount authentication, teams, league and time; published CBS event pages remain browser-only. |
| FOX | FS1/FS2 channel fallbacks and saved event pages remain browser-only; no validated native game discovery. |
| Disney+, NBA, Apple TV | No dedicated automatic event catalog adapter. Existing metadata or saved event links may be available; generic service links are not direct games. |
| OTA | No direct streaming event URL; requires a tuner/app. |

Name matching uses full and short names supplied by the catalogs, with generic soccer club-prefix normalization. No team alias table or guessed city/nickname list remains. Apple matching validates home/away, league and kickoff; a translated opponent requires one matching team plus exact venue and kickoff. Missing or ambiguous evidence leaves the direct link unavailable.

Catalog coverage is incomplete. These changes do not establish playback verification for every app or event. The known Paramount fresh-launch result remains documented separately; device verification stays false for automatically discovered links.
