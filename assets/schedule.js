// schedule.js — pure helpers for scheduling, ranges, and Bible Gateway URLs.
// Classic script (no ES modules). Attaches to window.ReadingPlans.schedule.
(function () {
  "use strict";

  var NS = window.ReadingPlans = window.ReadingPlans || {};

  function iso(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function today() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function isWeekend(d) { var w = d.getDay(); return w === 0 || w === 6; }

  function buildOrder(plan) {
    var order = [];
    for (var i = 0; i < plan.books.length; i++) {
      var b = plan.books[i];
      var ks = new Set(b.key || []);
      for (var j = 1; j <= b.chapters; j++) {
        order.push({ book: b, ch: j, key: b.id + "-" + j, isKey: ks.has(j) });
      }
    }
    return order;
  }

  function buildSchedule(args) {
    var remaining = args.remaining;
    var done = args.done;
    var weekday = args.weekday;
    var weekend = args.weekend;
    var t = args.now || today();
    if (!remaining.length) return { days: [], remaining: remaining };
    if (weekday === 0 && weekend === 0) return { days: null, remaining: remaining };
    var tIso = iso(t);
    var readToday = 0;
    for (var k in done) if (done[k] === tIso) readToday++;
    function paceFor(d) { return isWeekend(d) ? weekend : weekday; }
    var days = [];
    var i = 0, d = t, first = true, guard = 0;
    while (i < remaining.length && guard < 3000) {
      var n = paceFor(d);
      if (first) { n = Math.max(0, n - readToday); first = false; }
      if (n > 0) { days.push({ date: new Date(d), chapters: remaining.slice(i, i + n) }); i += n; }
      d = addDays(d, 1);
      guard++;
    }
    return { days: days, remaining: remaining };
  }

  function ranges(chs) {
    var out = []; var cur = null;
    for (var i = 0; i < chs.length; i++) {
      var c = chs[i];
      if (cur && cur.book === c.book && c.ch === cur.end + 1) cur.end = c.ch;
      else { if (cur) out.push(cur); cur = { book: c.book, start: c.ch, end: c.ch }; }
    }
    if (cur) out.push(cur);
    return out;
  }

  function passage(chs) {
    var rs = ranges(chs);
    var s = "", prev = null;
    for (var i = 0; i < rs.length; i++) {
      var r = rs[i];
      var span = r.start === r.end ? String(r.start) : r.start + "–" + r.end;
      if (prev === r.book) s += ", " + span;
      else s += (i ? "; " : "") + r.book.name + " " + span;
      prev = r.book;
    }
    return s;
  }

  function bibleGatewayUrl(chs, version) {
    var rs = ranges(chs);
    var parts = [];
    for (var i = 0; i < rs.length; i++) {
      var r = rs[i];
      parts.push(r.book.bibleGateway + " " + r.start + (r.end > r.start ? "-" + r.end : ""));
    }
    return "https://www.biblegateway.com/passage/?search=" + encodeURIComponent(parts.join("; ")) + "&version=" + encodeURIComponent(version);
  }

  NS.schedule = {
    iso: iso,
    today: today,
    addDays: addDays,
    isWeekend: isWeekend,
    buildOrder: buildOrder,
    buildSchedule: buildSchedule,
    ranges: ranges,
    passage: passage,
    bibleGatewayUrl: bibleGatewayUrl
  };
})();
