    // ─── SECURE ADMIN DASHBOARD MANAGEMENT (ADMIN ONLY) ───────────────────────────
    function switchAdminTab(tab, btn) {
      if (currentUserRole !== 'admin') return;
      activeAdminTab = tab;
      document.querySelectorAll('.admin-subtab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.admin-subcontent').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const tabEl = document.getElementById('adminTab-' + tab);
      if (tabEl) tabEl.classList.add('active');

      if (tab === 'artisans') {
        loadAdminArtisansTable();
      } else if (tab === 'requests') {
        loadAdminPendingRequests();
      } else if (tab === 'clientRequests') {
        loadAdminClientRequests();
      } else if (tab === 'reports') {
        loadAdminReports(); // No-op: buttons are static
      }
    }

    async function loadAdminPanelMetrics() {
      if (currentUserRole !== 'admin') return;
      refreshDebugLogs();

      // 1. Count users
      try {
        const usersSnap = await db.collection('users').get();
        document.getElementById('statUsersCount').textContent = usersSnap.size;
      } catch (e) {
        console.warn("Could not load users count:", e);
        document.getElementById('statUsersCount').textContent = "غير متوفر";
      }

      // 2. Count approved artisans
      try {
        const artisansSnap = await db.collection('artisans').where('status', '==', 'approved').get();
        document.getElementById('statArtisansCount').textContent = artisansSnap.size;
      } catch (e) {
        console.warn("Could not load artisans count:", e);
        document.getElementById('statArtisansCount').textContent = "غير متوفر";
      }

      // 3. Count pending requests
      try {
        const requestsSnap = await db.collection('requests').where('status', '==', 'pending').get();
        document.getElementById('statPendingRequests').textContent = requestsSnap.size;
        // Also update client requests badge
        try {
          const cReqSnap = await db.collection('clientRequests').where('status', '==', 'pending').get();
          const badge = document.getElementById('adminClientReqBadge');
          if (badge) badge.textContent = cReqSnap.size;
        } catch (_) { }
      } catch (e) {
        console.warn("Could not load pending requests count:", e);
        document.getElementById('statPendingRequests').textContent = "غير متوفر";
      }

      // 4. Default load active tab
      try {
        if (activeAdminTab === 'requests') {
          loadAdminPendingRequests();
        } else if (activeAdminTab === 'clientRequests') {
          loadAdminClientRequests();
        } else if (activeAdminTab === 'artisans') {
          loadAdminArtisansTable();
        }
      } catch (e) {
        console.error("Failed to load active admin tab data:", e);
      }
    }

    // Requests are keyed by id here instead of being serialized into onclick
    // attributes below — a request's fields (name, description, ...) come from
    // an unauthenticated public form, so inlining raw JSON into HTML would let
    // a crafted submission break out of the attribute and run JS as the admin.
    let _adminPendingRequestsCache = {};

    async function loadAdminPendingRequests() {
      if (currentUserRole !== 'admin') return;
      const container = document.getElementById('adminRequestsList');
      try {
        const snap = await db.collection('requests').where('status', '==', 'pending').get();
        if (snap.empty) {
          container.innerHTML = `<div class="empty-state"><i class="fas fa-clipboard-check"></i> لا توجد طلبات انضمام معلقة حالياً.</div>`;
          return;
        }

        _adminPendingRequestsCache = {};
        let html = '';
        snap.forEach(docSnap => {
          const req = docSnap.data();
          const reqId = docSnap.id;
          _adminPendingRequestsCache[reqId] = req;
          const dateStr = req.createdAt ? new Date(req.createdAt.seconds * 1000).toLocaleDateString('ar-MA') : '';
          const jobLabel = escapeHTML(JOB_LABELS[req.job] || req.job);
          const docUrl = req.photoURL || req.selfieURL;

          html += `
                <div class="admin-request-card" id="admin-req-card-${escapeAttr(reqId)}">
                    <div class="admin-req-header">
                        <span class="admin-req-name">${escapeHTML(req.name)}</span>
                        <span class="status-pill status-pending">طلب معلق</span>
                    </div>
                    <div class="admin-req-meta">
                        <span><i class="fas fa-phone"></i> ${escapeHTML(req.phone)}</span>
                        <span><i class="fas fa-map-marker-alt"></i> ${escapeHTML(req.city)} - ${escapeHTML(req.district)}</span>
                        <span><i class="fas fa-briefcase"></i> المهنة: ${jobLabel}</span>
                        <span><i class="fas fa-calendar-alt"></i> التاريخ: ${dateStr}</span>
                    </div>
                    <div class="admin-req-desc">
                        <strong>تفاصيل / نبذة:</strong> ${escapeHTML(req.description) || 'بدون وصف إضافي'}
                    </div>
                    ${docUrl ? `<div style="margin: 10px 0;"><a href="${escapeAttr(docUrl)}" target="_blank" class="auth-gate-link" style="text-align:right; font-weight:700;"><i class="fas fa-image"></i> عرض مستند الهوية / الصورة المرفقة</a></div>` : ''}

                    <div class="admin-action-btn-group" style="margin-top:10px;">
                        <button class="btn-admin-action btn-admin-success" onclick="approveRequest('${escapeAttr(reqId)}')">
                            <i class="fas fa-check"></i> قبول وتفعيل كحرفي
                        </button>
                        <button class="btn-admin-action btn-admin-danger" onclick="rejectRequest('${escapeAttr(reqId)}')">
                            <i class="fas fa-times"></i> رفض الطلب
                        </button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;

      } catch (e) {
        container.innerHTML = `<div class="empty-state" style="color:var(--danger-color);"><i class="fas fa-exclamation-triangle"></i> فشل تحميل الطلبات: ${e.message}</div>`;
      }
    }

    async function approveRequest(reqId) {
      const reqData = _adminPendingRequestsCache[reqId];
      if (!reqData) { alert('تعذر إيجاد بيانات الطلب، يرجى إعادة تحميل القائمة.'); return; }
      if (!confirm(`هل أنت متأكد من قبول الحرفي "${reqData.name}" وتفعيله في الدليل العام للمنصة؟`)) return;

      // Use uid from reqData, or fallback to reqId (some app registrations use uid as doc ID)
      const artisanUid = reqData.uid || reqId;

      try {
        // 1. Create/update artisan document
        await db.collection('artisans').doc(artisanUid).set({
          name: reqData.name,
          phone: reqData.phone,
          city: reqData.city,
          district: reqData.district,
          job: reqData.job,
          description: reqData.description || '',
          rating: 5.0,
          ratingCount: 0,
          verified: true,
          premium: false,
          photoURL: reqData.photoURL || reqData.selfieURL || '',
          status: 'approved',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 2. Update user role to artisan (if uid exists)
        try {
          await db.collection('users').doc(artisanUid).update({ role: 'artisan' });
        } catch (userErr) {
          console.warn('Could not update user role (user may not exist):', userErr);
        }

        // 3. Mark request as approved
        await db.collection('requests').doc(reqId).update({ status: 'approved' });

        // 4. Remove card from UI
        const card = document.getElementById('admin-req-card-' + reqId);
        if (card) card.remove();

        alert('✅ تم قبول وتفعيل الحرفي بنجاح! تم نقله إلى الدليل العام للمنصة.');
        loadAdminPanelMetrics();

      } catch (e) {
        console.error('approveRequest error:', e);
        alert('❌ حدث خطأ أثناء تفعيل الحرفي:\n' + e.message + '\n\nتأكد من تحديث قواعد Firestore.');
      }
    }

    async function rejectRequest(reqId) {
      if (!confirm('هل أنت متأكد من رفض طلب الانضمام هذا؟')) return;

      try {
        await db.collection('requests').doc(reqId).update({ status: 'rejected' });

        // Remove card from UI
        const card = document.getElementById('admin-req-card-' + reqId);
        if (card) card.remove();

        alert('تم رفض طلب الانضمام.');
        loadAdminPanelMetrics();
      } catch (e) {
        console.error('rejectRequest error:', e);
        alert('❌ حدث خطأ أثناء تحديث الطلب: ' + e.message);
      }
    }

    // ─── Admin: Load Client Requests ─────────────────────────────────────────
    async function loadAdminClientRequests() {
      if (currentUserRole !== 'admin') return;
      const container = document.getElementById('adminClientRequestsList');
      if (!container) return;
      container.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i> جاري تحميل...</div>';
      try {
        const snap = await db.collection('clientRequests').where('status', '==', 'pending').get();
        if (snap.empty) {
          container.innerHTML = '<div class="empty-state"><i class="fas fa-clipboard-check"></i> لا توجد طلبات عملاء معلقة حالياً.</div>';
          return;
        }
        let html = '';
        snap.forEach(docSnap => {
          const req = docSnap.data();
          const reqId = docSnap.id;
          const dateStr = req.createdAt ? new Date(req.createdAt.seconds * 1000).toLocaleDateString('ar-MA') : '';
          const jobLabel = escapeHTML(JOB_LABELS[req.job] || req.job);
          const safeId = escapeAttr(reqId);
          html += `
          <div class="admin-request-card" id="admin-creq-card-${safeId}">
            <div class="admin-req-header">
              <span class="admin-req-name">${escapeHTML(req.subject || 'طلب عمل')} — ${escapeHTML(req.name)}</span>
              <span class="status-pill status-pending">طلب عميل معلق</span>
            </div>
            <div class="admin-req-meta">
              <span><i class="fas fa-phone"></i> ${escapeHTML(req.phone)}</span>
              <span><i class="fas fa-map-marker-alt"></i> ${escapeHTML(req.city)} - ${escapeHTML(req.district)}</span>
              <span><i class="fas fa-briefcase"></i> ${jobLabel}</span>
              <span><i class="fas fa-calendar-alt"></i> ${dateStr}</span>
            </div>
            <div class="admin-req-desc"><strong>الوصف:</strong> ${escapeHTML(req.description) || 'بدون وصف'}</div>
            ${req.photoURL ? `<div style="margin:8px 0;"><a href="${escapeAttr(req.photoURL)}" target="_blank" class="auth-gate-link"><i class="fas fa-image"></i> عرض الصورة</a></div>` : ''}
            <div class="admin-action-btn-group" style="margin-top:10px;">
              <button class="btn-admin-action btn-admin-success" onclick="approveClientRequest('${safeId}')">
                <i class="fas fa-check"></i> موافقة ونشر للحرفيين
              </button>
              <button class="btn-admin-action btn-admin-danger" onclick="rejectClientRequest('${safeId}')">
                <i class="fas fa-times"></i> رفض
              </button>
            </div>
          </div>
        `;
        });
        container.innerHTML = html;
      } catch (e) {
        container.innerHTML = `<div class="empty-state" style="color:var(--danger-color);"><i class="fas fa-exclamation-triangle"></i> خطأ: ${e.message}</div>`;
      }
    }

    async function approveClientRequest(reqId) {
      if (!confirm('هل أنت متأكد من موافقة هذا الطلب ونشره للحرفيين؟')) return;
      try {
        await db.collection('clientRequests').doc(reqId).update({ status: 'approved' });
        alert('تم نشر طلب العميل بنجاح! سيظهر للحرفيين الآن.');
        loadAdminPanelMetrics();
      } catch (e) {
        alert('خطأ: ' + e.message);
      }
    }

    async function rejectClientRequest(reqId) {
      if (!confirm('هل أنت متأكد من رفض طلب العميل هذا؟')) return;
      try {
        await db.collection('clientRequests').doc(reqId).update({ status: 'rejected' });
        alert('تم رفض طلب العميل.');
        loadAdminPanelMetrics();
      } catch (e) {
        alert('خطأ: ' + e.message);
      }
    }

    async function loadAdminArtisansTable() {
      if (currentUserRole !== 'admin') return;
      const tableBody = document.getElementById('adminArtisansTableBody');
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">جاري تحميل الحرفيين المعتمدين...</td></tr>`;

      try {
        const snap = await db.collection('artisans').where('status', '==', 'approved').get();
        if (snap.empty) {
          tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">لا يوجد حرفيون معتمدون نشطون حالياً.</td></tr>`;
          return;
        }

        let html = '';
        snap.forEach(docSnap => {
          const art = docSnap.data();
          const artId = docSnap.id;
          const jobLabel = escapeHTML(JOB_LABELS[art.job] || art.job);
          const ratingVal = art.rating || 0;
          const safeId = escapeAttr(artId);

          html += `
                <tr>
                    <td style="font-weight:700; color:white;">${escapeHTML(art.name)}</td>
                    <td>${jobLabel}</td>
                    <td>${escapeHTML(art.city)} - ${escapeHTML(art.district || '')}</td>
                    <td><i class="fas fa-star" style="color:#FFD700;"></i> ${ratingVal.toFixed(1)}</td>
                    <td>${art.verified ? '<span class="status-pill status-approved">موثق ✓</span>' : '<span class="status-pill status-rejected">غير موثق</span>'}</td>
                    <td>${art.premium ? '<span class="status-pill status-approved" style="background:rgba(245,158,11,0.2); color:var(--accent-color);">مميز ★</span>' : '<span class="status-pill status-rejected">عادي</span>'}</td>
                    <td>
                        <div class="admin-action-btn-group">
                            <button class="btn-admin-action btn-admin-success" onclick="toggleArtisanVerification('${safeId}', ${!!art.verified})">
                                <i class="fas fa-user-check"></i> ${art.verified ? 'إلغاء التوثيق' : 'توثيق الحرفي'}
                            </button>
                            <button class="btn-admin-action btn-admin-warning" onclick="toggleArtisanPremiumStatus('${safeId}', ${!!art.premium})">
                                <i class="fas fa-award"></i> ${art.premium ? 'عادي' : 'ترقية لمميز'}
                            </button>
                            <button class="btn-admin-action btn-admin-danger" onclick="deleteArtisanByAdmin('${safeId}')">
                                <i class="fas fa-trash"></i> حذف
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        tableBody.innerHTML = html;

      } catch (e) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--danger-color);">خطأ في تحميل الحرفيين: ${e.message}</td></tr>`;
      }
    }

    async function toggleArtisanVerification(artisanId, currentStatus) {
      try {
        await db.collection('artisans').doc(artisanId).update({
          verified: !currentStatus
        });
        loadAdminArtisansTable();
      } catch (e) {
        alert(e.message);
      }
    }

    async function toggleArtisanPremiumStatus(artisanId, currentStatus) {
      try {
        await db.collection('artisans').doc(artisanId).update({
          premium: !currentStatus
        });
        loadAdminArtisansTable();
      } catch (e) {
        alert(e.message);
      }
    }

    async function deleteArtisanByAdmin(artisanId) {
      if (!confirm('هل أنت متأكد من إزالة هذا الحرفي من الدليل العام؟ ستصبح حالة حسابه غير نشطة.')) return;

      try {
        await db.collection('artisans').doc(artisanId).update({
          status: 'deleted'
        });
        alert('تمت إزالة الحرفي من الدليل.');
        loadAdminPanelMetrics();
        loadArtisansDatabase();
      } catch (e) {
        alert(e.message);
      }
    }
