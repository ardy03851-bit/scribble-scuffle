/* ============================================================
   Object pools (particles, debris, projectiles)
   ============================================================ */
window.G = window.G || {};
(function () {
  'use strict';
  class Pool {
    constructor(factory, reset, initial = 64) {
      this.factory = factory; this.reset = reset;
      this.free = []; this.active = [];
      for (let i = 0; i < initial; i++) this.free.push(factory());
    }
    obtain(...args) {
      const obj = this.free.pop() || this.factory();
      this.reset(obj, ...args);
      this.active.push(obj);
      return obj;
    }
    release(obj) {
      const i = this.active.indexOf(obj);
      if (i >= 0) this.active.splice(i, 1);
      this.free.push(obj);
    }
    // sweep inactive (obj.dead) back to free
    sweep() {
      const a = this.active;
      for (let i = a.length - 1; i >= 0; i--) {
        if (a[i].dead) { this.free.push(a[i]); a.splice(i, 1); }
      }
    }
    clear() { for (const o of this.active) this.free.push(o); this.active.length = 0; }
    get count() { return this.active.length; }
  }
  G.Pool = Pool;
})();
