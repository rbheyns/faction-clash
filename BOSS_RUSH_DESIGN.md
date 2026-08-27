# Boss Rush Mode — Design (revised 2026-08-19, v2)

**This replaces the earlier "board-slot boss unit" draft of this doc.**
That draft was written before I had the user's real design conversation
and invented mechanics that didn't match it — most importantly, it put
the boss on the battlefield as an oversized unit. The user later had
ChatGPT summarize the actual "Faction Clash — Boss Rush Mode Reference"
conversation, which explicitly rules that out:

> "Bosses should visually occupy the opponent's Boss/Support area rather
> than behaving like an ordinary battlefield unit. The Boss itself is
> not simply another Unit card occupying one of the normal eight
> battlefield slots. The battlefield should remain available for the
> Boss's summoned and played units."

The user confirmed the fix directly: **the Boss occupies the hero slot
where an opposing player would normally be** — not a board unit. This
doc (and the shipped code) is built on that reference conversation, not
on invented placeholder content. Where the reference doc left something
explicitly "configurable for balancing," I picked a first-pass value and
say so — those are flagged below, not presented as settled.

Status: **v1 implemented and tested** in `index.html` — see
"Implementation status" at the bottom. **Gauntlet sequencing is also now
implemented** (2026-08-19, see "Gauntlet Mode" below) — the separate
Progression System is still future work, see "Not yet built."

## What this is

A single-player PvE mode. The player uses their normal deck, cards, AP,
hand and battlefield rules — the Boss simply replaces the opposing
player, using the *existing* battle engine, not a separate combat
system. On top of that normal game, the Boss has:

- A fixed 100 HP pool (configurable per boss), not the normal 30.
- Its own dedicated 15-card deck (its faction + Neutral, max 2 copies),
  hand-curated from real, existing cards — not brand-new custom cards.
- Deterministic, rule-based AI (no ML) — reuses the same play/attack
  loop as the normal AI opponent, since that loop already matches this
  mode's AI priorities (play what you can afford, attack the weakest
  target or the player when lethal/undefended).
- A small set of scripted abilities layered on top: Start-of-Turn
  triggers, every-N-turn triggers, and turn-based escalation, all
  defined as **data**, not special-cased code per boss.

## Core structural decision: no board-slot unit

The Boss's Health lives in `state.players.B.health`, exactly like a
normal player's hero HP, just with a higher ceiling
(`newPlayerState`'s new `maxHealth` override, defaulting to the global
`MAX_HEALTH=30` for everyone else). This means:

- `checkWinLoss()`, `attackAction()`, `dealDamageToFace`/`healFace`, and
  every other existing hero-HP code path work for a Boss fight
  **completely unmodified** (`healFace` was the one function that
  needed a small fix — it capped at the global `MAX_HEALTH` constant;
  it now caps at each player's own `maxHealth`).
- The Boss's battlefield stays free for its own played/summoned units —
  exactly as the reference doc requires.
- The Boss is presented to the player through a dedicated **Boss
  panel** (see "Boss UI" below) instead of the plain "The Enemy" hero
  block, but it's still fundamentally the same hero-face/health render
  path, just re-skinned when a boss fight is active.

## Boss Definition framework (data-driven, no `if boss===X` branching)

`BOSS_DEFINITIONS` is a plain object keyed by boss id. Each entry
carries: `id, name, faction, portraitIcon, health, deck (cardId→count
map), aiProfile, triggers[], encounterLesson`. The engine only branches
on a trigger's small `type` vocabulary (`reinforcements`,
`buffAllFriendly`, `healAllFriendly`) — never on which boss it is. A
future boss reusing these same three effect shapes is purely a new
`BOSS_DEFINITIONS` entry; a genuinely new *kind* of effect is the only
thing that would need a new `type` case in
`runBossStartOfTurnTriggers()`.

`aiProfile` is carried on every definition as a reserved hook — both v1
bosses use `'default'` (the shared AI loop) since neither of the two
reference encounters actually needs different priorities. A future boss
with a genuinely different AI shape can add real branching there without
touching anything else.

## Boss Health & Boss Deck

