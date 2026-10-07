# Base-class narrowing slate — what a class claims, and what it uses

> **Status: PARTIAL** — shipped by MR !303 (2026-09-30); the four
> passes (Thing · Agent · Location · Idea) built it. The slate's
> original premise (2026-09-26, *"the classes are wide"*) was
> **measured and falsified** the next day; see § The premise that died,
> and what shipped instead was the narrower, evidence-led carve the
> census argued for.
> **What shipped:** `Atmospheric` off `Vessel` + the frozen-ambient
> repair · `Branded` down to `KeptAnimal` · the seven dead classes ·
> `Concealable`/`Chattel` off the `Thing` root onto the new
> **`Good`** rung · the `Visible`/`Perceptible`/`Detailed` trio onto
> the `Thing` and `Location` roots · the new rungs **`Good`**,
> **`Holder`**, **`Actor`**, `Beast`, `DraftAnimal`, `Station`,
> `Firebox` · one `Modality` twin for three empty subclasses · the
> `lint:object-verbs` blind spot closed · `lint:mass` minted as the
> 58th gate.
> **Left:** everything under § Deferred, with destinations — chiefly
> `Persona`'s 60 empty biographies, the `Extra` taxonomy, the
> structure tier, the `Staged` split, and the two content burn-downs
> (362 rows with no details; 38 species with no appearance).
> **Size:** a build

> Rewritten 2026-09-27 from a full-tree census. Every number below was
> taken against `edd318088` and every claim carries its evidence. The
> measurements are the argument; re-take them if this sits.
>
> ⭐⭐ **And the argument the measurements cannot make:**
> [lenses/93-the-nameless-quality.md](../../lenses/93-the-nameless-quality.md)
> — *a wide class does not merely carry unused members, it makes a claim
> about every thing an author builds with it.* **A census tells you how
> many classes use a member; that lens tells you what it costs an author
> when they do not**, and the two disagree in useful places.
>
> ⭐⭐⭐ **And its structural twin, added 2026-09-29:**
> [lenses/28-the-state-machine.md](../../lenses/28-the-state-machine.md)
> — Schell asks *what are the objects, what are their attributes, what
> are their possible states, and what triggers the change*, and writes
> the sentence this whole pass exists to answer: *“the right way to think
> about something is whichever way is most useful **at the moment**.”*
> **That rule has no time dimension, and the god class is it iterated** —
> hanging a spoilage gauge on `Thing` for four rows was the most useful
> framing at that moment. The entry also names the vocabulary the census
> header needs and Schell lacks: an attribute has a **provenance**
> (authored · stamped · derived), which is why *no row authors this* is
> evidence of nothing on its own, and why **D1** is the reusable artifact
> of the pass rather than any single carve.

See also:

- [templates.md § Inheritance](../../subsystems/templates.md) — `extends:`,
  which shipped 2026-09-25 and is the mechanism a cohort's parent row uses.
- ⭐ [spatial.md § Placement](../../subsystems/spatial.md) — the
  blocking design question, **answered and SHIPPED 2026-09-28** (the
  placement build, MR !302; the slate retired into that doc). The
  renames this census wanted are unblocked.
- [fridge-design-pack](./fridge-design-pack.md) — the prior art on
  multi-chambered containers. ⚠ Read it before touching `Vessel`; a
  design pass that skipped it produced a rejected answer (below).
- [standard-model.md](../../standard-model.md) — the hand-maintained
  element list this census supersedes, and which carries its own drift
  disclaimer. ⚠ It is not in `CLAUDE.md`'s documentation map, which is
  the likeliest reason nobody noticed it rot.

---

## ⭐⭐ Why this matters: composition is a public claim

The wiki's `<composition>` panel renders a template's mixin list **to
any player, ungated**, and its inverse view answers *"what in this world
has capability X"* by enumerating every composing class
(`packages/server/src/mud/lib/wiki/components/composition.ts`). The
panel is derived at read time and *"incapable of going stale"*, and the
author deliberately rejected `StudioApi.describeMixin` because it is
read-gated on the author tier and *"an ordinary reader would be
denied"*.

> So a mixin that is composed and never used is not untidy. **It is the
> engine telling a player something false about an object**, on a page
> the engine guarantees is accurate.

The acceptance test is therefore player-observable: **look up a
capability and every object listed actually has it.**

⚠ And it is already happening in the content. `coach.yaml` carries an
author's comment reasoning *from* the composition — *"A coach is a
`Vessel`, and `Vessel` is `Atmospheric(Container(Thing))` — it does NOT
compose `AmbientLit`."* Authors read composition as the contract.

## The premise that died

The slate opened on *"the classes are wide — a row composes whatever its
class composes, used or not."* Measured at runtime via
`MixinApi.queryMixins()`:

| class | mixins | authorable fields |
|---|---|---|
| `Exit` | 1 | 14 |
| `Thing` | **7** | **19** |
| `Vessel` | 9 | 38 |
| `CartesianLocation` | 13 | 44 |
| `Extra` | **50** | 83 |
| `Cast` | **53** | 92 |
| `Avatar` | **65** | 101 |

**Things are narrow.** `platform/thing/Thing` adds nothing at all over
`lib/stuff/Thing`. Only the agent chain is large, and **no gate anywhere
measures class width, nothing complains about over-composition, and the
docs consistently assert composition is free** — thermal *"costs nothing
until something reads it"*, an unused biome mixin costs *"five `null`
fields and five empty objects"*, and the proxy's gate cost is per
dispatch and explicitly *flat in chain depth*. The only quantified cost
of an unused mixin in the tree is five nulls.

⭐ So width is free to **run** and expensive to **claim**. The rewrite
is aimed at the claim.

