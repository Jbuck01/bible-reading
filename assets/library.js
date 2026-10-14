// library.js — library page. Reads the manifest attached to window.ReadingPlans
// and renders one card per plan. No fetch, so it works from file://.
(function () {
  "use strict";

  var S = window.ReadingPlans.storage;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }

  var container = document.getElementById("library");
  var notice = document.getElementById("storage-notice");

  if (!S.storageAvailable() && notice) {
    notice.hidden = false;
    notice.textContent = "Storage is unavailable in this browser, so progress won't be saved.";
  }

  var manifest = window.ReadingPlans.manifest;
  if (!manifest || !Array.isArray(manifest.plans)) {
    container.innerHTML = '<div class="empty">Couldn’t load the plan library.</div>';
    return;
  }

  var plans = manifest.plans;
  if (!plans.length) {
    container.innerHTML = '<div class="empty">No plans yet.</div>';
    return;
  }

  var startedList = S.listStartedPlans();
  var started = {};
  for (var i = 0; i < startedList.length; i++) started[startedList[i].planId] = startedList[i].doneCount;

  var html = plans.map(function (entry) {
    var core = Number.isFinite(entry.chapters) ? entry.chapters : 0;
    var optional = Number.isFinite(entry.optionalChapters) ? entry.optionalChapters : 0;
    var done = started[entry.id] || 0;
    var pct = core && done ? Math.min(100, Math.round(done / core * 100)) : 0;
    var metaBits = [];
    if (core) metaBits.push(core + " chapters" + (optional ? " (+" + optional + " optional)" : ""));
    if (entry.id in started) {
      metaBits.push('<span class="pct">' + done + " read · " + pct + "%</span>");
    }
    return '<a class="plan-card" href="plan.html?id=' + encodeURIComponent(entry.id) + '">' +
      '<h2>' + esc(entry.title) + '</h2>' +
      (entry.summary ? '<p class="summary">' + esc(entry.summary) + '</p>' : '') +
      (metaBits.length ? '<p class="meta">' + metaBits.join('<span aria-hidden="true"> · </span>') + '</p>' : '') +
      '</a>';
  }).join("");

  container.innerHTML = html;
})();
