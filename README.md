# Faction Clash — Playable Engine + Card Pipeline (now integrated)

This is the playable card game. The painted-card rendering pipeline (see
`CLAUDE.md`) and the full 8-keyword, 251-card set (Ashborn 100, Verdant
100, Neutral 51 — `ashborn_cards_batch1.json`, `verdant_cards_batch1.json`,
`neutral_cards_batch1.json`) are wired directly into the live engine —
there is no separate "old vector cards" system. Modes: standard match
(AI or local 2-player hotseat), Boss Rush/Gauntlet single-player (see
`BOSS_RUSH_DESIGN.md`), and a Deck Manager. Gameplay rules are documented
in `FACTION_CLASH_GAME_OVERVIEW.md`; art/asset conventions are in
`Art_Direction.md`; the Playwright suite under `tests/` exercises the
live engine via `file://` directly.

## Running it

**Easiest:** just open `index.html` directly in a browser by
double-clicking it. This works out of the box because the card/faction/
keyword data is embedded as a fallback (see "Why the fetch-fallback
exists" below) — but the painted-card art, frames, gems, and fonts are
always loaded as real image/font files, so you'll only see the actual
card art when the app can reach the `assets/` folder next to `index.html`
(works either way you open it, since those are plain `<img>`/`@font-face`
loads, not `fetch()`).

**Recommended for development:** serve the folder over http instead,
e.g. from this directory:

```
python3 -m http.server 8000
```
(or double-click `start-server.bat` on Windows)

then visit `http://localhost:8000/index.html`. This makes the app load
`ashborn_cards_batch1.json`, `cards/factions.json`, `cards/keywords.json`
with real `fetch()` calls instead of the embedded fallback, which is what
you want once you're actively editing card data.

## What's here

```
index.html              the game itself — landing screen, Deck Manager,
                         match screen, all in one file
card_renderer.html       read-only gallery of every card, real pipeline
card_editor.html         add/edit/delete cards with a live preview
ashborn_cards_batch1.json   the 100-card Ashborn set
verdant_cards_batch1.json   the 100-card Verdant set
neutral_cards_batch1.json   the 51-card Neutral pool (+1 Token)
cards/
  factions.json            per-faction theme/colors
  keywords.json            the 8 current keywords: Invoke, Start of Turn,
                            End of Turn, Cleave, Berserk, Last Word, Echo,
                            Growth
  unitTypes.json            Human/Animal/Construct/Elemental/Dragon
  card_template_v0.10.svg   layout reference doc (LOCKED)
css/
  card.css                 game-side card sizing/interaction states
                            (is-selected, game-can-attack, etc.) — the
                            actual card FACE is a CardBuilder SVG now,
                            not CSS-drawn layers (see below)
assets/
  js/cardBuilder.js         the real card-face renderer — one function,
                             CardBuilder.buildCard(card, keywordNames, opts),
                             shared by index.html, card_renderer.html and
                             card_editor.html
  css/card_render.css       fonts + text classes CardBuilder's SVG needs
  frames/, gems/, bottoms/, art/<faction>/   the painted card assets
  fonts/                    local font files (Cinzel, Libre Baskerville, PT Serif)
js/
  cardRenderer.js          CardRenderer.createCard(card, opts) — thin
                            adapter that wraps CardBuilder's SVG output so
                            the game (hand/board/mulligan/hover-preview)
                            has one stable call, same as before
  dataLoader.js             fetch-with-embedded-fallback data loading
  embedded-data-snippet.html   <script type="application/json"> blocks
                            copied into index.html's <body>
build_embedded_data.py    regenerates embedded-data-snippet.html from the
                           JSON sources above — run after editing card data
```

`js/svgAssets.js`, `gallery.html`, and `build_svg_bundle.py` were the OLD
(pre-2026-08) 56-card vector-card test set's build tooling — fully
retired, never loaded by `index.html`, and moved to `to be deleted/` at
the project root during the 2026-08-22 cleanup pass (originals replaced
with short stub notes pointing there). `cards/cards.json`, the data file
that tooling read, is out of scope for this cleanup pass (data/asset
files were left untouched) and still sits alongside the live
`*_cards_batch1.json` files even though nothing loads it anymore.

## Adding a new card

1. Drop the illustration in `assets/art/<faction>/<ID>.png` (e.g.
   `ASH041.png`) — or use `card_editor.html`, which manages this whole
   step for you with a live preview.
2. Add one entry to the relevant faction's card file (`ashborn_cards_batch1.json`,
   `verdant_cards_batch1.json`, or `neutral_cards_batch1.json` — see
   `CARD_SOURCES` in `js/dataLoader.js`) — this is everything about how
   the card *looks*: name, cost, stats, rules text, rarity, keywords,
   unitType.
