    // ─── Landing Page JS ──────────────────────────────────────────────────────────

    // Hero Slider
    let _lpSlideIndex = 0;
    const _lpSlides = document.querySelectorAll('.lp-slide');
    const _lpDots = document.querySelectorAll('.lp-dot');
    function goToSlide(n) {
      _lpSlides.forEach(s => s.classList.remove('active-slide'));
      _lpDots.forEach(d => d.classList.remove('active-dot'));
      _lpSlideIndex = (n + _lpSlides.length) % _lpSlides.length;
      _lpSlides[_lpSlideIndex].classList.add('active-slide');
      if (_lpDots[_lpSlideIndex]) _lpDots[_lpSlideIndex].classList.add('active-dot');
    }
    setInterval(() => { if (_lpSlides.length) goToSlide(_lpSlideIndex + 1); }, 5000);

    // Scroll to section
    function scrollToSection(id) {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }

    // Auth Modal
    function showAuthModal(tab) {
      const overlay = document.getElementById('auth-modal-overlay');
      overlay.classList.add('open');
      overlay.style.display = 'flex';
      clearAuthAlert();
      switchModalTab(tab || 'login');
    }
    function closeAuthModal() {
      const overlay = document.getElementById('auth-modal-overlay');
      overlay.classList.remove('open');
      overlay.style.display = 'none';
      clearAuthAlert();
    }
    function switchModalTab(tab) {
      // Hide all forms
      ['login', 'register', 'reset'].forEach(t => {
        const f = document.getElementById('authForm-' + t);
        if (f) f.style.display = 'none';
      });
      // Show requested
      const form = document.getElementById('authForm-' + tab);
      if (form) form.style.display = 'block';
      // Tab styling
      const loginTab = document.getElementById('modal-tab-login');
      const registerTab = document.getElementById('modal-tab-register');
      const activeStyle = 'linear-gradient(135deg,#1E3A5F,#2563EB)';
      const inactiveStyle = 'transparent';
      if (loginTab) {
        loginTab.style.background = tab === 'login' ? activeStyle : inactiveStyle;
        loginTab.style.color = tab === 'login' ? '#fff' : 'rgba(255,255,255,0.5)';
      }
      if (registerTab) {
        registerTab.style.background = tab === 'register' ? activeStyle : inactiveStyle;
        registerTab.style.color = tab === 'register' ? '#fff' : 'rgba(255,255,255,0.5)';
      }
      clearAuthAlert();
    }

    // Toggle artisan fields inside modal
    function toggleArtisanFields(cb) {
      const sec = document.getElementById('authArtisanSection');
      if (sec) sec.style.display = cb.checked ? 'block' : 'none';
    }

    // Password reset from modal
    async function handlePasswordReset() {
      const emailEl = document.getElementById('authResetEmail');
      if (!emailEl) return;
      const email = emailEl.value.trim();
      if (!email) return showAuthAlert('يرجى إدخال البريد الإلكتروني', 'error');
      try {
        await auth.sendPasswordResetEmail(email);
        showAuthAlert('تم إرسال رابط إعادة التعيين! تحقق من بريدك الإلكتروني.', 'success');
      } catch (e) {
        showAuthAlert(translateAuthCode(e.code), 'error');
      }
    }
