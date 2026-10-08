/* ============================================================
   nav.js — injects the cross-site tab bar and marks the active page.
   The bar is fixed to the bottom on mobile, top on desktop.
   ============================================================ */
(function () {
  "use strict";

  // Apply a persisted theme override (light / dark / auto) before painting.
  (function applyTheme() {
    var v = "auto";
    try { v = localStorage.getItem("planner.theme") || "auto"; } catch (e) {}
    if (v === "light" || v === "dark") document.documentElement.setAttribute("data-theme", v);
    else document.documentElement.removeAttribute("data-theme");
  })();

  // Register the offline service worker (network-first, see sw.js).
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }

  // Pages that have their own full tab bar skip the shared site-nav.
  if (window.__noSiteNav || document.body.classList.contains("no-site-nav")) return;

  var PAGES = [
    { slug: "index", label: "Today", ic: "📅" },
    { slug: "plan", label: "Plan", ic: "📋" },
    { slug: "practice", label: "Practice", ic: "🧘" },
    { slug: "spending", label: "Spending", ic: "💰" },
    { slug: "more", label: "More", ic: "⚙" }
  ];

  // Figure out which page we are on from the path.
  function currentSlug() {
    var path = window.location.pathname;
    if (path === "/" || /\/index\.html?$/i.test(path)) return "index";
    var m = path.match(/[^/\\]+(?=\.html?$)/i);
    if (m) return m[0].toLowerCase();
    return "";
  }

  var cur = currentSlug();

  var nav = document.createElement("nav");
  nav.className = "site-nav";
  nav.setAttribute("aria-label", "Primary");

  var html = "";
  PAGES.forEach(function (p) {
    var isCurrent = p.slug === cur;
    html += '<a href="' + (p.slug === "index" ? "index.html" : p.slug + ".html") + '"'
         + (isCurrent ? ' aria-current="page"' : "")
         + '><span class="ic">' + p.ic + '</span><span>' + p.label + '</span></a>';
  });
  nav.innerHTML = html;

  document.body.appendChild(nav);
  document.body.classList.add("has-site-nav");
})();
