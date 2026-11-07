/* ============================================================
   Bots: named, characterful AI fighters with skill levels,
   LOS target selection, leading, strafing, stuck recovery,
   hazard avoidance, LOD thinking, war-phase fort building.
   ============================================================ */
window.G = window.G || {};
(function () {
  'use strict';
  const M = G.M;

  const NAMES = [
    'Inky', 'Smudge', 'Doodle', 'Sketch', 'Blotch', 'Scribbles', 'Crayon', 'Pencil Pete',
    'Eraser Eddie', 'Marker Meg', 'Charcoal Chuck', 'Pastel Pat', 'Quill', 'Blotter',
    'Splat', 'Smear', 'Dottie', 'Linework Luke', 'Hatch Harry', 'Stipple Sue',
    'Crosshatch', 'Vinny Vignette', 'Rulo', 'Komix', 'Panelo', 'Gesso', 'Turpentine Tina',
    'Fixative Faye', 'Watercolor Walt', 'Gouache Gail', 'Tempera Tom', 'Blender Bex',
    'Chisel Chip', 'Filbert Phil', 'Flat Fred', 'Round Rob', 'Fan Fran', 'Mop Marty',
    'Rigger Rig', 'Script Sid', 'Liner Lena', 'Shader Shay', 'Wash Wendy', 'Glaze Gus',
    'Pigment Pia', 'Binder Bea', 'Canvas Carl', 'Palette Pal', 'Easel Izzy', 'Brushy',
    'Nubbin', 'Ferrule', 'Tintin', 'Toner', 'Litho', 'Serif Sam', 'Kern', 'Glyph',
    'Vector Vic', 'Raster Ras', 'Pixel Pix', 'Bezier', 'Gradient Greg', 'Opacity Opal',
    'Blendy', 'Masky', 'Layer Larry', 'Clip Clop', 'Artboard Art', 'Snappy', 'Wobbly Wes',
    'Biro Bob', 'Feltip Flo', 'Gel Pen Gwen', 'Ballpoint Bart', 'Highlighter Hal',
    'Whiteout Wanda', 'Stapler Steve', 'Paperclip Pam', 'Notepad Nia', 'Margin Milo',
    'Doodlebug', 'Inkwell Ida', 'Blotter Bud', 'Quill Q', 'Nib', 'Fountain Fay',
    'Cartridge Carl', 'Pigment P', 'Umber Uma', 'Sienna Sy', 'Ochre Ollie', 'Titanium Tia',
    'Cadmium Cal', 'Cobalt Cob', 'Viridian V', 'Alizarin Al', 'Payne Perry', 'Sepia Zed',
  ];

  class BotController {
    constructor(skill = 2) {
      this.skill = M.clamp(skill, 1, 5);   // 1 dumb .. 5 deadly
      this.name = M.pick(NAMES);
      this.thinkT = 0;
      this.thinkInterval = 0.5;
      this.input = { left: false, right: false, jump: false, jumpPressed: false, fire: false, aimX: 1, aimY: 0, aim: 0 };
      this.target = null;
      this.strafeDir = Math.random() < 0.5 ? -1 : 1;
      this.strafeT = 0;
      this.stuckT = 0;
      this.lastX = 0;
      this.jumpCd = 0;
      this.buildPlan = null;
      this.buildCount = 0;
    }
    getInput(ch, world) {
      const dt = world.lastDt || 1 / 60;
      this.thinkT -= dt;
      this.jumpCd -= dt;
      // LOD: distant bots think rarely
      const cam = G.renderer.camera;
      const dist = Math.abs(ch.x - cam.x);
      const lod = dist > 1600 ? 3 : dist > 800 ? 2 : 1;
      const interval = this.thinkInterval * lod;
      if (this.thinkT <= 0) {
        this.thinkT = interval;
        this.think(ch, world, lod);
      }
      // continuous aiming (cheap)
      if (this.target && this.target.alive) {
        const lead = (this.skill >= 3 ? 0.35 : 0) * M.dist(ch.x, ch.y, this.target.x, this.target.y) / 700;
        const tx = this.target.x + this.target.vx * lead;
        const ty = this.target.y - this.target.h * 0.55 + this.target.vy * lead;
        // aim error by skill
        const err = (5 - this.skill) * 0.06;
        const a = M.ang(ch.x, ch.y - ch.h * 0.55, tx, ty) + (Math.random() * 2 - 1) * err;
        this.input.aim = a;
        this.input.aimX = Math.cos(a); this.input.aimY = Math.sin(a);
        // fire if roughly on target and in range
        const d = M.dist(ch.x, ch.y, this.target.x, this.target.y);
        const wdef = ch.weapon ? ch.weapon.def : null;
        const range = wdef ? (wdef.type === 'melee' ? wdef.meleeReach + 10 : (wdef.beam ? 800 : wdef.speed * (wdef.lifetime || 2) * 0.5)) : 200;
        this.input.fire = d < range && this.hasLOS(ch, this.target, world);
        // melee bots need to be closer
        if (wdef && wdef.type === 'melee') this.input.fire = d < wdef.meleeReach + 16;
      } else {
        this.input.fire = false;
      }
      // jumpPressed edge
      const wasJump = this.input.jump;
      this.input.jump = this.wantJump;
      this.input.jumpPressed = this.wantJump && !wasJump;
      return this.input;
    }
    hasLOS(ch, t, world) {
      return world.terrain.lineOfSight(ch.x, ch.y - ch.h * 0.55, t.x, t.y - t.h * 0.55);
    }
    think(ch, world, lod) {
      // --- war build phase ---
      const modeDef = G.modes.get(world.mode);
      if (modeDef.isBuildPhase && modeDef.isBuildPhase(world)) {
        this.warBuild(ch, world);
        this.input.left = this.input.right = false;
        this.input.fire = false;
        return;
      }
      // --- target selection ---
      if (!this.target || !this.target.alive || Math.random() < 0.1) {
        let best = null, bd = 1e9;
        for (const f of world.fighters) {
          if (!f.alive || f === ch) continue;
          if (f.team !== 0 && f.team === ch.team) continue;
          const d = M.dist2(f.x, f.y, ch.x, ch.y);
          const visible = this.hasLOS(ch, f, world) || d < 300 * 300;
          if (visible && d < bd) { bd = d; best = f; }
        }
        this.target = best;
      }
      if (!this.target) {
        // wander
        this.wander(ch, world);
        return;
      }
      const t = this.target;
      const d = M.dist(ch.x, ch.y, t.x, t.y);
      const wdef = ch.weapon ? ch.weapon.def : null;
      const isMelee = wdef && wdef.type === 'melee';
      const wantDist = isMelee ? 30 : wdef && (wdef.type === 'shotgun') ? 120 : 260;
      // --- movement ---
      this.strafeT -= this.thinkInterval;
      if (this.strafeT <= 0) { this.strafeT = M.rand(0.8, 2); this.strafeDir *= Math.random() < 0.6 ? -1 : 1; }
      const dirTo = Math.sign(t.x - ch.x);
      if (d > wantDist + 60) {
        this.input.left = dirTo < 0; this.input.right = dirTo > 0;
      } else if (d < wantDist - 60) {
        this.input.left = dirTo > 0; this.input.right = dirTo < 0;
      } else {
        // strafe
        this.input.left = this.strafeDir < 0; this.input.right = this.strafeDir > 0;
      }
      // jump if target above, or blocked
      this.wantJump = false;
      if (t.y < ch.y - 60 && Math.random() < 0.5 + this.skill * 0.1) this.wantJump = true;
      if ((this.input.left || this.input.right) && Math.abs(ch.vx) < 20 && ch.onGround) {
        // blocked: jump
        this.wantJump = Math.random() < 0.7;
      }
      // random hop
      if (Math.random() < 0.05 + this.skill * 0.02) this.wantJump = true;
      if (this.jumpCd <= 0 && this.wantJump) this.jumpCd = 0.5;
      // --- hazard avoidance ---
      this.avoidHazards(ch, world);
      // --- stuck detection ---
      if (Math.abs(ch.x - this.lastX) < 4 && (this.input.left || this.input.right)) {
        this.stuckT += this.thinkInterval;
        if (this.stuckT > 0.8) {
          this.wantJump = true;
          this.strafeDir *= -1;
          this.stuckT = 0;
          if (Math.random() < 0.3) { this.input.left = !this.input.left; this.input.right = !this.input.right; }
        }
      } else this.stuckT = 0;
      this.lastX = ch.x;
      // reload when empty
      if (ch.weapon && ch.weapon.def.mag !== Infinity && ch.weapon.ammo <= 0) ch.weapon.startReload();
      // ring contest (king of the ring)
      if (world.ring && world.ring.active) {
        const rd = M.dist(ch.x, ch.y, world.ring.x, world.ring.y);
        if (rd > world.ring.r * 0.6) {
          const dir = Math.sign(world.ring.x - ch.x);
          this.input.left = dir < 0; this.input.right = dir > 0;
          if (world.ring.y < ch.y - 40) this.wantJump = true;
        }
      }
    }
    wander(ch, world) {
      if (Math.random() < 0.3) { this.strafeDir *= -1; }
      this.input.left = this.strafeDir < 0; this.input.right = this.strafeDir > 0;
      this.wantJump = Math.random() < 0.15;
    }
    avoidHazards(ch, world) {
      const ahead = ch.x + (this.input.right ? 50 : this.input.left ? -50 : 0);
      // lava/water deadly
      if (world.water.level !== Infinity) {
        if (world.water.type === 'lava' && ahead > world.water.level - 999) {
          const sy = world.terrain.surfaceY(ahead);
          if (sy > world.water.level - 30) {
            this.input.left = this.input.right ? !this.input.right : false;
            this.strafeDir *= -1;
          }
        }
      }
      // don't walk off cliffs (check drop ahead)
      if (ch.onGround && (this.input.left || this.input.right)) {
        const dir = this.input.right ? 1 : -1;
        const dropY = world.terrain.surfaceY(ch.x + dir * 60, ch.y - 20);
        if (dropY > ch.y + 200) {
          // big drop: risky — high skill bots avoid
          if (Math.random() < 0.3 + this.skill * 0.15) {
            this.input.left = dir > 0; this.input.right = dir < 0;
          }
        }
      }
    }
    // --- war build phase: simple forts ---
    warBuild(ch, world) {
      if (!this.buildPlan || this.buildCount > 14) {
        // plan: wall of blocks + torch near spawn
        const bx = ch.x, by = world.terrain.surfaceY(ch.x) - 21;
        this.buildPlan = { x: bx, y: by, i: 0 };
        this.buildCount = 0;
      }
      const plan = this.buildPlan;
      const pieces = ['stone_block', 'stone_block', 'stone_block', 'plank', 'torch', 'stone_block', 'stone_block'];
      const id = pieces[plan.i % pieces.length];
      const def = G.build.def(id);
      const ox = (plan.i % 3 - 1) * 44;
      const oy = -Math.floor(plan.i / 3) * 44;
      const x = plan.x + ox, y = plan.y + oy;
      if (ch.mats >= def.cost) {
        const check = G.build.canPlace(id, x, y, 0, ch);
        if (check.ok) {
          G.build.place(id, x, y, 0, ch);
          this.buildCount++;
          plan.i++;
        } else plan.i++;
      }
      this.input.fire = false;
    }
  }

  const bots = {
    NAMES,
    make(skill) { return new BotController(skill); },
  };
  G.BotController = BotController;
  G.bots = bots;
})();
