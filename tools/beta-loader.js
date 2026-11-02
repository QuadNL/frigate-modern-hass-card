// Development loader for the side-by-side beta build.
//
// Register this file once as the dashboard resource for the beta, instead of the
// beta itself:
//
//   /local/frigate-modern-hass-card-beta/beta-loader.js   (JavaScript module)
//
// It imports the beta with a fresh query on every page load. A new build is then
// picked up on the next reload, without editing the resource and bumping ?v= by
// hand, and without Home Assistant's service worker handing back a stale copy:
// it never sees the same URL twice. This file itself never changes, so it does
// not matter if that is cached.
//
// The cost is that the beta is downloaded on every load, which is fine for a
// test build and the reason this is not how the released card is loaded.
import(`/local/frigate-modern-hass-card-beta/frigate-modern-hass-card-beta.js?t=${Date.now()}`);
