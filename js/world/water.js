/* ============================================================
   Water: spring-column surface, splashes, buoyancy, reflections,
   caustics, foam. Lava variant (deadly, glowing).
   ============================================================ */
window.G = window.G || {};
(function () {
  'use strict';
  const COL_W = 16; // world px per spring column
  const M = G.M;

  class Water {
    constructor(mapW, mapH) {
      this.mapW = mapW; this.mapH = mapH;
      this.level = Infinity;       // no water by default
      this.cols = Math.ceil(mapW / COL_W) + 1;
      this.h = new Float32Array(this.cols);      // column height above floor
      this.hv = new Float32Array(this.cols);     // velocity
      this.type = 'water';                        // 'water' | 'lava'
      this.floor = new Float32Array(this.cols);  // terrain floor y per column
      this.underwater = false;                   // local player underwater?
      this._reflCanvas = null;
    }
    setLevel(y, type) {
      this.level = y; this.type = type || 'water';
      this.h.fill(0); this.hv.fill(0);
    }
    splash(x, speed) {
      const i = M.clamp(Math.round(x / COL_W), 0, this.cols - 1);
      if (this.level === Infinity) return;
      this.hv[i] += Math.min(30, speed * 0.05);
    }
    update(dt, terrain) {
      if (this.level === Infinity) return;
      const k = 0.022, damp = 0.985, spread = 0.28;
      const h = this.h, hv = this.hv;
      // integrate springs
      for (let i = 0; i < this.cols; i++) {
        const target = 0;
        hv[i] += (target - h[i]) * k;
        hv[i] *= damp;
        h[i] += hv[i];
      }
      // spread (two passes)
      const lh = this._lh || (this._lh = new Float32Array(this.cols));
      const lhd = this._lhd || (this._lhd = new Float32Array(this.cols));
      for (let pass = 0; pass < 2; pass++) {
        lh.set(h); lhd.set(hv);
        for (let i = 0; i < this.cols; i++) {
          if (i > 0) { hv[i] += spread * (lh[i - 1] - h[i]); }
          if (i < this.cols - 1) { hv[i] += spread * (lh[i + 1] - h[i]); }
        }
      }
      // recompute floors occasionally (terrain destructible)
      this._floorTimer = (this._floorTimer || 0) - dt;
      if (this._floorTimer <= 0) {
        this._floorTimer = 0.5;
        for (let i = 0; i < this.cols; i++) {
          this.floor[i] = terrain.surfaceY(i * COL_W, this.level - 40);
        }
      }
    }
    surfaceAt(x) {
      if (this.level === Infinity) return Infinity;
      const i = M.clamp(Math.round(x / COL_W), 0, this.cols - 1);
      return this.level + this.h[i];
    }
    isInside(x, y) {
      if (this.level === Infinity) return false;
      if (y < this.surfaceAt(x)) return false;
      const i = M.clamp(Math.round(x / COL_W), 0, this.cols - 1);
      return y < this.floor[i];
    }
    depthAt(x, y) { return this.isInside(x, y) ? y - this.surfaceAt(x) : 0; }

    // physics for bodies/characters
    applyTo(body, dt) {
      if (this.level === Infinity) return false;
      const inWater = this.isInside(body.x, body.y);
      if (!inWater) return false;
      const depth = this.depthAt(body.x, body.y);
      const surf = this.surfaceAt(body.x);
      const submerged = M.clamp((body.y - surf) / Math.max(20, body.h || 30), 0, 1);
      const isLava = this.type === 'lava';
      const density = body.buoyancy != null ? body.buoyancy : 0.5; // wood floats high
      if (!isLava) {
        body.vy -= 1400 * submerged * density * dt;   // buoyancy
        body.vx *= Math.pow(0.35, dt * submerged * 3); // drag
        body.vy *= Math.pow(0.3, dt * submerged * 3);
        body.inWater = true;
      } else {
        body.vx *= Math.pow(0.5, dt * 2);
        body.vy *= Math.pow(0.5, dt * 2);
        body.inLava = true;
      }
      if (body.vy > 120 && depth < 40) this.splash(body.x, body.vy);
      return true;
    }

    // ---------- rendering ----------
    draw(ctx, vb, drawSceneForReflection) {
      if (this.level === Infinity) return;
      const isLava = this.type === 'lava';
      const x0 = Math.max(0, vb.x0 - COL_W), x1 = Math.min(this.mapW, vb.x1 + COL_W);
      const i0 = M.clamp(Math.floor(x0 / COL_W), 0, this.cols - 1);
      const i1 = M.clamp(Math.ceil(x1 / COL_W), 0, this.cols - 1);
      if (i1 <= i0) return;
      const quality = G.engine.qualityTier;

      // reflection pass (water only, medium+ quality)
      if (!isLava && quality !== 'low' && drawSceneForReflection) {
        this.drawReflection(ctx, vb, i0, i1, drawSceneForReflection);
      }

      // main water body: per-column quads (surface wave -> floor)
      ctx.save();
      const grad = ctx.createLinearGradient(0, this.level - 20, 0, this.level + 260);
      if (isLava) { grad.addColorStop(0, 'rgba(255,120,30,0.95)'); grad.addColorStop(0.35, 'rgba(220,70,20,0.95)'); grad.addColorStop(1, 'rgba(120,20,10,0.98)'); }
      else { grad.addColorStop(0, 'rgba(90,140,180,0.55)'); grad.addColorStop(0.4, 'rgba(60,100,150,0.62)'); grad.addColorStop(1, 'rgba(30,55,95,0.8)'); }
      ctx.fillStyle = grad;
      ctx.beginPath();
      let started = false;
      for (let i = i0; i <= i1; i++) {
        const sx = i * COL_W, sy = this.level + this.h[i];
        const fy = Math.min(this.floor[i], this.mapH + 400);
        if (!started) { ctx.moveTo(sx, sy); started = true; }
        else ctx.lineTo(sx, sy);
        if (i === i1) ctx.lineTo(sx, Math.max(sy + 1, fy));
      }
      for (let i = i1; i >= i0; i--) {
        const sx = i * COL_W, sy = this.level + this.h[i];
        const fy = Math.min(this.floor[i], this.mapH + 400);
        ctx.lineTo(sx, Math.max(sy + 1, fy));
      }
      ctx.closePath();
      ctx.fill();

      // surface line + foam
      ctx.strokeStyle = isLava ? 'rgba(255,220,120,0.9)' : 'rgba(230,245,255,0.75)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (let i = i0; i <= i1; i++) {
        const sx = i * COL_W, sy = this.level + this.h[i];
        if (i === i0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      // foam where waves are energetic
      ctx.fillStyle = isLava ? 'rgba(255,240,180,0.7)' : 'rgba(240,250,255,0.55)';
      for (let i = i0; i <= i1; i++) {
        if (Math.abs(this.h[i]) > 4.5) {
          ctx.beginPath();
          ctx.arc(i * COL_W, this.level + this.h[i], 2 + Math.abs(this.h[i]) * 0.4, 0, G.M.TAU);
          ctx.fill();
        }
      }

      // caustics (water) / glow (lava)
      if (isLava) {
        ctx.globalCompositeOperation = 'lighter';
        const g2 = ctx.createRadialGradient(0, this.level, 10, 0, this.level, 300);
        g2.addColorStop(0, 'rgba(255,140,40,0.25)'); g2.addColorStop(1, 'rgba(255,80,20,0)');
        ctx.save(); ctx.translate((vb.x0 + vb.x1) / 2, 0);
        ctx.fillStyle = g2; ctx.fillRect(-2000, this.level - 60, 4000, 360);
        ctx.restore();
        ctx.globalCompositeOperation = 'source-over';
      } else if (quality !== 'low') {
        ctx.save();
        ctx.clip(); // reuse last path? no — rebuild clip from fill region
        this.clipPath(ctx, i0, i1);
        ctx.globalAlpha = 0.16;
        ctx.strokeStyle = 'rgba(200,230,255,0.9)';
        ctx.lineWidth = 3;
        const t = performance.now() * 0.0006;
        for (let k = 0; k < 6; k++) {
          const bx = vb.x0 + ((k * 173.3 + t * 60) % (vb.x1 - vb.x0 + 1));
          ctx.beginPath();
          ctx.moveTo(bx, this.level + 10);
          ctx.lineTo(bx - 40 + Math.sin(t * 3 + k) * 30, this.level + 240);
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.restore();
    }
    clipPath(ctx, i0, i1) {
      ctx.beginPath();
      let started = false;
      for (let i = i0; i <= i1; i++) {
        const sx = i * COL_W, sy = this.level + this.h[i];
        const fy = Math.min(this.floor[i], this.mapH + 400);
        if (!started) { ctx.moveTo(sx, sy); started = true; } else ctx.lineTo(sx, sy);
        if (i === i1) ctx.lineTo(sx, Math.max(sy + 1, fy));
      }
      for (let i = i1; i >= i0; i--) {
        const sx = i * COL_W, sy = this.level + this.h[i];
        const fy = Math.min(this.floor[i], this.mapH + 400);
        ctx.lineTo(sx, Math.max(sy + 1, fy));
      }
      ctx.closePath();
      ctx.clip();
    }
    drawReflection(ctx, vb, i0, i1, drawSceneForReflection) {
      const w = Math.min(560, G.renderer.w), hgt = 200;
      if (!this._reflCanvas || this._reflCanvas.width !== w) {
        this._reflCanvas = document.createElement('canvas');
        this._reflCanvas.width = w; this._reflCanvas.height = hgt;
      }
      const rc = this._reflCanvas, rg = rc.getContext('2d');
      rg.clearRect(0, 0, w, hgt);
      // render scene above surface, flipped, into reflection canvas
      const camX = (vb.x0 + vb.x1) / 2;
      const scale = w / (vb.x1 - vb.x0);
      rg.setTransform(scale, 0, 0, scale, w / 2 - camX * scale, -this.level * scale + hgt);
      drawSceneForReflection(rg, vb, true);
      rg.setTransform(1, 0, 0, 1, 0, 0);
      // dim it
      rg.fillStyle = 'rgba(20,50,90,0.55)';
      rg.fillRect(0, 0, w, hgt);
      // draw flipped under surface with ripple distortion (row slices)
      ctx.save();
      this.clipPath(ctx, i0, i1);
      ctx.imageSmoothingEnabled = true;
      const x0w = i0 * COL_W, x1w = i1 * COL_W;
      const sx0 = (x0w - camX) * scale + w / 2;
      const sw = (x1w - x0w) * scale;
      const rows = 14;
      for (let r = 0; r < rows; r++) {
        const t = r / rows;
        const sy = this.level + 4 + t * 180;
        const srcY = hgt - (t * hgt);
        const wob = Math.sin(performance.now() * 0.003 + r * 1.7) * (2 + t * 6);
        ctx.globalAlpha = 0.42 * (1 - t * 0.85);
        ctx.drawImage(rc, sx0, M.clamp(srcY, 0, hgt - 1), Math.max(1, sw), hgt / rows, x0w + wob, sy, x1w - x0w, 190 / rows + 2);
      }
      ctx.restore();
    }
  }

  G.Water = Water;
  G.WATER_COL = COL_W;
})();
