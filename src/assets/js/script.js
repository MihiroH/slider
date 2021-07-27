(function() {
  class Slider {
    #fps = 120; // 60fpsに制限
    #scrollTime = 310;

    constructor(selector = '.slider-list', { on: events } = { on: {} }) {
      this.el = document.querySelector(selector);
      this.el.style.transform = 'translateX(0)';
      this.mouseLocations = [];
      this.frameTime = 1000 / this.#fps;
      this.isAnimated = false;
      this.lastDragInfo = null;
      this.x = null;
      this.timerId = -1;
      this.timerCount = 0;
      this.velocity = { x: null, y: null };
      this.events = Object.entries(events).reduce((all, [key, func]) => {
        all[key] = func.bind(this);
        return all;
      }, {});

      this.setEventListener(this.events);
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
    }

    /*
     * Start animation.
     */
    startAnimation(e) {
      this.lastDragInfo = e;
      this.isAnimated = true;
      this.animation();

      this.timerCount = 0;

      if (this.timerId != 0) {
        clearInterval(this.timerId);
        this.timerId = 0;
      }

      // this.timerId = setInterval(this.onScrollTimer.bind(this), 20);
    }

    /*
     * End animation.
     */
    endAnimation(e) {
      this.isAnimated = false;

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
     * @param {number} y
     */
    moveSlider(x) {
      this.el.style.transform = `translateX(${x}px)`;
    }

    /*
     * Update cursor position values.
     * @param {object} e -event
     */
    updateCursorPositionValues(e) {
      if (!this.lastDragInfo) {
        return
      }

      const diff = this.clientX(e) - this.clientX(this.lastDragInfo);
      this.x = this.translateX() + diff;
      this.lastDragInfo = e;
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
    };

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
        return parseInt(this.el.style.transform.replace(/[^-0-9]/g, ''));
      }

      return 0;
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

  const slider = new Slider();
})();
