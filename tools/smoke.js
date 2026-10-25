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
    removeEventListener: noop,
    hidden: false,
    fullscreenEnabled: true,
  },
  window: { customCards: [], navigator: { userAgent: 'node' }, addEventListener: noop, removeEventListener: noop },
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

// Recordings tab in grid view: every camera's recordings, each row naming its
// camera so a tap can play it in that camera's single view.
function recordingsInGrid() {
  const card = new (registry.get(cardTag))();
  card.setConfig({ cameras: [{ entity: 'camera.one' }, { entity: 'camera.two' }] });
  card._camCache['camera.one'] = { cam: 'one', recordings: [{ start_time: 100, end_time: 200 }] };
  card._camCache['camera.two'] = { cam: 'two', recordings: [{ start_time: 300, end_time: 400 }] };
  card._eventsMode = 'all';
  let html = '';
  card._renderRecordings({ set innerHTML(v) { html = v; } });
  if (!/data-ci="0"/.test(html) || !/data-ci="1"/.test(html)) fail('recordings', `grid view should list both cameras, got ${html.slice(0, 200)}`);
}
try { recordingsInGrid(); } catch (err) { fail('recordings', err); }

// Grid view loads every camera's recordings for the window on screen, not only
// the active camera's.
async function recordingsLoaded() {
  const card = new (registry.get(cardTag))();
  card.setConfig({ cameras: [{ entity: 'camera.one' }, { entity: 'camera.two' }] });
  for (const [e, c] of [['camera.one', 'one'], ['camera.two', 'two']]) card._camCache[e] = { cam: c, clientId: 'frigate', discovered: true };
  card._activeCamIdx = 0; card._eventsMode = 'all'; card._winStart = 0; card._winEnd = 1000;
  card._ws = async q => (q.type === 'frigate/recordings/get' ? [{ start_time: 10, end_time: 20, camera: q.camera }] : []);
  card._renderList = () => {}; card._renderTimeline = () => {};
  await card._loadAllCamsBackground();
  for (const e of ['camera.one', 'camera.two']) {
    if (!(card._camCache[e].recordings || []).length) fail('recordings', `${e} has no recordings after loading the grid`);
  }
}
// PTZ: a move never stops by itself, so every way out of it has to send one.
async function ptz() {
  const card = new (registry.get(cardTag))();
  card.setConfig({ cameras: [{ entity: 'camera.one' }, { entity: 'camera.two', ptz: false }] });
  const sent = [];
  card._hass = { states: {}, callService: (d, s, data, t) => { sent.push(`${data.action}${data.argument ? '_' + data.argument : ''}@${t.entity_id}`); return Promise.resolve(); } };
  card._viewMode = 'single'; card._activeCamIdx = 0;
  card._camCache['camera.one'] = { cam: 'one', ptz: { pt: true, zoom: false, presets: ['garage'] } };
  card._camCache['camera.two'] = { cam: 'two', ptz: { pt: true, zoom: true, presets: [] } };
  card._renderStreamCtrl = () => {}; card._renderPtz = () => {};
  if (!card._ptzCaps()) fail('ptz', 'a camera reporting pt should get controls');
  card._activeCamIdx = 1;
  if (card._ptzCaps()) fail('ptz', 'ptz: false on a camera should hide its controls');
  card._camCache['camera.one'].ptz = { pt: false, zoom: false, presets: [] };
  card._activeCamIdx = 0;
  if (card._ptzCaps()) fail('ptz', 'a camera reporting nothing should get no controls');
  card._camCache['camera.one'].ptz = { pt: true, zoom: true, presets: [] };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const expect = (want, what) => { if (sent.join(' ') !== want) fail('ptz', `${what}: sent "${sent.join(' ')}", expected "${want}"`); sent.length = 0; };

  card._ptzStart('move', 'left'); card._ptzMove.t0 -= 1000; card._ptzRelease('released'); await wait(0);
  expect('move_left@camera.one stop@camera.one', 'hold and release');
  card._ptzStart('zoom', 'in'); card._ptzRelease('released'); await wait(0);
  if (sent.includes('stop@camera.one')) fail('ptz', 'a short tap stopped before its nudge');
  await wait(350); expect('zoom_in@camera.one stop@camera.one', 'short tap');
  card._ptzStart('move', 'up'); card._ptzStart('move', 'down'); await wait(0);
  expect('move_up@camera.one stop@camera.one move_down@camera.one', 'a new press stops the old move first');
  card._ptzStop('x'); await wait(0); sent.length = 0;
  card._ptzStart('move', 'right'); card._ptzOpen = true; card._ptzClose('closed'); await wait(0);
  expect('move_right@camera.one stop@camera.one', 'closing the controls');
  card._ptzStart('move', 'left'); card.disconnectedCallback(); await wait(0);
  expect('move_left@camera.one stop@camera.one', 'the card leaving the page');
  // The stop goes to the camera that moved, even after switching cameras.
  card._ptzStart('move', 'left'); card._activeCamIdx = 1; card._ptzStop('switched'); await wait(0);
  expect('move_left@camera.one stop@camera.one', 'stop after switching cameras');
}

