// Smoke test: build the card and the editor against a stub DOM.
//
// node --check only proves the bundle parses. It cannot catch a variable used
// before its declaration, a typo in a template string, or a missing import,
// all of which only surface when the code actually runs. The editor is the
// riskiest part here because it renders one large template and cannot be tried
// out without Home Assistant.
//
// Usage: node tools/smoke.js

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const bundle = path.join(__dirname, '..', 'frigate-modern-hass-card.js');
const source = fs.readFileSync(bundle, 'utf8');

const noop = () => {};
const makeEl = () => ({
  style: { setProperty: noop, removeProperty: noop, cssText: '' },
  classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
  dataset: {},
  children: [],
  set innerHTML(_v) {}, get innerHTML() { return ''; },
  appendChild: noop, insertAdjacentElement: noop, insertAdjacentHTML: noop,
  removeChild: noop, remove: noop, addEventListener: noop, removeEventListener: noop,
  querySelector: () => null, querySelectorAll: () => [],
  getBoundingClientRect: () => ({ width: 800, height: 450, top: 0, left: 0 }),
  offsetWidth: 800, offsetHeight: 450, isConnected: true,
});

class StubElement {
  constructor() { Object.assign(this, makeEl()); }
  attachShadow() { this.shadowRoot = makeEl(); return this.shadowRoot; }
  dispatchEvent() { return true; }
}

const registry = new Map();
const context = {
  HTMLElement: StubElement,
  customElements: {
    define: (name, cls) => registry.set(name, cls),
    get: (name) => registry.get(name),
    whenDefined: () => Promise.resolve(),
  },
  document: {
    createElement: () => makeEl(),
    addEventListener: noop,
    hidden: false,
    fullscreenEnabled: true,
  },
  window: { customCards: [], navigator: { userAgent: 'node' }, addEventListener: noop },
  navigator: { userAgent: 'node' },
  WebSocket: { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 },
  MediaSource: function () {},
  RTCPeerConnection: function () {},
  ResizeObserver: function () { return { observe: noop, disconnect: noop }; },
  IntersectionObserver: function () { return { observe: noop, disconnect: noop }; },
  console, setTimeout, clearTimeout, setInterval, clearInterval,
  requestAnimationFrame: (fn) => fn(),
  URL: { createObjectURL: () => 'blob:stub', revokeObjectURL: noop },
  fetch: () => Promise.reject(new Error('no network in smoke test')),
};
context.window.document = context.document;
context.globalThis = context;
vm.createContext(context);

const fail = (what, err) => {
  console.error(`FAIL ${what}: ${err && err.message ? err.message : err}`);
  process.exit(1);
};

try {
  vm.runInContext(source, context, { filename: 'frigate-modern-hass-card.js' });
} catch (err) {
  fail('loading the bundle', err);
}

const cardTag = [...registry.keys()].find((k) => !k.endsWith('-editor') && k.includes('frigate-modern'));
const editorTag = [...registry.keys()].find((k) => k.endsWith('-editor'));
if (!cardTag || !editorTag) fail('registration', `card=${cardTag} editor=${editorTag}`);

// The editor renders its whole panel from setConfig, which is where a variable
// used before its declaration blows up.
const configs = [
  { camera_entity: 'camera.one' },
  { cameras: [{ entity: 'camera.one', color: '#ff8800' }, { entity: 'camera.two', span: 2 }] },
  { cameras: [{ entity: 'camera.one' }], grid_layout: '6-big' },
  { cameras: [{ entity: 'camera.one' }], grid_columns: 3, live_provider: 'go2rtc' },
];

for (const config of configs) {
  const label = JSON.stringify(config);
  try {
    const editor = new (registry.get(editorTag))();
    editor.hass = { states: { 'camera.one': { attributes: { camera_name: 'one' }, state: 'idle' } } };
    editor.setConfig(config);
  } catch (err) {
    fail(`editor with ${label}`, err);
  }
  try {
    const card = new (registry.get(cardTag))();
    card.setConfig(config);
  } catch (err) {
    fail(`card with ${label}`, err);
  }
}

