# Changelog

All notable changes to Simple Chat Monitor.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [0.11.0] - 2026-05-11
### Added
- **Badges toggle** in Settings → Display. Hides all user badges in chat.
- Skips the badge CDN fetch on connect when badges are hidden, keeping the app fully connection-free.

## [0.10.0]
### Added
- **Font family selector** in Settings → Font. 10 curated system fonts: Gotham Bold (default), Arial Black, Impact, Verdana, Tahoma, Trebuchet MS, Georgia, Consolas, Courier New, System default. Persisted to `localStorage`.
- **Real Twitch badge icons** via the legacy `badges.twitch.tv` endpoint (no auth required). Covers global badges (broadcaster, mod, VIP, Amazon Prime, partner, etc.) and channel badges (subscriber tiers, bits tiers, hype-train, etc.).
- Text-label fallback if the badge endpoint is unreachable.

## [0.9.0]
### Changed
- Settings popover moved to the left side of the header.
- Settings button now uses the hamburger glyph (☰).
- Menu reorganized into Display / Font size / Actions sections with subtle dividers.
- Font-size controls unified into a single row: `−  A  +` with circular buttons.

## [0.8.0]
### Added
- "by Terovr" credit in the header, linking to the channel.
### Changed
- All toggle buttons collapsed into a single Settings popover.
- Default chat font set to Gotham Bold (with bold-weight system fallbacks).

## [0.7.0]
### Added
- **Quality-of-life pack**:
  - Manual Pause / Resume button (overrides scroll-position detection).
  - Clear chat button.
  - Timestamps toggle (`HH:MM` per message).
  - Click any username to filter to that user only; banner with "Clear filter".
- **Event cards** for `USERNOTICE` messages: subs, resubs, gift subs, mystery gifts, raids, announcements, rituals — each with an icon and accent color.
- **First-time chatter** highlight (green left border).
- **Cheer / bits** highlight (red left border + "N bits" pill).
- **Third-party emotes**: BetterTTV, FrankerFaceZ, and 7TV — global sets and channel sets fetched on connect.

## [0.6.0]
### Added
- Mobile / tablet support: responsive header with flex-wrap, larger tap targets (42px+), 16px input font to prevent iOS auto-zoom, `100dvh` viewport handling for mobile address bars.
### Changed
- Removed mouse-only hover-pause; auto-scroll pause/resume now driven purely by scroll position so it works on touch.

## [0.5.0]
### Changed
- Split `index.html` into separate `styles.css` and `app.js` files.
### Added
- `README.md` with usage, features, and how-it-works notes.

## [0.4.0]
### Added
- Strict `#RRGGBB` validation on the `color` IRC tag (defense-in-depth against CSS injection).
- Emote ID validation (alphanumeric/underscore) before interpolation into image URLs.
- Channel name validation (`[a-z0-9_]{4,25}`) at connect time with a clear error.
- Font size controls (A+ / A-) — persisted.
- URL hash deep-link: `index.html#channelname` auto-connects on load.
- `.gitignore` for OS/editor cruft and defensive entries.

## [0.3.0]
### Added
- Invert chat direction toggle — newest messages at the top instead of the bottom; auto-scroll logic adapted to both directions.

## [0.2.0]
### Added
- Teleprompter mode — horizontal mirror via CSS so chat reads correctly through a teleprompter's reflective glass.
### Changed
- FIFO message cap reduced to 250 to keep long sessions lightweight.

## [0.1.0]
### Added
- Initial release: anonymous Twitch IRC connection (no OAuth), emote rendering from Twitch CDN, text badges (mod/sub/VIP/etc.), auto-scroll with hover-pause, dark Twitch-like styling, `localStorage` for last channel.
