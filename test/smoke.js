/* Headless smoke test: boots the whole game inside jsdom with a stubbed
   canvas 2D context, starts every mode, simulates many fixed steps + renders. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const { JSDOM } = require('./node_modules/jsdom');

const root = path.join(__dirname, '..');
const html = `<!DOCTYPE html><html><body>
<div id="app"><canvas id="game-canvas"></canvas>
<div id="hud"></div><div id="screens"></div><div id="toasts"></div><div id="touch-controls"></div>
</div></body></html>`;
const dom = new JSDOM(html, { url: 'https://localhost/', pretendToBeVisual: true, runScripts: 'outside-only' });
const win = dom.window;
win.innerWidth = 1280; win.innerHeight = 720;
win.devicePixelRatio = 1;
if (!win.matchMedia) win.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
win.AudioContext = undefined;
win.Path2D = class Path2D { moveTo(){} lineTo(){} arc(){} arcTo(){} ellipse(){} rect(){} closePath(){} quadraticCurveTo(){} bezierCurveTo(){} };

// ---- stub canvas 2D ----
function makeUni() {
  const uni = new Proxy(function () {}, {
    get(t, p) {
      if (p === Symbol.toPrimitive) return () => 0;
      if (p === 'width') return 10;
      if (p === 'data') return new win.Uint8ClampedArray(4);
      return uni;
    },
    apply() { return uni; },
    construct() { return uni; },
  });
  return uni;
}
const ctxBase = {
  save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
  setTransform() {}, resetTransform() {},
  beginPath() {}, moveTo() {}, lineTo() {}, closePath() {},
  arc() {}, arcTo() {}, ellipse() {}, rect() {},
  bezierCurveTo() {}, quadraticCurveTo() {},
  fill() {}, stroke() {}, clip() {},
  fillRect() {}, strokeRect() {}, clearRect() {},
  drawImage() {}, setLineDash() {},
  fillText() {}, strokeText() {},
  measureText: () => ({ width: 10 }),
  isPointInPath: () => false,
  createLinearGradient: () => makeUni(),
  createRadialGradient: () => makeUni(),
  createPattern: () => makeUni(),
  getImageData: (x, y, w, h) => ({ data: new win.Uint8ClampedArray(Math.max(4, w * h * 4)), width: w, height: h }),
  putImageData() {},
  getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
};
win.HTMLCanvasElement.prototype.getContext = function () {
  const self = this;
  return new Proxy({ canvas: self, ...ctxBase }, {
    get(t, p) {
      if (p in t) return t[p];
      if (typeof p === 'string') { const fn = () => makeUni(); t[p] = fn; return fn; }
      return undefined;
    },
    set(t, p, v) { t[p] = v; return true; },
  });
};

// ---- load scripts into jsdom context ----
const ctx = dom.getInternalVMContext();
const order = JSON.parse(fs.readFileSync(path.join(root, 'js', 'load-order.json'), 'utf8'));
for (const f of order) {
  const code = fs.readFileSync(path.join(root, f), 'utf8');
  try { vm.runInContext(code, ctx, { filename: f }); }
  catch (e) { console.error('LOAD FAIL', f, e.message); process.exit(1); }
}
const G = win.G;

let fails = 0;
function check(name, cond) {
  if (!cond) { console.error('FAIL:', name); fails++; }
  else console.log('ok  :', name);
}

G.main.init();
check('boot init -> menu', G.main.state === 'menu');
check('content: weapons >= 50', Object.keys(G.weapons.defs).length >= 50);
check('content: wardrobe >= 100', Object.keys(G.wardrobe.items).length >= 100);
check('content: weather >= 20', Object.keys(G.WEATHER_TYPES).length >= 20);
check('content: biomes >= 35', G.biomes.ids().length >= 35);

const modes = ['classic', 'wilds', 'war', 'king'];
for (const mode of modes) {
  try {
    G.rules.data.mode = mode;
    G.rules.data.bots = 4;
    G.main.startMatch();
    check(mode + ' started', G.main.state === 'playing' && !!G.main.match);
    const m = G.main.match;
    G.main.mouse.down = true;
    for (let i = 0; i < 900; i++) {
      G.main.keys.KeyD = (i % 120) < 60;
      G.main.keys.KeyW = i % 90 === 0;
      G.main.fixedUpdate(1 / 60);
      if (i % 60 === 0) G.main.frameRender(1 / 60, 1);
    }
    check(mode + ' survives 900 steps', true);
    check(mode + ' fighters present', m.world.fighters.length >= 4);
    const alive = m.world.fighters.filter(f => f.alive).length;
    console.log('     ', mode, 'alive after 15s:', alive, '/', m.world.fighters.length, 'round:', m.round);
    G.main.toMenu();
  } catch (e) {
    console.error('FAIL:', mode, e.stack.split('\n').slice(0, 5).join('\n'));
    fails++;
  }
}

try {
  G.rules.data.mode = 'classic';
  G.main.startMatch();
  G.main.fixedUpdate(1 / 60);
  const st = G.debug.state();
  check('debug state()', typeof st === 'string' && st.length > 10);
  G.debug.advance(10);
  check('debug advance(10)', true);
  G.main.toMenu();
} catch (e) { console.error('FAIL: debug', e.stack.split('\n').slice(0, 3).join('\n')); fails++; }

try { G.audio.init(); G.audio.play('ui'); G.audio.play('shoot'); check('audio no-op safe', true); }
catch (e) { console.error('FAIL: audio', e.message); fails++; }

console.log(fails ? '\n*** ' + fails + ' FAILURES ***' : '\nALL SMOKE TESTS PASSED');
process.exit(fails ? 1 : 0);
