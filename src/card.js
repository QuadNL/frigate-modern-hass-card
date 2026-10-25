// card.js — main FrigateModernHassCard custom element
import { VERSION, CARD_TAG, DAY, DEFAULT_ROTATE_S, ICONS, cap, parseWs,
         labelColor, camSolid, isHex, REC_NEUTRAL, REC_GROUP, MIN_TILE_PX, PHONE_PX, PHONE_MIN_TILE_PX, normSpan, findLayout, mkCamState, camDisplayName } from './constants.js';
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
      cameras = config.cameras.map(c => ({ entity:c.entity, name:c.name||null, span:normSpan(c.span), color: isHex(c.color) ? c.color : null }));
    else if (config.camera_entity)
      cameras = [{ entity:config.camera_entity, name:config.title||null, span:normSpan() }];
    else throw new Error('camera_entity or cameras[] required');

    this._config = {
      cameras,
      title: config.title || null,
      subtitle: config.subtitle || null,
      window_hours: config.window_hours || 6,
      // 'auto' follows the 12/24 hour choice in the user's Home Assistant
      // profile; '12h' and '24h' override it for this card.
      time_format: ['12h','24h'].includes(config.time_format) ? config.time_format : 'auto',
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
      // A named layout from GRID_LAYOUTS. It sets the column count and the tile
      // sizes together, so it overrides grid_columns and any per-camera span.
      grid_layout: findLayout(config.grid_layout) ? config.grid_layout : 'auto',
      // Grid columns: 'auto' works one out from the camera count, or pin a
      // number. 1 stacks the cameras vertically.
      grid_columns: (config.grid_columns === undefined || config.grid_columns === 'auto')
        ? 'auto' : Math.max(1, Math.min(6, Number(config.grid_columns) || 1)),
      // Logs why the live view chose what it chose. Off unless asked for, so it
      // can stay in the code rather than being bolted on during every hunt.
      debug: config.debug === true,
      // A grid on a phone is a row of pictures too small to see anything in, so
      // it stacks by default. Off is for the deliberate case: two cameras side
      // by side, or a small grid as an overview.
      stack_on_mobile: config.stack_on_mobile !== false,
      // Escape hatch for the width at which a column is dropped. Not in the
      // editor: the stacking question is the one people actually have, and this
      // is the answer to a rarer one.
      min_tile_width: config.min_tile_width ? Math.max(80, Number(config.min_tile_width)) : null,
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

  // Home Assistant may reattach this same instance when you come back to the
  // view, rather than building a new card. By then _started is long true, so
  // nothing in the normal start path runs again: everything torn down below has
  // to be brought back here, or the card returns looking normal with no picture,
  // no event refresh and no live updates (#15).
  connectedCallback() {
    if (!this._suspended) return; // first attach: the hass setter starts the card
    this._suspended = false;
    this._resume();
  }

  disconnectedCallback() {
    this._suspended = this._started;
    this._resumeRotate = !!this._rotateTimer;
    this._resumeAtNow = this._started && this._isNowWindow();
    this._stopRotate();
    if (this._refresh) clearInterval(this._refresh);
    if (this._unsub) { try { this._unsub.then(u=>u&&u()); } catch(_) {} this._unsub=null; }
    if (this._ro) this._ro.disconnect();
    this._revokeClipBlob();
    this._teardownGo2rtc();
    this._teardownGridGo2rtc();
  }

  // ── init ─────────────────────────────────────────────────
  _startRefresh() {
    clearInterval(this._refresh);
    this._refresh = setInterval(() => { if (this._isNowWindow()) this._loadWindow(true); }, this._config.refresh_seconds*1000);
  }
  _resume() {
    if (!this._config || !this._hass) return;
    this._dbg('reattached to the page, restoring what was stopped on leaving');
    this._ro?.observe(this);
    this._subscribe();
    this._startRefresh();
    // Watching live when you left: carry the window on to now, or the card comes
    // back stuck at the moment you navigated away.
    if (this._resumeAtNow) {
      const now = Math.floor(Date.now() / 1000), span = this._winEnd - this._winStart;
      this._winEnd = now; this._winStart = now - span;
    }
    // A clip loaded as a blob was released on leaving and will not play again.
    const clip = this.shadowRoot.querySelector('#viewer video');
    if (clip?.src?.startsWith('blob:')) this._showLive();
    if (this._viewMode === 'grid') this._mountGrid();
    else this._mountEngine();
    this._loadWindow(true);
    if (this._resumeRotate) this._startRotate();
  }
  async _start() {
    // Before any awaits: the layout classes decide the stream's size, and
    // without them the card renders 16:9 across its full width — briefly
    // enormous on a wide dashboard.
    this._setupResizeObserver();
    await this._discoverAll();
    const now = Math.floor(Date.now()/1000);
    this._winEnd = now; this._winStart = now - this._config.window_hours*3600;
    const startInGrid = this._config.default_view === 'grid' && this._config.cameras.length > 1;
    if (startInGrid) this._setViewMode('grid');
    // Only start the single view player when it is the one on screen. Mounting
    // it behind the grid opened a stream nobody could see, competing with the
    // tiles for bandwidth and connections.
    if (!startInGrid) await this._mountEngine();
    await this._loadWindow(true);
    this._loadCalendar();
    this._subscribe();
    this._startRefresh();
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

  // Switching cameras used to blank the picture to a spinner, which reads as
  // something breaking rather than something changing. Keep the last frame on
  // screen instead and fade the new stream in over it. A canvas copy costs
  // nothing and avoids holding two streams open at once.
  _captureFrame() {
    try {
      const vid = this._engine ? this._findVideo(this._engine, 0) : null;
      if (!vid?.videoWidth) return null;
      const canvas = document.createElement('canvas');
      canvas.width = vid.videoWidth;
      canvas.height = vid.videoHeight;
      canvas.getContext('2d').drawImage(vid, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.7);
    } catch (_) {
      return null; // tainted canvas or no frame yet; fall back to the spinner
    }
  }
  _holdFrame(slot, frame) {
    if (!frame) return;
    const hold = document.createElement('div');
    hold.className = 'engine-hold';
    hold.style.backgroundImage = `url(${frame})`;
    slot.insertAdjacentElement('afterbegin', hold);
    const wait = document.createElement('div');
    wait.className = 'engine-wait';
    wait.innerHTML = '<div class="ph-spin"></div>';
    slot.insertAdjacentElement('afterbegin', wait);
    // Dim the held frame straight away. Left at full strength it just looks
    // like the picture froze, with no sign anything is happening.
    requestAnimationFrame(() => hold.classList.add('dim'));
  }
  // Reveal the player once it actually has picture, then drop the held frame.
  // The timeout is a safety net: without it a stream that never reports playing
  // would stay invisible behind a still image.
  _fadeInPlayer(slot, el) {
    el.classList.add('engine-player');
    let done = false;
    const reveal = () => {
      if (done) return;
      done = true;
      el.classList.add('shown');
      slot.querySelector('.engine-wait')?.remove();
      const hold = slot.querySelector('.engine-hold');
      if (hold) {
        hold.classList.remove('dim');
        hold.classList.add('out');
        setTimeout(() => hold.remove(), 600);
      }
    };
    const vid = this._findVideo(el, 0);
    if (vid) {
      vid.addEventListener('playing', reveal, { once: true });
      vid.addEventListener('loadeddata', reveal, { once: true });
    }
    setTimeout(reveal, 4000);
  }
  async _mountEngine() {
    const slot = this.shadowRoot.querySelector('#engine'); if (!slot) return;
    const entity = this._activeCam?.entity; if (!entity) return;
    const frame = this._captureFrame(); // before anything is torn down
    const spinner = '<div class="ph"><div class="ph-spin"></div></div>';
    slot.innerHTML = frame ? '' : spinner;
    this._holdFrame(slot, frame);
    this._engine = null;
    this._teardownGo2rtc();
    this._engineSeq = (this._engineSeq || 0) + 1;
    const token = this._engineSeq;
    const stateObj = this._hlsStateObj(entity);
    if (!stateObj) return;

    if (this._config.live_provider === 'go2rtc') {
      const t0 = Date.now();
      const ok = await this._mountGo2rtc(slot, token);
      this._dbg(`single view ${entity}: go2rtc ${ok ? 'playing' : 'gave up'} after ${Date.now() - t0}ms`);
      if (ok || this._engineSeq !== token) return;
      slot.innerHTML = frame ? '' : spinner; // go2rtc did not start, fall through to HLS
      this._holdFrame(slot, frame);
    }
    this._dbg(`single view ${entity}: starting the Home Assistant HLS player`);
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
    if (!clientId || !cam) {
      this._dbg('no go2rtc: this camera has no Frigate instance/name yet', { clientId, cam });
      return false;
    }
    // A camera Frigate does not publish to go2rtc closes the socket at once. Once
    // is enough to learn that: without this, every switch back to that camera
    // spent four seconds waiting for a connection that is never coming.
    const cache = this._camCache[this._activeCam?.entity];
    if (cache?.noGo2rtc) {
      this._dbg(cam, 'has no go2rtc stream, going straight to the Home Assistant stream');
      return false;
    }
    const paths = this._go2rtcPaths(clientId, cam);
    for (const path of paths) {
      let r = await this._tryGo2rtcPath(slot, token, path);
      if (this._engineSeq !== token) return true; // superseded, nothing to do
      if (r.ok) { this._go2rtcPath = path; return true; } // remember what worked
      // The browser accepted the codec and then could not decode it. Ask for the
      // same stream without H.265 before giving up on go2rtc entirely.
      if (r.mediaError) {
        this._dbg('decode failed, asking go2rtc for H.264 instead:', r.mediaError);
        r = await this._tryGo2rtcPath(slot, token, path, { noHevc: true });
        if (this._engineSeq !== token) return true;
        if (r.ok) { this._go2rtcPath = path; return true; }
      }
      // The socket opened but the stream never played: this proxy route is
      // fine, so the other one won't help. Go straight to the HLS fallback.
      if (r.routeWorks) return false;
    }
    // Every route refused the connection while others work, so go2rtc does not
    // carry this camera. Remember it for as long as the card is open.
    if (cache) cache.noGo2rtc = true;
    this._dbg(cam, 'no go2rtc stream on any route; using the Home Assistant stream from now on');
    return false;
  }
  async _tryGo2rtcPath(slot, token, path, opts = {}) {
    const src = await this._signed(path);
    if (this._engineSeq !== token) return { ok: false, routeWorks: false };

    const player = document.createElement('frigate-go2rtc-player');
    player.style.cssText = 'width:100%;height:100%;display:block';
    slot.querySelectorAll(':scope > :not(.engine-hold):not(.engine-wait)').forEach(n => n.remove());
    slot.appendChild(player); // creates its <video> synchronously
    // Chrome reports H.265 as supported and then fails to decode the stream. The
    // player advertises whatever the browser claims, so go2rtc picks H.265 and
    // the picture never arrives. Dropping it from the offer makes go2rtc send
    // H.264 instead. Only on the retry: where H.265 does work it is the better
    // stream, and this costs go2rtc a transcode.
    if (opts.noHevc) player.CODECS = player.CODECS.filter(c => !c.startsWith('hvc1'));
    // Upstream's player starts unmuted and only mutes if autoplay is refused;
    // mute before connecting so the live view is never unexpectedly audible.
    if (player.video) {
      player.video.muted = true;
      player.video.style.objectFit = 'contain';
    }
    // A decode error means waiting out the timeout is pointless: the stream is
    // arriving, the browser just cannot play it.
    let mediaError = null;
    player.video?.addEventListener('error', () => {
      mediaError = player.video?.error?.message || 'media error';
    }, { once: true });
    // WebRTC media does not travel through HA's proxy — it goes straight to
    // go2rtc's own port, which typically only resolves on the local network.
    // 'mse' keeps everything on the (proxied) WebSocket instead.
    this._applyGo2rtcMode(player);
    player.src = src;
    // Right after src the player has either created the socket (CONNECTING) or
    // refused to, and the two need different fixes: refused means the element
    // was not in the document yet, CLOSED later means the server hung up.
    this._dbg('after src', {
      inDocument: player.isConnected, signed: src !== path, ws: player.wsState, pc: player.pcState,
    });
    // The close code says who hung up and why: 1006 is the handshake being
    // refused (wrong path, or auth), 1000 is a clean close from the other end.
    if (this._config.debug && player.ws) {
      player.ws.addEventListener('close', e => this._dbg('socket closed', { code: e.code, reason: e.reason, clean: e.wasClean }));
      player.ws.addEventListener('open', () => this._dbg('socket open'));
    }
    this._go2rtcPlayer = player;
    this._engine = player;
    this._fadeInPlayer(slot, player);
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
        if (mediaError) finish({ ok: false, routeWorks: true, mediaError });
        else if (!socketOpen && elapsed > SOCKET_MS) finish({ ok: false, routeWorks: false });
        else if (elapsed > PLAY_MS) finish({ ok: false, routeWorks: true });
      }, 250);
    });
    this._dbg('go2rtc path', path.replace(/\?.*/, ''), result.ok ? 'playing' : (result.mediaError ? `decode failed: ${result.mediaError}` : (result.routeWorks ? 'socket opened but no picture' : 'socket never opened')),
      { ws: player.wsState, pc: player.pcState, mode: player.mode, video: !!player.video, ready: player.video?.readyState });
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
  // Hiding the grid does not stop it. Every tile holds its own connection, so a
  // hidden grid of seven cameras keeps seven streams running while the single
  // view tries to start an eighth, and that one is the one you are waiting for.
  // Emptying the element also disconnects the ha-hls-player instances.
  _teardownGrid() {
    this._teardownGridGo2rtc();
    const grid = this.shadowRoot.querySelector('#cam-grid');
    if (grid) grid.innerHTML = '';
    this._gridCols = 0;
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
    slot.querySelectorAll(':scope > :not(.engine-hold):not(.engine-wait)').forEach(n => n.remove());
    slot.appendChild(s);
    this._engine = s;
    this._fadeInPlayer(slot, s);
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
  // The 'auto' entry exists so the editor can show it as a choice; it means no
  // layout, leaving the column count and any hand written spans alone.
  _activeLayout() {
    const id = this._config.grid_layout;
    return id && id !== 'auto' ? findLayout(id) : null;
  }
  // How narrow a tile may get before the grid drops a column. Configurable
  // because it is the one number that decides when a phone stacks: lower it and
  // two columns survive on a phone, raise it and even a tablet stacks.
  _minTilePx() {
    const v = Number(this._config.min_tile_width);
    return v > 0 ? Math.max(80, v) : MIN_TILE_PX;
  }
  // Cells the cameras will occupy, a camera spanning more than one included.
  _gridCells() {
    return this._config.cameras.reduce((sum, c) => {
      const sp = c.span || {};
      return sum + Math.max(1, Number(sp.cols) || 1) * Math.max(1, Number(sp.rows) || 1);
    }, 0);
  }
  _gridColumns(n) {
    const layout = this._activeLayout();
    // On a phone, stacking wins over everything else, a chosen layout included.
    // Four tiles on a 412px screen is not a grid, it is four thumbnails.
    const w0 = this._cardWidth || this.offsetWidth || 0;
    const phone = !!w0 && w0 < PHONE_PX;
    if (this._config.stack_on_mobile && phone) return 1;
    // Stacking switched off is a request for a grid on the phone, so the floor
    // there is a phone-sized one unless the config names its own.
    const min = phone && !this._config.min_tile_width ? PHONE_MIN_TILE_PX : this._minTilePx();
    if (layout?.cols) {
      // Still bounded by width: a four column layout on a phone is unreadable.
      const w = this._cardWidth || this.offsetWidth || 0;
      return w ? Math.max(1, Math.min(layout.cols, Math.floor(w / min))) : layout.cols;
    }
    const cfg = this._config.grid_columns;
    // A pinned column count is still capped by what there is to put in it. Four
    // columns for three cameras leaves an empty tile at the end of the row,
    // which reads as a camera that failed to load rather than as a choice.
    if (cfg && cfg !== 'auto') return Math.max(1, Math.min(Number(cfg) || 1, this._gridCells()));
    let cols = n <= 1 ? 1 : n <= 4 ? 2 : n <= 9 ? 3 : 4;
    // Never make tiles so narrow they stop being watchable. Without this a
    // phone showing seven cameras got three columns of ~100px tiles; the count
    // alone says nothing about how much room there actually is.
    const width = this._cardWidth || this.offsetWidth || 0;
    if (width) cols = Math.max(1, Math.min(cols, Math.floor(width / min)));
    return cols;
  }
  async _mountGrid() {
    const grid = this.shadowRoot.querySelector('#cam-grid'); if (!grid) return;
    const n = this._config.cameras.length;
    const cols = this._gridColumns(n);
    // A camera may occupy more than one cell, which is what gives the
    // asymmetric layouts (one large with smaller ones around it). A span wider
    // than the grid is clamped, so the same config still works when the column
    // count drops on a phone.
    const layout = this._activeLayout();
    const spans = this._config.cameras.map((c, i) => {
      const preset = layout?.spans?.[i];
      const want = preset ? { cols: preset[0], rows: preset[1] } : (layout ? { cols: 1, rows: 1 } : c.span || { cols: 1, rows: 1 });
      const wc = want.cols || 1, wr = want.rows || 1;
      const fit = Math.min(wc, cols);
      // Shrink the height by as much as the width had to shrink, or a tile that
      // wanted 3x3 keeps three rows in a single column and leaves two empty
      // screens below the video.
      return { cols: fit, rows: Math.max(1, Math.round(wr * (fit / wc))) };
    });
    const cells = spans.reduce((sum, sp) => sum + sp.cols * sp.rows, 0);
    const rows = Math.max(1, Math.ceil(cells / cols));
    const slots = cols * rows;       // leftover cells become placeholders
    grid.className = `cam-grid cams-${n}${rows > 1 ? ' multi-row' : ''}${cols === 1 ? ' stacked' : ''}`;
    grid.style.setProperty('--grid-cols', cols);
    grid.style.setProperty('--grid-rows', rows);
    this._gridCols = cols;
    this._teardownGridGo2rtc();
    grid.innerHTML = '';
    this._gridSeq = (this._gridSeq || 0) + 1;
    const gridToken = this._gridSeq;
    this._gridToken = gridToken;
    // Cameras first, then placeholders for whatever cells are left over. In a
    // single column there is no shape to preserve, so an empty tile would just
    // be a gap in a list.
    const total = n + (cols === 1 ? 0 : Math.max(0, slots - cells));
    for (let i = 0; i < total; i++) {
      const slot = document.createElement('div');
      const isPlaceholder = i >= n;
      slot.className = `grid-slot${isPlaceholder ? ' placeholder' : ''}`;
      if (!isPlaceholder) {
        const sp = spans[i];
        if (sp.cols > 1) slot.style.gridColumn = `span ${sp.cols}`;
        if (sp.rows > 1) slot.style.gridRow = `span ${sp.rows}`;
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
        slot.insertAdjacentHTML('beforeend', this._gridLabel(i));
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
    this._dbg('grid tile', entity, ok ? 'playing' : 'gave up', { ws: player.wsState, pc: player.pcState });
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
    // Switching between one camera and all of them is a view control, so it
    // belongs with fullscreen and the events panel. It used to sit in the row of
    // camera tabs, where it read as another camera and was easy to miss. Labelled
    // rather than an icon alone, for the same reason.
    // The word is what the button does, never where you are. Highlighting it as
    // well made it read as the mode you were already in, which is backwards.
    const grid = this._config.cameras.length > 1
      ? `<button class="tool tool-txt" id="sc-grid" title="${inGrid ? 'Show one camera' : 'Show all cameras'}">${inGrid ? ICONS.live : ICONS.grid}<span>${inGrid ? 'Single' : 'Grid'}</span></button>`
      : '';
    const fs = inGrid ? `<button class="tool" id="sc-fs" title="Fullscreen">${ICONS.expand}</button>` : '';
    // Only meaningful in the wide layout, where the events panel sits beside the
    // cameras. CSS hides it when narrow, since there the browse toggle does this.
    const events = `<button class="tool" id="sc-events"></button>`;
    bar.innerHTML = `${grid}${fs}${events}`;
    this._applyEventsCollapsed();
  }
  _applyEventsCollapsed() {
    const card = this.shadowRoot.querySelector('.card'); if (!card) return;
    card.classList.toggle('events-collapsed', this._eventsCollapsed);
    const btn = this.shadowRoot.querySelector('#sc-events');
    if (btn) {
      btn.innerHTML = this._eventsCollapsed ? ICONS.panelOff : ICONS.panelOn;
      btn.title = this._eventsCollapsed ? 'Show events panel' : 'Hide events panel';
    }
  }
  _toggleEvents() {
    this._eventsCollapsed = !this._eventsCollapsed;
    this._applyEventsCollapsed();
    // The stream column changes width, so the height the events column is
    // matched to changes with it. Re-measure once the animation has settled.
    setTimeout(() => { if (this._cardWidth >= 560) this._syncColHeight(); }, 320);
  }

  // ── view mode ─────────────────────────────────────────────
  // mount:false is for a caller that will mount the engine itself, so clicking a
  // camera in the grid does not first start the previously active camera and
  // then immediately tear it down again.
  _setViewMode(mode, opts = {}) {
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
    } else {
      if (engWrap) engWrap.style.display = '';
      if (gridEl) gridEl.style.display = 'none';
      this._teardownGrid();
      this._eventsMode = 'camera';
      if (opts.mount !== false) this._mountEngine();
      this._renderAll();
    }
    this._renderStreamCtrl();
    this._renderCamSwitcher();
    this._applyBrowse();
    this.shadowRoot.querySelectorAll('[data-viewmode]').forEach(p =>
      p.classList.toggle('active', p.dataset.viewmode === mode));
  }

  // ── camera switching ──────────────────────────────────────
  async _switchCamera(idx) {
    if (idx === this._activeCamIdx && this._viewMode === 'single') return;
    // Clicking a cam tab while in grid mode switches to single view of that camera
    if (this._viewMode === 'grid') this._setViewMode('single', { mount: false });
    const prevEnt = this._activeCam?.entity;
    if (prevEnt && this._camCache[prevEnt]) {
      this._camCache[prevEnt].events = this._events;
      this._camCache[prevEnt].recordings = this._recordings;
    }
    this._activeCamIdx = idx;
    const newEnt = this._activeCam?.entity;
    if (!this._camCache[newEnt]) this._camCache[newEnt] = mkCamState();
    // Start the stream before waiting on anything else. The picture is what the
    // user is waiting for; discovery is a round trip that only the events list
    // needs.
    const mounting = this._mountEngine();
    if (!this._camCache[newEnt].discovered) await this._discoverOne(newEnt);
    const cached = this._camCache[newEnt];
    this._events = cached.events||[]; this._recordings = cached.recordings||[];
    this._reviews = cached.reviews||[]; this._kept = cached.kept||[];
    this._renderCamSwitcher(); this._syncStatus();
    await mounting;
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
  // A camera's colour on the grid view timeline: its own if the config gives
  // one, otherwise the default for its place in the list.
  _camColor(i) { return this._config.cameras[i]?.color || camSolid(i, this._config.cameras.length); }
  // A tile's name label. With more than one camera it carries the camera's
  // timeline colour, which ties tile, timeline and legend together on a phone,
  // where nothing can be hovered to light a tile up.
  // While a clip plays the label also says what it is. A narrow tile gets a
  // shorter version, time first and without the camera name, which the dot and
  // the tile itself already give; the CSS picks one by the tile's width.
  _gridLabel(i, ev = null) {
    const inner = this._labelInner(i, ev);
    return inner ? `<div class="grid-label">${inner}</div>` : '';
  }
  // What a label shows, for a grid tile and the single view alike, so both
  // name a camera and an event the same way.
  _labelInner(i, ev = null) {
    const c = this._config.cameras[i]; if (!c) return '';
    const dot = this._config.cameras.length > 1 ? `<i class="cam-dot-lbl" style="background:${this._camColor(i)}"></i>` : '';
    const name = cap(camDisplayName(c));
    if (!ev) return `${dot}${name}`;
    const what = cap(ev.label || ''), when = this._time(ev.start_time);
    return `${dot}<span class="gl-full">${name} · ${when} · ${what}</span><span class="gl-short">${when} · ${what}</span>`;
  }
  // An event label says what started playing and then gets out of the way:
  // it fades after a few seconds and does not come back, so it never sits over
  // the video's own controls for long.
  _fadeLabel(el) {
    if (!el) return;
    clearTimeout(el._fadeT); el.classList.remove('fade');
    el._fadeT = setTimeout(() => el.classList.add('fade'), 3000);
  }
  // Light up the tiles of the cameras behind the event under the pointer.
  _hlTiles(list) {
    if (this._viewMode !== 'grid') return;
    const want = new Set(String(list || '').split(',').filter(x => x !== '').map(Number));
    this.shadowRoot.querySelectorAll('#cam-grid .grid-slot:not(.placeholder)').forEach((sl, i) => {
      const on = want.has(i);
      sl.classList.toggle('tick-hl', on);
      if (on) sl.style.setProperty('--hl', this._camColor(i));
    });
  }
  // Zoom the timeline onto a group of events so they come apart again.
  // The window a group would zoom to: its events plus some room either side,
  // never narrower than the 5 minutes the wheel stops at.
  _zoomWindow(a, b) {
    const pad = Math.max(60, (b - a) * 0.25);
    let ns = Math.floor(a - pad), ne = Math.ceil(b + pad);
    if (ne - ns < 300) { const mid = (ns + ne) / 2; ns = Math.floor(mid - 150); ne = ns + 300; }
    return [ns, ne];
  }
  // A tap on a group zooms in on it, unless zooming cannot pull its events
  // apart: they are seconds apart and the timeline is already about as close
  // as it goes. Then a second tap would land on the same block again, so list
  // them to pick from instead. Returns which it did, for the smoke test.
  _openGroup(el) {
    const a = Number(el.dataset.grpS), b = Number(el.dataset.grpE);
    const [ns, ne] = this._zoomWindow(a, b);
    if (ne - ns >= (this._winEnd - this._winStart) * 0.8) {
      this._pickGroup((el.dataset.grpIds || '').split(',').filter(Boolean));
      return 'pick';
    }
    this._pickGroup(null);
    this._zoomTo(a, b);
    return 'zoom';
  }
  _pickGroup(ids) {
    const p = this.shadowRoot.querySelector('#grp-panel'); if (!p) return;
    if (!ids || !ids.length) { p.hidden = true; p.innerHTML = ''; return; }
    const all = this._eventsMode === 'all';
    const evs = ids.map(id => this._allDisplayEvents().find(e => e.id === id)).filter(Boolean);
    p.innerHTML = evs.map(ev => {
      const ci = this._config.cameras.findIndex(c => this._camCache[c.entity]?.cam === ev.camera);
      const col = all && ci >= 0 ? this._camColor(ci) : labelColor(ev.label);
      const where = all && ci >= 0 ? ` · ${cap(camDisplayName(this._config.cameras[ci]))}` : '';
      const when = this._time(ev.start_time, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return `<button class="chip" data-tick="${ev.id}"><i class="cam-dot-lbl" style="background:${col}"></i>${when} · ${cap(ev.label)}${where}</button>`;
    }).join('') + `<button class="chip" data-grp-close>Close</button>`;
    p.hidden = false;
  }
  _zoomTo(a, b) {
    // Remembered so Back returns to exactly this window: zoom into one busy
    // block, come back, zoom into the next.
    (this._zoomStack = this._zoomStack || []).push([this._winStart, this._winEnd]);
    let [ns, ne] = this._zoomWindow(a, b);
    const now = Math.floor(Date.now() / 1000);
    if (ne > now) { const d = ne - now; ne -= d; ns -= d; }
    this._winStart = ns; this._winEnd = ne; this._exhausted = false;
    this._renderTimeline(); this._renderRange();
    clearTimeout(this._wt); this._wt = setTimeout(() => this._loadWindow(true), 350);
  }
  _dbg(...a) { if (this._config?.debug) console.info('[frigate-card]', ...a); }
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
                  <button class="btn back ctl-live" id="back">${ICONS.back}<span>Live</span></button>
                </div>
<div class="grid-label" id="play-info" hidden></div>
              </div>
              <div id="cam-grid" style="display:none"></div>
            </div>
            <!-- timeline strip — always visible below the stream/grid -->
            <div class="tl-sec">
              <div class="tl-head">
                <div class="tl-where">
                  <button class="tool" id="zoom-back" title="Back to where you were before zooming in" hidden>${ICONS.back}</button>
                  <span class="section-label" id="tl-range">—</span>
                </div>
                <div class="tl-tools">
                  <div class="stream-ctrl-bar" id="stream-ctrl-bar"></div>
                  <button class="tool tool-txt" id="now-btn" title="Back to the last hours up to now">${ICONS.clock}<span>Now</span></button>
                  <button class="tool" id="filter-btn" title="Filter">${ICONS.filter}</button>
                  <button class="tool" id="cal-btn" title="Calendar">${ICONS.calendar}</button>
                </div>
              </div>
              <div class="filter-panel" id="filter-panel" style="display:none"></div>
              <div class="cal-panel" id="cal-panel" style="display:none"></div>
              <div class="tl-track" id="tl-track" title="Drag · scroll=zoom · Shift+scroll=pan"><div class="tl-now"></div></div>
              <div class="grp-panel" id="grp-panel" hidden></div>
              <div class="tl-labels" id="tl-labels"></div>
              <div class="legend" id="legend"></div>
            </div>
            <!-- info: sits below timeline in col-left -->
            <div class="info-row">
              <div><div class="info-title" id="info-title">${title}</div><div class="info-sub">${sub}</div></div>
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
      // Events are grouped by on-screen distance, which a new width changes.
      this._renderTimeline();
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
    el.innerHTML = `<div class="cam-tabs">${tabs}</div>
      <button class="cam-rotate ${this._rotateTimer?'on':''}" id="rotate-btn" title="Auto-rotate">${ICONS.rotate}</button>`;
  }

  // ── interactions ──────────────────────────────────────────
  _click(e) {
    if (e.target.closest('#back')) return this._showLive();
    if (e.target.closest('#sc-grid')) return this._setViewMode(this._viewMode === 'grid' ? 'single' : 'grid');
    if (e.target.closest('#sc-fs')) {
      const target = this._viewMode === 'grid'
        ? this.shadowRoot.querySelector('#cam-grid')
        : this.shadowRoot.querySelector('#eng-wrap');
      return this._fullscreen(target);
    }
    if (e.target.closest('#filter-btn')) return this._toggleFilter();
    if (e.target.closest('#cal-btn')) return this._toggleCal();
    if (e.target.closest('#now-btn')) return this._goNow();
    if (e.target.closest('#zoom-back')) return this._zoomBack();
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
    const revOpen = e.target.closest('[data-review-open]'); if (revOpen) return this._openReview(revOpen);
    const pill = e.target.closest('[data-tab]'); if (pill) return this._setTab(pill.dataset.tab);
    // A tick opens its clip where the list would: in the camera's own tile in
    // grid view. _open alone uses the single view player, which is hidden while
    // the grid is showing, so in grid view a tick seemed to do nothing (#11).
    const grp = e.target.closest('[data-grp-s]'); if (grp) return this._openGroup(grp);
    if (e.target.closest('[data-grp-close]')) return this._pickGroup(null);
    const tick = e.target.closest('[data-tick]');
    if (tick) {
      this._pickGroup(null);
      return this._viewMode === 'grid' ? this._openInGridSlot(tick.dataset.tick) : this._open(tick.dataset.tick);
    }
    // Stop seek-bar clicks from bubbling up to the recording row handler
    if (e.target.closest('.rec-seek-wrap')) return;
    const recRow = e.target.closest('[data-rs]');
    if (recRow) return recRow.dataset.ci != null ? this._openRecInSingle(recRow) : this._toggleRecSeek(recRow);
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
    slot.innerHTML = this._gridLabel(idx);
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
    this._revealPlayer(slot);
    const isSnap = this._tab === 'snapshot' || (!ev.has_clip && ev.has_snapshot);
    // The tile says what is playing, as the single view does beside Live.
    const label = this._gridLabel(camIdx < 0 ? 0 : camIdx, ev);
    if (isSnap) {
      const url = await this._signed(this._media(ev.id,'snapshot.jpg'));
      slot.innerHTML = `
        <img src="${url}" style="width:100%;height:100%;object-fit:contain;background:#000;display:block">
        ${label}
        <button class="btn back grid-close-btn" data-restore-slot="${camIdx}" title="Back to live">${ICONS.back}<span>Live</span></button>
        <button class="grid-fs-btn" data-slot-fs title="Fullscreen">${ICONS.expand}</button>`;
    } else {
      const url = await this._resolveClipUrl(ev.id);
      slot.innerHTML = `
        <video src="${url}" controls playsinline
          style="width:100%;height:100%;object-fit:contain;background:#000;display:block"></video>
        ${label}
        <button class="btn back grid-close-btn" data-restore-slot="${camIdx}" title="Back to live">${ICONS.back}<span>Live</span></button>`;
      this._playMedia(slot.querySelector('video'));
    }
    this._fadeLabel(slot.querySelector('.grid-label'));
  }

  _open(id) {
    const ev=this._allDisplayEvents().find(e=>e.id===id);
    if(!ev) return;
    if (this._tab==='snapshot'||(!ev.has_clip&&ev.has_snapshot)) this._showSnapshot(ev);
    else if (ev.has_clip) this._showClip(ev); else this._showSnapshot(ev);
    this._playInfo(ev);
  }
  _enter() {
    this.shadowRoot.querySelector('#engine').style.display='none';
    const v=this.shadowRoot.querySelector('#viewer'); v.style.display='flex';
    this.shadowRoot.querySelector('#feed-top').style.display='flex';
    this._playInfo(null);
    this._revealPlayer(this.shadowRoot.querySelector('#eng-wrap'));
  }
  // What is playing, beside the Live button. On a phone a tap on the timeline
  // plays straight away and there is no tooltip to have read first, so this is
  // where you find out what the tick was.
  _playInfo(ev) {
    const el = this.shadowRoot.querySelector('#play-info'); if (!el) return;
    const inner = ev ? this._labelInner(this._activeCamIdx, ev) : '';
    el.innerHTML = inner; el.hidden = !inner;
    if (inner) this._fadeLabel(el);
  }
  // On a phone the player sits above the list, so picking a clip far down the
  // list started it off screen and left you looking at the list. Scroll back up
  // to it, but only when its top is actually out of view: on a wide card the
  // list sits beside the player, and jumping the page on every click there would
  // be worse than the bug.
  _revealPlayer(el) {
    if (!el) return;
    requestAnimationFrame(() => {
      const top = el.getBoundingClientRect().top;
      if (top >= 0 && top <= window.innerHeight - 80) return;
      // Clear Home Assistant's fixed header rather than sliding under it.
      el.style.scrollMarginTop = '72px';
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  _showLive() {
    this._playing=null; this._playInfo(null);
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
  // A review item is one arrival, often several tracked objects long. Play the
  // whole period from the recordings rather than the clip of one object inside
  // it, which started wherever that object happened to appear. If the period
  // cannot be played, for example on a setup that keeps no continuous recording,
  // fall back to the clip of the earliest object, which is the old behaviour
  // minus the wrong starting point.
  _openReview(row) {
    const start = Math.floor(Number(row.dataset.rvS));
    const endRaw = Number(row.dataset.rvE);
    // An ongoing review has no end yet: play up to now.
    const end = Math.ceil(endRaw > 0 ? endRaw : Date.now() / 1000);
    const det = row.dataset.reviewOpen;
    const fallback = () => {
      if (det) return this._showClipById(det);
      const viewer = this.shadowRoot.querySelector('#viewer');
      if (viewer) viewer.innerHTML = '<div class="ld">No recording for this period</div>';
    };
    if (!(start > 0) || end <= start) return fallback();
    const shown = this._showRecording(start, end, null, { fallback });
    const title = row.querySelector('.rev-t')?.textContent || '';
    this._playInfo({ label: title, start_time: start });
    return shown;
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
  async _showRecording(s, e, seekFrom, opts = {}) {
    const start = seekFrom || s;
    const token = ++this._playSeq; // cancel any in-flight load
    this._enter(); this._playing={rec:s};
    const viewer = this.shadowRoot.querySelector('#viewer');
    viewer.innerHTML='<div class="ld">Loading…</div>';
    const {clientId,cam}=this._cc();
    const maxChunk = 7200;
    const chunkEnd = Math.min(e, start + maxChunk);
    const clipDur = chunkEnd - start; // real clip length in seconds
    // Frigate's dynamic recording/start/.../end/... endpoint concatenates
    // segments on the fly and never supports Range requests (chunked
    // transfer, no Accept-Ranges/206 at any layer), and Safari's <video>
    // refuses to play a progressive MP4 without Range support. Route Safari
    // to the HLS time-range playlist instead (same fix as _resolveClipUrl
    // uses for event clips); other browsers keep the existing MP4 path.
    const recPath = this._hlsNative()
      ? `vod/${cam}/start/${start}/end/${chunkEnd}/index.m3u8`
      : `recording/${cam}/start/${start}/end/${chunkEnd}`;
    const url=await this._signed(`/api/frigate/${clientId}/${recPath}`);
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
    // Caller-supplied way out when the recording does not play at all. Only
    // before the first frame: a stream that started and then stalled is a
    // different problem, and swapping it for a clip would hide it.
    if (vid && opts.fallback) {
      let started = false;
      const bail = () => {
        if (started || this._playSeq !== token) return;
        started = true; clearTimeout(guard); opts.fallback();
      };
      const guard = setTimeout(bail, 10000);
      vid.addEventListener('loadeddata', () => { started = true; clearTimeout(guard); }, { once: true });
      vid.addEventListener('error', bail, { once: true });
    }
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
  // A recording picked in grid view plays in the single view of its camera. In
  // the grid it started in the hidden single view player, so a tap seemed to do
  // nothing, and the recording player's seek bar and download do not fit a tile.
  async _openRecInSingle(row) {
    const rs = +row.dataset.rs, re = +row.dataset.re, ci = +row.dataset.ci;
    await this._switchCamera(ci);
    this._showRecording(rs, re);
  }
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
    const toTime = v => this._time(rs + v, {hour:'2-digit', minute:'2-digit', second:'2-digit'});
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
  _goNow() { this._zoomStack=[]; this._pickGroup(null); const now=Math.floor(Date.now()/1000); this._winEnd=now; this._winStart=now-this._config.window_hours*3600; this._exhausted=false; this._calMonth=null; this._loadWindow(true); }
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
    p.innerHTML=`<div class="cal-head"><button data-cal-nav="-1">‹</button><b>${m.toLocaleDateString(this._timeFmt()[0],{month:'long',year:'numeric'})}</b><button data-cal-nav="1">›</button></div>
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
    // Pointing at an event lights up its camera's tile straight away, without
    // waiting for the browser's tooltip.
    // Only for a real mouse: on a phone a tap also fires mouseover, but nothing
    // ever un-hovers, so the tile stayed framed.
    track.addEventListener('pointerover',e=>{if(e.pointerType!=='mouse')return;const t=e.target.closest('[data-cis]');this._hlTiles(t?t.dataset.cis:'');});
    track.addEventListener('pointerleave',()=>this._hlTiles(''));
    const dn=x=>{drag=true;sx=x;sws=this._winStart;swe=this._winEnd;track.classList.add('grab');};
    const mv=x=>{if(!drag)return;const w=track.clientWidth||1;const sp=swe-sws;const sh=Math.round((x-sx)/w*sp);let ns=sws-sh,ne=swe-sh;const now=Math.floor(Date.now()/1000);if(ne>now){const a=ne-now;ne-=a;ns-=a;}this._winStart=ns;this._winEnd=ne;this._renderTimeline();this._renderRange();};
    const up=()=>{if(!drag)return;drag=false;track.classList.remove('grab');this._loadWindow(true);};
    track.addEventListener('mousedown',e=>{e.preventDefault();dn(e.clientX);});
    window.addEventListener('mousemove',e=>mv(e.clientX));
    window.addEventListener('mouseup',up);
    // Pinch to zoom the window, the touch counterpart of the wheel below. One
    // finger pans, two zoom, and the moment the second finger lands the pan is
    // abandoned so the window does not jump. The time under the fingers stays
    // put, which is what makes a pinch feel like it is zooming and not sliding.
    const gap=(a,b)=>Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
    let pinch=null;
    const settle=()=>{clearTimeout(this._wt);this._wt=setTimeout(()=>this._loadWindow(true),350);};
    track.addEventListener('touchstart',e=>{
      if(e.touches.length===2){
        drag=false;track.classList.remove('grab');
        const rect=track.getBoundingClientRect();
        const midX=(e.touches[0].clientX+e.touches[1].clientX)/2;
        const frac=Math.min(1,Math.max(0,(midX-rect.left)/rect.width));
        const span=this._winEnd-this._winStart;
        pinch={d0:gap(e.touches[0],e.touches[1])||1,span0:span,anchor:this._winStart+span*frac,frac};
      } else { pinch=null; dn(e.touches[0].clientX); }
    },{passive:true});
    track.addEventListener('touchmove',e=>{
      if(pinch&&e.touches.length===2){
        e.preventDefault(); // otherwise the browser zooms the page instead
        const d=gap(e.touches[0],e.touches[1])||1;
        let nsp=Math.round(pinch.span0*(pinch.d0/d));
        nsp=Math.max(300,Math.min(14*DAY,nsp)); // same limits as the wheel
        let ns=Math.round(pinch.anchor-nsp*pinch.frac),ne=ns+nsp;
        const now=Math.floor(Date.now()/1000);
        if(ne>now){const a=ne-now;ne-=a;ns-=a;}
        this._winStart=ns;this._winEnd=ne;this._exhausted=false;
        this._renderTimeline();this._renderRange();
      } else if(!pinch) mv(e.touches[0].clientX);
    },{passive:false});
    track.addEventListener('touchend',e=>{
      if(pinch){ if(e.touches.length<2){pinch=null;settle();} return; }
      up();
    });
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
      settle();
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
  _zoomBack() {
    this._pickGroup(null);
    const prev = (this._zoomStack || []).pop(); if (!prev) return;
    [this._winStart, this._winEnd] = prev; this._exhausted = false;
    this._renderTimeline(); this._renderRange();
    clearTimeout(this._wt); this._wt = setTimeout(() => this._loadWindow(true), 350);
  }
  _renderRange() {
    const back=this.shadowRoot.querySelector('#zoom-back');
    if (back) back.hidden = !(this._zoomStack && this._zoomStack.length);
    const el=this._$('#tl-range'); if(!el) return;
    const span=this._winEnd-this._winStart; const fmt=t=>this._time(t);
    if(span<=DAY+60) el.textContent=`${this._day(this._winEnd)} · ${fmt(this._winStart)}–${this._isNowWindow()?'now':fmt(this._winEnd)}`;
    else el.textContent=`${this._day(this._winStart)} – ${this._isNowWindow()?'now':this._day(this._winEnd)}`;
  }
  _renderLegend() {
    const el=this._$('#legend'); if(!el) return;
    const labels=this._labels();
    // The legend explains the colours actually on the timeline: cameras in grid
    // view, object labels on a single camera.
    let html;
    if (this._eventsMode==='all') {
      html=this._config.cameras.map((c,i)=>`<span class="lg"><i style="background:${this._camColor(i)}"></i>${cap(camDisplayName(c))}</span>`).join('');
    } else {
      html=labels.map(l=>`<span class="lg"><i style="background:${labelColor(l)}"></i>${cap(l)}</span>`).join('');
    }
    html+=`<span class="lg"><i style="background:${REC_NEUTRAL}"></i>Recording</span>`;
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

  // Locale and clock for every time and date the card shows. Follows the user's
  // Home Assistant profile, which has its own 12/24 hour setting and language,
  // rather than the browser's, unless the card config says otherwise. hourCycle
  // h23 rather than hour12:false, which some browsers render as 24:05 at
  // midnight.
  _timeFmt(opts = {}) {
    const loc = this._hass?.locale || {};
    const pick = this._config?.time_format;
    const o = { ...opts };
    const want = pick === '12h' ? '12' : pick === '24h' ? '24' : loc.time_format;
    if (want === '12') o.hour12 = true;
    else if (want === '24') o.hourCycle = 'h23';
    // 'system' means the browser's own conventions, 'language' Home Assistant's.
    const lang = loc.time_format === 'system' ? undefined : (loc.language || undefined);
    return [lang, o];
  }
  _time(ts, opts = { hour: '2-digit', minute: '2-digit' }) {
    const [lang, o] = this._timeFmt(opts);
    return new Date(ts * 1000).toLocaleTimeString(lang, o);
  }
  _day(ts, opts = { day: '2-digit', month: 'short' }) {
    return new Date(ts * 1000).toLocaleDateString(this._timeFmt()[0], opts);
  }
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
      // One band for "something was recording here". Per camera bands at full
      // height lay on top of each other and the last camera hid the rest, so the
      // legend promised colours nobody could see. Telling cameras apart is the
      // ticks' job in this view.
      const all=[];
      this._config.cameras.forEach(c=>{ const cc=this._camCache[c.entity]; if(cc) all.push(...(cc.recordings||[])); });
      // Neutral, so it cannot be mistaken for the first camera's colour.
      for(const r of this._mergeRecs(all)){const a=r.start_time,b=r.end_time||e;if(b<s||a>e)continue;const left=(Math.max(a,s)-s)/span*100;const w=Math.max(0.3,(Math.min(b,e)-Math.max(a,s))/span*100);html+=`<div class="t-rec" style="left:${left}%;width:${w}%;background:${REC_NEUTRAL}"></div>`;}
    } else {
      for(const r of this._mergeRecs(this._recordings)){const a=r.start_time,b=r.end_time||e;if(b<s||a>e)continue;const left=(Math.max(a,s)-s)/span*100;const w=Math.max(0.3,(Math.min(b,e)-Math.max(a,s))/span*100);html+=`<div class="t-rec" style="left:${left}%;width:${w}%;background:${REC_NEUTRAL}"></div>`;}
    }
    // With every camera on one timeline a tick is coloured by camera, so you can
    // see where something happened; what it was is in the tooltip. On a single
    // camera the camera is already known and the colour shows what was seen.
    const all = this._eventsMode === 'all';
    const camIdx = ev => this._config.cameras.findIndex(c => this._camCache[c.entity]?.cam === ev.camera);
    // Events closer together than a finger can tell apart become one block with
    // a count, which zooms in when tapped. Measured in pixels, so zooming in
    // separates them again by itself.
    const px = track.clientWidth || 1000;
    const near = this.shadowRoot.querySelector('.card')?.classList.contains('mobile') ? 14 : 9;
    const evs = this._allDisplayEvents().filter(ev => ev.start_time >= s && ev.start_time <= e)
      .sort((a, b) => a.start_time - b.start_time);
    const groups = [];
    for (const ev of evs) {
      const x = (ev.start_time - s) / span * px;
      const g = groups[groups.length - 1];
      if (g && x - g.lastX < near) { g.evs.push(ev); g.lastX = x; } else groups.push({ evs: [ev], lastX: x });
    }
    for (const g of groups) {
      const cis = all ? [...new Set(g.evs.map(camIdx).filter(i => i >= 0))] : [];
      const hl = cis.length ? ` data-cis="${cis.join(',')}"` : '';
      if (g.evs.length === 1) {
        const ev = g.evs[0], ci = cis.length ? cis[0] : -1;
        const left = (ev.start_time - s) / span * 100;
        const col = ci >= 0 ? this._camColor(ci) : labelColor(ev.label);
        const where = all ? ` · ${cap(ci >= 0 ? camDisplayName(this._config.cameras[ci]) : (ev.camera || '').replace(/_/g, ' '))}` : '';
        html += `<div class="t-ev" data-tick="${ev.id}"${hl} style="left:${left}%;background:${col}" title="${cap(ev.label)} ${this._time(ev.start_time)}${where}"></div>`;
        continue;
      }
      const a = g.evs[0].start_time, b = g.evs[g.evs.length - 1].start_time;
      const mid = ((a + b) / 2 - s) / span * 100;
      // One colour only when it means one thing: one camera in grid view, one
      // kind of object on a single camera. Otherwise neutral.
      const labels = new Set(g.evs.map(ev => ev.label));
      const col = all ? (cis.length === 1 ? this._camColor(cis[0]) : REC_GROUP)
                      : (labels.size === 1 ? labelColor(g.evs[0].label) : REC_GROUP);
      const names = all ? ' · ' + cis.map(i => cap(camDisplayName(this._config.cameras[i]))).join(', ') : '';
      html += `<div class="t-grp" data-grp-s="${a}" data-grp-e="${b}" data-grp-ids="${g.evs.map(ev => ev.id).join(',')}"${hl} style="left:${mid}%;background:${col}" title="${g.evs.length} events ${this._time(a)}–${this._time(b)}${names}">${g.evs.length}</div>`;
    }
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
    // In grid view the list covers every camera, each row naming its camera.
    // It used to show only whichever camera happened to be active, unnamed.
    const all=this._eventsMode==='all';
    let recs=[];
    if (all) this._config.cameras.forEach((c,ci)=>{ const cc=this._camCache[c.entity]; if(cc) for(const r of this._mergeRecs(cc.recordings||[])) recs.push({...r,ci}); });
    else recs=this._mergeRecs(this._recordings);
    recs.sort((a,b)=>b.start_time-a.start_time);
    if(!recs.length){list.innerHTML='<div class="empty">No recordings in this window</div>';return;}
    list.innerHTML=recs.map(r=>{
      const rs=Math.floor(r.start_time), re=Math.floor(r.end_time||Date.now()/1000);
      const d=Math.max(1,re-rs); const mm=Math.floor(d/60),ss=d%60;
      const dur=`${mm?mm+'m ':''}${ss}s`;
      const seekHint = d > 300 ? ' <span class="seek-hint">· click to seek</span>' : '';
      const cam = all ? `<i class="cam-dot-lbl" style="background:${this._camColor(r.ci)}"></i>${cap(camDisplayName(this._config.cameras[r.ci]))} · ` : '';
      return `<div class="rec" data-rs="${rs}" data-re="${re}"${all?` data-ci="${r.ci}"`:''}>
        <div class="ric">${ICONS.recordings}</div>
        <div class="rinf">
          <div class="rt">${cam}${this._time(r.start_time)} – ${this._time(r.end_time||Date.now()/1000)}</div>
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
      // Frigate does not return detections in time order, so [0] was usually an
      // object from halfway through the period. Event ids start with their epoch,
      // which parseFloat reads, so sorting on that gives the earliest.
      const dets=[...(r.data?.detections||[])].sort((a,b)=>parseFloat(a)-parseFloat(b));
      const firstDet=dets[0]||'';
      const reviewed=r.has_been_reviewed;
      const thumb=firstDet?`<div class="rev-th"><img src="${this._media(firstDet,'thumbnail.jpg')}" loading="lazy" onerror="this.parentElement.style.display='none'"></div>`:'';
      return`<div class="rev ${sev}" data-review-id="${r.id}" data-review-open="${firstDet}" data-rv-s="${r.start_time}" data-rv-e="${r.end_time||''}"><div class="rev-sev ${sev}"></div>${thumb}<div class="rev-inf"><div class="rev-t">${title}</div><div class="rev-m">${this._time(r.start_time)} · ${cap(sev)}${reviewed?' · ✓':' · tap'}</div></div>${reviewed?'':`<button class="ico" data-mark>${ICONS.reviews}</button>`}</div>`;
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
