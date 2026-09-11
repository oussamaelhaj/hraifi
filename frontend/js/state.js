    // ─── Local State ──────────────────────────────────────────────────────────────
    let allArtisansList = [];
    let activeSection = 'home';
    let currentAuthTab = 'login';
    let chatbotTyping = false;
    let currentUserRole = 'customer';
    let activeAdminTab = 'requests';

    // ─── Owner bootstrap admin allowlist ───────────────────────────────────────────
    // IMPORTANT: this list only decides what the UI *shows* for these accounts.
    // It ships inside the public JS bundle, so it is NOT a security boundary —
    // anyone can read it in devtools. The actual access control lives in
    // firestore.rules, which only lets a document's `role` field become 'admin'
    // when the caller already has an `admin` custom claim (see backend/routes/admin.js).
    // This allowlist exists purely so the platform owner's own account can
    // bootstrap itself to admin on first login, before any custom claim exists.
    const OWNER_BOOTSTRAP_ADMIN_UIDS = [
      'sbXqhfW1v5SSHOp1cZ51RIPoKeI3',
      '1xcBa6WHtkWScdA14n91XngePC43',
      'NsntxK3SlvPKpyLdosr0bQR9f5U2'
    ];
    function isOwnerBootstrapAdmin(user) {
      if (!user) return false;
      if (OWNER_BOOTSTRAP_ADMIN_UIDS.includes(user.uid)) return true;
      return user.email === 'kifachtv24@gmail.com' || !!user.email?.endsWith('@7raifi.ma');
    }

    // Parse admin mode search query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const isAdminMode = urlParams.get('mode') === 'admin';

    function applyAdminModeUI() {
      if (!isAdminMode) return;

      // Customize Auth Blocker Card for Admin
      document.body.classList.add('admin-mode-active');

      // Hide Register tab
      const tabs = document.querySelectorAll('.auth-gate-tab');
      if (tabs.length > 1) {
        tabs[1].style.display = 'none'; // Hide the signup tab
      }

      // Update logo, title, and subtitle
      const logoEl = document.querySelector('.auth-gate-logo');
      if (logoEl) {
        logoEl.innerHTML = '<i class="fas fa-user-shield"></i>';
        logoEl.style.color = 'var(--admin-color)';
        logoEl.style.animation = 'pulse-admin-glow 2.5s infinite';
      }

      const titleEl = document.querySelector('.auth-gate-title');
      if (titleEl) {
        titleEl.textContent = 'لوحة تحكم المشرف 🛡️';
      }

      const subtitleEl = document.querySelector('.auth-gate-subtitle');
      if (subtitleEl) {
        subtitleEl.textContent = 'الولوج الآمن والمحمي للمسؤولين فقط';
      }

      // Add custom alert warning
      const alertEl = document.getElementById('authAlertMessage');
      if (alertEl) {
        alertEl.style.display = 'block';
        alertEl.style.backgroundColor = 'rgba(124, 58, 237, 0.12)';
        alertEl.style.border = '1px solid rgba(124, 58, 237, 0.4)';
        alertEl.style.color = 'var(--admin-color)';
        alertEl.textContent = 'تنبيه: هذه البوابة مخصصة لمشرفي النظام فقط. يرجى تسجيل الدخول.';
      }

      // Style primary login button
      const loginBtn = document.querySelector('#authForm-login .btn-auth-primary');
      if (loginBtn) {
        loginBtn.innerHTML = '<i class="fas fa-lock"></i> تسجيل دخول المشرف';
        loginBtn.style.background = 'linear-gradient(135deg, var(--admin-color), #5B21B6)';
        loginBtn.style.color = '#ffffff';
        loginBtn.style.boxShadow = '0 0 15px rgba(124, 58, 237, 0.4)';
      }

      // Style google login button
      const googleBtn = document.querySelector('.btn-auth-google');
      if (googleBtn) {
        googleBtn.style.borderColor = 'var(--admin-color)';
        googleBtn.innerHTML = '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" /> الدخول كمشرف بواسطة Google';
      }

      // Style card border
      const gateCard = document.querySelector('.auth-gate-card');
      if (gateCard) {
        gateCard.style.border = '2px solid var(--admin-color)';
        gateCard.style.boxShadow = '0 10px 30px rgba(124, 58, 237, 0.35)';
      }
    }

    // Dictionary translation for professions
    const JOB_LABELS = {
      plumber: 'سباك (بلومبي)',
      electrician: 'كهربائي (تريسيان)',
      carpenter: 'نجار',
      painter: 'دهان (صباغ)',
      builder: 'عامل بناء',
      tiler: 'تركيب بلاط (زلايجي)',
      blacksmith: 'حداد',
      'ac-technician': 'فني تكييف وتبريد',
    };
