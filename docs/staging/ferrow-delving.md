# Ferrow Delving — content bible

A working mine in the watershed highlands. The tour's **body-and-danger
wing** and our single best classroom for the whole vitals stack,
because *depth* delivers light, air, heat, fatigue and load as one
gradient. First bundle taken to build-ready — the template the others
copy — because nearly every engine dependency is already shipped.

Status: **designing, depth-first.** Charter ✓ · Map & dynamics ✓ ·
Rooms ◐ (Upper Galleries blocked-out: U1/U2/U3; Stuff unscoped) ·
Stuff ◐ (4 scoped: cage, crew-board, ore-pass/skip, assay/sale·pricing-parked) · NPCs ▢ ·
Arcs ◐ · Wiring ◐ · Build-order ▢ · Decisions (live)

---

## 1. Charter

**Fiction.** A working delving run by an independent miners'
cooperative, up where the fertile valleys climb toward frontier wild.
The cut follows old ground: the deeper strata approach the pre-Fallow
**wired aether** that survived in the deep, and the lowest reaches are
strange. **Veshko** (heavy industry — "results are the only morality")
is the off-taker for the ore and is quietly circling to buy the claim
outright. Independents holding their ground against a corpo is the
arc engine.

**What a newcomer learns, in the order the mine forces it on them:**

- **The body under stress** — the dark makes you carry a lamp
  (*light*); deep air goes bad (*respiration*); deeper is hotter
  (*thermal*); cutting rock spends you (*endurance / reserve*); ore is
  heavy (*encumbrance / haulage*). The vitals stack delivered as a
  single monotonic gradient of depth.
- **Extraction → economy** — raw ore is first contact with
  *materials, quantities, bulk*. Cut it, haul it, assay it, sell it;
  it becomes stock for the whole crafting chain.
- **Teamwork & roles** — a good delve wants a hewer, a hauler, a
  lamp-scout, a timberer. Emergent roles, not classes → *grouping* +
  the miners' self-governed deep-law.
- **A claim is a parcel** — holding a claim teaches *property / title*.
  Mining is a sneaky-good teacher of ownership.

**Archetypes served:** prospector, geologist, survivalist, hauler.

**The core state-change (what the content is *for*).** The
push-your-luck descent. Every level down is more value and more
danger, and the drama is one decision repeated: *one more cart, or
climb out while I still can?* Empty-handed → over-loaded; strong →
spent; lit → guttering; a fresh seam → an exhausted-or-collapsed
claim. Every room is built to sharpen that single choice. The
vertical shaft is the escape route whose **length is the tension** —
deeper means a longer climb out when you're spent and overloaded.

**History & founding — you dig down through time.** Depth is an
archaeological section:
- **Geological deep-time** — the lode was emplaced by hot fluids aeons
  ago, its cap weathered to oxide near-surface. What the *geologist*
  reads.
- **The human layer (the founding)** — the co-op didn't dig virgin
  ground: they **reopened a lapsed great-house mine.** A peerage house
  worked this lode for coin and craft, then abandoned it at the
  **Widening** (as it abandoned its manor). Commoners of the lapsed
  countryside reopened it a generation on, working the leavings and
  going deeper than the house dared. Evidence: a weathered **house-mark**
  over the old adit, finer dressed stone up top, a played-out oxide zone,
  a ruined count-house on the surface.
- **The deep layer (older, stranger)** — below the house-workings the
  strata approach the **pre-Fallow wired aether** (canon); the workings
  stop looking like anyone's mining and become the **Hush**. The co-op,
  chasing silver down-dip, is unknowingly digging *toward* it.

The ownership chain is the world's whole economic history in one hole:
**house → abandoned at the Widening → reclaimed by the commons (co-op) →
Veshko now wants it corporate** — which makes the buy-out arc quietly
tragic. (Canon: the pre-Fallow wired deep + the Widening-lapse. Proposed
for Ferrow: the great-house mine reopened by the co-op.)

---

## 2. Map & mine dynamics

Two zones: an authored **surface** (`PitheadZone`, a `SpatialZone`) and
the **underground mine** — one continuous 3D coordinate space with
elastic (mint-on-carve / reap-on-seal) membership. The surface is
fixed and hand-built; the underground grows and heals through play.

### 2a · Coordinate architecture — one 3D grid

**Decision: the mine is a single 3D `CartesianZone`, coords `(x,y,z)`**
(z negative going down). *Not* per-level zones — the zone enforces all
three axes, so "dig down" is native (the `z−1` neighbour) and there is
no cross-level registration to hand-maintain. Consequences:

- **Atmosphere is a function of depth.** Light, air quality and heat
  worsen continuously as `z` drops (biome/thermal keyed on elevation),
  not stepped per level. This is the physically honest gradient and it
  *is* the charter's danger curve.
- **Ore bodies are 3D.** A dipping seam or a chimney of ore plunges
  from one working depth into the next at the same footprint — read it
  up top, sink a winze to catch it below. Hoists and "haul it up the
  shaft" are literal, not hand-waved.
- **"Levels" survive as an organizational convention** — the
  `z`-planes crews drive horizontally from — not a technical boundary.

Within a level, carving is planar: `drive north` mints the room at the
next cell north on the same `z`. Elastic membership rides *over* the
coordinate zone — the Warren bud/reap machinery is the **mutation**
layer, the `CartesianZone` is the **space**.

### 2b · Persistence — three states, player-controlled

How persistent is the mine? *Some* — and which some is the player's
choice. Every underground room is in one of three states:

- **Spine** — authored, permanent. The Upper Galleries and the main
  shaft/winzes. Never reaped; the skeleton you can always navigate
  back along.
- **Held** — persistent *while invested*. A room a player has **shored
  and claimed**; a keyed, snapshot-persisted member (the DormWarren
  keyed-member precedent). Survives logout and redeploy. Your worked
  claim.
- **Provisional** — soft, culls when cold. Freshly-carved rooms and
  procedural galleries nobody has invested in. The rock only loans
  them to you.

