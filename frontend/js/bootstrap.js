// ─── App bootstrap: preloader + initial DOM setup ──────────────────────────
window.addEventListener('load', function () {
  var preloader = document.getElementById('site-preloader');
  if (preloader) {
    setTimeout(function () {
      preloader.classList.add('preloader-hidden');
    }, 1500);
  }
});

window.addEventListener('DOMContentLoaded', () => {
  updateGalleryPosition();
  applyAdminModeUI();

  // Intersection Observer for scroll animations
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: "0px 0px -50px 0px" });

  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
});
