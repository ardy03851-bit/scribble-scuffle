/* Generates PNG icons for the PWA (no external deps, pure Node zlib). */
const zlib = require('zlib'), fs = require('fs');
function PNG(w, h, pixels) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    pixels.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const chunks = [];
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  function chunk(type, data) {
    const t = Buffer.from(type);
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const crcBuf = Buffer.concat([t, data]);
    let c = 0xffffffff;
    for (let i = 0; i < crcBuf.length; i++) {
      c ^= crcBuf[i];
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
    const crc = Buffer.alloc(4); crc.writeUInt32BE((c ^ 0xffffffff) >>> 0);
    chunks.push(Buffer.concat([len, t, data, crc]));
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  chunk('IHDR', ihdr);
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 }));
  chunk('IEND', Buffer.alloc(0));
  return Buffer.concat([sig, ...chunks]);
}
function makeIcon(size, maskable) {
  const px = Buffer.alloc(size * size * 4);
  const paper = [242, 234, 216], ink = [59, 47, 38], red = [228, 87, 61], gold = [232, 185, 60];
  const set = (x, y, c, a = 255) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = a;
  };
  const pad = maskable ? size * 0.22 : 0;
  const cx = size / 2, cy = size / 2, r = size / 2 - (maskable ? size * 0.1 : size * 0.04);
  // paper disc with wobbly edge
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const wobble = [];
  for (let a = 0; a < 40; a++) wobble.push(0.96 + rnd() * 0.08);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = x - cx, dy = y - cy;
    const d = Math.sqrt(dx * dx + dy * dy);
    const ang = Math.atan2(dy, dx);
    const wi = Math.floor(((ang + Math.PI) / (Math.PI * 2)) * 40) % 40;
    const rr = r * wobble[wi];
    if (d <= rr) {
      // vignette paper texture
      const t = d / rr;
      const shade = 1 - t * 0.08;
      set(x, y, [paper[0] * shade, paper[1] * shade, paper[2] * shade]);
    }
  }
  // ink ring
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    const ang = Math.atan2(y - cy, x - cx);
    const wi = Math.floor(((ang + Math.PI) / (Math.PI * 2)) * 40) % 40;
    const rr = r * wobble[wi];
    if (Math.abs(d - rr) < size * 0.035) set(x, y, ink);
  }
  // "S" strokes: two thick ink arcs + red slash
  const lw = size * 0.11;
  const stroke = (x0, y0, x1, y1, c) => {
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 3);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      for (let a = 0; a < 40; a++) {
        const rr = lw * (0.75 + rnd() * 0.4);
        set(x + Math.cos(a) * rr, y + Math.sin(a) * rr, c);
      }
    }
  };
  const s = size;
  // big S
  stroke(cx - s * 0.16, cy - s * 0.18, cx + s * 0.16, cy - s * 0.16, ink);
  stroke(cx + s * 0.16, cy - s * 0.16, cx - s * 0.13, cy + s * 0.01, ink);
  stroke(cx - s * 0.13, cy + s * 0.01, cx + s * 0.15, cy + s * 0.19, ink);
  // red pencil slash
  stroke(cx - s * 0.2, cy + s * 0.24, cx + s * 0.2, cy - s * 0.26, red);
  // gold dot
  for (let a = 0; a < 60; a++) {
    const rr = s * 0.045 * (0.8 + rnd() * 0.4);
    set(cx + s * 0.2 + Math.cos(a) * rr, cy + s * 0.2 + Math.sin(a) * rr, gold);
  }
  return PNG(size, size, px);
}
fs.writeFileSync('icons/icon-192.png', makeIcon(192, false));
fs.writeFileSync('icons/icon-512.png', makeIcon(512, false));
fs.writeFileSync('icons/maskable-192.png', makeIcon(192, true));
fs.writeFileSync('icons/maskable-512.png', makeIcon(512, true));
fs.writeFileSync('icons/apple-touch-icon.png', makeIcon(180, true));
console.log('icons done');
