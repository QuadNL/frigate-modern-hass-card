// constants.js — shared constants, icons and helper functions
/**
 * Frigate Modern Hass Card  v6.1
 * ---------------------------------------------------------------
 * Stream: ha-camera-stream without frontend_stream_type → direct HLS, no WebRTC.
 * Multi-camera grid (1-4 cams), responsive layout, per-cam timeline colours,
 * always-visible compact latest event, camera entity picker in editor.
 * ---------------------------------------------------------------
 */
const VERSION = '1.3.0-dev.4';
const CARD_TAG = 'frigate-modern-hass-card';
const DAY = 86400;
// Smallest tile width the automatic grid will produce, in px. Below this a
// camera stops being watchable, so fewer columns are used instead.
const MIN_TILE_PX = 200;
const DEFAULT_ROTATE_S = 30;   // seconds used when rotate_seconds=0 and user enables rotation

const ICONS = {
  live:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z"/></svg>',
  recordings:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/></svg>',
  clips:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8 12.5v-9l6 4.5-6 4.5z"/></svg>',
  snapshot:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 15.2A3.2 3.2 0 0 1 8.8 12 3.2 3.2 0 0 1 12 8.8 3.2 3.2 0 0 1 15.2 12 3.2 3.2 0 0 1 12 15.2M20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z"/></svg>',
  reviews:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3zm-1 14l-4-4 1.4-1.4L11 13.2l5.6-5.6L18 9l-7 7z"/></svg>',
  clock:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>',
  pin:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',
  back:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>',
  download:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>',
  star:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>',
  starO:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>',
  calendar:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H5V8h14v13z"/></svg>',
  filter:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/></svg>',
  expand:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>',
  chevron:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>',
  rotate:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8A5.87 5.87 0 0 1 6 12c0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2A5.87 5.87 0 0 1 18 12c0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z"/></svg>',
  volOff:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>',
  volOn: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>',
  grid:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3v8h8V3H3zm6 6H5V5h4v4zm-6 4v8h8v-8H3zm6 6H5v-4h4v4zm4-16v8h8V3h-8zm6 6h-4V5h4v4zm-6 4v8h8v-8h-8zm6 6h-4v-4h4v4z"/></svg>',
  person:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>',
};

// ── helpers ──────────────────────────────────────────────────
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function parseWs(r) { if (typeof r === 'string') { try { return JSON.parse(r); } catch(_) { return []; } } return r; }
const LABEL_COLORS = { person:'#3b82f6', car:'#a855f7', motion:'#f59e0b', dog:'#10b981', cat:'#f472b6', bicycle:'#22d3ee', bird:'#eab308', package:'#f97316', face:'#818cf8', truck:'#fb7185', bus:'#34d399' };
const PALETTE = ['#3b82f6','#a855f7','#f59e0b','#10b981','#f472b6','#22d3ee','#eab308','#ef4444','#f97316'];
function labelColor(l) { if (!l) return '#f59e0b'; if (LABEL_COLORS[l]) return LABEL_COLORS[l]; let h=0; for (const c of l) h=(h*31+c.charCodeAt(0))>>>0; return PALETTE[h%PALETTE.length]; }
// per-camera recording bar colours (distinct from event marker colours)
const CAM_COLORS = ['rgba(30,80,200,.5)','rgba(210,80,30,.5)','rgba(30,170,80,.5)','rgba(170,30,180,.5)'];
function mkCamState() { return { clientId:'frigate', cam:'', events:[], recordings:[], reviews:[], kept:[], discovered:false }; }
function camDisplayName(c) { return c.name || (c.entity||'').replace(/^camera\./,'').replace(/_/g,' '); }

// ── main card ────────────────────────────────────────────────

// styles.js — card CSS
// ── styles ───────────────────────────────────────────────────
const STYLES = `
  :host{display:block;}
  .card{position:relative;background:var(--c-bg);color:var(--c-text);overflow:hidden;border-radius:var(--ha-card-border-radius,18px);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
  .section-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--c-text3);}

  /* ── theme variables (dark = default) ── */
  .card {
    --c-bg:        #1c2233;
    --c-bg-panel:  rgba(255,255,255,.04);
    --c-bg-deep:   #0d1117;
    --c-text:      #f0f4ff;
    --c-text2:     #9bb0d4;
    --c-text3:     #5c7099;
    --c-text4:     #3a4d6e;
    --c-border:    rgba(255,255,255,.05);
    --c-border2:   rgba(255,255,255,.08);
    --c-acc:       #3b82f6;
    --c-acc-bg:    rgba(59,130,246,.18);
    --c-acc-bdr:   rgba(59,130,246,.35);
    --c-on:        #4ade80;
  }
  .card.theme-light {
    --c-bg:        #f0f4ff;
    --c-bg-panel:  rgba(0,0,0,.04);
    --c-bg-deep:   #1c2233;
    --c-text:      #1e293b;
    --c-text2:     #475569;
    --c-text3:     #64748b;
    --c-text4:     #94a3b8;
    --c-border:    rgba(0,0,0,.07);
    --c-border2:   rgba(0,0,0,.1);
    --c-acc:       #2563eb;
    --c-acc-bg:    rgba(37,99,235,.12);
    --c-acc-bdr:   rgba(37,99,235,.35);
  }
  /* ── responsive layout ── */
  .layout{display:flex;flex-direction:column;}
  /* Wide: side-by-side.
     col-left drives card height (natural: stream + timeline + info + tabs + latest).
     col-right max-height is set dynamically by JS to match col-left.offsetHeight
     so the events panel never makes the card taller than the stream side. */
  .card.wide .layout{flex-direction:row;align-items:flex-start;}
  /* Widths rather than flex so the events panel can be slid away: both sides
     animate, the cameras take over the space instead of being covered by an
     overlay. */
  .card.wide .col-left{width:58%;flex-shrink:0;transition:width .28s ease;}
  .card.wide .col-right{width:42%;flex-shrink:0;min-width:0;overflow-y:auto;border-left:1px solid var(--c-border);transition:width .28s ease,opacity .18s ease;}
  .card.wide.events-collapsed .col-left{width:100%;}
  .card.wide.events-collapsed .col-right{width:0;opacity:0;overflow:hidden;border-left-color:transparent;}
  /* Narrow layouts already have the browse toggle for this. */
  .card:not(.wide) #sc-events{display:none;}
  #sc-events svg{transition:transform .28s ease;transform:rotate(90deg);}
  .card.events-collapsed #sc-events svg{transform:rotate(-90deg);}
  /* Cap stream height so a full-width section doesn't produce an 800px stream.
     User can override via stream_height config. */
  .card.wide #eng-wrap{max-height:var(--stream-h,55vh);}
  .card.wide .browse-toggle{display:none;}
  .card.wide .browse{display:block!important;}
  /* Narrow grid mode: grid stacks above events; browse is open by default
     but the toggle is visible so the user can collapse it. */

  /* ── feed area ── */
  .feed-area{position:relative;width:100%;}
  #eng-wrap{position:relative;width:100%;aspect-ratio:16/9;background:var(--c-bg-deep);overflow:hidden;}
  #engine{position:absolute;inset:0;touch-action:none;transform-origin:0 0;}
  #engine.zooming{transition:none;}
  #engine:not(.zooming){transition:transform .15s ease-out;}
  #engine ha-camera-stream,#engine ha-hls-player,#engine frigate-go2rtc-player{width:100%;height:100%;display:block;}
  .viewer{position:absolute;inset:0;background:#000;display:flex;align-items:center;justify-content:center;z-index:4;}
  .viewer video,.viewer img.snap{width:100%;height:100%;object-fit:contain;background:#000;}
  .viewer .ld{color:var(--c-text2);font-size:13px;}
  .ph{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:var(--c-text4);background:linear-gradient(145deg,#1a2540,#0d1520);}
  .ph svg{width:40px;height:40px;opacity:.35;}
  .ph-spin{width:24px;height:24px;border:3px solid rgba(255,255,255,.1);border-top-color:var(--c-acc);border-radius:50%;animation:spin .8s linear infinite;}
  @keyframes spin{to{transform:rotate(360deg);}}
  .feed-top{position:absolute;top:10px;left:12px;right:12px;z-index:6;display:flex;align-items:center;gap:8px;}
  .btn{display:inline-flex;align-items:center;gap:5px;background:rgba(15,21,40,.82);border:1px solid rgba(255,255,255,.15);color:#fff;border-radius:8px;padding:6px 11px;font-size:12px;font-weight:600;cursor:pointer;}
  .btn svg{width:14px;height:14px;}

  /* ── stream controls (inline in info-row, consistent in single + grid mode) ── */
  .scb-btn{width:30px;height:30px;display:flex;align-items:center;justify-content:center;background:var(--c-bg-panel);border:1px solid var(--c-border2);color:var(--c-text2);border-radius:8px;cursor:pointer;flex-shrink:0;}
  .scb-btn:hover{background:var(--c-acc-bg);border-color:var(--c-acc-bdr);color:#93c5fd;}
  .scb-btn svg{width:15px;height:15px;}

  /* ── camera grid ── */
  /* Column count comes from --grid-cols, set inline by _mountGrid, so any
     number of cameras works without a rule per count. */
  .cam-grid{display:grid;width:100%;grid-template-columns:repeat(var(--grid-cols,2),1fr);}
  .grid-slot{position:relative;aspect-ratio:16/9;background:var(--c-bg-deep);overflow:hidden;cursor:pointer;transition:box-shadow .15s;}
  .grid-slot:hover{box-shadow:inset 0 0 0 2px rgba(59,130,246,.5);}
  .grid-slot.placeholder{background:#06090f;cursor:default;}
  .grid-slot.placeholder:hover{box-shadow:none;}
  .grid-slot ha-camera-stream,.grid-slot frigate-go2rtc-player{width:100%;height:100%;display:block;}
  .grid-close-btn{position:absolute;top:6px;right:6px;width:22px;height:22px;background:rgba(0,0,0,.75);border:1px solid rgba(255,255,255,.3);color:#fff;border-radius:50%;font-size:11px;cursor:pointer;z-index:10;display:flex;align-items:center;justify-content:center;line-height:1;}
  .grid-close-btn:hover{background:rgba(239,68,68,.7);}
  /* per-slot fullscreen button — appears on hover, bottom-right */
  .grid-fs-btn{position:absolute;bottom:6px;right:6px;width:22px;height:22px;background:rgba(0,0,0,.65);border:1px solid rgba(255,255,255,.25);color:#fff;border-radius:6px;cursor:pointer;z-index:10;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s;}
  .grid-slot:hover .grid-fs-btn{opacity:1;}
  .grid-fs-btn:hover{background:rgba(59,130,246,.5);border-color:rgba(59,130,246,.7);}
  .grid-fs-btn svg{width:11px;height:11px;}
  /* fullscreen animation */
  @keyframes fsIn{from{opacity:.7;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
  /* single-slot fullscreen */
  .grid-slot:fullscreen{width:100vw;height:100vh;aspect-ratio:unset;border-radius:0;background:#000;animation:fsIn .25s cubic-bezier(.22,.8,.22,1);}
  .grid-slot:-webkit-full-screen{width:100vw;height:100vh;aspect-ratio:unset;border-radius:0;background:#000;animation:fsIn .25s cubic-bezier(.22,.8,.22,1);}
  .grid-slot:fullscreen .grid-fs-btn,.grid-slot:-webkit-full-screen .grid-fs-btn{display:none;}
  /* whole-grid fullscreen */
  .cam-grid:fullscreen{width:100vw;height:100vh;max-height:none!important;background:#000;animation:fsIn .25s cubic-bezier(.22,.8,.22,1);}
  .cam-grid:-webkit-full-screen{width:100vw;height:100vh;max-height:none!important;background:#000;animation:fsIn .25s cubic-bezier(.22,.8,.22,1);}
  .cam-grid:fullscreen .grid-slot,.cam-grid:-webkit-full-screen .grid-slot{aspect-ratio:unset;border-radius:0;}
  .cam-grid:fullscreen.multi-row,.cam-grid:-webkit-full-screen.multi-row{grid-template-rows:repeat(var(--grid-rows,2),1fr);}
  .grid-label{position:absolute;bottom:4px;left:6px;font-size:10px;font-weight:600;color:rgba(255,255,255,.85);text-shadow:0 1px 2px rgba(0,0,0,.8);background:rgba(0,0,0,.45);padding:1px 7px;border-radius:10px;pointer-events:none;z-index:2;}
  /* More than one row: cap the height so the whole grid fits the viewport and
     let the tiles share it, rather than each keeping its 16:9 box. */
  .card.grid-mode .cam-grid.multi-row:not(.stacked) { max-height:var(--stream-h,70vh); grid-template-rows:repeat(var(--grid-rows,2),1fr); }
  .card.grid-mode .cam-grid.multi-row:not(.stacked) .grid-slot { aspect-ratio:unset; min-height:0; }
  /* Stacked: tiles keep their 16:9 box and the column simply gets taller.
     Capping the height here would squash every tile, the same mistake as on
     mobile. Honour an explicit stream_height, and scroll past it. */
  .card.grid-mode .cam-grid.stacked { max-height:var(--stream-h,none); overflow-y:auto; }
  /* Single stream: optional height cap */
  #eng-wrap { max-height:var(--stream-h,none); }
  /* Mobile: keep the grid about as tall as its tiles actually need. Each tile
     is one column wide, so 16:9 makes a row 56.25vw/cols tall. A stacked
     (single-column) grid is exempt: capping it squashes every tile to a sliver,
     which is the opposite of what stacking is for, and it is meant to scroll. */
  .card.mobile .cam-grid.multi-row:not(.stacked) {
    max-height:calc(56.25vw * var(--grid-rows,2) / var(--grid-cols,2));
  }
  .card.mobile .cam-grid.multi-row:not(.stacked) .grid-slot { aspect-ratio:unset; min-height:0; }

  /* ── info row ── */
  .info-row{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:10px 16px 8px;border-bottom:1px solid var(--c-border);}
  .stream-ctrl-bar{display:flex;align-items:center;justify-content:center;gap:6px;}
  .info-title{font-size:14px;font-weight:700;color:var(--c-text);} .info-sub{font-size:11px;color:var(--c-text3);margin-top:1px;}
  .stats{display:flex;gap:16px;justify-self:end;} .stat{display:flex;flex-direction:column;align-items:flex-end;}
  .sv{font-size:14px;font-weight:700;color:#93c5fd;} .sl{font-size:10px;color:var(--c-text4);text-transform:uppercase;letter-spacing:.06em;}

  /* ── camera switcher ── */
  .cam-switcher{display:flex;align-items:center;gap:4px;padding:5px 12px;border-bottom:1px solid var(--c-border);background:var(--c-bg-panel);}
  .cam-tabs{display:flex;gap:4px;flex:1;overflow-x:auto;scrollbar-width:none;}
  .cam-tabs::-webkit-scrollbar{display:none;}
  .cam-tab{display:inline-flex;align-items:center;gap:4px;background:var(--c-bg-panel);border:1px solid var(--c-border2);color:var(--c-text2);border-radius:14px;padding:4px 11px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;transition:all .15s;}
  .cam-tab:hover{background:rgba(255,255,255,.09);}
  .cam-tab.active{background:var(--c-acc-bg);border-color:var(--c-acc-bdr);color:#93c5fd;}
  .cam-tab svg{width:12px;height:12px;flex-shrink:0;}
  .cam-dot{font-size:8px;vertical-align:middle;}
  .cam-rotate,.cam-grid-btn{width:28px;height:28px;display:flex;align-items:center;justify-content:center;background:var(--c-bg-panel);border:1px solid var(--c-border2);color:var(--c-text2);border-radius:7px;cursor:pointer;flex-shrink:0;}
  .cam-rotate svg,.cam-grid-btn svg{width:14px;height:14px;}
  .cam-rotate.on{color:var(--c-on);border-color:rgba(74,222,128,.4);background:rgba(74,222,128,.1);}
  .cam-grid-btn:hover{color:#93c5fd;border-color:var(--c-acc-bdr);}

  /* ── latest event ── */
  .latest{border-bottom:1px solid var(--c-border);}
  .latest-label{padding:7px 16px 4px;display:flex;align-items:center;}
  .latest-body{padding:0 12px 9px;}

  /* ── browse toggle ── */
  .browse-toggle{width:100%;display:flex;align-items:center;gap:8px;background:var(--c-bg-panel);border:none;border-bottom:1px solid var(--c-border);color:inherit;padding:10px 16px;cursor:pointer;}
  .chev2{display:inline-flex;transition:transform .15s;color:var(--c-text3);} .chev2 svg{width:14px;height:14px;}

  /* ── tabs ── */
  .tabs{display:flex;gap:5px;padding:8px 12px;border-bottom:1px solid var(--c-border);overflow-x:auto;scrollbar-width:none;}
  .tabs::-webkit-scrollbar{display:none;}
  .pill{display:inline-flex;align-items:center;gap:4px;background:var(--c-bg-panel);border:1px solid var(--c-border2);border-radius:20px;padding:5px 11px 5px 9px;font-size:11px;font-weight:600;color:var(--c-text2);cursor:pointer;white-space:nowrap;flex-shrink:0;}
  .pill svg{width:11px;height:11px;opacity:.75;}
  .pill:hover,.pill.active{background:var(--c-acc-bg);border-color:var(--c-acc-bdr);color:#93c5fd;} .pill.active svg{opacity:1;}
  .pill.icon-only{padding:6px 8px;} .pill.icon-only svg{width:13px;height:13px;opacity:.85;}

  /* ── timeline ── */
  .tl-sec{padding:8px 13px;border-bottom:1px solid var(--c-border);}
  .tl-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;}
  .tl-tools{display:flex;gap:4px;}
  .tool{background:var(--c-bg-panel);border:1px solid var(--c-border2);color:var(--c-text2);border-radius:7px;padding:4px 7px;cursor:pointer;}
  .tool svg{width:13px;height:13px;display:block;} .tool:hover{color:#93c5fd;border-color:var(--c-acc-bdr);}
  .tl-track{position:relative;height:30px;background:var(--c-bg-panel);border-radius:6px;overflow:hidden;cursor:grab;touch-action:pan-y;}
  .tl-track.grab{cursor:grabbing;}
  .tl-track::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent,transparent calc(100%/12 - 1px),rgba(255,255,255,.04) calc(100%/12 - 1px),rgba(255,255,255,.04) calc(100%/12));}
  .t-rec{position:absolute;top:0;height:100%;background:rgba(30,80,200,.5);pointer-events:none;}
  .t-ev{position:absolute;top:50%;transform:translateY(-50%);width:4px;height:18px;border-radius:3px;z-index:1;cursor:pointer;} .t-ev:hover{width:6px;}
  .tl-now{position:absolute;top:0;bottom:0;width:2px;background:#ef4444;pointer-events:none;}
  .tl-labels{display:flex;justify-content:space-between;margin-top:3px;} .tl-labels span{font-size:9px;color:var(--c-text4);}
  .legend{display:flex;gap:10px;flex-wrap:wrap;margin-top:6px;} .lg{font-size:10px;color:var(--c-text3);display:flex;align-items:center;gap:4px;} .lg i{width:7px;height:7px;border-radius:2px;display:inline-block;}

  /* ── filter + cal ── */
  .filter-panel,.cal-panel{background:var(--c-bg-panel);border:1px solid var(--c-border2);border-radius:9px;padding:8px;margin-bottom:7px;}
  .frow{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-bottom:4px;} .frow:last-child{margin-bottom:0;} .frow-l{font-size:10px;color:var(--c-text3);width:38px;text-transform:uppercase;flex-shrink:0;}
  .chip{background:var(--c-bg-panel);border:1px solid var(--c-border2);color:var(--c-text2);border-radius:14px;padding:3px 9px;font-size:11px;cursor:pointer;}
  .chip.on{background:var(--c-acc-bg);border-color:var(--c-acc-bdr);color:#93c5fd;}
  .cal-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;} .cal-head b{font-size:12px;} .cal-head button{background:none;border:none;color:#93c5fd;font-size:17px;cursor:pointer;padding:0 5px;}
  .cal-dow,.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:1px;text-align:center;}
  .cal-dow span{font-size:9px;color:var(--c-text4);padding:2px 0;}
  .cday{position:relative;background:none;border:none;color:var(--c-text);font-size:11px;padding:5px 0;border-radius:6px;cursor:pointer;} .cday:hover{background:var(--c-acc-bg);} .cdot{position:absolute;bottom:2px;left:50%;transform:translateX(-50%);width:3px;height:3px;border-radius:50%;background:#ef4444;}

  /* ── event list ── */
  .list-sec{padding:8px 13px 12px;}
  /* Wide: col-right scrolls the whole events panel, no inner list cap needed */
  .card.wide .list{max-height:none;overflow-y:visible;}
  .list-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
  .newtoast{font-size:10px;font-weight:700;color:var(--c-on);}
  .list{max-height:460px;overflow-y:auto;}
  .empty{text-align:center;padding:16px;color:var(--c-text3);font-size:12px;line-height:1.5;}
  .more,.end{text-align:center;font-size:10px;color:var(--c-text4);padding:6px;}

  .ec{display:flex;gap:9px;align-items:center;padding:8px 10px;background:var(--c-bg-panel);border:1px solid var(--c-border2);border-radius:12px;margin-bottom:5px;cursor:pointer;}
  .ec:hover{background:rgba(255,255,255,.07);border-color:rgba(59,130,246,.25);}
  .ec.compact{padding:6px 9px;}
  .ec.compact .et{width:54px;height:38px;border-radius:7px;}
  .ec.compact .eact .ico{width:24px;height:24px;}
  .ec.compact .eact .ico svg{width:11px;height:11px;}
  .et{width:72px;height:50px;border-radius:8px;overflow:hidden;flex-shrink:0;background:#0d1520;position:relative;}
  .et img{width:100%;height:100%;object-fit:cover;display:block;}
  .tph{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1a2840,#0d1520);color:#2a3d5e;} .tph svg{width:20px;height:20px;}
  .ed{position:absolute;bottom:2px;right:3px;font-size:9px;font-weight:700;color:#fff;background:rgba(0,0,0,.65);border-radius:4px;padding:1px 3px;}
  .ei{flex:1;min-width:0;}
  .etop{display:flex;align-items:center;gap:5px;margin-bottom:3px;flex-wrap:wrap;}
  .tb{font-size:10px;font-weight:700;padding:2px 6px;border-radius:9px;}
  .cam-badge{font-size:9px;color:var(--c-text2);background:var(--c-bg-panel);padding:1px 6px;border-radius:9px;}
  .subl{font-size:10px;font-weight:600;color:#a5b4fc;background:rgba(99,102,241,.16);padding:2px 6px;border-radius:9px;}
  .bc,.bs{font-size:9px;font-weight:700;padding:1px 5px;border-radius:7px;text-transform:uppercase;} .bc{background:rgba(74,222,128,.14);color:#4ade80;} .bs{background:rgba(148,163,184,.16);color:#cbd5e1;}
  .esc{font-size:11px;font-weight:700;color:#4ade80;background:rgba(74,222,128,.12);border-radius:7px;padding:1px 5px;}
  .em{display:flex;gap:8px;flex-wrap:wrap;font-size:10px;color:var(--c-text3);} .em span{display:flex;align-items:center;gap:2px;} .em svg{width:9px;height:9px;}
  .desc{margin-top:4px;font-size:11px;color:var(--c-text2);line-height:1.45;background:var(--c-bg-panel);border-radius:7px;padding:5px 7px;}
  .eact{display:flex;flex-direction:row;align-items:center;gap:4px;flex-shrink:0;}
  .ico{width:26px;height:26px;display:flex;align-items:center;justify-content:center;background:var(--c-bg-panel);border:1px solid var(--c-border2);border-radius:7px;color:var(--c-text2);cursor:pointer;}
  .ico svg{width:13px;height:13px;} .ico:hover{color:#93c5fd;border-color:var(--c-acc-bdr);}
  .ico.fav.on{color:#fbbf24;border-color:rgba(251,191,36,.4);background:rgba(251,191,36,.12);}

  /* ── recordings ── */
  .rec{display:flex;align-items:center;gap:9px;padding:8px 10px;background:var(--c-bg-panel);border:1px solid var(--c-border2);border-radius:11px;margin-bottom:5px;cursor:pointer;}
  .rec:hover{background:rgba(255,255,255,.07);}
  .ric{width:30px;height:30px;border-radius:7px;background:rgba(30,80,200,.25);color:#93c5fd;display:flex;align-items:center;justify-content:center;} .ric svg{width:14px;height:14px;}
  .rinf{flex:1;} .rt{font-size:12px;font-weight:600;color:var(--c-text);} .rsub{font-size:10px;color:var(--c-text3);margin-top:1px;} .rp{color:var(--c-on);}

  /* ── recording seek ── */
  .rec-seek-wrap{margin-top:7px;}
  .rec-seek-row{display:flex;align-items:center;gap:8px;}
  .rec-seek-bar{flex:1;height:4px;accent-color:var(--c-acc);cursor:pointer;}
  .rec-seek-lbl{font-size:10px;color:#93c5fd;white-space:nowrap;min-width:90px;}
  .seek-hint{color:var(--c-text4);font-size:9px;}
  .seek-from-lbl{position:absolute;top:8px;left:50%;transform:translateX(-50%);background:rgba(15,21,40,.88);border:1px solid var(--c-acc-bdr);color:#93c5fd;font-size:11px;font-weight:600;padding:4px 12px;border-radius:20px;white-space:nowrap;z-index:10;pointer-events:none;}

  /* ── reviews ── */
  .rev-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:7px;font-size:11px;color:var(--c-text2);}
  .rev{display:flex;align-items:center;gap:9px;padding:8px 10px;background:var(--c-bg-panel);border:1px solid var(--c-border2);border-radius:11px;margin-bottom:5px;cursor:pointer;}
  .rev[data-review-open]:hover{background:rgba(255,255,255,.07);border-color:rgba(59,130,246,.25);}
  .rev-sev{width:4px;align-self:stretch;border-radius:3px;} .rev-sev.alert{background:#ef4444;} .rev-sev.detection{background:#f59e0b;}
  .rev-inf{flex:1;} .rev-t{font-size:12px;font-weight:600;color:var(--c-text);} .rev-m{font-size:10px;color:var(--c-text3);margin-top:1px;}
  .rev-th{width:56px;height:40px;border-radius:7px;overflow:hidden;flex-shrink:0;background:#0d1520;} .rev-th img{width:100%;height:100%;object-fit:cover;display:block;}

  /* ── toast ── */
  .toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99;background:rgba(15,21,40,.96);border:1px solid rgba(239,68,68,.4);color:#fca5a5;padding:8px 14px;border-radius:9px;font-size:12px;box-shadow:0 8px 24px rgba(0,0,0,.5);max-width:90%;}
  .diag{font-size:10px;color:#fca5a5;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:7px;padding:6px 8px;margin-bottom:7px;}

  /* ── recording viewer bottom overlay (controls + download) ── */
  .rec-dl-bar{position:absolute;bottom:0;left:0;right:0;display:flex;flex-direction:column;gap:5px;padding:8px 12px 6px;background:linear-gradient(transparent,rgba(0,0,0,.87));z-index:5;pointer-events:none;}
  .rec-dl-bar>*{pointer-events:all;}
  /* playback control row */
  .rec-ctl-row{display:flex;align-items:center;gap:8px;}
  .rec-pp-btn{background:rgba(255,255,255,.18);border:none;color:#fff;width:26px;height:26px;border-radius:50%;cursor:pointer;font-size:13px;line-height:1;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
  .rec-pp-btn:hover{background:rgba(255,255,255,.32);}
  .rec-ctl-time{font-size:11px;color:rgba(255,255,255,.9);white-space:nowrap;min-width:78px;text-align:center;}
  .rec-prog{flex:1;height:3px;accent-color:#3b82f6;cursor:pointer;background:rgba(255,255,255,.2);border-radius:2px;}
  /* download row */
  .rec-dl-row{display:flex;align-items:center;gap:8px;}
  .rec-dl-row span{flex:1;font-size:11px;color:rgba(255,255,255,.8);}
  .rec-dl-time{color:#93c5fd;font-weight:600;}
  .rec-dl-btn{padding:4px 11px;background:rgba(59,130,246,.45);border:1px solid rgba(59,130,246,.7);color:#fff;border-radius:7px;font-size:11px;font-weight:600;cursor:pointer;}
  .rec-dl-btn:hover{background:rgba(59,130,246,.75);}

  /* ── stream control active state (zone toggle when on) ── */
  .scb-btn.active{background:var(--c-acc-bg)!important;border-color:var(--c-acc-bdr)!important;color:var(--c-acc)!important;}
`;

