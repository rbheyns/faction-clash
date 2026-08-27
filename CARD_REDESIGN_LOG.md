# Ashborn Card Redesign Log

This is the cross-agent handoff record for Ashborn card redesigns. It is
intended for Claude, Codex, or any future contributor who needs to know which
cards changed, what the face says, and which runtime behavior supports it.

Canonical data remains `ashborn_cards_batch1.json`. After changing any card
JSON, run:

```powershell
python build_embedded_data.py --update-index
```

This updates `js/embedded-data-snippet.html` and the offline embedded JSON in
`index.html`. Do not hand-edit only the embedded copy.

## Implemented Batch 1

| Card | Current rules text | Runtime note |
|---|---|---|
| ASH046 Magma Cleaver | Whenever this attacks, deal 1 damage to all other units. | `onAttackResolved`; damages every other combat unit after its attack. |
| ASH047 Ashwing Drake | Berserk: Add a copy of the last spell you played to your hand. | Tracks `lastSpellPlayedId` per player. |
| ASH055 Molten Colossus | Berserk: Swap this unit's Attack and Health. | Uses the stat-swap helper; swap cannot itself kill the unit. Stats changed to 4/11. |
| ASH067 Cinderclaw Raider | Berserk: Return this unit to your hand. It costs 1 less. | Returns before cleanup and receives a hand-only 1-cost discount. |
| ASH073 Emberforged Colossus | End of Turn: If damaged, give adjacent friendly units +1 Attack. | Checks physical neighbors in the 8-slot row. |
| ASH076 Emberstorm Reaver | Whenever this destroys a unit, deal 2 damage to units adjacent to it. | Direct and Cleave kills from its attack can trigger the neighbor blast. |
| ASH082 Volcanic Harrier | Berserk: Gain Cleave. When this dies, deal 4 damage to the enemy Hero. | Berserk grants Cleave and sets its death burn. |
| ASH087 Ember Ward | The first friendly unit destroyed each turn returns to your hand. | One return per global turn, tracked on the support entity. |
| ASH088 Dreadflame Champion | Units damaged by this cannot attack during their next turn. | Applies the existing stun-turn state to direct and Cleave damage. Stats changed to 10/7. |
| ASH089 Molten Bulwark | End of Turn: If damaged, restore 3 Health to this and draw a card. | Restores current Health then draws. Stats changed to 4/14. |

## Implemented Batch 2

| Card | Current rules text | Runtime note |
|---|---|---|
| ASH049 Trained Mastiff | Start of Turn: Give adjacent friendly Animals +1 Attack. | Physical-neighbor Animal filter. |
| ASH071 Ashfang Marauder | Invoke: Destroy the damaged enemy unit with the lowest Health. | Selects lowest current Health among damaged enemy units. |
| ASH074 Battle Standard-Bearer | Adjacent friendly Attack units have Cleave. | Passive adjacency aura checked during attack resolution. |
| ASH077 Ashen Rampart | Last Word: Summon two Ashborn Recruits. | Uses the death slot index and creates summoning-sick ASH001 recruits. |
| ASH078 Cinderkeep Warden | Echo: If the destroyed friendly unit was a Construct, add a copy of it to your hand. | Echo now receives `destroyedCard` context from the shared death hook. |
| ASH079 Legion's Last Stand | Damage dealt to adjacent friendly units is dealt to this instead. | Passive redirection; stats changed to 3/10 and Berserk was removed. Redirect cannot recurse between protectors. |
| ASH080 Forge Blessing | Give a friendly unit +6 Attack until end of turn. Destroy it at end of turn. | Current no-choice engine convention selects a random friendly unit; it is destroyed through the normal death pipeline at turn end. |
| ASH086 Scorched Earth | Deal 6 damage to the highest-Health enemy unit and 3 damage to units adjacent to it. | Chooses highest current Health and applies physical-neighbor splash. |
| ASH092 Siege Standard | Start of Turn: The enemy has 1 less AP during their next turn. | Queues `nextTurnApPenalty`; lowers current AP only, never max AP. |
| ASH095 Ashborn's Wrath | Destroy all damaged units. Deal 2 damage to the enemy Hero for each unit destroyed. | Snapshots damaged units on both sides, preserves normal Last Word/Echo behavior, then burns for the actual count. |

## Shared runtime additions

The Batch 1–2 work added or extended these engine concepts in `index.html`:

