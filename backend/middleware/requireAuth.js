const admin = require('../firebase-admin');

// Verifies the Firebase ID token sent as `Authorization: Bearer <token>` and
// attaches the decoded token (uid, email, custom claims) to req.user.
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  try {
    req.user = await admin.auth().verifyIdToken(token);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Use after requireAuth. Rejects unless the caller already has the admin
// custom claim (set by /api/admin/claim or /api/admin/promote).
function requireAdmin(req, res, next) {
  if (req.user && req.user.admin === true) {
    return next();
  }
  return res.status(403).json({ error: 'Admin privileges required' });
}

module.exports = { requireAuth, requireAdmin };
