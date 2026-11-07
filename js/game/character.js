/* ============================================================
   Characters: layered code-drawn figures with procedural
   animation, squash & stretch, alive eyes, cloth, status
   effects. NOT static sprites.
   ============================================================ */
window.G = window.G || {};
(function () {
  'use strict';
  const M = G.M;

  const PLAYER_COLORS = ['#e4573d', '#5b8dd9', '#78c6a3', '#f2b134', '#c78fda', '#5fc9d9', '#e88a5a', '#9ccc65'];

  let nextCharId = 1;

  class Character {
    constructor(opts = {}) {
      this.id = nextCharId++;
      this.name = opts.name || 'Fighter';
      this.isBot = !!opts.isBot;
      this.team = opts.team || 0;         // 0 = ffa
      this.color = opts.color || M.pick(PLAYER_COLORS);
      this.x = opts.x || 100; this.y = opts.y || 100;
      this.px = this.x; this.py = this.y;
      this.vx = 0; this.vy = 0;
      this.w = 24; this.h = 42;
      this.facing = 1;
      this.onGround = false;
      this.alive = true;
      this.maxHp = 100; this.hp = 100;
      this.weapon = null;   // weapon instance
      this.outfit = opts.outfit || G.wardrobe.randomOutfit();
      this.walkPhase = 0;
      this.squash = new G.Spring(220, 16);     // scaleY
      this.lean = new G.Spring(90, 12);
      this.attackT = 0;      // 1 -> 0 swing anim
      this.hurtT = 0;
      this.deathT = 0;
      this.deadRot = 0;
      this.blinkT = M.rand(1, 4);
      this.blink = 0;
      this.aim = 0;          // angle
      this.status = { burn: 0, chill: 0, shock: 0 };
      this.cloth = null;
      this.cloths = [];
      this.score = 0;
      this.kills = 0;
      this.deaths = 0;
      this.respawnT = 0;
      this.lastHitBy = null;
      this.lastHitTime = 0;
      this.input = { left: false, right: false, jump: false, jumpPressed: false, fire: false, aimX: 1, aimY: 0, build: null };
      this.buildMode = null;
      this.mats = 0;         // building materials
      this.spawnProtect = 1.5;
      this.hitStop = 0;
    }

    get headR() { return 8.5; }
    headPos() { return { x: this.x, y: this.y - this.h + this.headR }; }

    respawn(x, y) {
      this.x = x; this.y = y; this.px = x; this.py = y;
      this.vx = 0; this.vy = 0;
      this.alive = true; this.hp = this.maxHp;
      this.deathT = 0; this.deadRot = 0;
      this.status = { burn: 0, chill: 0, shock: 0 };
      this.spawnProtect = 1.5;
      this.aim = 0;
      this.cloths.forEach(c => { c.init = false; });
    }

    damage(amount, attacker, cause) {
      if (!this.alive || this.spawnProtect > 0) return;
      // no damage during war build phase
      const w = G.world;
      if (w && w.buildPhase && w.buildPhase.t > 0) return;
      this.hp -= amount;
      this.hurtT = 0.25;
      this.lastHitBy = attacker || null;
      this.lastHitTime = G.world ? G.world.time : 0;
      if (attacker && attacker.isBot === undefined && cause === undefined) cause = 'hit';
      G.bus.emit('damaged', { target: this, amount, attacker });
      if (this.hp <= 0) this.die(attacker, cause);
    }
    heal(amount) { this.hp = Math.min(this.maxHp, this.hp + amount); }
    die(attacker, cause) {
      if (!this.alive) return;
      this.alive = false;
      this.hp = 0;
      this.deathT = 0.001;
      G.bus.emit('death', { target: this, attacker, cause });
      // death particles
      for (let i = 0; i < 12; i++) G.vfx.inkDrop(this.x + M.rand(-8, 8), this.y - this.h * 0.5 + M.rand(-10, 10));
      G.audio.play('death', { x: this.x, y: this.y });
    }
    applyStatus(kind, t) {
      this.status[kind] = Math.max(this.status[kind], t);
    }

    update(dt, world) {
      if (!this.alive) {
        this.deathT += dt;
        this.deadRot = Math.min(1, this.deathT * 2.2) * (Math.PI / 2) * (this.facing > 0 ? 1 : -1);
        // body settles
        this.vy += 1800 * dt;
        this.y += this.vy * dt;
        if (world.terrain.solidBox(this.x, this.y, this.w, 4)) { this.vy = 0; this.y -= 1; }
        return;
      }
      this.spawnProtect = Math.max(0, this.spawnProtect - dt);
      if (this.hitStop > 0) { this.hitStop -= dt; return; }

      // status effects
      if (this.status.burn > 0) {
        this.status.burn -= dt;
        this.damage(6 * dt, this.status.burnBy, 'burning');
        if (Math.random() < dt * 10) G.vfx.fire(this.x + M.rand(-8, 8), this.y - M.rand(4, this.h));
      }
      if (this.status.chill > 0) {
        this.status.chill -= dt;
        if (Math.random() < dt * 5) G.vfx.snowflake(this.x + M.rand(-8, 8), this.y - M.rand(0, this.h));
      }
      if (this.status.shock > 0) {
        this.status.shock -= dt;
        if (Math.random() < dt * 8) G.vfx.spark(this.x, this.y - this.h * 0.5);
      }
      const chilled = this.status.chill > 0;

      // input (from controller: human input or bot AI)
      const input = this.controller ? this.controller.getInput(this, world) : this.input;
      this.input = input;
      if (this.status.shock > 0) { input.left = input.right = false; input.jump = false; }

      // movement
      G.moveCharacter(this, input, dt, world);
      if (chilled) this.vx *= 0.94; // chilled: sluggish ground control
      this.walkPhase += Math.abs(this.vx) * dt * 0.09;

      // aim
      if (input.aimX !== undefined && (input.aimX !== 0 || input.aimY !== 0)) {
        this.aim = Math.atan2(input.aimY, input.aimX);
        if (Math.abs(Math.cos(this.aim)) > 0.2) this.facing = Math.cos(this.aim) > 0 ? 1 : -1;
      }

      // squash triggers
      if (this.landHard !== undefined && this.landHard > 50) {
        this.squash.kick(-Math.min(0.35, this.landHard / 2600));
        this.landHard = undefined;
      }
      if (input.jumpPressed && this.onGround) this.squash.kick(0.18);
      this.squash.step(dt);
      this.lean.target = M.clamp(this.vx / 260, -1, 1) * 0.18;
      this.lean.step(dt);

      // attack timing
      if (this.attackT > 0) this.attackT = Math.max(0, this.attackT - dt * 4);
      if (this.hurtT > 0) this.hurtT -= dt;

      // blink
      this.blinkT -= dt;
      if (this.blinkT <= 0) { this.blink = 0.15; this.blinkT = M.rand(2, 5); }
      if (this.blink > 0) this.blink -= dt;

      // weapon fire
      if (this.weapon && input.fire) {
        this.weapon.tryFire(this, world, input);
      }

      // cloth
      this.updateCloth(dt, world);

      // fell off map
      if (this.y > world.mapH + 160) this.die(null, 'the fall');

      this.px = this.x; this.py = this.y;
    }

    updateCloth(dt, world) {
      if (!this.cloths.length) return;
      const vb = world.viewBounds;
      const visible = this.x > vb.x0 - 100 && this.x < vb.x1 + 100;
      if (!visible && G.engine.qualityTier !== 'high') { this.cloths.forEach(c => c.init = false); return; }
      const windF = { x: G.wind.gustAt(this.x, world.time) * 1.4 - this.vx * 0.8, y: 0 };
      const shoulder = this.shoulderPos();
      for (const c of this.cloths) {
        c.setAnchor(shoulder.x, shoulder.y, this.vx, this.vy);
        c.step(dt, windF, this.inWater);
      }
    }
    shoulderPos() {
      return { x: this.x, y: this.y - this.h * 0.72 };
    }

    // ---------- drawing ----------
    draw(ctx, alpha) {
      const rx = M.lerp(this.px, this.x, alpha);
      const ry = M.lerp(this.py, this.y, alpha);
      const far = this.isFar();
      ctx.save();
      ctx.translate(rx, ry);
      // death: rotate over
      if (!this.alive) {
        ctx.rotate(this.deadRot);
      }
      // squash & lean
      const sy = 1 + this.squash.x;
      const sx = 1 - this.squash.x * 0.6;
      ctx.rotate(this.lean.x);
      ctx.scale(sx, sy);

      const t = this.walkPhase;
      const walking = Math.abs(this.vx) > 30 && this.onGround;
      const air = !this.onGround;
      const bob = walking ? Math.abs(Math.sin(t)) * 1.6 : 0;
      const bodyY = -this.h * 0.5 - bob;   // torso center
      const headY = -this.h + this.headR - bob * 0.5;
      const skin = this.outfit.skin || '#e8c39a';
      const ink = '#3b2f26';
      const facing = this.facing;

      // ---- legs ----
      const legY = -this.h * 0.22;
      const swing = walking ? Math.sin(t) * 6 : 0;
      const legPose = air ? (this.vy < 0 ? [4, -3] : [7, 2]) : [swing, -swing];
      const legsColor = this.outfit.legsColor || '#6a5a8a';
      // back leg
      this.drawLeg(ctx, legPose[1], legY, legsColor, ink, facing, false);
      // front leg
      this.drawLeg(ctx, legPose[0], legY, legsColor, ink, facing, true);

      // ---- back items (cape behind body) ----
      if (this.outfit.items.back && !far) {
        const item = G.wardrobe.get(this.outfit.items.back);
        if (item && item.behind) item.draw(ctx, this, { bodyY, headY, ink, facing });
      }
      // cloth (cape physics) drawn behind body
      for (const c of this.cloths) c.draw(ctx, facing);

      // ---- torso ----
      const torsoW = 15, torsoH = 16;
      ctx.save();
      ctx.translate(0, bodyY);
      const p = new Path2D();
      p.moveTo(-torsoW / 2, -torsoH / 2);
      p.quadraticCurveTo(-torsoW / 2 - 1, 0, -torsoW / 2 + 1, torsoH / 2);
      p.lineTo(torsoW / 2 - 1, torsoH / 2);
      p.quadraticCurveTo(torsoW / 2 + 1, 0, torsoW / 2, -torsoH / 2);
      p.closePath();
      ctx.fillStyle = this.outfit.torsoColor || this.color;
      // misregistered fill
      ctx.save(); ctx.translate(facing * 1.2, -0.8); ctx.fill(p); ctx.restore();
      ctx.strokeStyle = ink; ctx.lineWidth = 2.2; ctx.stroke(p);
      ctx.restore();

      // ---- arms ----
      const armY = bodyY - 5;
      const recoil = this.weapon && this.weapon.recoilT > 0 ? this.weapon.recoilT * 3 : 0;
      const aimA = this.aim;
      // back arm
      ctx.strokeStyle = skin; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, armY);
      ctx.lineTo(-facing * 7, armY + 8 + Math.sin(t) * 1.5); ctx.stroke();
      ctx.strokeStyle = ink; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(0, armY); ctx.lineTo(-facing * 7, armY + 8 + Math.sin(t) * 1.5); ctx.stroke();
      // front arm: aims weapon
      const armLen = 10 + recoil * -2;
      const hx = Math.cos(aimA) * armLen, hy = Math.sin(aimA) * armLen;
      ctx.strokeStyle = skin; ctx.lineWidth = 4.4;
      ctx.beginPath(); ctx.moveTo(0, armY); ctx.lineTo(hx, armY + hy); ctx.stroke();
      ctx.strokeStyle = ink; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(0, armY); ctx.lineTo(hx, armY + hy); ctx.stroke();

      // ---- head ----
      ctx.save();
      ctx.translate(0, headY);
      // slight head tilt toward aim
      ctx.rotate(Math.sin(aimA) * 0.12);
      ctx.beginPath();
      ctx.arc(0, 0, this.headR, 0, M.TAU);
      ctx.fillStyle = skin;
      ctx.save(); ctx.translate(0.8, -0.6); ctx.fill(); ctx.restore();
      ctx.strokeStyle = ink; ctx.lineWidth = 2.2; ctx.stroke();
      // face items (glasses etc) drawn by wardrobe on face slot
      // eyes look toward aim
      const eyeX = facing * 2.4 + Math.cos(aimA) * 1.6;
      const eyeY = Math.sin(aimA) * 1.4 - 0.5;
      if (this.alive) {
        const blinking = this.blink > 0;
        ctx.fillStyle = ink;
        if (!blinking) {
          ctx.beginPath(); ctx.arc(eyeX - 2.6, eyeY, 1.4, 0, M.TAU); ctx.fill();
          ctx.beginPath(); ctx.arc(eyeX + 2.6, eyeY, 1.4, 0, M.TAU); ctx.fill();
        } else {
          ctx.strokeStyle = ink; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(eyeX - 4, eyeY); ctx.lineTo(eyeX - 1.2, eyeY); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(eyeX + 1.2, eyeY); ctx.lineTo(eyeX + 4, eyeY); ctx.stroke();
        }
        // hurt squint
        if (this.hurtT > 0) {
          ctx.strokeStyle = ink; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(eyeX - 5, eyeY - 3); ctx.lineTo(eyeX - 1, eyeY - 4.5); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(eyeX + 1, eyeY - 4.5); ctx.lineTo(eyeX + 5, eyeY - 3); ctx.stroke();
        }
      } else {
        // X eyes
        ctx.strokeStyle = ink; ctx.lineWidth = 1.4;
        for (const ex of [eyeX - 2.6, eyeX + 2.6]) {
          ctx.beginPath(); ctx.moveTo(ex - 1.6, eyeY - 1.6); ctx.lineTo(ex + 1.6, eyeY + 1.6); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(ex + 1.6, eyeY - 1.6); ctx.lineTo(ex - 1.6, eyeY + 1.6); ctx.stroke();
        }
        // tongue
        ctx.strokeStyle = '#c96a6a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(facing * 2, this.headR * 0.5); ctx.lineTo(facing * 4, this.headR * 0.8); ctx.stroke();
      }
      ctx.restore();

      // ---- wardrobe overlays (head, face, torso, outer, feet, held) ----
      if (!far) {
        for (const slot of ['feet', 'legs', 'outer', 'torsoWear', 'head', 'face', 'held']) {
          const id = this.outfit.items[slot];
          if (!id) continue;
          const item = G.wardrobe.get(id);
          if (item && !item.behind) item.draw(ctx, this, { bodyY, headY, ink, facing, bob });
        }
      }

      // ---- weapon in hand ----
      if (this.weapon && this.alive) {
        const hx2 = Math.cos(aimA) * armLen, hy2 = armY + Math.sin(aimA) * armLen;
        ctx.save();
        ctx.translate(hx2, hy2);
        ctx.rotate(aimA);
        const scale = this.weapon.def.displayScale || 1;
        ctx.scale(scale, scale);
        const spr = G.weaponArt.getSprite(this.weapon.def);
        if (spr) {
          const w = this.weapon.def.spriteW || 40, h = this.weapon.def.spriteH || 18;
          ctx.drawImage(spr, -4, -h / 2, w, h);
        }
        ctx.restore();
        // muzzle flash
        if (this.weapon.muzzleT > 0) {
          ctx.save();
          ctx.translate(hx2 + Math.cos(aimA) * 18, hy2 + Math.sin(aimA) * 18);
          ctx.rotate(aimA);
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = 'rgba(255,220,120,0.9)';
          ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(12 + this.weapon.muzzleT * 22, 0); ctx.lineTo(0, 4); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
      }

      // spawn protection shimmer
      if (this.spawnProtect > 0 && this.alive) {
        ctx.globalAlpha = 0.25 + Math.sin(G.world.time * 12) * 0.1;
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, -this.h / 2, 26, 0, M.TAU); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // hurt flash
      if (this.hurtT > 0) {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = `rgba(255,80,60,${this.hurtT * 0.8})`;
        ctx.fillRect(-20, -this.h - 4, 40, this.h + 8);
      }
      ctx.restore();

      // name tag + hp bar (drawn unsquashed)
      this.drawTag(ctx, rx, ry);
    }

    drawLeg(ctx, swing, legY, color, ink, facing, front) {
      const kneeX = swing * 0.6, footX = swing;
      ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, legY);
      ctx.quadraticCurveTo(kneeX, legY + 7, footX, legY + this.h * 0.22);
      ctx.stroke();
      ctx.strokeStyle = ink; ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, legY);
      ctx.quadraticCurveTo(kneeX, legY + 7, footX, legY + this.h * 0.22);
      ctx.stroke();
      // foot
      if (front) {
        const fx = footX, fy = legY + this.h * 0.22;
        ctx.strokeStyle = ink; ctx.lineWidth = 3.4;
        ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + facing * 4, fy); ctx.stroke();
      }
    }
    drawTag(ctx, rx, ry) {
      const world = G.world;
      if (!world) return;
      const showNames = world.rules && world.rules.showNames !== false;
      const isSelf = world.player === this;
      if (!showNames && !isSelf) return;
      // far LOD: skip tags
      if (this.isFar()) return;
      ctx.save();
      ctx.translate(rx, ry);
      const w = 34;
      // hp bar
      const hpFrac = M.clamp(this.hp / this.maxHp, 0, 1);
      ctx.fillStyle = 'rgba(59,47,38,0.75)';
      ctx.fillRect(-w / 2 - 1, -this.h - 14, w + 2, 6);
      ctx.fillStyle = hpFrac > 0.35 ? '#78c6a3' : (Math.sin(G.world.time * 10) > 0 ? '#e4573d' : '#a03024');
      ctx.fillRect(-w / 2, -this.h - 13, w * hpFrac, 4);
      // name
      ctx.font = '600 9px "Patrick Hand", cursive';
      ctx.textAlign = 'center';
      ctx.fillStyle = isSelf ? '#2c2420' : 'rgba(59,47,38,0.85)';
      ctx.fillText(isSelf ? 'YOU' : this.name, 0, -this.h - 17);
      ctx.restore();
    }
    isFar() {
      const cam = G.renderer.camera;
      const d = Math.abs(this.x - cam.x);
      return d > 1800 / cam.zoom;
    }
  }

  G.Character = Character;
  G.PLAYER_COLORS = PLAYER_COLORS;
})();