- `lastSpellPlayedId` player history.
- Physical-adjacency aura checks and position-aware damage/summoning.
- Attack-resolution hooks, including attack damage, kill splash, and stun.
- Death context passed to `onDeath` and `onEcho` callbacks.
- Temporary buffs that can schedule destruction at end of turn.
- One-turn AP penalties.
- Adjacent damage redirection with recursion protection.

## Validation status

Both implemented batches passed:

- canonical JSON parsing and embedded-data parity checks;
- inline JavaScript syntax compilation;
- card-ID, keyword, and Berserk Health-floor invariants;
- focused headless-browser gameplay checks with no page exceptions.

Variety audit progression:

| Stage | Near-duplicate pairs | Cost-ladder clones |
|---|---:|---:|
| Before Batch 1 | 85 | 46 |
| After Batch 1 | 62 | 25 |
| After Batch 2 | 40 | 12 |
| After Batch 3 | 16 | 3 |

## Implemented Batch 3

| Card | Current rules text | Runtime note |
|---|---|---|
| ASH009 Ashborn Hunter | Last Word: Deal 1 damage to the enemy Hero for each damaged enemy unit. | Counts damaged enemy combat units at death. |
| ASH016 Shield Maiden | Berserk: Adjacent friendly units are immune to damage this turn. | Adjacent allies ignore all damage through the current global turn. |
| ASH023 Ironhide | Berserk: Return a random friendly Animal that died this game to your hand. | Filters the existing death history by unit type. |
| ASH030 Siege Engine | Start of Turn: Give adjacent friendly Constructs +1 Attack. | Physical-neighbor Construct filter. |
| ASH039 Battle Mage | Invoke: Deal 3 damage to the lowest-Health enemy unit. If it dies, draw a card. | Deterministic lowest-current-Health target and immediate death check. |
| ASH042 Emberguard | Last Word: Deal 1 damage to all enemy Attack units. | Row-filtered enemy damage. |
| ASH043 Bloodforged Golem | Echo: Restore 2 Health to this and adjacent friendly units. | Heals itself plus physical neighbors. |
| ASH050 Wildfire Surge | Deal 2 damage to all units. Add a Cinder Scroll to your hand for each enemy unit destroyed. | Counts enemy casualties from the simultaneous board-wide hit. |
| ASH053 Cinder Lance | Deal 4 damage to an enemy unit. If it survives, return it to its owner's hand. | Uses the engine's established random choice for unqualified targets. |
| ASH056 Cinderforge Warden | Echo: A random Construct in your hand costs 2 less and gains +2 Max Health. | Applies hand-only cost/Health modifiers. |
| ASH058 Cataclysm | Destroy all Support cards. Deal 4 damage to all enemy units. | Removes duration Support cards on both sides, not Support units. |
| ASH070 Ember Chanter | Start of Turn: Give the lowest-Attack friendly unit +1 Attack. If it is an Elemental, give it Cleave. | Deterministic target; conditional permanent Cleave grant. |
| ASH081 Legion Encampment | The first time a friendly Defense unit is attacked each turn, deal 2 damage to the attacker. | One retaliation per Encampment per global turn. |
| ASH084 Ashborn Oracle | Echo: Reveal the enemy's highest-cost card. If it costs 6 or more, reduce a random card in your hand by 2. | Logs the reveal; random hand discount if condition succeeds. |
| ASH085 Emberrage | Deal 3 damage to an enemy unit. If it dies, deal 3 damage to units adjacent to it. | Captures the physical neighbors before death cleanup. |
| ASH090 Legion Quartermaster | Start of Turn: Give a random friendly unit in your hand +2 Attack and +2 Max Health. If it is a Construct, it costs 1 less. | Hand-only modifier with Construct discount. |
| ASH093 The Cinder King | Invoke: Return every friendly Dragon that died this game to your hand. | Filters friendly death history by Dragon type. |
| ASH096 The Cinderforge | End of Turn: Reduce the cost of the highest-cost card in your hand by 2. | Deterministically selects the highest printed cost. |
| ASH097 Infernal Vanguard | Last Word: Return all friendly Attack units that died this game to your hand. | Filters friendly death history by Attack row. |
| ASH099 The Emberkeeper | Echo: Summon an Emberwyrmling. | Summons one summoning-sick TOK001 token beside the source. |

## Batch 3 validation

