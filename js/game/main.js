/* ============================================================
   Main: game state machine, input (keyboard/mouse/touch),
   fixed-timestep loop with interpolation, pause, fullscreen,
   wake lock, settings persistence, HUD 3D tilt.
   ============================================================ */
window.G = window.G || {};
(function () {
  'use strict';
  const M = G.M;

  const main = {
    state: 'menu',   // menu | playing | paused | victory
    match: null,
    paused: false,
    keys: {},
    mouse: { x: 0, y: 0, down: false },
    settings: {
      quality: 'auto', volume: 0.7, weather: true, shake: true,
      foliage: true, reflections: true, reducedMotion: false, fps: true,
    },
    _wasJump: false,

    init() {
      if (this._inited) return;   // guard against double boot (e.g. load event firing late)
      this._inited = true;
      G.rules.load();
      try { this.settings = Object.assign(this.settings, JSON.parse(localStorage.getItem('ss_settings')) || {}); } catch (e) {}
      G.engine.quality = this.settings.quality;
      G.engine.reduceMotion = this.settings.reduceMotion;
      G.audio.setVolume(this.settings.volume);
      this.bindInput();
      G.hud.build();
      G.touch.init();
      G.debug.init();
      G.menu.mainMenu();
      G.startLoop(this.frameUpdate.bind(this), this.frameRender.bind(this));
      // audio unlock on first gesture
      const unlock = () => { G.audio.init(); G.audio.resume(); window.removeEventListener('pointerdown', unlock); };
      window.addEventListener('pointerdown', unlock);
      // pause when hidden
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && this.state === 'playing') this.togglePause();
      });
    },

    saveSettings() {
      try { localStorage.setItem('ss_settings', JSON.stringify(this.settings)); } catch (e) {}
    },

    // ---------- input ----------
    bindInput() {
      window.addEventListener('keydown', (e) => {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
        this.keys[e.code] = true;
        if (e.code === 'Escape') {
          if (this.state === 'playing' || this.state === 'paused') this.togglePause();
        }
        if (e.code === 'Tab' && this.state === 'playing') { e.preventDefault(); G.hud.showScoreboard = true; }
        if (e.code === 'KeyB' && this.state === 'playing' && this.match && this.match.world.player) {
          this.match.world.player.buildMode = !this.match.world.player.buildMode;
          G.audio.play('ui');
        }
        if (e.code === 'KeyR' && this.state === 'playing' && this.match && this.match.world.player) {
          this.match.world.player.weapon.startReload();
        }
        if (e.code === 'KeyQ' && this.state === 'playing') { G.build.rotation += Math.PI / 2; }
      });
      window.addEventListener('keyup', (e) => {
        this.keys[e.code] = false;
        if (e.code === 'Tab') G.hud.showScoreboard = false;
      });
      const canvas = G.renderer.canvas;
      canvas.addEventListener('pointermove', (e) => {
        this.mouse.x = e.clientX; this.mouse.y = e.clientY;
      });
      canvas.addEventListener('pointerdown', (e) => {
        this.mouse.x = e.clientX; this.mouse.y = e.clientY;
        this.mouse.down = true;
        if (e.pointerType !== 'touch') {
          G.audio.init();
          // build mode: LMB places the selected piece at the cursor
          if (this.state === 'playing' && this.match && this.match.world.player && this.match.world.player.buildMode) {
            this._placeClick = true;
          }
        }
      });
      window.addEventListener('pointerup', () => { this.mouse.down = false; });
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
      // HUD 3D tilt with pointer
      const hudEl = document.getElementById('hud');
      window.addEventListener('pointermove', (e) => {
        if (this.settings.reducedMotion) return;
        const nx = (e.clientX / window.innerWidth - 0.5) * 2;
        const ny = (e.clientY / window.innerHeight - 0.5) * 2;
        hudEl.style.transform = `perspective(900px) rotateY(${nx * 3.5}deg) rotateX(${-ny * 2.5}deg)`;
      });
    },

    buildPlayerInput() {
      const w = this.match.world;
      const p = w.player;
      if (!p || !p.alive) return null;
      const input = { left: false, right: false, jump: false, jumpPressed: false, fire: false, aim: 0, aimX: 1, aimY: 0 };
      const k = this.keys;
      // keyboard
      input.left = !!(k.KeyA || k.ArrowLeft);
      input.right = !!(k.KeyD || k.ArrowRight);
      input.jump = !!(k.KeyW || k.ArrowUp || k.Space);
      input.jumpPressed = input.jump && !this._wasJump;
      this._wasJump = input.jump;
      // touch
      if (G.touch.active) {
        if (G.touch.move && Math.abs(G.touch.move.x) > 0.25) {
          input.left = G.touch.move.x < -0.25;
          input.right = G.touch.move.x > 0.25;
        }
        if (G.touch.jump) { input.jump = true; input.jumpPressed = input.jump && !this._wasJump; }
      }
      // aim: mouse world pos or touch
      if (G.touch.active && G.touch.aimTouch) {
        const wp = G.screenToWorld(G.touch.aimTouch.x, G.touch.aimTouch.y);
        input.aim = M.ang(p.x, p.y - p.h * 0.55, wp.x, wp.y);
      } else if (!G.touch.active || this.mouse.moved) {
        const wp = G.screenToWorld(this.mouse.x, this.mouse.y);
        input.aim = M.ang(p.x, p.y - p.h * 0.55, wp.x, wp.y);
      } else {
        input.aim = p.aim;
      }
      input.aimX = Math.cos(input.aim); input.aimY = Math.sin(input.aim);
      // fire (suppressed in build mode unless holding a build/dig tool weapon)
      const toolWeapon = p.weapon && p.weapon.def && (p.weapon.def.build || p.weapon.def.dig);
      input.fire = (this.mouse.down || (G.touch.active && G.touch.fire)) && (!p.buildMode || toolWeapon);
      // build mode: tap or click places at the cursor
      if (p.buildMode) {
        let bx = null, by = null;
        if (G.touch.active && G.touch.place) {
          const wp = G.touch.aimTouch ? G.screenToWorld(G.touch.aimTouch.x, G.touch.aimTouch.y) : { x: p.x, y: p.y - 40 };
          bx = wp.x; by = wp.y;
          G.touch.place = false;
        } else if (this._placeClick) {
          const wp = G.screenToWorld(this.mouse.x, this.mouse.y);
          bx = wp.x; by = wp.y;
          this._placeClick = false;
        }
        if (bx !== null) {
          G.build.updateGhost(p, w, bx, by);
          G.build.tryPlaceGhost(p);
        } else if (!G.touch.active) {
          // ghost follows the mouse for preview
          const wp = G.screenToWorld(this.mouse.x, this.mouse.y);
          G.build.updateGhost(p, w, wp.x, wp.y);
        }
      }
      return input;
    },

    // ---------- match flow ----------
    startMatch() {
      G.menu.clear();
      G.audio.init();
      const rulesData = Object.assign({}, G.rules.data);
      const match = new G.Match(rulesData, rulesData.mode);
      this.match = match;
      G.world = match.world;
      match.start();
      // player outfit from wardrobe (after start(), which creates the player)
      try {
        const saved = JSON.parse(localStorage.getItem('ss_outfit'));
        if (saved) {
          saved.colorOf = function (id, def) { return this.itemColors && this.itemColors[id] || def; };
          match.world.player.outfit = saved;
          match.world.player.cloths = G.wardrobe.makeCloths(match.world.player);
        }
      } catch (e) {}
      this.state = 'playing';
      this.paused = false;
      G.hud.show();
      this.requestWakeLock();
      G.ui.toast(match.modeDef().name + ' — first to ' + match.targetScore);
    },
    toMenu() {
      this.state = 'menu';
      this.match = null;
      G.world = null;
      G.hud.hide();
      G.menu.mainMenu();
      if (this._wakeLock) { try { this._wakeLock.release(); } catch (e) {} this._wakeLock = null; }
    },
    togglePause() {
      if (this.state === 'playing') {
        this.state = 'paused';
        G.menu.pause();
      } else if (this.state === 'paused') {
        this.state = 'playing';
        G.menu.clear();
      }
    },
    toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {});
      } else document.exitFullscreen && document.exitFullscreen();
    },
    async requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          this._wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (e) {}
    },

    // ---------- loop ----------
    frameUpdate(dt) {
      if (this.state === 'playing' && this.match) {
        this.fixedUpdate(dt);
      }
    },
    fixedUpdate(dt) {
      const m = this.match;
      if (!m) return;
      // player input
      const p = m.world.player;
      if (p) {
        const input = this.buildPlayerInput();
        if (input) {
          p.input = input;
          p.controller = null;
        }
      }
      // attach weapon owner refs for burst logic
      for (const f of m.world.fighters) if (f.weapon) f.weapon.ownerRef = f;
      m.update(dt);
      // keep global world ref fresh (rounds may regen)
      G.world = m.world;
    },
    frameRender(dtRaw, alpha) {
      const ctx = G.renderer.ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, G.renderer.w, G.renderer.h);
      if (this.match && (this.state === 'playing' || this.state === 'paused')) {
        G.world = this.match.world;   // keep global in sync for draw code
        G.camApply(alpha);
        // screen shake setting
        if (!this.settings.shake) G.renderer.camera.shake = 0;
        this.match.render(ctx, alpha);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        G.drawGrain();
        G.hud.update(this.match);
      }
    },
  };

  G.main = main;
  // boot
  window.addEventListener('load', () => main.init());
})();
