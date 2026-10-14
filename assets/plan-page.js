// plan-page.js — plan page controller. Reads ?id=, validates against the manifest,
// dynamically loads the plan's JS file, and renders.
// Classic script: no ES modules, no fetch — works from file://.
(function () {
  "use strict";

  var S = window.ReadingPlans.storage;
  var Sch = window.ReadingPlans.schedule;

  var VERSIONS = S.constants.KNOWN_VERSIONS;
  var MAX = S.constants.MAX;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function $(id) { return document.getElementById(id); }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, Math.round(n))); }

  var root = $("root");

  function renderNotFound(message) {
    root.innerHTML =
      '<header class="hero"><p class="eyebrow">Reading plans</p>' +
      '<h1>Plan not found</h1>' +
      '<p class="lede">' + esc(message) + '</p>' +
      '<p><a class="link" href="index.html">← Back to all plans</a></p></header>';
  }

  function paramId() {
    try {
      var u = new URL(location.href);
      var id = u.searchParams.get("id");
      return typeof id === "string" ? id.trim() : "";
    } catch (e) { return ""; }
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error("Failed to load " + src)); };
      document.head.appendChild(s);
    });
  }

  function boot() {
    var id = paramId();
    if (!id) {
      renderNotFound("No plan was requested. Pick one from the library.");
      document.title = "Plan not found";
      return;
    }
    var manifest = window.ReadingPlans.manifest;
    if (!manifest || !Array.isArray(manifest.plans)) {
      renderNotFound("Couldn't load the plan library.");
      document.title = "Plan not found";
      return;
    }
    var entry = null;
    for (var i = 0; i < manifest.plans.length; i++) {
      if (manifest.plans[i].id === id) { entry = manifest.plans[i]; break; }
    }
    if (!entry) {
      renderNotFound("No plan has the id “" + id + "”. It may have been renamed or removed.");
      document.title = "Plan not found";
      return;
    }
    // Already loaded?
    var plans = window.ReadingPlans.plans || {};
    if (plans[id]) {
      document.title = plans[id].title;
      start(plans[id]);
      return;
    }
    loadScript(entry.file).then(function () {
      var plan = (window.ReadingPlans.plans || {})[id];
      if (!plan) {
        renderNotFound("The plan file loaded but didn't register plan “" + id + "”.");
        document.title = "Plan not found";
        return;
      }
      document.title = plan.title;
      start(plan);
    }, function () {
      renderNotFound("Couldn't load this plan's data. Check the file path and try again.");
      document.title = "Plan not found";
    });
  }

  function start(plan) {
    var ORDER = Sch.buildOrder(plan);
    var BY_KEY = {};
    for (var i = 0; i < ORDER.length; i++) BY_KEY[ORDER[i].key] = ORDER[i];
    var sectionById = {};
    var sectionList = plan.sections || [];
    for (var i2 = 0; i2 < sectionList.length; i2++) sectionById[sectionList[i2].id] = sectionList[i2];

    var state = S.loadProgress(plan.id, plan) || S.defaultProgress(plan);
    var ui = S.loadUi();
    var perPlanUi = (ui.plans && ui.plans[plan.id]) || {};
    var hashTab = (location.hash === "#books" || location.hash === "#plan") ? location.hash.slice(1) : null;
    var uiState = {
      tab: hashTab || (perPlanUi.tab === "books" ? "books" : "plan"),
      showAll: false
    };

    var titleHtml = esc(plan.title);
    var eyebrow = esc(plan.eyebrow || "");
    var lede = esc(plan.lede || "");
    root.innerHTML =
      '<header class="hero">' +
        '<p class="backlink"><a href="index.html">← All plans</a></p>' +
        (eyebrow ? '<p class="eyebrow">' + eyebrow + '</p>' : '') +
        '<h1>' + titleHtml + '</h1>' +
        (lede ? '<p class="lede">' + lede + '</p>' : '') +
        '<div class="timeline" id="timeline"></div>' +
        '<ul class="stats" id="stats"></ul>' +
      '</header>' +
      '<section class="pace" id="pace" aria-label="Reading pace"></section>' +
      '<p class="save" id="save" data-s="local" role="status"></p>' +
      '<nav class="tabs" role="tablist" aria-label="Views">' +
        '<button role="tab" id="tab-plan" data-action="tab" data-tab="plan" aria-controls="plan">Plan</button>' +
        '<button role="tab" id="tab-books" data-action="tab" data-tab="books" aria-controls="books">Books</button>' +
      '</nav>' +
      '<section class="panel" id="plan" role="tabpanel" aria-labelledby="tab-plan"></section>' +
      '<section class="panel" id="books" role="tabpanel" aria-labelledby="tab-books" hidden></section>';

    setStatus();

    var fmtDow = new Intl.DateTimeFormat(undefined, { weekday: "short" });
    var fmtMD = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
    var fmtLong = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });
    function fmtFinish(d) {
      var opts = { weekday: "short", month: "short", day: "numeric" };
      if (d.getFullYear() !== new Date().getFullYear()) opts.year = "numeric";
      return new Intl.DateTimeFormat(undefined, opts).format(d);
    }
    function fmtReadOn(isoStr) {
      var parts = isoStr.split("-").map(Number);
      return fmtMD.format(new Date(parts[0], parts[1] - 1, parts[2]));
    }

    function included(b) { return !b.optional || state.optional[b.id]; }
    function chaptersInPlan() { return ORDER.filter(function (c) { return included(c.book); }); }
    function readCount(b) {
      var n = 0;
      for (var i = 1; i <= b.chapters; i++) if (state.done[b.id + "-" + i]) n++;
      return n;
    }
    var hasAnyKey = plan.books.some(function (b) { return b.key && b.key.length > 0; });

    function schedule() {
      var remaining = chaptersInPlan().filter(function (c) { return !state.done[c.key]; });
      return Sch.buildSchedule({
        remaining: remaining,
        done: state.done,
        weekday: state.weekday,
        weekend: state.weekend
      });
    }

    function renderHero(sched) {
      var segs = "", prevSection = null;
      var aria = [];
      for (var i = 0; i < plan.books.length; i++) {
        var b = plan.books[i];
        if (!included(b)) continue;
        if (prevSection !== null && b.section !== prevSection) {
          var prev = sectionById[prevSection];
          if (prev && prev.gapAfter) {
            segs += '<div class="gap" title="' + esc(prev.gapAfter) + '"></div>';
          }
        }
        prevSection = b.section;
        var r = readCount(b), p = (r / b.chapters * 100).toFixed(1);
        aria.push(b.name + " " + r + " of " + b.chapters);
        segs += '<div class="seg' + (r === b.chapters ? " full" : "") + '" style="flex-grow:' + b.chapters + '" title="' + esc(b.name + ": " + r + " of " + b.chapters + " read") + '">' +
          '<span class="brick"><i style="width:' + p + '%"></i></span>' +
          '<span class="lab">' + esc(b.abbr) + '</span></div>';
      }
      var timeline = plan.timeline || {};
      var ends = (timeline.start || timeline.end)
        ? '<div class="ends"><span>' + esc(timeline.start || "") + '</span><span>' + esc(timeline.end || "") + '</span></div>'
        : "";
      $("timeline").innerHTML =
        '<div class="track" role="img" aria-label="' + esc("Progress by book: " + aria.join(", ")) + '">' + segs + '</div>' + ends;

      var all = chaptersInPlan(), total = all.length;
      var read = all.filter(function (c) { return state.done[c.key]; }).length;
      var pct = total ? Math.round(read / total * 100) : 0;
      var finish;
      if (!sched.remaining.length) finish = "Finished";
      else if (!sched.days) finish = "Set a pace";
      else finish = fmtFinish(sched.days[sched.days.length - 1].date);
      var keyLeft = sched.remaining.filter(function (c) { return c.isKey; }).length;
      var statsHtml =
        '<li><span class="k">Read</span><span class="v">' + read + ' <small>of ' + total + ' chapters · ' + pct + '%</small></span></li>' +
        '<li><span class="k">Finish at this pace</span><span class="v">' + esc(finish) + '</span></li>';
      if (hasAnyKey && plan.keyStatLabel) {
        statsHtml += '<li><span class="k">' + esc(plan.keyStatLabel) + '</span><span class="v">' + keyLeft + ' <small>chapters</small></span></li>';
      }
      $("stats").innerHTML = statsHtml;
    }

    function renderPace() {
      var perWeek = state.weekday * 5 + state.weekend * 2;
      var opts = VERSIONS.map(function (v) { return '<option' + (v === state.version ? " selected" : "") + '>' + v + '</option>'; }).join("");
      $("pace").innerHTML =
        '<div class="grp"><span class="lbl" id="l-wd">Mon–Fri</span><span class="stepper" role="group" aria-labelledby="l-wd">' +
          '<button type="button" id="wd-minus" data-action="pace" data-field="weekday" data-d="-1" aria-label="Fewer weekday chapters">−</button>' +
          '<output aria-live="polite">' + state.weekday + '</output>' +
          '<button type="button" id="wd-plus" data-action="pace" data-field="weekday" data-d="1" aria-label="More weekday chapters">+</button></span>' +
          '<span class="lbl">ch/day</span></div>' +
        '<div class="grp"><span class="lbl" id="l-we">Sat &amp; Sun</span><span class="stepper" role="group" aria-labelledby="l-we">' +
          '<button type="button" id="we-minus" data-action="pace" data-field="weekend" data-d="-1" aria-label="Fewer weekend chapters">−</button>' +
          '<output aria-live="polite">' + state.weekend + '</output>' +
          '<button type="button" id="we-plus" data-action="pace" data-field="weekend" data-d="1" aria-label="More weekend chapters">+</button></span>' +
          '<span class="lbl">ch/day</span></div>' +
        '<div class="grp"><label class="lbl" for="version">Bible</label><select id="version">' + opts + '</select></div>' +
        '<span class="week">' + perWeek + ' chapters a week</span>';
    }

    function chkList(chs) {
      return '<div class="chks">' + chs.map(function (c) {
        var on = !!state.done[c.key];
        return '<label class="chk' + (on ? " on" : "") + '" for="t-' + c.key + '"><input type="checkbox" id="t-' + c.key + '" data-key="' + c.key + '"' + (on ? " checked" : "") + '>' +
          '<span class="t">' + esc(c.book.name + " " + c.ch) + '</span>' +
          (c.isKey ? '<span class="kdot" title="' + esc(plan.keyLegend || "Linked") + '"></span>' : '') + '</label>';
      }).join("") + '</div>';
    }

    function renderPlan(sched) {
      var t = Sch.today(), tIso = Sch.iso(t);
      var html = "";
      if (!sched.remaining.length) {
        html += '<div class="today"><p class="when">' + esc(fmtLong.format(t)) + '</p><h2>You finished the plan</h2>' +
          '<p>Every chapter is checked off. Nice work.</p></div>';
        $("plan").innerHTML = html;
        return;
      }
      if (!sched.days) {
        html += '<div class="today"><p class="when">' + esc(fmtLong.format(t)) + '</p><h2>Set a pace to build your schedule</h2>' +
          '<p>Use the Mon–Fri and Sat &amp; Sun controls above. You can still check off chapters on the Books tab.</p></div>';
        $("plan").innerHTML = html;
        return;
      }
      var first = sched.days[0];
      var assigned = first && Sch.iso(first.date) === tIso ? first.chapters : [];
      var aset = new Set(assigned.map(function (c) { return c.key; }));
      var list = ORDER.filter(function (c) { return state.done[c.key] === tIso || aset.has(c.key); });
      var upcoming = sched.days.filter(function (d) { return Sch.iso(d.date) !== tIso; });
      var unread = list.filter(function (c) { return !state.done[c.key]; });

      html += '<div class="today"><p class="when">Today · ' + esc(fmtLong.format(t)) + '</p>';
      if (list.length) {
        html += '<h2>' + esc(Sch.passage(list)) + '</h2>' + chkList(list);
        if (unread.length) {
          html += '<div class="row"><button type="button" class="btn" id="mark-today" data-action="mark" data-keys="' + unread.map(function (c) { return c.key; }).join(",") + '">Mark all read</button>' +
            '<a class="link" href="' + esc(Sch.bibleGatewayUrl(unread, state.version)) + '" target="_blank" rel="noopener">Read in ' + esc(state.version) + ' ↗</a></div>';
        }
      } else {
        html += '<h2>No reading planned today</h2>';
      }
      if (!unread.length && upcoming.length) {
        var nx = upcoming[0];
        var lead = list.length ? "Today's reading is done." : "Your pace has today off.";
        html += '<div class="done-msg"><strong>' + lead + '</strong><span>Next up ' + esc(fmtDow.format(nx.date) + ", " + fmtMD.format(nx.date)) + ': ' + esc(Sch.passage(nx.chapters)) + '.</span>' +
          '<div class="row"><button type="button" class="btn ghost" id="read-ahead" data-action="mark" data-keys="' + nx.chapters.map(function (c) { return c.key; }).join(",") + '">Mark next reading done</button>' +
          '<a class="link" href="' + esc(Sch.bibleGatewayUrl(nx.chapters, state.version)) + '" target="_blank" rel="noopener">Read ahead in ' + esc(state.version) + ' ↗</a></div></div>';
      }
      html += '</div>';

      if (upcoming.length) {
        var show = uiState.showAll ? upcoming : upcoming.slice(0, 14);
        var tomorrow = Sch.iso(Sch.addDays(t, 1));
        html += '<div class="sub"><h3>Coming up</h3><p class="hint">Reading ahead or falling behind re-flows the whole schedule.</p></div>';
        html += '<ul class="days">' + show.map(function (d) {
          var di = Sch.iso(d.date), wk = Sch.isWeekend(d.date);
          var label = di === tomorrow ? "Tomorrow" : fmtDow.format(d.date);
          var keyN = d.chapters.filter(function (c) { return c.isKey; }).length;
          return '<li class="day' + (wk ? " wk" : "") + '"><div class="d"><b>' + esc(label) + '</b>' + esc(fmtMD.format(d.date)) + '</div>' +
            '<div class="p"><span>' + esc(Sch.passage(d.chapters)) + '</span><span class="n">' + d.chapters.length + ' ch' + (keyN ? ' · ' + keyN + ' linked' : '') + '</span></div>' +
            '<div class="a"><a href="' + esc(Sch.bibleGatewayUrl(d.chapters, state.version)) + '" target="_blank" rel="noopener">Read ↗</a>' +
            '<button type="button" id="m-' + di + '" data-action="mark" data-keys="' + d.chapters.map(function (c) { return c.key; }).join(",") + '">Mark read</button></div></li>';
        }).join("") + '</ul>';
        if (upcoming.length > 14) {
          html += '<button type="button" class="more" id="showall" data-action="showall">' +
            (uiState.showAll ? "Show the next two weeks only" : "Show the full schedule (" + upcoming.length + " reading days)") + '</button>';
        }
      }
      $("plan").innerHTML = html;
    }

    function renderBooks() {
      var legendItems = [
        '<span><span class="chipdemo">1</span> unread</span>',
        '<span><span class="chipdemo on">1</span> read</span>'
      ];
      if (hasAnyKey && plan.keyLegend) {
        legendItems.push('<span><span class="kdot" style="margin:0"></span> ' + esc(plan.keyLegend) + '</span>');
      }
      legendItems.push('<span>Tap a chapter to check it off.</span>');
      var html = '<p class="legend">' + legendItems.join("") + '</p>';

      for (var si = 0; si < sectionList.length; si++) {
        var sec = sectionList[si];
        var bs = plan.books.filter(function (b) { return b.section === sec.id; });
        if (!bs.length) continue;
        var inc = bs.filter(included);
        var tot = inc.reduce(function (a, b) { return a + b.chapters; }, 0);
        var rd = inc.reduce(function (a, b) { return a + readCount(b); }, 0);
        html += '<h2 class="sect">' + esc(sec.title) + ' <small>' + rd + ' / ' + tot + '</small></h2><div class="books">';
        for (var bi = 0; bi < bs.length; bi++) {
          var b = bs[bi];
          var on = included(b), r = readCount(b);
          html += '<article class="book' + (on ? "" : " off") + '"><div class="bh"><h3>' + esc(b.name) + '</h3>' +
            '<span class="meta">' + esc(b.date) + ' · ' + b.chapters + ' chapters</span>' +
            (b.optional ? '<span class="tag">Optional</span>' : '') +
            (on ? '<span class="cnt' + (r === b.chapters ? " full" : "") + '">' + r + ' / ' + b.chapters + '</span>' : '') +
            '</div>';
          if (b.aside) html += '<p class="aside">' + esc(b.aside) + '</p>';
          html += '<p class="note">' + esc(b.note) + '</p>';
          if (on) {
            html += '<div class="chips">';
            for (var i = 1; i <= b.chapters; i++) {
              var k = b.id + "-" + i, d = state.done[k], isK = (b.key || []).indexOf(i) >= 0;
              html += '<button type="button" class="chip' + (isK ? " k" : "") + '" id="c-' + k + '" data-action="toggle" data-key="' + k + '" aria-pressed="' + (d ? "true" : "false") + '"' +
                ' aria-label="' + esc(b.name + " " + i + (d ? ", read " + fmtReadOn(d) : ", unread") + (isK ? ", linked" : "")) + '"' +
                ' title="' + esc(d ? "Read " + fmtReadOn(d) : b.name + " " + i) + '">' + i + '</button>';
            }
            html += '</div><div class="bact">';
            if (r < b.chapters) html += '<button type="button" id="mb-' + b.id + '" data-action="markbook" data-book="' + b.id + '">Mark all of ' + esc(b.name) + ' read</button>';
            if (b.optional) html += '<button type="button" id="ob-' + b.id + '" data-action="opt" data-book="' + b.id + '">Remove from plan</button>';
            html += '</div>';
          } else {
            html += '<div class="bact"><button type="button" id="ob-' + b.id + '" data-action="opt" data-book="' + b.id + '">Add to plan (+' + b.chapters + ' chapters)</button></div>';
          }
          html += '</article>';
        }
        html += '</div>';
      }
      $("books").innerHTML = html;
    }

    function renderTabs() {
      var tabs = ["plan", "books"];
      for (var i = 0; i < tabs.length; i++) {
        var t = tabs[i];
        var tab = $("tab-" + t);
        tab.setAttribute("aria-selected", uiState.tab === t ? "true" : "false");
        tab.tabIndex = uiState.tab === t ? 0 : -1;
        $(t).hidden = uiState.tab !== t;
      }
    }

    function render() {
      var focusId = document.activeElement && document.activeElement.id;
      var sched = schedule();
      renderHero(sched);
      renderPace();
      renderTabs();
      if (uiState.tab === "plan") renderPlan(sched); else renderBooks();
      if (focusId) {
        var el = $(focusId);
        if (el && el !== document.activeElement) el.focus({ preventScroll: true });
      }
    }

    function setStatus() {
      var el = $("save");
      if (!el) return;
      if (!S.storageAvailable()) {
        el.dataset.s = "error";
        el.textContent = "Progress won't be saved in this browser (storage is unavailable).";
      } else {
        el.dataset.s = "local";
        el.textContent = "Progress is saved in this browser.";
      }
    }

    function persist() { S.saveProgress(plan.id, state); }
    function persistTab() {
      var u = S.loadUi();
      if (!u.plans) u.plans = {};
      if (!u.plans[plan.id]) u.plans[plan.id] = {};
      u.plans[plan.id].tab = uiState.tab;
      S.saveUi(u);
    }

    var undoSnap = null, toastTimer = null;
    function toast(msg, snap) {
      undoSnap = snap;
      $("toast-msg").textContent = msg;
      $("toast").hidden = false;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { $("toast").hidden = true; undoSnap = null; }, 7000);
    }
    function markKeys(keys) {
      var snap = clone(state.done), tIso = Sch.iso(Sch.today());
      var n = 0;
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (BY_KEY[k] && !state.done[k]) { state.done[k] = tIso; n++; }
      }
      if (!n) return;
      persist(); render();
      toast("Marked " + n + (n === 1 ? " chapter" : " chapters") + " read", snap);
    }
    function toggleKey(k) {
      if (!BY_KEY[k]) return;
      if (state.done[k]) delete state.done[k]; else state.done[k] = Sch.iso(Sch.today());
      persist(); render();
    }

    document.addEventListener("click", function (e) {
      var el = e.target.closest ? e.target.closest("button[data-action]") : null;
      if (!el) return;
      var a = el.dataset.action;
      if (a === "tab") {
        uiState.tab = el.dataset.tab;
        persistTab();
        try { history.replaceState(null, "", "#" + uiState.tab); } catch (_) {}
        render();
      } else if (a === "toggle") toggleKey(el.dataset.key);
      else if (a === "mark") markKeys(el.dataset.keys.split(","));
      else if (a === "markbook") {
        var found = null;
        for (var i = 0; i < plan.books.length; i++) if (plan.books[i].id === el.dataset.book) { found = plan.books[i]; break; }
        if (!found) return;
        var ks = [];
        for (var j = 1; j <= found.chapters; j++) ks.push(found.id + "-" + j);
        markKeys(ks);
      } else if (a === "pace") {
        var f = el.dataset.field, d = Number(el.dataset.d);
        var nv = clamp(state[f] + d, 0, MAX[f]);
        if (nv !== state[f]) { state[f] = nv; persist(); render(); }
      } else if (a === "opt") {
        var id = el.dataset.book;
        state.optional[id] = !state.optional[id];
        persist(); render();
      } else if (a === "showall") {
        uiState.showAll = !uiState.showAll;
        render();
      } else if (a === "undo") {
        if (undoSnap) { state.done = undoSnap; undoSnap = null; persist(); render(); }
        $("toast").hidden = true;
      }
    });

    document.addEventListener("change", function (e) {
      var el = e.target;
      if (el.matches && el.matches('input[type="checkbox"][data-key]')) toggleKey(el.dataset.key);
      else if (el.id === "version" && VERSIONS.indexOf(el.value) >= 0) {
        state.version = el.value; persist(); render();
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      var tabsEl = document.querySelector(".tabs");
      if (!tabsEl || !tabsEl.contains(e.target)) return;
      uiState.tab = uiState.tab === "plan" ? "books" : "plan";
      persistTab();
      render();
      var t = $("tab-" + uiState.tab);
      if (t) t.focus();
    });

    document.addEventListener("visibilitychange", function () { if (!document.hidden) render(); });

    render();
  }

  boot();
})();
