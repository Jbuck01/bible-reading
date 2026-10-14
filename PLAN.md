# Reading Plans Website: Build Plan

This file is the brief for building a free, static reading-plan website hosted on GitHub Pages. Read the whole file before starting. Work one phase at a time, and stop at the end of each phase to summarize what changed and get the owner's go-ahead.

## Context

The owner built a Bible reading tracker, `prophets-to-revelation.html` (in this folder), as a Claude artifact. It is one self-contained HTML file with vanilla JavaScript and no libraries. It works well, and the job now is to turn it into a real website. The site should start with this one plan and later hold many plans.

What the current tracker does (keep all of it):

- **Reading order.** Joel, Amos, (Hosea), Isaiah, (Micah), Zephaniah, (Jeremiah), Ezekiel, Daniel, Zechariah, Malachi, Matthew, 1 & 2 Thessalonians, 1 Corinthians, 2 Peter, Revelation. Books in parentheses are optional and start excluded. The core plan is 236 chapters, or 309 with every optional book.
- **Timeline.** A "glazed brick" progress timeline across the top. There is one segment per included book, sized by chapter count, with a dashed gap between Malachi and Matthew.
- **Stats.** Chapters read, the projected finish date at the current pace, and how many Revelation-linked chapters are left.
- **Pace.** Separate chapters-per-day settings for Mon–Fri (0–15) and Sat & Sun (0–40). The default is 2 and 6. It also shows the weekly total and a Bible version selector (NKJV, KJV, NASB, ESV, CSB, NIV, NLT).
- **Plan tab.** A "Today" card listing today's chapters as checkboxes, followed by "Coming up": the next 14 reading days, expandable to the full schedule.
- **Books tab.** Every book with its date, an optional "aside," a "watch for" note, a grid of chapter chips to toggle, "Mark all read," and add/remove for optional books.
- **Bible Gateway links.** Each reading has a "Read ↗" link in the chosen version.
- **Undo.** Bulk actions show a toast with Undo for 7 seconds.
- **Design.** Lapis-and-ochre palette with full light and dark themes. Fonts are Alegreya (display), Atkinson Hyperlegible (body), and IBM Plex Mono (data).

### Schedule rules (keep these exactly)

- Each chapter's progress is stored as `done[<bookId>-<chapter>] = "YYYY-MM-DD"`, using the local date it was checked off.
- The schedule is rebuilt from the remaining unread chapters every time it renders. It starts today and is never stored.
- Today's allotment equals today's pace minus the chapters already checked off today, with a floor of 0. Every later day gets its full weekday or weekend pace. Days with a pace of 0 are skipped.
- Reading ahead, or marking a future day read, stamps those chapters with today's date. The schedule then re-flows on its own.
- If both paces are 0, there is no schedule, and the page says so.

## Goals

- **Current goal (Phases 1–2):** The tracker runs as a website at `https://<username>.github.io/<repo>/`. It looks and behaves like the current file, and it is free to host.
- **Eventual goal (Phases 3–4):** The site holds several reading plans. Anyone with the link can use any plan, and each visitor has their own progress. Visitors never see the owner's checkmarks, and the owner never sees theirs.

## The key decision: where progress lives

GitHub Pages only serves static files. There is no server, so progress has to live in each visitor's browser (`localStorage`). This gives the eventual goal for free: every visitor automatically has a private copy of every plan.

There are two trade-offs to know about:

1. **No sync between devices.** A reader's phone and laptop each keep separate progress.
2. **Progress can be lost.** Clearing browser data erases it.

Phase 3 handles both with export and import. Real accounts with cloud sync are an optional later phase (Phase 5). To make that swap easy, all saving and loading must go through one small module, `assets/storage.js`. No other file may touch `localStorage` directly.

## Constraints

