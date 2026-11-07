/* ============================================================
   Scribble Scuffle — engine core: namespace, math, loop
   ============================================================ */
window.G = window.G || {};
(function () {
  'use strict';

  // ---------- math ----------
  const M = {
    clamp: (v, a, b) => v < a ? a : v > b ? b : v,
    lerp: (a, b, t) => a + (b - a) * t,
    damp: (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt)),
    rand: (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a),
    randi: (a, b) => Math.floor(M.rand(a, b + 1)),
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    shuffle: (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
    dist: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
    dist2: (x1, y1, x2, y2) => (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1),
    ang: (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1),
    angLerp: (a, b, t) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * t; },
    angDiff: (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; },
    wrap: (v, m) => ((v % m) + m) % m,
    smoothstep: (t) => t * t * (3 - 2 * t),
    TAU: Math.PI * 2,
    ease: { outBack: t => { const c = 1.70158; const c3 = c + 1; return 1 + c3 * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }, outCubic: t => 1 - Math.pow(1 - t, 3), outElastic: t => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1, inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2 },
    weightedPick: (items, weightFn) => { let total = 0; for (const it of items) total += weightFn(it); let r = Math.random() * total; for (const it of items) { r -= weightFn(it); if (r <= 0) return it; } return items[items.length - 1]; }
  };

  // ---------- seeded RNG ----------
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const RNG = {
    make: (seed) => { const f = mulberry32(seed); return { next: f, range: (a, b) => a + f() * (b - a), int: (a, b) => Math.floor(a + f() * (b - a + 1)), pick: (arr) => arr[Math.floor(f() * arr.length)], chance: (p) => f() < p, sign: () => f() < 0.5 ? -1 : 1 }; }
  };

  // ---------- spring / jitter helpers ----------
  class Spring {
    constructor(stiff = 170, damp = 14) { this.v = 0; this.x = 0; this.target = 0; this.stiff = stiff; this.damp = damp; }
    step(dt) { const a = (this.target - this.x) * this.stiff - this.v * this.damp; this.v += a * dt; this.x += this.v * dt; return this.x; }
    kick(v) { this.v += v; }
    set(x) { this.x = x; this.target = x; this.v = 0; }
  }

  // ---------- time / loop ----------
  const engine = {
    running: false,
    simTime: 0,          // seconds of simulated time
    tick: 0,             // fixed-step tick counter
    fixedDt: 1 / 60,
    maxSubSteps: 5,
    frameMs: 16.7,
    avgFrameMs: 16.7,
    fps: 60,
    fpsCounter: 0, fpsTimer: 0,
    quality: 'auto',     // auto | high | medium | low
    qualityTier: 'high', // resolved tier
    _tierMs: { low: 26, medium: 17, high: 12 },
    timeScale: 1,
    lastFrame: 0,
    reduceMotion: false,
  };

  let _update = null, _render = null;

  function frame(now) {
    if (!engine.running) return;
    requestAnimationFrame(frame);
    const dtRaw = Math.min(0.25, (now - engine.lastFrame) / 1000);
    engine.lastFrame = now;
    engine.frameMs = dtRaw * 1000;
    engine.avgFrameMs = engine.avgFrameMs * 0.92 + engine.frameMs * 0.08;

    // adaptive quality (hysteresis)
    if (engine.quality === 'auto') {
      const m = engine.avgFrameMs;
      const t = engine.qualityTier;
      if (m > 24 && t !== 'low') engine.qualityTier = 'low';
      if (m > 19 && t === 'high' && ++engine._hi > 90) { engine.qualityTier = 'medium'; engine._hi = 0; }
      else if (m < 14 && t === 'medium' && ++engine._lo > 240) { engine.qualityTier = 'high'; engine._lo = 0; }
      else if (m < 13 && t === 'low' && ++engine._lo2 > 240) { engine.qualityTier = 'medium'; engine._lo2 = 0; }
      else { if (m < 17) engine._hi = 0; }
    } else {
      engine.qualityTier = engine.quality;
    }

    // fps readout
    engine.fpsCounter++; engine.fpsTimer += dtRaw;
    if (engine.fpsTimer >= 0.5) { engine.fps = Math.round(engine.fpsCounter / engine.fpsTimer); engine.fpsCounter = 0; engine.fpsTimer = 0; }

    // fixed timestep with accumulator
    engine._acc = (engine._acc || 0) + dtRaw * engine.timeScale;
    let steps = 0;
    while (engine._acc >= engine.fixedDt && steps < engine.maxSubSteps) {
      _update(engine.fixedDt);
      engine._acc -= engine.fixedDt;
      steps++;
    }
    if (steps === engine.maxSubSteps) engine._acc = 0; // avoid spiral of death
    const alpha = engine._acc / engine.fixedDt;
    _render(dtRaw, alpha);
  }

  function startLoop(update, render) {
    _update = update; _render = render;
    engine.running = true;
    engine.lastFrame = performance.now();
    requestAnimationFrame(frame);
  }
  function stopLoop() { engine.running = false; }

  G.M = M; G.RNG = RNG; G.Spring = Spring;
  G.engine = engine;
  G.startLoop = startLoop; G.stopLoop = stopLoop;
})();
