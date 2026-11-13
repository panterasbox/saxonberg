# Size

The size subsystem answers one question everywhere it is asked: **does
this go there?** — into a bag, through a mouth, along a belt, through a
door, under a ceiling, round the bend of a stair. It is a tape measure,
not a stat: every answer derives from what a thing is made of, how much of
it there is and what shape it has, and the same rule asks a pocket, a
chest, a cart and a room.

Nothing is stored that can be derived. A thing's size is authored only
where it is the point (a bole's length, a sheath shaped to its blade, a
pack's room); everything else is mass over density in a form's
proportions.

The companion doc is [carrying.md](./carrying.md) — where a thing goes on
a body. This doc is the measure that doc asks.

## The Cast

| Piece | Where | What it is |
|---|---|---|
| `Dimensions` | `lib/spatial/Dimensions.ts` | a value object: a box, `width · depth · height` in meters, and every tape-measure read on it |
| `SIZE_DEFAULTS` | beside `Dimensions` | the dials (packing, interior fraction, hang safety, the room words, standard gravity) — numbers, not an Api |
| `Form` rows | `platform/idea/Form` at `/platform/idea/Form/<name>` | a shape a thing can have: `rod` · `sheet` · `block` · `round` · `flexible` |
| size reads | `TangibleMixin` (`lib/material/Tangible.ts`) | `shape`, `dimensions?`, `getDimensions`, `getVolumeM3`, `getFitBox`, `getPackedVolumeM3` |
| container reads | `ContainerMixin` (`lib/spatial/Container.ts`) | `mouth?`, `shapedTo?`, `bounds`, `fitRefusal`, `closureLevel`, `reconcilePressing` |
| the hanging length | `PlacingMixin` (`lib/spatial/Placing.ts`) | `hangingLengthM`, `bearsKg`, `roomFor`, the member fit in `canPlace` |
| a way's gap | `Exit` (`lib/boundary/Exit.ts`) | `clearance`, `turn?`/`getTurn`, `clearanceRefusal` |
| a body's outline | `Creature` (`lib/creature/Creature.ts`) | `envelope`, `wornBulk`, `mountedPair`, `acceptPosture` |
| gravity, sync | `AtmosphericMixin` (`lib/biome/Atmospheric.ts`) | `gravityNow()` |

No Api, no logic singleton, no collection. Every piece is a method on the
thing whose question it is.

## `Dimensions` — a box and its reads

```typescript
new Dimensions(width, depth, height)   // meters; a non-positive side throws
```

| Read | Meaning |
|---|---|
| `sorted()` · `longest()` · `shortest()` | the sides, largest first; the longest is what matters where a way bends |
| `hangingWidthM()` | the **middle** side — the width a thing takes hanging from a belt |
| `crossSection(): BoundaryOpening` | the two smaller sides — the face a thing passes an opening by (a pole goes in endwise) |
| `fitsThrough(opening)` | does the cross-section pass, turned either way? |
| `rotations()` | the six ways the box can stand |
| `orientationWithin(box, closed)` · `fitsWithin` | ⭐ the way it stands in `box` fitting every side the box **closes** — open sides do not count (a broom stands in a bucket); of the ways that fit, the one that fills least |
| `boxVolume()` | m³ |

`BoundaryOpening` (`{width, height}`, `lib/boundary/Conduit.ts`) is reused
as the mouth and the clearance type — an opening is not a thing, so it is
not a `Dimensions`.

## Forms — `shape:` on a row

A form sets a thing's **proportions**; its volume sets the scale. Five
rows ship under `content/platform/idea/Form/`:

| form | aspect (w : d : h) | rigid | a … |
|---|---|---|---|
| `rod` | 1 : 1 : 20 | yes | sword, pole, scroll |
| `sheet` | 50 : 70 : 1 | yes | paper, board, pane, hide |
| `block` | 1 : 1.5 : 2 | yes | brick, box, chest — the default |
| `round` | 1 : 1 : 1 | yes | apple, pot, cheese |
| `flexible` | 6 : 8 : 1 | no | cloth, rope, a bag, a pelt |

A thing names its form by its `shape:` field (`shape: rod`). ⚠ The field
is `shape`, not `form`: the glass pack's `Sheet`/`Gather` and
`Construction` already own `form`/`getForm()`. The class default is the
static `defaultShape` — `block` on `Tangible`, `flexible` on `Garment`,
`Line`, `Sack` and `Pack`, `sheet` on `Sheet`. A word with numbers behind
it is a row, never an enum (`lint:closed-vocabularies`): **a sixth form
— a cone, a ring — is a row and no code.**

⭐ **Forms load on use.** `getShape()` reads the resident row; a miss
starts the load (from the omni scope only — a commons row is never minted
inside a circle) and answers *unknown* this once. The async seams that ask
a size — `put`, the dispatcher's readying step, the traverse gate, a
prop's install — `await ensureShape()` first. A thing whose form is not
loaded has no known size, and **nothing unknown is ever refused**.

## Volume and size derive

- `getMatterVolumeM3()` — mass ÷ the material's density: the matter
  itself, a hollow thing's walls. The **one** promoted rule; the water's
  displacement (`Buoyant`) reads it.
- `getVolumeM3()` — what the host knows better: a vessel adds its inside
  (`interiorCapacity`), a stack its count × one unit (a `Coin` pile's mass
  is the pile's and overrides), an assembly Σ its recorded
  `PartLine.volumeM3`, a body its own density, a rope π(d/2)²·L.
- `getDimensions()` — the authored box when there is one, else the form's
  aspect scaled to `getVolumeM3()`. A flexible thing answers its **flat**
  box. `null` when the volume is unknown.
- `getFitBox()` — what the tape measure uses: the dimensions for a rigid
  thing; for a flexible one the cube root of its **packed** volume (a
  coat squeezes through what a board cannot).
- `getPackedVolumeM3()` — rigid: the box; flexible: × `FLEXIBLE_PACKING`
  (2.0 — cloth packs with air) × `foldPackingFactor()`; a coiled rope ×
  `COIL_PACKING` (1.3).
- `foldPackingFactor()` — `1` by default; a folded `Foldable` answers
  `FOLDED_PACKING` (0.6). The folding build replaces the number with its
  crease model; nothing else changes.

`massAndBulkWords()` is how a person reads it off a list (`0.4 kg, 0.2 L`
— `inventory --weight`).

## ⭐⭐ A container bounds only the sides it closes

`Container.bounds(): {interior, closed, mouth}`:

- **interior** — known only from an **authored box** (× `INTERIOR_FRACTION`
  0.9, the walls), a vessel's `interiorCapacity` (in its rigid form's
  proportions; a flexible one's as a block) or a **place's cube**
  (`getLinearExtent()`, height its ceiling). ⚠ A hollow thing's DERIVED
  size measures its walls, so a container with no authored box has no
  known room and is never asked — every shipped `Pack`/`Vessel` without
  one behaves as before.
- **closed** — a rigid container closes width and depth always, and
  height only while a `Sealable` lid is shut (a bucket, a barrel, an open
  crate are open above); a place closes width and depth unless it has no
  walls (`openSides ≥ 1` opens depth, `≥ 3` width) and height unless its
  top is open.
- **mouth** — the authored `mouth:` (`{width, height}`), else the
  interior's top face (a bag opens as wide as it is). A place has no
  mouth: entry is through a way.

`Container.fitRefusal(item): FitRefusal | null` runs, in order:

1. **`not-shaped-for`** — a container with `shapedTo:` (a mixin name, or a
   template path admitting that row and its subtree) admits its one kind
   whatever its size: a holster takes the pistol, never a cup. Size-blind
   (`dims` is `null`).
2. **`too-big-for-mouth`** — the fit box's cross-section through the mouth.
3. **`too-big-inside`** — no rotation fits every closed side.
4. **`no-room`** — only a container that closes some side holds a volume:
   Σ fill ≤ interior. A rigid thing fills by its box, a flexible one by
   its packed volume, a thing standing out of an open side by its
   cross-section × the interior height. A field takes a whale skeleton
   however much is lying there.

Every side closed is tried first — an open side only lets more in — so a
move into a room never reads its exposure unless the strict case fails.

⭐ **It is asked at the chokepoint.** `Container.canAddContainable`'s
default body is `fitRefusal`, so every `ContainmentApi.move` into a
container meets it and a programmatic violation throws `ContainmentError`.
The verbs word it before anything moves, through
`Container.canReceive(item)` — the dry read every container answers (the
tape measure, the container's own veto, and a body's `arrivalFor`). Specialized
overrides (a pump's well, a store, a hive, a copper, a rearing tray) own
their whole answer. **A body has no bounds** — it is sized by its
envelope, and what it carries is [carrying.md](./carrying.md)'s question.

**A lid that would close on an overhang** refuses: `Sealable.canClose`
reads `bounds()` with height closed — *"The pole sticks out — the lid
won't shut."* A cart under a tarp drapes, so the cover skips it.

**Authored content.** When `Template` installs a place's `props:` and a
prop does not fit an enclosed place (`exposure().holdsAir()`), the prop is
**not placed** and `DiagnosticApi.record` names the thing, its size and
the place (channel `location-graph`, severity error). An open place lets
it spill. Never a trim.

### A pocket and a belt — the same rule on a region

A `Placing` host's named region is bounded the same way (`canPlace`'s
member fit — [spatial.md](./spatial.md)): a **pocket** (a member that
`encloses`) by its entry's `mouth` and `volumeM3`; a **hanging** member
(`from`, `hangs: true`) by its **length** — each hung thing takes its
`hangingWidthM()` and the first always hangs, because a hook is a point —
and by what it **bears**: `Material.tensileStrengthMPa` × the host's
cross-section ÷ g ÷ `HANG_SAFETY` (4). A worn `Garment`'s length is its
wearer's: π × the bare envelope's width, × `WAIST_FRACTION` 0.9 at the
waist, so a gnome's belt holds fewer pouches than an ogre's.
`roomFor(region)` says what is left in words — `plenty` · `one more
pouch` · `a small thing` · `none` — never a number.

## ⭐ Pressed in, or it leaves

`Container.reconcilePressing(only?)` asks each content (not a slot
occupant, not fixed in place, not hung — a `fastens` member is clipped or
tied) which way its net force points:

- **down** (gravity, not buoyed) — a closed bottom holds it, always;
- **up** (immersed and lighter than the medium) — it leaves unless the
  top is closed: *the cork bobs up out of the bucket*;
- **none** (`gravityNow() == 0`) — it leaves unless every side is closed:
  *the cup drifts off the table*.

Leaving moves it to the enclosing place with a scene line. The medium is
the **container's** (`BiomeApi.mediumFor(container)`): a cork floats in a
bucket's own water and stays; it leaves when the bucket is under. A body
presses only its **pockets** — walls and a bottom, a top when the entry
`closes` (a buttoned breast pocket keeps the cork; an open side pocket
loses it) — and what leaves goes to the place, never loose on the body.

Triggers, never a clock: an arrival (`moveCore` for a thing container,
`placeOn` for a placed thing, a tick later), the place's `setGravity`
(every container there, one level — a wizard's zero-g room), and the
water's immersion walk.

## Gravity, synchronously

`AtmosphericMixin.gravityNow(): Quantity<'m/s²'>` answers the scope's own
authored gravity, else the memo of the last `getGravity()` resolution,
else 9.81 while the first resolution runs; an exposure rebuild
re-resolves keeping the last answer. `getGravity` stays the authoritative
async read. Readers: pressing, the load gauge (weight is mass ×
`gravityNow / 9.81` — [encumbrance.md](./encumbrance.md)), the buoyancy
walk, the envelope (no gravity → the body fits by its narrowest way
round). Mass, size and the hands a thing takes never change with gravity.

## Places: ceilings under open sky

`Location.getCeilingHeight()` (and `SphericalLocation`'s) is `null` when
the place's top is open — **open sky has no ceiling**. A roofed place
answers its height; `bounds()` on a place is its cube. ⚠ A place's
interior is its cube whatever its top: an open top is an open side.

## Ways: clearance and turn

`Exit.clearance(): BoundaryOpening` — the tightest gap: the elementwise
min of the face (the source place's extent, square), the way's own
`opening:` and the hung boundary's `getOpening()`. `Exit.turn?` (m,
authorable on the kind row or per site) is the longest rigid length that
swings round the bend; unset = unbounded.

| kind row (`generic-objects/…/idea/exits/`) | gap | note |
|---|---|---|
| `crawlway` | 0.8 × 0.8 | a hands-and-knees body clears it bare; a pack on the back does not |
| `ladder` | 0.7 × 0.7 | `media: [vertical]`; climbing takes both hands |
| `stair` | — | `turn: 2.2` |

⭐ **A low door is not a kind** — it is one way's authored `opening:` on
its `exits:` entry (`north: {destination: …, opening: {width: 0.9,
height: 1.4}}`). A site that differs from its kind authors
`opening:`/`turn:` the same way.

## ⭐⭐ The body: envelope, stoop and crawl

`Creature.envelope(profile, {lengthwise?, bare?}): BoundaryOpening | null`
— the outline a body presents to a gap:

- **height** = stature × `BODY_PROFILE_HEIGHT[profile]` (beside
  `BodyProfile` in `LocomotionMode.ts`): `upright 1.0 · crouched 0.6 ·
  prone 0.4 · horizontal 0.4 · varied 1.0`. Prone is hands and knees (a
  1.75 m body crawls at 0.7 m), a swimmer is a crawler's height.
- **width** = girth, `2·√(mass / (π · stature · bodyDensity))` — a
  cylinder of the body's own density — plus what hangs at its flanks.
- **the worn bulk** (`wornBulk()`): containers on `back`/`torso` add
  depth (the cube root of their summed bulk) — riding ON TOP of a low
  body, trailing BEHIND an upright one where a door's face does not see
  it; things hung `from` a worn host ride flat against the flank by their
  **thinnest** side and add to the **width** (`sideM`, either flank, so
  they sum). A pannier pair widens a 0.58 m mule to 1.18 m.
- **mounted** (`mountedPair()`, read from either end) — the mount's
  envelope plus the rider's seated share (stature × 0.6), as wide as the
  wider.
- **lengthwise** — a way **up or down**, or no gravity: the body's length
  runs along the way, so the gap measures its girth both ways (a 1 × 1
  cellar hatch over steps is open to a walking body).
- `bare` leaves the worn bulk out — *would it pass without the pack?*

What the **hands** hold is NOT in the envelope: each held thing is
measured on its own cross-section against the gap, and its `longest`
against `turn` when rigid.

**`stoop` and `crawl`** are locomotion modes with verbs
(`content/platform/cmd/movement/`), rows beside `sneak`: `stoop` (speed
0.8, `crouched`, normal noise — stooping is not sneaking) and `crawl`
(0.3, `prone`, quiet). The **plan** decides who has them
(`requiresBodyPlanMode: [stoop]` / `[crawl]`): the biped lists both, the
`canid` dog crawls and does not stoop, a horse does neither. See
[locomotion.md](./locomotion.md).

### The clearance gate tells you what works

`Exit.clearanceRefusal(mover, mode)` (async — it awaits `ensureShape` on
held things), asked by `Exit.canTraverse`:

| reason | when | the words name |
|---|---|---|
| `too-big-for-way` | the envelope does not pass | the lower mode that would (*"you'd have to stoop — `stoop north`"*), the pack that won't (*"…and your canvas backpack won't go through — `remove backpack`, then `crawl north`"*), or *"you'd have to dismount"* |
| `held-too-big` | a held thing's cross-section | the thing |
| `wont-turn` | a held rigid thing longer than `turn` | the thing and its length |
| `cart-too-big` | a hitched cart's box (`wheeled` ways) | the cart |

The suggested mode is the highest-profile, then fastest, lower mode the
body can engage and the way admits — so `stoop` beats `sneak` at a low
door. **It never changes posture.** A led animal is asked the same; its
refusal reaches the leader in the third person (*"The pack mule won't
follow you: its canvas panniers won't go through — take them off
first."*).

**Under a low ceiling** `stand` refuses `ceiling-too-low`:
`Creature.acceptPosture(posture)` reads the place's ceiling against the
body's stature (on `Creature`, not `Posed` — `Posed` keeps only the
`getStature()` hook).

## Water: wading and keeping dry

- **Wading by stature.** `WaterPlace.stateFor(body)` wades while the depth
  is under stature × `WADE_FRACTION` (0.85) — a gnome swims where a human
  wades. The place's own `stateNow()` keeps the `water.column.wadeM` dial
  for anything with no body. The water floor bears by `stateFor`; the
  over-your-head gate reads it.
- **Keeping dry.** `Container.closureLevel()` — a `Bulkable` answers its
  `closure` (which says it holds water IN — an open bucket); any other
  container is `liquidTight` while a `Sealable` is shut and its material
  takes no water, else `open`. The immersion walk stops at a holder that
  is **shut** and `liquidTight`: an oilskin pouch (oiled linen,
  `waterAbsorptionCapacity: 0`) keeps the letter dry; a shut canvas pack
  does not. See [underwater.md](./underwater.md).

## Dials — `SIZE_DEFAULTS`

`FLEXIBLE_PACKING` 2.0 · `FOLDED_PACKING` 0.6 · `COIL_PACKING` 1.3 ·
`INTERIOR_FRACTION` 0.9 · `HANG_SAFETY` 4 · `WAIST_FRACTION` 0.9 ·
`STANDARD_GRAVITY` 9.81 · `HANG_ROOM_WORDS` (0.30 m *plenty* / 0.10 m
*one more pouch* / 0.04 m *a small thing*). The body's ratios are
`BODY_PROFILE_HEIGHT`; the carrying ratios are `CARRYING_DEFAULTS`
([carrying.md](./carrying.md)).

## Deferred

- **Body parts carry no heights**, so wading wets the whole body or none —
  the share below the water line is not modeled.
- **The coach's roof rack** (an `on` surface on an `Exitable` host):
  `PlacingMixin` refuses composition with `ExitableMixin` by design; it
  wants its own class.
- **The `Stackable` mass convention** is inconsistent across hosts (one
  unit's mass vs the pile's); each host is read as it is.

## History

- **Size and carrying (2026-11-11 → 2026-11-12, `39d4ba23e..50f562ed4`).**
  The subsystem landed whole: `Dimensions`, the `Form` rows and `shape:`,
  volume derivation, container bounds on closed sides, the mouth and
  `shapedTo`, fit at the chokepoint, pressing, `gravityNow`, ceilings
  under open sky, clearance and `turn`, the envelope, `stoop`/`crawl`,
  wading by stature and the shut, tight holder. Before it, nothing in the
  engine had a size: a crate went into a pocket and a pole round any
  stair.
