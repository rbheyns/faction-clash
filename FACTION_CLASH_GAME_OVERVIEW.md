# Faction Clash — Game Overview & Project Status

This is the standing reference for the whole game — design, rules, and
where the build actually stands. `CLAUDE.md` covers the card-builder
pipeline specifically (fonts, anchors, asset layering); this document
is everything around it.

---

## 1. What Faction Clash Is

A digital trading card game. Two players each command a deck built
from their chosen faction plus a shared neutral pool, playing units
and spells onto a segmented board to break the opponent's hero health
before their own runs out.

---

## 2. Core Rules

### Setup
- Each hero starts at **30 Health**.
- Player 1 opens with a **3-card hand**, draws on their first turn
  (→ 4 cards). Player 2 opens with **4 cards** (the standard
  going-second compensation), draws on their first turn (→ 5 cards).
- **Mulligan**: before the match starts, each player may swap any
  number of their opening hand cards for new ones drawn from their
  deck.
- **Hand limit is 7** — drawing past that discards the drawn card
  (checked both on the normal turn draw and on any card effect that
  draws cards).

### Action Points (AP)
- Start at 1 AP on your first turn, **+1 per turn, capped at 10**.
- AP fully refills at the start of each of your turns.

### The Board
- **As of 2026-08-13, each side has a single unified row of 8 slots**
  (replacing the earlier 3-rows-of-4/5 design described in older notes —
  that version was never fully built past 4 slots per row and has been
  superseded, not extended). This is a deliberate Hearthstone-style
  rework: fewer total rows on screen (2 instead of 6, counting both
  players) means each card can render much bigger.
- **Capacity is 8 total per side, free-form** — any mix of
  Defense/Attack/Support cards, no per-type sub-cap. A Defense-heavy or
  Attack-heavy board is entirely legal; nothing reserves slots by type.
- A card's Defense/Attack/Support **category is still real data** — it
  drives which cards are valid attack targets, Cleave adjacency, and
  which painted board-frame art a unit gets (real per-category frame
  PNGs, not a placeholder). It just no longer restricts *where
  physically* on the board a card can be placed — any card can go in
  any open slot.
- **Slot position is now tactically meaningful**: Cleave hits whatever
  is physically adjacent in the row, regardless of category — a Defense
  unit next to an Attack unit means Cleave can hit both. Duration-only
  Support cards have no combat stats and can never be hit by Cleave (or
  anything else) even if they're sitting in an adjacent slot.
- The 40 existing cards were **not** rebalanced for this — the mechanism
  shipped first, by design (see project memory for the discussion). A
  rebalance pass is a deliberately deferred follow-up.

### Combat targeting
- **Defense is the only mandatory blocker.** While the opponent has
  any Defense-row unit alive, attacks must target it.
- **Once Defense is cleared**, the attacker gets an open choice
  between: any remaining Attack-row unit, **any Support-row unit that
  has combat stats (a Support Unit, not a duration-based Support
  card)**, or the enemy hero directly.
  - Support *Units* (the kind with Attack/Health, not the
    duration-based kind) are fair game once Defense is down, same
    tier as Attack-row units and the face. Support *cards* (no
    stats, duration-only) still have no combat presence and remain
    untargetable — there's nothing there to meaningfully attack.
  - **Implemented** — `validTargetsFor()` in `index.html` returns
    Attack-row and Support-Unit units alike once Defense is clear.

### Turns
- **60-second turn timer**, auto-ends the turn on expiry.
- Turn order: untap/reset → draw → play cards / attack in any order
  the player chooses → end turn.

### Win condition
- Reduce the opponent's hero Health to 0.

---

## 3. Factions

Two factions plus a shared neutral pool — not expanding beyond two
factions for now.

| Faction | Identity | Target card count |
|---|---|---|
| **Ashborn Legion** | Aggressive fire & sacrifice — reward fast, relentless pressure | 100 |
| **Verdant Circle** | Patient growth & nature magic — reward long-game control | 100 |
| **Neutral** | Usable by either faction | 51 |

