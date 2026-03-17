const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { listPurchases, createPurchase, listDistributors, listPurchasesForUser, listPurchasesForDownlines, upsertCommission } = require('../db/connection');

const router = express.Router();

// Admin: list purchases (optionally filter by period 'YYYY-MM')
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  const period = req.query.period ? String(req.query.period) : undefined;
  const purchases = await listPurchases({ period });
  res.json({ purchases });
});

// Admin: list all distributors for the Add Purchase dropdown
router.get('/distributors', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const distributors = await listDistributors();
    res.json({ distributors });
  } catch (err) {
    console.error('listDistributors error:', err);
    res.status(500).json({ message: 'Failed to load distributors' });
  }
});

// Admin: create a new purchase
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { distributorName, distributorEmail, date, amount, products, status } = req.body;

    if (!distributorName || !distributorEmail) {
      return res.status(400).json({ message: 'distributorName and distributorEmail are required' });
    }
    if (!date || !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ message: 'A valid date and amount are required' });
    }

    const purchase = await createPurchase({
      distributorName,
      distributorEmail,
      period: String(date).slice(0, 7),   // 'YYYY-MM'
      createdAt: date,
      amount: parseFloat(parseFloat(amount).toFixed(2)),
      products: products || '',
      status: status || 'paid',
    });

    res.status(201).json({ purchase });
  } catch (err) {
    console.error('createPurchase error:', err);
    res.status(500).json({ message: 'Failed to save purchase' });
  }
});

// Distributor: own purchases
router.get('/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const period = req.query.period ? String(req.query.period) : undefined;
    const purchases = await listPurchasesForUser(userId, { period });
    res.json({ purchases });
  } catch (err) {
    console.error('listPurchasesForUser error:', err);
    res.status(500).json({ message: 'Failed to load purchases' });
  }
});

// Distributor: purchases of their direct downlines (for my-downlines page)
router.get('/my-downlines', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const purchases = await listPurchasesForDownlines(userId);
    res.json({ purchases });
  } catch (err) {
    console.error('listPurchasesForDownlines error:', err);
    res.status(500).json({ message: 'Failed to load downline purchases' });
  }
});

// Admin: recalculate commissions for all existing purchases
router.post('/recalculate-commissions', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const allPurchases = await listPurchases();
    // Group by user+period and upsert
    const seen = new Set();
    for (const p of allPurchases) {
      const key = p.userId + '|' + p.period;
      if (!seen.has(key)) {
        seen.add(key);
        await upsertCommission(p.userId, p.period, 0); // amount=0 since upsertCommission re-sums from DB
      }
    }
    res.json({ message: `Recalculated commissions for ${seen.size} user/period combinations` });
  } catch (err) {
    console.error('recalculate-commissions error:', err);
    res.status(500).json({ message: 'Failed to recalculate commissions' });
  }
});

module.exports = router;



/*
const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { listPurchases, createPurchase, listDistributors } = require('../db/connection');

const router = express.Router();

// Admin: list purchases (optionally filter by period 'YYYY-MM')
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  const period = req.query.period ? String(req.query.period) : undefined;
  const purchases = await listPurchases({ period });
  res.json({ purchases });
});

// Admin: list all distributors for the Add Purchase dropdown
router.get('/distributors', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const distributors = await listDistributors();
    res.json({ distributors });
  } catch (err) {
    console.error('listDistributors error:', err);
    res.status(500).json({ message: 'Failed to load distributors' });
  }
});

// Admin: create a new purchase
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { distributorName, distributorEmail, date, amount, products, status } = req.body;

    if (!distributorName || !distributorEmail) {
      return res.status(400).json({ message: 'distributorName and distributorEmail are required' });
    }
    if (!date || !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ message: 'A valid date and amount are required' });
    }

    const purchase = await createPurchase({
      distributorName,
      distributorEmail,
      period: String(date).slice(0, 7),   // 'YYYY-MM'
      createdAt: date,
      amount: parseFloat(parseFloat(amount).toFixed(2)),
      products: products || '',
      status: status || 'paid',
    });

    res.status(201).json({ purchase });
  } catch (err) {
    console.error('createPurchase error:', err);
    res.status(500).json({ message: 'Failed to save purchase' });
  }
});

module.exports = router;
*/
