# Faction Clash Art Direction

This is the shared visual bible for card illustration. Read it before commissioning,
generating, replacing, or approving artwork. It preserves the visual language across
factions while leaving room for individual cards to be distinctive.

The card JSON is the authority for card identity, and the locked template is the
authority for card layout. This document is the authority for illustration direction.
Add new agreed rules here rather than silently changing the style.

## Non-negotiable delivery rules

- The finished card-art PNG is **1400 x 2100 px**. Paint a complete, opaque
  illustration; do not bake in transparency, a card frame, text, numbers, icons, logos,
  UI, or a watermark.
- **Current delivery preference (as of 2026-08-20):** when a generated image already has
  a clean 2:3 composition with its focal action safely above the name/effect area,
  normalize and save it directly as a finished **1400 x 2100 px** portrait — this is the
  default, since it saves a manual Canva extension step.
- **Fallback hand-off workflow** (use only when an image genuinely needs the user's
  custom lower-area extension): generate just the meaningful **1400 x 1470 px**
  illustrated source composition (the upper 70% of the finished card) for the user to
  extend in Canva to the final 1400 x 2100 px portrait. Important visual read (face,
  key action, crest, defining object) still belongs above `y=1260` (the top 60%), but a
  unit's natural body or scene may continue into the remaining 210 px of the source
  composition. The Canva-added lower 630 px should be quiet supporting terrain,
  atmosphere, architecture, or texture only.
- Save art at `assets/art/<faction>/<CARD_ID>.png`, using the card ID's exact uppercase
  spelling: for example, `assets/art/ashborn/ASH001.png`.
- The renderer places art, centered and contained, within its card illustration window.
  Compose natively for this 2:3 portrait shape; do not rely on cropping to rescue a
  landscape scene.
- The card frame and type/unit gems are separate layers. Never imitate, redraw, or
  obscure them inside the illustration.
- Keep one clear focal subject. Important faces, weapons, creatures, and props must
  remain readable at card size; treat the background as supporting atmosphere.
- Reserve the top **60%** of the portrait for the primary focal subject and its most
  important action. The card name band sits at roughly 62% of card height, and the
  effect/flavor treatment occupies the lower portion; a face, weapon head, or essential
  story detail must not depend on that bottom text-heavy area to read.
- Match the card's name, type, unit type, effect, and flavor text. A spell should
  communicate an event or consequential object; it does not need a character merely
  to fill the frame.
- Existing approved art is preserved unless a replacement has been explicitly approved.
  Replacement work should be reviewed in the real card renderer, not as a loose image.

## Global visual grammar

Faction Clash is **cinematic, tactile fantasy illustration**, not flat game-icon art,
photorealism, a live-action film still, anime, or clean superhero fantasy. Every image
should feel like a moment from a coherent war-torn world.

- Favor a strong foreground silhouette, a legible action or pose, and depth created by
  weather, smoke, vegetation, architecture, troops, or terrain behind it.
- Render tangible materials: worn metal, scarred wood, cloth, stone, fur, bark, mud,
  ash, roots, leather, and crafted details appropriate to the faction.
- Render those materials with deliberate **illustrative stylization**: painterly form
  design, controlled edge treatment, and an art-directed color/light hierarchy. The
  goal is the dimensional painted-fantasy quality of ASH060, not a photograph, an
  uncanny photoreal portrait, or a frame from a live-action movie.
- **Do not turn painterly into surface noise.** Brushwork should support large forms
  and controlled edges, not create a crinkled, wrinkled, embossed, or uniformly
  over-textured finish. Metal should read as solid metal, stone as solid stone, and
  cloth alone may visibly fold; use material detail selectively at the focal point.
- Use dramatic, directional light. Reserve the brightest light and strongest local
  contrast for the card's focal point.
- **Readability is non-negotiable at card size.** The focal subject must separate from
  its immediate background through a deliberate value, hue, temperature, edge, or
  atmospheric contrast—not merely by adding detail. Review the composition as a small
  thumbnail before accepting it; if the main figure or object disappears, revise it.
  For units especially, do not let dark armor, fur, or silhouettes merge into a dark
  wall, smoke bank, or similarly valued backdrop: establish a readable light halo,
  opposing-value field, rim light, or clearer background separation behind the head
  and primary silhouette.
- Dark fantasy is a mood, not a mandate for gray skies or desaturation. Give each card
  a purposeful dominant color relationship drawn from its story—weathered crimson,
  old bronze, ember orange, wet blue-gray, sickly forge green, earth, or another
  justified accent—while keeping saturation and brightness concentrated and controlled.
