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

  global.Helpers = {
    WD: WD,
    isoFromDate: isoFromDate,
    melbNowISO: melbNowISO,
    melbWeekday: melbWeekday,
    weekdayOf: weekdayOf,
    addDaysISO: addDaysISO,
    mondayISO: mondayISO,
    money: money,
    money0: money0
  };
})(window);