// ── editor ───────────────────────────────────────────────────

// go2rtc-player.js — vendored, unmodified go2rtc example player.
// Source: https://github.com/AlexxIT/go2rtc/blob/master/www/video-rtc.js
// Copyright (c) Alexey Khit — MIT License: https://github.com/AlexxIT/go2rtc/blob/master/LICENSE
// Kept verbatim (aside from stripping the `export` keyword for bundling) so
// upstream fixes/updates can be dropped in without re-deriving anything.

/**
 * VideoRTC v1.6.0 - Video player for go2rtc streaming application.
 *
 * All modern web technologies are supported in almost any browser except Apple Safari.
 *
 * Support:
 * - ECMAScript 2017 (ES8) = ES6 + async
 * - RTCPeerConnection for Safari iOS 11.0+
 * - IntersectionObserver for Safari iOS 12.2+
 * - ManagedMediaSource for Safari 17+
 *
 * Doesn't support:
 * - MediaSource for Safari iOS
 * - Customized built-in elements (extends HTMLVideoElement) because Safari
 * - Autoplay for WebRTC in Safari
 */
class VideoRTC extends HTMLElement {
    constructor() {
        super();

        this.DISCONNECT_TIMEOUT = 5000;
        this.RECONNECT_TIMEOUT = 15000;

        this.CODECS = [
            'avc1.640029',      // H.264 high 4.1 (Chromecast 1st and 2nd Gen)
            'avc1.64002A',      // H.264 high 4.2 (Chromecast 3rd Gen)
            'avc1.640033',      // H.264 high 5.1 (Chromecast with Google TV)
            'hvc1.1.6.L153.B0', // H.265 main 5.1 (Chromecast Ultra)
            'mp4a.40.2',        // AAC LC
            'mp4a.40.5',        // AAC HE
            'flac',             // FLAC (PCM compatible)
            'opus',             // OPUS Chrome, Firefox
        ];

        /**
         * [config] Supported modes (webrtc, webrtc/tcp, mse, hls, mp4, mjpeg).
         * @type {string}
         */
        this.mode = 'webrtc,mse,hls,mjpeg';

        /**
         * [Config] Requested medias (video, audio, microphone).
         * @type {string}
         */
        this.media = 'video,audio';

        /**
         * [config] Run stream when not displayed on the screen. Default `false`.
         * @type {boolean}
         */
        this.background = false;

        /**
         * [config] Run stream only when player in the viewport. Stop when user scroll out player.
         * Value is percentage of visibility from `0` (not visible) to `1` (full visible).
         * Default `0` - disable;
         * @type {number}
         */
        this.visibilityThreshold = 0;

        /**
         * [config] Run stream only when browser page on the screen. Stop when user change browser
         * tab or minimise browser windows.
         * @type {boolean}
         */
        this.visibilityCheck = true;

        /**
         * [config] WebRTC configuration
         * @type {RTCConfiguration}
         */
        this.pcConfig = {
            bundlePolicy: 'max-bundle',
            iceServers: [{urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302']}],
            sdpSemantics: 'unified-plan',  // important for Chromecast 1
        };

        /**
         * [info] WebSocket connection state. Values: CONNECTING, OPEN, CLOSED
         * @type {number}
         */
        this.wsState = WebSocket.CLOSED;

        /**
         * [info] WebRTC connection state.
         * @type {number}
         */
        this.pcState = WebSocket.CLOSED;

        /**
         * @type {HTMLVideoElement}
         */
        this.video = null;

        /**
         * @type {WebSocket}
         */
        this.ws = null;

        /**
         * @type {string|URL}
         */
        this.wsURL = '';

        /**
         * @type {RTCPeerConnection}
         */
        this.pc = null;

        /**
         * @type {number}
         */
        this.connectTS = 0;

        /**
         * @type {string}
         */
        this.mseCodecs = '';

        /**
         * [internal] Disconnect TimeoutID.
         * @type {number}
         */
        this.disconnectTID = 0;

        /**
         * [internal] Reconnect TimeoutID.
         * @type {number}
         */
        this.reconnectTID = 0;

        /**
         * [internal] Handler for receiving Binary from WebSocket.
         * @type {Function}
         */
        this.ondata = null;

        /**
         * [internal] Handlers list for receiving JSON from WebSocket.
         * @type {Object.<string,Function>}
         */
        this.onmessage = null;
    }

    /**
     * Set video source (WebSocket URL). Support relative path.
     * @param {string|URL} value
     */
    set src(value) {
        if (typeof value !== 'string') value = value.toString();
        if (value.startsWith('http')) {
            value = 'ws' + value.substring(4);
        } else if (value.startsWith('/')) {
            value = 'ws' + location.origin.substring(4) + value;
        }

        this.wsURL = value;

        this.onconnect();
    }

    /**
     * Play video. Support automute when autoplay blocked.
     * https://developer.chrome.com/blog/autoplay/
     */
    play() {
        this.video.play().catch(() => {
            if (!this.video.muted) {
                this.video.muted = true;
                this.video.play().catch(er => {
                    console.warn(er);
                });
            }
        });
    }

    /**
     * Send message to server via WebSocket
     * @param {Object} value
     */
    send(value) {
        if (this.ws) this.ws.send(JSON.stringify(value));
    }

    /** @param {Function} isSupported */
    codecs(isSupported) {
        return this.CODECS
            .filter(codec => this.media.includes(codec.includes('vc1') ? 'video' : 'audio'))
            .filter(codec => isSupported(`video/mp4; codecs="${codec}"`)).join();
    }

    /**
     * `CustomElement`. Invoked each time the custom element is appended into a
     * document-connected element.
     */
    connectedCallback() {
        if (this.disconnectTID) {
            clearTimeout(this.disconnectTID);
            this.disconnectTID = 0;
        }

        // because video autopause on disconnected from DOM
        if (this.video) {
            const seek = this.video.seekable;
            if (seek.length > 0) {
                this.video.currentTime = seek.end(seek.length - 1);
            }
            this.play();
        } else {
            this.oninit();
        }

        this.onconnect();
    }

    /**
     * `CustomElement`. Invoked each time the custom element is disconnected from the
     * document's DOM.
     */
    disconnectedCallback() {
        if (this.background || this.disconnectTID) return;
        if (this.wsState === WebSocket.CLOSED && this.pcState === WebSocket.CLOSED) return;

        this.disconnectTID = setTimeout(() => {
            if (this.reconnectTID) {
                clearTimeout(this.reconnectTID);
                this.reconnectTID = 0;
            }

            this.disconnectTID = 0;

            this.ondisconnect();
        }, this.DISCONNECT_TIMEOUT);
    }

    /**
     * Creates child DOM elements. Called automatically once on `connectedCallback`.
     */
    oninit() {
        this.video = document.createElement('video');
        this.video.controls = true;
        this.video.playsInline = true;
        this.video.preload = 'auto';

        this.video.style.display = 'block'; // fix bottom margin 4px
        this.video.style.width = '100%';
        this.video.style.height = '100%';

        this.appendChild(this.video);

        this.video.addEventListener('error', ev => {
            const err = this.video.error;
            // https://developer.mozilla.org/en-US/docs/Web/API/MediaError/code
            const MEDIA_ERRORS = {
                1: 'MEDIA_ERR_ABORTED',
                2: 'MEDIA_ERR_NETWORK',
                3: 'MEDIA_ERR_DECODE',
                4: 'MEDIA_ERR_SRC_NOT_SUPPORTED'
            };
            console.error('[VideoRTC] Video error:', {
                error: err ? MEDIA_ERRORS[err.code] : 'unknown',
                message: err ? err.message : 'unknown',
                codecs: this.mseCodecs || 'not set',
                readyState: this.video.readyState,
                networkState: this.video.networkState,
                currentTime: this.video.currentTime
            });
            if (this.ws) this.ws.close(); // run reconnect for broken MSE stream
        });

        // all Safari lies about supported audio codecs
        const m = window.navigator.userAgent.match(/Version\/(\d+).+Safari/);
        if (m) {
            // AAC from v13, FLAC from v14, OPUS - unsupported
            const skip = m[1] < '13' ? 'mp4a.40.2' : m[1] < '14' ? 'flac' : 'opus';
            this.CODECS.splice(this.CODECS.indexOf(skip));
        }

        if (this.background) return;

        if ('hidden' in document && this.visibilityCheck) {
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.disconnectedCallback();
                } else if (this.isConnected) {
                    this.connectedCallback();
                }
            });
        }