- Create real spatial depth: a clearly separated foreground, middle distance, and
  atmosphere/background; cast shadows, occlusion, reflected firelight, and falloff into
  smoke or weather should describe the scene's volume. The target is the cinematic,
  dimensional lighting of `assets/art/ashborn/ASH060.png`, not a flat painted subject
  placed on a decorative backdrop.
- Let faction color lead, but keep color disciplined. A single accent glow is more
  powerful than saturating the entire scene.
- Background figures and scenery may establish scale, but should not compete with the
  card's main subject. Avoid crowded, equally weighted group scenes.
- Each card needs its own story beat: command, ambush, sacrifice, ritual, defense,
  expedition, siege, healing, growth, or aftermath. Reusing a faction's palette is not
  enough to make the image feel related.
- **Batch variety check:** before making a new illustration, review the existing art
  for that faction and deliberately avoid duplicating a prior card's primary subject
  type, pose, camera distance, setting, silhouette, palette emphasis, and signature
  prop as a near-match. A shared faction identity is essential, but two units should
  not become interchangeable armored figures merely because both belong to the same
  army. Give each card a distinct story beat and visual hook appropriate to its data.

## Card-type subject rules

These are hard art-direction rules. Use the card type in the canonical card JSON, not
only its name, when choosing the subject.

| Card type | Primary subject rule |
| --- | --- |
| Attack and Defense units | Show the actual combatant: human, animal, construct, elemental, or other unit appropriate to the card. The unit is the focal subject. |
| Support units | Show the support effect, object, place, or operation as the focal subject—not a character merely holding the named item. Background figures may establish context but must remain secondary. A `Rallying Banner`, for example, centers the banner on a battlefield, with distant troops rather than a banner-holder as the hero. |
| Support cards | Do **not** show units or characters. Use items, artifacts, locations, buildings, formations, terrain, or other non-unit evidence of the effect. |
| Spells | Do **not** show units or characters. Depict the spell through its affected object, environment, ritual site, artifact, aftermath, or magical phenomenon. |

The no-unit rule for Support cards and Spells includes foreground silhouettes: do not
solve an empty composition by adding a caster, soldier, animal, or monster. Build a
strong object/place composition instead.

## Ashborn Legion — approved direction

**Core identity:** a grim, disciplined volcanic war host. Ashborn is military fantasy,
siegecraft, and hard-won command first; fire and magic are controlled tools of that
world, never generic flame wallpaper.

**Faction brief from the game data:** obsidian, volcanic steel, molten lava, dragon
motifs, and infernal architecture. Mood: aggressive, military, ancient.

### Visual language

- **Palette:** charcoal, ash gray, blackened iron, weathered brown leather, tarnished
  bronze, and muted/crimson heraldry. Use molten orange or red as a concentrated glow,
  ember field, weapon heat, or signal—not as an all-over wash.
- **Materials:** soot-stained plate, battered steel, rivets, chains, forged emblems,
  rough wood, rope, maps, torn banners, scarred fur, and field-worn gear. Surfaces
  should feel used rather than pristine.
- **World:** volcanic horizons, smoke, embers, rain, trenches, ruined fortifications,
  forges, camps, distant soldiers, siege engines, and ancient military structures.
- **Subjects:** armored commanders, practical battle mages, forged constructs,
  equipped war animals, assassins, field equipment, and command/siege objects. Animals
  should look trained, armored, branded, or otherwise embedded in the legion.
- **Lighting:** moody and high-contrast. Firelight should reveal form and metal edges;
  it should not turn the whole image into an orange abstract background.
- **Weather and time of day:** dark fantasy does not mean every scene is rainy, cloudy,
  or nocturnal. Rotate Ashborn into purposeful daytime conditions—hard overcast
  daylight, pale ash-sun, dry volcanic haze, forge-lit interiors, dusty morning camps,
  or a clear harsh siege day—when they better serve a card's story. Keep the faction's
  disciplined palette and material language, but let weather and lighting create
  variety across the set.
- **Composition:** one large, readable subject—often full or three-quarter body—anchored
  in the foreground. Distant troops, terrain, or embers provide scale and atmosphere.

### Canonical Ashborn crest

The stylized **dragon emblem visible on the horn and background flag in
`assets/art/ashborn/ASH005.png` (Rallying Cry)** is the one canonical Ashborn crest.
Whenever the art needs a legion mark—on shields, armor, banners, standards, equipment,
command objects, or architecture—use this same dragon design. Do not invent a
card-specific crest, alternate animal emblem, multi-headed dragon, or unrelated faction
symbol.

