/* ============================================================
   HUD + UI layer: score chips, weapon card, kill feed,
   banners, weapon reveal, minimap, off-screen arrows,
   build bar, scoreboard, touch controls, toasts.
   ============================================================ */
window.G = window.G || {};
(function () {
  'use strict';
  const M = G.M;

  const hudEl = document.getElementById('hud');
  const touchEl = document.getElementById('touch-controls');
  const toastsEl = document.getElementById('toasts');
  let built = false;

  // ---------- UI object (used by game code) ----------
  const ui = {
    banner(text, color) {
      if (!built) return;
      const el = document.createElement('div');
      el.className = 'banner';
      el.textContent = text;
      if (color) el.style.color = color;
      hudEl.querySelector('.ss-banners').appendChild(el);
      setTimeout(() => el.classList.add('out'), 1600);
      setTimeout(() => el.remove(), 2100);
    },
    toast(text) {
      const el = document.createElement('div');
      el.className = 'toast';
      el.textContent = text;
      toastsEl.appendChild(el);
      setTimeout(() => el.classList.add('out'), 2200);
      setTimeout(() => el.remove(), 2700);
    },
    weaponToast(f, def) {
      if (f === G.world.player) this.toast('Picked up: ' + def.name);
    },
    showWeaponReveal(fighters, cb) {
      const wrap = document.createElement('div');
      wrap.className = 'reveal-wrap';
      const cards = fighters.slice(0, 8).map((f, i) => {
        const def = f.weapon ? f.weapon.def : null;
        const card = document.createElement('div');
        card.className = 'reveal-card';
        card.style.setProperty('--rot', M.rand(-4, 4).toFixed(1) + 'deg');
        card.style.animationDelay = (i * 0.09) + 's';
        const tier = def ? G.weapons.tiers[def.tier] : null;
        card.innerHTML = `
          <div class="rc-head" style="color:${f.color}">${f === G.world.player ? 'YOU' : f.name}</div>
          <div class="rc-sprite"></div>
          <div class="rc-name" style="color:${tier ? tier.color : '#3b2f26'}">${def ? def.name : '—'}</div>
          <div class="rc-tier">${tier ? tier.label : ''}</div>
          <div class="rc-desc">${def && def.desc ? def.desc : ''}</div>`;
        if (def) {
          const c = document.createElement('canvas');
          const spr = G.weaponArt.getSprite(def);
          if (spr) {
            c.width = 120; c.height = 60;
            const g = c.getContext('2d');
            g.imageSmoothingEnabled = true;
            g.drawImage(spr, 8, 6, 104, 48);
            card.querySelector('.rc-sprite').appendChild(c);
          }
        }
        if (def && def.tier === 'mythic') card.classList.add('mythic');
        return card;
      });
      cards.forEach(c => wrap.appendChild(c));
      document.getElementById('screens').appendChild(wrap);
      G.audio.play('roundstart');
      // mythic sting
      const mythic = fighters.some(f => f.weapon && f.weapon.def.tier === 'mythic');
      if (mythic) setTimeout(() => G.audio.play('mythic'), 500);
      setTimeout(() => wrap.classList.add('out'), 2100);
      setTimeout(() => { wrap.remove(); cb && cb(); }, 2500);
    },
    showVictory(match) {
      G.victory3d.show(match);
    },
  };
  G.ui = ui;

  // ---------- HUD ----------
  const hud = {
    build() {
      hudEl.innerHTML = `
        <div class="ss-banners"></div>
        <div class="hud-tl"><div class="score-chips"></div></div>
        <div class="hud-tc"><div class="round-label"></div><div class="round-timer"></div></div>
        <div class="hud-tr">
          <div class="fps-readout"></div>
          <button class="hbtn" data-act="pause" aria-label="Pause">II</button>
          <button class="hbtn" data-act="fullscreen" aria-label="Fullscreen">⛶</button>
        </div>
        <div class="hud-weapon"></div>
        <div class="hud-hp"><div class="hp-bar"><div class="hp-fill"></div></div><div class="hp-text"></div></div>
        <div class="kill-feed"></div>
        <div class="hud-build hidden"></div>
        <canvas class="minimap hidden"></canvas>
        <canvas class="arrows"></canvas>
        <div class="scoreboard hidden"></div>`;
      built = true;
      hudEl.querySelector('[data-act="pause"]').addEventListener('click', () => G.main.togglePause());
      hudEl.querySelector('[data-act="fullscreen"]').addEventListener('click', () => G.main.toggleFullscreen());
      this.minimap = hudEl.querySelector('.minimap');
      this.arrows = hudEl.querySelector('.arrows');
      this.buildBarBuilt = false;
    },
    show() { hudEl.classList.remove('hidden'); },
    hide() { hudEl.classList.add('hidden'); },

    update(match) {
      if (!built || !match) return;
      const w = match.world;
      const p = w.player;
      // score chips
      const chipsEl = hudEl.querySelector('.score-chips');
      const fighters = w.fighters.slice().sort((a, b) => b.score - a.score);
      if (this._chipSig !== fighters.map(f => f.id + ':' + f.score).join(',')) {
        this._chipSig = fighters.map(f => f.id + ':' + f.score).join(',');
        chipsEl.innerHTML = '';
        const max = fighters.length > 10 ? 10 : fighters.length;
        const leaderScore = fighters.length ? fighters[0].score : 0;
        for (let i = 0; i < max; i++) {
          const f = fighters[i];
          const chip = document.createElement('div');
          chip.className = 'chip' + (f === p ? ' me' : '') + (!f.alive ? ' dead' : '');
          chip.innerHTML = `<span class="chip-dot" style="background:${f.color}"></span>${f === p ? 'YOU' : f.name}<span class="chip-score">${f.score}</span>${f.score === leaderScore && leaderScore > 0 ? '<span class="chip-crown">♛</span>' : ''}`;
          chipsEl.appendChild(chip);
        }
      }
      // round label + timer
      hudEl.querySelector('.round-label').textContent = `Round ${match.round} · first to ${match.targetScore}`;
      const tEl = hudEl.querySelector('.round-timer');
      if (w.roundTime > 0) {
        const left = Math.max(0, w.roundTime - w.roundElapsed);
        tEl.textContent = w.suddenDeath ? 'SUDDEN DEATH' : Math.floor(left / 60) + ':' + String(Math.floor(left % 60)).padStart(2, '0');
        tEl.classList.toggle('danger', w.suddenDeath || left < 15);
      } else tEl.textContent = '';
      // war build phase
      if (w.buildPhase && w.buildPhase.t > 0) {
        tEl.textContent = 'BUILD: ' + Math.ceil(w.buildPhase.t) + 's';
        tEl.classList.add('danger');
      } else tEl.classList.remove('danger');
      // fps
      hudEl.querySelector('.fps-readout').textContent = G.engine.fps + ' fps · ' + G.engine.qualityTier;
      // weapon card
      const wEl = hudEl.querySelector('.hud-weapon');
      if (p && p.weapon) {
        const def = p.weapon.def;
        const tier = G.weapons.tiers[def.tier];
        const ammo = def.mag === Infinity ? '∞' : p.weapon.ammo + '/' + def.mag;
        const reloading = p.weapon.reloadT > 0;
        const charge = def.charge > 0 ? Math.min(1, p.weapon.chargeT / def.charge) : 0;
        if (this._wSig !== def.id + ammo + reloading + (charge.toFixed(1))) {
          this._wSig = def.id + ammo + reloading + charge.toFixed(1);
          wEl.innerHTML = `
            <div class="wc-card" style="--rc:${tier.color}">
              <div class="wc-sprite"></div>
              <div class="wc-info">
                <div class="wc-name">${def.name}</div>
                <div class="wc-tier">${tier.label}</div>
                <div class="wc-ammo">${reloading ? 'RELOADING' : ammo}</div>
                <div class="wc-bars">
                  ${reloading ? `<div class="wc-bar reload"><div class="wc-fill" style="width:${(1 - p.weapon.reloadT / def.reload) * 100}%"></div></div>` : ''}
                  ${charge > 0 ? `<div class="wc-bar charge"><div class="wc-fill" style="width:${charge * 100}%"></div></div>` : ''}
                </div>
                <div class="wc-status">${p.status.burn > 0 ? 'BURNING' : p.status.chill > 0 ? 'CHILLED' : p.status.shock > 0 ? 'SHOCKED' : ''}</div>
              </div>
            </div>`;
          const c = document.createElement('canvas');
          c.width = 110; c.height = 50;
          const g = c.getContext('2d');
          const spr = G.weaponArt.getSprite(def);
          if (spr) g.drawImage(spr, 5, 5, 100, 40);
          wEl.querySelector('.wc-sprite').appendChild(c);
        }
      }
      // hp
      const hpFill = hudEl.querySelector('.hp-fill');
      const hpText = hudEl.querySelector('.hp-text');
      if (p) {
        const frac = M.clamp(p.hp / p.maxHp, 0, 1);
        hpFill.style.width = (frac * 100) + '%';
        hpFill.classList.toggle('low', frac < 0.3);
        hpText.textContent = p.alive ? Math.ceil(p.hp) + ' HP' : 'DOWN';
        if (!p.alive && match.modeDef().respawn) hpText.textContent = 'Respawning ' + Math.ceil(p.respawnT) + 's';
        // mats
        hpText.textContent += ' · ' + Math.floor(p.mats) + ' mats';
      }
      // kill feed
      const kf = hudEl.querySelector('.kill-feed');
      for (let i = w.killFeed.length - 1; i >= 0; i--) {
        const k = w.killFeed[i];
        k.t -= w.lastDt;
        if (k.t <= 0) { w.killFeed.splice(i, 1); continue; }
      }
      if (this._kfSig !== w.killFeed.map(k => k.text).join('|')) {
        this._kfSig = w.killFeed.map(k => k.text).join('|');
        kf.innerHTML = '';
        for (const k of w.killFeed) {
          const el = document.createElement('div');
          el.className = 'kf-row';
          el.textContent = k.text;
          kf.appendChild(el);
        }
      }
      // minimap
      this.updateMinimap(w);
      // arrows
      this.updateArrows(w);
      // scoreboard
      const sb = hudEl.querySelector('.scoreboard');
      if (this.showScoreboard) {
        sb.classList.remove('hidden');
        sb.innerHTML = '<div class="sb-title">SCOREBOARD</div>' + fighters.map(f =>
          `<div class="sb-row${f === p ? ' me' : ''}"><span class="sb-dot" style="background:${f.color}"></span><span class="sb-name">${f === p ? 'YOU' : f.name}</span><span class="sb-k">${f.kills}</span><span class="sb-d">${f.deaths}</span><span class="sb-s">${f.score}</span></div>`
        ).join('');
      } else sb.classList.add('hidden');
      // build bar
      this.updateBuildBar(w);
    },
    updateMinimap(w) {
      const mm = this.minimap;
      if (!w.big) { mm.classList.add('hidden'); return; }
      mm.classList.remove('hidden');
      const W = 160, H = Math.round(160 * w.mapH / w.mapW);
      if (mm.width !== W) { mm.width = W; mm.height = H; }
      const g = mm.getContext('2d');
      g.fillStyle = 'rgba(242,234,216,0.8)';
      g.fillRect(0, 0, W, H);
      // terrain silhouette (sampled)
      g.fillStyle = 'rgba(90,74,58,0.6)';
      const step = 4;
      for (let x = 0; x < W; x += step) {
        const wx = x / W * w.mapW;
        const sy = w.terrain.surfaceY(wx);
        g.fillRect(x, sy / w.mapH * H, step, H - sy / w.mapH * H);
      }
      // water
      if (w.water.level !== Infinity) {
        g.fillStyle = w.water.type === 'lava' ? 'rgba(230,100,44,0.5)' : 'rgba(90,140,180,0.4)';
        g.fillRect(0, w.water.level / w.mapH * H, W, H);
      }
      // fighters
      for (const f of w.fighters) {
        if (!f.alive) continue;
        g.fillStyle = f === w.player ? '#2c2420' : f.color;
        const r = f === w.player ? 3 : 2;
        g.beginPath();
        g.arc(f.x / w.mapW * W, f.y / w.mapH * H, r, 0, M.TAU);
        g.fill();
        if (f === w.player) { g.strokeStyle = '#fff'; g.lineWidth = 1; g.stroke(); }
      }
      // ring
      if (w.ring) {
        g.strokeStyle = '#e8b93c';
        g.lineWidth = 1.4;
        g.beginPath(); g.arc(w.ring.x / w.mapW * W, w.ring.y / w.mapH * H, 5, 0, M.TAU); g.stroke();
      }
      // supply drops
      g.fillStyle = '#c9a86a';
      for (const d of w.supplyDrops) g.fillRect(d.x / w.mapW * W - 1, d.y / w.mapH * H - 1, 3, 3);
      // view rect
      const cam = G.renderer.camera;
      const vb = G.viewBounds(0);
      g.strokeStyle = 'rgba(59,47,38,0.7)';
      g.lineWidth = 1;
      g.strokeRect(vb.x0 / w.mapW * W, vb.y0 / w.mapH * H, (vb.x1 - vb.x0) / w.mapW * W, (vb.y1 - vb.y0) / w.mapH * H);
      mm.style.height = H + 'px';
    },
    updateArrows(w) {
      const c = this.arrows;
      const dpr = G.renderer.dpr;
      const W = Math.round(G.renderer.cssW * dpr), H = Math.round(G.renderer.cssH * dpr);
      if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
      const g = c.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, G.renderer.cssW, G.renderer.cssH);
      if (!w.big || !w.player) return;
      const p = w.player;
      const margin = 26;
      for (const f of w.fighters) {
        if (!f.alive || f === p) continue;
        const s = G.worldToScreen(f.x, f.y - f.h / 2);
        const sx = s.x / dpr, sy = s.y / dpr;
        if (sx > 0 && sx < G.renderer.cssW && sy > 0 && sy < G.renderer.cssH) continue;
        // clamp to edge
        const cx = M.clamp(sx, margin, G.renderer.cssW - margin);
        const cy = M.clamp(sy, margin, G.renderer.cssH - margin);
        const a = Math.atan2(sy - G.renderer.cssH / 2, sx - G.renderer.cssW / 2);
        g.save();
        g.translate(cx, cy);
        g.rotate(a);
        g.fillStyle = f.color;
        g.beginPath();
        g.moveTo(10, 0); g.lineTo(-6, -6); g.lineTo(-6, 6);
        g.closePath();
        g.fill();
        g.strokeStyle = 'rgba(44,36,32,0.8)';
        g.lineWidth = 1.4;
        g.stroke();
        g.restore();
      }
    },
    // ---------- build bar ----------
    updateBuildBar(w) {
      const p = w.player;
      const bar = hudEl.querySelector('.hud-build');
      const inBuild = p && p.buildMode;
      if (!inBuild) { bar.classList.add('hidden'); return; }
      bar.classList.remove('hidden');
      if (!this.buildBarBuilt) this.buildBuildBar(bar);
      // update costs affordability
      bar.querySelectorAll('.bb-item').forEach(el => {
        const def = G.build.def(el.dataset.id);
        el.classList.toggle('poor', p.mats < def.cost);
        el.classList.toggle('sel', G.build.selected === el.dataset.id);
      });
      bar.querySelector('.bb-mats').textContent = Math.floor(p.mats);
    },
    buildBuildBar(bar) {
      this.buildBarBuilt = true;
      const cats = { Structure: ['wood_block', 'stone_block', 'metal_block', 'brick', 'plank', 'beam', 'crate', 'sandbag', 'glass', 'pillar', 'catwalk', 'ladder', 'stair', 'fence'], Gadgets: ['torch', 'lantern', 'banner', 'campfire', 'spring', 'spikes', 'tnt', 'mine', 'door', 'window', 'waterbarrel', 'scarecrow', 'flagpole'] };
      bar.innerHTML = `
        <div class="bb-head">
          <span class="bb-title">BUILD</span>
          <span class="bb-mats"></span>
          <button class="bb-rot">⟳ Rotate</button>
          <button class="bb-fill">⛰ Fill</button>
          <button class="bb-close">✕</button>
        </div>
        <div class="bb-tabs"></div>
        <div class="bb-items"></div>`;
      const tabs = bar.querySelector('.bb-tabs');
      const items = bar.querySelector('.bb-items');
      let curTab = 'Structure';
      const renderItems = () => {
        items.innerHTML = '';
        for (const id of cats[curTab]) {
          const def = G.build.def(id);
          const el = document.createElement('div');
          el.className = 'bb-item';
          el.dataset.id = id;
          el.innerHTML = `<span class="bb-name">${def.name}</span><span class="bb-cost">${def.cost}</span>`;
          el.title = def.name + ' — ' + def.cost + ' mats';
          el.addEventListener('pointerdown', (e) => { e.stopPropagation(); G.build.selected = id; G.audio.play('ui'); });
          items.appendChild(el);
        }
      };
      for (const cat of Object.keys(cats)) {
        const t = document.createElement('button');
        t.className = 'bb-tab';
        t.textContent = cat;
        t.addEventListener('click', () => { curTab = cat; tabs.querySelectorAll('.bb-tab').forEach(x => x.classList.toggle('on', x === t)); renderItems(); });
        tabs.appendChild(t);
        if (cat === 'Structure') t.classList.add('on');
      }
      renderItems();
      bar.querySelector('.bb-rot').addEventListener('click', () => { G.build.rotation += Math.PI / 2; G.audio.play('ui'); });
      bar.querySelector('.bb-fill').addEventListener('click', () => {
        // fill tool: add terrain at aim point
        const p = G.world.player;
        const ax = p.input.aimX !== undefined ? p.x + p.input.aimX * 100 : p.x;
        const ay = p.input.aimY !== undefined ? p.y + p.input.aimY * 100 : p.y;
        G.world.terrain.fill(ax, ay, 34);
        G.vfx.dirtBurst(ax, ay, 6);
        G.audio.play('dig', { x: ax, y: ay });
      });
      bar.querySelector('.bb-close').addEventListener('click', () => { G.world.player.buildMode = false; });
    },
  };
  G.hud = hud;

  // ---------- touch controls ----------
  const touch = {
    active: false,
    init() {
      if (!('ontouchstart' in window) && !(navigator.maxTouchPoints > 0)) return;
      this.active = true;
      touchEl.classList.remove('hidden');
      touchEl.innerHTML = `
        <div class="tc-left">
          <div class="tc-stick"><div class="tc-knob"></div></div>
        </div>
        <div class="tc-right">
          <div class="tc-btn tc-jump">JUMP</div>
          <div class="tc-btn tc-fire">FIRE</div>
          <div class="tc-btn tc-build">BUILD</div>
          <div class="tc-btn tc-build-place hidden">PLACE</div>
        </div>`;
      const stick = touchEl.querySelector('.tc-stick');
      const knob = touchEl.querySelector('.tc-knob');
      let stickId = null, sx = 0, sy = 0;
      this.move = { x: 0, y: 0 };
      stick.addEventListener('touchstart', (e) => {
        const t = e.changedTouches[0];
        stickId = t.identifier;
        const r = stick.getBoundingClientRect();
        sx = r.left + r.width / 2; sy = r.top + r.height / 2;
        e.preventDefault();
      }, { passive: false });
      window.addEventListener('touchmove', (e) => {
        for (const t of e.changedTouches) {
          if (t.identifier === stickId) {
            const dx = t.clientX - sx, dy = t.clientY - sy;
            const d = Math.min(48, Math.hypot(dx, dy));
            const a = Math.atan2(dy, dx);
            knob.style.transform = `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px)`;
            this.move = { x: Math.cos(a) * d / 48, y: Math.sin(a) * d / 48 };
          }
        }
      }, { passive: true });
      window.addEventListener('touchend', (e) => {
        for (const t of e.changedTouches) {
          if (t.identifier === stickId) { stickId = null; this.move = { x: 0, y: 0 }; knob.style.transform = ''; }
        }
      });
      // buttons: track pressed state
      const bind = (sel, key) => {
        const el = touchEl.querySelector(sel);
        el.addEventListener('touchstart', (e) => { this[key] = true; e.preventDefault(); }, { passive: false });
        el.addEventListener('touchend', () => { this[key] = false; });
        el.addEventListener('touchcancel', () => { this[key] = false; });
      };
      bind('.tc-jump', 'jump');
      bind('.tc-fire', 'fire');
      bind('.tc-build', 'buildToggle');
      bind('.tc-build-place', 'place');
      this.fire = this.jump = this.buildToggle = this.place = false;
    },
  };
  G.touch = touch;
})();
