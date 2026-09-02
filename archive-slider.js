(() => {
  const viewport = document.querySelector(".gallery-viewport");

  if (!viewport) return;

  const slides = [...viewport.querySelectorAll(".gallery-slide")];
  const counter = document.querySelector(".gallery-counter");
  const caption = document.querySelector(".gallery-caption-text");
  const previous = document.querySelector(".gallery-previous");
  const next = document.querySelector(".gallery-next");
  let currentIndex = 0;
  let scrollFrame;

  const updateGallery = (index) => {
    currentIndex = Math.max(0, Math.min(index, slides.length - 1));
    counter.textContent = `${currentIndex + 1}/${slides.length}`;
    caption.textContent = slides[currentIndex].dataset.caption;
    previous.disabled = currentIndex === 0;
    next.disabled = currentIndex === slides.length - 1;
  };

  const showSlide = (index) => {
    const targetIndex = Math.max(0, Math.min(index, slides.length - 1));
    viewport.scrollTo({ left: slides[targetIndex].offsetLeft, behavior: "smooth" });
    updateGallery(targetIndex);
  };

  previous.addEventListener("click", () => showSlide(currentIndex - 1));
  next.addEventListener("click", () => showSlide(currentIndex + 1));

  viewport.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showSlide(currentIndex - 1);
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      showSlide(currentIndex + 1);
    }
  });

  viewport.addEventListener("scroll", () => {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(() => {
      const nearestIndex = slides.reduce((nearest, slide, index) => {
        const currentDistance = Math.abs(slide.offsetLeft - viewport.scrollLeft);
        const nearestDistance = Math.abs(slides[nearest].offsetLeft - viewport.scrollLeft);
        return currentDistance < nearestDistance ? index : nearest;
      }, 0);

      updateGallery(nearestIndex);
    });
  }, { passive: true });

  updateGallery(0);
})();
