    // ─── Firebase Config ──────────────────────────────────────────────────────────
    // This apiKey is a public client identifier, not a secret — Firebase web apps
    // ship it in the bundle by design. Real access control lives in firestore.rules
    // and the backend/ service, not in keeping this value hidden. In production,
    // restrict it to your own domains via Google Cloud Console > Credentials >
    // API key restrictions (HTTP referrers) so it can't be reused on another site.
    const firebaseConfig = {
      apiKey: "AIzaSyA_gdBtn-mP8O-fTGNYQuHbAqvGm5pFNYc",
      authDomain: "hraifi-59736.firebaseapp.com",
      projectId: "hraifi-59736",
      storageBucket: "hraifi-59736.appspot.com",
      messagingSenderId: "667704963633",
      appId: "1:667704963633:web:a6a9025f48319dcc8d9b10",
      measurementId: "G-ELPJGYTRCH"
    };

    // ─── Backend API base URL ───────────────────────────────────────────────────
    // Points at backend/ (see render.yaml). Update the production URL below once
    // the Render service is created — Render assigns the final *.onrender.com name.
    const HRAIFI_API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:3000'
      : 'https://hraifi-backend.onrender.com';

    // Initialize
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();
    const storage = firebase.storage();

    const googleProvider = new firebase.auth.GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