// Manual recording: start hands back an event id, stop ends that event, and a
// stop that comes while the start is still under way ends it once the id is in.
async function recording() {
  const card = new (registry.get(cardTag))();
  card.setConfig({ cameras: [{ entity: 'camera.one' }] });
  const sent = []; let release;
  card._hass = { states: {}, callService: (d, s, data, t, notify, ret) => {
    sent.push(`${s}${data.event_id ? ':' + data.event_id : ''}${s === 'create_event' ? (data.include_recording ? ':rec' : ':snap') + (ret ? ':resp' : '') : ''}`);
    if (s === 'create_event' && data.include_recording) return new Promise(r => { release = () => r({ response: { [t.entity_id]: { event_id: 'e1' } } }); });
    return Promise.resolve({});
  } };
  card._viewMode = 'single'; card._activeCamIdx = 0;
  card._toast = () => {}; card._renderRec = () => {}; card._renderStreamCtrl = () => {}; card._loadWindow = () => {};
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const expect = (want, what) => { if (sent.join(' ') !== want) fail('recording', `${what}: sent "${sent.join(' ')}", expected "${want}"`); sent.length = 0; };

  card._recStart('camera.one'); await wait(0); release(); await wait(0);
  if (card._recs['camera.one']?.id !== 'e1') fail('recording', 'start did not keep the event id');
  card._recStop('camera.one'); await wait(0);
  expect('create_event:rec:resp end_event:e1', 'start and stop');
  if (card._recs['camera.one']) fail('recording', 'stop left the recording in place');

  card._recStart('camera.one'); await wait(0); card._recStop('camera.one'); release(); await wait(0); await wait(0);
  expect('create_event:rec:resp end_event:e1', 'stop while starting');

  await card._snapshot('camera.one');
  expect('create_event:snap', 'snapshot');
}

// Talk: detected from a sendonly audio media on the go2rtc producer; starting
// sends an offer over the WebSocket, mute only disables the track, and ending
// stops the microphone and closes both connections.
async function talk() {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const card = new (registry.get(cardTag))();
  card.setConfig({ cameras: [{ entity: 'camera.one' }] });
  card._hass = { states: {}, callWS: async m => ({ path: m.path }) };
  card._signed = async p => p;
  card._viewMode = 'single'; card._activeCamIdx = 0;
  card._camCache['camera.one'] = { cam: 'one', clientId: 'frigate', discovered: true };
  card._renderStreamCtrl = () => {}; card._renderTalk = () => {}; card._toast = () => {};
  const medias = ['video, recvonly, H265', 'audio, recvonly, MPEG4-GENERIC/16000', 'audio, sendonly, PCMU/8000'];
  context.fetch = async () => ({ ok: true, json: async () => ({ producers: [{ medias }] }) });
  await card._loadTalk('camera.one');
  if (card._camCache['camera.one'].talk !== true) fail('talk', 'a sendonly audio producer should mean two-way audio');
  if (!card._talkCaps()) fail('talk', 'a camera with two-way audio should offer Talk');

  const track = { enabled: true, stopped: false, stop() { this.stopped = true; } };
  context.navigator.mediaDevices = { getUserMedia: async () => ({ getTracks: () => [track], getAudioTracks: () => [track] }) };
  context.location = { origin: 'https://ha.test' };
  const sent = []; let ws, pc;
  context.WebSocket = class { constructor(u) { this.url = u; this.readyState = 0; this.h = {}; ws = this; }
    addEventListener(t, f) { this.h[t] = f; } send(m) { sent.push(JSON.parse(m).type); } close() { this.closed = true; } };
  context.WebSocket.OPEN = 1; context.WebSocket.CLOSED = 3;
  context.RTCPeerConnection = class { constructor() { this.h = {}; this.connectionState = 'new'; pc = this; }
    addTransceiver(tr, o) { this.added = [tr, o.direction]; } addEventListener(t, f) { this.h[t] = f; }
    async createOffer() { return { sdp: 'offer' }; } async setLocalDescription() {} async setRemoteDescription() {} async addIceCandidate() {}
    close() { this.closed = true; } };
  await card._talkStart(); await wait(0);
  if (!ws || !/^wss:\/\/ha\.test\/api\/frigate\/frigate\/go2rtc\/ws\/api\/ws\?src=one/.test(ws.url)) fail('talk', `unexpected WebSocket ${ws && ws.url}`);
  if (!pc.added || pc.added[0] !== track || pc.added[1] !== 'sendonly') fail('talk', 'the microphone should go out as a sendonly track');
  ws.readyState = 1; await ws.h.open(); await wait(0);
  if (!sent.includes('webrtc/offer')) fail('talk', 'no offer sent over the WebSocket');
  pc.connectionState = 'connected'; pc.h.connectionstatechange();
  if (card._talk?.state !== 'live') fail('talk', 'a connected peer should make the talk live');
  card._talkMute(true);
  if (track.enabled || !pc || pc.closed) fail('talk', 'mute should disable the track and keep the connection');
  card._talkMute(false);
  card._talkOpen = true; card._talkClose('switched camera');
  if (!track.stopped || !pc.closed || !ws.closed || card._talk) fail('talk', 'ending should stop the microphone and close both connections');
}

Promise.all([recordingsLoaded(), ptz(), recording(), talk()])
  .then(() => console.log(`OK smoke test: ${cardTag} and ${editorTag} render for ${configs.length} configs, lifecycle restores after reattach, timeline groups close events, grid loads every camera's recordings, every PTZ move ends with a stop, recordings start and stop, talk releases the microphone`))
  .catch(err => fail('async tests', err));

