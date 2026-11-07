/* ============================================================
   Props: trees, plants, rocks — all code-drawn cached sprites.
   Per-instance sway springs, damage states, shatter/fracture,
   burn, topple, ambient critters.
   ============================================================ */
window.G = window.G || {};
(function () {
  'use strict';
  const M = G.M;

  // ---------- shared ink-drawing helpers ----------
  // wobbly closed blob path
  function blobPath(g, cx, cy, r, rng, squish = 1, points = 10) {
    g.beginPath();
    for (let i = 0; i <= points; i++) {
      const a = i / points * M.TAU;
      const rr = r * (0.78 + rng.next() * 0.44);
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * squish;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
  }
  // draw an ink shape: fill (misregistered), highlight, hatch, outline
  function inkShape(g, fillPath, color, ink, rng, opts = {}) {
    const off = 2.2;
    // misregistered fill (slight offset like cheap print)
    g.save();
    g.translate(rng.range(-off, off) * 0.6, rng.range(-off, off) * 0.6);
    g.fillStyle = color;
    g.fill(fillPath);
    g.restore();
    // highlight band
    if (!opts.noHighlight) {
      g.save();
      g.clip(fillPath);
      g.globalAlpha = 0.28;
      g.fillStyle = '#fffbe8';
      g.fillRect(-200, -200, 400, 200 + (opts.hiY != null ? opts.hiY : 0));
      g.restore();
    }
    // hatching
    if (!opts.noHatch) {
      g.save();
      g.clip(fillPath);
      g.globalAlpha = 0.14;
      g.strokeStyle = ink; g.lineWidth = 1;
      const step = opts.hatchStep || 7;
      for (let i = -200; i < 400; i += step) {
        g.beginPath();
        g.moveTo(i, -200); g.lineTo(i + 160, 260);
        g.stroke();
      }
      g.restore();
    }
    g.globalAlpha = 1;
    g.strokeStyle = ink;
    g.lineWidth = opts.lw || 2.6;
    g.lineJoin = 'round';
    g.stroke(fillPath);
  }
  function line(g, x1, y1, x2, y2, ink, lw = 2.4) {
    g.strokeStyle = ink; g.lineWidth = lw; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  }

  // ---------- prop definitions ----------
  // draw(g, w, h, rng, theme) draws in a w*h box, origin top-left.
  // trees split into trunk + canopy.

  // generic canopy maker for broadleaf trees
  function broadCanopy(colors, rBase = 20) {
    return function (g, w, h, rng, T) {
      const ink = T.ink;
      const cx = w / 2, cy = h * 0.2;
      const n = 4 + Math.floor(rng.next() * 3);
      const blobs = [];
      for (let i = 0; i < n; i++) {
        blobs.push([cx + rng.range(-rBase, rBase), cy + rng.range(-rBase * 0.5, rBase * 0.6), rBase * (0.55 + rng.next() * 0.5)]);
      }
      // union path: just draw overlapping blobs back-to-front with outline
      for (let i = 0; i < blobs.length; i++) {
        const [bx, by, r] = blobs[i];
        blobPath(g, bx, by, r, rng, 0.9);
        g.fillStyle = colors[i % colors.length];
        g.save();
        g.translate(rng.range(-2, 2), rng.range(-2, 2));
        g.fill();
        g.restore();
        g.save(); g.clip();
        g.globalAlpha = 0.2; g.fillStyle = '#fffbe8';
        g.fillRect(bx - r, by - r, r * 2, r * 0.8);
        g.restore();
        g.strokeStyle = ink; g.lineWidth = 2.4; g.stroke();
      }
    };
  }
  // conifer canopy: stacked triangles
  function coniferCanopy(color, color2) {
    return function (g, w, h, rng, T) {
      const ink = T.ink;
      const cx = w / 2;
      let y = h * 0.06;
      let wd = w * 0.46;
      while (y < h * 0.78) {
        const p = new Path2D();
        p.moveTo(cx - wd, y + 16);
        p.lineTo(cx + rng.range(-2, 2), y - 14);
        p.lineTo(cx + wd, y + 16);
        p.closePath();
        g.fillStyle = color; g.fill(p);
        g.strokeStyle = ink; g.lineWidth = 2.2; g.stroke(p);
        // needles hatching
        g.save(); g.clip(p); g.globalAlpha = 0.18; g.strokeStyle = ink; g.lineWidth = 1;
        for (let i = -wd; i < wd; i += 4) { g.beginPath(); g.moveTo(cx + i, y + 16); g.lineTo(cx + i - 4, y - 10); g.stroke(); }
        g.restore();
        y += 15; wd *= 0.9;
      }
      // second tone
      g.globalAlpha = 0.35; g.fillStyle = color2;
      g.beginPath(); g.moveTo(cx - w * 0.2, h * 0.1); g.lineTo(cx, h * 0.06); g.lineTo(cx + w * 0.05, h * 0.5); g.closePath(); g.fill();
      g.globalAlpha = 1;
    };
  }

  const P = {};
  function defProp(id, d) { P[id] = d; }

  defProp('tree_oak', {
    name: 'Oak', size: [120, 140], hp: 90, tree: true, material: 'wood', sway: { stiff: 24, damp: 5.5, cls: 'broad' },
    trunk(g, w, h, rng, T) {
      const p = new Path2D(); const bx = w / 2;
      p.moveTo(bx - 8, h); p.quadraticCurveTo(bx - 5, h * 0.55, bx - 4, h * 0.36);
      p.lineTo(bx + 4, h * 0.36); p.quadraticCurveTo(bx + 5, h * 0.55, bx + 8, h); p.closePath();
      inkShape(g, p, '#8a6a4a', T.ink, rng, { hiY: h * 0.5 });
      line(g, bx - 2, h * 0.44, bx - 17, h * 0.3, T.ink, 2);
      line(g, bx + 2, h * 0.4, bx + 16, h * 0.27, T.ink, 2);
    },
    canopy: broadCanopy(['#6f9e54', '#8aae5f', '#5c8a4a']),
  });
  defProp('tree_maple', {
    name: 'Maple', size: [120, 135], hp: 85, tree: true, material: 'wood', sway: { stiff: 22, damp: 5, cls: 'broad' },
    trunk(g, w, h, rng, T) {
      const p = new Path2D(); const bx = w / 2;
      p.moveTo(bx - 7, h); p.quadraticCurveTo(bx - 4, h * 0.5, bx - 3, h * 0.38);
      p.lineTo(bx + 3, h * 0.38); p.quadraticCurveTo(bx + 4, h * 0.5, bx + 7, h); p.closePath();
      inkShape(g, p, '#7d5f43', T.ink, rng, {});
    },
    canopy: broadCanopy(['#d08a3a', '#c26b2f', '#e0a94e']),
  });
  defProp('tree_sakura', {
    name: 'Sakura', size: [115, 130], hp: 70, tree: true, material: 'wood', sway: { stiff: 20, damp: 5, cls: 'broad' },
    trunk(g, w, h, rng, T) {
      const p = new Path2D(); const bx = w / 2;
      p.moveTo(bx - 6, h); p.quadraticCurveTo(bx + 2, h * 0.55, bx - 2, h * 0.4);
      p.lineTo(bx + 5, h * 0.42); p.quadraticCurveTo(bx + 2, h * 0.6, bx + 6, h); p.closePath();
      inkShape(g, p, '#7a5a48', T.ink, rng, {});
    },
    canopy: broadCanopy(['#f2b8c9', '#e79fb6', '#f7cbd7']),
  });
  defProp('tree_pine', {
    name: 'Pine', size: [95, 150], hp: 80, tree: true, material: 'wood', sway: { stiff: 60, damp: 8, cls: 'stiff' },
    trunk(g, w, h, rng, T) {
      const p = new Path2D(); const bx = w / 2;
      p.rect(bx - 4, h * 0.7, 8, h * 0.3);
      inkShape(g, p, '#7a5a40', T.ink, rng, { noHatch: true });
    },
    canopy: coniferCanopy('#4a7050', '#5d8258'),
  });
  defProp('tree_birch', {
    name: 'Birch', size: [95, 140], hp: 65, tree: true, material: 'wood', sway: { stiff: 34, damp: 6, cls: 'stiff' },
    trunk(g, w, h, rng, T) {
      const p = new Path2D(); const bx = w / 2;
      p.moveTo(bx - 5, h); p.quadraticCurveTo(bx - 3, h * 0.5, bx - 2.5, h * 0.12);
      p.lineTo(bx + 2.5, h * 0.12); p.quadraticCurveTo(bx + 3, h * 0.5, bx + 5, h); p.closePath();
      inkShape(g, p, '#e8e4da', T.ink, rng, { noHatch: true });
      // birch dashes
      g.strokeStyle = T.ink; g.lineWidth = 2;
      for (let i = 0; i < 6; i++) { const y = rng.range(h * 0.15, h * 0.9); g.beginPath(); g.moveTo(bx - 2 + rng.range(-2, 2), y); g.lineTo(bx + 2 + rng.range(-1, 3), y + 3); g.stroke(); }
    },
    canopy: broadCanopy(['#9db86e', '#b3c67e'], 15),
  });
  defProp('tree_palm', {
    name: 'Palm', size: [130, 140], hp: 60, tree: true, material: 'wood', sway: { stiff: 18, damp: 4.5, cls: 'broad' },
    trunk(g, w, h, rng, T) {
      const p = new Path2D(); const bx = w * 0.42;
      p.moveTo(bx - 6, h); p.quadraticCurveTo(bx + 8, h * 0.5, bx + 16, h * 0.18);
      p.lineTo(bx + 22, h * 0.22); p.quadraticCurveTo(bx + 13, h * 0.55, bx + 4, h); p.closePath();
      inkShape(g, p, '#9a7a54', T.ink, rng, {});
      for (let i = 1; i < 5; i++) { const t = i / 5; line(g, bx - 4 + 12 * t, h * (1 - t * 0.8), bx + 2 + 12 * t, h * (1 - t * 0.8), T.ink, 1.4); }
    },
    canopy(g, w, h, rng, T) {
      const ink = T.ink, cx = w * 0.42 + 18, cy = h * 0.18;
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI + (i / 5) * Math.PI;
        const ex = cx + Math.cos(a) * 42, ey = cy + Math.abs(Math.sin(a)) * 16 + 8;
        g.strokeStyle = ink; g.lineWidth = 2.4;
        g.beginPath(); g.moveTo(cx, cy);
        g.quadraticCurveTo((cx + ex) / 2, cy - 18 + rng.range(-4, 4), ex, ey);
        g.stroke();
        g.strokeStyle = T.foliage ? T.foliage[0] : '#5f9a54'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(cx, cy);
        g.quadraticCurveTo((cx + ex) / 2, cy - 14 + rng.range(-4, 4), ex, ey + 2);
        g.stroke();
      }
      blobPath(g, cx, cy, 5, rng, 1, 6); g.fillStyle = '#8a6a3a'; g.fill(); g.strokeStyle = ink; g.lineWidth = 2; g.stroke();
    },
  });
  defProp('tree_dead', {
    name: 'Dead Tree', size: [100, 130], hp: 50, tree: true, material: 'wood', sway: { stiff: 40, damp: 7, cls: 'stiff' },
    trunk(g, w, h, rng, T) {
      const ink = T.ink, bx = w / 2;
      const p = new Path2D();
      p.moveTo(bx - 6, h); p.quadraticCurveTo(bx - 3, h * 0.5, bx - 2, h * 0.3); p.lineTo(bx + 2, h * 0.3); p.quadraticCurveTo(bx + 3, h * 0.5, bx + 6, h); p.closePath();
      inkShape(g, p, '#7a6a5a', ink, rng, { noHighlight: true });
      // gnarled branches
      g.strokeStyle = ink; g.lineWidth = 2.6; g.lineCap = 'round';
      const br = (x, y, a, len, d) => {
        if (d > 3 || len < 8) return;
        const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
        br(x2, y2, a - 0.5 + rng.range(-0.2, 0.2), len * 0.72, d + 1);
        br(x2, y2, a + 0.5 + rng.range(-0.2, 0.2), len * 0.68, d + 1);
      };
      br(bx, h * 0.32, -Math.PI / 2 - 0.4, 22, 0);
      br(bx, h * 0.4, -Math.PI / 2 + 0.5, 20, 0);
    },
    canopy(g) { /* none */ },
  });
  defProp('tree_bamboo', {
    name: 'Bamboo', size: [50, 150], hp: 35, tree: true, material: 'wood', sway: { stiff: 14, damp: 3.5, cls: 'light' },
    trunk(g, w, h, rng, T) {
      const ink = T.ink, bx = w / 2;
      const p = new Path2D();
      p.moveTo(bx - 3, h); p.lineTo(bx - 2.4, h * 0.1); p.lineTo(bx + 2.4, h * 0.1); p.lineTo(bx + 3, h); p.closePath();
      inkShape(g, p, '#8fae5a', ink, rng, { noHatch: true });
      for (let i = 1; i < 6; i++) line(g, bx - 3, h * i / 6, bx + 3, h * i / 6, ink, 1.6);
    },
    canopy(g, w, h, rng, T) {
      const ink = T.ink, bx = w / 2;
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI * 0.15 - rng.next() * Math.PI * 0.7;
        const len = 14 + rng.next() * 12;
        const x2 = bx + Math.cos(a) * len, y2 = h * 0.1 + Math.sin(a) * len * 0.5;
        g.strokeStyle = '#7fae5a'; g.lineWidth = 2.2;
        g.beginPath(); g.moveTo(bx, h * 0.12); g.lineTo(x2, y2); g.stroke();
        g.strokeStyle = ink; g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(x2, y2); g.lineTo(x2 + rng.range(-4, 4), y2 - 5); g.stroke();
      }
    },
  });
  defProp('mushroom_giant', {
    name: 'Giant Mushroom', size: [90, 110], hp: 55, tree: true, material: 'wood', sway: { stiff: 10, damp: 3, cls: 'light' },
    trunk(g, w, h, rng, T) {
      const p = new Path2D(); const bx = w / 2;
      p.moveTo(bx - 8, h); p.quadraticCurveTo(bx - 5, h * 0.5, bx - 4, h * 0.42);
      p.lineTo(bx + 4, h * 0.42); p.quadraticCurveTo(bx + 5, h * 0.5, bx + 8, h); p.closePath();
      inkShape(g, p, '#d9cfc0', T.ink, rng, {});
    },
    canopy(g, w, h, rng, T) {
      const p = new Path2D(); const bx = w / 2;
      p.moveTo(8, h * 0.42);
      p.quadraticCurveTo(bx - w * 0.5, h * 0.2, bx, h * 0.04);
      p.quadraticCurveTo(bx + w * 0.5, h * 0.2, w - 8, h * 0.42);
      p.quadraticCurveTo(bx, h * 0.5, 8, h * 0.42);
      p.closePath();
      inkShape(g, p, '#b57edc', T.ink, rng, { hatchStep: 9 });
      g.fillStyle = 'rgba(255,255,255,0.5)';
      for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(rng.range(20, w - 20), rng.range(h * 0.12, h * 0.35), rng.range(2, 4), 0, M.TAU); g.fill(); }
    },
  });
  defProp('mushroom', {
    name: 'Mushroom', size: [34, 34], hp: 12, material: 'wood', sway: { stiff: 30, damp: 6, cls: 'light' },
    draw(g, w, h, rng, T) {
      const p = new Path2D(); const bx = w / 2;
      p.moveTo(bx - 4, h); p.lineTo(bx - 3, h * 0.55); p.lineTo(bx + 3, h * 0.55); p.lineTo(bx + 4, h); p.closePath();
      g.fillStyle = '#e8e0d0'; g.fill(p); g.strokeStyle = T.ink; g.lineWidth = 2; g.stroke(p);
      const cap = new Path2D();
      cap.moveTo(4, h * 0.55); cap.quadraticCurveTo(bx - w * 0.5, h * 0.1, bx, h * 0.12); cap.quadraticCurveTo(bx + w * 0.5, h * 0.1, w - 4, h * 0.55);
      cap.quadraticCurveTo(bx, h * 0.68, 4, h * 0.55); cap.closePath();
      inkShape(g, cap, '#c96a8a', T.ink, rng, { noHatch: true });
    },
  });
  defProp('bush', {
    name: 'Bush', size: [56, 42], hp: 20, material: 'leaf', sway: { stiff: 16, damp: 4, cls: 'light' },
    draw(g, w, h, rng, T) {
    const cols = T.foliage && T.foliage.length ? T.foliage : ['#6f9e54', '#8aae5f'];
    const ink = T.ink;
    for (let i = 0; i < 3; i++) {
      const bx = w / 2 + rng.range(-9, 9), by = h * 0.55 + rng.range(-5, 6), r = 11 + rng.next() * 8;
      blobPath(g, bx, by, r, rng, 0.8);
      g.fillStyle = cols[i % cols.length];
      g.save(); g.translate(rng.range(-1.5, 1.5), rng.range(-1.5, 1.5)); g.fill(); g.restore();
      g.strokeStyle = ink; g.lineWidth = 2.2; g.stroke();
    }
    },
  });
  defProp('bush_berry', {
    name: 'Berry Bush', size: [56, 44], hp: 20, material: 'leaf', sway: { stiff: 16, damp: 4, cls: 'light' },
    draw(g, w, h, rng, T) {
      P.bush.draw(g, w, h, rng, T);
      g.fillStyle = '#c94a5a';
      for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(rng.range(10, w - 10), rng.range(h * 0.35, h * 0.8), 2.4, 0, M.TAU); g.fill(); }
      g.strokeStyle = T.ink; g.lineWidth = 1.2;
      for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(rng.range(10, w - 10), rng.range(h * 0.35, h * 0.8), 2.4, 0, M.TAU); g.stroke(); }
    },
  });
  defProp('flower', {
    name: 'Wildflower', size: [26, 36], hp: 5, material: 'leaf', sway: { stiff: 12, damp: 3, cls: 'light' },
    draw(g, w, h, rng, T) {
      const bx = w / 2;
      line(g, bx, h, bx + rng.range(-2, 2), h * 0.4, '#5c8a4a', 2);
      const cy = h * 0.32;
      const cols = ['#e4573d', '#f2b134', '#e8a7c3', '#5b8dd9'];
      const c = rng.pick ? rng.pick(cols) : cols[Math.floor(rng.next() * cols.length)];
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * M.TAU + rng.next() * 0.4;
        g.fillStyle = c;
        g.beginPath(); g.ellipse(bx + Math.cos(a) * 5, cy + Math.sin(a) * 5, 4, 3, a, 0, M.TAU); g.fill();
        g.strokeStyle = T.ink; g.lineWidth = 1.2; g.stroke();
      }
      g.fillStyle = '#f4e6a0'; g.beginPath(); g.arc(bx, cy, 2.6, 0, M.TAU); g.fill(); g.stroke();
    },
  });
  defProp('fern', {
    name: 'Fern', size: [46, 40], hp: 8, material: 'leaf', sway: { stiff: 13, damp: 3.4, cls: 'light' },
    draw(g, w, h, rng, T) {
      const bx = w / 2, ink = T.ink;
      const col = (T.foliage && T.foliage[0]) || '#5c8a4a';
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.42 + rng.range(-0.08, 0.08);
        const len = h * (0.55 + rng.next() * 0.4);
        const x2 = bx + Math.cos(a) * len, y2 = h - Math.sin(a) * len;
        g.strokeStyle = col; g.lineWidth = 2.2;
        g.beginPath(); g.moveTo(bx, h); g.quadraticCurveTo(bx + Math.cos(a) * len * 0.5, h - Math.sin(a) * len * 0.6, x2, y2); g.stroke();
        g.strokeStyle = ink; g.lineWidth = 0.9;
        g.beginPath(); g.moveTo(bx, h); g.quadraticCurveTo(bx + Math.cos(a) * len * 0.5, h - Math.sin(a) * len * 0.6, x2, y2); g.stroke();
        for (let t = 0.3; t < 1; t += 0.18) {
          const px = bx + Math.cos(a) * len * t, py = h - Math.sin(a) * len * t * 0.9;
          line(g, px, py, px - 4, py - 3, col, 1.6);
          line(g, px, py, px + 4, py - 3, col, 1.6);
        }
      }
    },
  });
  defProp('reeds', {
    name: 'Reeds', size: [40, 56], hp: 8, material: 'leaf', sway: { stiff: 9, damp: 2.6, cls: 'light' }, water: true,
    draw(g, w, h, rng, T) {
      const bx = w / 2, col = (T.foliage && T.foliage[1]) || '#9aae6a';
      for (let i = 0; i < 5; i++) {
        const x = bx + rng.range(-12, 12);
        const lean = rng.range(-8, 8);
        g.strokeStyle = col; g.lineWidth = 2;
        g.beginPath(); g.moveTo(x, h); g.quadraticCurveTo(x + lean, h * 0.5, x + lean * 1.6, h * rng.range(0.1, 0.35)); g.stroke();
        g.strokeStyle = T.ink; g.lineWidth = 1; g.stroke();
        g.fillStyle = '#8a7a4a';
        g.beginPath(); g.ellipse(x + lean * 1.6, h * 0.2, 2, 5, 0, 0, M.TAU); g.fill();
      }
    },
  });
  defProp('rock', {
    name: 'Boulder', size: [70, 54], hp: 120, material: 'stone', sway: null,
    draw(g, w, h, rng, T) {
      const p = new Path2D();
      const pts = 9;
      p.moveTo(w * 0.1, h);
      for (let i = 1; i <= pts; i++) {
        const t = i / pts;
        const a = Math.PI - t * Math.PI;
        const r = 0.32 + rng.next() * 0.14;
        p.lineTo(w / 2 + Math.cos(a) * w * r, h * 0.55 + Math.sin(a) * h * 0.62);
      }
      p.closePath();
      inkShape(g, p, '#a8a29a', T.ink, rng, { hatchStep: 9 });
      g.strokeStyle = T.ink; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(w * 0.3, h * 0.5); g.lineTo(w * 0.42, h * 0.62); g.stroke();
      g.beginPath(); g.moveTo(w * 0.6, h * 0.4); g.lineTo(w * 0.55, h * 0.55); g.stroke();
    },
  });
  defProp('rock_volcanic', {
    name: 'Volcanic Rock', size: [66, 50], hp: 110, material: 'stone', sway: null,
    draw(g, w, h, rng, T) {
      const p = new Path2D();
      p.moveTo(w * 0.12, h);
      p.lineTo(w * 0.06, h * 0.5); p.lineTo(w * 0.3, h * 0.1); p.lineTo(w * 0.7, h * 0.05);
      p.lineTo(w * 0.95, h * 0.5); p.lineTo(w * 0.88, h); p.closePath();
      inkShape(g, p, '#57433a', T.ink, rng, { hatchStep: 8 });
      g.strokeStyle = 'rgba(255,120,40,0.8)'; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(w * 0.3, h * 0.7); g.lineTo(w * 0.45, h * 0.5); g.lineTo(w * 0.38, h * 0.3); g.stroke();
    },
  });
  defProp('rock_crystal', {
    name: 'Crystal', size: [54, 70], hp: 60, material: 'crystal', sway: null, glow: true,
    draw(g, w, h, rng, T) {
      const cx = w / 2;
      const spike = (x, hw, top, bot, col) => {
        const p = new Path2D();
        p.moveTo(x - hw, bot); p.lineTo(x - hw * 0.4, top); p.lineTo(x + hw * 0.5, top + 4); p.lineTo(x + hw, bot); p.closePath();
        inkShape(g, p, col, T.ink, rng, { noHatch: true, noHighlight: false });
      };
      const accent = T.accent || '#7de8c3';
      spike(cx - 10, 8, h * 0.3, h, '#8ae8d0');
      spike(cx + 8, 9, h * 0.2, h, accent);
      spike(cx, 6, h * 0.05, h * 0.9, '#a8f0e0');
    },
  });
  defProp('ice_spire', {
    name: 'Ice Spire', size: [48, 84], hp: 45, material: 'crystal', sway: null, slippery: true,
    draw(g, w, h, rng, T) {
      const p = new Path2D(); const cx = w / 2;
      p.moveTo(cx - 14, h); p.lineTo(cx - 8, h * 0.4); p.lineTo(cx - 2, h * 0.08);
      p.lineTo(cx + 6, h * 0.3); p.lineTo(cx + 13, h); p.closePath();
      inkShape(g, p, '#bfe2f0', T.ink, rng, { noHatch: true });
      g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(cx - 4, h * 0.8); g.lineTo(cx + 1, h * 0.3); g.stroke();
    },
  });
  defProp('cactus', {
    name: 'Cactus', size: [56, 90], hp: 45, material: 'leaf', sway: { stiff: 45, damp: 8, cls: 'stiff' },
    draw(g, w, h, rng, T) {
      const cx = w / 2, ink = T.ink;
      const p = new Path2D();
      p.moveTo(cx - 9, h); p.lineTo(cx - 8, h * 0.25); p.quadraticCurveTo(cx, h * 0.1, cx + 8, h * 0.25); p.lineTo(cx + 9, h); p.closePath();
      inkShape(g, p, '#6a9a5a', ink, rng, { hatchStep: 6 });
      // arms
      const arm = (sx, dir) => {
        const a = new Path2D();
        a.moveTo(cx + sx * 8, h * 0.5);
        a.lineTo(cx + sx * 8 + sx * 14, h * 0.5);
        a.lineTo(cx + sx * 8 + sx * 14, h * 0.38);
        a.lineTo(cx + sx * 8, h * 0.38); a.closePath();
        g.fillStyle = '#6a9a5a'; g.fill(a); g.strokeStyle = ink; g.lineWidth = 2.4; g.stroke(a);
      };
      if (rng.next() < 0.7) arm(-1, 0);
      if (rng.next() < 0.7) arm(1, 0);
      // spines
      g.strokeStyle = ink; g.lineWidth = 1;
      for (let i = 0; i < 10; i++) { const x = cx + rng.range(-7, 7), y = rng.range(h * 0.2, h * 0.95); g.beginPath(); g.moveTo(x, y); g.lineTo(x + rng.range(-2, 2), y - 3); g.stroke(); }
    },
  });
  defProp('ruin_pillar', {
    name: 'Ruin Pillar', size: [46, 110], hp: 140, material: 'stone', sway: null,
    draw(g, w, h, rng, T) {
      const p = new Path2D(); const cx = w / 2;
      const broken = rng.next() < 0.6;
      const topY = broken ? h * rng.range(0.2, 0.45) : h * 0.08;
      p.moveTo(cx - 12, h); p.lineTo(cx - 11, topY + 6);
      if (broken) { p.lineTo(cx - 4, topY); p.lineTo(cx + 3, topY + 8); } else { p.lineTo(cx - 14, topY); p.lineTo(cx + 14, topY); }
      p.lineTo(cx + 11, topY + 6); p.lineTo(cx + 12, h); p.closePath();
      inkShape(g, p, '#b5a890', T.ink, rng, { hatchStep: 10 });
      g.strokeStyle = T.ink; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(cx - 6, h * 0.7); g.lineTo(cx + 2, h * 0.6); g.stroke();
    },
  });
  defProp('lamp_post', {
    name: 'Lantern Post', size: [40, 120], hp: 60, material: 'metal', sway: null, light: true,
    draw(g, w, h, rng, T) {
      const cx = w / 2, ink = T.ink;
      line(g, cx, h, cx, h * 0.2, ink, 4);
      const p = new Path2D();
      p.moveTo(cx - 8, h * 0.2); p.lineTo(cx - 6, h * 0.06); p.lineTo(cx + 6, h * 0.06); p.lineTo(cx + 8, h * 0.2); p.closePath();
      g.fillStyle = '#ffd98a'; g.fill(p);
      g.strokeStyle = ink; g.lineWidth = 2.4; g.stroke(p);
      g.fillStyle = 'rgba(255,200,100,0.35)';
      g.beginPath(); g.arc(cx, h * 0.12, 12, 0, M.TAU); g.fill();
    },
  });
  defProp('crate_metal', {
    name: 'Scrap Crate', size: [52, 52], hp: 80, material: 'metal', sway: null,
    draw(g, w, h, rng, T) {
      const ink = T.ink;
      G.handRect(g, 4, 4, w - 8, h - 8, rng.int(1, 999), 6);
      g.fillStyle = '#948e8c'; g.fill();
      g.strokeStyle = ink; g.lineWidth = 2.6; g.stroke();
      line(g, 8, h * 0.5, w - 8, h * 0.45, ink, 2);
      g.fillStyle = ink;
      g.beginPath(); g.arc(w * 0.3, h * 0.3, 2.5, 0, M.TAU); g.fill();
      g.beginPath(); g.arc(w * 0.7, h * 0.65, 2.5, 0, M.TAU); g.fill();
    },
  });
  defProp('gear', {
    name: 'Great Gear', size: [64, 64], hp: 70, material: 'metal', sway: null,
    draw(g, w, h, rng, T) {
      const cx = w / 2, cy = h / 2, ink = T.ink, r = w * 0.32;
      g.beginPath();
      const teeth = 9;
      for (let i = 0; i < teeth; i++) {
        const a0 = i / teeth * M.TAU, a1 = (i + 0.5) / teeth * M.TAU;
        g.lineTo(cx + Math.cos(a0) * r * 1.28, cy + Math.sin(a0) * r * 1.28);
        g.lineTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
      }
      g.closePath();
      g.fillStyle = '#a8a29a'; g.fill();
      g.strokeStyle = ink; g.lineWidth = 2.4; g.stroke();
      g.fillStyle = T.paper || '#f2ead8';
      g.beginPath(); g.arc(cx, cy, r * 0.4, 0, M.TAU); g.fill(); g.stroke();
    },
  });
  defProp('bookshelf', {
    name: 'Drowned Shelf', size: [80, 100], hp: 70, material: 'wood', sway: null,
    draw(g, w, h, rng, T) {
      const ink = T.ink;
      G.handRect(g, 3, 3, w - 6, h - 6, rng.int(1, 999), 4);
      g.fillStyle = '#8a6a4a'; g.fill(); g.strokeStyle = ink; g.lineWidth = 2.6; g.stroke();
      const cols = ['#e4573d', '#5b8dd9', '#78c6a3', '#c78fda', '#f2b134'];
      for (let s = 0; s < 3; s++) {
        const y = 10 + s * (h - 20) / 3;
        line(g, 6, y, w - 6, y, ink, 2);
        let x = 8;
        while (x < w - 12) {
          const bw = rng.range(6, 12);
          g.fillStyle = cols[Math.floor(rng.next() * cols.length)];
          g.fillRect(x, y + 2, Math.min(bw, w - 12 - x), (h - 20) / 3 - 5);
          g.strokeStyle = ink; g.lineWidth = 1.2;
          g.strokeRect(x, y + 2, Math.min(bw, w - 12 - x), (h - 20) / 3 - 5);
          x += bw + 2;
        }
      }
    },
  });
  defProp('stump', {
    name: 'Stump', size: [40, 30], hp: 60, material: 'wood', sway: null,
    draw(g, w, h, rng, T) {
      const p = new Path2D(); const cx = w / 2;
      p.moveTo(cx - 13, h); p.lineTo(cx - 12, h * 0.35); p.lineTo(cx + 12, h * 0.35); p.lineTo(cx + 13, h); p.closePath();
      inkShape(g, p, '#8a6a4a', T.ink, rng, {});
      const e = new Path2D();
      e.ellipse(cx, h * 0.35, 12, 5, 0, 0, M.TAU);
      g.fillStyle = '#d9c9a8'; g.fill(e); g.strokeStyle = T.ink; g.lineWidth = 2.2; g.stroke(e);
      g.strokeStyle = T.ink; g.lineWidth = 1;
      g.beginPath(); g.ellipse(cx, h * 0.35, 6, 2.5, 0, 0, M.TAU); g.stroke();
    },
  });

  // ---------- sprite cache ----------
  const spriteCache = new G.LRUCache(160 * 1024 * 1024);
  const SS = 2; // supersample
  function getSprite(kind, variant, theme, layer) {
    const key = kind + ':' + variant + ':' + theme.id + ':' + layer;
    let c = spriteCache.get(key);
    if (c) return c;
    const def = P[kind];
    if (!def) return null;
    const [w, h] = def.size;
    const rng = G.RNG.make(variant * 7919 + 13);
    c = G.makeSprite(w + 24, h + 24, (g, cw, ch) => {
      g.translate(12, 12);
      const drawFn = layer === 'trunk' ? def.trunk : layer === 'canopy' ? def.canopy : def.draw;
      if (drawFn) drawFn(g, w, h, rng, theme);
    }, SS);
    spriteCache.set(key, c);
    return c;
  }

  // ---------- prop instances ----------
  let nextId = 1;
  class Prop {
    constructor(kind, x, y, variant, theme) {
      this.id = nextId++;
      this.kind = kind; this.x = x; this.y = y;
      this.def = P[kind];
      this.variant = variant;
      this.theme = theme;
      this.maxHp = this.def.hp; this.hp = this.maxHp;
      this.dead = false;
      this.sway = this.def.sway ? new G.Spring(this.def.sway.stiff, this.def.sway.damp) : null;
      this.phase = Math.random() * 10;
      this.scale = 0.85 + Math.random() * 0.35;
      this.burning = 0; this.charred = 0;
      this.falling = false; this.rot = 0; this.vrot = 0; this.vx = 0; this.vy = 0;
      this.toppled = false;
    }
    get w() { return this.def.size[0] * this.scale; }
    get h() { return this.def.size[1] * this.scale; }
    // anchor: x = center, y = base (bottom)
    update(dt, world) {
      if (this.dead) return;
      if (this.falling) {
        // falling trunk physics (simple)
        this.vy += 1800 * dt;
        this.x += this.vx * dt; this.y += this.vy * dt;
        this.rot += this.vrot * dt;
        const terrain = world.terrain;
        if (this.vy > 0 && terrain.solidAt(this.x, this.y)) {
          // landed
          this.y = terrain.surfaceY(this.x, this.y - 60);
          if (Math.abs(this.vy) > 300) this.damage(Math.abs(this.vy) * 0.08, 'impact');
          this.vy = 0; this.vx *= 0.5; this.vrot *= 0.3;
          if (Math.abs(this.vrot) < 0.4 && Math.abs(this.vx) < 20) { this.falling = false; this.toppled = true; }
        }
        if (this.y > world.mapH + 300) this.dead = true;
        return;
      }
      // sway
      if (this.sway) {
        const vb = world.viewBounds;
        const onScreen = this.x > vb.x0 - 200 && this.x < vb.x1 + 200;
        if (onScreen || this.sway.x > 0.2) {
          const gust = G.wind.gustAt(this.x, world.time + this.phase);
          const breathe = Math.sin(world.time * 0.7 + this.phase) * 0.02;
          this.sway.target = G.M.clamp(gust * 0.0009 + breathe, -0.35, 0.35);
          this.sway.step(dt);
        } else {
          this.sway.x = this.sway.target; this.sway.v = 0;
        }
      }
      // burning
      if (this.burning > 0) {
        this.burning += dt;
        this.hp -= dt * 9;
        if (Math.random() < dt * 14) G.vfx.fire(this.x + G.M.rand(-this.w * 0.3, this.w * 0.3), this.y - G.M.rand(0, this.h * 0.8));
        if (this.burning > 5) this.charred = Math.min(1, this.charred + dt * 0.2);
        if (this.hp <= 0) this.shatter(world);
      }
    }
    damage(dmg, cause) {
      if (this.dead) return;
      this.hp -= dmg;
      if (this.hp <= 0) {
        if (cause === 'chop' && this.def.tree) this.chop();
        else this.shatter(G.world);
      }
    }
    chop() {
      // tree falls: stump + falling top
      this.dead = true;
      const world = G.world;
      if (world) {
        world.addProp(new Prop('stump', this.x, this.y, this.variant, this.theme));
        const top = new Prop(this.kind, this.x, this.y, this.variant, this.theme);
        top.falling = true; top.vrot = G.M.rand(1.5, 2.6) * (Math.random() < 0.5 ? -1 : 1);
        top.vx = G.M.rand(-40, 40); top.vy = -80;
        top.hp = this.hp; top.maxHp = this.maxHp;
        world.addProp(top);
        for (let i = 0; i < 8; i++) G.vfx.leaf(this.x + G.M.rand(-20, 20), this.y - this.h * G.M.rand(0.5, 1));
        G.audio.play('woodchop', { x: this.x, y: this.y });
      }
    }
    shatter(world) {
      this.dead = true;
      if (!world) return;
      // fracture: sample sprite pixels into shard bodies
      const sprite = getSprite(this.kind, this.variant, this.theme, this.def.tree ? 'trunk' : 'full');
      const small = document.createElement('canvas');
      const sw = 24, sh = 24;
      small.width = sw; small.height = sh;
      const sg = small.getContext('2d');
      sg.drawImage(sprite, 0, 0, sw, sh);
      let data;
      try { data = sg.getImageData(0, 0, sw, sh).data; } catch (e) { data = null; }
      const cell = Math.max(3, this.w / 5);
      for (let gy = 0; gy < 5; gy++) {
        for (let gx = 0; gx < 5; gx++) {
          if (Math.random() < 0.35) continue;
          const px = (Math.floor((gx + 0.5) / 5 * sw) + Math.floor((gy + 0.5) / 5 * sh) * sw) * 4;
          let r = 120, g = 110, b = 100, a = 255;
          if (data) { r = data[px]; g = data[px + 1]; b = data[px + 2]; a = data[px + 3]; }
          if (a < 40) continue;
          const wx = this.x - this.w / 2 + (gx + 0.5) / 5 * this.w;
          const wy = this.y - this.h + (gy + 0.5) / 5 * this.h;
          world.spawnBody({
            x: wx, y: wy,
            vx: G.M.rand(-140, 140), vy: G.M.rand(-260, -60),
            w: cell, h: cell,
            color: `rgb(${r},${g},${b})`,
            buoyancy: this.def.material === 'wood' ? 0.9 : 0.1,
            rot: 0, vrot: G.M.rand(-6, 6),
          });
        }
      }
      G.audio.play('shatter', { x: this.x, y: this.y });
      G.bus.emit('propDestroyed', this);
    }
    // terrain under prop removed?
    checkSupport(world) {
      if (this.dead || this.falling || this.toppled) return;
      const t = world.terrain;
      const left = t.solidAt(this.x - this.w * 0.3, this.y + 6);
      const right = t.solidAt(this.x + this.w * 0.3, this.y + 6);
      if (!left && !right) {
        this.falling = true;
        this.vrot = G.M.rand(-1, 1);
      }
    }
    draw(ctx) {
      if (this.dead) return;
      const def = this.def;
      const vb = G.world.viewBounds;
      if (this.x < vb.x0 - 150 || this.x > vb.x1 + 150 || this.y < vb.y0 - 250 || this.y > vb.y1 + 150) return;
      const boilA = (G.boil(this.id % 97) % 100) / 100;
      const jitter = Math.sin(boilA * 40 + this.id) * 0.012;
      ctx.save();
      ctx.translate(this.x, this.y);
      if (this.falling || this.toppled) ctx.rotate(this.rot);
      ctx.scale(this.scale, this.scale);
      const swayA = this.sway ? this.sway.x : 0;
      if (def.tree) {
        // trunk
        const body = getSprite(this.kind, this.variant, this.theme, 'trunk');
        if (body) {
          const bw = def.size[0], bh = def.size[1];
          ctx.drawImage(body, -bw / 2 - 12, -bh - 12, bw + 24, bh + 24);
        }
        // canopy with sway + breathe
        if (def.canopy) {
          ctx.save();
          ctx.translate(0, -def.size[1] * 0.8);
          ctx.rotate(swayA + jitter);
          const breathe = 1 + Math.sin(G.world.time * 1.1 + this.phase) * 0.02;
          ctx.scale(1, breathe);
          const cw = def.size[0] + 24, ch = def.size[1] + 24;
          const can = getSprite(this.kind, this.variant, this.theme, 'canopy');
          if (can) ctx.drawImage(can, -cw / 2, -ch + def.size[1] * 0.8 - 12, cw, ch);
          ctx.restore();
        }
      } else {
        // whole-prop sway for small plants; static for rocks etc.
        if (this.sway) ctx.rotate(swayA * 0.5 + jitter);
        const body2 = getSprite(this.kind, this.variant, this.theme, 'full');
        if (body2) {
          const bw = def.size[0] + 24, bh = def.size[1] + 24;
          ctx.drawImage(body2, -bw / 2, -bh, bw, bh);
        }
      }
      // damage cracks
      if (this.hp < this.maxHp * 0.66) {
        ctx.strokeStyle = this.theme.ink; ctx.lineWidth = 1.6;
        const rng = G.RNG.make(this.id * 31);
        const n = this.hp < this.maxHp * 0.33 ? 4 : 2;
        for (let i = 0; i < n; i++) {
          let x = rng.range(-this.w * 0.3, this.w * 0.3), y = -rng.range(0, this.h);
          ctx.beginPath(); ctx.moveTo(x, y);
          for (let s = 0; s < 3; s++) { x += rng.range(-8, 8); y += rng.range(2, 10); ctx.lineTo(x, y); }
          ctx.stroke();
        }
      }
      // charred overlay
      if (this.charred > 0.05) {
        ctx.globalAlpha = this.charred * 0.7;
        ctx.fillStyle = '#241a14';
        ctx.fillRect(-this.w / 2, -this.h, this.w, this.h);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }
  }

  // ---------- prop system ----------
  const props = {
    defs: P,
    all: [],
    spawnTimer: 0,
    clear() { this.all.length = 0; },
    add(p) { this.all.push(p); },
    removeDead() {
      const a = this.all;
      for (let i = a.length - 1; i >= 0; i--) if (a[i].dead) a.splice(i, 1);
    },
    // populate world from biome
    populate(world, density = 1) {
      const biome = world.biome;
      const mix = biome.props || { tree_oak: 2, bush: 2, flower: 2 };
      const kinds = Object.keys(mix);
      const totalWeight = kinds.reduce((s, k) => s + mix[k], 0);
      const targetCount = Math.floor(world.mapW / 130 * density);
      const rng = G.RNG.make((Math.random() * 1e9) | 0);
      for (let i = 0; i < targetCount; i++) {
        const kind = G.M.weightedPick(kinds, k => mix[k]);
        const x = rng.range(60, world.mapW - 60);
        const sy = world.terrain.surfaceY(x);
        if (sy > world.mapH - 30) continue;
        const def = P[kind];
        if (!def) continue;
        const prop = new Prop(kind, x, sy + 2, rng.int(0, 9999), world.theme);
        // reeds can sit in shallow water
        if (!def.water && world.water.level !== Infinity && sy >= world.water.level - 10) continue;
        // spacing check for trees
        if (def.tree) {
          let tooClose = false;
          for (const p of this.all) {
            if (p.def.tree && Math.abs(p.x - x) < 70) { tooClose = true; break; }
          }
          if (tooClose) continue;
        }
        this.all.push(prop);
      }
    },
    update(dt, world) {
      const vb = world.viewBounds;
      for (const p of this.all) {
        if (p.x < vb.x0 - 400 || p.x > vb.x1 + 400) {
          // far away: cheap update (no sway physics)
          if (p.burning > 0) p.update(dt, world); else continue;
        } else {
          p.update(dt, world);
        }
      }
      this.removeDead();
    },
    draw(ctx, layer) {
      const vb = G.world.viewBounds;
      if (layer === 'bg') {
        // background silhouette props skipped (drawn by backdrop)
      } else {
        for (const p of this.all) p.draw(ctx);
      }
    },
    damageAt(x, y, r, dmg, cause) {
      for (const p of this.all) {
        if (p.dead || p.falling) continue;
        if (Math.abs(p.x - x) < r + p.w / 2 && y + r > p.y - p.h && y - r < p.y) {
          p.damage(dmg, cause);
        }
      }
    },
    onTerrainEdit(x, y, r) {
      for (const p of this.all) {
        if (p.dead) continue;
        if (Math.abs(p.x - x) < r + 60 && Math.abs(p.y - y) < r + 120) p.checkSupport(G.world);
      }
    },
  };

  // ---------- ambient critters ----------
  const critters = [];
  const critterSys = {
    spawnFor(world) {
      critters.length = 0;
      const type = world.biome.critters || 'birds';
      const n = 6 + Math.floor(Math.random() * 6);
      for (let i = 0; i < n; i++) {
        critters.push({
          type: type === 'fireflies' ? 'bug' : type === 'bats' ? 'bat' : 'bird',
          x: Math.random() * world.mapW, y: Math.random() * world.mapH * 0.4,
          vx: G.M.rand(-40, 40), vy: G.M.rand(-10, 10),
          phase: Math.random() * 10, scared: 0,
        });
      }
    },
    update(dt, world) {
      const vb = world.viewBounds;
      for (const c of critters) {
        c.scared = Math.max(0, c.scared - dt);
        if (c.scared > 0) { c.vx += G.M.rand(-400, 400) * dt; c.vy += G.M.rand(-300, 300) * dt; }
        c.vx += Math.sin(world.time * 0.6 + c.phase) * 8 * dt;
        c.vy += Math.cos(world.time * 0.8 + c.phase * 1.3) * 8 * dt;
        c.vx = G.M.clamp(c.vx, -90, 90); c.vy = G.M.clamp(c.vy, -60, 60);
        c.x += c.vx * dt; c.y += c.vy * dt;
        if (c.x < vb.x0 - 200) c.x = vb.x1 + 180;
        if (c.x > vb.x1 + 200) c.x = vb.x0 - 180;
        c.y = G.M.clamp(c.y, 40, world.mapH * 0.5);
      }
    },
    scare(x, y, r) {
      for (const c of critters) {
        if (G.M.dist(c.x, c.y, x, y) < r) { c.scared = 1.2; const a = G.M.ang(x, y, c.x, c.y); c.vx += Math.cos(a) * 200; c.vy += Math.sin(a) * 200; }
      }
    },
    draw(ctx) {
      const vb = G.world.viewBounds;
      ctx.save();
      ctx.fillStyle = 'rgba(50,42,36,0.8)';
      for (const c of critters) {
        if (c.x < vb.x0 - 50 || c.x > vb.x1 + 50) continue;
        const flap = Math.sin(performance.now() * 0.02 + c.phase * 7);
        if (c.type === 'bird') {
          ctx.strokeStyle = 'rgba(50,42,36,0.7)'; ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(c.x - 6, c.y + flap * 3);
          ctx.lineTo(c.x, c.y);
          ctx.lineTo(c.x + 6, c.y + flap * 3);
          ctx.stroke();
        } else {
          ctx.fillStyle = c.type === 'bug' ? 'rgba(255,235,130,0.9)' : 'rgba(40,36,48,0.9)';
          ctx.beginPath(); ctx.arc(c.x, c.y, c.type === 'bug' ? 1.8 : 2.6, 0, G.M.TAU); ctx.fill();
          if (c.type === 'bug') {
            ctx.fillStyle = 'rgba(255,235,130,0.25)';
            ctx.beginPath(); ctx.arc(c.x, c.y, 6, 0, G.M.TAU); ctx.fill();
          }
        }
      }
      ctx.restore();
    },
  };

  G.props = props;
  G.critters = critterSys;
  G.Prop = Prop;
  G.propSprites = { getSprite, cache: spriteCache };
})();