3. If the card *does* something (any of the 8 keywords, or a spell/
   support effect), add a matching entry to the `ABILITIES` map near the
   top of `index.html`'s game-engine script, keyed by the card's id. This
   is the one piece that can't live in JSON — it's real code — but it's a
   small, isolated map with a documented trigger vocabulary (onPlay /
   onStartOfTurn / onEndOfTurn / onFirstDamage / onDeath / cleave /
   damageReduction / forceHighestDefense), not scattered through the
   engine. See the comment block above `ABILITIES` in `index.html` for
   the exact shape.
4. Run `python3 build_embedded_data.py` so the file://-fallback embedded
   copy stays in sync (only matters for the double-click-to-open path).

Nothing else needs to change. The renderer, hand, board, mulligan screen,
draw animation, and Deck Manager card pool all pick up new cards
automatically — they're all data-driven off the same `CARDS` array.

## Deck Manager

Reachable from the landing screen ("🗂 Deck Manager"). Build named decks
per mode — Normal (30 cards) or Boss (15 cards, for Boss Rush/Gauntlet
mode's smaller-deck requirement — see `BOSS_RUSH_DESIGN.md`) — single
faction identity + the
shared Neutral pool, max 2 copies of any one card. Decks are stored in
`localStorage` under `factionClashDecks`. A deck only becomes selectable
on the landing screen once it's "complete" (hits the mode's exact card
count) — picking a faction on the landing screen shows any complete
Normal decks for that faction as chips, alongside an always-available
"All Cards (Quick Play)" option that behaves like the old default
(shuffle the entire faction+neutral pool).

## Engine integration

`index.html`'s playable engine:
- Loads cards from all three faction files (`ashborn_cards_batch1.json`,
  `verdant_cards_batch1.json`, `neutral_cards_batch1.json` — not the old,
  retired `cards.json`).
- Renders every card everywhere (hand, board, mulligan, hover preview,
  Deck Manager pool) through the real `CardBuilder` painted-card pipeline
  — `js/cardRenderer.js` is a thin adapter, not a separate visual system.
- Has real gameplay logic for all 8 current keywords (see `ABILITIES` in
  `index.html`), replacing the old Rush/Growth/Frenzy trigger system
  entirely. A few effects that need to target "a specific card sitting in
  a player's hand" (discounts/buffs from Traveling Merchant, Sharpened
  Blade, Unbroken Emblem) use a `handMods` parallel array since hand cards
  don't otherwise have unique per-slot identity — see the comment above
  `newPlayerState` in `index.html`.
- A few cards' rulesText couldn't be implemented as literally described
  and are flagged as such directly in the `ABILITIES` map / this repo's
  known gaps (see `FACTION_CLASH_GAME_OVERVIEW.md`): Ember Whelp (ASH015)
  reads like an Invoke effect but isn't tagged with the keyword; Untrained
  Cook (ASH014) references a card ("Emergency Rations") that doesn't exist
  yet; Counter Intelligence (ASH011) "sees" the opponent's hand via the
  combat log only, since there's no persistent hand-peek UI; effects that
  pick "a" unit/card (Tactical Retreat, Traveling Merchant, Sharpened
  Blade) pick randomly, since no card in the game has ever had
  player-choice targeting.

## Why the fetch-fallback exists

Browsers block a page opened directly from disk (`file://…/index.html`)
from using `fetch()` to read its own sibling JSON files — this is a
browser security restriction, not something fixable from JS. So
`dataLoader.js` tries `fetch()` first (works great once you serve the
folder over http), and if that fails, falls back to reading identical
data embedded as `<script type="application/json">` blocks in the page
itself (works everywhere, including a plain double-click). Both copies
come from the same source files, so there's still one source of truth
when you're editing data — just re-run `build_embedded_data.py` after
changing anything under `cards/` or `ashborn_cards_batch1.json`. (Painted
card art/fonts are plain `<img>`/`@font-face` loads, not `fetch()`, so
they work the same either way you open the page.)

## Testing notes (2026-08-13 integration pass)

Verified with a headless-Chromium (Playwright) harness, not just visual
inspection: the full card set loaded at the time (40 cards — since grown
to 251, see `CLAUDE.md`) loads, a complete simulated
AI-vs-player match runs turn-by-turn to a win/loss with zero thrown JS
errors, and each of the 6 keyword mechanisms that existed at the time was checked directly against
a constructed board state (Invoke conditional buff, Start of Turn
recurring buff, End of Turn conditional buff, Berserk firing exactly once,
Last Word triggering on death, Cleave hitting adjacent defenders,
Shield Wall's damage-reduction passive, Challenge Banner's forced-target
passive) — all matched expected behavior. The Deck Manager was verified
building/saving a 30-card deck, having it appear as a selectable option on
the landing screen, and a match started with it drawing exactly from that
30-card pool. Not yet covered by this pass: 2-player local hotseat mode,
the mobile/touch hold-to-preview path, and visual/pixel verification of
the painted cards at in-game (small) sizes on a real machine.