**251 cards total** at the current build-out — both main factions were
expanded from an original 60-card target to 100 on 2026-08-17, to make
room for extra Attack/Defense units and to round out thin cost brackets
(see CLAUDE.md for the full rationale). As of 2026-08-17: Ashborn's 100
(`ashborn_cards_batch1.json`) and Verdant's 100 (`verdant_cards_batch1.json`)
are both fully designed with matching Attack28/Defense28/Support-unit14/
Spells20/Support-duration10 compositions and identical rarity spreads,
plus a 51-card Neutral pool (`neutral_cards_batch1.json`, up from 1 card
that same day) — all 251 designed and fully wired into the live engine
(see section 6).

---

## 4. Card Types & Categories

Four visual/mechanical categories, each with its own icon and board
row: **Attack, Defense, Support, Spell.**

### The two-tier Support system
This is easy to conflate and worth stating precisely:

- **Support Unit** — has Attack/Health stats, occupies the Support
  row, behaves like any other unit: stays on the board until killed
  in combat, no duration. Its ability (if any) repeats every turn
  indefinitely. Now targetable in combat once Defense is cleared (see
  above).
- **Support card** — no combat stats, occupies the Support row, has a
  **duration** (in turns) and automatically disappears when it
  expires. Never targetable in combat — nothing there to hit.

Both use the same Support type-icon; the presence or absence of
Attack/Health stats (and a `duration` field vs. not) is what
distinguishes them in data.