⚠ The one hard cost that does exist is a compiler ceiling: a retired
note records `Character`'s mixin stack sitting **at TypeScript's
instantiation limit**, which is why `static _mixinName` must widen to
`string`. That is a real build-stopper on the agent chain and it has no
gate. It is not this slate's problem but somebody should own it.

## ⚠⚠ A SIXTH necessity channel — found by re-measuring, 2026-09-29

The five below measured authorship, exercise, a view's `args[].requires`,
class statics, and identity. They missed the one that matters most for
a *verb-bearing* mixin:

> ⭐⭐ **6 · a controller's own `MixinApi.isX` narrowing.** A verb may
> gate on a mixin in its CONTROLLER rather than in its view's
> `requires:` — and then the mixin is load-bearing while being
> invisible to every channel above.

That is exactly how register #7 read as *"the only unambiguous dead
mixins found"* when `ImprovableMixin` is what makes `ditch`, `grub`
and `lime` work at all. **Any future census must grep the controllers,
not only the views.** ⚠ And the two channels disagree for a reason
worth its own look: a gate in the controller refuses *after* binding,
a gate in `requires:` refuses *at* the binder, and the player sees
different things.

## ⭐ The five necessity channels

A (class, mixin) pair is needed if ANY of these fire. A census that
checks fewer produces false death sentences — each of these caught one:

1. **authored** — a row sets one of the mixin's `fieldMeta` fields.
   ⚠ Use **every `persistent` key**, not the `authorable` subset:
   `authorable` is a Studio surface flag (`lib/mixin.ts:121`) and the
   hydrator never reads it. `Material` declares `name` without it and 94
   rows author `name`.
2. **exercised** — a `reconcile`/`postRegister` body, a method override
   live callers invoke, or a `MixinApi.isX()` narrowing.
3. **gated** — a command view's `args[].requires` names it. 53 mixins
   are. ⚠ This one fails **closed and silent**: `Garment` composes
   `DyedMixin`, no garment row authors a dye field, and `dye`/`mordant`
   both gate on it — strip it and the verb dies at the binder with every
   controller test green.
4. **class statics** — `static commandContributions` (54 mixins) and
   `static markupAugmenters` (26). `Palatable`, `NutritionLabel` and
   `Handled` have no fields, no methods and no narrowing, and are
   entirely alive through this.
5. **identity** — the object's nature implies the capability even though
   nothing above fires. A `dagger` with an unauthored `Keen` is a
   **content gap** (author the edge); a till with `Atmospheric` is a
   **misrepresentation** (remove it).

⚠⚠ **Static parsing cannot run this census.** Two wrong answers came out
of it: the `authorable` filter above, and a blind spot where **15 mixin
factories compose other mixins internally** (`Visible`, `Perceptible`,
`Crafted`, `Sealable`, `Switchable`, `Adornable`, `Energized`, `Cast`, …)
so transitive pairs are invisible. Any tool built on this must
introspect at runtime — which means running under the server's vitest
config, because a plain `tsx` import of platform classes fails on TDZ
cycles and the missing call-security transform.

## The rules the fixes obey

From the project owner, 2026-09-27:

1. **It is a class choice, not a puzzle.** If a vessel needs
   atmospherics you use one class; if not, another.
2. **The test is player expectation** — if a player would walk away
   thinking *"weird, it didn't tell me the air pressure"*, it belonged
   on the other class.
3. ⭐ **Where it is a genuine tossup, err on COMPOSING.** *"Silently not
   exercising function is better than being refused it."* A missing
   mixin means a verb dies at the binder and only a code change restores
   it; a present-but-inert mixin can be authored into life later.
4. **Do not expect a balanced tree.** Two classes differing by one
   mixin, adjacent in the taxonomy, is the honest shape when the
   population genuinely splits. Sometimes you mint the near-duplicate.
5. ⭐ Rules 2 and 3 are not in tension: **rule 3 is for one object you
   cannot call; rule 4 is for a population where the answer is clearly
   different for different members.**
6. **Address freely, refuse with a reason.** Nothing should stop being
   addressable because it cannot currently be acted on — that is what
   validation is for, and a refusal that explains itself beats a noun
   the binder cannot see.

## The defect register

Ranked by rows × fields exposed. Verdicts: **M** misrepresentation
(remove/move) · **C** content gap (author it) · **D** dead.

