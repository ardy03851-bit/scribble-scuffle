/* ============================================================
   Screens: animated main menu, setup + rules panel, pause,
   settings. Hand-drawn, wobbly, springy.
   ============================================================ */
window.G = window.G || {};
(function () {
  'use strict';
  const M = G.M;

  const screensEl = document.getElementById('screens');
  const menu = {
    _bg: null,
    // ---------- main menu ----------
    mainMenu() {
      this.clear();
      G.hud.hide();
      const wrap = document.createElement('div');
      wrap.className = 'screen main-menu';
      wrap.innerHTML = `
        <canvas class="menu-bg"></canvas>
        <div class="mm-inner">
          <div class="mm-title">
            <span class="mm-word">Scribble</span>
            <span class="mm-word alt">Scuffle</span>
          </div>
          <div class="mm-sub">an ink &amp; paper arena brawler</div>
          <div class="mm-buttons">
            <button class="btn big primary" id="mm-play">Fight!</button>
            <button class="btn big" id="mm-wardrobe">Wardrobe</button>
            <button class="btn big" id="mm-settings">Settings</button>
          </div>
          <div class="mm-foot">fully offline · works on a plane · no servers were harmed</div>
        </div>`;
      screensEl.appendChild(wrap);
      wrap.querySelector('#mm-play').addEventListener('click', () => { G.audio.init(); G.audio.play('uibig'); this.setup(); });
      wrap.querySelector('#mm-wardrobe').addEventListener('click', () => { G.audio.init(); G.wardrobeScreen.open(() => this.mainMenu()); });
      wrap.querySelector('#mm-settings').addEventListener('click', () => { G.audio.init(); this.settings(this.mainMenu.bind(this)); });
      this.menuBgLoop(wrap.querySelector('.menu-bg'));
    },
    menuBgLoop(canvas) {
      const g = canvas.getContext('2d');
      let t = 0, raf;
      const chars = [];
      for (let i = 0; i < 5; i++) {
        const c = new G.Character({ name: 'wanderer' });
        c.outfit = G.wardrobe.randomOutfit();
        c.cloths = G.wardrobe.makeCloths(c);
        c.x = Math.random() * 800; c.walkPhase = Math.random() * 6;
        c.facing = Math.random() < 0.5 ? -1 : 1;
        chars.push(c);
      }
      const resize = () => {
        canvas.width = window.innerWidth; canvas.height = window.innerHeight;
      };
      resize();
      window.addEventListener('resize', resize);
      const loop = () => {
        raf = requestAnimationFrame(loop);
        t += 1 / 60;
        // paper
        g.fillStyle = '#f2ead8';
        g.fillRect(0, 0, canvas.width, canvas.height);
        // hills
        const hy = canvas.height * 0.78;
        for (const [f, col] of [[0.3, '#d9c9a8'], [0.6, '#c9b795']]) {
          g.fillStyle = col;
          g.beginPath();
          g.moveTo(-30, canvas.height);
          for (let x = 0; x <= canvas.width + 30; x += 30) {
            g.lineTo(x, hy - Math.abs(G.noise.fbm1(x * 0.003 * (1 / f) + f * 10, 3)) * 120);
          }
          g.lineTo(canvas.width, canvas.height);
          g.closePath(); g.fill();
        }
        // ground line
        g.strokeStyle = '#3b2f26'; g.lineWidth = 3;
        g.beginPath();
        for (let x = 0; x <= canvas.width + 24; x += 24) {
          g.lineTo(x, hy - Math.abs(G.noise.fbm1(x * 0.003, 3)) * 120 + 26);
        }
        g.stroke();
        // wandering characters
        G.world = { time: t, viewBounds: { x0: -2000, x1: 3000 }, rules: {} };
        for (const c of chars) {
          c.x += c.facing * 40 / 60;
          if (c.x > canvas.width + 40) c.x = -40;
          if (c.x < -40) c.x = canvas.width + 40;
          c.walkPhase += 0.12;
          c.y = hy - Math.abs(G.noise.fbm1(c.x * 0.003, 3)) * 120 + 26;
          c.onGround = true;
          c.aim = c.facing > 0 ? 0.2 : Math.PI - 0.2;
          c.blinkT -= 1 / 60;
          if (c.blinkT <= 0) { c.blink = 0.15; c.blinkT = M.rand(2, 5); }
          if (c.blink > 0) c.blink -= 1 / 60;
          c.updateCloth(1 / 60, G.world);
          g.save();
          g.translate(0, 0);
          c.draw(g, 1);
          g.restore();
        }
        G.world = null;
      };
      loop();
      this._bg = () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
    },
    // ---------- setup / rules ----------
    setup() {
      this.clear();
      G.rules.load();
      const rules = G.rules;
      const wrap = document.createElement('div');
      wrap.className = 'screen setup-screen';
      const schema = G.rules.SCHEMA;
      const fieldHtml = (s) => {
        const v = rules.data[s.key];
        switch (s.type) {
          case 'select': {
            const opts = s.options.map(([val, label]) => `<option value="${val}" ${String(v) === String(val) ? 'selected' : ''}>${label}</option>`).join('');
            return `<select data-k="${s.key}">${opts}</select>`;
          }
          case 'bool':
            return `<button class="toggle ${v ? 'on' : ''}" data-k="${s.key}">${v ? 'ON' : 'OFF'}</button>`;
          case 'range':
            return `<input type="range" data-k="${s.key}" min="${s.min}" max="${s.max}" step="${s.step}" value="${v}">`;
          case 'weather': {
            const opts = ['<option value="auto" ' + (v === 'auto' ? 'selected' : '') + '>Auto (biome)</option>'].concat(
              Object.values(G.WEATHER_TYPES).map(wd => `<option value="${wd.id}" ${v === wd.id ? 'selected' : ''}>${wd.name}</option>`)
            ).join('');
            return `<select data-k="${s.key}">${opts}</select>`;
          }
          case 'biome': {
            const opts = ['<option value="auto" ' + (v === 'auto' ? 'selected' : '') + '>Auto (random)</option>'].concat(
              G.biomes.ids().map(id => `<option value="${id}" ${v === id ? 'selected' : ''}>${G.biomes.get(id).name}</option>`)
            ).join('');
            return `<select data-k="${s.key}">${opts}</select>`;
          }
          default:
            return `<input type="number" data-k="${s.key}" value="${v}" step="${s.step || 1}" min="${s.min}" max="${s.max}">`;
        }
      };
      wrap.innerHTML = `
        <div class="setup-title">SET UP A SCUFFLE</div>
        <div class="setup-body">
          <div class="setup-left">
            <div class="mode-cards"></div>
          </div>
          <div class="setup-right">
            <div class="rules-panel">
              ${schema.map(s => `
                <div class="rule-row" title="${s.hint || ''}">
                  <label>${s.label}</label>
                  ${fieldHtml(s)}
                </div>`).join('')}
            </div>
          </div>
        </div>
        <div class="setup-actions">
          <button class="btn" id="su-back">Back</button>
          <button class="btn primary big" id="su-go">Start Match</button>
        </div>`;
      screensEl.appendChild(wrap);
      // mode cards
      const cards = wrap.querySelector('.mode-cards');
      for (const m of G.modes.list()) {
        const c = document.createElement('div');
        c.className = 'mode-card' + (rules.data.mode === m.id ? ' sel' : '');
        c.style.setProperty('--rot', M.rand(-2.5, 2.5).toFixed(1) + 'deg');
        c.innerHTML = `<div class="mc-name">${m.name}</div><div class="mc-desc">${m.desc}</div>`;
        c.addEventListener('click', () => {
          rules.data.mode = m.id; rules.save();
          cards.querySelectorAll('.mode-card').forEach(x => x.classList.toggle('sel', x === c));
          G.audio.play('ui');
        });
        cards.appendChild(c);
      }
      // rule fields
      wrap.querySelectorAll('[data-k]').forEach(el => {
        const k = el.dataset.k;
        if (el.tagName === 'SELECT') {
          el.addEventListener('change', () => {
            const v = el.value;
            rules.data[k] = (k === 'teams') ? parseInt(v, 10) : v;
            rules.save(); G.audio.play('ui');
          });
        } else if (el.classList.contains('toggle')) {
          el.addEventListener('click', () => {
            rules.data[k] = !rules.data[k]; rules.save();
            el.classList.toggle('on', rules.data[k]);
            el.textContent = rules.data[k] ? 'ON' : 'OFF';
            G.audio.play('ui');
          });
        } else if (el.type === 'range') {
          el.addEventListener('input', () => { rules.data[k] = Number(el.value); rules.save(); });
        } else {
          el.addEventListener('change', () => {
            let v = parseFloat(el.value);
            if (!isFinite(v)) v = G.rules.DEFAULTS[k];
            rules.data[k] = v; el.value = v; rules.save();
          });
        }
      });
      wrap.querySelector('#su-back').addEventListener('click', () => this.mainMenu());
      wrap.querySelector('#su-go').addEventListener('click', () => {
        G.audio.init();
        G.main.startMatch();
      });
    },
    // ---------- pause ----------
    pause() {
      const rules = G.rules;
      const wrap = document.createElement('div');
      wrap.className = 'screen pause-screen';
      wrap.innerHTML = `
        <div class="p-title">PAUSED</div>
        <div class="p-grid">
          <button class="btn primary" id="p-resume">Resume</button>
          <button class="btn" id="p-restart">Restart match</button>
          <button class="btn" id="p-addbot">+5 bots</button>
          <button class="btn" id="p-rmbot">-5 bots</button>
          <button class="btn" id="p-teams">Cycle teams</button>
          <button class="btn" id="p-wardrobe">Wardrobe</button>
          <button class="btn" id="p-settings">Settings</button>
          <button class="btn danger" id="p-quit">Quit to menu</button>
        </div>
        <div class="p-note">Rules apply live — teams, bots, everything. The bots won't mind.</div>`;
      screensEl.appendChild(wrap);
      const m = G.main.match;
      wrap.querySelector('#p-resume').addEventListener('click', () => G.main.togglePause());
      wrap.querySelector('#p-restart').addEventListener('click', () => { this.clear(); G.main.startMatch(); });
      wrap.querySelector('#p-addbot').addEventListener('click', () => {
        for (let i = 0; i < 5; i++) {
          const bot = new G.Character({ name: G.bots.NAMES[(Math.random() * G.bots.NAMES.length) | 0], isBot: true });
          bot.team = m.rules.teams > 1 ? ((i + 1) % m.rules.teams) + 1 : 0;
          bot.maxHp = m.rules.health; bot.hp = bot.maxHp;
          bot.controller = new G.BotController(m.rules.botSkill);
          bot.weapon = G.weapons.create(G.weapons.roll().id);
          const sp = m.world.spawnPoint(m.world.fighters.length, m.world.fighters.length + 1, bot.team);
          bot.respawn(sp.x, sp.y);
          bot.cloths = G.wardrobe.makeCloths(bot);
          m.world.addFighter(bot);
        }
        G.ui.toast('5 bots joined the fray');
      });
      wrap.querySelector('#p-rmbot').addEventListener('click', () => {
        const bots = m.world.fighters.filter(f => f.isBot);
        for (let i = 0; i < 5 && bots.length; i++) {
          const b = bots.pop();
          m.world.fighters.splice(m.world.fighters.indexOf(b), 1);
        }
        G.ui.toast('Some bots went home');
      });
      wrap.querySelector('#p-teams').addEventListener('click', () => {
        m.rules.teams = m.rules.teams >= 4 ? 1 : m.rules.teams + 1;
        rules.set('teams', m.rules.teams);
        const n = m.rules.teams;
        m.world.fighters.forEach((f, i) => { f.team = n > 1 ? (i % n) + 1 : 0; });
        G.ui.toast(n === 1 ? 'Free-for-all' : n + ' teams');
      });
      wrap.querySelector('#p-wardrobe').addEventListener('click', () => G.wardrobeScreen.open(() => {}));
      wrap.querySelector('#p-settings').addEventListener('click', () => this.settings(() => {}));
      wrap.querySelector('#p-quit').addEventListener('click', () => { this.clear(); G.main.toMenu(); });
    },
    // ---------- settings ----------
    settings(onBack) {
      const wrap = document.createElement('div');
      wrap.className = 'screen settings-screen';
      const st = G.main.settings;
      wrap.innerHTML = `
        <div class="p-title">SETTINGS</div>
        <div class="rules-panel narrow">
          <div class="rule-row"><label>Quality</label>
            <select id="st-quality">
              <option value="auto">Auto (adaptive)</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select></div>
          <div class="rule-row"><label>Volume</label><input type="range" id="st-vol" min="0" max="1" step="0.05"></div>
          <div class="rule-row"><label>Weather effects</label><button class="toggle" id="st-weather"></button></div>
          <div class="rule-row"><label>Screen shake</label><button class="toggle" id="st-shake"></button></div>
          <div class="rule-row"><label>Foliage sway</label><button class="toggle" id="st-foliage"></button></div>
          <div class="rule-row"><label>Water reflections</label><button class="toggle" id="st-refl"></button></div>
          <div class="rule-row"><label>Reduced motion</label><button class="toggle" id="st-motion"></button></div>
          <div class="rule-row"><label>FPS readout</label><button class="toggle" id="st-fps"></button></div>
        </div>
        <button class="btn primary" id="st-back">Back</button>`;
      screensEl.appendChild(wrap);
      const q = wrap.querySelector('#st-quality');
      q.value = st.quality;
      q.addEventListener('change', () => { st.quality = q.value; G.main.saveSettings(); G.engine.quality = q.value; });
      const vol = wrap.querySelector('#st-vol');
      vol.value = st.volume;
      vol.addEventListener('input', () => { st.volume = parseFloat(vol.value); G.audio.setVolume(st.volume); G.main.saveSettings(); });
      const toggles = [['weather', 'st-weather'], ['shake', 'st-shake'], ['foliage', 'st-foliage'], ['reflections', 'st-refl'], ['reducedMotion', 'st-motion'], ['fps', 'st-fps']];
      for (const [key, id] of toggles) {
        const el = wrap.querySelector('#' + id);
        el.classList.toggle('on', st[key]);
        el.textContent = st[key] ? 'ON' : 'OFF';
        el.addEventListener('click', () => {
          st[key] = !st[key];
          el.classList.toggle('on', st[key]);
          el.textContent = st[key] ? 'ON' : 'OFF';
          G.main.saveSettings();
          G.engine.reduceMotion = st.reducedMotion;
        });
      }
      wrap.querySelector('#st-back').addEventListener('click', () => { wrap.remove(); onBack && onBack(); });
    },
    clear() {
      if (this._bg) { this._bg(); this._bg = null; }
      screensEl.innerHTML = '';
    },
  };
  G.menu = menu;
})();