        if ('IntersectionObserver' in window && this.visibilityThreshold) {
            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) {
                        this.disconnectedCallback();
                    } else if (this.isConnected) {
                        this.connectedCallback();
                    }
                });
            }, {threshold: this.visibilityThreshold});
            observer.observe(this);
        }
    }

    /**
     * Connect to WebSocket. Called automatically on `connectedCallback`.
     * @return {boolean} true if the connection has started.
     */
    onconnect() {
        if (!this.isConnected || !this.wsURL || this.ws || this.pc) return false;

        // CLOSED or CONNECTING => CONNECTING
        this.wsState = WebSocket.CONNECTING;

        this.connectTS = Date.now();

        this.ws = new WebSocket(this.wsURL);
        this.ws.binaryType = 'arraybuffer';
        this.ws.addEventListener('open', () => this.onopen());
        this.ws.addEventListener('close', () => this.onclose());

        return true;
    }

    ondisconnect() {
        this.wsState = WebSocket.CLOSED;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.pcState = WebSocket.CLOSED;
        if (this.pc) {
            this.pc.getSenders().forEach(sender => {
                if (sender.track) sender.track.stop();
            });
            this.pc.close();
            this.pc = null;
        }

        this.video.src = '';
        this.video.srcObject = null;
    }

    /**
     * @returns {Array.<string>} of modes (mse, webrtc, etc.)
     */
    onopen() {
        // CONNECTING => OPEN
        this.wsState = WebSocket.OPEN;

        this.ws.addEventListener('message', ev => {
            if (typeof ev.data === 'string') {
                const msg = JSON.parse(ev.data);
                for (const mode in this.onmessage) {
                    this.onmessage[mode](msg);
                }
            } else {
                this.ondata(ev.data);
            }
        });

        this.ondata = null;
        this.onmessage = {};

        const modes = [];

        if (this.mode.includes('mse') && ('MediaSource' in window || 'ManagedMediaSource' in window)) {
            modes.push('mse');
            this.onmse();
        } else if (this.mode.includes('hls') && this.video.canPlayType('application/vnd.apple.mpegurl')) {
            modes.push('hls');
            this.onhls();
        } else if (this.mode.includes('mp4')) {
            modes.push('mp4');
            this.onmp4();
        }

        if (this.mode.includes('webrtc') && 'RTCPeerConnection' in window) {
            modes.push('webrtc');
            this.onwebrtc();
        }

        if (this.mode.includes('mjpeg')) {
            if (modes.length) {
                this.onmessage['mjpeg'] = msg => {
                    if (msg.type !== 'error' || msg.value.indexOf(modes[0]) !== 0) return;
                    this.onmjpeg();
                };
            } else {
                modes.push('mjpeg');
                this.onmjpeg();
            }
        }

        return modes;
    }

    /**
     * @return {boolean} true if reconnection has started.
     */
    onclose() {
        if (this.wsState === WebSocket.CLOSED) return false;

        // CONNECTING, OPEN => CONNECTING
        this.wsState = WebSocket.CONNECTING;
        this.ws = null;

        // reconnect no more than once every X seconds
        const delay = Math.max(this.RECONNECT_TIMEOUT - (Date.now() - this.connectTS), 0);

        this.reconnectTID = setTimeout(() => {
            this.reconnectTID = 0;
            this.onconnect();
        }, delay);

        return true;
    }

    onmse() {
        /** @type {MediaSource} */
        let ms;

        if ('ManagedMediaSource' in window) {
            const MediaSource = window.ManagedMediaSource;

            ms = new MediaSource();
            ms.addEventListener('sourceopen', () => {
                this.send({type: 'mse', value: this.codecs(MediaSource.isTypeSupported)});
            }, {once: true});

            this.video.disableRemotePlayback = true;
            this.video.srcObject = ms;
        } else {
            ms = new MediaSource();
            ms.addEventListener('sourceopen', () => {
                URL.revokeObjectURL(this.video.src);
                this.send({type: 'mse', value: this.codecs(MediaSource.isTypeSupported)});
            }, {once: true});

            this.video.src = URL.createObjectURL(ms);
            this.video.srcObject = null;
        }

        this.play();

        this.mseCodecs = '';

        this.onmessage['mse'] = msg => {
            if (msg.type !== 'mse') return;

            this.mseCodecs = msg.value;

            const sb = ms.addSourceBuffer(msg.value);
            sb.mode = 'segments'; // segments or sequence
            sb.addEventListener('updateend', () => {
                if (!sb.updating && bufLen > 0) {
                    try {
                        const data = buf.slice(0, bufLen);
                        sb.appendBuffer(data);
                        bufLen = 0;
                    } catch (e) {
                        // console.debug(e);
                    }
                }

                if (!sb.updating && sb.buffered && sb.buffered.length) {
                    const end = sb.buffered.end(sb.buffered.length - 1);
                    const start = end - 5;
                    const start0 = sb.buffered.start(0);
                    if (start > start0) {
                        sb.remove(start0, start);
                        ms.setLiveSeekableRange(start, end);
                    }
                    if (this.video.currentTime < start) {
                        this.video.currentTime = start;
                    }
                    const gap = end - this.video.currentTime;
                    this.video.playbackRate = gap > 0.1 ? gap : 0.1;
                    // console.debug('VideoRTC.buffered', gap, this.video.playbackRate, this.video.readyState);
                }
            });

            const buf = new Uint8Array(2 * 1024 * 1024);
            let bufLen = 0;

            this.ondata = data => {
                if (sb.updating || bufLen > 0) {
                    const b = new Uint8Array(data);
                    buf.set(b, bufLen);
                    bufLen += b.byteLength;
                    // console.debug('VideoRTC.buffer', b.byteLength, bufLen);
                } else {
                    try {
                        sb.appendBuffer(data);
                    } catch (e) {
                        // console.debug(e);
                    }
                }
            };
        };
    }

    onwebrtc() {
        const pc = new RTCPeerConnection(this.pcConfig);

        pc.addEventListener('icecandidate', ev => {
            if (ev.candidate && this.mode.includes('webrtc/tcp') && ev.candidate.protocol === 'udp') return;

            const candidate = ev.candidate ? ev.candidate.toJSON().candidate : '';
            this.send({type: 'webrtc/candidate', value: candidate});
        });

        pc.addEventListener('connectionstatechange', () => {
            if (pc.connectionState === 'connected') {
                const tracks = pc.getTransceivers()
                    .filter(tr => tr.currentDirection === 'recvonly') // skip inactive
                    .map(tr => tr.receiver.track);
                /** @type {HTMLVideoElement} */
                const video2 = document.createElement('video');
                video2.addEventListener('loadeddata', () => this.onpcvideo(video2), {once: true});
                video2.srcObject = new MediaStream(tracks);
            } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                pc.close(); // stop next events

                this.pcState = WebSocket.CLOSED;
                this.pc = null;

                this.onconnect();
            }
        });

        this.onmessage['webrtc'] = msg => {
            switch (msg.type) {
                case 'webrtc/candidate':
                    if (this.mode.includes('webrtc/tcp') && msg.value.includes(' udp ')) return;

                    pc.addIceCandidate({candidate: msg.value, sdpMid: '0'}).catch(er => {
                        console.warn(er);
                    });
                    break;
                case 'webrtc/answer':
                    pc.setRemoteDescription({type: 'answer', sdp: msg.value}).catch(er => {
                        console.warn(er);
                    });
                    break;
                case 'error':
                    if (!msg.value.includes('webrtc/offer')) return;
                    pc.close();
            }
        };

        this.createOffer(pc).then(offer => {
            this.send({type: 'webrtc/offer', value: offer.sdp});
        });

        this.pcState = WebSocket.CONNECTING;
        this.pc = pc;
    }

    /**
     * @param pc {RTCPeerConnection}
     * @return {Promise<RTCSessionDescriptionInit>}
     */
    async createOffer(pc) {
        try {
            if (this.media.includes('microphone')) {
                const media = await navigator.mediaDevices.getUserMedia({audio: true});
                media.getTracks().forEach(track => {
                    pc.addTransceiver(track, {direction: 'sendonly'});
                });
            }
        } catch (e) {
            console.warn(e);
        }

        for (const kind of ['video', 'audio']) {
            if (this.media.includes(kind)) {
                pc.addTransceiver(kind, {direction: 'recvonly'});
            }
        }

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        return offer;
    }

    /**
     * @param video2 {HTMLVideoElement}
     */
    onpcvideo(video2) {
        if (this.pc) {
            // Video+Audio > Video, H265 > H264, Video > Audio, WebRTC > MSE
            let rtcPriority = 0, msePriority = 0;

            /** @type {MediaStream} */
            const stream = video2.srcObject;
            if (stream.getVideoTracks().length > 0) {
                // not the best, but a pretty simple way to check a codec
                const isH265Supported =  this.pc.remoteDescription.sdp.includes('H265/90000');
                rtcPriority += isH265Supported ? 0x240 : 0x220;
            }
            if (stream.getAudioTracks().length > 0) rtcPriority += 0x102;

            if (this.mseCodecs.includes('hvc1.')) msePriority += 0x230;
            if (this.mseCodecs.includes('avc1.')) msePriority += 0x210;
            if (this.mseCodecs.includes('mp4a.')) msePriority += 0x101;

            if (rtcPriority >= msePriority) {
                this.video.srcObject = stream;
                this.play();

                this.pcState = WebSocket.OPEN;

                this.wsState = WebSocket.CLOSED;
                if (this.ws) {
                    this.ws.close();
                    this.ws = null;
                }
            } else {
                this.pcState = WebSocket.CLOSED;
                if (this.pc) {
                    this.pc.close();
                    this.pc = null;
                }
            }
        }

        video2.srcObject = null;
    }

    onmjpeg() {
        this.ondata = data => {
            this.video.controls = false;
            this.video.poster = 'data:image/jpeg;base64,' + VideoRTC.btoa(data);
        };

        this.send({type: 'mjpeg'});
    }

    onhls() {
        this.onmessage['hls'] = msg => {
            if (msg.type !== 'hls') return;

            const url = 'http' + this.wsURL.substring(2, this.wsURL.indexOf('/ws')) + '/hls/';
            const playlist = msg.value.replace('hls/', url);
            this.video.src = 'data:application/vnd.apple.mpegurl;base64,' + btoa(playlist);
            this.play();
        };

        this.send({type: 'hls', value: this.codecs(type => this.video.canPlayType(type))});
    }

    onmp4() {
        /** @type {HTMLCanvasElement} **/
        const canvas = document.createElement('canvas');
        /** @type {CanvasRenderingContext2D} */
        let context;

        /** @type {HTMLVideoElement} */
        const video2 = document.createElement('video');
        video2.autoplay = true;
        video2.playsInline = true;
        video2.muted = true;

        video2.addEventListener('loadeddata', () => {
            if (!context) {
                canvas.width = video2.videoWidth;
                canvas.height = video2.videoHeight;
                context = canvas.getContext('2d');
            }

            context.drawImage(video2, 0, 0, canvas.width, canvas.height);

            this.video.controls = false;
            this.video.poster = canvas.toDataURL('image/jpeg');
        });

        this.ondata = data => {
            video2.src = 'data:video/mp4;base64,' + VideoRTC.btoa(data);
        };

        this.send({type: 'mp4', value: this.codecs(this.video.canPlayType)});
    }

    static btoa(buffer) {
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        let binary = '';
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }
}

if (!customElements.get('frigate-go2rtc-player')) customElements.define('frigate-go2rtc-player', VideoRTC);

// card.js — main FrigateModernHassCard custom element

class FrigateModernHassCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode:'open' });
    this._hass = null; this._config = null; this._started = false;
    this._activeCamIdx = 0;
    this._camCache = {};     // entity → mkCamState()
    this._viewMode = 'single';   // 'single' | 'grid'
    this._eventsMode = 'camera'; // 'camera' | 'all'
    // active display data
    this._events = []; this._recordings = []; this._reviews = []; this._kept = [];
    // UI
    this._tab = 'live'; this._playing = null;
    this._browseOpen = false;
    this._eventsCollapsed = false; // wide layout only; narrow uses the browse toggle
    this._winEnd = 0; this._winStart = 0;
    this._loading = false; this._exhausted = false;
    this._daysWithActivity = new Set();
    this._filterLabel = 'all'; this._filterZone = 'all'; this._favOnly = false;
    this._calMonth = null;
    this._engine = null; this._unsub = null;
    this._rotateTimer = null; this._cardWidth = 0;
    this._playSeq = 0;
    this._streamMuted = true; // initial live-view mute state; never changed after mount (see _mountEngine)
    this._showReviewed = false; // reviews: hide reviewed by default
    this._domCache = {}; // querySelector result cache — cleared on re-render
  }

  static getConfigElement() { return document.createElement(CARD_TAG+'-editor'); }
  static getStubConfig() { return { camera_entity:'camera.front_door' }; }

  setConfig(config) {
    let cameras;
    if (config.cameras && Array.isArray(config.cameras) && config.cameras.length)
      cameras = config.cameras.map(c => ({ entity:c.entity, name:c.name||null }));
    else if (config.camera_entity)
      cameras = [{ entity:config.camera_entity, name:config.title||null }];
    else throw new Error('camera_entity or cameras[] required');

    this._config = {
      cameras,
      title: config.title || null,
      subtitle: config.subtitle || null,
      window_hours: config.window_hours || 24,
      refresh_seconds: Math.max(15, config.refresh_seconds || 45),
      browse_expanded: config.browse_expanded === true,
      rotate_seconds: config.rotate_seconds ?? 0,
      rotate_on_load: config.rotate_on_load === true,
      default_view: config.default_view === 'grid' ? 'grid' : 'single',
      hidden_tabs: Array.isArray(config.hidden_tabs) ? config.hidden_tabs : [],
      stream_height: config.stream_height ? Number(config.stream_height) : null,
      theme: ['light','dark','auto'].includes(config.theme) ? config.theme : 'dark',
      accent_color: config.accent_color || null,
      bg_color: config.bg_color || null,
      // Live view source. 'go2rtc' streams via Frigate's built-in go2rtc
      // (WebRTC/MSE) for much lower latency; it falls back to the standard
      // Home Assistant stream if it can't connect.
      // Start with the events panel slid away, for a camera-first dashboard.
      events_collapsed: config.events_collapsed === true,
      // Grid columns: 'auto' works one out from the camera count, or pin a
      // number. 1 stacks the cameras vertically.
      grid_columns: (config.grid_columns === undefined || config.grid_columns === 'auto')
        ? 'auto' : Math.max(1, Math.min(6, Number(config.grid_columns) || 1)),
      live_provider: config.live_provider === 'go2rtc' ? 'go2rtc' : 'hls',
      // Which go2rtc transport to use. Defaults to 'mse': WebRTC media does not
      // travel through Home Assistant's proxy — it connects straight to
      // go2rtc's own port, which generally only resolves on the local network,
      // so remotely and in the companion apps it just hangs in CONNECTING
      // forever while MSE quietly carries the stream anyway. 'webrtc' is there
      // for local setups that want the lowest possible latency; 'auto' leaves
      // the choice to the player (it tries WebRTC first).
      go2rtc_mode: ['auto','webrtc','mse'].includes(config.go2rtc_mode) ? config.go2rtc_mode : 'mse',
    };
    this._browseOpen = this._config.browse_expanded;
    this._eventsCollapsed = this._config.events_collapsed;
    for (const c of cameras) { if (!this._camCache[c.entity]) this._camCache[c.entity] = mkCamState(); }
    this._renderShell();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    if (!this._started) { this._started = true; this._start(); return; }
    // keep active stream in sync
    if (this._engine) {
      try { this._engine.hass = hass; } catch(_) {}
      // Only update stateObj when entity state actually changes (e.g. offline→online).
      // Resetting stateObj on every hass update restarts the stream and resets muted state.
      const ent = this._activeCam?.entity;
      const newState = hass.states[ent]?.state;
      if (ent && newState !== this._lastEngineState) {
        this._lastEngineState = newState;
        if ('stateObj' in this._engine) {
          try { this._engine.stateObj = this._hlsStateObj(ent); } catch(_) {}
        }
      }
    }
    this._syncStatus();
    if (this._config.theme === 'auto') this._applyCardStyle(); // re-evaluate HA dark mode
  }

  get _activeCam() { return this._config?.cameras[this._activeCamIdx] || this._config?.cameras[0]; }
  getCardSize() { return 10; }
  // HA Sections grid: default to 2 columns × 3 rows so the card is a sensible size.
  // Users can override in their dashboard yaml via grid_options.
  getGridSize() { return { columns: 2, rows: 3 }; }

  disconnectedCallback() {
    this._stopRotate();
    if (this._refresh) clearInterval(this._refresh);
    if (this._unsub) { try { this._unsub.then(u=>u&&u()); } catch(_) {} this._unsub=null; }
    if (this._ro) this._ro.disconnect();
    this._revokeClipBlob();
    this._teardownGo2rtc();
    this._teardownGridGo2rtc();
  }

  // ── init ─────────────────────────────────────────────────
  async _start() {
    // Before any awaits: the layout classes decide the stream's size, and
    // without them the card renders 16:9 across its full width — briefly
    // enormous on a wide dashboard.
    this._setupResizeObserver();
    await this._discoverAll();
    const now = Math.floor(Date.now()/1000);
    this._winEnd = now; this._winStart = now - this._config.window_hours*3600;
    if (this._config.default_view === 'grid' && this._config.cameras.length > 1) {
      this._setViewMode('grid');
    }
    await this._mountEngine();
    await this._loadWindow(true);
    this._loadCalendar();
    this._subscribe();
    this._refresh = setInterval(() => { if (this._isNowWindow()) this._loadWindow(true); }, this._config.refresh_seconds*1000);
    const shouldRotate = this._config.rotate_on_load || this._config.rotate_seconds > 0;
    if (shouldRotate && this._config.cameras.length > 1) this._startRotate();
  }

  // Discover all cameras in parallel for faster startup
  async _discoverAll() { await Promise.all(this._config.cameras.map(c => this._discoverOne(c.entity))); }
  async _discoverOne(entity) {
    const cache = this._camCache[entity] || mkCamState();
    if (cache.discovered) return;
    const ent = this._hass.states[entity]; if (!ent) return;
    cache.clientId = ent.attributes?.client_id || ent.attributes?.mqtt_client_id || 'frigate';
    cache.cam = ent.attributes?.camera_name || entity.replace(/^camera\./,'');
    cache.discovered = true;
    this._camCache[entity] = cache;
  }

  // ── stream (HLS, no WebRTC) ───────────────────────────────
  // Strip frontend_stream_type so ha-camera-stream uses HLS, not WebRTC
  _hlsStateObj(entity) {
    const raw = this._hass.states[entity]; if (!raw) return null;
    const attrs = { ...raw.attributes };
    delete attrs.frontend_stream_type;
    return { ...raw, attributes: attrs };
  }

  async _mountEngine() {
    const slot = this.shadowRoot.querySelector('#engine'); if (!slot) return;
    const entity = this._activeCam?.entity; if (!entity) return;
    const spinner = '<div class="ph"><div class="ph-spin"></div></div>';
    slot.innerHTML = spinner;
    this._engine = null;
    this._teardownGo2rtc();
    this._engineSeq = (this._engineSeq || 0) + 1;
    const token = this._engineSeq;
    const stateObj = this._hlsStateObj(entity);
    if (!stateObj) return;

    if (this._config.live_provider === 'go2rtc') {
      const ok = await this._mountGo2rtc(slot, token);
      if (ok || this._engineSeq !== token) return;
      slot.innerHTML = spinner; // go2rtc didn't start — fall through to HLS
    }
    this._mountHaPlayer(slot, entity, stateObj);
  }

  // Live view via Frigate's built-in go2rtc (WebRTC/MSE): far lower latency
  // than HLS, and lighter on the browser. Reached through the Frigate
  // integration's own proxy, so no separate go2rtc URL or port is needed and
  // it works through HA auth — including the companion apps.
  //
  // Frigate deprecated the /mse/ proxy path in favour of /go2rtc/ws/ (the MSE
  // *protocol* is unaffected — it's the route that changed). The new path
  // needs Frigate integration v5.12.0+, so try it first and fall back to the
  // old one for older installs rather than making users work out which of the
  // two their setup supports. On Frigate 0.18+ both resolve to the same
  // upstream anyway.
  // Returns true when go2rtc is playing (or was superseded), false to fall back to HLS.
  async _mountGo2rtc(slot, token) {
    const { clientId, cam } = this._cc();
    if (!clientId || !cam) return false;
    const paths = this._go2rtcPaths(clientId, cam);
    for (const path of paths) {
      const { ok, routeWorks } = await this._tryGo2rtcPath(slot, token, path);
      if (this._engineSeq !== token) return true; // superseded, nothing to do
      if (ok) { this._go2rtcPath = path; return true; } // remember what worked
      // The socket opened but the stream never played: this proxy route is
      // fine, so the other one won't help. Go straight to the HLS fallback.
      if (routeWorks) return false;
    }
    return false;
  }
  async _tryGo2rtcPath(slot, token, path) {
    const src = await this._signed(path);
    if (this._engineSeq !== token) return { ok: false, routeWorks: false };

    const player = document.createElement('frigate-go2rtc-player');
    player.style.cssText = 'width:100%;height:100%;display:block';
    slot.innerHTML = ''; slot.appendChild(player); // creates its <video> synchronously
    // Upstream's player starts unmuted and only mutes if autoplay is refused;
    // mute before connecting so the live view is never unexpectedly audible.
    if (player.video) {
      player.video.muted = true;
      player.video.style.objectFit = 'contain';
    }
    // WebRTC media does not travel through HA's proxy — it goes straight to
    // go2rtc's own port, which typically only resolves on the local network.
    // 'mse' keeps everything on the (proxied) WebSocket instead.
    this._applyGo2rtcMode(player);
    player.src = src;
    this._go2rtcPlayer = player;
    this._engine = player;
    this._renderStreamCtrl();

    // Two separate questions, and conflating them was a bug: does this proxy
    // route exist (did the socket open?), and does the stream actually play?
    // A blind timeout tore down connections that were merely slow to start —
    // cameras that take a while to come up never got the chance, and go2rtc's
    // own reconnect logic never got to run either.
    const SOCKET_MS = 4000;   // route unusable if the socket never opens
    const PLAY_MS = 15000;    // generous: cold cameras can take a while
    const result = await new Promise(resolve => {
      let done = false;
      const finish = r => { if (!done) { done = true; clearInterval(poll); resolve(r); } };
      const onPlaying = () => finish({ ok: true, routeWorks: true });
      player.video?.addEventListener('playing', onPlaying, { once: true });
      player.video?.addEventListener('loadeddata', onPlaying, { once: true });
      const started = Date.now();
      const poll = setInterval(() => {
        const elapsed = Date.now() - started;
        const socketOpen = player.wsState === WebSocket.OPEN || player.pcState === WebSocket.OPEN;
        if (!socketOpen && elapsed > SOCKET_MS) finish({ ok: false, routeWorks: false });
        else if (elapsed > PLAY_MS) finish({ ok: false, routeWorks: true });
      }, 250);
    });
    if (this._engineSeq !== token) return { ok: false, routeWorks: true };
    if (result.ok) { this._startGo2rtcWatchdog(player, () => this._mountEngine()); return result; }
    this._teardownGo2rtc();
    return result;
  }
  // Candidate proxy paths, newest first. Once one has worked we keep using it,
  // so the grid doesn't have to rediscover it per camera.
  _go2rtcPaths(clientId, cam) {
    const query = `?src=${encodeURIComponent(cam)}`;
    const build = kind => kind === 'new'
      ? `/api/frigate/${clientId}/go2rtc/ws/api/ws${query}`
      : `/api/frigate/${clientId}/mse/api/ws${query}`;
    const known = this._go2rtcPath?.includes('/go2rtc/ws/') ? 'new'
                : this._go2rtcPath ? 'old' : null;
    return known ? [build(known)] : [build('new'), build('old')];
  }
  _applyGo2rtcMode(player) {
    if (this._config.go2rtc_mode === 'webrtc') player.mode = 'webrtc';
    else if (this._config.go2rtc_mode !== 'auto') player.mode = 'mse';
  }
  // Recovery watchdog. The player has some reconnect logic of its own, but it
  // has two gaps: when WebRTC is carrying the stream the WebSocket is already
  // closed, so its video-error handler (`if (this.ws) this.ws.close()`) does
  // nothing at all; and a peer connection that ends up 'closed' rather than
  // 'failed' never triggers its reconnect either. Both leave a frozen picture
  // with nothing trying to fix it.
  //
  // So watch whether playback is actually advancing. Try a soft reconnect
  // first (same signed URL), and after repeated failures remount the engine
  // entirely — which brings the HLS fallback back into play if go2rtc is
  // simply unavailable.
  _startGo2rtcWatchdog(player, onGiveUp) {
    const CHECK_MS = 2000, STALL_MS = 8000, MAX_SOFT_RETRIES = 3;
    clearInterval(player._fmhcWatch);
    let lastTime = -1, stalledMs = 0, retries = 0;
    player._fmhcWatch = setInterval(() => {
      if (!player.isConnected) { clearInterval(player._fmhcWatch); return; }
      const v = player.video;
      // Don't fight the user or the browser: a deliberate pause and a
      // backgrounded tab both legitimately stop playback.
      if (!v || v.paused || document.hidden) { stalledMs = 0; return; }

      const advancing = v.currentTime !== lastTime;
      lastTime = v.currentTime;
      const noConnection = player.wsState === WebSocket.CLOSED && player.pcState === WebSocket.CLOSED;
      if (advancing && !noConnection) { stalledMs = 0; retries = 0; return; }

      stalledMs += CHECK_MS;
      if (stalledMs < STALL_MS) return;
      stalledMs = 0;
      retries++;
      if (retries <= MAX_SOFT_RETRIES) {
        console.warn('[frigate-modern-hass-card] go2rtc stream stalled, reconnecting', `(${retries}/${MAX_SOFT_RETRIES})`);
        try { player.ondisconnect(); } catch (_) {}
        try { player.onconnect(); } catch (_) {}
      } else {
        console.warn('[frigate-modern-hass-card] go2rtc could not recover, falling back to the Home Assistant stream');
        clearInterval(player._fmhcWatch);
        onGiveUp();
      }
    }, CHECK_MS);
  }
  _stopGo2rtcPlayer(p) {
    if (!p) return;
    clearInterval(p._fmhcWatch);
    // Close the socket/peer connection now rather than waiting out the
    // player's own disconnect timeout.
    try { p.ondisconnect(); } catch (_) {}
    try { p.remove(); } catch (_) {}
  }
  _teardownGridGo2rtc() {
    (this._gridPlayers || []).forEach(p => this._stopGo2rtcPlayer(p));
    this._gridPlayers = [];
  }
  _teardownGo2rtc() {
    const p = this._go2rtcPlayer;
    if (!p) return;
    this._go2rtcPlayer = null;
    this._stopGo2rtcPlayer(p);
    if (this._engine === p) this._engine = null;
  }

  _mountHaPlayer(slot, entity, stateObj) {
    // Use Home Assistant's HLS player directly rather than <ha-camera-stream>.
    // ha-camera-stream picks between HLS and WebRTC, and it picks WebRTC when
    // asked to start muted — but ha-web-rtc-player permanently discards the
    // incoming audio track on a muted connect, which left the native volume
    // control greyed out with no way to ever get sound (#6). Going straight to
    // HLS keeps the audio track, so the card can start muted *and* have a
    // working volume control. Falls back to ha-camera-stream on frontends
    // where ha-hls-player isn't registered.
    const useHls = !!customElements.get('ha-hls-player');
    const s = document.createElement(useHls ? 'ha-hls-player' : 'ha-camera-stream');
    s.hass = this._hass;
    if (useHls) {
      s.entityid = entity;
      s.autoPlay = true;
      s.playsInline = true;
    } else {
      s.stateObj = stateObj;
    }
    // Native player controls (mute/volume/fullscreen) instead of our own bar.
    // Our own mute button toggled `muted` on the stream element, which is a Lit
    // reactive property HA uses internally to pick between its HLS and WebRTC
    // players — toggling it could swap the whole player mid-stream. That
    // reactive tug-of-war caused the unreliable mute button (#6). Native
    // controls write straight to the <video> DOM node, outside Lit's render
    // cycle, so there is nothing left to fight over.
    s.controls = true;
    s.muted = true;
    s.style.cssText = 'width:100%;height:100%;display:block';
    slot.innerHTML = ''; slot.appendChild(s);
    this._engine = s;
    this._renderStreamCtrl();
  }

  // Pinch-to-zoom + drag-to-pan on the live view (#engine). Deliberately not
  // using the native Fullscreen API for this — iOS hands fullscreen video off
  // to its own native player where our JS/CSS has no reach, so zoom has to be
  // a plain in-card CSS transform + touch-event gesture instead.
  _wirePinchZoom() {
    const engine = this.shadowRoot.querySelector('#engine');
    if (!engine || engine._pinchWired) return;
    engine._pinchWired = true;
    const MAX = 4;
    let scale = 1, tx = 0, ty = 0;
    let mode = null; // 'pinch' | 'pan'
    let pinchStartDist = 1, pinchStartScale = 1, midX = 0, midY = 0;
    let panStartX = 0, panStartY = 0, panStartTx = 0, panStartTy = 0;
    let lastTapT = 0, lastTapX = 0, lastTapY = 0;
    const dist = (a,b) => Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY);
    const apply = () => { engine.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`; };
    const clampPan = () => {
      const w = engine.offsetWidth, h = engine.offsetHeight;
      tx = Math.min(0, Math.max(w - w*scale, tx));
      ty = Math.min(0, Math.max(h - h*scale, ty));
    };
    const zoomAt = (px, py, ns) => {
      ns = Math.min(MAX, Math.max(1, ns));
      tx = px - (px - tx) * (ns/scale);
      ty = py - (py - ty) * (ns/scale);
      scale = ns;
      clampPan();
    };
    engine.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        mode = 'pinch';
        engine.classList.add('zooming');
        pinchStartDist = dist(e.touches[0], e.touches[1]) || 1;
        pinchStartScale = scale;
        const r = engine.getBoundingClientRect();
        midX = (e.touches[0].clientX + e.touches[1].clientX)/2 - r.left;
        midY = (e.touches[0].clientY + e.touches[1].clientY)/2 - r.top;
      } else if (e.touches.length === 1) {
        const t = e.touches[0], now = Date.now();
        if (now - lastTapT < 300 && Math.hypot(t.clientX-lastTapX, t.clientY-lastTapY) < 30) {
          const r = engine.getBoundingClientRect();
          if (scale > 1) { scale = 1; tx = 0; ty = 0; }
          else zoomAt(t.clientX - r.left, t.clientY - r.top, 2.5);
          apply();
          lastTapT = 0;
          return;
        }
        lastTapT = now; lastTapX = t.clientX; lastTapY = t.clientY;
        if (scale > 1) {
          mode = 'pan';
          panStartX = t.clientX; panStartY = t.clientY; panStartTx = tx; panStartTy = ty;
        }
      }
    }, { passive: true });
    engine.addEventListener('touchmove', e => {
      if (mode === 'pinch' && e.touches.length === 2) {
        const d = dist(e.touches[0], e.touches[1]) || 1;
        zoomAt(midX, midY, pinchStartScale * (d / pinchStartDist));
        apply();
      } else if (mode === 'pan' && e.touches.length === 1) {
        const t = e.touches[0];
        tx = panStartTx + (t.clientX - panStartX);
        ty = panStartTy + (t.clientY - panStartY);
        clampPan(); apply();
      }
    }, { passive: true });
    const end = () => { mode = null; engine.classList.remove('zooming'); };
    engine.addEventListener('touchend', end);
    engine.addEventListener('touchcancel', end);
  }

  // ── camera grid ───────────────────────────────────────────
  // Columns for the grid. 'auto' keeps tiles roughly square-ish as cameras are
  // added; a pinned number wins, and 1 gives a vertical stack.
  _gridColumns(n) {
    const cfg = this._config.grid_columns;
    if (cfg && cfg !== 'auto') return cfg;
    let cols = n <= 1 ? 1 : n <= 4 ? 2 : n <= 9 ? 3 : 4;
    // Never make tiles so narrow they stop being watchable. Without this a
    // phone showing seven cameras got three columns of ~100px tiles; the count
    // alone says nothing about how much room there actually is.
    const width = this._cardWidth || this.offsetWidth || 0;
    if (width) cols = Math.max(1, Math.min(cols, Math.floor(width / MIN_TILE_PX)));
    return cols;
  }
  async _mountGrid() {
    const grid = this.shadowRoot.querySelector('#cam-grid'); if (!grid) return;
    const n = this._config.cameras.length;
    const cols = this._gridColumns(n);
    const rows = Math.ceil(n / cols);
    const slots = cols * rows;       // remainder becomes placeholders
    grid.className = `cam-grid cams-${n}${rows > 1 ? ' multi-row' : ''}${cols === 1 ? ' stacked' : ''}`;
    grid.style.setProperty('--grid-cols', cols);
    grid.style.setProperty('--grid-rows', rows);
    this._gridCols = cols;
    this._teardownGridGo2rtc();
    grid.innerHTML = '';
    this._gridSeq = (this._gridSeq || 0) + 1;
    const gridToken = this._gridSeq;
    this._gridToken = gridToken;
    for (let i = 0; i < slots; i++) {
      const slot = document.createElement('div');
      const isPlaceholder = i >= n;
      slot.className = `grid-slot${isPlaceholder ? ' placeholder' : ''}`;
      if (!isPlaceholder) {
        const c = this._config.cameras[i];
        const name = cap(camDisplayName(c));
        // stream — go2rtc when configured (one WebSocket per tile is far
        // lighter than a full HLS pipeline each), otherwise the HA stream.
        if (this._config.live_provider === 'go2rtc') {
          slot.insertAdjacentHTML('afterbegin', '<div class="ph"><div class="ph-spin"></div></div>');
          this._mountGridGo2rtc(slot, c.entity);
        } else {
          this._mountGridHaStream(slot, c.entity);
        }
        // label
        const lbl = document.createElement('div');
        lbl.className = 'grid-label'; lbl.textContent = name;
        slot.appendChild(lbl);
        // Click → open this camera in single view (_switchCamera switches the
        // view mode itself). Leave wall-display fullscreen first, otherwise we
        // would land on a single view stuck behind a fullscreened grid.
        // Guard: buttons inside the slot handle their own action (a clip played
        // in-slot renders its own close/fullscreen buttons); don't also switch.
        slot.addEventListener('click', ev => {
          if (ev.target.closest('.grid-fs-btn,.grid-close-btn,[data-restore-slot]')) return;
          this._exitFullscreen();
          this._switchCamera(i); this._renderCamSwitcher();
        });
      }
      grid.appendChild(slot);
    }
  }

  _mountGridHaStream(slot, entity) {
    const stateObj = this._hlsStateObj(entity);
    if (!stateObj) return;
    const s = document.createElement('ha-camera-stream');
    s.hass = this._hass; s.stateObj = stateObj; s.controls = false; s.muted = true;
    s.style.cssText = 'width:100%;height:100%;display:block;pointer-events:none';
    slot.querySelector('.ph')?.remove();
    slot.insertAdjacentElement('afterbegin', s);
  }
  // A grid tile's go2rtc stream. No controls here: tiles stay
  // pointer-events:none so a click selects the camera rather than hitting the
  // player. Falls back to the HA stream for this tile alone if it can't start.
  async _mountGridGo2rtc(slot, entity) {
    const token = this._gridToken;
    const cache = this._camCache[entity];
    const clientId = cache?.clientId, cam = cache?.cam;
    const giveUp = () => {
      if (this._gridToken !== token || !slot.isConnected) return;
      this._mountGridHaStream(slot, entity);
    };
    if (!clientId || !cam) { giveUp(); return; }

    const src = await this._signed(this._go2rtcPaths(clientId, cam)[0]);
    if (this._gridToken !== token || !slot.isConnected) return;

    const player = document.createElement('frigate-go2rtc-player');
    player.style.cssText = 'width:100%;height:100%;display:block;pointer-events:none';
    slot.insertAdjacentElement('afterbegin', player);
    if (player.video) {
      player.video.controls = false;
      player.video.muted = true;
      player.video.style.objectFit = 'contain';
    }
    this._applyGo2rtcMode(player);
    player.src = src;
    (this._gridPlayers = this._gridPlayers || []).push(player);

    const ok = await new Promise(resolve => {
      let done = false;
      const finish = v => { if (!done) { done = true; clearInterval(poll); resolve(v); } };
      player.video?.addEventListener('playing', () => finish(true), { once: true });
      player.video?.addEventListener('loadeddata', () => finish(true), { once: true });
      // Detached mid-connect (tile now shows a clip): stop waiting.
      if (!player.isConnected) finish(false);
      const started = Date.now();
      const poll = setInterval(() => {
        const elapsed = Date.now() - started;
        const open = player.wsState === WebSocket.OPEN || player.pcState === WebSocket.OPEN;
        if ((!open && elapsed > 4000) || elapsed > 15000) finish(false);
      }, 250);
    });
    if (this._gridToken !== token || !slot.isConnected || !player.isConnected) {
      this._stopGo2rtcPlayer(player);
      this._gridPlayers = (this._gridPlayers || []).filter(x => x !== player);
      return;
    }
    if (ok) {
      slot.querySelector('.ph')?.remove();
      this._startGo2rtcWatchdog(player, giveUp);
      return;
    }
    this._stopGo2rtcPlayer(player);
    this._gridPlayers = (this._gridPlayers || []).filter(p => p !== player);
    giveUp();
  }

  // ── custom stream controls ────────────────────────────────
  // Single view uses the player's own native controls for mute and fullscreen.
  // Grid slots can't (their streams are pointer-events:none so slot clicks
  // still select the camera), so those keep the card's fullscreen button.
  _renderStreamCtrl() {
    const bar = this.shadowRoot.querySelector('#stream-ctrl-bar'); if (!bar) return;
    const inGrid = this._viewMode === 'grid';
    const fs = inGrid ? `<button class="scb-btn" id="sc-fs" title="Fullscreen">${ICONS.expand}</button>` : '';
    // Only meaningful in the wide layout, where the events panel sits beside the
    // cameras. CSS hides it when narrow, since there the browse toggle does this.
    const events = `<button class="scb-btn" id="sc-events" title="Show or hide events">${ICONS.chevron}</button>`;
    bar.innerHTML = `${fs}${events}`;
    this._applyEventsCollapsed();
  }
  _applyEventsCollapsed() {
    const card = this.shadowRoot.querySelector('.card'); if (!card) return;
    card.classList.toggle('events-collapsed', this._eventsCollapsed);
    const btn = this.shadowRoot.querySelector('#sc-events');
    if (btn) btn.title = this._eventsCollapsed ? 'Show events' : 'Hide events';
  }
  _toggleEvents() {
    this._eventsCollapsed = !this._eventsCollapsed;
    this._applyEventsCollapsed();
    // The stream column changes width, so the height the events column is
    // matched to changes with it. Re-measure once the animation has settled.
    setTimeout(() => { if (this._cardWidth >= 560) this._syncColHeight(); }, 320);
  }

  // ── view mode ─────────────────────────────────────────────
  _setViewMode(mode) {
    this._viewMode = mode;
    const card = this.shadowRoot.querySelector('.card');
    if (card) card.classList.toggle('grid-mode', mode === 'grid');
    const engWrap = this.shadowRoot.querySelector('#eng-wrap');
    const gridEl = this.shadowRoot.querySelector('#cam-grid');

    if (mode === 'grid') {
      if (engWrap) engWrap.style.display = 'none';
      if (gridEl) { gridEl.style.display = ''; this._mountGrid(); }
      this._eventsMode = 'all';
      const lbl = this.shadowRoot.querySelector('#list-label');
      if (lbl) lbl.textContent = 'All cameras';
      this._loadAllCamsBackground().then(() => this._renderAll());
      this._renderStreamCtrl(); // hide mute button in grid mode
    } else {
      if (engWrap) engWrap.style.display = '';
      if (gridEl) gridEl.style.display = 'none';
      this._eventsMode = 'camera';
      this._mountEngine();
      this._renderAll();
    }
    this._renderCamSwitcher();
    this._applyBrowse();
    this.shadowRoot.querySelectorAll('[data-viewmode]').forEach(p =>
      p.classList.toggle('active', p.dataset.viewmode === mode));
  }

  // ── camera switching ──────────────────────────────────────
  async _switchCamera(idx) {
    if (idx === this._activeCamIdx && this._viewMode === 'single') return;
    // Clicking a cam tab while in grid mode switches to single view of that camera
    if (this._viewMode === 'grid') this._setViewMode('single');
    const prevEnt = this._activeCam?.entity;
    if (prevEnt && this._camCache[prevEnt]) {
      this._camCache[prevEnt].events = this._events;
      this._camCache[prevEnt].recordings = this._recordings;
    }
    this._activeCamIdx = idx;
    const newEnt = this._activeCam?.entity;
    if (!this._camCache[newEnt]) this._camCache[newEnt] = mkCamState();
    if (!this._camCache[newEnt].discovered) await this._discoverOne(newEnt);
    const cached = this._camCache[newEnt];
    this._events = cached.events||[]; this._recordings = cached.recordings||[];
    this._reviews = cached.reviews||[]; this._kept = cached.kept||[];
    this._renderCamSwitcher(); this._syncStatus();
    await this._mountEngine();
    this._renderAll();
    await this._loadWindow(true);
  }

  _startRotate() {
    this._stopRotate();
    const secs = this._config.rotate_seconds || DEFAULT_ROTATE_S;
    this._rotateTimer = setInterval(() => {
      const next = (this._activeCamIdx+1) % this._config.cameras.length;
      this._switchCamera(next);
    }, secs*1000);
  }
  _stopRotate() { if (this._rotateTimer) { clearInterval(this._rotateTimer); this._rotateTimer=null; } }
  _toggleRotate() {
    if (this._rotateTimer) { this._stopRotate(); this._toast('Auto-rotate off',1800); }
    else {
      if (!this._config.rotate_seconds) this._config.rotate_seconds = DEFAULT_ROTATE_S;
      this._startRotate(); this._toast(`Rotating every ${this._config.rotate_seconds}s`,1800);
    }
    this._renderCamSwitcher();
  }

  // ── data ─────────────────────────────────────────────────
  _cc() { return this._camCache[this._activeCam?.entity] || mkCamState(); }
  async _ws(p) { return parseWs(await this._hass.callWS(p)); }
  _isNowWindow() { return Math.abs(this._winEnd - Math.floor(Date.now()/1000)) < 120; }

  async _loadWindow(replace) {
    if (this._loading) return;
    this._loading = true;
    const { clientId, cam } = this._cc(); if (!clientId||!cam) { this._loading=false; return; }
    const after=this._winStart, before=this._winEnd;
    try {
      const ev = await this._ws({ type:'frigate/events/get', instance_id:clientId, cameras:[cam], after, before, limit:20 });
      this._events = Array.isArray(ev)?ev:[];
    } catch(e) { console.error('[Frigate] events',e); }
    try {
      const rec = await this._ws({ type:'frigate/recordings/get', instance_id:clientId, camera:cam, after, before });
      this._recordings = Array.isArray(rec)?rec:[];
    } catch(_) { this._recordings=[]; }
    const ent=this._activeCam?.entity;
    if (ent&&this._camCache[ent]) { this._camCache[ent].events=this._events; this._camCache[ent].recordings=this._recordings; }
    if (this._tab==='reviews') await this._loadReviews();
    this._loading = false;
    if (this._eventsMode==='all') this._loadAllCamsBackground();
    this._renderAll();
  }

  // Fetch all non-active cameras in parallel — was sequential, now Promise.all
  async _loadAllCamsBackground() {
    const after=this._winStart, before=this._winEnd;
    const others = this._config.cameras.filter(c => {
      const cc = this._camCache[c.entity];
      return c.entity !== this._activeCam?.entity && cc && cc.discovered;
    });
    await Promise.all(others.map(async c => {
      const cc = this._camCache[c.entity];
      try {
        const ev = await this._ws({type:'frigate/events/get',instance_id:cc.clientId,cameras:[cc.cam],after,before,limit:20});
        cc.events = Array.isArray(ev) ? ev : [];
      } catch(_) {}
    }));
    if (this._eventsMode==='all') this._renderList();
  }

  async _loadKept() {
    const {clientId,cam}=this._cc();
    try {
      const k=await this._ws({type:'frigate/events/get',instance_id:clientId,cameras:[cam],favorites:true,limit:200});
      this._kept=Array.isArray(k)?k:[];
      const ent=this._activeCam?.entity; if(ent&&this._camCache[ent]) this._camCache[ent].kept=this._kept;
    } catch(_) { this._kept=[]; }
  }
  async _loadReviews() {
    const {clientId,cam}=this._cc();
    try {
      const r=await this._ws({type:'frigate/reviews/get',instance_id:clientId,cameras:[cam],after:this._winStart,before:this._winEnd,limit:200});
      this._reviews=Array.isArray(r)?r:[];
    } catch(_) { this._reviews=[]; }
  }
  async _loadCalendar() {
    const {clientId,cam}=this._cc();
    try {
      const sum=await this._ws({type:'frigate/events/summary',instance_id:clientId,timezone:this._tz()});
      if(Array.isArray(sum)) this._daysWithActivity=new Set(sum.filter(s=>s.camera===cam&&s.day).map(s=>s.day));
    } catch(_) {}
  }
  _tz() { return this._hass?.config?.time_zone||Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'; }

  async _subscribe() {
    const {clientId}=this._cc(); if(!this._hass?.connection||!clientId) return;
    try {
      this._unsub=this._hass.connection.subscribeMessage(
        msg=>{ if(msg?.type==='end'&&this._isNowWindow()) this._scheduleReload(); },
        {type:'frigate/events/subscribe',instance_id:clientId}
      );
    } catch(_) {}
  }
  _scheduleReload() { clearTimeout(this._rt); this._rt=setTimeout(()=>this._loadWindow(true),1500); }

  // ── shell ─────────────────────────────────────────────────
  _renderShell() {
    const title = this._config.title || (this._config.cameras.length===1 ? cap(camDisplayName(this._config.cameras[0])) : 'Cameras') || 'Camera';
    const sub = this._config.subtitle || 'Frigate';
    const multiCam = this._config.cameras.length > 1;
    const ht = new Set(this._config.hidden_tabs || []);
    const tab = (id, icon, label) => ht.has(id) ? '' :
      id === 'live'
        ? `<div class="pill active" data-tab="live">${icon}<span>${label}</span></div>`
        : `<div class="pill icon-only" data-tab="${id}" title="${label}">${icon}</div>`;

    this.shadowRoot.innerHTML = `<style>${STYLES}</style>
      <ha-card class="card ${this._config.theme==='light'?'theme-light':this._config.theme==='auto'?'theme-auto':''}" id="card">
        <div class="layout" id="layout">
          <div class="col-left">
            <!-- feed: single stream or grid -->
            <div class="feed-area">
              <div id="eng-wrap">
                <div id="engine"><div class="ph">${ICONS.live}<span>Connecting…</span></div></div>
                <div class="viewer" id="viewer" style="display:none"></div>
<div class="feed-top" id="feed-top" style="display:none">
                  <button class="btn back" id="back">${ICONS.back}<span>Live</span></button>
                </div>
              </div>
              <div id="cam-grid" style="display:none"></div>
            </div>
            <!-- timeline strip — always visible below the stream/grid -->
            <div class="tl-sec">
              <div class="tl-head">
                <span class="section-label" id="tl-range">—</span>
                <div class="tl-tools">
                  <button class="tool" id="now-btn" title="Jump to now">⟳</button>
                  <button class="tool" id="filter-btn" title="Filter">${ICONS.filter}</button>
                  <button class="tool" id="cal-btn" title="Calendar">${ICONS.calendar}</button>
                </div>
              </div>
              <div class="filter-panel" id="filter-panel" style="display:none"></div>
              <div class="cal-panel" id="cal-panel" style="display:none"></div>
              <div class="tl-track" id="tl-track" title="Drag · scroll=zoom · Shift+scroll=pan"><div class="tl-now"></div></div>
              <div class="tl-labels" id="tl-labels"></div>
              <div class="legend" id="legend"></div>
            </div>
            <!-- info: sits below timeline in col-left -->
            <div class="info-row">
              <div><div class="info-title" id="info-title">${title}</div><div class="info-sub">${sub}</div></div>
              <div class="stream-ctrl-bar" id="stream-ctrl-bar"></div>
              <div class="stats">
                <div class="stat"><div class="sv" id="ev-count">—</div><div class="sl">Events</div></div>
                <div class="stat"><div class="sv" id="on-dot" style="color:#4ade80">●</div><div class="sl" id="on-lbl">Online</div></div>
              </div>
            </div>
            ${multiCam ? `<div class="cam-switcher" id="cam-switcher"></div>` : ''}
            <div class="latest" id="latest-row" style="display:none"></div>
          </div>

          <div class="col-right">
            <button class="browse-toggle" id="browse-toggle"><span class="chev2" id="chev2">${ICONS.chevron}</span><span class="section-label">Events · Recordings</span></button>
            <div class="browse" id="browse" style="display:none">
              <div class="tabs">
                ${tab('live', ICONS.live, 'Live')}
                ${tab('recordings', ICONS.recordings, 'Recordings')}
                ${tab('clips', ICONS.clips, 'Clips')}
                ${tab('snapshot', ICONS.snapshot, 'Snapshots')}
                ${tab('reviews', ICONS.reviews, 'Reviews')}
                ${tab('kept', ICONS.star, 'Kept events')}
              </div>
              <div class="list-sec">
                <div class="list-head"><span class="section-label" id="list-label">Recent events</span><span class="newtoast" id="newtoast" style="display:none">new ✦</span></div>
                <div class="diag" id="diag" style="display:none"></div>
                <div class="list" id="list"><div class="empty">Loading…</div></div>
              </div>
            </div>
          </div>
        </div>
        <div class="toast" id="toast" style="display:none"></div>
      </ha-card>`;
    this._domCache = {}; // invalidate DOM element cache after full re-render
    this.shadowRoot.addEventListener('click', e=>this._click(e));
    this._wireScrub(); this._wireScroll(); this._wirePinchZoom(); this._applyBrowse();
    if (multiCam) this._renderCamSwitcher();
    this._applyCardStyle();
  }

  _applyCardStyle() {
    const card = this.shadowRoot.querySelector('.card'); if (!card) return;

    // Stream height — also auto-detected from HA Sections --ha-card-height variable.
    // When a Sections row has a fixed height, HA injects --ha-card-height on the host.
    // We propagate it as --stream-h so the stream fills the section naturally.
    const vh = this._config.stream_height;
    if (vh) {
      card.style.setProperty('--stream-h', `${vh}vh`);
    } else {
      // Check if HA Sections injected a card height on the host element
      const haCardH = getComputedStyle(this).getPropertyValue('--ha-card-height').trim();
      if (haCardH) {
        card.style.setProperty('--stream-h', haCardH);
      } else {
        card.style.removeProperty('--stream-h');
      }
    }

    // Theme — for 'auto' prefer HA's own dark-mode flag, fall back to OS media query
    let theme = this._config.theme || 'dark';
    if (theme === 'auto') {
      const haDark = this._hass?.themes?.darkMode;
      const osDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
      theme = (haDark ?? osDark ?? true) ? 'dark' : 'light';
    }
    card.classList.toggle('theme-light', theme === 'light');
    card.classList.remove('theme-auto'); // resolved to light/dark above

    // Custom accent color — compute bg/border variants from hex
    const acc = this._config.accent_color;
    if (acc && /^#[0-9a-f]{6}$/i.test(acc)) {
      const r = parseInt(acc.slice(1,3),16), g = parseInt(acc.slice(3,5),16), b = parseInt(acc.slice(5,7),16);
      card.style.setProperty('--c-acc',     acc);
      card.style.setProperty('--c-acc-bg',  `rgba(${r},${g},${b},.18)`);
      card.style.setProperty('--c-acc-bdr', `rgba(${r},${g},${b},.40)`);
    } else {
      card.style.removeProperty('--c-acc');
      card.style.removeProperty('--c-acc-bg');
      card.style.removeProperty('--c-acc-bdr');
    }

    // Custom background color
    const bg = this._config.bg_color;
    if (bg && /^#[0-9a-f]{6}$/i.test(bg)) {
      card.style.setProperty('--c-bg', bg);
    } else {
      card.style.removeProperty('--c-bg');
    }
  }

  _setupResizeObserver() {
    if (this._ro) return;
    this._ro = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width;
      this._cardWidth = w;
      const card = this.shadowRoot.querySelector('.card');
      if (!card) return;
      const wide = w >= 560, mobile = w < 420;
      card.classList.toggle('wide', wide);
      card.classList.toggle('mobile', mobile);
      this._applyBrowse();
      this._applyEventsCollapsed();
      if (wide) this._syncColHeight();
      // Crossing a width where the automatic column count changes (rotating a
      // phone, resizing a window) needs the grid rebuilt: the number of
      // placeholder tiles depends on it. Only on an actual change, since this
      // reconnects every stream.
      if (this._viewMode === 'grid' && this._gridCols
          && this._gridColumns(this._config.cameras.length) !== this._gridCols) {
        this._mountGrid();
      }
    });
    this._ro.observe(this);
  }

  // Match col-right height to col-left so the events panel never makes the card
  // taller than the stream side, and col-right scrolls within that bounded height.
  _syncColHeight() {
    requestAnimationFrame(() => {
      const l = this.shadowRoot.querySelector('.col-left');
      const r = this.shadowRoot.querySelector('.col-right');
      if (!l || !r) return;
      const h = l.offsetHeight;
      if (h > 0) r.style.maxHeight = h + 'px';
    });
  }

  // ── cam switcher ──────────────────────────────────────────
  _renderCamSwitcher() {
    const el = this.shadowRoot.querySelector('#cam-switcher'); if (!el) return;
    if (this._config.cameras.length < 2) { el.style.display='none'; return; }
    el.style.display = '';

    const tabs = this._config.cameras.map((c,i) => {
      const name = cap(camDisplayName(c));
      const active = this._viewMode === 'single' && i === this._activeCamIdx;
      const ok = this._hass?.states[c.entity]?.state !== 'unavailable';
      return `<button class="cam-tab ${active?'active':''}" data-camidx="${i}"><span class="cam-dot" style="color:${ok?'#4ade80':'#ef4444'}">●</span> ${name}</button>`;
    }).join('');
    const gridActive = this._viewMode === 'grid';
    el.innerHTML = `<div class="cam-tabs">${tabs}<button class="cam-tab${gridActive?' active':''}" data-viewmode="grid" title="All cameras">${ICONS.grid} Multiview</button></div>
      <button class="cam-rotate ${this._rotateTimer?'on':''}" id="rotate-btn" title="Auto-rotate">${ICONS.rotate}</button>`;
  }

  // ── interactions ──────────────────────────────────────────
  _click(e) {
    if (e.target.closest('#back')) return this._showLive();
    if (e.target.closest('#sc-fs')) {
      const target = this._viewMode === 'grid'
        ? this.shadowRoot.querySelector('#cam-grid')
        : this.shadowRoot.querySelector('#eng-wrap');
      return this._fullscreen(target);
    }
    if (e.target.closest('#filter-btn')) return this._toggleFilter();
    if (e.target.closest('#cal-btn')) return this._toggleCal();
    if (e.target.closest('#now-btn')) return this._goNow();
    if (e.target.closest('#browse-toggle')) return this._toggleBrowse();
    if (e.target.closest('#sc-events')) return this._toggleEvents();
    if (e.target.closest('#rotate-btn')) return this._toggleRotate();
    if (e.target.closest('[data-mark-all]')) return this._markAll();
    if (e.target.closest('[data-toggle-reviewed]')) { this._showReviewed=!this._showReviewed; this._renderList(); return; }

    const setvm = e.target.closest('[data-setviewmode]'); if (setvm) return this._setViewMode(setvm.dataset.setviewmode);
    const viewm = e.target.closest('[data-viewmode]'); if (viewm) return this._setViewMode(viewm.dataset.viewmode);
    const camTab = e.target.closest('[data-camidx]'); if (camTab) return this._switchCamera(Number(camTab.dataset.camidx));
    const calDay = e.target.closest('[data-cal-day]'); if (calDay) return this._pickDay(calDay.dataset.calDay);
    const calNav = e.target.closest('[data-cal-nav]'); if (calNav) return this._calNav(Number(calNav.dataset.calNav));
    const fopt = e.target.closest('[data-flabel]'); if (fopt) { this._filterLabel=fopt.dataset.flabel; this._renderFilter(); this._renderList(); return; }
    const zopt = e.target.closest('[data-fzone]'); if (zopt) { this._filterZone=zopt.dataset.fzone; this._renderFilter(); this._renderList(); return; }
    const favo = e.target.closest('[data-favonly]'); if (favo) { this._favOnly=favo.dataset.favonly==='1'; this._renderFilter(); this._renderList(); return; }

    const dl = e.target.closest('[data-dl]'); if (dl) { e.stopPropagation(); return this._download(dl.dataset.dl,dl.dataset.dlFile); }
    const fav = e.target.closest('[data-fav]'); if (fav) { e.stopPropagation(); return this._toggleFav(fav.dataset.fav); }
    const revMark = e.target.closest('[data-mark]'); if (revMark) { const rv=revMark.closest('[data-review-id]'); e.stopPropagation(); if(rv) return this._markReviewed(rv.dataset.reviewId); }
    const revOpen = e.target.closest('[data-review-open]'); if (revOpen) return this._showClipById(revOpen.dataset.reviewOpen);
    const pill = e.target.closest('[data-tab]'); if (pill) return this._setTab(pill.dataset.tab);
    const tick = e.target.closest('[data-tick]'); if (tick) return this._open(tick.dataset.tick);
    // Stop seek-bar clicks from bubbling up to the recording row handler
    if (e.target.closest('.rec-seek-wrap')) return;
    const recRow = e.target.closest('[data-rs]'); if (recRow) return this._toggleRecSeek(recRow);
    const restoreSlot = e.target.closest('[data-restore-slot]');
    if (restoreSlot) { e.stopPropagation(); this._restoreGridSlot(Number(restoreSlot.dataset.restoreSlot)); return; }
    // per-slot fullscreen (from innerHTML-created button in _openInGridSlot)
    const slotFs = e.target.closest('[data-slot-fs]');
    if (slotFs) { e.stopPropagation(); this._fullscreen(slotFs.closest('.grid-slot')); return; }
    const card = e.target.closest('[data-ev]'); if (card) {
      if (this._viewMode === 'grid') {
        this._openInGridSlot(card.dataset.ev);
      } else {
        this._open(card.dataset.ev);
      }
    }
  }

  _setTab(tab) {
    this._tab = tab;
    this.shadowRoot.querySelectorAll('[data-tab]').forEach(p=>p.classList.toggle('active',p.dataset.tab===tab));
    const lbl=this.shadowRoot.querySelector('#list-label');
    if (lbl) lbl.textContent=({live:'Recent events',recordings:'Recordings',clips:'Clips',snapshot:'Snapshots',reviews:'Reviews',kept:'Kept'})[tab]||tab;
    if (tab==='live') this._showLive();
    if (tab==='reviews') this._loadReviews().then(()=>this._renderList());
    if (tab==='kept') this._loadKept().then(()=>this._renderList());
    this._renderList();
  }

  // ── playback ──────────────────────────────────────────────
  _allDisplayEvents() {
    if (this._eventsMode==='all') {
      const seen=new Set(); const all=[];
      for (const c of this._config.cameras) { const cc=this._camCache[c.entity]; if(cc) for(const ev of (cc.events||[])) if(!seen.has(ev.id)){seen.add(ev.id);all.push(ev);} }
      return all.sort((a,b)=>b.start_time-a.start_time);
    }
    return this._events;
  }
  _stopSlotPlayer(slot) {
    const p = slot?.querySelector('frigate-go2rtc-player');
    if (!p) return;
    this._stopGo2rtcPlayer(p);
    this._gridPlayers = (this._gridPlayers || []).filter(x => x !== p);
  }
  // Put one tile back to its live stream. Rebuilding the whole grid would
  // drop and reconnect every other camera as well.
  _restoreGridSlot(idx) {
    const grid = this.shadowRoot.querySelector('#cam-grid');
    const slot = grid?.querySelectorAll('.grid-slot:not(.placeholder)')?.[idx];
    const cam = this._config.cameras[idx];
    if (!slot || !cam) { this._mountGrid(); return; }
    this._stopSlotPlayer(slot);
    slot.innerHTML = `<div class="grid-label">${cap(camDisplayName(cam))}</div>`;
    if (this._config.live_provider === 'go2rtc') {
      slot.insertAdjacentHTML('afterbegin', '<div class="ph"><div class="ph-spin"></div></div>');
      this._mountGridGo2rtc(slot, cam.entity);
    } else {
      this._mountGridHaStream(slot, cam.entity);
    }
  }
  // Play clip/snapshot inside the matching grid slot (stays in grid mode)
  async _openInGridSlot(id) {
    const ev = this._allDisplayEvents().find(e => e.id === id);
    if (!ev) return;
    const camIdx = this._config.cameras.findIndex(c => {
      const cc = this._camCache[c.entity]; return cc && cc.cam === ev.camera;
    });
    const grid = this.shadowRoot.querySelector('#cam-grid');
    const slots = grid?.querySelectorAll('.grid-slot:not(.placeholder)');
    const slot = slots?.[camIdx < 0 ? 0 : camIdx];
    if (!slot) { this._open(id); return; } // fallback to single view

    this._stopSlotPlayer(slot); // don't leave the tile's stream running headless
    const isSnap = this._tab === 'snapshot' || (!ev.has_clip && ev.has_snapshot);
    const camName = cap((ev.camera||'').replace(/_/g,' '));
    if (isSnap) {
      const url = await this._signed(this._media(ev.id,'snapshot.jpg'));
      slot.innerHTML = `
        <img src="${url}" style="width:100%;height:100%;object-fit:contain;background:#000;display:block">
        <div class="grid-label">${camName}</div>
        <button class="grid-close-btn" data-restore-slot="${camIdx}" title="Back to live">✕</button>
        <button class="grid-fs-btn" data-slot-fs title="Fullscreen">${ICONS.expand}</button>`;
    } else {
      const url = await this._resolveClipUrl(ev.id);
      slot.innerHTML = `
        <video src="${url}" controls playsinline
          style="width:100%;height:100%;object-fit:contain;background:#000;display:block"></video>
        <div class="grid-label">${camName}</div>
        <button class="grid-close-btn" data-restore-slot="${camIdx}" title="Back to live">✕</button>`;
      this._playMedia(slot.querySelector('video'));
    }
  }

  _open(id) {
    const ev=this._allDisplayEvents().find(e=>e.id===id);
    if(!ev) return;
    if (this._tab==='snapshot'||(!ev.has_clip&&ev.has_snapshot)) this._showSnapshot(ev);
    else if (ev.has_clip) this._showClip(ev); else this._showSnapshot(ev);
  }
  _enter() {
    this.shadowRoot.querySelector('#engine').style.display='none';
    const v=this.shadowRoot.querySelector('#viewer'); v.style.display='flex';
    this.shadowRoot.querySelector('#feed-top').style.display='flex';
  }
  _showLive() {
    this._playing=null;
    const v=this.shadowRoot.querySelector('#viewer'); v.innerHTML=''; v.style.display='none';
    this.shadowRoot.querySelector('#engine').style.display='block';
    this.shadowRoot.querySelector('#feed-top').style.display='none';
    this._renderStreamCtrl();
    this._revokeClipBlob();
  }
  _revokeClipBlob() {
    if (this._clipBlobUrl) { URL.revokeObjectURL(this._clipBlobUrl); this._clipBlobUrl = null; }
  }
  // Fetch the clip as a Blob and hand the <video> a blob: URL instead of the
  // direct network URL. iOS' AVPlayer requires proper HTTP range-request support
  // to start progressive MP4 playback; the Frigate/HA media proxy doesn't always
  // provide that, so it fails there with MEDIA_ERR_SRC_NOT_SUPPORTED even though
  // the exact same URL plays fine elsewhere. A blob: URL sidesteps range requests
  // entirely — fine for short event clips, at the cost of no streaming start.
  async _loadClipBlob(url) {
    this._revokeClipBlob();
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const blob = await res.blob();
      this._clipBlobUrl = URL.createObjectURL(blob);
      return this._clipBlobUrl;
    } catch (_) {
      return url;
    }
  }
  // Clips and recordings are played deliberately, so they should be audible.
  // Browsers may still refuse to start unmuted playback (autoplay policy — the
  // user gesture can be lost across the awaits needed to resolve a signed URL,
  // notably on iOS). In that case retry muted rather than not playing at all;
  // the user can unmute from the native controls.
  async _playMedia(vid) {
    if (!vid?.play) return;
    try {
      await vid.play();
    } catch (err) {
      if (err?.name === 'NotAllowedError' && !vid.muted) {
        vid.muted = true;
        try { await vid.play(); } catch (_) { /* give up quietly */ }
      }
    }
  }
  _media(id,file,dl) { return `/api/frigate/${this._cc().clientId}/notifications/${id}/${file}${dl?'?download=true':''}`; }
  // Same HLS route the Home Assistant media browser uses to play this event
  // (custom_components/frigate/media_source.py: vod/event/<id>/index.m3u8).
  _vod(id) { return `/api/frigate/${this._cc().clientId}/vod/event/${id}/index.m3u8`; }
  // Safari/iOS support HLS natively in <video> (no library needed); other
  // browsers don't, but the blob-mp4 path already works fine for them there.
  _hlsNative() {
    const v = document.createElement('video');
    return !!v.canPlayType && v.canPlayType('application/vnd.apple.mpegurl') !== '';
  }
  async _resolveClipUrl(id) {
    if (this._hlsNative()) return this._signed(this._vod(id));
    return this._loadClipBlob(await this._signed(this._media(id,'clip.mp4')));
  }
  async _showClip(ev) {
    const token = ++this._playSeq;
    this._enter(); this._playing={id:ev.id};
    const viewer = this.shadowRoot.querySelector('#viewer');
    viewer.innerHTML = '<div class="ld">Loading…</div>';
    const playUrl = await this._resolveClipUrl(ev.id);
    if (this._playSeq !== token) return;
    viewer.innerHTML=`<video src="${playUrl}" controls playsinline></video>`;
    this._playMedia(viewer.querySelector('video'));
  }
  async _showClipById(id) {
    if(!id) return;
    const token = ++this._playSeq;
    this._enter(); this._playing={id};
    const viewer = this.shadowRoot.querySelector('#viewer');
    viewer.innerHTML = '<div class="ld">Loading…</div>';
    const playUrl = await this._resolveClipUrl(id);
    if (this._playSeq !== token) return;
    viewer.innerHTML=`<video src="${playUrl}" controls playsinline></video>`;
    this._playMedia(viewer.querySelector('video'));
  }
  async _showSnapshot(ev) {
    this._enter(); this._playing={id:ev.id};
    const url = await this._signed(this._media(ev.id,'snapshot.jpg'));
    this.shadowRoot.querySelector('#viewer').innerHTML=`<img class="snap" src="${url}">`;
  }
  _fmtDurS(s) { // format seconds → m:ss or h:mm:ss
    const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), ss=s%60;
    return h>0 ? `${h}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}` : `${m}:${String(ss).padStart(2,'0')}`;
  }
  async _showRecording(s, e, seekFrom) {
    const start = seekFrom || s;
    const token = ++this._playSeq; // cancel any in-flight load
    this._enter(); this._playing={rec:s};
    const viewer = this.shadowRoot.querySelector('#viewer');
    viewer.innerHTML='<div class="ld">Loading…</div>';
    const {clientId,cam}=this._cc();
    const maxChunk = 7200;
    const chunkEnd = Math.min(e, start + maxChunk);
    const clipDur = chunkEnd - start; // real clip length in seconds
    const url=await this._signed(`/api/frigate/${clientId}/recording/${cam}/start/${start}/end/${chunkEnd}`);
    if (this._playSeq !== token) return;
    const fromLbl = seekFrom
      ? `<div class="seek-from-lbl">▶ Playing from ${this._time(seekFrom)}</div>`
      : '';
    // No native `controls` — we show our own bar so the browser can't display
    // the wrong file duration (Frigate proxy may serve the full segment file).
    viewer.innerHTML=`<video src="${url}" playsinline></video>${fromLbl}
      <div class="rec-dl-bar">
        <div class="rec-ctl-row">
          <button class="rec-pp-btn">⏸</button>
          <button class="rec-mute-btn" title="Mute">${ICONS.volOn}</button>
          <span class="rec-ctl-time">0:00 / ${this._fmtDurS(clipDur)}</span>
          <input type="range" class="rec-prog" min="0" max="${clipDur}" value="0" step="1">
        </div>
        <div class="rec-dl-row">
          <span>Download from <span class="rec-dl-time">${this._time(start)}</span></span>
          <button class="rec-dl-btn">↓ Download</button>
        </div>
      </div>`;
    const vid     = viewer.querySelector('video');
    const ppBtn   = viewer.querySelector('.rec-pp-btn');
    const muteBtn = viewer.querySelector('.rec-mute-btn');
    const ctTime  = viewer.querySelector('.rec-ctl-time');
    const prog    = viewer.querySelector('.rec-prog');
    const dlTime  = viewer.querySelector('.rec-dl-time');
    const dlBtn   = viewer.querySelector('.rec-dl-btn');
    if (vid) {
      vid.addEventListener('play',  () => { if (ppBtn) ppBtn.textContent = '⏸'; });
      vid.addEventListener('pause', () => { if (ppBtn) ppBtn.textContent = '▶'; });
      vid.addEventListener('ended', () => { if (ppBtn) ppBtn.textContent = '▶'; });
      vid.addEventListener('timeupdate', () => {
        const t = Math.min(Math.floor(vid.currentTime), clipDur);
        if (ctTime) ctTime.textContent = `${this._fmtDurS(t)} / ${this._fmtDurS(clipDur)}`;
        if (prog && !prog._dragging) prog.value = t;
        if (dlTime) dlTime.textContent = this._time(start + t);
        // stop playback at clip end (file may be longer than the clip window)
        if (vid.currentTime >= clipDur) { vid.pause(); vid.currentTime = clipDur; }
      });
    }
    if (vid) {
      // Start playback and sync the custom mute button with what actually
      // happened — playback may have fallen back to muted.
      this._playMedia(vid).then(() => {
        if (muteBtn) {
          muteBtn.innerHTML = vid.muted ? ICONS.volOff : ICONS.volOn;
          muteBtn.title = vid.muted ? 'Unmute' : 'Mute';
        }
      });
    }
    if (ppBtn && vid) ppBtn.addEventListener('click', () => { vid.paused ? vid.play() : vid.pause(); });
    if (muteBtn && vid) muteBtn.addEventListener('click', () => {
      vid.muted = !vid.muted;
      muteBtn.innerHTML = vid.muted ? ICONS.volOff : ICONS.volOn;
      muteBtn.title = vid.muted ? 'Unmute' : 'Mute';
    });
    if (prog && vid) {
      prog.addEventListener('mousedown', e => { e.stopPropagation(); prog._dragging = true; });
      prog.addEventListener('mouseup',   () => { prog._dragging = false; });
      prog.addEventListener('input', () => {
        const t = +prog.value;
        vid.currentTime = t;
        if (ctTime) ctTime.textContent = `${this._fmtDurS(t)} / ${this._fmtDurS(clipDur)}`;
        if (dlTime) dlTime.textContent = this._time(start + t);
      });
    }
    if (dlBtn && vid) dlBtn.addEventListener('click', () => {
      const offset = Math.floor(vid.currentTime);
      this._downloadRecRange(start + offset, e);
    });
  }
  // Toggle seek bar for a recording row
  _toggleRecSeek(row) {
    // Capture rs/re directly from this specific row's dataset — no shared state
    const rs = +row.dataset.rs;
    const re = +row.dataset.re;
    const existing = row.querySelector('.rec-seek-wrap');
    if (existing) {
      // Second click: close the seek bar, leave the video playing as-is
      existing.remove();
      return;
    }
    // First click: show seek bar and start playing from beginning immediately
    const d = Math.max(1, re - rs);
    const wrap = document.createElement('div');
    wrap.className = 'rec-seek-wrap';
    // Helper: offset seconds → absolute wall-clock label
    const toTime = v => new Date((rs + v) * 1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'});
    wrap.innerHTML = `<div class="rec-seek-row">
      <input type="range" class="rec-seek-bar" min="0" max="${d}" value="0" step="1">
      <span class="rec-seek-lbl">▶ ${this._time(rs)}</span>
    </div>`;
    row.querySelector('.rinf').appendChild(wrap);
    const bar = wrap.querySelector('.rec-seek-bar');
    const lbl = wrap.querySelector('.rec-seek-lbl');
    // Update label while dragging (no video load)
    bar.addEventListener('input', ev => { ev.stopPropagation(); lbl.textContent = `▶ ${toTime(+bar.value)}`; });
    // Load video at seeked position on mouse-up/touch-end
    bar.addEventListener('change', ev => {
      ev.stopPropagation();
      const offset = +bar.value;
      this._showRecording(rs, re, offset > 0 ? rs + offset : rs);
    });
    // Play from start immediately so user sees something while positioning the bar
    this._showRecording(rs, re);
  }
  async _signed(path) { try { const r=await this._hass.callWS({type:'auth/sign_path',path,expires:3600}); return r?.path||path; } catch(_) { return path; } }
  // Recursively find a <video>, piercing open shadow roots (e.g. ha-camera-stream
  // renders its <video> inside its own shadow DOM, invisible to plain querySelector).
  _findVideo(root, depth) {
    if (!root || depth > 6) return null;
    if (root.tagName === 'VIDEO') return root;
    const direct = root.querySelector?.('video');
    if (direct) return direct;
    const all = root.querySelectorAll ? root.querySelectorAll('*') : [];
    for (const node of all) {
      if (node.shadowRoot) {
        const v = this._findVideo(node.shadowRoot, (depth||0) + 1);
        if (v) return v;
      }
    }
    return null;
  }
  _exitFullscreen() {
    if (!(document.fullscreenElement || document.webkitFullscreenElement)) return;
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (exit) { const p = exit.call(document); if (p?.catch) p.catch(() => {}); }
  }
  _fullscreen(el) {
    if (!el) return;
    // Toggle: a second press leaves fullscreen. Without this the button was a
    // one-way trip and users had to reach for Escape.
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      this._exitFullscreen();
      return;
    }
    // iPhone Safari/WKWebView: Element.requestFullscreen may exist as a function
    // but silently no-ops/rejects — document.fullscreenEnabled is the real signal.
    // Only native fullscreen on the <video> element itself works there.
    const fsEnabled = document.fullscreenEnabled || document.webkitFullscreenEnabled;
    if (!fsEnabled) {
      const vid = this._findVideo(el, 0);
      if (vid && typeof vid.webkitEnterFullscreen === 'function') { vid.webkitEnterFullscreen(); return; }
    }
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req) { const p = req.call(el); if (p?.catch) p.catch(() => {}); }
  }
  _goNow() { const now=Math.floor(Date.now()/1000); this._winEnd=now; this._winStart=now-this._config.window_hours*3600; this._exhausted=false; this._calMonth=null; this._loadWindow(true); }
  _download(id,file) { const a=document.createElement('a'); a.href=this._media(id,file,true); a.download=`${this._cc().cam}_${id}_${file}`; document.body.appendChild(a); a.click(); a.remove(); }

  // ── favorites (realtime) ──────────────────────────────────
  _toggleFav(id) {
    const ev=this._events.find(e=>e.id===id); if(!ev) return;
    const next=!ev.retain_indefinitely;
    ev.retain_indefinitely=next;
    if (next) { if(!this._kept.find(e=>e.id===id)) this._kept=[{...ev},...this._kept]; }
    else { this._kept=this._kept.filter(e=>e.id!==id); }
    const ent=this._activeCam?.entity; if(ent&&this._camCache[ent]) this._camCache[ent].kept=this._kept;
    this._renderList(); this._renderLatest();
    const {clientId}=this._cc();
    this._hass.callWS({type:'frigate/event/retain',instance_id:clientId,event_id:id,retain:next})
      .catch(err=>{
        ev.retain_indefinitely=!next;
        if(next) this._kept=this._kept.filter(e=>e.id!==id);
        else if(!this._kept.find(e=>e.id===id)) this._kept=[{...ev},...this._kept];
        this._renderList();
        console.warn('[Frigate] retain failed',err);
        this._toast('Could not save — check Frigate port config.');
      });
  }
  async _markAll() {
    const ids=this._reviews.filter(r=>!r.has_been_reviewed).map(r=>r.id); if(!ids.length) return;
    const {clientId}=this._cc();
    try { await this._hass.callWS({type:'frigate/reviews/viewed',instance_id:clientId,ids,viewed:true}); this._reviews.forEach(r=>r.has_been_reviewed=true); this._renderList(); }
    catch(e) { console.warn(e); }
  }
  async _markReviewed(id) {
    const {clientId}=this._cc();
    try { await this._hass.callWS({type:'frigate/reviews/viewed',instance_id:clientId,ids:[id],viewed:true}); const r=this._reviews.find(x=>x.id===id); if(r) r.has_been_reviewed=true; this._renderList(); }
    catch(e) { console.warn(e); }
  }

  // ── browse / filter ───────────────────────────────────────
  _applyBrowse() {
    const card = this.shadowRoot.querySelector('.card');
    const isWide = card?.classList.contains('wide');
    const isGrid = card?.classList.contains('grid-mode');
    const b=this.shadowRoot.querySelector('#browse'); const c=this.shadowRoot.querySelector('#chev2');
    // Wide: always open. Narrow grid: open by default but collapsable via toggle.
    const forceOpen = isWide;
    if (b) b.style.display=(forceOpen||this._browseOpen)?'block':'none';
    if (c) c.style.transform=(forceOpen||this._browseOpen)?'rotate(180deg)':'';
  }
  _toggleBrowse() { this._browseOpen=!this._browseOpen; this._applyBrowse(); }
  _toast(msg,ms=3500) {
    const t=this.shadowRoot.querySelector('#toast'); if(!t) return;
    t.textContent=msg; t.style.display='block';
    clearTimeout(this._toastT); this._toastT=setTimeout(()=>{ t.style.display='none'; },ms);
  }
  _toggleFilter() { const p=this.shadowRoot.querySelector('#filter-panel'); const open=p.style.display==='none'; this.shadowRoot.querySelector('#cal-panel').style.display='none'; p.style.display=open?'block':'none'; if(open) this._renderFilter(); }
  _toggleCal() { const p=this.shadowRoot.querySelector('#cal-panel'); const open=p.style.display==='none'; this.shadowRoot.querySelector('#filter-panel').style.display='none'; p.style.display=open?'block':'none'; if(open){ this._calMonth=this._calMonth||new Date(this._winEnd*1000); this._renderCal(); } }

  // ── calendar ──────────────────────────────────────────────
  _calNav(d) { const m=this._calMonth||new Date(); m.setMonth(m.getMonth()+d); this._calMonth=new Date(m); this._renderCal(); }
  _pickDay(ds) {
    const [y,mo,da]=ds.split('-').map(Number);
    this._winStart=Math.floor(new Date(y,mo-1,da,0,0,0).getTime()/1000);
    this._winEnd=Math.min(Math.floor(new Date(y,mo-1,da,23,59,59).getTime()/1000),Math.floor(Date.now()/1000));
    this.shadowRoot.querySelector('#cal-panel').style.display='none'; this._loadWindow(true);
  }
  _renderCal() {
    const p=this.shadowRoot.querySelector('#cal-panel'); if(!p) return;
    const m=this._calMonth||new Date(); const y=m.getFullYear(),mo=m.getMonth();
    const first=new Date(y,mo,1); const startDow=(first.getDay()+6)%7; const days=new Date(y,mo+1,0).getDate();
    let cells=''; for(let i=0;i<startDow;i++) cells+='<span></span>';
    for(let d=1;d<=days;d++){
      const ds=`${y}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      cells+=`<button class="cday" data-cal-day="${ds}">${d}${this._daysWithActivity.has(ds)?'<i class="cdot"></i>':''}</button>`;
    }
    p.innerHTML=`<div class="cal-head"><button data-cal-nav="-1">‹</button><b>${m.toLocaleDateString([],{month:'long',year:'numeric'})}</b><button data-cal-nav="1">›</button></div>
      <div class="cal-dow"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>
      <div class="cal-grid">${cells}</div>`;
  }
  _renderFilter() {
    const p=this.shadowRoot.querySelector('#filter-panel'); if(!p) return;
    const lbls=['all',...this._labels()]; const zones=['all',...this._zones()];
    const chip=(val,cur,attr)=>`<button class="chip ${val===cur?'on':''}" data-${attr}="${val}">${val==='all'?'All':cap(val)}</button>`;
    p.innerHTML=`<div class="frow"><span class="frow-l">Label</span>${lbls.map(l=>chip(l,this._filterLabel,'flabel')).join('')}</div>
      <div class="frow"><span class="frow-l">Zone</span>${zones.map(z=>chip(z,this._filterZone,'fzone')).join('')}</div>
      <div class="frow"><span class="frow-l">Show</span>
        <button class="chip ${!this._favOnly?'on':''}" data-favonly="0">All</button>
        <button class="chip ${this._favOnly?'on':''}" data-favonly="1">★ Favorites</button></div>`;
  }

  // ── scrub / scroll ────────────────────────────────────────
  _wireScrub() {
    const track=this.shadowRoot.querySelector('#tl-track'); if(!track) return;
    let drag=false,sx=0,sws=0,swe=0;
    const dn=x=>{drag=true;sx=x;sws=this._winStart;swe=this._winEnd;track.classList.add('grab');};
    const mv=x=>{if(!drag)return;const w=track.clientWidth||1;const sp=swe-sws;const sh=Math.round((x-sx)/w*sp);let ns=sws-sh,ne=swe-sh;const now=Math.floor(Date.now()/1000);if(ne>now){const a=ne-now;ne-=a;ns-=a;}this._winStart=ns;this._winEnd=ne;this._renderTimeline();this._renderRange();};
    const up=()=>{if(!drag)return;drag=false;track.classList.remove('grab');this._loadWindow(true);};
    track.addEventListener('mousedown',e=>{e.preventDefault();dn(e.clientX);});
    window.addEventListener('mousemove',e=>mv(e.clientX));
    window.addEventListener('mouseup',up);
    track.addEventListener('touchstart',e=>dn(e.touches[0].clientX),{passive:true});
    track.addEventListener('touchmove',e=>mv(e.touches[0].clientX),{passive:true});
    track.addEventListener('touchend',up);
    track.addEventListener('wheel',e=>{
      e.preventDefault();
      const rect=track.getBoundingClientRect();const frac=Math.min(1,Math.max(0,(e.clientX-rect.left)/rect.width));
      const span=this._winEnd-this._winStart;const now=Math.floor(Date.now()/1000);
      const horiz=e.shiftKey||Math.abs(e.deltaX)>Math.abs(e.deltaY);
      let ns,ne;
      if(horiz){const delta=e.deltaX||e.deltaY;const shift=Math.round(delta/rect.width*span);ns=this._winStart+shift;ne=this._winEnd+shift;}
      else{const anch=this._winStart+span*frac;const f=e.deltaY>0?1.25:0.8;let nsp=Math.round(span*f);nsp=Math.max(300,Math.min(14*DAY,nsp));ns=Math.round(anch-nsp*frac);ne=ns+nsp;}
      if(ne>now){const a=ne-now;ne-=a;ns-=a;}
      this._winStart=ns;this._winEnd=ne;this._exhausted=false;
      this._renderTimeline();this._renderRange();
      clearTimeout(this._wt);this._wt=setTimeout(()=>this._loadWindow(true),350);
    },{passive:false});
  }
  _wireScroll() {
    const list=this.shadowRoot.querySelector('#list'); if(!list) return;
    list.addEventListener('scroll',()=>{if(this._loading||this._exhausted)return;if(list.scrollTop+list.clientHeight>=list.scrollHeight-40)this._loadOlder();});
  }
  async _loadOlder() {
    const before=this._events.length?Math.floor(Math.min(...this._events.map(e=>e.start_time))):this._winStart;
    this._loading=true; const {clientId,cam}=this._cc();
    try{
      const older=await this._ws({type:'frigate/events/get',instance_id:clientId,cameras:[cam],before,limit:50});
      const arr=Array.isArray(older)?older.filter(o=>!this._events.some(e=>e.id===o.id)):[];
      if(!arr.length)this._exhausted=true; else{this._events=this._events.concat(arr);this._winStart=Math.min(this._winStart,...arr.map(e=>e.start_time));}
    }catch(_){}
    this._loading=false; this._renderList();this._renderTimeline();this._renderRange();
  }

  // ── render ────────────────────────────────────────────────
  _syncStatus() {
    const ent=this._hass?.states?.[this._activeCam?.entity]; if(!ent) return;
    const dot=this._$('#on-dot'),lbl=this._$('#on-lbl'),title=this._$('#info-title');
    const ok=ent.state!=='unavailable';
    if(dot) dot.style.color=ok?'#4ade80':'#ef4444';
    if(lbl) lbl.textContent=ok?'Online':'Offline';
    if(title) {
      const c=this._activeCam; const n=this._config.title||(this._config.cameras.length>1?cap(camDisplayName(c)):'Camera');
      title.textContent=n;
    }
  }
  // Cached querySelector — avoids repeated DOM lookups on every render tick
  _$(sel) { return this._domCache[sel] || (this._domCache[sel] = this.shadowRoot.querySelector(sel)); }

  _renderAll() { this._renderStats();this._renderLatest();this._renderTimeline();this._renderLegend();this._renderRange();this._renderList();this._syncStatus();this._renderCamSwitcher();if(this._cardWidth>=560)this._syncColHeight(); }
  _renderStats() { const el=this._$('#ev-count'); if(el) el.textContent=String(this._allDisplayEvents().length); }
  _renderRange() {
    const el=this._$('#tl-range'); if(!el) return;
    const span=this._winEnd-this._winStart; const fmt=t=>new Date(t*1000).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    if(span<=DAY+60) el.textContent=`${new Date(this._winEnd*1000).toLocaleDateString([],{day:'2-digit',month:'short'})} · ${fmt(this._winStart)}–${this._isNowWindow()?'now':fmt(this._winEnd)}`;
    else el.textContent=`${new Date(this._winStart*1000).toLocaleDateString([],{day:'2-digit',month:'short'})} – ${this._isNowWindow()?'now':new Date(this._winEnd*1000).toLocaleDateString([],{day:'2-digit',month:'short'})}`;
  }
  _renderLegend() {
    const el=this._$('#legend'); if(!el) return;
    const labels=this._labels();
    let html=labels.map(l=>`<span class="lg"><i style="background:${labelColor(l)}"></i>${cap(l)}</span>`).join('');
    if (this._eventsMode==='all') {
      this._config.cameras.forEach((c,i)=>{ html+=`<span class="lg"><i style="background:${CAM_COLORS[i%CAM_COLORS.length].replace('.5','1').replace('rgba','rgb').replace(',1)',')')}"></i>${cap(camDisplayName(c))} rec</span>`; });
    } else {
      html+=`<span class="lg"><i style="background:${CAM_COLORS[0].replace('.5','1').replace('rgba','rgb').replace(',1)',')')}"></i>Rec</span>`;
    }
    el.innerHTML=html;
  }

  // ── latest event (always visible, compact, no toggle) ─────
  _renderLatest() {
    const row=this._$('#latest-row'); if(!row) return;
    const events=this._allDisplayEvents();
    if(!events.length||this._viewMode==='grid'){ row.style.display='none'; return; }
    row.style.display='block';
    row.innerHTML=`<div class="latest-label"><span class="section-label">Latest event</span></div>
      <div class="latest-body">${this._eventCardHTML(events[0],false,true)}</div>`;
  }

  _time(ts) { return new Date(ts*1000).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}); }
  _dur(ev) { return Math.max(1,Math.round((ev.end_time||Date.now()/1000)-ev.start_time)); }
  _zones() { const z=new Set(); this._allDisplayEvents().forEach(e=>(e.zones||[]).forEach(x=>z.add(x))); return [...z]; }
  _labels() { const l=new Set(); this._allDisplayEvents().forEach(e=>e.label&&l.add(e.label)); return [...l]; }
  _filtered() {
    let list=this._allDisplayEvents();
    if(this._tab==='clips') list=list.filter(e=>e.has_clip);
    else if(this._tab==='snapshot') list=list.filter(e=>e.has_snapshot);
    if(this._filterLabel!=='all') list=list.filter(e=>e.label===this._filterLabel);
    if(this._filterZone!=='all') list=list.filter(e=>(e.zones||[]).includes(this._filterZone));
    if(this._favOnly) list=list.filter(e=>e.retain_indefinitely);
    return list;
  }
  _mergeRecs(recs) {
    if(!recs.length) return [];
    const segs=[...recs].sort((a,b)=>a.start_time-b.start_time); const out=[]; let cur={...segs[0]};
    for(let i=1;i<segs.length;i++){const s=segs[i];const ce=cur.end_time||cur.start_time;if(s.start_time-ce<=60){cur.end_time=Math.max(ce,s.end_time||s.start_time);cur.events=(cur.events||0)+(s.events||0);}else{out.push(cur);cur={...s};}}
    out.push(cur); return out;
  }

  _renderTimeline() {
    const track=this._$('#tl-track'),labels=this._$('#tl-labels'); if(!track) return;
    const s=this._winStart,e=this._winEnd,span=Math.max(1,e-s); let html='';

    if (this._eventsMode==='all') {
      // Per-camera coloured recording bars
      this._config.cameras.forEach((c,ci)=>{
        const cc=this._camCache[c.entity]; if(!cc) return;
        const col=CAM_COLORS[ci%CAM_COLORS.length];
        for(const r of this._mergeRecs(cc.recordings||[])){const a=r.start_time,b=r.end_time||e;if(b<s||a>e)continue;const left=(Math.max(a,s)-s)/span*100;const w=Math.max(0.3,(Math.min(b,e)-Math.max(a,s))/span*100);html+=`<div class="t-rec" style="left:${left}%;width:${w}%;background:${col}"></div>`;}
      });
    } else {
      for(const r of this._mergeRecs(this._recordings)){const a=r.start_time,b=r.end_time||e;if(b<s||a>e)continue;const left=(Math.max(a,s)-s)/span*100;const w=Math.max(0.3,(Math.min(b,e)-Math.max(a,s))/span*100);html+=`<div class="t-rec" style="left:${left}%;width:${w}%"></div>`;}
    }
    for(const ev of this._allDisplayEvents()){if(ev.start_time<s||ev.start_time>e)continue;const left=(ev.start_time-s)/span*100;html+=`<div class="t-ev" data-tick="${ev.id}" style="left:${left}%;background:${labelColor(ev.label)}" title="${cap(ev.label)} ${this._time(ev.start_time)}"></div>`;}
    const nowPct=(Math.min(Math.floor(Date.now()/1000),e)-s)/span*100;
    html+=`<div class="tl-now" style="left:${Math.max(0,Math.min(100,nowPct))}%"></div>`;
    track.innerHTML=html;
    if(labels){let l='';for(let i=0;i<5;i++){const ts=s+span*i/4;l+=`<span>${i===4&&this._isNowWindow()?'now':this._time(ts)}</span>`;}labels.innerHTML=l;}
  }

  _favIcon(ev) { return ev.retain_indefinitely?`<button class="ico fav on" data-fav="${ev.id}">${ICONS.star}</button>`:`<button class="ico fav" data-fav="${ev.id}">${ICONS.starO}</button>`; }

  _eventCardHTML(ev,expanded,compact=false) {
    const col=labelColor(ev.label); const score=ev.top_score!=null?Math.round(ev.top_score*100)+'%':'';
    const zone=ev.zones&&ev.zones.length?ev.zones[0]:''; const subl=ev.sub_label?`<span class="subl">${ev.sub_label}</span>`:'';
    const desc=expanded&&ev.data?.description?`<div class="desc">${ev.data.description}</div>`:'';
    const thumb=ev.has_snapshot||ev.has_clip?`<img src="${this._media(ev.id,'thumbnail.jpg')}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="tph" style="display:none">${ICONS.person}</div>`:`<div class="tph">${ICONS.person}</div>`;
    const badge=ev.has_clip?'<span class="bc">clip</span>':(ev.has_snapshot?'<span class="bs">snap</span>':'');
    const dlClip=ev.has_clip?`<button class="ico" data-dl="${ev.id}" data-dl-file="clip.mp4" title="Download clip">${ICONS.download}</button>`:'';
    const dlSnap=ev.has_snapshot?`<button class="ico" data-dl="${ev.id}" data-dl-file="snapshot.jpg" title="Download snapshot">${ICONS.snapshot}</button>`:'';
    // show camera name in multi-cam all-events mode
    const camLabel=(this._eventsMode==='all'&&this._config.cameras.length>1)?`<span class="cam-badge">${(ev.camera||'').replace(/_/g,' ')}</span>`:'';
    // compact: wrap everything in a tighter layout, actions horizontal
    return `<div class="ec${compact?' compact':''}" data-ev="${ev.id}">
      <div class="et">${thumb}<div class="ed">${this._dur(ev)}s</div></div>
      <div class="ei">
        <div class="etop"><span class="tb" style="background:${col}33;color:${col}">${cap(ev.label)}</span>${subl}${badge}${camLabel}${score?`<span class="esc">${score}</span>`:''}</div>
        <div class="em"><span>${ICONS.clock}${this._time(ev.start_time)}</span>${zone?`<span>${ICONS.pin}${zone}</span>`:''}</div>
        ${desc}
      </div>
      <div class="eact${compact?' h':''}">${this._favIcon(ev)}${dlClip}${dlSnap}</div>
    </div>`;
  }

  _renderList() {
    const list=this._$('#list'); if(!list) return;
    if(this._tab==='recordings') {
      // Don't blow away the recording list (and seek bar) while the user is watching a recording
      const viewerActive = this._$('#viewer')?.style.display !== 'none';
      if (viewerActive && this._playing?.rec != null) return;
      return this._renderRecordings(list);
    }
    if(this._tab==='reviews') return this._renderReviews(list);
    if(this._tab==='kept'){
      if(!this._kept.length){list.innerHTML=`<div class="empty">No kept events<br><span style="opacity:.6">star an event to keep it</span></div>`;return;}
      list.innerHTML=this._kept.map(ev=>this._eventCardHTML(ev,false)).join(''); return;
    }
    const events=this._filtered();
    if(!events.length){list.innerHTML=`<div class="empty">No events in this window</div>`;return;}
    list.innerHTML=events.map(ev=>this._eventCardHTML(ev,false)).join('')+(this._exhausted?'<div class="end">— end —</div>':'<div class="more">scroll for older…</div>');
  }
  _renderRecordings(list) {
    const recs=this._mergeRecs(this._recordings).sort((a,b)=>b.start_time-a.start_time);
    if(!recs.length){list.innerHTML='<div class="empty">No recordings in this window</div>';return;}
    list.innerHTML=recs.map(r=>{
      const rs=Math.floor(r.start_time), re=Math.floor(r.end_time||Date.now()/1000);
      const d=Math.max(1,re-rs); const mm=Math.floor(d/60),ss=d%60;
      const dur=`${mm?mm+'m ':''}${ss}s`;
      const seekHint = d > 300 ? ' <span class="seek-hint">· click to seek</span>' : '';
      return `<div class="rec" data-rs="${rs}" data-re="${re}">
        <div class="ric">${ICONS.recordings}</div>
        <div class="rinf">
          <div class="rt">${this._time(r.start_time)} – ${this._time(r.end_time||Date.now()/1000)}</div>
          <div class="rsub">${dur}${r.events?' · '+r.events+' ev':''}${seekHint}</div>
        </div>
        <div class="rp">▶</div>
      </div>`;
    }).join('');
  }
  _renderReviews(list) {
    if(!this._reviews.length){list.innerHTML='<div class="empty">No reviews in this window</div>';return;}
    const allRevs=[...this._reviews].sort((a,b)=>b.start_time-a.start_time);
    const unrev=allRevs.filter(r=>!r.has_been_reviewed).length;
    const revs=this._showReviewed ? allRevs : allRevs.filter(r=>!r.has_been_reviewed);
    const toggleLbl=this._showReviewed?'Hide reviewed':'Show reviewed';
    const head=`<div class="rev-head"><span>${unrev} to review</span><div style="display:flex;gap:5px;align-items:center">${unrev?`<button class="chip on" data-mark-all>Mark all</button>`:''}<button class="chip" data-toggle-reviewed>${toggleLbl}</button></div></div>`;
    if(!revs.length){list.innerHTML=head+'<div class="empty">Nothing to review ✓</div>';return;}
    list.innerHTML=head+revs.map(r=>{
      const sev=r.severity==='alert'?'alert':'detection';
      const objs=(r.data?.objects||[]).map(cap).join(', ');
      const title=r.data?.metadata?.title||objs||cap(r.severity);
      const firstDet=(r.data?.detections&&r.data.detections[0])||'';
      const reviewed=r.has_been_reviewed;
      const thumb=firstDet?`<div class="rev-th"><img src="${this._media(firstDet,'thumbnail.jpg')}" loading="lazy" onerror="this.parentElement.style.display='none'"></div>`:'';
      return`<div class="rev ${sev}" data-review-id="${r.id}" ${firstDet?`data-review-open="${firstDet}"`:''}><div class="rev-sev ${sev}"></div>${thumb}<div class="rev-inf"><div class="rev-t">${title}</div><div class="rev-m">${this._time(r.start_time)} · ${cap(sev)}${reviewed?' · ✓':firstDet?' · tap':''}</div></div>${reviewed?'':`<button class="ico" data-mark>${ICONS.reviews}</button>`}</div>`;
    }).join('');
  }

  // ── clip download range ───────────────────────────────────
  async _downloadRecRange(dlStart, dlEnd) {
    const {clientId, cam} = this._cc();
    const base = `/api/frigate/${clientId}/recording/${cam}/start/${dlStart}/end/${Math.min(dlEnd, dlStart+7200)}`;
    const signed = await this._signed(base);
    const url = signed + (signed.includes('?') ? '&' : '?') + 'download=true';
    const a = document.createElement('a');
    a.href = url; a.download = `${cam}_${this._time(dlStart).replace(/:/g,'-')}.mp4`;
    document.body.appendChild(a); a.click(); a.remove();
  }
}

