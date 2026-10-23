# River

How water that *goes somewhere* is lived in: a river is a **line** you are
carried along, the water around you is a **moving place**, and boats, ships,
ferries and the sea all follow one rule about what is tracked. Built by the
river build (MR on `build/river`, 2026-10-21; plan `docs/plans/river-plan.md`,
D1–D38). The hydrology underneath — flow, snowpack, navigability, rights —
is [watershed.md](./watershed.md); the water column and the breath model are
[underwater.md](./underwater.md); the sea's chart is [expanse.md](./expanse.md).

## ⭐ The one rule

**Only places are tracked; a thing is wherever its place is.** A swimmer is
in a patch of water; a canoe is a thing in that patch; a ship is a
`Structure` whose position is a variable. Nothing is "on the overworld"
except places — and a river's places are either *authored* (a quay, a
gorge room, a landing) or *derived* by the river's warren from the line.

## The line (`RiverLine`, water pack `lib/`)

A watercourse row authors **control points** (nodes with km from the mouth
and elevation, a falls' drop, widths) plus `source`, `mouth`, `bed`, banks,
`stretches:` overrides, named `bends:`, authored `hazards:` and the `places:`
that stand on it. The catalogue compiles each into a `RiverLine` — a value
object, memoized — that derives everything else:

- **positions**: `{ course, km, across }` — km from the mouth, meters from
  river left. The citation grammar is `course:node[±km][,side]`; a positive
  offset is **downstream**.
- **stretches** (`course:N`): the step–pool distribution puts the drop in
  riffles and rapids and leaves pools between; a seeded meander gives bends
  an outside; banks (bar · shelving · steep · undercut · wall · place) with
  their current and depth fractions; snag `obstruction` on wooded bends.
- **hazards** with a side (strainers on wooded outsides, hydraulics below
  weirs, undercuts), **eddies** and **collection points** (where a bar
  catches what floats).

`riverStateAt(pos, nowS)` reads the water at a position: flow from the
watershed integral, width, Manning's normal depth for the stretch's bed and
gradient, the current by continuity, margins slower and shallower than the
channel, the tide's stream near the mouth, temperature by source kind
(`melt` pulled cold, `spring` near the ground's), roughness, oxygen. The
line is a **frame**: the kernel's `LineFrame` mixin is the protocol a moving
place and a ship read it through, without importing the water pack.

## The moving place (`ReachWarren`)

ONE singleton for the realm. Its members:

- **Patches** — the water within hail of somebody, carried by the current.
  Minted when something goes into the river between authored places; each
  holds ONE game-clock event (`Drift`) — the next stretch boundary, place,
  fixed place within hail, or the river's end, capped — merged when two
  come within hail, split when a swimmer strokes out of one, handed into an
  authored place at its upstream end, reaped when empty. Never persisted.
- **Stops** — a patch that has stopped: a bar, the shallows, the bed under a
  pool, the bank you got out on. Persisted by `(row, key)` with the key their
  position, kept while anything is in them — so a sword on the bed is there
  after a restart, once.
- **Bank patches** — the bank you walk along (`walk-up` / `walk-down`).

⭐ **Zones never change at runtime (D38):** every member has its own moving
zone instance minted from its kind row and reaped with it; the zone answers
elevation, address and climate from the frame position.

**Ways are worked out when taken** (`ReachExit`, never mapped): `left` /
`right` (the bank decides — a wall or steep bank refuses; a margin racing
faster than you swim carries you past), `upstream` / `downstream` (a
stroke's worth, 1.1 hails), a branch at a junction, an authored place
within hail, `down` to the bed. A bank's `river` way in is installed when a
`Shore` with a `bank` stands (`WaterSource.onBankStood`).

## Bodies in moving water

- **The current is felt every beat** (`Respiration.treadBeat`): holding
  station costs drag `½ρC_dAv³`; not holding, you are swept; rough water
  takes a share of the store; the **feet-first float** (`lie` in a patch)
  halves both.
- **Fords read the body** (`FordExit`): over your head (0.85 × stature) is
  a swim, refused; depth × speed past what your stature and mass stand
  against sweeps you, handed into the river at the ford.
- **Entrapment** is the bed's (`RiverBed.occupy`): taking your feet in a
  riffle or rapid over rock or gravel at ≥ 1 m/s jams a foot; `pull <person>`
  frees it.
- **Standing and swimming** (the drive found this): finding your feet in the
  shallows drops the swim mode for walk (`WaterSurface.occupy`, the mirror of
  `giveWay`), and a place whose depth changes under you reconciles who it
  bears — a patch drifting into a deep pool lets you go.
- **Under the ice** (D16): a patch in a stretch frozen over has the sheet
  over your head (`WaterPlace.headOutAt` → false): no air, no way up, until
  the drift brings you out into open water.
- **The disconnect delivery** (D15): a linkdead body is delivered to the
  first spot downstream that holds it, alive. A corpse floats again at the
  `decomposed` stage and fetches up on a bar.
- **Rescue**: from the bank (a line thrown, `pull line`; running the bank),
  by wading in, or by hand — `pull <someone>` from the bank, from a boat
  floating in that water, or beside them in it (where it holds their head
  up). ⭐ Pulling something out by hand is **the water's act**
  (`WaterPlace.pullOut`, review): a body is not `Pullable` — that protocol
  is a thing on the end of a line, and in cordage's world the line is the
  rope. The water finds the load by what the puller knows it as, gates it on
  the puller's strain ceiling against its mass (half for a swimmer who helps;
  a horse wants a rope), and a player awake and free in the water shakes off
  a hand that is not their party's — pinned, drowning, senseless or
  linkdead, anybody may. A hand and a line land the same way
  (`WaterPlace.deliverOut`): whatever hold the water had lets go.

## Small craft (transport pack)

A `Boat` is a **thing in a water room**: never positioned, never voyaging,
its zone null for life (every boat row is a transport **kind** row; a census
test refuses a venue's). It carries what drives it:

- **`paddle`** — the one new verb — starts `Propel` on the paddler's hands:
  `v = ∛(P·η·crew / (½ρC_dA))` against the hull, the current added or taken,
  `--inside` the slack of the bend, `--hard` a burst. A pole needs a bottom
  it can reach and is strongest in the shallows. Each 1.1 hails of way moves
  her into the water the warren names — the same water a swimmer's stroke
  reaches. A wave over her freeboard swamps her; `pull boat` rights her.
- **Under sail**: `course` from a tiller (a `Helm`) in a boat with a sail
  part — the wind drives `Propel`, a third of its speed, nobody tires;
  refused becalmed or on water narrower than three hull lengths.
- **The killick** affords `anchor`: it holds in slack water (the boat's spot
  becomes a stop) and drags in quick.
- **Lining**: throw a boat's `painter` to somebody on the bank; as they walk
  the bank the boat comes along beside them.
- `launch` / `recover` ask the waters by shape: a bank's edge, a ship's
  side on a river or at sea.

## Ships on a river

A ship (`Ship`, kernel) is positioned on a chart **or** on a line, never
both — and talks to either through one `Frame` ([expanse.md](./expanse.md)
§ The voyage): the line implements it in `LineFrameMixin` (`planCourse` is
the passage, `craftPositionAt` reads it, `watchCraft` tells the stretches,
throws the wake and comes to the stop). On a river, `course` takes a direction, a landing by name, `bar`, or
`slow`; the river **plans the passage** (`LineFrame.planPassage`) and the
plan rides the persisted course: `[km, atS]` per stretch and the stop it
will come to — landing · aground (her laden draft against this month's
channel depth) · holed (a choked snag stretch at more speed than the eye can
read) · stemmed · falls (the head of navigation) · mouth. Refused before she
moves: a landing past a falls, a bend too tight for her length, a reach too
narrow for her beam. The watch (ten game minutes) tells what changed in the
water, burns her cordwood (an empty bunker and the river has her), throws a
wake that swamps small boats within hail at speed, and acts on the stop.
Off the ground: the water rising, lightening her, or kedging with the
`Capstan` to a boat held by its killick. At the mouth she leaves the line
for the sea's chart; at a node that names a river (`ExpanseNode.river`),
`course <river>` takes her in. While anybody who went over her side is still
in the water her `course` waits; `--leaving-them` sails and records an
`abandonment` accountability row.

## Ferries

A crossing is an exit kind (`FerryExit`, transport) on each landing, one
conditional edge the route planner costs and flags. Passable when the ferry
lies at this landing, the river is under the ferryman's threshold, and the
fare is paid to the house. The **glide**: whoever poles (the ferryman on
shift, or you) holds her bow upstream at the angle their `navigation`
decides; a hand who knows lands at the far landing, one who does not lands
downstream with the ferry. A **cable ferry** (`tethered:` a `FerryCable`)
is driven by the current itself and never drifts. The ferryman's `ferries`
brain answers the bell on the far landing (a `SignalBell` remembers when it
was rung) and refuses at high water with a shout. Nesbit's ferry crosses
the Kestrel below the confluence.

## The sea, brought into line (`SeaWarren`)

Water at sea exists only beside a ship that has **stopped**: a `SeaRoom`
(positioned on the chart, its own `SeaZone`) budded where she lies, shared
by ships stopped within hail, reaped when empty. Her boat is launched into
it; `side` (an authored way on the deck) goes over into it; a way named for
her goes back up; under way she is alongside nothing. `locate` in the water
beside her reads her reckoning.

## Readings

`measure current` (the current log), `measure temperature` of the water at
a water place or a shore's cited water, `measure depth` on a river (the lead
at your position; the bottom's character for a competent hand), `look
river` in words. Every reading names a stretch, never a fix — on a river you
always know where you are.

## Not built (recorded for later)

The pilot's charted claims on stretch ids; `hail` afforded by a landing;
`paddle <ship>` at sea; sea rooms drifting with the set; a frozen river's
places taking the ice-sheet floor, and the hole; lining from an authored
bank place. See the plan's wave notes.