### Rarity
Common / Rare / Epic / Legendary, frame art built and verified for
all four. **Every card across all three pools has a real assigned
rarity** — no cards are left on the "Common" default. The design
target (kept exactly, per each card batch's own rationale notes) is
roughly a 62/23/10/5% Common/Rare/Epic/Legendary split.

---

## 5. Keywords

Eight keywords exist, all with real gameplay logic in the live engine,
not just card-face text: **Invoke** (battlecry — fires on play),
**Start of Turn**, **End of Turn**, **Cleave** (also damages adjacent
units in combat), **Berserk** (fires once, the first time the unit
takes damage), **Last Word** (fires on death), **Echo** (added
2026-08-17 — fires every time *another* friendly unit is destroyed,
repeatable, for as long as this unit is on the board; distinct from
Last Word, which only fires on the unit's own death), and **Growth**
(added 2026-08-17 for the Verdant Circle set, revised 2026-08-19 to
be self-only — triggers at the start of the controller's turn only if
the unit took no damage since its last check; it does not spread to
adjacent units). More keywords will be added as more cards get
designed; there's no fixed roadmap for what they'll be yet. An
earlier, unrelated prototype had its own Rush/Growth/Frenzy keywords;
those are fully retired — the current Growth above is a deliberate,
differently-defined reintroduction of the name, not a revival of that
old mechanic.

---

## 6. What's Actually Been Built

**Note:** this doc has a history of drifting out of date behind the code
(most recently caught and corrected 2026-08-22 — Boss Rush shipping,
Verdant/Neutral getting wired in, the full rarity pass, and the two new
keywords had all landed without this file being revisited). If something
here looks off against a fresh read of `index.html`, trust the code and
`CROSS_AGENT_LOG.md`'s latest entries over this doc, and fix this doc to
match rather than assuming the code is wrong.

### The playable engine (HTML/JS) — now running on the real card set
- Full turn/combat/AP/mulligan/hand-limit logic
- A simple AI opponent (greedy play, prioritizes lethal, otherwise
  takes good trades) and a local 2-player hotseat mode
- Floating damage/heal numbers, a play-by-play combat log, a visible
  turn timer, and local win/loss stat tracking (`localStorage`-backed)
- **Card rendering now uses the real painted-card pipeline** (see
  section 6b) instead of the old CSS/SVG vector cards — that old system
  is fully retired.
- **All 8 current keywords have real gameplay logic** (Invoke, Start of
  Turn, End of Turn, Cleave, Berserk, Last Word, Echo, Growth — see
  section 5), keyed per-card in `index.html`'s `ABILITIES` map (216
  unique entries as of the 2026-08-19 audit, covering the large majority
  of the full card pool) — replacing the old Rush/Growth/Frenzy trigger
  system entirely. See `README.md`'s "Engine integration" section for
  the handful of documented simplifications (random targeting where the
  card text implies a choice, since no card *effect* in the game has
  player-choice targeting — attacks do, via click-to-attack or drag-and-
  drop; a couple of cards whose rulesText couldn't be implemented as
  literally written — flagged directly in code and in Known Gaps below).
- **Deck Manager**: build/save/delete/duplicate named decks per mode —
  Normal (30 cards) or Boss (15 cards, for Boss Rush/Gauntlet mode, see
  below) — single faction + Neutral, max 2 copies per card and max 1
  copy of a Legendary, stored in `localStorage`. The landing screen lets
  you pick one of your complete decks for that faction, or fall back to
  the old "shuffle the whole pool" quick-play behavior.
- **Boss Rush and Boss Gauntlet modes are built and shipped** (2026-08-19)
  — a single-player mode against a scripted boss with its own health,
  triggers, and (for Gauntlet) a multi-boss run sequence. See
  `BOSS_RUSH_DESIGN.md` for the full design and implementation detail;
  that doc is current and doesn't need cross-checking against this one.
- **Verdant Circle and the Neutral pool are fully wired into the live
  engine**, not just data — both load in `index.html`, both have real
  `ABILITIES` entries, and both factions are selectable from the start
  screen.
- Sound was built once (synthesized SFX), then removed entirely on
  2026-08-13 at the user's request after the first test match — not
  paused/disabled, actually deleted. Real sound design is a later task,
  not a revival of the old placeholder tones.
- **Hearthstone-style drag-and-drop** (added 2026-08-13): drag a hand card
  onto a specific board slot to play it there (or anywhere on your own
  board for spells), or drag a ready unit straight onto a valid enemy
  target to attack it. Plain taps still work as a fallback (auto-place /
  select-then-click). Hand cards also got bigger (92px→150px) per the same
  post-match feedback. See `README.md`'s "Post-launch fixes" section for
  the implementation details and a load-bearing gotcha (drop targets must
  be re-resolved every pointermove, not cached, because the board can
  re-render mid-drag). **Fixed later the same day:** real mouse-driven
  drags weren't working at all in practice (only synthetic/automated
  drags were) — the browser's built-in "drag this image out" gesture,
  active by default on the `<img>`/SVG `<image>` art inside every card,
  was hijacking the gesture before the app's own drag tracking saw it
  move. Fixed with a global `dragstart` → `preventDefault()` (the app
  never uses native HTML5 drag-and-drop, only Pointer Events, so this is
  safe everywhere).
- **Board rework — single unified row, 8 slots, free-form** (2026-08-13):
  replaced the old 3-rows-of-4 board with one flat 8-slot row per side —
  see section 2 "The Board" above for the full rules-level description.
  On the code side: `state.players[side].board` went from `{defense:[],
  attack:[], support:[]}` to a flat array; a unit's `.row` is still real
  metadata driving targeting/Cleave/frame-color, just no longer a
  placement restriction. Every function that used to key off the three
  row arrays (`allUnits`, `cleanupDeaths`, `playCard`, `validTargetsFor`,
  Cleave in `attackAction`, the Start/End of Turn support-duration
  ticks, the AI's play/attack loop, hand-card playability, drag/drop
  target resolution, and three card abilities that read board shape
  directly) was rewritten against the flat array. Cleave now hits any
  physically adjacent slot regardless of category, gated by a new
  `isCombatEntity()` helper so duration-only Support cards (no stats)
  can never be hit even when sitting next to the target. Board cards
  render much bigger (150px wide, was 78px) since there are only 2 rows
  on screen now instead of 6; each card gets real painted per-category
  board-frame art (`assets/frames/board/frame_*.png`, added in the
  2026-08-20 frame rework — no placeholder ring anymore). The 40
  cards that existed at the time were deliberately **not** rebalanced for
  the new capacity — shipped as "mechanism first, rebalance later," a
  conscious choice, not an oversight.
