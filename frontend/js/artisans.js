    // ─── Dynamic Artisans Data Loader ──────────────────────────────────────────────
    async function loadArtisansDatabase() {
      const approvedListEl = document.getElementById('approvedArtisansList');

      try {
        const snap = await db.collection('artisans').where('status', '==', 'approved').get();
        allArtisansList = [];
        snap.forEach(docSnap => {
          allArtisansList.push({ id: docSnap.id, ...docSnap.data() });
        });

        renderArtisansList(allArtisansList);
        renderTopRatedArtisans(allArtisansList);

      } catch (e) {
        console.error("Firestore read error:", e);
        approvedListEl.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i> تعذر تحميل البيانات.</div>`;
      }
    }

    function renderArtisansList(list) {
      const container = document.getElementById('approvedArtisansList');
      if (list.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-users-slash"></i> لا يوجد حرفيون يطابقون خيارات البحث.</div>`;
        return;
      }

      container.innerHTML = list.map(artisan => {
        const rating = artisan.rating || 0;
        const ratingCount = artisan.ratingCount || 0;
        const jobLabel = escapeHTML(JOB_LABELS[artisan.job] || artisan.job);
        const safeName = escapeHTML(artisan.name || '');
        const safeCity = escapeHTML(artisan.city || '');
        const safeDistrict = escapeHTML(artisan.district || '');
        const safePhone = escapeHTML(artisan.phone || '');
        const safeDesc = escapeHTML(artisan.description || '') || 'لا يوجد وصف مفصل للحريفي.';
        const safeId = escapeAttr(artisan.id);
        const avatarUrl = artisan.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(artisan.name)}&background=1E3A5F&color=fff&size=128`;
        const isPremium = artisan.premium ? 'premium' : '';

        return `
        <div class="artisan-card ${isPremium}" id="artisan-card-${safeId}">
          ${artisan.premium ? '<div class="premium-tag"><i class="fas fa-star"></i> متميز</div>' : ''}

          <div class="artisan-header">
            <img class="artisan-avatar" src="${escapeAttr(avatarUrl)}" alt="${safeName}" />
            <div class="artisan-title-info">
              <h3>
                ${safeName}
                ${artisan.verified ? '<i class="fas fa-check-circle" style="color: var(--accent-color);" title="موقّع ومؤكد"></i>' : ''}
              </h3>
              <div class="artisan-job-label">${jobLabel}</div>
            </div>
          </div>

          <div class="artisan-details-list">
            <div class="detail-item">
              <i class="fas fa-map-marker-alt"></i>
              <span>${safeCity} - ${safeDistrict}</span>
            </div>
            <div class="detail-item">
              <i class="fas fa-star"></i>
              <span>التقييم: ${rating.toFixed(1)} (${ratingCount} تقييم)</span>
            </div>
            <div style="margin-top: 4px;">
              ${generateStarsHTML(rating)}
            </div>
          </div>

          <div class="action-buttons">
            <a class="btn btn-call" href="tel:${safePhone}">
                <i class="fas fa-phone-alt"></i> اتصال: ${safePhone}
            </a>
            <button class="btn btn-accent btn-more" onclick="toggleArtisanExpansion('${safeId}')">
                تفاصيل
            </button>
          </div>

          <div class="artisan-expanded-info" id="expanded-${safeId}">
            <div class="artisan-desc">${safeDesc}</div>
            
            <div class="reviews-section-title">آراء الزبائن :</div>
            <div id="reviews-list-${safeId}">
                <div class="empty-state" style="padding: 10px 0;">جاري تحميل التعليقات...</div>
            </div>

            <!-- Write review form -->
            <div class="review-form">
               <div class="reviews-section-title">أضف تقييمك الخاص :</div>
               <div class="star-rating-selector" id="stars-sel-${safeId}">
                  <span onclick="setRatingValue('${safeId}', 5)" id="star-${safeId}-5">★</span>
                  <span onclick="setRatingValue('${safeId}', 4)" id="star-${safeId}-4">★</span>
                  <span onclick="setRatingValue('${safeId}', 3)" id="star-${safeId}-3">★</span>
                  <span onclick="setRatingValue('${safeId}', 2)" id="star-${safeId}-2">★</span>
                  <span onclick="setRatingValue('${safeId}', 1)" id="star-${safeId}-1">★</span>
               </div>
               <input type="hidden" id="rating-val-${safeId}" value="0" />

               <div class="form-group">
                  <textarea id="comment-val-${safeId}" class="form-control" rows="2" placeholder="اكتب تعليقك هنا عن جودة الخدمة والتعامل..."></textarea>
               </div>
               <button class="btn btn-accent btn-report" onclick="submitArtisanReview('${safeId}')">
                  إرسال المراجعة
               </button>
            </div>
          </div>
        </div>
      `;
      }).join('');
    }

    async function submitNewRequest() {
      const phone = document.getElementById('reqPhone').value.trim();
      const city = document.getElementById('reqCity').value;
      const district = document.getElementById('reqDistrict').value.trim();
      const job = document.getElementById('reqJob').value;
      const subject = document.getElementById('reqSubject').value.trim();
      const description = document.getElementById('reqDescription').value.trim();
      const imgFile = document.getElementById('reqImage').files[0];

      const alertBox = document.getElementById('requestAlert');
      alertBox.style.display = 'none';

      const showAlert = (msg, isError = false) => {
        alertBox.style.display = 'block';
        alertBox.style.borderColor = isError ? 'var(--danger-color)' : 'var(--success-color)';
        alertBox.style.color = isError ? '#ff8a8a' : '#a7f3d0';
        alertBox.style.backgroundColor = isError ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.08)';
        alertBox.innerHTML = msg;
      };

      if (!phone || !district || !subject || !description) {
        showAlert('<i class="fas fa-exclamation-triangle"></i> الرجاء ملء جميع الحقول الإلزامية: رقم الهاتف، الحي، العنوان، والوصف.', true);
        return;
      }

      // Disable button
      const btn = document.getElementById('submitRequestBtn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';

      try {
        const user = auth.currentUser;
        const userUid = user ? user.uid : 'anonymous';
        const userName = user ? (user.displayName || 'مستخدم الموقع') : 'زائر';

        // Optional photo upload — wrapped in try/catch so it never blocks the request
        let photoURL = '';
        if (imgFile) {
          try {
            const fileExt = imgFile.name.split('.').pop();
            const fileName = `clientReq_${Date.now()}.${fileExt}`;
            const storageRef = storage.ref().child(`clientRequests/${fileName}`);
            const snapshot = await storageRef.put(imgFile);
            photoURL = await snapshot.ref.getDownloadURL();
          } catch (uploadErr) {
            console.warn('فشل رفع الصورة، سيتم إرسال الطلب بدون صورة:', uploadErr.message);
          }
        }

        await db.collection('clientRequests').add({
          uid: userUid,
          name: userName,
          phone: phone,
          city: city,
          district: district,
          job: job,
          subject: subject,
          description: description,
          photoURL: photoURL,
          status: 'pending',
          type: 'client_request',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showAlert('<i class="fas fa-check-circle"></i> تم إرسال طلبك بنجاح! سيقوم المشرف بمراجعته وسيتواصل معك أفضل الحرفيين في منطقتك قريباً.');

        document.getElementById('reqPhone').value = '';
        document.getElementById('reqDistrict').value = '';
        document.getElementById('reqSubject').value = '';
        document.getElementById('reqDescription').value = '';
        document.getElementById('reqImage').value = '';

      } catch (e) {
        showAlert('<i class="fas fa-exclamation-triangle"></i> حدث خطأ أثناء إرسال الطلب: ' + e.message, true);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال الطلب';
      }
    }

    // ─── Submit ARTISAN Registration Form ────────────────────────────────────
    async function submitArtisanRegistration() {
      const name = document.getElementById('arName').value.trim();
      const phone = document.getElementById('arPhone').value.trim();
      const job = document.getElementById('arJob').value;
      const city = document.getElementById('arCity').value;
      const district = document.getElementById('arDistrict').value.trim();
      const desc = document.getElementById('arDesc').value.trim();

      const alertBox = document.getElementById('artisanRegisterAlert');
      alertBox.style.display = 'none';

      const showAlert = (msg, isError = false) => {
        alertBox.style.display = 'block';
        alertBox.style.borderColor = isError ? 'var(--danger-color)' : 'var(--success-color)';
        alertBox.style.color = isError ? '#ff8a8a' : '#a7f3d0';
        alertBox.style.backgroundColor = isError ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.08)';
        alertBox.innerHTML = msg;
      };

      if (!name || !phone || !job || !city || !district || !desc) {
        showAlert('<i class="fas fa-exclamation-triangle"></i> الرجاء ملء جميع الحقول الإلزامية.', true);
        return;
      }

      const btn = document.getElementById('submitArtisanRegisterBtn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';

      try {
        const user = auth.currentUser;
        await db.collection('requests').add({
          uid: user ? user.uid : 'web_anonymous',
          name: name,
          phone: phone,
          job: job,
          city: city,
          district: district,
          subject: 'تسجيل حرفي جديد عبر الموقع',
          description: desc,
          type: 'artisan_registration',
          status: 'pending',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showAlert('<i class="fas fa-check-circle"></i> تم إرسال طلب الانضمام بنجاح! سيتم مراجعته وإدراجك في الدليل خلال 24 ساعة. يمكنك التواصل معنا عبر الواتساب للمتابعة.');
        document.getElementById('artisanRegisterFormWrapper').style.display = 'none';
      } catch (e) {
        showAlert('<i class="fas fa-exclamation-triangle"></i> حدث خطأ: ' + e.message, true);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال طلب الانضمام';
      }
    }