// Lifecycle (#15): Home Assistant can detach a card when you leave a view and
// reattach the same instance when you come back. Whatever disconnectedCallback
// stops, connectedCallback has to start again, and a card that was never
// started must not be started from there.
function lifecycle(viewMode) {
  const card = new (registry.get(cardTag))();
  card.setConfig({ cameras: [{ entity: 'camera.one' }, { entity: 'camera.two' }] });
  const calls = [];
  for (const m of ['_mountEngine', '_mountGrid', '_subscribe', '_loadWindow', '_startRefresh']) {
    card[m] = () => { calls.push(m); };
  }
  card.connectedCallback();
  if (calls.length) fail('lifecycle', `a card that never started did work on attach: ${calls}`);
  card._hass = { states: {} };
  card._started = true;
  card._viewMode = viewMode;
  card.disconnectedCallback();
  card.connectedCallback();
  const want = viewMode === 'grid' ? '_mountGrid' : '_mountEngine';
  for (const m of [want, '_subscribe', '_startRefresh', '_loadWindow']) {
    if (!calls.includes(m)) fail('lifecycle', `${viewMode} view: ${m} not restored after reattach (got ${calls})`);
  }
  calls.length = 0;
  card.connectedCallback();
  if (calls.length) fail('lifecycle', `a second attach without a detach did work again: ${calls}`);
}
try { lifecycle('single'); lifecycle('grid'); } catch (err) { fail('lifecycle', err); }

// Timeline: events too close to tell apart become one counted block, events
// far apart stay separate ticks, and in grid view each carries its camera.
function timeline() {
  const card = new (registry.get(cardTag))();
  card.setConfig({ cameras: [{ entity: 'camera.one' }, { entity: 'camera.two' }] });
  card._camCache['camera.one'] = { cam: 'one' };
  card._camCache['camera.two'] = { cam: 'two' };
  card._eventsMode = 'all';
  card._winStart = 0; card._winEnd = 1000;
  const ev = (t, cam, label = 'person') => ({ id: `${t}-x`, start_time: t, camera: cam, label });
  // At 1000px for 1000s, 1s is 1px: three within 9px of each other, two alone.
  card._allDisplayEvents = () => [ev(100, 'one'), ev(104, 'two'), ev(108, 'one'), ev(500, 'two'), ev(900, 'one')];
  let html = '';
  const track = { clientWidth: 1000, set innerHTML(v) { html = v; } };
  card._$ = sel => (sel === '#tl-track' ? track : null);
  card._renderTimeline();
  const grp = html.match(/class="t-grp"[^>]*>(\d+)</g) || [];
  const ticks = html.match(/class="t-ev"/g) || [];
  if (grp.length !== 1 || !/>3</.test(grp[0])) fail('timeline', `expected one group of 3, got ${grp}`);
  if (ticks.length !== 2) fail('timeline', `expected 2 separate ticks, got ${ticks.length}`);
  if (!/data-cis="0,1"/.test(html)) fail('timeline', 'group does not name both cameras');
  if (!/data-tick="500-x" data-cis="1"/.test(html)) fail('timeline', 'tick does not name its camera');
  // Zooming into a block and pressing Back returns to exactly the window before.
  card._loadWindow = () => {}; card._renderRange = () => {};
  card._winStart = 1000; card._winEnd = 2000;
  card._zoomTo(1100, 1108);
  if (card._winStart === 1000) fail('timeline', 'zooming into a block did not change the window');
  card._zoomBack();
  if (card._winStart !== 1000 || card._winEnd !== 2000) fail('timeline', `Back gave ${card._winStart}-${card._winEnd}, not 1000-2000`);
  card._zoomTo(1100, 1108); card._goNow();
  if (card._zoomStack.length) fail('timeline', 'Now left a way back behind');
  // A group that zooming cannot separate is offered as a list instead.
  const block = a => ({ dataset: { grpS: String(a), grpE: String(a + 4), grpIds: 'x,y' } });
  card._pickGroup = () => {};
  card._winStart = 0; card._winEnd = 21600;
  if (card._openGroup(block(100)) !== 'zoom') fail('timeline', 'a group in a 6 hour window should zoom in');
  card._winStart = 0; card._winEnd = 300;
  if (card._openGroup(block(100)) !== 'pick') fail('timeline', 'a group at the closest zoom should be listed, not zoomed again');
}
try { timeline(); } catch (err) { fail('timeline', err); }

console.log(`OK smoke test: ${cardTag} and ${editorTag} render for ${configs.length} configs, lifecycle restores after reattach, timeline groups close events`);
