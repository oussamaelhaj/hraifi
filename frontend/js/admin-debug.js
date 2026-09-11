    // ─── ADMIN DIAGNOSIS AND HEALING FUNCTIONS ──────────────────────────────────
    async function refreshDebugLogs() {
      const user = auth.currentUser;
      if (!user) {
        document.getElementById('debug-uid').textContent = "غير متصل";
        document.getElementById('debug-email').textContent = "غير متصل";
        document.getElementById('debug-js-role').innerHTML = `<span style="color:var(--danger-color);">غير متصل</span>`;
        document.getElementById('debug-firestore-role').innerHTML = `<span style="color:var(--danger-color);">غير متصل</span>`;
        return;
      }

      document.getElementById('debug-uid').textContent = user.uid;
      document.getElementById('debug-email').textContent = user.email || 'بدون بريد';

      let isHardcoded = isOwnerBootstrapAdmin(user);
      let jsRoleText = currentUserRole === 'admin' ? '<span style="color:var(--success-color);">مشرف (Admin)</span>' : '<span style="color:var(--warning-color);">مستخدم عادي (Customer)</span>';
      if (isHardcoded) {
        jsRoleText += ' <span style="font-size:0.8rem; color:var(--accent-color);">(معرف مبرمج مسبقاً)</span>';
      }
      document.getElementById('debug-js-role').innerHTML = jsRoleText;

      // Check Firestore
      try {
        const snap = await db.collection('users').doc(user.uid).get();
        if (snap.exists) {
          const role = snap.data().role || 'customer';
          const roleColor = role === 'admin' ? 'var(--success-color)' : 'var(--warning-color)';
          document.getElementById('debug-firestore-role').innerHTML = `<span style="color:${roleColor};">${role === 'admin' ? 'مشرف (Admin) ✓' : 'مستخدم عادي (' + role + ')'}</span>`;
        } else {
          document.getElementById('debug-firestore-role').innerHTML = `<span style="color:var(--warning-color);">لا يوجد ملف مستخدم في السيرفر</span>`;
        }
      } catch (e) {
        document.getElementById('debug-firestore-role').innerHTML = `<span style="color:var(--danger-color);">خطأ في القراءة: ${e.message}</span>`;
      }
    }

    // Calls the backend's POST /api/admin/claim (backend/routes/admin.js), which
    // uses the Firebase Admin SDK server-side to grant a real `admin` custom
    // claim — the properly-secured alternative to forceHealingAdminDoc() below,
    // which only writes a Firestore field directly from the browser.
    async function claimAdminViaBackend() {
      const user = auth.currentUser;
      const statusEl = document.getElementById('debug-healing-status');
      statusEl.style.display = 'block';
      statusEl.style.color = '#ffffff';
      statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الاتصال بالسيرفر...';

      if (!user) {
        statusEl.style.color = 'var(--danger-color)';
        statusEl.innerHTML = '<i class="fas fa-times-circle"></i> خطأ: يجب أن تكون متصلاً أولاً.';
        return;
      }

      try {
        const idToken = await user.getIdToken();
        const resp = await fetch(`${HRAIFI_API_BASE_URL}/api/admin/claim`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${idToken}` }
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'فشل الطلب');

        statusEl.style.color = 'var(--success-color)';
        statusEl.innerHTML = '<i class="fas fa-check-circle"></i> تم منح صلاحية المشرف عبر السيرفر. سجل الخروج والدخول من جديد لتفعيلها.';
      } catch (e) {
        statusEl.style.color = 'var(--danger-color)';
        statusEl.innerHTML = `<i class="fas fa-times-circle"></i> فشل الاتصال بالسيرفر: ${e.message}<br/>
        <div style="font-size:0.85rem; font-weight:normal; margin-top:8px; background:rgba(0,0,0,0.3); padding:8px; border-radius:6px;">
           تأكد من أن السيرفر (backend/) منشور على Render وأن بريدك موجود في متغير البيئة ADMIN_BOOTSTRAP_EMAILS.
        </div>`;
      }
    }

    async function forceHealingAdminDoc() {
      const user = auth.currentUser;
      const statusEl = document.getElementById('debug-healing-status');
      statusEl.style.display = 'block';
      statusEl.style.color = '#ffffff';
      statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري محاولة إصلاح الصلاحيات وكتابة الرتبة في السيرفر...';

      if (!user) {
        statusEl.style.color = 'var(--danger-color)';
        statusEl.innerHTML = '<i class="fas fa-times-circle"></i> خطأ: يجب أن تكون متصلاً أولاً.';
        return;
      }

      try {
        const userRef = db.collection('users').doc(user.uid);
        await userRef.set({
          uid: user.uid,
          email: user.email || '',
          name: user.displayName || 'المشرف المسؤول',
          phone: '',
          role: 'admin',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        statusEl.style.color = 'var(--success-color)';
        statusEl.innerHTML = '<i class="fas fa-check-circle"></i> تم تحديث الرتبة في السيرفر بنجاح! تم حفظ حسابك كمشرف (role: "admin") في قاعدة البيانات.';

        // Reload info
        currentUserRole = 'admin';
        document.getElementById('adminTabBtn').style.display = 'flex';
        refreshDebugLogs();
        loadAdminPanelMetrics();
      } catch (e) {
        statusEl.style.color = 'var(--danger-color)';
        statusEl.innerHTML = `<i class="fas fa-times-circle"></i> فشل تحديث السيرفر: ${e.message}<br/>
        <div style="font-size:0.85rem; font-weight:normal; margin-top:8px; background:rgba(0,0,0,0.3); padding:8px; border-radius:6px; font-family:monospace;">
           تنبيه: إذا فشل التحديث بسبب (Permission Denied)، يرجى التأكد من تسجيل الدخول بحساب مشرف مبرمج مسبقاً (Allowed Admin UID) أو تعديل قواعد حماية Firestore (Security Rules) في لوحة تحكم Firebase لتسمح بترقية المشرفين.
        </div>`;
      }
    }
