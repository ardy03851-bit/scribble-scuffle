/* ============================================================
   Audio: 100% synthesized WebAudio. Positional panning,
   distance falloff, underwater muffling, layered variation.
   Zero audio files.
   ============================================================ */
window.G = window.G || {};
(function () {
  'use strict';
  const M = G.M;
  let ctx = null, master = null, noiseBuf = null, muffle = null;
  let ambientNodes = null;
  const S = {
    enabled: true, volume: 0.7,
    init() {
      if (ctx) return;
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        muffle = ctx.createBiquadFilter();
        muffle.type = 'lowpass';
        muffle.frequency.value = 20000;
        master = ctx.createGain();
        master.gain.value = this.volume;
        muffle.connect(master);
        master.connect(ctx.destination);
        // noise buffer (2s)
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) { console.info('Audio unavailable — running silent.'); this.enabled = false; }
    },
    resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); },
    setVolume(v) { this.volume = v; if (master) master.gain.value = v; },
    setUnderwater(u) {
      if (!muffle) return;
      muffle.frequency.setTargetAtTime(u ? 600 : 20000, ctx.currentTime, 0.1);
    },
    // positional gain+pan from world coords
    _pos(opts) {
      let gain = 1, pan = 0;
      const cam = G.renderer.camera;
      const d = opts.x !== undefined ? M.dist(opts.x, opts.y || 0, cam.x, cam.y) : 0;
      gain = M.clamp(1 - d / 1400, 0.02, 1);
      pan = M.clamp((opts.x - cam.x) / 700, -1, 1);
      if (opts.vol !== undefined) gain *= opts.vol;
      return { gain, pan };
    },
    _out(opts) {
      const { gain, pan } = this._pos(opts || {});
      const g = ctx.createGain();
      g.gain.value = gain;
      let node = g;
      if (ctx.createStereoPanner) {
        const p = ctx.createStereoPanner();
        p.pan.value = pan;
        g.connect(p); node = p;
      }
      node.connect(muffle);
      return g;
    },
    noise(dur, filterFreq, filterType, out, gainEnv, opts = {}) {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = filterType || 'lowpass';
      f.frequency.value = filterFreq;
      const g = ctx.createGain();
      const t = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(gainEnv, t + (opts.attack || 0.004));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(out);
      src.start(t, Math.random() * 1.5);
      src.stop(t + dur + 0.05);
      if (opts.pitch) { src.playbackRate.value = opts.pitch; }
      return { src, f, g };
    },
    tone(freq, dur, type, out, gainEnv, slideTo, opts = {}) {
      const o = ctx.createOscillator();
      o.type = type || 'sine';
      const t = ctx.currentTime;
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(gainEnv, t + (opts.attack || 0.005));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t + dur + 0.05);
      return o;
    },

    // ---------- sound bank ----------
    play(name, opts = {}) {
      if (!this.enabled) return;
      this.init();
      if (!ctx) return;
      if (ctx.state === 'suspended') return;
      const out = this._out(opts);
      const v = 0.5 + Math.random() * 0.3; // layered variation
      switch (name) {
        case 'shoot':
          this.noise(0.09, 1800 + Math.random() * 800, 'bandpass', out, 0.25 * v, { pitch: 0.9 + Math.random() * 0.3 });
          this.tone(160 + Math.random() * 60, 0.07, 'square', out, 0.12 * v, 60);
          break;
        case 'beam':
          this.tone(880 + Math.random() * 220, 0.1, 'sawtooth', out, 0.06 * v, 1400);
          break;
        case 'zap':
          this.tone(2000, 0.12, 'sawtooth', out, 0.1 * v, 200);
          this.noise(0.1, 4000, 'highpass', out, 0.1 * v);
          break;
        case 'buzz':
          this.tone(220 + Math.random() * 80, 0.15, 'sawtooth', out, 0.06 * v, 300);
          break;
        case 'melee':
          this.noise(0.08, 900, 'bandpass', out, 0.2 * v, { pitch: 1.2 });
          this.tone(300, 0.06, 'triangle', out, 0.08 * v, 120);
          break;
        case 'throw':
          this.noise(0.15, 600, 'bandpass', out, 0.1 * v, { pitch: 1.5 });
          break;
        case 'hit':
          this.tone(200 + Math.random() * 80, 0.08, 'square', out, 0.14 * v, 90);
          this.noise(0.06, 2500, 'highpass', out, 0.12 * v);
          break;
        case 'explosion':
          this.noise(0.7, 400, 'lowpass', out, 0.5 * v, { attack: 0.01 });
          this.tone(70, 0.5, 'sine', out, 0.3 * v, 28);
          this.noise(0.25, 3000, 'highpass', out, 0.15 * v);
          break;
        case 'thunder':
          this.noise(1.6, 220, 'lowpass', out, 0.5, { attack: 0.02 });
          this.tone(50, 1.4, 'sine', out, 0.25, 24);
          break;
        case 'woodchop':
          this.tone(180, 0.1, 'triangle', out, 0.2 * v, 70);
          this.noise(0.1, 800, 'bandpass', out, 0.2 * v);
          break;
        case 'shatter':
          for (let i = 0; i < 4; i++) this.tone(1400 + Math.random() * 1800, 0.06, 'triangle', out, 0.06 * v, 900);
          this.noise(0.2, 3500, 'highpass', out, 0.15 * v);
          break;
        case 'death':
          this.tone(300, 0.35, 'sawtooth', out, 0.12 * v, 60);
          this.tone(150, 0.4, 'triangle', out, 0.1 * v, 40);
          break;
        case 'jump':
          this.tone(280, 0.12, 'square', out, 0.06 * v, 520);
          break;
        case 'jump2':
          this.tone(420, 0.14, 'square', out, 0.06 * v, 760);
          break;
        case 'land':
          this.noise(0.07, 500, 'lowpass', out, 0.12 * v);
          break;
        case 'step':
          this.noise(0.04, 900 + Math.random() * 400, 'bandpass', out, 0.05 * v);
          break;
        case 'reload':
          this.tone(500, 0.05, 'square', out, 0.05 * v);
          setTimeout(() => { if (ctx) this.tone(700, 0.05, 'square', out, 0.05 * v); }, 120);
          break;
        case 'place':
          this.tone(320, 0.08, 'triangle', out, 0.1 * v, 480);
          this.noise(0.06, 1200, 'bandpass', out, 0.08 * v);
          break;
        case 'dig':
          this.noise(0.12, 700, 'bandpass', out, 0.15 * v);
          break;
        case 'boing':
          this.tone(200, 0.25, 'sine', out, 0.16 * v, 600);
          break;
        case 'bounce':
          this.tone(400, 0.06, 'square', out, 0.05 * v, 250);
          break;
        case 'clank':
          this.tone(900, 0.08, 'square', out, 0.08 * v, 400);
          this.noise(0.05, 3000, 'highpass', out, 0.08 * v);
          break;
        case 'splash':
          this.noise(0.3, 900, 'bandpass', out, 0.18 * v, { attack: 0.01 });
          this.tone(300, 0.2, 'sine', out, 0.05 * v, 150);
          break;
        case 'ui':
          this.tone(600 + Math.random() * 200, 0.05, 'triangle', out, 0.08);
          break;
        case 'uibig':
          this.tone(400, 0.08, 'triangle', out, 0.1);
          setTimeout(() => { if (ctx) this.tone(600, 0.1, 'triangle', out, 0.1); }, 70);
          break;
        case 'roundstart':
          [392, 523, 659].forEach((f, i) => setTimeout(() => { if (ctx) this.tone(f, 0.18, 'triangle', out, 0.12); }, i * 110));
          break;
        case 'victory':
          [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => { if (ctx) { this.tone(f, 0.25, 'triangle', out, 0.14); this.tone(f / 2, 0.25, 'sine', out, 0.08); } }, i * 130));
          break;
        case 'mythic':
          [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => { if (ctx) this.tone(f, 0.3, 'sawtooth', out, 0.08); }, i * 90));
          break;
        default:
          this.tone(440, 0.06, 'sine', out, 0.05);
      }
    },

    // ---------- ambient (weather) ----------
    setAmbient(kind) {
      if (!this.enabled) return;
      this.init();
      if (!ctx) return;
      if (ambientNodes) {
        try { ambientNodes.src.stop(); } catch (e) {}
        try { ambientNodes.gain.disconnect(); } catch (e) {}
        ambientNodes = null;
      }
      if (!kind || kind === 'clear') return;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf; src.loop = true;
      const f = ctx.createBiquadFilter();
      const g = ctx.createGain();
      g.gain.value = 0;
      if (kind === 'rain') { f.type = 'bandpass'; f.frequency.value = 2400; g.gain.setTargetAtTime(0.14, ctx.currentTime, 1); }
      else if (kind === 'wind') { f.type = 'lowpass'; f.frequency.value = 500; g.gain.setTargetAtTime(0.2, ctx.currentTime, 1); }
      src.connect(f); f.connect(g); g.connect(muffle);
      src.start(0, Math.random());
      ambientNodes = { src, g };
    },
  };
  G.audio = S;
})();
