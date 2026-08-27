# Content packs wave 4b — the venue packs — requirements

Wave 4b is the second half of the slate's Wave 4 ("the renames + the
first trades, ONE blast radius" — `docs/slates/builds/content-packs-slate.md`
A24). Wave 4a did the renames, the `/trade/` root and the first two
industries; 4b puts the first two **venues** into packs of their own
on the fresh namespace and pays the graduation debts A23 named, so
that `world-seed` shrinks toward its deletion and a venue pack is a
thing that exists and can be copied. It ships **no new kernel
substrate** — content moves, three small classes graduate, a handful of
composition-only classes become commons, and the third industry
(hospitality) is minted from what the lounge already does.

Load-bearing references: [content-packs.md](../subsystems/content-packs.md)
(§ The path pattern, § The kinds, § The grants), the slate's A13
(industry ≠ venue), A16 (the hearthworks re-cut, introduces-vs-commons),
A23 (the graduation audits), [employment.md](../subsystems/employment.md),
[crafting.md](../subsystems/crafting.md), [retail.md](../subsystems/retail.md),
[time.md](../subsystems/time.md).

## Goals

- **The lounge is one pack.** Every lounge row — the 23 venue rows
  `world-seed` still carries (`bar`, `warren`, `terminal`, `office`,
  `offstage`, the bottles, the neons, the five NPCs, …) — ships from
  `saxonberg-lounge`, under `/world/lounge/`, with the pack's own claim,
  boot entry and business. `world-seed` ships nothing under
  `/world/lounge`.
- **Hearthworks is a venue pack.** A new `hearthworks` pack ships the
  12 venue rows (five rooms, the business, the two NPCs, the two menus,
  the pantry) under `/world/hearthworks/`, with its own group + claim,
  depending on the two industries it composes and on `corpo-goodkin`
  (its bank). `world-seed` ships nothing under `/world/hearthworks`.
- **The third industry exists: `/trade/hospitality`.** It ships what
  the lounge introduced to the chain and nothing else — the bar
  stations, the cocktail recipes, the tip jar, the bartender position.
  Hearth-cooking's second pass (`fine-roast`, `hearty-stew`) rides the
  same commit; generic-objects keeps no recipe an industry claims.
- **The three A23 extractions land**: `Offstage` (off-shift NPC parking)
  → `lib/employment`; `MechanicalMovement` (windable clockwork) →
  `lib/` under Timekeeping; `TipJar` → the hospitality industry.
- **The composition-only classes are commons.** `CraftedDrink`,
  `GradedReceptacle`, `NeonSign`, `CocktailShaker` and the three menus
  (`Menu`, `SmithyMenu`, `KitchenMenu`) stop being content classes:
  each becomes ONE concrete `platform/<branch>/` class (or an existing
  one — the menus collapse to a single platform `Menu`), and the venue
  rows name the platform class.
- **The locality rule is applied**: a locality with more than about
  six template rows keeps them in branch subdirs
  (`/world/lounge/{location,thing,idea,agent}/…`); one with six or
  fewer stays flat. Source follows the same rule (`src/mud/world/lounge/`
  has 14 files → branch subdirs; `src/mud/world/hearthworks/` has 3 →
  flat).
- **"Packs seed, they do not own" is proven, not built**: a test shows
  that a venue row the DB has changed and the file has not (a renamed
  bar, a refit room) is `kept` by the three-way reconcile — the slate's
  initial-condition semantics are the installer's existing
  file-same / DB-changed cell. No new mechanism.

## Non-goals

- **The authorable-composition bridge** (A23's "biggest lever": a
  template declaring its mixin stack in YAML). 4b genericizes the nine
  classes into concrete platform classes instead; the bridge is its
  own build, and "hospitality ships pure data" is a property it will
  buy later, not a 4b gate.
- **The venue archetype** (A13.5 / A14: the `archetype` document kind,
  derive-on-read, the aggregator, the derived test venue). Out. Two
  hand-built venues are not evidence for the abstraction; it waits for
  the third industry with its own kernel gap (mining/brewing). If it
  never earns its keep, A14 said it can be cut — this build does not
  decide that either way.
- **Hearthworks' inbound exit.** Not attached. Hearthworks stays
  `goto`-only; the user's call — nothing uses it yet.
