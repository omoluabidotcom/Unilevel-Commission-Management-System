const test = require('node:test');
const assert = require('node:assert/strict');

const {
  calculateCommissionForDistributor,
  decideCommissionPersistence,
  validateGenerationSettings,
} = require('../src/services/commission-generation');

test('skips distributors below the minimum threshold', () => {
  const result = calculateCommissionForDistributor({
    userId: 12,
    personalAmount: 49.99,
    downlineAmount: 100,
    minMonthlyPurchase: 50,
    commissionPercentage: 10,
    generatedAt: '2026-05-12T00:00:00.000Z',
    generatedBy: 9,
  });

  assert.equal(result.eligible, false);
  assert.equal(result.skippedReason, 'below_minimum');
  assert.equal(result.personalAmount, 49.99);
});

test('calculates personal and downline totals with percentage snapshot', () => {
  const result = calculateCommissionForDistributor({
    userId: 7,
    personalAmount: 100,
    downlineAmount: 50,
    minMonthlyPurchase: 50,
    commissionPercentage: 10,
    generatedAt: '2026-05-12T00:00:00.000Z',
    generatedBy: 4,
  });

  assert.equal(result.eligible, true);
  assert.equal(result.personalAmount, 100);
  assert.equal(result.downlineAmount, 50);
  assert.equal(result.totalCommission, 15);

  const breakdown = JSON.parse(result.breakdown);
  assert.deepEqual(breakdown, {
    personalBase: 100,
    downlineBase: 50,
    commissionBase: 150,
    minMonthlyPurchaseUsed: 50,
    pctUsed: 10,
    generatedAt: '2026-05-12T00:00:00.000Z',
    generatedBy: '4',
  });
});

test('rounds commission values to two decimals', () => {
  const result = calculateCommissionForDistributor({
    userId: 8,
    personalAmount: 100.335,
    downlineAmount: 10.335,
    minMonthlyPurchase: 50,
    commissionPercentage: 7.5,
    generatedAt: '2026-05-12T00:00:00.000Z',
    generatedBy: null,
  });

  assert.equal(result.personalAmount, 100.34);
  assert.equal(result.downlineAmount, 10.34);
  assert.equal(result.totalCommission, 8.3);
});

test('uses pending-only rerun persistence policy', () => {
  assert.equal(decideCommissionPersistence(undefined), 'insert');
  assert.equal(decideCommissionPersistence({ status: 'pending' }), 'update');
  assert.equal(decideCommissionPersistence({ status: 'approved' }), 'skip_locked');
  assert.equal(decideCommissionPersistence({ status: 'paid' }), 'skip_locked');
});

test('rejects invalid commission settings', () => {
  assert.throws(
    () => validateGenerationSettings({ minMonthlyPurchase: -1, commissionPercentage: 10, rawCommissionPercentage: 10 }),
    (err) => err.code === 'GENERATION_INVALID_MINIMUM_PURCHASE'
  );

  assert.throws(
    () => validateGenerationSettings({ minMonthlyPurchase: 50, commissionPercentage: 101, rawCommissionPercentage: 101 }),
    (err) => err.code === 'GENERATION_INVALID_COMMISSION_PERCENTAGE'
  );
});