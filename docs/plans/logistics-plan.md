# Logistics — implementation plan

**Input:** [logistics-requirements.md](../requirements/logistics-requirements.md)
(D1–D21 closed with the user 2026-09-03; this plan is the HOW and
re-litigates nothing in it). Read alongside:
[conveyance.md](../subsystems/conveyance.md),
[locomotion.md](../subsystems/locomotion.md),
[spatial.md](../subsystems/spatial.md),
[boundary.md](../subsystems/boundary.md),
[activity.md](../subsystems/activity.md),
[contract.md](../subsystems/contract.md),
[document-store.md](../subsystems/document-store.md),
[content-packs.md](../subsystems/content-packs.md),
[watershed.md](../subsystems/watershed.md),
[encumbrance.md](../subsystems/encumbrance.md),
[employment.md](../subsystems/employment.md),
[retail.md](../subsystems/retail.md),
[advancement.md](../subsystems/advancement.md),
[behavior.md](../subsystems/behavior.md),
[fasttravel.md](../subsystems/fasttravel.md),
[perception.md](../subsystems/perception.md),
[attendant.md](../subsystems/attendant.md),
[time.md](../subsystems/time.md),
[mql.md](../subsystems/mql.md).
Sibling slates: [logistics-slate](../slates/builds/logistics-slate.md) (parent),
[freight-slate](../slates/builds/freight-slate.md) (§ *The Journey*, adopted
whole by D4; its barricade / tollgate / antitrust sections are out of scope).

**Build discipline:** ONE MR for the whole build. Per wave: `pnpm test:near`
+ every touched pack's own `vitest` + the lint family. `pnpm test` runs at
exactly two moments — before the MR opens, and at `/finalize`. No
migrations: a rename means dropping the dev DB. Stage by name, never
`git add -A`; push every turn. `./tools/wt-status` first, every session.

---

## Grounding — facts verified this cycle

Everything below was read in the tree at plan time. **Four of these
contradict or outrun the requirements; they are marked ⚠⚠ and each has a
plan-level decision or a user question attached.**

### The substrate the build rides

- **`Archetype`** (`packages/server/src/mud/lib/archetype/Archetype.ts`).
  D19's reading is **confirmed on both halves**: `materialize()` is
  `async materialize(): Promise<Stuff & Container>` — it already returns a
  container, not a room — and `satisfies(space: (Stuff & Container) |
  readonly (Stuff & Container)[])` already evaluates over the union of an
  array of spaces (contents + `Adornable` fixtures). The only binding to
  rooms is `const VENUE_PATH = '/platform/location/venue'`. Validation lives
  in `Archetype.fromData`; the runtime index is `ArchetypeCatalogue`; the
  reader is `platform/idea/cmd/perception/SurveyController.ts`.
- ⚠⚠ **`SurveyController.roomArchetypes()` reports *every* industry-less
  archetype in *every* room.** Today that is the four furnishing archetypes.
  D19's roster adds five more with no industry — `corridor`, `depot`,
  `haulage-rig`, `passenger-conveyance`, `livery` — so shipping them as-is
  puts five extra lines on every `survey` in the game. See **P6**.
