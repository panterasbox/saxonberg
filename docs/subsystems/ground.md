# Ground — what you are standing on

**The build:** `build/ground`, MR !283, 2026-09-24. Its slate, requirements and
plan retired into this doc at the pre-merge sweep.

Before this, three different things were called *ground* and none of them
answered the question a player asks by standing somewhere:

| | owned by | answered |
|---|---|---|
| the **column** — strata, the orebody | `trade-mining`'s `Deposit` | only where a mine was cut |
| the **surface character** — texture, drainage, pH | `trade-farming`'s `GroundCharacter` | only where a field was ploughed |
| the **floor** — the thing you sit on | a `Floor` row 27 rooms authored | almost nowhere |

⭐ And the third was not merely sparse: `sit`, `lie` and `kneel` were
**refused in the room a brand-new character opens their eyes in**.

---

## Three claims, and the rest follows

**1. Every Location has a floor, by construction.** `Location.ensureFloor()`
runs at `postRegister` — the one lifecycle every clone *and* every `create`
passes through, which is why a warren-minted Lounge room gets its floor from
the same line an authored room does. A room opts out with
`noDefaultFloor: true`; the void is the only shipped user.

⚠ That is why `PostRegistrationMixin` sits in `Location`'s **base** stack.
The mixin's default hook is a **non-chaining no-op**, so a second
composition anywhere above the base *swallows* the base's — which is what
the ten Location classes that used to compose it individually would each
have done. Every override in the family now chains `super.postRegister()`,
and `lint:ground` clause (e) is what keeps it that way.

**2. A floor knows what it is made of, and never has to be told.** Five
rungs, authored first, resolved once at attach and stamped — because every
consumer of a floor's material is synchronous and rung 3 is not:

1. the floor row's own `_materialPath`;
2. the Location's `floor: { material }` spec;
3. **if on grade** — the ground beneath, through a `GroundSource`;
4. `Location.floorDefaults(onGrade)` — the room-kind default;
5. the plain default (a plain floor is a board floor).

**3. The KIND is derived, never authored.** `f(materialClass, onGrade,
worked, standingWater)` over `GROUND_KIND_FOLD`, closed at ten words:
`rock · set-paving · slab · earth · mire · beaten-floor · loose · boards ·
plate · contrived`.

⭐ The point of deriving it is that **two rooms paved in the same stone read
the same without anybody having chosen it** — there is no `kind:` field for
two authors to disagree in. The market square and the goods yards are the
shipped proof, and they reach the same answer from *different rungs*.

⭐ And `contrived` is what lets the list stay closed: a material the fold
does not recognise gets an honest answer and everything downstream keeps
working, so an author can invent matter without a kernel MR.

---

## The two questions that are NOT the same question

1. **Is there a floor here at all** — is this place *standable*?
   `noDefaultFloor`. Defaults to yes.
2. **Does the ground continue beneath it** — `onGrade`? Tri-state, `null`
   meaning *derive*: on grade iff the room is **sky-exposed** or sits
   **below datum**.

⚠⚠ Conflating them is the trap. A flying-only room **is sky-exposed**, so
deriving existence from `onGrade` would hand it an *earth* floor and you
could sit down on the sky; a mid-column water band **sits below datum**, so
it would floor open water when only the **bed** has ground under it. Neither
exists in the game yet — the declaration and its test ship so the builder
who arrives finds the seam. See
[underwater-slate](../slates/builds/underwater-slate.md): *a band is not
standable; its bed is.*

⚠ `onGrade`'s sky-exposure limb is only as live as the biome roster —
`BiomeApi.isSkyExposed` answers `false` when no biome resolves, and
`getBiome()` is a **registry read**. `BiomeCatalogue` is what warms it; see
[biome.md](./biome.md).

---

## `/system/ground` — the pack

`Deposit` (the column) and `GroundCharacter` (the surface) live here, not in
the two trades that used to own them. ⭐ The `/system/` test is *a system is
true whether or not anyone is participating in it*: geology is there with
nobody mining and dirt is there with nobody farming. While they were a
trade's, a wood could not read its own ground, a quarry would have had to
depend on a mine, and the kernel's floor had nothing to ask.

⚠ **A system's classes are the pack's; its instances are the realm's.** The
Ferrow deposit stays in `rejection` and names `/system/ground/idea/Deposit`.
Same split as `Locality` and `Government`.

Both models compose **`GroundSourceMixin`** — the capability the *kernel*
declares and the *pack* implements, because the kernel cannot import a pack
and a pack cannot add a field to a kernel class (the failure already
recorded in `SpatialZone.ts`, where the two citations sit as strings the
kernel interprets nowhere). The **address** crosses the seam, never a seed:
each model derives its own.

