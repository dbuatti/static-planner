/* ── store.js — namespaced, versioned localStorage helpers ─────────────
   One key per module. Every read/write wrapped in try/catch so the app
   always renders, even with empty or corrupt storage.
--------------------------------------------------------------------- */
(function (global) {
  "use strict";

  var VERSION = 1;

  var KEYS = {
    practice: "planner.practice",
    spending: "planner.spending",
    tasks: "planner.tasks",
    theme: "planner.theme",
    meta: "planner.meta"
  };

  function read(key, fallback) {
    try {
      var raw = global.localStorage.getItem(key);
      if (!raw) return fallback;
      var obj = JSON.parse(raw);
      if (obj && typeof obj === "object" && obj.v === VERSION) return obj;
      return fallback;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      global.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function remove(key) {
    try { global.localStorage.removeItem(key); return true; }
    catch (e) { return false; }
  }

  /* ── Defaults ── */
  var DEFAULT_PRACTICE = { v: VERSION, min: false, weeks: {} };
  var DEFAULT_SPENDING_PLAN = {
    cafeN: 4, cafeP: 5.5, homeP: 1, mealN: 2, mealP: 21, groc: 85, fun: 28
  };
  var DEFAULT_SPENDING = { v: VERSION, plan: {}, weeks: {} };
  var DEFAULT_TASKS = { v: VERSION, pinned: {} };

  /* ── Getter/setter helpers with defaults ── */
  function getPractice() {
    var obj = read(KEYS.practice, null);
    if (!obj || !obj.weeks) obj = JSON.parse(JSON.stringify(DEFAULT_PRACTICE));
    if (!obj.min && typeof obj.min !== "boolean") obj.min = false;
    return obj;
  }
  function setPractice(obj) { obj.v = VERSION; return write(KEYS.practice, obj); }

  function getSpending() {
    var obj = read(KEYS.spending, null);
    if (!obj || !obj.weeks) obj = JSON.parse(JSON.stringify(DEFAULT_SPENDING));
    obj.plan = Object.assign({}, DEFAULT_SPENDING_PLAN, obj.plan || {});
    return obj;
  }
  function setSpending(obj) { obj.v = VERSION; return write(KEYS.spending, obj); }

  function getTasks() {
    var obj = read(KEYS.tasks, null);
    if (!obj || !obj.pinned) obj = JSON.parse(JSON.stringify(DEFAULT_TASKS));
    return obj;
  }
  function setTasks(obj) { obj.v = VERSION; return write(KEYS.tasks, obj); }

  /* ── Migration from the legacy single-page tracker ──
     weekly-check-v1 = { plan, weeks, practice }.
     plan+weeks → planner.spending; practice → planner.practice.     */
  function migrate() {
    var raw = null;
    try { raw = JSON.parse(global.localStorage.getItem("weekly-check-v1") || "null"); }
    catch (e) { raw = null; }
    if (!raw || typeof raw !== "object") return;

    // Only migrate spending if we don't already have it (idempotent).
    if (!read(KEYS.spending, null)) {
      var spending = {
        v: VERSION,
        plan: Object.assign({}, DEFAULT_SPENDING_PLAN, raw.plan || {}),
        weeks: raw.weeks || {}
      };
      write(KEYS.spending, spending);
    }

    // Practice: only migrate if we don't already have practice data.
    if (!read(KEYS.practice, null) && raw.practice && typeof raw.practice === "object") {
      var weeks = {};
      Object.keys(raw.practice).forEach(function (k) {
        var p = raw.practice[k];
        if (!p) return;
        var sit = p.sit || [0, 0, 0, 0, 0, 0, 0];
        var pno = p.pno || [0, 0, 0, 0, 0, 0, 0];
        var tec = [], str = [], free = [];
        for (var i = 0; i < 7; i++) {
          // Piano done → all three sub-sessions done.
          tec.push(pno[i] ? 1 : 0);
          str.push(pno[i] ? 1 : 0);
          free.push(pno[i] ? 1 : 0);
        }
        weeks[k] = {
          sit: sit, tec: tec, str: str, free: free,
          tech: p.tech || "", piece: p.piece || ""
        };
      });
      write(KEYS.practice, { v: VERSION, min: false, weeks: weeks });
    }
  }

  /* ── Export / Import (full backup) ── */
  function exportAll() {
    var out = { _meta: { app: "planner", version: VERSION, exportedAt: new Date().toISOString() } };
    Object.keys(KEYS).forEach(function (k) {
      try {
        var raw = global.localStorage.getItem(KEYS[k]);
        out[KEYS[k]] = raw ? JSON.parse(raw) : null;
      } catch (e) { out[KEYS[k]] = null; }
    });
    // Also capture the planner's own (non-namespaced) tick/chain/state keys
    // so a restore is truly lossless across the whole app.
    var legacy = {};
    try {
      for (var i = 0; i < global.localStorage.length; i++) {
        var key = global.localStorage.key(i);
        if (!key) continue;
        if (key.indexOf("planner.") === 0) continue;
        if (/^(tick-|chain-|tax|gift-|compass-|savings-)/.test(key)) {
          legacy[key] = global.localStorage.getItem(key);
        }
      }
    } catch (e) {}
    out._legacy = legacy;
    return out;
  }

  function importAll(data) {
    if (!data || typeof data !== "object") return { ok: false, reason: "not an object" };
    var restored = 0;
    Object.keys(KEYS).forEach(function (k) {
      var key = KEYS[k];
      if (key in data && data[key] != null) {
        try { global.localStorage.setItem(key, JSON.stringify(data[key])); restored++; }
        catch (e) {}
      }
    });
    if (data._legacy && typeof data._legacy === "object") {
      Object.keys(data._legacy).forEach(function (key) {
        try { global.localStorage.setItem(key, data._legacy[key]); restored++; }
        catch (e) {}
      });
    }
    return { ok: true, restored: restored };
  }

  function resetAll() {
    var count = 0;
    Object.keys(KEYS).forEach(function (k) {
      if (remove(KEYS[k])) count++;
    });
    // Reset legacy planner keys too.
    try {
      var doomed = [];
      for (var i = 0; i < global.localStorage.length; i++) {
        var key = global.localStorage.key(i);
        if (key && /^(tick-|chain-|tax|gift-|compass-|savings-)/.test(key)) doomed.push(key);
      }
      doomed.forEach(function (key) { global.localStorage.removeItem(key); count++; });
    } catch (e) {}
    return count;
  }

  var Store = {
    VERSION: VERSION,
    KEYS: KEYS,
    read: read,
    write: write,
    remove: remove,
    getPractice: getPractice,
    setPractice: setPractice,
    getSpending: getSpending,
    setSpending: setSpending,
    getTasks: getTasks,
    setTasks: setTasks,
    migrate: migrate,
    exportAll: exportAll,
    importAll: importAll,
    resetAll: resetAll
  };

  global.Store = Store;
})(window);
