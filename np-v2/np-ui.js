/* NP v2 quick-entry adapter. Reuses the original modal flow without
   reading or writing localStorage, IndexedDB or application state. */
(() => {
  'use strict';
  window.addEventListener('DOMContentLoaded', () => {
    const originalAddButton = document.getElementById('addFast');
    if (!originalAddButton) return;
    const open = mode => {
      originalAddButton.click();
      if (mode !== 'search') {
        const tab = document.querySelector('.mode-tab[data-mode="' + mode + '"]');
        if (tab) tab.click();
      }
    };
    [['npQuickAdd', 'search'], ['npQuickRecent', 'recent'], ['npQuickEan', 'ean']]
      .forEach(([id, mode]) => {
        const button = document.getElementById(id);
        if (button) button.addEventListener('click', () => open(mode));
      });
  });
})();
