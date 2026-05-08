const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { listCommissionsForUser, listAllCommissions, generateMonthlyCommissions } = require('../db/connection');

const router = express.Router();

// Distributor: own commissions
router.get('/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const period = req.query.period ? String(req.query.period) : undefined;
    const commissions = await listCommissionsForUser(userId, period);
    res.json({ commissions });
  } catch (err) {
    console.error('listCommissionsForUser error:', err);
    res.status(500).json({ message: 'Failed to load commissions' });
  }
});

// Admin: all commissions
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const period = req.query.period ? String(req.query.period) : undefined;
    const commissions = await listAllCommissions({ period });
    res.json({ commissions });
  } catch (err) {
    console.error('listAllCommissions error:', err);
    res.status(500).json({ message: 'Failed to load commissions' });
  }
});

// Admin: generate monthly commissions (explicit month required)
router.post('/generate-month', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const period = req.body && req.body.period ? String(req.body.period).trim() : '';
    if (!period) {
      return res.status(400).json({ message: 'period is required in format YYYY-MM' });
    }
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
      return res.status(400).json({ message: 'Invalid period format. Use YYYY-MM' });
    }

    const adminId = req.user.userId || req.user.id || null;
    const result = await generateMonthlyCommissions({ period, generatedBy: adminId });
    res.json({ result });
  } catch (err) {
    console.error('generateMonthlyCommissions error:', err);
    res.status(500).json({ message: 'Failed to generate monthly commissions' });
  }
});

module.exports = router;


/*
const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { listCommissionsForUser, listAllCommissions } = require('../db/connection');

const router = express.Router();

// Distributor: own commissions
router.get('/me', requireAuth, async (req, res) => {
  const period = req.query.period ? String(req.query.period) : undefined; // 'YYYY-MM'
  const commissions = await listCommissionsForUser(req.user.userId, period);
  res.json({ commissions });
});

// Admin: all commissions
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  const period = req.query.period ? String(req.query.period) : undefined; // 'YYYY-MM'
  const commissions = await listAllCommissions({ period });
  res.json({ commissions });
});

module.exports = router;
*/
