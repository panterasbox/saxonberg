# Slate-compaction pass — holding batch ledger

Five slates. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `holding.md` ·
`residence.md` (`residence.md` needed nothing). Line numbers below are
the ORIGINAL file's. Originals saved under the scratch dir
`holding/orig/` for diffing. Code was verified in
`packages/content/eternal-university/**`, `packages/content/residence/**`,
`packages/content/terminus/**`, `packages/server/src/mud/lib/parcel/**`,
`platform/idea/ParcelRegistry.ts`, `platform/idea/cmd/civics/TitleController.ts`.

Batch-wide findings a reviewer should know first:

1. **One status-block claim was false on arrival.** eternal-university's
   canonical block listed *"the elevator"* among what Duncan Hall shipped.
   There is no elevator anywhere in the tree (`grep -rli elevator` over
   the three packs + the kernel is empty); vertical circulation is the
   `FloorStairExit` stairwell, and `residence.md § Deferred seams` lists
   *a real elevator* as an attach point. Re-stamped to *the stairwell*;
   the elevator moved to `Left`.
2. **One graduation, into `holding.md § The ascent gate` (15 lines).**
   `TitleController.ascentRefusal` reads `ParcelApi.heldUnitsOf(buyer)`,
   which is *every unit the holder has a live use-grant on*
   (`ParcelRegistry.ts:539-551` — leases). So a LET unit's condition
   gates the buy: the tenancy pack's *landlord reference* incentive and
   its Open Q1 are shipped, and the stewardship slate's *money necessary,
   condition binding / obligations are the cap* claim is the same read.
   `holding.md` stated the read but not what it decides; inserted after
   *"a statement about upkeep, not about money."*
3. ⚠ **A shipped decision contradicts two kept designs, and both are
   flagged Uncertain rather than cut.** The residence-ladder pack's Part 1
   says property condition is *"Law-2-clean by construction — a home you
   leave does not fall apart"*; the shipped shell clock weathers **on the
   passage of days** (`holding.md § Condition`: 45 game-days sound→worn,
   *"honest across a holding sleeping for a month"*). The stewardship
   slate's Premises names *"the parcel tax (property Phase 1)"*, which
   `docs/stewardship-doctrine.md § The recurring-charge call` bans
   outright. Requirements must reconcile both; neither is mine to decide.
4. ⚠ **A code gap the grep surfaced, flagged not fixed.** `heldUnitsOf`
   is grants only (`ParcelRecord.hasActiveGrant`), and `title buy`
   transfers title without minting a grant (`TitleController.ts:373`), so
   an OWNED house's condition is never read at a second purchase or a
   lease — `holding.md § The ascent gate`'s existing *"every residential
   holding the actor already has"* overstates it. I did not edit that
   sentence; my insert says the read is grants and names the gap in a
   ⚠ line. Whether that is a bug or the intended shape (you have kept a
   house; the rung above the house is the smallholding, gated elsewhere)
   is a requirements call — `residence-ladder`'s rungs 4–5 gates.
5. **The retired `spoilage-design-pack` link** in residence-ladder was
   retargeted to `docs/subsystems/spoilage.md` (the See-also line); the
   other reference to it sat in the stale second status block, which was
   cut.

---

## docs/slates/tails/dorm-warren-slate.md — 312 → 247 · Status PARTIAL → PARTIAL

The dorm shipped (residences build) but the slate's *faculty* — a
mixin-field editor filtered by tier, a cross-mixin field-bundle theme, a
per-player document — did not: what shipped is a **prose-only** theme
overlay by **vocation**, applied through a `PROSE_SETTERS` allowlist onto
real fixture Stuff and sealed by the persistence spine
(`src/duncan-hall/idea/DormThemes.ts`, `src/duncan-hall/dorm-themes.yaml`
— `miner · farmer · nautical · merchant · medic · military · scholar`;
`residence.md § The shell personalization`). No roommate: one leaseholder
per unit (`ProvisionController` refuses a double-provision; `UseGrant`
is single-holder). No `editable:` policy, no `dorm-room@1` document
anywhere in `packages/`.

### Cut (SHIPPED · DOCUMENTED)
- the second status blockquote *"Status: slate / pre-requirements. A future build…"* (11–18, 8) — history
- the *"Why 'Warren'"* paragraph (20–24, 5) — code: `src/duncan-hall/idea/DormWarren.ts`, `agent/Katie.ts`; doc: `residence.md § The elastic building — DormWarren`, `§ Provisioning + the stored slot` (Katie fronts `provision`)
- `## The faculty` → bullet 1 *Uniform `DormRoom` template, Warren-budded via Katie's manifest* (59, 1) — same code/doc; one-line pointer left

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none

