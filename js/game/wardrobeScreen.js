/* ============================================================
   Wardrobe screen: preview + assemble your fighter, saved
   locally. Bots draw random outfits.
   ============================================================ */
window.G = window.G || {};
(function () {
  'use strict';
  const M = G.M;

  const wardrobeScreen = {
    outfit: null,
    open(onClose) {
      G.menu.clear();   // stop the main-menu background loop and screens
      this.onClose = onClose;
      try {
        this.outfit = JSON.parse(localStorage.getItem('ss_outfit')) || G.wardrobe.randomOutfit();
      } catch (e) { this.outfit = G.wardrobe.randomOutfit(); }
      if (!this.outfit.colorOf) this.outfit.colorOf = function (id, def) { return this.itemColors && this.itemColors[id] || def; };
      this.slot = 'head';
      this.render();
    },
    render() {
      const wrap = document.createElement('div');
      wrap.className = 'screen wardrobe-screen';
      wrap.innerHTML = `
        <div class="wd-title">WARDROBE</div>
        <div class="wd-body">
          <div class="wd-preview"><canvas width="220" height="300"></canvas>
            <div class="wd-hint">Your fighter. They are watching you judge them.</div>
          </div>
          <div class="wd-right">
            <div class="wd-slots"></div>
            <div class="wd-items"></div>
          </div>
        </div>
        <div class="wd-actions">
          <button class="btn" id="wd-random">Surprise me</button>
          <button class="btn" id="wd-clear">Strip off</button>
          <button class="btn primary" id="wd-save">Save & Back</button>
        </div>`;
      document.getElementById('screens').appendChild(wrap);
      this.wrap = wrap;
      this.previewChar = new G.Character({ name: 'Preview' });
      this.previewChar.outfit = this.outfit;
      this.previewChar.cloths = G.wardrobe.makeCloths(this.previewChar);
      this.previewChar.x = 0; this.previewChar.y = 0;
      // slots
      const slotsEl = wrap.querySelector('.wd-slots');
      for (const slot of G.wardrobe.slots) {
        const b = document.createElement('button');
        b.className = 'wd-slot' + (slot === this.slot ? ' on' : '');
        b.textContent = G.wardrobe.slotNames[slot];
        b.addEventListener('click', () => { this.slot = slot; this.render(); });
        slotsEl.appendChild(b);
      }
      // randomise button
      const rnd = document.createElement('button');
      rnd.className = 'wd-slot rnd';
      rnd.textContent = '🎲';
      rnd.addEventListener('click', () => { this.outfit = G.wardrobe.randomOutfit(); this.previewChar.outfit = this.outfit; this.previewChar.cloths = G.wardrobe.makeCloths(this.previewChar); this.render(); });
      slotsEl.appendChild(rnd);
      // items for slot
      const itemsEl = wrap.querySelector('.wd-items');
      const items = G.wardrobe.bySlot(this.slot);
      const none = document.createElement('div');
      none.className = 'wd-item' + (!this.outfit.items[this.slot] ? ' sel' : '');
      none.innerHTML = '<div class="wd-item-art none">—</div><div class="wd-item-name">None</div>';
      none.addEventListener('click', () => { delete this.outfit.items[this.slot]; this.render(); });
      itemsEl.appendChild(none);
      for (const it of items) {
        const el = document.createElement('div');
        el.className = 'wd-item' + (this.outfit.items[this.slot] === it.id ? ' sel' : '');
        // mini canvas preview of the item on a head/torso dummy
        const c = document.createElement('canvas');
        c.width = 72; c.height = 72;
        const g = c.getContext('2d');
        g.translate(36, 36);
        const dummy = this.previewChar;
        const m = { bodyY: -8, headY: -14, ink: '#3b2f26', facing: 1, bob: 0 };
        // draw a faint body for context
        g.globalAlpha = 0.25;
        dummy.drawLeg(g, 0, -6, '#999', '#3b2f26', 1, true);
        g.globalAlpha = 1;
        try { it.draw(g, dummy, m); } catch (e) {}
        el.appendChild(c);
        const nm = document.createElement('div');
        nm.className = 'wd-item-name';
        nm.textContent = it.name;
        el.appendChild(nm);
        // colour swatch cycling
        if (this.outfit.items[this.slot] === it.id) {
          const sw = document.createElement('div');
          sw.className = 'wd-swatch';
          sw.title = 'Tap to change colour';
          const cur = this.outfit.itemColors[it.id] || '#c94a4a';
          sw.style.background = cur;
          sw.addEventListener('click', (e) => {
            e.stopPropagation();
            const cols = ['#c94a4a', '#4a6ac9', '#4aa96a', '#e8b93c', '#8a5ac9', '#e88a3c', '#e88ab4', '#4ac9b8', '#8a6a4a', '#3a3630', '#f2ead8'];
            const i = cols.indexOf(this.outfit.itemColors[it.id] || '');
            this.outfit.itemColors[it.id] = cols[(i + 1) % cols.length];
            this.render();
          });
          el.appendChild(sw);
        }
        el.addEventListener('click', () => {
          this.outfit.items[this.slot] = it.id;
          if (!this.outfit.itemColors) this.outfit.itemColors = {};
          this.render();
        });
        itemsEl.appendChild(el);
      }
      // skin tone
      if (this.slot === 'head') {
        const sk = document.createElement('div');
        sk.className = 'wd-item skinrow';
        sk.innerHTML = '<div class="wd-item-name">Skin tone</div>';
        for (const tone of ['#f2d4b0', '#e8c39a', '#d4a878', '#b88a5a', '#8a5a3a', '#6a4228']) {
          const b = document.createElement('div');
          b.className = 'wd-swatch big';
          b.style.background = tone;
          if (this.outfit.skin === tone) b.style.outline = '3px solid #3b2f26';
          b.addEventListener('click', () => { this.outfit.skin = tone; this.render(); });
          sk.appendChild(b);
        }
        itemsEl.appendChild(sk);
      }
      // actions
      wrap.querySelector('#wd-random').addEventListener('click', () => { this.outfit = G.wardrobe.randomOutfit(); this.render(); });
      wrap.querySelector('#wd-clear').addEventListener('click', () => { this.outfit.items = {}; this.render(); });
      wrap.querySelector('#wd-save').addEventListener('click', () => {
        try { localStorage.setItem('ss_outfit', JSON.stringify(this.outfit)); } catch (e) {}
        G.audio.play('uibig');
        wrap.remove();
        this.onClose && this.onClose();
      });
      // preview animation loop
      const pc = wrap.querySelector('.wd-preview canvas');
      const pg = pc.getContext('2d');
      let raf, t = 0;
      const loop = () => {
        raf = requestAnimationFrame(loop);
        t += 1 / 60;
        pg.clearRect(0, 0, 220, 300);
        pg.save();
        pg.translate(110, 262);
        pg.scale(3.2, 3.2);   // bigger fighter in the preview
        const ch = this.previewChar;
        ch.walkPhase = t * 4;
        ch.aim = Math.sin(t * 0.7) * 0.5;
        ch.facing = Math.cos(ch.aim) > 0 ? 1 : -1;
        ch.vx = Math.sin(t) * 60;
        ch.blinkT -= 1 / 60;
        if (ch.blinkT <= 0) { ch.blink = 0.15; ch.blinkT = M.rand(2, 5); }
        if (ch.blink > 0) ch.blink -= 1 / 60;
        ch.squash && ch.squash.step(1 / 60);
        ch.updateCloth(1 / 60, { viewBounds: { x0: -1000, x1: 1000 }, time: t });
        ch.cloths.forEach(c => { c.setAnchor(0, -ch.h * 0.72, 0, 0); c.step(1 / 60, { x: Math.sin(t * 1.5) * 30, y: 0 }, false); });
        G.world = { time: t, viewBounds: { x0: -1000, x1: 1000 } };
        ch.draw(pg, 1);
        G.world = null;
        pg.restore();
      };
      loop();
      this._stop = () => cancelAnimationFrame(raf);
    },
  };
  G.wardrobeScreen = wardrobeScreen;
})();
