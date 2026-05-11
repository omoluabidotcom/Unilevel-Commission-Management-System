const test = require('node:test');
const assert = require('node:assert/strict');

const { requireRole } = require('../src/middleware/auth');
const commissionsRouter = require('../src/routes/commissions');
const purchasesRouter = require('../src/routes/purchases');

function createResponseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test('requireRole enforces admin-only access for commission generation', () => {
  const middleware = requireRole('admin');
  const res = createResponseRecorder();
  let nextCalled = false;

  middleware({ user: { role: 'distributor' } }, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, {
    error: {
      code: 'AUTH_INSUFFICIENT_PERMISSIONS',
      message: 'Insufficient permissions',
    },
  });
});

test('distributor commissions list handler returns commission rows', async () => {
  const commissions = [{ id: '1', totalCommission: 12.5 }];
  const handler = commissionsRouter.createListOwnCommissionsHandler({
    listCommissionsForUser: async (userId, period) => {
      assert.equal(userId, 17);
      assert.equal(period, '2026-05');
      return commissions;
    }
  });
  const res = createResponseRecorder();

  await handler({ query: { period: '2026-05' }, user: { id: 17, role: 'distributor' } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { commissions });
});

test('admin commissions list handler returns commission rows', async () => {
  const commissions = [{ id: '2', totalCommission: 22 }];
  const handler = commissionsRouter.createListAllCommissionsHandler({
    listAllCommissions: async ({ period }) => {
      assert.equal(period, '2026-05');
      return commissions;
    }
  });
  const res = createResponseRecorder();

  await handler({ query: { period: '2026-05' }, user: { id: 1, role: 'admin' } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { commissions });
});

test('admin purchases list handler returns purchase rows', async () => {
  const purchases = [{ id: '3', amount: 100 }];
  const handler = purchasesRouter.createListPurchasesHandler({
    listPurchases: async ({ period }) => {
      assert.equal(period, '2026-05');
      return purchases;
    }
  });
  const res = createResponseRecorder();

  await handler({ query: { period: '2026-05' }, user: { id: 1, role: 'admin' } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { purchases });
});

test('generate-month handler rejects missing period', async () => {
  const handler = commissionsRouter.createGenerateMonthHandler({
    generateMonthlyCommissions: async () => ({})
  });
  const res = createResponseRecorder();

  await handler({ body: {}, user: { id: 1, role: 'admin' } }, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, {
    error: {
      code: 'GENERATION_PERIOD_REQUIRED',
      message: 'period is required in format YYYY-MM',
      details: null,
    },
  });
});

test('generate-month handler rejects invalid period format', async () => {
  const handler = commissionsRouter.createGenerateMonthHandler({
    generateMonthlyCommissions: async () => ({})
  });
  const res = createResponseRecorder();

  await handler({ body: { period: '2026-13' }, user: { id: 1, role: 'admin' } }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error.code, 'GENERATION_INVALID_PERIOD');
  assert.deepEqual(res.body.error.details, { period: '2026-13' });
});

test('generate-month handler returns summary on success', async () => {
  let capturedArgs = null;
  const summary = { period: '2026-05', scannedDistributors: 4 };
  const handler = commissionsRouter.createGenerateMonthHandler({
    generateMonthlyCommissions: async (args) => {
      capturedArgs = args;
      return summary;
    }
  });
  const res = createResponseRecorder();

  await handler({ body: { period: '2026-05' }, user: { userId: 99, role: 'admin' } }, res);

  assert.deepEqual(capturedArgs, { period: '2026-05', generatedBy: 99 });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { summary });
});

test('generate-month handler returns structured service errors', async () => {
  const handler = commissionsRouter.createGenerateMonthHandler({
    generateMonthlyCommissions: async () => {
      const err = new Error('Commission settings are not configured');
      err.code = 'GENERATION_SETTINGS_MISSING';
      err.statusCode = 500;
      err.details = null;
      throw err;
    }
  });
  const res = createResponseRecorder();

  await handler({ body: { period: '2026-05' }, user: { id: 1, role: 'admin' } }, res);

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, {
    error: {
      code: 'GENERATION_SETTINGS_MISSING',
      message: 'Commission settings are not configured',
      details: null,
    },
  });
});