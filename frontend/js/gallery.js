    // ─── Header background slider & work gallery slides ───────────────────────────
    let headerIndex = 0;
    setInterval(() => {
      const slides = document.querySelectorAll('#headerSlider .header-slide');
      if (slides.length > 0) {
        slides[headerIndex].classList.remove('active');
        headerIndex = (headerIndex + 1) % slides.length;
        slides[headerIndex].classList.add('active');
      }
    }, 5000);

    let galleryIndex = 0;
    function changeSlide(direction) {
      const slider = document.getElementById('gallerySlider');
      const slidesCount = slider.children.length;
      galleryIndex = (galleryIndex + direction + slidesCount) % slidesCount;
      updateGalleryPosition();
    }

    function setSlide(index) {
      galleryIndex = index;
      updateGalleryPosition();
    }

    function updateGalleryPosition() {
      const slider = document.getElementById('gallerySlider');
      if (slider) {
        // In RTL, we use negative translateX to move slides forward
        slider.style.transform = `translateX(${galleryIndex * -100}%)`;
      }
      const dots = document.querySelectorAll('#galleryDots .dot');
      dots.forEach((d, idx) => {
        d.classList.toggle('active', idx === galleryIndex);
      });
    }
