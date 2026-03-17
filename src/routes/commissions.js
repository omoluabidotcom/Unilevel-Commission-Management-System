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