| # | finding | evidence | verdict |
|---|---|---|---|
| 1 | ⚠ **Re-measured 2026-09-29: "provably unreachable" is WRONG — it is the ENVELOPE that never runs, not the mixin.** A player inside an `ExitableVessel` (coach, barge, wagon) reads it through `feel` (`FeelController.ts:150`), `smell`, `listen` and `trace atmosphere`, all of which key off `context.location` being atmospheric; and `feel <vessel>.<detail>` takes a touch band off it (`FeelController.ts:239`). So the mixin **must move, not vanish**. The rest of the finding stands. — **`AtmosphericMixin` on `lib/stuff/Vessel:59`** — 15 classes, 38 rows, 18 fields, **0 authored**, and the envelope is unreachable: `getVolume()` returns null (`Atmospheric.ts:1056`) and only `Location` subclasses override it, so `envelopeApplies()` (`:609`) is false on its first line. The same mixin on `Location` is healthy — 21 classes, 10 authoring, envelope running. 27 of 38 rows are tills, jars, racks, footlockers, packs, handcarts and counters claiming weather. ⚠ `spatial.md:48` **already says they shouldn't have it**: *"Pure containers (Box, Backpack) do NOT compose Atmospheric"* — and `Pack` is the backpack. | ⛔ blocked on the partition slate | M |
| 2 | **A shipped thermal defect behind it.** `Thermal.ts:580` reads only the immediate container: atmospheric-but-null-envelope updates nothing, so **a loaf in a backpack or a fish on a shop counter has frozen ambient**. Removing the mixin does not fix it — the honest repair is stepping outward through a non-atmospheric container, which is *unexpressible* while counters claim to be atmospheric. | the split is a precondition, not the fix | — |
| 3 | **`BrandedMixin` on `lib/creature/Creature:141`** — 19 classes, 73 rows, 0 authored. Its own comment justifies it as *"branding livestock is what marks were invented for"*; its `markupAugmenters` appends *"a product of Veshko"*. The 6 animal descendants are content gaps; **14 human and abstract classes (53 rows) are a lie**. ⭐ One line: it belongs on `lib/creature/KeptAnimal`. | ready now, independent | M |
| 4 | **`ConcealableMixin` on `lib/stuff/Thing:79`** — 182 classes, 596 rows, 2 authoring classes / 5 rows. Portable goods are a content gap (a knife is the archetypal concealed object); fixed room fabric is not — you cannot hide a floor, it is the room. **No signal exists in the data**: `fixedInPlace` is authored on **8 rows in the whole game**, none of them `Floor`, `Street`, `WaterFixture`, `Stock`, `Hearth`, `Forge` or `GardenBed`. A human draws this line class by class. | the bullet-bite | M/C |
| 5 | **`PersonaMixin`** — 60 rows, 14 classes, `bio`/`aspiration` authorable and written by **nobody**, with zero runtime compensation. Every descendant is a person. 60 characters with no interior life, advertised on the wiki panel. | pure content | C |
| 6 | ⚠ **Re-measured 2026-09-29: row-less and production-import-less, yes — but the supporting claims are loose.** Several are imported by *other* classes' tests, not their own. `PersistentCartesianLocation` is NOT "zero references anywhere": `location.md:72` and `forestry.md:36` state it as the answer to a design question. And `Window`, `Remote`, `Screen`, `Candle` and `PersistentCartesianLocation` are all described in published subsystem/architecture docs as SHIPPED, so deleting them makes those docs wrong. `Candle` and `Screen` each carry a subsystem whose only exercise is a test. — **Seven row-less classes** — `Bench`, `Candle`, `Remote`, `Screen`, `Window` (zero rows; `Candle` and `Screen` each carry a whole subsystem exercised solely by its own test), plus `PersistentCartesianLocation` (zero rows, zero references anywhere) and `GlassAlley` (behaviour generalised into the hazard tier, class left behind, every mention a docstring). | delete | D |
| ~~7~~ | ⛔⛔ **FALSIFIED 2026-09-29 — both mixins are LIVE.** `ImprovableMixin` is composed by `trade-farming/src/location/Field.ts:77` and `trade-quarrying/src/location/Turbary.ts:66`, and **gates three shipped verbs**: `GroundWorkController.ts:116` (`if (!MixinApi.isImprovable(stuff)) return null`) is the base of `ditch` · `grub` · `lime`. `RegistrarMixin` is composed by `FisheryRegistry` and `HerdRegistry`, with `DocumentLogic.ts:406` throwing without it. ⭐ **Why the census missed them: the narrowing read is in the CONTROLLER, not in a view's `requires:`** — see the sixth channel below. The true, narrower statement is *neither is named by any `requires:` and neither has a directly-authored field*, which is not the same as dead. | ⛔ do not delete | — |
| 8 | **`MineRoom` + `Atmospheric`** — the inverse case. On the `Location` branch the envelope genuinely runs, and a mine heading is exactly the place that should hold its own air. None of the 4 rows authors any. Given the metal chain models blackdamp, this has teeth. | content, with teeth | C |
| 9 | **`ContainmentApi.looseContents`** — a presentation rule filed as a containment read, with **no receiver**, twelve lines below a comment saying read-wrappers *"were removed: those reads live on the objects themselves"*. See the partition slate. | ⛔ the blocking one | — |
| 10 | **`lint:object-verbs` blind spot** — the gate is a ratchet at zero for an Api static whose first parameter is a world object. `looseContents(items: readonly Stuff[])` takes an **array** of them and slips through. | gate fix | — |

## ⛔ Rejected approaches — do not re-take these

**Splitting `Vessel` into `Vessel` + `Chamber`** (proposed 2026-09-27,
rejected the same day). One class holds, the other has an interior
atmosphere; `Vessel → Chamber → ExitableVessel`. Rejected for two
reasons, the second fatal:

1. **It skipped the prior art.** [fridge-design-pack](./fridge-design-pack.md)
   already prescribes `Atmospheric` on a *container* and designs four
   cold objects on it. The design pass did not read it.
2. ⭐⭐ **It cannot express a fridge-freezer.** A `Chamber` has one
   volume and one envelope, so one object with two setpoints is
   unrepresentable — and a multi-chambered vessel would then be shaped
   differently from a single-chambered one, which is the confusing
   middle that produces bad UX. Worse, **"chamber" is the natural word
   for the compartment *inside* such a vessel**, so spending it on the
   outer object leaves the thing that needs the word unable to have it.
   By its own refusal test, the name fails.

⚠ The diagnosis was right and the cure was wrong in a specific, instructive
way: **it tried to solve a second-axis problem with a first-axis class.**
That is why the tip jar looked hard.

**What the objection turned out NOT to be:** the claim that the split
breaks containment, MQL and the client does not hold — `instanceof
Vessel` has two real sites (both encumbrance `transmissionFactor`), MQL
mentions `ExitableVessel` in one comment, and `packages/client/src` has
**zero** references to `Vessel`. Recorded so the next person weighs the
real objection rather than the plausible one.

## Deferred, with destinations

