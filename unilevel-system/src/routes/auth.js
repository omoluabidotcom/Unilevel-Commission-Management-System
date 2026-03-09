const express = require('express');
const jwt = require('jsonwebtoken');
const { findUserByEmail } = require('../db/connection');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  const user = findUserByEmail(email);
  if (!user || user.password !== password) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

module.exports = router;