- **Homing eternal, terminus, moor, practicum, substation, common** —
  wave 5. `world-seed` survives 4b, smaller.
- **`DormThemes`, `Footlocker`, `Gus`, the eternal residue** — wave 5
  (eternal as the capability exemplar).
- **New verbs for hospitality.** `tip` stays the platform's employment
  verb (it is generic — any business with a jar); hospitality ships the
  jar, not the verb.
- **The e2e suites.** Not a priority (user, 2026-08-27); nothing in 4b
  gates on `pnpm e2e`. The platform-only spec still runs as the
  fresh-DB proof.
- **Any migration, compat or guard code.** A path that moves is a
  dropped database. No adopt, no rename step, no "if the old row
  exists" — the junk-sweep rule holds.

## Surface decisions

### D1 — What the lounge pack ships, and where

`saxonberg-lounge` takes every `world-seed` row under `/world/lounge/`
and keeps its existing `/stuff/idea/lounge` library root, its three
msh scripts and its landing setting. The rows are >6, so they go under
branch subdirs by their class's Stuff branch:

| Branch | Rows |
|---|---|
| `location` | `lounge` (the Room template every warren instance clones), `bar`, `office`, `offstage` (→ D4), `wire-alcove`, `terminal` — every `Location` descendant; the planner sorts each row by its class's branch |
| `thing` | `back-bar`, `bar-counter`, the four bottles, `cocktail-glass`, `mixing-glass`, `shaker`, `tip-jar` (→ D3, the *instance* stays a venue row), `neon-aevex`, `neon-veshko`, `bandage` |
| `idea` | `warren`, `bar-menu`, `business` |
| `agent` | `npc/augie`, `npc/dave`, `npc/mara`, `npc/remy`, `npc/sloane` |

The five NPCs are the lounge's CAST (crowd-vs-cast: the locality
carves the cast); they stay venue rows. The pack's boot entry
`/world/lounge/terminal` (producer — the TPA network's eager root)
moves from `world-seed`'s manifest to `saxonberg-lounge`'s; `world-seed`
drops its `/world/lounge` claim, its `lounge` group declaration and
its `saxonberg-lounge` dependency's reason (it keeps the dependency
only if a remaining row references a lounge path — the planner
checks). Every path that references a moved row (the lounge's own
`populates:`, `paths.ts` constants, the lounge's msh scripts, the
`defaultStartLocation` setting, tests) follows.

### D2 — The hearthworks venue pack