- **No build step and no framework.** Use plain HTML, CSS, and JavaScript ES modules. GitHub Pages must be able to serve the repo as-is.
- **Use only relative URLs** (`assets/app.js`, `plans/index.json`), with no leading slash. The site lives under the `/<repo>/` subpath, so absolute paths will break.
- **Include a `.nojekyll` file at the root.** Without it, GitHub Pages runs Jekyll, which hides files and folders whose names start with `_`.
- **No third-party scripts, analytics, or trackers.** Google Fonts is the only external resource.
- **Keep the existing design and all of the plan text** (notes, asides, dates, key chapters) exactly as written, unless the owner asks for changes.
- **Keep the accessibility features:** visible keyboard focus, `aria-pressed` on chips, labeled checkboxes, keyboard tab switching, and `prefers-reduced-motion`.
- **Test locally with `python3 -m http.server 8000`.** `fetch()` of the JSON files does not work from `file://`.

## Target structure

```
/
├── index.html                  # Plan library: lists every plan
├── plan.html                   # Renders one plan: plan.html?id=prophets-to-revelation
├── .nojekyll
├── assets/
│   ├── styles.css              # Tokens + all styles, moved from the current <style>
│   ├── storage.js              # The only module that reads or writes localStorage
│   ├── schedule.js             # Pure functions: buildSchedule, ranges, passage, bibleGatewayUrl
│   ├── plan-page.js            # Plan page: rendering, actions, toast
│   └── library.js              # Library page
├── plans/
│   ├── index.json              # Manifest of published plans
│   ├── prophets-to-revelation.json
│   └── _template.json          # Starting point for new plans
├── scripts/
│   └── validate-plans.mjs      # Dev-only check (Phase 4); not used by the site
├── reference/
│   └── prophets-to-revelation.html   # The original artifact, kept for comparison
├── CLAUDE.md                   # Project conventions for future sessions
└── README.md
```

## Plan data format

Each plan is a single JSON file. The order of the `books` array is the reading order.

```json
{
  "schemaVersion": 1,
  "id": "prophets-to-revelation",
  "type": "paced",
  "title": "Prophets to Revelation",
  "eyebrow": "Apocalyptic reading plan · in the order written",
  "lede": "Every book is placed by when it was written, so you meet each image in Joel, Isaiah, Ezekiel, Daniel and Zechariah before Revelation uses it again.",
  "timeline": { "start": "Joel · c. 835 BC", "end": "Revelation · c. AD 95" },
  "keyLegend": "Revelation draws on this chapter",
  "keyStatLabel": "Revelation-linked left",
  "defaults": { "weekday": 2, "weekend": 6, "version": "NKJV" },
  "sections": [
    { "id": "ot", "title": "Old Testament", "gapAfter": "About 400 years pass between Malachi and Matthew" },
    { "id": "nt", "title": "New Testament" }
  ],
  "books": [
    {
      "id": "joel",
      "name": "Joel",
      "abbr": "Joel",
      "bibleGateway": "Joel",
      "chapters": 3,
      "section": "ot",
      "date": "c. 835 BC",
      "key": [2, 3],
      "optional": false,
      "aside": null,
      "note": "The locust army and the sun and moon going dark. …"
    }
  ]
}
```

Rules:

- **Ids never change once a plan is published.** That means plan ids, book ids, and the `<bookId>-<chapter>` keys. Visitors' saved progress depends on them. To change the plan, add new ids instead of renaming old ones.
- **`type` is `"paced"`** for this plan, meaning it is a list of chapters scheduled by the reader's pace. Treat `type` as the extension point for future plan types (see Phase 4), but build only `"paced"` now.
- **Nothing plan-specific may stay hard-coded in JavaScript.** That includes section names, the 400-year gap label, timeline end labels, the legend, and stat labels. All of it moves into the JSON.

`plans/index.json`:

```json
{
  "plans": [
    {
      "id": "prophets-to-revelation",
      "title": "Prophets to Revelation",
      "summary": "Joel through Revelation in the order the books were written.",
      "file": "plans/prophets-to-revelation.json"
    }
  ]
}
```

