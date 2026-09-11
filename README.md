# منصة الحريفي (7raifi.ma)

Marketplace connecting verified Moroccan artisans (plumbers, electricians, carpenters, ...)
with customers. Firebase-backed frontend + a small Node/Express backend for
operations that must not run with client-trusted credentials.

## Project structure

```
hraifi/
├── frontend/                Static site — deploy as-is, no build step
│   ├── index.html
│   ├── css/styles.css
│   └── js/                  Split by feature (auth, artisans, admin, ...)
├── backend/                 Node/Express API — deploy to Render
│   ├── server.js
│   ├── routes/admin.js      Admin custom-claim management
│   ├── middleware/requireAuth.js
│   └── firebase-admin.js
├── firestore.rules          Firestore security rules — the real access-control layer
├── firestore.indexes.json
├── firebase.json
├── render.yaml              Render Blueprint (both services)
└── scripts/                 One-off/dev tooling, not deployed
```

The old single-file `hraificode.html` (7000+ lines of inline HTML/CSS/JS) has
been split into the structure above. It's kept locally as a reference but is
gitignored — the `frontend/` folder is the real app now.

## How the pieces fit together

- **Frontend** talks to **Firebase** directly (Auth, Firestore, Storage) — same
  as before, this didn't change.
- **Firestore rules** (`firestore.rules`) are the actual security boundary.
  The frontend's role checks (`frontend/js/state.js`, `auth.js`) only decide
  what the UI *shows*; anyone can bypass client-side JS from devtools, so the
  rules are what really stop a non-admin from granting themselves admin, or
  reading another artisan's pending requests, etc.
- **Backend** (`backend/`) exists for the one thing Firestore rules can't do
  safely from the client: granting the `admin` Firebase custom claim. It uses
  the Firebase Admin SDK with a service account, never exposed to the browser.

## Local development

Frontend (static, no build):
```bash
cd frontend
python -m http.server 8000   # or `npx serve`, or any static file server
```

Backend:
```bash
cd backend
cp .env.example .env         # fill in FIREBASE_SERVICE_ACCOUNT, etc.
npm install
npm run dev
```

## Deploying

### 1. Push to GitHub
```bash
git push -u origin main
```

### 2. Firestore security rules
Install the Firebase CLI once (`npm install -g firebase-tools`), then:
```bash
firebase login
firebase use hraifi-59736
firebase deploy --only firestore:rules
```
Do this **before** relying on the backend — until the rules are deployed, the
project is running on whatever rules currently exist in the Firebase console.

### 3. Backend + frontend on Render
In the Render dashboard: **New > Blueprint**, point it at this GitHub repo.
`render.yaml` defines two services — `hraifi-backend` (Node) and
`hraifi-frontend` (static). After creation, set these env vars on
`hraifi-backend` (Render dashboard > service > Environment — never commit
these):
- `FIREBASE_SERVICE_ACCOUNT` — full JSON from Firebase Console > Project
  Settings > Service Accounts > Generate new private key
- `ADMIN_BOOTSTRAP_EMAILS` — e.g. `kifachtv24@gmail.com,*@7raifi.ma`

Once deployed, update `HRAIFI_API_BASE_URL` in
`frontend/js/firebase-config.js` with the real `*.onrender.com` URL Render
assigns to `hraifi-backend` (or your own custom domain), and redeploy the
frontend.

### 4. Grant yourself real admin (recommended, one-time)
The app currently falls back to a hardcoded UID/email allowlist
(`OWNER_BOOTSTRAP_ADMIN_UIDS` in `frontend/js/state.js`, mirrored in
`firestore.rules`) so the owner account works before the backend exists. Once
the backend is live:
1. Log into the site with the owner account.
2. Open the admin debug panel and click **"تفعيل صلاحية المشرف عبر السيرفر
   (Backend)"** — this calls `POST /api/admin/claim`, which sets a real
   Firebase custom claim via the Admin SDK.
3. Sign out and back in.

After that, the hardcoded allowlist is no longer load-bearing — it can be
emptied out of both `state.js` and `firestore.rules` (search
`OWNER_BOOTSTRAP_ADMIN_UIDS`).

## Security notes

- **Firestore rules are the real gate**, not the client JS — see above.
- **XSS**: any user-submitted text (artisan name/description, review
  comments, service requests) is escaped via `escapeHTML()`/`escapeAttr()`
  (`frontend/js/security-utils.js`) before going into `innerHTML`. If you add
  a new place that renders user data, use these helpers.
- **CSP**: `frontend/index.html` ships a Content-Security-Policy meta tag.
  `unsafe-inline` stays on `script-src` because the UI uses inline
  `onclick="..."` handlers throughout — removing it would mean rebinding
  every handler via `addEventListener` first. If you add a new third-party
  script/embed and see it silently fail, check the browser console for a
  `Refused to ...` CSP message and extend the relevant directive.
  When Google's ad infra adds a new subdomain, you'll see it here too.
- **API key**: the Firebase `apiKey` in `firebase-config.js` is a public
  client identifier by design (not a secret) — but restrict it to your own
  domains in Google Cloud Console > Credentials > API key restrictions (HTTP
  referrers), so it can't be reused on someone else's site.
- Removed the old "block right-click / F12 / Ctrl+U" handlers — they didn't
  stop anyone (devtools opens from the browser menu regardless) and only
  annoyed real users.

## Smoke-testing after frontend changes

```bash
cd scripts && npm install && npx playwright install chromium
cd .. && python -m http.server 8791 --directory frontend &
node scripts/smoke-test.cjs
```
Checks the preloader hides, the auth modal opens, and reports any JS console
errors.
