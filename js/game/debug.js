/* ============================================================
   Debug/testing hooks: hidden panel, text state dump,
   time advance for automated verification.
   ============================================================ */
window.G = window.G || {};
(function () {
  'use strict';
  const M = G.M;

  const debug = {
    panelOpen: false,
    init() {
      window.addEventListener('keydown', (e) => {
        if (e.key === '`' || e.code === 'Backquote') { e.preventDefault(); this.togglePanel(); }
      });
      // triple-tap top-left corner on touch
      let taps = 0, lastTap = 0;
      window.addEventListener('touchstart', (e) => {
        const t = e.changedTouches[0];
        if (t.clientX < 80 && t.clientY < 80) {
          const now = Date.now();
          if (now - lastTap < 500) taps++; else taps = 1;
          lastTap = now;
          if (taps >= 3) { this.togglePanel(); taps = 0; }
        }
      }, { passive: true });
    },
    togglePanel() {
      if (this.panelOpen) { this.panelEl && this.panelEl.remove(); this.panelEl = null; this.panelOpen = false; return; }
      this.panelOpen = true;
      const el = document.createElement('div');
      el.className = 'debug-panel';
      el.innerHTML = `
        <div class="dbg-title">DEBUG</div>
        <button class="btn tiny" id="dbg-state">Dump state</button>
        <button class="btn tiny" id="dbg-adv">Advance 60 ticks</button>
        <div class="dbg-row">Weapon:
          <select id="dbg-weapon">${Object.values(G.weapons.defs).map(d => `<option value="${d.id}">${d.name}</option>`).join('')}</select>
          <button class="btn tiny" id="dbg-give">Give</button></div>
        <div class="dbg-row">Prop:
          <select id="dbg-prop">${Object.keys(G.props.defs).map(k => `<option value="${k}">${k}</option>`).join('')}</select>
          <button class="btn tiny" id="dbg-spawnprop">Spawn</button></div>
        <button class="btn tiny" id="dbg-kill">Kill all bots</button>
        <button class="btn tiny" id="dbg-win">End round</button>
        <pre class="dbg-out"></pre>`;
      document.getElementById('app').appendChild(el);
      this.panelEl = el;
      const out = el.querySelector('.dbg-out');
      el.querySelector('#dbg-state').addEventListener('click', () => { out.textContent = this.state(); });
      el.querySelector('#dbg-adv').addEventListener('click', () => { this.advance(60); out.textContent = 'Advanced 60 ticks.'; });
      el.querySelector('#dbg-give').addEventListener('click', () => {
        const p = G.main.match && G.main.match.world.player;
        if (p) { p.weapon = G.weapons.create(el.querySelector('#dbg-weapon').value); G.ui.toast('Given: ' + p.weapon.def.name); }
      });
      el.querySelector('#dbg-spawnprop').addEventListener('click', () => {
        const w = G.main.match && G.main.match.world;
        if (w) {
          const kind = el.querySelector('#dbg-prop').value;
          const x = w.player.x + M.rand(-100, 100);
          const p = new G.Prop(kind, x, w.terrain.surfaceY(x) + 2, M.randi(0, 9999), w.theme);
          w.addProp(p);
        }
      });
      el.querySelector('#dbg-kill').addEventListener('click', () => {
        const w = G.main.match && G.main.match.world;
        if (w) for (const f of w.fighters) if (f.isBot && f.alive) f.die(w.player, 'shot');
      });
      el.querySelector('#dbg-win').addEventListener('click', () => {
        const m = G.main.match;
        if (m) m.endRound(m.world.player);
      });
    },
    // text-render of game state (automated verification)
    state() {
      const m = G.main.match;
      if (!m) return 'no match';
      const w = m.world;
      const lines = [];
      lines.push(`match: mode=${m.mode} round=${m.round} state=${m.roundState} over=${m.matchOver}`);
      lines.push(`world: ${w.mapW}x${w.mapH} biome=${w.biomeId} weather=${G.weather.current} time=${w.time.toFixed(1)}`);
      lines.push(`fighters: ${w.fighters.length} alive=${w.fighters.filter(f => f.alive).length}`);
      for (const f of w.fighters) {
        lines.push(`  ${f.isBot ? 'bot' : 'ply'} ${f.name} team=${f.team} hp=${f.hp.toFixed(0)}/${f.maxHp} pos=(${f.x.toFixed(0)},${f.y.toFixed(0)}) weapon=${f.weapon ? f.weapon.def.id : 'none'} score=${f.score} alive=${f.alive}`);
      }
      lines.push(`terrain chunks: ${w.terrain.chunks.length} dirty: ${w.terrain.dirty.size}`);
      lines.push(`props: ${G.props.all.length} bodies: ${G.bodies.all.length} projectiles: ${G.projectiles.pool.active.length}`);
      lines.push(`build pieces: ${G.build.pieces.length} water=${w.water.level === Infinity ? 'none' : w.water.type}`);
      lines.push(`fps: ${G.engine.fps} quality: ${G.engine.qualityTier}`);
      return lines.join('\n');
    },
    // advance simulation n fixed ticks without rendering
    advance(n) {
      const m = G.main.match;
      if (!m) return;
      for (let i = 0; i < n; i++) {
        G.main.fixedUpdate(G.engine.fixedDt);
      }
    },
  };
  G.debug = debug;
})();
