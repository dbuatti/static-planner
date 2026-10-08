/* ============================================================
   helpers.js — Melbourne-time date helpers, week logic, money.
   Weeks start Monday. Dates are plain YYYY-MM-DD strings, so
   arithmetic is timezone-safe; only "what is today" uses the
   Australia/Melbourne zone.
   ============================================================ */
(function (global) {
  "use strict";

  var WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var WD_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function pad(n) { return String(n).padStart(2, "0"); }

  function isoFromDate(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  // Today's date in Melbourne (YYYY-MM-DD).
  function melbNowISO() {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Australia/Melbourne",
        year: "numeric", month: "2-digit", day: "2-digit"
      }).format(new Date());
    } catch (e) {
      return isoFromDate(new Date());
    }
  }

  // Weekday index (0=Sunday..6=Saturday) of "today" in Melbourne.
  function melbWeekday() {
    try {
      var wd = new Intl.DateTimeFormat("en-AU", {
        timeZone: "Australia/Melbourne", weekday: "short"
      }).format(new Date());
      return WD.indexOf(wd);
    } catch (e) {
      return new Date().getDay();
    }
  }

  function weekdayOf(iso) {
    return new Date(iso + "T00:00:00").getDay();
  }

  function addDaysISO(iso, n) {
    var d = new Date(iso + "T00:00:00");
    d.setDate(d.getDate() + n);
    return isoFromDate(d);
  }

  // Monday ISO of the week containing the given ISO date.
  function mondayISO(iso) {
    var d = new Date(iso + "T00:00:00");
    var k = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - k);
    return isoFromDate(d);
  }

  function money(n) {
    return "$" + (Math.round(n * 100) / 100).toLocaleString("en-AU", {
      minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2
    });
  }

  function money0(n) {
    return "$" + Math.round(n).toLocaleString("en-AU");
  }

  // Stable, content-based tick id so a task ticked ahead of its day keeps the
  // SAME id once the day arrives — positional counters shift when recurring
  // events (allowance, money date, Q&A) appear/disappear. Explicit `tid`
  // fields are preserved verbatim (past archived days rely on them).
  function stableTickId(dayId, ev) {
    if (ev.tid !== undefined) return dayId + "-t" + ev.tid;
    var s = "";
    var p = String(ev.time || "").trim().split(/[–\-]/);
    if (p[0]) {
      var c = p[0].trim().split(":");
      if (c.length >= 2) s += (parseInt(c[0], 10) * 60 + parseInt(c[1], 10)) + "x";
    }
    var t = String(ev.text || "").toLowerCase();
    var h = 0;
    for (var i = 0; i < t.length; i++) h = ((h << 5) - h + t.charCodeAt(i)) | 0;
    s += h < 0 ? -h : h;
    return dayId + "-t" + s;
  }

  global.Helpers = {
    WD: WD,
    isoFromDate: isoFromDate,
    melbNowISO: melbNowISO,
    melbWeekday: melbWeekday,
    weekdayOf: weekdayOf,
    addDaysISO: addDaysISO,
    mondayISO: mondayISO,
    money: money,
    money0: money0,
    stableTickId: stableTickId
  };
})(window);
