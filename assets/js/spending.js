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
  function save(data) { Store.set(NS, data); }

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
    setWeek: setWeek
  };
})(window);
