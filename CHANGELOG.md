# Changelog

All notable changes to Simple Chat Monitor.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [1.0.22] - 2026-06-25
### Changed
- **"Pop" entry animation reworked into "Pop down".** The message now drops in from ~14px above its resting position with a slight scale-up bounce — overshooting ~3px past the resting line at peak before settling. Total duration bumped 280ms → 320ms to give the bounce room to read. Dropdown option renamed to "Pop down" so the label matches the motion; the underlying value is still `pop` so existing saved preferences carry over unchanged.

## [1.0.21] - 2026-06-25
### Fixed
- **Prime sub/resub events now show the Prime crown (👑) instead of the watch-streak eye / first-time star.** The IRC `sub` and `resub` msg-ids fire for every sub plan (Prime, Tier 1/2/3), with the plan carried in the `msg-param-sub-plan` tag — the previous icon map was looking only at msg-id, so Prime resubs rendered with the eye meant for paid resubs. Paid sub/resub icons (⭐ and 👁) are unchanged.
### Changed
- **`primepaidupgrade` icon changed from 👑 to ⬆️** — the crown is now reserved exclusively for active Prime sub/resub events. A `primepaidupgrade` is a viewer *leaving* Prime to start paying, so it slots cleanly alongside the other "now paying" upgrade events (`giftpaidupgrade`, `anongiftpaidupgrade`) under the upgrade arrow.

## [1.0.20] - 2026-06-25
### Changed
- **Glow-pulse animation duration doubled** (700ms → 1400ms) so the colored ring lingers visibly around each new message instead of flashing past. The peak intensity hits at ~350ms in and slow-fades over the remaining second, giving overlay viewers more time to notice the new arrival.

