const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Example settings endpoint (admin only)
router.get('/', requireAuth, requireRole('admin'), (req, res) => {
  res.json({
    settings: {
      commissionRate: 0.1,
      payoutSchedule: 'monthly',
    },
  });
});

module.exports = router;
