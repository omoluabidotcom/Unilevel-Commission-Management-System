const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { listUsers, createUser, updateUser, deleteUser, findUserById, listDownlinesForUser } = require('../db/connection');

const router = express.Router();

// Admin: list all users
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const users = await listUsers();
    res.json({ users });
  } catch (err) {
    console.error('listUsers error:', err);
    res.status(500).json({ message: 'Failed to load users' });
  }
});

// Admin: create a new distributor
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { fullName, email, phone, sponsor, status, role } = req.body;
    if (!fullName || !email) {
      return res.status(400).json({ message: 'fullName and email are required' });
    }
    const user = await createUser({ fullName, email, phone, sponsor, status, role: role || 'distributor' });

    res.status(201).json({ user });
  } catch (err) {
    console.error('createUser error:', err);
    res.status(500).json({ message: err.message || 'Failed to create user' });
  }
});

// Admin: update a distributor (edit details or toggle active status)
router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, phone, sponsor, status, isActive } = req.body;
    const user = await updateUser(id, { fullName, email, phone, sponsor, status, isActive });
    res.json({ user });
  } catch (err) {
    console.error('updateUser error:', err);
    res.status(500).json({ message: err.message || 'Failed to update user' });
  }
});

// Distributor: own profile
router.get('/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const user = await findUserById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load profile' });
  }
});

// Distributor: own downlines
router.get('/me/downlines', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const downlines = await listDownlinesForUser(userId);
    res.json({ downlines });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load downlines' });
  }
});

// Admin: hard delete a user
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    // Prevent deleting yourself
    if (String(id) === String(req.user.userId || req.user.id)) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
    await deleteUser(id);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('deleteUser error:', err);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

module.exports = router;



/*
const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { listUsers, createUser, updateUser, deleteUser } = require('../db/connection');

const router = express.Router();

// Admin: list all users
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const users = await listUsers();
    res.json({ users });
  } catch (err) {
    console.error('listUsers error:', err);
    res.status(500).json({ message: 'Failed to load users' });
  }
});

// Admin: create a new distributor
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { fullName, email, phone, sponsor, status, role } = req.body;
    if (!fullName || !email) {
      return res.status(400).json({ message: 'fullName and email are required' });
    }
    const user = await createUser({ fullName, email, phone, sponsor, status, role: role || 'distributor' });

    res.status(201).json({ user });
  } catch (err) {
    console.error('createUser error:', err);
    res.status(500).json({ message: err.message || 'Failed to create user' });
  }
});

// Admin: update a distributor (edit details or toggle active status)
router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, phone, sponsor, status, isActive } = req.body;
    const user = await updateUser(id, { fullName, email, phone, sponsor, status, isActive });
    res.json({ user });
  } catch (err) {
    console.error('updateUser error:', err);
    res.status(500).json({ message: err.message || 'Failed to update user' });
  }
});

// Admin: hard delete a user
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    // Prevent deleting yourself
    if (String(id) === String(req.user.userId || req.user.id)) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
    await deleteUser(id);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('deleteUser error:', err);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

module.exports = router;*/
