class Slider {
  #fps = 120; // 120fpsに制限
  #scrollTime = 310;

  constructor(selector = '.slider-list', { on: events } = { on: {} }) {
    this.selector = selector;
    this.el = document.querySelector(selector);
    this.el.style.transform = 'translateX(0)';
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
    this.realIndex = 0;
    this.slideLength = this.el.children.length;
    this.slideWidth = this.el.scrollWidth / this.slideLength;

    this.events = Object.entries(events).reduce((all, [key, func]) => {
      all[key] = func.bind(this);
      return all;
    }, {});
    this.setEventListener(this.events);

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

    this.el.addEventListener(eventNames.start, this.startAnimation.bind(this));
    this.el.addEventListener(eventNames.move, this.updateCursorPositionValues.bind(this));
    this.el.addEventListener(eventNames.end, this.endAnimation.bind(this));
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
    if (this.el.style.transform) {
      return parseInt(this.el.style.transform.replace(/[^-.0-9]/g, ''));
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
    this.el.style.transform = `translateX(${x}px)`;
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
      this.slideTo(this.realIndex);
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
    this.el.style.transition = `transform ${speed / 1000}s ease-out`;
    setTimeout(() => {
      this.el.style.transition = '';
    }, speed);

    const positionX = this.slideWidth * index * -1;
    this.moveSlider(positionX);
  }

  /*
   * Slide prev.
   * @param {number} - speed
   */
  slidePrev(speed) {
    if (!this.realIndex) {
      this.slideTo(this.realIndex);
      return;
    }

    this.realIndex--;
    this.slideTo(this.realIndex, speed);
  }

  /*
   * Slide next.
   */
  slideNext(speed) {
    if (this.realIndex === this.slideLength - 1) {
      this.slideTo(this.realIndex);
      return;
    }

    this.realIndex++;
    this.slideTo(this.realIndex, speed);
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
