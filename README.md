# Simple Chat Monitor

A zero-dependency, static web app that displays a Twitch channel's chat in real time. No OAuth, no sign-in, no build step — just open the HTML file.

## Features

- **Anonymous read-only connection** to Twitch IRC (no API keys, no login)
- **Emotes** rendered from Twitch's CDN
- **Badges** for broadcaster, mod, VIP, subscriber, etc.
- **Auto-scroll** with hover-to-pause
- **Teleprompter mode** — mirrors the display horizontally so it reads correctly through a teleprompter's reflective glass
- **Invert mode** — newest messages at the top instead of the bottom
- **Adjustable font size** for distance reading
- **URL hash deep-link** — `index.html#channelname` auto-connects on load
- **Remembers** your last channel and view preferences via `localStorage`
- FIFO message cap (250) to keep the page lightweight on long sessions

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

## How it works

The app opens a WebSocket to `wss://irc-ws.chat.twitch.tv:443` and authenticates anonymously using a `justinfan<random>` nickname. Twitch grants read-only chat access without OAuth for this nickname pattern. The app requests IRCv3 tag capabilities (`twitch.tv/tags` and `twitch.tv/commands`) so it can render emotes, badges, and user colors from the message metadata.

## Browser support

Any modern browser with WebSocket and ES2017+ support. No transpilation or polyfills.
