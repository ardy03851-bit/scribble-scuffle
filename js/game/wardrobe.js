/* ============================================================
   Wardrobe: 100+ code-drawn clothing items across slots.
   Items are drawn in the character's local space with metrics
   {bodyY, headY, ink, facing, bob}. Colour-customisable via
   outfit.itemColors.
   ============================================================ */
window.G = window.G || {};
(function () {
  'use strict';
  const M = G.M;

  const ITEMS = {};
  const SLOT_ORDER = ['head', 'face', 'torsoWear', 'outer', 'legs', 'feet', 'back', 'held'];
  const SLOT_NAMES = { head: 'Head', face: 'Face', torsoWear: 'Torso', outer: 'Outer', legs: 'Legs', feet: 'Feet', back: 'Back', held: 'Held' };

  function def(id, name, slot, draw, opts = {}) {
    // draw functions read the character via c.ch; attach it here
    ITEMS[id] = Object.assign({ id, name, slot, draw: (c, ch, m) => { c.ch = ch; draw(c, ch, m); } }, opts);
  }

  // palette for variants
  const PAL = {
    red: '#c94a4a', blue: '#4a6ac9', green: '#4aa96a', yellow: '#e8b93c', purple: '#8a5ac9',
    orange: '#e88a3c', pink: '#e88ab4', teal: '#4ac9b8', brown: '#8a6a4a', black: '#3a3630',
    white: '#f2ead8', cream: '#e8dcc0', mint: '#a8d8c0', lavender: '#c4b0e8', navy: '#3a4a7a',
    crimson: '#a03024', sage: '#9ab88a', rust: '#b5623a', sky: '#7ab8e8', gold: '#d4a832',
  };

  // ---------------- HEAD ----------------
  // cap in N colours
  for (const [cn, cv] of Object.entries(PAL)) {
    def('cap_' + cn, cn[0].toUpperCase() + cn.slice(1) + ' Cap', 'head', (c, m) => {
      c.save(); c.translate(0, m.headY - 6);
      c.beginPath();
      c.arc(0, 0, c.ch.headR + 1, Math.PI, 0);
      c.lineTo(c.ch.headR + 2, 1);
      c.quadraticCurveTo(c.ch.facing * (c.ch.headR + 7), 3, c.ch.facing * (c.ch.headR + 3), 4);
      c.lineTo(-c.ch.headR - 1, 4);
      c.closePath();
      c.fillStyle = cv; c.fill();
      c.strokeStyle = m.ink; c.lineWidth = 2; c.stroke();
      c.restore();
    });
  }
  def('tophat', 'Tall Top Hat', 'head', (c, m) => {
    c.save(); c.translate(0, m.headY - 7);
    c.fillStyle = '#3a3630';
    c.fillRect(-7, -12, 14, 12);
    c.fillRect(-11, -1, 22, 3);
    c.strokeStyle = m.ink; c.lineWidth = 2;
    c.strokeRect(-7, -12, 14, 12); c.strokeRect(-11, -1, 22, 3);
    c.fillStyle = c.ch.outfit.colorOf('tophat', '#c94a4a');
    c.fillRect(-7, -4, 14, 3);
    c.restore();
  });
  def('wizardhat', 'Pointy Wizard Hat', 'head', (c, m) => {
    c.save(); c.translate(0, m.headY - 6);
    c.beginPath();
    c.moveTo(-9, 0); c.quadraticCurveTo(-3, -10, -1, -20);
    c.quadraticCurveTo(3, -12, 9, 0);
    c.closePath();
    c.fillStyle = c.ch.outfit.colorOf('wizardhat', '#4a3a7a'); c.fill();
    c.strokeStyle = m.ink; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#e8b93c';
    c.beginPath(); c.arc(0, 1.5, 2, 0, M.TAU); c.fill(); c.stroke();
    c.restore();
  });
  def('strawhat', 'Straw Sun Hat', 'head', (c, m) => {
    c.save(); c.translate(0, m.headY - 6);
    c.beginPath(); c.ellipse(0, 0, 15, 4, 0, 0, M.TAU);
    c.fillStyle = '#e0c98a'; c.fill(); c.strokeStyle = m.ink; c.lineWidth = 2; c.stroke();
    c.beginPath(); c.arc(0, -1, 7, Math.PI, 0); c.closePath();
    c.fillStyle = '#d4b878'; c.fill(); c.stroke();
    c.strokeStyle = '#b08a4a'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(-13, 1); c.lineTo(13, 1); c.stroke();
    c.restore();
  });
  def('bandana', 'Pirate Bandana', 'head', (c, m) => {
    c.save(); c.translate(0, m.headY - 3);
    c.beginPath(); c.arc(0, -1, c.ch.headR, Math.PI * 1.05, Math.PI * 1.95);
    c.closePath();
    c.fillStyle = c.ch.outfit.colorOf('bandana', '#c94a4a'); c.fill();
    c.strokeStyle = m.ink; c.lineWidth = 2; c.stroke();
    // knot
    c.fillStyle = c.ch.outfit.colorOf('bandana', '#c94a4a');
    c.beginPath(); c.arc(-c.ch.headR - 1, 0, 2.5, 0, M.TAU); c.fill(); c.stroke();
    c.restore();
  });
  def('vikinghelm', 'Viking Helm', 'head', (c, m) => {
    c.save(); c.translate(0, m.headY - 6);
    c.beginPath(); c.arc(0, 1, c.ch.headR + 1, Math.PI, 0); c.closePath();
    c.fillStyle = '#a8a29a'; c.fill(); c.strokeStyle = m.ink; c.lineWidth = 2; c.stroke();
    // horns
    for (const s of [-1, 1]) {
      c.beginPath();
      c.moveTo(s * (c.ch.headR), -1);
      c.quadraticCurveTo(s * (c.ch.headR + 5), -5, s * (c.ch.headR + 3), -10);
      c.lineWidth = 3; c.strokeStyle = '#e8dcc0'; c.stroke();
      c.lineWidth = 1.2; c.strokeStyle = m.ink; c.stroke();
    }
    c.restore();
  });
  def('crown', 'Paper Crown', 'head', (c, m) => {
    c.save(); c.translate(0, m.headY - 7);
    c.beginPath();
    c.moveTo(-8, 2); c.lineTo(-8, -5); c.lineTo(-4, -1); c.lineTo(0, -7);
    c.lineTo(4, -1); c.lineTo(8, -5); c.lineTo(8, 2); c.closePath();
    c.fillStyle = '#e8b93c'; c.fill();
    c.strokeStyle = m.ink; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#e4573d';
    c.beginPath(); c.arc(0, 0, 1.5, 0, M.TAU); c.fill();
    c.restore();
  });
  def('beanie', 'Cozy Beanie', 'head', (c, m) => {
    c.save(); c.translate(0, m.headY - 5);
    c.beginPath(); c.arc(0, 1, c.ch.headR + 1, Math.PI, 0); c.closePath();
    c.fillStyle = c.ch.outfit.colorOf('beanie', '#4a6ac9'); c.fill();
    c.strokeStyle = m.ink; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#f2ead8';
    c.fillRect(-c.ch.headR - 1, 0, c.ch.headR * 2 + 2, 3);
    c.strokeRect(-c.ch.headR - 1, 0, c.ch.headR * 2 + 2, 3);
    c.beginPath(); c.arc(0, -c.ch.headR, 2.6, 0, M.TAU); c.fillStyle = '#f2ead8'; c.fill(); c.stroke();
    c.restore();
  });
  def('sombrero', 'Grand Sombrero', 'head', (c, m) => {
    c.save(); c.translate(0, m.headY - 5);
    c.beginPath(); c.ellipse(0, 0, 20, 5, 0, 0, M.TAU);
    c.fillStyle = '#e0c98a'; c.fill(); c.strokeStyle = m.ink; c.lineWidth = 2; c.stroke();
    c.beginPath(); c.ellipse(0, -3, 7, 6, 0, 0, M.TAU);
    c.fillStyle = '#d4b878'; c.fill(); c.stroke();
    c.restore();
  });
  def('bucket', 'Bucket Helm', 'head', (c, m) => {
    c.save(); c.translate(0, m.headY - 8);
    c.fillStyle = '#9aa8b4';
    c.fillRect(-8, 0, 16, 10);
    c.strokeStyle = m.ink; c.lineWidth = 2; c.strokeRect(-8, 0, 16, 10);
    c.beginPath(); c.moveTo(-8, 10); c.lineTo(-6, 16); c.moveTo(8, 10); c.lineTo(6, 16);
    c.lineWidth = 2.4; c.stroke();
    c.restore();
  });
  def('headband', 'Battle Headband', 'head', (c, m) => {
    c.save(); c.translate(0, m.headY - 3);
    c.strokeStyle = c.ch.outfit.colorOf('headband', '#c94a4a'); c.lineWidth = 3.4;
    c.beginPath(); c.moveTo(-c.ch.headR, 0); c.lineTo(c.ch.headR, 0); c.stroke();
    c.strokeStyle = m.ink; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(-c.ch.headR, 0); c.lineTo(c.ch.headR, 0); c.stroke();
    c.restore();
  });
  def('flowercrown', 'Flower Crown', 'head', (c, m) => {
    c.save(); c.translate(0, m.headY - 5);
    const cols = ['#e8a7c3', '#f2b134', '#e4573d', '#c78fda'];
    for (let i = 0; i < 5; i++) {
      const a = Math.PI + (i / 4) * Math.PI;
      c.beginPath(); c.arc(Math.cos(a) * c.ch.headR, 2 + Math.sin(a) * 3, 2.2, 0, M.TAU);
      c.fillStyle = cols[i % 4]; c.fill();
      c.strokeStyle = m.ink; c.lineWidth = 1; c.stroke();
    }
    c.restore();
  });
  def('horns', 'Doodle Horns', 'head', (c, m) => {
    c.save(); c.translate(0, m.headY - 6);
    for (const s of [-1, 1]) {
      c.beginPath();
      c.moveTo(s * 4, 2);
      c.quadraticCurveTo(s * 9, -2, s * 7, -9);
      c.strokeStyle = '#e8dcc0'; c.lineWidth = 3.4; c.stroke();
      c.strokeStyle = m.ink; c.lineWidth = 1.4; c.stroke();
    }
    c.restore();
  });
  def('headphones', 'Bass Cans', 'head', (c, m) => {
    c.save(); c.translate(0, m.headY - 2);
    c.strokeStyle = m.ink; c.lineWidth = 2.4;
    c.beginPath(); c.arc(0, 2, c.ch.headR + 1, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
    for (const s of [-1, 1]) {
      c.fillStyle = c.ch.outfit.colorOf('headphones', '#4a6ac9');
      c.beginPath(); c.ellipse(s * (c.ch.headR + 1), 2, 3, 4.4, 0, 0, M.TAU); c.fill();
      c.strokeStyle = m.ink; c.lineWidth = 1.6; c.stroke();
    }
    c.restore();
  });
  def('propeller', 'Propeller Cap', 'head', (c, m) => {
    c.save(); c.translate(0, m.headY - 7);
    c.beginPath(); c.arc(0, 2, c.ch.headR + 1, Math.PI, 0); c.closePath();
    c.fillStyle = c.ch.outfit.colorOf('propeller', '#5b8dd9'); c.fill();
    c.strokeStyle = m.ink; c.lineWidth = 2; c.stroke();
    c.strokeStyle = m.ink; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, -c.ch.headR + 1); c.lineTo(0, -c.ch.headR - 4); c.stroke();
    const spin = Math.sin(G.world.time * 20) * 10;
    c.beginPath(); c.moveTo(-12 + spin * 0.4, -c.ch.headR - 4); c.lineTo(12 - spin * 0.4, -c.ch.headR - 4);
    c.strokeStyle = '#e4573d'; c.lineWidth = 2.6; c.stroke();
    c.restore();
  });
  def('halo', 'Suspicious Halo', 'head', (c, m) => {
    c.save(); c.translate(0, m.headY - c.ch.headR - 8);
    c.beginPath(); c.ellipse(0, 0, 8, 2.6, 0, 0, M.TAU);
    c.strokeStyle = '#e8b93c'; c.lineWidth = 2.6; c.stroke();
    c.strokeStyle = m.ink; c.lineWidth = 1; c.stroke();
    c.restore();
  });
  def('panhat', 'Frying Pan', 'head', (c, m) => {
    c.save(); c.translate(0, m.headY - 8);
    c.beginPath(); c.ellipse(0, 0, 11, 4, 0, 0, M.TAU);
    c.fillStyle = '#4a4642'; c.fill();
    c.strokeStyle = m.ink; c.lineWidth = 2; c.stroke();
    c.strokeStyle = m.ink; c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(0, -4); c.lineTo(0, -10); c.stroke();
    c.restore();
  });
  def('mailcap', 'Envelope Cap', 'head', (c, m) => {
    c.save(); c.translate(0, m.headY - 6);
    c.beginPath();
    c.moveTo(-9, 2); c.lineTo(0, -8); c.lineTo(9, 2); c.closePath();
    c.fillStyle = '#f2ead8'; c.fill();
    c.strokeStyle = m.ink; c.lineWidth = 2; c.stroke();
    c.strokeStyle = m.ink; c.lineWidth = 1;
    c.beginPath(); c.moveTo(-9, 2); c.lineTo(0, -3); c.lineTo(9, 2); c.stroke();
    c.restore();
  });

  // ---------------- FACE ----------------
  def('glasses', 'Round Specs', 'face', (c, m) => {
    c.save(); c.translate(0, m.headY - 0.5);
    for (const s of [-1, 1]) {
      c.beginPath(); c.arc(s * 3.4, 0, 2.8, 0, M.TAU);
      c.strokeStyle = m.ink; c.lineWidth = 1.6; c.stroke();
    }
    c.beginPath(); c.moveTo(-0.6, 0); c.lineTo(0.6, 0); c.stroke();
    c.restore();
  });
  def('shades', 'Cool Shades', 'face', (c, m) => {
    c.save(); c.translate(0, m.headY - 0.5);
    c.fillStyle = '#2a2622';
    c.fillRect(-6.5, -2, 5.6, 4);
    c.fillRect(0.9, -2, 5.6, 4);
    c.strokeStyle = m.ink; c.lineWidth = 1.4;
    c.strokeRect(-6.5, -2, 5.6, 4); c.strokeRect(0.9, -2, 5.6, 4);
    c.beginPath(); c.moveTo(-0.9, 0); c.lineTo(0.9, 0); c.stroke();
    c.restore();
  });
  def('monocle', 'Fancy Monocle', 'face', (c, m) => {
    c.save(); c.translate(m.facing * 3.4, m.headY - 0.5);
    c.beginPath(); c.arc(0, 0, 3.2, 0, M.TAU);
    c.strokeStyle = '#d4a832'; c.lineWidth = 1.8; c.stroke();
    c.strokeStyle = m.ink; c.lineWidth = 0.8; c.stroke();
    c.beginPath(); c.moveTo(0, 3.2); c.lineTo(-1, 7); c.stroke();
    c.restore();
  });
  def('mustache', 'Gentle Mustache', 'face', (c, m) => {
    c.save(); c.translate(0, m.headY + 3.5);
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(-4, -2, -6, 1);
    c.quadraticCurveTo(-4, 3, 0, 1.4);
    c.quadraticCurveTo(4, 3, 6, 1);
    c.quadraticCurveTo(4, -2, 0, 0);
    c.fillStyle = '#4a3a2a'; c.fill();
    c.strokeStyle = m.ink; c.lineWidth = 1; c.stroke();
    c.restore();
  });
  def('bigmustache', 'Grand Walrus Moustache', 'face', (c, m) => {
    c.save(); c.translate(0, m.headY + 3.5);
    c.beginPath();
    c.moveTo(0, -1);
    c.quadraticCurveTo(-6, -4, -9, 2);
    c.quadraticCurveTo(-5, 4, 0, 1.6);
    c.quadraticCurveTo(5, 4, 9, 2);
    c.quadraticCurveTo(6, -4, 0, -1);
    c.fillStyle = '#3a2e20'; c.fill();
    c.strokeStyle = m.ink; c.lineWidth = 1; c.stroke();
    c.restore();
  });
  def('beard', 'Wise Beard', 'face', (c, m) => {
    c.save(); c.translate(0, m.headY + 2);
    c.beginPath();
    c.moveTo(-6, 0); c.quadraticCurveTo(-7, 8, 0, 12);
    c.quadraticCurveTo(7, 8, 6, 0);
    c.quadraticCurveTo(0, 4, -6, 0);
    c.fillStyle = '#e8e4da'; c.fill();
    c.strokeStyle = m.ink; c.lineWidth = 1.4; c.stroke();
    c.restore();
  });
  def('eyepatch', 'Eyepatch', 'face', (c, m) => {
    c.save(); c.translate(0, m.headY - 0.5);
    c.fillStyle = '#2a2622';
    c.fillRect(m.facing > 0 ? 0.9 : -6.5, -2.4, 5.6, 4.4);
    c.strokeStyle = m.ink; c.lineWidth = 1.4; c.strokeRect(m.facing > 0 ? 0.9 : -6.5, -2.4, 5.6, 4.4);
    c.beginPath(); c.moveTo(-7, -3); c.lineTo(7, -3); c.lineWidth = 1.2; c.stroke();
    c.restore();
  });
  def('mask', 'Bandit Mask', 'face', (c, m) => {
    c.save(); c.translate(0, m.headY - 0.5);
    c.fillStyle = 'rgba(42,38,34,0.9)';
    c.beginPath(); c.ellipse(0, 0, c.ch.headR - 1, 4.4, 0, 0, M.TAU); c.fill();
    c.strokeStyle = m.ink; c.lineWidth = 1.4; c.stroke();
    c.fillStyle = '#f2ead8';
    c.beginPath(); c.arc(-3.4, 0, 1.1, 0, M.TAU); c.fill();
    c.beginPath(); c.arc(3.4, 0, 1.1, 0, M.TAU); c.fill();
    c.restore();
  });
  def('freckles', 'Freckle Dots', 'face', (c, m) => {
    c.save(); c.translate(0, m.headY + 2);
    c.fillStyle = 'rgba(139,104,74,0.8)';
    for (const [x, y] of [[-4, 0], [-2, 1.4], [-5, 1.8], [2, 1.4], [4, 0], [5, 1.8]]) {
      c.beginPath(); c.arc(x, y, 0.7, 0, M.TAU); c.fill();
    }
    c.restore();
  });
  def('blush', 'Battle Blush', 'face', (c, m) => {
    c.save(); c.translate(0, m.headY + 2);
    c.fillStyle = 'rgba(232,138,180,0.5)';
    c.beginPath(); c.ellipse(-4.5, 0, 2.4, 1.4, 0, 0, M.TAU); c.fill();
    c.beginPath(); c.ellipse(4.5, 0, 2.4, 1.4, 0, 0, M.TAU); c.fill();
    c.restore();
  });
  def('scarf', 'Snug Scarf', 'face', (c, m) => {
    c.save(); c.translate(0, m.headY + c.ch.headR + 1);
    c.beginPath(); c.ellipse(0, 0, 7, 3, 0, 0, M.TAU);
    c.fillStyle = c.ch.outfit.colorOf('scarf', '#c94a4a'); c.fill();
    c.strokeStyle = m.ink; c.lineWidth = 1.8; c.stroke();
    // tail flutters
    const fl = Math.sin(G.world.time * 4 + c.ch.id) * 2;
    c.beginPath();
    c.moveTo(-3, 2); c.quadraticCurveTo(-5 - fl, 8, -3 - fl, 13);
    c.lineTo(0 - fl * 0.5, 13); c.quadraticCurveTo(-1, 8, 1, 2);
    c.closePath();
    c.fillStyle = c.ch.outfit.colorOf('scarf', '#a03024'); c.fill(); c.stroke();
    c.restore();
  });
  def('bandaid', 'Nose Bandage', 'face', (c, m) => {
    c.save(); c.translate(0, m.headY + 1);
    c.save(); c.rotate(-0.3);
    c.fillStyle = '#f2e6c8';
    c.fillRect(-4, -1.4, 8, 2.8);
    c.strokeStyle = 'rgba(59,47,38,0.6)'; c.lineWidth = 0.8;
    c.strokeRect(-4, -1.4, 8, 2.8);
    c.fillStyle = 'rgba(59,47,38,0.35)';
    c.fillRect(-1.4, -0.7, 2.8, 1.4);
    c.restore();
    c.restore();
  });
  def('warpaint', 'War Paint Stripes', 'face', (c, m) => {
    c.save(); c.translate(0, m.headY + 1);
    c.strokeStyle = c.ch.outfit.colorOf('warpaint', '#e4573d'); c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(-5, -2); c.lineTo(-2, 3); c.stroke();
    c.beginPath(); c.moveTo(5, -2); c.lineTo(2, 3); c.stroke();
    c.restore();
  });

  // ---------------- TORSO WEAR (over torso) ----------------
  def('vest', 'Button Vest', 'torsoWear', (c, m) => {
    c.save(); c.translate(0, m.bodyY);
    c.strokeStyle = c.ch.outfit.colorOf('vest', '#4a3a2a'); c.lineWidth = 3;
    c.beginPath(); c.moveTo(-6, -7); c.lineTo(-5, 7); c.stroke();
    c.beginPath(); c.moveTo(6, -7); c.lineTo(5, 7); c.stroke();
    c.fillStyle = m.ink;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(0, -4 + i * 4, 0.9, 0, M.TAU); c.fill(); }
    c.restore();
  });
  def('suspenders', 'Braces', 'torsoWear', (c, m) => {
    c.save(); c.translate(0, m.bodyY);
    c.strokeStyle = c.ch.outfit.colorOf('suspenders', '#8a6a4a'); c.lineWidth = 2;
    c.beginPath(); c.moveTo(-4, -7); c.lineTo(-3, 7); c.stroke();
    c.beginPath(); c.moveTo(4, -7); c.lineTo(3, 7); c.stroke();
    c.restore();
  });
  def('bowtie', 'Dapper Bow Tie', 'torsoWear', (c, m) => {
    c.save(); c.translate(0, m.bodyY - 7);
    c.beginPath();
    c.moveTo(-6, 0); c.lineTo(-1.4, -2.6); c.lineTo(-1.4, 2.6); c.closePath();
    c.moveTo(6, 0); c.lineTo(1.4, -2.6); c.lineTo(1.4, 2.6); c.closePath();
    c.fillStyle = c.ch.outfit.colorOf('bowtie', '#c94a4a'); c.fill();
    c.strokeStyle = m.ink; c.lineWidth = 1.4; c.stroke();
    c.beginPath(); c.arc(0, 0, 1.4, 0, M.TAU); c.fillStyle = '#3a2a1a'; c.fill();
    c.restore();
  });
  def('tie', 'Office Tie', 'torsoWear', (c, m) => {
    c.save(); c.translate(0, m.bodyY - 6);
    const fl = Math.sin(G.world.time * 5 + c.ch.id) * 1.4;
    c.beginPath();
    c.moveTo(0, 0); c.lineTo(2, 2); c.lineTo(1 + fl, 12); c.lineTo(-1 + fl, 12); c.lineTo(-2, 2);
    c.closePath();
    c.fillStyle = c.ch.outfit.colorOf('tie', '#3a4a7a'); c.fill();
    c.strokeStyle = m.ink; c.lineWidth = 1.2; c.stroke();
    c.restore();
  });
  def('necklace', 'Bead Necklace', 'torsoWear', (c, m) => {
    c.save(); c.translate(0, m.bodyY - 6);
    c.strokeStyle = m.ink; c.lineWidth = 0.8;
    c.beginPath(); c.arc(0, 0, 6, 0.3, Math.PI - 0.3); c.stroke();
    c.fillStyle = '#e8b93c';
    c.beginPath(); c.arc(0, 5.4, 1.6, 0, M.TAU); c.fill();
    c.strokeStyle = m.ink; c.lineWidth = 0.8; c.stroke();
    c.restore();
  });
  def('armorchest', 'Chest Plate', 'torsoWear', (c, m) => {
    c.save(); c.translate(0, m.bodyY);
    c.beginPath();
    c.moveTo(-8, -8); c.quadraticCurveTo(-9, 0, -7, 8);
    c.lineTo(7, 8); c.quadraticCurveTo(9, 0, 8, -8);
    c.closePath();
    c.fillStyle = '#a8a29a'; c.fill();
    c.strokeStyle = m.ink; c.lineWidth = 2; c.stroke();
    c.strokeStyle = 'rgba(59,47,38,0.4)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(-7, -2); c.lineTo(7, -2); c.stroke();
    c.restore();
  });
  def('overalls', 'Dungarees', 'torsoWear', (c, m) => {
    c.save(); c.translate(0, m.bodyY);
    c.fillStyle = c.ch.outfit.colorOf('overalls', '#4a6ac9');
    c.fillRect(-7, -6, 14, 14);
    c.strokeStyle = m.ink; c.lineWidth = 1.6;
    c.strokeRect(-7, -6, 14, 14);
    c.beginPath(); c.moveTo(-5, -6); c.lineTo(-4, -12); c.moveTo(5, -6); c.lineTo(4, -12);
    c.lineWidth = 2; c.stroke();
    c.fillStyle = '#e8b93c';
    c.beginPath(); c.arc(-4, -11, 1.2, 0, M.TAU); c.fill();
    c.beginPath(); c.arc(4, -11, 1.2, 0, M.TAU); c.fill();
    c.restore();
  });
  def('hoodie', 'Hoodie Strings', 'torsoWear', (c, m) => {
    c.save(); c.translate(0, m.bodyY);
    c.strokeStyle = m.ink; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(-2, -8); c.lineTo(-2, -1); c.stroke();
    c.beginPath(); c.moveTo(2, -8); c.lineTo(2, -1); c.stroke();
    c.fillStyle = m.ink;
    c.beginPath(); c.arc(-2, 0, 1.1, 0, M.TAU); c.fill();
    c.beginPath(); c.arc(2, 0, 1.1, 0, M.TAU); c.fill();
    c.restore();
  });
  def('pocketwatch', 'Pocket Watch', 'torsoWear', (c, m) => {
    c.save(); c.translate(5, m.bodyY + 2);
    c.strokeStyle = m.ink; c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(0, -6); c.quadraticCurveTo(2, -3, 0, 0); c.stroke();
    c.beginPath(); c.arc(0, 2, 2.6, 0, M.TAU);
    c.fillStyle = '#e8b93c'; c.fill();
    c.strokeStyle = m.ink; c.lineWidth = 1.2; c.stroke();
    c.beginPath(); c.moveTo(0, 2); c.lineTo(0, 0.4); c.moveTo(0, 2); c.lineTo(1.2, 2.4);
    c.lineWidth = 0.8; c.stroke();
    c.restore();
  });
  def('badge', 'Star Badge', 'torsoWear', (c, m) => {
    c.save(); c.translate(-4, m.bodyY - 3);
    c.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * M.TAU / 5;
      const a2 = a + M.TAU / 10;
      c.lineTo(Math.cos(a) * 3.4, Math.sin(a) * 3.4);
      c.lineTo(Math.cos(a2) * 1.5, Math.sin(a2) * 1.5);
    }
    c.closePath();
    c.fillStyle = '#e8b93c'; c.fill();
    c.strokeStyle = m.ink; c.lineWidth = 1; c.stroke();
    c.restore();
  });

  // ---------------- OUTER ----------------
  def('jacket', 'Ink Jacket', 'outer', (c, m) => {
    c.save(); c.translate(0, m.bodyY);
    c.beginPath();
    c.moveTo(-8, -8); c.quadraticCurveTo(-10, 0, -8, 9);
    c.lineTo(-8, 9); c.lineTo(8, 9); c.quadraticCurveTo(10, 0, 8, -8);
    c.closePath();
    c.fillStyle = c.ch.outfit.colorOf('jacket', '#6a4a3a'); c.fill();
    c.strokeStyle = m.ink; c.lineWidth = 2; c.stroke();
    c.beginPath(); c.moveTo(0, -8); c.lineTo(0, 9); c.lineWidth = 1.4; c.stroke();
    c.restore();
  });
  def('trenchcoat', 'Long Trenchcoat', 'outer', (c, m) => {
    c.save(); c.translate(0, m.bodyY);
    const fl = Math.sin(G.world.time * 3 + c.ch.id) * 1.6;
    c.beginPath();
    c.moveTo(-8, -8); c.quadraticCurveTo(-10, 4, -9 - fl, 18);
    c.lineTo(9 - fl, 18); c.quadraticCurveTo(10, 4, 8, -8);
    c.closePath();
    c.fillStyle = c.ch.outfit.colorOf('trenchcoat', '#8a7a5a'); c.fill();
    c.strokeStyle = m.ink; c.lineWidth = 2; c.stroke();
    c.beginPath(); c.moveTo(0, -8); c.lineTo(-fl * 0.4, 18); c.lineWidth = 1.4; c.stroke();
    c.fillStyle = m.ink;
    c.beginPath(); c.arc(0, -4, 1, 0, M.TAU); c.fill();
    c.beginPath(); c.arc(0, 1, 1, 0, M.TAU); c.fill();
    c.restore();
  });
  def('poncho', 'Rain Poncho', 'outer', (c, m) => {
    c.save(); c.translate(0, m.bodyY - 2);
    c.beginPath();
    c.moveTo(-2, -10); c.lineTo(-11, 10); c.lineTo(11, 10); c.lineTo(2, -10);
    c.closePath();
    c.fillStyle = c.ch.outfit.colorOf('poncho', '#e8a7c3'); c.fill();
    c.strokeStyle = m.ink; c.lineWidth = 2; c.stroke();
    c.strokeStyle = 'rgba(59,47,38,0.4)'; c.lineWidth = 1;
    for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * 4, -8); c.lineTo(i * 5, 9); c.stroke(); }
    c.restore();
  });
  def('apron', 'Chef Apron', 'outer', (c, m) => {
    c.save(); c.translate(0, m.bodyY);
    c.beginPath();
    c.moveTo(-6, -6); c.lineTo(-7, 9); c.lineTo(7, 9); c.lineTo(6, -6);
    c.closePath();
    c.fillStyle = '#f2ead8'; c.fill();
    c.strokeStyle = m.ink; c.lineWidth = 1.8; c.stroke();
    c.beginPath(); c.moveTo(-4, 0); c.lineTo(4, 0); c.lineWidth = 1.2; c.stroke();
    c.restore();
  });
  def('knightarmor', 'Tin Armour', 'outer', (c, m) => {
    c.save(); c.translate(0, m.bodyY);
    c.fillStyle = '#b8b2aa';
    c.beginPath(); c.ellipse(-9, 0, 3, 5, 0, 0, M.TAU); c.fill();
    c.strokeStyle = m.ink; c.lineWidth = 1.6; c.stroke();
    c.beginPath(); c.ellipse(9, 0, 3, 5, 0, 0, M.TAU); c.fill(); c.stroke();
    c.beginPath();
    c.moveTo(-8, -8); c.quadraticCurveTo(-9, 0, -8, 8); c.lineTo(8, 8); c.quadraticCurveTo(9, 0, 8, -8);
    c.closePath();
    c.fillStyle = '#c8c2ba'; c.fill();
    c.strokeStyle = m.ink; c.lineWidth = 2; c.stroke();
    c.restore();
  });
  def('capeitem', 'Short Cape', 'outer', (c, m) => {
    // static (non-physics) short cape
    c.save(); c.translate(0, m.bodyY - 7);
    const fl = Math.sin(G.world.time * 5 + c.ch.id) * 2 - c.ch.vx * 0.02;
    c.beginPath();
    c.moveTo(-7, 0); c.quadraticCurveTo(-9 + fl, 8, -7 + fl, 14);
    c.lineTo(7 + fl, 14); c.quadraticCurveTo(9 + fl, 8, 7, 0);
    c.closePath();
    c.fillStyle = c.ch.outfit.colorOf('capeitem', '#a03024'); c.fill();
    c.strokeStyle = m.ink; c.lineWidth = 1.8; c.stroke();
    c.restore();
  });
  def('robes', 'Starry Robes', 'outer', (c, m) => {
    c.save(); c.translate(0, m.bodyY);
    c.beginPath();
    c.moveTo(-7, -8); c.quadraticCurveTo(-11, 8, -9, 20);
    c.lineTo(9, 20); c.quadraticCurveTo(11, 8, 7, -8);
    c.closePath();
    c.fillStyle = c.ch.outfit.colorOf('robes', '#4a3a7a'); c.fill();
    c.strokeStyle = m.ink; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#e8e4f2';
    for (const [x, y] of [[-4, 4], [2, 8], [-1, 14], [4, 0]]) {
      c.beginPath(); c.arc(x, y, 0.8, 0, M.TAU); c.fill();
    }
    c.restore();
  });

  // ---------------- LEGS ----------------
  def('shorts', 'Summer Shorts', 'legs', (c, m) => {
    c.save(); c.translate(0, m.bodyY + 6);
    c.fillStyle = c.ch.outfit.colorOf('shorts', '#4a6ac9');
    c.fillRect(-6, 0, 5, 7);
    c.fillRect(1, 0, 5, 7);
    c.strokeStyle = m.ink; c.lineWidth = 1.4;
    c.strokeRect(-6, 0, 5, 7); c.strokeRect(1, 0, 5, 7);
    c.restore();
  });
  def('skirt', 'Twirl Skirt', 'legs', (c, m) => {
    c.save(); c.translate(0, m.bodyY + 6);
    const fl = Math.sin(G.world.time * 6 + c.ch.id) * 1.5;
    c.beginPath();
    c.moveTo(-5, 0); c.quadraticCurveTo(-8 - fl, 5, -6 - fl, 9);
    c.lineTo(6 + fl, 9); c.quadraticCurveTo(8 + fl, 5, 5, 0);
    c.closePath();
    c.fillStyle = c.ch.outfit.colorOf('skirt', '#e88ab4'); c.fill();
    c.strokeStyle = m.ink; c.lineWidth = 1.8; c.stroke();
    c.restore();
  });
  def('rippedjeans', 'Ripped Jeans', 'legs', (c, m) => {
    c.save(); c.translate(0, m.bodyY + 8);
    c.strokeStyle = m.ink; c.lineWidth = 1;
    c.strokeRect(-4, 0, 4, 3);
    c.strokeRect(1, 3, 4, 3);
    c.restore();
  });
  def('kneepads', 'Skate Kneepads', 'legs', (c, m) => {
    c.save(); c.translate(0, m.bodyY + 12);
    c.fillStyle = c.ch.outfit.colorOf('kneepads', '#3a3630');
    c.beginPath(); c.ellipse(-3.4, 0, 2.4, 3, 0, 0, M.TAU); c.fill();
    c.beginPath(); c.ellipse(3.4, 0, 2.4, 3, 0, 0, M.TAU); c.fill();
    c.strokeStyle = m.ink; c.lineWidth = 1.2;
    c.beginPath(); c.ellipse(-3.4, 0, 2.4, 3, 0, 0, M.TAU); c.stroke();
    c.beginPath(); c.ellipse(3.4, 0, 2.4, 3, 0, 0, M.TAU); c.stroke();
    c.restore();
  });
  def('loincloth', 'Barbarian Wrap', 'legs', (c, m) => {
    c.save(); c.translate(0, m.bodyY + 6);
    c.beginPath();
    c.moveTo(-6, 0); c.lineTo(-5, 8); c.lineTo(5, 8); c.lineTo(6, 0);
    c.closePath();
    c.fillStyle = c.ch.outfit.colorOf('loincloth', '#8a6a4a'); c.fill();
    c.strokeStyle = m.ink; c.lineWidth = 1.6; c.stroke();
    c.restore();
  });

  // ---------------- FEET ----------------
  for (const [cn, cv] of Object.entries(PAL)) {
    def('boots_' + cn, cn[0].toUpperCase() + cn.slice(1) + ' Boots', 'feet', (c, m) => {
      c.save(); c.translate(0, m.bodyY + 15);
      c.fillStyle = cv;
      c.fillRect(-6.5, 0, 5, 4); c.fillRect(1.5, 0, 5, 4);
      c.strokeStyle = m.ink; c.lineWidth = 1.4;
      c.strokeRect(-6.5, 0, 5, 4); c.strokeRect(1.5, 0, 5, 4);
      c.restore();
    });
  }
  def('sneakers', 'Fast Sneakers', 'feet', (c, m) => {
    c.save(); c.translate(0, m.bodyY + 15);
    c.fillStyle = '#f2ead8';
    c.fillRect(-7, 0, 5.6, 4.4); c.fillRect(1.4, 0, 5.6, 4.4);
    c.strokeStyle = m.ink; c.lineWidth = 1.4;
    c.strokeRect(-7, 0, 5.6, 4.4); c.strokeRect(1.4, 0, 5.6, 4.4);
    c.strokeStyle = c.ch.outfit.colorOf('sneakers', '#e4573d'); c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(-7, 3); c.lineTo(-1.4, 3); c.stroke();
    c.beginPath(); c.moveTo(1.4, 3); c.lineTo(7, 3); c.stroke();
    c.restore();
  });
  def('sandals', 'Beach Sandals', 'feet', (c, m) => {
    c.save(); c.translate(0, m.bodyY + 15);
    c.strokeStyle = '#8a6a4a'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-5.4, 3.6); c.lineTo(-1, 3.6); c.stroke();
    c.beginPath(); c.moveTo(1, 3.6); c.lineTo(5.4, 3.6); c.stroke();
    c.strokeStyle = m.ink; c.lineWidth = 1;
    c.beginPath(); c.moveTo(-5.4, 3.6); c.lineTo(-1, 3.6); c.stroke();
    c.beginPath(); c.moveTo(1, 3.6); c.lineTo(5.4, 3.6); c.stroke();
    c.restore();
  });
  def('clownshoes', 'Comedy Shoes', 'feet', (c, m) => {
    c.save(); c.translate(0, m.bodyY + 15);
    c.fillStyle = '#e4573d';
    c.beginPath(); c.ellipse(-5, 2, 5.4, 2.6, 0, 0, M.TAU); c.fill();
    c.beginPath(); c.ellipse(5, 2, 5.4, 2.6, 0, 0, M.TAU); c.fill();
    c.strokeStyle = m.ink; c.lineWidth = 1.4;
    c.beginPath(); c.ellipse(-5, 2, 5.4, 2.6, 0, 0, M.TAU); c.stroke();
    c.beginPath(); c.ellipse(5, 2, 5.4, 2.6, 0, 0, M.TAU); c.stroke();
    c.fillStyle = '#f2ead8';
    c.beginPath(); c.arc(-8.4, 2, 1.6, 0, M.TAU); c.fill();
    c.beginPath(); c.arc(8.4, 2, 1.6, 0, M.TAU); c.fill();
    c.restore();
  });
  def('rollerskates', 'Roller Skates', 'feet', (c, m) => {
    c.save(); c.translate(0, m.bodyY + 15);
    c.fillStyle = '#f2e6c8';
    c.fillRect(-6.5, 0, 5, 4); c.fillRect(1.5, 0, 5, 4);
    c.strokeStyle = m.ink; c.lineWidth = 1.2;
    c.strokeRect(-6.5, 0, 5, 4); c.strokeRect(1.5, 0, 5, 4);
    c.fillStyle = m.ink;
    for (const x of [-5.4, -3, 2.6, 5]) { c.beginPath(); c.arc(x, 5.4, 1.2, 0, M.TAU); c.fill(); }
    c.restore();
  });

  // ---------------- BACK (behind body) ----------------
  def('backpack', 'Adventure Pack', 'back', {
    behind: true,
    draw(c, m) {
      c.save(); c.translate(-m.facing * 9, m.bodyY);
      G.handRect(c, -5, -7, 10, 14, 42, 3);
      c.fillStyle = c.ch.outfit.colorOf('backpack', '#8a6a4a'); c.fill();
      c.strokeStyle = m.ink; c.lineWidth = 1.8; c.stroke();
      c.strokeStyle = m.ink; c.lineWidth = 1;
      c.beginPath(); c.moveTo(-4, 0); c.lineTo(4, 0); c.stroke();
      c.restore();
    },
  });
  def('wings', 'Paper Wings', 'back', {
    behind: true,
    draw(c, m) {
      c.save(); c.translate(-m.facing * 6, m.bodyY - 2);
      const fl = Math.sin(G.world.time * 3 + c.ch.id) * 0.15;
      for (const s of [-1, 1]) {
        c.save();
        c.rotate(s * (0.5 + fl));
        c.beginPath();
        c.moveTo(0, 0); c.quadraticCurveTo(-14 * m.facing, -8, -18 * m.facing, 4);
        c.quadraticCurveTo(-12 * m.facing, 6, 0, 6);
        c.closePath();
        c.fillStyle = '#f2ead8'; c.fill();
        c.strokeStyle = m.ink; c.lineWidth = 1.6; c.stroke();
        c.restore();
      }
      c.restore();
    },
  });
  def('quiver', 'Arrow Quiver', 'back', {
    behind: true,
    draw(c, m) {
      c.save(); c.translate(-m.facing * 8, m.bodyY);
      c.save(); c.rotate(0.2 * m.facing);
      c.beginPath(); c.moveTo(-2.6, -6); c.lineTo(-2, 6); c.lineTo(2, 6); c.lineTo(2.6, -6); c.closePath();
      c.fillStyle = '#8a6a4a'; c.fill();
      c.strokeStyle = m.ink; c.lineWidth = 1.6; c.stroke();
      c.strokeStyle = m.ink; c.lineWidth = 1.2;
      for (const x of [-1.2, 0.4]) {
        c.beginPath(); c.moveTo(x, -6); c.lineTo(x - 1, -11); c.stroke();
      }
      c.restore();
      c.restore();
    },
  });
  def('jetpack', 'Doodle Jetpack', 'back', {
    behind: true,
    draw(c, m) {
      c.save(); c.translate(-m.facing * 8, m.bodyY);
      c.fillStyle = '#a8a29a';
      c.beginPath(); c.roundRect ? c.roundRect(-4, -7, 8, 13, 3) : c.rect(-4, -7, 8, 13); c.fill();
      c.strokeStyle = m.ink; c.lineWidth = 1.8; c.stroke();
      if (Math.random() < 0.3) {
        c.fillStyle = 'rgba(255,160,60,0.8)';
        c.beginPath(); c.ellipse(0, 8, 2.4, 4, 0, 0, M.TAU); c.fill();
      }
      c.restore();
    },
  });
  def('shieldback', 'Back Shield', 'back', {
    behind: true,
    draw(c, m) {
      c.save(); c.translate(-m.facing * 9, m.bodyY);
      c.beginPath();
      c.moveTo(0, -8); c.lineTo(6 * m.facing, -5); c.lineTo(6 * m.facing, 5); c.lineTo(0, 8); c.lineTo(-6 * m.facing, 5); c.lineTo(-6 * m.facing, -5);
      c.closePath();
      c.fillStyle = c.ch.outfit.colorOf('shieldback', '#4a6ac9'); c.fill();
      c.strokeStyle = m.ink; c.lineWidth = 1.8; c.stroke();
      c.fillStyle = '#e8b93c';
      c.beginPath(); c.arc(0, 0, 2, 0, M.TAU); c.fill(); c.stroke();
      c.restore();
    },
  });
  def('umbrella', 'Brolly', 'back', {
    behind: true,
    draw(c, m) {
      c.save(); c.translate(-m.facing * 6, m.bodyY - 4);
      c.strokeStyle = m.ink; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(0, 10); c.lineTo(0, -8); c.stroke();
      c.beginPath(); c.arc(0, -8, 8, Math.PI, 0);
      c.fillStyle = c.ch.outfit.colorOf('umbrella', '#78c6a3'); c.fill();
      c.strokeStyle = m.ink; c.lineWidth = 1.6; c.stroke();
      c.beginPath(); c.moveTo(-8, -8); c.lineTo(0, -4); c.lineTo(8, -8); c.lineWidth = 1; c.stroke();
      c.restore();
    },
  });
  def('phycloth', 'Physics Cape', 'back', {
    behind: true, cloth: { cols: 3, rows: 5, segW: 6, segH: 6 },
    draw() { /* drawn by cloth system */ },
  });
  def('scarfcloth', 'Physics Scarf', 'back', {
    behind: true, cloth: { cols: 2, rows: 7, segW: 4, segH: 4, gravity: 900 },
    draw() { /* drawn by cloth system */ },
  });

  // ---------------- HELD (offhand) ----------------
  def('balloon', 'Party Balloon', 'held', (c, m) => {
    c.save(); c.translate(-m.facing * 10, m.bodyY - 4);
    const bob = Math.sin(G.world.time * 2 + c.ch.id) * 2;
    c.strokeStyle = m.ink; c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, 6); c.quadraticCurveTo(2, 0, 1 + bob * 0.4, -8); c.stroke();
    c.beginPath(); c.ellipse(1 + bob * 0.4, -12, 4.4, 5.4, 0, 0, M.TAU);
    c.fillStyle = c.ch.outfit.colorOf('balloon', '#e4573d'); c.fill();
    c.strokeStyle = m.ink; c.lineWidth = 1.4; c.stroke();
    c.restore();
  });
  def('teddy', 'Trusty Bear', 'held', (c, m) => {
    c.save(); c.translate(-m.facing * 9, m.bodyY + 2);
    c.fillStyle = '#b08a5a';
    c.beginPath(); c.arc(0, 0, 4, 0, M.TAU); c.fill();
    c.strokeStyle = m.ink; c.lineWidth = 1.2; c.stroke();
    c.beginPath(); c.arc(-3, -4, 1.4, 0, M.TAU); c.fill(); c.stroke();
    c.beginPath(); c.arc(3, -4, 1.4, 0, M.TAU); c.fill(); c.stroke();
    c.fillStyle = m.ink;
    c.beginPath(); c.arc(-1.4, 0, 0.6, 0, M.TAU); c.fill();
    c.beginPath(); c.arc(1.4, 0, 0.6, 0, M.TAU); c.fill();
    c.restore();
  });
  def('mug', 'Coffee Mug', 'held', (c, m) => {
    c.save(); c.translate(-m.facing * 9, m.bodyY + 3);
    c.fillStyle = '#f2ead8';
    c.fillRect(-3, -4, 6, 7);
    c.strokeStyle = m.ink; c.lineWidth = 1.4;
    c.strokeRect(-3, -4, 6, 7);
    c.beginPath(); c.arc(4, -1, 2, -Math.PI / 2, Math.PI / 2); c.stroke();
    c.strokeStyle = 'rgba(120,90,60,0.6)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(-2, -5); c.quadraticCurveTo(0, -7, 2, -5); c.stroke();
    c.restore();
  });
  def('fish', 'Trout of War', 'held', (c, m) => {
    c.save(); c.translate(-m.facing * 10, m.bodyY + 2);
    const fl = Math.sin(G.world.time * 6 + c.ch.id) * 0.2;
    c.save(); c.rotate(fl);
    c.beginPath();
    c.ellipse(0, 0, 7, 3, 0, 0, M.TAU);
    c.fillStyle = '#8ab4c9'; c.fill();
    c.strokeStyle = m.ink; c.lineWidth = 1.4; c.stroke();
    c.beginPath(); c.moveTo(-7, 0); c.lineTo(-10, -3); c.lineTo(-10, 3); c.closePath();
    c.fillStyle = '#7aa4b9'; c.fill(); c.stroke();
    c.fillStyle = m.ink;
    c.beginPath(); c.arc(4, -1, 0.8, 0, M.TAU); c.fill();
    c.restore();
    c.restore();
  });
  def('sign', 'Little Sign', 'held', (c, m) => {
    c.save(); c.translate(-m.facing * 10, m.bodyY);
    c.strokeStyle = m.ink; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(0, 10); c.lineTo(0, 0); c.stroke();
    G.handRect(c, -6, -8, 12, 9, 7, 2);
    c.fillStyle = '#f2ead8'; c.fill();
    c.strokeStyle = m.ink; c.lineWidth = 1.6; c.stroke();
    c.strokeStyle = m.ink; c.lineWidth = 1;
    c.beginPath(); c.moveTo(-4, -5.5); c.lineTo(4, -5.5); c.moveTo(-4, -3); c.lineTo(2, -3); c.stroke();
    c.restore();
  });
  def('daisy', 'Lucky Daisy', 'held', (c, m) => {
    c.save(); c.translate(-m.facing * 9, m.bodyY + 2);
    c.strokeStyle = '#5c8a4a'; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(0, 6); c.lineTo(0, -2); c.stroke();
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * M.TAU;
      c.beginPath(); c.ellipse(Math.cos(a) * 3, -4 + Math.sin(a) * 3, 2, 1.2, a, 0, M.TAU);
      c.fillStyle = '#f2ead8'; c.fill();
      c.strokeStyle = m.ink; c.lineWidth = 0.8; c.stroke();
    }
    c.fillStyle = '#e8b93c';
    c.beginPath(); c.arc(0, -4, 1.8, 0, M.TAU); c.fill(); c.stroke();
    c.restore();
  });

  // ---------- system ----------
  const wardrobe = {
    items: ITEMS,
    slots: SLOT_ORDER,
    slotNames: SLOT_NAMES,
    get(id) { return ITEMS[id]; },
    register(id, name, slot, draw, opts) { def(id, name, slot, draw, opts); return ITEMS[id]; },
    bySlot(slot) { return Object.values(ITEMS).filter(i => i.slot === slot); },
    colorOfFallback: null,
    randomOutfit() {
      const outfit = {
        skin: M.pick(['#e8c39a', '#d4a878', '#b88a5a', '#8a5a3a', '#f2d4b0', '#6a4228']),
        items: {}, itemColors: {},
        torsoColor: M.pick(Object.values(PAL)),
        legsColor: M.pick(Object.values(PAL)),
        colorOf(id, def) { return this.itemColors[id] || def; },
      };
      for (const slot of SLOT_ORDER) {
        if (Math.random() < 0.45) {
          const items = this.bySlot(slot);
          if (items.length) {
            const it = M.pick(items);
            outfit.items[slot] = it.id;
            if (Math.random() < 0.7) outfit.itemColors[it.id] = M.pick(Object.values(PAL));
          }
        }
      }
      // physics cloth if cape chosen
      return outfit;
    },
    // build cloth pieces for a character from outfit
    makeCloths(ch) {
      const cloths = [];
      const backId = ch.outfit.items.back;
      if (backId) {
        const item = ITEMS[backId];
        if (item && item.cloth) {
          const cfg = item.cloth;
          cloths.push(new G.Cloth(cfg.cols, cfg.rows, cfg.segW, cfg.segH, {
            color: ch.outfit.colorOf(backId, '#c94a4a'),
            gravity: cfg.gravity,
          }));
        }
      }
      return cloths;
    },
  };

  G.wardrobe = wardrobe;
})();
