(() => {
  window.addEventListener('load', () => {
    const slider = new Slider('.slider-container', {
      loop: true,
      navigation: {
        prevEl: '.slider-button-prev',
        nextEl: '.slider-button-next'
      },
      pagination: true
      // navigation: true
    });
  })
})();
