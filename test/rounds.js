/* Round-flow test: kills, round end + regen, sudden death, victory,
   bot stress, build system, wardrobe equip, LRU cache, pause. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const { JSDOM } = require('./node_modules/jsdom');

const root = path.join(__dirname, '..');
const html = `<!DOCTYPE html><html><body>
<div id="app"><canvas id="game-canvas"></canvas>
<div id="hud"></div><div id="screens"></div><div id="toasts"></div><div id="touch-controls"></div>
</div></body></html>`;
const dom = new JSDOM(html, { url: 'https://localhost/', pretendToBeVisual: true, runScripts: 'outside-only' });
const win = dom.window;
win.innerWidth = 1280; win.innerHeight = 720; win.devicePixelRatio = 1;
if (!win.matchMedia) win.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
win.AudioContext = undefined;
win.Path2D = class Path2D { moveTo(){} lineTo(){} arc(){} arcTo(){} ellipse(){} rect(){} closePath(){} quadraticCurveTo(){} bezierCurveTo(){} };

function makeUni() {
  const uni = new Proxy(function () {}, {
    get(t, p) {
      if (p === Symbol.toPrimitive) return () => 0;
      if (p === 'width') return 10;
      if (p === 'data') return new win.Uint8ClampedArray(4);
      return uni;
    },
    apply() { return uni; }, construct() { return uni; },
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

const ctx = dom.getInternalVMContext();
const order = JSON.parse(fs.readFileSync(path.join(root, 'js', 'load-order.json'), 'utf8'));
for (const f of order) {
  const code = fs.readFileSync(path.join(root, f), 'utf8');
  try { vm.runInContext(code, ctx, { filename: f }); }
  catch (e) { console.error('LOAD FAIL', f, e.message); process.exit(1); }
}
const G = win.G;
const LS = win.localStorage;
let fails = 0;
function check(name, cond, extra) {
  if (!cond) { console.error('FAIL:', name, extra !== undefined ? JSON.stringify(extra) : ''); fails++; }
  else console.log('ok  :', name);
}
function steps(n) { for (let i = 0; i < n; i++) G.main.fixedUpdate(1 / 60); }
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  G.main.init();
  G.rules.data.mode = 'classic';
  G.rules.data.bots = 3;
  G.rules.data.targetScore = 2;
  G.rules.data.roundTime = 30;
  G.main.startMatch();
  let m = G.main.match;

  // wait out the weapon reveal (real 2.5s timeout) and spawn protection
  await sleep(2600);
  steps(120); // 2s -> spawnProtect 1.5s expired
  check('fighting state', m.roundState === 'fighting', m.roundState);

  // --- kill everyone else -> round should end with player win ---
  const beforeRound = m.round;
  for (const f of m.world.fighters) if (f !== m.world.player) f.damage(99999, m.world.player, 'test');
  check('victims died', m.world.fighters.filter(f => f !== m.world.player && !f.alive).length >= 3);
  steps(400); // 6.6s > 2.6s between-round delay
  check('round advanced after wipe', m.round > beforeRound || m.matchOver, { round: m.round, state: m.roundState });
  check('player round win scored', (m.world.player.score || 0) >= 1, m.world.player.score);

  // --- second round win -> victory ---
  let okFighting = false;
  for (let i = 0; i < 40 && !okFighting; i++) { await sleep(100); steps(12); if (m.roundState === 'fighting') okFighting = true; if (m.matchOver) break; }
  check('round 2 fighting', okFighting || m.matchOver, m.roundState);
  for (const f of m.world.fighters) if (f !== m.world.player) f.damage(99999, m.world.player, 'test');
  steps(400);
  check('victory reached', m.matchOver || m.champion || G.main.state === 'victory', { over: m.matchOver, champ: !!m.champion, gState: G.main.state, score: m.world.player.score });
  G.main.toMenu();

  // --- sudden death ---
  G.rules.data.mode = 'classic';
  G.rules.data.roundTime = 4;
  G.rules.data.suddenDeath = true;
  G.rules.data.health = 100000;   // nobody dies -> round can't end early
  G.rules.data.botSkill = 0;
  G.main.startMatch();
  m = G.main.match;
  for (let i = 0; i < 40 && m.roundState !== 'fighting'; i++) { await sleep(100); steps(12); }
  steps(360); // 6s > 4s round time
  check('sudden death triggered', m.world.suddenDeath === true, { rs: m.roundState, el: m.world.roundElapsed, rt: m.world.roundTime, sd: m.world.suddenDeath });
  const hpBefore = m.world.player.hp;
  steps(120);
  check('sudden death drains hp', m.world.player.hp < hpBefore || !m.world.player.alive, { hpBefore, now: m.world.player.hp });
  G.rules.data.health = 100;
  G.main.toMenu();

  // --- bot stress: 40 bots, wilds ---
  G.rules.data.mode = 'wilds';
  G.rules.data.bots = 40;
  G.rules.data.roundTime = 120;
  G.rules.data.suddenDeath = false;
  G.main.startMatch();
  m = G.main.match;
  await sleep(2600); steps(120);
  check('40 bots spawned', m.world.fighters.length >= 40, { n: m.world.fighters.length });
  steps(1800); // 30s
  const alive = m.world.fighters.filter(f => f.alive).length;
  console.log('      alive after 30s of 40-bot wilds:', alive, '/', m.world.fighters.length);
  check('no NaN positions', m.world.fighters.every(f => isFinite(f.x) && isFinite(f.y)));
  G.main.toMenu();

  // --- build system ---
  G.rules.data.mode = 'war';
  G.rules.data.bots = 2;
  G.main.startMatch();
  m = G.main.match;
  const p = m.world.player;
  p.mats = 500;
  const pieceId = G.build.selected;
  const def = G.build.def(pieceId);
  // find ground below the player so the piece is supported
  const t = m.world.terrain;
  let gy = p.y;
  const cell = t.cell || 14;
  const px = Math.floor((p.x + 80) / cell);
  for (let cy = Math.floor(p.y / cell); cy < t.rows; cy++) {
    if (t.grid[cy * t.cols + px] === 1) { gy = cy * cell; break; }
  }
  const okPiece = G.build.place(pieceId, p.x + 80, gy - def.h / 2 - 2, 0, p);
  check('build piece placed', !!okPiece, { pieceId, gy });
  check('mats deducted', p.mats < 500, p.mats);
  check('piece survives support check', G.build.pieces.length >= 1 && !G.build.pieces[0].dead, { n: G.build.pieces.length });
  steps(60);
  check('match survives building', true);
  G.main.toMenu();

  // --- wardrobe equip ---
  try {
    const saved = { items: { head: 'tophat', torsoWear: 'vest' }, itemColors: {} };
    LS.setItem('ss_outfit', JSON.stringify(saved));
    G.main.startMatch();
    const wp = G.main.match.world.player;
    check('outfit applied', wp.outfit.items.head === 'tophat' && wp.outfit.items.torsoWear === 'vest', wp.outfit.items);
    LS.removeItem('ss_outfit');
    G.main.toMenu();
  } catch (e) { console.error('FAIL: wardrobe', e.message); fails++; }

  // --- LRU cache ---
  try {
    const c = new G.LRUCache(1024);
    const mk = (n) => { const cv = win.document.createElement('canvas'); cv.width = n; cv.height = 1; return cv; };
    c.set('a', mk(400)); c.set('b', mk(400)); c.set('c', mk(400)); c.set('d', mk(400));
    check('LRU evicts oldest', !c.has('a') && c.has('d'), [...c.map.keys()]);
  } catch (e) { console.error('FAIL: LRU', e.message); fails++; }

  // --- pause / resume ---
  G.main.startMatch();
  G.main.togglePause();
  check('pause state', G.main.state === 'paused');
  G.main.togglePause();
  check('resume state', G.main.state === 'playing');
  G.main.toMenu();

  console.log(fails ? '\n*** ' + fails + ' FAILURES ***' : '\nALL ROUND-FLOW TESTS PASSED');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(1); });