The crest is a connective detail, not compulsory decoration. Use it confidently where
an official legion item, standard, shield, armor piece, military building, or command
object would plausibly carry heraldry; it helps establish a shared Ashborn culture.
Do not force it into every scene or use it as generic filler. Keep it subordinate to the
card's focal subject. It may be worn, stamped, painted, stitched, embossed, or partially
obscured by weather and battle damage, but its **single-headed dragon silhouette** must
remain recognizably the same emblem.

### Approved Ashborn reference set

These are the primary style references for future Ashborn review. Borrow their visual
principles, not their exact poses or subjects.

| Asset | What it establishes |
| --- | --- |
| `assets/art/ashborn/ASH060.png` — The Ashen Warlord | Commanding full-body leader, ornate dark plate, concentrated ember light, battlefield scale. |
| `assets/art/ashborn/ASH046.png` — Magma Cleaver | Massive forged silhouette, black iron and molten fractures, volcanic environment. |
| `assets/art/ashborn/ASH056.png` — Cinderforge Warden | Defensive armored guardian, shield-led read, ash-filled battlefield. |
| `assets/art/ashborn/ASH022.png` — Cinder Fang | Militarized war animal, practical harness and banners, kinetic charge through embers. |
| `assets/art/ashborn/ASH008.png` — Shield Bear | Realistic animal anatomy paired with faction equipment and rainy campaign context. |
| `assets/art/ashborn/ASH033.png` — Ashenblade | Dark human action silhouette, restrained volcanic sunset, weapon-led drama. |
| `assets/art/ashborn/ASH039.png` — Battle Mage | Practical human armor and a single, contained fire-magic focal point. |
| `assets/art/ashborn/ASH005.png` — Rallying Cry | Spell art can be a physical command object: horn, map, banner, and campaign detail. |
| `assets/art/ashborn/ASH045.png` — Arcane Scavenger | Characterful support role, tactile books/parchments, battlefield debris, lived-in storytelling. |
| `assets/art/ashborn/ASH030.png` — Siege Engine | Tangible military machinery: wood, rope, iron, ember payload, and field fortification. |

### Ashborn prompt foundation

> Vertical cinematic grimdark fantasy card illustration. Ashborn volcanic war host:
> blackened iron, worn leather, ash, smoke, weathered crimson heraldry, and restrained
> molten-orange glow. Detailed tactile materials; one large readable focal subject;
> believable battlefield, forge, siege, or camp context; moody high-contrast lighting.
> No text, frame, UI, watermark, or modern technology.

Add the card-specific subject, action, environment, and one distinctive prop before
using this foundation. For example, a spell might center a command horn, map table,
or siege mechanism; a unit should center its person, creature, or construct.

### Rendering benchmark

`ASH060` is the visual-quality benchmark for all future card art. Its success comes
from dimensionality: a strong lit foreground subject, real shadow mass in the armor,
controlled highlights from ember light, receding troops and smoke, and a background
that falls away into atmosphere. Future art should feel like a lit three-dimensional
scene with physical depth **while remaining visibly illustrated**—not a flat digital
painting, cutout figure, evenly lit illustration, photograph, or live-action still.

### Avoid for Ashborn

- Bright, uniformly saturated red/orange scenes or empty abstract fire backgrounds.
- Pristine chrome armor, smooth plastic materials, or clean superhero poses.
- Generic fantasy animals without harnesses, armor, branding, or a military context.
- Overbusy multi-character scenes with no primary read.
- Repeating the same distant volcano or mountain skyline as a default background.
  Ashborn locations must feel related through materials, climate, heraldry, and military
  culture, while rotating the setting: forge interiors, rain-soaked camps, trenches,
  walls, ruined keeps, supply areas, siege lines, ash forests, lava channels, and
  volcanic horizons only when they serve the card.
- Modern guns, machinery, logos, readable signage, text, or card-like UI elements.

## Verdant Circle — provisional foundation

Verdant's established game identity is living wood, roots, leaves, vines, ancient
trees, nature magic, and protective growth. Its imagery should make growth feel
deliberate, ancient, and adaptive—not merely "green magic." Favor organic structures,
living ecosystems, guardianship, and transformation. The confirmed palette metadata is
deep forest green with muted gold accents.

**Approved species direction (2026-08-23):** Verdant cards whose mechanical
`unitType` is `Human` are not illustrated as ordinary humans. Depict them as elves or
other clearly non-human, forest-adapted humanoids, with an ancient Circle culture
expressed through natural features and crafted organic gear. Verdant Animals may be
magical companions/guardians **or beastfolk** rather than mundane wildlife. A beastfolk
card should use a clear animal-human hybrid silhouette, expressive anatomy, and the
same ancient Circle natural features and crafted organic gear as other Verdant
humanoids; it is not restricted to a literal animal body. Pure-animal cards need at
least one visible, controlled magical signature such as luminous eyes, subtle bark/sap
runes, leaf-and-spore motes, spectral pollen, or a restrained natural aura. These
details support the silhouette and story; they must not overwhelm the subject or turn
the whole scene into neon magic.

