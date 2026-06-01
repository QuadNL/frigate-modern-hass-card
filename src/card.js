// card.js — main FrigateModernHassCard custom element
import { VERSION, CARD_TAG, DAY, DEFAULT_ROTATE_S, ICONS, cap, parseWs,
         labelColor, CAM_COLORS, mkCamState, camDisplayName } from './constants.js';
import { STYLES } from './styles.js';

export class FrigateModernHassCard extends HTMLElement {
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
    this._winEnd = 0; this._winStart = 0;
    this._loading = false; this._exhausted = false;
    this._daysWithActivity = new Set();
    this._filterLabel = 'all'; this._filterZone = 'all'; this._favOnly = false;
    this._calMonth = null;
    this._engine = null; this._unsub = null;
    this._rotateTimer = null; this._cardWidth = 0;
    this._playSeq = 0;
    this._streamMuted = true; // start muted; user can toggle via our mute button
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
    if (cameras.length > 4) cameras = cameras.slice(0, 4);

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
    };
    this._browseOpen = this._config.browse_expanded;
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

  disconnectedCallback() {
    this._stopRotate();
    if (this._refresh) clearInterval(this._refresh);
    if (this._unsub) { try { this._unsub.then(u=>u&&u()); } catch(_) {} this._unsub=null; }
    if (this._ro) this._ro.disconnect();
  }

  // ── init ─────────────────────────────────────────────────
  async _start() {
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
    this._setupResizeObserver();
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
    slot.innerHTML = '<div class="ph"><div class="ph-spin"></div></div>';
    this._engine = null;
    const stateObj = this._hlsStateObj(entity);
    if (!stateObj) return;
    const s = document.createElement('ha-camera-stream');
    s.hass = this._hass;
    s.stateObj = stateObj;
    s.controls = false; // we provide our own control bar
    s.muted = this._streamMuted;
    s.style.cssText = 'width:100%;height:100%;display:block';
    slot.innerHTML = ''; slot.appendChild(s);
    this._engine = s;
    this._renderStreamCtrl();
  }

  // ── camera grid ───────────────────────────────────────────
  async _mountGrid() {
    const grid = this.shadowRoot.querySelector('#cam-grid'); if (!grid) return;
    const n = this._config.cameras.length;
    const slots = n === 3 ? 4 : n;   // 3 cams → 4 slots, last is placeholder
    grid.className = `cam-grid cams-${n}`;
    grid.innerHTML = '';
    for (let i = 0; i < slots; i++) {
      const slot = document.createElement('div');
      const isPlaceholder = i >= n;
      slot.className = `grid-slot${isPlaceholder ? ' placeholder' : ''}`;
      if (!isPlaceholder) {
        const c = this._config.cameras[i];
        const name = cap(camDisplayName(c));
        // stream
        const stateObj = this._hlsStateObj(c.entity);
        if (stateObj) {
          const s = document.createElement('ha-camera-stream');
          s.hass = this._hass; s.stateObj = stateObj; s.controls = false; s.muted = true;
          s.style.cssText = 'width:100%;height:100%;display:block;pointer-events:none';
          slot.appendChild(s);
        }
        // label
        const lbl = document.createElement('div');
        lbl.className = 'grid-label'; lbl.textContent = name;
        slot.appendChild(lbl);
        // click → set as active cam for the events list; stay in grid
        // guard: buttons inside the slot handle their own action; don't also switch camera
        slot.addEventListener('click', ev => {
          if (ev.target.closest('.grid-fs-btn,.grid-close-btn,[data-restore-slot]')) return;
          this._switchCamera(i); this._renderCamSwitcher();
        });
        // per-slot fullscreen button (appears on hover)
        const fsBtn = document.createElement('button');
        fsBtn.className = 'grid-fs-btn'; fsBtn.title = 'Fullscreen';
        fsBtn.innerHTML = ICONS.expand;
        fsBtn.addEventListener('click', ev => { ev.stopPropagation(); this._fullscreen(slot); });
        slot.appendChild(fsBtn);
      }
      grid.appendChild(slot);
    }
  }

  // ── custom stream controls ────────────────────────────────
  _renderStreamCtrl() {
    const bar = this.shadowRoot.querySelector('#stream-ctrl-bar'); if (!bar) return;
    const inGrid = this._viewMode === 'grid';
    const muteBtn = !inGrid
      ? `<button class="scb-btn" id="sc-mute" title="${this._streamMuted ? 'Unmute' : 'Mute'}">${this._streamMuted ? ICONS.volOff : ICONS.volOn}</button>`
      : '';
    bar.innerHTML = `${muteBtn}<button class="scb-btn" id="sc-fs" title="Fullscreen">${ICONS.expand}</button>`;
  }
  _toggleStreamMute() {
    this._streamMuted = !this._streamMuted;
    if (this._engine) this._engine.muted = this._streamMuted;
    this._renderStreamCtrl();
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
    this._wireScrub(); this._wireScroll(); this._applyBrowse();
    if (multiCam) this._renderCamSwitcher();
    this._applyCardStyle();
  }

  _applyCardStyle() {
    const card = this.shadowRoot.querySelector('.card'); if (!card) return;

    // Stream height
    const vh = this._config.stream_height;
    card.style.setProperty('--stream-h', vh ? `${vh}vh` : '');

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
    this._ro = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width;
      this._cardWidth = w;
      const card = this.shadowRoot.querySelector('.card');
      if (!card) return;
      const wide = w >= 700, mobile = w < 500;
      card.classList.toggle('wide', wide);
      card.classList.toggle('mobile', mobile);
      this._applyBrowse();
    });
    this._ro.observe(this);
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
    if (e.target.closest('#sc-mute')) return this._toggleStreamMute();
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
    if (restoreSlot) { e.stopPropagation(); this._mountGrid(); return; }
    // per-slot fullscreen (from innerHTML-created button in _openInGridSlot)
    const slotFs = e.target.closest('[data-slot-fs]');
    if (slotFs) { e.stopPropagation(); this._fullscreen(slotFs.closest('.grid-slot')); return; }
    // whole-grid fullscreen
    const gridFs = e.target.closest('[data-grid-fs]');
    if (gridFs) { e.stopPropagation(); this._fullscreen(this.shadowRoot.querySelector('#cam-grid')); return; }
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
  // Play clip/snapshot inside the matching grid slot (stays in grid mode)
  _openInGridSlot(id) {
    const ev = this._allDisplayEvents().find(e => e.id === id);
    if (!ev) return;
    const camIdx = this._config.cameras.findIndex(c => {
      const cc = this._camCache[c.entity]; return cc && cc.cam === ev.camera;
    });
    const grid = this.shadowRoot.querySelector('#cam-grid');
    const slots = grid?.querySelectorAll('.grid-slot:not(.placeholder)');
    const slot = slots?.[camIdx < 0 ? 0 : camIdx];
    if (!slot) { this._open(id); return; } // fallback to single view

    const isSnap = this._tab === 'snapshot' || (!ev.has_clip && ev.has_snapshot);
    const camName = cap((ev.camera||'').replace(/_/g,' '));
    if (isSnap) {
      slot.innerHTML = `
        <img src="${this._media(ev.id,'snapshot.jpg')}" style="width:100%;height:100%;object-fit:contain;background:#000;display:block">
        <div class="grid-label">${camName}</div>
        <button class="grid-close-btn" data-restore-slot="${camIdx}" title="Back to live">✕</button>
        <button class="grid-fs-btn" data-slot-fs title="Fullscreen">${ICONS.expand}</button>`;
    } else {
      slot.innerHTML = `
        <video src="${this._media(ev.id,'clip.mp4')}" controls autoplay playsinline muted
          style="width:100%;height:100%;object-fit:contain;background:#000;display:block"></video>
        <div class="grid-label">${camName}</div>
        <button class="grid-close-btn" data-restore-slot="${camIdx}" title="Back to live">✕</button>
        <button class="grid-fs-btn" data-slot-fs title="Fullscreen">${ICONS.expand}</button>`;
    }
  }

  _open(id) {
    const ev=this._allDisplayEvents().find(e=>e.id===id); if(!ev) return;
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
  }
  _media(id,file,dl) { return `/api/frigate/${this._cc().clientId}/notifications/${id}/${file}${dl?'?download=true':''}`; }
  _showClip(ev) { this._enter(); this._playing={id:ev.id}; this.shadowRoot.querySelector('#viewer').innerHTML=`<video src="${this._media(ev.id,'clip.mp4')}" controls autoplay playsinline></video>`; }
  _showClipById(id) { if(!id) return; this._enter(); this._playing={id}; this.shadowRoot.querySelector('#viewer').innerHTML=`<video src="${this._media(id,'clip.mp4')}" controls autoplay playsinline></video>`; }
  _showSnapshot(ev) { this._enter(); this._playing={id:ev.id}; this.shadowRoot.querySelector('#viewer').innerHTML=`<img class="snap" src="${this._media(ev.id,'snapshot.jpg')}">`; }
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
    viewer.innerHTML=`<video src="${url}" autoplay playsinline></video>${fromLbl}
      <div class="rec-dl-bar">
        <div class="rec-ctl-row">
          <button class="rec-pp-btn">⏸</button>
          <span class="rec-ctl-time">0:00 / ${this._fmtDurS(clipDur)}</span>
          <input type="range" class="rec-prog" min="0" max="${clipDur}" value="0" step="1">
        </div>
        <div class="rec-dl-row">
          <span>Download from <span class="rec-dl-time">${this._time(start)}</span></span>
          <button class="rec-dl-btn">↓ Download</button>
        </div>
      </div>`;
    const vid    = viewer.querySelector('video');
    const ppBtn  = viewer.querySelector('.rec-pp-btn');
    const ctTime = viewer.querySelector('.rec-ctl-time');
    const prog   = viewer.querySelector('.rec-prog');
    const dlTime = viewer.querySelector('.rec-dl-time');
    const dlBtn  = viewer.querySelector('.rec-dl-btn');
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
    if (ppBtn && vid) ppBtn.addEventListener('click', () => { vid.paused ? vid.play() : vid.pause(); });
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
  _fullscreen(el) { if(!el) return; (el.requestFullscreen||el.webkitRequestFullscreen||(()=>{})).call(el); }
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
    const isWide = this.shadowRoot.querySelector('.card')?.classList.contains('wide');
    const b=this.shadowRoot.querySelector('#browse'); const c=this.shadowRoot.querySelector('#chev2');
    const forceOpen = isWide; // always open on wide, both single and grid
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

  _renderAll() { this._renderStats();this._renderLatest();this._renderTimeline();this._renderLegend();this._renderRange();this._renderList();this._syncStatus();this._renderCamSwitcher(); }
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
