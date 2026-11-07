const fs = require('fs'), path = require('path'), vm = require('vm');
const { JSDOM } = require('./node_modules/jsdom');
const root = path.join(__dirname, '..');
const html = `<!DOCTYPE html><html><body><div id="app"><canvas id="game-canvas"></canvas><div id="hud"></div><div id="screens"></div><div id="toasts"></div><div id="touch-controls"></div></div></body></html>`;
const dom = new JSDOM(html, { url: 'https://localhost/', pretendToBeVisual: true, runScripts: 'outside-only' });
const win = dom.window;
win.innerWidth = 1280; win.innerHeight = 720; win.devicePixelRatio = 1;
win.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
win.AudioContext = undefined;
win.Path2D = class { moveTo(){} lineTo(){} arc(){} ellipse(){} rect(){} closePath(){} quadraticCurveTo(){} bezierCurveTo(){} };
function makeUni() { const uni = new Proxy(function () {}, { get(t, p) { if (p === Symbol.toPrimitive) return () => 0; if (p === 'width') return 10; if (p === 'data') return new win.Uint8ClampedArray(4); return uni; }, apply() { return uni; }, construct() { return uni; } }); return uni; }
const ctxBase = { save(){},restore(){},translate(){},rotate(){},scale(){},setTransform(){},resetTransform(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},arc(){},arcTo(){},ellipse(){},rect(){},bezierCurveTo(){},quadraticCurveTo(){},fill(){},stroke(){},clip(){},fillRect(){},strokeRect(){},clearRect(){},drawImage(){},setLineDash(){},fillText(){},strokeText(){},measureText:()=>({width:10}),isPointInPath:()=>false,createLinearGradient:()=>makeUni(),createRadialGradient:()=>makeUni(),createPattern:()=>makeUni(),getImageData:(x,y,w,h)=>({data:new win.Uint8ClampedArray(Math.max(4,w*h*4)),width:w,height:h}),putImageData(){},getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0}) };
win.HTMLCanvasElement.prototype.getContext = function () { const self = this; return new Proxy({ canvas: self, ...ctxBase }, { get(t, p) { if (p in t) return t[p]; if (typeof p === 'string') { const fn = () => makeUni(); t[p] = fn; return fn; } return undefined; }, set(t, p, v) { t[p] = v; return true; } }); };
const ctx = dom.getInternalVMContext();
const order = JSON.parse(fs.readFileSync(path.join(root, 'js', 'load-order.json'), 'utf8'));
for (const f of order) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const G = win.G;
G.main.init();
G.rules.data.mode = 'war';
G.rules.data.bots = 2;
G.main.startMatch();
const m = G.main.match;
const p = m.world.player;
console.log('selected:', G.build.selected, 'pieces before:', G.build.pieces.length);
p.mats = 500;
const ok = G.build.place(G.build.selected, p.x + 60, p.y - 20, 0, p);
console.log('placed:', !!ok, 'pieces after:', G.build.pieces.length, 'mats:', p.mats);
if (ok) console.log('piece:', JSON.stringify({ pieceId: ok.pieceId, x: ok.x, dead: ok.dead, cells: ok.cells }));
// grid check
const t = m.world.terrain;
let stamped = 0;
const cx = Math.floor((p.x + 60) / t.cell), cy = Math.floor((p.y - 20) / t.cell);
for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) {
  const v = t.get ? t.get(cx + dx, cy + dy) : undefined;
  if (v === 2) stamped++;
}
console.log('cells with value 2 near piece:', stamped);
process.exit(0);
