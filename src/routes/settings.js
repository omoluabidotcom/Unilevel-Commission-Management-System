const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { getSettings, updateSettings } = require('../db/connection');

const router = express.Router();

// ── Exchange rate cache (server-side, 1 hour TTL) ──
var _rateCache = {};  // { 'NGN': { rate: 1580.5, ts: Date.now() } }
var RATE_TTL = 60 * 60 * 1000; // 1 hour

async function fetchLiveRate(toCurrency) {
  if (toCurrency === 'USD') return 1;

  var cached = _rateCache[toCurrency];
  if (cached && (Date.now() - cached.ts) < RATE_TTL) return cached.rate;

  try {
    // exchangerate-api free tier — no key needed for basic endpoint
    var https = require('https');
    var rate = await new Promise(function(resolve, reject) {
      https.get('https://open.er-api.com/v6/latest/USD', function(res) {
        var data = '';
        res.on('data', function(chunk){ data += chunk; });
        res.on('end', function(){
          try {
            var json = JSON.parse(data);
            resolve(json.rates[toCurrency] || 1);
          } catch(e){ reject(e); }
        });
      }).on('error', reject);
    });
    _rateCache[toCurrency] = { rate: rate, ts: Date.now() };
    return rate;
  } catch(e) {
    console.warn('Exchange rate fetch failed:', e.message);
    return _rateCache[toCurrency] ? _rateCache[toCurrency].rate : 1;
  }
}

// GET /api/settings/public — no auth required, returns only what the frontend needs
router.get('/public', async (req, res) => {
  try {
    const settings = await getSettings();
    if (!settings) return res.json({ minMonthlyPurchase: 0, currencyCode: 'USD', rate: 1 });
    const rate = await fetchLiveRate(settings.currencyCode);
    res.json({
      minMonthlyPurchase: settings.minMonthlyPurchase,
      currencyCode:       settings.currencyCode,
      commissionPercentage: typeof settings.commissionPercentage === 'object'
        ? settings.commissionPercentage
        : Number(settings.commissionPercentage || 0),
      payoutDay:    settings.payoutDay,
      networkDepth: settings.networkDepth,
      calcPeriod:   settings.calcPeriod,
      autoApprove:  settings.autoApprove,
      selfReg:      settings.selfReg,
      rate,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load settings' });
  }
});

// GET /api/settings
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const settings = await getSettings();
    if (!settings) return res.status(404).json({ message: 'Settings not found' });
    res.json({ settings });
  } catch (err) {
    console.error('getSettings error:', err);
    res.status(500).json({ message: 'Failed to load settings' });
  }
});

// PUT /api/settings
router.put('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const {
      minMonthlyPurchase, currencyCode, commissionPercentage,
      payoutDay, networkDepth, calcPeriod,
      emailNotif, pushNotif, distAlert, commAlert, minAlert,
      autoApprove, selfReg,
    } = req.body;

    if (minMonthlyPurchase === undefined || minMonthlyPurchase < 0) {
      return res.status(400).json({ message: 'Minimum purchase must be a positive number' });
    }

    const settings = await updateSettings({
      minMonthlyPurchase: parseFloat(minMonthlyPurchase),
      currencyCode: currencyCode || 'USD',
      commissionPercentage: parseFloat(commissionPercentage) || 0,
      payoutDay: parseInt(payoutDay) || 1,
      networkDepth: parseInt(networkDepth) || 5,
      calcPeriod: calcPeriod || 'monthly',
      emailNotif: Boolean(emailNotif),
      pushNotif: Boolean(pushNotif),
      distAlert: Boolean(distAlert),
      commAlert: Boolean(commAlert),
      minAlert: Boolean(minAlert),
      autoApprove: Boolean(autoApprove),
      selfReg: Boolean(selfReg),
    });

    res.json({ settings });
  } catch (err) {
    console.error('updateSettings error:', err);
    res.status(500).json({ message: 'Failed to save settings' });
  }
});

