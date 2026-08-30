// editor.js — FrigateModernHassCardEditor config panel
import { DEFAULT_ROTATE_S, GRID_LAYOUTS, findLayout } from './constants.js';

export class FrigateModernHassCardEditor extends HTMLElement {
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

    const layoutId = this._config?.grid_layout || 'auto';
    const usingLayout = layoutId !== 'auto';
    // Offering a layout with fewer tiles than there are cameras is just wrong,
    // so hide those. If nothing is big enough, show everything rather than an
    // empty picker.
    const fitting = GRID_LAYOUTS.filter(l => l.id === 'auto' || l.tiles >= cams.length);
    const layoutChoices = fitting.length > 1 ? fitting : GRID_LAYOUTS;
    // The tile number leads the row: you read "tile 1 shows this camera", which
    // is the direction people think in. Arrows move a camera between tiles,
    // since the list order is what decides position.
    const camRows = cams.map((c,i) => `
      <div class="cr" data-row="${i}">
        <span class="cnum" title="Tile ${i+1} in the grid">${i+1}</span>
        <div class="cmv">
          <button class="mv" data-move-cam="${i}" data-dir="-1" ${i===0?'disabled':''} title="Move up">&#9650;</button>
          <button class="mv" data-move-cam="${i}" data-dir="1" ${i===cams.length-1?'disabled':''} title="Move down">&#9660;</button>
        </div>
        <select name="cam-entity-${i}" class="ce" data-cam-entity="${i}">
          <option value="">— select camera —</option>
          ${opts(c.entity||'')}
        </select>
        <input type="text" name="cam-name-${i}" class="cn" data-cam-name="${i}" placeholder="Display name (optional)" value="${c.name||''}">
        ${usingLayout ? '' : `
        <select class="cs" data-cam-span="${i}" title="Tile size in the grid">
          ${[1,2,3].map(v => `<option value="${v}" ${Number(c.span?.cols ?? c.span ?? 1)===v?'selected':''}>${v}x${v}</option>`).join('')}
        </select>`}
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
      .cs{padding:7px 4px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;background:#fff;color:#111;flex-shrink:0;}
      .xb{padding:5px 8px;border:1px solid #f87171;background:#fee2e2;color:#b91c1c;border-radius:6px;cursor:pointer;font-size:12px;flex-shrink:0;}
      .add-btn{padding:6px 12px;border:1px solid #93c5fd;background:rgba(59,130,246,.1);color:#3b82f6;border-radius:7px;cursor:pointer;font-size:12px;margin-top:2px;}
      .tf{width:100%;padding:7px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;box-sizing:border-box;background:#fff;color:#111;}
      .radio-row,.chk-row{display:flex;gap:14px;flex-wrap:wrap;}
      .radio-lbl,.chk-lbl{display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;color:#374151;}
      .chk-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;}
      .cmv{display:flex;flex-direction:column;gap:1px;flex-shrink:0;}
      .mv{width:18px;height:12px;padding:0;line-height:1;font-size:8px;border:1px solid #d1d5db;background:#fff;color:#6b7280;border-radius:3px;cursor:pointer;}
      .mv:hover:not(:disabled){border-color:#93c5fd;color:#3b82f6;}
      .mv:disabled{opacity:.3;cursor:default;}
      .cnum{width:26px;height:26px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#eef2ff;color:#3b82f6;border:1px solid #c7d2fe;border-radius:6px;font-size:11px;font-weight:700;}
      .lay-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(74px,1fr));gap:8px;margin:4px 0 8px;}
      .lay{padding:6px 5px 5px;border:1px solid #d1d5db;border-radius:8px;background:#fff;cursor:pointer;display:flex;flex-direction:column;gap:4px;align-items:center;}
      .lay:hover{border-color:#93c5fd;}
      .lay.sel{border-color:#3b82f6;background:rgba(59,130,246,.08);box-shadow:0 0 0 1px #3b82f6 inset;}
      .lay-prev{width:100%;aspect-ratio:4/3;display:grid;gap:2px;grid-auto-flow:dense;grid-auto-rows:1fr;}
      .lay-prev span{background:#cbd5e1;border-radius:2px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#475569;font-weight:700;}
      .lay.sel .lay-prev span{background:#bfdbfe;color:#1d4ed8;}
      .lay-auto{width:100%;aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:10px;text-align:center;border:1px dashed #cbd5e1;border-radius:4px;}
      .lay-lbl{font-size:10px;color:#374151;text-align:center;line-height:1.2;}
    </style>
    <div class="ed-wrap">
      <div>
        <span class="field-label">Cameras ${frigEntities.length ? '<small style="font-weight:400;color:#6b7280">· Frigate cameras detected</small>' : ''}</span>
        <div id="cam-list">${camRows}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
          <button class="add-btn" id="add-cam">+ Add camera</button>
          <button class="add-btn" id="toggle-layout">Grid layout${usingLayout ? `: ${findLayout(layoutId)?.label || ''}` : ''}</button>
        </div>
        ${cams.length > 4 ? '<small style="color:#6b7280;font-size:11px;display:block;margin-top:4px">Every camera in the grid streams at once, so more cameras means more load on the browser and on Frigate.</small>' : ''}
        <div id="layout-picker" style="display:${this._layoutOpen ? 'block' : 'none'};margin-top:8px">
          <div class="lay-grid">${layoutChoices.map(l => this._layoutButton(l, layoutId)).join('')}</div>
          <small style="color:#6b7280;font-size:11px">The numbers match the tile numbers beside each camera above. A layout sets the columns and the tile sizes together.</small>
        </div>
      </div>

      <label><span class="field-label">Title (optional)</span>
        <input name="title" class="tf" id="title" type="text" value="${this._config?.title||''}" placeholder="My Camera">
      </label>
      <label><span class="field-label">Subtitle</span>
        <input name="subtitle" class="tf" id="subtitle" type="text" value="${this._config?.subtitle||''}" placeholder="Frigate">
      </label>

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
        <span class="field-label">Theme</span>
        <div class="radio-row">
          <label class="radio-lbl"><input type="radio" name="theme" value="dark"  ${(this._config?.theme||'dark')==='dark' ?'checked':''}> Dark</label>
          <label class="radio-lbl"><input type="radio" name="theme" value="light" ${this._config?.theme==='light'?'checked':''}> Light</label>
          <label class="radio-lbl"><input type="radio" name="theme" value="auto"  ${this._config?.theme==='auto' ?'checked':''}> Auto (browser)</label>
        </div>
      </div>
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
        <span class="field-label">Hidden tabs</span>
        <div class="chk-grid">
          ${tabCheck('recordings','Recordings')}
          ${tabCheck('clips','Clips')}
          ${tabCheck('snapshot','Snapshots')}
          ${tabCheck('reviews','Reviews')}
          ${tabCheck('kept','Kept')}
        </div>
      </div>

      <div class="section" ${usingLayout ? 'style="display:none"' : ''}>
        <span class="field-label">Grid columns</span>
        <div class="radio-row">
          <label class="radio-lbl"><input type="radio" name="grid_columns" value="auto" ${(this._config?.grid_columns||'auto')==='auto'?'checked':''}> Automatic</label>
          <label class="radio-lbl"><input type="radio" name="grid_columns" value="1" ${String(this._config?.grid_columns)==='1'?'checked':''}> 1 (stacked)</label>
          <label class="radio-lbl"><input type="radio" name="grid_columns" value="2" ${String(this._config?.grid_columns)==='2'?'checked':''}> 2</label>
          <label class="radio-lbl"><input type="radio" name="grid_columns" value="3" ${String(this._config?.grid_columns)==='3'?'checked':''}> 3</label>
          <label class="radio-lbl"><input type="radio" name="grid_columns" value="4" ${String(this._config?.grid_columns)==='4'?'checked':''}> 4</label>
        </div>
        <small style="color:#6b7280;font-size:11px">A camera can occupy more than one tile, so one can be shown larger than the rest. Automatic picks a column count from the number of cameras and the space available. Choose 1 to stack them vertically, which reads better on a phone.</small>
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
        <span class="field-label">Maximum camera height</span>
        <input name="stream_height" class="tf" id="stream_height" type="number"
          value="${this._config?.stream_height||''}" min="20" max="100"
          placeholder="e.g. 70, blank = automatic">
        <small style="color:#6b7280;font-size:11px">As a percentage of the screen height. Leave empty to let the cameras size themselves; a grid uses at most 70% by default. Raise it for a wall display.</small>
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
    this.querySelector('#toggle-layout')?.addEventListener('click', () => {
      this._layoutOpen = !this._layoutOpen; this._render();
    });
    this.querySelectorAll('[data-move-cam]').forEach(b => b.addEventListener('click', e2 => {
      const from = Number(e2.currentTarget.dataset.moveCam);
      const to = from + Number(e2.currentTarget.dataset.dir);
      const cur = this._getCams();
      if (to < 0 || to >= cur.length) return;
      [cur[from], cur[to]] = [cur[to], cur[from]];
      this._config = { ...this._config, cameras: cur }; delete this._config.camera_entity;
      this._render(); this._dispatch();
    }));
    this.querySelectorAll('[data-layout]').forEach(b => b.addEventListener('click', () => {
      this._config = { ...this._config, grid_layout: b.dataset.layout };
      this._render(); this._dispatch();
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

  // Draw a layout as numbered cells. Seeing the shape is the point; a written
  // span tells nobody what they will end up with.
  _layoutButton(l, selected) {
    const sel = l.id === selected ? ' sel' : '';
    if (l.id === 'auto') {
      return `<button type="button" class="lay${sel}" data-layout="auto">
        <div class="lay-auto">fits the<br>camera count</div>
        <div class="lay-lbl">${l.label}</div></button>`;
    }
    const cells = Array.from({ length: l.tiles }, (_, i) => {
      const sp = l.spans[i];
      const style = sp ? ` style="grid-column:span ${sp[0]};grid-row:span ${sp[1]}"` : '';
      return `<span${style}>${i + 1}</span>`;
    }).join('');
    return `<button type="button" class="lay${sel}" data-layout="${l.id}">
      <div class="lay-prev" style="grid-template-columns:repeat(${l.cols},1fr)">${cells}</div>
      <div class="lay-lbl">${l.label}</div></button>`;
  }

  _getCams() {
    const rows = [...this.querySelectorAll('[data-row]')];
    return rows.map(r => {
      const span = Number(r.querySelector('[data-cam-span]')?.value || 1);
      return {
        entity: r.querySelector('[data-cam-entity]')?.value || '',
        name: r.querySelector('[data-cam-name]')?.value || '',
        // Only carry a size when it is not the default, to keep configs clean.
        ...(span > 1 ? { span } : {}),
      };
    });
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
    if (this._config?.grid_layout) c.grid_layout = this._config.grid_layout;
    const gc = this.querySelector('input[name="grid_columns"]:checked')?.value || 'auto';
    c.grid_columns = gc === 'auto' ? 'auto' : Number(gc);
    c.live_provider = this.querySelector('input[name="live_provider"]:checked')?.value === 'go2rtc' ? 'go2rtc' : 'hls';
    c.go2rtc_mode = this.querySelector('input[name="go2rtc_mode"]:checked')?.value || 'mse';
    this._config=c; this._dispatch();
  }
  _dispatch() { this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:this._config}})); }
}
