# Scribble Scuffle

A round-based 2D party brawler that runs entirely in your browser — hand-drawn ink-on-paper look, 60 weapons, 38 biomes, 24 weather types, destructible terrain, building, and bots with names and grudges. 100% offline-capable (installable PWA), zero dependencies, zero build step.

**Play:** open `index.html` in any modern browser, or serve the folder statically (e.g. `npx serve .`) for service-worker + install support.

---

## Gameplay in one paragraph

Matches are made of rounds. Every round, each fighter is dealt a random weapon from a weighted rarity pool (common → mythic; mythics get a special reveal card and an audio sting). Kill everyone else (or hold the golden ring, or drain the enemy team's tickets) to take the round. Rounds have a time limit — when it expires, sudden death drains everyone's HP. Falling off the bottom of the map is instantly lethal. First to the target score wins the match and gets a 3D paper-trophy victory scene.

## Modes

| Mode | What it is |
|---|---|
| Classic Arena | Compact map, last ink standing wins the round |
| The Big Wilds | Huge maps, follow camera, minimap, supply drops, any bot count |
| War | 2–4 teams, build phase, shared tickets, fortify then fight |
| King of the Ring | A roaming golden ring — hold it alone to score; fallen fighters respawn |

FFA or teams, friendly-fire toggle, live rules editing from the pause menu (add/remove bots, change health, time, target score, materials — **every number field accepts anything you type; there are no artificial caps**).

## Controls

- **Move** A/D or arrows, **jump** W / Space, **aim/fire** mouse, **weapon swap** Q or 1, **build mode** B, **rotate piece** R, **scoreboard** Tab (hold), **pause** Esc/P, **debug panel** D (three times quickly)
- **Touch:** left virtual stick, right-side Jump/Fire/Build buttons, build bar at the bottom — iPad-first layout, wake lock keeps the screen on
- Off-screen enemies get colored edge arrows (Wilds), the minimap shows the viewport rect

---

## Architecture

No build step, no framework. Plain ES modules-in-scope scripts loaded in dependency order by `index.html` (order mirrored in `js/load-order.json` for the test harness). Everything hangs off a single global `G`.

```
index.html          app shell, loads scripts in order, canvas + HUD DOM
sw.js               service worker: cache-first app shell (bump CACHE version to invalidate)
manifest.webmanifest + icons/   PWA install support (incl. apple-touch-icon, maskables)
css/style.css       handcrafted UI: wobbly borders, hard offset shadows, no gradients
fonts/              Patrick Hand (the only asset file; everything else is drawn in code)

js/engine/          engine layer
  core.js           math (M), RNG, LRU sprite cache, frame loop, game loop state, boil phase
  events.js         tiny pub/sub
  renderer.js       layered renderer, DPR-aware canvas, view culling helpers, quality tiers
  pool.js           object pooling
  noise.js          value noise for terrain generation

js/world/           world layer
  terrain.js        grid-based destructible terrain, dirty-rect patching, surfaceY queries
  water.js          water/lava with reflection
  weather.js        24 weather types (rain, snow, storm, fireflies, ash, aurora...)
  biomes.js         38 biomes (data + optional hooks) and the biome scripting API
  props.js          code-drawn, cached prop sprites with spring-damper sway
  grass.js          instanced grass with wind

js/game/            game layer
  physics.js        AABB vs terrain grid, swept movement
  cloth.js          verlet cloth (capes, scarves, banners)
  character.js      composable code-drawn fighters (not sprites) + wardrobe layers
  wardrobe.js       110-item cosmetic catalogue
  weapons.js        60 data-driven weapon definitions + weighted rarity rolling
  weaponArt.js      procedural weapon sprite drawing (LRU-cached canvases)
  building.js       27 build pieces, support graph, placement UX, materials
  bots.js           named bots: skill levels, LOS, target leading, strafing, stuck recovery, LOD thinking
  vfx.js            particles, confetti, muzzle flashes, shockwaves (canvas compositing)
  projectiles.js    bullets, rockets, grenades, melee arcs, clusters
  audio.js          fully synthesized audio — zero audio files (WebAudio oscillators/noise)
  match.js          World (simulation) + Match (round state machine), fixed 60Hz timestep decoupled from rendering with interpolation
  modes.js          mode definitions: data + hooks (setup, setupRound, update, checkRoundEnd)
  rules.js          match rules + persistence (localStorage)
  hud.js            score chips, weapon card, HP, kill feed, banners, reveal cards, minimap, off-screen arrows, scoreboard, touch controls
  victory3d.js      3D trophy scene (canvas 3D projection)
  menu.js           main menu with animated paper background
  wardrobeScreen.js  outfit picker with live preview
  debug.js          hidden debug panel + testing hooks (see below)
  main.js           state machine, input (keyboard/mouse/touch), boot
```

### Performance discipline

- Fixed-timestep simulation (60 Hz) decoupled from rendering, with interpolation
- Object pooling, LRU sprite caching that actually frees canvases, view culling, dirty-rectangle patching for terrain edits, LOD bot thinking
- Adaptive quality tiers with hysteresis (auto / high / medium / low) — FPS readout in the HUD corner; setting persists in localStorage

### Testing hooks

- **Text-render mode:** press `D` three times quickly to open the debug panel (FPS, entity counts, quality tier, time advance)
- **Time advance:** `G.debug.advance(seconds)` steps the simulation headlessly — used by the test suite
- **State dump:** `G.debug.state()` returns a JSON snapshot of the world

## Tests

```bash
cd test && npm install   # jsdom + vm harness
cd .. && node test/smoke.js    # boots all 4 modes, runs 900 steps each, content counts
node test/rounds.js            # round flow: kills, round advance, victory, sudden death,
                               # 40-bot wilds stress (NaN check), building, outfits, LRU, pause
```

---

## Modding APIs

All content is plain data + optional hooks, registered at load time. Add a new `<script>` tag after the relevant module (or edit in place) — that's the whole extension mechanism.

### Add a weapon

```js
G.weapons.register({          // or just add a def({...}) inside weapons.js
  id: 'boomquill', name: 'Boom Quill', tier: 'epic', type: 'thrown',
  damage: 30, rof: 1, speed: 500, gravity: 400, fuse: 1.2, explode: { r: 90, dmg: 40 },
  mag: 3, reload: 1.6, sound: 'throw', spinup: 0, charge: 0,
  art: { arch: 'blade', c1: '#e88a3c' },   // procedural sprite recipe
  desc: 'It comes back. Mostly.',
});
```

Weapon fields cover ballistics (speed, gravity, drag, bounces, fuse, homing, pierce, cluster), feel (rof, burst, burstDelay, recoil, knockback, lifesteal, status effects), and presentation (sound, sprite size, displayScale). Rarity weights live in the `TIERS` table (mythic is deliberately rare: weight 2). The animated reveal card, HUD weapon card, and kill-feed flavor text all come free from the definition.

### Add a biome

```js
G.biomes.register('crayon', 'Crayon Canyon', {
  sky: ['#f9e8c8', '#f2d9a8'], grass: '#d98a5a',
  terrainTop: '#e0a870', hillAmp: 26, terrainStyle: 'solid',
  water: { level: 0.8, type: 'lava' }, weather: 'ashfall', windBase: 60,
  props: { tree_dead: 4, rock: 3, cactus: 2 }, critters: 'bats',
  hooks: {
    update(w, dt) { /* per-frame world effects */ },
    drawSky(ctx, vb, w) { /* custom sky layer */ },
  },
});
```

Hooks: `onWorld(w)`, `update(w, dt)`, `drawSky / drawBg / drawFg / drawGlow(ctx, vb, w)`.

### Add weather

```js
G.weather.register('inkdrizzle', 'Ink Drizzle', {
  intensity: 0.5, particles: 'inkdrops', wind: 0.3, darken: 0.15, sound: 'rain',
});
```

### Add a build piece

```js
G.build.register({
  id: 'spike', name: 'Spike Trap', cost: 30, w: 2, h: 2, hp: 80,
  snap: true, color: '#8a7f6a', damage: 12,  // rotated box stamped into the collision grid
});
```

Pieces are real rotated boxes in the support graph — unsupported pieces crumble. Placement has ghost validity feedback (red when blocked/unsupported), rotation with R, and a touch-friendly build bar.

### Add a wardrobe item

```js
G.wardrobe.register('tophat', 'Fancy Top Hat', 'head', (g, f, t) => { /* draw with canvas ctx g */ }, { z: 5 });
```

Items draw in code (layered on the composable character rig) and can attach verlet cloth (capes/scarves) via the cloth system.

### Add a bot personality

Bot names and skill presets live in `js/game/bots.js`. Bots already do line-of-sight checks, target leading, strafing, and stuck recovery; skill scales aim error, reaction time, and build smartness.

---

## AI image pipeline (for weapon sprites)

In-game weapon art is drawn procedurally from `art` recipes (see `weaponArt.js`) — no image files needed. To generate richer sprites with an image model and use them instead:

1. **Prompt template:**
   > hand-drawn ink illustration of a [WEAPON NAME], bold dark ink outline, slightly misregistered flat fill, cream paper background removed, sketchbook style, side view, clean silhouette, no text
2. Generate at 1024×1024, remove the background, downscale to 480×192, save as `icons/weapons/[id].png`
3. Register the sprite path in the weapon definition: `art: { sprite: 'icons/weapons/boomquill.png', arch: 'blade' }` — `weaponArt.js` prefers `art.sprite` when present and falls back to the procedural drawing (which is what ships by default)
4. Add the file to the `SHELL` list in `sw.js` so it works offline

The procedural fallback is not a compromise tier — it's the shipping art style. The pipeline above is for modders who want photorealistic-ish hand-drawn replacements.

## Deployment

Static hosting only. This repository is served by GitHub Pages from the root of `main`:

- `index.html` at the repository root, no build step, no server code
- To self-host: copy the folder anywhere static (S3, nginx, a USB stick — it works from `file://` too, just without the service worker)

## Browser support

Chrome/Edge/Firefox/Safari, desktop and touch. Audio is synthesized (WebAudio), graphics are canvas 2D + compositing — no WebGL required (the victory scene is a hand-rolled 3D projection). If audio is unavailable the game runs silent, no errors.
