# Simple Chat Monitor

A zero-dependency, static web app that displays a Twitch channel's chat in real time. No OAuth, no sign-in, no build step.

## Features

### Core
- **Anonymous read-only connection** to Twitch IRC (no API keys, no login)
- **Emotes** rendered from Twitch's CDN
- **Third-party emotes**: BetterTTV, FrankerFaceZ, and 7TV — global sets and channel sets
- **Badges** for broadcaster, mod, VIP, subscriber, etc.
- **Auto-scroll** that pauses when you scroll up (works on mouse and touch)
- **FIFO message cap** (250) to keep the page lightweight on long sessions

### Event highlights
- **Event cards** for subs, resubs, gift subs, raids, announcements, and rituals
- **First-time chatter** messages highlighted with a green accent
- **Cheers** flagged with a bits tag and red accent

### View modes
- **Teleprompter mode** — mirrors the display horizontally so it reads correctly through a teleprompter's reflective glass
- **Invert mode** — newest messages at the top instead of the bottom
- **Adjustable font size and family** — pick from a list of system fonts (Gotham Bold, Arial Black, Impact, Verdana, Consolas, etc.)
- **Real Twitch badge icons** (broadcaster, mod, VIP, Amazon Prime, partner, subscriber tiers, bits) — fetched from Twitch's badge CDN, with text-label fallback if the endpoint is unreachable
- **Timestamps** toggle

### Controls
- **Pause / Resume** manual auto-scroll lock
- **Clear** wipes the visible chat
- **Click a username** to filter to that user only; dismiss via the filter banner

### Other
- **Mobile / tablet friendly** — responsive header, large tap targets, touch-friendly scroll-to-pause
- **URL hash deep-link** — `index.html#channelname` auto-connects on load
- **Remembers** your last channel and view preferences via `localStorage`

## Usage

1. Open `index.html` in a browser.
2. Type a Twitch channel name (e.g. `xqc`) and click **Connect**.

That's it. The page is fully static — no server, no install.

### Deep-linking

Append the channel as a URL hash to auto-connect:

```
file:///path/to/index.html#xqc
```

Useful for browser bookmarks or OBS browser sources. Changing the hash later disconnects and reconnects to the new channel.

### Teleprompter mode

Click the **Teleprompter** button to mirror the display horizontally. Feed the output into a teleprompter rig; the reflective glass un-mirrors it for the reader.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page structure |
| `styles.css` | All styling, including teleprompter mirror |
| `app.js` | IRC client, message rendering, UI toggles |
| `package.json` | Canonical version + project metadata |
| `CHANGELOG.md` | Full version history |

## Version

Current: **v0.11.0**. See [CHANGELOG.md](CHANGELOG.md) for the full history.

## How it works

The app opens a WebSocket to `wss://irc-ws.chat.twitch.tv:443` and authenticates anonymously using a `justinfan<random>` nickname. Twitch grants read-only chat access without OAuth for this nickname pattern. The app requests IRCv3 tag capabilities (`twitch.tv/tags` and `twitch.tv/commands`) so it can render emotes, badges, and user colors from the message metadata.

After joining, the first `ROOMSTATE` message carries the broadcaster's Twitch user ID. The app uses that to fetch channel emote sets from BetterTTV, FrankerFaceZ, and 7TV in parallel — all three providers offer public, no-auth APIs.

## Browser support

Any modern browser with WebSocket and ES2017+ support. No transpilation or polyfills.