`plan.html` loads only ids that appear in the manifest and never builds a fetch path from raw URL input. An unknown or missing id shows a friendly "Plan not found" message with a link back to the library.

## Storage format

- **Progress key:** `readingPlans:v1:progress:<planId>`. The value is `{ "schemaVersion": 1, "done": { "joel-1": "2026-10-13" }, "weekday": 2, "weekend": 6, "optional": { "hosea": false }, "version": "NKJV", "startedAt": "2026-10-13" }`.
- **UI key:** `readingPlans:v1:ui`. It holds the last tab per plan and any other per-browser conveniences.

`assets/storage.js` exports:

```js
loadProgress(planId)          // -> normalized object, or null if never started
saveProgress(planId, data)    // -> void (debounce writes, about 300 ms)
listStartedPlans()            // -> [{ planId, doneCount }] for the library page
storageAvailable()            // -> boolean
```

Requirements for storage:

- Wrap every `localStorage` call in try/catch.
- Normalize on load with the same checks as the current `normalize()`: drop unknown chapter keys, clamp paces, and accept only known versions.
- If storage is unavailable (some private-browsing modes), the page still works, and a quiet notice says progress won't be saved in this browser.

---

## Phase 1: Port to a static site

1. Create the folder structure above, `.nojekyll`, and a git repository. Move the original file into `reference/`.
2. **Extract the data.** Move the `BOOKS` array from the reference file into `plans/prophets-to-revelation.json` using the format above, with all text copied exactly. Create `plans/index.json` and `plans/_template.json`. The template should be a two-book example with every field filled in and an explanation of each field.
3. **Extract the CSS** into `assets/styles.css`, keeping every token and both dark-theme blocks. Each HTML page needs a proper `<!doctype html>`, `<meta charset="utf-8">`, and `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`. Add the base rules the artifact host used to inject: `body { margin: 0 }`, `img { max-width: 100% }`, and `[hidden] { display: none !important }`. The last one matters because the toast's `display: flex` otherwise overrides `hidden`.
4. **Port the JavaScript into modules,** and remove everything specific to Claude artifacts:
   - the `connect()` block that calls `window.claude.use("db")` and `window.claude.use("user")`
   - the database write queue (`docRef`, `flush`, the retry logic, `adoptRemote`)
   - the save-status messages that mention a Claude account

   Replace them with `storage.js`. The status line should simply say "Progress is saved in this browser."
5. **Build `plan.html`.** It reads `?id=`, looks the id up in the manifest, fetches the plan, sets `<title>` to the plan's title, and renders. Keep the `#plan` and `#books` hash deep links and the remembered tab.
6. **Build `index.html`.** It is a simple library page in the same visual style, with a site title and one entry per plan showing the title, summary, and chapter count. For plans the visitor has started, it also shows their progress percentage. Each entry links to `plan.html?id=…`. With only one plan it looks sparse, which is fine; it is built for more.
7. **Test locally** with `python3 -m http.server 8000`. Before moving on, check:
   - [ ] The library lists the plan, and the link opens it.
   - [ ] Checking chapters, Mark all read, Undo, pace changes, the version selector, and adding or removing optional books all work and survive a reload.
   - [ ] The schedule matches the reference file for the same progress and pace. Compare side by side.
   - [ ] Two different browsers, or a normal and a private window, keep separate progress.
   - [ ] Light and dark themes both look right, and nothing scrolls sideways at a 380px width.
   - [ ] There are no console errors, and `plan.html?id=nonsense` shows the not-found message.
8. Write `README.md` covering what the site is, how to run it locally, and how to add a plan. Write `CLAUDE.md` with the conventions in this file: no build step, relative paths, ids never change, only `storage.js` touches storage, and how to add a plan. Commit.

**Stop here.** Summarize Phase 1 for the owner and wait for approval.

## Phase 2: Publish on GitHub Pages

