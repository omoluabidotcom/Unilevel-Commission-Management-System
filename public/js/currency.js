/**
 * AppCurrency — fetches live exchange rate + all system settings, caches them.
 * Place in public/js/currency.js
 *
 * Usage:
 *   await AppCurrency.load();
 *   AppCurrency.fmt(845)           // "₦1,337,585.50"
 *   AppCurrency.setting('minMonthlyPurchase')  // 30
 *   AppCurrency.setting('commissionPercentage') // 8
 *   AppCurrency.setting('autoApprove')          // false
 */
window.AppCurrency = (function () {

  var SYMBOLS = {
    USD: '$',   EUR: '€',   GBP: '£',   NGN: '₦',
    CAD: 'C$',  GHS: '₵',  KES: 'KSh', ZAR: 'R',
    AUD: 'A$',  JPY: '¥',  CNY: '¥',   INR: '₹',
  };

  var _settings = {};
  var _code     = 'NGN';
  var _symbol   = '₦';
  var _rate     = 1;
  var _loaded   = false;

  async function load() {
    if (_loaded) return;
    try {
      var res = await fetch('/api/settings/public');
      if (res.ok) {
        var data = await res.json();
        _settings = data;
        _code = 'NGN';
        _symbol = SYMBOLS.NGN;
        _rate = 1;
      }
    } catch (e) {
      console.warn('AppCurrency: could not load settings, using defaults.', e.message);
    }
    _loaded = true;
  }

  /** Get any setting value by key */
  function setting(key) { return _settings[key]; }

  /** NGN-only mode: conversion is a no-op. */
  function convert(n) { return Number(n || 0); }

  /** Format a NGN amount into display currency string */
  function fmt(n, decimals) {
    if (decimals === undefined) decimals = 2;
    if (_code === 'JPY' || _code === 'KRW') decimals = 0;
    return _symbol + convert(n).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  function symbol() { return _symbol; }
  function code()   { return _code;   }
  function rate()   { return _rate;   }
  function reset()  { _loaded = false; _settings = {}; }

  return { load, convert, fmt, symbol, code, rate, setting, reset };
})();
