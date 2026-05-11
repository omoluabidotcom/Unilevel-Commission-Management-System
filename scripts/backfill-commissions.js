#!/usr/bin/env node

/**
 * Phase 7.2 - Optional Historical Backfill Script
 * 
 * Purpose: Generate commissions for historical months in order to establish clean baseline.
 * 
 * Usage:
 *   node scripts/backfill-commissions.js 2024-01 2025-12
 *   node scripts/backfill-commissions.js --help
 * 
 * The script will:
 * 1. Validate date range
 * 2. Connect to database
 * 3. Generate commissions for each month in order
 * 4. Log summary and audit trail for each run
 * 5. Report completion status
 * 
 * Exit codes:
 *   0 = success
 *   1 = invalid arguments or runtime error
 */

const path = require('path');

// Validate arguments
const args = process.argv.slice(2);

function showHelp() {
  console.log(`
Backfill historical commission generations.

Usage:
  node scripts/backfill-commissions.js <startMonth> <endMonth>
  node scripts/backfill-commissions.js --help

Arguments:
  startMonth    First month to generate (format: YYYY-MM, e.g., 2024-01)
  endMonth      Last month to generate (format: YYYY-MM, e.g., 2025-12)

Options:
  --help        Show this help message
  --dry-run     Validate without generating (checks database connection only)

Examples:
  # Backfill all of 2024
  node scripts/backfill-commissions.js 2024-01 2024-12

  # Backfill January through May 2025
  node scripts/backfill-commissions.js 2025-01 2025-05

  # Test database connection
  node scripts/backfill-commissions.js --dry-run 2025-01 2025-01

Notes:
  - Requires database connection configured via .env or system environment
  - Admins must be seeded before backfill (uses first admin ID in logs)
  - Idempotent: safe to re-run; pending-only policy prevents duplicate generation
  - Audit trail stored in commission breakdowns for traceability
`);
}

if (args.includes('--help')) {
  showHelp();
  process.exit(0);
}

const dryRun = args.includes('--dry-run');
const actualArgs = args.filter(a => !a.startsWith('--'));

if (actualArgs.length < 2) {
  console.error('Error: startMonth and endMonth required');
  console.error('Run with --help for usage information');
  process.exit(1);
}

const [startMonth, endMonth] = actualArgs;

// Validate month format (YYYY-MM)
function isValidMonth(month) {
  return /^\d{4}-\d{2}$/.test(month) && !isNaN(new Date(month + '-01'));
}

if (!isValidMonth(startMonth)) {
  console.error(`Error: Invalid startMonth "${startMonth}" (expected format: YYYY-MM)`);
  process.exit(1);
}

if (!isValidMonth(endMonth)) {
  console.error(`Error: Invalid endMonth "${endMonth}" (expected format: YYYY-MM)`);
  process.exit(1);
}

if (startMonth > endMonth) {
  console.error(`Error: startMonth "${startMonth}" must be <= endMonth "${endMonth}"`);
  process.exit(1);
}

// Generate list of months
function getMonthRange(start, end) {
  const months = [];
  let current = new Date(start + '-01');
  const endDate = new Date(end + '-01');
  
  while (current <= endDate) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    months.push(`${year}-${month}`);
    current.setMonth(current.getMonth() + 1);
  }
  
  return months;
}

const months = getMonthRange(startMonth, endMonth);

async function runBackfill() {
  try {
    console.log(`\n📋 Commission Backfill Process`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Start Month:  ${startMonth}`);
    console.log(`End Month:    ${endMonth}`);
    console.log(`Total Months: ${months.length}`);
    console.log(`Months:       ${months.join(', ')}`);
    if (dryRun) {
      console.log(`Mode:         DRY RUN (validation only)`);
    }
    console.log(`${'='.repeat(60)}\n`);

    // Load database connection
    const db = require(path.join(__dirname, '..', 'src', 'db', 'connection'));
    console.log('✓ Database connection loaded');

    // Verify we can connect
    const result = await db.query('SELECT 1');
    console.log('✓ Database is accessible\n');

    if (dryRun) {
      console.log('✓ Dry-run validation passed. Ready to backfill.');
      console.log('\nTo run the actual backfill, execute without --dry-run:');
      console.log(`  node scripts/backfill-commissions.js ${startMonth} ${endMonth}\n`);
      return 0;
    }

    // Perform backfill
    const summaries = [];
    let totalScanned = 0;
    let totalGenerated = 0;
    let totalUpdated = 0;

    for (let i = 0; i < months.length; i++) {
      const month = months[i];
      const monthNum = i + 1;
      
      process.stdout.write(`[${monthNum}/${months.length}] Generating ${month}... `);
      
      try {
        // Get first admin for generation log (fallback: system)
        const adminRow = await db.query(
          'SELECT id FROM users WHERE role = ? ORDER BY createdAt LIMIT 1',
          ['admin']
        );
        const generatedBy = adminRow.length > 0 ? adminRow[0].id : 'system-backfill';

        // Call generation service
        const summary = await db.generateMonthlyCommissions({
          period: month,
          generatedBy
        });

        totalScanned += summary.scanned;
        totalGenerated += summary.generated;
        totalUpdated += summary.updated;

        summaries.push({ month, ...summary });

        console.log(`✓ scanned=${summary.scanned}, generated=${summary.generated}, updated=${summary.updated}`);
      } catch (err) {
        console.error(`✗ FAILED: ${err.message}`);
        throw err;
      }
    }

    // Report summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Backfill Summary`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Months Processed:      ${months.length}`);
    console.log(`Total Distributors Scanned:  ${totalScanned}`);
    console.log(`Total Commissions Generated: ${totalGenerated}`);
    console.log(`Total Commissions Updated:   ${totalUpdated}`);
    console.log(`${'='.repeat(60)}\n`);

    console.log('📝 Detailed Summary by Month:');
    summaries.forEach(s => {
      console.log(`  ${s.month}: scanned=${s.scanned}, generated=${s.generated}, updated=${s.updated}, skipped_minimum=${s.skipped_minimum}, skipped_locked=${s.skipped_locked}`);
    });

    console.log(`\n✅ Backfill completed successfully!`);
    console.log(`   All months from ${startMonth} to ${endMonth} have been processed.`);
    console.log(`   Commissions are now available in the database.\n`);

    return 0;
  } catch (error) {
    console.error(`\n❌ Backfill failed: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    return 1;
  }
}

// Run backfill
runBackfill().then(code => {
  process.exit(code);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
