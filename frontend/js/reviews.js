    // ─── Artisan Details & Review Loader ──────────────────────────────────────────
    async function toggleArtisanExpansion(artisanId) {
      const el = document.getElementById('expanded-' + artisanId);
      el.classList.toggle('active');

      if (el.classList.contains('active')) {
        loadReviewsList(artisanId);
      }
    }

    async function loadReviewsList(artisanId) {
      const container = document.getElementById('reviews-list-' + artisanId);
      try {
        const snap = await db.collection('ratings').where('artisanId', '==', artisanId).get();
        if (snap.empty) {
          container.innerHTML = `<div class="empty-state" style="padding: 10px 0; font-size:0.85rem;">لا توجد تقييمات لهذا الحرفي بعد. كن أول من يكتب مراجعة!</div>`;
          return;
        }

        let html = '';
        snap.forEach(docSnap => {
          const data = docSnap.data();
          const dateStr = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString('ar-MA') : '';
          html += `
                <div class="review-item">
                    <div class="review-header">
                        <span>${generateStarsHTML(data.rating)}</span>
                        <span>${dateStr}</span>
                    </div>
                    <div class="review-comment">${escapeHTML(data.comment) || 'بدون تعليق مكتوب'}</div>
                </div>
            `;
        });
        container.innerHTML = html;

      } catch (e) {
        container.innerHTML = `<div class="empty-state" style="color: var(--danger-color);">خطأ في تحميل المراجعات.</div>`;
      }
    }

    function setRatingValue(artisanId, val) {
      document.getElementById('rating-val-' + artisanId).value = val;
      for (let i = 1; i <= 5; i++) {
        const star = document.getElementById(`star-${artisanId}-${i}`);
        if (i <= val) {
          star.classList.add('active');
        } else {
          star.classList.remove('active');
        }
      }
    }

    async function submitArtisanReview(artisanId) {
      const ratingVal = parseInt(document.getElementById('rating-val-' + artisanId).value);
      const commentVal = document.getElementById('comment-val-' + artisanId).value.trim();

      if (ratingVal === 0) {
        alert('الرجاء اختيار عدد النجوم للتقييم أولاً.');
        return;
      }

      try {
        const user = auth.currentUser;
        await db.collection('ratings').add({
          artisanId: artisanId,
          rating: ratingVal,
          comment: commentVal,
          userId: user ? user.uid : 'anonymous',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        const snap = await db.collection('ratings').where('artisanId', '==', artisanId).get();
        let total = 0;
        snap.forEach(d => {
          total += d.data().rating;
        });
        const newCount = snap.size;
        const newAvg = parseFloat((total / newCount).toFixed(1));

        await db.collection('artisans').doc(artisanId).update({
          rating: newAvg,
          ratingCount: newCount
        });

        alert('شكرًا لك! تم إرسال مراجعتك بنجاح ✓');
        document.getElementById('comment-val-' + artisanId).value = '';
        document.getElementById('rating-val-' + artisanId).value = '0';
        setRatingValue(artisanId, 0);

        loadReviewsList(artisanId);
        loadArtisansDatabase();

      } catch (e) {
        alert('حدث خطأ أثناء حفظ التقييم: ' + e.message);
      }
    }

    // ─── loadAdminReports (stub to prevent error from switchAdminTab) ───────────
    function loadAdminReports() {
      // Reports tab just shows the export buttons, no dynamic load needed.
    }
