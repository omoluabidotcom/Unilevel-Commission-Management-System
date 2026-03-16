const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { listNotifications, markNotificationRead, markAllNotificationsRead } = require('../db/connection');

const router = express.Router();

// Admin: list notifications (system-wide + user-specific)
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  const notifications = await listNotifications({ userId: req.user.userId });
  res.json({ notifications });
});

router.post('/:id/read', requireAuth, requireRole('admin'), async (req, res) => {
  const id = String(req.params.id);
  await markNotificationRead({ id, userId: req.user.userId });
  res.json({ ok: true });
});

router.post('/read-all', requireAuth, requireRole('admin'), async (req, res) => {
  await markAllNotificationsRead({ userId: req.user.userId });
  res.json({ ok: true });
});

module.exports = router;