**Approved environment rule (2026-08-23):** Verdant is a broad, lived-in natural realm,
not a single repeated mid-forest backdrop. Rotate environments deliberately across a
batch: misted lakeshores, open fields, rolling hills, ancient groves, root-bound ruins,
underground root tunnels, canopy paths and treehouses, river crossings, marshes, seed
gardens, sacred stone circles, and storm-cleared woodland edges all belong. Each scene
still needs Verdant's living, ancient, protective material language, but its setting,
weather, time of day, depth treatment, and dominant color relationship should serve
the individual card and avoid near-duplicates.

**Approved color rule (2026-08-23):** Deep forest green and natural brown remain the
base, not the whole palette. Use controlled, card-specific color accents to make the
realm feel magical and varied: wildflowers, berries, seedpods, autumn leaves, water
and sky blues, pale fungi, mineral stone, sunrise/sunset light, and muted gold are all
available. Concentrate these accents at the focal point or as a clear secondary color
relationship; do not turn every scene into uniformly saturated rainbow magic.

### Verdant unit framing standard — approved 2026-08-24

The preferred Verdant-unit composition is the middle ground between a close portrait
and a distant landscape. Use the approved `VER072` (Stagheart Charger), `VER073`
(Wisteria Duelist), and `VER075` (Petalguard Matron) as the current framing references.

- **Default scale:** show one prominent, readable three-quarter unit, normally from
  head through knees, occupying roughly half the portrait height. This is not a
  chest-up or half-body close-up, and it is not a tiny figure lost in scenery.
- **Text-safe geometry:** the complete important read—face, shoulders, signature
  prop/weapon/shield, active pose, and readable silhouette—must finish within the
  upper 60% of the finished 1400×2100 portrait (`y=1260`). Cropping below the knees is
  acceptable when it keeps the important read safely above that boundary. Never let a
  weapon tip, shield edge, feet, or essential clothing detail carry the focal action
  into the lower text area.
- **Lower 40%:** reserve it for genuine quiet environmental depth: a gorge, water,
  terraces, distant architecture, mist, roots, or terrain that recedes from the
  subject. Do not fake compliance by cutting off a too-large figure and pasting an
  unrelated floor or blur beneath it.
- **Separation at scale:** deliberately place a lighter, cooler, warmer, or otherwise
  contrasting field behind the head and primary silhouette. The unit must remain
  instantly identifiable in a card-size thumbnail before secondary scenery is read.
- **Variety:** a shared framing rule does not mean a repeated scene. Rotate the
  camera angle, subject species/body plan, pose, setting, dominant accent, and
  signature prop across sequential cards. Verdant Animals may be magical animals or
  beastfolk; use beastfolk when it creates a clearer or more varied silhouette than
  another literal animal.

### Verdant preview gate — required before production

Before generating a Verdant preview, write a compact composition brief that states:
the card ID; subject type; planned subject scale; where the important silhouette ends
relative to the 60% line; the lower-area environment; the contrast treatment behind
the focal point; and which nearby existing cards it deliberately differs from. Compare
against the current Verdant contact sheet, not memory alone.

Generate **one** candidate per card from that brief, then show it for user review. Do
not run speculative remake chains or save a replacement because the generator output
looks plausible. If the candidate misses the framing rule, identify that plainly and
wait for user direction before generating another version.

This is a starting constraint only. Add an approved Verdant reference set and a more
specific style/palette section before producing a large Verdant art batch.

## Free Companies — provisional foundation

Neutral art belongs to the Free Companies: stone, steel, old kingdoms, mercenaries,
minimal decoration, and a pragmatic, weathered, dependable mood. It should feel useful
and worldly rather than factionless or bland. Favor practical equipment, itinerant
soldiers, trade, survival, and old-world infrastructure. Confirm a reference set before
large-scale production.

**Neutral Animal direction (2026-08-25):** Neutral cards whose mechanical `unitType`
is `Animal` are illustrated as beastfolk rather than literal mundane animals. Give each
one a clear animal-human hybrid silhouette and a believable everyday role in city,
road, or market life; they belong in the lived-in world of the Free Companies, not as
random wildlife placed above it.

## Tokens and Bosses

- **Summoned tokens** are ephemeral minor forces bearing their summoner's mark. Their
  design should be simple and instantly readable, while still matching their source
  faction where relevant.
