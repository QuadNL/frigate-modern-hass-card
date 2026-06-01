// styles.js — card CSS
// ── styles ───────────────────────────────────────────────────
export const STYLES = `
  :host{display:block;}
  .card{background:var(--c-bg);color:var(--c-text);overflow:hidden;border-radius:var(--ha-card-border-radius,18px);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
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
  /* Wide: always row — both single-cam and grid share this layout */
  .card.wide .layout{flex-direction:row;align-items:flex-start;}
  .card.wide .col-left{width:62%;flex-shrink:0;}
  .card.wide .col-right{flex:1;min-width:0;overflow-y:auto;max-height:85vh;border-left:1px solid var(--c-border);position:sticky;top:0;display:flex;flex-direction:column;}
  .card.wide .browse-toggle{display:none;}
  .card.wide .browse{display:block!important;}
  /* Narrow grid mode: stack but show the grid */
  .card:not(.wide).grid-mode .browse{display:block!important;}
  .card:not(.wide).grid-mode .browse-toggle{display:none!important;}

  /* ── feed area ── */
  .feed-area{position:relative;width:100%;}
  #eng-wrap{position:relative;width:100%;aspect-ratio:16/9;background:var(--c-bg-deep);overflow:hidden;}
  #engine{position:absolute;inset:0;}
  #engine ha-camera-stream,#engine ha-hls-player{width:100%;height:100%;display:block;}
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
  .cam-grid{display:grid;width:100%;}
  .cam-grid.cams-1{grid-template-columns:1fr;}
  .cam-grid.cams-2{grid-template-columns:1fr 1fr;}
  .cam-grid.cams-3,.cam-grid.cams-4{grid-template-columns:1fr 1fr;}
  .grid-slot{position:relative;aspect-ratio:16/9;background:var(--c-bg-deep);overflow:hidden;cursor:pointer;transition:box-shadow .15s;}
  .grid-slot:hover{box-shadow:inset 0 0 0 2px rgba(59,130,246,.5);}
  .grid-slot.placeholder{background:#06090f;cursor:default;}
  .grid-slot.placeholder:hover{box-shadow:none;}
  .grid-slot ha-camera-stream{width:100%;height:100%;display:block;}
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
  .cam-grid:fullscreen.cams-3,.cam-grid:fullscreen.cams-4,.cam-grid:-webkit-full-screen.cams-3,.cam-grid:-webkit-full-screen.cams-4{grid-template-rows:1fr 1fr;}
  .grid-label{position:absolute;bottom:4px;left:6px;font-size:10px;font-weight:600;color:rgba(255,255,255,.85);text-shadow:0 1px 2px rgba(0,0,0,.8);background:rgba(0,0,0,.45);padding:1px 7px;border-radius:10px;pointer-events:none;z-index:2;}
  /* 3/4-cam grid: cap height so 2 rows fit viewport */
  .card.grid-mode .cam-grid.cams-3,
  .card.grid-mode .cam-grid.cams-4 { max-height:var(--stream-h,70vh); grid-template-rows:1fr 1fr; }
  .card.grid-mode .cam-grid.cams-3 .grid-slot,
  .card.grid-mode .cam-grid.cams-4 .grid-slot { aspect-ratio:unset; min-height:0; }
  /* Single stream: optional height cap */
  #eng-wrap { max-height:var(--stream-h,none); }
  /* Mobile grid: show 2×2 at same total height as a single stream (56.25vw = 16:9) */
  .card.mobile .cam-grid { max-height:56.25vw; }
  .card.mobile .cam-grid .grid-slot { aspect-ratio:unset; min-height:0; }

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
  /* In wide mode the right column scrolls as a whole — remove the inner cap so
     the list fills all available height instead of leaving dead space below. */
  .card.wide .list-sec{flex:1;display:flex;flex-direction:column;padding-bottom:6px;}
  .card.wide .list{flex:1;max-height:none;overflow-y:visible;}
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
