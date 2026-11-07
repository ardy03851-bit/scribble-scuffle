/* ============================================================
   Event bus + module registry (scripting hook API)
   ============================================================ */
window.G = window.G || {};
(function () {
  'use strict';
  const listeners = new Map();
  const bus = {
    on(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
      return () => bus.off(type, fn);
    },
    once(type, fn) {
      const off = bus.on(type, (...a) => { off(); fn(...a); });
      return off;
    },
    off(type, fn) {
      const arr = listeners.get(type);
      if (arr) { const i = arr.indexOf(fn); if (i >= 0) arr.splice(i, 1); }
    },
    emit(type, data) {
      const arr = listeners.get(type);
      if (!arr) return;
      for (let i = 0; i < arr.length; i++) {
        try { arr[i](data); } catch (e) { console.error('[event ' + type + ']', e); }
      }
      const all = listeners.get('*');
      if (all) for (let i = 0; i < all.length; i++) { try { all[i](type, data); } catch (e) { console.error(e); } }
    },
    clear() { listeners.clear(); }
  };

  // module loader: modules register with a phase; hooks let modules
  // wrap core functions (extensible engine)
  const PHASES = ['boot', 'world', 'content', 'game', 'ui'];
  const modules = new Map();
  const registry = {
    register(name, phase, init) {
      if (modules.has(name)) throw new Error('Module already registered: ' + name);
      modules.set(name, { name, phase, init, wrapped: {} });
    },
    // wrap a function on an object: moduleName, obj, key, wrapper(fn)(...args)
    wrap(moduleName, obj, key, wrapper) {
      const mod = modules.get(moduleName);
      if (!mod) throw new Error('wrap: unknown module ' + moduleName);
      const orig = obj[key];
      mod.wrapped[key] = orig;
      obj[key] = wrapper(orig);
    },
    bootAll(ctx) {
      for (const phase of PHASES) {
        for (const mod of modules.values()) {
          if (mod.phase === phase) {
            try { mod.init(ctx); } catch (e) { console.error('[module ' + mod.name + ']', e); }
          }
        }
      }
    },
    list() { return [...modules.values()].map(m => m.name); }
  };

  G.bus = bus; G.modules = registry;
})();