module.exports = router;



/*
const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { getSettings, updateSettings } = require('../db/connection');

const router = express.Router();

// ── Exchange rate cache (server-side, 1 hour TTL) ──
var _rateCache = {};  // { 'NGN': { rate: 1580.5, ts: Date.now() } }
var RATE_TTL = 60 * 60 * 1000; // 1 hour

async function fetchLiveRate(toCurrency) {
  if (toCurrency === 'USD') return 1;

  var cached = _rateCache[toCurrency];
  if (cached && (Date.now() - cached.ts) < RATE_TTL) return cached.rate;

  try {
    // exchangerate-api free tier — no key needed for basic endpoint
    var https = require('https');
    var rate = await new Promise(function(resolve, reject) {
      https.get('https://open.er-api.com/v6/latest/USD', function(res) {
        var data = '';
        res.on('data', function(chunk){ data += chunk; });
        res.on('end', function(){
          try {
            var json = JSON.parse(data);
            resolve(json.rates[toCurrency] || 1);
          } catch(e){ reject(e); }
        });
      }).on('error', reject);
    });
    _rateCache[toCurrency] = { rate: rate, ts: Date.now() };
    return rate;
  } catch(e) {
    console.warn('Exchange rate fetch failed:', e.message);
    return _rateCache[toCurrency] ? _rateCache[toCurrency].rate : 1;
  }
}

// GET /api/settings/public — no auth required, returns only what the frontend needs
router.get('/public', async (req, res) => {
  try {
    const settings = await getSettings();
    if (!settings) return res.json({ minMonthlyPurchase: 0, currencyCode: 'USD', rate: 1 });
    const rate = await fetchLiveRate(settings.currencyCode);
    res.json({
      minMonthlyPurchase: settings.minMonthlyPurchase,
      currencyCode:       settings.currencyCode,
      commissionPercentage: typeof settings.commissionPercentage === 'object'
        ? settings.commissionPercentage
        : Number(settings.commissionPercentage || 0),
      payoutDay:    settings.payoutDay,
      networkDepth: settings.networkDepth,
      calcPeriod:   settings.calcPeriod,
      autoApprove:  settings.autoApprove,
      selfReg:      settings.selfReg,
      rate,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load settings' });
  }
});

// GET /api/settings
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const settings = await getSettings();
    if (!settings) return res.status(404).json({ message: 'Settings not found' });
    res.json({ settings });
  } catch (err) {
    console.error('getSettings error:', err);
    res.status(500).json({ message: 'Failed to load settings' });
  }
});

// PUT /api/settings
router.put('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const {
      minMonthlyPurchase, currencyCode, commissionPercentage,
      payoutDay, networkDepth, calcPeriod,
      emailNotif, pushNotif, distAlert, commAlert, minAlert,
      autoApprove, selfReg,
    } = req.body;

    if (minMonthlyPurchase === undefined || minMonthlyPurchase < 0) {
      return res.status(400).json({ message: 'Minimum purchase must be a positive number' });
    }

    const settings = await updateSettings({
      minMonthlyPurchase: parseFloat(minMonthlyPurchase),
      currencyCode: currencyCode || 'USD',
      commissionPercentage: parseFloat(commissionPercentage) || 0,
      payoutDay: parseInt(payoutDay) || 1,
      networkDepth: parseInt(networkDepth) || 5,
      calcPeriod: calcPeriod || 'monthly',
      emailNotif: Boolean(emailNotif),
      pushNotif: Boolean(pushNotif),
      distAlert: Boolean(distAlert),
      commAlert: Boolean(commAlert),
      minAlert: Boolean(minAlert),
      autoApprove: Boolean(autoApprove),
      selfReg: Boolean(selfReg),
    });

    res.json({ settings });
  } catch (err) {
    console.error('updateSettings error:', err);
    res.status(500).json({ message: 'Failed to save settings' });
  }
});

module.exports = router;*/
