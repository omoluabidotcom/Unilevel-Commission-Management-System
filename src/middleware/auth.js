const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me';

function sendAuthError(res, status, code, message) {
  return res.status(status).json({
    error: {
      code,
      message,
    },
  });
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return sendAuthError(res, 401, 'AUTH_MISSING_TOKEN', 'Missing auth token');
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return sendAuthError(res, 401, 'AUTH_INVALID_TOKEN', 'Invalid token');
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return sendAuthError(res, 401, 'AUTH_NOT_AUTHENTICATED', 'Not authenticated');
    }

    if (req.user.role !== role) {
      return sendAuthError(res, 403, 'AUTH_INSUFFICIENT_PERMISSIONS', 'Insufficient permissions');
    }

    next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
};
