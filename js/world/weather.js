/* ============================================================
   Weather registry (20+ kinds) + wind system.
   Particles pooled, batched, wind-coupled, 3 layers
   (sky / main / glow).
   ============================================================ */
window.G = window.G || {};
(function () {
  'use strict';
  const M = G.M;

  // ---------- wind ----------
  const wind = {
    base: 0,        // px/s horizontal
    t: 0,
    current() { return this.base * (0.7 + 0.6 * G.noise.fbm1(this.t * 0.11, 2)); },
    gustAt(x, t) {   // travelling gust field for foliage
      return this.base * (0.55 + 0.45 * Math.sin(x * 0.004 - t * 2.2) + 0.35 * G.noise.fbm1(x * 0.002 + t * 0.5, 2));
    },
    update(dt) { this.t += dt; }
  };

  // ---------- particle pool ----------
  const MAX_P = 1600;
  const parts = [];
  for (let i = 0; i < MAX_P; i++) parts.push({ dead: true });
  let pCursor = 0;
  function spawnP(cfg) {
    // find a dead slot (round-robin, overwrite oldest if full)
    for (let i = 0; i < MAX_P; i++) {
      const p = parts[(pCursor + i) % MAX_P];
      if (p.dead) { pCursor = (pCursor + i + 1) % MAX_P; Object.assign(p, cfg); p.dead = false; p.age = 0; return p; }
    }
    const p = parts[pCursor]; pCursor = (pCursor + 1) % MAX_P;
    Object.assign(p, cfg); p.dead = false; p.age = 0;
    return p;
  }

  // ---------- weather definitions ----------
  // each: id, name, spawn(dt, area, env), layer: sky|main|glow, ambient audio
  const WEATHER = {};
  function def(id, name, fns) { WEATHER[id] = Object.assign({ id, name }, fns); }

  def('clear', 'Clear Skies', { rate: 0 });
  def('rain', 'Rain', {
    rate: 260, layer: 'main', sound: 'rain',
    spawn(area, env) { spawnP({ x: M.rand(area.x0 - 300, area.x1 + 300), y: area.y0 - 40, vx: 0, vy: M.rand(680, 860), life: 2.4, r: 1.4, c: 'rgba(150,180,210,0.7)', type: 'rain', windMul: 0.35 }); }
  });
  def('drizzle', 'Soft Drizzle', {
    rate: 90, layer: 'main',
    spawn(area) { spawnP({ x: M.rand(area.x0 - 300, area.x1 + 300), y: area.y0 - 40, vx: 0, vy: M.rand(300, 420), life: 3.4, r: 1.1, c: 'rgba(160,190,215,0.5)', type: 'rain', windMul: 0.5 }); }
  });
  def('downpour', 'Monsoon', {
    rate: 620, layer: 'main', sound: 'rain',
    spawn(area) { spawnP({ x: M.rand(area.x0 - 500, area.x1 + 500), y: area.y0 - 60, vx: 0, vy: M.rand(950, 1200), life: 2.2, r: 1.9, c: 'rgba(140,170,205,0.75)', type: 'rain', windMul: 0.3 }); }
  });
  def('snow', 'Snowfall', {
    rate: 130, layer: 'main',
    spawn(area) { spawnP({ x: M.rand(area.x0 - 200, area.x1 + 200), y: area.y0 - 30, vx: M.rand(-14, 14), vy: M.rand(60, 130), life: 9, r: M.rand(1.6, 3.4), c: 'rgba(250,252,255,0.9)', type: 'snow', windMul: 1, wob: M.rand(0, 6.3) }); }
  });
  def('blizzard', 'Blizzard', {
    rate: 420, layer: 'main', sound: 'wind',
    spawn(area) { spawnP({ x: M.rand(area.x0 - 400, area.x1 + 400), y: area.y0 - 40, vx: M.rand(-30, 30), vy: M.rand(180, 320), life: 5, r: M.rand(1.3, 2.6), c: 'rgba(240,246,255,0.85)', type: 'snow', windMul: 1.6, wob: M.rand(0, 6.3) }); }
  });
  def('leaves', 'Drifting Leaves', {
    rate: 26, layer: 'main',
    spawn(area, env) { const cols = env.biome && env.biome.foliage ? env.biome.foliage : ['#a68a4e']; spawnP({ x: M.rand(area.x0, area.x1), y: area.y0, vx: M.rand(-10, 10), vy: M.rand(40, 80), life: 10, r: M.rand(2.5, 4.5), c: M.pick(cols), type: 'leaf', windMul: 1.4, rot: M.rand(0, 6.3), vr: M.rand(-3, 3), wob: M.rand(0, 6.3) }); }
  });
  def('petals', 'Petal Storm', {
    rate: 60, layer: 'main',
    spawn(area, env) { const cols = (env.biome && env.biome.accent) ? [env.biome.accent, '#f4c6d8'] : ['#f4c6d8', '#e8a7c3']; spawnP({ x: M.rand(area.x0 - 100, area.x1 + 100), y: area.y0, vx: M.rand(-10, 10), vy: M.rand(50, 90), life: 11, r: M.rand(2.2, 3.8), c: M.pick(cols), type: 'leaf', windMul: 1.2, rot: M.rand(0, 6.3), vr: M.rand(-2, 2), wob: M.rand(0, 6.3) }); }
  });
  def('fireflies', 'Fireflies', {
    rate: 16, layer: 'glow', night: true,
    spawn(area) { spawnP({ x: M.rand(area.x0, area.x1), y: M.rand(area.y0, area.y1), vx: M.rand(-12, 12), vy: M.rand(-8, 8), life: 7, r: M.rand(1.8, 3), c: 'rgba(255,235,130,0.95)', type: 'glowbug', windMul: 0.15, wob: M.rand(0, 6.3), pulse: M.rand(0, 6.3) }); }
  });
  def('spores', 'Glowing Spores', {
    rate: 22, layer: 'glow',
    spawn(area) { spawnP({ x: M.rand(area.x0, area.x1), y: M.rand(area.y0, area.y1), vx: M.rand(-8, 8), vy: M.rand(-14, -4), life: 8, r: M.rand(1.6, 3.2), c: 'rgba(150,255,220,0.9)', type: 'glowbug', windMul: 0.4, pulse: M.rand(0, 6.3) }); }
  });
  def('embers', 'Ember Wind', {
    rate: 40, layer: 'glow',
    spawn(area) { spawnP({ x: M.rand(area.x0 - 200, area.x1), y: M.rand(area.y0, area.y1), vx: M.rand(-20, 20), vy: M.rand(-50, -20), life: 6, r: M.rand(1.4, 2.8), c: 'rgba(255,150,60,0.9)', type: 'ember', windMul: 1.2, pulse: M.rand(0, 6.3) }); }
  });
  def('ash', 'Falling Ash', {
    rate: 70, layer: 'main',
    spawn(area) { spawnP({ x: M.rand(area.x0, area.x1), y: area.y0, vx: 0, vy: M.rand(30, 70), life: 9, r: M.rand(1.2, 2.4), c: 'rgba(120,115,110,0.6)', type: 'snow', windMul: 1.1, wob: M.rand(0, 6.3) }); }
  });
  def('storm', 'Thunderstorm', {
    rate: 380, layer: 'main', sound: 'rain', lightning: true,
    spawn(area) { spawnP({ x: M.rand(area.x0 - 400, area.x1 + 400), y: area.y0 - 50, vx: 0, vy: M.rand(900, 1150), life: 2.2, r: 1.8, c: 'rgba(160,185,215,0.8)', type: 'rain', windMul: 0.4 }); }
  });
  def('fog', 'Rolling Fog', {
    layer: 'sky', rate: 0, fog: 0.55,
  });
  def('mist', 'Morning Mist', {
    layer: 'sky', rate: 0, fog: 0.3,
  });
  def('sandstorm', 'Sandstorm', {
    rate: 300, layer: 'main', sound: 'wind', fog: 0.35,
    spawn(area) { spawnP({ x: M.rand(area.x0 - 400, area.x1 + 400), y: M.rand(area.y0, area.y1), vx: M.rand(100, 400), vy: M.rand(-30, 30), life: 2.5, r: M.rand(1.5, 3), c: 'rgba(214,178,120,0.5)', type: 'dust', windMul: 2 }); }
  });
  def('dust', 'Dust Devils', {
    rate: 60, layer: 'main',
    spawn(area) { spawnP({ x: M.rand(area.x0, area.x1), y: M.rand(area.y0, area.y1), vx: M.rand(60, 160), vy: M.rand(-20, 20), life: 4, r: M.rand(1.4, 2.6), c: 'rgba(200,170,130,0.45)', type: 'dust', windMul: 1.6 }); }
  });
  def('starfall', 'Starfall', {
    rate: 10, layer: 'glow', night: true,
    spawn(area) { spawnP({ x: M.rand(area.x0, area.x1), y: area.y0 - 100, vx: M.rand(-60, 60), vy: M.rand(220, 340), life: 3, r: M.rand(2, 3.4), c: 'rgba(220,200,255,0.95)', type: 'glowbug', windMul: 0.1, trail: true }); }
  });
  def('aurora', 'Aurora', {
    layer: 'sky', rate: 0, aurora: true, night: true,
  });
  def('heatwave', 'Heat Shimmer', {
    layer: 'sky', rate: 0, shimmer: true,
  });
  def('pollen', 'Pollen Haze', {
    rate: 30, layer: 'main',
    spawn(area) { spawnP({ x: M.rand(area.x0, area.x1), y: M.rand(area.y0, area.y1), vx: M.rand(-8, 8), vy: M.rand(-6, 6), life: 8, r: M.rand(1.2, 2.2), c: 'rgba(255,240,180,0.6)', type: 'glowbug', windMul: 0.6, pulse: M.rand(0, 6.3) }); }
  });
  def('bubbles', 'Bubble Drift', {
    rate: 18, layer: 'main',
    spawn(area) { spawnP({ x: M.rand(area.x0, area.x1), y: M.rand(area.y0, area.y1), vx: 0, vy: M.rand(-30, -12), life: 6, r: M.rand(2, 5), c: 'rgba(200,230,255,0.4)', type: 'bubble', windMul: 0.8 }); }
  });
  def('inkdrops', 'Ink Rain', {
    rate: 120, layer: 'main',
    spawn(area) { spawnP({ x: M.rand(area.x0 - 200, area.x1 + 200), y: area.y0 - 30, vx: 0, vy: M.rand(500, 700), life: 3, r: M.rand(1.6, 3), c: 'rgba(45,38,32,0.7)', type: 'rain', windMul: 0.3 }); }
  });
  def('glitterfrost', 'Glitterfrost', {
    rate: 60, layer: 'glow',
    spawn(area) { spawnP({ x: M.rand(area.x0, area.x1), y: area.y0, vx: 0, vy: M.rand(50, 100), life: 8, r: M.rand(1.2, 2.4), c: 'rgba(200,240,255,0.95)', type: 'glowbug', windMul: 0.9, pulse: M.rand(0, 6.3) }); }
  });
  def('confettisky', 'Confetti Winds', {
    rate: 40, layer: 'main',
    spawn(area) { spawnP({ x: M.rand(area.x0 - 200, area.x1 + 200), y: area.y0, vx: M.rand(-20, 20), vy: M.rand(60, 120), life: 10, r: M.rand(2, 3.4), c: M.pick(['#e4573d', '#f2b134', '#78c6a3', '#5b8dd9', '#c78fda']), type: 'leaf', windMul: 1.3, rot: M.rand(0, 6.3), vr: M.rand(-4, 4), wob: M.rand(0, 6.3) }); }
  });

  // ---------- system ----------
  let area1y = 1e9;   // kill floor for weather particles (set via _bottomY)
  const weatherSys = {
    register(id, name, fns) { def(id, name, fns); return WEATHER[id]; },
    current: 'clear',
    currentDef: WEATHER.clear,
    intensity: 1,
    lightningFlash: 0,
    set(id) {
      this.current = WEATHER[id] ? id : 'clear';
      this.currentDef = WEATHER[this.current];
      G.bus.emit('weatherChanged', this.currentDef);
    },
    update(dt, env) {
      const def = this.currentDef;
      wind.update(dt);
      // spawn
      if (def.rate && def.rate > 0) {
        const area = env.viewBounds;
        const n = def.rate * this.intensity * dt;
        let count = Math.floor(n);
        if (Math.random() < n - count) count++;
        const budget = G.engine.qualityTier === 'low' ? 0.4 : G.engine.qualityTier === 'medium' ? 0.7 : 1;
        count = Math.floor(count * budget);
        for (let i = 0; i < count; i++) def.spawn(area, env);
      }
      // lightning
      if (def.lightning) {
        if (Math.random() < dt * 0.18) {
          this.lightningFlash = 1;
          G.audio.play('thunder', { x: env.viewBounds.x0 + Math.random() * (env.viewBounds.x1 - env.viewBounds.x0), y: env.viewBounds.y0 });
        }
      }
      this.lightningFlash = Math.max(0, this.lightningFlash - dt * 2.2);
      // update particles
      const wc = wind.current();
      for (let i = 0; i < MAX_P; i++) {
        const p = parts[i];
        if (p.dead) continue;
        p.age += dt;
        if (p.age > p.life) { p.dead = true; continue; }
        const wm = p.windMul != null ? p.windMul : 1;
        p.vx += (wc * wm - p.vx) * Math.min(1, dt * (p.type === 'rain' ? 6 : 1.2));
        if (p.type === 'glowbug' || p.type === 'snow' || p.type === 'leaf') {
          p.wob += dt * 2;
          p.vx += Math.sin(p.wob) * 8 * dt;
          if (p.type === 'leaf') p.rot += p.vr * dt;
        }
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.y > area1y) p.dead = true;
      }
    },
    draw(ctx, layer, vb) {
      const def = this.currentDef;
      // batch by rough color to keep draw calls low: single pass with fillStyle changes only when needed
      let lastColor = null;
      ctx.save();
      if (layer === 'glow') ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < MAX_P; i++) {
        const p = parts[i];
        if (p.dead) continue;
        const isGlow = p.type === 'glowbug' || p.type === 'ember';
        const wantLayer = isGlow ? 'glow' : 'main';
        if (wantLayer !== layer) continue;
        if (p.x < vb.x0 - 60 || p.x > vb.x1 + 60 || p.y < vb.y0 - 60 || p.y > vb.y1 + 60) continue;
        if (p.c !== lastColor) { ctx.fillStyle = p.c; lastColor = p.c; }
        if (p.type === 'rain') {
          ctx.fillRect(p.x, p.y, 1.6, 9 + (p.vy > 700 ? 6 : 0));
        } else if (p.type === 'leaf') {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot || 0);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, M.TAU);
          ctx.fill();
          ctx.restore();
        } else if (p.type === 'glowbug' || p.type === 'ember') {
          const a = p.pulse != null ? 0.55 + 0.45 * Math.sin(p.age * 4 + p.pulse) : 1;
          ctx.globalAlpha = a;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, M.TAU);
          ctx.fill();
          ctx.globalAlpha = a * 0.3;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 3, 0, M.TAU);
          ctx.fill();
          ctx.globalAlpha = 1;
        } else if (p.type === 'bubble') {
          ctx.strokeStyle = p.c; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, M.TAU); ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, M.TAU);
          ctx.fill();
        }
      }
      ctx.restore();
    },
    reset() { for (const p of parts) p.dead = true; },
  };
  Object.defineProperty(weatherSys, '_bottomY', { set(v) { area1y = v; }, get() { return area1y; } });

  G.wind = wind;
  G.weather = weatherSys;
  G.WEATHER_TYPES = WEATHER;
})();
