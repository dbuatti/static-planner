/* ============================================================
   spending.js — faithful port of "My week" tracker logic.
   Namespace: planner.spending.
   Migrates weekly-check-v1 if present.
   ============================================================ */
(function (global) {
  "use strict";

  var NS = "spending";
  var DEFAULT_PLAN = { cafeN: 4, cafeP: 5.5, homeP: 1, mealN: 2, mealP: 21, groc: 85, fun: 28 };

  var LEGACY_KEY = "weekly-check-v1";

  function migrate() {
    try {
      if (localStorage.getItem("planner.spending")) return;
      var raw = JSON.parse(localStorage.getItem(LEGACY_KEY) || "null");
      if (raw && typeof raw === "object") {
        var plan = Object.assign({}, DEFAULT_PLAN, raw.plan || {});
        var weeks = raw.weeks || {};
        Store.set(NS, { plan: plan, weeks: weeks });
      }
    } catch (e) {}
  }

  var DEFAULTS = { plan: Object.assign({}, DEFAULT_PLAN), weeks: {} };

  function getData() { return Store.get(NS, DEFAULTS); }

  // ---- backend whole-state backup -----------------------------------
  // Local storage stays authoritative while editing; saves are uploaded
  // (debounced, silent) as a last-write-wins snapshot. A fresh device with
  // no local copy pulls the remote snapshot once on load.
  var SPEND_API = "https://planner-api.daniele-buatti.workers.dev";
  var PUSH_DEBOUNCE_MS = 1500;
  var pushTimer = null;
  var pushData = null;
  var pushing = false;

  function doPush() {
    if (!pushData) return;
    var body = pushData;
    pushData = null;
    pushing = true;
    fetch(SPEND_API + "/spending", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: body })
    }).catch(function () {
      // silent: the next save() re-arms the backup
    }).finally(function () {
      pushing = false;
      if (pushData) schedulePush();
    });
  }

  function schedulePush(data) {
    pushData = data;
    if (!pushTimer) {
      pushTimer = setTimeout(function () { pushTimer = null; doPush(); }, PUSH_DEBOUNCE_MS);
    }
  }

  function pull() {
    // Adopt the remote snapshot only on a device that has never saved locally,
    // and only if the user hasn't started editing while the fetch was in flight.
    var hasLocal = false;
    try { hasLocal = localStorage.getItem("planner.spending") !== null; }
    catch (e) { hasLocal = true; }
    if (hasLocal) return Promise.resolve(false);
    return fetch(SPEND_API + "/spending")
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var state = j && j.ok && j.state;
        if (!state || typeof state !== "object") return false;
        try { if (localStorage.getItem("planner.spending") !== null) return false; }
        catch (e) { return false; }
        Store.set(NS, state);
        setTimeout(function () { window.dispatchEvent(new Event("planner:spending-restore")); }, 0);
        return true;
      })
      .catch(function () { return false; });
  }

  function save(data) {
    Store.set(NS, data);
    schedulePush(data);
  }

  function planTotal(p) {
    return (p.cafeN - 0.5) * p.cafeP + 7 * p.homeP + p.mealN * p.mealP + p.groc + p.fun;
  }

  function spent(w, p) {
    var g = (w.groc || []).reduce(function (a, b) { return a + b; }, 0);
    var f = (w.fun || []).reduce(function (a, b) { return a + b; }, 0);
    return {
      cafe: (w.cafe || 0) * (p.cafeP || 0),
      home: (w.home || 0) * (p.homeP || 0),
      meal: (w.meal || 0) * (p.mealP || 0),
      groc: g,
      fun: f,
      total: (w.cafe || 0) * (p.cafeP || 0) + (w.home || 0) * (p.homeP || 0) + (w.meal || 0) * (p.mealP || 0) + g + f
    };
  }

  function state(v, plan) { return v <= plan ? "ok" : v <= plan * 1.1 ? "warn" : "over"; }

  function week(k) {
    var data = getData();
    return data.weeks[k] || { cafe: 0, home: 0, meal: 0, groc: [], fun: [], feel: "", note: "" };
  }

  function setWeek(k, w) {
    var data = getData();
    data.weeks[k] = w;
    save(data);
  }

  global.Spending = {
    NS: NS,
    DEFAULT_PLAN: DEFAULT_PLAN,
    migrate: migrate,
    getData: getData,
    save: save,
    planTotal: planTotal,
    spent: spent,
    state: state,
    week: week,
    setWeek: setWeek,
    pull: pull
  };

  // Pull the remote snapshot on load — after the page has run any legacy
  // migration, so an adopted snapshot never masks migrated local data.
  if (window.addEventListener) {
    window.addEventListener("load", function () { pull(); });
  } else {
    pull();
  }
})(window);
