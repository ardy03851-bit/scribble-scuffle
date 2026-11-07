/* ============================================================
   Biomes — 38 data-driven definitions + scripting API.
   A biome is pure data + optional hooks:
     hooks: { onWorld(w), update(w,dt), drawSky(ctx,vb,w), drawBg, drawFg, drawGlow }
   ============================================================ */
window.G = window.G || {};
(function () {
  'use strict';
  const BIOMES = {};

  // helper to build a biome with defaults
  function B(id, name, o) {
    BIOMES[id] = Object.assign({
      id, name,
      sky: ['#f7edd6', '#f2e3c4', '#ecd9b0'],
      sun: { type: 'sun', color: '#f9d976' },
      haze: ['#d9c9a8', '#c9b795'],
      terrainTop: '#c9b28a', terrainMid: '#bd9f77', terrainDeep: '#a98f6b',
      grass: '#7fae62', grassDeep: '#5f8c4a',
      ink: '#3b2f26',
      foliage: ['#6f9e54', '#8aae5f', '#5c8a4a'],
      terrainStyle: 'solid', hillAmp: 10,
      water: null, // { level: 0..1 of map height, type: 'water'|'lava' }
      weather: 'clear',
      windBase: 20,
      darkness: 0,
      fog: 0,
      bgStyle: 'hills',
      accent: '#e4573d',
      props: { tree_oak: 3, bush: 2, rock: 2, flower: 3, fern: 2 },
      critters: 'birds',
    }, o);
  }

  // ---------------- meadows & woods ----------------
  B('meadowlark', 'Meadowlark Vale', {
    desc: 'Sunny hills, lazy bees, easy fighting.',
    props: { tree_oak: 3, bush: 3, flower: 5, fern: 2, rock: 1 },
  });
  B('dandelion', 'Dandelion Steppe', {
    desc: 'Wide windy plains where seeds never land.',
    terrainStyle: 'dunes', hillAmp: 6, windBase: 90, weather: 'petals',
    grass: '#a9bf6a', props: { flower: 6, bush: 2, rock: 1 },
    bgStyle: 'dunes',
  });
  B('bramble', 'Bramble Hollow', {
    desc: 'A thicket that grabs at your sleeves.',
    foliage: ['#4c7a3d', '#5f8a44'], hillAmp: 14, weather: 'mist',
    props: { tree_oak: 5, bush: 4, fern: 4, flower: 1 },
    sky: ['#e8e4cf', '#dcd4b8', '#cfc5a4'],
  });
  B('oldgrowth', 'Old Growth Timberline', {
    desc: 'Trees older than the paper they grow on.',
    foliage: ['#55743f', '#68894a'], hillAmp: 16, weather: 'fog',
    props: { tree_oak: 6, fern: 4, bush: 2, rock: 1 },
    haze: ['#b7b298', '#a39d82'],
  });
  B('birchbone', 'Birchbone Woods', {
    desc: 'Pale trunks, dark shadows, quiet.',
    sky: ['#f2f4ec', '#e6ead9', '#d8ddc6'],
    foliage: ['#9db86e', '#b3c67e'], terrainTop: '#cfc5a8', grass: '#9fb876',
    props: { tree_birch: 6, bush: 2, fern: 3, flower: 2 }, weather: 'mist',
  });
  B('autumn', 'Maple Rookery', {
    desc: 'Everything is exactly as orange as it looks.',
    foliage: ['#d08a3a', '#c26b2f', '#e0a94e'], grass: '#b8935a',
    weather: 'leaves', hillAmp: 12,
    props: { tree_maple: 5, bush: 3, fern: 2, rock: 1 },
    accent: '#d08a3a',
  });
  B('bamboo', 'Bamboo Sea', {
    desc: 'Green stalks that knock together in the wind.',
    foliage: ['#7fae5a', '#96bd6a'], grass: '#8fb964', windBase: 60,
    props: { tree_bamboo: 7, fern: 3, bush: 1 }, weather: 'clear',
    sky: ['#eef4dd', '#e3edd0', '#d5e3c2'],
  });
  B('sakura', 'Sakura Drift', {
    desc: 'Pink petals to the horizon and beyond.',
    foliage: ['#f2b8c9', '#e79fb6', '#f7cbd7'], grass: '#a8c58e',
    weather: 'petals', accent: '#e79fb6',
    props: { tree_sakura: 5, bush: 2, flower: 4 },
    sky: ['#fdeef2', '#f9e3ea', '#f3d5de'],
  });
  B('orchard', 'Honeyglow Orchard', {
    desc: 'Sweet air, warm light, hidden wasps.',
    foliage: ['#8fae4f', '#a5bf60'], weather: 'pollen',
    props: { tree_oak: 4, bush_berry: 3, flower: 4, fern: 1 },
    sun: { type: 'sun', color: '#ffd98a' },
  });

  // ---------------- water worlds ----------------
  B('sundrop', 'Sundrop Lagoon', {
    desc: 'Turquoise water and too much sunshine.',
    terrainStyle: 'ocean', water: { level: 0.62, type: 'water' },
    sky: ['#e8f6f2', '#d2eee4', '#bfe3d6'],
    props: { tree_palm: 4, bush: 2, rock: 2, flower: 1 },
    bgStyle: 'waves', grass: '#a8c58e',
  });
  B('coralshelf', 'Coralshelf Shallows', {
    desc: 'Shallow, warm, and very reflective.',
    terrainStyle: 'ocean', water: { level: 0.58, type: 'water' },
    sky: ['#e6f4fb', '#cfeaf5', '#b8def0'], accent: '#5fb8c9',
    props: { tree_palm: 3, rock: 3, bush: 1 },
    bgStyle: 'waves',
  });
  B('tidecall', 'Tidecall Cliffs', {
    desc: 'Waves that hit back. Bring a jacket.',
    terrainStyle: 'peaks', hillAmp: 20, water: { level: 0.8, type: 'water' },
    weather: 'storm', windBase: 70, bgStyle: 'mountains',
    sky: ['#9fb3bd', '#8ba1ad', '#7a8f9c'], grass: '#7d9a6a',
    props: { tree_pine: 2, rock: 4, bush: 1 },
  });
  B('marsh', 'Moonlit Marsh', {
    desc: 'Night frogs and misleading footing.',
    water: { level: 0.78, type: 'water' }, darkness: 0.55, weather: 'fog',
    terrainStyle: 'islands', grass: '#6a8a55',
    props: { tree_dead: 3, fern: 4, reeds: 3, mushroom: 2 },
    critters: 'fireflies',
  });
  B('typhoon', 'Typhoon Shoal', {
    desc: 'The storm picked this map on purpose.',
    water: { level: 0.66, type: 'water' }, weather: 'storm', windBase: 120,
    terrainStyle: 'islands', sky: ['#8fa5b5', '#7a90a3', '#6a7d91'],
    props: { tree_palm: 2, rock: 3 },
  });
  B('saltflats', 'Saltflats Mirror', {
    desc: 'So flat the water becomes a mirror.',
    terrainStyle: 'solid', hillAmp: 1, water: { level: 0.85, type: 'water' },
    sky: ['#f6eef4', '#ecdff0', '#e0cfe4'], grass: '#cfc4b2',
    props: { rock: 2, reeds: 2 }, weather: 'clear', accent: '#c9a3c4',
  });
  B('sunken', 'Sunken Archive', {
    desc: 'A flooded library. Mind the ink.',
    water: { level: 0.7, type: 'water' }, darkness: 0.3,
    terrainStyle: 'towers', sky: ['#d8d2c4', '#c8c0ae', '#b8ae9a'],
    props: { ruin_pillar: 3, bookshelf: 2, rock: 1 },
    ink: '#2c2430', accent: '#5b4a8a', weather: 'mist',
  });

  // ---------------- cold ----------------
  B('frostpine', 'Frostpine Shelf', {
    desc: 'Quiet snow, loud falls.',
    weather: 'snow', foliage: ['#4a7050', '#5d8258'], grass: '#d7e2e8',
    grassDeep: '#b8c8d2', terrainTop: '#c2ccd4', terrainDeep: '#9aa8b4',
    props: { tree_pine: 6, bush: 1, rock: 2 }, hillAmp: 12,
    sky: ['#e9f0f4', '#dbe5ec', '#c9d7e0'],
  });
  B('glaciermaw', 'Glaciermaw', {
    desc: 'Blue ice that creaks when you land.',
    weather: 'snow', terrainStyle: 'peaks', hillAmp: 18,
    sky: ['#e4eef4', '#d2e2ec', '#bfd4e2'],
    terrainTop: '#bcd4e0', terrainMid: '#a4c2d2', terrainDeep: '#8aa9bd',
    grass: '#cfe0ea', grassDeep: '#aec6d4', ice: true,
    props: { tree_pine: 2, rock: 3, ice_spire: 3 }, accent: '#6fb3d9',
  });
  B('aurora', 'Aurora Tundra', {
    desc: 'The sky moves. Try not to look up mid-fight.',
    weather: 'aurora', night: true, darkness: 0.6, weather: 'glitterfrost',
    sky: ['#1c2333', '#232c44', '#2c3752'],
    sun: { type: 'moon', color: '#dfe8f2' }, grass: '#8fa5a0',
    props: { tree_pine: 3, rock: 3, ice_spire: 2 }, accent: '#7de8c3',
    critters: 'fireflies',
  });
  B('blizzardpass', 'Blizzard Pass', {
    desc: 'You will lose a bot in this. Accept it.',
    weather: 'blizzard', windBase: 130, hillAmp: 20, terrainStyle: 'peaks',
    sky: ['#dfe6ea', '#cfd9df', '#bfcac2'], grass: '#c8d4da',
    props: { tree_pine: 3, rock: 3 }, accent: '#8fb3c9',
  });

  // ---------------- hot ----------------
  B('emberfall', 'Emberfall Ridge', {
    desc: 'The floor is literally lava. Classic.',
    water: { level: 0.82, type: 'lava' }, weather: 'embers',
    terrainStyle: 'islands', terrainTop: '#5a4038', terrainMid: '#4a322c', terrainDeep: '#3a2622',
    grass: '#7a5a4a', grassDeep: '#5f4438', ink: '#241a16',
    sky: ['#f4d7b0', '#eab98a', '#dc9668'], foliage: ['#8a6a4a', '#a07a50'],
    props: { rock: 4, tree_dead: 2, rock_volcanic: 3 }, accent: '#e8632c',
    haze: ['#d9a678', '#c48d63'],
  });
  B('cinder', 'Cinder Crater', {
    desc: 'Everything burned. The fight did not.',
    weather: 'ash', terrainTop: '#6a5a52', terrainMid: '#574840', terrainDeep: '#453832',
    grass: '#8a7565', grassDeep: '#6d5a4c', ink: '#221c18',
    sky: ['#d9cec2', '#c5b7a8', '#b0a091'],
    props: { tree_dead: 4, rock_volcanic: 4, rock: 2 }, accent: '#c96a3d',
  });
  B('duneveil', 'Duneveil Desert', {
    desc: 'Sand in everything, especially the weapons.',
    terrainStyle: 'dunes', hillAmp: 3, weather: 'dust', windBase: 60,
    terrainTop: '#e3c99a', terrainMid: '#d5b784', terrainDeep: '#c2a06c',
    grass: '#c9b183', grassDeep: '#b09a70', sky: ['#f6ecd4', '#f0dfb8', '#e8d0a0'],
    props: { cactus: 4, rock: 2, bush: 1 }, bgStyle: 'dunes', accent: '#d98a4a',
  });
  B('badlands', 'Cactus Badlands', {
    desc: 'Red rock, sharp plants, no mercy.',
    terrainStyle: 'canyon', hillAmp: 16, weather: 'clear',
    terrainTop: '#c98d66', terrainMid: '#b5765a', terrainDeep: '#9c5f4c',
    grass: '#b5875f', grassDeep: '#98704e', sky: ['#f4e3cd', '#eed5b5', '#e5c69c'],
    props: { cactus: 5, rock: 3, bush: 1 }, accent: '#b5502f',
  });
  B('mesa', 'Mesa Sundown', {
    desc: 'Golden hour forever, plateaus forever.',
    terrainStyle: 'plateaus', sun: { type: 'sun', color: '#ffb36b', low: true },
    sky: ['#f9dfb8', '#f2c48e', '#e8a372'],
    terrainTop: '#cf9a70', terrainMid: '#bd8258', terrainDeep: '#a46a4c',
    props: { cactus: 3, rock: 3, bush: 1 }, accent: '#e07a3f', hillAmp: 8,
  });
  B('crayon', 'Crayon Canyon', {
    desc: 'Strata in every colour the box had.',
    terrainStyle: 'canyon', hillAmp: 18,
    sky: ['#fdf3dd', '#f9e8c2', '#f2d9a8'],
    terrainTop: '#e89a6a', terrainMid: '#d97b8a', terrainDeep: '#b56bb0',
    grass: '#e0a86a', grassDeep: '#c98f5a', accent: '#d97b8a',
    props: { rock: 4, cactus: 2, bush: 1 },
  });

  // ---------------- strange ----------------
  B('mushroom', 'Mushroom Gloom', {
    desc: 'The spores are probably fine.',
    darkness: 0.45, weather: 'spores',
    sky: ['#3a3342', '#453c4e', '#524658'], sun: { type: 'moon', color: '#c9b8e0' },
    terrainTop: '#6a5a6e', terrainMid: '#574a5c', terrainDeep: '#453a4a',
    grass: '#8a6a8e', grassDeep: '#6d5273', ink: '#241f2a',
    props: { mushroom_giant: 5, fern: 3, mushroom: 3 }, accent: '#b57edc',
    critters: 'fireflies', foliage: ['#b57edc', '#8ac9c0'],
  });
  B('glowfern', 'Glowfern Cavern', {
    desc: 'No sky. Only glow.',
    darkness: 0.7, terrainStyle: 'caves',
    sky: ['#252030', '#2c2638', '#332c40'],
    terrainTop: '#57485e', terrainMid: '#483c4e', terrainDeep: '#3a303e',
    grass: '#7de8c3', grassDeep: '#58b898', ink: '#1c1822',
    props: { rock_crystal: 4, fern: 4, mushroom: 2 }, accent: '#7de8c3',
    critters: 'fireflies', weather: 'spores',
  });
  B('inkwell', 'Inkwell Abyss', {
    desc: 'White lines on black paper. Mind the edge.',
    darkness: 0.8, night: true,
    sky: ['#141218', '#191620', '#201c28'],
    terrainTop: '#3a3640', terrainMid: '#302c38', terrainDeep: '#262230',
    grass: '#8a8694', grassDeep: '#6a6675', ink: '#0d0b10',
    props: { rock: 3, tree_dead: 3, rock_crystal: 2 }, accent: '#e8e4f2',
    weather: 'starfall', critters: 'bats', bgStyle: 'spires',
  });
  B('starling', 'Starling Night', {
    desc: 'A meadow, but at 3am.',
    night: true, darkness: 0.5, weather: 'fireflies',
    sky: ['#1e2438', '#27304a', '#323d5c'], sun: { type: 'moon', color: '#e8ecf2' },
    grass: '#5d7a58', grassDeep: '#48604a', props: { tree_oak: 3, bush: 2, flower: 2, fern: 2 },
    accent: '#9db8e8', critters: 'fireflies',
  });
  B('cloudbreak', 'Cloudbreak Isles', {
    desc: 'Islands that forgot which way down is.',
    terrainStyle: 'float', sky: ['#eaf4fb', '#d8ecf7', '#c6e2f2'],
    props: { tree_oak: 2, bush: 2, flower: 3, rock: 2 }, hillAmp: 8,
    accent: '#5bb8e8', grass: '#8fc98e', weather: 'clear', bgStyle: 'clouds',
  });
  B('skyloft', 'Skyloft Spires', {
    desc: 'Tall rocks, thin air, thinner ledges.',
    terrainStyle: 'towers', sky: ['#f0eaf4', '#e2d8ec', '#d2c4e0'],
    terrainTop: '#c9b8d2', terrainMid: '#b5a2c0', terrainDeep: '#9c88aa',
    grass: '#b5a0c4', grassDeep: '#9682a6', props: { tree_birch: 2, rock: 4, bush: 1 },
    accent: '#8a6fc2', hillAmp: 6,
  });
  B('ruinmoor', 'Ruinmoor', {
    desc: 'Someone built here first. They lost too.',
    weather: 'fog', hillAmp: 10,
    sky: ['#d9d4c6', '#c9c2b0', '#b8b09c'],
    terrainTop: '#b5a890', terrainMid: '#a39478', terrainDeep: '#8d7f66',
    props: { ruin_pillar: 5, rock: 3, fern: 2, tree_dead: 2 }, accent: '#9c8a6a',
  });
  B('scrapyard', 'Clockwork Scrapyard', {
    desc: 'The bots were built somewhere. Maybe here.',
    terrainStyle: 'towers', weather: 'dust',
    sky: ['#d9dce0', '#c8ccd2', '#b8bcc4'],
    terrainTop: '#a8a2a0', terrainMid: '#948e8c', terrainDeep: '#7d7876',
    grass: '#8a8a84', grassDeep: '#6e6e68', ink: '#26242a',
    props: { crate_metal: 4, rock: 2, tree_dead: 2, gear: 3 }, accent: '#c9803a',
  });
  B('lantern', 'Lantern Bazaar', {
    desc: 'Night market rules: fight nicely, buy snacks.',
    night: true, darkness: 0.45, weather: 'confettisky',
    sky: ['#2a2035', '#362a44', '#443454'],
    terrainTop: '#7a6a58', terrainMid: '#685a4c', terrainDeep: '#544a40',
    props: { lamp_post: 4, crate_metal: 2, bush: 1, flower: 2 }, accent: '#ffb36b',
    critters: 'fireflies',
  });
  B('papercut', 'Papercut Peaks', {
    desc: 'Folded paper mountains. Genuinely sharp.',
    terrainStyle: 'peaks', hillAmp: 24,
    sky: ['#fdf6e8', '#f9edd2', '#f2e2be'],
    terrainTop: '#f2e6cc', terrainMid: '#e8d6b2', terrainDeep: '#d9c298',
    grass: '#e8ddc0', grassDeep: '#cfc0a0', props: { rock: 4, tree_pine: 1 },
    accent: '#e4573d', bgStyle: 'spires',
  });
  B('thunderhead', 'Thunderhead Plateau', {
    desc: 'Flat on top. Extremely not flat below.',
    terrainStyle: 'plateaus', weather: 'storm', windBase: 80,
    sky: ['#8a94a5', '#7a8598', '#6a768a'],
    terrainTop: '#8a8a78', terrainMid: '#767666', terrainDeep: '#606052',
    grass: '#7d8a6a', props: { tree_pine: 2, rock: 4 }, accent: '#e8c84a',
  });
  B('voidpages', 'The Void Between Pages', {
    desc: 'Where unfinished fighters go.',
    night: true, darkness: 0.75, weather: 'starfall',
    sky: ['#100e18', '#151220', '#1b1728'],
    terrainTop: '#423a4e', terrainMid: '#363040', terrainDeep: '#2a2532',
    grass: '#6a5f7a', grassDeep: '#524a5e', ink: '#0a0810',
    props: { rock_crystal: 3, tree_dead: 3, gear: 2 }, accent: '#c78fda',
    critters: 'bats', terrainStyle: 'float', bgStyle: 'spires',
  });
  B('honeycomb', 'Honeycomb Hollow', {
    desc: 'The walls are sticky. The bees are huge.',
    weather: 'pollen', hillAmp: 8,
    sky: ['#f9eecb', '#f4e3ae', '#edd590'],
    terrainTop: '#d9b878', terrainMid: '#c9a462', terrainDeep: '#b08d4e',
    grass: '#d9c06a', grassDeep: '#b89e52', props: { tree_oak: 2, flower: 5, bush_berry: 2 },
    accent: '#e8a02c',
  });

  // ---------------- api ----------------
  const biomeSys = {
    all: BIOMES,
    get(id) { return BIOMES[id] || BIOMES.meadowlark; },
    random() { return G.M.pick(Object.values(BIOMES)); },
    ids() { return Object.keys(BIOMES); },
    register(id, name, o) { B(id, name, o); return BIOMES[id]; },
  };
  G.biomes = biomeSys;
})();
