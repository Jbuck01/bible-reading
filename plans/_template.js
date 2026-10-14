// Starting point for new reading plans. Copy this file to plans/<new-id>.js,
// rename the id/title/etc., add the file to plans/index.js, and that's it —
// no server needed, no build step.
window.ReadingPlans = window.ReadingPlans || {};
window.ReadingPlans.plans = window.ReadingPlans.plans || {};
window.ReadingPlans.plans["example-plan"] = {
  "schemaVersion": 1,

  // Kebab-case id. Permanent once published — visitors' saved progress keys
  // depend on it. To change a plan, publish a new id, don't rename.
  "id": "example-plan",

  // "paced" is the only type built so far. Chapters are scheduled by the
  // reader's weekday / weekend pace.
  "type": "paced",

  // Displayed on the plan page and listed in the library.
  "title": "Example Plan",

  // Small uppercase label above the title. Keep under ~70 chars.
  "eyebrow": "Short category · tagline",

  // One or two sentences, shown under the title. Plain text — no HTML.
  "lede": "One or two sentences explaining why this plan is arranged this way.",

  // Short labels under the glazed-brick progress timeline.
  "timeline": {
    "start": "First book · earliest date",
    "end": "Last book · latest date"
  },

  // Legend text + hero-stat label for the "key" (orange-dot) chapters.
  // If no book has `key` chapters, both are ignored and the UI omits them.
  "keyLegend": "Why this chapter is flagged",
  "keyStatLabel": "Linked chapters left",

  // Starting pace and Bible version. Weekday 0–15, weekend 0–40.
  // Version must be one of: NKJV, KJV, NASB, ESV, CSB, NIV, NLT.
  "defaults": {
    "weekday": 2,
    "weekend": 6,
    "version": "NKJV"
  },

  // Section ids are referenced by each book's "section" field. Books appear
  // in the order they are listed, grouped and separated by section.
  // "gapAfter" is an optional short note shown between this section and the
  // next (e.g. "About 400 years pass"). Omit to not show a gap.
  "sections": [
    { "id": "part-one", "title": "Part One", "gapAfter": "Optional between-section note" },
    { "id": "part-two", "title": "Part Two" }
  ],

  // Book fields:
  //   id            Kebab-case, permanent — used in the chapter key "<bookId>-<ch>".
  //   name          Full display name.
  //   abbr          Short label inside the timeline brick.
  //   bibleGateway  Book name as Bible Gateway's URL expects it. Usually = name.
  //   chapters      Positive integer. Must match the real chapter count.
  //   section       Must match one of the ids in "sections".
  //   date          Free-text date label (e.g. "c. 740–680 BC", "c. AD 50").
  //   key           Array of chapter numbers to flag with the orange dot.
  //                 Each must be in [1, chapters]. Use [] for none.
  //   optional      true → excluded from the plan by default; the reader can
  //                 add it from the Books tab. Default false.
  //   aside         Short italic context note under the heading, or null.
  //   note          Longer pastoral note. Required.
  "books": [
    {
      "id": "genesis",
      "name": "Genesis",
      "abbr": "Gen",
      "bibleGateway": "Genesis",
      "chapters": 50,
      "section": "part-one",
      "date": "c. 1446 BC",
      "key": [1, 3, 12, 15],
      "optional": false,
      "aside": null,
      "note": "Short pastoral note shown on the Books tab for this book."
    },
    {
      "id": "ruth",
      "name": "Ruth",
      "abbr": "Ruth",
      "bibleGateway": "Ruth",
      "chapters": 4,
      "section": "part-two",
      "date": "c. 1100 BC",
      "key": [],
      "optional": true,
      "aside": "Optional context note shown under the heading in a smaller font.",
      "note": "Second example book, included to show every field with values."
    }
  ]
};
