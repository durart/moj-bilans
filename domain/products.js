// Pure product identity and provenance helpers; retain legacy diary field semantics.
(() => {
  'use strict';

  function productKey(product) {
    return product.ean && /^\d{8,14}$/.test(product.ean)
      ? `ean:${product.ean}`
      : `name:${String(product.name || '').trim().toLocaleLowerCase('pl')}|${String(product.brand || '').trim().toLocaleLowerCase('pl')}`;
  }

  function provenance(product) {
    const result = {};
    if (typeof product?.recipeId === 'string') result.recipeId = product.recipeId;
    if (typeof product?.isEstimate === 'boolean') result.isEstimate = product.isEstimate;
    if (typeof product?.verification === 'string' && product.verification) result.verification = product.verification.slice(0, 80);
    if (typeof product?.sourceName === 'string' && product.sourceName) result.sourceName = product.sourceName.slice(0, 200);
    if (typeof product?.sourceUrl === 'string' && /^https:\/\//i.test(product.sourceUrl)) result.sourceUrl = product.sourceUrl.slice(0, 600);
    return result;
  }

  globalThis.MojBilansProducts = Object.freeze({ productKey, provenance });
})();
