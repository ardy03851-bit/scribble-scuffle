/* ============================================================
   Value noise (1D/2D) with seeded permutation
   ============================================================ */
window.G = window.G || {};
(function () {
  'use strict';
  function makeNoise(seed) {
    const rng = G.RNG.make(seed || 42);
    const perm = new Uint8Array(512);
    const base = new Uint8Array(256);
    for (let i = 0; i < 256; i++) base[i] = i;
    for (let i = 255; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); const t = base[i]; base[i] = base[j]; base[j] = t; }
    for (let i = 0; i < 512; i++) perm[i] = base[i & 255];
    const grad = new Float32Array(256);
    for (let i = 0; i < 256; i++) grad[i] = rng.next() * 2 - 1;

    function n1(x) {
      const xi = Math.floor(x), xf = x - xi;
      const a = grad[perm[xi & 255]], b = grad[perm[(xi + 1) & 255]];
      const u = xf * xf * (3 - 2 * xf);
      return a + (b - a) * u;
    }
    function n2(x, y) {
      const xi = Math.floor(x), yi = Math.floor(y);
      const xf = x - xi, yf = y - yi;
      const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      const aa = grad[perm[(perm[xi & 255] + yi) & 255]];
      const ba = grad[perm[(perm[(xi + 1) & 255] + yi) & 255]];
      const ab = grad[perm[(perm[xi & 255] + yi + 1) & 255]];
      const bb = grad[perm[(perm[(xi + 1) & 255] + yi + 1) & 255]];
      return (aa + (ba - aa) * u) * (1 - v) + (ab + (bb - ab) * u) * v;
    }
    // fractal 1D/2D
    function fbm1(x, oct = 3) { let s = 0, a = 1, f = 1, tot = 0; for (let i = 0; i < oct; i++) { s += n1(x * f) * a; tot += a; a *= 0.5; f *= 2.07; } return s / tot; }
    function fbm2(x, y, oct = 3) { let s = 0, a = 1, f = 1, tot = 0; for (let i = 0; i < oct; i++) { s += n2(x * f, y * f) * a; tot += a; a *= 0.5; f *= 2.13; } return s / tot; }
    return { n1, n2, fbm1, fbm2 };
  }
  G.makeNoise = makeNoise;
  const defaultNoise = makeNoise(12345);
  G.noise = defaultNoise;
})();
