# Simple Chat Monitor — Free Twitch Chat Overlay & Teleprompter

A free, **zero-install Twitch chat viewer** for streamers, hosts, and moderators. Drop a channel name in, get a clean, readable chat — no OAuth, no login, no API keys, no downloads. Works as an OBS browser source overlay, a second-monitor chat reader, a tablet chat panel, or a teleprompter-mirrored chat display.

Built by [Terovr](https://www.twitch.tv/terovr).

> **Looking for:** a Twitch chat overlay for OBS · a free Twitch chat reader · a no-OAuth chat viewer · a teleprompter-compatible chat display · a BetterTTV / FrankerFaceZ / 7TV emote viewer · a mobile-friendly Twitch chat monitor? This is built for that.

## Why use this

- **Truly zero-install.** Open one HTML file, type a channel, you're reading chat. Nothing to download, no extension, no account.
- **No login or OAuth required.** Uses Twitch's anonymous IRC nickname (`justinfan`) — full read-only access without ever touching your account.
- **OBS browser-source ready.** Built-in **transparent overlay mode** with text shadows for legibility over any video background.
- **Teleprompter mode.** Mirrors the display horizontally so chat reads correctly through a teleprompter's reflective glass — for streamers running their show off a reading rig.
- **Real third-party emotes.** BetterTTV, FrankerFaceZ, and 7TV global + channel emote sets, fetched on connect.
- **Real Twitch badge icons.** Broadcaster, mod, VIP, Amazon Prime, partner, subscriber tiers, bits — fetched from Twitch's badge CDN.

## Use cases

| If you're… | …use it as |
|---|---|
| A Twitch streamer with one monitor | A browser-tab chat reader running alongside your game |
| A Twitch streamer using OBS | A transparent **chat overlay** dropped into a browser source |
| Running a teleprompter setup | A mirrored chat display for the reading glass |
| Co-streaming or running a watch party | A clean second-monitor view of someone else's chat |
| Moderating with a phone/tablet next to you | A touch-friendly chat panel with manual pause and click-to-filter |
| Watching a stream on iPad while playing | A distraction-free chat reader without the player |

## Features

### Connection
- **Anonymous read-only** Twitch IRC WebSocket — no API keys, no OAuth, no rate limit headaches.
- Auto-reconnect with exponential backoff.
- URL hash deep-link: `index.html#channelname` auto-connects on load (perfect for OBS browser source bookmarks).

### Emotes & badges
- Twitch emotes rendered from the official CDN.
- **BetterTTV (BTTV)**, **FrankerFaceZ (FFZ)**, and **7TV** emotes — global and channel sets.
- Real Twitch badge icons (mod, sub tiers, bits, Amazon Prime crown, VIP, partner, etc.), with text-label fallback.

### Streamer event display
- **Event cards** for subs, resubs, gift subs, mystery gifts, raids, announcements, rituals — each with an icon and accent color.
- **First-time chatter** highlight (green left border).
- **Cheers / bits** highlight (red border + bits pill).
- **Reply threading** — when a viewer uses Twitch's Reply feature, the parent message is shown as a quoted line above.
- **Channel-state badges** — Slow mode, Subs-only, Emote-only, Followers-only, Unique chat — surfaced in the header from `ROOMSTATE`.

### View modes
- **Transparent overlay mode** (OBS-ready)
- **Teleprompter mode** (horizontal mirror)
- **Invert mode** (newest message on top)
- **Timestamps** toggle
- **Dark Twitch-style** default theme

### Customization
- **Font family selector** — Gotham Bold (default), Arial Black, Impact, Verdana, Tahoma, Trebuchet MS, Georgia, Consolas, Courier New, system default.
- **Font size** controls.
- **Toggle visibility** of badges, system messages, and chat bots independently.

### Filters & focus
- **Keyword highlight** — comma-separated list, with URL-body matching skipped to avoid false positives.
- **Hide bots** toggle — silences Nightbot, StreamElements, Moobot, Streamlabs, Fossabot, and other common channel bots in one click.
- **Hide system messages** toggle.
- **Click a username** to filter chat to that user only.
- **Pronouns** display via `pronouns.alejo.io` (optional, off by default).

### Link previews (Discord-style)
- Inline thumbnails for **direct image URLs** (jpg/png/gif/webp/avif).
- **YouTube** video previews via the public `img.youtube.com` thumbnail CDN.
- Styled link pills for **Twitch clips** and **VODs**.
- All client-side, no scraping backend.

### Other
- Mobile / tablet friendly — responsive header, large tap targets, touch scroll-to-pause.
- FIFO message cap (250) for long sessions.
- All preferences saved in `localStorage`.

## Quick start

1. Open `index.html` in a modern browser.
2. Type a Twitch channel name (e.g. `xqc`, `pokimane`, `shroud`) and click **Connect**.
3. (Optional) Open the **☰ Settings** menu in the top-left to enable overlay mode, change the font, hide bots, etc.

That's it. No server, no install, no sign-up.

### Using it as an OBS browser source

1. In OBS, add a new **Browser** source.
2. For the URL, point at the hosted file with a hash deep-link:
   ```
   https://your-host.example/path/to/index.html#yourchannel
   ```
3. Set the width/height to your overlay size (e.g. 400×600).
4. Open the chat once, enable **☰ Settings → Display → Overlay** so the background goes transparent.
5. The overlay state persists, so future loads start in overlay mode automatically.

### Using it as a teleprompter chat display

1. Connect to your channel.
2. Open **☰ Settings → Display → Teleprompter**.
3. Feed the screen into your teleprompter rig. The reflective glass un-mirrors the display so the operator sees it the right way around.

### Deep-linking

Append the channel name as the URL hash to auto-connect on load:
```
file:///path/to/index.html#xqc
```
Changing the hash later disconnects and reconnects to the new channel — useful for switching channels in an OBS browser source by editing the URL.

## How it works

The app opens a WebSocket to `wss://irc-ws.chat.twitch.tv:443` and authenticates anonymously using a `justinfan<random>` nickname. Twitch grants read-only chat access without OAuth for this nickname pattern. The client requests IRCv3 tag capabilities (`twitch.tv/tags` and `twitch.tv/commands`) so it can render emotes, badges, user colors, reply threading, channel state, cheers, and event metadata.

After joining, the first `ROOMSTATE` message carries the broadcaster's Twitch user ID. The app uses that to fetch channel emote sets from BetterTTV, FrankerFaceZ, and 7TV in parallel — all three providers offer public, no-auth APIs. The legacy `badges.twitch.tv` endpoint is used for badge icons (also no-auth).

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure |
| `style.css` | All styling, including overlay & teleprompter modes |
| `app.js` | IRC client, message rendering, settings logic |
| `package.json` | Canonical version + project metadata |
| `CHANGELOG.md` | Full version history |

## Browser support

Any modern browser with WebSocket and ES2017+ support (Chrome, Firefox, Safari, Edge, mobile Safari, Chrome for Android). No transpilation, no polyfills.

## Privacy

- **No telemetry.** The app makes no analytics calls.
- **No backend.** Everything runs in your browser.
- **Network calls** are limited to: Twitch IRC (WebSocket), Twitch's emote/badge CDN, the optional BTTV/FFZ/7TV emote APIs, and the optional `pronouns.alejo.io` lookup. Each can be disabled in Settings.
- **localStorage** stores only your local UI preferences (last channel, toggles).

## Version

Current: **v1.0.0**. See [CHANGELOG.md](CHANGELOG.md) for the full history.

## Credits

Built by **Terovr** — [twitch.tv/terovr](https://www.twitch.tv/terovr). If this tool saves you time, a tip is never required but always appreciated: [streamelements.com/terovr/tip](https://streamelements.com/terovr/tip).

## Keywords

Twitch chat overlay, free Twitch chat reader, no-OAuth Twitch chat, OBS browser source chat, Twitch chat for streamers, BetterTTV viewer, FrankerFaceZ viewer, 7TV emotes chat, teleprompter chat display, Twitch chat monitor, mobile Twitch chat, transparent chat overlay, Twitch chat browser source, free streaming tools, Twitch IRC viewer.
