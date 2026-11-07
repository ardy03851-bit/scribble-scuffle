/* ============================================================
   Projectiles + combat: pooled projectiles, beams, melee
   swings, explosions, craters, special behaviours (black hole,
   tornado, grapple, lightning, chain, cluster).
   ============================================================ */
window.G = window.G || {};
(function () {
  'use strict';
  const M = G.M;

  const pool = new G.Pool(
    () => ({ def: null, owner: null }),
    (p, cfg) => { Object.assign(p, cfg); p.age = 0; p.dead = false; p.bouncesLeft = p.def ? (p.def.bounces || 0) : 0; p.px = p.x; p.py = p.y; p.stuck = false; p.hitSet = new Set(); },
    128
  );

  const projectiles = {
    pool,
    beams: [],   // {x1,y1,x2,y2,life,color}
    hooks: [],   // grapple hooks {x,y,vx,vy,owner,stuck,life}
    clear() { pool.clear(); this.beams.length = 0; this.hooks.length = 0; },
    spawn(cfg) {
      const p = pool.obtain(cfg);
      return p;
    },
    meleeSwing(ch, d, aim) {
      // arc hit in front
      const reach = d.meleeReach;
      const cx = ch.x + Math.cos(aim) * reach * 0.6;
      const cy = ch.y - ch.h * 0.5 + Math.sin(aim) * reach * 0.6;
      G.vfx.slashArc(cx, cy, aim, reach);
      let hitAny = false;
      for (const f of G.world.fighters) {
        if (!f.alive || f === ch) continue;
        if (G.world.rules.friendlyFire === false && f.team !== 0 && f.team === ch.team) continue;
        const d2 = M.dist(f.x, f.y - f.h / 2, cx, cy);
        if (d2 < reach * 0.7 + 14) {
          f.damage(d.damage, ch, 'melee');
          const a = M.ang(ch.x, ch.y - ch.h / 2, f.x, f.y - f.h / 2);
          f.vx += Math.cos(a) * (d.knockback || 80);
          f.vy += Math.sin(a) * (d.knockback || 80) - 60;
          if (d.lifesteal) ch.heal(d.damage * d.lifesteal);
          if (d.status) for (const k in d.status) f.applyStatus(k, d.status[k]);
          hitAny = true;
          G.vfx.hitSpark(f.x, f.y - f.h / 2);
          G.audio.play('hit', { x: f.x, y: f.y });
        }
      }
      // chop trees in arc
      G.props.damageAt(cx, cy, reach * 0.5, d.damage * 1.5, 'chop');
      G.build.damageAt(cx, cy, reach * 0.5, d.damage, ch);
      // dig tool
      if (d.dig) {
        G.world.terrain.carve(cx, cy, 34);
        G.props.onTerrainEdit(cx, cy, 34);
        G.vfx.dirtBurst(cx, cy, 8);
        G.audio.play('dig', { x: cx, y: cy });
      }
      if (hitAny) { ch.hitStop = 0.03; G.camShake(3); }
    },
    fireBeam(ch, d, aim) {
      const sx = ch.x + Math.cos(aim) * 16, sy = ch.y - ch.h * 0.6 + Math.sin(aim) * 16;
      const hit = G.world.terrain.raycast(sx, sy, Math.cos(aim), Math.sin(aim), 900);
      const ex = hit ? hit.x : sx + Math.cos(aim) * 900;
      const ey = hit ? hit.y : sy + Math.sin(aim) * 900;
      const color = d.art && d.art.c1 ? d.art.c1 : '#e4573d';
      this.beams.push({ x1: sx, y1: sy, x2: ex, y2: ey, life: d.lifetime || 0.12, maxLife: d.lifetime || 0.12, color });
      // damage along beam
      for (const f of G.world.fighters) {
        if (!f.alive || f === ch) continue;
        if (G.world.rules.friendlyFire === false && f.team !== 0 && f.team === ch.team) continue;
        // point-line distance
        const t = M.clamp(((f.x - sx) * (ex - sx) + (f.y - f.h / 2 - sy) * (ey - sy)) / (M.dist2(ex, ey, sx, sy) || 1), 0, 1);
        const px = sx + (ex - sx) * t, py = sy + (ey - sy) * t;
        if (M.dist(f.x, f.y - f.h / 2, px, py) < 16) {
          if (d.heal) { f.heal(d.heal); G.vfx.healSparkle(f.x, f.y - f.h / 2); }
          else {
            f.damage(d.damage, ch, 'beam');
            if (d.status) for (const k in d.status) f.applyStatus(k, d.status[k]);
            if (d.lifesteal) ch.heal(d.damage * d.lifesteal);
          }
          if (!d.beamPierce) break;
        }
      }
      G.vfx.muzzle(sx, sy);
    },
    fireGrapple(ch, d, aim) {
      this.hooks.push({
        x: ch.x, y: ch.y - ch.h * 0.6,
        vx: Math.cos(aim) * d.speed, vy: Math.sin(aim) * d.speed,
        owner: ch, stuck: false, life: d.lifetime + 1.4,
      });
    },
    fireShield(ch, d, aim) {
      // deployable bubble
      G.build.placeGadget(ch, 'shieldbubble', ch.x + Math.cos(aim) * 60, ch.y - ch.h * 0.5 + Math.sin(aim) * 60);
    },
    update(dt, world) {
      // beams
      for (let i = this.beams.length - 1; i >= 0; i--) {
        this.beams[i].life -= dt;
        if (this.beams[i].life <= 0) this.beams.splice(i, 1);
      }
      // hooks
      for (let i = this.hooks.length - 1; i >= 0; i--) {
        const h = this.hooks[i];
        h.life -= dt;
        if (h.life <= 0 || !h.owner.alive) { this.hooks.splice(i, 1); continue; }
        if (!h.stuck) {
          h.vy += 600 * dt;
          h.x += h.vx * dt; h.y += h.vy * dt;
          if (world.terrain.solidAt(h.x, h.y)) { h.stuck = true; G.audio.play('clank', { x: h.x, y: h.y }); }
          if (h.y > world.mapH + 100) this.hooks.splice(i, 1);
        } else {
          // pull owner toward hook
          const a = M.ang(h.owner.x, h.owner.y - h.owner.h / 2, h.x, h.y);
          const d = M.dist(h.owner.x, h.owner.y - h.owner.h / 2, h.x, h.y);
          if (d > 30 && h.owner.input.fire) {
            h.owner.vx += Math.cos(a) * 1400 * dt;
            h.owner.vy += Math.sin(a) * 1400 * dt;
          }
        }
      }
      // projectiles
      const act = pool.active;
      for (let i = act.length - 1; i >= 0; i--) {
        const p = act[i];
        if (p.dead) continue;
        this.stepProjectile(p, dt, world);
        if (p.dead) pool.release(p);
      }
      pool.sweep();
    },
    stepProjectile(p, dt, world) {
      const d = p.def;
      p.age += dt;
      if (p.age > (d.lifetime || 2)) {
        if (d.explode) { this.explodeProj(p, world); }
        p.dead = true; return;
      }
      p.px = p.x; p.py = p.y;
      // homing
      if (d.homing) {
        let best = null, bd = 1e9;
        for (const f of world.fighters) {
          if (!f.alive || f === p.owner) continue;
          if (world.rules.friendlyFire === false && f.team !== 0 && f.team === p.owner.team) continue;
          const dd = M.dist2(f.x, f.y, p.x, p.y);
          if (dd < bd) { bd = dd; best = f; }
        }
        if (best && bd < 400 * 400) {
          const a = M.ang(p.x, p.y, best.x, best.y - best.h / 2);
          const sp = Math.hypot(p.vx, p.vy) || 1;
          const cur = Math.atan2(p.vy, p.vx);
          const na = M.angLerp(cur, a, Math.min(1, d.homing * dt));
          p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp;
        }
      }
      // gravity
      if (d.gravity) p.vy += d.gravity * dt;
      // drag
      if (d.drag) { const f = Math.pow(1 - Math.min(0.95, d.drag), dt); p.vx *= f; p.vy *= f; }
      // wind on light projectiles
      if (d.bulletSize < 4 && !d.explode) p.vx += G.wind.current() * 0.02 * dt;
      // black hole / gravity well / tornado pull
      if (d.blackhole || d.gravityWell) {
        const r = (d.blackhole || d.gravityWell) * 100;
        for (const f of world.fighters) {
          if (!f.alive) continue;
          const dd = M.dist(f.x, f.y, p.x, p.y);
          if (dd < r) {
            const a = M.ang(f.x, f.y, p.x, p.y);
            const k = 1 - dd / r;
            f.vx += Math.cos(a) * 500 * k * dt;
            f.vy += Math.sin(a) * 500 * k * dt;
          }
        }
        for (const b of G.bodies.all) {
          const dd = M.dist(b.x, b.y, p.x, p.y);
          if (dd < r) {
            const a = M.ang(b.x, b.y, p.x, p.y);
            const k = 1 - dd / r;
            b.vx += Math.cos(a) * 700 * k * dt;
            b.vy += Math.sin(a) * 700 * k * dt;
          }
        }
        G.vfx.blackhole(p.x, p.y);
      }
      if (d.tornado) {
        G.vfx.tornado(p.x, p.y - 40);
        for (const f of world.fighters) {
          if (!f.alive) continue;
          const dd = Math.abs(f.x - p.x);
          if (dd < 90) f.vy -= 600 * dt;
        }
        if (world.terrain.solidAt(p.x, p.y + 20)) { p.vy = -60; p.vx += G.wind.current() * dt; }
      }
      // move
      p.x += p.vx * dt; p.y += p.vy * dt;
      // fuse
      if (d.fuse && p.age >= d.fuse) { this.explodeProj(p, world); p.dead = true; return; }
      // terrain collision
      if (!d.passTerrain && world.terrain.solidAt(p.x, p.y)) {
        if (d.erase) {
          world.terrain.carve(p.x, p.y, d.erase);
          G.props.onTerrainEdit(p.x, p.y, d.erase);
          G.vfx.eraserPuff(p.x, p.y);
          p.dead = true; return;
        }
        if (d.bounces > 0 && p.bouncesLeft > 0) {
          p.bouncesLeft--;
          // reflect (approximate normal from sampling)
          const solidR = world.terrain.solidAt(p.x + 4, p.y);
          const solidD = world.terrain.solidAt(p.x, p.y + 4);
          if (solidR && !solidD) p.vx = -p.vx * 0.7;
          else if (solidD && !solidR) p.vy = -p.vy * 0.7;
          else { p.vx = -p.vx * 0.7; p.vy = -p.vy * 0.7; }
          p.x = p.px; p.y = p.py;
          G.audio.play('bounce', { x: p.x, y: p.y, vol: 0.3 });
        } else {
          this.explodeProj(p, world);
          p.dead = true; return;
        }
      }
      // hit fighters
      for (const f of world.fighters) {
        if (!f.alive || f === p.owner || p.hitSet.has(f)) continue;
        if (world.rules.friendlyFire === false && f.team !== 0 && f.team === p.owner.team) continue;
        if (M.dist(f.x, f.y - f.h / 2, p.x, p.y) < 15 + (d.bulletSize || 3)) {
          p.hitSet.add(f);
          f.damage(d.damage, p.owner, 'shot');
          if (d.knockback) { const a = Math.atan2(p.vy, p.vx); f.vx += Math.cos(a) * d.knockback; f.vy += Math.sin(a) * d.knockback - 60; }
          if (d.lifesteal) p.owner.heal(d.damage * d.lifesteal);
          if (d.status) for (const k in d.status) f.applyStatus(k, d.status[k]);
          G.vfx.hitSpark(p.x, p.y);
          G.audio.play('hit', { x: p.x, y: p.y });
          if (d.chain) {
            // chain lightning to nearby
            let n = 0;
            for (const f2 of world.fighters) {
              if (n >= d.chain) break;
              if (!f2.alive || f2 === f || f2 === p.owner) continue;
              if (M.dist(f2.x, f2.y, f.x, f.y) < 160) {
                G.vfx.lightningLine(f.x, f.y - f.h / 2, f2.x, f2.y - f2.h / 2);
                f2.damage(d.damage * 0.6, p.owner, 'shock');
                f2.applyStatus('shock', 0.8);
                n++;
              }
            }
          }
          if (d.pierce > 0) { d.pierce--; }
          else { this.explodeProj(p, world); p.dead = true; return; }
        }
      }
      // hooks into props
      if (p.age > 0.05) {
        G.props.damageAt(p.x, p.y, 6, d.damage * 0.5, 'shot');
        G.build.damageAt(p.x, p.y, 8, d.damage, p.owner);
      }
      // effects
      if (d.explode && !d.drag) G.vfx.smokeTrail(p.x, p.y);
      if (d.meteor) G.vfx.meteorTrail(p.x, p.y);
      // fell off map
      if (p.y > world.mapH + 300) p.dead = true;
    },
    explodeProj(p, world) {
      const d = p.def;
      if (d.hooks && d.hooks.onImpact) {
        try { d.hooks.onImpact(G.weaponApi, p.x, p.y, p.owner); } catch (e) { console.error(e); }
      }
      if (d.explode) {
        G.combat.explode(p.x, p.y, d.explode.radius, d.explode.damage, p.owner, d.explode);
      }
      if (d.cluster) {
        for (let i = 0; i < d.cluster.count; i++) {
          const a = -Math.PI / 2 + M.rand(-1.1, 1.1);
          const sp = M.rand(200, 380);
          this.spawn({
            x: p.x, y: p.y - 4,
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            def: { ...d, explode: { radius: d.cluster.radius, damage: d.cluster.damage, knockback: 160, crater: d.cluster.crater }, cluster: null, fuse: 1.1, bounces: 2 },
            owner: p.owner, bomb: true,
          });
        }
      }
      if (d.storm) { /* handled in hooks */ }
    },
    draw(ctx, vb) {
      // beams
      for (const b of this.beams) {
        const a = b.life / b.maxLife;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = b.color;
        ctx.globalAlpha = 0.5 + a * 0.5;
        ctx.lineWidth = 4.5 * a + 1;
        ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
        ctx.strokeStyle = '#fff8e0';
        ctx.lineWidth = 1.6 * a + 0.4;
        ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
        ctx.restore();
      }
      // hooks
      ctx.strokeStyle = 'rgba(59,47,38,0.9)';
      ctx.lineWidth = 2;
      for (const h of this.hooks) {
        if (h.x < vb.x0 - 50 || h.x > vb.x1 + 50) continue;
        ctx.beginPath();
        ctx.moveTo(h.owner.x, h.owner.y - h.owner.h * 0.6);
        ctx.lineTo(h.x, h.y);
        ctx.stroke();
        ctx.fillStyle = '#a8a29a';
        ctx.beginPath(); ctx.arc(h.x, h.y, 3.4, 0, M.TAU); ctx.fill();
        ctx.strokeStyle = '#3b2f26'; ctx.lineWidth = 1.4; ctx.stroke();
      }
      // projectiles
      for (const p of pool.active) {
        if (p.x < vb.x0 - 60 || p.x > vb.x1 + 60 || p.y < vb.y0 - 60 || p.y > vb.y1 + 60) continue;
        const d = p.def;
        const ang = Math.atan2(p.vy, p.vx);
        ctx.save();
        ctx.translate(p.x, p.y);
        if (d.type === 'thrown' || d.spin) ctx.rotate(p.age * 14);
        else ctx.rotate(ang);
        if (d.explode) {
          // bomb/rocket body
          ctx.fillStyle = d.art && d.art.arch === 'can' ? '#c9d4d9' : '#3a3630';
          ctx.beginPath(); ctx.ellipse(0, 0, 8, 6, 0, 0, M.TAU); ctx.fill();
          ctx.strokeStyle = '#241f1a'; ctx.lineWidth = 1.8; ctx.stroke();
          if (d.fuse) {
            ctx.strokeStyle = '#e4573d'; ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.moveTo(4, -4); ctx.quadraticCurveTo(8, -9, 5, -12); ctx.stroke();
            ctx.fillStyle = '#f2b134';
            ctx.beginPath(); ctx.arc(5, -12, 1.6 + Math.sin(p.age * 20) * 0.8, 0, M.TAU); ctx.fill();
          }
        } else if (d.lightning) {
          ctx.strokeStyle = '#e8b93c'; ctx.lineWidth = 2.4;
          ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.stroke();
          ctx.strokeStyle = '#fff8d8'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.stroke();
        } else if (d.beam) {
          // handled by beams
        } else if (d.type === 'thrown') {
          const spr = G.weaponArt.getSprite(d);
          if (spr) ctx.drawImage(spr, -14, -6, 28, 12);
          else { ctx.fillStyle = '#c9c2b4'; ctx.fillRect(-8, -2, 16, 4); }
        } else if (d.art && (d.art.arch === 'orb' || d.art.arch === 'staff')) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = d.art.c1 || '#e8b93c';
          ctx.beginPath(); ctx.arc(0, 0, 5, 0, M.TAU); ctx.fill();
          ctx.globalAlpha = 0.3;
          ctx.beginPath(); ctx.arc(0, 0, 10, 0, M.TAU); ctx.fill();
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
        } else if (d.dragon) {
          const spr = G.weaponArt.getSprite(d);
          if (spr) ctx.drawImage(spr, -16, -8, 32, 16);
        } else {
          // bullet
          ctx.fillStyle = '#2c2420';
          ctx.beginPath(); ctx.ellipse(0, 0, 5 + (d.bulletSize > 3 ? 2 : 0), 2.4, 0, 0, M.TAU); ctx.fill();
          ctx.strokeStyle = 'rgba(44,36,32,0.4)';
          ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-4, 0); ctx.stroke();
        }
        ctx.restore();
      }
    },
  };

  // ---------- combat ----------
  const combat = {
    explode(x, y, r, dmg, owner, opts = {}) {
      const world = G.world;
      if (!world) return;
      // fighters
      for (const f of world.fighters) {
        if (!f.alive) continue;
        if (owner && world.rules.friendlyFire === false && f.team !== 0 && f.team === owner.team) continue;
        const d = M.dist(f.x, f.y - f.h / 2, x, y);
        if (d < r) {
          const k = 1 - d / r;
          f.damage(dmg * (0.5 + 0.5 * k), owner, 'blast');
          const a = M.ang(x, y, f.x, f.y - f.h / 2);
          f.vx += Math.cos(a) * (opts.knockback || 0) * k;
          f.vy += Math.sin(a) * (opts.knockback || 0) * k - 140 * k;
        }
      }
      // terrain
      if (opts.crater) {
        world.terrain.carve(x, y, opts.crater);
        G.props.onTerrainEdit(x, y, opts.crater);
        // scorch decal
        G.vfx.scorch(x, y, opts.crater);
        // debris chunks
        for (let i = 0; i < Math.min(8, Math.floor(opts.crater / 6)); i++) {
          world.spawnBody({
            x: x + M.rand(-opts.crater * 0.5, opts.crater * 0.5),
            y: y + M.rand(-opts.crater * 0.3, opts.crater * 0.3),
            vx: M.rand(-220, 220), vy: M.rand(-320, -60),
            w: M.rand(6, 14), h: M.rand(5, 12),
            color: world.biome.terrainMid || '#bd9f77',
            buoyancy: 0.1, rot: 0, vrot: M.rand(-8, 8), life: 9,
          });
        }
      }
      // props + build pieces
      G.props.damageAt(x, y, r, dmg, 'blast');
      G.build.damageAt(x, y, r, dmg * 1.2, owner);
      // fire
      if (opts.fire) {
        for (let i = 0; i < 10; i++) G.vfx.fire(x + M.rand(-r * 0.6, r * 0.6), y + M.rand(-r * 0.4, r * 0.4), 1.5);
      }
      // fx
      G.vfx.explosion(x, y, r);
      G.audio.play('explosion', { x, y });
      G.camShake(Math.min(14, r * 0.09));
      // scare critters
      G.critters.scare(x, y, r * 3);
      // water splash
      if (world.water.level !== Infinity && world.water.isInside(x, y)) world.water.splash(x, 30);
      // ignite props
      if (opts.fire) {
        for (const p of G.props.all) {
          if (!p.dead && Math.abs(p.x - x) < r * 0.8 && Math.abs(p.y - y) < r) p.burning = p.burning > 0 ? p.burning : 0.01;
        }
      }
    },
  };

  G.projectiles = projectiles;
  G.combat = combat;
})();