- **The agent chain** — ⭐ **ANSWERED IN PART by the Agent pass
  (2026-09-30).** The branch has three tiers now, not two:
  `Creature` (a body) → **`Actor`** (a body that ACTS — `Combatant`,
  `Perception`, `Mobile`, `Engaged`, `Sensor`) → `Character` (a body
  that is somebody). ⭐ `Corpse` is the proof of the line: it composes
  the whole of `Creature` and none of those five, which are exactly the
  five that are false of a corpse. `platform/agent/Beast` and
  `platform/agent/DraftAnimal` took the three animal rows off the
  person rung; `KeptAnimal` became the rung's third consumer.
  **What is LEFT of this line:** an `Extra` still composes ~31 layers
  for a role-filler, and the TypeScript instantiation ceiling is still
  here. The question is no longer *is an animal a person* — it is
  *how much of a person is a role*, which is the taxonomy slate below.
- ⚠ **`Persona` off `Character`** (E8 of the Agent plan) — `Persona`
  is authored by **0 of 60 rows** across 14 classes, and the zero is
  MIXED: reading 3 on `Avatar`, reading 2 on the 49 `Cast` (which
  author `prologue` on `CastMixin` instead — a duplicate field), and
  reading **1** on the 5 `Extra`s and the 3 beasts. The honest move is
  the `Named` precedent — `Persona` onto `CastMixin` + `Avatar` — and
  it is **blocked**: `Persona.ts:135-189` has accreted fifteen `self`
  affordances (`appoint`, `quit`, `apply`, `clock`, `office`,
  `government`, `title`…) that would come off the sentry with it. ⭐ The
  fork is *where does a verb for "every person who can act" live* —
  `CommandGiver.self`, a new mixin, or leave it. The owner's.
- ⚠ **`Chattel`/`Branded` on `DraftAnimal`** (E11) — D2's *definition*
  (bought, lent, stolen, a chain of title) says a horse is the paradigm
  case; D2's shipped *host list* says the animal rungs are `KeptAnimal`
  and `Livestock` and nothing else. Two lines if the answer is yes, and
  `Creature.chattel.test.ts` is the test that changes. The owner's.
- ⚠ **The `Staged` split** (E12) — `Katie`, `Walter` and `Realtor`
  share `CastMixin(StagedMixin(NPC))`, and **`Gus` is a fourth consumer
  written as 111 lines of equip code** against a premise that stopped
  being true (`Gus.ts:7-10` says `props:` is rooms-only;
  `Staged.ts:243` composes on any `Container`). The honest superclass
  is *a person who boots with a loadout*, and it needs `StagedMixin`
  split into a props-only rail for bodies — `Staged` bundles `props:`
  WITH `cast:`, so composing it on a person claims that person contains
  a cast. Four receipts. Gus becomes a ROW the day it lands.
- **`Livestock` over `Actor`** (E15) — a head of stock cannot today
  be attacked or walk. Ranching's call; one word after the rung landed.
- **The clone gate reads backwards** — found by the Agent drive.
  `CloneController.ts:161-183`: a row with **no** live instance is
  gated by `canAtPath` (a titled root answers yes); a row **with** one
  is gated through that instance's ZONE. So a wagon standing in the
  Terminus goods yard makes the wagon row unclonable by anyone who does
  not hold Terminus, and the second clone of a draft horse failed in a
  different locality for a row nobody there had touched. ⭐ *A row gets
  harder to clone the moment somebody puts one down.*
- **`wolf.yaml` could author a `concealment` band** (E9) — the lurking
  beast `Concealable`'s own docstring promises; content, not code.
- **`WorkingAnimal`'s transcript** — `Advancement` on a working animal,
  as `WorkingAnimal.ts:38-43` files it. Beside pets, not here.
- **The ox you lead** — `Hauler(Beast)` with no `Mountable`. No row
  wants it yet, and a second draft animal is a row, so this is a class
  only when something needs it.
- **The abstract costume parent** (E16, `costume/student.yaml`) — an
  abstract-ROW concept for the templates/Idea pass, not a class.
- **The Extra taxonomy** — 53 characters in the realm, **49 `Cast` and 4
  `Extra`**, and 18 of the Cast hold a roster seat with no work brain:
  atmosphere extras cast as personalities because no vocabulary existed
  for *a teller*. `Cast` is a singleton, so **the realm cannot staff a
  second counting house without inventing a second person.** Its own
  slate, with the demotion audit already done (7 rows referenced by
  nothing, 4 by prose, 3 by unit tests, 4 by wire tests; Odile is
  untouchable).
- **The structure tier** — there is no way to author *"this room is
  indoors"*. Derived from one bit (does the nearest biome ancestor
  compose `SkyExposedMixin`), only 54 rows cite a biome, and the default
  for an uncited room is indoors by accident. `Atmospheric.ts:651` names
  the gap itself and lists the three cases it gets wrong. Blocks
  *location* naming; too big for this slate.
- **The `distinguishing` prompt gap** — `presentation.md:95` records
  that the disambiguation prompt does not use the `distinguishing` form,
  so two identical cane rods offer two identical buttons. Live now,
  unrelated to this, worth its own small fix.
- ⚠ **`PosedMixin.restingOnPath` is a SECOND "resting on".**
  (`lib/character/Posed.ts:138`.) Slot occupancy for posture — a
  different axis from placement (a slot *claims*, a placement
  *locates*) with a confusable name, and the confusion got worse when
  the spatial one stopped being called that: the tree now has
  `getPlacement()` for where a thing sits and `getRestingOnPath()` for
  which seat a body took. An `ExitableVessel` is where a player meets
  both at once — sitting on a bench in a coach with a trunk in the
  boot. ⭐ Do NOT merge them; do rename one before the next reader
  trips. *(Salvaged from the containment-partition slate at its
  retirement, 2026-09-28 — the one thing it still held.)*
