    // ─── Client Requests Board (for artisans) ───────────────────────────────────
    let allClientRequests = [];

    async function loadClientRequestsBoard() {
      const container = document.getElementById('clientRequestsList');
      const authBlock = document.getElementById('crb-authBlock');
      const content = document.getElementById('crb-content');

      authBlock.style.display = 'none';
      content.style.display = 'block';
      container.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i> جاري التحميل...</div>';

      try {
        const snap = await db.collection('clientRequests').where('status', '==', 'approved').get();
        allClientRequests = [];
        snap.forEach(doc => { allClientRequests.push({ id: doc.id, ...doc.data() }); });
        allClientRequests.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        renderClientRequests(allClientRequests);
      } catch (e) {
        container.innerHTML = `<div class="empty-state" style="color:var(--danger-color);"><i class="fas fa-exclamation-triangle"></i> فشل التحميل: ${e.message}</div>`;
      }
    }

    function filterClientRequests() {
      const city = document.getElementById('crbFilterCity').value;
      const job = document.getElementById('crbFilterJob').value;
      let filtered = [...allClientRequests];
      if (city) filtered = filtered.filter(r => r.city === city);
      if (job) filtered = filtered.filter(r => r.job === job);
      renderClientRequests(filtered);
    }

    function renderClientRequests(list) {
      const container = document.getElementById('clientRequestsList');
      const crbCount = document.getElementById('crb-count');
      if (crbCount) crbCount.textContent = list ? list.length : 0;
      if (!list || list.length === 0) {
        container.innerHTML = `<div class="crb-empty-state"><div class="crb-empty-icon"><i class="fas fa-clipboard-check"></i></div><h3>لا توجد طلبات معتمدة حالياً</h3><p>جرب تغيير معايير التصفية أو تحقق لاحقاً.</p></div>`;
        return;
      }
      const JOB_ICONS = { plumber: 'fa-water', electrician: 'fa-bolt', carpenter: 'fa-hammer', painter: 'fa-paint-roller', builder: 'fa-hard-hat', tiler: 'fa-th-large', blacksmith: 'fa-tools', 'ac-technician': 'fa-snowflake' };
      container.innerHTML = `<div class="crb-cards-grid">${list.map((req, idx) => {
        const dateStr = req.createdAt ? new Date(req.createdAt.seconds * 1000).toLocaleDateString('ar-MA') : '';
        const jobLabel = escapeHTML(JOB_LABELS[req.job] || req.job);
        const jobIcon = JOB_ICONS[req.job] || 'fa-briefcase';
        const initials = escapeHTML((req.subject || 'طلب').substring(0,1));
        const safeSubject = escapeHTML(req.subject || 'طلب عمل');
        const safeCity = escapeHTML(req.city || '');
        const safeDistrict = escapeHTML(req.district || '');
        const safeDesc = escapeHTML(req.description || '');
        const safePhone = escapeHTML(req.phone || '');
        const safePhotoURL = escapeAttr(req.photoURL || '');
        const waLink = `https://wa.me/${req.phone ? escapeAttr(req.phone.replace(/^0/, '212')) : ''}?text=${encodeURIComponent('مرحبا، اطلعت على طلبك عبر منصة الحريفي، هل يمكنني مساعدتك؟')}`;
        return `
        <div class="crb-card" style="animation-delay: ${idx * 0.07}s">
          <div class="crb-card-top">
            <div class="crb-card-avatar">${initials}</div>
            <div class="crb-card-title-block">
              <h3 class="crb-card-title">${safeSubject}</h3>
              <div class="crb-card-meta">
                <span><i class="fas fa-map-marker-alt"></i> ${safeCity} ${safeDistrict ? '- ' + safeDistrict : ''}</span>
                <span><i class="fas fa-calendar-alt"></i> ${dateStr}</span>
              </div>
            </div>
            <div class="crb-job-badge"><i class="fas ${jobIcon}"></i> ${jobLabel}</div>
          </div>
          ${safeDesc ? `<p class="crb-card-desc">${safeDesc}</p>` : ''}
          ${req.photoURL ? `<a href="${safePhotoURL}" target="_blank" class="crb-photo-link"><i class="fas fa-image"></i> عرض صورة العطل</a>` : ''}
          <div class="crb-card-actions">
            <a href="tel:${safePhone}" class="crb-action-btn crb-btn-call"><i class="fas fa-phone-alt"></i> اتصال مباشر</a>
            <a href="${waLink}" target="_blank" class="crb-action-btn crb-btn-wa"><i class="fab fa-whatsapp"></i> واتساب</a>
          </div>
        </div>`;
      }).join('')}</div>`;
    }

    function renderTopRatedArtisans(list) {
      const container = document.getElementById('topArtisansContainer');
      const topRated = list
        .filter(a => (a.rating || 0) > 0)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 3);

      if (topRated.length === 0) {
        container.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;">لا توجد تقييمات كافية بعد.</div>`;
        return;
      }

      container.innerHTML = topRated.map(artisan => {
        const avatarUrl = artisan.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(artisan.name)}&background=1E3A5F&color=fff&size=128`;
        const safeId = escapeAttr(artisan.id);
        return `
        <div class="feature-box" style="text-align: right; background: var(--surface-alt); border: 1.5px solid var(--accent-color);">
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
                <img src="${escapeAttr(avatarUrl)}" style="width:48px; height:48px; border-radius:50%; object-fit:cover;" />
                <div>
                    <h4 style="color: #ffffff; font-weight:900;">${escapeHTML(artisan.name)}</h4>
                    <span style="font-size:0.85rem; color: var(--accent-light); font-weight:700;">${escapeHTML(JOB_LABELS[artisan.job] || artisan.job)}</span>
                </div>
            </div>
            <p style="font-size:0.9rem; color: var(--muted-color); margin-bottom:12px;">المدينة: ${escapeHTML(artisan.city)} | ${escapeHTML(artisan.district)}</p>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:700; color:var(--accent-color);"><i class="fas fa-star"></i> ${artisan.rating.toFixed(1)}</span>
                <button class="btn btn-accent btn-report" style="padding: 6px 14px; font-size:0.8rem;" onclick="navigateToArtisanCard('${safeId}')">تواصل معه</button>
            </div>
        </div>
      `;
      }).join('');
    }

    function navigateToArtisanCard(artisanId) {
      navigateToSection('artisans');
      setTimeout(() => {
        const el = document.getElementById(`artisan-card-${artisanId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          toggleArtisanExpansion(artisanId);
        }
      }, 400);
    }

    function generateStarsHTML(rating) {
      let stars = '';
      const rounded = Math.round(rating);
      for (let i = 1; i <= 5; i++) {
        stars += `<span style="color: ${i <= rounded ? '#FFD700' : 'rgba(255,255,255,0.15)'}; font-size: 1.25rem;">★</span>`;
      }
      return `<div class="rating-stars">${stars}</div>`;
    }

    // ─── Filters & Search implementation ──────────────────────────────────────────
    function triggerArtisanFilter() {
      const qText = document.getElementById('searchInput').value.toLowerCase().trim();
      const city = document.getElementById('filterCity').value;
      const job = document.getElementById('filterJob').value;

      let filtered = [...allArtisansList];

      if (city !== '') {
        filtered = filtered.filter(a => a.city === city);
      }
      if (job !== '') {
        filtered = filtered.filter(a => a.job === job);
      }
      if (qText !== '') {
        filtered = filtered.filter(a =>
          a.name.toLowerCase().includes(qText) ||
          (a.district && a.district.toLowerCase().includes(qText)) ||
          (a.description && a.description.toLowerCase().includes(qText))
        );
      }

      renderArtisansList(filtered);
    }
