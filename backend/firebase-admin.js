// Initializes the Firebase Admin SDK from a service account provided via env var.
// Never commit the service account key itself — it lives only in Render's
// environment variable settings (or a local .env file that is gitignored).
const admin = require('firebase-admin');

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT is not set. Download a service account key from ' +
      'Firebase Console > Project Settings > Service Accounts, and set its full ' +
      'JSON content as this environment variable.'
    );
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON: ' + err.message);
  }
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(loadServiceAccount()),
  });
}

module.exports = admin;
