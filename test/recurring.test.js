const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// recurring.js reads `new Date()` for "today". Pin it so the test is
// deterministic regardless of when it runs.
const RealDate = Date;
class FixedDate extends RealDate {
  constructor(...args) {
    if (args.length === 0) super("2026-10-09T00:00:00");
    else super(...args);
  }
  static now() { return new RealDate("2026-10-09T00:00:00").getTime(); }
}

const src = fs.readFileSync(path.join(__dirname, "../assets/js/recurring.js"), "utf8");
const sandbox = { DAYS: [], Date: FixedDate };
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: "recurring.js" });
sandbox.populateRecurring();
const DAYS = sandbox.DAYS;

test("populates a non-empty, sorted DAYS list with no duplicate dates", () => {
  assert.ok(DAYS.length > 0);
  const ids = DAYS.map((d) => d.dateISO);
  assert.strictEqual(new Set(ids).size, ids.length);
  for (let i = 1; i < ids.length; i++) {
    assert.ok(ids[i - 1] < ids[i], "DAYS is sorted by dateISO");
  }
});

test("adds the recurring anchors (allowance, Q&A, sleep, mastery)", () => {
  const texts = DAYS.flatMap((d) => (d.events || []).map((e) => e.text));
  assert.ok(texts.some((t) => /Allowance transfer/.test(t)));
  assert.ok(texts.some((t) => /Weekly Q&A/.test(t)));
  assert.ok(texts.some((t) => /Mastery Catch Up/.test(t)));
  assert.ok(DAYS.some((d) => d.focus && d.focus.indexOf("🛌 Sleep 10pm") !== -1));
});
