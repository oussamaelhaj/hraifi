    // ─── Auth Gate Blocker Manager ────────────────────────────────────────────────
    function switchAuthTab(tab, btn) {
      currentAuthTab = tab;
      document.querySelectorAll('.auth-gate-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.auth-gate-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById('authForm-' + tab).classList.add('active');
      clearAuthAlert();
    }

    function toggleArtisanFields(checkbox) {
      const fields = document.getElementById('artisanFields');
      if (checkbox.checked) {
        fields.classList.add('active');
      } else {
        fields.classList.remove('active');
      }
    }

    function showAuthAlert(text, type = 'success') {
      const el = document.getElementById('authAlertMessage');
      el.textContent = text;
      el.style.display = 'block';
      el.style.backgroundColor = type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)';
      el.style.border = type === 'success' ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(239,68,68,0.4)';
      el.style.color = type === 'success' ? '#10b981' : '#ef4444';
    }

    function clearAuthAlert() {
      const el = document.getElementById('authAlertMessage');
      el.textContent = '';
      el.style.display = 'none';
    }

    // ─── Auth State Observer ──────────────────────────────────────────────────────
    auth.onAuthStateChanged(async (user) => {
      const gate = document.getElementById('auth-blocker');
      const verifyGate = document.getElementById('email-verification-blocker');
      const mainUi = document.getElementById('user-interface');
      const clientBoardBtn = document.getElementById('clientRequestsBoardBtn');
      const navBadge = document.getElementById('navAuthBadge');
      const adminBtn = document.getElementById('adminTabBtn');

      if (user) {
        // Close modal if open (landing page modal)
        closeAuthModal();

        // Check email verification status
        const isEmailVerified = user.emailVerified;
        const isPasswordProvider = user.providerData && user.providerData[0]?.providerId === 'password';

        if (!isEmailVerified && isPasswordProvider) {
          gate.classList.add('hidden');
          verifyGate.classList.remove('hidden');
          mainUi.style.display = 'none';
          if (navBadge) navBadge.style.display = 'none';
          adminBtn.style.display = 'none';
          document.getElementById('verifyEmailDisplay').textContent = user.email;
          return;
        } else {
          verifyGate.classList.add('hidden');
        }
        // Load display info
        document.getElementById('authDisplayName').textContent = user.displayName || 'مستخدم المنصة';
        document.getElementById('authDisplayEmail').textContent = user.email || '';
        document.getElementById('navAccountLabel').textContent = (user.displayName || 'حسابي').split(' ')[0];

        if (user.photoURL) {
          document.getElementById('authAvatarEl').innerHTML = `<img src="${escapeAttr(user.photoURL)}" alt="Avatar" />`;
        } else {
          const initials = (user.displayName || '؟').charAt(0).toUpperCase();
          document.getElementById('authAvatarEl').textContent = initials;
        }

        if (!user.emailVerified && user.providerData[0]?.providerId === 'password') {
          document.getElementById('profileVerifyBtn').style.display = 'block';
        } else {
          document.getElementById('profileVerifyBtn').style.display = 'none';
        }

        // Fetch user role from Firestore users collection.
        // `isBootstrapAdmin` only affects what this browser tab displays; Firestore
        // rules (not this check) are what actually stop a non-admin from writing
        // role: 'admin' to their own document. See OWNER_BOOTSTRAP_ADMIN_UIDS in state.js.
        const isBootstrapAdmin = isOwnerBootstrapAdmin(user);

        try {
          const userRef = db.collection('users').doc(user.uid);
          const snap = await userRef.get();

          if (snap.exists) {
            currentUserRole = snap.data().role || 'customer';

            if (isBootstrapAdmin && currentUserRole !== 'admin') {
              try {
                await userRef.update({ role: 'admin' });
                currentUserRole = 'admin';
              } catch (err) {
                console.warn("Could not update role in Firestore database, using local role fallback:", err);
                currentUserRole = 'admin';
              }
            }
          } else {
            // Document does not exist, create it and auto-promote to admin if matching criteria
            const newRole = isBootstrapAdmin ? 'admin' : 'customer';
            try {
              await userRef.set({
                uid: user.uid,
                email: user.email || '',
                name: user.displayName || 'مستخدم',
                phone: '',
                role: newRole,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
              });
              currentUserRole = newRole;
            } catch (err) {
              console.warn("Could not set user document in Firestore, using local role fallback:", err);
              if (isBootstrapAdmin) {
                currentUserRole = 'admin';
              }
            }
          }

          if (isBootstrapAdmin) {
            currentUserRole = 'admin'; // Override to guarantee admin access in frontend
          }

          const roleMap = { admin: 'المشرف 🛡️', artisan: 'حرفي معتمد 🔧', customer: 'زبون' };
          document.getElementById('authDisplayRole').textContent = roleMap[currentUserRole] || 'زبون';

          // Show/hide verification promo button for artisan
          if (currentUserRole === 'artisan') {
            document.getElementById('webProfileVerificationPromo').style.display = 'block';
          } else {
            document.getElementById('webProfileVerificationPromo').style.display = 'none';
          }

          // Security gate logic for admin mode
          if (currentUserRole === 'admin') {
            // Show Admin tab ONLY if we are in admin mode
            adminBtn.style.display = isAdminMode ? 'flex' : 'none';

            gate.classList.add('hidden');
            mainUi.style.display = 'flex';
            if (navBadge) navBadge.style.display = 'inline-block';

            if (isAdminMode) {
              navigateToSection('admin');
            }
          } else {
            adminBtn.style.display = 'none';

            // Show client requests board button for all logged-in users
            if (clientBoardBtn) {
              clientBoardBtn.style.display = 'flex';
            }

            if (isAdminMode) {
              gate.classList.remove('hidden');
              mainUi.style.display = 'none';
              if (navBadge) navBadge.style.display = 'none';
              showAuthAlert('عذراً، هذا الحساب لا يملك صلاحيات المشرف. يرجى تسجيل الدخول بحساب مسؤول.', 'error');
              auth.signOut();
            } else {
              gate.classList.add('hidden');
              mainUi.style.display = 'flex';
              if (navBadge) navBadge.style.display = 'inline-block';

              if (activeSection === 'admin') {
                navigateToSection('home');
              }
            }
          }
        } catch (e) {
          console.warn("Could not load user role:", e);
          currentUserRole = 'customer';
          adminBtn.style.display = 'none';

          if (isAdminMode) {
            gate.classList.remove('hidden');
            mainUi.style.display = 'none';
            showAuthAlert('خطأ في تحميل صلاحيات الحساب: ' + e.message, 'error');
          } else {
            gate.classList.add('hidden');
            mainUi.style.display = 'flex';
          }
        }

        // Load main artisans data list
        loadArtisansDatabase();

      } else {
        gate.classList.remove('hidden');
        if (verifyGate) verifyGate.classList.add('hidden');
        mainUi.style.display = 'none';
        if (navBadge) navBadge.style.display = 'none';
        adminBtn.style.display = 'none';
        document.getElementById('navAccountLabel').textContent = 'حسابي';
        currentUserRole = 'customer';
        document.getElementById('webProfileVerificationPromo').style.display = 'none';

        if (isAdminMode) {
          applyAdminModeUI();
        }
      }
    });

    // ─── Auth Error Translator ─────────────────────────────────────────────────────
    function translateAuthCode(code) {
      const MAP = {
        'auth/wrong-password': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
        'auth/user-not-found': 'لا يوجد حساب مرتبط بهذا البريد الإلكتروني.',
        'auth/email-already-in-use': 'هذا البريد الإلكتروني مستخدم بالفعل.',
        'auth/weak-password': 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.',
        'auth/invalid-email': 'صيغة البريد الإلكتروني غير صحيحة.',
        'auth/too-many-requests': 'تم تعليق الحساب مؤقتاً بسبب كثرة المحاولات. حاول لاحقاً.',
        'auth/invalid-credential': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
        'auth/popup-closed-by-user': 'تم إغلاق نافذة تسجيل الدخول. حاول مرة أخرى.',
        'auth/popup-blocked': 'تم حظر نافذة المنبثقة. يرجى السماح بها في المتصفح.',
        'auth/network-request-failed': 'خطأ في الاتصال بالشبكة. تحقق من اتصالك بالإنترنت.',
        'auth/unauthorized-domain': 'هذا النطاق غير مسجل في Firebase. أضفه في Firebase Console.',
      };
      return MAP[code] || ('حدث خطأ غير متوقع: ' + (code || 'unknown'));
    }

    // ─── Auth Firebase Actions ────────────────────────────────────────────────────
    async function authWebGoogleLogin() {
      clearAuthAlert();
      try {
        const result = await auth.signInWithPopup(googleProvider);
        const user = result.user;

        const userRef = db.collection('users').doc(user.uid);
        const snap = await userRef.get();
        if (!snap.exists) {
          await userRef.set({
            uid: user.uid,
            email: user.email,
            name: user.displayName,
            phone: '',
            role: 'customer',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
        showAuthAlert('تم تسجيل الدخول بنجاح! ✓');
      } catch (e) {
        showAuthAlert('خطأ في تسجيل الدخول بواسطة Google: ' + translateAuthCode(e.code), 'error');
      }
    }

    async function authWebEmailLogin() {
      clearAuthAlert();
      const email = document.getElementById('authLoginEmail').value.trim();
      const pass = document.getElementById('authLoginPassword').value;

      if (!email || !pass) return showAuthAlert('يرجى ملء جميع الحقول المطلوبة', 'error');

      try {
        await auth.signInWithEmailAndPassword(email, pass);
        showAuthAlert('تم تسجيل الدخول بنجاح! ✓');
      } catch (e) {
        showAuthAlert(translateAuthCode(e.code), 'error');
      }
    }

    async function authWebEmailRegister() {
      clearAuthAlert();
      const name = document.getElementById('authRegName').value.trim();
      const phone = document.getElementById('authRegPhone').value.trim();
      const email = document.getElementById('authRegEmail').value.trim();
      const pass = document.getElementById('authRegPassword').value;
      const isArtisan = document.getElementById('authRegIsArtisan').checked;

      if (!name || !email || !pass) return showAuthAlert('الاسم، البريد، وكلمة المرور مطلوبة.', 'error');
      if (pass.length < 6) return showAuthAlert('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');

      try {
        const credential = await auth.createUserWithEmailAndPassword(email, pass);
        const user = credential.user;
        await user.updateProfile({ displayName: name });

        const userProfile = {
          uid: user.uid,
          email,
          name,
          phone,
          role: 'customer',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        await db.collection('users').doc(user.uid).set(userProfile);

        if (isArtisan) {
          const city = document.getElementById('authArtisanCity').value;
          const district = document.getElementById('authArtisanDistrict').value.trim();
          const job = document.getElementById('authArtisanJob').value;
          const desc = document.getElementById('authArtisanDesc').value.trim();

          await db.collection('requests').add({
            uid: user.uid,
            name,
            phone,
            city,
            district,
            subject: 'تسجيل حرفي جديد عبر الموقع',
            job,
            description: desc,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }

        await user.sendEmailVerification();
        showAuthAlert('تم إنشاء الحساب بنجاح! تحقق من بريدك لتأكيد حسابك ✓');
      } catch (e) {
        showAuthAlert(translateAuthCode(e.code), 'error');
      }
    }

    async function authWebResetPassword() {
      clearAuthAlert();
      const email = document.getElementById('authLoginEmail').value.trim();
      if (!email) return showAuthAlert('الرجاء كتابة بريدك الإلكتروني في حقل تسجيل الدخول أولاً.', 'error');

      try {
        await auth.sendPasswordResetEmail(email);
        showAuthAlert('تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني ✓');
      } catch (e) {
        showAuthAlert(translateAuthCode(e.code), 'error');
      }
    }

    async function authWebSendVerification() {
      try {
        await auth.currentUser.sendEmailVerification();
        alert('تم إرسال رسالة التأكيد إلى بريدك الإلكتروني بنجاح.');
      } catch (e) {
        alert('حدث خطأ: ' + e.message);
      }
    }

    async function authWebLogout() {
      await auth.signOut();
      closeProfileModal();
    }

    function openVerificationModal() {
      closeProfileModal();
      document.getElementById('verificationInfoModal').classList.add('open');
    }

    function closeVerificationModal() {
      document.getElementById('verificationInfoModal').classList.remove('open');
    }

    // ─── Email Verification Actions ───────────────────────────────────────────────
    function showVerifyAlert(text, type = 'success') {
      const el = document.getElementById('verifyAlertMessage');
      el.textContent = text;
      el.style.display = 'block';
      el.style.backgroundColor = type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)';
      el.style.border = type === 'success' ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(239,68,68,0.4)';
      el.style.color = type === 'success' ? '#10b981' : '#ef4444';
    }

    async function webCheckVerificationStatus() {
      const user = auth.currentUser;
      if (!user) return;

      const btn = document.getElementById('btnCheckVerify');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';

      try {
        await user.reload();
        if (auth.currentUser.emailVerified) {
          showVerifyAlert('تم تفعيل حسابك بنجاح! جاري تحويلك...', 'success');
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          showVerifyAlert('البريد الإلكتروني لم يتم تفعيله بعد. الرجاء الضغط على الرابط المرسل إليك.', 'error');
        }
      } catch (e) {
        showVerifyAlert('حدث خطأ أثناء التحقق: ' + e.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    }

    let webResendCountdown = 0;
    async function webResendVerification() {
      if (webResendCountdown > 0) return;
      const user = auth.currentUser;
      if (!user) return;

      const btn = document.getElementById('btnResendVerify');
      btn.disabled = true;

      try {
        await user.sendEmailVerification();
        showVerifyAlert('تم إرسال رابط تفعيل جديد إلى بريدك الإلكتروني ✓', 'success');
        webResendCountdown = 60;
        updateWebResendCountdown();
      } catch (e) {
        showVerifyAlert('حدث خطأ أثناء إرسال البريد: ' + e.message, 'error');
        btn.disabled = false;
      }
    }

    function updateWebResendCountdown() {
      const btn = document.getElementById('btnResendVerify');
      if (webResendCountdown > 0) {
        btn.innerHTML = `<i class="fas fa-clock"></i> إعادة الإرسال بعد (${webResendCountdown}ث)`;
        webResendCountdown--;
        setTimeout(updateWebResendCountdown, 1000);
      } else {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> إعادة إرسال رابط التفعيل';
      }
    }

    async function webLogoutFromVerification() {
      await auth.signOut();
      document.getElementById('email-verification-blocker').classList.add('hidden');
    }

    async function authWebDeleteAccount() {
      if (!confirm('هل أنت متأكد من رغبتك في حذف حسابك نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.')) return;
      const user = auth.currentUser;
      if (!user) return;

      try {
        const uid = user.uid;

        await db.collection('users').doc(uid).update({
          deleted: true,
          name: 'Deleted User',
          email: 'deleted@hraifi.com',
          phone: '',
          deletedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        try {
          await db.collection('artisans').doc(uid).update({
            deleted: true,
            status: 'deleted'
          });
        } catch (x) { }

        await user.delete();
        alert('تم حذف الحساب بنجاح.');
        closeProfileModal();
      } catch (e) {
        if (e.code === 'auth/requires-recent-login') {
          alert('يجب تسجيل الدخول مرة أخرى للتحقق من أمانك قبل المتابعة في حذف الحساب.');
        } else {
          alert('حدث خطأ أثناء حذف الحساب: ' + e.message);
        }
      }
    }

    // ─── Modal Profil View Controllers ────────────────────────────────────────────
    function openProfileModal() {
      document.getElementById('profileModal').classList.add('open');
    }

    function closeProfileModal() {
      document.getElementById('profileModal').classList.remove('open');
    }
