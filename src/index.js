// index.js — registers custom elements and announces card to HA
import { CARD_TAG, VERSION } from './constants.js';
import { FrigateModernHassCard } from './card.js';
import { FrigateModernHassCardEditor } from './editor.js';

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
