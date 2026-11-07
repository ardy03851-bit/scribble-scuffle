/* ============================================================
   Building: 25+ pieces as rotated boxes stamped into the
   collision grid, HP & crack stages, support graph, materials
   economy, ghost placement UX, gadget behaviours.
   ============================================================ */
window.G = window.G || {};
(function () {
  'use strict';
  const M = G.M;
  const CELL = G.TERRAIN_CELL;

  // ---------- piece catalogue ----------
  const PIECES = {};
  function defPiece(o) {
    PIECES[o.id] = Object.assign({ w: 42, h: 42, hp: 100, cost: 5, material: 'wood', rot: 0, snap: true }, o);
  }
  defPiece({ id: 'wood_block', name: 'Wood Block', w: 42, h: 42, hp: 80, cost: 4, material: 'wood' });
  defPiece({ id: 'stone_block', name: 'Stone Block', w: 42, h: 42, hp: 180, cost: 8, material: 'stone' });
  defPiece({ id: 'metal_block', name: 'Steel Block', w: 42, h: 42, hp: 320, cost: 14, material: 'metal' });
  defPiece({ id: 'brick', name: 'Brick', w: 28, h: 18, hp: 90, cost: 3, material: 'stone' });
  defPiece({ id: 'plank', name: 'Plank', w: 84, h: 14, hp: 45, cost: 3, material: 'wood' });
  defPiece({ id: 'beam', name: 'Long Beam', w: 126, h: 16, hp: 60, cost: 5, material: 'wood' });
  defPiece({ id: 'crate', name: 'Crate', w: 42, h: 42, hp: 70, cost: 4, material: 'wood' });
  defPiece({ id: 'sandbag', name: 'Sandbag', w: 40, h: 26, hp: 60, cost: 3, material: 'cloth' });
  defPiece({ id: 'glass', name: 'Glass Pane', w: 42, h: 42, hp: 20, cost: 2, material: 'glass' });
  defPiece({ id: 'fence', name: 'Fence', w: 42, h: 34, hp: 50, cost: 3, material: 'wood' });
  defPiece({ id: 'pillar', name: 'Pillar', w: 22, h: 84, hp: 140, cost: 5, material: 'stone' });
  defPiece({ id: 'catwalk', name: 'Catwalk', w: 112, h: 16, hp: 70, cost: 6, material: 'metal' });
  defPiece({ id: 'ladder', name: 'Ladder', w: 22, h: 84, hp: 40, cost: 3, material: 'wood', climbable: true });
  defPiece({ id: 'torch', name: 'Torch', w: 12, h: 26, hp: 20, cost: 2, material: 'wood', gadget: 'light' });
  defPiece({ id: 'lantern', name: 'Lantern', w: 18, h: 22, hp: 25, cost: 4, material: 'metal', gadget: 'light' });
  defPiece({ id: 'banner', name: 'Team Banner', w: 30, h: 52, hp: 60, cost: 8, material: 'cloth', gadget: 'respawn' });
  defPiece({ id: 'campfire', name: 'Campfire', w: 40, h: 24, hp: 50, cost: 10, material: 'stone', gadget: 'heal' });
  defPiece({ id: 'spring', name: 'Bounce Spring', w: 36, h: 18, hp: 60, cost: 8, material: 'metal', gadget: 'bounce' });
  defPiece({ id: 'spikes', name: 'Spikes', w: 42, h: 16, hp: 70, cost: 6, material: 'metal', gadget: 'spikes' });
  defPiece({ id: 'tnt', name: 'TNT', w: 36, h: 32, hp: 30, cost: 12, material: 'wood', gadget: 'tnt' });
  defPiece({ id: 'mine', name: 'Proximity Mine', w: 22, h: 12, hp: 15, cost: 9, material: 'metal', gadget: 'mine' });
  defPiece({ id: 'door', name: 'Doorway', w: 42, h: 56, hp: 90, cost: 7, material: 'wood', gadget: 'door' });
  defPiece({ id: 'window', name: 'Window Frame', w: 42, h: 42, hp: 70, cost: 5, material: 'wood', gadget: 'window' });
  defPiece({ id: 'stair', name: 'Stair Step', w: 42, h: 22, hp: 60, cost: 4, material: 'stone' });
  defPiece({ id: 'waterbarrel', name: 'Water Barrel', w: 36, h: 44, hp: 55, cost: 7, material: 'wood', gadget: 'water' });
  defPiece({ id: 'scarecrow', name: 'Scarecrow', w: 36, h: 70, hp: 45, cost: 6, material: 'wood', gadget: 'deco' });
  defPiece({ id: 'flagpole', name: 'Flag Pole', w: 10, h: 100, hp: 50, cost: 5, material: 'wood', gadget: 'deco' });

  const MAT_COLORS = {
    wood: { fill: '#c9a86a', deep: '#a8874a' },
    stone: { fill: '#a8a29a', deep: '#8d8880' },
    metal: { fill: '#9aa4ac', deep: '#7d868d' },
    cloth: { fill: '#d9c9a0', deep: '#b8a87e' },
    glass: { fill: 'rgba(200,230,245,0.55)', deep: 'rgba(160,200,220,0.4)' },
  };

  // ---------- system ----------
  const build = {
    pieces: [],
    selected: 'wood_block',
    rotation: 0,
    ghost: null, // {x,y,valid,reason}
    def(id) { return PIECES[id]; },
    register(o) { defPiece(o); return PIECES[o.id]; },
    catalog() { return Object.values(PIECES); },
    clear() {
      const t = G.world && G.world.terrain;
      if (t) for (const p of this.pieces) this.unstamp(p);
      this.pieces.length = 0;
    },
    // rasterize rotated box into collision grid (value 2)
    stamp(p) {
      const t = G.world.terrain;
      const def = PIECES[p.pieceId];
      const r = p.rot || 0;
      const cos = Math.cos(r), sin = Math.sin(r);
      p.cells = [];
      const c0x = Math.floor((p.x - Math.max(def.w, def.h)) / CELL) - 1;
      const c1x = Math.floor((p.x + Math.max(def.w, def.h)) / CELL) + 1;
      const c0y = Math.floor((p.y - Math.max(def.w, def.h)) / CELL) - 1;
      const c1y = Math.floor((p.y + Math.max(def.w, def.h)) / CELL) + 1;
      for (let cy = c0y; cy <= c1y; cy++) {
        for (let cx = c0x; cx <= c1x; cx++) {
          if (!t.inb(cx, cy)) continue;
          const px = cx * CELL + CELL / 2 - p.x, py = cy * CELL + CELL / 2 - p.y;
          const lx = px * cos + py * sin, ly = -px * sin + py * cos;
          if (Math.abs(lx) <= def.w / 2 + 0.5 && Math.abs(ly) <= def.h / 2 + 0.5) {
            const i = cy * t.cols + cx;
            if (t.grid[i] === 0) {
              t.grid[i] = 2;
              p.cells.push(i);
            }
          }
        }
      }
      t.markChunkAt(Math.floor(p.x / CELL), Math.floor(p.y / CELL));
    },
    unstamp(p) {
      const t = G.world.terrain;
      if (!t || !p.cells) return;
      for (const i of p.cells) if (t.grid[i] === 2) t.grid[i] = 0;
      t.markChunkAt(Math.floor(p.x / CELL), Math.floor(p.y / CELL));
    },
    place(pieceId, x, y, rot, owner, free) {
      const def = PIECES[pieceId];
      if (!def) return null;
      if (!free && owner && owner.mats < def.cost) return null;
      if (owner && !free) owner.mats -= def.cost;
      const p = {
        pieceId, x, y, rot: rot || 0,
        hp: def.hp, maxHp: def.hp,
        owner, dead: false,
        cells: null, t: M.rand(0, 10),
      };
      this.pieces.push(p);
      this.stamp(p);
      G.audio.play('place', { x, y });
      G.bus.emit('piecePlaced', p);
      this.checkSupportAround(p);
      return p;
    },
    placeGadget(ch, kind, x, y) {
      if (kind === 'shieldbubble') {
        this.bubbles.push({ x, y, life: 8, owner: ch });
        G.audio.play('place', { x, y });
      }
    },
    bubbles: [],
    damageAt(x, y, r, dmg, attacker) {
      for (const p of this.pieces) {
        if (p.dead) continue;
        const def = PIECES[p.pieceId];
        if (Math.abs(p.x - x) < r + def.w / 2 && Math.abs(p.y - y) < r + def.h / 2) {
          this.damagePiece(p, dmg, attacker);
        }
      }
    },
    damagePiece(p, dmg, attacker) {
      if (p.dead) return;
      p.hp -= dmg;
      if (p.hp <= 0) this.destroyPiece(p, attacker);
    },
    destroyPiece(p, attacker) {
      if (p.dead) return;
      p.dead = true;
      const def = PIECES[p.pieceId];
      this.unstamp(p);
      const i = this.pieces.indexOf(p);
      if (i >= 0) this.pieces.splice(i, 1);
      // debris
      const col = MAT_COLORS[def.material] || MAT_COLORS.wood;
      const world = G.world;
      for (let k = 0; k < 5; k++) {
        world.spawnBody({
          x: p.x + M.rand(-def.w / 3, def.w / 3), y: p.y + M.rand(-def.h / 3, def.h / 3),
          vx: M.rand(-160, 160), vy: M.rand(-260, -40),
          w: M.rand(6, 12), h: M.rand(5, 10),
          color: col.deep, buoyancy: def.material === 'wood' ? 0.9 : 0.1,
          rot: 0, vrot: M.rand(-7, 7), life: 8,
        });
      }
      G.vfx.debrisBurst(p.x, p.y, def.material);
      G.audio.play('shatter', { x: p.x, y: p.y });
      // TNT chains
      if (def.gadget === 'tnt') {
        G.combat.explode(p.x, p.y, 130, 65, attacker, { knockback: 380, crater: 40 });
      }
      if (def.gadget === 'mine') {
        G.combat.explode(p.x, p.y, 90, 45, attacker, { knockback: 300, crater: 26 });
      }
      if (def.gadget === 'water') {
        // water barrel bursts: splash fx + douse fires
        G.vfx.waterBurst(p.x, p.y);
        for (const pr of G.props.all) if (Math.abs(pr.x - p.x) < 80) pr.burning = -1;
      }
      this.checkSupportAll();
      G.bus.emit('pieceDestroyed', p);
    },
    // support graph: pieces need connection to terrain via touching pieces
    checkSupportAll() {
      const t = G.world.terrain;
      const supported = new Set();
      // seed: pieces whose bottom cells rest on terrain (value 1)
      const queue = [];
      for (const p of this.pieces) {
        let onTerrain = false;
        if (p.cells) for (const ci of p.cells) {
          const cx = ci % t.cols, cy = Math.floor(ci / t.cols);
          // check below
          if (cy + 1 < t.rows) {
            const below = t.grid[(cy + 1) * t.cols + cx];
            if (below === 1) onTerrain = true;
          }
        }
        if (onTerrain) { supported.add(p); queue.push(p); }
      }
      // BFS: neighbours sharing an edge (cell adjacency)
      while (queue.length) {
        const p = queue.pop();
        for (const q of this.pieces) {
          if (supported.has(q)) continue;
          if (Math.abs(q.x - p.x) < 60 && Math.abs(q.y - p.y) < 60 && this.piecesTouch(p, q)) {
            supported.add(q); queue.push(q);
          }
        }
      }
      // unsupported: fall
      for (const p of this.pieces) {
        if (!supported.has(p)) {
          // convert to falling debris + remove
          p.dead = true;
          this.unstamp(p);
          G.world.spawnBody({
            x: p.x, y: p.y, vx: M.rand(-30, 30), vy: 40,
            w: PIECES[p.pieceId].w * 0.5, h: PIECES[p.pieceId].h * 0.5,
            color: (MAT_COLORS[PIECES[p.pieceId].material] || MAT_COLORS.wood).fill,
            buoyancy: 0.4, rot: p.rot, vrot: M.rand(-2, 2), life: 10,
          });
        }
      }
      this.pieces = this.pieces.filter(p => !p.dead);
    },
    checkSupportAround(p) { this.checkSupportAll(); },
    piecesTouch(a, b) {
      // rough: bounding boxes overlap or adjacent
      const da = PIECES[a.pieceId], db = PIECES[b.pieceId];
      return Math.abs(a.x - b.x) < (da.w + db.w) / 2 + CELL && Math.abs(a.y - b.y) < (da.h + db.h) / 2 + CELL;
    },
    // gadget behaviours per tick
    update(dt, world) {
      // bubbles
      for (let i = this.bubbles.length - 1; i >= 0; i--) {
        const b = this.bubbles[i];
        b.life -= dt;
        if (b.life <= 0) this.bubbles.splice(i, 1);
      }
      for (const p of this.pieces) {
        p.t += dt;
        const def = PIECES[p.pieceId];
        if (def.gadget === 'light') {
          G.vfx.light(p.x, p.y - 10, 90, p.pieceId === 'torch' ? 'rgba(255,180,80,' : 'rgba(255,220,140,');
          if (Math.random() < dt * 6) G.vfx.fire(p.x + M.rand(-3, 3), p.y - def.h + 4, 0.7);
        }
        if (def.gadget === 'heal') {
          // campfire: heal nearby allies
          G.vfx.light(p.x, p.y - 8, 70, 'rgba(255,170,70,');
          if (Math.random() < dt * 5) G.vfx.fire(p.x + M.rand(-8, 8), p.y - 8, 0.9);
          for (const f of world.fighters) {
            if (f.alive && M.dist(f.x, f.y, p.x, p.y) < 90) {
              f.heal(6 * dt);
            }
          }
        }
        if (def.gadget === 'bounce') {
          // characters standing on top get launched
          for (const f of world.fighters) {
            if (f.alive && f.onGround && Math.abs(f.x - p.x) < def.w / 2 && Math.abs(f.y - p.y + def.h / 2 + f.h) < 12) {
              f.vy = -900;
              f.squash.kick(0.4);
              G.audio.play('boing', { x: p.x, y: p.y });
              G.vfx.ring(p.x, p.y - 10);
            }
          }
        }
        if (def.gadget === 'spikes') {
          for (const f of world.fighters) {
            if (!f.alive) continue;
            if (f !== p.owner && Math.abs(f.x - p.x) < def.w / 2 && Math.abs(f.y - f.h - p.y) < 14 && f.vy > 40) {
              f.damage(18, p.owner, 'spikes');
              f.vy = -300;
            }
          }
        }
        if (def.gadget === 'mine') {
          for (const f of world.fighters) {
            if (f.alive && f !== p.owner && M.dist(f.x, f.y, p.x, p.y) < 40) {
              this.destroyPiece(p, p.owner);
              break;
            }
          }
        }
        if (def.gadget === 'respawn' && world.mode && world.mode.respawnAtBanner) {
          // banner marks team respawn (used by modes)
        }
      }
    },
    // ---------- placement ----------
    canPlace(pieceId, x, y, rot, ch) {
      const def = PIECES[pieceId];
      if (!def) return { ok: false, reason: 'Unknown piece' };
      if (ch && ch.mats < def.cost) return { ok: false, reason: 'Not enough materials' };
      const d = M.dist(ch ? ch.x : x, ch ? ch.y : y, x, y);
      if (ch && d > 260) return { ok: false, reason: 'Too far' };
      // overlap check: cells under piece must be empty (0)
      const t = G.world.terrain;
      const cos = Math.cos(rot || 0), sin = Math.sin(rot || 0);
      const c0x = Math.floor((x - Math.max(def.w, def.h)) / CELL), c1x = Math.floor((x + Math.max(def.w, def.h)) / CELL);
      const c0y = Math.floor((y - Math.max(def.w, def.h)) / CELL), c1y = Math.floor((y + Math.max(def.w, def.h)) / CELL);
      let needsSupport = true;
      for (let cy = c0y; cy <= c1y; cy++) {
        for (let cx = c0x; cx <= c1x; cx++) {
          if (!t.inb(cx, cy)) continue;
          const px = cx * CELL + CELL / 2 - x, py = cy * CELL + CELL / 2 - y;
          const lx = px * cos + py * sin, ly = -px * sin + py * cos;
          if (Math.abs(lx) <= def.w / 2 && Math.abs(ly) <= def.h / 2) {
            const v = t.grid[cy * t.cols + cx];
            if (v !== 0) return { ok: false, reason: 'Blocked' };
            // support: cell below is solid
            if (cy + 1 < t.rows && t.grid[(cy + 1) * t.cols + cx] !== 0) needsSupport = false;
            if (cy - 1 >= 0 && t.grid[(cy - 1) * t.cols + cx] === 2) needsSupport = false; // attached to piece above
          }
        }
      }
      if (needsSupport) return { ok: false, reason: 'Needs support' };
      return { ok: true, reason: '' };
    },
    updateGhost(ch, world, aimX, aimY) {
      const def = PIECES[this.selected];
      if (!def) { this.ghost = null; return; }
      // place at cursor world pos clamped to reach
      let x = aimX, y = aimY;
      const d = M.dist(ch.x, ch.y, x, y);
      if (d > 240) { const a = M.ang(ch.x, ch.y, x, y); x = ch.x + Math.cos(a) * 240; y = ch.y + Math.sin(a) * 240; }
      // grid snap
      if (def.snap !== false) { x = Math.round(x / CELL) * CELL; y = Math.round(y / CELL) * CELL; }
      const check = this.canPlace(this.selected, x, y, this.rotation, ch);
      this.ghost = { x, y, rot: this.rotation, valid: check.ok, reason: check.reason };
    },
    tryPlaceGhost(ch) {
      if (!this.ghost) return false;
      const g = this.ghost;
      const isPlayer = ch === (G.world && G.world.player);
      if (!g.valid) { if (isPlayer) G.ui && G.ui.toast(g.reason || 'Cannot place here'); return false; }
      const p = this.place(this.selected, g.x, g.y, g.rot, ch);
      if (!p) { if (isPlayer) G.ui.toast('Not enough materials'); return false; }
      G.vfx.placePuff(g.x, g.y);
      return true;
    },
    toolFire(ch, world, input, d) {
      if (d.build) {
        // build placement via primary fire
        this.updateGhost(ch, world, input.aimX !== undefined ? input.aimX : ch.x + Math.cos(ch.aim) * 100, input.aimY !== undefined ? input.aimY : ch.y + Math.sin(ch.aim) * 100);
        this.tryPlaceGhost(ch);
        return;
      }
      if (d.dig) {
        // handled by melee swing in projectiles
      }
    },
    // ---------- rendering ----------
    draw(ctx, vb) {
      for (const p of this.pieces) {
        if (p.x < vb.x0 - 80 || p.x > vb.x1 + 80 || p.y < vb.y0 - 80 || p.y > vb.y1 + 80) continue;
        const def = PIECES[p.pieceId];
        const col = MAT_COLORS[def.material] || MAT_COLORS.wood;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot || 0);
        // shadowed offset fill + ink outline
        const drawBlock = (w, h, fill, deep) => {
          ctx.fillStyle = 'rgba(59,47,38,0.35)';
          ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w, h);
          ctx.fillStyle = fill;
          ctx.fillRect(-w / 2, -h / 2, w, h);
          ctx.fillStyle = deep;
          ctx.fillRect(-w / 2, h / 2 - h * 0.25, w, h * 0.25);
          ctx.strokeStyle = '#3b2f26';
          ctx.lineWidth = 2.2;
          ctx.strokeRect(-w / 2, -h / 2, w, h);
        };
        switch (p.pieceId) {
          case 'plank': case 'beam': case 'catwalk':
            drawBlock(def.w, def.h, col.fill, col.deep);
            ctx.strokeStyle = 'rgba(59,47,38,0.35)'; ctx.lineWidth = 1;
            for (let i = -def.w / 2 + 12; i < def.w / 2; i += 16) { ctx.beginPath(); ctx.moveTo(i, -def.h / 2); ctx.lineTo(i, def.h / 2); ctx.stroke(); }
            break;
          case 'brick':
            drawBlock(def.w, def.h, '#b5623a', '#9c5240');
            break;
          case 'ladder':
            ctx.strokeStyle = '#8a6a4a'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(-def.w / 2 + 3, -def.h / 2); ctx.lineTo(-def.w / 2 + 3, def.h / 2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(def.w / 2 - 3, -def.h / 2); ctx.lineTo(def.w / 2 - 3, def.h / 2); ctx.stroke();
            ctx.lineWidth = 2.4;
            for (let y = -def.h / 2 + 8; y < def.h / 2; y += 12) { ctx.beginPath(); ctx.moveTo(-def.w / 2 + 3, y); ctx.lineTo(def.w / 2 - 3, y); ctx.stroke(); }
            break;
          case 'torch': {
            ctx.strokeStyle = '#8a6a4a'; ctx.lineWidth = 3.4;
            ctx.beginPath(); ctx.moveTo(0, def.h / 2); ctx.lineTo(0, -def.h / 2 + 6); ctx.stroke();
            ctx.fillStyle = '#e8b93c';
            ctx.beginPath(); ctx.ellipse(0, -def.h / 2 + 4, 4, 6, 0, 0, M.TAU); ctx.fill();
            ctx.strokeStyle = '#3b2f26'; ctx.lineWidth = 1.4; ctx.stroke();
            break;
          }
          case 'lantern': {
            drawBlock(def.w, def.h, '#f2e6c0', '#d9c99a');
            ctx.fillStyle = '#ffd98a';
            ctx.beginPath(); ctx.arc(0, 0, 4, 0, M.TAU); ctx.fill();
            break;
          }
          case 'banner': {
            ctx.strokeStyle = '#8a6a4a'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(0, def.h / 2); ctx.lineTo(0, -def.h / 2); ctx.stroke();
            const fl = Math.sin(p.t * 2.5) * 3;
            ctx.fillStyle = (p.owner && p.owner.color) || '#c94a4a';
            ctx.beginPath();
            ctx.moveTo(0, -def.h / 2); ctx.lineTo(def.w + fl, -def.h / 2 + 8);
            ctx.lineTo(def.w + fl, -def.h / 2 + 30); ctx.lineTo(0, -def.h / 2 + 24);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#3b2f26'; ctx.lineWidth = 1.8; ctx.stroke();
            break;
          }
          case 'campfire': {
            ctx.strokeStyle = '#8a6a4a'; ctx.lineWidth = 3.4;
            for (const a of [-0.5, 0.5]) {
              ctx.beginPath(); ctx.moveTo(-12, 8); ctx.lineTo(12 * a, -6); ctx.stroke();
            }
            break;
          }
          case 'spring': {
            drawBlock(def.w, def.h, '#78c6a3', '#5fa98a');
            ctx.strokeStyle = '#3b2f26'; ctx.lineWidth = 2;
            for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 8, -def.h / 2); ctx.quadraticCurveTo(i * 8 + 3, 0, i * 8, def.h / 2); ctx.stroke(); }
            break;
          }
          case 'spikes': {
            ctx.fillStyle = '#9aa4ac';
            for (let i = -2; i <= 2; i++) {
              ctx.beginPath(); ctx.moveTo(i * 9 - 4, def.h / 2); ctx.lineTo(i * 9, -def.h / 2); ctx.lineTo(i * 9 + 4, def.h / 2); ctx.closePath();
              ctx.fill(); ctx.strokeStyle = '#3b2f26'; ctx.lineWidth = 1.4; ctx.stroke();
            }
            break;
          }
          case 'tnt': {
            drawBlock(def.w, def.h, '#c94a4a', '#a03024');
            ctx.fillStyle = '#f2ead8';
            ctx.font = '700 11px "Patrick Hand", cursive';
            ctx.textAlign = 'center';
            ctx.fillText('TNT', 0, 4);
            break;
          }
          case 'mine': {
            drawBlock(def.w, def.h, '#4a4642', '#3a3630');
            ctx.fillStyle = Math.sin(p.t * 6) > 0 ? '#e4573d' : '#7a2a20';
            ctx.beginPath(); ctx.arc(0, 0, 3, 0, M.TAU); ctx.fill();
            break;
          }
          case 'door': {
            drawBlock(def.w, def.h, col.fill, col.deep);
            ctx.strokeStyle = '#3b2f26'; ctx.lineWidth = 2;
            ctx.strokeRect(-def.w / 2 + 6, -def.h / 2 + 6, def.w - 12, def.h - 12);
            break;
          }
          case 'glass': {
            ctx.fillStyle = 'rgba(200,230,245,0.45)';
            ctx.fillRect(-def.w / 2, -def.h / 2, def.w, def.h);
            ctx.strokeStyle = 'rgba(59,47,38,0.8)'; ctx.lineWidth = 2;
            ctx.strokeRect(-def.w / 2, -def.h / 2, def.w, def.h);
            ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.moveTo(-def.w / 2 + 4, def.h / 2 - 4); ctx.lineTo(def.w / 2 - 8, -def.h / 2 + 8); ctx.stroke();
            break;
          }
          case 'waterbarrel': {
            drawBlock(def.w, def.h, '#7a9ab8', '#5f7d99');
            ctx.strokeStyle = 'rgba(59,47,38,0.5)'; ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.moveTo(-def.w / 2, -4); ctx.lineTo(def.w / 2, -4); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-def.w / 2, 8); ctx.lineTo(def.w / 2, 8); ctx.stroke();
            break;
          }
          case 'scarecrow': {
            ctx.strokeStyle = '#8a6a4a'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(0, def.h / 2); ctx.lineTo(0, -def.h / 2 + 14); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-14, -def.h / 2 + 20); ctx.lineTo(14, -def.h / 2 + 20); ctx.stroke();
            ctx.fillStyle = '#e8b93c';
            ctx.beginPath(); ctx.arc(0, -def.h / 2 + 10, 7, 0, M.TAU); ctx.fill();
            ctx.strokeStyle = '#3b2f26'; ctx.lineWidth = 1.6; ctx.stroke();
            break;
          }
          case 'flagpole': {
            ctx.strokeStyle = '#8a6a4a'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(0, def.h / 2); ctx.lineTo(0, -def.h / 2); ctx.stroke();
            const fl = Math.sin(p.t * 3) * 4;
            ctx.fillStyle = '#5b8dd9';
            ctx.beginPath(); ctx.moveTo(0, -def.h / 2); ctx.lineTo(22 + fl, -def.h / 2 + 6); ctx.lineTo(0, -def.h / 2 + 14); ctx.closePath();
            ctx.fill(); ctx.strokeStyle = '#3b2f26'; ctx.lineWidth = 1.6; ctx.stroke();
            break;
          }
          default:
            drawBlock(def.w, def.h, col.fill, col.deep);
            // wood grain / stone speckle
            if (def.material === 'wood') {
              ctx.strokeStyle = 'rgba(59,47,38,0.25)'; ctx.lineWidth = 1;
              ctx.beginPath(); ctx.moveTo(-def.w / 2 + 4, -4); ctx.lineTo(def.w / 2 - 4, -6); ctx.stroke();
              ctx.beginPath(); ctx.moveTo(-def.w / 2 + 6, 8); ctx.lineTo(def.w / 2 - 6, 6); ctx.stroke();
            }
        }
        // crack stages
        const frac = p.hp / p.maxHp;
        if (frac < 0.66) {
          ctx.strokeStyle = '#3b2f26'; ctx.lineWidth = 1.4;
          const rng = G.RNG.make(Math.floor(p.x));
          const n = frac < 0.33 ? 3 : 1;
          for (let i = 0; i < n; i++) {
            let cx0 = rng.range(-def.w / 3, def.w / 3), cy0 = rng.range(-def.h / 3, def.h / 3);
            ctx.beginPath(); ctx.moveTo(cx0, cy0);
            for (let s = 0; s < 3; s++) { cx0 += rng.range(-6, 6); cy0 += rng.range(2, 7); ctx.lineTo(cx0, cy0); }
            ctx.stroke();
          }
        }
        ctx.restore();
      }
      // shield bubbles
      for (const b of this.bubbles) {
        ctx.save();
        ctx.globalAlpha = 0.25 + Math.sin(p2t() * 4) * 0.08;
        ctx.strokeStyle = '#78c6a3';
        ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.arc(b.x, b.y, 46, 0, M.TAU); ctx.stroke();
        ctx.fillStyle = 'rgba(120,198,163,0.1)';
        ctx.fill();
        ctx.restore();
      }
      // ghost
      if (this.ghost && G.world && G.world.player && G.world.player.buildMode) {
        const g = this.ghost;
        const def = PIECES[this.selected];
        ctx.save();
        ctx.translate(g.x, g.y);
        ctx.rotate(g.rot);
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = g.valid ? 'rgba(120,198,163,0.4)' : 'rgba(228,87,61,0.3)';
        ctx.strokeStyle = g.valid ? '#78c6a3' : '#e4573d';
        ctx.lineWidth = 2;
        ctx.fillRect(-def.w / 2, -def.h / 2, def.w, def.h);
        ctx.strokeRect(-def.w / 2, -def.h / 2, def.w, def.h);
        ctx.restore();
        if (!g.valid) {
          ctx.save();
          ctx.font = '600 12px "Patrick Hand", cursive';
          ctx.fillStyle = '#e4573d';
          ctx.textAlign = 'center';
          ctx.fillText(g.reason, g.x, g.y - def.h / 2 - 8);
          ctx.restore();
        }
      }
    },
  };
  function p2t() { return G.world ? G.world.time : 0; }

  // terrain rendering must treat value 2 as solid; patch cellSolid via terrain already checks !== 0? No — it checks ===1.
  // We monkey-patch: terrain grid values: 0 empty, 1 terrain, 2 build piece.
  const origCellSolid = G.Terrain.prototype.cellSolid;
  G.Terrain.prototype.cellSolid = function (cx, cy) {
    if (cx < 0 || cx >= this.cols) return true;
    if (cy < 0 || cy >= this.rows) return false;
    return this.grid[cy * this.cols + cx] !== 0;
  };
  // chunk rendering only draws terrain (value 1)
  const origEnsure = G.Terrain.prototype.ensureChunk;
  G.Terrain.prototype.ensureChunk = function (ci) {
    const ch = origEnsure.call(this, ci);
    return ch;
  };
  // patch renderChunk to skip value 2 cells: wrap generate-time draw by temporarily filtering
  const origRenderChunk = G.Terrain.prototype.renderChunk;
  G.Terrain.prototype.renderChunk = function (ci, ch) {
    // temporarily treat build cells as empty for silhouette
    const saved = [];
    for (let i = 0; i < this.grid.length; i++) {
      if (this.grid[i] === 2) { saved.push(i); this.grid[i] = 0; }
    }
    try { origRenderChunk.call(this, ci, ch); }
    finally { for (const i of saved) this.grid[i] = 2; }
  };

  G.build = build;
  G.BUILD_PIECES = PIECES;
})();
