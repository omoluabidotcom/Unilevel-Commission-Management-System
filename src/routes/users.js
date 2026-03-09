const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { findUserById } = require('../db/connection');

const router = express.Router();

router.get('/me', requireAuth, (req, res) => {
  const user = findUserById(req.user.userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

router.get('/', requireAuth, requireRole('admin'), (req, res) => {
  // In a real app, you'd return a list of distributors / users.
  res.json({ message: 'User list endpoint (admin only)' });
});

module.exports = router;
