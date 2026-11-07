/* ============================================================
   VFX: pooled particles (ink drops, sparks, fire, smoke,
   debris, leaves, bubbles), dynamic lights with additive glow,
   darkness pass at night, scorch decals.
   ============================================================ */
window.G = window.G || {};
(function () {
  'use strict';
  const M = G.M;
  const MAX = 2200;
  const parts = [];
  for (let i = 0; i < MAX; i++) parts.push({ dead: true });
  let cursor = 0;
  function P(cfg) {
    for (let i = 0; i < MAX; i++) {
      const p = parts[(cursor + i) % MAX];
      if (p.dead) { cursor = (cursor + i + 1) % MAX; Object.assign(p, cfg); p.dead = false; p.age = 0; return p; }
    }
    const p = parts[cursor]; cursor = (cursor + 1) % MAX;
    Object.assign(p, cfg); p.dead = false; p.age = 0;
    return p;
  }

  // lights collected per frame
  const lights = [];
  // scorch decals (limited)
  const decals = [];

  const vfx = {
    parts, lights, decals,
    clear() { for (const p of parts) p.dead = true; lights.length = 0; decals.length = 0; },

    // ---------- spawn helpers ----------
    inkDrop(x, y) { P({ x, y, vx: M.rand(-90, 90), vy: M.rand(-160, -30), g: 700, r: M.rand(1.6, 3.4), c: '#2c2420', life: M.rand(0.5, 1), type: 'dot', wind: 0.4 }); },
    spark(x, y) { P({ x, y, vx: M.rand(-160, 160), vy: M.rand(-180, 40), g: 500, r: M.rand(1, 2.4), c: '#e8b93c', life: M.rand(0.2, 0.5), type: 'dot', glow: true }); },
    hitSpark(x, y) { for (let i = 0; i < 6; i++) this.spark(x, y); P({ x, y, r: 4, life: 0.18, type: 'ring', c: 'rgba(255,240,200,0.8)' }); },
    dust(x, y) { for (let i = 0; i < 3; i++) P({ x: x + M.rand(-6, 6), y: y - 2, vx: M.rand(-30, 30), vy: M.rand(-40, -5), g: -20, r: M.rand(2, 5), c: 'rgba(180,165,140,0.5)', life: M.rand(0.3, 0.7), type: 'dot', wind: 0.8 }); },
    dirtBurst(x, y, n) { for (let i = 0; i < n; i++) P({ x: x + M.rand(-10, 10), y, vx: M.rand(-120, 120), vy: M.rand(-200, -60), g: 600, r: M.rand(2, 5), c: '#a98f6b', life: M.rand(0.4, 0.9), type: 'dot' }); },
    leaf(x, y) { P({ x, y, vx: M.rand(-30, 30), vy: M.rand(-60, -10), g: 90, r: M.rand(2, 3.4), c: M.pick(['#6f9e54', '#8aae5f', '#d08a3a']), life: M.rand(1.5, 3), type: 'leaf', rot: M.rand(0, 6.3), vr: M.rand(-4, 4), wind: 1.4 }); },
    bubble(x, y) { P({ x, y, vx: M.rand(-6, 6), vy: M.rand(-40, -20), g: -60, r: M.rand(1.4, 3), c: 'rgba(220,240,255,0.7)', life: M.rand(0.8, 1.8), type: 'bubble' }); },
    snowflake(x, y) { P({ x, y, vx: 0, vy: M.rand(20, 50), g: 0, r: M.rand(1.2, 2.4), c: 'rgba(220,240,255,0.9)', life: 1.2, type: 'dot', wind: 1 }); },
    smokeTrail(x, y) { if (Math.random() < 0.5) P({ x, y, vx: M.rand(-8, 8), vy: M.rand(-14, -4), g: -30, r: M.rand(2, 4), c: 'rgba(120,110,100,0.35)', life: M.rand(0.4, 0.9), type: 'smoke', wind: 0.7 }); },
    meteorTrail(x, y) { P({ x, y, vx: M.rand(-10, 10), vy: M.rand(-20, 0), g: -40, r: M.rand(2, 4), c: 'rgba(50,40,36,0.6)', life: 0.6, type: 'smoke', wind: 0.5 }); if (Math.random() < 0.3) P({ x, y, vx: 0, vy: 0, g: 0, r: 2, c: '#e4573d', life: 0.25, type: 'dot', glow: true }); },
    fire(x, y, scale = 1) {
      P({ x: x + M.rand(-3, 3), y, vx: M.rand(-8, 8) + G.wind.current() * 0.06, vy: M.rand(-60, -30) * scale, g: -80, r: M.rand(2.5, 5) * scale, c: '#e8632c', life: M.rand(0.3, 0.7), type: 'fire', wind: 1.2 });
      if (Math.random() < 0.4) P({ x, y, vx: M.rand(-10, 10), vy: M.rand(-90, -50), g: -60, r: M.rand(1, 2), c: '#e8b93c', life: M.rand(0.3, 0.6), type: 'fire', wind: 1 });
      if (Math.random() < 0.15) P({ x, y, vx: M.rand(-16, 16), vy: M.rand(-100, -50), g: 40, r: M.rand(1, 2), c: '#e4573d', life: M.rand(0.6, 1.4), type: 'ember', wind: 1.4, glow: true });
      if (Math.random() < 0.1) P({ x, y, vx: M.rand(-6, 6), vy: M.rand(-30, -14), g: -20, r: M.rand(3, 6), c: 'rgba(90,84,78,0.3)', life: M.rand(0.8, 1.6), type: 'smoke', wind: 0.9 });
      this.light(x, y, 46, 'rgba(255,150,60,');
    },
    explosion(x, y, r) {
      // shockwave ring
      P({ x, y, r: 8, r2: r * 1.15, life: 0.32, type: 'shock', c: 'rgba(70,56,44,0.7)' });
      P({ x, y, r: 4, r2: r * 0.7, life: 0.22, type: 'shock', c: 'rgba(255,220,150,0.8)' });
      // fireball particles
      const n = Math.min(26, 8 + r * 0.15);
      for (let i = 0; i < n; i++) {
        const a = M.rand(0, M.TAU), sp = M.rand(40, 60 + r * 2.2);
        P({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, g: 120, r: M.rand(3, 7), c: M.pick(['#e8632c', '#f2b134', '#e4573d']), life: M.rand(0.25, 0.6), type: 'fire', wind: 0.6 });
      }
      // smoke
      for (let i = 0; i < 8; i++) {
        P({ x: x + M.rand(-r * 0.3, r * 0.3), y: y + M.rand(-r * 0.2, r * 0.2), vx: M.rand(-20, 20), vy: M.rand(-50, -20), g: -40, r: M.rand(4, 9), c: 'rgba(80,72,66,0.4)', life: M.rand(0.8, 1.8), type: 'smoke', wind: 0.8 });
      }
      // ink specks
      for (let i = 0; i < 10; i++) this.inkDrop(x + M.rand(-10, 10), y + M.rand(-10, 10));
      this.light(x, y, r * 2, 'rgba(255,160,60,', 0.9);
      this.scorch(x, y, r * 0.6);
    },
    scorch(x, y, r) {
      if (decals.length > 60) decals.shift();
      decals.push({ x, y, r, seed: Math.floor(M.rand(0, 999)) });
    },
    eraserPuff(x, y) { for (let i = 0; i < 8; i++) P({ x, y, vx: M.rand(-60, 60), vy: M.rand(-60, 10), g: 100, r: M.rand(2, 5), c: 'rgba(242,234,216,0.8)', life: M.rand(0.4, 0.8), type: 'smoke', wind: 1 }); },
    waterBurst(x, y) { for (let i = 0; i < 16; i++) P({ x, y, vx: M.rand(-160, 160), vy: M.rand(-240, -40), g: 600, r: M.rand(1.6, 3.4), c: 'rgba(120,180,220,0.8)', life: M.rand(0.4, 1), type: 'dot' }); },
    debrisBurst(x, y, material) {
      const c = material === 'stone' ? '#a8a29a' : material === 'metal' ? '#9aa4ac' : '#c9a86a';
      for (let i = 0; i < 8; i++) P({ x: x + M.rand(-8, 8), y: y + M.rand(-8, 8), vx: M.rand(-140, 140), vy: M.rand(-200, -40), g: 700, r: M.rand(1.6, 3.6), c, life: M.rand(0.4, 0.9), type: 'dot' });
    },
    placePuff(x, y) { for (let i = 0; i < 5; i++) P({ x: x + M.rand(-10, 10), y: y + M.rand(-10, 10), vx: M.rand(-20, 20), vy: M.rand(-30, -10), g: -10, r: M.rand(2, 4), c: 'rgba(200,190,170,0.5)', life: 0.4, type: 'smoke' }); },
    muzzle(x, y) { this.light(x, y, 40, 'rgba(255,220,140,', 0.6); },
    slashArc(x, y, aim, reach) {
      P({ x, y, aim, reach, life: 0.16, type: 'slash', c: 'rgba(59,47,38,0.8)' });
    },
    ring(x, y) { P({ x, y, r: 4, r2: 34, life: 0.3, type: 'shock', c: 'rgba(255,255,255,0.6)' }); },
    confettiBurst(x, y, n) { for (let i = 0; i < n; i++) P({ x, y, vx: M.rand(-120, 120), vy: M.rand(-200, -60), g: 300, r: M.rand(2, 3.4), c: M.pick(['#e4573d', '#f2b134', '#78c6a3', '#5b8dd9', '#c78fda']), life: M.rand(0.8, 1.6), type: 'leaf', rot: M.rand(0, 6.3), vr: M.rand(-6, 6), wind: 1 }); },
    sunflare(x, y) {
      this.light(x, y, 260, 'rgba(255,200,100,', 1);
      P({ x, y, r: 10, r2: 200, life: 0.5, type: 'shock', c: 'rgba(255,220,140,0.9)' });
      for (let i = 0; i < 24; i++) this.fire(x + M.rand(-40, 40), y + M.rand(-30, 30));
    },
    lightningStrike(x, y) {
      G.vfx.lightningLine(x, y - 400, x, y);
      G.combat.explode(x, y, 60, 30, null, { knockback: 200, crater: 12 });
      G.audio.play('thunder', { x, y });
      this.light(x, y, 200, 'rgba(200,220,255,', 1);
    },
    lightningLine(x1, y1, x2, y2) {
      P({ x1, y1, x2, y2, life: 0.18, type: 'bolt', c: '#e8e4f2' });
    },
    healSparkle(x, y) { for (let i = 0; i < 4; i++) P({ x: x + M.rand(-8, 8), y: y + M.rand(-10, 10), vx: 0, vy: M.rand(-30, -14), g: 0, r: M.rand(1.4, 2.6), c: '#78c6a3', life: 0.7, type: 'dot', glow: true }); },
    blackhole(x, y) {
      P({ x, y, life: 0.1, type: 'bh', r: 18, c: '#1a1622' });
      this.light(x, y, 90, 'rgba(160,120,220,', 0.5);
      if (Math.random() < 0.3) {
        const a = M.rand(0, M.TAU);
        P({ x: x + Math.cos(a) * 30, y: y + Math.sin(a) * 30, vx: -Math.cos(a) * 80, vy: -Math.sin(a) * 80, g: 0, r: 1.6, c: '#c78fda', life: 0.35, type: 'dot', glow: true });
      }
    },
    tornado(x, y) {
      for (let i = 0; i < 2; i++) {
        const a = M.rand(0, M.TAU);
        P({ x: x + Math.cos(a) * M.rand(6, 26), y: y + M.rand(-30, 30), vx: 0, vy: -M.rand(60, 120), g: 0, r: M.rand(1.6, 3.4), c: 'rgba(180,200,210,0.5)', life: 0.5, type: 'dot', wind: 0.4 });
      }
    },
    light(x, y, r, colorPrefix, intensity = 0.7) {
      if (G.engine.qualityTier === 'low') return;
      lights.push({ x, y, r, colorPrefix, intensity });
    },

    // ---------- update ----------
    update(dt, world) {
      const wc = G.wind.current();
      for (let i = 0; i < MAX; i++) {
        const p = parts[i];
        if (p.dead) continue;
        p.age += dt;
        if (p.age >= p.life) { p.dead = true; continue; }
        if (p.type === 'shock' || p.type === 'slash' || p.type === 'bolt' || p.type === 'bh' || p.type === 'ring') continue;
        const windMul = p.wind != null ? p.wind : 0.3;
        p.vx += (wc * windMul - p.vx) * Math.min(1, dt * 1.5);
        p.vy += (p.g || 0) * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.type === 'leaf') p.rot += p.vr * dt;
        // terrain stop for heavy dots
        if (p.g > 300 && world.terrain.solidAt(p.x, p.y)) { p.vx *= 0.5; p.vy = -p.vy * 0.3; p.age += dt * 2; }
      }
      if (lights.length > 80) lights.length = 80;
    },

    // ---------- draw ----------
    draw(ctx, vb) {
      // decals (under everything, above terrain — drawn by world between terrain and props)
      let lastColor = null;
      ctx.save();
      for (let i = 0; i < MAX; i++) {
        const p = parts[i];
        if (p.dead) continue;
        if (p.x < vb.x0 - 40 || p.x > vb.x1 + 40 || p.y < vb.y0 - 40 || p.y > vb.y1 + 40) continue;
        const t = p.age / p.life;
        switch (p.type) {
          case 'dot':
            if (p.c !== lastColor) { ctx.fillStyle = p.c; lastColor = p.c; }
            ctx.globalAlpha = 1 - t * 0.6;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 - t * 0.3), 0, M.TAU); ctx.fill();
            break;
          case 'smoke':
            ctx.fillStyle = p.c;
            ctx.globalAlpha = (1 - t) * 0.7;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + t * 1.6), 0, M.TAU); ctx.fill();
            break;
          case 'fire': {
            // layered flame: outer orange, inner yellow
            const flick = 0.7 + Math.sin(p.age * 30 + p.x) * 0.3;
            ctx.globalAlpha = (1 - t) * 0.9;
            ctx.fillStyle = '#e8632c';
            ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * (1 - t * 0.4), p.r * 1.6 * flick * (1 - t * 0.4), 0, 0, M.TAU); ctx.fill();
            ctx.fillStyle = '#f2b134';
            ctx.beginPath(); ctx.ellipse(p.x, p.y - 1, p.r * 0.5 * (1 - t), p.r * 0.9 * flick, 0, 0, M.TAU); ctx.fill();
            break;
          }
          case 'ember':
            ctx.fillStyle = p.c;
            ctx.globalAlpha = 1 - t;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, M.TAU); ctx.fill();
            break;
          case 'leaf':
            ctx.save();
            ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0);
            ctx.fillStyle = p.c; ctx.globalAlpha = 1 - t * 0.5;
            ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, M.TAU); ctx.fill();
            ctx.restore();
            break;
          case 'bubble':
            ctx.strokeStyle = p.c; ctx.lineWidth = 1.2;
            ctx.globalAlpha = 1 - t;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, M.TAU); ctx.stroke();
            break;
          case 'shock':
            ctx.strokeStyle = p.c;
            ctx.lineWidth = 3 * (1 - t) + 0.5;
            ctx.globalAlpha = 1 - t;
            ctx.beginPath(); ctx.arc(p.x, p.y, M.lerp(p.r, p.r2, M.ease.outCubic(t)), 0, M.TAU); ctx.stroke();
            break;
          case 'ring':
            ctx.strokeStyle = p.c; ctx.lineWidth = 2;
            ctx.globalAlpha = 1 - t;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r + t * 30, 0, M.TAU); ctx.stroke();
            break;
          case 'slash':
            ctx.strokeStyle = p.c; ctx.lineWidth = 3.4 * (1 - t) + 1;
            ctx.lineCap = 'round';
            ctx.globalAlpha = 1 - t;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.reach * 0.55, p.aim - 0.9 + t * 0.5, p.aim + 0.9 - t * 0.2);
            ctx.stroke();
            break;
          case 'bolt': {
            ctx.strokeStyle = p.c; ctx.lineWidth = 2.6;
            ctx.globalAlpha = 1 - t;
            ctx.beginPath();
            const segs = 7;
            for (let s = 0; s <= segs; s++) {
              const tt = s / segs;
              const bx = M.lerp(p.x1, p.x2, tt) + (s < segs ? M.rand(-8, 8) : 0);
              const by = M.lerp(p.y1, p.y2, tt) + (s < segs ? M.rand(-8, 8) : 0);
              if (s === 0) ctx.moveTo(bx, by); else ctx.lineTo(bx, by);
            }
            ctx.stroke();
            break;
          }
          case 'bh':
            ctx.fillStyle = p.c;
            ctx.globalAlpha = 0.85;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, M.TAU); ctx.fill();
            break;
        }
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    },
    drawDecals(ctx, vb) {
      if (G.engine.qualityTier === 'low') return;
      ctx.save();
      for (const d of decals) {
        if (d.x < vb.x0 - 60 || d.x > vb.x1 + 60) continue;
        const rng = G.RNG.make(d.seed);
        ctx.fillStyle = 'rgba(40,32,26,0.35)';
        for (let i = 0; i < 7; i++) {
          const a = rng.next() * M.TAU, rr = rng.next() * d.r * 0.8;
          ctx.beginPath();
          ctx.arc(d.x + Math.cos(a) * rr, d.y + Math.sin(a) * rr, d.r * 0.25 * rng.next(), 0, M.TAU);
          ctx.fill();
        }
      }
      ctx.restore();
    },
    drawLights(ctx, vb, darkness) {
      if (!lights.length) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const l of lights) {
        if (l.x < vb.x0 - l.r || l.x > vb.x1 + l.r) continue;
        const g = ctx.createRadialGradient(l.x, l.y, 2, l.x, l.y, l.r);
        g.addColorStop(0, l.colorPrefix + (0.35 * l.intensity * (darkness ? 1.4 : 0.7)) + ')');
        g.addColorStop(1, l.colorPrefix + '0)');
        ctx.fillStyle = g;
        ctx.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
      }
      ctx.restore();
    },
  };

  G.vfx = vfx;
})();