A new package `packages/content/hearthworks`, `id: hearthworks`,
`root: /world/hearthworks`, `dependsOn: [platform, trade-smithing,
trade-hearth-cooking, corpo-goodkin]`, `requires.groups: hearthworks`
(PM-owned, the wave-3 default shape), `requires.title: /world/hearthworks
→ group hearthworks`. It ships the 12 rows under branch subdirs
(`location/`: smithy, cookhouse, cellar, woodshed, forge-floor;
`idea/`: business, smithy-menu, kitchen-menu; `agent/`: npc/smith,
npc/cook; `thing/`: pantry-chest). The venue keeps its proper name
(A16.1 Q4 — lean yes, now yes). Its `populates:` keep naming the
industries' rows (`/trade/smithing/thing/anvil`) and the commons
(`/stuff/thing/items/…`) — the venue is a reference plus local
parameters, never a copy (slate § Reconcile, don't copy).
`world-seed` ships nothing under `/world/hearthworks`.

### D3 — `/trade/hospitality`

A new industry pack, the shape of `trade-smithing`: `id:
trade-hospitality`, `root: /trade/hospitality`, `dependsOn: [platform,
generic-objects, base-library]`, group `hospitality` (PM-owned), claim
`/trade/hospitality`. It ships what the lounge **introduced**:

- **stations** (`thing/`): the shaker, the mixing glass, the cocktail
  glass, the back-bar — the bar's equipment, generic to any bar. The
  lounge's instances of them become `populates:` references to the
  trade's templates (the same repoint the smithy got in 4a).
- **recipes**: `daiquiri`, `martini` (from generic-objects).
- **the tip jar**: `TipJar` the class moves to `platform/thing/TipJar`
  (a commons class — a jar is a jar); the *template* `/trade/hospitality/thing/tip-jar`
  is the trade's; the lounge's row is an instance of it (or a
  `populates:` reference — planner's choice, consistent with the
  stations).
- **positions**: what a bartender is — the position definition the
  lounge's `business` row already carries, lifted to the trade the way
  smithing's `smith` will be when positions become industry data.
  ⚠ If positions are not yet an industry-level artifact in
  `employment.md` (they are rows on a Business today), the trade ships
  none and the venue keeps them — the planner checks; the requirement
  is only that nothing venue-specific lands in the trade.

Hearth-cooking's second pass rides the same commit: `fine-roast`,
`hearty-stew` move from generic-objects to `trade-hearth-cooking`.
After 4b generic-objects ships **no recipes**; its `recipes/` dir is
deleted.

The bottles (gin, rum, vermouth, lime) are **not** the trade's: they
are the venue's stock of base-library materials, and stay lounge rows.

### D4 — The three extractions

- **`Offstage` → `lib/employment/Offstage.ts`** (or the shape the
  employment doc prefers — a mixin on a Location, or a concrete
  `platform/location/Offstage` if it is cloned). The second consumer is
  hearthworks: its cook and smith park off-shift in the cellar today by
  ad hoc means, or nowhere — after 4b both venues park their cast the
  same way. The lounge's `offstage` row names the platform class.
- **`MechanicalMovement` → `lib/`** under Timekeeping (the windable
  clockwork University Avenue's pocket watch and crossing log use). It
  is a mixin living in content; it moves with its tests, and the
  eternal classes that compose it import it from `lib/`. No behaviour
  change.
- **`TipJar` → hospitality** per D3.

### D5 — The composition-only classes become commons

`CraftedDrink`, `GradedReceptacle`, `NeonSign`, `CocktailShaker`
(lounge) each become ONE concrete class in `platform/thing/` (they are
Things) with the same mixin stack and no venue-specific code; the
lounge rows name the platform class. `Menu`, `SmithyMenu`,
`KitchenMenu` collapse to ONE `platform/thing/Menu` (the user's call:
platform, not hospitality — retail's counter is the same shape); the
three menu rows become data on that class. Anything in those classes
that was genuinely lounge-specific (A23 found "verb-surface lighting"
as the only residue) stays in the lounge's `LoungeMixin`/`Bar`, which
remain local color along with `Lounge`, `LoungeWarren`, `GlassAlley`,
`LoungeTerminal`.

### D6 — The locality rule, and the source that follows

The user's rule (2026-08-27): about six template rows → flat at the
locality root; more → subdirs by Stuff branch. Applied: the lounge
(23) and hearthworks (12) go branch-subdir'd; nothing else moves in
4b. **Source follows the same rule**: `src/mud/world/lounge/` (14
files) → `src/mud/world/lounge/{thing,idea,location}/…` with the
module ids and every `class:` following; `src/mud/world/hearthworks/`
(3 files after D5) stays flat. Controllers are already at
`<locality>/idea/cmd/`.

### D7 — Seed, don't own: proven by a test

No new installer mechanism. A test in the pack tests installs a venue
pack, edits the installed `bar` row in the store (a rename — what a
player-owner does), reinstalls with the file unchanged, and asserts the
row is `kept` and the record's baseline unchanged. That is the slate's
"initial condition, not a continuing assertion." A second assertion:
a file change against an unedited DB row `updated`s it — trade updates
still reach venues (§ Reconcile, don't copy).

## Constraints

- **The path pattern** ([content-packs.md § The path pattern](../subsystems/content-packs.md)):
  every new row is `<root>/<branch>/…` (`/trade/hospitality/thing/shaker`,
  `/world/hearthworks/location/smithy`); `lint:instanceable` invariant
  7 gates it. Locality rows use the ≤6-flat / >6-branch rule (D6).
- **Nothing instances `/lib/`**: an extraction to `lib/` must leave a
  concrete `platform/` class for every template that names it.
- **Introduces-vs-commons** (A16.3): an industry ships only what it
  introduced; the stations named by other industries' recipes are
  commons. Bottles, bandages, chests, floors stay commons/venue.
- **Drop-not-migrate, no adopt**: every path move is a dropped
  database; a row at a pack key the pack did not stamp fails the pack.
  The build's drive starts from a dropped `saxonberg_build1`.
- **Covered extent**: every shipped path under a title root lies under
  the pack's or a host's claim (`lint:untitled`); `world-seed`'s claims
  shrink as its rows leave.
- **The verb-surface rule**: content commands are afforded by content
  (`commandContributions` on the owning fixture); no core mixin learns
  about a venue.
- **Tests beside content**: tests of lounge/hearthworks content live in
  `src/mud/world/<locality>/**/__tests__` (exempt from
  `lint:test-content`); kernel tests that still name `/world/lounge/…`
  are on the shrinking allowlist and are not grown.
- **No compat**: no alias of an old path, no `startsWith` branch kept
  "for safety", no re-adoption. The junk-sweep memory rule.

## Acceptance criteria

1. `packages/content/world-seed/content/world/` has no `lounge/` and no
   `hearthworks/` directory; `world-seed`'s manifest carries no lounge
   claim, group or boot entry.
2. `saxonberg-lounge` ships the 23 venue rows under
   `content/world/lounge/{location,thing,idea,agent}/`, its boot entry
   `/world/lounge/terminal`, and installs on a dropped DB with every row
   `inserted` and its two claims `granted`.
3. `packages/content/hearthworks/` exists, ships 12 rows under branch
   subdirs, orders after `trade-smithing`, `trade-hearth-cooking` and
   `corpo-goodkin`, and installs with every row `inserted`; the
   hearthworks integration tests pass against the new paths; the
   `hearthworks-populates` content test proves every `populates:` path
   is a shipped file.
4. `packages/content/trade-hospitality/` ships the four stations, the
   two cocktail recipes and the tip-jar template; `generic-objects`
   ships no recipes (its `recipes/` dir is gone); `trade-hearth-cooking`
   ships four recipes. `RecipeCatalogue` serves all of them (Dave's Bar
   `menu` lists daiquiri + martini; the cookhouse lists all four).
5. `Offstage`, `MechanicalMovement` live under `lib/`; `TipJar`,
   `CraftedDrink`, `GradedReceptacle`, `NeonSign`, `CocktailShaker`,
   `Menu` live under `platform/thing/`; `SmithyMenu`, `KitchenMenu`,
   the lounge's `Menu` and the four composition classes are deleted
   from `src/mud/world/`; every `class:` in content names the platform
   class; `lint:instanceable` green.
6. `src/mud/world/lounge/` is branch-subdir'd (`thing/`, `idea/`,
   `location/`, `idea/cmd/`); `src/mud/world/hearthworks/` is flat;
   every locality test still passes.
7. Both venues' NPCs park off-shift through the one `Offstage`
   mechanism — a test per venue.
8. The seed-don't-own test (D7) exists and passes.
9. Twenty packs ship (`PackLogic.discover.test` counts them); a fresh
   boot inserts every row and grants every claim; the second boot is
   all-zero; `bootstrapped` count unchanged or explained.
10. The platform-only e2e is green on a dropped DB. The main e2e suite
    is **not** a criterion.
11. Full suite, the lint family, build green; the drive (fresh boot,
    second boot, `pack status` twenty, the lounge landing, the smithy
    `menu`, Dave's Bar `menu`) recorded on the MR.
12. Docs: content-packs.md (the pack table: twenty; `world-seed`'s
    remaining contents; the hospitality row), employment.md
    (`Offstage`), time.md (`MechanicalMovement`), crafting.md (recipe
    homes), lounge/hearthworks mentions in location.md and
    residence.md; the slate's A23 tables marked applied.

## Cross-references

- Seeding slate: `docs/slates/builds/content-packs-slate.md` — A13, A14
  (declined for now), A16, A23, A24; the "Every trade pack ships a
  SHOWROOM" and "packs SEED, they do not OWN" sections.
- Subsystem docs: content-packs.md, employment.md, crafting.md,
  retail.md, time.md, location.md, residence.md, attendant.md.
- Prior waves: wave 4a (MR !203) — the path pattern this build inherits.
- Deferred to their own builds: the authorable-composition bridge; the
  archetype kind + derived test venue; wave 5 (eternal, terminus, the
  long tail).