- **Boss Rush bosses** need portrait art as a future production item. Boss images should
  communicate a singular encounter-scale threat and remain readable in the boss UI;
  use the appropriate faction's visual language rather than creating a separate genre.

## Review checklist

Before accepting an illustration, check all of the following:

1. Is the faction identifiable before reading the card name?
2. Does one subject or object read clearly at card size?
3. Does the scene tell the card's mechanical/story role without literal UI or text?
4. Are the materials, lighting, and palette controlled and consistent with its faction?
5. Does the PNG use the exact card ID and faction asset path?
6. Does the finished image look correct in the real locked card template?
7. For Verdant units, does the complete important subject read end within the upper
   60%, at the approved three-quarter scale—not as an oversized close-up or a distant
   scene?
8. Was the composition brief checked against the current Verdant contact sheet before
   generation, and did the user explicitly approve the shown preview before delivery?

## Current art status and change record

- **2026-08-19:** Initial shared art bible created from project documentation and the
  approved Ashborn reference review. No artwork was generated, replaced, or deleted.
- **2026-08-19:** Corrected the production-art delivery size to **1400 x 2100 px**;
  this supersedes the legacy 2000 x 3000 template-canvas specification.
- **2026-08-19:** Added hard composition and card-type rules: primary focal content is
  above the lower text treatment; Ashborn scenes need varied connected locations;
  Attack/Defense units center their combatant; Support units center their support
  effect; Support cards and Spells contain no units or characters.
- **2026-08-19:** Established ASH060 as the rendering-quality benchmark: future art
  needs cinematic, dimensional light, genuine shadow, material form, and atmospheric
  depth rather than a flat-painting appearance.
- **2026-08-19:** Established the ASH005 dragon as the only canonical Ashborn crest for
  any shields, armor, banners, standards, equipment, or other legion-marked objects.
- **2026-08-19:** Clarified crest use: it is optional rather than a per-card default,
  and it must remain the single-headed ASH005 dragon—never a three-headed dragon or
  other reinterpretation.
- **2026-08-19:** Established the rendering-medium rule: retain ASH060's depth and
  lighting, but render as deliberate painted fantasy illustration. Photorealism and
  live-action-film-still imagery are out of direction.
- **2026-08-21:** Added strict small-scale readability guidance: a focal unit must
  separate decisively from its immediate background through value, hue, temperature,
  edge, atmospheric contrast, or rim light; dark subjects may not disappear into a
  similarly dark environment.
- **2026-08-21:** Clarified Ashborn scene variety: dark fantasy is not a default to
  rain, cloud, or night. Use varied, purposeful daylight and weather conditions as
  appropriate to the card while retaining Ashborn's military-volcanic identity.
- **2026-08-21:** ASH061 Bastion Recruit approved after its remake and lighting pass:
  the compact top-weighted recruit silhouette is clearly separated from a pale ash-day
  background, with a quiet lower forecourt. Added a batch-level variety check requiring
  review of existing faction art before each new illustration to avoid near-duplicate
  unit subjects, poses, settings, silhouettes, palettes, and signature props.
- **2026-08-19:** User approved the painterly dimensional TCG style demonstrated by the
  retained ASH001-003 source compositions as the working Ashborn art style.
- **2026-08-19:** Refined crest direction: use the canonical ASH005 emblem confidently
  where plausible official Ashborn heraldry enriches a scene, but never as mandatory
  decoration and never as an altered dragon design.
- **2026-08-19:** Promoted the approved 1400 x 1470 ASH001-003 compositions to their
  canonical `assets/art/ashborn/ASH001.png` through `ASH003.png` filenames. The user
  will extend these active source assets in Canva to their final 1400 x 2100 form.
- **2026-08-19:** Adopted the standard art hand-off workflow: generate a natural
  1400 x 1470 focal scene only; the user extends quiet supporting scenery to the final
  1400 x 2100 PNG in Canva.
- Ashborn's selected reference assets above define the target direction for the planned
  review/replacement of its existing illustrations and creation of missing Ashborn art.
- New art for later Ashborn/Verdant expansions, most Neutral cards, Tokens, and Boss
  portraits remains a production backlog. Do not treat missing art as permission to
  substitute an unrelated image.
- **2026-08-24:** Added the explicit Verdant unit framing standard and required
  pre-generation preview gate after iterative framing drift on VER072-075. The approved
  target is a prominent three-quarter subject whose important read ends in the upper
  60%, paired with genuine quiet environmental depth below—not an oversized portrait,
  a tiny distant figure, or an artificial lower-area extension.
