(() => {
  const slider = new Slider('.slider-container', {
    navigation: {
      prevEl: '.slider-button-prev',
      nextEl: '.slider-button-next'
    },
    pagination: true
    // navigation: true
  });
})();
