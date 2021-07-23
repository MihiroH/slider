(function() {
  class Slider {
    #fps = 120; // 60fpsに制限
    #scrollTime = 310;

    constructor(selector = '.slider-list', { on: events } = { on: {} }) {
      this.el = document.querySelector(selector);
      this.el.style.left = 0;
      this.el.style.top = 0;
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
      this.el.addEventListener('mousedown', this.startAnimation.bind(this));
      this.el.addEventListener('mousemove', this.updateCursorPositionValues.bind(this));
      this.el.addEventListener('mouseup', this.endAnimation.bind(this));
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

      this.timerId = setInterval(this.onScrollTimer.bind(this), 20);
    }

    /*
     * Update cursor position values.
     * @param {object} e -event
     */
    updateCursorPositionValues(e) {
      if (!this.lastDragInfo) {
        return
      }

      this.x = parseInt(this.el.style.left) + e.clientX - this.lastDragInfo.clientX;
      this.lastDragInfo = e;
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
      const yDiff = this.mouseLocations[clickCount - 1].y - this.mouseLocations[0].y;

      this.velocity.x = xDiff / clickCount;
      this.velocity.y = yDiff / clickCount;
      this.mouseLocations.length = 0;
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
     * On scroll timer.
     */
    onScrollTimer() {
      if (this.isAnimated) {
        // Keep track of where the latest mouse location is
        this.mouseLocations.unshift({
          x: this.lastDragInfo.x,
          y: this.lastDragInfo.y
        });

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
        const yVelocity = this.velocity.y * fractionRemaining;

        this.moveSlider(
          -xVelocity + parseInt(this.el.style.left),
          -yVelocity + parseInt(this.el.style.top)
        );

        // Only scroll for 20 calls of this function
        if(this.timerCount == totalTics) {
          clearInterval(this.timerId);
          this.timerId = -1
        }

        ++this.timerCount;
      }
    };

    /*
     * Move slider
     * @param {number} x
     * @param {number} y
     */
    moveSlider(x) {
      this.el.style.left = x + 'px';
    }
  }

  const slider = new Slider();
})();