// editor.js — FrigateModernHassCardEditor config panel

class FrigateModernHassCardEditor extends HTMLElement {
  setConfig(c) { this._config=c; this._render(); }
  set hass(h) {
    this._hass = h;
    // Only re-render when the camera entity list actually changes — prevents dropdown closing
    const key = this._frigateEntities().join(',');
    if (key !== this._lastEntityKey) { this._lastEntityKey = key; this._render(); }
  }

  _frigateEntities() {
    if (!this._hass) return [];
    return Object.keys(this._hass.states)
      .filter(e => e.startsWith('camera.'))
      .filter(e => {
        const a = this._hass.states[e].attributes;
        return a?.client_id || a?.mqtt_client_id || a?.camera_name; // Frigate-specific attrs
      })
      .sort();
  }

  _render() {
    const frigEntities = this._frigateEntities();
    const allCamEntities = this._hass ? Object.keys(this._hass.states).filter(e=>e.startsWith('camera.')).sort() : [];
    const entityList = frigEntities.length ? frigEntities : allCamEntities;

    const cams = this._config?.cameras
      ? this._config.cameras
      : (this._config?.camera_entity ? [{ entity: this._config.camera_entity, name: '' }] : [{ entity: '', name: '' }]);

    const opts = (sel) => entityList.map(e => `<option value="${e}" ${e===sel?'selected':''}>${e}</option>`).join('');

    const camRows = cams.map((c,i) => `
      <div class="cr" data-row="${i}">
        <select name="cam-entity-${i}" class="ce" data-cam-entity="${i}">
          <option value="">— select camera —</option>
          ${opts(c.entity||'')}
        </select>
        <input type="text" name="cam-name-${i}" class="cn" data-cam-name="${i}" placeholder="Display name (optional)" value="${c.name||''}">
        ${cams.length > 1 ? `<button class="xb" data-remove-cam="${i}" title="Remove">✕</button>` : ''}
      </div>`).join('');

    const hiddenTabs = new Set(this._config?.hidden_tabs || []);
    const tabCheck = (id, label) => `<label class="chk-lbl">
      <input type="checkbox" name="hide-${id}" data-hide-tab="${id}" ${hiddenTabs.has(id)?'checked':''}> ${label}
    </label>`;

    const defaultView = this._config?.default_view || 'single';
    const rotateOnLoad = this._config?.rotate_on_load === true;
    const multiCam = cams.length > 1 || (cams.length === 1 && !cams[0].entity);

    this.innerHTML = `<style>
      .ed-wrap{display:flex;flex-direction:column;gap:14px;padding:6px 2px;font-family:sans-serif;}
      .field-label{font-size:12px;font-weight:600;margin-bottom:4px;display:block;color:#374151;}
      .section{border-top:1px solid #e5e7eb;padding-top:12px;}
      .cr{display:flex;gap:5px;align-items:center;margin-bottom:6px;}
      .ce,.cn{flex:1;padding:7px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;box-sizing:border-box;background:#fff;color:#111;}
      .ce{min-width:0;} .cn{min-width:0;}
      .xb{padding:5px 8px;border:1px solid #f87171;background:#fee2e2;color:#b91c1c;border-radius:6px;cursor:pointer;font-size:12px;flex-shrink:0;}
      .add-btn{padding:6px 12px;border:1px solid #93c5fd;background:rgba(59,130,246,.1);color:#3b82f6;border-radius:7px;cursor:pointer;font-size:12px;margin-top:2px;}
      .tf{width:100%;padding:7px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;box-sizing:border-box;background:#fff;color:#111;}
      .radio-row,.chk-row{display:flex;gap:14px;flex-wrap:wrap;}
      .radio-lbl,.chk-lbl{display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;color:#374151;}
      .chk-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;}
    </style>
    <div class="ed-wrap">
      <div>
        <span class="field-label">Cameras ${frigEntities.length ? '<small style="font-weight:400;color:#6b7280">· Frigate cameras detected</small>' : ''}</span>
        <div id="cam-list">${camRows}</div>
        <button class="add-btn" id="add-cam">+ Add camera</button>
        ${cams.length > 4 ? '<small style="color:#6b7280;font-size:11px;display:block;margin-top:4px">Every camera in the grid streams at once — more cameras means more load on the browser and on Frigate.</small>' : ''}
      </div>

      <label><span class="field-label">Title (optional)</span>
        <input name="title" class="tf" id="title" type="text" value="${this._config?.title||''}" placeholder="My Camera">
      </label>
      <label><span class="field-label">Subtitle</span>
        <input name="subtitle" class="tf" id="subtitle" type="text" value="${this._config?.subtitle||''}" placeholder="Frigate">
      </label>

      <div class="section">
        <span class="field-label">Colors</span>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px;">
          <div>
            <label class="chk-lbl" style="margin-bottom:4px">
              <input type="checkbox" id="use_accent" ${this._config?.accent_color?'checked':''}> Custom accent
            </label>
            <div style="display:flex;align-items:center;gap:6px">
              <input type="color" id="accent_color" value="${this._config?.accent_color||'#3b82f6'}" style="width:40px;height:30px;border:none;padding:2px;border-radius:6px;cursor:pointer">
              <span style="font-size:11px;color:#6b7280" id="accent_lbl">${this._config?.accent_color||'#3b82f6'}</span>
            </div>
          </div>
          <div>
            <label class="chk-lbl" style="margin-bottom:4px">
              <input type="checkbox" id="use_bg" ${this._config?.bg_color?'checked':''}> Custom background
            </label>
            <div style="display:flex;align-items:center;gap:6px">
              <input type="color" id="bg_color" value="${this._config?.bg_color||'#1c2233'}" style="width:40px;height:30px;border:none;padding:2px;border-radius:6px;cursor:pointer">
              <span style="font-size:11px;color:#6b7280" id="bg_lbl">${this._config?.bg_color||'#1c2233'}</span>
            </div>
          </div>
        </div>
        <small style="color:#6b7280;font-size:11px">Check the box to activate. Uncheck to revert to theme default.</small>
      </div>

      <div class="section">
        <span class="field-label">Theme</span>
        <div class="radio-row">
          <label class="radio-lbl"><input type="radio" name="theme" value="dark"  ${(this._config?.theme||'dark')==='dark' ?'checked':''}> Dark</label>
          <label class="radio-lbl"><input type="radio" name="theme" value="light" ${this._config?.theme==='light'?'checked':''}> Light</label>
          <label class="radio-lbl"><input type="radio" name="theme" value="auto"  ${this._config?.theme==='auto' ?'checked':''}> Auto (browser)</label>
        </div>
      </div>

      <div class="section">
        <span class="field-label">View</span>
        <div class="radio-row">
          <label class="radio-lbl"><input type="radio" name="default_view" value="single" ${defaultView==='single'?'checked':''}> Single camera</label>
          <label class="radio-lbl"><input type="radio" name="default_view" value="grid" ${defaultView==='grid'?'checked':''}> Grid (all cams)</label>
        </div>
        <div style="margin-top:8px">
          <label class="chk-lbl"><input type="checkbox" name="rotate_on_load" id="rotate_on_load" ${rotateOnLoad?'checked':''}> Auto-rotate on load</label>
        </div>
        <div style="margin-top:6px">
          <label><span style="font-size:11px;color:#6b7280">Rotate interval (seconds, 0 = use default ${DEFAULT_ROTATE_S}s)</span>
            <input name="rotate_seconds" class="tf" id="rotate_seconds" type="number" value="${this._config?.rotate_seconds??0}" min="0" style="margin-top:3px">
          </label>
        </div>
      </div>

      <div class="section">
        <span class="field-label">Hidden tabs</span>
        <div class="chk-grid">
          ${tabCheck('recordings','Recordings')}
          ${tabCheck('clips','Clips')}
          ${tabCheck('snapshot','Snapshots')}
          ${tabCheck('reviews','Reviews')}
          ${tabCheck('kept','Kept')}
        </div>
      </div>

      <div class="section">
        <span class="field-label">Grid columns</span>
        <div class="radio-row">
          <label class="radio-lbl"><input type="radio" name="grid_columns" value="auto" ${(this._config?.grid_columns||'auto')==='auto'?'checked':''}> Automatic</label>
          <label class="radio-lbl"><input type="radio" name="grid_columns" value="1" ${String(this._config?.grid_columns)==='1'?'checked':''}> 1 (stacked)</label>
          <label class="radio-lbl"><input type="radio" name="grid_columns" value="2" ${String(this._config?.grid_columns)==='2'?'checked':''}> 2</label>
          <label class="radio-lbl"><input type="radio" name="grid_columns" value="3" ${String(this._config?.grid_columns)==='3'?'checked':''}> 3</label>
          <label class="radio-lbl"><input type="radio" name="grid_columns" value="4" ${String(this._config?.grid_columns)==='4'?'checked':''}> 4</label>
        </div>
        <small style="color:#6b7280;font-size:11px">Automatic picks a column count from the number of cameras and the space available. Choose 1 to stack them vertically, which reads better on a phone.</small>
        <div style="margin-top:8px">
          <label class="chk-lbl"><input type="checkbox" name="events_collapsed" id="events_collapsed" ${this._config?.events_collapsed===true?'checked':''}> Start with the events panel hidden</label>
          <small style="color:#6b7280;font-size:11px;display:block">On a wide card the events list sits beside the cameras. Hiding it gives the cameras the full width; a button on the card slides it back in.</small>
        </div>
      </div>

      <div class="section">
        <span class="field-label">Live view provider</span>
        <div class="radio-row">
          <label class="radio-lbl"><input type="radio" name="live_provider" value="hls" ${(this._config?.live_provider||'hls')==='hls'?'checked':''}> Home Assistant stream</label>
          <label class="radio-lbl"><input type="radio" name="live_provider" value="go2rtc" ${this._config?.live_provider==='go2rtc'?'checked':''}> go2rtc — low latency (experimental)</label>
        </div>
        <small style="color:#6b7280;font-size:11px">go2rtc streams via Frigate's built-in WebRTC/MSE for much lower latency. Falls back to the Home Assistant stream automatically if it can't connect.</small>
        <div style="margin-top:8px">
          <span class="field-label">go2rtc transport</span>
          <div class="radio-row">
            <label class="radio-lbl"><input type="radio" name="go2rtc_mode" value="mse" ${(this._config?.go2rtc_mode||'mse')==='mse'?'checked':''}> MSE (recommended)</label>
            <label class="radio-lbl"><input type="radio" name="go2rtc_mode" value="webrtc" ${this._config?.go2rtc_mode==='webrtc'?'checked':''}> WebRTC only</label>
            <label class="radio-lbl"><input type="radio" name="go2rtc_mode" value="auto" ${this._config?.go2rtc_mode==='auto'?'checked':''}> Automatic</label>
          </div>
          <small style="color:#6b7280;font-size:11px">MSE runs entirely over the proxied connection, so it works remotely and in the companion apps. WebRTC can be marginally faster but connects directly to go2rtc, which usually only resolves on the local network.</small>
        </div>
      </div>

      <div class="section">
        <span class="field-label">Stream height limit (vh)</span>
        <input name="stream_height" class="tf" id="stream_height" type="number"
          value="${this._config?.stream_height||''}" min="20" max="100"
          placeholder="70 = grid default, blank = auto">
        <small style="color:#6b7280;font-size:11px">Grid view defaults to 70vh. Set here to override for both views.</small>
      </div>

      <div class="section">
        <span class="field-label">Window hours</span>
        <input name="window_hours" class="tf" id="window_hours" type="number" value="${this._config?.window_hours||24}" min="1" max="720">
      </div>

    </div>`;

    this.querySelector('#add-cam')?.addEventListener('click', () => {
      const cur = this._getCams(); cur.push({ entity:'', name:'' });
      this._config = { ...this._config, cameras: cur }; delete this._config.camera_entity; this._render(); this._dispatch();
    });
    this.querySelectorAll('[data-remove-cam]').forEach(b => b.addEventListener('click', e => {
      const cur = this._getCams(); cur.splice(Number(e.currentTarget.dataset.removeCam), 1);
      this._config = { ...this._config, cameras: cur }; delete this._config.camera_entity; this._render(); this._dispatch();
    }));
    this.querySelectorAll('select,input').forEach(el => el.addEventListener('change', () => this._u()));
    // prevent click outside from closing select while user is choosing
    this.querySelectorAll('select').forEach(sel => sel.addEventListener('mousedown', e => e.stopPropagation()));
    // sync color picker label as user drags
    ['accent','bg'].forEach(key => {
      const picker = this.querySelector(`#${key}_color`);
      const lbl    = this.querySelector(`#${key}_lbl`);
      if (picker && lbl) picker.addEventListener('input', () => { lbl.textContent = picker.value; });
    });
  }

