const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// helpers.js is an IIFE that attaches to `window`; in Node we point `window`
// at the global object so `window.Helpers` lands on `global`.
global.window = global;
vm.runInThisContext(
  fs.readFileSync(path.join(__dirname, "../assets/js/helpers.js"), "utf8"),
  { filename: "helpers.js" }
);
const Helpers = global.Helpers;

test("isoFromDate pads month and day", () => {
  assert.strictEqual(Helpers.isoFromDate(new Date(2026, 0, 5)), "2026-01-05");
});

test("weekdayOf returns 0=Sunday..6=Saturday", () => {
  assert.strictEqual(Helpers.weekdayOf("2026-10-09"), 5); // Friday
  assert.strictEqual(Helpers.weekdayOf("2026-10-11"), 0); // Sunday
});

test("addDaysISO crosses month boundaries", () => {
  assert.strictEqual(Helpers.addDaysISO("2026-10-09", 3), "2026-10-12");
  assert.strictEqual(Helpers.addDaysISO("2026-03-31", 1), "2026-04-01");
});

test("mondayISO finds the Monday of the week", () => {
  assert.strictEqual(Helpers.mondayISO("2026-10-09"), "2026-10-05"); // Fri -> Mon
  assert.strictEqual(Helpers.mondayISO("2026-10-12"), "2026-10-12"); // Mon stays
});

test("money/money0 format Australian amounts", () => {
  assert.strictEqual(Helpers.money(12.5), "$12.50");
  assert.strictEqual(Helpers.money(12), "$12");
  assert.strictEqual(Helpers.money0(1234), "$1,234");
});

test("melbNowISO returns a valid date string", () => {
  assert.match(Helpers.melbNowISO(), /^\d{4}-\d{2}-\d{2}$/);
});

test("melbWeekday returns a value in 0..6", () => {
  const wd = Helpers.melbWeekday();
  assert.ok(wd >= 0 && wd <= 6);
});

test("stableTickId is deterministic and time+text based", () => {
  const a = Helpers.stableTickId("d1", { time: "09:00–10:00", text: "Pay gas" });
  const b = Helpers.stableTickId("d1", { time: "09:00–10:00", text: "Pay gas" });
  const c = Helpers.stableTickId("d1", { time: "10:00–11:00", text: "Pay gas" });
  assert.strictEqual(a, b);
  assert.notStrictEqual(a, c);
  assert.ok(a.startsWith("d1-t"));
});

test("stableTickId honours an explicit tid", () => {
  assert.strictEqual(
    Helpers.stableTickId("d1", { tid: 7, time: "09:00–10:00", text: "x" }),
    "d1-t7"
  );
});
