# Reading Plans

A tiny static site that holds Bible reading plans. Progress is kept in each
visitor's browser — no account, no server, no tracking.

**Live:** <https://jbuck01.github.io/bible-reading/>

The first plan is **Prophets to Revelation**: Joel through Revelation in the
order the books were written (236 chapters, 309 with every optional book).

## Running it locally

Just double-click `index.html` (or `plan.html?id=prophets-to-revelation`).
No server, no build step. The site uses classic `<script>` tags so it loads
fine from a `file://` URL.

Browser caveats on `file://`:

- Chrome keeps your progress across sessions, since all `file://` URLs share
  one origin.
- Firefox and Safari treat each file path as a separate origin, so if you
  move the folder, your progress follows a different origin and may appear
  "lost." Keep the folder in one place.

If you prefer a URL, `python3 -m http.server 8000` from this folder works
too, and open <http://127.0.0.1:8000/>.

## Project layout

```
/
├── index.html                 # Plan library
├── plan.html                  # Plan page — reads ?id=<planId>
├── .nojekyll                  # Tell GitHub Pages not to run Jekyll
├── assets/
│   ├── styles.css             # All styles, including both dark-mode blocks
│   ├── storage.js             # The only module that touches localStorage
│   ├── schedule.js            # Pure scheduling / ranges / Bible Gateway helpers
│   ├── plan-page.js           # Plan page controller
│   └── library.js             # Library page
├── plans/
│   ├── index.js               # Manifest of published plans
│   ├── prophets-to-revelation.js
│   └── _template.js           # Starting point for new plans
├── reference/
│   └── prophets-to-revelation.html   # Original single-file artifact
├── CHECKLIST.md               # Build progress tracker
├── CLAUDE.md                  # Conventions for future sessions
├── PLAN.md                    # Original build brief
└── README.md
```

## Adding a plan

1. Copy `plans/_template.js` to `plans/<new-id>.js`.
2. Fill it in. Keep ids kebab-case; once published, they are permanent — a
   reader's saved progress is keyed to `<planId>:<bookId>-<chapter>`.
3. Add the plan to `plans/index.js`, including its `chapters` (required
   books only) and `optionalChapters` totals so the library can show them
   without opening every plan file.
4. Open `plan.html?id=<new-id>` to smoke-test. On Windows, you can create
   a desktop shortcut whose target is the HTML file.
5. Commit.

## How progress is stored

- Per-plan progress: `readingPlans:v1:progress:<planId>` in `localStorage`
- Last-visited tab per plan: `readingPlans:v1:ui`

Clearing browser data erases progress. Phase 3 (not yet built) will add
export and import so readers can back up and move between devices.

## Design notes

- No build step. No framework.
- Classic `<script>` tags with each module attaching to `window.ReadingPlans`.
  This loads from `file://` without the CORS restrictions on ES modules.
- Only `assets/storage.js` reads or writes `localStorage`.
- All paths are relative (no leading slash) so the site works under the
  `/<repo>/` subpath on GitHub Pages.
- Fonts are the one external dependency (Google Fonts). No analytics or
  trackers.
