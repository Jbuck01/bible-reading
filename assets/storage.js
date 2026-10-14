// storage.js — the only module in the site that touches localStorage.
// Classic script (no ES modules) so it loads from file:// without CORS.
// Attaches its API to window.ReadingPlans.storage.
(function () {
  "use strict";

  var NS = window.ReadingPlans = window.ReadingPlans || {};

  var PROGRESS_PREFIX = "readingPlans:v1:progress:";
  var UI_KEY = "readingPlans:v1:ui";
  var KNOWN_VERSIONS = ["NKJV", "KJV", "NASB", "ESV", "CSB", "NIV", "NLT"];
  var MAX = { weekday: 15, weekend: 40 };

  var _available = null;
  function storageAvailable() {
    if (_available !== null) return _available;
    try {
      var k = "__rp_probe__";
      localStorage.setItem(k, "1");
      localStorage.removeItem(k);
      _available = true;
    } catch (e) {
      _available = false;
    }
    return _available;
  }

  function todayIso() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function clampInt(n, lo, hi) {
    if (!Number.isFinite(n)) return null;
    return Math.max(lo, Math.min(hi, Math.round(n)));
  }

  function validKeySet(plan) {
    var s = new Set();
    if (plan && Array.isArray(plan.books)) {
      for (var i = 0; i < plan.books.length; i++) {
        var b = plan.books[i];
        for (var j = 1; j <= b.chapters; j++) s.add(b.id + "-" + j);
      }
    }
    return s;
  }

  function defaultProgress(plan) {
    var def = (plan && plan.defaults) || {};
    var weekday = clampInt(def.weekday, 0, MAX.weekday);
    if (weekday === null) weekday = 2;
    var weekend = clampInt(def.weekend, 0, MAX.weekend);
    if (weekend === null) weekend = 6;
    var version = KNOWN_VERSIONS.indexOf(def.version) >= 0 ? def.version : "NKJV";
    var optional = {};
    if (plan && Array.isArray(plan.books)) {
      for (var i = 0; i < plan.books.length; i++) {
        var b = plan.books[i];
        if (b.optional) optional[b.id] = false;
      }
    }
    return { schemaVersion: 1, done: {}, weekday: weekday, weekend: weekend, optional: optional, version: version, startedAt: todayIso() };
  }

  function normalize(raw, plan) {
    var base = defaultProgress(plan);
    if (!raw || typeof raw !== "object") return base;
    var out = {
      schemaVersion: 1,
      done: {},
      weekday: base.weekday,
      weekend: base.weekend,
      optional: Object.assign({}, base.optional),
      version: base.version,
      startedAt: base.startedAt
    };
    var valid = validKeySet(plan);
    var checkKeys = valid.size > 0;
    if (raw.done && typeof raw.done === "object") {
      for (var k in raw.done) {
        if (!Object.prototype.hasOwnProperty.call(raw.done, k)) continue;
        var v = raw.done[k];
        if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) continue;
        if (checkKeys && !valid.has(k)) continue;
        out.done[k] = v;
      }
    }
    var wd = clampInt(raw.weekday, 0, MAX.weekday);
    if (wd !== null) out.weekday = wd;
    var we = clampInt(raw.weekend, 0, MAX.weekend);
    if (we !== null) out.weekend = we;
    if (raw.optional && typeof raw.optional === "object") {
      for (var id in out.optional) {
        if (id in raw.optional) out.optional[id] = !!raw.optional[id];
      }
    }
    if (raw.version && KNOWN_VERSIONS.indexOf(raw.version) >= 0) out.version = raw.version;
    if (typeof raw.startedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.startedAt)) {
      out.startedAt = raw.startedAt;
    }
    return out;
  }

  function loadProgress(planId, plan) {
    if (!storageAvailable()) return null;
    var raw = null;
    try { raw = localStorage.getItem(PROGRESS_PREFIX + planId); } catch (e) { return null; }
    if (!raw) return null;
    var parsed;
    try { parsed = JSON.parse(raw); } catch (e) { return null; }
    return normalize(parsed, plan);
  }

  var saveTimers = new Map();
  function saveProgress(planId, data) {
    if (!storageAvailable()) return;
    if (saveTimers.has(planId)) clearTimeout(saveTimers.get(planId));
    var t = setTimeout(function () {
      saveTimers.delete(planId);
      try { localStorage.setItem(PROGRESS_PREFIX + planId, JSON.stringify(data)); } catch (e) {}
    }, 300);
    saveTimers.set(planId, t);
  }

  function listStartedPlans() {
    if (!storageAvailable()) return [];
    var out = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k || k.indexOf(PROGRESS_PREFIX) !== 0) continue;
        var planId = k.slice(PROGRESS_PREFIX.length);
        var doneCount = 0;
        try {
          var parsed = JSON.parse(localStorage.getItem(k));
          if (parsed && parsed.done && typeof parsed.done === "object") {
            doneCount = Object.keys(parsed.done).length;
          }
        } catch (e) {}
        out.push({ planId: planId, doneCount: doneCount });
      }
    } catch (e) {}
    return out;
  }

  function loadUi() {
    if (!storageAvailable()) return {};
    try {
      var raw = localStorage.getItem(UI_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      return (parsed && typeof parsed === "object") ? parsed : {};
    } catch (e) { return {}; }
  }

  var uiTimer = { id: null };
  function saveUi(ui) {
    if (!storageAvailable()) return;
    if (uiTimer.id) clearTimeout(uiTimer.id);
    uiTimer.id = setTimeout(function () {
      uiTimer.id = null;
      try { localStorage.setItem(UI_KEY, JSON.stringify(ui)); } catch (e) {}
    }, 300);
  }

  NS.storage = {
    loadProgress: loadProgress,
    saveProgress: saveProgress,
    listStartedPlans: listStartedPlans,
    storageAvailable: storageAvailable,
    defaultProgress: defaultProgress,
    normalize: normalize,
    loadUi: loadUi,
    saveUi: saveUi,
    constants: { KNOWN_VERSIONS: KNOWN_VERSIONS.slice(), MAX: MAX }
  };
})();
