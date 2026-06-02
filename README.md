# Frigate Modern Hass Card

[![HACS Custom](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)
[![GitHub Release](https://img.shields.io/github/release/QuadNL/frigate-modern-hass-card.svg)](https://github.com/QuadNL/frigate-modern-hass-card/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A modern, feature-rich Lovelace card for [Frigate NVR](https://frigate.video) in Home Assistant.

## Features

- **Live stream** — HLS stream via `ha-camera-stream`, mute toggle, fullscreen with animation
- **Multi-camera grid** — up to 4 cameras in a responsive 2×2 grid, each slot independently fullscreenable
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
3. Add `https://github.com/QuadNL/frigate-modern-hass-card` as type **Lovelace**
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

<img width="400" height="100%" alt="Image_4u8a6l4u8a6l4u8a1" src="https://github.com/user-attachments/assets/9e10b2f5-1069-4265-b949-8589283353d4" />

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
<img width="400" height="100%" alt="Image_4u8a6l4u8a6l4u8a2" src="https://github.com/user-attachments/assets/51109eec-b8b3-424a-aa77-322c9a00e71a" />

### All options
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `camera_entity` | string | — | Single camera entity (shorthand) |
| `cameras` | list | — | List of `{entity, name}` objects (up to 4) |
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

## Requirements

- [Frigate NVR](https://frigate.video) with the [Frigate Home Assistant integration](https://github.com/blakeblackshear/frigate-hass-integration)
- Home Assistant 2023.x or later

## License

MIT © QuadNL
