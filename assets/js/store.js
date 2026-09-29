/* ============================================================
   store.js — namespaced, versioned localStorage helpers.
   Every read and write is wrapped in try/catch so the pages
   render correctly with empty or corrupt storage.
   ============================================================ */
(function (global) {
  "use strict";

  var SCHEMA_VERSION = 1;
  var PREFIX = "planner.";
  var NAMESPACES = ["practice", "spending", "tasks"];

  function key(ns) { return PREFIX + ns; }

  function safe(fn, fallback) {
    try { return fn(); } catch (e) { return fallback; }
  }

  function get(ns, defaults) {
    return safe(function () {
      var raw = localStorage.getItem(key(ns));
      if (raw === null || raw === undefined) return defaults;
      var parsed = JSON.parse(raw);
      // Accept both the versioned envelope and a bare object.
      if (parsed && typeof parsed === "object" && "data" in parsed && "v" in parsed) {
        return merge(defaults, parsed.data);
      }
      return merge(defaults, parsed);
    }, defaults);
  }

  function set(ns, data) {
    return safe(function () {
      localStorage.setItem(key(ns), JSON.stringify({ v: SCHEMA_VERSION, data: data }));
      return true;
    }, false);
  }

  function remove(ns) {
    return safe(function () {
      localStorage.removeItem(key(ns));
      return true;
    }, false);
  }

  function isPlainObj(v) {
    return !!v && typeof v === "object" && !Array.isArray(v);
  }

  // Merge stored data over the defaults: data wins, except a null/undefined
  // stored value is treated as absent, and nested plain objects are merged so a
  // corrupt `{"weeks": null}` can't wipe out the default container.
  function merge(defaults, data) {
    if (!isPlainObj(defaults)) return data == null ? defaults : data;
    if (!isPlainObj(data)) return defaults;
    var out = {};
    var k;
    for (k in defaults) out[k] = defaults[k];
    for (k in data) {
      var v = data[k];
      if (v === null || v === undefined) continue;
      if (isPlainObj(out[k]) && isPlainObj(v)) out[k] = merge(out[k], v);
      else out[k] = v;
    }
    return out;
  }

  // One JSON payload for the whole app, plus the legacy tracker key.
  function exportAll() {
    var payload = { version: SCHEMA_VERSION, namespaces: {}, legacy: null };
    NAMESPACES.forEach(function (ns) {
      payload.namespaces[ns] = safe(function () {
        var raw = localStorage.getItem(key(ns));
        return raw === null ? null : JSON.parse(raw);
      }, null);
    });
    payload.legacy = safe(function () {
      var legacy = localStorage.getItem("weekly-check-v1");
      return legacy === null ? null : JSON.parse(legacy);
    }, null);
    return payload;
  }

  function importAll(payload) {
    if (!payload || typeof payload !== "object") return false;
    return safe(function () {
      if (payload.namespaces && typeof payload.namespaces === "object") {
        Object.keys(payload.namespaces).forEach(function (ns) {
          var v = payload.namespaces[ns];
          if (v === null || v === undefined) localStorage.removeItem(key(ns));
          else localStorage.setItem(key(ns), JSON.stringify(v));
        });
      }
      if (payload.legacy !== undefined) {
        if (payload.legacy === null) localStorage.removeItem("weekly-check-v1");
        else localStorage.setItem("weekly-check-v1", JSON.stringify(payload.legacy));
      }
      return true;
    }, false);
  }

  function resetAll() {
    return safe(function () {
      NAMESPACES.forEach(function (ns) { localStorage.removeItem(key(ns)); });
      localStorage.removeItem("weekly-check-v1");
      return true;
    }, false);
  }

  global.Store = {
    get: get,
    set: set,
    remove: remove,
    exportAll: exportAll,
    importAll: importAll,
    resetAll: resetAll,
    namespaces: NAMESPACES,
    prefix: PREFIX,
    schemaVersion: SCHEMA_VERSION
  };
})(window);
