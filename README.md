# Frigate Modern Hass Card

> **AI Assistance Notice**
> This card was built with the help of an AI coding assistant. All code has been personally reviewed, tested on a real Frigate setup, and is actively maintained. Found a bug or have a suggestion? Open an issue on GitHub.

[![HACS Custom](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)
[![GitHub Release](https://img.shields.io/github/release/QuadNL/frigate-modern-hass-card.svg)](https://github.com/QuadNL/frigate-modern-hass-card/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A modern, feature-rich Lovelace card for [Frigate NVR](https://frigate.video) in Home Assistant.

## Features

- **Live stream** — native player controls (play, mute, volume, fullscreen), with optional low-latency go2rtc streaming
- **Multi-camera grid** — any number of cameras, with a configurable column count; tap a camera to open it, or go fullscreen for a wall view
- **Timeline** — visual recording + event timeline, click to seek, drag to pan
- **Event tabs** — Clips · Snapshots · Recordings · Reviews · Kept (favourites)
- **Recording viewer** — custom playback controls with correct clip duration, seek bar, download-from-position
- **Reviews** — alert/detection severity, mark-reviewed, hide-reviewed filter
- **Clip download** — download any recording from your current seek position
- **Responsive layout** — wide mode shows stream + events side-by-side
- **Theming** — dark / light / auto, custom accent + background colour picker
- **Auto-rotate** — configurable interval rotation across cameras

## Installation via HACS

1. Open HACS → Frontend
2. Click ⋮ → Custom repositories
3. Add `https://github.com/QuadNL/frigate-modern-hass-card` as type **Dashboard**
4. Install "Frigate Modern Hass Card"
5. Hard-refresh your browser

> Once the repo is accepted in the HACS default store, you'll find it directly under HACS → Frontend without adding a custom repository.

## Manual Installation

Download `frigate-modern-hass-card.js` from the [latest release](https://github.com/QuadNL/frigate-modern-hass-card/releases/latest) and place it in your `config/www/` folder.

Add to your Lovelace resources:
```yaml
url: /local/frigate-modern-hass-card.js
type: module
```

## Configuration

### Minimal (single camera)
```yaml
type: custom:frigate-modern-hass-card
camera_entity: camera.front_door
```

![Single camera view](https://github.com/user-attachments/assets/9e10b2f5-1069-4265-b949-8589283353d4)

### Multi-camera
```yaml
type: custom:frigate-modern-hass-card
title: Security
cameras:
  - entity: camera.front_door
    name: Front Door
  - entity: camera.backyard
    name: Backyard
  - entity: camera.garage
    name: Garage
  - entity: camera.side_gate
    name: Side Gate
default_view: single     # or 'grid'
```
![Multi-camera grid view](https://github.com/user-attachments/assets/51109eec-b8b3-424a-aa77-322c9a00e71a)

### All options
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `camera_entity` | string | — | Single camera entity (shorthand) |
| `cameras` | list | — | List of `{entity, name}` objects |
| `title` | string | — | Card title |
| `subtitle` | string | — | Card subtitle |
| `default_view` | string | `single` | `single` or `grid` |
| `theme` | string | `dark` | `dark`, `light`, `auto` |
| `accent_color` | string | — | Custom accent colour (hex) |
| `bg_color` | string | — | Custom background colour (hex) |
| `window_hours` | number | `24` | History window in hours |
| `rotate_on_load` | boolean | `false` | Auto-rotate cameras on load |
| `rotate_seconds` | number | `30` | Rotation interval in seconds |
| `stream_height` | number | — | Max stream height in vh |
| `hidden_tabs` | list | `[]` | Tabs to hide: `recordings`, `clips`, `snapshot`, `reviews`, `kept` |
| `grid_columns` | string/number | `auto` | Grid columns: `auto`, or `1`–`6`. Use `1` to stack cameras vertically |
| `events_collapsed` | boolean | `false` | Start with the events panel hidden, giving the cameras the full width |
| `live_provider` | string | `hls` | Live view source: `hls` (Home Assistant stream) or `go2rtc` |
| `go2rtc_mode` | string | `mse` | go2rtc transport: `mse`, `webrtc`, or `auto` |

## Low-latency live view with go2rtc

By default the live view uses Home Assistant's own stream, which buffers several
seconds ahead. Frigate ships with go2rtc built in, and streaming through that
instead cuts the delay to roughly a second and is noticeably lighter on the
browser — which matters most in grid view, where every camera streams at once.

This is **opt-in**. To enable it, add one line to your card configuration:

```yaml
type: custom:frigate-modern-hass-card
camera_entity: camera.front_door
live_provider: go2rtc
```

Or in the visual editor: **Live view provider → go2rtc**.

No extra setup is needed. The card reaches go2rtc through the Frigate
integration's own proxy, so there is no separate URL or port to configure and it
keeps working remotely and in the companion apps. If go2rtc can't be reached,
the card falls back to the Home Assistant stream on its own — in grid view each
camera falls back independently, so one problematic camera won't take the others
down with it.

### Transport

| Value | Behaviour |
| --- | --- |
| `mse` (default) | Everything runs over the proxied connection. Works locally, remotely and in the companion apps. |
| `webrtc` | Lowest possible latency, but connects straight to go2rtc's own port, which usually only resolves on the local network. |
| `auto` | Leaves the choice to the player, which tries WebRTC first. |

```yaml
live_provider: go2rtc
go2rtc_mode: webrtc   # only worth trying on a local network
```

## Requirements

- [Frigate NVR](https://frigate.video) with the [Frigate Home Assistant integration](https://github.com/blakeblackshear/frigate-hass-integration)
- Home Assistant 2023.x or later

## Support

If you like this card; why don't buy me a coffee? 😊
[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/U2W120MCVZ)

## License

MIT © QuadNL
