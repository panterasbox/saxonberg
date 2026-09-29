# Base-class narrowing slate — what a class claims, and what it uses

> **Status: UNBUILT** — nothing here exists, and the slate's original
> premise (2026-09-26, *"the classes are wide"*) was **measured and
> falsified** the next day; see § The premise that died.
> **Left:** the containment partition concept (⛔ **blocks everything
> else** — its own slate) · `Atmospheric` off `Vessel` · `Branded` from
> `Creature` down to `KeptAnimal` · the seven dead classes · the
> `Concealable`-on-`Thing` boundary (the bullet-bite) · `Persona`'s 60
> empty biographies · `Improvable`/`Registrar` · the `lint:object-verbs`
> blind spot
> **Size:** a build, after one design pass

> Rewritten 2026-09-27 from a full-tree census. Every number below was
> taken against `edd318088` and every claim carries its evidence. The
> measurements are the argument; re-take them if this sits.

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

- **The agent chain** — `Extra` composes 50 mixins and declares nothing
  of its own over `lib/npc/NPC`; an `Extra` is meant to be the light
  identity rung and currently carries metabolism, vitals, respiration,
  hygiene, combat, casting, beliefs and thermal regulation. Its own
  slate; the TypeScript instantiation ceiling lives there too.
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