### Superseded — cut
- `## The faculty` → bullet 5 *Storage = hybrid (the document-tree decision)* (70–76, 7) — by the code: rooms persist through the `(scope, key)` spine into `holder_snapshots` (`lib/persistence/Persistable.ts`, `PersistableApi.restoreOrSeed`) → `residence.md § D1`. Pointer left
- `### The theme roster (the launch set)` → intro + the seven-genre table + *Unlock — Weird* (104–122, 19) — by the code: the vocation set, per ROOM, from Katie's dialogue; `residence.md § The shell personalization` says in terms *"Genres — sci-fi / horror / … — are the holodeck's job"*. Heading + note left; the *community-authored themes* paragraph (124–127) KEPT (see Uncertain)
- `### The code` → the `/lib/dorm/Bed` row, the `/world/eu/theme/fantasy` bundle, the `/home/p-8f2a/dorm-room` document (180–224, 45) — by the code: `content/world/eternal/duncan-hall/thing/bed.yaml` + `src/duncan-hall/thing/Bed.ts` (a real Stuff, `Postured → Slotted → Surfaced`), `dorm-themes.yaml` (prose by fixture role), `holder_snapshots`. Note left; the `editable:` tier-filter block + the *End to end* paragraph KEPT
- `## Open decisions` → #2 *the genre/theme roster — resolved: seven-register set + Weird* (259–261, 3) — by the vocation set → `residence.md § The shell personalization`. One-line note left
- `## Dependencies & deferrals` → *The document tree — decided 2026-06-27* (285–288, 4) — by D1 (above). Note left
- `## Dependencies & deferrals` → *The private-housing + sandbox tiers — deferred* (294–296, 3) — by the code: the let unit at Seznick House (`holding.md` ladder table) and the holodeck (`sandbox.md`). Note left; the biome bloom + the filter widening stay this slate's

### Kept (UNBUILT)
- `## The reframe: two rooms, one system, two states` (the sealed room — `docs/staging/eternal-university/experiences/sealed-room.md` is staging, no code)
- `## The big idea: the dorm room is the first rung of the authoring ladder` (the CMS-inspectable rung)
- `## The faculty` → bullets 2–4 (two expression-slots · the mixin-field filter · CMS-inspectable)
- `## How customization works` → the intro + the three pieces (see Uncertain)
- `### The theme roster` → the *community-authored themes* paragraph
- `### The field-value sources` (theme > soul > roots > you; the four figures — no trait-derived room defaults, no proc-gen roommate anywhere)
- `### The tier filter = the housing ladder` (see Uncertain)
- `### The code` → the `editable:` policy + *End to end*
- `## Open decisions / dials` #1, 3–8 (see Uncertain for #8)
- `## Dependencies & deferrals` (the remaining bullets) · `## Cross-references`

### Doctrine — kept, labelled
- `## The thematic payoff (keep it in view)` — the who-counts-made-domestic thesis; not a backlog item

### Uncertain — kept
- `## How customization works` → *"An object's editable schema is derived from its composed mixins… The CMS schema-driven editor reads exactly that"* — half shipped in a different place: `studio.md` (`describeClass`/blueprints, the `@authorable` schema) IS a mixin-derived editable schema; the dorm **tier filter** over it has no code. Kept whole because the filter is the slate's subject
- `## How customization works` → *"A theme is a cross-mixin field-bundle … not 'prose'"* — CONTRADICTED by a shipped decision: `residence.md § The shell personalization` — *"prose-only, function fixed"*; `DormThemes.applyTo` throws `DormThemeError` on a non-prose field (the code-trust boundary). Material/light/scent in a theme would cross it. Requirements reconcile
- `### The theme roster` → *community-authored themes* paragraph — premised on themes being field-bundles (above) and closes with *"These seven (+ Weird) are the launch definitive set"*, which is false; the community-theme idea itself is nowhere else. Kept whole (one paragraph)
- `### The tier filter = the housing ladder` — the RUNGS shipped as Granted / Let / Owned (`holding.md` table; Seznick House, Hinkley Hills), the customization-power ladder did not: `remodel` is dorm-only (`holding.md § Deferred seams`: *remodel — generalized to a holding*), no `Atmospheric`/biome per holding, no per-tier filter. Kept as the unbuilt half; its tier names are stale
- `## Open decisions` #8 *the private-housing tier as the next build* — the tier shipped (the let rung) without the room-level customization it names. Kept for the customization half
- Overlaps for the cluster pass: the roommate half ↔ `eternal-university-slate` (Rooms, roommates) + `eternal-university-narrative-slate` §17.H; the compute-quota rung ↔ `property-slate` Phase 1; custom prose ↔ `residence.md § Deferred`

### Handoff
- none

### Status block
- Status line: *the theme overlay* → *the vocation theme overlay + `remodel`*
- Left: *the bounded mixin-field editor + the dorm tier filter · the CMS-inspectable lesson rung · the roommate NPC half + its trait tracking · hand-authored custom prose · the sealed/frozen room* → *the bounded mixin-field editor + the dorm tier filter · the CMS-inspectable lesson rung · the roommate NPC half (the two expression-slots, the soul/roots field sources, its trait tracking) · hand-authored custom prose · the sealed/frozen room · community-authored themes · the private tier's room-level customization (the biome bloom)* (the body wins: two open designs were unrepresented)
- Size: a wave → a wave (the editor rides the studio, the roommate rides the NPC pipeline; neither is its own cycle)

---

## docs/slates/tails/tenancy-design-pack.md — 302 → 285 · Status PARTIAL → PARTIAL

