/* ============================================================
   Victory screen: a real 3D scene (perspective projection,
   orbiting camera, podium, spotlight, depth-sorted confetti)
   drawn in the current biome palette.
   ============================================================ */
window.G = window.G || {};
(function () {
  'use strict';
  const M = G.M;

  // tiny 3D helpers
  function project(p, cam) {
    const dx = p.x - cam.x, dy = p.y - cam.y, dz = p.z - cam.z;
    // camera orbits: rotate around Y
    const ca = Math.cos(cam.a), sa = Math.sin(cam.a);
    const x = dx * ca - dz * sa;
    const z = dx * sa + dz * ca;
    if (z <= 0.1) return null;
    return { x: cam.fov / z * x + cam.cx, y: cam.fov / z * -dy + cam.cy, s: cam.fov / z };
  }

  const v3 = {
    show(match) {
      const world = match.world;
      const biome = world.biome;
      const winner = match.champion;
      const isTeam = winner && winner.team !== undefined && !(winner instanceof G.Character);
      const name = isTeam ? ('Team ' + winner.team) : (winner ? (winner === world.player ? 'YOU' : winner.name) : 'Nobody');
      const color = isTeam ? (G.PLAYER_COLORS[winner.team % G.PLAYER_COLORS.length]) : (winner ? winner.color : '#8a7f6a');

      const wrap = document.createElement('div');
      wrap.className = 'screen victory-screen';
      wrap.innerHTML = `
        <canvas class="v3d"></canvas>
        <div class="v3d-ui">
          <div class="v3d-title">CHAMPION</div>
          <div class="v3d-name" style="color:${color}">${name}</div>
          <div class="v3d-sub">${match.round} round${match.round !== 1 ? 's' : ''} · ${match.modeDef().name}</div>
          <button class="btn big" id="v3d-continue">Back to Menu</button>
        </div>`;
      document.getElementById('screens').appendChild(wrap);

      const canvas = wrap.querySelector('.v3d');
      const ctx2 = canvas.getContext('2d');
      const confetti = [];
      for (let i = 0; i < 260; i++) {
        confetti.push({
          x: M.rand(-16, 16), y: M.rand(2, 22), z: M.rand(-8, 8),
          vy: M.rand(1.5, 4), vx: M.rand(-0.6, 0.6), vz: M.rand(-0.4, 0.4),
          rot: M.rand(0, 6.3), vr: M.rand(-4, 4),
          c: M.pick(['#e4573d', '#f2b134', '#78c6a3', '#5b8dd9', '#c78fda', biome.accent || '#e8b93c']),
          w: M.rand(0.25, 0.5), h: M.rand(0.15, 0.35),
        });
      }
      const cam = { x: 0, y: 6, z: 14, a: 0, fov: 620, cx: 0, cy: 0 };
      let t = 0, raf = 0, done = false;

      function resize() {
        canvas.width = window.innerWidth * Math.min(2, window.devicePixelRatio || 1);
        canvas.height = window.innerHeight * Math.min(2, window.devicePixelRatio || 1);
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        cam.cx = canvas.width / 2;
        cam.cy = canvas.height * 0.52;
        cam.fov = canvas.height * 0.9;
      }
      resize();
      window.addEventListener('resize', resize);

      // winner billboard sprite (character drawn to offscreen)
      let winnerSprite = null;
      if (winner instanceof G.Character) {
        winnerSprite = G.makeSprite(90, 110, (g, w, h) => {
          g.translate(w / 2, h - 4);
          g.scale(1.6, 1.6);
          winner.draw(g, 1);
        }, 2);
      }

      function frame() {
        if (done) return;
        raf = requestAnimationFrame(frame);
        t += 1 / 60;
        cam.a = Math.sin(t * 0.3) * 0.55;
        cam.z = 13 + Math.sin(t * 0.17) * 1.6;
        cam.y = 5.4 + Math.sin(t * 0.4) * 0.4;
        const g = ctx2;
        // sky (paper)
        const sky = g.createLinearGradient(0, 0, 0, canvas.height);
        sky.addColorStop(0, biome.sky[0]);
        sky.addColorStop(1, biome.sky[2]);
        g.fillStyle = sky;
        g.fillRect(0, 0, canvas.width, canvas.height);
        // floor: perspective grid
        const cam2 = { ...cam, cx: canvas.width / 2, cy: canvas.height * 0.62 };
        g.strokeStyle = 'rgba(90,74,58,0.25)';
        g.lineWidth = 1;
        for (let i = -12; i <= 12; i += 2) {
          const a = project({ x: i, y: 0, z: -20 }, cam2), b = project({ x: i, y: 0, z: 6 }, cam2);
          if (a && b) { g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
        }
        for (let zi = -20; zi <= 6; zi += 2) {
          const a = project({ x: -12, y: 0, z: zi }, cam2), b = project({ x: 12, y: 0, z: zi }, cam2);
          if (a && b) { g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
        }
        // podium (3 boxes, depth-sorted back to front)
        const boxes = [
          { x: 0, y: 0.8, z: 0, w: 3.2, h: 1.6, d: 3.2, c: '#e8dcc0', label: '1' },
          { x: -2.6, y: 0.4, z: 1.2, w: 2, h: 0.8, d: 2, c: '#d9c9a8', label: '2' },
          { x: 2.6, y: 0.25, z: 1.4, w: 2, h: 0.5, d: 2, c: '#c9b890', label: '3' },
        ];
        for (const b of boxes) {
          // top face
          const c1 = project({ x: b.x - b.w / 2, y: b.y, z: b.z - b.d / 2 }, cam2);
          const c2 = project({ x: b.x + b.w / 2, y: b.y, z: b.z - b.d / 2 }, cam2);
          const c3 = project({ x: b.x + b.w / 2, y: b.y, z: b.z + b.d / 2 }, cam2);
          const c4 = project({ x: b.x - b.w / 2, y: b.y, z: b.z + b.d / 2 }, cam2);
          // front face
          const f1 = project({ x: b.x - b.w / 2, y: b.y, z: b.z + b.d / 2 }, cam2);
          const f2 = project({ x: b.x + b.w / 2, y: b.y, z: b.z + b.d / 2 }, cam2);
          const f3 = project({ x: b.x + b.w / 2, y: b.y - b.h, z: b.z + b.d / 2 }, cam2);
          const f4 = project({ x: b.x - b.w / 2, y: b.y - b.h, z: b.z + b.d / 2 }, cam2);
          if (f1 && f2 && f3 && f4) {
            g.fillStyle = b.c;
            g.beginPath(); g.moveTo(f1.x, f1.y); g.lineTo(f2.x, f2.y); g.lineTo(f3.x, f3.y); g.lineTo(f4.x, f4.y);
            g.closePath(); g.fill();
            g.strokeStyle = biome.ink || '#3b2f26'; g.lineWidth = 2.4; g.stroke();
          }
          if (c1 && c2 && c3 && c4) {
            g.fillStyle = '#f2ead8';
            g.beginPath(); g.moveTo(c1.x, c1.y); g.lineTo(c2.x, c2.y); g.lineTo(c3.x, c3.y); g.lineTo(c4.x, c4.y);
            g.closePath(); g.fill();
            g.strokeStyle = biome.ink || '#3b2f26'; g.lineWidth = 2; g.stroke();
          }
        }
        // spotlight cone
        g.save();
        g.globalCompositeOperation = 'lighter';
        const top = project({ x: 0, y: 10, z: 0 }, cam2);
        const bot = project({ x: 0, y: 1.7, z: 0 }, cam2);
        if (top && bot) {
          const grad = g.createRadialGradient(bot.x, bot.y, 4, bot.x, bot.y, 200);
          grad.addColorStop(0, 'rgba(255,240,190,0.55)');
          grad.addColorStop(1, 'rgba(255,240,190,0)');
          g.fillStyle = grad;
          g.beginPath();
          g.moveTo(top.x - 14, top.y);
          g.lineTo(top.x + 14, top.y);
          g.lineTo(bot.x + 120, bot.y + 100);
          g.lineTo(bot.x - 120, bot.y + 100);
          g.closePath();
          g.fill();
        }
        g.restore();
        // winner on podium
        if (winnerSprite) {
          const base = project({ x: 0, y: 1.6, z: 0 }, cam2);
          if (base) {
            const scale = base.s * 0.055;
            const bob = Math.sin(t * 2) * 3;
            g.drawImage(winnerSprite, base.x - 45 * scale / 2, base.y - 110 * scale + bob, 45 * scale, 110 * scale);
          }
        } else {
          // team trophy
          const base = project({ x: 0, y: 1.6, z: 0 }, cam2);
          if (base) {
            const s = base.s * 0.05;
            g.font = `${20 * s}px serif`;
            g.fillStyle = color;
            g.textAlign = 'center';
            g.fillText('♛', base.x, base.y - 20 * s);
          }
        }
        // confetti (depth sort)
        confetti.sort((a, b) => (b.z - a.z));
        for (const c of confetti) {
          c.y -= c.vy * 1 / 60;
          c.x += c.vx * 1 / 60 + Math.sin(t + c.rot) * 0.01;
          c.z += c.vz * 1 / 60;
          c.rot += c.vr * 1 / 60;
          if (c.y < 0) { c.y = M.rand(14, 22); c.x = M.rand(-16, 16); c.z = M.rand(-8, 8); }
          const p = project(c, cam2);
          if (!p) continue;
          const s = p.s * 0.01;
          g.save();
          g.translate(p.x, p.y);
          g.rotate(c.rot);
          g.fillStyle = c.c;
          g.fillRect(-c.w * s * 10 / 2, -c.h * s * 10 / 2, c.w * s * 10, c.h * s * 10);
          g.restore();
        }
      }
      frame();

      wrap.querySelector('#v3d-continue').addEventListener('click', () => {
        done = true;
        cancelAnimationFrame(raf);
        wrap.remove();
        G.main.toMenu();
      });
    },
  };
  G.victory3d = v3;
})();
