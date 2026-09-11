    // ─── Page Navigation ──────────────────────────────────────────────────────────
    function navigateToSection(sectionId) {
      activeSection = sectionId;
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));

      const secEl = document.getElementById(sectionId + 'Section');
      const btnEl = document.getElementById(sectionId + 'Btn');

      if (secEl) secEl.classList.add('active');
      if (btnEl) btnEl.classList.add('active');

      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Dynamic loaders per section
      if (sectionId === 'admin') {
        loadAdminPanelMetrics();
      } else if (sectionId === 'clientRequestsBoard') {
        loadClientRequestsBoard();
      } else if (sectionId === 'addRequest') {
        // Show/hide artisan block based on role
        const artisanBlock = document.getElementById('addReqArtisanBlock');
        const formWrapper = document.getElementById('addReqFormWrapper');
        if (artisanBlock && formWrapper) {
          if (currentUserRole === 'artisan') {
            artisanBlock.style.display = 'block';
            formWrapper.style.display = 'none';
          } else {
            artisanBlock.style.display = 'none';
            formWrapper.style.display = 'block';
          }
        }
      }
    }

    function filterByJob(jobKey) {
      navigateToSection('artisans');
      const filterJobEl = document.getElementById('filterJob');
      if (filterJobEl) {
        filterJobEl.value = jobKey;
        triggerArtisanFilter();
      }
    }
