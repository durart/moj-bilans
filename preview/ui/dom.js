// Shared DOM helpers; no changes to markup or event behavior.
(() => {
  'use strict';
  const query = selector => document.querySelector(selector);
  const queryAll = selector => [...document.querySelectorAll(selector)];
  const escapeText = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
  globalThis.MojBilansDom = Object.freeze({ query, queryAll, escapeText });
})();
