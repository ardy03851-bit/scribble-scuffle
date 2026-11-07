/* ============================================================
   Verlet cloth: capes, scarves, coat hems. Pinned to
   characters, reacts to movement, wind, water.
   Strict budget: only on-screen characters, LOD by quality.
   ============================================================ */
window.G = window.G || {};
(function () {
  'use strict';
  const M = G.M;

  class Cloth {
    // cols x rows grid of verlet points, top row pinned to anchor
    constructor(cols, rows, segW, segH, opts = {}) {
      this.cols = cols; this.rows = rows;
      this.segW = segW; this.segH = segH;
      this.pts = [];
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++)
          this.pts.push({
            px: 0, py: 0, x: 0, y: 0,
            pin: y === 0,
            stiff: opts.stiff || 1,
          });
      this.anchorX = 0; this.anchorY = 0;
      this.gravity = opts.gravity != null ? opts.gravity : 1400;
      this.drag = opts.drag != null ? opts.drag : 0.015;
      this.color = opts.color || '#c94a4a';
      this.color2 = opts.color2 || null;
      this.init = false;
      this.rest = M.dist(0, 0, segW, segH);
    }
    setAnchor(x, y, vx, vy) {
      this.anchorX = x; this.anchorY = y;
      this.avx = vx || 0; this.avy = vy || 0;
    }
    step(dt, windForce, inWater) {
      const pts = this.pts, cols = this.cols, rows = this.rows;
      if (!this.init) {
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
          const p = pts[y * cols + x];
          p.x = this.anchorX + (x - (cols - 1) / 2) * this.segW;
          p.y = this.anchorY + y * this.segH;
          p.px = p.x; p.py = p.y;
        }
        this.init = true;
      }
      // pin top row to anchor
      for (let x = 0; x < cols; x++) {
        const p = pts[x];
        p.x = this.anchorX + (x - (cols - 1) / 2) * this.segW * 0.8;
        p.y = this.anchorY;
        p.px = p.x; p.py = p.y;
      }
      // verlet integrate
      const grav = inWater ? this.gravity * 0.25 : this.gravity;
      const drag = inWater ? 0.08 : this.drag;
      for (let i = cols; i < pts.length; i++) {
        const p = pts[i];
        if (p.pin) continue;
        const vx = (p.x - p.px) * (1 - drag);
        const vy = (p.y - p.py) * (1 - drag);
        p.px = p.x; p.py = p.y;
        p.x += vx + (windForce.x) * dt * dt;
        p.y += vy + grav * dt * dt;
        // water pushes up
        if (inWater) p.y -= 60 * dt * dt * 30;
      }
      // constraints (2 iterations)
      for (let iter = 0; iter < 2; iter++) {
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          const p = pts[i];
          if (x < cols - 1) constrain(p, pts[i + 1], this.segW, this.anchorX);
          if (y < rows - 1) constrain(p, pts[i + cols], this.segH, this.anchorX);
        }
      }
    }
    draw(ctx, facing) {
      const pts = this.pts, cols = this.cols, rows = this.rows;
      ctx.save();
      // fill quads
      for (let y = 0; y < rows - 1; y++) {
        for (let x = 0; x < cols - 1; x++) {
          const a = pts[y * cols + x], b = pts[y * cols + x + 1];
          const c = pts[(y + 1) * cols + x + 1], d = pts[(y + 1) * cols + x];
          ctx.beginPath();
          ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y);
          ctx.closePath();
          const shade = y / rows;
          ctx.fillStyle = this.color2 ? (x % 2 ? this.color : this.color2) : this.color;
          ctx.globalAlpha = 0.92;
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      // outline along edges (ink)
      ctx.strokeStyle = 'rgba(45,36,28,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let y = 0; y < rows; y++) {
        const p = pts[y * cols];
        if (y === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.beginPath();
      for (let y = 0; y < rows; y++) {
        const p = pts[y * cols + cols - 1];
        if (y === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.beginPath();
      const bot = pts[(rows - 1) * cols];
      ctx.moveTo(bot.x, bot.y);
      for (let x = 1; x < cols; x++) { const p = pts[(rows - 1) * cols + x]; ctx.lineTo(p.x, p.y); }
      ctx.stroke();
      ctx.restore();
    }
  }
  function constrain(p1, p2, rest, anchorX) {
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const d = Math.hypot(dx, dy) || 0.0001;
    const diff = (d - rest) / d * 0.5;
    const ox = dx * diff, oy = dy * diff;
    if (!p1.pin) { p1.x += ox; p1.y += oy; }
    if (!p2.pin) { p2.x -= ox; p2.y -= oy; }
  }

  // budget helper: max cloth chars by quality
  function clothBudget() {
    const q = G.engine.qualityTier;
    return q === 'low' ? 4 : q === 'medium' ? 10 : 18;
  }

  G.Cloth = Cloth;
  G.clothBudget = clothBudget;
})();
