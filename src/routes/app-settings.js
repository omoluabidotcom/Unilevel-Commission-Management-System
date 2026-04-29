/**
 * AppSettings — loads system settings once and caches them.
 * Include this script on any page that needs settings (e.g. dashboard).
 *
 * Usage:
 *   const s = await AppSettings.get();
 *   console.log(s.minMonthlyPurchase); // e.g. 100
 *   console.log(s.currencyCode);       // e.g. "NGN"
 */
window.AppSettings = (function () {
  var _cache = null;

  async function get() {
    if (_cache) return _cache;
    try {
      // Uses the public endpoint — no auth required
      const res = await fetch('/api/settings/public');
      if (!res.ok) throw new Error('Failed to fetch settings');
      _cache = await res.json();
    } catch (e) {
      console.warn('AppSettings: could not load settings, using defaults.', e.message);
      _cache = { minMonthlyPurchase: 0, currencyCode: 'NGN' };
    }
    return _cache;
  }

  function clear() { _cache = null; }

  return { get, clear };
})();