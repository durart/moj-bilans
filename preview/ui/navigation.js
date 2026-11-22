// UI navigation controller; rendering remains owned by the application.
(() => {
  'use strict';

  function showPage(page, renderAll) {
    document.querySelectorAll('.page').forEach(element => {
      element.classList.toggle('active', element.id === `page-${page}`);
    });
    document.querySelectorAll('.nav-item').forEach(element => {
      const active = element.dataset.page === page;
      element.classList.toggle('selected', active);
      if (active) element.setAttribute('aria-current', 'page');
      else element.removeAttribute('aria-current');
    });
    window.scrollTo({ top: 0, behavior: 'instant' });
    renderAll();
  }

  globalThis.MojBilansNavigation = Object.freeze({ showPage });
})();
