const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { findUserByEmail, updateLastLogin } = require('../db/connection');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await findUserByEmail(email);

  const passwordOk = user?.passwordHash ? await bcrypt.compare(password || '', user.passwordHash) : false;
  if (!user || !passwordOk) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Stamp last_login so profile and admin management show accurate last active time
  await updateLastLogin(user.id).catch(err => console.error('updateLastLogin error:', err));

  const token = jwt.sign(
    { userId: user.id, role: user.role, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

module.exports = router;