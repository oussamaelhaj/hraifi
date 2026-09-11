const express = require('express');
const admin = require('../firebase-admin');
const { requireAuth, requireAdmin } = require('../middleware/requireAuth');

const router = express.Router();

function parseBootstrapAllowlist() {
  const raw = process.env.ADMIN_BOOTSTRAP_EMAILS || '';
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

function emailMatchesAllowlist(email, allowlist) {
  if (!email) return false;
  return allowlist.some(entry =>
    entry.startsWith('*@') ? email.endsWith(entry.slice(1)) : entry === email
  );
}

// POST /api/admin/claim
// One-time self-service bootstrap: a signed-in user whose email matches
// ADMIN_BOOTSTRAP_EMAILS (set in Render env vars, e.g. "owner@example.com,*@7raifi.ma")
// can grant themselves the admin custom claim. This replaces relying on the
// hardcoded UID list shipped in the frontend bundle — once this has been
// called for the owner account, the bootstrap allowlist in firestore.rules
// and frontend/js/state.js can be emptied out.
router.post('/claim', requireAuth, async (req, res) => {
  const allowlist = parseBootstrapAllowlist();
  if (!emailMatchesAllowlist(req.user.email, allowlist)) {
    return res.status(403).json({ error: 'Email not in ADMIN_BOOTSTRAP_EMAILS allowlist' });
  }

  await admin.auth().setCustomUserClaims(req.user.uid, { admin: true });
  await admin.firestore().collection('users').doc(req.user.uid).set(
    { role: 'admin', uid: req.user.uid, email: req.user.email || '' },
    { merge: true }
  );

  res.json({ ok: true, message: 'Admin claim granted. Sign out and back in for it to take effect in the app.' });
});

// POST /api/admin/promote  { targetUid }
// Existing admin grants the admin claim to another user.
router.post('/promote', requireAuth, requireAdmin, async (req, res) => {
  const { targetUid } = req.body || {};
  if (!targetUid) return res.status(400).json({ error: 'targetUid is required' });

  await admin.auth().setCustomUserClaims(targetUid, { admin: true });
  await admin.firestore().collection('users').doc(targetUid).set({ role: 'admin' }, { merge: true });

  res.json({ ok: true });
});

// POST /api/admin/demote  { targetUid }
// Existing admin revokes another user's admin claim.
router.post('/demote', requireAuth, requireAdmin, async (req, res) => {
  const { targetUid } = req.body || {};
  if (!targetUid) return res.status(400).json({ error: 'targetUid is required' });
  if (targetUid === req.user.uid) return res.status(400).json({ error: 'Cannot demote yourself' });

  await admin.auth().setCustomUserClaims(targetUid, { admin: false });
  await admin.firestore().collection('users').doc(targetUid).set({ role: 'customer' }, { merge: true });

  res.json({ ok: true });
});

module.exports = router;