Both reference bosses use 100 HP, per the doc's explicit reference value.
Each boss's 15-card deck was pulled from the **real, current** Ashborn/
Verdant/Neutral card pool (max 2 copies of anything, matching the doc's
stated Boss-deck rule) — not invented cards:

**The Ashen Warlord** (Ashborn, aggressive/pressure kit): 2x Ashborn
Recruit, Ashborn Hunter, Raise the Alarm (Neutral), Experimental
Explosives, 2x Ashenblade, Pack Leader, Magma Cleaver, Direwolf
Berserker, Ancient Mercenary Captain (Neutral), Emberstone Golem, Shield
Bear, Ironclad Vanguard, The Ashen Warlord (yes — the boss's own kit
includes the existing Legendary card of the same name as a thematic
finisher). **Changed by the 2026-08-19 balance pass** below — the
original draft also included Emberwrath Dragonlord, Legion Juggernaut,
and Volcanic Harrier; all three were swapped for plain, cheap bodies
after simulation showed the deck's top end alone (independent of the
escalating abilities) was enough to out-race every test deck. The Ashen
Warlord card itself stayed in as the one big finisher.

**The Ancient Grove** (Verdant, durability/sustain kit): 2x Fernling,
Rootling, 2x Elderwood Treant, Healing Bloom, Willowmere Elder, Ironbark
Matriarch, Root Network, Worldroot Treant, Bloom of Ages, Circle
Sanctuary, Wellspring Oracle, The World-Wound Healed. (Unchanged by the
balance pass — Ancient Grove's problem was its abilities' cadence, not
its deck; see below.)

**Assumption I made, not yet confirmed with the user:** the reference
doc only specifies the *Boss's* deck at 15 cards — it's silent on the
player's own deck size for this mode. The project's existing Deck
Manager already has a working "Boss (15)" saved-deck format (built
before this correction, under the old assumption that both sides used
15-card decks). I kept using that existing infrastructure — the player
picks one of their own saved 15-card Boss decks to fight with, rather
than their normal 30-card deck or the full card pool. This is a small,
easily-reversible choice (one `if` in `refreshDeckPicker`/`beginBossFight`
would switch it to 'normal' 30-card decks instead) — flagging it here
rather than presenting it as settled.

## Boss AI

Reuses the existing `aiTakeTurn()` loop verbatim — no separate
`bossTakeTurn()` function exists in v1. That loop already does exactly
what the reference doc's "Boss AI" section asks for: play the
highest-cost card it can afford each step, then attack with each
eligible unit (target the weakest blocker, or the player's face
directly when undefended or lethal). This was a deliberate choice to
minimize new, untested code — the existing loop is proven from every
normal AI-opponent game.

## Boss Abilities (triggers)

`runBossStartOfTurnTriggers()` fires once at the start of every Boss
turn (see `endTurn()`), after `state.boss.turnCounter` increments (it
starts at 1 on the Boss's first turn — matching the doc's "Turn 3 / Turn
6 / ..." language, which counts the Boss's own turns, not the game's
overall turn count).

**These numbers are the post-balance-pass (2026-08-19) values.** The
doc's own literal numbers (and my first interpretation of Growth) are
what shipped in v1 and turned out to be badly overtuned — see "Balance
testing" below for how these were arrived at instead.

**The Ashen Warlord:**
- *Reinforcements* (every 2nd Boss turn, was every turn): summons one
  free unit from a turn-gated table, each printed a little below its
  real card's stats (a free reinforcement shouldn't hit as hard as the
  actual costed card) — Ashborn Recruit (turn 1+, 1/1 unchanged) →
  Ashborn Guard (turn 8+, printed 1/3 → 1/2) → Cinderclaw Raider (turn
  14+, printed 3/3 → 2/2) → Emberforged Colossus (turn 20+, printed 2/9
  → 2/6) → Brimstone Bastion (turn 26+, printed 4/13 → 3/9). The doc's
  "recruit → guardian → raider → elite" progression is preserved; the
  later tiers are now far enough out that most 15-turn fights only ever
  see the first one or two.
