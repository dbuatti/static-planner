const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// Minimal in-memory localStorage shim for store.js.
function makeStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    key: (i) => { const ks = Array.from(m.keys()); return i < ks.length ? ks[i] : null; },
    get length() { return m.size; },
    clear: () => { m.clear(); },
  };
}

global.window = global;
global.localStorage = makeStorage();
vm.runInThisContext(
  fs.readFileSync(path.join(__dirname, "../assets/js/store.js"), "utf8"),
  { filename: "store.js" }
);
const Store = global.Store;

test("get returns defaults when nothing is stored", () => {
  assert.deepStrictEqual(Store.get("practice", { weeks: {} }), { weeks: {} });
});

test("set/get round-trips", () => {
  assert.strictEqual(Store.set("practice", { weeks: { w1: { sit: 3 } } }), true);
  assert.deepStrictEqual(Store.get("practice", {}), { weeks: { w1: { sit: 3 } } });
});

test("a null stored value does not wipe the default container", () => {
  Store.set("practice", { weeks: null });
  assert.deepStrictEqual(Store.get("practice", { weeks: {} }), { weeks: {} });
});

test("remove clears a namespace", () => {
  Store.set("spending", { total: 5 });
  assert.strictEqual(Store.remove("spending"), true);
  assert.deepStrictEqual(Store.get("spending", { total: 0 }), { total: 0 });
});

test("export/import round-trips namespaces", () => {
  Store.set("tasks", { ticks: { a: "1" } });
  const snap = Store.exportAll();
  Store.resetAll();
  assert.deepStrictEqual(Store.get("tasks", {}), {});
  assert.strictEqual(Store.importAll(snap), true);
  assert.deepStrictEqual(Store.get("tasks", {}), { ticks: { a: "1" } });
});

test("resetAll clears namespaces", () => {
  Store.set("practice", { weeks: { w1: 1 } });
  Store.resetAll();
  assert.deepStrictEqual(Store.get("practice", {}), {});
});
