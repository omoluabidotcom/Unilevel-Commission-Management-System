const express = require('express');
const bcrypt = require('bcrypt');
const { requireAuth } = require('../middleware/auth');
const { findUserById, updateUser, getPool } = require('../db/connection');

const router = express.Router();

// GET /api/profile — returns the logged-in user's full profile
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = await findUserById(req.user.userId || req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    console.error('getProfile error:', err);
    res.status(500).json({ message: 'Failed to load profile' });
  }
});

// PUT /api/profile — update name, email, phone
router.put('/', requireAuth, async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const id = req.user.userId || req.user.id;

    if (!name) return res.status(400).json({ message: 'Name is required' });
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await updateUser(id, { fullName: name, email, phone });
    res.json({ user });
  } catch (err) {
    console.error('updateProfile error:', err);
    res.status(500).json({ message: err.message || 'Failed to update profile' });
  }
});

// PUT /api/profile/password — change password
router.put('/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const id = req.user.userId || req.user.id;

    if (!currentPassword) return res.status(400).json({ message: 'Current password is required' });
    if (!newPassword || newPassword.length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters' });

    // Fetch current hash
    const pool = await getPool();
    const [rows] = await pool.execute('SELECT password_hash FROM users WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) return res.status(404).json({ message: 'User not found' });

    const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!match) return res.status(400).json({ message: 'Current password is incorrect' });

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, id]);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('updatePassword error:', err);
    res.status(500).json({ message: 'Failed to update password' });
  }
});


// PUT /api/profile/photo — save base64 photo
router.put('/photo', requireAuth, async (req, res) => {
  try {
    const { photo } = req.body;
    if (!photo) return res.status(400).json({ message: 'No photo provided' });
    if (photo.length > 2 * 1024 * 1024 * 1.37) { // ~2MB base64
      return res.status(400).json({ message: 'Image too large. Max 2MB.' });
    }
    const id = req.user.userId || req.user.id;
    const pool = await getPool();
    await pool.execute('UPDATE users SET profile_picture = ? WHERE id = ?', [photo, id]);
    res.json({ message: 'Photo updated' });
  } catch (err) {
    console.error('savePhoto error:', err);
    res.status(500).json({ message: 'Failed to save photo' });
  }
});

// DELETE /api/profile/photo — remove photo
router.delete('/photo', requireAuth, async (req, res) => {
  try {
    const id = req.user.userId || req.user.id;
    const pool = await getPool();
    await pool.execute('UPDATE users SET profile_picture = NULL WHERE id = ?', [id]);
    res.json({ message: 'Photo removed' });
  } catch (err) {
    console.error('removePhoto error:', err);
    res.status(500).json({ message: 'Failed to remove photo' });
  }
});

// PUT /api/profile/bank — save bank details
router.put('/bank', requireAuth, async (req, res) => {
  try {
    const { holderName, bankName, acctNum } = req.body;
    const id = req.user.userId || req.user.id;
    const pool = await getPool();

    // Ensure bank_details column exists
    try {
      await pool.execute("ALTER TABLE users ADD COLUMN bank_details JSON");
    } catch(e) { /* already exists */ }

    const bankDetails = JSON.stringify({ holderName, bankName, acctNum });
    await pool.execute('UPDATE users SET bank_details = ? WHERE id = ?', [bankDetails, id]);
    res.json({ message: 'Bank details saved' });
  } catch (err) {
    console.error('saveBank error:', err);
    res.status(500).json({ message: 'Failed to save bank details' });
  }
});

// PUT /api/profile/bank — save bank details as JSON
router.put('/bank', requireAuth, async (req, res) => {
  try {
    const { holderName, bankName, acctNum } = req.body;
    if (!holderName || !bankName || !acctNum) {
      return res.status(400).json({ message: 'All bank fields are required' });
    }
    const id = req.user.userId || req.user.id;
    const pool = await getPool();

    // Ensure column exists
    try {
      await pool.execute('ALTER TABLE users ADD COLUMN bank_details JSON');
    } catch(e) { /* already exists */ }

    await pool.execute(
      'UPDATE users SET bank_details = ? WHERE id = ?',
      [JSON.stringify({ holderName, bankName, acctNum }), id]
    );
    res.json({ message: 'Bank details saved' });
  } catch (err) {
    console.error('saveBankDetails error:', err);
    res.status(500).json({ message: 'Failed to save bank details' });
  }
});

module.exports = router;


/*
const express = require('express');
const bcrypt = require('bcrypt');
const { requireAuth } = require('../middleware/auth');
const { findUserById, updateUser, getPool } = require('../db/connection');

const router = express.Router();

// GET /api/profile — returns the logged-in user's full profile
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = await findUserById(req.user.userId || req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    console.error('getProfile error:', err);
    res.status(500).json({ message: 'Failed to load profile' });
  }
});

// PUT /api/profile — update name, email, phone
router.put('/', requireAuth, async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const id = req.user.userId || req.user.id;

    if (!name) return res.status(400).json({ message: 'Name is required' });
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await updateUser(id, { fullName: name, email, phone });
    res.json({ user });
  } catch (err) {
    console.error('updateProfile error:', err);
    res.status(500).json({ message: err.message || 'Failed to update profile' });
  }
});

// PUT /api/profile/password — change password
router.put('/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const id = req.user.userId || req.user.id;

    if (!currentPassword) return res.status(400).json({ message: 'Current password is required' });
    if (!newPassword || newPassword.length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters' });

    // Fetch current hash
    const pool = await getPool();
    const [rows] = await pool.execute('SELECT password_hash FROM users WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) return res.status(404).json({ message: 'User not found' });

    const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!match) return res.status(400).json({ message: 'Current password is incorrect' });

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, id]);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('updatePassword error:', err);
    res.status(500).json({ message: 'Failed to update password' });
  }
});


// PUT /api/profile/photo — save base64 photo
router.put('/photo', requireAuth, async (req, res) => {
  try {
    const { photo } = req.body;
    if (!photo) return res.status(400).json({ message: 'No photo provided' });
    if (photo.length > 2 * 1024 * 1024 * 1.37) { // ~2MB base64
      return res.status(400).json({ message: 'Image too large. Max 2MB.' });
    }
    const id = req.user.userId || req.user.id;
    const pool = await getPool();
    await pool.execute('UPDATE users SET profile_picture = ? WHERE id = ?', [photo, id]);
    res.json({ message: 'Photo updated' });
  } catch (err) {
    console.error('savePhoto error:', err);
    res.status(500).json({ message: 'Failed to save photo' });
  }
});

// DELETE /api/profile/photo — remove photo
router.delete('/photo', requireAuth, async (req, res) => {
  try {
    const id = req.user.userId || req.user.id;
    const pool = await getPool();
    await pool.execute('UPDATE users SET profile_picture = NULL WHERE id = ?', [id]);
    res.json({ message: 'Photo removed' });
  } catch (err) {
    console.error('removePhoto error:', err);
    res.status(500).json({ message: 'Failed to remove photo' });
  }
});

module.exports = router;*/
