const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { listCommissionsForUser, listAllCommissions, generateMonthlyCommissions } = require('../db/connection');

const router = express.Router();

function createListOwnCommissionsHandler({ listCommissionsForUser: loadUserCommissions }) {
  return async (req, res) => {
    try {
      const userId = req.user.userId || req.user.id;
      const period = req.query.period ? String(req.query.period) : undefined;
      const commissions = await loadUserCommissions(userId, period);
      return res.json({ commissions });
    } catch (err) {
      console.error('listCommissionsForUser error:', err);
      return res.status(500).json({ message: 'Failed to load commissions' });
    }
  };
}

function createListAllCommissionsHandler({ listAllCommissions: loadAllCommissions }) {
  return async (req, res) => {
    try {
      const period = req.query.period ? String(req.query.period) : undefined;
      const commissions = await loadAllCommissions({ period });
      return res.json({ commissions });
    } catch (err) {
      console.error('listAllCommissions error:', err);
      return res.status(500).json({ message: 'Failed to load commissions' });
    }
  };
}

function validateGenerationPeriod(value) {
  const period = value ? String(value).trim() : '';
  if (!period) {
    return {
      ok: false,
      status: 400,
      error: {
        code: 'GENERATION_PERIOD_REQUIRED',
        message: 'period is required in format YYYY-MM',
        details: null,
      },
    };
  }

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
    return {
      ok: false,
      status: 400,
      error: {
        code: 'GENERATION_INVALID_PERIOD',
        message: 'Invalid period format. Use YYYY-MM',
        details: { period },
      },
    };
  }

  return { ok: true, period };
}

function createGenerateMonthHandler({ generateMonthlyCommissions: runMonthlyGeneration }) {
  return async (req, res) => {
    try {
      const validation = validateGenerationPeriod(req.body && req.body.period);
      if (!validation.ok) {
        return res.status(validation.status).json({ error: validation.error });
      }

      const adminId = req.user.userId || req.user.id || null;
      const summary = await runMonthlyGeneration({ period: validation.period, generatedBy: adminId });
      return res.json({ summary });
    } catch (err) {
      console.error('generateMonthlyCommissions error:', err);
      return res.status(err.statusCode || 500).json({
        error: {
          code: err.code || 'GENERATION_FAILED',
          message: err.message || 'Failed to generate monthly commissions',
          details: err.details || null,
        },
      });
    }
  };
}

// Distributor: own commissions
router.get('/me', requireAuth, createListOwnCommissionsHandler({ listCommissionsForUser }));

// Admin: all commissions
router.get('/', requireAuth, requireRole('admin'), createListAllCommissionsHandler({ listAllCommissions }));

// Admin: generate monthly commissions (explicit month required)
router.post('/generate-month', requireAuth, requireRole('admin'), createGenerateMonthHandler({ generateMonthlyCommissions }));

module.exports = router;
module.exports.createListOwnCommissionsHandler = createListOwnCommissionsHandler;
module.exports.createListAllCommissionsHandler = createListAllCommissionsHandler;
module.exports.validateGenerationPeriod = validateGenerationPeriod;
module.exports.createGenerateMonthHandler = createGenerateMonthHandler;


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
