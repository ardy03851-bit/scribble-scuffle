/* ============================================================
   Modes: Classic Arena, The Big Wilds, War, King of the Ring.
   Each mode is data + hooks (setup, setupRound, checkRoundEnd,
   respawn, teamBases, build phase).
   ============================================================ */
window.G = window.G || {};
(function () {
  'use strict';
  const M = G.M;

  const MODES = {
    classic: {
      id: 'classic', name: 'Classic Arena', desc: 'A compact map. Fast rounds. Last ink standing wins.',
      big: false, respawn: false,
      checkRoundEnd(world) {
        const match = world.match;
        if (!match || match.roundState !== 'fighting') return;
        const alive = world.fighters.filter(f => f.alive);
        if (world.rules.teams > 1) {
          const teamsAlive = new Set(alive.map(f => f.team));
          if (teamsAlive.size <= 1) {
            const w = alive[0] || null;
            match.endRound(w);
            match.checkMatchOver();
          }
        } else if (alive.length <= 1) {
          match.endRound(alive[0] || null);
          match.checkMatchOver();
        }
        // time out without sudden death
        if (!match.roundEnded && world.rules.suddenDeath === false && world.roundElapsed >= world.roundTime) {
          const w = alive.sort((a, b) => b.hp - a.hp)[0] || null;
          match.endRound(w);
          match.checkMatchOver();
        }
      },
    },
    wilds: {
      id: 'wilds', name: 'The Big Wilds', desc: 'A huge map, a follow camera, supply drops, and as many bots as you dare.',
      big: true, respawn: false,
      checkRoundEnd(world) {
        MODES.classic.checkRoundEnd(world);
      },
    },
    war: {
      id: 'war', name: 'War', desc: 'Teams, bases, a build phase, and shared tickets. Fortify, then fight.',
      big: true, respawn: true,
      setup(world) {
        world.buildPhase = null;
        world.teamTickets = {};
      },
      setupRound(match, world) {
        const len = world.rules.buildPhase != null ? world.rules.buildPhase : 30;
        world.buildPhase = { t: len, total: len };
        world.teamTickets = {};
        const teams = world.rules.teams || 2;
        for (let t = 1; t <= teams; t++) world.teamTickets[t] = world.rules.tickets != null ? world.rules.tickets : 10;
        // bases: banners at team spawns
        const teamsN = Math.max(2, teams);
        for (let t = 1; t <= teamsN; t++) {
          const bx = world.mapW * (t / (teamsN + 1));
          const by = world.terrain.surfaceY(bx) - 20;
          G.build.place('banner', bx, by, 0, world.fighters.find(f => f.team === t), true);
          G.build.place('campfire', bx + 50, world.terrain.surfaceY(bx + 50) - 10, 0, null, true);
        }
      },
      isBuildPhase(world) {
        return world && world.buildPhase && world.buildPhase.t > 0;
      },
      teamBases(world, team) {
        const teams = Math.max(2, world.rules.teams || 2);
        const x = world.mapW * (team / (teams + 1));
        return { x };
      },
      checkRoundEnd(world) {
        const match = world.match;
        if (!match || match.roundState !== 'fighting') return;
        const teams = world.rules.teams || 2;
        let teamsStanding = [];
        for (let t = 1; t <= teams; t++) {
          const alive = world.fighters.some(f => f.alive && f.team === t);
          const tickets = (world.teamTickets && world.teamTickets[t] > 0);
          if (alive || tickets) teamsStanding.push(t);
        }
        if (teamsStanding.length <= 1) {
          const w = world.fighters.find(f => f.team === teamsStanding[0]) || null;
          match.endRound(w);
          match.checkMatchOver();
        }
      },
    },
    ring: {
      id: 'ring', name: 'King of the Ring', desc: 'A golden ring roams the map. Hold it alone to score. Fallen fighters respawn.',
      big: false, respawn: true,
      setupRound(match, world) {
        world.ring = {
          x: world.mapW * 0.5,
          y: world.terrain.surfaceY(world.mapW * 0.5) - 70,
          r: 95, tx: world.mapW * 0.5, holdT: 0, holder: null, t: 0,
        };
      },
      update(world, dt) {
        const ring = world.ring;
        if (!ring || world.match.roundState !== 'fighting') return;
        ring.t += dt;
        // roam: pick a new target every few seconds
        if (ring.t % 6 < dt || Math.abs(ring.tx - ring.x) < 20) {
          ring.tx = 60 + Math.random() * (world.mapW - 120);
        }
        ring.x += (ring.tx - ring.x) * Math.min(1, dt * 0.25);
        const groundY = world.terrain.surfaceY(ring.x);
        ring.y += ((groundY - 70) - ring.y) * Math.min(1, dt * 2);
        // who is inside?
        const inside = world.fighters.filter(f => f.alive && Math.hypot(f.x - ring.x, (f.y - f.h / 2) - ring.y) < ring.r);
        if (inside.length === 1) {
          if (ring.holder !== inside[0]) { ring.holder = inside[0]; ring.holdT = 0; }
          ring.holdT += dt;
          inside[0].score = (inside[0].score || 0) + dt;   // holding alone accrues score
          if (world.rules.teams > 1) world.teamScores[inside[0].team] = (world.teamScores[inside[0].team] || 0) + dt;
        } else {
          ring.holder = null;
          ring.holdT = 0;
        }
      },
      checkRoundEnd(world) {
        const match = world.match;
        if (!match || match.roundState !== 'fighting') return;
        for (const f of world.fighters) {
          if (f.score >= match.targetScore) {
            match.endRound(f);
            match.checkMatchOver();
            return;
          }
        }
      },
    },
  };

  const modes = {
    all: MODES,
    get(id) { return MODES[id] || MODES.classic; },
    list() { return Object.values(MODES); },
  };
  G.modes = modes;
})();
