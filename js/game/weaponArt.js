/* ============================================================
   Weapon art: procedural ink-style sprites per archetype,
   cached. (README documents the AI-image pipeline that can
   replace these with generated sprites as drop-in files.)
   ============================================================ */
window.G = window.G || {};
(function () {
  'use strict';
  const M = G.M;
  const INK = '#3b2f26';
  const cache = new G.LRUCache(60 * 1024 * 1024);

  function base(g, w, h, fn) {
    // margin for outline
    fn(g, w, h);
  }
  function shape(g, path, fill, lw = 2.4) {
    g.save();
    g.translate(M.rand ? 0 : 0, 0);
    g.fillStyle = fill;
    g.save(); g.translate(1.2, -0.8); g.fill(path); g.restore(); // misregistered fill
    g.restore();
    g.strokeStyle = INK; g.lineWidth = lw; g.lineJoin = 'round';
    g.stroke(path);
  }

  const ARCH = {
    blade(g, w, h, a) {
      // knife/sword pointing right
      const p = new Path2D();
      p.moveTo(8, h / 2 - 3); p.lineTo(w - 14, h / 2 - 3);
      p.quadraticCurveTo(w - 6, h / 2, w - 14, h / 2 + 3);
      p.lineTo(8, h / 2 + 3); p.closePath();
      shape(g, p, a.c1 || '#c9c2b4');
      // handle
      g.strokeStyle = INK; g.lineWidth = 2;
      g.beginPath(); g.moveTo(4, h / 2 - 4); g.lineTo(10, h / 2 - 4); g.stroke();
      g.beginPath(); g.moveTo(4, h / 2 + 4); g.lineTo(10, h / 2 + 4); g.stroke();
      g.beginPath(); g.moveTo(10, h / 2 - 5); g.lineTo(10, h / 2 + 5); g.stroke();
    },
    spear(g, w, h, a) {
      g.strokeStyle = a.c1 || '#c9a86a'; g.lineWidth = 3.4;
      g.beginPath(); g.moveTo(4, h / 2); g.lineTo(w - 14, h / 2); g.stroke();
      g.strokeStyle = INK; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(4, h / 2); g.lineTo(w - 14, h / 2); g.stroke();
      const p = new Path2D();
      p.moveTo(w - 16, h / 2 - 5); p.lineTo(w - 4, h / 2); p.lineTo(w - 16, h / 2 + 5); p.closePath();
      shape(g, p, '#b8b2aa');
    },
    hammer(g, w, h, a) {
      g.strokeStyle = a.c1 || '#8a6a4a'; g.lineWidth = 3.4;
      g.beginPath(); g.moveTo(6, h / 2 + 6); g.lineTo(w - 14, h / 2 - 6); g.stroke();
      g.strokeStyle = INK; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(6, h / 2 + 6); g.lineTo(w - 14, h / 2 - 6); g.stroke();
      const p = new Path2D();
      p.rect(w - 18, h / 2 - 12, 12, 12);
      shape(g, p, '#a8a29a');
    },
    knife(g, w, h) {
      const p = new Path2D();
      p.moveTo(6, h / 2); p.lineTo(w - 12, h / 2 - 4); p.lineTo(w - 6, h / 2); p.lineTo(w - 12, h / 2 + 3); p.closePath();
      shape(g, p, '#c9c2b4');
      g.strokeStyle = INK; g.lineWidth = 2;
      g.beginPath(); g.moveTo(6, h / 2 - 3); g.lineTo(10, h / 2 + 3); g.stroke();
    },
    axe(g, w, h) {
      g.strokeStyle = '#8a6a4a'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(6, h / 2); g.lineTo(w - 12, h / 2); g.stroke();
      g.strokeStyle = INK; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(6, h / 2); g.lineTo(w - 12, h / 2); g.stroke();
      const p = new Path2D();
      p.moveTo(w - 18, h / 2 - 8); p.quadraticCurveTo(w - 2, h / 2 - 10, w - 8, h / 2 + 8);
      p.lineTo(w - 18, h / 2 + 8); p.closePath();
      shape(g, p, '#a8a29a');
    },
    boomerang(g, w, h) {
      const p = new Path2D();
      p.moveTo(6, h / 2 - 6); p.quadraticCurveTo(w - 8, h / 2 - 8, w - 12, h / 2 + 8);
      p.quadraticCurveTo(w - 10, h / 2, 10, h / 2 + 8); p.closePath();
      shape(g, p, '#c9a86a');
    },
    star(g, w, h) {
      const p = new Path2D();
      const cx = w / 2, cy = h / 2;
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2;
        p.moveTo(cx, cy);
        p.lineTo(cx + Math.cos(a) * 12, cy + Math.sin(a) * 12);
        p.lineTo(cx + Math.cos(a + Math.PI / 4) * 4, cy + Math.sin(a + Math.PI / 4) * 4);
      }
      p.closePath();
      shape(g, p, '#e8dcc0');
    },
    bomb(g, w, h, a) {
      const cx = w / 2, cy = h / 2 + 2;
      const p = new Path2D();
      p.arc(cx, cy, h / 2 - 3, 0, M.TAU);
      shape(g, p, a && a.c1 ? a.c1 : '#3a3630');
      g.strokeStyle = INK; g.lineWidth = 2;
      g.beginPath(); g.moveTo(cx + 4, cy - h / 2 + 3); g.quadraticCurveTo(cx + 10, cy - h / 2 - 2, cx + 6, cy - h / 2 - 6); g.stroke();
      G.vfx && 0; // spark drawn at runtime
    },
    bottle(g, w, h, a) {
      const p = new Path2D();
      p.moveTo(w / 2 - 6, h - 4);
      p.lineTo(w / 2 - 6, h / 2 + 2); p.lineTo(w / 2 - 3, h / 2 - 2);
      p.lineTo(w / 2 - 3, 4); p.lineTo(w / 2 + 3, 4);
      p.lineTo(w / 2 + 3, h / 2 - 2); p.lineTo(w / 2 + 6, h / 2 + 2);
      p.lineTo(w / 2 + 6, h - 4); p.closePath();
      shape(g, p, a && a.c1 ? a.c1 : 'rgba(160,180,120,0.9)');
      g.fillStyle = '#e4573d';
      g.fillRect(w / 2 - 3, 4, 6, 4);
      g.strokeStyle = INK; g.lineWidth = 1.4;
      g.strokeRect(w / 2 - 3, 4, 6, 4);
    },
    pistol(g, w, h, a) {
      const big = a && a.big;
      const p = new Path2D();
      p.moveTo(6, h / 2 - 3); p.lineTo(w - 6, h / 2 - 3);
      p.lineTo(w - 6, h / 2 + (big ? 5 : 2)); p.lineTo(14, h / 2 + (big ? 5 : 2));
      p.lineTo(10, h - 4); p.lineTo(4, h - 4); p.lineTo(6, h / 2 + 2); p.closePath();
      shape(g, p, a && a.c1 ? a.c1 : '#6a5a4a', big ? 2.8 : 2.4);
    },
    smg(g, w, h, a) {
      const p = new Path2D();
      p.moveTo(4, h / 2 - 3); p.lineTo(w - 4, h / 2 - 3);
      p.lineTo(w - 4, h / 2 + 2); p.lineTo(16, h / 2 + 2);
      p.lineTo(13, h - 4); p.lineTo(7, h - 4); p.lineTo(8, h / 2 + 2);
      p.lineTo(4, h / 2 + 2); p.closePath();
      shape(g, p, a && a.c1 ? a.c1 : '#5a4a3a');
      // mag
      const mg = new Path2D();
      mg.moveTo(18, h / 2 + 2); mg.lineTo(22, h / 2 + 2); mg.lineTo(24, h - 2); mg.lineTo(20, h - 2); mg.closePath();
      shape(g, mg, '#4a3a2a', 1.8);
    },
    rifle(g, w, h, a) {
      const p = new Path2D();
      p.moveTo(2, h / 2 - 2.4); p.lineTo(w - 4, h / 2 - 2.4);
      p.lineTo(w - 4, h / 2 + 2); p.lineTo(18, h / 2 + 2);
      p.lineTo(15, h - 4); p.lineTo(9, h - 4); p.lineTo(10, h / 2 + 2);
      p.lineTo(2, h / 2 + 2); p.closePath();
      shape(g, p, a && a.c1 ? a.c1 : '#7a5a3a', 2.4);
      g.strokeStyle = INK; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(w - 12, h / 2 - 2.4); g.lineTo(w - 12, h / 2 - 7); g.stroke();
    },
    minigun(g, w, h) {
      const p = new Path2D();
      p.moveTo(4, h / 2 - 7); p.lineTo(w - 26, h / 2 - 7);
      p.lineTo(w - 26, h / 2 + 7); p.lineTo(4, h / 2 + 7); p.closePath();
      shape(g, p, '#5a4a3a');
      // barrels
      g.strokeStyle = '#a8a29a'; g.lineWidth = 2.6;
      for (const y of [h / 2 - 4, h / 2, h / 2 + 4]) {
        g.beginPath(); g.moveTo(w - 26, y); g.lineTo(w - 3, y); g.stroke();
        g.strokeStyle = INK; g.lineWidth = 0.8; g.stroke();
        g.strokeStyle = '#a8a29a'; g.lineWidth = 2.6;
      }
    },
    shotgun(g, w, h, a) {
      const p = new Path2D();
      p.moveTo(4, h / 2 - 4); p.lineTo(w - 5, h / 2 - 4);
      p.lineTo(w - 5, h / 2 + 4); p.lineTo(14, h / 2 + 4);
      p.lineTo(11, h - 4); p.lineTo(5, h - 4); p.lineTo(6, h / 2 + 4);
      p.lineTo(4, h / 2 + 4); p.closePath();
      shape(g, p, a && a.c1 ? a.c1 : '#6a4a2a', 2.6);
      g.strokeStyle = INK; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(w - 14, h / 2 - 4); g.lineTo(w - 14, h / 2 + 4); g.stroke();
    },
    launcher(g, w, h, a) {
      const p = new Path2D();
      p.moveTo(6, h / 2 - 6); p.lineTo(w - 8, h / 2 - 6);
      p.lineTo(w - 4, h / 2); p.lineTo(w - 8, h / 2 + 6);
      p.lineTo(6, h / 2 + 6); p.closePath();
      shape(g, p, a && a.c1 ? a.c1 : '#5a564e', 2.6);
      // grip
      const gr = new Path2D();
      gr.moveTo(14, h / 2 + 6); gr.lineTo(20, h / 2 + 6); gr.lineTo(22, h - 3); gr.lineTo(16, h - 3); gr.closePath();
      shape(g, gr, '#4a3a2a', 2);
      if (a && a.big) {
        g.strokeStyle = INK; g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(10, h / 2 - 6); g.lineTo(10, h / 2 + 6); g.stroke();
      }
    },
    can(g, w, h) {
      const p = new Path2D();
      p.moveTo(w / 2 - 8, 5); p.lineTo(w / 2 + 8, 5);
      p.lineTo(w / 2 + 8, h - 5); p.quadraticCurveTo(w / 2, h - 2, w / 2 - 8, h - 5);
      p.closePath();
      shape(g, p, '#c9d4d9');
      g.fillStyle = '#e4573d';
      g.fillRect(w / 2 - 8, 10, 16, 6);
      g.strokeStyle = INK; g.lineWidth = 1.4;
      g.strokeRect(w / 2 - 8, 10, 16, 6);
    },
    beam(g, w, h, a) {
      const p = new Path2D();
      p.moveTo(4, h / 2 - 5); p.lineTo(w - 10, h / 2 - 5);
      p.quadraticCurveTo(w - 3, h / 2, w - 10, h / 2 + 5);
      p.lineTo(4, h / 2 + 5); p.closePath();
      shape(g, p, a && a.c1 ? a.c1 : '#8a5a5a');
      // emitter lens
      g.beginPath(); g.arc(w - 9, h / 2, 3, 0, M.TAU);
      g.fillStyle = '#fff2c8'; g.fill();
      g.strokeStyle = INK; g.lineWidth = 1.6; g.stroke();
      if (a && a.fancy) {
        g.strokeStyle = '#c78fda'; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(8, h / 2 - 8); g.lineTo(w - 12, h / 2 - 8); g.stroke();
        g.beginPath(); g.moveTo(8, h / 2 + 8); g.lineTo(w - 12, h / 2 + 8); g.stroke();
      }
    },
    staff(g, w, h, a) {
      g.strokeStyle = '#7a5a3a'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(4, h / 2 + 4); g.lineTo(w - 14, h / 2 - 4); g.stroke();
      g.strokeStyle = INK; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(4, h / 2 + 4); g.lineTo(w - 14, h / 2 - 4); g.stroke();
      g.beginPath(); g.arc(w - 10, h / 2 - 5, 5, 0, M.TAU);
      g.fillStyle = a && a.c1 ? a.c1 : '#e8b93c'; g.fill();
      g.strokeStyle = INK; g.lineWidth = 1.8; g.stroke();
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = 'rgba(255,255,200,0.35)';
      g.beginPath(); g.arc(w - 10, h / 2 - 5, 9, 0, M.TAU); g.fill();
      g.globalCompositeOperation = 'source-over';
    },
    orb(g, w, h, a) {
      const p = new Path2D();
      p.arc(w / 2, h / 2, h / 2 - 4, 0, M.TAU);
      shape(g, p, a && a.c1 ? a.c1 : '#e8b93c');
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.beginPath(); g.arc(w / 2 - 2, h / 2 - 2, 2.4, 0, M.TAU); g.fill();
    },
    wrench(g, w, h) {
      g.strokeStyle = '#8a8a94'; g.lineWidth = 3.4;
      g.beginPath(); g.moveTo(6, h / 2); g.lineTo(w - 12, h / 2); g.stroke();
      g.strokeStyle = INK; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(6, h / 2); g.lineTo(w - 12, h / 2); g.stroke();
      const p = new Path2D();
      p.moveTo(w - 16, h / 2 - 6); p.lineTo(w - 6, h / 2 - 6); p.lineTo(w - 6, h / 2 - 1);
      p.lineTo(w - 16, h / 2 - 1); p.closePath();
      shape(g, p, '#a8a29a', 2);
    },
    shovel(g, w, h) {
      g.strokeStyle = '#8a6a4a'; g.lineWidth = 3.4;
      g.beginPath(); g.moveTo(4, h / 2); g.lineTo(w - 14, h / 2); g.stroke();
      g.strokeStyle = INK; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(4, h / 2); g.lineTo(w - 14, h / 2); g.stroke();
      const p = new Path2D();
      p.moveTo(w - 18, h / 2 - 6); p.lineTo(w - 4, h / 2 - 6);
      p.quadraticCurveTo(w - 2, h / 2, w - 4, h / 2 + 6);
      p.lineTo(w - 18, h / 2 + 6); p.closePath();
      shape(g, p, '#a8a29a');
    },
    hook(g, w, h) {
      g.strokeStyle = '#8a7a5a'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(4, h / 2); g.lineTo(w - 14, h / 2); g.stroke();
      g.strokeStyle = INK; g.lineWidth = 0.9;
      g.beginPath(); g.moveTo(4, h / 2); g.lineTo(w - 14, h / 2); g.stroke();
      g.strokeStyle = '#a8a29a'; g.lineWidth = 3;
      g.beginPath(); g.arc(w - 12, h / 2 + 3, 6, -Math.PI / 2, Math.PI / 2); g.stroke();
      g.strokeStyle = INK; g.lineWidth = 1.2; g.stroke();
    },
    quill(g, w, h) {
      const p = new Path2D();
      p.moveTo(4, h / 2 + 5); p.quadraticCurveTo(w / 2, h / 2 + 4, w - 6, 4);
      p.quadraticCurveTo(w / 2 + 6, h / 2 - 2, 8, h / 2 - 1); p.closePath();
      shape(g, p, '#f2ead8');
      g.strokeStyle = INK; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(6, h / 2 + 4); g.quadraticCurveTo(w / 2, h / 2 + 2, w - 8, 6); g.stroke();
      g.beginPath(); g.arc(6, h / 2 + 5, 2.4, 0, M.TAU);
      g.fillStyle = '#2a2430'; g.fill(); g.stroke();
    },
    stamp(g, w, h) {
      g.strokeStyle = '#8a6a4a'; g.lineWidth = 3.4;
      g.beginPath(); g.moveTo(6, h / 2); g.lineTo(w - 14, h / 2); g.stroke();
      g.strokeStyle = INK; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(6, h / 2); g.lineTo(w - 14, h / 2); g.stroke();
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = 'rgba(255,190,80,0.6)';
      g.beginPath(); g.arc(w - 10, h / 2, 10, 0, M.TAU); g.fill();
      g.globalCompositeOperation = 'source-over';
      g.beginPath(); g.arc(w - 10, h / 2, 6, 0, M.TAU);
      g.fillStyle = '#ffb36b'; g.fill();
      g.strokeStyle = INK; g.lineWidth = 1.8; g.stroke();
    },
    eraser(g, w, h) {
      const p = new Path2D();
      p.moveTo(4, h / 2 - 7); p.lineTo(w - 8, h / 2 - 7);
      p.quadraticCurveTo(w - 3, h / 2, w - 8, h / 2 + 7);
      p.lineTo(4, h / 2 + 7); p.closePath();
      shape(g, p, '#f2b8c9');
      g.fillStyle = '#4a6ac9';
      g.fillRect(4, h / 2 + 1, w - 12, 6);
      g.strokeStyle = INK; g.lineWidth = 1.4;
      g.strokeRect(4, h / 2 + 1, w - 12, 6);
    },
    dragon(g, w, h) {
      // origami crane-ish dragon
      const p = new Path2D();
      p.moveTo(4, h / 2 + 4);
      p.lineTo(w * 0.4, h / 2 - 8); p.lineTo(w * 0.55, h / 2 + 2);
      p.lineTo(w - 6, h / 2 - 2); p.lineTo(w * 0.5, h / 2 + 8);
      p.closePath();
      shape(g, p, '#f2ead8');
      g.fillStyle = '#e4573d';
      g.beginPath(); g.arc(w - 7, h / 2 - 3, 1.6, 0, M.TAU); g.fill();
    },
    pencil(g, w, h) {
      const p = new Path2D();
      p.moveTo(4, h / 2 - 3); p.lineTo(w - 10, h / 2 - 3);
      p.lineTo(w - 10, h / 2 + 3); p.lineTo(4, h / 2 + 3); p.closePath();
      shape(g, p, '#e8b93c');
      // tip
      const t = new Path2D();
      t.moveTo(w - 10, h / 2 - 3); t.lineTo(w - 3, h / 2); t.lineTo(w - 10, h / 2 + 3); t.closePath();
      shape(g, t, '#e8dcc0', 2);
      g.fillStyle = INK;
      g.beginPath(); g.moveTo(w - 3, h / 2); g.lineTo(w - 6.4, h / 2 - 1.4); g.lineTo(w - 6.4, h / 2 + 1.4); g.closePath(); g.fill();
      g.strokeStyle = INK; g.lineWidth = 1;
      g.beginPath(); g.moveTo(10, h / 2 - 3); g.lineTo(10, h / 2 + 3); g.stroke();
    },
    hose(g, w, h) {
      const p = new Path2D();
      p.moveTo(4, h / 2 - 5); p.lineTo(w - 12, h / 2 - 5);
      p.lineTo(w - 12, h / 2 + 5); p.lineTo(4, h / 2 + 5); p.closePath();
      shape(g, p, '#4a3a2a');
      const n = new Path2D();
      n.moveTo(w - 12, h / 2 - 3); n.lineTo(w - 4, h / 2 - 3);
      n.lineTo(w - 4, h / 2 + 3); n.lineTo(w - 12, h / 2 + 3); n.closePath();
      shape(g, n, '#8a7a5a', 2);
    },
  };

  function getSprite(def) {
    if (!def || !def.art) return null;
    const key = def.id + (def.art.sprite ? ':img' : '');
    let c = cache.get(key);
    if (c) return c;
    const w = def.spriteW || 40, h = def.spriteH || 16;
    if (def.art.sprite) {
      // AI-generated sprite pipeline: a preloaded Image replaces the procedural draw
      const img = SPRITE_IMAGES[def.art.sprite];
      if (img && img.complete && img.naturalWidth) {
        c = G.makeSprite(w + 8, h + 10, (g) => {
          g.drawImage(img, 4, 5, w, h);
        }, 2);
        cache.set(key, c);
        return c;
      }
    }
    c = G.makeSprite(w + 8, h + 10, (g, cw, chh) => {
      g.translate(4, 5);
      const fn = ARCH[def.art.arch];
      if (fn) fn(g, w, h, def.art);
    }, 2);
    cache.set(key, c);
    return c;
  }
  const SPRITE_IMAGES = {};
  function loadSpriteImage(url) {
    const img = new Image();
    img.src = url;
    SPRITE_IMAGES[url] = img;
    return img;
  }

  G.weaponArt = { getSprite, loadSpriteImage, cache, ARCH };
})();
