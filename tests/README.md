# Faction Clash — automated tests

A committed Playwright regression suite for `index.html`. Before this, every
verification pass (Boss Rush balance testing, Verdant/Neutral card wiring,
etc.) used one-off scripts in `/tmp` that never got saved — this replaces
that with something that stays in the repo and can be re-run any time.

## Running

```powershell
npm install
npx playwright install chromium   # first time only, downloads a browser
npm test
```

`npm test` runs headless; `npm run test:headed` opens a visible browser
window if you want to watch it play.

No dev server is needed — the tests open `index.html` directly via `file://`,
the same way a player double-clicking the file would. That also means every
test run exercises the embedded-JSON fallback path in `js/dataLoader.js`
(`fetch()` of local files is blocked under `file://`), not just the
`http://` path.

## What's covered

- **`card-data.spec.js`** — canonical JSON integrity (no duplicate ids,
  every card has cost/type), that the game's runtime data matches the
  canonical JSON files (catches a forgotten
  `python build_embedded_data.py --update-index` after a card edit), that
  every card with rules text has a wired `ABILITIES` entry, that Boss Rush's
  deck definitions still reference real cards, and a hard zero-duplicates
  check on `ABILITIES` object keys (the ~130-entry backlog from earlier
  card-redesign batches was cleaned up 2026-08-19 — see `CROSS_AGENT_LOG.md`
  — so this now fails the build if any new duplicate is introduced, instead
  of just capping a backlog).
- **`combat.spec.js`** — Defense-must-block-first, Support Units becoming
  valid targets once Defense clears (added 2026-08-19, see
  `FACTION_CLASH_GAME_OVERVIEW.md` "Combat targeting"), duration-only
  Support cards staying untargetable, basic attack damage/counter-damage,
  Cleave hitting both neighbors, and face damage.
- **`deck-manager.spec.js`** — deck size caps (30 normal / 15 boss), the
  2-copy/1-copy-Legendary limit, and `deckIsComplete()`.
- **`abilities.spec.js`** — individual `ABILITIES[id]` handlers whose bugs
  don't fit the other files' categories. Currently covers VER010 (Nourishing
  Rain), fixed 2026-08-19 after it crashed `Game.damageUnit()` with an
  undefined target when there was no friendly damage to heal and no enemy
  unit to redirect leftover damage to.
- **`boss-rush.spec.js`** — starting an encounter sets Boss HP/deck/turn
  counter correctly, a full bot-vs-Boss-AI playthrough runs to completion
  with zero page errors, win/loss messaging uses the Boss's name, and the
  Boss status panel renders without exceptions.
- **`gauntlet.spec.js`** — Gauntlet Mode (added 2026-08-19, see
  `BOSS_RUSH_DESIGN.md` "Gauntlet Mode"): the start-screen mode-button
  wiring, starting on the correct first boss, a mid-run boss defeat
  showing the transition overlay (not the terminal end screen) with the
  player's HP carried forward correctly, a full gauntlet victory's
  conquest-flavored text, an immediate loss ending the whole run without
  a transition, and a real bot-vs-both-bosses playthrough that clicks
  through the actual transition overlay with zero page errors.
- **`board-frame-gems.spec.js`** — the board-frame gem wiring added
  2026-08-20 after the user replaced all 4 board frames with new,
  standardized art (see `CROSS_AGENT_LOG.md`). Current version (second
  pass, same day): Attack/Defense/SupportUnit board cards draw their own
  dedicated `<row>Gem_board.png` asset, and SupportCard draws
  `durationGem_board.png` with the duration number anchored on it — all 4
  are pre-positioned on the same canvas as the board frames, so they drop
  in as a plain full-canvas overlay (no transform). Also has a direct unit
  check on `CardBuilder.boardGemSrc()` picking the right asset per frame
  key. (An earlier pass reused the full card's `type_<row>.png` badges via
  a scale/translate transform before dedicated gem art existed — see
  `CROSS_AGENT_LOG.md` if you're trying to make sense of an old diff.)
- **`card-frame-nameplate.spec.js`** — the full-card (not board) frame
  rework added 2026-08-20, same day as the board-frame gem work above but
  a separate change: the user split the name/effect/flavor parchment out
  of `frame_<rarity>.png` into its own `assets/nameplate/nameplate.png`
  asset and redrew the frames with real cutout transparency through both
  the art window and the parchment area. Covers the new `buildCard()`
  layer order (illustration, then nameplate, then frame on top of both,
  then gems/text last), the nameplate drawing as a plain full-canvas
  overlay (same convention as the frame itself), and the per-rarity cost
  number position table (`COST_XY_BY_RARITY` — all 4 rarities currently
  resolve to the same `(293, 311)`, see `CROSS_AGENT_LOG.md` for why an
  earlier per-rarity measurement pass got it wrong for Rare/Epic),
  including the unrecognized-rarity-falls-back-to-Common case. Doesn't
  pixel-diff the render (no visual-regression harness exists in this
  repo) — see `CLAUDE.md`'s "Locked layout anchors" table for the actual
  numbers this was tuned to, which were dialed in live against a real
  rendered card via `layout_tuner.html` (a new dev tool, also added
  2026-08-20) rather than pure measurement.

## Adding tests

Prefer calling the game's own internal functions directly (`makeUnit`,
`attackAction`, `validTargetsFor`, `beginBossFight`, etc. — see
`tests/helpers.js` and the existing specs for patterns) over simulating
clicks/drags for anything that isn't itself UI-specific — it's faster and
less brittle. Reach for real click/drag simulation when the thing under test
*is* the UI interaction (e.g. drag-to-attack).

If a test needs the AI's animation-paced play/attack loop to resolve
quickly, call `fastForwardTimers(page)` from `tests/helpers.js` first (see
`boss-rush.spec.js`'s full-playthrough test for an example) — it's a
test-only shim, nothing in the shipped game changes.