## [1.0.19] - 2026-06-25
### Changed
- **Decode animation no longer appears to "add extra characters" during scramble.** The random-glyph pool was tightened to letters + most digits only — visibly wide chars (`M`, `W`, `m`, `w`), narrow chars (`I`, `i`, `l`, `1`, `0`), and all symbols (`@`, `#`, `&`, `%`, etc.) were removed. The scrambled message now stays roughly the same visual width as the decoded message.
- **Decode animation now uses `color: inherit`** so scrambling characters match the surrounding text color (regular chat stays white, `/me` actions stay in the user's color, etc.). Earlier builds tinted the scramble accent-purple which read as link styling.
- **Typewriter and Decode animations slowed slightly.** Typewriter total reveal target: 600ms → 750ms (cap 24 → 30ms per char). Decode total stagger: 500ms → 625ms (cap 22 → 28ms per char), with each char scrambling for 300ms (up from 240ms) before locking.
- **Event-card icons are now unique per event type.** Previously `sub`, `resub`, and `primepaidupgrade` all shared a star, and every gift variant shared a wrapped present. New mapping: `sub`=⭐, `resub`=👁 (eye, for the watch-streak month count), `subgift`=🎁, `submysterygift`=🎲, `anonsubgift`=👤, `giftpaidupgrade`/`anongiftpaidupgrade`=⬆️, `primepaidupgrade`=👑, `raid`=⚔, `unraid`=🚪, `announcement`=📢, `ritual`=✨, `bitsbadgetier`=💎.
### Added
- **First-time chatter messages now show a leading green heart (💚).** Twitch doesn't surface follow events over IRC (those require EventSub/PubSub + a backend), so the `first-msg` highlight is the closest IRC-side "new viewer" indicator — adding the heart gives it a friendly marker to match the green accent stripe.

## [1.0.18] - 2026-06-25
### Added
- **Four more message entry animations** in Settings → Display:
  - **Slide from side** — horizontal slide-in from the left, distinct feel from the existing vertical slide.
  - **Blur in** — message starts out-of-focus and sharpens (320ms). Subtle but reads very "modern" against stream overlays.
  - **Glow pulse** — message fades in with a brief colored ring around it (~700ms). The ring uses the author's username color for chat messages, the event accent for event cards, and falls back to the Twitch purple for everything else.
  - **Decode** — like Typewriter, but each character starts as a random glyph and cycles through more random glyphs for ~240ms before locking in to its real value. Inline emotes/links hold their slot invisibly and reveal at their stagger position. Respects `prefers-reduced-motion`.
### Changed
- **Highlighted message variants now render as rounded "pills"** — event cards (subs, gifts, raids, announcements), cheer/bits, first-time chatter, keyword highlights, and Twitch Power-ups all now use a `border-radius` + margin-from-edge treatment with an inset accent stripe (replacing the previous flush-edge `border-left` accent). Looks cleaner against both the dark default theme and transparent overlay mode.
- **Gigantify Power-up emotes are now substantially larger** — 18× the chat font size (up from 8×), capped at 280px. The Bit-purchased effect now reads at a glance from across the room.
### Fixed
- **Power-up gradient shimmer is no longer killed by entry animations.** Previously, any non-`none` message-entry animation permanently overrode the perpetual `power-up-shimmer` animation due to CSS `animation` shorthand specificity. The `.anim` marker class is now stripped once the entry animation completes, so the shimmer resumes automatically.
- **Message entry animation now defaults to `none`** (was `fade` in 1.0.17). Existing users who haven't picked an animation from Settings won't be silently opted into motion on this update — they pick one explicitly if they want it.

## [1.0.17] - 2026-06-25
### Added
- **Message entry animation** selector in Settings → Display. Choose how each new chat message appears: **None**, **Fade in**, **Slide in** (direction-aware — slides up in normal mode, down in inverted mode so it always enters from the newest edge), **Pop** (subtle scale + fade), or **Typewriter** (per-character reveal, ~600ms target with a 8–24ms-per-char cap so long messages don't drag). Respects the OS `prefers-reduced-motion` setting (animations are skipped when reduced motion is on). Persists in `localStorage`.

## [1.0.16] - 2026-05-13
### Changed
- **Gigantify Power-up emotes are now twice as large** as the standard big-emote treatment (8× the chat font size, up from 4×). The paid Power-up now reads visibly louder than a casual emote-only message, matching its prominence in the native Twitch client.

## [1.0.15] - 2026-05-11
### Added
- **Hide commands** toggle in Settings → Filter. When on, messages whose first non-space character is `!` followed by a word character (e.g. `!discord`, `!socials`, `!hi`) are hidden. Plain enthusiasm like `!` or `!!!` is unaffected. Persists in `localStorage`.
### Removed
- **Followers-only channel-state badge** from the header. The "Followers Xm" indicator was rarely useful and tended to be misread as a follower count.

## [1.0.14] - 2026-05-11
### Added
- **Exclude users** field in Settings → Filter. Comma-separated list of Twitch usernames whose messages should be hidden — a manual companion to the built-in Hide-bots toggle, useful for silencing nuisance accounts, follower bots, or anyone that isn't in the default bot list. Applies live as you type (existing messages re-evaluate immediately) and persists in `localStorage`.

## [1.0.13] - 2026-05-11
### Added
- **Overlay background opacity** slider in Settings → Display. Drag from 0 (fully transparent, prior default) up to 100 (solid dark) to dim the chat background in overlay mode — useful when chat is hard to read against a bright or busy stream scene. Value persists in `localStorage` and is independent of the overlay toggle itself.

## [1.0.12] - 2026-05-11
### Added
- **Auto-reconnect** toggle in Settings → Display. When on (default), the page automatically connects to your last saved channel on load or refresh. A URL hash deep-link (`index.html#channel`) still takes precedence over the saved channel, so OBS browser sources with explicit channels are unaffected.

## [1.0.11] - 2026-05-11
### Changed
- **Twitch clips now render as a YouTube-style thumbnail card** instead of a full iframe player. Fetches the clip's real thumbnail + title via Twitch's public GraphQL endpoint (using the well-known web client ID — same approach used by FFZ, BTTV, and other no-OAuth tools). Card shows the thumbnail with a play overlay and the broadcaster name; click opens the clip on Twitch in a new tab. Avoids the parent-validation and autoplay quirks of the embedded player.
- If the GraphQL call fails (CORS, rate limit, endpoint change), the placeholder pill stays clickable so the link is never lost.

## [1.0.10] - 2026-05-11
### Changed
- **Twitch clips now embed inline** as the real Twitch clip player (16:9 iframe at 360px max width). The clip's thumbnail and play button are shown — viewers can play the clip directly in chat. Built on Twitch's `clips.twitch.tv/embed` URL with `parent` set dynamically from the deployed hostname. On `file://` URLs (no hostname) it falls back to the previous pill, since Twitch refuses to render embeds without a valid parent.
### Removed
- **Klipy pill detection** removed. Without a reliable way to derive the direct GIF CDN URL from a Klipy page URL (their CDN uses non-derivable hashes), the pill was misleading — clicking it just opened the page anyway. Klipy URLs now render as plain linkified text. Inline support can be re-added if Klipy publishes a stable public CDN pattern or a no-auth API.

## [1.0.9] - 2026-05-11
### Added
- **Twitch Power-up support** (best-effort, based on observed IRC tags):
  - **Gigantify an Emote** (`msg-id=gigantified-emote-message`) — emotes in the message render at the big-emote size with the highest-resolution CDN variant, even when surrounding text is present.
  - **Message Effects** (`animation-id=<effect>`) — visually highlighted with a gold-purple gradient backing, ⚡ marker, and a slow ambient shimmer. The exact effect name is stored on `data-effect` for future styling. We don't try to faithfully reproduce Twitch's bespoke animations, but Power-up messages clearly stand out.
  - A unified `power-up` CSS class is applied to either case.
### Changed
- Internal refactor: extracted `forceBigEmotes(div)` so both the auto-detect (emote-only) path and the Gigantify path share the same class-add + CDN-upscale logic.

## [1.0.8] - 2026-05-11
### Fixed
- Fade-idle seconds input was overflowing the settings menu in narrower viewports. Restructured the row to match the keyword-highlight pattern: label on its own line, full-width input below — fits any menu width cleanly.

## [1.0.7] - 2026-05-11
### Added
- **Fade idle** mode (Settings → Display → Fade idle). After a configurable period of chat silence (default 30 seconds, range 5-600), the chat fades to opacity 0 over 1.5 seconds. The next message that arrives clears the stale (now invisible) messages so the viewer only ever sees fresh activity. Perfect for stream overlays where stale chat clutters the screen during quiet moments. Seconds input lives next to the toggle. Disabled by default, persists in `localStorage`.

## [1.0.6] - 2026-05-11
### Changed
- **Big emotes now use the highest-resolution variant** available from each provider's CDN — Twitch `3.0`, BetterTTV `3x`, 7TV `4x.webp`, FrankerFaceZ `4`. So emote-only messages stay crisp instead of upscaling a thumbnail. Swap happens before the message is inserted into the DOM so there's no visible flicker. Normal-size emotes continue to use the smaller variants to save bandwidth.

## [1.0.5] - 2026-05-11
### Added
- **Big emotes** for emote-only messages — if a message contains only 1-3 emotes (Twitch, BTTV, FFZ, or 7TV) and no other text or links, the emotes render at ~4× the normal size. Same behavior as iOS Messages with emoji-only sends.

## [1.0.4] - 2026-05-11
### Added
- **Empty state** in the chat panel — shown before any messages arrive. Welcome card with a hint about the no-OAuth nature of the tool. Auto-hides via CSS `:has()` the moment any message lands, no JS needed. Suppressed entirely in overlay mode.
- **Klipy URL detection** — `klipy.com` GIF links now render as a styled `🎞️ Klipy GIF` pill (same treatment as Twitch clips). URL is stripped from the message text. Inline GIF rendering can be added later once Klipy's public CDN pattern is confirmed.
### Changed
- **Friendlier connection error messages**:
  - First connection failure: "Can't reach Twitch — check your internet" (instead of generic "Connection error").
  - Subsequent reconnect attempts give a clearer reason and mention the channel name might be invalid after a couple of retries.
  - JOIN success now says "Joined #channel — waiting for chat activity…" so a quiet channel doesn't look broken.

## [1.0.3] - 2026-05-11
### Removed
- **Tenor GIF preview support** removed entirely. Google has announced the Tenor API is being sunset on 2025-06-30, so the integration would have stopped working anyway. Tenor links in chat now render as plain linkified URLs again. The CONFIG block at the top of `app.js` has been removed since it had no remaining keys to hold.

## [1.0.2] - 2026-05-11
### Added
- **Tenor GIF previews** — page URLs (`tenor.com/view/...`) now render inline GIFs when a Tenor API key is configured in the new CONFIG block at the top of `app.js`. Renders an immediate pill placeholder, then upgrades to the GIF when the API responds. If no key is set, or the call fails, the pill stays as a clickable Tenor link — no broken state.
- **CONFIG block** at the top of `app.js` for optional API keys (currently Tenor). Clearly marked, with a security note explaining that client-side keys are visible in the deployed source.
### Changed
- **Media URLs are now removed from the visible message text** when they produce a preview card. So an image/gif/video/YouTube/Twitch/Tenor link shows just the embed — no duplicate URL. Generic article links keep their linkified text. Adjacent whitespace is cleaned up so messages don't end up with double spaces.

## [1.0.1] - 2026-05-11
### Added
- **Giphy page-URL support** — links like `giphy.com/gifs/funny-cat-XYZabc123` (and `/stickers/...`) are now turned into inline GIF previews by deriving the CDN URL from the trailing ID in the slug. No API key needed.
- **Inline video preview** for direct `.mp4` and `.webm` URLs (Discord CDN clips, Imgur `.mp4`) — autoplay, muted, looped, click-to-open in a new tab.
### Fixed
- OBS overlay mode now actually goes transparent. Previously only `<body>` was flipped to transparent, leaving `<html>` opaque — which OBS draws against, so a dark rectangle stayed on top of the scene. Both elements are now toggled in lockstep.

## [1.0.0] - 2026-05-11
First feature-complete release. Marks the transition out of pre-1.0; the feature surface is intentionally frozen here so the project stays maintainable.

### Added
- **Reply threading display** — when a viewer uses Twitch's Reply feature, the parent author and a preview of the parent message render as a quoted line above the new message (driven by `reply-parent-display-name` / `reply-parent-msg-body` IRC tags).
### Changed
- README rewritten for discoverability — added use-cases table, OBS-overlay walkthrough, teleprompter walkthrough, privacy section, and keyword tail for search engines.

## [0.13.0] - 2026-05-11
### Added
- **Clickable links** — URLs in chat messages are now linkified and open in a new tab.
- **Inline link previews** (client-side, no backend scraping):
  - Direct image URLs (jpg/png/gif/webp/bmp/avif) → inline thumbnail card.
  - YouTube videos (regular, shorts, live) → thumbnail card with play overlay, fetched from the public `img.youtube.com` CDN.
  - Twitch clips and VODs → styled pill links.
- **Link previews toggle** in Settings → Display, on by default.
### Changed
- Keyword highlight no longer matches inside URL bodies — prevents false positives like "raid" matching inside `example.com/raid`.

## [0.12.0] - 2026-05-11
### Added
- **Transparent overlay mode** for OBS browser source use — page bg goes transparent, chat text gets a heavy shadow for legibility over video, header fades and lights up on hover so settings stay accessible.
- **Hide bots** toggle — hides messages from common chat bots (Nightbot, StreamElements, Moobot, Streamlabs, Fossabot, etc.).
- **Hide system messages** toggle — silences join/timeout/clear notifications.
- **Channel-state badges** in the header — small pills for Slow mode (with interval), Subs only, Emote only, Followers only (with duration), and Unique-chat (r9k), driven by `ROOMSTATE` tags.
- **Pronouns** display next to usernames via the public `pronouns.alejo.io` service. Off by default; per-user lookups are cached for the session and back-filled into already-rendered messages.
- **Keyword highlight** — comma-separated keyword list in Settings → Filter. Matching messages get a yellow accent. Username matches against the keyword list also highlight.

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