## Post-launch fixes (2026-08-13, after the first test match)

Three changes made after playing a first real match:

- **Sound removed.** The synthesized Web Audio SFX + toggle buttons from the
  integration pass are gone entirely (not just disabled) — see the removal
  comment in `index.html` right where the old Sound code block used to be.
  Real sound design is planned for later; reviving the placeholder tones
  isn't the plan, so this was a clean deletion, not a mute.
- **Hand cards are bigger.** `--card-w` went from 92px to 150px (104px on
  narrow/mobile widths via a media query), and `.hand-area` grew to match.
  On short browser windows this can push the hand row below the fold —
  `#screen-game` was already `min-height:100vh` with normal page scroll (not
  a hard-capped single screen), so this isn't a new failure mode, just a
  slightly bigger version of scroll behavior that already existed.
- **Hearthstone-style drag-and-drop**, implemented as one small generic
  controller (`dragState`/`beginDrag`/`onDragMove`/`endDrag`, Pointer
  Events-based) used for two flows:
  - Drag a hand card onto a specific empty board slot (or anywhere on your
    own board, for spells) to play it there. A plain tap still auto-places
    into the first open slot, same as before.
  - Drag a ready unit straight onto a valid enemy unit or the enemy face to
    attack it. A plain tap still uses the old select-then-click two-step
    flow.
  A `dragJustHappened` flag guards the click handlers on drop targets
  (enemy units, the face) from double-firing right after a drop lands.
  **Important implementation note for future changes:** targets are
  re-resolved on every `pointermove`, not cached once at drag-start — the
  board can legitimately re-render mid-drag (the draw-card animation, an AI
  action, a floating-damage-number cleanup, anything that calls the full
  `render()`), which replaces the slot/unit/face DOM nodes outright. A
  one-time-cached target list would silently go stale and the drop would
  never register; this bit us during testing and the fix is now load-bearing
  — don't "optimize" it back to a single `findTargets()` call at drag-start.
  The one casualty: the old mobile long-press-to-preview gesture on hand
  cards is gone (it fought with the new drag gesture) — mobile now just
  taps to play; hover-preview still works on desktop. **Restored** in the
  legibility follow-up below via the same drag controller's `holdPreview`
  option, so this is no longer a real gap.

Re-verified via the same Playwright harness after these changes: sound is
fully absent from the DOM/globals, hand cards render at the new width, a
simulated drag correctly plays a card into a specific slot and correctly
attacks a specific enemy unit, and a 16-turn simulated match ran with zero
thrown JS errors.

## Legibility follow-up (2026-08-13, after the first drag-and-drop pass)

After playing with drag-and-drop, real in-match screenshots showed the
card text was unreadable at hand/board scale — confirmed to be a preview
*sizing* problem, not a missing-text or contrast bug (a card test-rendered
at ~700px reads crisply; the same data at the old 220px preview size does
not).

- **Hover/hold preview resized**, twice, per direct feedback: 220px → a
  too-small first pass → 300px (`bigCardWidth()` = `min(300,
  innerWidth*.55, innerHeight*.4)`), confirmed "perfect" by the user.
  Shared by the draw-card reveal animation too, so a newly drawn card
  shows at the same big, readable size before settling into the hand
  (the animation's `drawSwipe` keyframes intentionally end at `scale(.5)`,
  landing almost exactly on the 150px hand-card width for a seamless
  shrink-into-hand motion).
- **Touch hold-to-preview restored**, via the same `dragState`/`beginDrag`
  controller (a `holdPreview: {delayMs, onShow, onHide}` option): holding
  a card still (not dragging) for 350ms shows the zoomed preview and
  suppresses the tap-to-play that would otherwise fire on release.
- **Fixed a touch-tap-breaking bug found in the process:** `beginDrag()`
  was calling `preventDefault()` unconditionally on every `pointerdown`,
  which (on touch specifically) suppresses the browser's synthesized
  `click` event for the whole gesture — so a plain quick tap on a hand
  card silently stopped playing the card on touch devices the moment
  drag-and-drop shipped. Mouse taps were unaffected, which masked it in
  earlier testing. Fixed by moving `preventDefault()` out of
  `beginDrag()` and into `onDragMove()`, called only once the pointer
  actually crosses the drag threshold — by which point it's a real drag,
  not a tap.

## Board rework — single unified row, 8 slots (2026-08-13)

After the legibility pass, the user proposed a bigger structural change:
board cards were still small because there were 3 rows per side (6 rows
of tiny cards on screen counting both players). Replaced with a single
row of 8 free-form slots per side — see `FACTION_CLASH_GAME_OVERVIEW.md`
section 2 for the full rules-level writeup and design discussion. On the
code side:

