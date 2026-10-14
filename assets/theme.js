// theme.js — manual theme toggle. Three states, cycled on click:
//   auto   → follow prefers-color-scheme (no data-theme attr)
//   light  → force light (data-theme="light")
//   dark   → force dark  (data-theme="dark")
// Persists the preference through window.ReadingPlans.storage so this
// stays the only place with localStorage knowledge (except for the tiny
// inline <head> script that applies the saved theme pre-paint).
(function () {
  "use strict";

  var S = window.ReadingPlans.storage;

  var ORDER = ["auto", "light", "dark"];
  var ICONS = { auto: "◐", light: "☀", dark: "☾" };
  var LABELS = {
    auto: "Theme: auto (follows your system) — click to change",
    light: "Theme: light — click to change",
    dark: "Theme: dark — click to change"
  };

  function currentPref() {
    var ui = S.loadUi();
    return (ui.theme === "light" || ui.theme === "dark") ? ui.theme : "auto";
  }

  function apply(pref) {
    if (pref === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", pref);
    var ui = S.loadUi();
    if (pref === "auto") delete ui.theme;
    else ui.theme = pref;
    S.saveUi(ui);
  }

  function render(pref, btn) {
    btn.textContent = ICONS[pref];
    btn.setAttribute("aria-label", LABELS[pref]);
    btn.title = LABELS[pref];
  }

  function install() {
    if (document.getElementById("theme-toggle")) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "theme-toggle";
    btn.className = "theme-toggle toolbar-btn";
    btn.addEventListener("click", function () {
      var cur = currentPref();
      var next = ORDER[(ORDER.indexOf(cur) + 1) % ORDER.length];
      apply(next);
      render(next, btn);
    });
    var toolbar = document.getElementById("ui-toolbar");
    (toolbar || document.body).appendChild(btn);
    render(currentPref(), btn);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install);
  } else {
    install();
  }
})();
