/* ============================================================
   Weapons: 60 data-driven definitions, rarity tiers, weighted
   rolls, scripting hooks + helper API.
   Sprites are procedural (see weaponArt.js) — the README
   documents the AI-image pipeline for adding real sprites.
   ============================================================ */
window.G = window.G || {};
(function () {
  'use strict';
  const M = G.M;

  const TIERS = {
    common:    { weight: 38, color: '#8a7f6a', label: 'Common' },
    uncommon:  { weight: 26, color: '#6f9e54', label: 'Uncommon' },
    rare:      { weight: 16, color: '#5b8dd9', label: 'Rare' },
    epic:      { weight: 9,  color: '#8a5ac9', label: 'Epic' },
    legendary: { weight: 5,  color: '#e88a3c', label: 'Legendary' },
    mythic:    { weight: 2,  color: '#e4573d', label: 'MYTHIC' },
  };

  const W = {};
  function def(o) {
    W[o.id] = Object.assign({
      tier: 'common', type: 'pistol',
      damage: 10, rof: 3, spread: 0.04, speed: 700, gravity: 0, drag: 0,
      bounces: 0, fuse: 0, homing: 0, pierce: 0, passTerrain: false,
      lifetime: 2, bulletSize: 3, mag: Infinity, reload: 0,
      charge: 0, spinup: 0, burst: 1, burstDelay: 0.07,
      lifesteal: 0, knockback: 0, recoil: 1,
      status: null, explode: null, cluster: null, meleeReach: 0,
      sound: 'shoot', spriteW: 40, spriteH: 16, displayScale: 1,
    }, o);
  }

  // ---------------- melee ----------------
  def({ id: 'inkblade', name: 'Ink Blade', tier: 'common', type: 'melee', damage: 22, rof: 2.2, meleeReach: 46, sound: 'melee', art: { arch: 'blade', c1: '#c9c2b4' }, desc: 'A trusty pen-knife.' });
  def({ id: 'ladle', name: 'Kitchen Ladle', tier: 'common', type: 'melee', damage: 16, rof: 3, meleeReach: 38, knockback: 120, sound: 'melee', art: { arch: 'blade', c1: '#a8a29a' }, desc: 'Soups on.' });
  def({ id: 'cardspear', name: 'Cardboard Spear', tier: 'common', type: 'melee', damage: 18, rof: 2, meleeReach: 62, sound: 'melee', art: { arch: 'spear', c1: '#c9a86a' }, desc: 'Long, flimsy, pointy.' });
  def({ id: 'mallet', name: 'Sturdy Mallet', tier: 'uncommon', type: 'melee', damage: 34, rof: 1.1, meleeReach: 42, knockback: 300, sound: 'melee', art: { arch: 'hammer', c1: '#8a6a4a' }, desc: 'Bonk.' });
  def({ id: 'scissors', name: 'Scissors of Fate', tier: 'rare', type: 'melee', damage: 28, rof: 2.6, meleeReach: 44, lifesteal: 0.3, sound: 'melee', art: { arch: 'blade', c1: '#c9c2b4' }, desc: 'Runs. Cuts. Heals.' });
  def({ id: 'umbrellapike', name: 'Umbrella Pike', tier: 'uncommon', type: 'melee', damage: 20, rof: 1.8, meleeReach: 58, knockback: 180, sound: 'melee', art: { arch: 'spear', c1: '#4a6ac9' }, desc: 'Rain-proof and rude.' });
  def({ id: 'broom', name: 'Broom of Doom', tier: 'common', type: 'melee', damage: 15, rof: 3.2, meleeReach: 52, knockback: 220, sound: 'melee', art: { arch: 'spear', c1: '#b08a4a' }, desc: 'Sweep the leg.' });
  def({ id: 'quakehammer', name: 'Quake Hammer', tier: 'epic', type: 'melee', damage: 40, rof: 0.8, meleeReach: 50, knockback: 420, explode: { radius: 70, damage: 18, knockback: 260, crater: 26 }, sound: 'melee', art: { arch: 'hammer', c1: '#6a4a3a' }, desc: 'Slam the ground itself.', hooks: { onImpact: (api, x, y) => api.shockwave(x, y, 90, 300) } });

  // ---------------- thrown ----------------
  def({ id: 'knife', name: 'Throwing Knife', tier: 'common', type: 'thrown', damage: 18, rof: 1.6, speed: 620, gravity: 500, spin: true, sound: 'throw', art: { arch: 'knife' }, desc: 'Comes back? No.' });
  def({ id: 'throwingaxe', name: 'Throwing Axe', tier: 'common', type: 'thrown', damage: 26, rof: 1, speed: 520, gravity: 700, spin: true, sound: 'throw', art: { arch: 'axe' }, desc: 'Heavy. Satisfying.' });
  def({ id: 'boomerang', name: 'Boomerang', tier: 'uncommon', type: 'thrown', damage: 16, rof: 1.2, speed: 560, gravity: 0, homing: 0, returns: true, sound: 'throw', art: { arch: 'boomerang' }, desc: 'It remembers you.' });
  def({ id: 'shuriken', name: 'Paper Shuriken', tier: 'common', type: 'thrown', damage: 9, rof: 4, speed: 700, gravity: 300, spread: 0.1, spin: true, sound: 'throw', art: { arch: 'star' }, desc: 'Folded with care.' });
  def({ id: 'stickybomb', name: 'Sticky Bomb', tier: 'rare', type: 'thrown', damage: 5, rof: 0.8, speed: 420, gravity: 800, fuse: 2, bounces: 3, explode: { radius: 90, damage: 55, knockback: 340, crater: 34 }, sound: 'throw', art: { arch: 'bomb' }, desc: 'Stick. Wait. Boom.' });
  def({ id: 'molotov', name: 'Ink Molotov', tier: 'uncommon', type: 'thrown', damage: 8, rof: 1, speed: 460, gravity: 800, fuse: 1.4, explode: { radius: 60, damage: 15, knockback: 100, crater: 0, fire: true }, sound: 'throw', art: { arch: 'bottle' }, desc: 'Sets the page alight.' });

  // ---------------- pistols ----------------
  def({ id: 'peashooter', name: 'Peashooter', tier: 'common', type: 'pistol', damage: 12, rof: 3.5, speed: 760, mag: 12, reload: 1.1, sound: 'shoot', art: { arch: 'pistol', c1: '#6a5a4a' }, desc: 'Humble beginnings.' });
  def({ id: 'dualmarker', name: 'Dual Markers', tier: 'common', type: 'pistol', damage: 8, rof: 2.2, burst: 2, burstDelay: 0.09, speed: 680, mag: 16, reload: 1.2, sound: 'shoot', art: { arch: 'pistol', c1: '#4a3a3a' }, desc: 'Two pens, twice the scribble.' });
  def({ id: 'handcannon', name: 'Heavy Hand Cannon', tier: 'rare', type: 'pistol', damage: 38, rof: 1.1, speed: 820, mag: 6, reload: 1.5, knockback: 200, recoil: 3, explode: { radius: 30, damage: 10, knockback: 120, crater: 6 }, sound: 'shoot', art: { arch: 'pistol', c1: '#4a4642', big: true }, desc: 'Loud opinions.' });
  def({ id: 'dartgun', name: 'Dart Gun', tier: 'uncommon', type: 'pistol', damage: 9, rof: 2.4, speed: 640, status: { chill: 2 }, mag: 8, reload: 1.2, sound: 'shoot', art: { arch: 'pistol', c1: '#5b8dd9' }, desc: 'Chilling out.' });
  def({ id: 'flaregun', name: 'Flare Gun', tier: 'uncommon', type: 'pistol', damage: 14, rof: 1, speed: 520, gravity: 300, status: { burn: 3 }, explode: { radius: 40, damage: 8, knockback: 60, crater: 0, fire: true }, sound: 'shoot', art: { arch: 'pistol', c1: '#c94a4a' }, desc: 'Signal the end.' });
  def({ id: 'boltpistol', name: 'Bolt Pistol', tier: 'rare', type: 'pistol', damage: 15, rof: 2.2, speed: 900, status: { shock: 0.8 }, mag: 10, reload: 1.3, sound: 'shoot', art: { arch: 'pistol', c1: '#e8b93c' }, desc: 'Static cling.' });

  // ---------------- automatics ----------------
  def({ id: 'scribblesmg', name: 'Scribble SMG', tier: 'common', type: 'auto', damage: 7, rof: 11, spread: 0.09, speed: 720, mag: 30, reload: 1.4, sound: 'shoot', art: { arch: 'smg' }, desc: 'Spray and pray.' });
  def({ id: 'pencilminigun', name: 'Pencil Minigun', tier: 'epic', type: 'auto', damage: 6, rof: 18, spread: 0.13, speed: 760, mag: 120, reload: 2.4, spinup: 0.8, sound: 'shoot', art: { arch: 'minigun' }, desc: 'Drafting at 1200 words per minute.' });
  def({ id: 'markerrifle', name: 'Marker Rifle', tier: 'uncommon', type: 'auto', damage: 11, rof: 6, spread: 0.05, speed: 820, mag: 24, reload: 1.5, sound: 'shoot', art: { arch: 'rifle' }, desc: 'Bold strokes.' });
  def({ id: 'stapler', name: 'Heavy Stapler', tier: 'common', type: 'auto', damage: 9, rof: 2.8, burst: 3, burstDelay: 0.06, spread: 0.06, speed: 700, mag: 21, reload: 1.3, sound: 'shoot', art: { arch: 'smg', c1: '#a8a29a' }, desc: 'Bind. Them. Together.' });
  def({ id: 'bubblegun', name: 'Bubble Gun', tier: 'uncommon', type: 'auto', damage: 5, rof: 8, spread: 0.12, speed: 420, drag: 1.6, status: { chill: 0.6 }, mag: 40, reload: 1.6, sound: 'shoot', art: { arch: 'pistol', c1: '#7ab8e8' }, desc: 'Softly deadly.' });
  def({ id: 'seedspitter', name: 'Seed Spitter', tier: 'common', type: 'auto', damage: 6, rof: 7, spread: 0.15, speed: 540, gravity: 400, mag: 35, reload: 1.4, sound: 'shoot', art: { arch: 'smg', c1: '#8a6a4a' }, desc: 'Garden warfare.' });
  def({ id: 'inkhose', name: 'Ink Hose', tier: 'rare', type: 'auto', damage: 4, rof: 22, spread: 0.18, speed: 500, drag: 2.4, lifetime: 0.7, mag: 150, reload: 2, sound: 'shoot', art: { arch: 'hose' }, desc: 'The ink must flow.' });

  // ---------------- shotguns ----------------
  def({ id: 'blunderbuss', name: 'Blunderbuss', tier: 'common', type: 'shotgun', damage: 9, rof: 1.2, pellets: 6, spread: 0.22, speed: 640, mag: 6, reload: 1.6, knockback: 160, sound: 'shoot', art: { arch: 'shotgun' }, desc: 'Old and angry.' });
  def({ id: 'doubledoodle', name: 'Double Doodle', tier: 'uncommon', type: 'shotgun', damage: 11, rof: 1.6, pellets: 8, spread: 0.26, speed: 620, mag: 8, reload: 1.7, knockback: 200, sound: 'shoot', art: { arch: 'shotgun', c1: '#8a6a4a' }, desc: 'Two barrels of scribble.' });
  def({ id: 'confetticannon', name: 'Confetti Cannon', tier: 'uncommon', type: 'shotgun', damage: 7, rof: 1, pellets: 12, spread: 0.4, speed: 560, mag: 4, reload: 1.8, sound: 'shoot', art: { arch: 'shotgun', c1: '#c78fda' }, hooks: { onFire: (api, ch) => G.vfx.confettiBurst(ch.x, ch.y - 20, 10) }, desc: 'Party lethal.' });
  def({ id: 'scattershot', name: 'Scattershot', tier: 'rare', type: 'shotgun', damage: 13, rof: 1.4, pellets: 9, spread: 0.3, speed: 700, mag: 6, reload: 1.9, knockback: 260, lifesteal: 0.15, sound: 'shoot', art: { arch: 'shotgun', c1: '#4a4642' }, desc: 'Steals more than breath.' });

  // ---------------- launchers ----------------
  def({ id: 'grenadelauncher', name: 'Grenade Launcher', tier: 'uncommon', type: 'launcher', damage: 8, rof: 0.9, speed: 520, gravity: 900, fuse: 1.6, bounces: 2, explode: { radius: 100, damage: 50, knockback: 300, crater: 38 }, mag: 4, reload: 2, sound: 'shoot', art: { arch: 'launcher' }, desc: 'Lob with intent.' });
  def({ id: 'rocket', name: 'Rocket Scribbler', tier: 'rare', type: 'launcher', damage: 12, rof: 0.8, speed: 560, explode: { radius: 110, damage: 60, knockback: 360, crater: 42 }, mag: 3, reload: 2.2, sound: 'shoot', art: { arch: 'launcher', c1: '#6a4a3a' }, desc: 'Straight to the point.' });
  def({ id: 'clusterbomb', name: 'Cluster Bomb', tier: 'epic', type: 'launcher', damage: 6, rof: 0.6, speed: 480, gravity: 700, fuse: 1.5, explode: { radius: 70, damage: 30, knockback: 240, crater: 24 }, cluster: { count: 5, damage: 18, radius: 55, crater: 16 }, mag: 2, reload: 2.6, sound: 'shoot', art: { arch: 'launcher', c1: '#4a4642' }, desc: 'One big problem, many small ones.' });
  def({ id: 'bouncybomb', name: 'Bouncy Bomb', tier: 'uncommon', type: 'launcher', damage: 10, rof: 1, speed: 460, gravity: 800, bounces: 6, fuse: 2.4, explode: { radius: 90, damage: 45, knockback: 300, crater: 32 }, mag: 3, reload: 1.8, sound: 'shoot', art: { arch: 'bomb' }, desc: 'Ricochet roulette.' });
  def({ id: 'mortar', name: 'Doodle Mortar', tier: 'rare', type: 'launcher', damage: 10, rof: 0.7, speed: 700, gravity: 1400, fuse: 0, explode: { radius: 120, damage: 58, knockback: 340, crater: 46 }, mag: 3, reload: 2.4, sound: 'shoot', art: { arch: 'launcher', c1: '#6a5a4a', big: true }, desc: 'For high-arc arguments.' });
  def({ id: 'paintbomb', name: 'Paint Can Bomb', tier: 'common', type: 'launcher', damage: 6, rof: 0.9, speed: 440, gravity: 900, fuse: 1.8, bounces: 2, explode: { radius: 80, damage: 34, knockback: 200, crater: 20 }, mag: 3, reload: 1.7, sound: 'shoot', art: { arch: 'can' }, desc: 'A colourful mess.' });

  // ---------------- beams ----------------
  def({ id: 'laserpointer', name: 'Laser Pointer', tier: 'uncommon', type: 'beam', damage: 5, rof: 10, beam: true, lifetime: 0.12, sound: 'beam', art: { arch: 'beam', c1: '#e4573d' }, desc: 'Annoying to cats and fighters.' });
  def({ id: 'heatray', name: 'Heat Ray', tier: 'rare', type: 'beam', damage: 4, rof: 14, beam: true, lifetime: 0.14, status: { burn: 2 }, sound: 'beam', art: { arch: 'beam', c1: '#e88a3c' }, desc: 'Slow roast.' });
  def({ id: 'freezeray', name: 'Freeze Ray', tier: 'rare', type: 'beam', damage: 3, rof: 12, beam: true, lifetime: 0.14, status: { chill: 2.4 }, sound: 'beam', art: { arch: 'beam', c1: '#7ab8e8' }, desc: 'Cold takes only.' });
  def({ id: 'prismbeam', name: 'Prism Beam', tier: 'epic', type: 'beam', damage: 9, rof: 6, beam: true, beamPierce: true, lifetime: 0.16, sound: 'beam', art: { arch: 'beam', c1: '#c78fda', fancy: true }, desc: 'Refracts through almost anyone.' });

  // ---------------- exotic ----------------
  def({ id: 'lightningrod', name: 'Lightning Rod', tier: 'epic', type: 'exotic', damage: 14, rof: 1.4, speed: 2000, lightning: true, status: { shock: 1 }, mag: 8, reload: 1.6, sound: 'zap', art: { arch: 'staff', c1: '#e8b93c' }, desc: 'Calls the sky down.' });
  def({ id: 'blackhole', name: 'Pocket Black Hole', tier: 'legendary', type: 'exotic', damage: 4, rof: 0.5, speed: 300, gravity: 0, lifetime: 3, explode: null, blackhole: 3, mag: 2, reload: 3, sound: 'shoot', art: { arch: 'orb', c1: '#2a2438' }, desc: 'Sucks. Literally.', hooks: { onImpact: (api, x, y) => { G.vfx.ring(x, y); } } });
  def({ id: 'gravitygun', name: 'Gravity Well Gun', tier: 'epic', type: 'exotic', damage: 6, rof: 0.8, speed: 400, lifetime: 2.5, gravityWell: 3, mag: 3, reload: 2.4, sound: 'shoot', art: { arch: 'staff', c1: '#8a5ac9' }, desc: 'Alters the argument.' });
  def({ id: 'beegun', name: 'Bee Gun', tier: 'rare', type: 'exotic', damage: 3, rof: 6, speed: 300, gravity: 0, homing: 3, lifetime: 2.5, status: { burn: 0.5 }, mag: 20, reload: 1.4, sound: 'buzz', art: { arch: 'orb', c1: '#e8b93c' }, desc: 'The hive disagrees.' });
  def({ id: 'hedgehog', name: 'Hedgehog Launcher', tier: 'rare', type: 'exotic', damage: 10, rof: 1.2, speed: 480, gravity: 500, spread: 0.1, mag: 6, reload: 1.6, sound: 'shoot', art: { arch: 'launcher', c1: '#8a6a4a' }, desc: 'Prickly payload.' });
  def({ id: 'tornadogun', name: 'Tornado Gun', tier: 'epic', type: 'exotic', damage: 5, rof: 1, speed: 260, lifetime: 3, tornado: 2.4, mag: 4, reload: 2.2, sound: 'shoot', art: { arch: 'staff', c1: '#7ab8e8' }, desc: 'Weather with attitude.' });
  def({ id: 'bouncegun', name: 'Bounce Blaster', tier: 'rare', type: 'exotic', damage: 12, rof: 2.4, speed: 560, bounces: 8, lifetime: 4, mag: 10, reload: 1.4, sound: 'shoot', art: { arch: 'pistol', c1: '#78c6a3' }, desc: 'Geometry is a weapon.' });
  def({ id: 'chainbolt', name: 'Chain Bolt', tier: 'legendary', type: 'exotic', damage: 20, rof: 1.6, speed: 900, chain: 3, status: { shock: 0.8 }, mag: 6, reload: 1.8, sound: 'zap', art: { arch: 'staff', c1: '#5b8dd9' }, desc: 'Shares the shock.' });

  // ---------------- utility ----------------
  def({ id: 'buildtool', name: 'Build Tool', tier: 'common', type: 'utility', build: true, damage: 0, rof: 5, meleeReach: 30, sound: 'melee', art: { arch: 'wrench' }, desc: 'Open the build bar.' });
  def({ id: 'digtool', name: 'Dig Tool', tier: 'common', type: 'utility', dig: true, damage: 0, rof: 4, meleeReach: 30, sound: 'melee', art: { arch: 'shovel' }, desc: 'Carve the earth.' });
  def({ id: 'medigun', name: 'Medigun', tier: 'uncommon', type: 'utility', heal: 14, rof: 2, beam: true, lifetime: 0.12, mag: 10, reload: 1.4, sound: 'beam', art: { arch: 'beam', c1: '#78c6a3' }, desc: 'Do no harm. Undo some.' });
  def({ id: 'grapple', name: 'Grapple Hook', tier: 'uncommon', type: 'utility', grapple: true, damage: 4, rof: 1.2, speed: 900, lifetime: 1.2, mag: 4, reload: 1, sound: 'throw', art: { arch: 'hook' }, desc: 'Swing first, ask later.' });
  def({ id: 'shieldproj', name: 'Shield Projector', tier: 'rare', type: 'utility', shield: true, damage: 0, rof: 0.8, speed: 400, lifetime: 10, mag: 3, reload: 2.5, sound: 'shoot', art: { arch: 'orb', c1: '#78c6a3' }, desc: 'A bubble of confidence.' });

  // ---------------- mythics ----------------
  def({
    id: 'quillscribe', name: 'Quill of the Scribe', tier: 'mythic', type: 'mythic', damage: 8, rof: 0.8, speed: 500, gravity: 400, mag: 4, reload: 2,
    explode: { radius: 90, damage: 45, knockback: 280, crater: 30 },
    sound: 'shoot', art: { arch: 'quill' }, desc: 'The sky rains ink.',
    hooks: {
      onFire(api, ch, input) {
        // ink meteor volley
        for (let i = 0; i < 3; i++) {
          G.projectiles.spawn({
            x: ch.x + G.M.rand(-30, 30), y: ch.y - 420 - i * 60,
            vx: G.M.rand(-40, 40) + ch.facing * 60, vy: 300,
            def: W.quillscribe, owner: ch, meteor: true,
          });
        }
      },
    },
  });
  def({
    id: 'sunstamp', name: 'The Sun Stamp', tier: 'mythic', type: 'mythic', damage: 10, rof: 0.6, speed: 380, gravity: 0, mag: 3, reload: 2.4,
    explode: { radius: 150, damage: 70, knockback: 450, crater: 55, fire: true },
    sound: 'shoot', art: { arch: 'stamp' }, desc: 'Stamps the sun onto the page.',
    hooks: { onImpact(api, x, y) { G.vfx.sunflare(x, y); } },
  });
  def({
    id: 'bigeraser', name: 'The Big Eraser', tier: 'mythic', type: 'mythic', damage: 12, rof: 1, speed: 600, mag: 5, reload: 2,
    erase: 60, sound: 'shoot', art: { arch: 'eraser' }, desc: 'Deletes terrain. And friends.',
  });
  def({
    id: 'origamidragon', name: 'Origami Dragon', tier: 'mythic', type: 'mythic', damage: 6, rof: 1, speed: 300, gravity: 0, homing: 4, lifetime: 6, mag: 3, reload: 3,
    dragon: true, sound: 'shoot', art: { arch: 'dragon' }, desc: 'Folds itself into a companion.',
  });
  def({
    id: 'stormbottle', name: 'Storm in a Bottle', tier: 'mythic', type: 'mythic', damage: 5, rof: 0.7, speed: 440, gravity: 700, fuse: 1.2, mag: 2, reload: 3,
    storm: true, sound: 'throw', art: { arch: 'bottle', c1: '#5b8dd9' }, desc: 'Uncork the weather.',
    hooks: {
      onImpact(api, x, y) {
        G.weather.set('storm');
        for (let i = 0; i < 6; i++) {
          setTimeout(() => { G.vfx.lightningStrike(x + G.M.rand(-200, 200), y); }, i * 180);
        }
      },
    },
  });
  def({
    id: 'doodlepencil', name: 'Doodle God Pencil', tier: 'mythic', type: 'mythic', damage: 16, rof: 2, speed: 760, mag: 12, reload: 1.6,
    lifesteal: 0.25, pierce: 2, status: { burn: 1, chill: 1, shock: 0.5 },
    sound: 'shoot', art: { arch: 'pencil' }, desc: 'It draws what it wants.',
  });

  // ---------- weapon instance ----------
  class Weapon {
    constructor(defId) {
      this.def = W[defId] || W.peashooter;
      this.ammo = this.def.mag;
      this.reloadT = 0;
      this.chargeT = 0;
      this.spinT = 0;
      this.cooldown = 0;
      this.recoilT = 0;
      this.muzzleT = 0;
      this.burstLeft = 0;
      this.burstTimer = 0;
      this.ownerRef = null;   // set by Character on equip; burst continuation reads owner input
    }
    get id() { return this.def.id; }
    tryFire(ch, world, input) {
      const d = this.def;
      // build/dig tools handled by building system
      if (d.build || d.dig) { G.build.toolFire(ch, world, input, d); return; }
      if (this.reloadT > 0 || this.cooldown > 0) return;
      if (d.spinup > 0 && this.spinT < d.spinup) return; // still spinning up
      if (d.mag !== Infinity && this.ammo <= 0) { this.startReload(); return; }
      // charge weapons
      if (d.charge > 0) {
        this.chargeT += 1 / 60;
        if (this.chargeT < d.charge) return;
        this.chargeT = 0;
      }
      this.fire(ch, world, input.aim !== undefined ? input.aim : ch.aim);
    }
    fire(ch, world, aim) {
      const d = this.def;
      this.cooldown = 1 / d.rof;
      this.recoilT = 0.12;
      this.muzzleT = 0.06;
      if (d.mag !== Infinity) this.ammo--;
      ch.attackT = 1;
      G.audio.play(d.sound, { x: ch.x, y: ch.y });
      if (d.recoil > 1.5) ch.vx -= Math.cos(aim) * d.recoil * 22;
      // hooks
      if (d.hooks && d.hooks.onFire) d.hooks.onFire(G.weaponApi, ch, { aim });
      if (d.type === 'melee') {
        G.projectiles.meleeSwing(ch, d, aim);
        return;
      }
      if (d.beam) {
        G.projectiles.fireBeam(ch, d, aim);
        return;
      }
      if (d.grapple) { G.projectiles.fireGrapple(ch, d, aim); return; }
      if (d.shield) { G.projectiles.fireShield(ch, d, aim); return; }
      const pellets = d.pellets || 1;
      const burst = this.burstLeft > 0 ? 0 : (d.burst || 1);
      for (let b = 0; b < Math.max(1, pellets); b++) {
        const spread = (Math.random() * 2 - 1) * d.spread + (pellets > 1 ? (b - (pellets - 1) / 2) * d.spread * 1.6 : 0);
        const a = aim + spread;
        G.projectiles.spawn({
          x: ch.x + Math.cos(a) * 16, y: ch.y - ch.h * 0.6 + Math.sin(a) * 16,
          vx: Math.cos(a) * d.speed, vy: Math.sin(a) * d.speed,
          def: d, owner: ch,
        });
      }
      if (d.burst > 1 && this.burstLeft <= 0) this.burstLeft = d.burst - 1;
    }
    startReload() {
      const d = this.def;
      if (d.mag === Infinity || this.ammo >= d.mag || this.reloadT > 0) return;
      this.reloadT = d.reload;
      G.audio.play('reload', { x: 0, y: 0, vol: 0.5 });
    }
    update(dt) {
      this.cooldown = Math.max(0, this.cooldown - dt);
      this.recoilT = Math.max(0, this.recoilT - dt);
      this.muzzleT = Math.max(0, this.muzzleT - dt);
      const d = this.def;
      // spinup: fires only when spun, spins while holding fire
      if (d.spinup > 0) {
        // handled in update via owner input; simplified: spin always while equipped
        this.spinT = Math.min(d.spinup, this.spinT + dt);
      }
      if (this.reloadT > 0) {
        this.reloadT -= dt;
        if (this.reloadT <= 0) { this.reloadT = 0; this.ammo = d.mag; }
      }
      // burst
      if (this.burstLeft > 0) {
        this.burstTimer -= dt;
        if (this.burstTimer <= 0 && this.cooldown <= 0) {
          const ch = G.world && G.world.player;
          // burst only continues if trigger held by owner; simplified for bots via stored owner
          const owner = this.ownerRef;
          if (owner && owner.alive && owner.input && owner.input.fire) {
            this.burstLeft--;
            this.burstTimer = d.burstDelay;
            this.fire(owner, G.world, owner.aim);
          } else this.burstLeft = 0;
        }
      }
    }
  }

  // ---------- helper API for hooks ----------
  const weaponApi = {
    explode(x, y, r, dmg, owner, opts = {}) {
      G.combat.explode(x, y, r, dmg, owner, opts);
    },
    crater(x, y, r) { G.world.terrain.carve(x, y, r); G.props.onTerrainEdit(x, y, r); },
    damageCircle(x, y, r, dmg, owner) {
      for (const f of G.world.fighters) {
        if (f.alive && G.M.dist(f.x, f.y - f.h / 2, x, y) < r) f.damage(dmg, owner, 'blast');
      }
    },
    knockback(x, y, r, force, exclude) {
      for (const f of G.world.fighters) {
        if (!f.alive || f === exclude) continue;
        const d = G.M.dist(f.x, f.y, x, y);
        if (d < r) {
          const a = G.M.ang(x, y, f.x, f.y);
          const k = 1 - d / r;
          f.vx += Math.cos(a) * force * k;
          f.vy += Math.sin(a) * force * k - 120 * k;
        }
      }
    },
    applyStatus(x, y, r, kind, t) {
      for (const f of G.world.fighters) {
        if (f.alive && G.M.dist(f.x, f.y, x, y) < r) f.applyStatus(kind, t);
      }
    },
    shockwave(x, y, r, force) { this.knockback(x, y, r, force, null); G.vfx.ring(x, y); },
    heal(f, amt) { f.heal(amt); },
  };

  // ---------- system ----------
  const weapons = {
    defs: W, tiers: TIERS,
    get(id) { return W[id]; },
    roll() {
      const tier = M.weightedPick(Object.keys(TIERS), t => TIERS[t].weight);
      const pool = Object.values(W).filter(w => w.tier === tier);
      return M.pick(pool.length ? pool : Object.values(W));
    },
    rollFor(roundSeed, forceSame) {
      if (forceSame) {
        const d = this.roll();
        return d;
      }
      return this.roll();
    },
    create(id) { return new Weapon(id); },
    register(o) { def(o); return W[o.id]; },
  };

  G.weapons = weapons;
  G.Weapon = Weapon;
  G.weaponApi = weaponApi;
})();
