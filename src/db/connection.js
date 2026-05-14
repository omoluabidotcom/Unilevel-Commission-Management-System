/**
 * DB access layer.
 *
 * This project is configured to use MySQL via environment variables.
 * (No in-memory fallback.)
 */

const bcrypt = require('bcrypt');
const {
  createGenerationSummary,
  createGenerationError,
  validateGenerationSettings,
  calculateCommissionForDistributor,
  decideCommissionPersistence,
} = require('../services/commission-generation');

const dbConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

function hasDbConfig() {
  return Boolean(dbConfig.host && dbConfig.user && dbConfig.database);
}

let poolPromise;
async function getPool() {
  if (!hasDbConfig()) {
    throw new Error('Missing DB config. Set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME in .env');
  }
  if (!poolPromise) {
    // Lazy require so the app can still run without MySQL installed/configured.
    // eslint-disable-next-line global-require
    const mysql = require('mysql2/promise');
    poolPromise = mysql.createPool({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return poolPromise;
}

// Ensures profile_picture can hold base64 image data
async function ensureProfilePictureColumn() {
  try {
    const pool = await getPool();
    await pool.execute(
      "ALTER TABLE users MODIFY COLUMN profile_picture MEDIUMTEXT"
    );
  } catch (err) {
    // Ignore if already correct type
    if (err.code !== 'ER_DUP_FIELDNAME') {
      console.warn('ensureProfilePictureColumn:', err.message);
    }
  }
}

async function ensureCommissionBreakdownColumn() {
  try {
    const pool = await getPool();
    await pool.execute('ALTER TABLE commissions ADD COLUMN breakdown JSON');
  } catch (err) {
    if (err.code !== 'ER_DUP_FIELDNAME') {
      console.warn('ensureCommissionBreakdownColumn:', err.message);
    }
  }
}

async function listUsers() {
  const pool = await getPool();
  const [rows] = await pool.execute(
    'SELECT id, username, email, full_name, phone, profile_picture, role, sponsor_id, is_active, created_at, last_login FROM users ORDER BY id ASC'
  );
  return rows.map((r) => ({
    id: String(r.id),
    username: r.username,
    email: r.email,
    fullName: r.full_name,
    phone: r.phone,
    profilePicture: r.profile_picture,
    role: r.role,
    sponsorId: r.sponsor_id == null ? null : String(r.sponsor_id),
    isActive: Boolean(r.is_active),
    createdAt: r.created_at,
    lastLogin: r.last_login || null,
  }));
}

async function listPurchases({ period } = {}) {
  const pool = await getPool();
  const params = [];
  let sql =
    'SELECT p.id, p.user_id, p.period, p.amount, p.product_details, p.transaction_id, p.status, p.created_at, u.email, u.full_name FROM purchases p JOIN users u ON u.id = p.user_id';
  if (period) {
    sql += ' WHERE p.period = ?';
    params.push(period);
  }
  sql += ' ORDER BY p.created_at DESC, p.id DESC';
  const [rows] = await pool.execute(sql, params);
  return rows.map((r) => ({
    id: String(r.id),
    userId: String(r.user_id),
    period: r.period,
    amount: Number(r.amount),
    productDetails:
      r.product_details == null
        ? null
        : typeof r.product_details === 'string'
          ? JSON.parse(r.product_details)
          : r.product_details,
    transactionId: r.transaction_id,
    createdAt: r.created_at,
    distributorEmail: r.email,
    distributorName: r.full_name,
    status: r.status || 'paid',
  }));
}

// Returns all active distributor users for the Add Purchase dropdown
async function listPurchasesForUser(userId, { period } = {}) {
  const pool = await getPool();
  const params = [userId];
  let sql =
    'SELECT p.id, p.user_id, p.period, p.amount, p.product_details, p.status, p.created_at, u.email, u.full_name ' +
    'FROM purchases p JOIN users u ON u.id = p.user_id WHERE p.user_id = ?';
  if (period) { sql += ' AND p.period = ?'; params.push(period); }
  sql += ' ORDER BY p.created_at DESC, p.id DESC';
  const [rows] = await pool.execute(sql, params);
  return rows.map((r) => ({
    id: String(r.id),
    userId: String(r.user_id),
    period: r.period,
    amount: Number(r.amount),
    productDetails: r.product_details == null ? null
      : typeof r.product_details === 'string' ? JSON.parse(r.product_details) : r.product_details,
    status: r.status || 'paid',
    createdAt: r.created_at,
    distributorEmail: r.email,
    distributorName: r.full_name,
  }));
}

async function listPurchasesForUsers(userIds, { period } = {}) {
  if (!userIds || !userIds.length) return [];
  const pool = await getPool();
  const placeholders = userIds.map(() => '?').join(',');
  const params = [...userIds];
  let sql = 'SELECT p.id, p.user_id, p.period, p.amount, p.product_details, p.status, p.created_at '
    + 'FROM purchases p WHERE p.user_id IN (' + placeholders + ')';
  if (period) { sql += ' AND p.period = ?'; params.push(period); }
  sql += ' ORDER BY p.created_at DESC';
  const [rows] = await pool.execute(sql, params);
  return rows.map((r) => ({
    id: String(r.id),
    userId: String(r.user_id),
    period: r.period,
    amount: Number(r.amount),
    status: r.status || 'paid',
    createdAt: r.created_at,
  }));
}

async function listPurchasesForUsers(userIds, { period } = {}) {
  if (!userIds || !userIds.length) return [];
  const pool = await getPool();
  const placeholders = userIds.map(() => '?').join(',');
  const params = [...userIds];
  let sql = `SELECT p.id, p.user_id, p.period, p.amount, p.product_details, p.status, p.created_at
             FROM purchases p WHERE p.user_id IN (${placeholders})`;
  if (period) { sql += ' AND p.period = ?'; params.push(period); }
  sql += ' ORDER BY p.created_at DESC';
  const [rows] = await pool.execute(sql, params);
  return rows.map((r) => ({
    id: String(r.id),
    userId: String(r.user_id),
    period: r.period,
    amount: Number(r.amount),
    status: r.status || 'paid',
    createdAt: r.created_at,
  }));
}

async function listPurchasesForDownlines(sponsorId) {
  const pool = await getPool();
  // Get all purchases for users whose sponsor_id = sponsorId
  const [rows] = await pool.execute(
    `SELECT p.id, p.user_id, p.period, p.amount, p.product_details, p.status, p.created_at
     FROM purchases p
     JOIN users u ON u.id = p.user_id
     WHERE u.sponsor_id = ?
     ORDER BY p.created_at DESC`,
    [sponsorId]
  );
  return rows.map((r) => ({
    id: String(r.id),
    userId: String(r.user_id),
    period: r.period,
    amount: Number(r.amount),
    productDetails: r.product_details == null ? null
      : typeof r.product_details === 'string' ? JSON.parse(r.product_details) : r.product_details,
    status: r.status || 'paid',
    createdAt: r.created_at,
  }));
}

async function listDownlinesForUser(userId) {
  const pool = await getPool();
  const [rows] = await pool.execute(
    'SELECT id, full_name, username, email, phone, is_active, created_at FROM users WHERE sponsor_id = ? ORDER BY created_at DESC',
    [userId]
  );
  return rows.map((r) => ({
    id: String(r.id),
    fullName: r.full_name || r.username || r.email,
    email: r.email,
    phone: r.phone,
    isActive: Boolean(r.is_active),
    createdAt: r.created_at,
  }));
}

async function listPurchasesForDownlines(sponsorId, { period } = {}) {
  const pool = await getPool();
  const params = [sponsorId];
  let sql =
    'SELECT p.id, p.user_id, p.period, p.amount, p.product_details, p.status, p.created_at ' +
    'FROM purchases p JOIN users u ON u.id = p.user_id WHERE u.sponsor_id = ?';
  if (period) { sql += ' AND p.period = ?'; params.push(period); }
  sql += ' ORDER BY p.created_at DESC';
  const [rows] = await pool.execute(sql, params);
  return rows.map((r) => ({
    id: String(r.id),
    userId: String(r.user_id),
    period: r.period,
    amount: Number(r.amount),
    status: r.status || 'paid',
    createdAt: r.created_at,
  }));
}

async function listDistributors() {
  const pool = await getPool();
  const [rows] = await pool.execute(
    'SELECT id, full_name, email FROM users WHERE role = ? AND is_active = 1 ORDER BY full_name ASC',
    ['distributor']
  );
  return rows.map((r) => ({
    id: String(r.id),
    name: r.full_name || r.email,
    email: r.email,
  }));
}

async function generateMonthlyCommissions({ period, generatedBy }) {
  const pool = await getPool();
  await ensureCommissionBreakdownColumn();
  const settings = await getSettings();

  if (!settings) {
    throw createGenerationError(
      'GENERATION_SETTINGS_MISSING',
      'Commission settings are not configured',
      null,
      500
    );
  }

  const minMonthlyPurchase = Number(settings?.minMonthlyPurchase || 0);
  const rawPct = settings ? settings.commissionPercentage : 0;
  const commissionPercentage = typeof rawPct === 'object'
    ? Number(rawPct.level1 || 0)
    : Number(rawPct || 0);

  validateGenerationSettings({
    minMonthlyPurchase,
    commissionPercentage,
    rawCommissionPercentage: rawPct,
  });

  const [distributorRows] = await pool.execute(
    'SELECT id FROM users WHERE role = ?',
    ['distributor']
  );

  const [personalRows] = await pool.execute(
    'SELECT user_id, COALESCE(SUM(amount), 0) AS total FROM purchases WHERE period = ? GROUP BY user_id',
    [period]
  );
  const personalByUser = new Map(
    personalRows.map((r) => [String(r.user_id), Number(r.total || 0)])
  );

  const [downlineRows] = await pool.execute(
    `SELECT u.sponsor_id AS sponsor_id, COALESCE(SUM(p.amount), 0) AS total
     FROM purchases p
     JOIN users u ON u.id = p.user_id
     WHERE p.period = ? AND u.sponsor_id IS NOT NULL
     GROUP BY u.sponsor_id`,
    [period]
  );
  const downlineBySponsor = new Map(
    downlineRows.map((r) => [String(r.sponsor_id), Number(r.total || 0)])
  );

  let scannedDistributors = 0;
  let eligibleDistributors = 0;
  let generatedCount = 0;
  let updatedCount = 0;
  let skippedBelowMinimum = 0;
  let skippedLockedStatus = 0;

  const generatedAt = new Date().toISOString();
  const generatedById = generatedBy == null ? null : String(generatedBy);

  for (const d of distributorRows) {
    scannedDistributors++;
    const userId = String(d.id);
    const calculation = calculateCommissionForDistributor({
      userId,
      personalAmount: personalByUser.get(userId) || 0,
      downlineAmount: downlineBySponsor.get(userId) || 0,
      minMonthlyPurchase,
      commissionPercentage,
      generatedAt,
      generatedBy,
    });

    if (!calculation.eligible) {
      skippedBelowMinimum++;
      continue;
    }

    eligibleDistributors++;

    const [existing] = await pool.execute(
      'SELECT id, status FROM commissions WHERE user_id = ? AND period = ? LIMIT 1',
      [userId, period]
    );

    const persistenceAction = decideCommissionPersistence(existing[0]);
    if (persistenceAction === 'skip_locked') {
      skippedLockedStatus++;
      continue;
    }

    if (persistenceAction === 'update') {
      await pool.execute(
        `UPDATE commissions
         SET personal_amount = ?, downline_amount = ?, total_commission = ?, breakdown = ?
         WHERE user_id = ? AND period = ?`,
        [calculation.personalAmount, calculation.downlineAmount, calculation.totalCommission, calculation.breakdown, userId, period]
      );
      updatedCount++;
    } else {
      await pool.execute(
        `INSERT INTO commissions (user_id, period, personal_amount, downline_amount, total_commission, status, breakdown)
         VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
        [userId, period, calculation.personalAmount, calculation.downlineAmount, calculation.totalCommission, calculation.breakdown]
      );
      generatedCount++;
    }
  }

  return createGenerationSummary({
    period,
    minMonthlyPurchase,
    commissionPercentage,
    scannedDistributors,
    eligibleDistributors,
    generatedCount,
    updatedCount,
    skippedBelowMinimum,
    skippedLockedStatus,
  });
}

async function createPurchase({ distributorName, distributorEmail, period, createdAt, amount, products, status }) {
  const pool = await getPool();

  // Resolve the user_id from the distributor's email
  const [userRows] = await pool.execute(
    'SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1',
    [distributorEmail]
  );
  if (!userRows.length) {
    throw new Error(`No user found with email: ${distributorEmail}`);
  }
  const userId = userRows[0].id;

  const productDetails = JSON.stringify({
    items: products ? products.split(',').map((s) => s.trim()).filter(Boolean) : [],
  });

  const [result] = await pool.execute(
    'INSERT INTO purchases (user_id, period, amount, product_details, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, period, amount, productDetails, status, createdAt]
  );

  return {
    id: String(result.insertId),
    distributorName,
    distributorEmail,
    period,
    createdAt,
    amount,
    productDetails: JSON.parse(productDetails),
    status,
  };
}

async function listNotifications({ userId } = {}) {
  const pool = await getPool();
  const [rows] = await pool.execute(
    'SELECT id, user_id, type, title, message, is_read, read_at, created_at, expires_at FROM notifications WHERE (user_id = ? OR user_id IS NULL) ORDER BY created_at DESC, id DESC',
    [userId]
  );
  return rows.map((r) => ({
    id: String(r.id),
    userId: r.user_id == null ? null : String(r.user_id),
    type: r.type,
    title: r.title,
    message: r.message,
    isRead: Boolean(r.is_read),
    readAt: r.read_at,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
  }));
}

async function markNotificationRead({ id, userId }) {
  const pool = await getPool();
  await pool.execute(
    'UPDATE notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP WHERE id = ? AND (user_id = ? OR user_id IS NULL)',
    [id, userId]
  );
}

async function markAllNotificationsRead({ userId }) {
  const pool = await getPool();
  await pool.execute(
    'UPDATE notifications SET is_read = FALSE AND (user_id = ? OR user_id IS NULL)',
    [userId]
  );
}

async function getSettings() {
  const pool = await getPool();

  // Ensure extra_settings column exists
  try {
    await pool.execute("ALTER TABLE settings ADD COLUMN extra_settings JSON");
  } catch(e) { /* already exists */ }

  const [rows] = await pool.execute(
    'SELECT id, min_monthly_purchase, currency_code, commission_percentage, extra_settings FROM settings WHERE id = 1 LIMIT 1'
  );
  const row = rows?.[0];
  if (!row) return undefined;

  const extra = row.extra_settings
    ? (typeof row.extra_settings === 'string' ? JSON.parse(row.extra_settings) : row.extra_settings)
    : {};

  return {
    id: row.id,
    minMonthlyPurchase: Number(row.min_monthly_purchase),
    currencyCode: row.currency_code,
    commissionPercentage:
      typeof row.commission_percentage === 'string'
        ? JSON.parse(row.commission_percentage)
        : row.commission_percentage,
    payoutDay:    extra.payoutDay    ?? 1,
    networkDepth: extra.networkDepth ?? 5,
    calcPeriod:   extra.calcPeriod   ?? 'monthly',
    emailNotif:   extra.emailNotif   ?? true,
    pushNotif:    extra.pushNotif    ?? false,
    distAlert:    extra.distAlert    ?? true,
    commAlert:    extra.commAlert    ?? true,
    minAlert:     extra.minAlert     ?? true,
    autoApprove:  extra.autoApprove  ?? false,
    selfReg:      extra.selfReg      ?? true,
  };
}

async function updateSettings({
  minMonthlyPurchase, currencyCode, commissionPercentage,
  payoutDay, networkDepth, calcPeriod,
  emailNotif, pushNotif, distAlert, commAlert, minAlert,
  autoApprove, selfReg,
}) {
  const pool = await getPool();

  // Ensure extra_settings column exists (safe for all MySQL versions)
  try {
    await pool.execute("ALTER TABLE settings ADD COLUMN extra_settings JSON");
  } catch(e) { /* column already exists — safe to ignore */ }

  const extra = JSON.stringify({
    payoutDay, networkDepth, calcPeriod,
    emailNotif, pushNotif, distAlert, commAlert, minAlert,
    autoApprove, selfReg,
  });

  await pool.execute(
    `UPDATE settings SET
      min_monthly_purchase = ?,
      currency_code = ?,
      commission_percentage = ?,
      extra_settings = ?
    WHERE id = 1`,
    [minMonthlyPurchase, currencyCode, JSON.stringify(commissionPercentage), extra]
  );

  return getSettings();
}

async function listCommissionsForUser(userId, period) {
  const pool = await getPool();
  await ensureCommissionBreakdownColumn();
  const params = [userId];
  let sql =
    'SELECT id, user_id, period, personal_amount, downline_amount, total_commission, status, paid_at, breakdown, created_at FROM commissions WHERE user_id = ?';
  if (period) {
    sql += ' AND period = ?';
    params.push(period);
  }
  sql += ' ORDER BY period DESC, id DESC';

  const [rows] = await pool.execute(sql, params);
  return rows.map((r) => ({
    id: String(r.id),
    userId: String(r.user_id),
    period: r.period,
    personalAmount: Number(r.personal_amount),
    downlineAmount: Number(r.downline_amount),
    totalCommission: Number(r.total_commission),
    status: r.status,
    paidAt: r.paid_at,
    breakdown: r.breakdown == null ? null : typeof r.breakdown === 'string' ? JSON.parse(r.breakdown) : r.breakdown,
    createdAt: r.created_at,
  }));
}

async function listAllCommissions({ period } = {}) {
  const pool = await getPool();
  await ensureCommissionBreakdownColumn();
  const params = [];
  let sql =
    'SELECT c.id, c.user_id, c.period, c.personal_amount, c.downline_amount, c.total_commission, c.status, c.paid_at, c.breakdown, c.created_at, u.full_name, u.email ' +
    'FROM commissions c JOIN users u ON u.id = c.user_id';
  if (period) {
    sql += ' WHERE c.period = ?';
    params.push(period);
  }
  sql += ' ORDER BY c.period DESC, c.id DESC';

  const [rows] = await pool.execute(sql, params);
  return rows.map((r) => ({
    id: String(r.id),
    userId: String(r.user_id),
    userName: r.full_name || r.email,
    period: r.period,
    personalAmount: Number(r.personal_amount),
    downlineAmount: Number(r.downline_amount),
    totalCommission: Number(r.total_commission),
    status: r.status,
    paidAt: r.paid_at,
    breakdown: r.breakdown == null ? null : typeof r.breakdown === 'string' ? JSON.parse(r.breakdown) : r.breakdown,
    createdAt: r.created_at,
  }));
}

async function listAdmins() {
  const pool = await getPool();
  const [rows] = await pool.execute(
    'SELECT id, username, email, full_name, last_login, is_active FROM users WHERE role = ? ORDER BY id ASC',
    ['admin']
  );
  return rows.map((r) => ({
    id: String(r.id),
    name: r.full_name || r.username || r.email,
    email: r.email,
    role: 'Admin',
    status: r.is_active ? 'active' : 'inactive',
    lastActive: r.last_login,
  }));
}

async function updateLastLogin(id) {
  const pool = await getPool();
  await pool.execute(
    'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [id]
  );
}

async function findUserByEmail(email) {
  const pool = await getPool();
  const [rows] = await pool.execute(
    'SELECT id, email, full_name, role, password_hash FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1',
    [email || '']
  );
  const row = rows?.[0];
  if (!row) return undefined;
  return {
    id: String(row.id),
    email: row.email,
    name: row.full_name,
    role: row.role,
    passwordHash: row.password_hash,
  };
}

async function findUserById(id) {
  const pool = await getPool();

  // Ensure bank_details column exists
  try {
    await pool.execute('ALTER TABLE users ADD COLUMN bank_details JSON');
  } catch(e) { /* already exists */ }

  // Ensure next_of_kin column exists
  try {
    await pool.execute('ALTER TABLE users ADD COLUMN next_of_kin JSON');
  } catch(e) { /* already exists */ }

  const [rows] = await pool.execute(
    'SELECT u.id, u.email, u.full_name, u.phone, u.profile_picture, u.role, u.is_active, u.created_at, u.last_login, u.sponsor_id, COALESCE(u.bank_details, NULL) AS bank_details, COALESCE(u.next_of_kin, NULL) AS next_of_kin, s.full_name AS sponsor_name FROM users u LEFT JOIN users s ON s.id = u.sponsor_id WHERE u.id = ? LIMIT 1', [id]
  );
  const row = rows?.[0];
  if (!row) return undefined;
  return {
    id: String(row.id),
    email: row.email,
    name: row.full_name,
    phone: row.phone,
    profilePicture: row.profile_picture || null,
    role: row.role,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    lastLogin: row.last_login,
    sponsorId: row.sponsor_id ? String(row.sponsor_id) : null,
    sponsorName: row.sponsor_name || null,
    bankDetails: row.bank_details
      ? (typeof row.bank_details === 'string' ? JSON.parse(row.bank_details) : row.bank_details)
      : null,
    nextOfKin: row.next_of_kin
      ? (typeof row.next_of_kin === 'string' ? JSON.parse(row.next_of_kin) : row.next_of_kin)
      : null,
  };
}

// Generates a random password: 2 uppercase + 2 digits + 4 lowercase + 1 symbol
function generatePassword() {
  const upper  = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower  = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const syms   = '@#$!';
  const rand = (s) => s[Math.floor(Math.random() * s.length)];
  const parts = [rand(upper), rand(upper), rand(digits), rand(digits), rand(syms)];
  for (let i = 0; i < 4; i++) parts.push(rand(lower));
  // Shuffle
  return parts.sort(() => Math.random() - 0.5).join('');
}

async function createUser({ fullName, email, phone, sponsor, status, role }) {
  const pool = await getPool();

  // Check for duplicate email
  const [existing] = await pool.execute(
    'SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1', [email]
  );
  if (existing.length) {
    throw new Error('A user with this email already exists');
  }

  // Check for duplicate phone
  if (phone) {
    const [existingPhone] = await pool.execute(
      'SELECT id FROM users WHERE phone = ? LIMIT 1', [phone]
    );
    if (existingPhone.length) {
      throw new Error('A user with this phone number already exists');
    }
  }

  // Resolve sponsor name to sponsor_id if provided
  let sponsorId = null;
  if (sponsor) {
    const [sponsorRows] = await pool.execute(
      'SELECT id FROM users WHERE full_name = ? LIMIT 1', [sponsor]
    );
    if (sponsorRows.length) sponsorId = sponsorRows[0].id;
  }

  const isActive = !status || status === 'active' ? 1 : 0;

  // Generate username: first 4 chars of first name + first 4 chars of last name
  // e.g. "Bless Jose" => "BlessJose", if taken => "BlessJose1", "BlessJose2", etc.
  const nameParts = fullName.trim().split(/\s+/);
  const firstName4 = (nameParts[0] || '').slice(0, 4);
  const lastName4  = (nameParts.slice(1).join(' ') || '').slice(0, 4);
  const baseUsername = firstName4 + lastName4;

  const [uRows] = await pool.execute(
    'SELECT username FROM users WHERE username LIKE ?', [baseUsername + '%']
  );
  let username = baseUsername;
  if (uRows.some(r => r.username === baseUsername)) {
    let counter = 1;
    while (uRows.some(r => r.username === baseUsername + counter)) counter++;
    username = baseUsername + counter;
  }

  // Generate a random default password and hash it
  const plainPassword = generatePassword();
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  const [result] = await pool.execute(
    'INSERT INTO users (username, full_name, email, phone, role, sponsor_id, is_active, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [username, fullName, email, phone || null, role || 'distributor', sponsorId, isActive, passwordHash]
  );

  return {
    id: String(result.insertId),
    fullName,
    email,
    phone: phone || null,
    role: role || 'distributor',
    sponsorId: sponsorId ? String(sponsorId) : null,
    isActive: Boolean(isActive),
    createdAt: new Date().toISOString(),
    plainPassword, // returned once so the route can email it
    username,
  };
}

async function deleteUser(id) {
  const pool = await getPool();
  await pool.execute('DELETE FROM users WHERE id = ?', [id]);
}

async function updateUser(id, { fullName, email, phone, sponsor, status, isActive }) {
  const pool = await getPool();

  // Build dynamic SET clause based on what was provided
  const sets = [];
  const params = [];

  if (fullName !== undefined) { sets.push('full_name = ?'); params.push(fullName); }

  if (email !== undefined) {
    const [dupEmail] = await pool.execute(
      'SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ? LIMIT 1', [email, id]
    );
    if (dupEmail.length) throw new Error('A user with this email already exists');
    sets.push('email = ?'); params.push(email);
  }

  if (phone !== undefined) {
    if (phone) {
      const [dupPhone] = await pool.execute(
        'SELECT id FROM users WHERE phone = ? AND id != ? LIMIT 1', [phone, id]
      );
      if (dupPhone.length) throw new Error('A user with this phone number already exists');
    }
    sets.push('phone = ?'); params.push(phone || null);
  }

  if (sponsor !== undefined) {
    if (sponsor) {
      const [sponsorRows] = await pool.execute(
        'SELECT id FROM users WHERE full_name = ? LIMIT 1', [sponsor]
      );
      const sponsorId = sponsorRows.length ? sponsorRows[0].id : null;
      sets.push('sponsor_id = ?'); params.push(sponsorId);
    } else {
      sets.push('sponsor_id = ?'); params.push(null);
    }
  }

  // isActive can come from toggle (boolean) or status string from edit form
  if (isActive !== undefined) {
    sets.push('is_active = ?'); params.push(isActive ? 1 : 0);
  } else if (status !== undefined) {
    sets.push('is_active = ?'); params.push(status === 'active' ? 1 : 0);
  }

  if (!sets.length) {
    throw new Error('No fields to update');
  }

  params.push(id);
  await pool.execute(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);

  const [rows] = await pool.execute(
    'SELECT id, full_name, email, phone, role, sponsor_id, is_active, created_at FROM users WHERE id = ? LIMIT 1', [id]
  );
  const r = rows[0];
  return {
    id: String(r.id),
    fullName: r.full_name,
    email: r.email,
    phone: r.phone,
    role: r.role,
    sponsorId: r.sponsor_id ? String(r.sponsor_id) : null,
    isActive: Boolean(r.is_active),
    createdAt: r.created_at,
  };
}

async function registerDistributor({ fullName, email, phone, password, sponsorId }) {
  const pool = await getPool();

  // Check for duplicate email
  const [existing] = await pool.execute(
    'SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1', [email]
  );
  if (existing.length) {
    throw new Error('A user with this email already exists');
  }

  // Check for duplicate phone
  if (phone) {
    const [existingPhone] = await pool.execute(
      'SELECT id FROM users WHERE phone = ? LIMIT 1', [phone]
    );
    if (existingPhone.length) {
      throw new Error('A user with this phone number already exists');
    }
  }

  // Validate sponsor if provided
  if (sponsorId) {
    const [sponsorRows] = await pool.execute(
      'SELECT id FROM users WHERE id = ? LIMIT 1', [sponsorId]
    );
    if (!sponsorRows.length) {
      throw new Error('Invalid sponsor ID');
    }
  }

  // Generate username
  const nameParts = fullName.trim().split(/\s+/);
  const firstName4 = (nameParts[0] || '').slice(0, 4);
  const lastName4  = (nameParts.slice(1).join(' ') || '').slice(0, 4);
  const baseUsername = firstName4 + lastName4;

  const [uRows] = await pool.execute(
    'SELECT username FROM users WHERE username LIKE ?', [baseUsername + '%']
  );
  let username = baseUsername;
  if (uRows.some(r => r.username === baseUsername)) {
    let counter = 1;
    while (uRows.some(r => r.username === baseUsername + counter)) counter++;
    username = baseUsername + counter;
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  const [result] = await pool.execute(
    'INSERT INTO users (username, full_name, email, phone, role, sponsor_id, is_active, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [username, fullName, email, phone || null, 'distributor', sponsorId || null, 1, passwordHash]
  );

  return {
    id: String(result.insertId),
    username,
    fullName,
    email,
    phone,
    role: 'distributor',
    sponsorId: sponsorId ? String(sponsorId) : null,
  };
}

module.exports = {
  getPool,
  ensureProfilePictureColumn,
  ensureCommissionBreakdownColumn,
  findUserByEmail,
  findUserById,
  updateLastLogin,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  listPurchases,
  listPurchasesForUser,
  listPurchasesForDownlines,
  listDownlinesForUser,
  listDistributors,
  generateMonthlyCommissions,
  createPurchase,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getSettings,
  updateSettings,
  listCommissionsForUser,
  listAllCommissions,
  listAdmins,
  registerDistributor,
  dbConfig,
};