- `state.players[side].board` changed from `{defense:[], attack:[],
  support:[]}` (4 slots each) to a flat `Array(BOARD_CAPACITY)` (8). A
  unit's `.row` field is unchanged and still real — it drives targeting
  priority, Cleave adjacency, and (now) a placeholder board-frame color —
  it just no longer restricts which physical slot a card can occupy.
  Every function that read the old three-array shape (`allUnits`,
  `cleanupDeaths`, `playCard`, `validTargetsFor`, `Game.summonTokens`,
  the Cleave branch of `attackAction`, the Start/End of Turn support-
  duration ticks, the AI's play/attack loop, hand-card playability, the
  hand-drag `findTargets`, and three card abilities — Ashborn Trainee,
  Tactical Retreat, Shield Wall — that read board shape directly) was
  rewritten against the flat array.
- **Cleave** now hits any physically adjacent slot in the row regardless
  of category (a Defense unit's Cleave-attacker can hit an Attack-row
  neighbor and vice versa), gated by a new `isCombatEntity()` helper so
  a duration-only Support card sitting in an adjacent slot is never hit —
  it has no combat stats, nothing there to damage. This was an explicit
  requirement from the user, verified directly: a Support card + Defense
  unit (attacked) + Attack unit in adjacent slots → only the Attack unit
  takes Cleave damage, the Support card's `.damage` field is never even
  touched.
- **Board cards render much bigger** (150px wide, was 78px) since there
  are only 2 rows on screen now instead of 6; a new tablet-width media
  query tier (≤1024px, on top of the existing ≤640px one) keeps 8 cards
  fitting without falling back to `.slots{overflow-x:auto}` horizontal
  scroll on common laptop/tablet widths. `.row-tag` (the old per-row
  Defense/Attack/Support label) is gone — position no longer implies
  category, so it wasn't meaningful anymore.
- **Placeholder board-frame color**: until real per-category board-frame
  art exists (the original motivation for this whole rework, similar to
  Hearthstone's taunt-frame treatment), a colored ring — blue/red/gold
  for Defense/Attack/Support — is drawn via `data-category` (already
  stamped on every card by `CardRenderer`), scoped to `#myBoard`/
  `#enemyBoard` only so hand cards aren't affected.
- **Board-unit hover/hold preview** (new): the big zoomed preview
  previously only worked on hand cards — once a card was played you
  couldn't read it again without a different UI path. `renderBoardUnit`
  now wires the same hover (desktop) / hold (touch) preview as hand
  cards, for both sides' board units and Support cards.
- **Fixed the real cause of "drag-and-drop doesn't work at all":** the
  Pointer Events drag controller worked correctly in every automated
  test, but real mouse-driven dragging did nothing for the user. Root
  cause — browsers make `<img>`/SVG `<image>` content natively
  draggable by default (the built-in "drag this image out of the page"
  gesture), and every card's art is exactly that. That native gesture
  was hijacking real mouse drags before the app's own `pointermove`
  tracking ever saw movement; Playwright's CDP-synthesized mouse input
  doesn't trigger the same native heuristic, which is why it passed
  automated testing while failing for the user. Fixed with one global,
  unconditional `document.addEventListener('dragstart', e =>
  e.preventDefault())` — safe because the app never uses native HTML5
  drag-and-drop anywhere, only Pointer Events. Confirmed with a
  Playwright test using real `page.mouse` actions (not CDP touch
  dispatch) dragging a hand card into a specific board slot and a board
  unit onto the enemy face — both landed correctly with this fix in
  place.
- **Not rebalanced**: the 40 existing cards were left as-is for the new
  8-slot capacity — "ship the mechanism first, rebalance later" was an
  explicit, deliberate choice, not an oversight.

Verified via the same Playwright harness: `BOARD_CAPACITY` is 8 and both
players' boards are flat 8-length arrays after a match starts; a
constructed board state confirms the Cleave/Support-card scenario above
exactly; 8 same-category units fill the board with no per-type sub-cap
and a 9th play is correctly rejected; `Game.summonTokens` respects the
shared flat capacity; `validTargetsFor` still excludes Support Units
post-Defense-clear (preserved, not silently changed — see Known Gap #2
in the overview doc); `cleanupDeaths` and the Start/End of Turn support-
duration ticks work correctly against the flat array; rendering produces
exactly one row and 8 slot cells per side with no leftover `.row-tag`/
`data-row`; real mouse-driven drag-and-drop (hand→specific slot,
board-unit→face) and real touch tap/hold (tap still plays a card, hold
still shows the board preview) all work; and a simulated multi-turn match
against the AI ran with zero thrown JS errors and never exceeded 8 units
per side.
