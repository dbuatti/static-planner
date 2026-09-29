/* ============================================================
   practice.js — practice domain model on top of store.js.
   Namespace: planner.practice.
    Shape: { weeks: { "<mondayISO>": { sit:[7], pno:[7], tech:[7], piece:[7], free:[7], focusTech:"", focusPiece:"" } }, minMode:bool }
    Note: `tech`/`piece` are per-day tick arrays; the focus text fields live
    in `focusTech`/`focusPiece` (the legacy weekly-check-v1 shape used plain
    strings for tech/piece, so migrate() moves them across).
   Migrates the legacy weekly-check-v1 "practice" field if present.
   ============================================================ */
(function (global) {
  "use strict";

  var NS = "practice";
  var DEFAULTS = { weeks: {}, minMode: false };

  var LEGACY_KEY = "weekly-check-v1";

  var KINDS = ["sit", "pno", "tech", "piece", "free"];

  function migrate() {
    try {
      if (localStorage.getItem("planner.practice")) return;
      var raw = JSON.parse(localStorage.getItem(LEGACY_KEY) || "null");
      if (raw && raw.practice && typeof raw.practice === "object") {
        var data = Store.get(NS, DEFAULTS);
        data.weeks = {};
        Object.keys(raw.practice).forEach(function (k) {
          data.weeks[k] = normaliseWeek(raw.practice[k]);
        });
        Store.set(NS, data);
      }
    } catch (e) {}
  }

  function emptyWeek() {
    return { sit: [0, 0, 0, 0, 0, 0, 0], pno: [0, 0, 0, 0, 0, 0, 0], tech: [0, 0, 0, 0, 0, 0, 0], piece: [0, 0, 0, 0, 0, 0, 0], free: [0, 0, 0, 0, 0, 0, 0], focusTech: "", focusPiece: "" };
  }

  // Legacy weeks stored tech/piece as focus text strings; move them to
  // focusTech/focusPiece and give every kind a clean 7-slot array.
  function normaliseWeek(w) {
    var out = emptyWeek();
    if (!w || typeof w !== "object") return out;
    KINDS.forEach(function (kind) {
      if (Array.isArray(w[kind])) {
        for (var i = 0; i < 7; i++) out[kind][i] = w[kind][i] ? 1 : 0;
      }
    });
    if (typeof w.tech === "string") { out.focusTech = w.tech; out.tech = [0, 0, 0, 0, 0, 0, 0]; }
    if (typeof w.piece === "string") { out.focusPiece = w.piece; out.piece = [0, 0, 0, 0, 0, 0, 0]; }
    if (typeof w.focusTech === "string") out.focusTech = w.focusTech;
    if (typeof w.focusPiece === "string") out.focusPiece = w.focusPiece;
    return out;
  }

  function getWeek(mondayISO) {
    var data = Store.get(NS, DEFAULTS);
    var w = data.weeks[mondayISO];
    return w ? normaliseWeek(w) : emptyWeek();
  }

  function setWeek(mondayISO, week) {
    var data = Store.get(NS, DEFAULTS);
    data.weeks[mondayISO] = week;
    Store.set(NS, data);
  }

  function toggle(day, kind, mondayISO) {
    if (KINDS.indexOf(kind) === -1) return;
    var w = getWeek(mondayISO);
    var arr = w[kind].slice();
    arr[day] = arr[day] ? 0 : 1;
    w[kind] = arr;
    setWeek(mondayISO, w);
  }

  function getMinMode() {
    return !!Store.get(NS, DEFAULTS).minMode;
  }

  function setMinMode(v) {
    var data = Store.get(NS, DEFAULTS);
    data.minMode = !!v;
    Store.set(NS, data);
  }

  // Consecutive days (ending today) where both sit and piano are done.
  function streak() {
    var iso = Helpers.melbNowISO();
    var n = 0;
    while (true) {
      var m = Helpers.mondayISO(iso);
      var idx = (Helpers.weekdayOf(iso) + 6) % 7;
      var w = getWeek(m);
      if (w.sit[idx] && w.pno[idx]) { n++; }
      else break;
      iso = Helpers.addDaysISO(iso, -1);
      if (n > 3650) break;
    }
    return n;
  }

  // Days (0-7) this week where both sit and piano are done.
  function weekDoneCount(mondayISO) {
    var w = getWeek(mondayISO);
    var c = 0;
    for (var i = 0; i < 7; i++) if (w.sit[i] && w.pno[i]) c++;
    return c;
  }

  // Array of {monday, done} for the last N weeks (oldest first).
  function history(n) {
    var thisMon = Helpers.mondayISO(Helpers.melbNowISO());
    var out = [];
    for (var j = n - 1; j >= 0; j--) {
      var m = Helpers.addDaysISO(thisMon, -7 * j);
      out.push({ monday: m, done: weekDoneCount(m) });
    }
    return out;
  }

  global.Practice = {
    NS: NS,
    migrate: migrate,
    getWeek: getWeek,
    setWeek: setWeek,
    toggle: toggle,
    getMinMode: getMinMode,
    setMinMode: setMinMode,
    streak: streak,
    weekDoneCount: weekDoneCount,
    history: history
  };
})(window);