- Rebuilt embedded/offline data with `python build_embedded_data.py --update-index`.
- Parsed all five embedded JSON blocks, checked canonical Ashborn parity, and compiled executable inline JavaScript.
- Headless Edge checks passed for the shield, Animal return, Defense retaliation, Emberwyrmling summon, Oracle discount, and all 20 Batch 3 ability entries with no page exceptions.
- V3 variety audit now reports 16 near-duplicate pairs and 3 cost-ladder clones (down from 40 and 12 after Batch 2).

## Implemented Batch 4

ASH002 Cinder Scroll, ASH003 Camp Supplies, ASH005 Rallying Cry, ASH006 Legion Smith,
ASH008 Shield Bear, ASH012 Battle Apprentice, ASH013 Sharpened Blade, ASH015 Ember
Whelp, ASH017 Tactical Retreat, ASH021 Experimental Explosives, ASH022 Cinder Fang,
ASH024 Schorchling, ASH025 Emberstone Golem, ASH029 Duskwing, ASH033 Ashenblade,
ASH038 Pack Leader, ASH044 Stim Pack, ASH048 Bulwark Automaton, ASH052 Direwolf
Berserker, and ASH060 The Ashen Warlord were redesigned and wired into `index.html`.

The canonical JSON holds the exact face text. Batch 4 adds two generic combat callbacks:
`onEnemyUnitDamaged` and `onEnemyUnitDestroyed`, used for Battle Apprentice's allied
Attack payoff and Direwolf Berserker's self Health gain. Embedded data was regenerated
and executable JavaScript syntax was validated after the change.

## Implemented Batch 5

ASH004, ASH010, ASH011, ASH014, ASH018, ASH026, ASH027, ASH028, ASH031,
ASH034, ASH035, ASH036, ASH037, ASH040, ASH041, ASH045, ASH051, ASH054,
ASH057, and ASH059 were redesigned and wired. Exact current card text is canonical
in `ashborn_cards_batch1.json`; embedded data was regenerated and inline JS syntax
passed after this batch. Note: ASH054's approved temporary wording was implemented as
a permanent End of Turn +2 Attack buff to match the engine's existing persistent-aura
model, and its card text was updated accordingly.

## Final optional polish

ASH064 now gives Cleave and gives Constructs +2 Max Health; ASH069 now restores itself
and scales Berserk Attack with damaged allies; ASH075 returns a fallen unit and gives an
Animal return a 2-cost discount.

## Post-audit outlier cleanup

ASH006 Legion Smith, ASH010 Traveling Merchant, ASH018 Battle Drums, ASH022 Cinder
Fang, ASH025 Emberstone Golem, ASH033 Ashenblade, ASH038 Pack Leader, and ASH045
Arcane Scavanger were redesigned to break the highest V3 similarity clusters. The V3
audit fell from 38 near-duplicate pairs / 4 cost-ladder clones to **26 / 0**. Canonical
and embedded data were synchronized; inline JavaScript syntax passed.

## Global Growth rules revision (2026-08-19)

Growth is now self-only: at the start of its controller's turn, a Growth unit resolves
its printed effect only if it took no damage since its previous Growth check. It no
longer automatically spreads to adjacent friendly units. Updated `cards/keywords.json`,
the `applyGrowth()` live-engine resolver, and VER079/VER098, whose old text encoded the
removed spreading behavior. Embedded data was regenerated and inline JavaScript syntax
passed.

## Verdant redesign status — Batches 1–2 (2026-08-19)

Verdant Batch 1 targets: VER001, VER006, VER007, VER010, VER012, VER013, VER024,
VER028, VER030, VER031, VER032, VER035, VER043, VER050, VER057, VER075, VER076,
VER085, VER088, and VER095. Batch 2 targets: VER018, VER036, VER037, VER039,
VER042, VER045, VER046, VER051, VER056, VER059, VER060, VER067, VER068, VER071,
VER077, VER079, VER084, VER089, VER090, and VER098. Canonical text is in
`verdant_cards_batch1.json`; each listed card has a corresponding `ABILITIES` entry
in `index.html`.

Verdant token family is isolated in `token_cards_batch1.json`, never in the playable
Neutral pool: Sapling (1/1), Elder Sapling (3/3 Defense Elemental), Thorn Sapling
(parent current Attack/1 Health), and Rootrunner Sapling (5/5, immediately attackable).
Friendly source-based summons use the engine's adjacent-placement rule: it shifts the
row outward to create room and ignores only excess summons on a full board; card text
therefore names the token/count without mentioning empty slots or adjacency.

