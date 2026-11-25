/* =====================================================================
 * animation.js  —  MEMBER 4 : Visualization & Animation (playback)
 * ---------------------------------------------------------------------
 * The Player owns the "where are we in the run?" state and the timer.
 * It knows nothing about the DOM: every time the position changes it
 * calls   onStep(step, position, animate, atEnd)   and main.js decides
 * what to redraw.
 *
 *   player.load(trace)   – start over with a new run
 *   player.play() / pause() / toggle()
 *   player.next() / prev() / reset()
 *   player.delay         – milliseconds between automatic steps
 * ===================================================================== */
(function () {
  'use strict';

  const FA = (window.FA = window.FA || {});

  class Player {
    /**
     * @param handlers { onStep(step, pos, animate, atEnd), onPlayState(isPlaying) }
     */
    constructor(handlers) {
      this.onStep = handlers.onStep;
      this.onPlayState = handlers.onPlayState || function () {};
      this.trace = null;
      this.pos = 0;
      this.playing = false;
      this.timer = null;
      this.delay = 1100;
    }

    get last() {
      return this.trace ? this.trace.steps.length - 1 : 0;
    }
    get atEnd() {
      return !this.trace || this.pos >= this.last;
    }
    get atStart() {
      return this.pos === 0;
    }

    /** Loads a new trace and shows its first step (the start state). */
    load(trace) {
      this.stopTimer();
      this.setPlaying(false);
      this.trace = trace;
      this.pos = 0;
      this.emit(false);
    }

    emit(animate) {
      if (!this.trace) return;
      this.onStep(this.trace.steps[this.pos], this.pos, animate, this.atEnd);
    }

    setPlaying(v) {
      if (this.playing !== v) {
        this.playing = v;
        this.onPlayState(v);
      }
    }

    stopTimer() {
      if (this.timer) clearTimeout(this.timer);
      this.timer = null;
    }

    next(animate) {
      if (!this.trace || this.atEnd) return false;
      this.pos++;
      this.emit(animate !== false);
      if (this.atEnd) {
        this.stopTimer();
        this.setPlaying(false);
      }
      return true;
    }

    prev() {
      if (!this.trace || this.atStart) return;
      this.pause();
      this.pos--;
      this.emit(false);
    }

    reset() {
      if (!this.trace) return;
      this.pause();
      this.pos = 0;
      this.emit(false);
    }

    play() {
      if (!this.trace) return;
      if (this.atEnd) {
        if (this.last === 0) return; // nothing to animate (empty string)
        this.pos = 0;
        this.emit(false);
      }
      this.setPlaying(true);
      this.tick();
    }

    tick() {
      if (!this.playing) return;
      this.next(true);
      if (this.playing) this.timer = setTimeout(() => this.tick(), this.delay);
    }

    pause() {
      this.stopTimer();
      this.setPlaying(false);
    }

    toggle() {
      if (this.playing) this.pause();
      else this.play();
    }

    /** Manual single step (stops auto-play first). */
    step() {
      this.pause();
      this.next(true);
    }
  }

  FA.Player = Player;
})();