  _getCams() {
    const rows = [...this.querySelectorAll('[data-row]')];
    return rows.map(r => ({
      entity: r.querySelector('[data-cam-entity]')?.value || '',
      name: r.querySelector('[data-cam-name]')?.value || '',
    }));
  }
  _u() {
    const g = id => this.querySelector('#'+id)?.value?.trim() || '';
    const cams = this._getCams().filter(c => c.entity);
    const c = { ...this._config };
    if (cams.length > 1) { c.cameras = cams; delete c.camera_entity; }
    else if (cams.length === 1) { c.camera_entity = cams[0].entity; delete c.cameras; }
    const t=g('title'),s=g('subtitle'),w=g('window_hours'),r=g('rotate_seconds');
    if(t) c.title=t; else delete c.title;
    if(s) c.subtitle=s; else delete c.subtitle;
    if(w) c.window_hours=Number(w);
    c.rotate_seconds = Number(r)||0;
    // custom colors
    c.accent_color = this.querySelector('#use_accent')?.checked
      ? (this.querySelector('#accent_color')?.value || null) : null;
    c.bg_color = this.querySelector('#use_bg')?.checked
      ? (this.querySelector('#bg_color')?.value || null) : null;
    // theme
    c.theme = this.querySelector('input[name="theme"]:checked')?.value || 'dark';
    // default view
    const dv = this.querySelector('input[name="default_view"]:checked')?.value || 'single';
    c.default_view = dv;
    // rotate on load
    c.rotate_on_load = this.querySelector('#rotate_on_load')?.checked === true;
    // hidden tabs
    const hidden = [...this.querySelectorAll('[data-hide-tab]')]
      .filter(el => el.checked).map(el => el.dataset.hideTab);
    c.hidden_tabs = hidden.length ? hidden : [];
    const sh = this.querySelector('#stream_height')?.value;
    c.stream_height = sh ? Number(sh) : null;
    c.events_collapsed = this.querySelector('#events_collapsed')?.checked === true;
    const gc = this.querySelector('input[name="grid_columns"]:checked')?.value || 'auto';
    c.grid_columns = gc === 'auto' ? 'auto' : Number(gc);
    c.live_provider = this.querySelector('input[name="live_provider"]:checked')?.value === 'go2rtc' ? 'go2rtc' : 'hls';
    c.go2rtc_mode = this.querySelector('input[name="go2rtc_mode"]:checked')?.value || 'mse';
    this._config=c; this._dispatch();
  }
  _dispatch() { this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:this._config}})); }
}

// index.js — registers custom elements and announces card to HA

if (!customElements.get(CARD_TAG))
  customElements.define(CARD_TAG, FrigateModernHassCard);
if (!customElements.get(CARD_TAG + '-editor'))
  customElements.define(CARD_TAG + '-editor', FrigateModernHassCardEditor);

window.customCards = window.customCards || [];
if (!window.customCards.find(c => c.type === CARD_TAG))
  window.customCards.push({
    type: CARD_TAG,
    name: 'Frigate Modern Hass Card',
    description: `Multi-camera Frigate NVR card — v${VERSION}`,
    preview: true,
  });

console.info(
  `%c FRIGATE-MODERN-HASS-CARD %c v${VERSION} `,
  'color:#fff;background:#1d4ed8;padding:2px 4px;border-radius:3px 0 0 3px;font-weight:bold',
  'color:#1d4ed8;background:#dbeafe;padding:2px 4px;border-radius:0 3px 3px 0'
);