- **Board-unit hover/hold preview** (2026-08-13, same pass): the big
  zoomed card preview — previously hand-cards-only — now also works by
  hovering (desktop) or holding (touch) any unit or Support card sitting
  on the board, not just cards still in hand. Previously, once a card
  was played its text became unreadable again until it died or you
  clicked a different one; this was a specific gap the user flagged.
- Original 56-card test set — fully scrapped and no longer loaded by the
  engine at all as of 2026-08-13 (previously it was scrapped as *content*
  but the file was still what the engine read at runtime).

### 6b. The card rendering pipeline — now the live game's renderer
The from-scratch, higher-fidelity system described in `CLAUDE.md` (layered
SVG compositor: real painted frame/gem/bottom-module assets + live-rendered
text on top) is what draws every card in the actual game now — hand,
board, mulligan, hover preview, and the Deck Manager's card pool all go
through the same `CardBuilder.buildCard()` function the card gallery and
editor use. `js/cardRenderer.js` is a thin adapter around it, kept so the
rest of the engine didn't need call-site changes.
- All four rarity frames (Common/Rare/Epic/Legendary) have been
  rendered and visually verified end-to-end, as of the 2026-08-20
  full-card frame rework (see `CLAUDE.md` for the current layout
  anchors and text styling).

---

## 7. Known Gaps

Things that are decided or in progress but not yet actually built:

1. **Board card sizing above ~1024px is fixed, not fluid** — board cards
   render at a fixed 150px (110px ≤1024px, 90px ≤640px) rather than
   scaling continuously with viewport width; very large or very small
   windows outside those tiers may show more/less breathing room than
   ideal. A `.slots{overflow-x:auto}` horizontal scroll is the safety
   net if 8 full-size cards don't fit.
2. **Sound** — built once, then removed entirely (2026-08-13). Revisit
   with real sound design later, not the old placeholder tones.
3. **A few card effects have documented simplifications or gaps** (see
   `README.md`'s "Engine integration" section for the full list):
   Ember Whelp (ASH015)'s Invoke-shaped rulesText isn't tagged with the
   keyword and isn't implemented as a guess; Untrained Cook (ASH014)
   references a card ("Emergency Rations") that doesn't exist yet, so its
   End of Turn effect safely no-ops until that card is added; Counter
   Intelligence (ASH011) surfaces its "see the opponent's hand" effect via
   the combat log only, since no persistent hand-peek UI exists.
4. **Boss portrait art is still a placeholder** (plain 🔥/🌿 emoji glyphs,
   per `BOSS_RUSH_DESIGN.md`) — real painted boss art is a follow-up, not
   blocking, since Boss Rush/Gauntlet mode itself is fully shipped.

---

## 8. Rough Roadmap

Ongoing card design and the detailed build both continue directly in the
project rather than in this doc — this is meant as a snapshot to keep
design and engine in sync as that happens. Broad shape of what's left:

- Card design is now at 251 cards (100 Ashborn / 100 Verdant / 51
  Neutral) — Ashborn, Verdant, and Neutral are all at their current
  targets; no more raw card design is queued up.
- Verdant and Neutral are fully wired into `index.html` now, along with
  Ashborn — `ABILITIES` entries cover the large majority of the pool
  (216 unique entries as of the 2026-08-19 audit). Spot-check for
  individual gaps rather than assuming a whole faction is unwired.
- Add keywords as new card effects need them, plus real icon assets for
  the 8 that exist (currently unused placeholder paths).
- Design and build the Progression System (persistent unlocks, Faction
  War) described in the separate design doc.
- Boss content: more bosses/gauntlets, and real painted boss portrait
  art (currently emoji placeholders) — Boss Rush/Gauntlet mode itself
  is already shipped, this is incremental content on top of it.
- Revisit sound.
- Eventually: online multiplayer (P2P first, per the decision recorded in
  project memory), and packaging for Steam/Microsoft Store/Google Play.
