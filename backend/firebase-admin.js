// Initializes the Firebase Admin SDK from a service account provided via env var.
// Never commit the service account key itself — it lives only in Render's
// environment variable settings (or a local .env file that is gitignored).
const admin = require('firebase-admin');

function loadServiceAccount() {
  const raw = (process.env.FIREBASE_SERVICE_ACCOUNT || '').trim();
  if (!raw) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT is not set. Download a service account key from ' +
      'Firebase Console > Project Settings > Service Accounts, and set its full ' +
      'JSON content (or its base64 encoding) as this environment variable.'
    );
  }

  // Accept either raw JSON or a base64-encoded blob of that JSON. Base64 is
  // the more reliable option in practice: some dashboard env-var text fields
  // mangle embedded newlines/quotes when a multi-line JSON key is pasted in,
  // which silently corrupts the value. A base64 string has none of those
  // characters, so it survives copy-paste intact.
  let jsonText = raw;
  if (raw[0] !== '{') {
    try {
      jsonText = Buffer.from(raw, 'base64').toString('utf8');
    } catch (_) {
      // fall through — let the JSON.parse below report the real error
    }
  }

  try {
    return JSON.parse(jsonText);
  } catch (err) {
    const preview = raw.slice(0, 12).replace(/[^\x20-\x7e]/g, '?');
    throw new Error(
      `FIREBASE_SERVICE_ACCOUNT is not valid JSON or base64-encoded JSON (${err.message}). ` +
      `Value starts with "${preview}..." and is ${raw.length} chars long — ` +
      're-copy it fresh from the downloaded key file, or use the base64 form instead.'
    );
  }
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(loadServiceAccount()),
  });
}

module.exports = admin;