Nearly all UNBUILT: no room-condition events (`grep -rl "tidiness\|debris"`
over `src/mud` + pack `src/` finds no producer), no condition snapshot on
`UseGrant` (`lib/parcel/ParcelRecord.ts:98-99` — `grantedAt`, `expiresAt`
only), no deposit clause kind, no eviction verb (`revokeUse` exists;
`unprovision` is the dorm's), no rent leg (`terminus/src/mayfield-row/idea/
cmd/LeaseController.ts` never touches banking). What DID ship is the
reference incentive (batch finding 2) and the structure/contents split.

### Cut (SHIPPED · DOCUMENTED)
- the second status blockquote *"Status: design, planner-ready, captured 2026-08-11…"* + *"It turns out to be nearly free"* (11–21, 11) — history; Part 0 states the gap and Part 2 the nearly-free claim in full
- `## Part 1 — The split already exists in the persistence model` → intro + the who-is-answerable table + *"The estate slice is the tenant's; the room is the landlord's"* (63–76, 14) — code: `UPKEEP_TERMS` (`residence/src/idea/HoldingWarren.ts:76`), owner-side placement (`furnishing`); doc: `holding.md § Terms — who OWES the upkeep` (`landlord-shell`: *the landlord keeps the shell; what you put in it is yours*), `§ Owned goods in a holding`. Pointer left; the *Habitability* paragraph KEPT
- `## Open questions` → Q1 *Does the ladder read a rented place's condition at all?* (283–286, 4) — resolved YES by code: `heldUnitsOf` = every live use-grant (`ParcelRegistry.ts:539-551`), read by `TitleController.ascentRefusal` (:475-503); doc: `holding.md § The ascent gate` (now, via batch finding 2). One-line pointer left

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- (the *landlord reference* — Part 3's middle row and Q1 — is the batch's one graduation into `holding.md § The ascent gate`; Part 3 itself is KEPT because two of its three rows are unbuilt)

### Superseded — cut
- none

### Kept (UNBUILT)
- `## Part 0 — The gap` (the rungs table's tenure names are stale — Granted/Let/Owned now — but the paragraph is the problem statement)
- `## Part 1` → *Habitability falls out of it* (no habitability claim exists)
- `## Part 2 — Attribution is the mechanism` (hard-blocked on room-condition)
- `## Part 3 — Why a tenant tends` (mixed table: comfort — `restQuality` ships, disease does not; the reference — SHIPPED; the deposit — unbuilt)
- `## Part 4 — The deposit` · `## Part 5 — Eviction` (the shelter is staging content, `docs/staging/diegetic-government.md`) · `## Part 6 — The commons, one scale up` · `## Part 7 — Designed to the format` (its *structure vs contents split — already modelled* row is the Part 1 cut) · `## Part 8 — Dangers` · `## Part 9 — Pedagogy`
- `## Open questions` Q2–Q5

### Uncertain — kept
- `## Part 5` → *"Law 2 bans rent on space you OWN. Rent on space you do not own is simply the price"* — a doctrine ruling with no code either way; `holding.md § Deferred seams` says *rent as a recurring charge — the contract substrate is where that belongs*. Consistent, not contradicted; kept as the design
- Overlaps for the cluster pass: attribution ↔ `room-condition-design-pack` (which owns the constraint); the commons at twenty ↔ `household-design-pack`; the deposit ↔ `contract.md`'s custodian rule + `courts-judiciary-primitive`; rent ↔ `residence-ladder` *Rent economics* seam + `stewardship-slate` *Premises*

### Handoff
- none

### Status block
- Status line: added *"and the landlord REFERENCE (a let unit's condition gates the buy)"*
- Left: *room-condition attribution `(actor, target, extent)` · the check-in condition snapshot at `grantedAt` · the deposit as a contract escrow leg · the eviction act · rent as a recurring money leg* → *… · the habitability claim · the eviction act (+ the shelter floor) · common parts as the landlord's obligation · rent as a recurring money leg* (the body wins: Parts 1 and 6 were unrepresented)
- Size: a wave → a wave

---

## docs/slates/tails/residence-ladder-design-pack.md — 367 → 329 · Status PARTIAL → PARTIAL

The GATE shipped; the CONDITION the pack designed did not. Shipped
condition is `shellCondition` + `shellStamp` on the programme instance,
reconciled on read against game-days (`residence/src/idea/HoldingWarren.ts`,
`OuterWarren.conditionOf`; `holding.md § Condition`) — a stored clock, not
a derived aggregate over room condition / Durable wear / spoilage, none of
which feed it. No `StewardshipApi`, no `propertyCondition` symbol anywhere.
`ParcelRecord.allowance` is still `unknown | null` with no consumer
(`ParcelRecord.ts:193-194`, `ResidencyLogic.ts:254`). No Stewardship
Discipline row (`platform/idea/Discipline/agriculture.yaml` only mentions
*"stewardship's land care"* as a future child).

### Cut (SHIPPED · DOCUMENTED)
- the second status blockquote *"Status: design, planner-ready, captured 2026-08-06…"* (13–19, 7) — history (it also carried the retired `spoilage-design-pack` link)
- `## Part 0` → the ⭐⭐⭐ *Money is necessary and not sufficient* quote (39–41, 3) — code: `TitleController.ascentRefusal` runs before `settle`; `LeaseController.ts:159` the same; doc: `holding.md § The ascent gate` (*"The rung above is earned by keeping the rung you have — a statement about upkeep, not about money"*). Pointer left
- `## Part 2` → *"The gate is two-part: money (necessary) + condition (binding)… a band threshold… read the moment you try to ascend"* (116–119, 4) — same code; doc: `holding.md § The ascent gate` (`residence.ascent.minCondition`, *naming the band*). Pointer left (shared with the Superseded note below)
- `## Deferred seams (salvaged)` → *The holodeck portal fixture* (325–328, 4) — code: `lib/sandbox/SandboxCrossingExit`, `/platform/thing/sandbox/wardrobe.yaml`; doc: `sandbox.md § The door, the aperture, the harness`
- `## Deferred seams (salvaged)` → *Owned homes (title, not lease)* (329–331, 3) — code: `TitleController` `title buy`, `PlatWarren`; doc: `holding.md` ladder table (Owned rung)
- `## Deferred seams (salvaged)` → *Pets as ownable `Creature` chattel* (332–334, 3) — code: `lib/creature/Creature.ts:134` (`ChattelMixin` composes outermost); doc: `chattel.md`. The three replaced by one pointer bullet

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `## Part 0` → *The ladder is about capability, not accumulation (the landlord reference)* + *Anti-hoarding falls out for free — the obligations ARE the cap* (43–52, 10) — code: `heldUnitsOf` reads EVERY live grant → inserted at `holding.md § The ascent gate` (15 lines: the read is every held unit; a let unit gates the buy; obligations are the cap; money necessary not sufficient; one universal threshold). Bullet 3 (*the payoff that makes every producer matter*) KEPT — the producers are unbuilt

### Superseded — cut
- `## Part 2` → *"The frontier path is unblocked; the city middle is not… build the frontier rungs first"* (121–127, 7) — by the code: the let rung (Seznick House, `BuildingWarren`) shipped with neither a region parcel nor the allowance meter (stewardship-slate's own 2026-08-31 re-verification says so; `holding.md` ladder table). Note left; dense suburbia remains blocked
- `## Critical files for implementation` (346–367, 22) — by the code: no `api/possession.ts` (it is `ChattelApi`), no `world/.../apartments/ApartmentBuilding` (it is `residence/src/idea/BuildingWarren.ts` + `HoldingWarren` + `FrontDoorExit`), no `ClaimController`/`GiveController`; the plan-tier artifact this was salvaged from is retired. Heading + pointer left → `holding.md § The four roles`, `§ The packaging`

### Kept (UNBUILT)
- `## Part 0` → intro + bullet 3
- `## Part 1 — Property condition: a derived read, Law-2-clean` — whole (see Uncertain — this is the batch's biggest contradiction)
- `## Part 2` → intro + the five-rung table (rungs 4–5's gates — *zoning available*, *stewardship band* — have no code: `TitleController` gates on condition only)
- `## Part 3 — Designed to the format` — whole (see Uncertain)
- `## Part 4 — The Stewardship Discipline` · `## Part 5 — The consequence ladder` (the only shipped consequence is the ascent refusal; nothing reads shell condition into `restQuality`, regard or renown) · `## Part 7 — Interop map` (its *the dorm ships; the apartment build is the next rung* clause is stale) · `## Part 8 — Forks settled, and the blockers` (see Uncertain)
- `## Open questions` Q1–Q5 (see Uncertain for Q1)
- `## ⭐ Deferred seams, salvaged` → the remaining six bullets (compute-as-energy loop · rent economics · prose-on-owned-items · co-lease · the owner-index cache · spatial-zone carve-outs — `holding.md § Deferred seams` names rent and remodel; none has code)

### Doctrine — kept, labelled
- `## Part 6 — Pedagogy: personal finance, property, and citizenship`

### Uncertain — kept
- ⚠ `## Part 1` — *"Law-2-clean by construction… a home you leave does not fall apart… never because time passed while you were away"* — CONTRADICTED by the shipped shell clock, which weathers **on the calendar** (`holding.md § Condition`: *"Stamp-forward… honest across a restart and across a holding sleeping for a month"*; § Two clocks: *a SHELL weathers on the passage of days; a GOOD wears only when you use it*). The shipped design made the shell the ONE thing that may weather in absence, and pinned goods against it; this pack's aggregate would freeze the shell too. Kept verbatim; requirements must reconcile (`Left` names it)
- `## Part 3` — *"5. Persisted fields. None new for condition (derived)"* is contradicted by the shipped `shellCondition` + `shellStamp`; row 2 (*the ascent gate*) is SHIPPED; *"7. Fault line: a near-term build once room-condition ships"* — the gate shipped WITHOUT room-condition. Kept whole because rows 1, 3, 4 are open and a table row is below paragraph granularity
- `## Part 8` → *Settled 1 (a derived read, not a stored gauge)* is contradicted by the shipped stored clock; *Settled 5 (frontier-first)* is superseded (above). Kept whole
- `## Open questions` Q1 *one universal threshold or per-rung?* — the code chose ONE (`residence.ascent.minCondition`), documented; the per-rung lean is a live refinement nobody ruled on. Kept
- Overlaps for the cluster pass: the Discipline ↔ `stewardship-slate § Stewardship — two things`; the consequence ladder ↔ `stewardship-slate` open question; rent economics ↔ `tenancy` + `stewardship § Premises`; the compute-as-energy loop ↔ `property-slate` Phase 1

### Handoff
- none

### Status block
- Status line: *the ascent gate* → *the two-part ascent gate (money necessary, condition binding, read over EVERY held unit)*
- Left: *room condition (dirt · debris · tidiness) as a producer · folding `Durable` wear and spoilage into `propertyCondition` · the Stewardship Discipline · the neglect consequence ladder · the allowance cascade, still an inert field* → *`propertyCondition` as a derived aggregate over room condition · Durable wear · spoilage — and its reconciliation with the shipped calendar shell clock · the smallholding + farm/ranch rungs' ascent gates · the Stewardship Discipline · the neglect consequence ladder · the premises money half (metered utilities) · the salvaged apartment seams (rent economics · prose-on-owned-items · co-lease · the owner-index cache · spatial carve-outs) · the blockers (region parcels · the allowance meter · a second city)* (the body wins; *room condition as a producer* belongs to `room-condition-design-pack`, here it is an input; the cascade is stewardship-slate's, here only the meter is a blocker)
- Size: a wave → a wave
- Link: See-also `[spoilage](./spoilage-design-pack.md)` → `[spoilage](../../subsystems/spoilage.md)` (the pack was retired; the coordinator asked for the retarget)

---

## docs/slates/builds/stewardship-slate.md — 482 → 401 · Status PARTIAL → PARTIAL

The **land-use enabler** and the **ladder** shipped out of this slate;
the **allowance cascade**, the **zoning authority**, **premises** and
the **Discipline** did not. Verified: `lib/parcel/LandUse.ts` (the closed
six; `CULTIVATION_SCALES` only — no head ceiling, no companion ceiling,
no leash law), `ParcelApi.landUseOf` (longest prefix), consumers
`PlantController` / `PlotController` / `subdivide` (the area band);
`ParcelRecord.allowance` inert (`:193-194`); no Government allocates
anything (`civics.md`: jurisdiction only); no `Discipline` row named
stewardship; no rent leg on `lease`; `title buy` gates on condition
only (rungs 4–5's *zoning available* / *stewardship band* gates absent).

### Cut (SHIPPED · DOCUMENTED)
- the *"⭐ PARTLY SHIPPED (2026-08-01)"* blockquote (10–18, 9) — restates the canonical block
- the *"Status: design captured 2026-07-31, not built"* paragraph (20–25, 6) — history; its framing (*the layer between title and the activity systems*) is `## The three layers`
- the *"Two things here are genuinely new. Land use… does not exist anywhere in the corpus today"* paragraph (27–32, 6) — false now: `LandUse.ts`, `smallholding.md § Land use`; the allowance half is restated in `## The allowance cascade`
- `## The three layers` → *"No new Api. Land use is a field on `ParcelRecord` and reads go through `ParcelApi`, on the same longest-prefix coverage walk"* (100–102, 3) — code: `api/parcel.ts` `landUseOf`, `ParcelRecord.ts:73,141`; doc: `parcel.md § Land use and area`. Pointer left (shared with the Superseded note)
- `### The vocabulary is closed` body (125–141, 17) — code: `LandUse.ts` `LAND_USES`; doc: `smallholding.md § Land use — the closed six, and it refuses` (carries the Module-Categories / Material-library analogy). Heading + pointer left
- `### A farm is ONE parcel` body (171–177, 7) — code: `trade-farming/src/idea/cmd/farming/PlotController.ts` (Σ areas against the parcel's yard; hung on the holding through `admitPlot`), `residence/src/idea/HoldingWarren.ts`; doc: `soil.md § plot`, `holding.md § The floorplan is the INITIAL mint`. Heading + pointer left
- `## The residence ladder` → the ✅ *"The residences build shipped rungs 1–3 and their gate"* paragraph (287–296, 10) — restates the canonical block; the *Still proposal* paragraph KEPT
- `## The residence ladder` → *"The property slate states the ladder twice and inconsistently… §L is the real one"* (301–304, 4) — history; `holding.md`'s ladder table is the real one now
- `## Where to start` → the two argument paragraphs *Land use is the smallest piece…* / *the blockers point at a build order* (423–434, 12) — history of an order that has since been executed (items 1–4)
- `## Where to start` → sequence items 1–4 ✅ (437–449, 13) — shipped; doc: `smallholding.md`, `holding.md`. Replaced by one pointer item; items 5–7 KEPT. ⚠ item 3's note *what did NOT ship: the Discipline* survives in the pointer and in `Left`

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `### The design claim` + *Anti-hoarding falls out for free* (313–326, 14) — code: `TitleController.ascentRefusal` over `heldUnitsOf` → the same `holding.md § The ascent gate` insert as residence-ladder Part 0 (one insert serves both slates). Heading + pointer left

### Superseded — cut
- `## The three layers` → *"The shape already exists in sketch — §L seam 3… riding `Zone.lookupField` inheritance"* (104–109, 6) — by the code: land use is a `ParcelRecord` field in the gated `parcels` collection, deliberately NOT on the zone (`LandUse.ts` module doc *"Where a use lives, and why not on the zone"*; `smallholding.md § It lives on the parcel row, never on the zone`). Folded into the pointer above
- `## Stewardship — two things` → *"This is entirely net-new. No decay-through-neglect exists anywhere today"* (350–352, 3) — by the code: the shell weathers on the calendar (`holding.md § Condition`). Note left
- `## Blockers` → *"No allocation procedure exists at all"* (414–415, 2) — by the code: `PlatBook` at an authored price, first come, the Terminus realty desk (`holding.md § The packaging`, `smallholding.md`); the slate's own 2026-08-31 box says so. Note left

### Kept (UNBUILT)
- the framing *"Stewardship is the player-facing name…"* · *See also*
- `## The three layers` → intro + the table (see Uncertain)
- `## Land use ⊕ allowance` → intro (the qualitative/quantitative halves — the allowance half has no meter)
- `### What a use declares, and who asks` (mixed table: farming's row shipped as `CULTIVATION_SCALES`; ranching's head ceiling, pets' companion ceiling and the leash law have no code — `LandUseSpec` is `cultivation` + `areaBand` + `summary`)
- `### The leash law` (no `ranging` public-space rule anywhere; `pets.md` does not mention land use)
- `## The allowance cascade [DECIDED 2026-07-31]` — whole (the two channels, the conservation rule, what it buys, the two checks, the guardrail)
- `## Who decides what` — whole
- `## The residence ladder` → *Still proposal* + the five-rung table (rungs 4–5's gates unbuilt)
- `## Stewardship — two things, not one` → the two bullets + the firewall + *Cheap to add* (see Uncertain)
- `## Premises` — whole (see Uncertain)
- `## Blockers` → the 2026-08-31 box + three bullets
- `## Where to start` → items 5–7
- `## Open questions` — all seven

### Doctrine — kept, labelled
- `## The doctrine line — zoning governs use, never self-expression` — the property slate's ruling applied; no subsystem doc states it (`grep -rn "self-expression"` over `docs/subsystems/` is empty). A candidate for `parcel.md`'s or `smallholding.md`'s *Why* — outside my list, so noted here rather than handed off as a graduation (nothing shipped to graduate)

### Uncertain — kept
- `## The three layers` table — row 2 *"Land use ⊕ allowance — absent — the core of this slate"* is half false (land use shipped); rows 3–4 hold. Kept because the table defines the layers `Left` names; a table row is below paragraph granularity
- `## Stewardship — two things` → *Property condition — derived state on the premises (obligations met vs missed)* — shipped in a DIFFERENT shape: a stored shell clock reconciled against game-days, restored by `maintain` (`holding.md § Condition`), not an obligations-met-vs-missed derivation; and *Cheap to add — none are agricultural* is stale (`platform/idea/Discipline/agriculture.yaml` exists). Kept for the Discipline half
- ⚠ `## Premises` → *"Tax. The parcel tax (property Phase 1) — the money-side sink"* — CONTRADICTED by `docs/stewardship-doctrine.md § The recurring-charge call` (rule 1 bans an ad-valorem holding tax) and by residence-ladder's Part 3 (*No parcel tax and no standing charge*). Kept verbatim; requirements must strike it or overturn the doctrine
- `## Premises` → *Upkeep / wear — the shipped `DurableMixin` wear economy, applied to a dwelling's fixtures* — goods in a holding DO carry `Durable` wear, but it is deliberately NOT part of the shell's condition (`holding.md § Two clocks, and they must never touch`). Kept
- `## Blockers` → *One city* — Terminus is the one city; Rejection and Hinkley Hills are localities under it. Still true as written
- Overlaps for the cluster pass: the cascade ↔ `property-slate` Phase 1/2 + `balance-slate`; the ranching/pets ceilings ↔ `ranching-slate` (paddock dial) + `pets-slate § Home range`; premises/utilities ↔ `power-utility-slate` + `tenancy` (rent); the Discipline ↔ `residence-ladder` Part 4

### Handoff
- none

### Status block
- Status line: *condition + the ascent gate* → *condition + the two-part ascent gate (read over every held unit)*; added `smallholding.md`
- Left: *premises + utilities (the lease's money leg) · the allowance meter · the cascade + the zoning authority · the Stewardship Discipline* → *premises + utilities (the lease's money leg) · the allowance meter · the cascade + the zoning authority (who decides · the two checks · Tiebout) · the ranching/pets land-use ceilings + the leash law · the smallholding + farm rungs' ascent gates · the Stewardship Discipline · condition's consequence ladder* (the body wins: three open sections were unrepresented)
- Size: a build → a build

---

## docs/slates/builds/eternal-university-slate.md — 602 → 510 · Status PARTIAL → PARTIAL

Mostly UNBUILT campus content, as briefed. The `eternal-university` pack
holds Duncan Hall (`steps · lobby · corridor · dormroom · cistern` rows,
`DormWarren` / `DormRoom` / `DormDoor` / `FloorStairExit` / `Katie`),
the campus farm + field, and nothing else — no arrival, Quad, registrar,
clinic, store or academic hall (`grep -rli "registrar\|health center\|
campus store\|outfitter\|academic hall\|the quad"` over every pack's
`content/` hits only Rejection's registrar and Terminus's registry). The
campus gate on University Avenue is a locked `Door` into a dead-end
gatehouse stub (`terminus/.../university-avenue/location/campus-gate.yaml`:
*"the real campus entry replaces it when EU content lands"*). No TPA node
in the lobby (`lobby.yaml` has no `TravelNode`; the network's rows are the
Terminus terminal + newbie-wilds). No elevator (batch finding 1).

### Cut (SHIPPED · DOCUMENTED)
- the second status blockquote *"Status: vision + v1 shape set; build it all together…"* (14–21, 8) — history; the framing paragraph at 23–29 and `## Principle` carry it
- `## The surround` → *"The city's name — leading candidate: Terminus (penciled in, not final)"* + *"Address — University Avenue"* + the *Naming note* (247–273, 27) — code: `packages/content/terminus/**`, `/world/terminus/university-avenue` + `campus-gate.yaml`, `Locality/eternal-campus.yaml` (`_address: terminus/city/campus`); doc: `holding.md § The packaging` (*"The avenue is a Terminus street… the campus is a district inside the city, and the gate is the boundary"*). Pointer left. ⚠ The address paragraph's *"the avenue fades into unrendered haze a block out"* is also stale — the Counting-Houses and the terminal are real
- `### Duncan Hall` → *What persists vs. regenerates* bullet 2 *Dynamic members: hallways, floors, stairs… regenerated deterministically from the roster, re-wiring each room's door to its stable address (floor / hall / position)* (358–362, 5) — code: `DormWarren.ensureFloor`, `Corridor`, `ParcelRecord.slotOfExtent` (`f<n>-r<p>`); doc: `residence.md § The elastic building`, `§ Reap` (*"the same slot set yields the same building shape"*), `§ Provisioning + the stored slot`. Bullet 1 KEPT (the amenities are unbuilt)
- `### Duncan Hall` → *Rooms, roommates, assignment* bullet 2 *Assignment happens at enrollment, via Katie… Rent is a deferred economy hook (comped v1)* (382–385, 4) — code: `agent/Katie.ts`, `ProvisionController`; doc: `residence.md § Provisioning` (Katie fronts `provision`), `holding.md § Deferred seams` (rent). Pointer left
- `## Open questions` → Q1 *Slate / content-area naming* (492–493, 2) — resolved by the pack cut: `eternal-university`, root `/world/eternal`, locality `eternal-campus`; doc: `content-packs.md`, `holding.md § The packaging`. Pointer left

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none

### Superseded — cut
- `## The surround` → *"Status: deferred, and formless for the demo… an undefined nowhere"* (231–236, 6) — by the code: Terminus shipped with streets, the terminal, the Counting-Houses; the gate is locked and the gatehouse behind it is the stub → `holding.md § The packaging`. Note left; the contrast doctrine (205–229) and the biome-gradient paragraph (238–245) KEPT
- `### Duncan Hall — the dorm` → *"a different mode than the lounge… grows with enrollment (a persistent roster) and is ~monotonic: it doesn't shrink when residents log off"* (344–351, 8) — by the code: dorm-when-empty (an empty room `capture`s then reaps; re-`admit` re-materializes) → `residence.md § Reap (residency dormancy)`. Note left
- `### Duncan Hall` → *Customization — themed, per-side, social (not permissions)* (392–403, 12) — by the code: one leaseholder per unit, theme picked per ROOM, prose-only, by vocation; *curated, not freeform* held → `residence.md § The shell personalization`. Note left; the roommate half is pointed at `dorm-warren-slate`
- `### Dorm-room customization — the Detail schema` (405–453, 49) — by the code: furniture shipped as real Stuff (`thing/Bed.ts`, `Desk.ts`, `Footlocker.ts` — `residence.md § History` pins why they are not generic), themes as prose bundles by fixture role (`DormThemes.applyTo`), `remodel` as a `PromptApi.choice` wheel; no `DetailedMixin` tree, no `applyTheme` over Details, no kiosk. Heading + note left
- `## Open questions` → Q9 *the dorm-room customization model — resolved: authoring the room's `DetailedMixin` tree* (512–519, 8) — same; its *Remaining* sub-items are pointed at their homes (custom prose → `residence.md § Deferred`; per-occupant keying / common-area blend → `dorm-warren-slate`; the storage affordance — the footlocker IS a `Vessel`; the theme roster → shipped). Note left

### Kept (UNBUILT)
- the framing paragraph + *The load-bearing decisions* 1–6 · *See also* · `## Principle`
- `## Lore grounding` (no Chapel, no Health Center)
- `## The surround` → the *EU holds the entire EotL homage* + *the contrast is grounding* paragraphs (the content brief for the campus finish) + *The geography is a gradient* (no `eternal-campus-grounds` biome leaf in any pack)
- `### Topology: walkable, decentralized, sparse terminals` (see Uncertain)
- `### The v1 roster` (mixed list: Duncan Hall shipped; the other seven bullets unbuilt)
- `### Campus services — the pattern` (see Uncertain)
- `### Duncan Hall` → *What persists* intro + bullet 1 (amenities: front desk, laundry, common room — none exist) · *Vertical circulation* (mixed: stairs shipped as `FloorStairExit`; the elevator `Vessel` unbuilt) · *Growth & vacancy* (see Uncertain) · *Rooms, roommates* bullets 1 and 3 (see Uncertain)
- `### Prose & the mood-board` (no EC road names anywhere in `packages/content`)
- `## Worked scenario — first login onto campus` · `## Open questions` Q2–Q8, Q10–Q11 · `## Build order` (see Uncertain) · `## What this slate does NOT cover` · `## Once shaped into formal requirements`

### Doctrine — kept, labelled
- `## The north-star — why Eternal City` (+ its three subsections) — the un-genred / obvious-fabrication / strangeness-is-a-finish thesis. Q6 asks whether it belongs in `design-philosophy.md` (which does not mention it — `grep -i "un-genre"` is empty); the coordinator's call

### Uncertain — kept
- `### Topology` + *Rooms, roommates* bullet 3 — *"Duncan Hall lobby (terminal #2)"* / *"The TPA terminal is public (lobby only)"*: no node in the lobby. The network has since been reshaped (`fasttravel.md`: the VERB is the kernel's, the NETWORK the `tpa` pack's, meeting over `TravelNode`; the board-for-everyone), so a campus node is a row on that shape, not this slate's "terminal" design. Kept; the requirements pass should re-read against `fasttravel.md`. The *start-loc is personal, can be your private room* half shipped in substance (`OuterWarren.admitFor` — *log out in your own yard, log back into the same yard*, `holding.md § Owned goods`); kept because the bullet is one paragraph
- `### Campus services — the pattern` — the MECHANISM shipped (closed-choice dialogue `dispatch`ing an existing verb: `npc-dialogue.md § dispatch`; Katie's intake is its first instance, `residence.md § Provisioning`); the campus SERVICES that would use it (registrar / clinic / housing office / outfitter) have no rows. Kept as the campus-content design; `Left` says *as campus content*
- `### Duncan Hall` → *Growth & vacancy* — lazy growth, floor-budding and gap reuse shipped (`residence.md § Provisioning`: lowest-free slot, *reusing gaps left by unprovision before a new floor*); the *vacancy-keyed purge — days, not a beat* did not (`residence.md § Deferred`: *timed auto-revert on expiry*, *reap grace period*). Kept whole; `Left` names the purge
- `### Duncan Hall` → *Rooms, roommates* bullet 1 — *shared, max two occupants, both with room-level write* — CONTRADICTED by the shipped single-leaseholder unit (`ProvisionController` refuses a double-provision; `UseGrant` has one `holder`). The roommate design is `dorm-warren-slate`'s; kept here because the pairing-by-lounge-flavor-tags idea is only here
- `## Open questions` Q10 *A postal / address system (park)* — the ADDRESS half shipped (`address.md`: `_address: terminus/city/campus/duncan-hall` on every dorm row); mail/delivery did not (`delivery-slate`). Kept for the delivery half
- `## Build order` → the Duncan Hall parenthetical (*roster-persistent `DormWarren`… the elevator Vessel… themed-per-side*) describes the dorm as designed, not as shipped; kept because the paragraph is the v1 drop's scope statement and the rest of it is unbuilt
- Overlaps for the cluster pass: the journey ↔ `onboarding-slate`; the services ↔ `char-gen.md` deferred choices; the terminals ↔ `fast-travel-slate` / `fasttravel.md`; the roommate ↔ `dorm-warren-slate`; the un-genred stance ↔ `design-philosophy.md` (Q6)

### Handoff
- none

### Status block
- Status line: *"the elevator + room assignment"* → *"the stairwell + room assignment"* (batch finding 1); added *"the surround is Terminus, and the locked campus gate on University Avenue is its boundary"*
- Left: *the arrival gate · the Quad + the walkway spine · Student Services (registrar + housing office) · the Health Center clinic · the Campus Store · the academic hall · the first-login journey · the closed-choice campus-services pattern* → *the arrival gate · the Quad + the walkway spine (the EC road names) · Student Services (registrar + housing office) · the Health Center clinic · the Campus Store · the academic hall · the first-login journey · the closed-choice campus-services pattern as campus content · the campus terminals (arrival + the lobby) · Duncan Hall's amenities, the elevator, the vacancy purge + roommate pairing · the campus-grounds biome leaf · the prose discipline over the EC mood-board* (the body wins: the terminals, the dorm's unbuilt remainder, the biome leaf and the prose discipline were unrepresented)
- Size: a build → a build
