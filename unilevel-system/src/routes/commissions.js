const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Placeholder /commissions endpoint
router.get('/', requireAuth, (req, res) => {
  res.json({
    commissions: [
      { id: 'c1', amount: 120.0, description: 'Monthly payout', date: '2026-03-01' },
      { id: 'c2', amount: 80.5, description: 'Team bonus', date: '2026-02-25' },
    ],
  });
});

module.exports = router;
