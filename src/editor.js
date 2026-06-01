// editor.js — FrigateModernHassCardEditor config panel
import { DEFAULT_ROTATE_S } from './constants.js';

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
        <span class="field-label">Cameras (up to 4) ${frigEntities.length ? '<small style="font-weight:400;color:#6b7280">· Frigate cameras detected</small>' : ''}</span>
        <div id="cam-list">${camRows}</div>
        ${cams.length < 4 ? `<button class="add-btn" id="add-cam">+ Add camera</button>` : ''}
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
    this._config=c; this._dispatch();
  }
  _dispatch() { this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:this._config}})); }
}
