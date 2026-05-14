function round2(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

function createGenerationSummary({
  period,
  minMonthlyPurchase,
  commissionPercentage,
  scannedDistributors,
  eligibleDistributors,
  generatedCount,
  updatedCount,
  skippedBelowMinimum,
  skippedLockedStatus,
}) {
  return {
    period,
    settingsUsed: {
      minMonthlyPurchase,
      commissionPercentage,
    },
    scannedDistributors,
    eligibleDistributors,
    generatedCount,
    updatedCount,
    skippedBelowMinimum,
    skippedLockedStatus,
  };
}

function createGenerationError(code, message, details, statusCode) {
  const error = new Error(message);
  error.code = code;
  error.details = details || null;
  error.statusCode = statusCode || 500;
  return error;
}

function validateGenerationSettings({ minMonthlyPurchase, commissionPercentage, rawCommissionPercentage }) {
  if (!Number.isFinite(minMonthlyPurchase) || minMonthlyPurchase < 0) {
    throw createGenerationError(
      'GENERATION_INVALID_MINIMUM_PURCHASE',
      'Minimum monthly purchase setting is invalid',
      { minMonthlyPurchase },
      500
    );
  }

  if (!Number.isFinite(commissionPercentage) || commissionPercentage < 0 || commissionPercentage > 100) {
    throw createGenerationError(
      'GENERATION_INVALID_COMMISSION_PERCENTAGE',
      'Commission percentage setting is invalid',
      { commissionPercentage: rawCommissionPercentage },
      500
    );
  }
}

function calculateCommissionForDistributor({
  userId,
  personalAmount,
  downlineAmount,
  minMonthlyPurchase,
  commissionPercentage,
  generatedAt,
  generatedBy,
}) {
  const roundedPersonalAmount = round2(personalAmount);
  if (roundedPersonalAmount <= 0 || roundedPersonalAmount < minMonthlyPurchase) {
    return {
      userId: String(userId),
      eligible: false,
      skippedReason: 'below_minimum',
      personalAmount: roundedPersonalAmount,
      downlineAmount: round2(downlineAmount),
    };
  }

  const roundedDownlineAmount = round2(downlineAmount);
  const commissionBase = round2(roundedPersonalAmount + roundedDownlineAmount);
  const totalCommission = round2(commissionBase * (commissionPercentage / 100));

  return {
    userId: String(userId),
    eligible: true,
    skippedReason: null,
    personalAmount: roundedPersonalAmount,
    downlineAmount: roundedDownlineAmount,
    totalCommission,
    breakdown: JSON.stringify({
      personalBase: roundedPersonalAmount,
      downlineBase: roundedDownlineAmount,
      commissionBase,
      minMonthlyPurchaseUsed: minMonthlyPurchase,
      pctUsed: commissionPercentage,
      generatedAt,
      generatedBy: generatedBy == null ? null : String(generatedBy),
    }),
  };
}

function decideCommissionPersistence(existingRow) {
  if (!existingRow) {
    return 'insert';
  }

  const status = String(existingRow.status || 'pending');
  return status === 'pending' ? 'update' : 'skip_locked';
}

module.exports = {
  round2,
  createGenerationSummary,
  createGenerationError,
  validateGenerationSettings,
  calculateCommissionForDistributor,
  decideCommissionPersistence,
};