⭐ They do not overlap. A character answers within its `topsoilM`; a column
answers from the collar down. That boundary is what lets a field read loam
while the gallery beneath it reads its host rock — **one ladder, two
sources, nothing arbitrating.**

`StrataMixin` (the pack's `lib/`) holds the five position reads lifted out
of `WorkingMixin`, which composes over it: knowing where you are in the
column is the ground's business, cutting it is the trade's.

---

## Reading a floor

⚠⚠ **`floor` and `ground` are keywords on the CLASS, not on the row.** The
MQL scope walk pools a thing's own `getKeywords()`, and `pushDetails` gives
a detail the pool `[<its id>]` and **never** its authored `keywords:`. So a
floor row's `details.floor.keywords: [ground]` is dead text — and attaching
a floor row to all 139 Locations would have fixed `look floor` while leaving
bare `sit` broken. `FloorMixin.getKeywords()` unions both words;
`lint:ground` clause (d) makes every row say them out loud as well.

⚠ For the same reason a floor row must **not** author a detail named `floor`
or `ground`: the detail wins the resolve, and a detail renders without the
host's `markupAugmenters`, so the derived sentence vanishes. Clause (f).
Details naming a real sub-feature — the crossing's worn track, the goods
yards' gutter — are the opposite case and are what details are for.

**One read for the room's floor: `Adornable.getFloor()`**, returning
`FloorThing`. Three resolvers used to answer it three times by scanning
fixtures-then-contents for any Bulkable with a surface slot; they all ask
this now and keep their own `hasSurfaceBulk()` check, because a dry posture
floor is still a floor and a puddle still needs the slot.

⚠ A floor is a **fixture** — in `Adornable.fixtureSlots`, not in contents.
Two consequences that cost real defects: presence cannot keep it resident
(hence `AdornmentMixin.canEvict`), and it has no container (hence
`VisionModality` resolving a fixture's light to its **host's**, without
which every fixture in the game rendered as *"something"*).

---

## What it costs

Measured at the build (400 clones each way, in-memory store):

```
a room clone   bare 0.519 ms   →   floored 1.282 ms   (+147 %, +0.76 ms)
```

⭐ **Cloning a room costs one more object, and that roughly doubles it** — but
the absolute number is what matters: a cold world boot is ~93 s, and 139
Locations × 0.76 ms is **0.11 s**, an upper bound assuming every room clones
at once, which nothing does. Rooms are cloned lazily and culled by residency,
so **an unvisited room costs nothing** and entering one costs 0.76 ms more.

⚠ The rejected alternative is worth recording: minting the floor lazily on
the first `getFloor()` would need `await StuffApi.clone` inside a read that is
**synchronous for all four of its callers**, including the binder's scope
walk. Paying 0.76 ms is cheaper than making the floor's existence
asynchronous — and lens 3 agrees: a floor that appears when somebody looks at
it is the gauge-shaped answer to a sim question.

---

## The census

```bash
pnpm -C packages/server lint:ground            # the gate, clauses (a)–(f)
pnpm -C packages/server lint:ground --report   # every Location and its ground
pnpm -C packages/server lint:ground --seed     # the claim heuristic, for curation
```

List 1 is derived. List 2 is hand-curated — rooms whose prose names a floor
material the room does not author — and its length is a **ratchet**: clause
(c) fails a listed row that has since been answered, so paying the debt and
recording the credit are the same commit. See
[lint-family.md](../lint-family.md).

---

## Seams left open

- **`dig` reads the floor** — `getGroundKind()`, `isOnGrade()`, and
  `resolveUnderfoot()` again after a strip → [extraction-slate](../slates/builds/extraction-slate.md).
- **Coverings** — a rug, snow, mud over paving; a layer *above* the floor,
  and the reason rugs and carpets are excluded from the census →
  [field-substrate-slate](../slates/tails/field-substrate-slate.md).
- **Consequences of the read** — traction, footstep sound, fire across
  boards, a body landing on flagstone rather than mire
  ([materials-response.md](./materials-response.md) — a floor is exactly a
  material plus a construction). ⚠ Two Larian-style surfaces already ship:
  a spill pools in the floor's surface slot, and electricity conducts
  through that puddle. What this build added is the **material** the rest
  of them need.
- **Combat** — `prone` is a session flag, and the bum's rush calls
  `setPosture` rather than `transferPosture`, so a rushed body reads *lie*
  while occupying no posture-bearing slot. That passed only because there
  was no floor to be on. → [combat.md](./combat.md).
- **Two rooms cite no biome at all** (`rejection`'s pithead yard and adit),
  so they take the interior default outdoors. Content debt; the census
  counts it.