## Verdant redesign — Batch 3 (2026-08-19)

VER006, VER007, VER009, VER017, VER024, VER026, VER029, VER035, VER036, VER039,
VER042, VER043, VER045, VER046, VER049, VER050, VER056, VER059, VER060, and VER084
were redesigned and wired. This batch establishes the Sapling package (token buffs,
Cleave, revival, hand buffs, and a game-long Attack bonus), plus spell-history copying
and Fawn transformation. The exact concise face text is canonical in
`verdant_cards_batch1.json`; embedded data was regenerated and inline JavaScript syntax
passed.

## Verdant redesign — Batch 4 (2026-08-19)

VER001, VER004, VER008, VER015, VER018, VER037, VER038, VER040, VER052, VER054,
VER057, VER062, VER067, VER068, VER069, VER073, VER082, VER090, VER096, and VER099
were redesigned and wired. Per user direction, this batch deliberately limits new
Sapling emphasis: it develops Fawn/Animal, Defense, healing, Support-cost, combat,
and spell-recursion directions instead. New reusable runtime paths cover returning an
enemy Support card, drawing a random Animal from the deck, Support-card cost reduction,
and unit-play healing auras. Canonical text is in `verdant_cards_batch1.json`; embedded
data was regenerated, embedded JSON parsed, and inline JavaScript syntax passed.

## Verdant final targeted cleanup (2026-08-19)

VER007, VER008, VER037, VER056, and VER096 were redesigned and wired to remove the
remaining genuine V3 overlaps without broadening the Sapling package. The Verdant-only
V3 audit moved from 11 near-duplicate pairs / 2 ladders to **4 / 1**. Canonical text is
in `verdant_cards_batch1.json`; embedded data was regenerated and inline JavaScript
syntax passed.

## Final all-card integrity and wording pass (2026-08-19)

Resolved cross-faction overlaps on VER056, VER095, NEU017, and NEU021; added missing
Start-of-Turn keyword metadata to ASH003, ASH010, VER027, NEU011, NEU026, NEU032, and
NEU037; and normalized concise wording across all canonical faction card data. NEU026
was additionally redesigned into a Defense-count Hero-heal effect to avoid an exact
same-faction duplicate exposed by the wording pass. Final validation found 257 cards,
no duplicate IDs, no exact rules-text duplicates, no trigger-keyword/text mismatches,
and no missing runtime entries for non-token cards with rules text. Embedded data was
regenerated and inline JavaScript syntax passed.

## Neutral final targeted cleanup (2026-08-19)

NEU004, NEU037, and NEU046 were redesigned and wired. The Neutral-only V3 audit moved
from **10 near-duplicate pairs / 0 ladders** to **8 / 0**. Canonical text is in
`neutral_cards_batch1.json`; embedded data was regenerated and inline JavaScript syntax
passed.

## Neutral redesign — Batch 1 (2026-08-19)

NEU005, NEU007, NEU010, NEU012, NEU014, NEU021, NEU025, NEU027, NEU032, NEU033,
NEU034, NEU035, NEU037, NEU043, NEU044, NEU045, NEU046, NEU047, NEU050, and NEU051
were redesigned and wired. The pass replaces Neutral's repeated Berserk Attack,
undamaged Max-Health, healing, draw, and flat-buff ladders with toolbox effects. The
Neutral-only V3 audit moved from **64 near-duplicate pairs / 35 ladders** to **23 / 2**.
Canonical text is in `neutral_cards_batch1.json`; embedded data was regenerated and
inline JavaScript syntax passed.

## Neutral redesign — Batch 2 (2026-08-19)

NEU001, NEU002, NEU003, NEU004, NEU008, NEU009, NEU011, NEU015, NEU016, NEU017,
NEU018, NEU019, NEU020, NEU022, NEU024, NEU029, NEU038, NEU039, NEU041, and NEU048
were redesigned and wired. Random spell and Construct pools are deliberately
faction-agnostic; deck effects remain tied to the controller's deck. New engine support
covers random spell/deck-type draws, temporary Cleave, highest-Attack silence, and
first-unit/first-spell-per-turn discounts. Neutral V3 moved from **23 / 2** to
**10 near-duplicate pairs / 0 ladders**. Embedded data was regenerated and inline JS
syntax passed.
