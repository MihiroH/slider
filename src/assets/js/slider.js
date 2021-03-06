class Slider {
  #initialArgs = {
    loop: false,
    navigation: false,
    // type Navigation = Boolean || {
    //   prevEl: string,
    //   nextEl: string
    // }
    // navigation: Navigation,
    pagination: false,
    // pagination: Boolean || string
    on: {}
  };
  #fps = 120; // 120fpsに制限
  #scrollTime = 310;

  constructor(
    selector = '.slider-container',
    {
      loop,
      sliderClass,
      navigation,
      pagination,
      on: events
    } = this.#initialArgs
  ) {
    // Slider container.
    this.selector = selector;
    this.container = document.querySelector(selector);

    if (!this.container) {
      console.error(`Error: ${selector} is not found.`);
      return;
    }

    // Slider list.
    this.slider = this.container.querySelector(sliderClass || '.slider-list');

    if (!this.slider) {
      console.error(`Error: ${sliderClass || '.slider-list'} is not found.`);
      return;
    }

    this.slider.style.transform = 'translateX(0)';
    this.mouseLocations = [];
    this.frameTime = 1000 / this.#fps;
    this.isAnimated = false;
    this.lastDragInfo = null;
    this.startX = null;
    this.x = null;
    this.timerId = -1;
    this.timerCount = 0;
    this.velocity = { x: null, y: null };
    this.edgeSwipeThreshold = 20;
    this.speed = 300;
    this.activeIndex = 0;
    this.loop = loop || false;
    this.sliderLength = this.slider.children.length;
    this.slideWidth = this.slider.scrollWidth / this.sliderLength;

    // Initialize a loop slider.
    if (this.loop) {
      const first = this.slider.children[0];
      const last = this.slider.children[this.sliderLength - 1];

      this.slider.append(first.cloneNode(true));
      this.slider.prepend(last.cloneNode(true));
      this.sliderLoopLength = this.slider.children.length;
      this.slideWidth = this.slider.scrollWidth / this.sliderLoopLength;
      this.loopBaseIndex = 1;

      const positionX = this.slideWidth * this.loopBaseIndex * -1;
      this.moveSlider(positionX);
    }


    // Create a navigation.
    this.navigation = null;
    if (navigation === true) {
      this.navigation = this.createNavigation();
      this.toggleNavigationClassName();
    } else if (navigation) {
      this.navigation = this.createNavigation(navigation);
      this.toggleNavigationClassName();
    }

    // Create a pagination.
    this.pagination = null;
    if (pagination === true) {
      this.pagination = this.createPagination(undefined, this.sliderLength);
      this.switchPaginationClassName();
    } else if (pagination) {
      this.pagination = this.createPagination(pagination, this.sliderLength);
      this.switchPaginationClassName();
    }

    // Bind "this" object to specified events.
    // And add event listener to each slides.
    this.events = Object.entries(events || {}).reduce((all, [key, func]) => {
      all[key] = func.bind(this);
      return all;
    }, {});
    this.setEventListener(this.events);

    // Check if browser supports passive.
    this.supportsPassive = false;
    this.wheelOpt = {};
    this.wheelEvent = 'onwheel' in document.createElement('div') ? 'wheel' : 'mousewheel';
    this.testIfBrowserSupportsPassive();
  }

  /*
   * Test if the browser supports passive.
   */
  testIfBrowserSupportsPassive() {
    let supportsPassive = false;

    try {
      window.addEventListener(
        'test',
        null,
        Object.defineProperty({}, 'passive', {
          get() {
            supportsPassive = true;
          }
        })
      );
    } catch(e) {
      supportsPassive = false;
    }

    this.supportsPassive = supportsPassive;

    if (this.supportsPassive) {
      this.wheelOpt = { passive: false };
    }
  }

  /*
   * Prevent events.
   */
  preventDefault(e) {
    e.preventDefault();
  }

  /*
   * Disable scroll.
   */
  disableScroll() {
    window.addEventListener(this.wheelEvent, this.preventDefault, this.wheelOpt);
    window.addEventListener('touchmove', this.preventDefault, this.wheelOpt);
  }

  /*
   * Enable scroll.
   */
  enableScroll() {
    window.removeEventListener(this.wheelEvent, this.preventDefault, this.wheelOpt);
    window.removeEventListener('touchmove', this.preventDefault, this.wheelOpt);
  }

  /*
   * Set event listeners.
   * @param {object} events - The events used as callback function.
   */
  setEventListener(events) {
    const eventNames = {
      start: this.detectMobile() ? 'touchstart' : 'mousedown',
      move: this.detectMobile() ? 'touchmove' : 'mousemove',
      end: this.detectMobile() ? 'touchend' : 'mouseup'
    }

    this.slider.addEventListener(eventNames.start, this.startAnimation.bind(this));
    this.slider.addEventListener(eventNames.move, this.updateCursorPositionValues.bind(this));
    this.slider.addEventListener(eventNames.end, this.endAnimation.bind(this));
    document.addEventListener(eventNames.end, this.onSwipeEndInDocument.bind(this));
  }

  /*
   * On scroll timer.
   */
  onScrollTimer() {
    if (this.isAnimated) {
      // Keep track of where the latest mouse location is
      this.mouseLocations.unshift({ x: this.clientX(this.lastDragInfo) });

      // Make sure that we're only keeping track of the last 10 mouse
      // clicks (just for efficiency)
      const maxTrack = 10;
      if (this.mouseLocations.length > maxTrack) {
        this.mouseLocations.pop();
      }
    } else {
      const totalTics = Math.floor(this.#scrollTime / 20);
      const fractionRemaining = (totalTics - this.timerCount) / totalTics;
      const xVelocity = this.velocity.x * fractionRemaining;

      this.moveSlider(this.translateX() - xVelocity);

      // Only scroll for 10 calls of this function
      if(this.timerCount === totalTics) {
        clearInterval(this.timerId);
        this.x = this.translateX() - xVelocity;
        this.timerId = -1
      }

      ++this.timerCount;
    }
  }

  /*
   * Start animation.
   * @param {object} e - mousedown/touchstart event
   */
  startAnimation(e) {
    this.lastDragInfo = e;
    this.x = this.translateX();
    this.startX = this.clientX(e);
    this.isAnimated = true;
    this.disableScroll();
    this.animation();

    this.timerCount = 0;

    if (this.timerId != 0) {
      clearInterval(this.timerId);
      this.timerId = 0;
    }

    // this.timerId = setInterval(this.onScrollTimer.bind(this), 20);
  }

  /*
   * Update cursor position values.
   * @param {object} e - mousemove/touchmove event
   */
  updateCursorPositionValues(e) {
    if (!this.lastDragInfo) {
      return;
    }

    const diff = this.clientX(e) - this.clientX(this.lastDragInfo);
    this.x = this.translateX() + diff;
    this.lastDragInfo = e;
  }

  /*
   * End animation.
   * @param {object} e - mouseup/touchend event
   */
  endAnimation(e) {
    this.isAnimated = false;

    this.controlSlidePosition(this.clientX(e));
    this.enableScroll();

    if (this.mouseLocations.length < 1) {
      return;
    }

    const clickCount = this.mouseLocations.length;
    const xDiff = this.mouseLocations[clickCount - 1].x - this.mouseLocations[0].x;

    this.velocity.x = xDiff / clickCount;
    this.mouseLocations = [];
    this.lastDragInfo = [];
  }

  /*
   * On swipe end in document.
   * @param {object} e - mouseend/touchend event
   */
  onSwipeEndInDocument(e) {
    if (this.startX === null) {
      return;
    }
    if (e.target.closest(this.selector)) {
      return;
    }

    this.endAnimation(e);
  }

  /*
   * Return a x value of cursor position.
   * @param {object} - event
   * @return {number}
   */
  clientX(event) {
    if (this.detectMobile()) {
      return event.changedTouches[0].clientX;
    }
    return event.clientX;
  }

  /*
   * Return the transform's translateX of css property.
   */
  translateX() {
    if (this.slider.style.transform) {
      return parseInt(this.slider.style.transform.replace(/[^-.0-9]/g, ''));
    }

    return 0;
  }

  /*
   * Animation.
   */
  animation() {
    if (!this.isAnimated) {
      return;
    }

    this.moveSlider(this.x);

    setTimeout(this.animation.bind(this), this.frameTime);
  }

  /*
   * Move slider
   * @param {number} x
   * @param {number} speed
   */
  moveSlider(x, speed = this.speed) {
    this.slider.style.transform = `translateX(${x}px)`;
  }

  /*
   * Control slide position.
   * Slide prev/next if x distance is larger than edge swipe threshold.
   * Otherwise swipe back to current index.
   * @param {number} - index
   * @param {number} - speed(ms)
   */
  controlSlidePosition(x) {
    const diff = this.startX - x;

    if (Math.abs(diff) <= this.edgeSwipeThreshold) {
      this.slideTo(this.activeIndex);
    } else if (diff < this.edgeSwipeThreshold) {
      this.slidePrev();
    } else {
      this.slideNext();
    }

    this.startX = null;
  }

  /*
   * Slide to specified index.
   * @param {number} - index
   * @param {number} - speed(ms)
   */
  slideTo(index, speed = this.speed) {
    // Set transition and reset after duration (speed).
    this.slider.style.transition = `transform ${speed / 1000}s ease-out`;
    setTimeout(() => {
      this.slider.style.transition = '';

      if (this.loop) {
        let i = null;
        if (index < first) {
          i = last;
        } else if (index === last + 1) {
          i = first;
        }

        if (i !== null) {
          const positionX = this.slideWidth * (this.loopBaseIndex + i) * -1;
          this.moveSlider(positionX);
        }
      }
    }, speed);

    const first = 0;
    const last = this.sliderLength - 1;
    const i = this.loop ? this.loopBaseIndex + index : index;
    const positionX = this.slideWidth * i * -1;

    this.moveSlider(positionX);

    if (this.loop) {
      if (index < first) {
        this.activeIndex = last;
      } else if (index === last + 1) {
        this.activeIndex = first;
      } else {
        this.activeIndex = index;
      }
    } else {
      this.activeIndex = index;
    }

    if (this.navigation) {
      this.toggleNavigationClassName(this.activeIndex);
    }
    if (this.pagination) {
      this.switchPaginationClassName(this.activeIndex);
    }
  }

  /*
   * Slide prev.
   * @param {number} - speed
   */
  slidePrev(speed = this.speed) {
    if (!this.loop && !this.activeIndex) {
      this.slideTo(this.activeIndex);
      return;
    }

    this.slideTo(this.activeIndex - 1, speed);
  }

  /*
   * Slide next.
   */
  slideNext(speed = this.speed) {
    const last = this.activeIndex === this.sliderLength - 1;

    if (!this.loop && last) {
      this.slideTo(this.activeIndex);
      return;
    }

    this.slideTo(this.activeIndex + 1, speed);
  }

  /*
   * Create the navigation if exists elements of the navigation.
   * @param {object} navigation
   */
  createNavigation(
    navigation = {
      prevEl: '.slider-button-prev',
      nextEl: '.slider-button-next'
    }
  ) {
    const result = {
      prevEl: null,
      nextEl: null
    }

    if (!navigation || !navigation.prevEl || !navigation.nextEl) {
      const example = {
        prevEl: '.slider-button-prev',
        nextEl: '.slider-button-next'
      }

      console.error(`Error: Incorrect navigation format.\nYou must set parameters like below.\n${JSON.stringify(example, null, 2)}`);
      return result;
    }

    const prevEl = this.container.querySelector(navigation.prevEl) || null;
    const nextEl = this.container.querySelector(navigation.nextEl) || null;

    if (!prevEl) {
      console.error(`ReferenceError: ${navigation.prevEl} is not found.`);
    }
    if (!nextEl) {
      console.error(`ReferenceError: ${navigation.nextEl} is not found.`);
    }
    if (!prevEl || !nextEl) {
      return result;
    }

    prevEl.addEventListener('click', () => {
      this.slidePrev();
    });
    nextEl.addEventListener('click', () => {
      this.slideNext();
    });

    result.prevEl = prevEl;
    result.nextEl = nextEl;

    return result;
  }

  /*
   * Toggle class name of the navigation.
   * @param {number} activeIndex
   */
  toggleNavigationClassName(activeIndex = this.activeIndex) {
    if (
      this.loop ||
      !this.navigation ||
      !this.navigation.prevEl ||
      !this.navigation.nextEl
    ) {
      return;
    }

    if (!activeIndex) {
      this.navigation.prevEl.classList.add('is-disabled');
    } else {
      this.navigation.prevEl.classList.remove('is-disabled');
    }

    if (this.activeIndex === this.sliderLength - 1) {
      this.navigation.nextEl.classList.add('is-disabled');
    } else {
      this.navigation.nextEl.classList.remove('is-disabled');
    }
  }

  /*
   * Create the pagination.
   * @param {string} selector
   * @param {number} length
   */
  createPagination(selector = '.slider-pagination', sliderLength = 0) {
    if (sliderLength < 1) {
      return null;
    }
    if (!selector) {
      console.error(`Error: Incorrect pagination format.\nYou must set parameters like below.\n".slider-pagination"`);
      return null;
    }

    const pagination = this.container.querySelector(selector) || null;

    if (!pagination) {
      console.error(`ReferenceError: ${selector} is not found.`);
      return null;
    }

    // Insert children into the pagination.
    const children = [];
    for(let i = 0; i < sliderLength; i++) {
      children.push(`
        <span
          class="slider-pagination-item"
          tabindex="0"
          data-index="${i}"
        >${i}</span>
      `);
    }
    pagination.insertAdjacentHTML('beforeend', children.join(''));

    // Add event listener to children.
    const childrenEl = pagination.querySelectorAll('.slider-pagination-item');
    childrenEl.forEach(child => {
      child.addEventListener('click', e => {
        const index = parseInt(e.target.getAttribute('data-index'));
        this.slideTo(index);
      });
    });

    return pagination;
  }

  /*
   * Switch class name of children of the pagination.
   * @param {number} activeIndex
   */
  switchPaginationClassName(activeIndex = this.activeIndex) {
    if (!this.pagination || !this.pagination.hasChildNodes()) {
      return;
    }

    const children = [...this.pagination.children];
    children.forEach(child => {
      child.classList.remove('is-active');
    });

    const target = children[activeIndex];
    if (!target) {
      return;
    }
    target.classList.add('is-active');
  }

  /*
   * Detect whether a mobile browser.
   * @return {boolean}
   */
  detectMobile() {
    const toMatch = [
      /Android/i,
      /webOS/i,
      /iPhone/i,
      /iPad/i,
      /iPod/i,
      /BlackBerry/i,
      /Windows Phone/i
    ];

    return toMatch.some(item => navigator.userAgent.match(item));
  }
}
