/* ============================================================
   Rules: shared settings panel, persisted locally.
   NO ARTIFICIAL CAPS — numeric fields accept any value.
   ============================================================ */
window.G = window.G || {};
(function () {
  'use strict';

  const SCHEMA = [
    { key: 'mode', label: 'Mode', type: 'select', options: [['classic', 'Classic Arena'], ['wilds', 'The Big Wilds'], ['war', 'War'], ['ring', 'King of the Ring']], default: 'classic' },
    { key: 'bots', label: 'Bots', type: 'number', default: 5, min: 0, max: 100000, step: 1, hint: 'Any number. 500 bots works — quality will adapt.' },
    { key: 'teams', label: 'Teams', type: 'select', options: [['1', 'Free-for-all'], ['2', '2 teams'], ['3', '3 teams'], ['4', '4 teams']], default: '1' },
    { key: 'health', label: 'Health', type: 'number', default: 100, min: 1, max: 1000000, step: 10 },
    { key: 'roundTime', label: 'Round time (s)', type: 'number', default: 120, min: 10, max: 100000, step: 10 },
    { key: 'targetScore', label: 'Rounds to win', type: 'number', default: 3, min: 1, max: 100000, step: 1 },
    { key: 'suddenDeath', label: 'Sudden death', type: 'bool', default: true },
    { key: 'friendlyFire', label: 'Friendly fire', type: 'bool', default: true },
    { key: 'startWeapon', label: 'Starting weapon', type: 'select', options: [['random', 'Random each round'], ['same', 'Same for all'], ['none', 'None until drops']], default: 'random' },
    { key: 'botSkill', label: 'Bot skill', type: 'range', default: 2, min: 1, max: 5, step: 1 },
    { key: 'supplyRate', label: 'Supply drops (s apart, 0=off)', type: 'number', default: 30, min: 0, max: 100000, step: 5 },
    { key: 'weather', label: 'Weather', type: 'weather', default: 'auto' },
    { key: 'stormWall', label: 'Storm wall (big maps)', type: 'bool', default: false },
    { key: 'tickets', label: 'War tickets', type: 'number', default: 10, min: 1, max: 100000, step: 1 },
    { key: 'buildPhase', label: 'Build phase (s)', type: 'number', default: 30, min: 0, max: 100000, step: 5 },
    { key: 'mapScale', label: 'Map scale (big modes)', type: 'number', default: 1, min: 0.5, max: 100, step: 0.5 },
    { key: 'terrainStyle', label: 'Terrain style', type: 'select', options: [['auto', 'Auto (biome)'], ['solid', 'Solid ground'], ['islands', 'Islands'], ['float', 'Floating islands'], ['plateaus', 'Plateaus'], ['peaks', 'Peaks'], ['ocean', 'Ocean'], ['towers', 'Towers'], ['dunes', 'Dunes'], ['caves', 'Caves'], ['bridges', 'Bridges'], ['canyon', 'Canyon']], default: 'auto' },
    { key: 'biome', label: 'Biome', type: 'biome', default: 'auto' },
    { key: 'matRate', label: 'Materials per second', type: 'number', default: 2, min: 0, max: 100000, step: 1 },
    { key: 'startMats', label: 'Starting materials', type: 'number', default: 40, min: 0, max: 100000, step: 5 },
    { key: 'regenMaps', label: 'New map each round', type: 'bool', default: true },
    { key: 'showNames', label: 'Show names', type: 'bool', default: true },
  ];

  const DEFAULTS = {};
  for (const s of SCHEMA) DEFAULTS[s.key] = s.default;

  const rules = {
    SCHEMA, DEFAULTS,
    data: null,
    load() {
      try {
        const raw = localStorage.getItem('ss_rules');
        this.data = Object.assign({}, DEFAULTS, raw ? JSON.parse(raw) : {});
      } catch (e) { this.data = Object.assign({}, DEFAULTS); }
      // numbers that must be numbers
      for (const s of SCHEMA) {
        if (s.type === 'number' || s.type === 'range') {
          this.data[s.key] = Number(this.data[s.key]);
          if (!isFinite(this.data[s.key])) this.data[s.key] = s.default;
        }
      }
      if (this.data.teams) this.data.teams = parseInt(this.data.teams, 10) || 1;
      return this.data;
    },
    save() {
      try { localStorage.setItem('ss_rules', JSON.stringify(this.data)); } catch (e) {}
    },
    get(key) { return this.data ? this.data[key] : DEFAULTS[key]; },
    set(key, v) { if (this.data) { this.data[key] = v; this.save(); } },
  };

  G.rules = rules;
})();