1. **Ask the owner** for their GitHub username and the repo name (suggest `reading-plans`). On GitHub's free plan, Pages requires a **public** repo, so confirm the owner is fine with the code being public. Visitors' progress never leaves their own browsers, so no reading data becomes public.
2. **Create the repo and push `main`.** If the `gh` CLI is installed and signed in, use `gh repo create <name> --public --source . --push`. Otherwise, walk the owner through creating an empty repo on github.com, then add the remote and push. Get explicit approval before creating the repo or pushing.
3. **Turn on Pages, deploying from the `main` branch at the root (`/`).** With `gh`, run `gh api -X POST repos/<owner>/<repo>/pages -f "source[branch]=main" -f "source[path]=/"`. If that fails, the owner can use the repo's Settings → Pages → "Deploy from a branch" → `main` / `(root)`.
4. **Wait for the deploy, then check the live site:**
   - [ ] `https://<owner>.github.io/<repo>/` loads the library.
   - [ ] The plan page loads its JSON under the subpath.
   - [ ] Progress survives a reload.
   - [ ] It works on a phone.
5. Add the live link to `README.md` and commit.

**Stop here.** The current goal is done.

## Phase 3: Make progress portable (recommended next)

This protects readers from losing progress and lets them move between devices without accounts.

1. **Export.** A "Back up progress" control on each plan downloads `<planId>-progress-YYYY-MM-DD.json`. Add a library-level "Back up everything" too.
2. **Import.** "Restore from file" validates the file, shows what it contains ("142 chapters read, last on Oct 30"), and asks for confirmation before replacing current progress. Build the confirmation into the page instead of using `confirm()`.
3. **Optional transfer code.** "Copy progress code" puts compact base64 JSON on the clipboard, and "Paste a code" imports it. This makes moving progress from laptop to phone easy.

## Phase 4: Add more reading plans

1. **Generalize anything still specific to this plan.** Confirm that a second plan with different sections, no optional books, and no key chapters renders cleanly, including empty states for the "key" stat and legend.
2. **Write `scripts/validate-plans.mjs`** (run with `node scripts/validate-plans.mjs`). It checks that:
   - every manifest entry has a file, and their ids match
   - book ids are unique within a plan
   - chapter counts are positive whole numbers
   - every key chapter is within range
   - required fields are present
   - section ids exist

   Run it before every commit that touches `plans/`.
3. **Document how to add a plan** in README and CLAUDE.md: copy `_template.json`, fill it in, add it to `index.json`, validate, test locally, commit, push.
4. **Possible extensions** (only build these when the owner asks):
   - Partial books, for example only Jeremiah 30–33, using `"range": [30, 33]` on a book. The chapter keys stay `<bookId>-<n>`.
   - A `"fixed"` plan type with set daily readings (such as Bible-in-a-year) instead of pace-based scheduling.
   - Per-plan accent colors defined in the JSON.

## Phase 5 (optional, only if the owner asks): Accounts and cloud sync

Do not start this without the owner's go-ahead. It adds an outside service and some privacy responsibility.

- **Approach.** Keep `localStorage` as the default. Add an optional "Sign in to sync" that mirrors progress to a hosted backend with a free tier, such as Supabase (email magic-link sign-in, one row per user per plan, protected by row-level security) or Firebase. Check current free-tier limits before choosing.
- **Code changes.** Everything goes through `storage.js`, so only that module and a small sign-in UI should change.
- **Conflicts.** Merge by keeping each chapter's earliest done date.
- **Privacy.** Add a short privacy note covering what is stored and how to delete it.

---

## Working agreements

- **Ask before** creating or renaming the GitHub repo, pushing, making anything public, deleting files, or changing plan text.
- **Commit after each logical step,** with clear messages.
- **Keep the `reference/` copy** until the Phase 1 checklist passes. Then ask whether to keep it.
- **When a requirement is unclear, ask.** Don't guess, especially about anything that changes stored progress or plan ids.