- **`Watercourse` / `WatercourseCatalogue`** (`packages/content/water/src/idea/`)
  is the exact precedent D20 names: the **class** is the pack's
  (`/system/water/idea/Watercourse`), the **rows** are the realm's
  (`packages/content/world-seed/content/stuff/idea/Watercourse/{kestrel,delight,holloway,cold-fell}.yaml`,
  covered by the platform pack's `/stuff` title claim). The catalogue is a
  singleton `Idea`, **lazy and self-loading on every public read** ("no warmed
  vs cold state to get wrong"), compiling authored topology into a lookup.
  Copy this shape wholesale for `Lane` / `LaneCatalogue`.
- **`Exit`** (`lib/boundary/Exit.ts`) ships `media: string[]` (medium-grouped
  mode admittance; empty ⇒ the walk/sneak/run pace family only),
  `wheelPassable: boolean` (default `true` — "the residue the medium can't
  express"), `blocked`, `oneWay`, `messageIn/Out`, and `canTraverse(actor,
  mode?)` returning a discriminated gate result.
- ⚠⚠ **`Exit` has NO `speed` and no `defaultDurationMs`.** D5 and D18 both
  assert "already expressible — exit `speed` / `defaultDurationMs` vary per
  edge — so the dial costs nothing." It does not exist. `speed` is a field on
  **`LocomotionMode`** (`platform/idea/LocomotionMode.ts:82`, a per-mode
  multiplier), and `defaultDurationMs` appears nowhere in the repo. See **P1**.
- ⚠⚠ **`MobileMixin` is composed by exactly one class — `Character`**
  (`lib/character/Character.ts:91`). No vehicle in the tree is `Mobile`. D3's
  "a vehicle is a `Mobile` vessel" is genuinely new composition. See **P4**.
- **`Mobile.teleport()`** (`lib/spatial/Mobile.ts:567`) is `void` and
  **synchronous**: `announceDeparture` → `ContainmentApi.move` →
  `announceArrival`. No slot ripple, no haulage tow — the D14 defect,
  verbatim as conveyance.md documents it.
- **Haulage ships**: `HaulableMixin` / `HaulerMixin` (`lib/slot/`), the
  symmetric R2.2 live-ref pair, `hitch`/`unhitch`, the tow inside
  `Mobile.traverse`, `HaulingCreature` (a rideable draft beast), and
  `platform/thing/equipment/Handcart.ts` = `HaulableMixin(Vessel)` with the
  standing note *"variety (a heavy wagon, a light barrow, a dragged sledge)
  is content + data, not subclassing."* Encumbrance's `draftLoad =
  (cartSelfMass + cartEffectiveContents) × draftFactor` and the two
  move-time gates (terrain, breakaway) are shipped.
- **`ExitableVessel`** (`lib/boundary/ExitableVessel.ts`) is complete —
  `DoorBearingMixin(ExitableMixin(AdornableMixin(Vessel)))`, synthesized
  `out`/entry exits, `go <vessel-keyword>` boarding. CLAUDE.md records it as
  *"deferred until a consumer needs a concrete class."* **This build is that
  consumer.**
- **`drive` and `ride` verbs already exist** as single-leg passthroughs
  (`platform/content/platform/cmd/movement/{drive,ride}.yaml` →
  `DriveController` / `RideController`). ⚠ `drive` **already collides** with
  trade-mining's `drive` (drift a heading); that pack's view carries a
  comment noting the two are separated by affordance order alone and that
  *"nothing in the repo affords the movement view today — `DrivableMixin`
  carries no `commandContributions`."* ⚠ `ride` means *steer your mount*,
  not *be a passenger*. See **P5**.
- **Activity**: `SustainedEngagement` is structurally `Engagement` minus
  `duration`/`onComplete`; `emissions: ScheduledEmission[]` is the declared
  cadence channel; the scheduler's timers are **game-time**
  (`WorldClockApi.every`). Slots `body | hands | attention | voice`. Abort
  reasons augment by declaration-merging from the owning subsystem. The
  shipped exemplar to copy is `lib/attendant/AttendanceEngagement.ts`
  (an engagement class is a plain class in `lib/<subsystem>/`, never
  template-backed — so a pack `src/lib/` is its honest home).
  ⚠ freight-slate's *"one possible framework touch"* is real: **a sustained
  engagement that ends cleanly on its own terms** has no shipped path today
  (`SchedulerApi.cancel(engagement, reason)` is the only exit).
- **Contract / gigs**: `job post <item> to <destination> for <reward>`
  (`--bounty`/`--business`/`--expires <h>`), `claim`, `fulfill`, `complete`,
  `abandon`; escrow in `escrow:contract:<id>`; `JobBoard` in the Terminus
  terminal hall; lazy expiry on every touch;
  `contract.postingExpiryDefaultGameHours` is the window dial D16 needs.
  ⚠⚠ **`Condition` refuses `Globbable` outright** (`lib/employment/Condition.ts`
  — "a merging stack has no stable identity"), and `CONDITION_TEMPLATES` is
  the closed one-member list `["delivery"]`. See **P8**.
  ⚠ `holdsFor` refuses any **Creature** ancestor (strict possession) but
  walks up to depth 12 through ordinary containers — so *a crate in a wagon
  standing in the depot delivers*, which is what we want.
  ⚠ Contract postings carry a destination and **no origin** — D17/AC15g needs one.
  ⚠ contract.md's deferred-seam list contains *"the systemic job generator (the
  world posts its own needs)"* and *"NPC claiming brains"* — **D16 requires the
  first** (the second is dodged; see P9).
- **Documents**: `DOCUMENT_KINDS` (`lib/document/DocumentKinds.ts`) is closed
  and editing it is a platform act. The `water-right` row is the exact
  precedent for a runtime-written record: `naturalKey: null` (path-keyed),
  `contentDir`, `ext: 'yaml'`, **`onVanish: 'keep'`**. Adding kinds adds **no
  Mongo collection** — they are rows in `documents`. `WaterRightRegistry`
  (a pack singleton `Idea`) is the shape for a registry that validates then
  `DocumentApi.save`s.
- ⚠ **`DocumentApi.save` gates on parcel title** (`AccessApi.canAtPath`), which
  admits the *landowner*, not an employee. `DocumentLogic.saveReleaseImpl` is
  the shipped, deliberately narrow bypass for institution-owned documents:
  owner **derived** from the institution, path **constrained** to its own
  branch, `kind` **fixed**. See **P7**.
- ⚠⚠ **MQL has no document seed.** Seeds are `keywords | literal | pronoun |
  path-glob (over template paths) | stuffId | group`; `MqlMatch` wraps
  `Stuff`. AC16/16a/17's *"MQL over the paper"* is not free. See **P10**.
- **Advancement**: a `Discipline` is a content row
  (`.../idea/Discipline/<key>.yaml`, the trade-mining `geology` shape).
  `conferrals: {band, verbs}[]` confers **verb yaml-paths** only. Band-gating
  a *capability* is the magic precedent (`requiredBand` read at act time —
  *"competence IS access"*), and resolution-scaling a readout is the geology
  precedent (the error bar IS the competence). Both are legitimate for D15.
- **The instrumentation split works cross-pack**: the platform's
  `cmd/perception/measure.yaml` carries `strike`/`dip` **stanzas whose
  `controller:` points into `trade-mining`'s `src/`**, with a documented ⚠
  that an install without the pack gets a legible `controller-error`. That
  is the shape D15's readouts take.
- **Packs**: a new pack = a directory under `packages/content/`, a
  `package.json`, `pack.yaml` (`id`, `root`, `requires.groups`,
  `requires.title`, optional `boot`), and **one dependency line in the root
  `package.json`** (the deployment manifest — `PackLogic` discovers from
  there). A capability pack's `src/<rel>.ts` **backs** `/<root>/<rel>`; it
  imports the kernel only by package specifier via the server's `exports`
  map; it writes **absolute** `FromModule` strings; it may hold `thing/`,
  `idea/`, `agent/`, `location/`, `idea/cmd/<category>/`, `behavior/`,
  `lib/`, `__tests__/` — **no Api, no logic singleton, no free helper**.

### The content the build has to move

- **The corridor that exists**: `packages/content/terminus/content/world/terminus/valley-road/`
  — `towpath` → `the-narrows` → `the-shoulder`, between
  `/world/terminus/wharfside/bank` and
  `/world/terminus/hinkley-hills/location/arrival`. Five rooms end to end,
  a `CartesianZone` at `valley-road.yaml` (`cellSize: 6.0`), climbing
  35 m → 130 m. **It is the pattern to copy**: both sides of every
  cross-zone exit authored explicitly, `coords`, `_address`, `_biomePath`,
  `ambientIntensity`/`ambientColorTemperature`, prose + `details:`.
- **Hydrology**: `kestrel` = headwaters(1400) → gorge → falls(500) →
  confluence(30, **Terminus**) → estuary(0); `delight` = spring(720) →
  flats(180) → mouth(35), branching at `kestrel:confluence`. The gorge is
  authored as *"steep enough that no boat has ever been up it"* — AC3's
  refusal is already decided by content.
- **Rejection**: `pithead-yard` has five exits, all internal. **No exit
  leaves the locality.**
- **newbie-wilds**: `crossroads/{hub,treeline,terminal,longmeadow,hollow,watchpost}`.
- ⚠⚠ **Every producer floor is an exitless island.** Verified on all
  thirteen trade rooms: `bottling-floor`, `brewing-floor`, `cold-store`,
  `crowsfoot-floor`, `hollis-floor`, `veshko-yard`, `warehouse`,
  `farm`, `kitchen`, `pantry-floor`, `bar`, `cellar`, `vintner-floor` —
  **zero `exits:` blocks**, each carrying the comment *"No exits: the hand
  teleports (the `shifts` shape); a walk is the locomotion slate's."*
- ⚠⚠ **`restocks` runs at the Saxonberg Lounge bar** (`saxonberg-lounge/
  content/world/lounge/agent/mara.yaml`) — and the requirements' own
  non-goals say **"Saxonberg and the Lounge joining the map. Excluded by
  design."** AC15 nonetheless demands zero `teleport` calls *and* that
  Dave's Bar stays stocked. See **P2**.
- **`consigns` hosts (7)**: `trade-farming/farm-hand`,
  `trade-hearth-cooking/pantry-hand`, `trade-bottling/bottling-hand`,
  `trade-distilling/{crowsfoot-hand,hollis-hand,veshko-yard/hand}`,
  `trade-winemaking/vintner-hand`. All consign onto
  `distribution`'s cash-and-carry counter (in Terminus, on University Avenue).
- **The lounge's par sheet**: 14 `parLines` in
  `saxonberg-lounge/.../idea/business.yaml`, every one
  `supplier: /trade/distribution/idea/business`. This is the table D11's
  retune edits.

---

## Plan-level decisions

### P0 — Wave order: the road is proven before the economy moves onto it

The build's forcing function (D11) is its last deliverable, and everything
before it must be independently green. The order is:
**substrate (W1–W2) → the transport system, on synthetic fixtures (W3) →
the ground (W4) → the vehicles (W5) → the trade (W6) → the labor market
(W7) → the switchover (W8) → archetypes-and-reporting, docs, drives (W9).**
No wave leaves a half-state: the brains keep teleporting until W8, and W8
lands the doors, the retune and the rewrite together.

### P1 — Edge duration is one new authored field on `Exit`

An earlier revision of D5 and D18 spent a dial that does not exist; **both
now carry the correction** and point here. It is genuinely cheap, but it is
a **kernel edit that has to be planned, not assumed**:

`Exit` gains `edgeMinutes?: number` — **game minutes** for one baseline,
unloaded, walk-mode traverse of this edge — with `fieldMeta: { persistent:
true }`, an `ExitOptions` entry, and a `getEdgeMinutes()`/`setEdgeMinutes()`
accessor pair. Default `null` ⇒ the corridor default (an AppSetting,
`transport.defaultEdgeMinutes`, 5).

Nothing in the kernel reads it — **`go north` stays instantaneous**. Only the
Journey reads it, and its beat interval is

```
beatGameMinutes = edgeMinutes × modeFactor(mode) × loadFactor(rig)
```

converted to real time by the world clock (12×: one game minute is five real
seconds). D5's table falls straight out of a per-edge budget:
Terminus↔Hinkley ≈ 20 game min over 4 edges; Terminus↔crossroads ≈ 30;
crossroads↔Rejection ≈ 40; **≈ 90 game min ≈ 7.5 real min** end to end
loaded, ≈ 60 unloaded. `loadFactor` is 1.0 empty → 1.5 at capacity.

**Rejected:** deriving duration from `coords` distance. It would make D18's
*"length is an event budget, not a distance"* unrepresentable — a lonely
stretch is few rooms and **long** edges, and coordinates are grid
membership, not a metric.

**Rejected:** hanging duration on the `Lane`. Two lanes share edges (the
towpath is walked and barged); the number belongs to the edge.

### P2 — ⭐⭐⭐ The brains stop teleporting because they stop TRAVELLING

The single most important call in this plan, and it dissolves the largest
hidden cost.

D11 as written implies the brains *walk*. They cannot: their floors are
exitless islands, and Mara's floor is the Lounge, which a non-goal keeps off
the map. But D16 already supplies the right answer — **the venue's supply
need is a gig, and somebody else hauls it.** So:

> **`restocks` becomes a poster and a receiver. `consigns` becomes a poster
> and a shipper. Neither NPC ever leaves its own floor again.** The goods
> move because a hauler — a player, or the `hauls` brain — carries them.

Consequences, all good:

1. AC15's *"zero `teleport` calls"* is met **literally**, and by the honest
   route: not "the keeper walks four rooms", but "the keeper does not
   travel, because carriage is somebody's job." That is the whole point of
   the build.
2. Only ONE actor needs the road — the hauler — so the road is exercised by
   the thing the road exists for.
3. The Lounge stays off the map: **the leg into the Lounge rides the TPA
   lane**, which D2 defines as *"the limit case — a lane with no intermediate
   stops and no duration."* The hauler's `Route` for a lounge delivery has
   `laneKey: tpa`; the `Journey` runs one zero-duration beat. This is not a
   loophole — it is D2's own mechanism doing exactly the work D2 says it
   does, and it is diegetically perfect (the Compact's seat is served by the
   Authority's network; that is *why* the Lounge is where it is).
4. It proves *"rail is a data addition"* without shipping rail.

**What still costs money:** the *producer floors* must be reachable, because
a hauler has to collect from them. **W8 authors one new Terminus room — the
goods yards, off Wharfside — and gives each of the six mainland producer
floors a single exit pair onto it.** One room, six exit pairs, ~40 lines of
prose. The Lounge alone stays off-map and is TPA-served.

**Rejected:** making the brains walk. It requires siting seven outfits on the
ground with real streets — a locality build in disguise — and it cannot
reach the Lounge at all without breaking a stated non-goal.

**Rejected:** leaving the Lounge on raw `teleport` and narrowing AC15 to the
mainland. It would leave the build's headline claim false in the one venue
the acceptance criteria name by name.

### P3 — A lane is induced; a `Route` is a value object with a provenance

D2's two ⚠ constraints are cheap now and expensive later, so they are
structural here, not conventional.

- **`Lane`** (a data `Idea`, never cloned as live Stuff — the `Watercourse`
  shape) authors: `key`, `name`, `mode` (the `LocomotionMode` whose
  admittance induces the edge set — `wheeled`, `walk`, `boat`), an optional
  `edges[]` for a lane whose edges are **not** induced from exits (rail, the
  TPA), an optional `stops[]` (empty ⇒ every node is a stop), and
  **`operator: string | null`** — a durable `templatePath` or `GroupRef`, or
  `null` for the public highway. ⚠ **The operator field is the D2 constraint
  made structural**: it is a ref, so a corpo-run, authority-run or
  nobody-run lane are the same shape, and no player is assumed anywhere.
- **`LaneCatalogue`** (a singleton `Idea`, lazy self-loading, the
  `WatercourseCatalogue` shape) compiles each lane's node set once: for an
  induced lane it walks every reachable room's exits and keeps those whose
  `allowsMode(mode)` (and, for `wheeled`, `isWheelPassable()`) holds.
- **`Route`** is a **plain value object in the pack's `lib/`**, not a Stuff:
  `{ laneKey, nodes: string[], stops: string[], provenance: 'authored' |
  'computed' }`, with two factories — `Route.authored(desc)` and
  `Route.computed(nodes, stops, laneKey)`. ⚠⚠ **The Journey takes a `Route`
  and cannot see which factory made it** (AC15n). An authored route is a row
  under `/stuff/idea/Route/<key>` parsed by the catalogue; a computed one is
  `LaneCatalogue.planRoute(fromPath, toPath, laneKey)` — a BFS over the
  compiled edge set — and mints **nothing**, which is why it can run
  per-request without a template row and without tripping `lint:census`.

Two authored `Route` rows ship over one road lane (a *local* stopping
everywhere and an *express* stopping at the two depots), which proves G2's
"express versus local is one lane with two stop sets" for the cost of a
second YAML file.

**Rejected:** making `Route` a Stuff. A per-request trip would mint a Stuff
with no template path — unaddressable, un-editable, and exactly the anti-
pattern `lint:census` exists to catch.

### P4 — Three vehicle shapes, and only two of them are `Mobile`

`MobileMixin` has one composer today, so each new composition is a real
decision:

| shape | composition | moves by |
|---|---|---|
| **`HaulageRig`** (wagon, dray, sledge) | `BulkableMixin(HaulableMixin(Vessel))` | **towed** — the shipped haulage tow inside `Mobile.traverse`. **Not `Mobile`.** |
| **`Barge`** | `BulkableMixin(DrivableMixin(MobileMixin(Vessel)))` | self-propelled; open deck ⇒ passengers see out |
| **`Coach`** | `SeatedDrivableMixin(MobileMixin(ExitableVessel))` | self-propelled; a navigable interior, a door, `Sealable` optional |

The rig is deliberately **not** `Mobile`: a wagon is pulled, and the shipped
tow already carries it as a unit with its cargo. That keeps the risky new
composition confined to the two vessels that genuinely steer.

D6 needs no new mechanism: discrete cargo is `Container` contents,
continuous matter is `Bulkable` slots, and capacity is mass/volume against
`LoadBearing` — `HaulableMixin.getDraftLoad()` already runs the cart's
contents through the weighted walk.

⚠ Three things W5 must verify live, because `MobileMixin` has never met a
non-Character host: (a) `ContainmentApi.move`'s rule that an
`ExitableVessel` may only live inside another `Exitable` — a room qualifies,
a wagon bed does not; (b) residency — a vehicle standing on a road must not
be swept (`canEvict` veto, the `Exit` precedent); (c) `announceArrival` /
`autoSenseOnArrival` on a host with no `Interactive`.

⭐ **Perception out of a vehicle needs no code at all** (D3): passengers are
*contents* of the vessel, and `MixinApi.isOpenContainer` is the single rule
`canReach`, the MQL `peers` walk and `VisionModality` all ask. An open
wagon shows you the road; a shut `Sealable` van does not. It is a per-row
`data` decision.

### P5 — The Journey's verb is `journey`, in the transport pack

`drive` is taken twice over (movement + mining) and unafforded; `ride` means
*steer your mount*. Overloading either is how a live dispatch bug gets
shipped.

The transport pack ships **`journey`** (category `movement`), afforded by
each rig's / vessel's own `commandContributions` — *content affords content*:

- `journey to <place> [via <lane>]` — plan a `Route` and start the Journey;
- bare `journey` — the status readout (position is free, ETA computed from
  the remaining plan; **competence tightens the window, never shortens the
  trip**);
- stopping is the shipped **`cancel`**, per D4. No `journey stop`.

`drive <direction>` keeps its shipped meaning (one leg, right now).
Boarding a coach as a passenger is the shipped `go <coach>` / `enter` +
`out` — AC15o needs **no new verb**, and the requirements' phrase "the
`ride` experience" should be read as the passenger *experience*, not the
`ride` verb.

### P6 — The archetype substrate change is TWO fields, not one

D19 says "one substrate change." Honest accounting says two, and the second
is not optional:

1. **`materializesOnto: string`** (default `'/platform/location/venue'`) —
   D19's mandate; the constant becomes an authored field, validated in
   `Archetype.fromData`, read by `materialize()`. AC15k falls out.
2. **`surveyScope: 'space' | 'corridor' | 'off-room'`** (default `'space'`)
   — without it, the five new industry-less archetypes appear on **every
   `survey` in the game** (see Grounding). `SurveyController` grows a third
   space-resolution rung between `holdingOf` and the bare room:
   `'space'` → today's behaviour; `'corridor'` → the rooms of the
   `CartesianZone` the actor stands in, and skipped entirely when that zone
   is not a corridor zone; `'off-room'` → never reported from a room (the
   rig and the coach, which are surveyed by naming them).

The corridor space set is resolved **by zone** (`resolveZoneForPath` →
the zone's rooms), not by the lane. That keeps the kernel controller free of
any pack import, and it honours D20's *"zone: nothing new"* — it **reads**
the shipped `valley-road` zone rather than adding a field to it.

**Rejected:** letting `corridor: no` print in every bedroom. Legal, and
"reported never enforced", but it degrades a shipped verb for every player
to save one enum.

### P7 — `DocumentApi.saveAsBusiness` — the `saveRelease` twin

A bill of lading is issued by a *clerk* on behalf of a *carrier*. `save`'s
gate admits the parcel owner; making every clerk a landowner is precisely
the error `saveReleaseImpl`'s comment names.

So the paper rides a second narrow bypass, built to the same three rails and
no wider:

```
DocumentApi.saveAsBusiness(business, path, kind, data)
```

1. **no caller-supplied owner** — derived from the `Business`;
2. **refuses a path outside that business's own branch** (`/trade/haulage/<businessKey>/…`);
3. **the kind is checked against a closed three-member allowlist** —
   `bill-of-lading`, `warehouse-receipt`, `rate-card` — so it can never
   write a command-view, a recipe or a release.

Authorization that the *actor* may act as this business is
`EmploymentApi.buysFor` / `businessOfProprietor`, checked **in front of**
this call by the registry — the `mayPublishAs` placement.

**Rejected:** titling each carrier an extent and gating on membership. It
works for the proprietor and fails for every employee, and a player-run
carrier cannot be given a group.

### P8 — A haul gig carries the CRATE, not the cargo

`Condition` refuses `Globbable`, and supply needs are overwhelmingly
fungible (litres of gin, kilos of ore). A gig for "20 bottles" is
unpostable today and widening the condition vocabulary is out of scope.

The answer is the one D7 already ships: **the consignment is a discrete,
chattel-stamped container**, and the bill of lading is what says what is in
it. `job post <crate> to <depot> for <reward>` is a shipped, engine-verifiable
delivery over a `chattel`-bound item, and `holdsFor`'s upward walk means a
crate still sitting in the wagon **in** the destination room delivers.

⭐ This is why the bill of lading is load-bearing rather than decorative: it
is the only thing that makes a fungible shipment nameable by a gig. No new
condition template, no `CONDITION_TEMPLATES` edit, no engine seam.

### P9 — `ship <goods> to <destination>`, in `trade-haulage`

⚠ **Revised at review (2026-09-03).** An earlier draft of this decision put
`--to` on retail's `consign`, honouring D8's *"no new verb."* **D8's clause
has been withdrawn** — see the requirements' D8 correction — and this
decision follows it.

Retail `consign <thing> --ask <coin>` creates a **`ConsignmentListing`**: a
priced listing, a commission split, a consignor account paid on resale.
Handing goods to a carrier creates a **bill of lading**: a destination, a
custody chain, no price, no buyer. The two share an English word and
nothing else.

⭐⭐ And the overload **forecloses the composition the build exists to
create**: a `--to` that excludes `--ask` makes *"ship it to Rejection and
sell it there"* unexpressible, which is the transport spread — the
arbitrage the whole design is for.

So:

- **`trade-haulage` ships `ship <goods> to <destination>`** — view at
  `content/trade/haulage/cmd/haulage/ship.yaml`, controller at
  `src/idea/cmd/haulage/ShipController.ts`. A **`haulage` command
  category**, on the metal chain's `mining` / `fuel` / `smelting`
  precedent (a trade's own acts get their own category).
- **Afforded by content**: the depot counter's `commandContributions`,
  never a core mixin. You can `ship` where there is a shipping desk.
- **Retail's `consign` and `ConsignController` are untouched**, which
  removes a kernel edit from W2 and the `ShipmentDesk` *shape probe* with
  it — the pack's controller talks to the pack's own counter directly.
- ⭐ **`ship` then `consign` at the far end composes**, and that is the
  arbitrage, expressible.

✅ Checked: **no object in shipped content carries `ship` as a keyword**, so
the verb/noun collision is theoretical.

**Rejected:** `consign --to` (the earlier draft). It muddles two acts under
one word, and — the decisive objection — it forecloses ship-and-sell-there.

### P10 — Reporting is a registry query, not an MQL seed

MQL resolves `Stuff`. Bills of lading are documents. Making them MQL-
seedable means a new seed in the sealed `api/mql/**` subdir **and** widening
`MqlMatch` beyond `Stuff` — a refactor with a blast radius across every
consumer of every MQL result, for one acceptance criterion.

Ship instead: **`WaybillRegistry` owns the queries**, and they surface as
stanzas on the shipped `house` verb (the `house stock` / `house pnl`
precedent, banking category):

- `house freight [--from <place>] [--to <place>] [--since <season>]` — what
  moved, over the caller's own business's paper;
- `house traffic` — **a count over the paper, no counter stored anywhere**
  (D18/AC16a): group every bill's route legs and rank the edges.

The depot's records cover exactly what it handled (AC17) because they are
written under **its own** branch and read by prefix — coverage *is* market
share, structurally.

⚠ **This does not literally satisfy AC16's "MQL"**. See *Questions for the
user* #3. Everything else about D12 holds exactly: no reporting subsystem,
no new store, no aggregate, the paper is the datum.

### P11 — The pass is on the spine, and that is why the depot exists

D1 says the spine is wheeled *"for its whole length except the pass"*, and
AC2 wants a segment that refuses wheels. Taken together that means **a wagon
cannot reach Rejection**, and the plan embraces it rather than softening it:

- Terminus ↔ the valley crossroads is **wheeled**, and is the wagon's road;
- crossroads ↔ Rejection climbs over **the pass**, `wheeled` refused with an
  honest message, walked or carried by pack animal;
- therefore **the crossroads depot is where bulk breaks** — which is D8's
  *handling* product (consolidation) doing real economic work on day one,
  instead of being a service nobody needs.

**Rejected:** a wheeled spine with a wheels-refused *spur*. Cheaper, and it
keeps a wagon route to the pithead — but it makes the pass decorative and
hollows out AC2. Named here because it is a one-line content change if the
user prefers it.

### P12 — Packaging: two new packs, four edited, and the rows in the commons

| pack | root | why (five axes + D13) |
|---|---|---|
| **`transport`** (new, capability) | `/system/transport` | *how the world works* — "roads and rivers exist with nobody employed by them." Lane, Route, Journey, the vehicle substrate. |
| **`trade-haulage`** (new, capability) | `/trade/haulage` | *who makes* — practised by somebody, quittable. The carrier, the rate card, the depot business, `teamstering`, the `hauls` brain. |
| `terminus` (edit) | `/world/terminus` | *where* — the Delight-valley road, the crossroads node, the estuary lane, the Terminus depot, the goods yards. |
| `rejection` (edit) | `/world/rejection` | *where* — the climb, the pass, the pithead-yard end. |
| `newbie-wilds` (edit) | `/world/newbie-wilds` | *where* — one exit onto the corridor past Rejection. |
| `world-seed` (edit) | `/stuff/idea/Lane`, `/stuff/idea/Route` | **the realm's own facts.** The `Watercourse` rule exactly: the class is the pack's, the instances are the realm's, and they sit beside `kestrel.yaml` under the platform pack's `/stuff` claim so the realm's pack can edit them. |
| `platform` (edit) | — | the `measure` / `analyze` teamstering stanzas (the trade-mining precedent). ⭐ **Retail is NOT touched** — P9 was revised at review and carriage has its own verb in its own pack. |
| `saxonberg-lounge`, the six producer trades (edit) | — | par-line retune; the goods-yard doors; brain config. |

⚠ `transport` must **not** claim `/stuff/idea/Lane` in `requires.title` —
that would take the realm's lanes away from the realm's pack, which is the
exact mistake `WATERCOURSE_PATH_PREFIX`'s comment warns against.

Root `package.json` gains two dependency lines. **No kernel list edit
anywhere**: groups, roots and title claims all derive.

---

## Wave W0 — Grounding and verification (no production code)

Mandatory. Everything in § Grounding was read on `design/logistics`; W0
confirms it still holds on the build branch and surfaces drift **before**
W1.

- `./tools/wt-status`; branch `build/logistics` off current master;
  `git rev-list --left-right --count origin/master...HEAD`.
- Drop the dev DB, boot clean, confirm 36 packs install.
- Re-verify by inspection, and record any delta: `Archetype.materialize`'s
  signature and `satisfies`' array parameter; `Exit`'s field list (no
  duration); `MobileMixin`'s single composer; the thirteen exitless trade
  rooms; `Condition`'s Globbable refusal; `CONDITION_TEMPLATES`; MQL's seed
  table; `SurveyController.roomArchetypes`.
- Baseline `pnpm test:near` + `pnpm lint` and record the numbers.

**Exit gate:** a short delta note appended to this plan. **Any deviation
that changes a P-decision is surfaced to the user before W1 starts.**

### ✅ W0 done — the delta note

Branch `build/logistics` off `design/logistics`, `origin/master` merged
in (54 commits: cooking, food-safety and the `trade-hearth-cooking` →
`trade-cooking` rename). Baseline: 25/25 lint gates green, `test:near`
green.

**Grounding re-verified on the merged tree — everything in § Grounding
still holds.** Specifically: `Archetype.materialize(): Promise<Stuff &
Container>` and `satisfies(space | space[])` unchanged, `VENUE_PATH` still
the one binding to rooms; `Exit` has **no** duration field of any kind;
`MobileMixin`'s only composer is still `Character`; `Condition` still
refuses `Globbable` and `CONDITION_TEMPLATES` is still `["delivery"]`;
36 packs.

**Three deltas, none touching a P-decision:**

1. ⚠ `pnpm install` after the merge — the `trade-hearth-cooking` →
   `trade-cooking` rename left a stale `node_modules`-only directory
   under `packages/content/`. Removed. (The standing rule: a pack
   rename means `pnpm install`, or every pack suite fails at collection
   with what reads like a repo defect.)
2. `platform/thing/Prop.ts` became `platform/thing/Thing.ts` on master —
   noted because the plan's file inventory says `platform/thing/Prop`.
   Nothing in this build names it.
3. Two **pre-existing** typecheck errors in content packs
   (`arcana/src/lib/ManaPowered.ts:402`, `tpa`'s
   `RegisterController.test.ts:161`). Not this build's, not touched.

---

## ✅ Wave W1 — Kernel substrate A: the edge, and the honest teleport

**Lands:** the one number a road needs, and the D14 defect fixed.

**Files**

- `packages/server/src/mud/lib/boundary/Exit.ts` — `edgeMinutes` (P1):
  `ExitOptions` entry, `protected _edgeMinutes: number | null = null`,
  `fieldMeta` `{ persistent: true }`, `getEdgeMinutes()` / `setEdgeMinutes()`,
  hydration allowlist entry.
- `packages/content/platform/content/settings/transport.yaml` (new) —
  `transport.defaultEdgeMinutes` (5), `transport.loadFactorAtCapacity` (1.5).
- `packages/server/src/mud/lib/spatial/Mobile.ts` — **D14**. Before the
  move, `teleport()` asks two questions and refuses honestly, naming what
  blocked it: *am I hitched* (`MixinApi.isHauling(this) && isHitched()`),
  and *am I occupying another host's mount slot*. After the move, it walks
  `getAllOccupants()` — the `traverse` ripple's own shape, `seen`-deduped —
  and `ContainmentApi.move`s each occupant, so **teleport ripples what is on
  you**. Refusal throws a typed `TeleportRefused` (the `ContainmentApi.move`
  convention: programmatic contract violations throw); `silent: true`
  spawn paths are unaffected because a fresh avatar is never hitched.
- `packages/server/src/mud/platform/idea/cmd/movement/TeleportController.ts`
  and `.../author/GotoController.ts` — pre-check and emit a
  `controller-rejected` note rather than letting the throw surface. ⚠ The
  wizard `goto` refuses too: an honest wizard path is the point of D14.
- `docs/subsystems/conveyance.md` — the ⚠ *Known defect* block becomes the
  shipped rule.

**Tests**
`lib/boundary/__tests__/Exit.*` — `edgeMinutes` round-trips through the
hydrator and defaults to null.
`lib/spatial/__tests__/Mobile.test.ts` — teleport while hitched refuses and
names the cart; while mounted refuses and names the mount; a **mount**
teleporting carries its rider; worn gear and pack still come along;
`silent` spawn unaffected.

**Exit gate:** `test:near`; `lib/spatial`, `lib/boundary`, `lib/slot`,
`platform/thing/equipment` suites green; `lint:field-meta`, `lint:gates`,
`lint:object-verbs`, `lint:imports` green. **AC18 is met and stays met.**

### ✅ W1 done

Shipped as planned. `test:near` 356/356, the four suites 523/523, 25/25
lint gates.

**Three decisions the plan left open, and what decided them:**

1. ⭐ **`teleportBlockedBy()` is a public method on `Mobile`, not a
   controller-private check.** Three verbs need the same answer
   (`teleport`'s free-move fork, its ride fork, the wizard `goto` —
   twice, for self and `--subject`), and a shared free function is
   banned by CLAUDE.md's export discipline. *Verbs go on objects*
   decided it: "what am I attached to?" is a question about the mover.
   `teleport()` itself now asks the same method, so the pre-check and
   the enforcement can never disagree.
2. ⚠ **`goto --force` refuses too.** The plan said the wizard path
   refuses; it did not say whether `--force` is an exemption. It is
   not — `goto`'s raw fallback is exactly the code path that produced
   the defect, and *an honest wizard path is the point of the fix*
   (`resilience-posture`: friction and daylight, not a back door).
3. **`edgeMinutes` rides the ONE-WAY exit path only**, alongside `media`
   and `wheelPassable`, which is the shipped precedent and also the path
   corridors actually use: the `valley-road` exemplar authors both sides
   of every edge explicitly, so each side carries its own budget. The
   bidirectional convenience path wires none of the three.

**Surprise:** `Exit.bind` is participant-gated (`FromMixin(Exitable)` +
a party-to-the-edge `where`), so a test module cannot call it. The
delta-aware-bind assertion therefore lives in `ExitKind.test.ts`, which
already has the kind-template + `applyExits` harness — the honest place
for it anyway.

---

## ✅ Wave W2 — Kernel substrate B: the paper, the board, the archetype

**Lands:** every kernel seam the two new packs will need, so W3–W9 add no
further kernel surface.

**Files**

- `packages/server/src/mud/lib/document/DocumentKinds.ts` — three entries on
  the `water-right` pattern (path-keyed, `onVanish: 'keep'`, with the
  same "this is a record of something that happened" comment):
  `bill-of-lading` (`contentDir: 'bills-of-lading'`),
  `warehouse-receipt` (`contentDir: 'warehouse-receipts'`),
  `rate-card` (`contentDir: 'rate-cards'`).
  **No schema yaml, no `gen:schema`, no new collection** — they are rows in
  `documents`. AC21 is satisfied by construction.
- `packages/server/src/mud/api/document.ts` +
  `packages/server/src/mud/platform/idea/api/DocumentLogic.ts` —
  `saveAsBusiness` per P7, built beside `saveRelease` with the same three
  rails and the closed kind allowlist.
- `packages/server/src/mud/lib/employment/Contract*.ts` +
  `api/contract.ts` / `platform/idea/api/ContractLogic.ts` — an **`origin`**
  on the posting (`ContractRecord.origin`, a durable `templatePath`, set
  from the poster's environment when omitted), and
  `ContractApi.openGigsOn(board, { origin? })`.
- `packages/server/src/mud/platform/idea/cmd/work/JobController.ts` +
  `packages/content/platform/content/platform/cmd/work/job.yaml` —
  `job post … --from <place>` and `jobs --origin here` (D17/AC15g).
- `packages/server/src/mud/lib/archetype/Archetype.ts` — P6's two fields,
  validated in `fromData`, `materializesOnto` read by `materialize()`.
- `packages/server/src/mud/platform/idea/cmd/perception/SurveyController.ts`
  — the `surveyScope` rung.
⭐ **Retail is not touched.** An earlier draft added `--to` to
`consign.yaml` + `ConsignController`; P9 was revised at review and
carriage now has its own verb in its own pack, so this kernel edit is
**gone**.

**Tests**
`lib/document/__tests__` — the three kinds install, read back, survive a
vanished file; `saveAsBusiness` refuses an off-branch path, refuses a kind
outside the allowlist, and stamps the business as owner.
`lib/employment/__tests__` — `origin` round-trips; the board filters by it;
existing contract suites untouched.
`platform/__tests__/ArchetypeSatisfaction.test.ts` — the shipped venue
archetypes are **byte-identical** with the new fields absent (AC15k's second
half); an archetype with `materializesOnto` a non-location container
materializes onto it; a `surveyScope: 'off-room'` archetype never appears in
a room `survey`.
Retail suites green and **unmodified** (P9's revision removed the retail
edit entirely).

**Exit gate:** `test:near`; `lib/document`, `lib/employment`, `lib/archetype`,
`platform` suites green; **`lint:schema` green and no new
collection**; `lint:census`, `lint:untitled`, `lint:instanceable` green.

### ✅ W2 done

`test:near` 3990/3990, 25/25 lint gates, `pnpm lint` 0 errors. Retail is
untouched, as P9's revision said it would be.

**Four decisions the plan left open, and what decided them:**

1. ⭐⭐ **`saveAsBusiness` has NO caller-module allowlist**, unlike its
   twin `saveRelease` (which is gated to `PressLogic`). Its callers are
   **pack registries** — the haulage trade's today, a second trade's
   tomorrow — so a `FromModule` list here would be *a kernel list edit
   every paper-filing pack needs*, which the requirements forbid outright
   (*a pack must never need a kernel list edit*). The three structural
   rails are the containment: derived owner, path constrained to the
   business's own branch, closed three-member kind allowlist. `TypeScript
   access IS root`, so the caller list would have bought friction against
   nobody. Asserted, not assumed — `business-paper-transport.test.ts`.
2. ⭐⭐⭐ **`surveyScope: 'corridor'` is gated on `BiomeApi.isSkyExposed`,
   not on a zone marker.** The plan said *"skipped when that zone is not
   a corridor zone"* and named no mechanism, and the obvious one — a
   field on the zone — is **forbidden by D20** (*zone: nothing new*; a
   logistics field wanting zone-level inheritance is the
   mixin-on-the-wrong-host mistake in field form). An undeclared field in
   a zone's `data` would also be silently discarded by the Hydrator, the
   orphaned-`data` antipattern. **Outdoors is what makes somewhere a WAY
   rather than a room**, `isSkyExposed` is the shipped kernel predicate
   for it, and it costs no field anywhere. ⚠ An outdoor square does
   answer the corridor questions — and that is right, not noise: D18's
   own table calls the high street a corridor, and the report is
   *reported, never enforced*.
3. **The `origin` read is `ContractApi.openGigsFrom(originPath)`**, a
   second finder rather than an options bag on `openGigsOn`. The backhaul
   is *a different question* — "what wants moving out of here", wherever
   it is posted — not a filter on one board's list, and `--from` on a
   board browse would have implied the two compose when they do not.
   `ContractRecord.findLiveByOrigin` + a `{ origin: 1 }` index on the
   shipped `contracts` collection.
4. **`edgeMinutes`, `origin` and the two archetype fields all default to
   the old behaviour**, so every shipped row is byte-identical with them
   unauthored — asserted for the archetypes (AC15k) because that is the
   one the requirements name.

**Surprise:** the release-transport suite's persistence mock is
**collection-blind**, and the provenance row `saveAsBusiness` also writes
came back out of a `documents` prefix scan as a phantom duplicate. The
new suite's mock is collection-aware; the old one is fine only because it
never lists by prefix.

---

## ✅ Wave W3 — The `transport` pack: lanes, routes, the Journey

**Lands:** the whole system, provable over a synthetic fixture world with no
shipped content wired to it. This is the wave that de-risks everything after
it.

**Files** (`packages/content/transport/`)

- `pack.yaml` (`id: transport`, `root: /system/transport`, group
  `transport`, title `{ extent: /system/transport, holder: { group:
  transport } }`), `package.json`, `tsconfig.json`, `vitest.config.ts`,
  `README.md`; **one dependency line in the root `package.json`.**
- `src/idea/Lane.ts` → `/system/transport/idea/Lane` — the authored
  descriptor (P3), never cloned as live Stuff.
- `src/idea/LaneCatalogue.ts` → `/system/transport/idea/LaneCatalogue` —
  the lazy, self-loading singleton; compiles induced edge sets; owns
  `planRoute()` and `routeByKey()`. **The verbs live on this object**, not on
  an Api — `lint:object-verbs` stays at zero and a pack ships no Api.
- `src/lib/journey/Route.ts` — the value object + its two factories.
- `src/lib/journey/Journey.ts` — the `SustainedEngagement`:
  `slots = {'hands'}`; `interruptibleBy` **excludes `combat`**;
  `cancelable = true`; `getHost()` returns the vehicle; one
  `ScheduledEmission` whose interval is recomputed per leg from
  `edgeMinutes × modeFactor × loadFactor`; each beat **re-validates then
  issues `LocomotionApi.traverseWithDefault` / `engageAround`** — the same
  call a player's `go` makes, so mode gates, `canTraverse`, the conveyance
  ripple and the haulage tow all run on the shipped path; failure is
  `preconditions-changed`; **arrival is a completion**, and the clean self-
  ending path is the one framework touch freight-slate warned about (a
  private `finish()` that deregisters and emits a completion note without
  going through `cancel`).
- `src/lib/journey/abort-reasons.ts` — declaration-merges `route-blocked`,
  `vehicle-disabled`, `team-exhausted`. **No ambush reason** — `combat` is
  reused, per D4.
- `src/thing/HaulageRig.ts`, `src/thing/Barge.ts`, `src/thing/Coach.ts` (P4).
- `src/idea/cmd/movement/JourneyController.ts` → `/system/transport/idea/cmd/movement/JourneyController`.
- `content/system/transport/cmd/movement/journey.yaml` (the view; category
  `movement`; validators `requiresAnimate`, `requiresConscious`,
  `requiresEmbodied`).
- `content/system/transport/idea/LaneCatalogue.yaml` (the singleton row).

**Tests** (`src/__tests__/`, every one importing `test-bootstrap`)
`Lane.test.ts` — a lane induces its edge set from `media` +
`wheelPassable`; a `wheeled` lane excludes a `wheelPassable: false` exit; an
authored `edges[]` lane needs no exits at all (the rail/TPA proof);
`operator: null` and `operator: <business path>` are both legal and nothing
reads a player.
`Route.test.ts` — an authored and a computed route over the same endpoints
compare equal on `nodes`/`stops` and differ only in `provenance`
(**AC15n**); a stop set narrows an otherwise identical route.
`Journey.test.ts` — over a five-room fixture corridor: exactly one
`traverse` per leg and **no second movement path**; the driver's `hands` are
engaged and `body`/`attention` are free (**AC7**); a passenger holds no
engagement; a blocked exit mid-route aborts `route-blocked` and leaves the
vehicle in the node it reached (**AC6**); a destroyed vehicle aborts
`vehicle-disabled`; arrival **completes**; combat does not interrupt;
duration scales with `loadFactor` (**AC9**).

**Exit gate:** the pack's own vitest green; `test:near`; `lint:gates`
(absolute `FromModule` strings), `lint:imports` (pack tier — no relative
escape, no undeclared pack-to-pack import), `lint:instanceable`,
`lint:untitled`, `lint:census`, `lint:module-scope` green. Fresh-DB boot
installs 37 packs.

### ✅ W3 done

Transport pack vitest 27/27, `test:near` 3990/3990, 25/25 lint gates,
**fresh-DB boot installs 37 packs with no `FAILED` line**.

**Six decisions the plan left open, and what decided them:**

1. ⚠⚠ **`Lane` gained a `seeds[]` field the plan did not name.** Rooms
   load lazily, so *"walk every reachable room's exits"* has nowhere to
   start. One authored room path per lane buys the whole induced
   subgraph — and *you still do not draw a road*: the pass proof
   (`Lane.test.ts`) sets **one bit on one exit** and the wagon's
   reachable world shrinks by itself, with the walk lane untouched.
2. ⭐⭐ **The emission is a one-game-minute METRONOME, not a per-leg
   timer.** The plan wanted "one `ScheduledEmission` whose interval is
   recomputed per leg"; the framework **fixes an emission's interval at
   start** (`SchedulerRegistry` schedules `WorldClockApi.every` once), so
   that is unrepresentable. Instead each leg spends a budget
   (`edgeMinutes × modeFactor × loadFactor`) a tick at a time, which is
   the same behaviour with one timer and no rescheduling — and it puts
   the per-leg re-validation exactly at the leg boundary, where D4 wants
   it.
3. ⭐ **`SchedulerApi.complete(engagement)` is the one framework touch**
   freight-slate warned about, and it is on the **kernel** rather than a
   private `finish()` in the pack: a pack cannot deregister from the
   gated `SchedulerRegistry`, and *arrival vs being stopped* is a
   distinction every sustained engagement needs, not just this one.
   Before it, `cancel` was a sustained engagement's only exit.
4. **`vehicle-disabled` fires when the rig comes OFF THE HITCH**, and a
   *destroyed* vehicle aborts `host-destroyed` through the framework's
   own host subscription. Both are distinguishable in the envelope
   (AC6), `host-destroyed` is the more precise of the two, and checking
   the hitch at the leg boundary is what makes the shipped **breakaway**
   gate legible — an overloaded rig that breaks away ends the journey
   naming the vehicle instead of the driver walking on with the cargo
   standing in the road behind them.
5. **The Journey's mover is the vehicle when it is Mobile, else the
   hitched driver** — one object, both vehicle shapes, and still exactly
   one `traverse` per leg (AC5).
6. **`AppApi.setting` reads are guarded.** It *throws* on an unwarmed
   cache, so an unguarded dial would turn a boot-order edge into a
   mysteriously dead journey. The code-side floor equals the shipped
   value, so this cannot mask a wrong setting — only an absent one.

**Two surprises worth keeping:**

- ⚠ **The scheduler dispatches `onAbort` through the class it captured at
  start** (`cls.prototype.onAbort.call(e)`), so an instance spy is never
  consulted. Every abort assertion here spies the **prototype**. Cost an
  hour; noted in `Journey.test.ts` so it costs nobody else one.
- ⚠⚠ **`Scene.toSelf` throws when the actor is not a `Sensor`** — and the
  `hauls` brain (W7) drives journeys with NPC carters. Unguarded, *every
  background haul in the realm* would throw on arrival, swallowed by the
  emission guard but filing a diagnostic every time. Arrival narration is
  now `isSensor`-guarded, the same question `sendCompletedEnvelope` asks.
  **The fixture found this, not the suite's assertions.**

⚠ The boot logs `pack 'transport' ships 7 class(es) no row of any
installed pack names` — expected at W3 and **cleared by W5**, which ships
the rows. The same warning stands today for `arcana`, `residence`,
`tpa`, `trade-mining` and `eternal-university`.

---

## ✅ Wave W4 — The ground: two corridors, the crossroads, the pass

**Lands:** G1. The largest authoring job in the build, and the `corridor`
archetype is its acceptance instrument.

**The rule for every room** (from the shipped `valley-road` exemplar, and
from the Constraints): a `coords` block (**coordinates are grid
membership — a room without them is in no grid and inherits nothing**),
`_address`, `_biomePath`, resolved light (`ambientIntensity` /
`ambientColorTemperature`, or an authored source — **unlit is pitch
black**), prose, `details:`, and **both sides of every cross-zone exit
authored explicitly**.

**Room budget** — D18's *"if a corridor has five rooms, five things have to
be true there"*, so each room is a budget line with a named reason:

| segment | pack | rooms | edge length | reads as |
|---|---|---|---|---|
| Terminus → the crossroads (up the Delight) | `terminus` | 4 | long | ⭐ **the lonely stretch** — the ford (seasonal), the milestone, the drove road, the empty flats |
| **the valley crossroads** | `terminus` | 1 | — | the road, the ditch, an empty yard with a depot site. **Nothing else** — Heart's Delight's own build fills the town in |
| the crossroads → the pass | `rejection` | 2 | long | the climb; the last water |
| **the pass** | `rejection` | 1 | long, **`wheeled` refused** | a barrier with one way through |
| the pass → the pithead yard | `rejection` | 2 | medium | the tips, the yard gate |
| Wharfside → the estuary | `terminus` | 3 | short, `media: ['water']` | ⭐ **the towpath** — a walk you take, and the barge lane beside it |
| newbie-wilds attachment | `newbie-wilds` | 1 | — | one exit pair off the corridor past Rejection |

**Files**

- `packages/content/terminus/content/world/terminus/delight-road.yaml` (a
  `CartesianZone`, the `valley-road.yaml` shape) +
  `delight-road/{ford,milestone,drove,flats,crossroads}.yaml`; the
  crossroads carries the depot **site** and nothing else.
- `packages/content/terminus/content/world/terminus/estuary.yaml` +
  `estuary/{lower-towpath,reach,estuary-mouth}.yaml`; an exit pair back onto
  `/world/terminus/wharfside/bank`.
- `packages/content/rejection/content/world/rejection/kestrel-road.yaml` +
  `kestrel-road/{lower-climb,upper-climb,the-pass,tips,yard-gate}.yaml`;
  an exit pair onto `/world/rejection/location/pithead-yard`.
- `packages/content/newbie-wilds/content/world/newbie-wilds/crossroads/*.yaml`
  — one exit pair onto the corridor beyond Rejection.
- **Title claims** in the three `pack.yaml`s: each corridor extent
  subdivided as its own parcel, `landUse: civic` (the public highway) or
  `wild` (the unimproved track) — D18/D20, AC15j. **No seventh land use.**
- `packages/content/world-seed/content/stuff/idea/Lane/{spine,estuary,tpa}.yaml`
  and `.../Route/{spine-local,spine-express}.yaml` — the realm's lanes and
  the two stop sets over one lane.
- `packages/content/transport/content/archetypes/corridor.yaml` —
  `surveyScope: 'corridor'`, `industry: null`, four slots: `shelter`
  (`seating`), `water` (`bulkSource: water`), `crossing` (`presence`), and
  `light` (`lightLux`) with **no default, on purpose** — the dark stretch is
  the point. **One corridor archetype**; towpath/pass/high-street differ in
  instance data.
- ⭐ **The ford** (AC15i): its exit's `media` is resolved against the
  watershed's **derived** seasonal flow at the reach it crosses — no new
  field, no new mechanism, the same number `measure` reads.

**Tests** (per-pack annex tests, the libations-annexes shape)
Every corridor room plots, resolves a zone, an address and a biome, and has
non-zero light. `lint:locations` (a zone that zones nothing fails).
The **connectivity** assertions, which are the acceptance criteria:
Terminus market square → Rejection pithead yard is connected on foot with no
`teleport` and no wizard flag, and back (**AC1**); the `wheeled` induced
subgraph is connected Terminus → crossroads and **stops at the pass**, whose
refusal carries an honest message (**AC2**); the `boat` lane runs below the
confluence and the gorge exit refuses it (**AC3**); newbie-wilds is
reachable on foot from Rejection (**AC4**); the ford's passability differs
between two seasons (**AC15i**); every corridor parcel resolves `civic` or
`wild` and the closed six are unchanged (**AC15j**);
`corridor.satisfies(zoneRooms)` reports across **all** of a corridor's rooms
at once, and a corridor missing `shelter` reports the gap **with nothing
blocked or penalised** (**AC15l**); the needs vocabulary is unchanged
(**AC15m**).

**Exit gate:** the four packs' suites + `test:near` + the full lint family.
**Live drive leg:** walk Terminus → Rejection → newbie-wilds and back,
unassisted. This is the wave whose gate the whole build leans on.

### ✅ W4 done

Thirteen new rooms across three packs, `test:near` 4139/4139, transport
pack 34/34, 25/25 lint gates, fresh-DB boot 37 packs clean. **The realm
is contiguous**: Terminus market square → Rejection pithead yard on foot,
both ways, with no `teleport` and no wizard flag; newbie-wilds reachable
from Rejection. The drive leg is held to W9 with the rest of the drive.

**Seven decisions the plan left open, and what decided them:**

1. ⭐⭐ **The pass refuses wheels on the edges INTO it, not only on its
   own two.** The first cut set the bit on `the-pass`'s exits alone, and
   the AC2 assertion caught what that means: a wagon could reach the
   saddle and not leave it — **stranded on a pitch with nowhere to turn**.
   *The stair is the EDGE, not the room.* The last wheeled room is the
   LAST WATER, which is also where the sign and the turning-place now
   are.
2. ⚠⚠ **Every road exit had to declare `media: [ground]` explicitly.** An
   exit with no `media` is the legacy walk-only default and admits the
   ground *pace* family alone — so a corridor authored the ordinary way
   would have had a `wheeled` lane that compiled **completely empty**,
   with nothing anywhere saying why. Found by the AC2 assertion, and the
   single most likely thing for a later corridor author to get wrong.
3. ⭐ **`ServiceRoute` is a second class, and `Route` stays a value
   object.** The plan put authored routes at `/stuff/idea/Route/<key>`;
   a template row's `class:` must resolve to a real module, and `Route`
   is deliberately not a Stuff (a per-request trip must mint nothing).
   So: a data `Idea` for the ROW an author writes, a value object for
   the VALUE a Journey travels, and `routeByKey` between them — which is
   AC15n from the other side.
4. **`FordExit` reads the water pack BY SHAPE**, never by import: the
   `AnalyzeWaterController` / `TravelNode` idiom. An install with no
   water pack has a ford that is simply always passable, and `transport`
   owes `water` nothing for one crossing. It refreshes on the
   catalogue's own six-game-hour weather segment, so a ford and
   `measure` cannot disagree about the same water at the same moment.
5. **The census learned the way fields.** `seeds`, `edges.from/to`,
   `nodes`, `stops` and `operator` are template paths, so `refsOf` reads
   them rather than joining `IGNORED_PATH_FIELDS` — *a lane naming a room
   that does not exist is a road that compiles empty*. It earned its
   keep immediately: it caught `/world/terminus/terminal/hall` (the real
   row is `…/terminal/location/hall`) in the TPA lane.
6. **Addresses: the Delight road is off-grid on purpose.** Its rooms sit
   under `terminus/delight-valley/…`, which no `Locality` claims, so
   `AddressApi.coverageChainOf` returns an empty chain — D20's
   *"banditry lives in jurisdictional gaps"*, derivable today and
   authored rather than asserted. The Kestrel road is Rejection's
   (`terminus/rejection/road/…`) and the estuary is the city's
   waterfront. One corridor covered, one not, which is the contrast.
7. **Corridor zones declare no elevation**, on the shipped `valley-road`
   precedent, which says so in its own comment: a corridor climbing 35 m
   → 180 m carrying one number would be false at both ends, and the
   crossroads is where the road meets the valley's own ground.

**Surprise:** `pithead-yard` already had a `north` exit (to the claims
office), so the road out is `southwest`. YAML duplicate keys are a
**parse** failure, and `lint:instanceable` reported it as *"class: does
not resolve"* — which is the message you would chase for half an hour
before reading the second line.

⚠ Still open at W4, cleared by W5: the boot's *"pack 'transport' ships 6
class(es) no row of any installed pack names"* line. The rig, the barge
and the coach get their rows in W5.

---

## Wave W5 — The rungs of the cost surface: wagon, team, barge, coach

**Files**

- `packages/content/transport/content/system/transport/thing/{wagon,dray,sledge,barge,coach}.yaml`
  — rows over W3's classes. `wagon`: `draftFactor ~0.03`, real mass, a
  `Bulkable` interior for grain/ore, an **open** container (you see out).
  `coach`: `Sealable`, a lamp, `seating`. `barge`: `media` the water lane.
  `sledge`: `draftFactor ~0.35` (the second-variant probe — data, not a class).
- `packages/content/transport/content/archetypes/{haulage-rig,passenger-conveyance}.yaml`
  — `materializesOnto` the rig / coach row, `surveyScope: 'off-room'`.
- Draft-team rows (`HaulingCreature`) and their harness; the shipped
  `hitch <cart> to <mount>` path is the whole mechanism.
- `commandContributions` on each rig/vessel affording `journey`.
- Retail: the wagon and the barge on a Terminus counter, so a player can buy
  one. (⚠ *You cannot make one* — the wainwright gap, a stated non-goal.)
- ⭐⭐ **The entry rung** (D16, added at review). `generic-objects` ships a
  `handcart` row that is **placed nowhere and sold nowhere** — so today a
  new character has no rig at all, and AC15a fails silently. This wave
  fixes it: **a handcart stocked cheaply at Terminus**, priced so a
  character with starting funds can buy one. ⭐ Better still if the depot
  **lends a barrow against the job** — same content cost, better story,
  and it makes the depot the on-ramp rather than the shop.

**Tests**
A loaded wagon's end-to-end spine transit is in band and scales with load
(**AC9** — the band is 1.5–2 game hours, resolved at review); a passenger in
an **open** wagon perceives the road and one in a **sealed** coach does not,
via `MixinApi.isOpenContainer` alone (**AC8**); a passenger boards with `go
<coach>`, holds no engagement, and alights at a stop (**AC15o**); the
breakaway and terrain gates fire on an overloaded rig and at the pass;
`journey` is afforded aboard and not afforded ashore.
⚠ **The three `MobileMixin`-on-a-vessel unknowns from P4 are verified here**
and any surprise is surfaced before W6.

**Exit gate:** transport pack vitest + `test:near` + lints. A live drive:
buy a wagon, hitch a team, `journey to the crossroads`, watch it pass through
each room.

---

## Wave W6 — The trade: the carrier, the paper, the depot, `teamstering`

**Files** (`packages/content/trade-haulage/`)

- `pack.yaml` (`root: /trade/haulage`, group `haulage`, title
  `/trade/haulage`), the scaffold, the root `package.json` line.
- `src/idea/WaybillRegistry.ts` → `/trade/haulage/idea/WaybillRegistry` —
  the `WaterRightRegistry` shape. Validates and files a **bill of lading**
  (`what, how much, from, to, whose, declared value`, plus the route's legs
  for D18's traffic count) via `DocumentApi.saveAsBusiness`; files a
  **warehouse receipt**; owns the queries P10 surfaces.
- `src/idea/RateCardRegistry.ts` → `/trade/haulage/idea/RateCardRegistry` —
  publish and read a card (`route × weight × commodity → charge`).
  **Readable by a non-employee** — the antitrust arc needs a table, not an
  accusation — and **settable** by the carrier.
- `src/lib/haulage/ShipmentDesk.ts` — the mixin the depot counter
  composes: it accepts goods for carriage and files the waybill.
- `src/idea/cmd/haulage/ShipController.ts` +
  `content/trade/haulage/cmd/haulage/ship.yaml` — **`ship <goods> to
  <destination>`** (P9), a new `haulage` category, afforded by the depot
  counter's own `commandContributions`.
- `src/thing/DepotCounter.ts` — `ShipmentDeskMixin(AttendantMixin(Vessel))`;
  the shipped attendant queue **is** the counter.
- `src/thing/Warehouse.ts` — the bailee store; issuing a receipt is a
  method on it (verbs go on objects).
- `src/thing/BearerReceipt.ts` — ⭐ **a Thing you can steal.** The
  registered receipt is a record with no Thing at all; the credential
  bearer/registered split, reused.
- `src/idea/cmd/perception/{MeasurePassageController,AnalyzeLoadController}.ts`
  + stanzas added to the platform's `measure.yaml` / `analyze.yaml` (the
  trade-mining precedent, ⚠-commented for a haulage-less install).
- `content/trade/haulage/idea/Discipline/teamstering.yaml` —
  `channel: skill`, an ISCED-F code, `conferrals: []`. ⚠ **Draft animals ride
  it**: freight-slate's *"husbandry (existing)"* is an error — all 46 shipped
  Disciplines were checked and animal handling is not among them.
- `content/trade/haulage/idea/{carrier-business,depot-business}.yaml`,
  `content/trade/haulage/agent/{carter,warehouseman,dispatcher}.yaml`,
  `content/archetypes/{depot,livery}.yaml` (⚠ the `livery` **archetype file
  ships; the content does not** — ranching brings the stable).
- Depot content in **`terminus`** (the depot itself is a place): the
  Terminus depot beside Wharfside, and the crossroads **site** (a yard, a
  ditch, no building) from W4.

#### ⚠ Two decisions this wave must make (deferred here at review)

Neither blocks earlier waves; both are due before W6 closes.

1. **How is a rate card read?** AC12 requires a **non-employee** to read
   a published card, and no surface is specified. `house` is your own
   business's books, so it is the wrong verb. Candidates: a **board or
   sign at the depot** (content, no verb), a `read` on the Document, or a
   stanza on an existing perception verb. ⚠ Without a surface AC12 is
   untestable and D9's *"rates must be visible, because rate
   discrimination is the antitrust arc's evidence"* has nothing behind
   it.
2. **How do the two pricing mechanisms coexist?** The **gig board** has
   the *poster* set a reward (a reverse auction); the **rate card** has
   the *carrier* post a price. Both are real and historical, and the
   recommendation is that **both exist and apply to different acts** —
   you either tender to a common carrier at their counter (card) or hire
   somebody directly (gig). ⚠ Say so explicitly, or a later reader will
   try to unify them.

**The teamstering split** (D15, and the constraint that no conferral makes
the same act better):
- **information** — `measure passage` and `analyze load` read
  `AdvancementApi.bandFor` and return a **narrower** answer at a higher band
  (the geology error-bar precedent). Same rig, same road, **same journey
  time**.
- **capability** — `hitch <cart> to <team>` band-gates on **team size**
  (the magic `requiredBand` precedent — *competence is access*). A
  single-horse cart is **band 0**, because ⭐ band 0 must be able to earn.
- The Competence scalar never crosses the Api boundary and no teamstering
  number is ever shown or stored.

**Tests**
`ship <goods> to <destination>` produces a bill of lading with all six fields; the
goods are in the carrier's vehicle and the shipper is not (**AC10**); a
**bearer** receipt can be taken from its holder and a **registered** one
cannot (**AC11**); a non-employee reads a published rate card and two
different rates on one route are distinguishable in the record (**AC12**);
a haulage gig completes, pays escrow and leaves chain-of-title correct at
both ends (**AC13**); an NPC carrier moves goods on `hauls` with no player
present, **using the same `Journey` object** (**AC14**); a character with
**no transcript at all** takes a haul gig, completes it and is paid
(**AC15a**); practising appends `teamstering` rows and crossing a band
confers the bigger rig, with the scalar never surfaced (**AC15b**); a
competent teamster's readouts are richer than a novice's for the same rig on
the same road **and the journey takes the same time** (**AC15c**); a depot's
records cover every consignment it handled and no others (**AC17**).

⚠ **Sweep item, not a build item:** the new **`haulage` command category**
needs its line in CLAUDE.md's category list. CLAUDE.md is a swept index
file per the worktree rules — leave it to `/finalize`, do not race it.

**Exit gate:** trade-haulage vitest + transport vitest + `test:near` + the
full lint family; fresh-DB boot installs **38 packs**. ⚠ **`requiresWizard`
appears nowhere** — the warehouseman
and the dispatcher are **seats**; if a stand-in seems needed, that is a
missing seat and gets filed as a finding, never a wizard check.

---

## Wave W7 — The labor market: post first, NPC covers the residual

**Lands:** D16 and D17 — the build's second purpose, and the pattern every
NPC-run sector will reuse.

**Files**

- `packages/server/src/mud/lib/behavior/{consigns,restocks}.ts` — the
  **posting** half only (the travel rewrite is W8). Each beat, a shortfall
  or a stock surplus becomes `job post <crate> to <destination> for <reward>
  --from <here> --expires <window>` on the nearest board. Bounded loops,
  `get 1 <kw>` never bare, the whole shipped guard set inherited verbatim.
- `packages/content/trade-haulage/src/behavior/hauls.ts` →
  `/trade/haulage/behavior/hauls` (the farming post-checkpoint ruling: pack
  brains, not kernel). Each beat: list open gigs whose `origin` or
  `destination` it serves; **skip any gig still inside its window**; for an
  expired-unclaimed gig, do the work directly — load, `journey to`, unload,
  file the bill of lading. It does **not** claim (which dodges contract.md's
  deferred "NPC claiming brains" seam entirely).
- ⚠ **The NPC's rate ships as authored data with a comment saying so** —
  `content/trade/haulage/idea/npc-rate.yaml` or a `data` block on the
  carrier business, never a constant somebody picked. ⭐⭐ It is the
  reservation wage for the realm's first labor market: a player cannot
  charge more than the NPC costs and need not accept less.
- `jobs --origin here` from W2 is the backhaul surface (D17): a hauler
  standing in Rejection lists what wants moving to Terminus.
- ⭐⭐ **Gig sizing (D16's entry rung).** The posting brains size a
  shortfall into **at least one class that fits a back (~20 kg) or a
  barrow**, not only wagonloads. Otherwise band 0 cannot take any job and
  the labor market has no first rung.
- ⭐⭐ **A fulfilled gig files a bill of lading** (D7, added at review).
  `ContractApi`'s completion path notifies `WaybillRegistry`, so **the
  player gig, the NPC brain and `ship` at a counter all file the same
  paper.** ⚠ Without this the reporting spine (D12/D18, AC16/16a/17) is
  blind to the *dominant* carriage path, and the gap surfaces at W9.

**Tests**
A venue's supply need appears as a gig **before** any NPC acts on it,
carrying origin, destination and a window (**AC15d**); a player who takes it
and delivers is paid **and the NPC does not also perform it** (**AC15e**); a
gig whose window expires unclaimed is performed by the NPC and the venue is
stocked either way (**AC15f**); a hauler at the far end lists gigs whose
**origin** is where they stand (**AC15g**); ⭐ a **player-claimed gig,
delivered, files a bill of lading** indistinguishable in kind from the
`ship` path's (**AC15p**); at least one posted gig class completes **on a
back or a barrow** with no wagon and no team (**AC15q**); ⚠ a
**taken-and-failed** gig
breaches, reopens, and the venue is still covered on the next window — the
named risk, tested rather than discovered.

**Exit gate:** the brains' source-shape tests (bounded, literal, `get 1`) +
a fixture-world behavior test + `test:near` + lints. **The old teleport
loops still run**; nothing has switched over yet.

---

## Wave W8 — ⚠⚠ The forcing function: the switchover (atomic)

The highest-risk wave. It is one wave because no half-state may ship: the
day the brains stop teleporting is the day the road has to carry the
economy.

**Files**

- **The doors** (P2): a new `packages/content/terminus/content/world/terminus/goods-yards/*.yaml`
  room off Wharfside, and **one exit pair each** added to
  `bottling-floor`, `brewing-floor`, `crowsfoot-floor`, `hollis-floor`,
  `veshko-yard`, `vintner-floor`, `pantry-floor` — replacing each *"No
  exits: the hand teleports"* comment with the reason it now has one.
- **The brains**: every `hand.teleport(...)` call removed from
  `consigns.ts` and `restocks.ts`. The hand consigns at its own door; the
  keeper receives at hers. The `finally { teleport home }` guard goes with
  them.
- **The Lounge lane**: `/stuff/idea/Lane/tpa` gains the lounge node; the
  `hauls` brain's route to the lounge bar resolves over it — zero stops,
  zero duration, **and no `teleport` call in any brain**.
- ⚠⚠ **The retune** (D11 mandates it — *"par levels, batch sizes and cadence
  are retuned as part of this decision, not left to discovery"*):
  the lounge's 14 `parLines` get **higher `level`s** (roughly `level ×
  cadenceGameHours / windowGameHours`, so a par covers a full haul cycle plus
  the gig window), the producer `batch` sizes rise to a crate rather than
  six loose goods, and both cadences slow. **A bar that cannot restock
  because the road is slower than the drinking is a regression, not a
  lesson.**
- The `distribution` cash-and-carry becomes the mainland **origin** for
  venue gigs and the **destination** for producer gigs — it is already
  where every producer consigns and every venue buys.

**Tests**
⭐ `consigns` and `restocks` complete their loops with **zero `teleport`
calls** — asserted structurally (no `teleport` in either source) *and*
behaviourally (a spy on `Mobile.teleport` records none during a full beat
cycle) — and **Dave's Bar and the distributor's counter are still stocked
after a long unattended run** (**AC15**). The long-run test is a
compressed-clock fixture run over many cycles asserting no par line ever
goes to zero.
The hearthworks / libations / retail tripwire suites stay green.

**Exit gate:** every touched pack's vitest + `test:near` + the full lint
family + a **fresh-DB boot with a long unattended run at a compressed
clock** (the farming precedent: `world_state` scale ~6000×; above ~10000×
the schedulers starve the event loop). ⚠ If the loops do not close, the
retune is the dial — not a revert.

---

## Wave W9 — Road character, reporting, docs, drives, finalize runway

**Files**

- `packages/content/transport/content/archetypes/corridor.yaml` finalised
  against the built corridors; the two corridors given the **same total
  duration** but different room counts and edge lengths — one lonely, one
  busy (**AC15h**).
- `WaybillRegistry`'s query face + the `house freight` / `house traffic`
  stanzas (P10): ⭐ **edge traffic is derivable from bills of lading and no
  traffic counter is stored anywhere** (**AC16a**).
- `docs/subsystems/logistics.md` (new) — the lane/Route substrate, the
  Journey, the paper, the depot, the labor-market pattern, and the two
  ⚠ constraints that must never be retrofitted away. ⚠ The CLAUDE.md
  documentation-map line is a **sweep** item, left to `/finalize` per the
  worktree index-file rule (**AC19**).
- `docs/subsystems/{conveyance,activity,contract,document-store}.md` and the
  archetype-bearing docs — grown, never blurb-edited.
- `e2e/tests/drive-logistics.spec.ts` — **AC22, the live drive**: consign at
  Terminus, haul to the crossroads, break bulk, carry over the pass, deliver
  at Rejection, read the paper.

**Exit gate:** the finalize runway — the source-change check
(`git status --short | grep -vE '^.. (docs/|CLAUDE\.md|.*\.md$|packages/content/)'`),
**ONE full `pnpm test`**, the full lint family, push, and stop for the
user's MR review. `/finalize` is its own phase.

---

## File-and-class inventory

Every new class, with its branch folder, its pack root, and why — per the
five namespace axes and D13's system-vs-trade split.

### `transport` — a **system** pack, root `/system/transport`

*The `/system/` test: a system is true whether or not anyone is
participating in it. Roads and rivers exist with nobody employed by them.*

| file | template path | branch | why here |
|---|---|---|---|
| `src/idea/Lane.ts` | `/system/transport/idea/Lane` | `idea` | a data Idea, never live Stuff — the `Watercourse` shape. Instanceable (rows name it) ⇒ a branch folder, not `lib/`. |
| `src/idea/LaneCatalogue.ts` | `/system/transport/idea/LaneCatalogue` | `idea` | the compiled realm graph; a singleton Idea. **The verbs live here**, which is why the pack needs no Api. |
| `src/lib/journey/Route.ts` | *(none)* | pack `lib/` | a value object, never template-backed ⇒ `lib/`, the `Light`/`Quantity` category. Does **not** start `/lib/`, so the headline invariant never fires. |
| `src/lib/journey/Journey.ts` | *(none)* | pack `lib/` | an engagement class — instanced but never stamped, the `AttendanceEngagement` placement. |
| `src/lib/journey/abort-reasons.ts` | *(none)* | pack `lib/` | the declaration-merge home the framework names. |
| `src/thing/HaulageRig.ts` | `/system/transport/thing/HaulageRig` | `thing` | instanceable; the wagon/dray/sledge rows name it. |
| `src/thing/Barge.ts` | `/system/transport/thing/Barge` | `thing` | instanceable. |
| `src/thing/Coach.ts` | `/system/transport/thing/Coach` | `thing` | instanceable; ⭐ **the `ExitableVessel` consumer CLAUDE.md records as deferred.** |
| `src/idea/cmd/movement/JourneyController.ts` | `/system/transport/idea/cmd/movement/JourneyController` | `idea/cmd/` | a controller is an `Idea` at `<root>/idea/cmd/<category>/`. |
| `content/system/transport/cmd/movement/journey.yaml` | `/system/transport/cmd/movement/journey` | content | the view side; `<root>/cmd/<category>/<verb>`. |
| `content/archetypes/{corridor,haulage-rig,passenger-conveyance}.yaml` | — | document | the `archetype` kind; these three describe **systems** (a way, a rig, a carriage). |

### `trade-haulage` — a **trade** pack, root `/trade/haulage`

*Practised by somebody, and quittable.*

| file | template path | branch | why here |
|---|---|---|---|
| `src/idea/WaybillRegistry.ts` | `/trade/haulage/idea/WaybillRegistry` | `idea` | the `WaterRightRegistry` shape — validate, then `DocumentApi.saveAsBusiness`. |
| `src/idea/RateCardRegistry.ts` | `/trade/haulage/idea/RateCardRegistry` | `idea` | same shape; a carrier's prices are the carrier's. |
| `src/lib/haulage/ShipmentDesk.ts` | *(none)* | pack `lib/` | a mixin ⇒ `lib/<subsystem>/`, no `Mixin` suffix in the filename. |
| `src/thing/DepotCounter.ts` | `/trade/haulage/thing/DepotCounter` | `thing` | instanceable fixture. |
| `src/thing/Warehouse.ts` | `/trade/haulage/thing/Warehouse` | `thing` | instanceable; the bailee. |
| `src/thing/BearerReceipt.ts` | `/trade/haulage/thing/BearerReceipt` | `thing` | ⭐ a document of title that is a **Thing** you can steal. |
| `src/behavior/hauls.ts` | `/trade/haulage/behavior/hauls` | `behavior/` | a pack brain; sole export `export const brain = class {…}`. |
| `src/idea/cmd/haulage/ShipController.ts` | `/trade/haulage/idea/cmd/haulage/ShipController` | `idea/cmd/` | ⭐ **`ship <goods> to <destination>`** — the pack's own verb in its own `haulage` category (P9). |
| `src/idea/cmd/perception/{MeasurePassage,AnalyzeLoad}Controller.ts` | `/trade/haulage/idea/cmd/perception/…` | `idea/cmd/` | the instrumentation split — **stanzas on shipped views, not new verbs.** |
| `content/trade/haulage/idea/Discipline/teamstering.yaml` | — | content | *a discipline row ships with the pack whose code teaches its key.* |
| `content/archetypes/{depot,livery}.yaml` | — | document | premises archetypes; the `livery` **file** ships, its content does not. |

### Kernel edits (no new kernel classes)

`lib/boundary/Exit.ts` · `lib/spatial/Mobile.ts` ·
`lib/document/DocumentKinds.ts` · `api/document.ts` +
`platform/idea/api/DocumentLogic.ts` · `lib/employment/Contract*.ts` +
`api/contract.ts` + `platform/idea/api/ContractLogic.ts` ·
`lib/archetype/Archetype.ts` ·
`platform/idea/cmd/perception/SurveyController.ts` ·
`platform/idea/cmd/movement/TeleportController.ts` ·
`platform/idea/cmd/author/GotoController.ts` ·
`platform/idea/cmd/work/JobController.ts` ·
`lib/behavior/{consigns,restocks}.ts`.

**Zero new Apis, zero new logic singletons, zero new kernel list edits, zero
new Mongo collections.**

### Commons rows (the realm's, not a pack's)

`packages/content/world-seed/content/stuff/idea/Lane/{spine,estuary,tpa}.yaml`
and `.../Route/{spine-local,spine-express}.yaml` — beside `Watercourse/kestrel.yaml`,
under the platform pack's `/stuff` claim, **for the same reason**: a lane is
a fact about somebody's realm and the realm's own pack has to be able to
edit it.

---

## Acceptance-criteria coverage

| criteria | wave |
|---|---|
| 1–4 the realm is contiguous | W4 |
| 5–7 the journey, the abort taxonomy, the hands | W3 |
| 8 open vs sealed perception | W5 |
| 9 loaded transit time | W3 (mechanism), W5 (numbers) |
| 10–13 the paper, the receipt, the card, the gig | W6 |
| 14 the `hauls` brain on the same Journey | W6 |
| **15 the forcing function** | **W8** |
| 15a–15c band 0 earns; the discipline; the readouts | W6 |
| 15d–15g, 15p, 15q the labor market, the backhaul, the paper on the gig path, the entry rung | W7 (15q's rig content: W5) |
| 15h–15j road character, the ford, land use | W4, W9 |
| 15k–15m archetypes | W2 (substrate), W4/W5/W6 (content) |
| 15n–15o computed routes, the passenger | W3, W5 |
| 16, 16a, 17 reporting | W9 |
| 18 the teleport defect | W1 |
| 19–22 docs, lints, no new collection, the live drive | W2 (21), W9 |

---

## ⚠ The hard parts, named

**1. The brains, the islands and the Lounge (P2).** The requirements'
forcing function collides with two shipped facts and one of its own
non-goals. The recommended answer — *the brains stop travelling, and the
Lounge rides the TPA lane* — is better design than the literal reading and
an order of magnitude cheaper; but it is a **reinterpretation of D11**, and
the reviewer should look at it first. Rejected alternative: siting seven
outfits on real streets, which is a locality build wearing this build's
name, and which still cannot reach the Lounge.

**2. `MobileMixin` on a non-Character host (P4).** One composer in the whole
codebase for the mixin the vehicle design depends on. Containment
constraints, residency eviction and arrival narration have all only ever
seen a Character. Mitigated by W3 proving the Journey on fixtures before any
vehicle exists, and by W5 verifying all three unknowns behind its own gate.
Rejected alternative: moving vehicles with a bespoke mover — which would be
the *second movement implementation* AC5 exists to forbid.

**3. The retune (W8).** D11 names it and no number in the requirements
constrains it. Par levels, batch sizes and both cadences change at once,
against a live economy nobody is watching. Mitigated by the compressed-clock
long-run test being an **exit gate**, not an afterthought. Rejected
alternative: shipping the rewrite and tuning on discovery — which is exactly
the regression D11 forbids.

**4. The pass on the spine (P11).** Recommended because it makes the
crossroads depot economically necessary instead of decorative. Rejected
alternative: a wheels-refused spur, which is one line cheaper and hollows
out AC2.

**5. Two archetype fields, not one (P6).** A deviation from D19's "one
substrate change," taken because the alternative degrades `survey` for every
player in the game.

**6. `saveAsBusiness` (P7).** A second ownership bypass in `DocumentLogic`.
Narrow by construction — derived owner, constrained path, closed kind
allowlist — and it should be reviewed against `saveRelease`'s three rails
one at a time.

**7. ~~`consign --to` in the kernel controller~~ — RESOLVED at review.**
D8's "no new verb" clause was withdrawn; carriage ships as **`ship`** in
`trade-haulage` (P9, revised). The decisive argument was not tidiness but
that the overload **forecloses ship-and-sell-there**, which is the
transport spread the build exists to create. This removed a kernel edit
rather than adding one.

---

## ✅ Questions for the user — ALL RESOLVED AT REVIEW (2026-09-03)

⚠ **Nothing in this section is open.** It is kept as the record of what
was asked and answered; a build agent needs no decision from it.

| # | question | resolved |
|---|---|---|
| **1** | AC9 said "6–12 game hours", contradicting D5's ~90 game minutes | ✅ **AC9 rewritten** to 1.5–2 game hours (7.5–10 real min); D5's table governs |
| **2** | D11's forcing function vs the Lounge non-goal | ✅ **P2 adopted into D11**: the brains stop *travelling*, not just teleporting; the Lounge leg rides the TPA lane |
| **3** | AC16 said "MQL"; MQL cannot see documents | ✅ **D12 and AC16 reworded** to "a query"; the queries live on `WaybillRegistry`, surfaced as `house freight` / `house traffic` |
| **4a** | the corridor room budget | ✅ **kept as planned** (§ W4) |
| **4b** | the `journey` verb name | ✅ **kept as planned** (P5) |

Two further changes landed at review and are already folded into the
decisions above — do not re-derive them:

- **P9 was rewritten.** D8's *"no new verb"* clause was **withdrawn**;
  carriage ships as **`ship <goods> to <destination>`** in
  `trade-haulage`, in its own `haulage` category. Retail's `consign` is
  untouched, which **removed** a kernel edit from W2.
  ⚠ There is **no closed command-category list in code** (help derives
  categories), so `haulage` needs only its CLAUDE.md prose line — a
  `/finalize` sweep item, not a build item.
- **D8 was narrowed.** Only **handling** ships as a product. Storage is a
  receipt and a bailee's duty, **not a priced scarce good** — discrete
  containment has no capacity in this engine (capacity is a property of a
  *bearer's body*, and a warehouse has no bearer). Warehousing is a
  non-goal; its design is captured in the slate's § *Warehousing*, and
  the metric when it lands is **mass**.

