/* ── nav.js — site navigation + theme ─────────────────────────────────
   Renders the shared tab bar (bottom on mobile, top on desktop) and
   applies the stored light/dark theme. Current page is marked active
   from <body data-page="…">.
--------------------------------------------------------------------- */
(function (global) {
  "use strict";

  var PAGES = [
    { key: "today",    href: "index.html",     label: "Today",    icon: "🏠" },
    { key: "plan",     href: "plan.html",      label: "Plan",     icon: "📅" },
    { key: "practice", href: "practice.html",  label: "Practice", icon: "🎹" },
    { key: "spending", href: "spending.html",  label: "Spending", icon: "💰" },
    { key: "more",     href: "more.html",      label: "More",     icon: "⚙️" }
  ];

  function currentPage() {
    var p = document.body.getAttribute("data-page") || "";
    return p;
  }

  function renderNav() {
    var mount = document.getElementById("site-nav-mount");
    if (!mount) {
      mount = document.createElement("nav");
      document.body.appendChild(mount);
    }
    mount.className = "site-nav";
    mount.setAttribute("aria-label", "Primary");

    var cur = currentPage();
    var html = "";
    PAGES.forEach(function (p) {
      var active = p.key === cur ? " active" : "";
      html += '<a class="site-nav-item' + active + '" href="' + p.href + '"'
        + (active ? ' aria-current="page"' : "")
        + '><span class="site-nav-ic">' + p.icon + '</span><span>' + p.label + '</span></a>';
    });
    mount.innerHTML = html;
  }

  /* ── Theme ── */
  function applyTheme() {
    var mode = "auto";
    try { mode = global.localStorage.getItem("planner.theme") || "auto"; } catch (e) {}
    var root = document.documentElement;
    if (mode === "light" || mode === "dark") {
      root.setAttribute("data-theme", mode);
    } else {
      root.removeAttribute("data-theme");
    }
  }

  global.setTheme = function (mode) {
    try { global.localStorage.setItem("planner.theme", mode || "auto"); } catch (e) {}
    applyTheme();
  };
  global.getTheme = function () {
    try { return global.localStorage.getItem("planner.theme") || "auto"; } catch (e) { return "auto"; }
  };

  function boot() {
    applyTheme();
    renderNav();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(window);