- ⭐ **The re-meltable solid is welded to metallurgy.** `Casting`,
  `Ingot` and trade-smelting's `Bloom` all compose `AlloyedMixin`, so
  **every non-metal thing that freezes inherits `alloying` and `temper`
  fields it can never use** — and the `<composition>` panel shows a
  player exactly that. `Casting`'s own docstring names wax and ice as
  intended uses, and the placement build shipped an ice block on it
  knowingly rather than mint a one-row class (the owner's rule 3: err
  on composing when it is a tossup). The fix is this slate's: a
  re-meltable solid that is not an alloy. *(Owed by the placement
  build, filed 2026-09-28.)*
- ⚠⚠ **A keyword matches by SUBSTRING, and the parser picks one
  instead of asking.** `put ice in icebox`, typed in a room with a
  public not**ice**board in it, silently shut the NOTICEBOARD in the
  cold box and reported success — the block of ice stayed in hand.
  Found by the placement drive, whose diagnostic printed *"You put a
  public noticeboard in an icebox."* A player typing the obvious short
  word gets the same. Same disease as the `distinguishing` prompt gap
  above: when several things match, the binder should ASK, and a
  substring hit should not outrank a whole-keyword one.
  *(Filed by the placement build, 2026-09-28.)*
- ⚠ **Nothing can read a temperature INSIDE something.** Found by the
  placement drive, and both refusals are correct as written:
  `measure temperature` is the INSTRUMENT rung and wants a thermometer
  in hand, while `analyze temperature` is room-scoped by its own row
  (`scope: [here]`) and answers *"It is neither hot nor cold in here"*
  however you aim it. So a player can put food in a cold box and has
  **no way to ask how cold it is** — they can only read the food. That
  is a gap in the instrumentation register (a `subject` scope for the
  temperature channel, or a thermometer anyone can buy), not in the
  cold box. → [instrumentation](../../subsystems/instrumentation.md).
  *(Filed by the placement build, 2026-09-28.)*
- **A generated taxonomy index** — `standard-model.md`'s element list is
  hand-maintained and has drifted. The replacement should be generated
  from the tree (`tools/slate-index` is the precedent) and must
  introspect at runtime, not parse source.

### Filed by the Thing pass (the clusters plan, retired at the sweep)

- **`stash` / `bury` — player-placed concealment on a `Good`** (D3).
  The mechanism (`setConcealment` + `PerceptionApi.hideLevelFor`)
  exists; the verb does not. → [concealment](../../subsystems/concealment.md).
- **The bottling stamp** (D11): a fill at a branded still or bottling
  line should write `_brandKey`. → [corpo](../../subsystems/corpo.md).
- **The mass burn-down** — `lint:mass` shipped as a census-then-ratchet
  at its measured ceiling (242 classes deriving mass by hand rather
  than from material × volume), and `pinch-bar`'s capabilities are one
  of them. The ratchet may only fall.
- **`BoundaryAnchor` as an `Idea`** (D13) — the one `Thing` that is
  neither describable nor addressable, which is what makes the
  `Visible`/`Perceptible`/`Detailed` trio on the `Thing` root a claim
  with one exception rather than none.
- **A trade-fixture rung** — if the brewing vat, the anvil and the loom
  should be *removable fixtures* (owned by the business, never by a
  person), that is a `Good` subclass or a chattel-owner rule, **not a
  third root**. ⭐ The owner's container-taxonomy rule from this build
  applies: one new rung is fine, a half-dozen branches is not.
- **The 362 rows with no `details`** (D8) — content to write, class by
  class, for immersion. The owner's brief: *"most of the places that
  don't author details we probably should be writing some in"*.
- **`Detailed` on `Material`** (D8/F2b) — ruled OUT by the Idea pass
  (I3) for now; revisit only if something starts reading a material's
  parts.
- ⭐ **N3 — an affordance that is DATA.** A command view declares
  `affordedBy: capability:<kind>`; the `capabilities:` a `Tool` row
  already authors (31 of 32) then confers the verbs, and the 24
  static-only tool classes (`Anvil`, `Loom`, `Whetstone`, `SewingTool`,
  `Muddler`, `Strainer`, `SoilKit`, `TimberSet`, `AssayKit`,
  `ScutchingBoard`, `SpinningTool`, `CuttingTool`, `MendingTool`,
  `Spade` ×2, `PrescriptionPad`, `Splint`, `SurgicalKit`, `SutureKit`,
  `Syringe`, `SurveyInstrument`, …) become **rows over `Tool`**. The
  five with a body (`Rod`, `Trap`, `AssayBench`, `LoadDevice`,
  `HouseholdersKit`) survive as classes. Touches `CommandLogic`'s
  collection walk (`api/command.ts:1437`) and the verb-collision
  ladder. ⚠ Not asked for; the owner has it.
- ⭐ **Assembly / disassembly — the fourth answer to movable/immovable**
  (F3, owner 2026-09-29). *"We are going to want 'assembly' to be a
  system on top of 'crafting' but we've only designed the latter. Once
  assembly ships it may make sense to make the assembled item unmovable
  but the pieces movable — and then we'd also need disassembly."* This
  build kept furniture and trade equipment on `Good` (status quo,
  preempts nothing). The seam: an *assembled* thing may become immovable
  while its *pieces* stay movable — neither the root nor the rung but a
  **state transition between them**. It would revisit at least
  `Fitting` (table · counter · workbench · racking · bench), `Vat` (the
  installed brewing/dye/retting vats vs a carboy), `Chest`, `AssayBench`
  (whose city row already authors `fixedInPlace: true`), `Tariff`,
  `Chair`/`Bed`/`Desk`, `Loom`, `Anvil`, `Still`, `GristMill`,
  `ButcherBlock`, `DryingRack`. Start from that list and from
  [crafting](../../subsystems/crafting.md).

### Filed by the Location pass (the location plan, retired at the sweep)

