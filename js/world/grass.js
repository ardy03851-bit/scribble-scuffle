/* ============================================================
   Grass: dense wind-swayed tufts along terrain top edges,
   physically parting around characters.
   ============================================================ */
window.G = window.G || {};
(function () {
  'use strict';
  const M = G.M;
  const TUFT_W = 22; // world px per tuft slot

  const grassSys = {
    // tufts generated per visible strip each frame from terrain top edges
    draw(ctx, world) {
      if (G.engine.qualityTier === 'low') return;
      const vb = world.viewBounds;
      const t = world.terrain;
      const biome = world.biome;
      const ink = biome.ink || '#3b2f26';
      const c1 = biome.grass || '#7fae62';
      const c2 = biome.grassDeep || '#5f8c4a';
      const cols = Math.floor(vb.x0 / TUFT_W), cole = Math.ceil(vb.x1 / TUFT_W);
      const time = world.time;
      const windNow = G.wind.current();
      ctx.save();
      ctx.lineCap = 'round';
      // gather characters once for parting
      const chars = world.fighters.filter(f => f.alive);
      for (let ci = cols; ci <= cole; ci++) {
        const x = ci * TUFT_W + ((ci * 7919) % 13);
        const y = t.surfaceY(x);
        if (y > world.mapH - 20) continue;
        // skip if underwater
        if (world.water.level !== Infinity && y > world.water.level) continue;
        // skip if inside a built piece
        let r = (ci * 2654435761 >>> 0) % 100 / 100;
        if (r > 0.8) continue; // gaps
        const n = 3;
        for (let b = 0; b < n; b++) {
          const bx = x + b * 6 - 6 + ((ci * 31 + b * 7) % 5) - 2;
          const by = t.surfaceY(bx);
          const hgt = 7 + ((ci * 13 + b * 29) % 9);
          // wind sway
          const sway = Math.sin(time * 2.2 + bx * 0.05) * 0.25 + windNow * 0.0012;
          // part around characters
          let partX = 0;
          for (const f of chars) {
            const d = Math.abs(f.x - bx);
            if (d < 26) {
              const push = (26 - d) / 26;
              partX = (bx < f.x ? -1 : 1) * push * 9;
            }
          }
          ctx.strokeStyle = b === 1 ? c2 : c1;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(bx, by + 1);
          ctx.quadraticCurveTo(bx + sway * 10 + partX * 0.4, by - hgt * 0.6, bx + sway * 18 + partX, by - hgt);
          ctx.stroke();
        }
      }
      ctx.restore();
    },
  };
  G.grass = grassSys;
})();
