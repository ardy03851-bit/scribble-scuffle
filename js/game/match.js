/* ============================================================
   World + Match: round flow, layered rendering, camera,
   supply drops, sudden death, storm wall, ring, scoring.
   ============================================================ */
window.G = window.G || {};
(function () {
  'use strict';
  const M = G.M;

  const DEATH_FLAVOUR = {
    shot: ['was doodled away', 'got inked', 'took one right in the margins'],
    blast: ['was blown off the page', 'erased by an explosion', 'went out with a bang'],
    melee: ['got bonked', 'was cut down to size', 'lost the pencil fight'],
    burning: ['crisped up nicely', 'forgot to stop, drop, and roll', 'became a warm memory'],
    'the fall': ['fell off the page', 'discovered the desk below', 'missed the edge'],
    lava: ['took a lava bath', 'is now a statue', 'found the floor was not friendly'],
    spikes: ['landed poorly', 'hugged the spikes'],
    shock: ['was shocked, truly', 'got unplugged'],
    sudden: ['was claimed by sudden death', 'ran out of time'],
    drown: ['bubbled their last', 'forgot how to swim'],
    'the storm': ['was erased by the storm wall', 'wandered too far'],
  };

  class World {
    constructor(rules, mode) {
      this.rules = rules;
      this.mode = mode;
      this.modeDef = G.modes.get(mode);
      this.time = 0;
      this.lastDt = 1 / 60;
      this.big = this.modeDef.big;
      const scale = this.big ? Math.max(1, rules.mapScale || 1) : 1;
      this.mapW = Math.round((this.big ? 6400 : 2200) * scale);
      this.mapH = Math.round((this.big ? 3600 : 1350) * Math.min(3, scale * 0.6 + 0.4));
      this.biomeId = rules.biome && rules.biome !== 'auto' ? rules.biome : G.biomes.random().id;
      this.biome = G.biomes.get(this.biomeId);
      this.theme = Object.assign({ id: this.biomeId, paper: '#f2ead8' }, this.biome);
      this.terrain = new G.Terrain(this.mapW, this.mapH);
      this.terrain.generate(this.biome, rules.terrainStyle);
      this.water = new G.Water(this.mapW, this.mapH);
      if (this.biome.water) {
        this.water.setLevel(this.mapH * this.biome.water.level, this.biome.water.type);
      }
      G.wind.base = this.biome.windBase || 20;
      G.weather.set(rules.weather && rules.weather !== 'auto' ? rules.weather : (this.biome.weather || 'clear'));
      G.props.clear();
      G.props.populate(this, this.big ? 1.15 : 0.85);
      G.critters.spawnFor(this);
      G.build.clear();
      G.bodies.clear();
      G.projectiles.clear();
      G.vfx.clear();
      G.audio.setAmbient(G.weather.currentDef.sound || null);
      this.fighters = [];
      this.player = null;
      this.stars = [];
      const rng = G.RNG.make(99);
      for (let i = 0; i < 90; i++) this.stars.push({ x: rng.next(), y: rng.next() * 0.6, r: rng.range(0.6, 1.8), tw: rng.range(0, 6.3) });
      this.supplyDrops = [];
      this.supplyTimer = rules.supplyRate ? rules.supplyRate * 0.5 : 0;
      this.ring = null;
      this.storm = null;
      this.suddenDeath = false;
      this.killFeed = [];
      this.viewBoundsCache = { x0: 0, y0: 0, x1: 0, y1: 0 };
      this._vbT = 0;
      // mode setup hook
      if (this.modeDef.setup) this.modeDef.setup(this);
    }
    viewBoundsNow() {
      return G.viewBounds(120);
    }
    get viewBounds() {
      // cached per tick
      this._vbT -= this.lastDt;
      if (this._vbT <= 0) { this.viewBoundsCache = G.viewBounds(120); this._vbT = 0.1; }
      return this.viewBoundsCache;
    }
    spawnBody(b) {
      b.life = b.life || 12;
      b.seed = (Math.random() * 100) | 0;
      G.bodies.all.push(b);
    }
    addProp(p) { G.props.add(p); }

    addFighter(ch) {
      this.fighters.push(ch);
      return ch;
    }
    spawnPoint(i, n, team) {
      // spread across map; teams cluster at bases
      const t = this.modeDef.teamBases && this.rules.teams > 1 ? this.modeDef.teamBases(this, team) : null;
      let x;
      if (t) x = t.x + M.rand(-140, 140);
      else x = this.mapW * (0.12 + 0.76 * (n <= 1 ? 0.5 : i / (n - 1))) + M.rand(-60, 60);
      x = M.clamp(x, 60, this.mapW - 60);
      let y = this.terrain.surfaceY(x) - 40;
      // avoid spawning in water/lava: nudge
      if (this.water.level !== Infinity && y > this.water.level - 60) {
        for (let k = 0; k < 20; k++) {
          x = M.clamp(x + M.rand(-200, 200), 60, this.mapW - 60);
          y = this.terrain.surfaceY(x) - 40;
          if (y < this.water.level - 60) break;
        }
      }
      return { x, y: Math.min(y, this.mapH - 100) };
    }

    update(dt) {
      this.lastDt = dt;
      this.time += dt;
      G.updateBoil(dt);
      G.wind.update(dt);
      G.weather._bottomY = this.mapH + 200;
      G.weather.update(dt, { viewBounds: this.viewBounds, biome: this.biome });
      G.critters.update(dt, this);
      // fighters
      for (const f of this.fighters) f.update(dt, this);
      G.projectiles.update(dt, this);
      G.bodies.update(dt, this);
      G.props.update(dt, this);
      G.build.update(dt, this);
      this.water.update(dt, this.terrain);
      G.vfx.update(dt, this);
      // mode logic (king of the ring roaming ring, etc.)
      if (this.match && this.match.modeDef().update) this.match.modeDef().update(this, dt);
      // player underwater audio
      if (this.player) G.audio.setUnderwater(!!this.player.inWater);
      // camera
      this.updateCamera(dt);
      // supply drops
      if (this.rules.supplyRate > 0 && this.fighters.length > 1) {
        this.supplyTimer -= dt;
        if (this.supplyTimer <= 0) {
          this.supplyTimer = this.rules.supplyRate;
          this.spawnSupplyDrop();
        }
      }
      for (let i = this.supplyDrops.length - 1; i >= 0; i--) {
        const d = this.supplyDrops[i];
        if (!d.landed) {
          d.vy = Math.min(d.vy + 200 * dt, 90);
          d.x += Math.sin(this.time * 1.5 + d.seed) * 20 * dt + G.wind.current() * 0.1 * dt;
          d.y += d.vy * dt;
          d.swing += dt * 2;
          if (this.terrain.solidAt(d.x, d.y) || (this.water.level !== Infinity && this.water.isInside(d.x, d.y))) {
            d.landed = true;
            d.y = Math.min(d.y, this.terrain.surfaceY(d.x));
            G.vfx.dust(d.x, d.y);
          }
          if (d.y > this.mapH + 100) this.supplyDrops.splice(i, 1);
        } else {
          // pickup
          for (const f of this.fighters) {
            if (f.alive && M.dist(f.x, f.y - f.h / 2, d.x, d.y - 14) < 34) {
              f.mats += 30;
              if (d.weaponId) {
                f.weapon = G.weapons.create(d.weaponId); f.weapon.ownerRef = f;
                G.ui.weaponToast(f, f.weapon.def);
              }
              G.vfx.confettiBurst(d.x, d.y - 14, 8);
              G.audio.play('uibig', { x: d.x, y: d.y });
              this.supplyDrops.splice(i, 1);
              break;
            }
          }
          d.life -= dt;
          if (d.life < 0) this.supplyDrops.splice(i, 1);
        }
      }
      // war build phase countdown
      if (this.buildPhase && this.buildPhase.t > 0) {
        this.buildPhase.t -= dt;
        if (this.buildPhase.t <= 0) {
          G.ui.banner('FIGHT!', '#e4573d');
          G.audio.play('roundstart');
          for (const f of this.fighters) f.spawnProtect = 1;
        }
      }
      // storm wall
      if (this.storm) this.updateStorm(dt);
      // materials trickle
      for (const f of this.fighters) {
        if (f.alive) f.mats = Math.min(999, f.mats + dt * (this.rules.matRate != null ? this.rules.matRate : 2));
      }
      // sudden death
      if (this.rules.suddenDeath && !this.suddenDeath && this.roundTime > 0 && this.roundElapsed >= this.roundTime) {
        this.suddenDeath = true;
        G.ui.banner('SUDDEN DEATH', '#e4573d');
        G.audio.play('roundstart');
      }
      if (this.suddenDeath) {
        for (const f of this.fighters) if (f.alive) f.damage(5 * dt, null, 'sudden');
      }
      // round end
      this.checkRoundEnd();
    }

    updateCamera(dt) {
      const cam = G.renderer.camera;
      if (this.big) {
        const p = this.player && this.player.alive ? this.player : (this.fighters.find(f => f.alive) || { x: this.mapW / 2, y: this.mapH / 2 });
        cam.x = M.damp(cam.x, M.clamp(p.x, 0, this.mapW), 6, dt);
        cam.y = M.damp(cam.y, M.clamp(p.y - this.mapH * 0.1, 0, this.mapH), 6, dt);
        cam.targetZoom = this.camZoom || 0.9;
      } else {
        // fit whole map
        const z = Math.min(G.renderer.cssW / this.mapW, G.renderer.cssH / (this.mapH * 0.92));
        cam.x = this.mapW / 2;
        cam.y = this.mapH * 0.52;
        cam.targetZoom = z;
      }
      cam.shake = Math.max(0, cam.shake - dt * 40);
    }

    spawnSupplyDrop() {
      const x = M.rand(this.mapW * 0.1, this.mapW * 0.9);
      const y = -60;
      const weaponId = Math.random() < 0.35 ? G.weapons.roll().id : null;
      this.supplyDrops.push({ x, y, vy: 20, landed: false, swing: 0, seed: Math.random() * 10, weaponId, life: 45 });
      G.ui.toast('Supply drop incoming');
    }

    updateStorm(dt) {
      const s = this.storm;
      s.t += dt;
      s.r = Math.max(300, s.r0 - s.t * s.shrink);
      for (const f of this.fighters) {
        if (!f.alive) continue;
        if (M.dist(f.x, f.y, s.x, s.y) > s.r) f.damage(6 * dt, null, 'the storm');
      }
    }

    checkRoundEnd() {
      if (this.roundEnded) return;
      this.modeDef.checkRoundEnd(this);
    }

    // ---------------- rendering ----------------
    render(ctx, alpha) {
      const cam = G.renderer.camera;
      const vb = this.viewBoundsNow();
      const b = this.biome;
      // 1) sky
      this.drawSky(ctx, vb);
      // 2) backdrop parallax silhouettes
      this.drawBackdrop(ctx, vb);
      // 3) weather sky layer (fog/aurora behind)
      G.weather.draw(ctx, 'sky', vb);
      // 4) background props skipped (in backdrop)
      // 5) terrain
      this.terrain.draw(ctx, vb);
      this.terrain.drawTopEdges(ctx, vb);
      // 6) decals
      G.vfx.drawDecals(ctx, vb);
      // 7) water (with reflections)
      const drawRefl = (rg, rvb) => {
        this.terrain.draw(rg, rvb);
        for (const f of this.fighters) f.draw(rg, 1);
      };
      if (this.water.level !== Infinity) this.water.draw(ctx, vb, drawRefl);
      // 8) grass
      G.grass.draw(ctx, this);
      // 9) props
      G.props.draw(ctx, 'main');
      // 10) build pieces
      G.build.draw(ctx, vb);
      // 11) bodies
      G.bodies.draw(ctx, vb);
      // 12) supply drops
      this.drawSupply(ctx, vb);
      // 12b) king-of-the-ring golden ring
      if (this.ring) this.drawRing(ctx);
      // 13) fighters
      const sorted = this.fighters.slice().sort((a, b2) => (a.alive === b2.alive ? a.y - b2.y : a.alive ? 1 : -1));
      for (const f of sorted) f.draw(ctx, alpha);
      // 14) storm visuals
      if (this.storm) this.drawStorm(ctx, vb);
      // 15) projectiles
      G.projectiles.draw(ctx, vb);
      // 16) critters
      G.critters.draw(ctx);
      // 17) particles
      G.vfx.draw(ctx, vb);
      // 18) weather main layer
      G.weather.draw(ctx, 'main', vb);
      // 19) glow lights (additive)
      G.vfx.drawLights(ctx, vb, b.darkness > 0 || b.night);
      G.weather.draw(ctx, 'glow', vb);
      // 20) darkness pass
      if (b.darkness > 0.02) this.drawDarkness(ctx, vb);
      // 21) weather overlay (fog)
      if (G.weather.currentDef.fog) {
        ctx.save();
        ctx.fillStyle = `rgba(210,205,190,${G.weather.currentDef.fog * 0.5})`;
        ctx.fillRect(vb.x0, vb.y0, vb.x1 - vb.x0, vb.y1 - vb.y0);
        ctx.restore();
      }
      // 22) lightning flash
      if (G.weather.lightningFlash > 0) {
        ctx.save();
        ctx.fillStyle = `rgba(255,255,255,${G.weather.lightningFlash * 0.35})`;
        ctx.fillRect(vb.x0, vb.y0, vb.x1 - vb.x0, vb.y1 - vb.y0);
        ctx.restore();
      }
      // 23) lava heat shimmer
      if (this.water.type === 'lava' && G.engine.qualityTier !== 'low') this.drawHeatShimmer(ctx, vb);
      // vignette
      ctx.save();
      const vg = ctx.createRadialGradient(cam.x, cam.y, Math.min(G.renderer.cssW, G.renderer.cssH) * 0.35 / cam.zoom, cam.x, cam.y, Math.max(G.renderer.cssW, G.renderer.cssH) * 0.75 / cam.zoom);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(60,45,30,0.18)');
      ctx.fillStyle = vg;
      ctx.fillRect(vb.x0, vb.y0, vb.x1 - vb.x0, vb.y1 - vb.y0);
      ctx.restore();
    }

    drawSky(ctx, vb) {
      const b = this.biome;
      const g = ctx.createLinearGradient(0, vb.y0, 0, vb.y0 + (vb.y1 - vb.y0));
      g.addColorStop(0, b.sky[0]);
      g.addColorStop(0.55, b.sky[1]);
      g.addColorStop(1, b.sky[2]);
      ctx.fillStyle = g;
      ctx.fillRect(vb.x0, vb.y0, vb.x1 - vb.x0, vb.y1 - vb.y0);
      // stars
      if (b.night || b.darkness > 0.3) {
        ctx.save();
        ctx.fillStyle = '#fff';
        for (const s of this.stars) {
          const sx = s.x * this.mapW, sy = s.y * this.mapH * 0.5 + vb.y0 * 0.3;
          if (sx < vb.x0 || sx > vb.x1) continue;
          ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(this.time * 0.7 + s.tw));
          ctx.beginPath(); ctx.arc(sx, sy, s.r, 0, M.TAU); ctx.fill();
        }
        ctx.restore();
      }
      // sun / moon
      const sun = b.sun || { type: 'sun', color: '#f9d976' };
      const sx = this.mapW * 0.72, sy = this.mapH * 0.16;
      ctx.save();
      if (sun.type === 'moon') {
        ctx.fillStyle = sun.color;
        ctx.beginPath(); ctx.arc(sx, sy, 26, 0, M.TAU); ctx.fill();
        ctx.fillStyle = b.sky[0];
        ctx.beginPath(); ctx.arc(sx - 10, sy - 6, 22, 0, M.TAU); ctx.fill();
      } else {
        // hand-drawn sun: wobbly circle + rays
        const rng = G.RNG.make(G.boil(3));
        ctx.strokeStyle = 'rgba(230,180,80,0.6)';
        ctx.lineWidth = 3;
        for (let i = 0; i < 10; i++) {
          const a = i / 10 * M.TAU + this.time * 0.05;
          ctx.beginPath();
          ctx.moveTo(sx + Math.cos(a) * 34, sy + Math.sin(a) * 34);
          ctx.lineTo(sx + Math.cos(a) * (44 + rng.range(0, 6)), sy + Math.sin(a) * (44 + rng.range(0, 6)));
          ctx.stroke();
        }
        ctx.fillStyle = sun.color;
        ctx.beginPath(); ctx.arc(sx, sy, 26, 0, M.TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(200,140,50,0.8)'; ctx.lineWidth = 2.4; ctx.stroke();
      }
      ctx.restore();
      // aurora
      if (G.weather.currentDef.aurora) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 3; i++) {
          const hue = ['rgba(125,232,195,', 'rgba(125,180,232,', 'rgba(180,125,232,'][i];
          ctx.fillStyle = hue + '0.14)';
          ctx.beginPath();
          const yBase = this.mapH * (0.08 + i * 0.06);
          ctx.moveTo(vb.x0, yBase + 80);
          for (let x = vb.x0; x <= vb.x1; x += 60) {
            ctx.lineTo(x, yBase + Math.sin(x * 0.002 + this.time * 0.4 + i * 2) * 40 + G.noise.fbm1(x * 0.001 + this.time * 0.1 + i, 2) * 50);
          }
          ctx.lineTo(vb.x1, yBase - 160); ctx.lineTo(vb.x0, yBase - 160);
          ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      }
    }

    drawBackdrop(ctx, vb) {
      const b = this.biome;
      const layers = [
        { f: 0.25, color: b.haze[1], base: this.mapH * 0.62 },
        { f: 0.45, color: b.haze[0], base: this.mapH * 0.72 },
      ];
      const cam = G.renderer.camera;
      for (const L of layers) {
        ctx.save();
        ctx.fillStyle = L.color;
        ctx.beginPath();
        const off = cam.x * (1 - L.f);
        ctx.moveTo(vb.x0, vb.y1);
        for (let x = vb.x0; x <= vb.x1 + 40; x += 40) {
          const wx = x + off;
          let y = L.base;
          switch (b.bgStyle) {
            case 'mountains':
              y = L.base - Math.abs(G.noise.fbm1(wx * 0.0012 + L.f * 10, 3)) * this.mapH * 0.35;
              break;
            case 'dunes':
              y = L.base - Math.abs(Math.sin(wx * 0.0016 + L.f * 3)) * this.mapH * 0.1 - G.noise.fbm1(wx * 0.003, 2) * 30;
              break;
            case 'waves':
              y = L.base - Math.abs(Math.sin(wx * 0.004 + this.time * 0.6 + L.f * 5)) * 26;
              break;
            case 'spires':
              y = L.base - Math.max(0, Math.sin(wx * 0.004 + L.f * 9)) * this.mapH * 0.3 * (0.4 + G.noise.fbm1(wx * 0.001, 2));
              break;
            case 'clouds':
              y = L.base - 60 - Math.abs(Math.sin(wx * 0.0009 + L.f * 4)) * 90;
              break;
            default: // hills + tree-line
              y = L.base - G.noise.fbm1(wx * 0.0018 + L.f * 7, 3) * this.mapH * 0.16;
              break;
          }
          ctx.lineTo(x, y);
        }
        ctx.lineTo(vb.x1, vb.y1);
        ctx.closePath();
        ctx.fill();
        // tree-line silhouettes on hills
        if (b.bgStyle === 'hills' || !b.bgStyle) {
          ctx.fillStyle = L.color;
          for (let x = vb.x0; x <= vb.x1 + 40; x += 26) {
            const wx = x + off;
            const y = L.base - G.noise.fbm1(wx * 0.0018 + L.f * 7, 3) * this.mapH * 0.16;
            const h = 14 + G.noise.fbm1(wx * 0.01, 1) * 18;
            ctx.beginPath();
            ctx.moveTo(x - 8, y + 4);
            ctx.lineTo(x, y - h);
            ctx.lineTo(x + 8, y + 4);
            ctx.closePath();
            ctx.fill();
          }
        }
        ctx.restore();
      }
    }

    drawDarkness(ctx, vb) {
      const b = this.biome;
      const dark = b.darkness;
      if (!this._darkCanvas || this._darkCanvas.width !== Math.ceil(G.renderer.w / 2)) {
        this._darkCanvas = document.createElement('canvas');
        this._darkCanvas.width = Math.ceil(G.renderer.w / 2);
        this._darkCanvas.height = Math.ceil(G.renderer.h / 2);
      }
      const dc = this._darkCanvas, dg = dc.getContext('2d');
      const cam = G.renderer.camera;
      const z = cam.zoom * G.renderer.dpr / 2;
      dg.setTransform(1, 0, 0, 1, 0, 0);
      dg.fillStyle = `rgba(14,12,26,${dark})`;
      dg.fillRect(0, 0, dc.width, dc.height);
      // erase lights (destination-out)
      dg.globalCompositeOperation = 'destination-out';
      for (const l of G.vfx.lights) {
        const sx = (l.x - cam.x) * z + dc.width / 2;
        const sy = (l.y - cam.y) * z + dc.height / 2;
        const r = l.r * z;
        const g = dg.createRadialGradient(sx, sy, 1, sx, sy, r);
        g.addColorStop(0, `rgba(0,0,0,${Math.min(1, l.intensity + 0.3)})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        dg.fillStyle = g;
        dg.fillRect(sx - r, sy - r, r * 2, r * 2);
      }
      dg.globalCompositeOperation = 'source-over';
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(dc, 0, 0, G.renderer.w, G.renderer.h);
      ctx.restore();
    }

    drawHeatShimmer(ctx, vb) {
      // subtle wavy distortion hint above lava: draw semi-transparent bands
      ctx.save();
      const y = this.water.level;
      if (y > vb.y1 || y < vb.y0 - 100) { ctx.restore(); return; }
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 5; i++) {
        const yy = y - 10 - i * 12 + Math.sin(this.time * 3 + i) * 4;
        ctx.beginPath();
        ctx.ellipse(vb.x0 + ((vb.x1 - vb.x0) * (0.2 + 0.15 * i + Math.sin(this.time + i) * 0.05)), yy, 60 + i * 30, 4, 0, 0, M.TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    drawRing(ctx) {
      const r = this.ring;
      ctx.save();
      ctx.translate(r.x, r.y);
      // golden wobbly ring
      ctx.strokeStyle = '#e8b93c';
      ctx.lineWidth = 7;
      ctx.beginPath();
      const n = 26;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        const wob = 1 + Math.sin(a * 5 + G.world.time * 2.2) * 0.04;
        const x = Math.cos(a) * r.r * wob, y = Math.sin(a) * r.r * wob * 0.72; // slight ellipse
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(59,47,38,0.9)';
      ctx.lineWidth = 2.2;
      ctx.stroke();
      // holder crown glow
      if (r.holder) {
        ctx.fillStyle = 'rgba(232,185,60,0.16)';
        ctx.fill();
        ctx.fillStyle = '#3b2f26';
        ctx.font = '600 11px "Patrick Hand", cursive';
        ctx.textAlign = 'center';
        ctx.fillText('KING', 0, -r.r * 0.72 - 8);
      }
      ctx.restore();
    }

    drawSupply(ctx, vb) {
      for (const d of this.supplyDrops) {
        if (d.x < vb.x0 - 60 || d.x > vb.x1 + 60) continue;
        ctx.save();
        ctx.translate(d.x, d.y);
        if (!d.landed) {
          // parachute
          ctx.strokeStyle = 'rgba(59,47,38,0.7)';
          ctx.lineWidth = 1.4;
          for (const s of [-1, 0, 1]) {
            ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(s * 16, -34); ctx.stroke();
          }
          ctx.fillStyle = '#e8dcc0';
          ctx.beginPath();
          ctx.arc(0, -34, 20, Math.PI, 0);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#3b2f26'; ctx.lineWidth = 2; ctx.stroke();
        }
        // crate
        const bob = d.landed ? 0 : Math.sin(d.swing) * 2;
        ctx.translate(0, bob);
        G.handRect(ctx, -14, -26, 28, 26, d.seed * 100 | 0, 4);
        ctx.fillStyle = '#c9a86a'; ctx.fill();
        ctx.strokeStyle = '#3b2f26'; ctx.lineWidth = 2.2; ctx.stroke();
        ctx.strokeStyle = 'rgba(59,47,38,0.6)'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(-14, -13); ctx.lineTo(14, -13); ctx.stroke();
        ctx.fillStyle = '#e4573d';
        ctx.beginPath(); ctx.arc(0, -19, 3, 0, M.TAU); ctx.fill();
        ctx.restore();
      }
    }

    drawStorm(ctx, vb) {
      const s = this.storm;
      ctx.save();
      ctx.strokeStyle = 'rgba(120,100,160,0.5)';
      ctx.lineWidth = 30;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, M.TAU); ctx.stroke();
      ctx.restore();
    }
  }

  // ================= Match =================
  class Match {
    constructor(rules, mode) {
      this.rules = rules;
      this.mode = mode;
      this.world = new World(rules, mode);
      this.world.match = this;
      this.round = 0;
      this.scores = {};          // fighter id -> wins
      this.teamScores = {};
      this.matchOver = false;
      this.champion = null;
      this.roundState = 'prep';  // prep | reveal | fighting | ended
      this.roundTimer = 0;
      this.roundEnded = false;
      this.betweenT = 0;
      this.winner = null;
      G.bus.on('death', (e) => this.onDeath(e));
    }
    get targetScore() { return this.rules.targetScore || 3; }

    start() {
      this.setupFighters();
      this.startRound();
    }
    setupFighters() {
      const w = this.world;
      const rules = this.rules;
      const teams = rules.teams || 1;
      const botCount = rules.bots != null ? rules.bots : 5;
      w.fighters.length = 0;
      // player
      const p = new G.Character({ name: 'You' });
      p.team = teams > 1 ? 1 : 0;
      p.controller = null;
      p.maxHp = rules.health || 100; p.hp = p.maxHp;
      w.player = p;
      w.addFighter(p);
      // bots
      for (let i = 0; i < botCount; i++) {
        const bot = new G.Character({ name: G.bots.NAMES[(i + 1) % G.bots.NAMES.length] + (i >= G.bots.NAMES.length ? i : ''), isBot: true });
        bot.team = teams > 1 ? ((i + 1) % teams) + 1 : 0;
        bot.maxHp = rules.health || 100; bot.hp = bot.maxHp;
        bot.controller = new G.BotController(rules.botSkill || 2);
        w.addFighter(bot);
      }
    }
    startRound() {
      const w = this.world;
      this.round++;
      this.roundState = 'reveal';
      this.roundEnded = false;
      this.betweenT = 0;
      this.suddenDeathReset();
      w.roundElapsed = 0;
      w.roundTime = this.rules.roundTime || 120;
      w.suddenDeath = false;
      // new biome/terrain each round if regen enabled
      if (this.round > 1 && this.rules.regenMaps !== false) {
        const nw = new World(this.rules, this.mode);
        // keep fighters
        nw.fighters = w.fighters;
        nw.player = w.player;
        nw.match = this;
        this.world = nw;
      }
      const ww = this.world;
      // respawn all
      const n = ww.fighters.length;
      ww.fighters.forEach((f, i) => {
        const sp = ww.spawnPoint(i, n, f.team);
        f.respawn(sp.x, sp.y);
        f.score = f.score || 0;
      });
      // assign weapons
      const rules = this.rules;
      let shared = null;
      for (const f of ww.fighters) {
        let def;
        if (rules.startWeapon === 'same') { shared = shared || G.weapons.roll(); def = shared; }
        else if (rules.startWeapon === 'none') def = G.weapons.get('buildtool');
        else def = G.weapons.roll();
        f.weapon = G.weapons.create(def.id); f.weapon.ownerRef = f;
        f.mats = rules.startMats != null ? rules.startMats : 40;
        f.cloths = G.wardrobe.makeCloths(f);
      }
      // ring
      if (this.mode === 'ring') {
        const rx = ww.mapW * 0.5;
        ww.ring = { x: rx, y: ww.terrain.surfaceY(rx) - 60, r: 110, t: 0, hopT: 10, holders: [] };
      } else ww.ring = null;
      // storm
      if (rules.stormWall && ww.big) {
        ww.storm = { x: ww.mapW / 2, y: ww.mapH / 2, r0: Math.max(ww.mapW, ww.mapH) * 0.75, r: 0, t: 0, shrink: Math.max(ww.mapW, ww.mapH) * 0.75 / (ww.roundTime * 0.8) };
        ww.storm.r = ww.storm.r0;
      } else ww.storm = null;
      // war setup
      if (this.modeDef().setupRound) this.modeDef().setupRound(this, ww);
      // camera snap
      const cam = G.renderer.camera;
      if (ww.big && ww.player) { cam.x = ww.player.x; cam.y = ww.player.y - 100; }
      G.ui.banner('Round ' + this.round, '#3b2f26');
      G.audio.play('roundstart');
      // weapon reveal cards
      G.ui.showWeaponReveal(ww.fighters, () => {
        this.roundState = 'fighting';
      });
    }
    modeDef() { return G.modes.get(this.mode); }
    suddenDeathReset() { }

    onDeath(e) {
      const { target, attacker, cause } = e;
      const w = this.world;
      if (attacker && attacker !== target) {
        attacker.kills++;
        attacker.score += 1;
        if (this.rules.teams > 1) {
          w.teamScores = w.teamScores || {};
          w.teamScores[attacker.team] = (w.teamScores[attacker.team] || 0) + 1;
        }
      }
      target.deaths++;
      const flavour = M.pick(DEATH_FLAVOUR[cause] || ['was defeated']);
      w.killFeed.push({ text: `${target.name} ${flavour}`, t: 4, color: target.color });
      if (w.killFeed.length > 5) w.killFeed.shift();
      // war tickets
      if (this.mode === 'war' && this.rules.tickets > 0) {
        w.teamTickets = w.teamTickets || {};
        w.teamTickets[target.team] = Math.max(0, (w.teamTickets[target.team] || this.rules.tickets) - 1);
      }
      // respawn modes
      if (this.modeDef().respawn) {
        target.respawnT = 3;
      }
    }

    update(dt) {
      const w = this.world;
      if (this.matchOver) return;
      if (this.roundState === 'fighting') {
        w.roundElapsed += dt;
        w.update(dt);
        // respawns (war/ring)
        if (this.modeDef().respawn) {
          for (const f of w.fighters) {
            if (!f.alive && f.respawnT > 0) {
              f.respawnT -= dt;
              const ticketsOk = !(this.mode === 'war' && this.rules.tickets > 0 && (w.teamTickets[f.team] || 0) <= 0);
              if (f.respawnT <= 0 && ticketsOk) {
                const sp = w.spawnPoint(w.fighters.indexOf(f), w.fighters.length, f.team);
                f.respawn(sp.x, sp.y);
                f.weapon = G.weapons.create(G.weapons.roll().id); f.weapon.ownerRef = f;
                G.ui.toast(f.name + ' respawned');
              }
            }
          }
        }
      } else if (this.roundState === 'reveal') {
        w.time += dt;
        G.updateBoil(dt);
        // fighters idle during reveal
        w.updateCamera(dt);
      } else if (this.roundState === 'ended') {
        this.betweenT += dt;
        if (this.betweenT > 2.6) {
          // check match end
          if (this.winner) {
            this.matchOver = true;
            this.champion = this.winner;
            G.ui.showVictory(this);
          } else {
            this.startRound();
          }
        }
      }
    }

    endRound(winner) {
      if (this.roundEnded) return;
      this.roundEnded = true;
      this.roundState = 'ended';
      this.winner = winner;
      this.betweenT = 0;
      if (winner) {
        winner.score += this.rules.teams > 1 ? 0 : 1; // team scoring handled in ring/kills
        if (this.rules.teams > 1) {
          this.world.teamScores = this.world.teamScores || {};
          this.world.teamScores[winner.team] = (this.world.teamScores[winner.team] || 0) + 1;
        }
        G.ui.banner(winner === this.world.player ? 'ROUND WON' : winner.name + ' takes the round', winner === this.world.player ? '#78c6a3' : '#3b2f26');
      } else {
        G.ui.banner('Draw', '#8a7f6a');
      }
      G.audio.play(winner === this.world.player ? 'victory' : 'roundstart');
    }

    checkMatchOver() {
      const w = this.world;
      let over = null;
      if (this.rules.teams > 1) {
        for (const t in w.teamScores) {
          if (w.teamScores[t] >= this.targetScore) { over = { team: +t }; break; }
        }
      } else {
        for (const f of w.fighters) {
          if (f.score >= this.targetScore) { over = f; break; }
        }
      }
      if (over) {
        this.matchOver = true;
        this.champion = over;
        if (G.main) G.main.state = 'victory';
        G.ui.showVictory(this);
        return true;
      }
      return false;
    }

    render(ctx, alpha) {
      this.world.render(ctx, alpha);
    }
  }

  G.World = World;
  G.Match = Match;
  G.DEATH_FLAVOUR = DEATH_FLAVOUR;
})();