- *War Cry* (every 5th Boss turn, was every 3rd): permanent +Attack to
  all friendly units, +1/+2/+3/+5/+8 at Boss turns 5/10/15/20/25 (doc's
  own +2/+4/+8/+16/+32 was both shrunk and slowed). This was the single
  biggest overtuned number in v1 — a flat per-unit Attack buff
  multiplies by however many units are on board, and the Ashen Warlord
  routinely has 4-6, so the doc's +8 tier alone was a 40+ damage swing
  in one attack step.

**The Ancient Grove:**
- *Growth* (every 3rd Boss turn, was every turn): permanent
  +Attack/+Health to all friendly units, +1/+2/+4/+8/+16 at Boss turns
  3/6/9/12/15. Firing every single turn (my original interpretation of
  the doc's "at the start of the Boss's turn... eventually reach
  approximately +16/+16") compounded far harder than War Cry or Regrowth
  ever could, since it landed roughly 3x as often — simulation had it
  losing to every test deck by around Boss turn 6-9. Moved to the same
  cadence as the other two every-N-turn abilities.
- *Regrowth* (every 3rd Boss turn): heals all friendly units,
  +1/+1/+2/+4/+8 at Boss turns 3/6/9/12/15 (halved twice from the doc's
  +2/+4/+8/+16/+32 — the late tiers were undoing several turns of a
  winning player's damage in one heal, pushing wins past turn 15 even
  when the player was actually ahead).

## Boss UI

`renderStrip()` swaps in a boss-specific block when rendering side B
during an active boss fight: portrait icon + name instead of "The
Enemy," and a status line per trigger. Every-N-turn triggers render as
a countdown exactly matching the doc's own examples (`WAR CRY IN: 2
TURNS`, `REGROWTH NEXT TURN`); every-turn triggers show their current
per-application magnitude (`GROWTH: +4 PER TURN`). Everything else
about the strip (hero portrait/HP number, HP bar, AP track, deck/hand
counts) is the same code path normal play uses.

## Turn counter, turn limits, victory/defeat

`state.boss.turnCounter` is the accessible turn counter the doc asks
for — it drives every trigger above and is available to anything else
that needs it later (reward logic, achievements, a future turn-limit
encounter). **Turn limits are not implemented in v1** — the doc frames
them as optional per-encounter ("Not every Boss needs one"), and neither
of the two reference encounters requires one; adding one later is a
`turnLimit` field on a definition plus a check in `runBossStartOfTurnTriggers`
or `checkWinLoss`, not a structural change.

Victory/defeat reuse `checkWinLoss()` unmodified (Boss Health ≤ 0 = win,
player Health ≤ 0 = loss) — I only added a small branch for boss-flavored
title/text ("You have defeated The Ashen Warlord!" instead of the
generic "Victory" copy), reading the boss's own `.name` field, not a
hardcoded string per boss.

## Balance testing (2026-08-19)

The user playtested v1 by hand and reported the Reinforcements summons
were too strong; separately asked me to run my own simulated tests and
tune both bosses until a player wins "some of the time" by Boss turn 15,
across a variety of decks rather than one lucky build. Method:

- A Playwright harness drives full games headlessly against the real
  `index.html` — not a reimplementation of the rules. A small in-page
  shim clamps every `setTimeout` to ~1ms so the AI's animation-paced
  play/attack steps resolve almost instantly, which is the only thing
  that makes running dozens of full games practical.
- Both sides are piloted by the same simple bot: play the
  highest-cost affordable card each step, then attack with every
  eligible unit (weakest available blocker, or the player's face when
  undefended/lethal) — this is *exactly* the heuristic `aiTakeTurn()`
  already uses for the Boss, applied to the player's side too, so both
  sides play at the same baseline competence. A real human should
  usually do at least as well as this bot (better sequencing, better
  target priority), so these win rates are a **lower bound**, not a
  ceiling, on what a real player should see.
- Six 15-card test decks were generated programmatically from the
  current real card pool (3 archetypes — aggro/control/midrange — for
  each of Ashborn and Verdant), each hand-checked for a sane cost curve
  (a first generator pass produced a "control" deck with nothing under
  5 AP, which just sat with an empty board for 5 turns and lost for a
  reason that had nothing to do with the Boss — worth flagging in case
  anyone reuses this harness later).
- Ashborn decks fight The Ancient Grove; Verdant decks fight The Ashen
  Warlord (v1's fixed opposing-faction mapping).

**Findings, in the order they were fixed** (each is also called out
inline above, next to the number it changed):
1. Growth firing every Boss turn (not every 3rd like its siblings)
   compounded much harder than the doc's own numbers for War Cry/
   Regrowth — 0% win rate, losses around turn 6-9.
2. War Cry's flat per-unit Attack buff scales with board size, not just
   turn number — on the Ashen Warlord's typically 4-6-unit board, the
   doc's own +8 tier was a 40+ damage swing in a single attack step.
3. Once both abilities were retuned, the Ashen Warlord's *base deck*
   (independent of any ability) still out-raced every Verdant test deck
   — three of its biggest single-body finishers were swapped for plain
   cheap bodies, leaving The Ashen Warlord itself as the one real
   late-game bomb.
4. Regrowth's late tiers were undoing several turns of a winning
   player's own damage in one heal, pushing otherwise-winning games past
   the turn-15 target — halved again.

5. While re-applying this pass after a concurrent-edit merge with Codex's
   work (see `CROSS_AGENT_LOG.md`), found that `runBossStartOfTurnTriggers()`
   still called the *old* `Game.summonTokens()` for Reinforcements — the
   `weaken` fields on `summonTable` (added to address the user's original
   "summons too strong" report) were present in the data but never applied,
   meaning every re-tested Reinforcements summon was silently at full,
   un-discounted stats. Fixed by inlining the summon (see code comments) so
   `weaken.atk`/`weaken.hp` actually subtract from the placed unit's buffs.

**Result after this pass** (24 games per deck, Boss turn cap 20, run in two
batches of 8+16 to fit tool time limits — reported as pooled totals):

| Deck | Boss | Win rate | Win rate by turn 15 |
|---|---|---|---|
| ashborn_aggro | Ancient Grove | 54% | 46% |
| ashborn_midrange | Ancient Grove | 38% | 29% |
| ashborn_control | Ancient Grove | 0% | 0% |
| verdant_control | Ashen Warlord | 21% | 17% |
| verdant_aggro | Ashen Warlord | 0% | 0% |
| verdant_midrange | Ashen Warlord | 4% | 0% |

Both bosses are beatable by multiple deck archetypes at a real,
non-trivial "by turn 15" rate (17-46%), meeting the "some of the time by
turn 15" target — this held up over a larger, pooled sample (n=24/deck),
not just the smaller first-pass batch above. Three of the six decks
(Ashborn "control", Verdant "aggro", Verdant "midrange") lost essentially
every simulated game across the full sample; I left these as genuinely
harder matchups rather than continuing to nerf, since the goal was
"beatable sometimes across a variety of decks," not "every archetype
favored" — and a real human player should outperform the simple bot used
here (see Method above). Verdant as a whole underperforms Ashborn here
(none of its three archetypes reach Ashborn's best numbers); if a real
player finds the Ashen Warlord matchup consistently rough regardless of
deck, the next lever to pull is probably The Ashen Warlord unit itself
(12/11 for 10, a near-unkillable persistent 12-damage clock once it lands)
rather than the triggers, which are already fairly light by this point.
This is a tuning pass based on bot-vs-bot play, not a final one — once
real people play it, these numbers should move again.

## Menu / entry point

The start screen's "Choose your opponent" row gets a third option, "👑
Boss Rush," alongside "vs. AI Opponent" and "Local 2-Player." Picking it
switches the deck picker to the player's saved 15-card Boss decks (no
"Quick Play" full-pool fallback — a boss encounter assumes a real,
deliberately-built deck) and requires picking a complete one before
"Begin Battle" activates. **v1 boss mapping** (no boss-select UI yet):
you fight the *opposing* faction's boss — Ashborn player → The Ancient
Grove, Verdant player → The Ashen Warlord.

A fourth option, "👑👑 Boss Gauntlet," sits alongside it and uses the same
faction/15-card-Boss-deck pickers — see "Gauntlet Mode" below.

## Gauntlet Mode (added 2026-08-19)

The one follow-up "Not yet built" explicitly called out once v1 shipped:
fight boss 1, then immediately boss 2, with the player's Health carried
over rather than a fresh 30/100 reset between fights.

- **Scope is deliberately narrow**, matching the same "don't
  over-engineer yet" instruction the rest of Boss Rush follows: only the
  player's **Health** carries over between legs. AP, hand, board, and
  deck are all a completely fresh encounter setup for each boss (same as
  starting Boss Rush normally) — the reference material only ever said
  "carried-over HP," not a persistent deck/board/hand run-state, so
  anything beyond HP would be inventing scope rather than following it.
- **Data-driven, same pattern as `BOSS_DEFINITIONS`**: a new
  `GAUNTLET_DEFINITIONS` object, keyed by gauntlet id, holding just a
  `name` and an ordered `bossOrder` array of existing `BOSS_DEFINITIONS`
  ids. No new boss content and no new trigger types — a future
  gauntlet-only boss is a new `BOSS_DEFINITIONS` entry plus a longer
  `bossOrder`, not an engine change. Only one gauntlet exists so far:
  `classic`, `bossOrder: ['ancient_grove', 'ashen_warlord']`.
- **Assumption I'm making, not confirmed with the user** (flagged the
  same way this doc flags its own v1 assumptions above): with only two
  bosses total, there's no ordering that's "the easier fight first" for
  both factions symmetrically. The 2026-08-19 balance pass found Ashborn
  decks beat The Ancient Grove noticeably more often than Verdant decks
  beat The Ashen Warlord (46% vs 17% "by turn 15" best case) — so Ancient
  Grove goes first here as the relatively gentler encounter, and The
  Ashen Warlord, the harder matchup in that data, closes the gauntlet as
  its final boss. This favors "escalating difficulty" as the standard
  gauntlet feel over "always end on your own faction's worse matchup" (a
  Verdant player fighting Ashen Warlord second still gets that). One
  array to re-order if real playtesting says otherwise.
- **Mechanics**: `state.boss` gains `gauntletId`/`gauntletIndex` fields
  when a Gauntlet is active. `checkWinLoss()` checks for a live gauntlet
  with more bosses remaining *before* its normal win/loss branch — if
  found, instead of ending the game it shows a new interstitial overlay
  (`showGauntletTransition()` / `#gauntletOverlay`, mirroring
  `showPassOverlay()`'s title/text/callback pattern) naming the boss just
  defeated, the player's surviving Health, and the next boss, then a
  "Continue" button calls `advanceGauntletToNextBoss()` — which builds a
  completely fresh encounter `state` via a new shared
  `buildBossEncounterState()` helper (factored out of `beginBossFight()`,
  which now just calls it too) except side A's Health is seeded from the
  fight that just ended instead of a full reset. Losing at any stage
  (player Health ≤ 0) ends the whole run immediately as a defeat — there
  is no "continue from boss 2" retry; only defeating every boss in
  `bossOrder` wins the run, with victory text calling out the gauntlet by
  name ("You have conquered The Classic Gauntlet!").
- **UI**: the Boss panel (`renderStrip()`) appends "Boss X of Y" next to
  the boss's name/portrait whenever `state.boss.gauntletId` is set, so a
  Gauntlet leg is visually distinct from a standalone Boss Rush fight.
- **Not built as part of this pass** (same "don't over-engineer"
  instinct as v1): a Gauntlet boss-order picker (moot with only one
  gauntlet definition), per-leg turn limits, and anything beyond the
  single "Ashborn or Verdant → the same fixed two-boss order" — these are
  natural follow-ups once a second gauntlet or a third boss exists.

Validation: `node --check` on extracted inline JS passed; new Playwright
tests in `tests/gauntlet.spec.js` cover the start-screen mode-button
wiring, a gauntlet starting on the correct first boss, the mid-run
transition overlay (not the terminal end screen) firing on a mid-gauntlet
boss defeat with the player's HP carried forward correctly, a full
gauntlet victory's conquest-flavored text, an immediate defeat ending the
whole run without a transition, and — separately from all the
HP-shortcut tests above — a real bot-vs-both-bosses AI playthrough that
clicks through the actual transition overlay like a player would, with
zero page errors.

## Not yet built (explicitly out of scope for this pass, per the
reference doc's own "don't over-engineer yet" instruction)

- **Turn limits / alternate victory conditions** (survive X turns,
  phases, etc.) — explicitly framed as future possibilities in the
  reference doc, not part of the v1 goal list.
- **Per-boss AI profiles** — `aiProfile` is a reserved field; both v1
  bosses share the same deterministic loop.
- **Further balance passes** — the simulated tuning pass (see "Balance
  testing" above, n=24 games/deck) got both bosses to a real, non-trivial
  "by turn 15" win rate on at least one archetype each (Ashborn best-case
  46%, Verdant best-case 17%), but it's still bot-vs-bot data, not human
  playtesting, and three of six archetypes (Ashborn "control", Verdant
  "aggro", Verdant "midrange") essentially never won a simulated game.
  Verdant underperforms Ashborn overall — if that holds up with real
  players, The Ashen Warlord unit itself (12/11 for 10, see "Balance
  testing") is the next lever, not another trigger nerf. Real player
  feedback should keep moving these numbers. Also still true: the boss
  decks reference specific existing card ids that Codex's in-flight
  Ashborn/Verdant/Neutral variety pass may rework — see the "Active
  design rules" entry in `CROSS_AGENT_LOG.md` for the current list.
- **Boss portrait art** — v1 uses a plain emoji glyph (🔥 / 🌿) in the
  panel; real art is a follow-up.

## Implementation status

Implemented and tested in `index.html` (search `BOSS MODE` for the exact
code, right before `beginGame()`):
`BOSS_DEFINITIONS` (both encounters), `newPlayerState()`'s `maxHealth`/
`deckIds` overrides, `Game.healFace`'s per-player HP cap fix,
`beginBossFight()`, the boss-turn-counter/trigger hook in `endTurn()`,
`runBossStartOfTurnTriggers()` + `bossTierValue()` +
`bossTriggerDue()`, the boss-aware branch in `checkWinLoss()`, the Boss
panel in `renderStrip()`, and the "👑 Boss Rush" start-screen entry
point (mode picker, deck picker, start button).

Verified via a scripted Playwright playthrough (not just a syntax
check): both boss decks validated at exactly 15 cards / real card ids /
max-2-copies; a full boss-fight loop (mulligan → turn counter advancing
→ Reinforcements/War Cry/Growth/Regrowth firing on schedule → win and
loss messaging) ran to completion with zero JS runtime errors; the Boss
panel's countdown text was captured live and matches the reference
doc's own UI examples verbatim (`WAR CRY IN: 2 TURNS`, `REINFORCEMENTS
ACTIVE`).

A second pass (also 2026-08-19, same day) retuned Reinforcements/War
Cry/Growth/Regrowth's cadence and magnitude and swapped three cards in
the Ashen Warlord's deck, based on a bot-vs-bot simulation across six
varied test decks — see "Balance testing" above for the methodology and
before/after numbers. Re-verified with the same correctness tests after
every tuning change (deck validity, full-game completion, zero runtime
errors) plus the new simulation harness for win-rate signal.

A third pass (also 2026-08-19) added Gauntlet Mode — see that section
above for the full design. Implemented: `GAUNTLET_DEFINITIONS`,
`buildBossEncounterState()` (factored out of `beginBossFight()`),
`beginBossGauntlet()`, `advanceGauntletToNextBoss()`, the gauntlet branch
in `checkWinLoss()`, `showGauntletTransition()` + `#gauntletOverlay`, the
"Boss X of Y" note in `renderStrip()`, and the "👑👑 Boss Gauntlet"
start-screen entry point (reusing the existing faction/15-card-Boss-deck
pickers). Verified via `tests/gauntlet.spec.js` — see "Gauntlet Mode"
above for exactly what's covered, including a real bot-vs-both-bosses
playthrough that clicks through the transition overlay like a player
would, not just an HP-shortcut check of `checkWinLoss()`'s branching.
