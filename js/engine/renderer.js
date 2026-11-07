/* ============================================================
   Renderer: canvas, camera, paper grain, ink style helpers,
   LRU sprite cache, quality tiers
   ============================================================ */
window.G = window.G || {};
(function () {
  'use strict';
  const M = G.M;

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  const renderer = {
    canvas, ctx,
    w: 0, h: 0, dpr: 1,
    renderScale: 1,      // adaptive resolution scale
    camera: {
      x: 0, y: 0, zoom: 1, targetZoom: 1,
      shakeX: 0, shakeY: 0, shake: 0,
      minX: -1e9, maxX: 1e9, minY: -1e9, maxY: 1e9,
    },
    quality() { return G.engine.qualityTier; },
    isLow() { return G.engine.qualityTier === 'low'; },
    isMed() { return G.engine.qualityTier === 'medium'; },
    isHigh() { return G.engine.qualityTier === 'high'; },
  };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const tier = G.engine.qualityTier;
    renderer.renderScale = tier === 'low' ? 0.66 : tier === 'medium' ? 0.85 : 1;
    const scale = dpr * renderer.renderScale;
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    renderer.dpr = scale;
    renderer.w = canvas.width; renderer.h = canvas.height;
    renderer.cssW = w; renderer.cssH = h;
    G.bus.emit('resize', { w, h });
  }
  window.addEventListener('resize', resize);

  // ---------- paper grain ----------
  let grainCanvas = null;
  function makeGrain() {
    const size = 256;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const img = g.createImageData(size, size);
    const rng = G.RNG.make(1337);
    for (let i = 0; i < size * size; i++) {
      const v = rng.next();
      // sparse darker flecks + faint fiber noise
      const d = v < 0.5 ? 18 : v < 0.9 ? 10 : 4;
      img.data[i * 4] = 60; img.data[i * 4 + 1] = 48; img.data[i * 4 + 2] = 30;
      img.data[i * 4 + 3] = Math.floor(v * d);
    }
    g.putImageData(img, 0, 0);
    grainCanvas = c;
  }
  function drawGrain() {
    if (!grainCanvas || G.engine.qualityTier === 'low') return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 0.5;
    const s = 256;
    for (let y = 0; y < renderer.h; y += s)
      for (let x = 0; x < renderer.w; x += s)
        ctx.drawImage(grainCanvas, x, y);
    ctx.restore();
  }

  // ---------- camera ----------
  function camApply(interpolateAlpha) {
    const cam = renderer.camera;
    cam.zoom = M.damp(cam.zoom, cam.targetZoom, 6, 1 / 60);
    const z = cam.zoom * renderer.dpr;
    let sx = 0, sy = 0;
    if (cam.shake > 0.01) {
      const s = cam.shake;
      sx = (Math.random() * 2 - 1) * s; sy = (Math.random() * 2 - 1) * s;
    }
    ctx.setTransform(z, 0, 0, z, renderer.w / 2 - (cam.x + sx) * z, renderer.h / 2 - (cam.y + sy) * z);
  }
  function camShake(amount) {
    renderer.camera.shake = Math.min(40, renderer.camera.shake + amount);
  }
  function worldToScreen(x, y) {
    const cam = renderer.camera;
    const z = cam.zoom * renderer.dpr;
    return { x: (x - cam.x) * z + renderer.w / 2, y: (y - cam.y) * z + renderer.h / 2 };
  }
  function screenToWorld(px, py) {
    const cam = renderer.camera;
    const z = cam.zoom * renderer.dpr;
    return { x: (px * renderer.dpr - renderer.w / 2) / z + cam.x, y: (py * renderer.dpr - renderer.h / 2) / z + cam.y };
  }
  // view bounds in world space (with margin)
  function viewBounds(margin = 200) {
    const cam = renderer.camera;
    const z = cam.zoom * renderer.dpr;
    const hw = renderer.w / 2 / z + margin, hh = renderer.h / 2 / z + margin;
    return { x0: cam.x - hw, y0: cam.y - hh, x1: cam.x + hw, y1: cam.y + hh };
  }

  // ---------- ink drawing helpers (line boil) ----------
  // boil frame: changes a few times per second
  let boilSeed = 0, boilTimer = 0;
  function updateBoil(dt) { boilTimer -= dt; if (boilTimer <= 0) { boilTimer = 0.12; boilSeed = (boilSeed + 1) % 1000; } }
  function boil(seedOffset) { return boilSeed * 77 + (seedOffset || 0) * 131; }

  // wobbly stroke path: draws polyline with seeded jitter
  function wobblyPath(c, pts, seed, amp = 1.6, closed = false) {
    const rng = G.RNG.make((seed | 0) + 1);
    c.beginPath();
    const n = pts.length;
    for (let i = 0; i <= (closed ? n : n - 1); i++) {
      const p = pts[i % n];
      const jx = (rng.next() * 2 - 1) * amp, jy = (rng.next() * 2 - 1) * amp;
      if (i === 0) c.moveTo(p.x + jx, p.y + jy); else c.lineTo(p.x + jx, p.y + jy);
    }
    if (closed) c.closePath();
  }

  // hand-drawn rounded rect: wobbly border-radius, asymmetric
  function handRect(c, x, y, w, h, seed, r = 10) {
    const rng = G.RNG.make((seed | 0) + 7);
    const rj = () => rng.range(0.85, 1.25);
    const rr = (v) => v * rj();
    const x2 = x + w, y2 = y + h;
    c.beginPath();
    c.moveTo(x + rr(r), y + rng.range(-1.5, 1.5));
    c.lineTo(x2 - rr(r), y + rng.range(-1.5, 1.5));
    c.quadraticCurveTo(x2, y, x2 + rng.range(-1, 1), y + rr(r));
    c.lineTo(x2 + rng.range(-1, 1), y2 - rr(r));
    c.quadraticCurveTo(x2, y2, x2 - rr(r), y2 + rng.range(-1.5, 1.5));
    c.lineTo(x + rr(r), y2 + rng.range(-1.5, 1.5));
    c.quadraticCurveTo(x, y2, x + rng.range(-1, 1), y2 - rr(r));
    c.lineTo(x + rng.range(-1, 1), y + rr(r));
    c.quadraticCurveTo(x, y, x + rr(r), y + rng.range(-1.5, 1.5));
    c.closePath();
  }

  // ---------- LRU sprite cache ----------
  class LRUCache {
    constructor(maxBytes = 220 * 1024 * 1024) {
      this.max = maxBytes; this.used = 0; this.map = new Map();
    }
    get(key) {
      const e = this.map.get(key);
      if (e) { this.map.delete(key); this.map.set(key, e); return e.canvas; }
      return null;
    }
    has(key) { return this.map.has(key); }
    set(key, canvasEl) {
      const bytes = canvasEl.width * canvasEl.height * 4;
      if (this.map.has(key)) this.delete(key);
      this.map.set(key, { canvas: canvasEl, bytes });
      this.used += bytes;
      while (this.used > this.max && this.map.size > 1) {
        const k = this.map.keys().next().value;
        this.delete(k);
      }
    }
    delete(key) {
      const e = this.map.get(key);
      if (!e) return;
      this.map.delete(key);
      this.used -= e.bytes;
      // actually free the canvas memory (iPad Safari)
      e.canvas.width = 1; e.canvas.height = 1;
    }
    clear() { for (const k of [...this.map.keys()]) this.delete(k); }
  }

  // supersampled sprite maker: draw at 2x, return canvas
  function makeSprite(w, h, drawFn, ss = 2) {
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * ss); c.height = Math.ceil(h * ss);
    const g = c.getContext('2d');
    g.scale(ss, ss);
    drawFn(g, w, h);
    return c;
  }

  G.renderer = renderer;
  G.resize = resize;
  G.camApply = camApply;
  G.camShake = camShake;
  G.worldToScreen = worldToScreen;
  G.screenToWorld = screenToWorld;
  G.viewBounds = viewBounds;
  G.drawGrain = drawGrain;
  G.updateBoil = updateBoil;
  G.boil = boil;
  G.wobblyPath = wobblyPath;
  G.handRect = handRect;
  G.LRUCache = LRUCache;
  G.makeSprite = makeSprite;
  makeGrain();
  resize();
})();
