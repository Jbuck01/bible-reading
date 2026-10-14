# Conventions

Rules for anyone (human or AI) editing this repo.

## Non-negotiable

- **No build step.** Everything is served as-is: plain HTML, CSS, and
  JavaScript. Do not add Webpack, Vite, TypeScript compilation, or anything
  that produces generated files.
- **Classic scripts, not ES modules.** Each JS file is wrapped in an IIFE
  and attaches its API to `window.ReadingPlans`. `PLAN.md` originally
  specified ES modules, but we switched because `<script type="module">`
  and `fetch()` are both blocked by browsers from `file://` — classic
  scripts let the site run by double-clicking the HTML. GitHub Pages still
  serves this exact code with no changes.
- **Only `assets/storage.js` reads or writes `localStorage`.** Every other
  module must go through `window.ReadingPlans.storage`. This is the seam
  that Phase 5 (cloud sync, optional) swaps.
- **Relative URLs only.** No leading slashes — the site lives under
  `/<repo>/` on GitHub Pages, so absolute paths break.
- **Keep `.nojekyll` at the root.** Without it, GitHub Pages runs Jekyll
  and hides files whose names start with `_` (including `_template.js`).
- **No third-party scripts, analytics, or trackers.** Google Fonts is the
  one exception.

## Script load order

Both pages load `storage.js` and the manifest (`plans/index.js`) first.
`plan.html` also loads `schedule.js`, then `plan-page.js`. `plan-page.js`
dynamically injects a `<script>` for the specific plan file after
validating the `?id=` against the manifest.

## Plan data

- Plans live in `plans/<id>.js`. Each file assigns the plan object to
  `window.ReadingPlans.plans["<id>"]`.
- Plan ids, book ids, and the derived chapter keys (`<bookId>-<chapter>`)
  are **permanent** once a plan is published. Readers' saved progress is
  keyed to them. To change a plan's identity, add a new id — do not
  rename.
- Everything plan-specific lives in the plan's JS file. No section names,
  gap labels, timeline end labels, legends, or stat labels in the shared
  JavaScript.
- Dates, asides, "watch for" notes, and key chapters are copied verbatim
  from the original tracker. Changes need the owner's sign-off.
- `plans/index.js` is a manifest. Each entry has `id`, `title`, `summary`,
  `file`, `chapters` (required books only), and `optionalChapters`. The
  library uses the two counts directly — keep them in sync with the plan's
  own book list.

## Schedule rules (keep exactly)

- Progress stamp: `done["<bookId>-<chapter>"] = "YYYY-MM-DD"` (local
  date it was checked off).
- Schedule is rebuilt from unread chapters every render. It starts today
  and is never stored.
- Today's allotment = today's pace − chapters already checked today,
  floor 0. Later days get their full weekday or weekend pace.
- Days with a pace of 0 are skipped.
- Reading ahead stamps those chapters with today's date; the schedule
  re-flows naturally.
- If both paces are 0, there is no schedule, and the page says so.

## Adding a plan

1. Copy `plans/_template.js` to `plans/<new-id>.js`.
2. Fill in every field. Match the real chapter count. Keep `type: "paced"`
   unless you build a new plan type.
3. Add an entry to `plans/index.js`, including `chapters` and
   `optionalChapters`.
4. Open `plan.html?id=<new-id>` to smoke-test. No server needed.
5. Commit.

## Accessibility

- Keep visible keyboard focus (`:focus-visible` outline).
- Chapter chips use `aria-pressed`; checkboxes are labeled.
- Tabs are navigable with left/right arrows.
- Honor `prefers-reduced-motion`.

## Testing locally

- Double-click `index.html` or `plan.html?id=prophets-to-revelation`.
- Two browsers (or a normal + private window) should keep separate
  progress — except on Chrome/`file://`, which shares one origin for all
  local files.
- A URL-served variant (`python3 -m http.server 8000`) works too and is
  closer to the GitHub Pages deploy.

## Working agreements

- Ask before creating or renaming the GitHub repo, pushing, making
  anything public, deleting files, or changing plan text.
- Commit after each logical step with clear messages.
- When a requirement is unclear, ask — especially about anything that
  changes stored progress or plan ids.