- **`staticSlots` is offered on every room and is dead there** (L3).
  `Adornable` is built on `Slotted` and ignores the field; the Pattern C
  surface is half-implemented (`getSlotNames` reads fixtures,
  `getAllOccupants` reads an empty map; `PutController.openSlotFor`
  sees every fixture slot as open). Two fixes, both
  [slot.md](../../subsystems/slot.md)'s and the owner's: a declared
  `authorable: false` (which would be the tree's first) or the Slotted
  split giving `Adornable` a fixture map of its own. ⭐ This is the
  **fourth reading of a zero authoring count** the build found — not
  misrepresentation, not a content gap, not silent behaviour, but *the
  offer itself is wrong*.
- **`coords` / `coordinates`** (L4) — two storages of one fact on every
  cartesian room, bridged by `setCoords`; the spherical pair authors the
  tuple directly. `location.md:326-331` calls unification out of scope.
  The day a third coordinate system arrives is the day to do it.
  (This build moved `authorable` to the one the Hydrator actually
  reads; it did not unify them.)
- **A spherical venue cannot author `props:`** (L7) — `SphericalLocation`
  composes no `Staged`; 0 rows want it; a one-line addition when one does.
- ✅ **The unafforded verbs (L9) — CLOSED by the reachability sweep
  (2026-10-07), and the real count was FIFTEEN, not ten.** That build
  censused all 301 command views against every `commandContributions`
  static in the kernel and every pack, and **arm A of
  `lint:reachability` is a zero invariant now**: every view is conferred
  or declares `unreachable:` saying why not.
  - **Conferred (11):** `walk` → `MobileMixin.self` (the third ground
    pace; `sneak` and `run` beside it always worked) · `dismount` →
    `PosedMixin.self` (the state is the RIDER's — `requiresMounted` reads
    the giver's posture, so you dismount a horse that walked out from
    under you) · `fold`/`unfold` → `FoldableMixin` · `prompt` →
    `HasInteractiveMixin.self` · `transfer`/`subdivide` →
    `PersonaMixin.self` (universal, on `title`'s doctrine: *the gate is
    the authority, not the affordance*) · `wind`/`adjust` → the pack's
    `Watch` class · `drive` → `DrivableMixin` and `flourish` →
    `BarStation`, the two this list did not know about.
  - **`swim` conferred** by a new `platform/thing/OpenWater`
    (`SwimmableMixin(Thing)`), one row propped in four estuary and
    wharfside rooms — the Ladder shape, because the enablement walk looks
    in the actor's container and its contents. ⚠ Until then the only
    composition of `Swimmable` or `Flyable` in the repo was an
    integration test that manufactures its own hosts.
  - **`lock`/`unlock` still held, per § I9 below**, and `fly` with them —
    but all three now carry `unreachable:
    awaiting:base-class-narrowing-slate` on the view, so the disposition
    is a gated field rather than an absence. ⭐ `fly` is the one case
    where *afford statically, decline diegetically* does not apply: with
    no `media: ['air']` exit, no flying species and no composer, the
    refusal would point at nothing. **What lifts it** is a flying species
    with the mode on its body plan plus one air exit; then the host
    follows `OpenWater`'s shape exactly.
  - ⚠⚠ **Eleven of the fifteen had PASSING controller unit tests**, which
    is the finding worth carrying forward: a controller test is handed a
    pre-built model, so it passes over a verb that does not exist.
  This build afforded `hitch`/`unhitch` and `mount`/`ride`.
- **`alternateNames` × 45** — the next dead-key burn-down;
  `turf-bank.yaml` is one of them.
- **The lounge on plain `Location`** — D14-honest today. If
  `lint:locations`'s *every location plots* rule ever wants the lounge's
  satellites on the roster, the exemption is `WarrenMember`, not a class.

### Filed by the Idea pass (the idea plan, retired at the sweep)

- **Concealment's census cannot see an exit's band** (I4) — the
  authoring surface is a Location row's `exits[*].concealment`, so a
  census that reads rows by class reports the exit family dead. The fix
  is an **instrument** change (`check-composition-census` reading inline
  exit specs as authoring for `Exit`), not a class change.
- **The reference-Idea family and the class it would earn** (I7) —
  eight classes, one sentence, no body. The body that would mint the
  rung is a clone refusal or a catalogue-warm gate
  (`lint:reference-ideas`), which is the real fix for the *inert at
  boot* defect this repo has now hit three times.
- ⚠ **`lock`/`unlock` over `Lock` + `presentsKey`** (I9) — the
  reconciliation `lib/boundary/Locked.ts:15-24` asks for; the boolean
  mixin retires with it and the file is renamed then. ⭐ **Until that
  lands the two views stay unafforded ON PURPOSE** — this build's
  Location pass planned to wire them and reversed itself on the Idea
  planner's evidence (`LockController` checks no key, no credential and
  no title, and `Locked.ts` says in terms *"Do NOT grow this into a
  second lock system"*). **The census is the census; the disposition is
  per verb.** → [boundary](../../subsystems/boundary.md),
  [credential](../../subsystems/credential.md).
- **The unafforded twelve** (I10) — the list with the bucket each would
  take: `Mobile.self` for the door pair once keyed; the locomotion
  family and `Foldable` are `locomotion.md`'s and `slot.md`'s.
- **Species' generic appearance** — 38 of 74 species author no
  `longDescription`. A content gap (reading 2), the owner's brief:
  *"write some in for immersion's sake"*.

### Filed by the coordinator (the first narrowing plan, retired at the sweep)

- **A passenger is a heat source.** A body emits ~100 W; a full coach is
  warm. `SpaceHeating` on the agent chain is a host-placement decision
  (lens 3 wants it; the agent chain is at the TypeScript instantiation
  ceiling, which is what makes it a decision rather than a line).
  → [thermal](../../subsystems/thermal.md).
- **A shipped coach.** No locality places one; `passenger-conveyance`
  waits on distance. Until then an `ExitableVessel` interior is provable
  only by clone.
- **Nested envelopes** — a coach in a coach-house; a room in a building.
  The structure tier's, below.
- **The holder read is immediate** — a bag in an icebox. The
  frozen-ambient repair this build shipped steps outward through
  non-atmospheric containers; a *holder* inside one is the next step.
- **The inverse `<composition>` panel's cost**, and a memoized class
  index. → [wiki](../../subsystems/wiki.md).
- **`Chattel` on `Creature`** — the same test the census applied to
  `Branded`. (This build took `Chattel` off `Creature` and off the
  `Thing` root; whether a *kept* animal is chattel is the open half,
  and it meets `Chattel`/`Branded` on `DraftAnimal` above.)
- **`ColorTag`** — vocabulary with no user.
- **The census's eighth and ninth channels** — a dead scan root in a
  read-time panel; an exit count that does not know a seal is a door.
  The seven-channel tool is `pnpm -C packages/server mixin-census`.
- **The `Improvable` / `Registrar` rows stay struck** — register row 7,
  falsified: both mixins are live, and the census missed them because
  **the narrowing read is in the CONTROLLER, not in a view's
  `requires:`**. That is the sixth necessity channel.

---

## ⭐⭐ The Extra taxonomy — measured 2026-09-30

Taken at `89c75417c` for
[agent-branch-layering-requirements](../../requirements/agent-branch-layering-requirements.md),
cross-checked against `packages/server/scripts/check-identity.ts --report`.
This is the demotion audit the § Deferred bullet says is "already done" —
it was not on disk, and re-taking it corrected the bullet in four places.

### The census

**49 `Cast`** (43 rows naming `/platform/agent/Cast` + 6 on TS
subclasses: `Gus`, `Editor`, `TicketClerk`, `Walter`/`Realtor`/`Katie`
on `CastMixin(StagedMixin(NPC))`) — ✅ the slate's number is exact.
**4 `Extra`**, ⚠ but one is **not a character**:
`generic-objects/.../agent/costume/student.yaml` is the abstract
`extends:` parent for ~45 rows, with no species and no brain; its own
header calls it *"a known rough edge."* So **3 role characters in the
whole realm.** Plus one `Mercenary` on neither rung.

By pack: terminus 29 · rejection 6 · lounge 5 · trade-haulage 3 ·
hearthworks 2 · hearts-delight 2 · newbie-wilds 1 · eternal-university 1.
**39 named, 10 nameless** (`register: definite`).

⚠ **The slate's "18 seated with no work brain" is wrong** — it is the
sum of its own four audit buckets (7+4+3+4), not a count. The real
number is **23** by the strict reading, **17** if `shifts` counts as
work (it does not: `lib/behavior/shifts.ts` teleports a body between
`behindBar` and `offstage` and performs no labour). **43 of 49 hold a
roster seat.**

### 🔴 The demotion list — seat, no work brain, no reference ANYWHERE (13)

| row | name |
|---|---|
| `terminus/wharfside/dyehouse/agent/dyer` | Ilva Marrow — ⚠ **no brain at all** |
| `terminus/market/agent/baker` | Marn Ottoway |
| `terminus/market/agent/fishmonger` | Hessa Vane |
| `terminus/necropolis/agent/undertaker` | Merrick Sault |
| `hearts-delight/agent/farmer` | Odell Quist |
| `hearts-delight/agent/miller` | Sennet Aubry |
| `rejection/agent/onsetter` · `smelterman` · `buyer` · `collier` · `storekeeper` | nameless (the buyer holds **two** seats) |
| `trade-haulage/agent/dispatcher` · `warehouseman` | nameless |

Nine carry a dossier (`archetype` + `competence`, some `prologue`) that
nothing ever reads back into prose.

### ⭐ The eight goods-yards hands — one role, eight invented people

`bottling` Dez Okoro · `brewing` Tamsin Roke · `crowsfoot` Wren Ashby ·
`farm` Wen Hartley · `hollis` Bram Tull · `pantry` Rufus Penhallow ·
`veshko` Petra Volkova · `vintner` Ilse Marrow.

Same archetype (`hand`), one `consigns`/`cellars` brain, one `idles`, a
unique proper name, **and no external reference except the cast-archetype
slate that named them**. ⚠ They *do* have work brains, so they fail the
audit on *eight names for one role*, not on doing nothing — the teller
pathology at 8× volume, and the judgment call in any demotion.

**Keep as people:** Odile (prologue, renown claim, two seats, canonical
in three subsystem docs — untouchable), Dave, Gus, Ricky, Katie, Walter,
the three lounge bartenders, Ambrose Tull, Halloran and Tootie (dialogue
trees + a command surface), Mara, Hesper Quill, and the 20 with genuine
work brains.

### ⭐⭐ The signal already in the data

**24 of the 49 Cast are `register: indefinite` WITH a name.** Their prose
reads *"a brisk Goodkin teller"* while their class asserts a singleton
individual with a private ledger. **Every one of the 13 above is
indefinite-with-a-name or nameless.** `lint:identity` rule 2 only forbids
`indefinite` on a *nameless* Cast, so the combination is currently legal
and is the cheapest available demotion heuristic.

### ⚠⚠ The singleton does NOT throw on the path content uses

`StuffApi.clone` (`api/stuff.ts:531-550`) throws for a `SingletonMixin`
class. **But NPCs are not cloned** — they are staged by a location's
`cast:`, and `StagedMixin` branches (`lib/stuff/Staged.ts:371-392`):
singleton → `StuffApi.singleton(path)`, and if the instance is already
placed and the entry carries no placement, it **`continue`s**.

So a second counting house naming the teller in its `cast:` yields:
- **no placement** → the hall stands up with **no teller, silently**;
- **with a placement** → the one Wenna is **moved out of the first hall**.

Neither throws. `identity.md:92` (*"a second live clone throws"*) and
`Cast.ts:14-17` describe the `clone()` door, **which content does not
use.** The invariant holds today by authoring discipline plus
`check-identity.ts:361-370` (rule 3) — verified: all 49 are staged
exactly once.

**What actually breaks with two live instances** is shared identity: a
Cast row clones with no `asIdentityPath`, so both return the row path,
and everything identity-keyed collides — belief, chronicle, transcript,
renown, grants, chattel, **bank accounts**, employments. The same defect
class that once gave every player one bank account.
`BeliefStore.ts:352-366` names the dependency explicitly (*"Row 3 — one
live instance per row, so the row path IS unique"*).

### What an `Extra` costs — 8 of 15 dead, 6 by DECLARED RULE

| verdict | mixins |
|---|---|
| ✅ read (5) | `Employed` (the only attribution a role's harms carry), `CommandGiver` (brains drive forced verbs), `Vocal`, `Soul`, `Perceiver` |
| ⚠ marginal (2) | `Hauler` (self-haul term; its docstring says it sits high so `hitch` can *refuse* a wolf), `Advancement` |
| ⛔⛔ refused by rule (2) | **`Persona`** — `check-identity.ts:389-397` makes `prologue`/`competence`/`circumstance`/`renown` on an Extra a **build error** (*"A role has no history — that is what being a role means"*); **`BeliefStore`** — `Extra.keepsPersonalRegard() → false` and `viewerKey` returns `null` |
| ⛔ dead (6) | `Caster`, `Memorized` (the tell that the wolf was misfiled), `Gendered`, `Status`, `Dispositioned`, `Hiding` |

**Only 4 of the 15 expose any `authorable` field at all** (`Gendered`,
`Persona`, `Status`, `Employed`), and **the four Extra rows author
exactly one field between them** — `institution` on the sentry.

### `Persona` — four corrections

1. **57 rows / 12 classes**, not 60/14: the 3 beast rows / 2 beast
   classes came off the person rung in the Agent pass (`Beast` and
   `DraftAnimal` sit on `Actor`). *"0 authored"* is confirmed exact.
2. **14 affordances, not 15** (`Persona.ts:135-193`), all `self`;
   `peers` and `environment` are empty. ("Fifteen" belongs to
   `Actor.ts:48`, about `CommandGiverMixin`'s affordance statics.)
3. ⚠ **`prologue` is NOT a duplicate field** — it is a `string[]` that
   *feeds* `Persona.seedChronicleClaims` and guards on
   `MixinApi.isPersona` (`Cast.ts:189-199`); `bio` is a prose blob the
   chronicle prints separately. Nothing is deduplicated by moving
   `Persona`. And **only 18 of 49** Cast author `prologue`, so 31 are
   the same unmitigated gap.
4. ⭐⭐ **The fork has a measured answer, and it is not `CommandGiver`.**
   `CommandGiverMixin` **affords nothing today** and has **two**
   composers — `Character` and `Login`. Every `Character` composes both,
   so the move buys **no host that wants the verbs**; it adds only
   `Login`, breaking the invariant its own docstring states (*"the
   recency stack IS the sandbox — no world verbs leak because `Login`
   composes none of the mixins that contribute them"*). 11 of the 14
   would refuse with *"Login can't do that"* at a character-select
   prompt, 3 would not refuse at all, and **`quit` would answer "you
   hold no position" to somebody trying to disconnect.**
   ⭐ **"Every person who can act" is already spelled `Character` — and
   `Character` is a class, not a mixin.** The 14 belong on it as a class
   static, which is what `Avatar` already does with its own 17.

⚠ And none of the 14 is narrower than *every animate person* at the
affordance level: 11 carry `requiresAnimate`, 3 (`chronicle`, `traits`,
`standing`) carry **no verb-level validator at all**. Every real
narrowing is a validator or a controller refusal — the doctrine holds.
⚠ `EmployedMixin` is composed at exactly one site (`Character.ts:115`),
so *"everyone with an employment seat"* and *"every person"* are the
same host set today; the four employment verbs' `isEmployed` guards are
runtime tautologies against every current composer.

### Loose ends for whoever builds this

1. ⚠ **One Cast is invisible to `lint:identity`** — the dyer row has no
   `behaviors:` key and the census loop `continue`s past it
   (`check-identity.ts:315`), so no rule in the file sees her. Any rung
   rule needs a second pass over all organism rows (rule 6 is the
   precedent).
2. `/stuff/agent/costume/student.yaml` is an `Extra` that is not a
   character and will be counted by any class-based census.
3. `MixinApi.isCast` has **zero production callers**, and the
   `CastMixin` refusal string is never triggered — the rung is read only
   via `SingletonMixin`, `BeliefStore.viewerKey`, and the lint.
   `MixinApi` has no `isExtra` by design, so *"not Cast"* does double
   duty for role, animal and mercenary in the lint's own bucketing.
4. **Two rows hold two seats each** (the rejection ore buyer, Odile) —
   a per-seat rule needs a many-to-one seat→row mapping.
5. **There is no Extra→Cast promotion and this build must not invent
   one.** `Cast.ts:41-47` and `identity.md:133-138` both say *"promotion
   is an authoring act"*; a rung is fixed at construction (`NamedMixin`
   and `SingletonMixin` are in the class chain). The animal `name` verb
   is gated on `isBonded` + `isNamed` and cannot reach an Extra twice
   over. Even the collision half is unbuilt (`NameController.ts:93-95`).
