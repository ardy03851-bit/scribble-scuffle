/* ============================================================
   Physics: character controller (game-feel craft) + rigid
   debris bodies with sleep, water interaction, wind coupling.
   ============================================================ */
window.G = window.G || {};
(function () {
  'use strict';
  const M = G.M;

  // ---------- character controller ----------
  // body: {x,y,vx,vy,w,h,onGround,onWallL,onWallR,inWater,inLava,coyote,jumpBuf,jumps}
  function moveCharacter(c, input, dt, world) {
    const terrain = world.terrain;
    const biome = world.biome;
    const onIce = biome.ice;
    const accel = onIce ? 700 : 2600;
    const friction = onIce ? 0.4 : 2000;
    const maxSpeed = 250;
    const gravity = 2200;
    const jumpVel = 660;

    c.coyote = c.coyote !== undefined ? c.coyote : 0;
    c.jumpBuf = c.jumpBuf !== undefined ? c.jumpBuf : 0;
    c.jumps = c.jumps !== undefined ? c.jumps : 0;
    c.wallSlide = 0;
    c.inWater = false; c.inLava = false;

    // --- horizontal input ---
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (dir !== 0) {
      c.vx += dir * accel * dt;
      c.vx = M.clamp(c.vx, -maxSpeed * 1.4, maxSpeed * 1.4);
      if (Math.abs(c.vx) > maxSpeed && Math.sign(c.vx) === dir) c.vx = M.damp(c.vx, dir * maxSpeed, 3, dt);
      c.facing = dir;
    } else {
      // friction
      const f = friction * (onIce ? 0.06 : 1);
      const s = Math.sign(c.vx);
      c.vx -= s * Math.min(Math.abs(c.vx), f * dt);
    }
    // wind push (light)
    c.vx += G.wind.current() * 0.012 * dt;

    // --- vertical ---
    c.vy += gravity * dt;
    if (c.vy > 900) c.vy = 900;

    // water
    if (world.water.level !== Infinity) {
      const inW = world.water.isInside(c.x, c.y - c.h * 0.3);
      if (inW) {
        c.inWater = world.water.type === 'water';
        c.inLava = world.water.type === 'lava';
        if (c.inWater) {
          c.vy -= 2000 * dt;  // buoyancy
          c.vx *= Math.pow(0.4, dt * 2);
          c.vy *= Math.pow(0.3, dt * 2);
          c.jumps = 1; // swimming counts as ground for jumps
          if (input.jump) c.vy = -160;
          if (Math.random() < dt * 6) G.vfx.bubble(c.x + M.rand(-6, 6), c.y - c.h * 0.5);
        }
      }
    }

    // --- wall detection (before move) ---
    const wallL = terrain.solidBox(c.x - c.w / 2 - 3, c.y - c.h * 0.5, 4, c.h * 0.6);
    const wallR = terrain.solidBox(c.x + c.w / 2 + 3, c.y - c.h * 0.5, 4, c.h * 0.6);
    c.onWallL = wallL && input.left;
    c.onWallR = wallR && input.right;
    // wall slide
    if ((c.onWallL || c.onWallR) && c.vy > 0 && !c.onGround) {
      c.vy = Math.min(c.vy, 150);
      c.wallSlide = c.onWallL ? -1 : 1;
      if (Math.random() < dt * 10) G.vfx.dust(c.x + c.wallSlide * c.w / 2, c.y - c.h * 0.4);
    } else c.wallSlide = 0;

    // --- jump buffering + coyote ---
    if (input.jumpPressed) c.jumpBuf = 0.12;
    c.jumpBuf -= dt;
    if (c.onGround) { c.coyote = 0.1; c.jumps = 0; }
    c.coyote -= dt;
    if (c.jumpBuf > 0) {
      if (c.coyote > 0 || c.inWater) {
        c.vy = -jumpVel; c.jumpBuf = 0; c.coyote = 0;
        G.audio.play('jump', { x: c.x, y: c.y });
        G.vfx.dust(c.x, c.y);
      } else if (c.wallSlide !== 0) {
        // wall jump
        c.vy = -jumpVel * 0.95;
        c.vx = -c.wallSlide * 300;
        c.jumpBuf = 0;
        G.audio.play('jump', { x: c.x, y: c.y });
        G.vfx.dust(c.x + c.wallSlide * c.w / 2, c.y - c.h * 0.5);
      } else if (c.jumps < 1) {
        // double jump
        c.vy = -jumpVel * 0.88;
        c.jumps++;
        c.jumpBuf = 0;
        G.audio.play('jump2', { x: c.x, y: c.y });
        G.vfx.ring(c.x, c.y - c.h * 0.3);
      }
    }
    // variable jump height
    if (!input.jump && c.vy < -200) c.vy += 1500 * dt;

    // --- move X with step-up ---
    const stepX = (dx) => {
      if (dx === 0) return;
      const steps = Math.ceil(Math.abs(dx) / (TERRAIN_STEP));
      for (let i = 0; i < steps; i++) {
        const sx = dx / steps;
        const nx = c.x + sx;
        if (!terrain.solidBox(nx, c.y - c.h * 0.5, c.w, c.h * 0.96)) { c.x = nx; continue; }
        // step up over small ledge
        let stepped = false;
        for (let up = 2; up <= 14; up += 2) {
          if (!terrain.solidBox(nx, c.y - c.h * 0.5 - up, c.w, c.h * 0.96)) {
            c.x = nx; c.y -= up; stepped = true; break;
          }
        }
        if (!stepped) { c.vx *= 0.1; break; }
      }
    };
    const TERRAIN_STEP = 6;
    stepX(c.vx * dt);

    // --- move Y with slope snap ---
    const moveY = (dy) => {
      if (dy === 0) return;
      const steps = Math.ceil(Math.abs(dy) / TERRAIN_STEP);
      for (let i = 0; i < steps; i++) {
        const sy = dy / steps;
        const ny = c.y + sy;
        if (!terrain.solidBox(c.x, ny - c.h * 0.5, c.w, c.h * 0.96)) { c.y = ny; continue; }
        if (dy > 0) { c.y = Math.floor((ny - c.h * 0.5) / G.TERRAIN_CELL) * G.TERRAIN_CELL + G.TERRAIN_CELL * 0.01 + c.h * 0.5; c.vy = 0; c.onGround = true; }
        else { c.vy = 0; }
        break;
      }
    };
    const wasGround = c.onGround;
    c.onGround = false;
    moveY(c.vy * dt);
    // slope snap: if was on ground and now slightly above ground, snap down
    if (wasGround && !c.onGround && c.vy >= 0) {
      for (let d = 2; d <= 10; d += 2) {
        if (terrain.solidBox(c.x, c.y + d - c.h * 0.5, c.w, c.h * 0.96)) { c.y += d - 2; c.onGround = true; c.vy = 0; break; }
      }
    }

    // --- bounce pads (build pieces) handled by world ---
    if (c.onGround && !wasGround) {
      // landing squash handled by character anim
      c.landHard = Math.abs(c.vy);
      G.audio.play('land', { x: c.x, y: c.y, vol: 0.4 });
      if (Math.abs(c.vx) > 60) G.vfx.dust(c.x, c.y);
    }
    // footsteps
    if (c.onGround && Math.abs(c.vx) > 60) {
      c._stepT = (c._stepT || 0) - dt * Math.abs(c.vx) / 90;
      if (c._stepT <= 0) { c._stepT = 1; G.audio.play('step', { x: c.x, y: c.y, vol: 0.25 }); }
    }
  }

  // ---------- rigid bodies (debris etc.) ----------
  // body: {x,y,vx,vy,w,h,rot,vrot,color,buoyancy,dead,life,kind}
  const bodies = {
    all: [],
    update(dt, world) {
      const terrain = world.terrain;
      const all = this.all;
      for (let i = all.length - 1; i >= 0; i--) {
        const b = all[i];
        b.life -= dt;
        if (b.life <= 0 || b.y > world.mapH + 400) { all.splice(i, 1); continue; }
        b.vy += 1800 * dt;
        // wind on light debris
        if (b.windMul) b.vx += (G.wind.current() * b.windMul - b.vx) * dt * 0.5;
        // water
        b.inWater = false;
        if (world.water.level !== Infinity && world.water.applyTo(b, dt)) {
          if (world.water.type === 'lava') { b.life -= dt * 8; b.color = '#3a2420'; }
        }
        const px = b.x, py = b.y;
        b.x += b.vx * dt;
        if (terrain.solidBox(b.x, b.y, b.w, b.h)) { b.x = px; b.vx *= -0.4; }
        b.y += b.vy * dt;
        if (terrain.solidBox(b.x, b.y, b.w, b.h)) {
          b.y = py;
          if (b.vy > 260) { // bounce
            b.vy = -b.vy * 0.38;
            b.vrot *= 0.6;
            b.vx *= 0.7;
            if (b.vy > -60) b.vy = 0;
          } else b.vy = 0;
          b.vx *= 0.86; b.vrot *= 0.8;
        }
        b.rot += b.vrot * dt;
        // sleep
        if (Math.abs(b.vx) < 4 && Math.abs(b.vy) < 4 && terrain.solidBox(b.x, b.y + b.h / 2 + 2, b.w, 2)) {
          b.sleep = (b.sleep || 0) + dt;
          if (b.sleep > 0.6) { b.vx = 0; b.vy = 0; b.vrot = 0; }
        } else b.sleep = 0;
      }
      // cap active bodies (memory guard)
      if (all.length > 900) all.splice(0, all.length - 900);
    },
    draw(ctx, vb) {
      for (const b of this.all) {
        if (b.x < vb.x0 - 60 || b.x > vb.x1 + 60 || b.y < vb.y0 - 60 || b.y > vb.y1 + 60) continue;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rot);
        ctx.fillStyle = b.color || '#8a7a5a';
        ctx.strokeStyle = 'rgba(59,47,38,0.85)';
        ctx.lineWidth = 1.6;
        const jw = b.w * (0.85 + ((b.seed || 0) % 30) / 100);
        ctx.beginPath();
        ctx.moveTo(-jw / 2, -b.h / 2);
        ctx.lineTo(jw / 2 - 1, -b.h / 2 + 1);
        ctx.lineTo(jw / 2, b.h / 2 - 1);
        ctx.lineTo(-jw / 2 + 1, b.h / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    },
    clear() { this.all.length = 0; },
  };

  G.moveCharacter = moveCharacter;
  G.bodies = bodies;
})();
