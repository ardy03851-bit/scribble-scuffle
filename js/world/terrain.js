/* ============================================================
   Terrain: coarse collision grid + smooth chunk rendering
   (marching-cells silhouette, dilation ink outline, strata,
   grass top edges, dirty-rectangle patching)
   ============================================================ */
window.G = window.G || {};
(function () {
  'use strict';
  const CELL = 14;               // collision cell size (world px)
  const CHUNK_CELLS = 36;        // cells per chunk side
  const CHUNK_PX = CELL * CHUNK_CELLS;

  class Terrain {
    constructor(w, h) {
      this.w = w; this.h = h;
      this.cell = CELL;
      this.cols = Math.ceil(w / CELL);
      this.rows = Math.ceil(h / CELL);
      this.grid = new Uint8Array(this.cols * this.rows);
      this.chunksX = Math.ceil(this.cols / CHUNK_CELLS);
      this.chunksY = Math.ceil(this.rows / CHUNK_CELLS);
      this.chunks = new Array(this.chunksX * this.chunksY).fill(null);
      this.dirty = new Set();
      this.biome = null;
      this.noise = G.makeNoise(Date.now() & 0xffff);
    }
    idx(cx, cy) { return cy * this.cols + cx; }
    inb(cx, cy) { return cx >= 0 && cy >= 0 && cx < this.cols && cy < this.rows; }
    cellSolid(cx, cy) {
      if (cx < 0 || cx >= this.cols) return true;  // side walls
      if (cy < 0) return false;
      if (cy >= this.rows) return false;           // open bottom = death
      return this.grid[cy * this.cols + cx] === 1;
    }
    solidAt(x, y) {
      return this.cellSolid(Math.floor(x / CELL), Math.floor(y / CELL));
    }
    solidBox(x, y, w, h) {
      const x0 = Math.floor((x - w / 2) / CELL), x1 = Math.floor((x + w / 2 - 0.01) / CELL);
      const y0 = Math.floor((y - h / 2) / CELL), y1 = Math.floor((y + h / 2 - 0.01) / CELL);
      for (let cy = y0; cy <= y1; cy++)
        for (let cx = x0; cx <= x1; cx++)
          if (this.cellSolid(cx, cy)) return true;
      return false;
    }
    // first solid y from top at world x (scan down)
    surfaceY(x, fromY = 0) {
      const cx = Math.floor(x / CELL);
      let cy = Math.max(0, Math.floor(fromY / CELL));
      for (; cy < this.rows; cy++) if (this.cellSolid(cx, cy)) return cy * CELL;
      return this.h + 200;
    }
    raycast(x, y, dx, dy, maxDist) {
      // step along ray in small increments; returns hit point or null
      const step = CELL * 0.6;
      const len = Math.hypot(dx, dy);
      if (len < 1e-6) return null;
      const sx = dx / len * step, sy = dy / len * step;
      let d = 0, px = x, py = y;
      while (d <= maxDist) {
        px += sx; py += sy; d += step;
        if (this.solidAt(px, py)) return { x: px, y: py, dist: d };
      }
      return null;
    }
    lineOfSight(x1, y1, x2, y2) {
      const d = G.M.dist(x1, y1, x2, y2);
      if (d < 1) return true;
      return !this.raycast(x1, y1, x2 - x1, y2 - y1, d - CELL);
    }

    // ---------- generation ----------
    generate(biomeDef, styleOverride) {
      this.biome = biomeDef;
      const rng = G.RNG.make((Math.random() * 1e9) | 0);
      const N = this.noise;
      const style = styleOverride && styleOverride !== 'auto' ? styleOverride : (biomeDef.terrainStyle || 'solid');
      const cols = this.cols, rows = this.rows;
      const grid = this.grid;
      grid.fill(0);
      const set = (cx, cy, v) => { if (cx >= 0 && cy >= 0 && cx < cols && cy < rows) grid[cy * cols + cx] = v ? 1 : 0; };
      const groundBase = Math.floor(rows * 0.72);
      const nAmp = biomeDef.hillAmp != null ? biomeDef.hillAmp : 10;

      const heightAt = (cx) => {
        return groundBase
          + N.fbm1(cx * 0.008 + 3.1, 3) * nAmp
          + N.fbm1(cx * 0.035 + 9.7, 2) * nAmp * 0.3;
      };

      switch (style) {
        case 'solid': {
          for (let cx = 0; cx < cols; cx++) {
            const hgt = heightAt(cx);
            for (let cy = Math.floor(hgt); cy < rows; cy++) set(cx, cy, 1);
          }
          break;
        }
        case 'ocean': {
          for (let cx = 0; cx < cols; cx++) {
            const hgt = groundBase + 8 + N.fbm1(cx * 0.006, 3) * 6;
            for (let cy = Math.floor(hgt); cy < rows; cy++) set(cx, cy, 1);
          }
          // carve a few island bumps
          const isles = rng.int(2, 5);
          for (let i = 0; i < isles; i++) {
            const ix = rng.int(cols * 0.1, cols * 0.9), iy = groundBase + rng.int(2, 10), r = rng.int(6, 18);
            for (let cx = ix - r; cx <= ix + r; cx++)
              for (let cy = iy - Math.floor(r * 0.5); cy <= iy + r; cy++) {
                const d = Math.hypot((cx - ix) / r, (cy - iy) / (r * 0.8));
                if (d < 1 + N.fbm2(cx * 0.1, cy * 0.1, 2) * 0.25) set(cx, cy, 1);
              }
          }
          break;
        }
        case 'islands': {
          const isles = rng.int(4, 9);
          for (let i = 0; i < isles; i++) {
            const ix = rng.int(cols * 0.06, cols * 0.94);
            const iy = rng.int(rows * 0.35, rows * 0.8);
            const r = rng.int(8, 26);
            for (let cx = ix - r * 2; cx <= ix + r * 2; cx++)
              for (let cy = iy - r; cy <= iy + r; cy++) {
                const d = Math.hypot((cx - ix) / (r * 1.8), (cy - iy) / (r * 0.7));
                if (d < 1 + N.fbm2(cx * 0.09 + i, cy * 0.09, 2) * 0.3) set(cx, cy, 1);
              }
          }
          break;
        }
        case 'float': {
          const isles = rng.int(5, 12);
          for (let i = 0; i < isles; i++) {
            const ix = rng.int(cols * 0.06, cols * 0.94);
            const iy = rng.int(rows * 0.25, rows * 0.75);
            const r = rng.int(7, 20);
            for (let cx = ix - r * 2; cx <= ix + r * 2; cx++)
              for (let cy = iy - r * 2; cy <= iy + r; cy++) {
                const taper = 1 - Math.abs(cy - iy) / (r * 2.2);
                const d = Math.hypot((cx - ix) / (r * 1.9), (cy - (iy - r * 0.4)) / (r * 1.6));
                if (d < taper + N.fbm2(cx * 0.08, cy * 0.08 + i, 2) * 0.25) set(cx, cy, 1);
              }
          }
          break;
        }
        case 'plateaus': {
          let level = groundBase;
          for (let cx = 0; cx < cols; cx++) {
            if (rng.chance(0.012)) level = Math.floor(rows * rng.range(0.45, 0.85));
            const hgt = level + N.fbm1(cx * 0.05, 2) * 1.5;
            for (let cy = Math.floor(hgt); cy < rows; cy++) set(cx, cy, 1);
          }
          break;
        }
        case 'canyon': {
          // deep carved canyon with ledges
          for (let cx = 0; cx < cols; cx++) {
            const hgt = rows * 0.25 + N.fbm1(cx * 0.004 + 8, 2) * 6;
            for (let cy = Math.floor(hgt); cy < rows; cy++) set(cx, cy, 1);
          }
          const cuts = rng.int(3, 6);
          for (let i = 0; i < cuts; i++) {
            let cx = rng.int(cols * 0.1, cols * 0.9);
            const w = rng.int(3, 7);
            for (let cy = 0; cy < rows; cy++) {
              cx += rng.range(-0.6, 0.6);
              const cxi = Math.round(G.M.clamp(cx, 2, cols - 3));
              for (let d = 0; d <= w; d++) set(cxi + d, cy, 0);
            }
          }
          break;
        }
        case 'peaks': {
          for (let cx = 0; cx < cols; cx++) {
            const ridge = 1 - Math.abs(N.fbm1(cx * 0.004 + 5, 2));
            const hgt = rows * 0.28 + ridge * rows * 0.5 + N.fbm1(cx * 0.03, 2) * 4;
            for (let cy = Math.floor(hgt); cy < rows; cy++) set(cx, cy, 1);
          }
          break;
        }
        case 'towers': {
          // ground
          for (let cx = 0; cx < cols; cx++) { const hgt = groundBase + 4; for (let cy = Math.floor(hgt); cy < rows; cy++) set(cx, cy, 1); }
          const towers = rng.int(4, 8);
          for (let i = 0; i < towers; i++) {
            const tx = rng.int(cols * 0.08, cols * 0.92), tw = rng.int(5, 12), th = rng.int(10, 30);
            const ty = groundBase - th;
            for (let cx = tx; cx < tx + tw; cx++) for (let cy = ty; cy < groundBase + 2; cy++) set(cx, cy, 1);
          }
          break;
        }
        case 'dunes': {
          for (let cx = 0; cx < cols; cx++) {
            const hgt = groundBase + Math.abs(N.fbm1(cx * 0.012 + 2, 2)) * 16 + N.fbm1(cx * 0.05, 2) * 2;
            for (let cy = Math.floor(hgt); cy < rows; cy++) set(cx, cy, 1);
          }
          break;
        }
        case 'caves': {
          for (let cx = 0; cx < cols; cx++) { const hgt = groundBase - 6 + N.fbm1(cx * 0.008, 3) * 8; for (let cy = Math.floor(hgt); cy < rows; cy++) set(cx, cy, 1); }
          const caves = rng.int(3, 7);
          for (let i = 0; i < caves; i++) {
            let cx = rng.int(cols * 0.1, cols * 0.9), cy = rng.int(groundBase + 4, rows - 6);
            for (let s = 0; s < rng.int(30, 90); s++) {
              const r = rng.range(2.5, 5);
              for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++)
                if (dx * dx + dy * dy < r * r) set(Math.round(cx + dx), Math.round(cy + dy), 0);
              cx += rng.range(-1.4, 1.4); cy += rng.range(-0.7, 0.9);
              cx = G.M.clamp(cx, 4, cols - 5); cy = G.M.clamp(cy, groundBase - 2, rows - 3);
            }
          }
          break;
        }
        case 'bridges': {
          for (let cx = 0; cx < cols; cx++) { const hgt = rows * 0.9; for (let cy = Math.floor(hgt); cy < rows; cy++) set(cx, cy, 1); }
          const n = rng.int(3, 6);
          for (let i = 0; i < n; i++) {
            const bx = rng.int(cols * 0.05, cols * 0.8), bw = rng.int(10, 26), by = rng.int(rows * 0.3, rows * 0.6);
            for (let cx = bx; cx < bx + bw; cx++) for (let cy = by; cy < by + 2; cy++) set(cx, cy, 1);
            // pillar
            const px = bx + (bw >> 1);
            for (let cy = by; cy < rows * 0.9; cy++) set(px, cy, 1);
          }
          break;
        }
        default: { // solid fallback
          for (let cx = 0; cx < cols; cx++) { const hgt = heightAt(cx); for (let cy = Math.floor(hgt); cy < rows; cy++) set(cx, cy, 1); }
        }
      }
      // clear spawn column areas near edges? no — spawns find surface.
      this.markAllDirty();
    }

    // ---------- edits ----------
    chunkIdAt(cx, cy) {
      return Math.floor(cy / CHUNK_CELLS) * this.chunksX + Math.floor(cx / CHUNK_CELLS);
    }
    markChunkAt(cx, cy) {
      if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return;
      this.dirty.add(this.chunkIdAt(cx, cy));
      // neighbouring chunks if near border
      const lx = cx % CHUNK_CELLS, ly = cy % CHUNK_CELLS;
      if (lx === 0) this.dirty.add(this.chunkIdAt(cx - 1, cy));
      if (lx === CHUNK_CELLS - 1) this.dirty.add(this.chunkIdAt(cx + 1, cy));
      if (ly === 0) this.dirty.add(this.chunkIdAt(cx, cy - 1));
      if (ly === CHUNK_CELLS - 1) this.dirty.add(this.chunkIdAt(cx, cy + 1));
    }
    markAllDirty() {
      this.dirty.clear();
      for (let i = 0; i < this.chunks.length; i++) this.dirty.add(i);
    }
    // carve a jagged crater; returns removed cells (for debris)
    carve(x, y, r) {
      const removed = [];
      const c0x = Math.floor((x - r) / CELL), c1x = Math.floor((x + r) / CELL);
      const c0y = Math.floor((y - r) / CELL), c1y = Math.floor((y + r) / CELL);
      const N = this.noise;
      for (let cy = c0y; cy <= c1y; cy++) {
        for (let cx = c0x; cx <= c1x; cx++) {
          if (!this.inb(cx, cy)) continue;
          if (this.grid[cy * this.cols + cx] !== 1) continue;
          const px = cx * CELL + CELL / 2, py = cy * CELL + CELL / 2;
          const d = Math.hypot(px - x, py - y);
          const wob = N.fbm2(cx * 0.35, cy * 0.35, 2) * r * 0.28;
          if (d < r + wob) {
            this.grid[cy * this.cols + cx] = 0;
            removed.push(cx, cy);
            this.markChunkAt(cx, cy);
          }
        }
      }
      return removed;
    }
    // add terrain back (fill tool)
    fill(x, y, r, brush = 'round') {
      const c0x = Math.floor((x - r) / CELL), c1x = Math.floor((x + r) / CELL);
      const c0y = Math.floor((y - r) / CELL), c1y = Math.floor((y + r) / CELL);
      for (let cy = c0y; cy <= c1y; cy++)
        for (let cx = c0x; cx <= c1x; cx++) {
          if (!this.inb(cx, cy)) continue;
          const px = cx * CELL + CELL / 2, py = cy * CELL + CELL / 2;
          if (Math.hypot(px - x, py - y) < r) {
            this.grid[cy * this.cols + cx] = 1;
            this.markChunkAt(cx, cy);
          }
        }
    }

    // ---------- chunk rendering ----------
    ensureChunk(ci) {
      let ch = this.chunks[ci];
      if (!ch) {
        ch = { canvas: document.createElement('canvas'), dirty: true, cx0: 0, cy0: 0, topEdges: [] };
        ch.canvas.width = CHUNK_PX; ch.canvas.height = CHUNK_PX;
        this.chunks[ci] = ch;
      }
      if (ch.dirty || this.dirty.has(ci)) { this.renderChunk(ci, ch); this.dirty.delete(ci); ch.dirty = false; }
      return ch;
    }
    renderChunk(ci, ch) {
      const cx0 = (ci % this.chunksX) * CHUNK_CELLS;
      const cy0 = Math.floor(ci / this.chunksX) * CHUNK_CELLS;
      ch.cx0 = cx0; ch.cy0 = cy0;
      const g = ch.canvas.getContext('2d');
      g.clearRect(0, 0, CHUNK_PX, CHUNK_PX);
      const biome = this.biome || { terrainTop: '#c9b28a', terrainDeep: '#a98f6b', grass: '#7fae62', ink: '#3b2f26' };
      const rng = G.RNG.make(ci * 991 + 17);
      // 1) silhouette path of rounded cells
      const path = new Path2D();
      const topCells = [];
      let any = false;
      for (let cy = cy0; cy < cy0 + CHUNK_CELLS; cy++) {
        for (let cx = cx0; cx < cx0 + CHUNK_CELLS; cx++) {
          if (!this.inb(cx, cy) || this.grid[cy * this.cols + cx] !== 1) continue;
          any = true;
          const px = (cx - cx0) * CELL, py = (cy - cy0) * CELL;
          const r = 3 + rng.next() * 3;
          path.moveTo(px + r, py);
          path.arcTo(px + CELL, py, px + CELL, py + CELL, r);
          path.arcTo(px + CELL, py + CELL, px, py + CELL, r);
          path.arcTo(px, py + CELL, px, py, r);
          path.arcTo(px, py, px + CELL, py, r);
          path.closePath();
          if (!this.cellSolid(cx, cy - 1)) topCells.push([cx, cy]);
        }
      }
      if (!any) { ch.topEdges = []; return; }
      // 2) silhouette temp canvas for dilation outline
      const sil = document.createElement('canvas');
      sil.width = CHUNK_PX; sil.height = CHUNK_PX;
      const sg = sil.getContext('2d');
      sg.fillStyle = '#000'; sg.fill(path);
      // 3) draw ink outline via dilation (8 offsets)
      g.fillStyle = biome.ink || '#3b2f26';
      const o = 2.4;
      for (const [ox, oy] of [[o, 0], [-o, 0], [0, o], [0, -o], [o * 0.7, o * 0.7], [-o * 0.7, o * 0.7], [o * 0.7, -o * 0.7], [-o * 0.7, -o * 0.7]])
        g.drawImage(sil, ox, oy);
      // 4) fill terrain: vertical gradient topsoil -> deep, clipped to (slightly shrunk) silhouette
      const fillPath = path;
      g.save();
      g.clip(fillPath);
      const grad = g.createLinearGradient(0, 0, 0, CHUNK_PX);
      grad.addColorStop(0, biome.terrainTop || '#c9b28a');
      grad.addColorStop(0.45, biome.terrainMid || biome.terrainTop || '#bd9f77');
      grad.addColorStop(1, biome.terrainDeep || '#a98f6b');
      g.fillStyle = grad;
      g.fillRect(0, 0, CHUNK_PX, CHUNK_PX);
      // strata hatch lines
      g.strokeStyle = biome.ink || '#3b2f26';
      g.globalAlpha = 0.13; g.lineWidth = 1.4;
      for (let y = rng.int(10, 40); y < CHUNK_PX; y += rng.int(26, 46)) {
        g.beginPath();
        for (let x = 0; x <= CHUNK_PX; x += 16) g.lineTo(x, y + this.noise.fbm1(x * 0.03 + y, 1) * 4);
        g.stroke();
      }
      g.globalAlpha = 1;
      // grass band on top cells
      g.fillStyle = biome.grass || '#7fae62';
      for (const [cx, cy] of topCells) {
        const px = (cx - cx0) * CELL, py = (cy - cy0) * CELL;
        g.fillRect(px - 1, py - 1, CELL + 2, 7 + rng.next() * 3);
      }
      g.fillStyle = biome.grassDeep || '#5f8c4a';
      for (const [cx, cy] of topCells) {
        const px = (cx - cx0) * CELL, py = (cy - cy0) * CELL;
        if (rng.chance(0.5)) g.fillRect(px - 1, py + 4, CELL + 2, 3);
      }
      g.restore();
      // 5) store top-edge world points for animated boil restroke
      ch.topEdges = [];
      for (const [cx, cy] of topCells) {
        ch.topEdges.push(cx * CELL, cy * CELL);
      }
    }
    // animated re-stroke of visible top edges (line boil on terrain)
    drawTopEdges(ctx, vb) {
      const b = this.biome || {};
      ctx.strokeStyle = b.ink || '#3b2f26';
      ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      const boil = G.boil(1);
      const cs0 = Math.floor(vb.x0 / CHUNK_PX), cs1 = Math.floor(vb.x1 / CHUNK_PX);
      const rs0 = Math.floor(vb.y0 / CHUNK_PX), rs1 = Math.floor(vb.y1 / CHUNK_PX);
      for (let ry = rs0; ry <= rs1; ry++) {
        if (ry < 0 || ry >= this.chunksY) continue;
        for (let rx = cs0; rx <= cs1; rx++) {
          if (rx < 0 || rx >= this.chunksX) continue;
          const ch = this.chunks[ry * this.chunksX + rx];
          if (!ch || !ch.topEdges.length) continue;
          ctx.beginPath();
          const pts = ch.topEdges;
          for (let i = 0; i < pts.length; i += 2) {
            const wx = pts[i], wy = pts[i + 1];
            const j = G.RNG.make(boil + (wx * 13 + wy * 7 | 0)).next() * 2 - 1;
            const jy = G.RNG.make(boil + (wx * 7 + wy * 13 | 0)).next() * 2 - 1;
            if (i === 0) ctx.moveTo(wx + j, wy + jy * 1.4); else ctx.lineTo(wx + CELL / 2 + j, wy + jy * 1.4);
          }
          ctx.stroke();
        }
      }
    }
    draw(ctx, vb) {
      const cs0 = Math.max(0, Math.floor(vb.x0 / CHUNK_PX));
      const cs1 = Math.min(this.chunksX - 1, Math.floor(vb.x1 / CHUNK_PX));
      const rs0 = Math.max(0, Math.floor(vb.y0 / CHUNK_PX));
      const rs1 = Math.min(this.chunksY - 1, Math.floor(vb.y1 / CHUNK_PX));
      for (let ry = rs0; ry <= rs1; ry++)
        for (let rx = cs0; rx <= cs1; rx++) {
          const ch = this.ensureChunk(ry * this.chunksX + rx);
          if (ch) ctx.drawImage(ch.canvas, rx * CHUNK_PX, ry * CHUNK_PX);
        }
    }
  }

  G.Terrain = Terrain;
  G.TERRAIN_CELL = CELL;
  G.CHUNK_PX = CHUNK_PX;
})();
