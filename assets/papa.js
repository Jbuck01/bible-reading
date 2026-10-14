// papa.js — "Papa Mode" guided walkthrough.
// A "?" button in the top-right toolbar launches a step-by-step tour that
// dims the page, draws a ring around each target element, and shows a
// tooltip card with Prev / Next / Exit controls.
//
// Steps whose target isn't on the page (e.g., "Mark all read" when there
// are no unread chapters) still show the explanation card without a ring,
// so the reader always gets the information.
(function () {
  "use strict";

  var LIBRARY_STEPS = [
    {
      title: "Welcome to Reading Plans",
      target: ".hero",
      body: "This is your library. Each plan listed below is one you can start — click a card to open it."
    },
    {
      title: "A reading plan",
      target: ".plan-card",
      body: "Every card is one plan. The small line underneath shows the chapter count, and if you've started it, your progress percentage."
    },
    {
      title: "Progress stays on your device",
      target: ".hero .lede",
      body: "Everything you check off is saved in this browser. Nothing is uploaded. Each device keeps its own progress."
    },
    {
      title: "Theme",
      target: "#theme-toggle",
      body: "The ◐ button in the top-right cycles the color theme between auto (follows your system), light, and dark."
    }
  ];

  var PLAN_STEPS = [
    {
      title: "Welcome to Papa Mode",
      target: ".hero h1",
      body: "I'll walk you through everything on this page. Use the Next and Back buttons below, press Esc, or click outside the card to exit any time."
    },
    {
      title: "Your progress at a glance",
      target: ".timeline",
      body: "Each brick is one book, sized by its chapter count. The dashed gap is roughly 400 years between the Old and New Testaments. The lapis fill shows how far you've gotten."
    },
    {
      title: "Stats",
      target: ".stats",
      body: "Chapters read, your projected finish date at the current pace, Revelation-linked chapters still ahead, and your reading streak once you've got one going."
    },
    {
      title: "Set your pace",
      target: ".pace",
      body: "How many chapters to read on weekdays and weekends. Pick your Bible version too — that controls which translation opens on Bible Gateway."
    },
    {
      title: "Today's reading",
      target: ".today",
      body: "Today's chapters live in this card. Each one is a checkbox — click or tap to mark it read. Checked chapters update everything above."
    },
    {
      title: "Mark it all at once",
      target: "#mark-today",
      body: "Done for the day? One tap marks today's whole reading as done. There's a 7-second Undo on every bulk action, so you can't lose work by accident."
    },
    {
      title: "Open the passage",
      target: "#plan a.link",
      body: "Each Read ↗ link opens the passage on Bible Gateway in the version you chose above."
    },
    {
      title: "The road ahead",
      target: ".days",
      body: "The next 14 reading days. If you read ahead or fall behind, the whole schedule re-flows on its own — no catching up by hand."
    },
    {
      title: "The Books tab",
      target: "#tab-books",
      body: "Switch tabs to see every book with its date, a short context note, and a grid of chapter chips you can tap individually."
    },
    {
      title: "Need to start over?",
      target: "button[data-action='reset-ask']",
      body: "At the bottom of the Books tab there's a quiet 'Reset my progress' link. It confirms before clearing, and the 7-second Undo covers you if you change your mind."
    },
    {
      title: "Theme",
      target: "#theme-toggle",
      body: "The ◐ button in the top-right cycles between auto, light, and dark theme. Your choice is remembered per browser."
    },
    {
      title: "Back to the library",
      target: ".backlink a",
      body: "The '← All plans' link up top takes you back to the library whenever more plans are added."
    }
  ];

  var state = { active: false, step: 0, steps: null };

  function pickSteps() {
    if (document.getElementById("library")) return LIBRARY_STEPS;
    if (document.getElementById("root")) return PLAN_STEPS;
    return [];
  }

  function findTarget(step) {
    if (!step.target) return null;
    var t;
    try { t = document.querySelector(step.target); } catch (e) { return null; }
    if (!t) return null;
    var rect = t.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return null;
    if (t.offsetParent === null && getComputedStyle(t).position !== "fixed") return null;
    return t;
  }

  function clearHighlight() {
    var hs = document.getElementsByClassName("papa-highlight");
    while (hs.length) hs[0].classList.remove("papa-highlight");
  }

  function buildOverlay() {
    var backdrop = document.createElement("div");
    backdrop.className = "papa-overlay";
    backdrop.id = "papa-overlay";
    backdrop.addEventListener("click", function (e) {
      if (e.target === backdrop) exit();
    });
    document.body.appendChild(backdrop);

    var tt = document.createElement("div");
    tt.className = "papa-tooltip";
    tt.id = "papa-tooltip";
    tt.setAttribute("role", "dialog");
    tt.setAttribute("aria-live", "polite");
    tt.setAttribute("aria-label", "Papa Mode guided tour");
    tt.innerHTML =
      '<p class="papa-step" id="papa-step-counter"></p>' +
      '<h3 class="papa-title" id="papa-step-title"></h3>' +
      '<p class="papa-body" id="papa-step-body"></p>' +
      '<div class="papa-actions">' +
        '<button type="button" class="papa-prev">← Back</button>' +
        '<button type="button" class="papa-next">Next →</button>' +
        '<button type="button" class="papa-skip">Exit</button>' +
      '</div>';
    document.body.appendChild(tt);
    tt.querySelector(".papa-prev").addEventListener("click", prev);
    tt.querySelector(".papa-next").addEventListener("click", next);
    tt.querySelector(".papa-skip").addEventListener("click", exit);
  }

  function removeOverlay() {
    var o = document.getElementById("papa-overlay"); if (o) o.remove();
    var t = document.getElementById("papa-tooltip"); if (t) t.remove();
  }

  function showStep(i) {
    state.step = i;
    clearHighlight();
    var step = state.steps[i];
    var target = findTarget(step);

    document.getElementById("papa-step-counter").textContent =
      "Step " + (i + 1) + " of " + state.steps.length;
    document.getElementById("papa-step-title").textContent = step.title;
    document.getElementById("papa-step-body").textContent = step.body;

    var prevBtn = document.querySelector(".papa-prev");
    var nextBtn = document.querySelector(".papa-next");
    prevBtn.disabled = (i === 0);
    nextBtn.textContent = (i === state.steps.length - 1) ? "Done" : "Next →";

    if (target) {
      target.classList.add("papa-highlight");
      // Fixed targets (toolbar) don't need scrolling; skip to avoid odd scroll jumps.
      var isFixed = getComputedStyle(target).position === "fixed";
      if (!isFixed) {
        try {
          target.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        } catch (e) {
          target.scrollIntoView();
        }
      }
    }
    setTimeout(function () {
      try { nextBtn.focus({ preventScroll: true }); } catch (e) { nextBtn.focus(); }
    }, 60);
  }

  function next() {
    if (state.step < state.steps.length - 1) showStep(state.step + 1);
    else exit();
  }

  function prev() {
    if (state.step > 0) showStep(state.step - 1);
  }

  function onKey(e) {
    if (!state.active) return;
    if (e.key === "Escape") { e.preventDefault(); exit(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); next(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
  }

  function start() {
    if (state.active) return;
    var steps = pickSteps();
    if (!steps.length) return;
    state.steps = steps;
    state.active = true;
    state.step = 0;
    buildOverlay();
    showStep(0);
    document.addEventListener("keydown", onKey);
  }

  function exit() {
    state.active = false;
    state.steps = null;
    state.step = 0;
    clearHighlight();
    removeOverlay();
    document.removeEventListener("keydown", onKey);
  }

  function papaButton() {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "papa-trigger";
    btn.className = "toolbar-btn papa-trigger";
    btn.setAttribute("aria-label", "Open Papa Mode — guided walkthrough");
    btn.title = "Papa Mode — guided walkthrough";
    btn.textContent = "?";
    btn.addEventListener("click", start);
    return btn;
  }

  function install() {
    if (document.getElementById("papa-trigger")) return;
    var toolbar = document.getElementById("ui-toolbar");
    (toolbar || document.body).appendChild(papaButton());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install);
  } else {
    install();
  }
})();