Lifecycle: **carve** buds a Provisional room; **shore + claim**
promotes Provisional → Held (re-keys the scaffold member into a
persisted one — shoring *is* this mine's "provisioning" act);
**neglect / claim lapse** demotes Held → Provisional (the
peerage-reversion motif); the seal sweep reaps cold Provisional; Held
ground never auto-reaps. **Who owns Held is set by the mine's model
(§7):** here the co-op `Business` holds it (worked on tutwork/tribute),
on the frontier the individual staker — the three-state machinery is
identical either way.

### 2c · Two acts — mine a vein vs carve a heading

Distinct verbs, and they chain:

- **Mine a vein** (`hew`/`mine`) — extract ore from a face *in the room
  you're in*. The room stays; the vein depletes. The everyday economy
  loop.
- **Carve a heading** (`drive` horizontal · `sink` a winze down ·
  `raise` up) — excavate a *new* room; the mint act. Slower, costlier,
  wants shoring.

Coupling: **carving cost = rock hardness at the target, and ore is
softer than barren rock.** Following a seam is cheap carving that pays
ore as it goes; driving speculatively into barren rock toward a read
feature is expensive and yields only the room. Safe vein-chasing vs
speculative prospecting is a real risk/reward axis.

### 2d · Seal-and-reap — the long-term-richness engine

Worked-out commons doesn't accumulate as dead rooms forever. A
depleted section sits through a grace period, then the **seal sweep**
(a sibling of the residency eviction sweep, operating *section-wise*)
finds a dead subgraph hanging off the live mine by a single drift (an
**articulation point**), checks it empty and cold, forms a **wall
Boundary at the mouth**, and reaps everything behind it as one unit.
Sealing at the one-edge chokepoint means the reap can't orphan a
player or dangle an exit. Only **Provisional commons** is ever sealed
— never a Held claim. And an old seal can later be **re-driven into
freshly-seeded ground**, so the same tunnels yield new ore years on:
the commons cycles, keeping the mine rich long-term.

### 2e · Behind the wall — blank heading or discovered chamber

The underground rides an invisible **authored geology field**: each
cell carries rock hardness, ore grade, and occasionally a **feature
seed**. Default carving mints a blank strata-seeded heading — but when
you break into a feature cell you reveal *something already there*:

- a **natural chamber** — cavern, flooded stope, gas pocket (possibly
  multi-room);
- an **authored set-piece** — an old sealed working, a fossil bed, a
  pre-Fallow wired vault, an arc beat (the Hush is exactly this:
  authored content *discovered by digging*, not placed on a fixed map).

Reading the signs (a draft = a void ahead, damp = water, a change in
the rock = a seam) lets a geologist *predict* what's behind the wall
before spending the labor — the discipline's derive-from-principles
teeth.

### 2f · Cave-ins — two tracks, neither fatal

- **Sealing (routine, safe).** The 2d reap; not a hazard, just the map
  healing back toward the live workings. You return to find dead ground
  already walled off.
- **Collapse (rare, telegraphed, survivable).** The danger event on a
  live push — always **blocks, never kills.** The room becomes a *Fall*
  you dig out of, wait for rescue in, or route around. Always announced
  first (creaking, dust, air pressure); always preventable by shoring;
  no instakills, ever. In v1, collapse only strikes unshored
  Provisional rock — shored/Held ground is safe.

### 2g · Faces & dig-sites — the ten-direction model

Not one dig site per room — **up to ten**, one per direction (the eight
compass points + up/down; the grid is 8-connected horizontally +
vertical). Each direction is a **face** — the boundary to the neighbour
cell — derived from the geology field + carved-set, in one state:
- **Exit** — neighbour carved (a room's there) → walk through.
- **Seam** — neighbour cell is ore → mineable (`hew` → ore).
- **Carve-face** — neighbour is barren rock → `drive` through (cost =
  hardness) to mint that room.
- **Dead / sealed** — nothing to do.

Faces are **computed, not authored**: the NE face of (x,y,z) reflects
the geology of (x+1,y+1,z). Only a *worked* face needs state (ore
remaining) — a sparse per-(cell,direction) record; the rest is
derive-on-read. **No sub-room geometry:** faces are addressed by
**direction or descriptor** (`hew the green seam` = `hew east`), the way
exits already are, and you **engage** a face (activity substrate), you
don't *occupy* a sub-position — so many crews work many faces of one
room, co-located, zero contention. Engine: a face is the **Boundary
substrate** (walls/exits/windows) with a mining aspect.

The diagonals earn their keep via the geology: a seam's **strike** is a
compass bearing (NE–SW), so you follow the lode with `drive NE` instead
of zig-zagging; **dip** is a stair-step of `drive SE` + `sink` down the
plunge (drift-and-winze, as real mines chase a dipping seam).

### The authored spine

The hand-built skeleton the elastic mine hangs off:

```
SURFACE — The Pithead (PitheadZone, authored, fixed; sky-exposed)
  Hub [P1 Pithead Yard], exits:
    N  → [P2 Claims Office]  (uphill, by the sealed old adit + house-mark)
    E  → [P3 Assay Shed + weigh-house]  (the Veshko wagon loads here)
    W  → [P4 Provisioning]
    NW → [P5 The Dry]
    S  → the valley road → TOWN  (downhill; + TPA marker at the gate)
    ↓  → the cage (lift) → U1 Cage Bottom
                            v
UNDERGROUND — The Mine (one 3D CartesianZone; atmosphere by depth)
  z≈−1  Upper Galleries — authored spine (lit, good air)
     [U1 Cage Bottom] --- [U2 Timbered Drift] --- [U3 Winze Head]
                                                        |
                                                 (sink a winze)
                                                        v
  z<−1  Deeper workings — carved / procedural, elastic
     Face · Junction · Stope · Fall  (dark, bad air, hot;
                                       mint on carve, reap on seal)
                                                        |
                                                        v
  deep  The Hush / Wire-Deep (deferred capstone)
```

#### Surface — The Pithead (authored, 5 rooms)

- **P1 · The Pithead Yard** — the hub. Headframe and winch over the
  shaft, ore carts on rails, the crew-board fixture, the cage
  (descent). Arrival on the valley road (TPA marker for return trips).
  Exits: N→Claims Office, E→Assay Shed, W→Provisioning, NW→the Dry,
  S→the valley road to town, DOWN→cage.
- **P2 · The Claims Office** — the registrar's counter, the wall
  claims-map (parcel visualization: titled vs open claims), the
  register. Lodge / hold a claim. *(Teaches parcel/title.)*
- **P3 · The Assay Shed** — the assay scale, sample bins, the buyer's
  window (Veshko off-take). Sell/assay ore → grade → money.
  *(Money enters here.)*
- **P4 · Provisioning** — lamp rack (rent/fill, buy oil), tool wall
  (picks, shoring timber), a cart to hire. *(Money sinks; the light
  dependency taught before descent.)*
- **P5 · The Dry** — the changing shack + canteen: benches, a stove
  (warmth after the deep), water, simple food. *(Recovery: reserve /
  metabolism / thermal; a social beat.)*

#### Underground — the Upper Galleries (authored spine, z≈−1)

Lit by fixed lamps, air still good — the safe rung where cutting is
taught before the depth gradient bites.

- **U1 · The Cage Bottom** — arrival underground; the vertical hinge;
  a junction with fixed lamps.
- **U2 · The Timbered Drift** — the tutorial face: a soft, hewable ore
  seam, a waiting cart to load, timber sets to shore. "Cut your first
  cart," guided by the old prospector if present. Teaches **mine** and
  **shore** on safe ground.
- **U3 · The Winze Head** — the branch that stages the choice: a
  ladder/winze down into the deeper workings, the first real "go
  deeper?" gate. *(Teaches climb locomotion + the push-luck decision
  explicitly.)*

#### Deeper — the procedural mine (z < −1)

Room *types* carved/budded on the geology field, not hand-placed. Dark,
bad air, hot; ore grade rises with depth. This is the push-luck loop.

- **Face** — a hewable seam (richer, riskier).
- **Junction** — connective; where crews split and regroup.
- **Stope** — a worked-out void; may be flooded (water hazard).
- **Fall** — a blocked/hazard room left by a collapse; dig-out or route
  around.

#### The Hush / Wire-Deep (deferred capstone)

A small authored chamber near the wired reservoir, *discovered by
digging* (a feature on the geology field): the strata go strange, and
the deepest cut is the **Ordinance mirror** — a delving so "solved" it
has gone frictionless and dead. Thematic payload; built after the rest
is real.

**Vertical spine:** the shaft/cage (surface ↔ Upper Galleries) then
player-sunk winzes/raises deeper. Climb-out length grows with depth.

---

## 3. Rooms — three tiers each

Drilling **underground-first** (the dynamics dictate the surface). The
Upper Galleries — the authored, safe tutorial spine at z≈−1 — are done
below. Still to drill: the surface Pithead (needs now derivable — see
the provisioning callback) and the deeper procedural room *types*.

Each room: **(a)** atmosphere + light/air/thermal, **(b)** the few
realized objects (→ §4), **(c)** NPCs (→ §5), plus the **teaching
beat** it delivers and the **state-change** it effects in the player.

### U1 · The Cage Bottom — *the underground commons* — **blocked out** (Stuff unscoped)

The shaft station on the first level: transit hub, ore-loading point,
and the last civilized spot before the dark. Not an airlock — the
**commons**, where the lift, the water, the light and the animals are,
so it's where people gather.

**(a) Atmosphere.** The cage grounds with a clang onto a low chamber
squared and propped in heavy timber, warm-lit by fixed oil-lamps. The
country rock is dark grey-black **slate**, splitting along its
cleavage; a quartz lode threads it, stained rust-red and **malachite
green** where shallow copper has bled into the stone. Iron **rails**
run down the middle to the ore-pass; a **drainage gutter** carries
water off to the sump below the shaft; between them the floor is wet
muck and puddle. Overhead the **back** is timber-set and lagged where
it's held, bare cleaved slate where it isn't — the loose you bar down —
weeping at the joints, black with lamp-smoke. The air is cool and
*moving*; two black drifts lead off into a dark the fixed lamps don't
reach. *[Level z≈−1. Light: lit (fixed lamps). Air: good, ventilated.
Thermal: cool. Safe. Rock: slate country / oxide-copper lode.]*

**(b) Realized Stuff.**
- **the cage** — the man-lift in the shaft; *signal the bell and wait*
  to ride up. Holds a few, slow, time-scaling with depth; the only way
  out for people. A called conveyance — **not** a directional exit.
- **the ore-pass + grizzly** — the tipping pocket where carts dump; the
  **skip** hoists ore up the shaft in bulk, decoupled from riders.
  Where your haul actually leaves the mine; carts stay level-bound.
- **the water butt** — co-op drinking water; fill your flask. The last
  safe water before the deep.
- **the tool crib** — spare picks, shovels, a sledge, pinch-bars — and
  a **timber stack** (props, caps, lagging); empty carts on a siding.
- **the deep-law board** — chalked standing rules (shore your headings,
  log your claim, sing out before you blast): the onboarding surface.
- **fixed wall-lamps**, **plank benches / the muster**, the pony's
  **harness & manger** nook. (Powder is *not* here — magazine off a
  side drift.)

**(c) NPCs & critters.** Not empty — the underground commons:
- ambient **miners** waiting on the cage, resting, mustering;
- the **onsetter** — station-hand who loads the cage and rings it
  (light functional role; → §5);
- the **pit pony** — trams the carts on the long haul (`HaulingCreature`;
  → §5 carve);
- the **canary** — the crews' caged bird, a *living air-gauge* that
  goes quiet as the air turns (the diegetic respiration lesson; → §5);
- **rats** — ambient commensals, harmless here. (The old prospector
  lives down the west drift at the face.)

*Teaching beat:* the light/air contrast (lit-and-safe vs the black
drifts) + the deep-law board + the canary as a living gauge frame the
loop; the lift-wait makes it social. **State-change:** surface newcomer
→ oriented in the underground commons, lamp lit, flask filled.

### U2 · The Timbered Drift — *mine · load · shore* — **blocked out** (Stuff unscoped)

A worked **co-op face** off the west side of the Cage Bottom: the
tutorial heading where the trade is learned with the stakes at zero.
You work it on **tutwork** (on the clock) or as a **tribute** pitch
(for a share) — never free-take; the ore is the co-op's until it's
reckoned.

**(a) Atmosphere.** Ten paces west and the station's lamps are gone —
your own lamp is the whole world now, a swaying circle of yellow on
squared timber and wet slate. The drift runs low and straight (you'd
bump your head standing tall), the **back** propped in timber sets, the
floor a single line of **rail** with muck to either side. It ends at a
**face** of dark slate, and across it runs the lode: soft, crumbling
stone stained **malachite green**, shallow enough still to be more rust
and rot than rock. An empty **cart** stands on the rail beneath it;
timber leans ready against the rib. Further on, where the drift carries
into the dark, the old prospector's lamp bobs. *[Level z≈−1. Light:
**dark — your lamp only** (the first room where it's the only light).
Air: good (ventilated near the station). Thermal: cool. Safe.]*

**(b) Realized Stuff.**
- **the face / the seam** — soft oxide-copper ore in the slate; `hew`
  it and it comes away in green crumbles → **ore** (low grade this
  shallow). A **shared, depleting** face fixture (grade + remaining): a
  crew draws the same pocket down, and when it pinches to barren slate
  the ore's gone this way — you'd `drive` on to follow it.
- **the ore cart** — on the rail; `load` your ore in. Full, the pony
  trams it to the ore-pass → skip → assay → the co-op's book → your pay.
- **timber sets** — stacked at the rib; `shore` the back. Dead safe
  here, but the reflex the mine drills in now, for when it matters.
- your **pick** (Tool/Durable — dulls with use) and **lamp**, from
  Provisioning.

**(c) NPCs.** **The old prospector** — the mentor who walks you through
your first cart, teaches you to read the seam (rich vs pinching), swing
efficiently, and know when to timber, then gets out of your way. (Full
dossier → §5; the room's affordances teach even if he isn't spawned.)

*Teaching beat:* the everyday loop — **mine** the seam → **load** the
cart → **shore** the back — on safe ground; every honest stint is a
first credit in the **mining discipline** (an `ActSignature` deed). The
rhythm rehearses the push-luck decision in miniature: *one more go, or
tram it out?* **State-change:** can't-work-rock → can mine, haul, and
make-safe; first ore into the economy, first pay into your purse.

**Exits:** east → the Cage Bottom (U1); west → the Winze Head (U3).

### U3 · The Winze Head — *carve · sink · the go-deeper gate* — **blocked out** (Stuff unscoped)

The western terminus of the authored spine — where the co-op's squared
order ends and the deep you author yourself begins. Safe/lit/supported
behind, dark/danger/value below: the mine's whole seam-of-meaning at one
spot.

**(a) Atmosphere.** The timber ends and the drift opens into a rough,
ragged junction. The seam you followed has **died** — a smear of green
pinching out into slick, faulted slate, the lode thrown off somewhere
unseen. Around you the walls are **barren rock, undug**; in the floor a
**winze** drops square and black into a dark your lamp can't bottom, a
ladder lashed at its lip. The air's still good here, but a **warmth
rises** from the hole and under it a **faint sour smell** — the deep,
breathing. Chalked beside the winze in an unsteady hand: *BELOW HERE IS
YOURS. BRING YOUR OWN LIGHT. SHORE AS YOU GO.* *[Level z≈−1, spine
terminus. Light: dark, your lamp only. Air: good here, going still &
sour below. Thermal: cool here, warmth rising. Safe here — the last safe
ground.]*

**(b) Realized Stuff.**
- **the winze** — the shaft down (Climbable); `descend` it into the deep
  workings (band 2). The literal threshold.
- **the windlass** — hand-hoist over the winze; raises ore/gear/people
  from below (the deep's muscle-powered cage).
- **the carve-faces** — blank slate in most of the ten directions;
  `drive <dir>` to mint a new heading (follow the strike, prospect), or
  `sink` to deepen the winze. Where the survey's "chase it down-dip"
  becomes an action.
- **the warning sign** (readable; push-luck + deep-law), a coil of
  **rope**, winze-sinking gear at the lip.

**(c) NPCs.** None fixed; the old prospector's parting warning may play
here.

*Teaching beat:* the map-growth acts — **carve** a heading (watch a room
mint) and **sink/descend** the winze — at the explicit push-luck
threshold. This is where a good survey pays off (you already know the
silver's down the dip) and where the **deep-history begins** (the
workings get older and stranger below). **State-change:**
consumer-of-a-fixed-map → author-of-the-map, at the top of the descent,
first real *one more, or turn back?*

**Exits:** east → the Timbered Drift (U2); down → the deep workings
(band 2); barren carve-faces (`drive`) in most directions.

### Provisioning callback (feeds the surface drill)

The Upper Galleries pin down exactly what the surface Pithead must hand
a newcomer before they descend: a **lamp** (+ oil), a **pick**,
**timber** for shoring, and a **cart** — the Provisioning room's stock
— plus a **claim** lodged at the Claims Office over any heading they
mean to keep, and the **Assay Shed** buying the cart's ore on return.
Nothing on the surface exists that the underground doesn't demand.

## 4. Stuff catalog — ◐ (3 of ~N scoped)

The catalog is where each object is **scoped** — picked apart into
`class · mixins · behaviors · persisted data · verbs/affordances ·
states · edge-cases · engine deps`. Shared objects are scoped **once**
here and referenced by rooms; big mechanisms are their own threads.
Describing a room *names* its objects; this is where they become
build-ready.

### Scoped

#### The cage / lift — `ShaftCage` *(Yard collar ↔ U1 ↔ deeper; shared)*

- **Model:** a mobile, occupiable **vessel** that rides the shaft and
  stops at stations — enter it, it carries you (+ co-riders), exit.
  Capacity + co-presence + felt transit in one.
- **Class/mixins:** `ShaftCage` composing **`LiftMixin`** (NEW, reusable
  — `lib/conveyance/`; dorms + city want elevators too) over
  **ExitableVessel + Mobile + Container/Containable**.
- **`LiftMixin` owns:** current level, stations-served, per-level travel
  time, the **call/dispatch**, the boarding **gate**, capacity cap
  (~4–6), operated-vs-self-service.
- **The shaft:** stations joined by a vertical **cage-only** Boundary
  (humans can't walk it); a **collar gate** prevents falls.
- **Persisted:** `currentLevel` (persisted); occupants transient with a
  deterministic mid-ride-restart landing; template config = capacity /
  stations / travel-time / operator rules.
- **Verbs (InstanceContributor at a station):** `descend`/`ascend`/`ride`
  = intent → signal → arrive → board → travel(timed) → arrive; explicit
  `board`/`exit`. Operated by banksman/onsetter on-shift, **self-service
  off-shift** (the object-level "place is 24/7").
- **States:** position (at-station / in-transit) · occupancy (empty / N
  / full) · operation (operated / self-service) · gate (open / closed).
- **Travel time:** modest **real-time** per level, capped — a felt beat
  not a chore; scales *slightly* with depth (deep-is-far tension carried
  by the winze-climb backup, not cage-seconds); duration+cap =
  AppSettings.
- **Edge cases:** full → wait next trip (shift-change bottleneck); cage
  elsewhere → call-latency (one cage = throughput limit); restart/linkdead
  mid-ride → deterministic deposit; **cage disabled** (hazard) → crisis
  NOT stranded — winzes+windlass = slow emergency egress (shutdowns
  reshape, never deny access); shaft-fall → gated, deliberate = lethal
  hazard; mass-vs-headcount → v1 headcount, mass deferred; pony → lowered
  once, stabled below, doesn't commute.
- **Deps:** Vessel/Mobile/Container ✓ · ScheduleApi ✓ · employment/
  operating-rhythm ✓ · persistence spine ✓ · **`LiftMixin` = net-new.**

#### The crew-board — `CrewBoard` : `JobBoard` *(Yard; hiring interface)*

- **Model:** a **live read-projection** of the co-op `Business`'s hiring
  state + the interaction point for contracting. Stores **nothing** — the
  card is 100% derive-on-read (no roster kept on the board).
- **Class/mixins:** reusable **`JobBoard`** (`lib/employment/`; fixture
  bound to a `businessPath`; the first *player-facing* employment
  interface — the bar's hiring was NPC-roster-driven) → **`CrewBoard`** =
  `JobBoard` for the co-op, extended to surface **tribute pitches**.
  Immobile fixture (Visible/Detailed, readable) + **InstanceContributor**;
  no Mobile, no brain.
- **Persisted:** none beyond the template `businessPath`.
- **Verbs (InstanceContributor):** `read board` → the card (tutwork on
  offer · pitches open/taken · shift schedule + running shift + headcount
  below · your status); `sign on [--shift day|core|graveyard]` →
  EmploymentApi hire (tutwork Position); `take pitch <id>` → the tribute
  mechanism; `quit` → end contract. Buttons preview commands.
- **States:** stateless; reflects the Business (positions open/closed,
  pitches taken/open, shift running via operating-rhythm) + viewer
  (employed-here-or-not flips the card between sign-on and status/quit).
- **Edge cases:** multi-employment allowed (`EmployedMixin.employments`
  plural; guard same-business double-hire); no-openings (positions have
  demand/capacity — "no tutwork wanted"); pitch-taken/concurrency (atomic
  first-wins, owned by tribute); off-shift sign-on allowed (24/7);
  **posting/management deferred** (v1 = read + sign-on; offerings are
  authored config).
- **Deps:** EmploymentApi/Business+roster ✓ · EmployedMixin ✓ ·
  operating-rhythm ✓ · InstanceContributor ✓ · ProseApi/MML ✓ · **net-new:
  `JobBoard` (reusable) + the tribute-pitch mechanism (its own thread —
  displayed here, not owned here).**

#### The ore-pass + skip — `OrePass` / skip *(each station ↔ surface bin; shared)*

- **Model:** the **ore-pass** is a station-level **bulk sink** (dump carts
  in, ore accumulates); the **skip** empties it *upward* to the surface
  **tipple/bin** → assay/sale. Player-facing interaction is **only the
  ore-pass** (`dump`/`tip <cart>`); the skip is auto-mechanism.
- **The skip = `LiftMixin` + `Bulkable`** — refines `LiftMixin` to be
  **cargo-agnostic** (cage = +Container/people, skip = +Bulkable/ore; the
  **one headframe hoists both**); runs `LiftMixin` **auto-cycle** mode
  (winder cadence), not player-called.
- **Class/mixins:** `OrePass` fixture = `Bulkable` pocket + a **grizzly**
  (screens oversize → spoil byproduct); skip = `LiftMixin+Bulkable`
  auto-cycle; the **surface tipple/bin** = a `Bulkable` sink feeding the
  assay/sale.
- **Persisted:** ore-pass bulk · skip position+load · surface-bin bulk.
- **Verbs:** `dump`/`tip <cart>` at the ore-pass (BulkableApi.transfer).
  Skip has no on-shift player verb (auto); off-shift ore waits / manual.
- **States:** ore-pass fill · skip (at-station/in-transit/loading/dumping
  + load) · surface-bin fill.
- **v1 decisions (recommended defaults):** skip = **physical
  `LiftMixin+Bulkable`** (not abstract flow); **generous pockets, no hard
  backpressure v1** (throughput cap = deferred tunable); **grade-mixing
  pooled + assay values the mixed bulk** (per-grade separation deferred).
- **Edge cases:** backpressure (deferred), off-shift accumulate/manual,
  restart mid-hoist (spine), **tribute attribution deferred** (tutwork ore
  = common co-op pool).
- **Deps:** Bulkable/BulkableApi ✓ · `LiftMixin` (reused, cargo-agnostic)
  · shared headframe/winder (with cage) · ScheduleApi ✓ · spine ✓ ·
  **downstream: assay/sale** · **deferred: tribute attribution.**

#### The assay/sale — the loop boundary *(Assay Shed / weigh-house)*

- **Model:** weigh → **assay** (grade→price) → **sell** the surface bin's
  ore, turning **ore → money** into the co-op's account. The conserving
  loop boundary (ore leaves the sim, money in). Co-op bulk off-take =
  auto; player verbs `sell` / `assay`.
- **Buyer = just another `Business`** (no `OreBuyer` primitive) — the
  sale is a **banking transaction between two Businesses** (or
  Business↔player). Reuses banking `settle` + Bulkable + a grade→price fn.
- **Funding seam = CB lending** — the money to buy ore is **credit the
  central bank lends into the economy** (endogenous money, the loop
  repays), NOT a subsidy/faucet. Prereq: the banking **lending tier**
  (currently deferred).
- **Verbs:** `sell <ore>` (owner-players: frontier/byproduct) → txn;
  `assay <sample>` (assaying skill — the buyer's assay is authoritative
  for price; the player's is their own survey).
- **Edge cases:** stolen ore can't sell here (honest channel → Deadzone
  fence); byproducts route to *other* buyers (painter/jeweler/builder/
  University); reckoning/tribute deferred.
- **Deps:** banking settle/accounts ✓ · Business ✓ · Bulkable ✓ ·
  grade→price fn · assaying discipline · CB **lending tier** (deferred).
- **PARKED — pricing:** not fixed (rejected), but the **market onramp**
  (price discovery from zero liquidity) is a **platform-economy /
  Terminus-macro** problem, not the mine's. v1 ships a **seeded starter
  price** (placeholder); the market-onramp is its own thread.

### Backlog — named, unscoped (each a pending scoping pass)

- **Big-mechanism threads:** the **seam/mineable face** (core loop, §2g),
  the **tribute-pitch mechanism** (share-contract over a pitch; ties to
  the claim/pitch layer; surfaced by the crew-board), the **readable
  inscription** (house-mark + deep-law board + deep glyphs → archaeology).
- **Light/heat:** lamp (LightSource + fuel/Reserve), fixed wall-lamps
  (AmbientLit), stove (Thermal + LightSource).
- **Tools:** pick, shovel, pinch-bar, sledge; hand-drill + drill-steel +
  powder (deep tier); shoring timber (props/caps/lagging).
- **Haulage/water:** ore cart (Container on rails), water butt + flask
  (Bulkable liquid), drainage gutter/sump, the winze + windlass (Climbable).
- **Rock:** the seam, the carve-face, ore (Globbable/Bulkable).

Materials seeded as real `Material`s (slate, quartz, oxide-copper ore,
sulfides) — hardness drives carve-cost + tool wear.

## 5. NPC dossiers — ▢

Named roles + creatures (each its own design pass, done one at a time):
- **The pit boss / claims registrar** — onboarding, hands you the loop.
- **The old prospector** — mentor; reads rock, teaches push-luck wisdom.
- **The Veshko buyer** — the faultline; the "sell your claim" tension.
- **The onsetter** — station-hand who loads the cage and rings it (light
  functional role at the Cage Bottom).
- **The pit pony** — `HaulingCreature`; trams carts on the long haul; a
  friendly working animal + haulage exemplar.
- **The canary** — caged bird kept as a *living air-gauge* (goes quiet
  as the air turns; a portable respiration warning). The gem carve.
- **Deep fauna** — cave-adapted, stranger toward the wire; characterful
  threats, not a spawn-farm; mostly deferred to the deeper pass.

## 6. Arcs / quests (state-change-first) — ▢

- Tutorial: "cut your first cart" → the loop.
- The push-luck arc: follow a seam deeper.
- The faultline arc: Veshko wants the delving — hold or sell?
- The Hush: what's in the wire-deep (capstone).

### Failure / the negative case (design principle; cross-ref §2e)

A find means nothing if you can't fail, so **barren is the default** —
the rich seam is the exception, and a survey can honestly come back "no."
- **Barren-by-default, informative, legible in hindsight** — a dud
  teaches the ground (faulted / no roots / played-out); you see *why*,
  so it reads fair and you catch the sign earlier next time.
- **Cost scales with the bet; the floor hardens as you raise** — a
  cautious survey dud costs little (small fee + discipline credit for a
  competent survey); driving a heading into a fault burns timber + hours;
  a deep push-luck bust is expensive *and* dangerous.
- **Negative knowledge still sells** — a "don't dig the west drift"
  report has value, so the scholar has a soft floor, never a total zero;
  magnitude runs "dead lode, small fee" → "found the silver."
- **Poker not slots** — skill reads most of the rock (fail cheaper,
  knowingly), luck owns the residual (does the sulfide hold at depth?);
  the dream and the dread live in that gap.
- **The mine is a graveyard of failed bets** — the abandoned headings,
  sealed duds, played-out stopes (from seal-and-reap) are *other people's*
  busts; digging into them is why your eventual strike feels earned.

## 7. Systems wiring — ◐

**Ownership & labor — a company mine.** The developed mine is owned by
the **Ferrow co-op** (a `Business`; the employment-engine precedent).
No ownerless commons — you work here *under contract*, in two authentic
forms:
- **Tutwork** — piece-rate/wage for development & mining (drive, shore,
  cut); the business keeps the ground and the ore. Runs straight on the
  employment engine (mine = Business, you = roster).
- **Tribute** — you take a co-op-granted **pitch** and keep a *share of
  the ore value* you raise, **taken in money or ore-in-kind**. The
  claim-*like* entrepreneurial mode — a working right, **not** land
  title. ("Claims in this mine" = tribute pitches.)

Private land-ownership / staked claims are a **different venue** (a
frontier/claim mine, the property teacher); the carve-mine-shore-seal
engine is shared, only Held-ground ownership-attribution differs (§2b).

**Money — the co-op P&L (conserved, no faucet).** Ore sold to
**Veshko** (off-take) in; **tutwork wages + tribute shares** out; costs
= lamp oil / timber / tools / the pony. The whole loop circulates
through the business account (banking engine). Veshko buying the co-op
*is the arc*: the ownership of your workplace transferring, co-op →
corpo.

**The ore's economic flow — the mine is node 1 of a closed loop.** The
value chain is `mine → smelt → manufacture → retail → consume`, money
flowing back up; the closure is that **the pick you buy is forged from
mined metal.** Every step is a player role; the mine is just the first.
**The mine owes the loop only a clean, conserving *sale boundary*** (the
assay/sale) — past it, ore leaves Ferrow's simulation into the wider
economy (that full loop is a **platform-economy thread**, cross-wing,
not Ferrow's to build). **Conservation discipline:** **a buyer is just another `Business`, seeded
by CB *lending*** (credit lent into the economy, the loop repays) — **NOT
a money faucet or subsidy**; it pays from borrowed working capital +
revenue down the chain; the loop must close to balance. Only
the **central bank** mints/drains money; the **mine is the matter
source** (extraction), **wear/decay is the matter sink** (`Durable`
condition, partly re-closed by scrap/recycling). v1 abstraction seam =
**smelting** (Veshko turns ore→metal off-screen, conserving).
*(Resolves the earlier "Veshko can't be an infinite mint" open.)*

**Material acquisition — a specialization spectrum (nobody is forced to
mine).** The mine is the **source node** for mineral stock; how a player
gets ore depends on who they are:
- **Buy it** — the default for a **crafter**. The co-op sells ore into a
  **materials market** (not just the Veshko off-take); you earn by
  making and selling goods, spend a slice on stock, the craft is the
  margin. This is **comparative advantage — buying is the *smart* play
  for a specialist, not a punishment**; keep it efficient so the economy
  doesn't collapse into everyone self-supplying.
- **Tutwork** — steady mining income (wage, low risk).
- **Tribute-in-kind** — work a pitch, take your share **as ore**: the
  low-friction "earn the material" path for a crafter who wants to dig
  their own, having bought nothing.
- **Frontier claim** — the other venue: own everything you dig, bear all
  the risk. Full self-sufficiency.

Through-line: match the player to a point on the risk/autonomy dial —
the company mine sells **reliability + zero capital**, the frontier
sells **ownership + upside**.

**Ore ownership & theft.** Ore is a normal carriable material — **no
magic "can't take this" wall.** But pocketing it is theft (the co-op's
ore on tutwork; the co-op's cut on tribute, since the share is reckoned
at the assay). Enforced diegetically and imperfectly: the only honest
buyer is the co-op's, so skimmed ore must be **fenced** elsewhere at a
discount/risk (→ the **Deadzone** shadow-economy hook); the reckoning +
a possible search catch patterns (small skims slip, greed betrays);
caught runs the social pipeline (**regard↓ / known-as-skimmer /
fired-or-pitch-pulled / barred / notoriety / restitution**). Temptation
**scales with value** — nobody skims lean oxide; deep-silver
**high-grading** is a real heist-flavored gamble. (Frontier mine: it's
*your* ore — take it freely.)

**Byproducts — the dig is a stream, not one ore number.** Breaking rock
yields a mass that *sorts* into several outputs, each with its own buyer,
so one dig serves multiple economies. v1:
- **Spoil / deads** (barren slate + quartz) — bulk logistics (backfill /
  stow / surface heap) with a floor value as **cheap building stone**
  (dressed slate = roofing/flagstone; crushed = aggregate) → builder
  economy.
- **Pigments** — the oxide zone's malachite (green) / azurite (blue) /
  ochre: a metal-*dud* face can still be a modest pigment find (painter,
  not smelter) → a long tail of value under the failure model.
- **The lucky pocket** — rare vugs of amethyst/rock-crystal, native
  silver, a gem in the gangue → jeweler/crafting; the jackpot byproduct.
- **Fossils / specimens** (light add) → the scholar/University + collectors.

All one conserved mass getting sorted (the bulk/crafting substrate).
**Deferred:** vitriol-water cementation chemistry (copper from
sulfate-laden mine water via scrap iron) + gas (hazard, not product).

**Operating rhythm — the place is 24/7, the operation runs shifts.** The
*place* never locks a player out (descend and mine any hour — always-on).
The *operation* breathes on the **game clock** via the employment roster:
**day/core shift** = alive/social/supported (tutwork wages accrue, assay
open, crews + pony + prospector about); **graveyard** = skeleton, quiet,
solo, unsupported (you can still dig, freelance). The cycle is game-time,
**decoupled from the player's timezone** (everyone tastes both), and
**NPC crews keep the floor alive** off-hours (anti-ghost-town: NPC floor
+ player ceiling). **Stoppages are content, not locks:** hazard (flood /
gas / collapse / fire → closed-until-fixed, a crisis to answer),
rest/feast days (game-calendar, a social beat), economic death (price
collapse / lode plays out / insolvency / Veshko buy-out → **knacked**,
an eerie dead-mine to prowl). Principle: a shutdown **reshapes** the
experience, never **denies access**.

**Disciplines:** prospecting / geology / mining (ISCED-F seeds), and
**archaeology** — the deep-history scholar discipline.

**Archaeology (ISCED-F 0222) — the humanities twin of geology.** Both
read the deep by its layers; geology reads the rock's history,
archaeology the *human* one (the house-workings, the older strata). A
**hub discipline** whose Catalog edges cross ISCED broad fields —
geology (0532), history, linguistics (0232, for decipherment),
archaeometallurgy/materials, numismatics — so being good at it *requires*
the web (the scholar fantasy made real). **Cross-wing, not mine-only:**
it reads every ruin-layer in the world (Terminus on Eternal City, the
lapsed countryside, the Deadzone); the Ferrow deep is a superb *first*
field site. **Hieroglyphs → decipherment:** the house-era workings are
in a **known script** (read directly); the Eternal-age/pre-Fallow deep
is a **lost script** you must *decipher* — the real method (Rosetta-Stone
parallel text, proper-name anchors, sign-frequency, logographic-vs-
syllabic reasoning), riding the **knowledge ladder** (known-of →
can-read; the RecipeKnowledge shape). Payoff: reading the **makers' own
words** off the wall of the Hush — the central myth in its own voice.
**Scope:** net-new + platform-sized (its own scholar archetype); the full
decipherment engine is a deferred vertical, v1 in the mine = a taste
(readable known-script up top, tantalizing undecipherable glyphs deep).

**Verbs (→ command wiring):** `hew`/`mine`, `load`, `shore`, `drive`,
`sink`, `raise`, `descend`; contract verbs (sign on tutwork / take a
tribute pitch).

## 8. Build order + deps — ▢

Engine deps (nearly all shipped): light ✓ · respiration ✓ · thermal ✓
· reserve ✓ · encumbrance/haulage ✓ · crafting/materials ✓ · biome ✓ ·
grouping ✓ · parcel/title ✓ · employment ✓ · Warren (bud/merge) ✓ ·
locomotion/climb ✓ · CartesianZone 3D coords ✓ · Boundary/seal ✓.
Internal sequence: zones + coordinate space + authored spine → surface
rooms & Stuff → Upper-Galleries rooms & Stuff → NPCs → the
carve/mine/shore/seal dynamics + geology field → arcs → the Hush
capstone.

## 9. Decisions / open questions

**Resolved (2026-07-13):**
- **Coordinate architecture = one 3D `CartesianZone`** `(x,y,z)`, not
  per-level zones. "Dig down" is the native `z−1` neighbour; atmosphere
  is a function of depth; ore bodies are 3D. (Rejected: single-zone-vs-
  stacked-2D was a false choice once coords are shared — stacked-but-
  registered just discards the zone's enforcement.)
- **Persistence is three-state** (Spine / Held / Provisional); commons
  churns, claims persist. Shoring + claiming promotes to Held; neglect
  / lapse demotes.
- **Mine-a-vein and carve-a-heading are distinct acts**; carving cost =
  rock hardness, ore softer than rock (vein-chasing cheap, speculative
  driving expensive).
- **Seal-and-reap** at an articulation-point chokepoint, occupancy- &
  cold-gated, Provisional-only; old seals **re-drivable into fresh
  ground** (the long-term-richness engine).
- **Behind the wall = both** — blank strata heading by default, plus
  natural chambers and authored set-pieces seeded on the geology field.
- **Cave-ins never fatal** — routine safe sealing + rare telegraphed
  collapse that blocks (never kills); v1 collapse hits unshored
  Provisional only.
- **Vertical transit = a called lift**, not an up-exit — the man-cage
  is capacity-limited + time-scaling-with-depth + signalled; the only
  way up for people. **Bulk ore out** is decoupled: tip at the
  **ore-pass** → **skip** hoisted up the shaft → surface tipple; carts
  are level-bound (they never leave the level, only the ore travels).
- **The Cage Bottom is the underground commons** (transit + ore-loading
  + water + light + animals), not an empty airlock; ambient miners +
  the onsetter functional role.
- **Hydration:** a water butt at the station is the *last safe water*
  (fill your flask); deeper found-water is unreliable/foul (sulfide →
  toxin gamble), not a refill.
- **Life-gradient:** friendly/working critters shallow (pit pony,
  canary-as-air-gauge, rats), hostiles only deeper; the *environment*
  is the primary antagonist — deep fauna are characterful, not a farm.
- **Geology/materials:** slate country rock + quartz **oxide-copper**
  lode shallow (soft, lean, green/rust) → hard **sulfides** deep (rich,
  +silver, sour air & water); hardness drives carve-cost + tool wear.
  Tool-gradient: pick/shovel/bar (soft shallow) → hand-drill-and-blast
  (hard deep).
- **Ferrow is a company mine, not ownerless commons.** The developed
  mine is owned by the **Ferrow co-op** (a `Business`); you work it
  under contract — **tutwork** (wage/piece-rate for development, on the
  employment engine) or **tribute** (a granted pitch, share of ore
  value — the claim-*like* working right, not land title). Private
  staked claims are a *different* (frontier) mine. Ore→money is the
  co-op P&L (sell to Veshko, pay wages+shares — conserved). The Veshko
  buy-out arc = ownership of the business transferring.
- **Nobody is forced to mine for materials.** Crafters **buy** ore from
  the co-op's materials market (comparative advantage — the efficient
  default, the economy working as intended); DIY paths are
  **tribute-in-kind** (take your share as ore) and the **frontier claim
  mine** (own it all). Risk/autonomy dial: company mine = reliability +
  zero capital, frontier = ownership + upside.
- **Ore theft is possible but diegetically enforced** (no hard wall):
  skimming = theft (co-op's ore/cut); the only honest buyer is the
  co-op's → fence elsewhere at a discount (Deadzone hook); reckoning +
  search catch patterns; caught = regard / recognition / employment /
  access / notoriety hit. Temptation scales with value (deep-silver
  high-grading).
- **Faces/dig-sites = the ten-direction model** (§2g): up to 10 faces
  per room (8 compass + up/down), derived per-neighbour from the geology
  field, addressed by direction/descriptor, **engaged not occupied** (no
  sub-room geometry) — many crews on many faces of one room. Diagonals
  let you follow a seam's strike (`drive NE`); dip = `drive` + `sink`.
- **Failure is real and barren is the default** (§6): informative +
  legible + cost-scales-with-bet + negative-knowledge-still-sells +
  poker-not-slots; the mine is a graveyard of others' failed bets.
- **Mining yields a byproduct stream** (§7), not just ore — v1: spoil
  (logistics + cheap building stone), pigments (the metal-dud-is-a-
  pigment-find twist), the lucky pocket (gems/native metal), fossils
  (scholar). Different byproducts → different buyers/crafts; one
  conserved mass sorted. Vitriol-water chemistry + gas deferred.
- **Operating rhythm: place-24/7, operation-on-shifts** (§7). The mine
  never locks a player out; the co-op operation runs game-clock shifts
  (day = alive/employed/supported, graveyard = quiet/solo/unsupported),
  decoupled from real timezone, NPC-floor off-hours. Stoppages are
  content not locks — hazard (flood/gas/collapse), feast days, economic
  death (knacked/abandoned). Shutdowns reshape, never deny access.
- **History & founding: dig down through time** (§1). Three layers —
  geological deep-time / the reopened **great-house mine** (co-op
  reclaimed a house working abandoned at the Widening) / the pre-Fallow
  wired deep (the Hush). Ownership chain = world economic history in one
  hole: house → lapse → commons (co-op) → Veshko. (Canon: wired deep +
  Widening-lapse; proposed: Ferrow-as-reopened-house-mine.)
- **Archaeology (ISCED-F 0222) = the scholar deep-history discipline**
  (§7) — humanities twin of geology, a hub with cross-field edges;
  hieroglyphs → **decipherment** of a lost Eternal-age script (real
  method + knowledge ladder; payoff = the makers' words off the Hush).
  **Platform-wide** (reads every ruin-layer), net-new, its own thread;
  decipherment engine deferred, v1 = a taste. Flagged in content-tour.md.
- **`LiftMixin` = a reusable conveyance primitive** (`lib/conveyance/`),
  not a Ferrow one-off — a called, capacity-limited, timed, operated
  vertical conveyance over ExitableVessel+Mobile+Container; **dorms +
  city want elevators too.** `ShaftCage` = the Ferrow concrete class.
  First fully-**scoped** Stuff object; sets the §4 catalog template
  (class/mixins/behaviors/data/verbs/states/edge-cases/deps).
- **Crew-board scoped** (§4): a reusable **`JobBoard`** (`lib/employment/`,
  first player-facing hiring interface) → **`CrewBoard`** for the co-op;
  a stateless live projection of the Business's hiring state + sign-on
  affordance, **no roster stored**. Posting/management deferred (offerings
  authored). Surfaces — but doesn't own — the **tribute-pitch mechanism**
  (now its own backlog thread: a share-contract over a pitch, ties to the
  claim/pitch layer).
- **Ore-pass/skip scoped** (§4), with v1 defaults: skip = physical
  **`LiftMixin`+`Bulkable`** (refines `LiftMixin` **cargo-agnostic** —
  one headframe hoists cage[people]+skip[ore]); generous pockets/no
  backpressure v1; grade-mixing pooled + assay-averaged. Tribute
  attribution deferred (tutwork ore = common pool).
- **Ore economic flow: mine = node 1 of a closed loop + matter source**
  (§7). Chain `mine→smelt→manufacture→retail→consume`; the mine owes only
  a conserving **sale boundary**; **Veshko = black-box budgeted buyer,
  NOT a faucet** (resolves the infinite-mint open); CB = only money
  source/sink, wear = matter sink. Full loop = a **platform-economy
  thread** (content-tour); smelting = v1 abstraction seam.
- **Assay/sale scoped-except-pricing** (§4): **a buyer is just another
  `Business`** (no `OreBuyer` — a banking txn between Businesses); funding
  seam = **CB *lending*** money into the economy (credit-seeding, loop
  repays; needs the deferred banking lending tier), NOT a subsidy/faucet.
  **Pricing PARKED** — not fixed, but the **market onramp** (price
  discovery from zero) is a platform-economy/Terminus problem; v1 = a
  seeded starter price, market-onramp = its own thread.

**Open:**
- Arrival: TPA terminal at the Pithead vs a walked frontier-road
  approach (or both)? Leaning both — TPA for return trips, a road for
  the felt first arrival.
- Grace-period / seal cadence tuning; chamber frequency & the
  authored-vs-natural ratio. (Knobs — defer to the content pass.)
- Does the cooperative have a governance surface on-site (deep-law as a
  mini-Assembly) or is that just flavor for v1? (Leaning flavor.)
- Do catastrophic events ever threaten Held tunnel? (Deferred past v1.)
