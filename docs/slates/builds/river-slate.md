# River slate — the only water with a direction

> **Status: UNBUILT** — designed 2026-10-18 with the founder. The
> watershed build shipped the river as hydrology and law (`Watercourse`:
> named nodes, elevation at control points, flow, snowpack, navigability
> as a boolean, rights, contamination) → [watershed.md](../../subsystems/watershed.md).
> A reach has no length, no character, and nobody can be in it. This
> supersedes the river half of [navigable-water-slate](./navigable-water-slate.md).
> **Left:** the river as a LINE (`km` from the mouth) · required source and
> mouth kinds · the `RiverWarren` and its stretch rooms · banks per side,
> seeded meanders, reachability as an attempt · the three killers · river
> ice per stretch (build-4's seam) · the citation `{ course, at, side }` ·
> two `Reading` rows · and, as a later build, craft — boats as Things in the
> stretch, ships positioned in the frame, one Ship and one set of Helm
> verbs, boats by part against vegetation and obstruction
> **Size:** a build — the river as a place; craft is the build after it

**Sits on:** [watershed.md](../../subsystems/watershed.md) ·
[location.md](../../subsystems/location.md) (the Warren) ·
[expanse.md](../../subsystems/expanse.md) (the frame, the Ship, the voyage,
the Helm verbs) · [underwater-slate](./underwater-slate.md) (water as a
state, the column, the body, the craft size rule) ·
[assembly.md](../../subsystems/assembly.md) (boats by part) ·
[forestry.md](../../subsystems/forestry.md) (wood along the banks) ·
[hazard.md](../../subsystems/hazard.md).

Markers: **[DECIDED]** · **[DEFERRED]** with its reason.

---

## 0. Why this slate exists

The river was the first water minted, in a general water build, and never
had a design session of its own. The founder: *"we never talked about what
makes them special or done a full lens pass on them. As far as I'm
concerned the river design as is might be totally wrong and we should be
talking about redoing it, not accepting it as solved."*

The tension that opened it: the watershed decided *a reach is not an
object and not a place* (*"a mill beside the river is not in it"*;
unbuilt country is prose), and maritime decided *water is never a Thing —
it is the place you are in*. Nobody reconciled them for a river, and
*"somebody will absolutely stand in a river"* (navigable-water § 4).

## 1. ⭐⭐⭐ What makes a river special **[DECIDED]**

> **A river is the only water with a direction: everything in it goes one
> way unless somebody pays to make it go the other.**

Breath is the lake's clock and the horizon the sea's; **the current is the
river's**, and it carries you, your boat, your logs, your sewage and your
corpse.

### The lens pass

1. **Pedagogy** — hydraulics is derivable: velocity from slope, bed
   roughness and depth (Manning); rapids are gradient plus rock; ⭐ fords sit
   on riffles because that is where a river drops gravel; meanders,
   oxbows, flood recurrence. The upstream/downstream politics shipped. ⭐ The
   river as a **border** — the thalweg rule (the border follows the deepest
   channel and moves when the river does).
2. **Expression** — *Deliverance* (the gorge, no way back up), Huck Finn
   (a raft and the current carrying you through other people's towns),
   *Heart of Darkness* (going **up**river is the story), the toll ford, the
   ferry, the mill town, the log drive, the drowned valley behind a dam,
   *Life on the Mississippi*.
3. **Immersion** — the current is always on; you hear a river before you
   see it. **Participation** — a road that only runs one way for free is
   full of jobs: the ferryman, the bargee and the towpath hauler (and the
   horse), the lock-keeper, the pilot who knows this month's channel, the
   log driver, the miller who argues about the weir.
4. **Values** — the dam that drowns a valley for the town below; who may
   block the river (a weir stops fish and boats); the river delivering your
   problem — and your body — to your neighbour.
5. **Continuity** — ford → ferry → bridge; poling → towing → steam; the
   same acts at every rung: *cross*, *go upriver*.
6. **Economy** — downstream freight is nearly free, upstream costs labour
   per mile, and **that asymmetry is why towns sit where they do**;
   forestry's bole you cannot lift floats (the log drive); hydro and mill
   power ship.
7. **Governance** — navigation is already a claimant; the river authority
   follows the watershed, not the address tree (shipped); the border that
   moves.

## 2. ⭐⭐⭐ A line, not a chain **[DECIDED]**

Each stretch between named nodes has a **length**, so the river is a
one-dimensional space and a position is a distance along it — the
expanse's *linear passage* register. **Gradient** is Δelevation ÷ length;
**current** follows from gradient, bed and depth (derived today from flow ÷
(width × depth), now from real terms); **rapids** are a stretch whose
gradient and bed say so — which closes navigable-water's **Deliverance
gap** (*"one axis got a cost model and the other got a predicate"*).

Lens 1 decided it: a chain cannot derive hydraulics, because there is no
slope without a length.

**Across is the second number** every point already has — its **width**.
Crossing pays **drift**: time ∝ width ÷ your speed across, while the current
carries you downstream by current × time, so you always land downstream of
where you set off. A 3 m brook is a step (an exit with `media: water`); a
ford is a wade where the current is slow (*which is why the ford is
there*); 90 m of deep fast water is a hard swim landing far down, or a
ferry aimed upstream; a 160 m estuary on the ebb wants a boat. **That is
what makes fords, ferries and bridges sit where they do.** The default
cross-section is one place in the water between the banks (budded, below);
an author can build a sandbar, an island, a braided river's channels, a
bridge's piers.

## 3. ⭐⭐ Both ends are unwriteable to leave unsaid **[DECIDED]**

A line has two ends; an end that just stops is as false as a river running
uphill, so — like the shipped uphill rule — **a course that leaves either
end unsaid fails to parse**, naming itself.

| **mouth** — what it flows into | what the current does there |
|---|---|
| **a river** (a node of another course — the shipped `branchesFrom`) | the flows add; the current goes on as the bigger river's |
| **a still water** (a mere or lake; the meres are already `Watercourse` rows) | dies across the inflow, drops its load, builds a **delta** |
| **the sea** (an **expanse node**) | ⭐ the **tidal reach** — the moon's tide reverses the current twice a day (the lost tidal bore back); a drifting body passes into the expanse at that node |
| ⭐ **a sink** (desert, karst, marsh) | a **losing stream**: evaporation and the ground take it, and it ends where its flow reaches zero — so **the end moves**: further in a wet spring, short in August, dry between storms (the English *winterbourne*). Nobody authors where; the integral does. |

| **source** — how it begins | flow at the top |
|---|---|
| **rills** (default) | ≈ zero, growing as catchment accumulates — begins as a trickle you step over; the narrowing is derived because flow at a point is the catchment above it |
| **spring** | a declared yield from the ground, nearly constant, cold and clean; a spring is a **place** — drunk from, built on, fought over |
| **outlet** | whatever the still water above lets out — steady, lagged; dam the outlet and you control the river |
| **melt** | the snowpack's or glacier's release (shipped) — a dry bed in winter, a torrent in June |

No river begins full-size out of nowhere unless a spring or an outlet
justifies it. Above the source there is no river, only land.

## 4. ⭐⭐⭐ The `RiverWarren` **[DECIDED]**

*"This sounds like the only real solution is to have some sort of
RiverWarren that consumes some data model for the river's makeup."*

- **One per course**, an `InnerWarren` — its members are rooms.
- **It consumes the `Watercourse` row** (§ 7) and derives the stretch
  boundaries, each stretch's kind, and the current, depth and width in it.
- **Between authored places the river divides itself into STRETCHES where
  its character changes**, each a derived room budded on demand and reaped
  when empty. Hydrology has the units — the **pool–riffle–run** sequence
  every river repeats, plus the rarer kinds:

| stretch | derived from | like |
|---|---|---|
| **pool** | low gradient, deep | slow, dark; swimmable against; fish lie here |
| **run** | moderate gradient | the ordinary state |
| **riffle** | shallow, gravel | fast but wadeable — **where fords are** |
| **rapid** | steep, rock | white water that carries you; *Deliverance* |
| **falls** | an authored control-point `drop` | the river leaves the line onto a plunge pool |
| **gorge** | the channel confined by its valley | nowhere to get out |

- **Members are clones of a template per stretch kind** — rows, so a realm
  can restyle a rapid's prose without code; the numbers come from the river
  at that distance, not the template. ⚠ The lens pass (underwater § 16):
  derived rooms will read generic, so **prose banks with seeded variation
  and the derived delta on entry** are a budgeted line.
- **The current carries you through them** — time to pass is length ÷ the
  current there; everyone in one stretch is together and the current takes
  the party at once.
- **Authored places are external neighbours** (the ford, five rooms of gorge,
  the mill's tailrace) — they cite a position and the Warren stitches its
  stretches to them, as the lounge is stitched to Dave's Bar.
- **The drift ends** at an authored place, an obstruction (a strainer, a
  weir, the lip of a falls), or the mouth — into the receiver.
- **Underwater in a river** is underwater-slate's column, its current
  carrying on at depth; most stretches are too shallow for one, but a deep
  pool, a plunge pool or a spring's pool has one.

## 5. Banks, and getting out **[DECIDED]**

*"Whether you can get to shore is a function of the river's depth and
speed at any given point in the shoreline."*

- **Each stretch has its two banks**, derived **per side**: the **cut bank**
  on the outside of a bend (the thalweg driven against it — steep, deep,
  undercut) and the **point bar** inside (shallow, slow, shelving gravel);
  **the next bend flips them**.
- Per stretch-side the Warren derives **current at the margin**, **depth at
  the margin** and **bank height** (the bend side plus the valley's
  confinement — a gorge's banks are walls on both).
- ⭐ **The procgen is a SEEDED field, not a roll** — how much it meanders
  from gradient (flat water meanders, steep runs straight), where each bend
  falls seeded from course and distance: generative and legal under the
  uncertainty doctrine, the same river for everyone. Any stretch-side can be
  overridden; an authored place at that point simply *is* that bank.
- **Getting out is an ATTEMPT** whose outcome is the arithmetic: you swim
  across to the margin drifting the whole time; if you can stand or climb
  there you are out, else you are carried on. **`look` reads each bank in
  words beforehand** — *"the left bank is a steep undercut of roots; on the
  right, shingle shelves out of the water."*
- **On a bank, walking along it moves stretch to stretch without the
  current**, wherever the bank is walkable — **the towpath** and the
  angler's bank for free. Leaving the corridor for the wider land happens
  only at authored places.

## 6. The three killers **[DECIDED]**

The river never kills you for being in it — at the surface you breathe air
(maritime), and drifting is transport. **It kills only through three
things, each derived and readable, never a roll:**

1. **Cold, the clock** — heat leaves ~25× faster than in air; the water's
   temperature is the river's at that distance and season, and the source
   kind largely decides it (a spring river cold all year, a melt river in
   June near freezing, a lowland August river warm). Cold takes the
   swimming, then the face above water, then respiration's drain. So **a
   warm slow lowland river can carry you to the sea** (Huck Finn) and **a
   snowmelt torrent kills a strong swimmer in minutes**.
2. **Rough water costs breath** — in a rapid you are under part of the time;
   length and turbulence give the time under, your breath the budget.
3. **Traps hold you** — **hazards at a distance**, seeded or authored:
   **strainers** (a fallen tree the water passes and you do not), ⭐
   **hydraulics** (the recirculation below a weir or ledge — the "drowning
   machine"; a weir is already an authored `work`, so **every weir somebody
   builds makes one**), **undercuts**. A trap stops your drift; the way out
   is lateral, or a rope from a bank reachable *for the rescuer*; breath and
   cold keep running. On the shipped `HazardMixin`.

**Otherwise the river delivers you** — to a bank, an authored place, or the
mouth. **Dead, it still delivers you**: a corpse sinks, then floats (decay),
and fetches up where drift collects — a point bar, a strainer. Whoever finds
it is downstream.

## 7. The authoring model **[DECIDED]**

```yaml
class: /system/water/idea/Watercourse
data:
  key: kestrel
  name: the Kestrel
  basin: kestrel
  source: { kind: melt }        # rills | spring{yieldM3S} | outlet{of} | melt
  mouth:  { into: sea, node: /stuff/idea/WaterExpanse/greywater#kestrel-mouth }
          # into: river{course,node} | still{water} | sea{node} | sink
  bed: ground                   # default: the country's ground character
  nodes:
    - { name: headwaters, km: 62, elevation: 1400, catchmentKm2: 380 }
    - { name: gorge,      km: 48 }
    - { name: falls,      km: 41, elevation: 500, drop: 22 }
    - { name: confluence, km: 9,  elevation: 30, channelWidthM: 90 }
    - { name: estuary,    km: 0,  elevation: 0,  channelWidthM: 160 }
  stretches:                    # overrides only; everything else derives
    - { from: gorge, to: falls, bed: rock, banks: walls }
    - { at: confluence+0.4, side: left, bank: quay }
  hazards:
    - { at: falls+0.05, kind: hydraulic }
```

- **`km` from the mouth** — the real convention (the river mile); the mouth
  is the end that does not move, so lengthening the headwaters shifts
  nothing below.
- **`source` and `mouth` required**; **`drop`** makes a falls a real step;
  **`stretches`** are overrides only; **`hazards`** are authored traps.
- ⭐ **A position is a NAMED NODE plus a signed km offset** (downstream
  positive) and a side — anchored on a name, as the watershed insists
  (*reaches are cited by name*), so a citation keeps its meaning when
  someone edits a span elsewhere:

```yaml
river: { course: kestrel, at: confluence+0.3, side: left }   # left | right | in
```

  **River left and river right** are the side as you face downstream, so
  never relative to which way you walk.
- It replaces the bare reach citation on **places** and on **works** — an
  intake, outfall or weir moves off the node onto the work itself, so the
  intake really is 100 m above the outfall.
- A **Locality's `_reach`** stays a node name — it says where a catchment
  drains, not where a place stands.
- No migration: drop the DB.

## 8. River ice **[DECIDED]**

*"Fine as long as it comports with the ice build in build-4."* It does —
as an extension that changes two inputs and no model:

- Still water stays as built — Stefan thickness, black vs snow-ice, Gold
  bearing, `IceCrossingExit`'s per-mover check — and so does the freeze
  rule: `iceAt` returns `running` (no sheet) at or above
  `water.ice.stillWaterMps`.
- The extension **keys `iceAt` on a river position** and reads the current
  **at that stretch and that side**: pools fall under the threshold and
  freeze, **rapids stay over it and run all winter** (the open lead is the
  classic winter death), and a point-bar margin can be still while the
  thalweg runs — **border ice from the same threshold, per side**.
- ⭐ **Through the ice into current is the worst place in the game to be** —
  in still water the hole is above you; in a river the current carries you
  away from it under the sheet.
- Lands after build-4 merges, on its seam.

## 9. Two readings **[DECIDED]**

A player learns only what they can read. **`measure current`** (a float and
a log) and **`measure temperature`** (a thermometer) as `Reading` rows on the
instrumentation ladder — competence sharpens them. Without them the three
killers are learned by dying.

## 10. Craft — the build after this one **[DECIDED]**

### Two kinds of craft, both allowed on any river

- **A boat** (an `ExitableVessel`, a Thing you sit in) is **a Thing in the
  stretch room** — a canoe in a rapid is *with* the swimmer in it; the
  Warren carries it with the room's drift; it moves room to room under its
  own power against the current.
- **A ship** (a `Structure` of Locations, position a variable) is
  **positioned in the frame, never in a stretch room**. *"We never want to
  put a location inside another location."* Its position is a **distance
  along the river**, held by the ship as its voyage (fix + (speed through
  the water ± current) × time, split at stretch boundaries). It meets the
  Warren's rooms **only through crossings resolved when you cross** —
  `over the side` asks the frame which stretch is at her distance, then the
  Warren for that room; `aboard <ship>` from a stretch asks which ships are
  in it — the shipped `AboardExit` pattern. At an authored landing,
  `AboardExit`/`AshoreExit` work unchanged.

So **the `Watercourse` is the river's frame** (data plus its attached
crafts, as a sea holds its ships), **the `RiverWarren` is rooms for bodies
in the water**, and the ship touches the Warren by crossing, never by
containment — underwater-slate's craft size rule.

### One Ship; the hull decides where it can go

**One `Ship` class**, its position held in its current frame — a
`GeoPosition` on an expanse, a distance on a river, changing at the mouth.
What makes a riverboat or a seagoing ship is **its numbers against each
frame's conditions**: the river tests **draft** against depth (by flow, by
season), **beam** against width, **length** against bend radius (gradient
gives meander), **air draft** against an authored bridge's clearance; the
sea tests seaworthiness — freeboard and hull form against the sea state the
expanse already derives. A sternwheeler is at home on the lower Kestrel and
in trouble past the estuary; a deep-keeled brig is the reverse. In August
the sternwheeler's stretches shrink back toward the mouth. **A river pilot
is the trade of knowing this month's answer.**

### One set of Helm verbs, read by the frame

| verb | at sea (shipped) | on a river |
|---|---|---|
| `course` | `<node>` or `<bearing>` | `<landing>`, or `downstream` / `upstream` — the river picks the heading; you pick a direction and a stop |
| `anchor` | stop where she is | anchor or tie up |
| `measure depth` | the sounding | ⭐ the main navigational act — the leadsman's *mark twain* |
| `scan` / `watch horizon` | the areal horizon, by curvature | ⭐ the reach ahead and astern, **bounded by the next bend**; you hear the rapid first |
| `pilot` | told claims about the sea | **this month's channel** |
| `launch` / `recover`, `over the side` | to and from the water | into and out of the stretch room at her position |
| `hail` | a contact in signal range | a craft or a bank in the reach in view |

On a river **you always know where you are; navigation is knowing what the
water ahead is like now** — *the same catastrophe from opposite
ignorances*.

### Boats by part

A boat is an **assembly** (hull + propulsion, each a row); suitability is
**per part against the water's character**:

| propulsion | needs | good in |
|---|---|---|
| paddle / oar | water and a crew's power | almost anywhere; slow against any current |
| **pole** | a bottom within reach | shallows, swamps, mud — the punt, the pirogue |
| sail | wind across a wide enough stretch | wide water |
| propeller | clear depth below the hull, no weed | open channels and lakes |
| ⭐ **air propeller** | nothing — it is in the air | swamp, weed, mudflats, thin ice |

| hull | trades |
|---|---|
| flat (punt, pirogue, airboat, jon boat) | inches of draft and stability vs chop |
| round / V (canoe, launch, speedboat) | rough water and speed vs draft |
| keeled | holds a course under sail vs needs depth |

The water gains two **derived** terms: **vegetation** (shallow, slow, warm,
nutrient-rich — the row carries nitrate) and **obstruction** (snags and
stumps from **wood along the banks** — forestry's stands — cleared by
current, positions seeded). ⭐ **Snag strikes are speed against sight** — the
clarity and your speed decide whether you see the stump in time;
deterministic, never a roll. *Do swamps need airboats?* — **the airboat
exists because nothing on it is under the water**, and the swamp's derived
character rules out propellers and keels: derived, not special-cased.
Epochs: dugout, coracle, punt, canoe, rowboat, keelboat → steam launch,
motorboat, airboat — the same hull rows, new propulsion rows; an oar becomes
an outboard by `fit`.

### Upstream — the rungs

| how | works | limited by |
|---|---|---|
| paddling, rowing | pools and slow runs | crew power against current |
| poling | shallow water | needs a bottom |
| ⭐ **towing from the bank** | wherever the bank is walkable | **a towpath is a stretch-side you can walk** (§ 5) — hauler or horse by the mile |
| sailing | wide stretches, wind behind | the wind against the river's bearing |
| portage | anywhere | the boat becomes a load (encumbrance) — how you pass a falls |

**Snags sank half the Mississippi's steamboats**, and clearing them was
**public works** — the snag boat, a gig the river authority pays.

### Sequenced last, by lens 6

⚠⚠ **Nothing along the Kestrel needs carrying yet** — no destinations up or
across it that players need, no freight wanting to go down. River craft,
ferries, towing and pilots are supply waiting for demand, so **the river as
a place ships first** and craft economics after content along the river
gives anyone a reason to go somewhere on it.

## 11. Deferred **[DEFERRED]**

- **Grounding** — *"cool content but we don't need it right away"*; the
  getting-off needs coordination (lightering, kedging, crews). Designed and
  kept for when it is wanted: **a course plans on your claims** (soundings,
  charts, a pilot's told claims) and states what it does not know (*"no
  soundings above Hob's Bend"*); **the truth grounds you at entry** (draft
  against this week's depth); **warning comes only from someone sounding
  ahead** — the leadsman, a player or a hired brain — ⛔ never the course
  stopping itself on truth it was not told; **off by** waiting for water,
  lightering, kedging, or repair if holed on rock.
- **Floods** → [flooding-slate](./flooding-slate.md) — *"flooding is like a
  whole separate conversation."*
- **Ice jams and breakup** — a flood cause; with floods.
- **Contamination by distance** — dilution and decay along a real length;
  per-node works today.
- **The thalweg border** — good governance content; nothing needs it yet.
- **Fish by stretch** — trout in riffles, carp in pools; fishing's, whose
  derived fishery already reads the reach.
- **Levees** — with floods.

## 12. Open

1. Where the `RiverWarren`'s stretch boundaries are memoized (per weather
   segment, beside flow, is the obvious home).
2. Whether a stretch room's two banks are one room's two sides or two
   member rooms of their own (one room is the lean — the party on a bank and
   the swimmer below them should hear each other).
3. How a river's frame registers its ships without a boot list — the
   expanse's *the sea loads what is attached to it* is the precedent.
