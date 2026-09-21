# Slate-compaction pass — address batch ledger

Two slates. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `address.md` only.
Line numbers below are the ORIGINAL file's. Originals saved under the
scratch dir `address/orig/` for diffing. Code was verified in
`packages/content/*/content/**`, `packages/content/*/src/**`,
`packages/server/src/mud/**`; every class below names the file that
decided it.

Three batch-wide findings before the per-slate detail:

1. **Both slates' status blocks were stale by two builds.** The towns
   slate said Heart's Delight *"does not exist"* and was *"gated on
   winter"* — the farmstead build (2026-09-06) shipped both: the
   `hearts-delight` pack (17 files, a static authored farm + the mill) and
   winter (`soil.md § Winter`, `husbandry.md § cold`). The logistics build
   shipped the valley road (`terminus/delight-road/*`, `rejection/kestrel-road/*`),
   the crossroads depot and freight. The delivery slate's `Left` still
   named *"the aether line"* and *"providers + coverage + metering (power,
   aether)"* — two utilities have since shipped, each in a shape the slate
   did not design (below).
2. ⚠ **Two shipped utilities contradict the delivery slate's provider
   design, and neither is a `Provider`.** Water: `Conduit`
   (`packages/content/water/src/thing/Conduit.ts`) serves a **template-path
   prefix extent resolved like `ParcelRegistry`**, not an address-tree
   coverage claim; `cut` / `off` are **stored**, not derived
   (`watershed.md § Delivery: longest-prefix extent`, `§ The six-word
   failure vocabulary`); *nothing inside the extent is modelled* (⛔ no lines
   on exits). Mana: `ManaMain` (`packages/content/arcana/src/thing/ManaMain.ts`)
   is a fixture a device's row names by `mainsRef` — no coverage, no walk
   (`fasttravel.md § The three supplies`). The slate's *aether line* shipped
   as **mana**, which severs the comms unification it was designed for
   (`mortality.md:389`: *the aether is the internet*). These are KEPT and
   flagged Uncertain, not cut — requirements for a provider substrate must
   reconcile three shapes, not inherit one.
3. **One real graduation the slates did not claim:** `AddressRegistry`
   walks only `TemplatePathRosters.locality`
   (`/platform/idea/Locality/` + `/stuff/idea/Locality/`,
   `lib/paths.ts:122`, `platform/idea/AddressRegistry.ts:49`), so a Locality
   row in a locality pack's own tree is **silently absent** — every room in
   it resolves `null`. The `hearts-delight` Locality row's own comment
   records the discovery; `address.md` did not carry it. Inserted (below).

---

## docs/slates/builds/towns-slate.md — 1181 → 1141 · Status PARTIAL → PARTIAL

Almost entirely UNBUILT per-town design (the three acts, the Death Man,
Halloran, the support halves) — the pass's value here is the honest
stamp, not the shrink. Grep: no Institute / Tallow / Rest / print shop /
infirmary / sharpening shop / burial ground under `packages/content/rejection/`
(72 files now: the Kestrel road and the Hanging Wood landed); no `knock`
verb anywhere (`find packages/content -path '*cmd*' -name 'knock*'` empty);
no agents in `packages/content/hinkley-hills/`; no tower / cannery / co-op
in `packages/content/hearts-delight/`; `Offstage` rooms still
`/platform/location/Offstage` with no exits and no `_address`; the Ferrow
`stocks:` table still *INERT AS SHIPPED* by its own comment
(`rejection/content/world/rejection/ferrow.yaml:22`); the necropolis still
at `/world/terminus/necropolis`; Hearthworks / Practicum / Substation still
declare no `_address` (the `eternal-campus` Locality now exists at
`terminus/city/campus`, but that is Duncan Hall's).

### Cut (SHIPPED · DOCUMENTED)
- the narrative status line *"**Status: decided direction, pre-requirements.**"* inside the *Captured* blockquote (16, 1) — history; one status block
- `### The second geometry` → the first paragraph (138–142, 5) — code: `Locality/rejection.yaml`, `Locality._reach`; doc: `watershed.md § A Locality declares its water` (restates it sentence for sentence: *two hierarchies, and their misalignment is the point*). One-line pointer left; the seven-row table + *"That last row is the whole civics curriculum"* KEPT
- `### The Pinkertons` → the *Policing mode: hue and cry vs Peelers* paragraph (281–283, 3) — restated in `settlement-model.md § How law is enforced, per settlement` (the Tiebout table). Pointer left
- `## Heart's Delight` → *"The Stage B gate is CLEARED"* (421–423, 3) — history; `roadmap.md` l.31 carries it
- `## The connective tissue` → *"All three follow from one condition: transport costing something… freight-slate has direction set"* (599–603, 5) — code: `packages/content/transport/`, `packages/content/trade-haulage/` (`hauls` brain, `ship.yaml`, `journey.yaml`); doc: `logistics.md` (⚠ `§ The cost surface is OPT-IN` — ordinary movement is still free; named in the pointer). Pointer left
- `### ⭐ The depot — one room per town` (605–618, 14) — the three depots are restated in `settlement-model.md § 8 › The two pieces that make it a network` (*a weighbridge at an adit, a rail platform with a noticeboard, a loading dock stacked with empty trays*), which also **withdrew** the slate's *"`consign` already works — no new verb"* (carriage is `ship`, `trade-haulage/content/trade/haulage/cmd/haulage/ship.yaml`; `logistics.md § The paper`). Code: `trade-haulage/content/archetypes/depot.yaml`, the crossroads depot at `terminus/content/world/terminus/delight-road/crossroads.yaml`. ⚠ Only the crossroads depot ships; the per-town depots stay in `Left`. Heading + note left
- `### The valley road` (620–639, 20) — code: `terminus/content/world/terminus/delight-road/{ford,milestone,drove,flats,crossroads}.yaml`, `rejection/content/world/rejection/kestrel-road/*` (the pass, `wheelPassable: false`), `hearts-delight/…/location/valley-gate.yaml` (exit to the crossroads); doc: `logistics.md § The corridors` (the Delight road *the lonely stretch*, the Kestrel road *the pass*), `§ ⚠⚠ There is no tpa lane` (TPA stays). The slate's *"Rejection has no inbound exit wired at all"* is false now (`kestrel-road/yard-gate.yaml` ↔ `newbie-wilds/crossroads/hub`). Heading + note left
- `## Decisions` → **D3** (959–960) → `watershed.md § A Locality declares its water`; **D9** (980–982) → `logistics.md § The corridors`; **D17** (1007–1009) → `settlement-model.md § How law is enforced`. Each replaced by a one-line pointer bullet
- `## Grounding` → *13 Locality rows ship; Heart's Delight not among them* (1064–1065, 2) — 14 rows now (`world-seed/content/stuff/idea/Locality/hearts-delight.yaml` claims `terminus/hearts-delight`); *Stage B gate … both docs still read as pending — fix at sweep* (1086–1088, 3) — `roadmap.md` l.31 fixed; *Seasons … Husbandry does not* (1123–1127, 5) — `lib/husbandry/Growing.ts` (`coldStopK`), `lib/husbandry/__tests__/Winter.test.ts`, `soil.md § Winter (D10–D12)`. A dated-snapshot caveat line inserted at the top of the section naming the four cut bullets
- `## Sequencing` → step 6 *Freight — its own build* (1160, 1) — `logistics.md`; struck with pointer. A compaction note added after the list (winter cleared · valley functional half ships · road + crossroads depot ship · D13 done) so steps 1, 4 and 5 read true without rewriting them

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none from this slate's text. (The realm's address scheme the towns *instantiate* — siblings of the city, the roster rule — is graduated under the delivery slate below, where the design lives.)

### Superseded — cut
- `## Heart's Delight` → *"**It does not exist.** No Locality row, no zone, no rooms"* (416–419, 4) — by the code: the farmstead build shipped the valley's **functional half** — `packages/content/hearts-delight/` (17 files: `agent/farmer`, `agent/miller`, `idea/farm-business`, `idea/mill-business`, `location/{valley-gate,bench-lane,farmstead-yard,barn,millsite}`, `bench-field/{idea/ground,location/upper-bench}`, `thing/{farm-shelf,millrace}`), `pack.yaml` (*a STATIC AUTHORED farm rather than a managed one*), the Locality row. ⚠ No subsystem doc describes this content as content (only `watershed.md § Three basins` names the valley, and its *"Rejection and Heart's Delight do not exist as content"* is now stale — flagged under Findings); the pack `README.md` + the Locality row's comments are the record. Note left naming the files; the support half (everything below the note) is KEPT
- `### ⚠⚠ But winter does not exist for plants` (425–435, 11) — by the code: winter shipped as *cold and short days at a place* — `lib/husbandry/Growing.ts` (`coldStopK`, the fifth limiting factor), `Winter.test.ts` → `soil.md § Winter (D10–D12)`, `husbandry.md § A fifth limiting factor: cold`, `time.md § Daylength`. The paragraph's other two claims (*Rejection needs the `stocks:` fix, Hinkley needs `knock`*) are still true and are carried by the note + Sequencing. Heading removed, note folded into the Heart's Delight note above
- `### ⚠⚠ The residency hazard to prove before building` (739–756, 18) — by the code: the slate's premise *"No agent class overrides `canEvict`"* is false — `BehavedMixin.canEvict` (`lib/behavior/Behaved.ts:108`) vetoes any host holding a behavior spec (*"authored NPC cast is never culled — re-cloning would erase it"*), and `Persistable.pinsResidency()` pins an emitter → `residency.md` (the veto table's `Behaved` row; *The pin*). Note left; **D13** (989–990) replaced by a resolved pointer
- `## Decisions` → **D8** *"riding shipped `consign`. No new verb"* (979) — by `settlement-model.md § 8` (withdrawn 2026-09-03) and `ship` (`logistics.md`); the *one depot per town* half stands. Rewritten as a one-line bullet saying so. **D27** *"gated on WINTER"* (1055–1058) — by the farmstead build → `soil.md § Winter`. One-line pointer

### Kept (UNBUILT)
- the status block (re-stamped) · the *Captured* blockquote (minus its status line) · the substrate links · the settlement-model pointer · the staging note · *Siblings*
- `## Rejection` — every section (`### The sources are a sequence` · `### The geology carries Act I` · `### Val and Earl` · `### The support half, derived` · `### The charter is only worth what Terminus says` · `### The Pinkertons` minus the policing paragraph). No hazard/creature rows for Act I in `packages/content/rejection/`; none of the support-half rooms exist
- `## Hinkley Hills` — every section. No `sign`/facade field on `lots/*.yaml` or `lane.yaml`; no agents; no Stewardship Discipline (`platform/idea/Discipline/` — `agriculture.yaml` names *stewardship's land care* as a future child); no `knock`
- `## Heart's Delight` → the support half: `### Sources` · `### The lesson is how towns form` · `### Why Halloran gave the land` · `### The water tower` (no `StorageNode` + `BrandedMixin` row in the pack) · `### The calendar is the town` (no seasonal employment — `employment.md` has no *seasonal*) · `### Nobody takes the valley` · `### The civic triptych` (see Uncertain) · `### Two entry points` · `### Hendy` (no yard row)
- `## The connective tissue` → the von Thünen triple (Doctrine, below) and the two pointer notes
- `## NPC residence` → `### The cost is already paid` (the `shifts` → `Offstage` mechanism is unchanged: `lib/behavior/shifts.ts:82` `mob.teleport`) · `### The question splits in two` · `### The props/cast split` · `### Where to spend the commuting budget`. No `Offstage` row carries an exit or an `_address`; the `homes` brain (`lib/behavior/homes.ts`) is the **pet's** way home, not an NPC residence
- `## The teaching venues are not towns` — no `_address` under `hearthworks/content` or `arcana/content`; owned by `campus-grounds-slate` (two-slates overlap)
- `## ⭐ The venue scorecard` — all three subsections (see Uncertain for the farms table)
- `## ⭐⭐ The necropolis` — all four subsections. Still `/world/terminus/necropolis` (`terminus/content/world/terminus/necropolis/`); `end-of-life-slate.md` l.247–249 points back HERE for the town / LULU / sixth-locality question, so the section is a live cross-reference target
- `## Decisions` D1, D2, D4–D7, D10–D12, D14–D16, D18–D26 · `## Grounding` (minus the four falsified bullets) · `## Sequencing` steps 0–5 · `## What this slate does not answer`

### Uncertain — kept
- `### The second geometry` table + `### ⭐⭐⭐ The civic triptych` — `settlement-model.md § 9` restates the per-town **institution and mode** (magistrate / co-op / hue and cry / nobody) and *the District may act on use, never on a person*; it does NOT carry the slate's *built an institution for the wrong commons* / *each town holds the institution the next one needs* / *none of them talk* (grep: no *wrong commons*, *Ostrom*, *aquifer* in `settlement-model.md` or `watershed.md`). Kept whole as the towns' own synthesis; the overlap is partial
- `### ⭐⭐⭐ The District is the road not taken` → the razor blockquote is restated in `settlement-model.md § Exclusion` (*cannot ban the death man and cannot reach him — so they watch him, for nine years*); the potting-soil / land-use-violation paragraph is not. Kept whole (the arc's core)
- `## Rejection` → *"Functional half (shipped)… 39 files, no TypeScript"* and `## Grounding` → *"Rejection 39 files … 7 cast … 4 businesses"* — stale counts (72 files incl. the Kestrel road + the Hanging Wood; 8 agents — `agent/independent.yaml` joined). Kept inside their paragraphs (paragraph rule); the re-stamped status line carries the new count
- `## Grounding` → *"28 agent rows total"*, *"Only TPA arrival terminal"*, *"Combat readiness … no representation for a creature bigger than the room"* — not re-verified this pass (counts have certainly moved: `hearts-delight` adds two agents). Kept under the dated-snapshot caveat
- `### Heart's Delight — and this is where the farm count derives` — the eight-farm table is design, but two rows now have shipped cousins: the bench grain farm (`bench-field/location/upper-bench.yaml`, thin soil, junior water, *the grain is the poor relation of the peaches*) and the flats (`location/farmstead-yard.yaml`, `barn.yaml`) — one farmstead + a mill, not Furtado's / Avila's. Requirements for the valley's support half should start from the pack, not the table
- `## Sequencing` step 1 *"Gated on winter (D27)… the honest order is winter, then the valley"* — the gate is cleared and the functional half shipped; the step is kept whole (mixed paragraph) with the compaction note beneath it saying so
- `## The teaching venues` → *"declare no address at all"* — still true for Hearthworks / Practicum / Substation, but a campus Locality now exists (`eternal-campus.yaml` → `terminus/city/campus`, `_governmentKey: eternal-university`), which is the address the campus-grounds re-homing would hang them under. Not contradicted; noted
- Overlaps for the cluster pass: the necropolis' rite / monument / potter's field ↔ `end-of-life-slate` (which repeats *a monument is BOUGHT* and *NPCs stay dead*); the teaching venues ↔ `campus-grounds-slate`; Rejection Act I ↔ `rejection-slate`; the `stocks:` inertness ↔ `authored-vs-procedural-slate`; the co-op ↔ `cooperative-slate`; commuting cast ↔ `cast-archetype-slate`; the per-town depots + the barricade/tollgate ↔ `freight-slate`; the civic roads ↔ `legal-code-slate` / `civics.md`

### Doctrine — kept, labelled
- `## ⭐ The frame: every town is two halves` — economic base theory as the generator of the support half (*what does this work do to the people who do it*). Neither shipped nor a backlog item; D1 restates it. Candidate home: `settlement-model.md` (which does not carry the two-halves frame — grep: no *support half*, *economic base*)
- `## ⭐⭐ The realm geometry — Terminus is the clearing house` — *the towns trade with each other THROUGH Terminus*; capital / entry / knowledge as the three shipped centralities. D2 restates it. Candidate home: `settlement-model.md § 8` (which has the six networks and *information is a complete graph, goods are a star* but not the clearing-house thesis)
- `## The connective tissue` → the von Thünen triple (*process at the source · preserve or be close · residential outbids agriculture near the centre*) — pedagogy; `freight-slate` and `settlement-model.md § 8` both gesture at it

### Handoff (belongs in a doc outside my list)
- → `settlement-model.md § 8 › the six networks table`: the **roads** row reads *"⚠ three rooms"* and the § 2 type table's Heart's Delight row reads *"being bypassed"* — both stale since logistics (three corridors, thirteen rooms: `logistics.md § The corridors`) and the farmstead (`hearts-delight` pack). Doc rot, not a graduation; the sweep's call
- → `watershed.md § Three basins`: *"⚠ This wave authors no towns. Rejection and Heart's Delight do not exist as content"* — stale (both exist). Same class
- → `settlement-model.md` (or `docs/design-philosophy.md`), if the coordinator homes the Doctrine items above: the two-halves frame and the clearing-house thesis, verbatim from the kept sections (not copied here — they remain in the slate, unchanged)

### Status block
- Status line: *13 Locality rows ship; Rejection (39 files) and Hinkley Hills … are authored* → *14 Locality rows ship; Rejection (72 files, incl. the Kestrel road), Hinkley Hills … and Heart's Delight's functional half (a static authored farm + the mill) are authored; winter, the valley road, the crossroads depot and freight shipped; the cast residency veto shipped*
- Left: *Rejection Act I + the inert `stocks:` table · Heart's Delight (gated on winter) · Hinkley facades/neighbours/the Death Man + `knock` · Rejection's support half · homes off `Offstage` · depots + the valley road · the necropolis as a SIXTH LOCALITY · freight* → *Rejection Act I + the inert `stocks:` table · Heart's Delight's support half (the tower, the co-op, the pack + seasonal employment, Halloran's founding, Hendy's yard, the eight farms) · Hinkley facades / neighbours / the Death Man + `knock` + a rule for D22 · Rejection's support half (the Rest, the Tallow, the Institute, the print shop, the infirmary, the sharpening shop, a burial ground) · homes off `Offstage` + the commute budget · the per-town depots (only the crossroads depot ships) · the necropolis as a SIXTH LOCALITY (still `/world/terminus/necropolis`) · the teaching venues' re-homing (campus-grounds) · the three civic roads (D4 / D14) · the unanswered list (river authority · subsidence · seasonal employment · lot variation · the wood contest)*. ⚠ **`freight` and `the valley road` are REMOVED** — shipped (`logistics.md`); *gated on winter* removed — cleared. The body's unrepresented items (the teaching venues, the civic roads, D22, the unanswered list) were added
- Size: a build → a build

---

## docs/slates/builds/delivery-slate.md — 614 → 538 · Status PARTIAL → PARTIAL

The addressing foundation is the only unit that shipped **as designed**;
the rest is either unbuilt or shipped in a shape the slate did not draw.
Grep under `packages/server/src/mud` + `packages/content/*/src`: no
`Provider` class / `coveragePrefix` / `serviceTag` (only `GroupProvider`
and `NotifyRule` match `Provider`); no `Meter` / `metered` outside
`Census.ts` and a magic test; no `mailbox` / `postbox` / `inbox` / anchor
(`RecordLogic.ts`'s *inbox* is the record layer's word); no `delivers` in
`lib/behavior/` or any pack's `src/behavior/` (`trade-haulage`'s `hauls`
is freight); the two utilities that DID ship are `water`'s `Conduit` and
`arcana`'s `ManaMain` / `ManaPoweredMixin` (batch finding 2). Forums,
chat and the Subject layer shipped (`lib/forum/Subject.ts`,
`forum_subjects`); `comms.md` l.281 still lists *async mail* as an
adjacent future; `chat.md` l.244 still defers persistent history.

### Cut (SHIPPED · DOCUMENTED)
- the second status blockquote *"systems architecture proposed; internals open"* (11–18, 8) — history; its thesis (*one substrate asked many times*) is `## Principle` 1, kept
- `### Addressing` → **Decided** bullet 1 *own rooted named tree, independent of templatePath and zones, diverge day one* (143–147, 5) — code: `lib/address/Locality.ts`, `lib/address/Addressable.ts`; doc: `address.md § Three independent namespaces` (*the divergence is day-one and deliberate — a mailing address is not a filesystem path*)
- `### Addressing` → **Decided** bullet 2 *an address is a path; routing reuses PathTrie / prefix-match / nearest-ancestor* (148–150, 3) — code: `lib/collections/PathTrie`, `platform/idea/AddressRegistry.ts`; doc: `address.md § The coverage index — AddressRegistry + PathTrie.longestPrefix`. The *Decided:* label kept with a pointer note
- `### Addressing` → **Proposed** bullet 1 *named nesting to a deliverable leaf, any kind of place, not a street model* (169–173, 5) and bullet 2 *tier roles not fixed levels; Locality the load-bearing tier* (174–181, 8) — code: `Locality.ts` (one class), the fourteen rows' claims (`terminus/rejection/road/the-pass`, `terminus/city/campus/duncan-hall`); doc: `address.md § The Locality node` (*One concept, variable depth … no Region / Block / Spot classes*). The *not a street model* why is folded into the graduation below. Label + bullets replaced by a pointer note
- `### The three products` → *Chat* (531, 1) — `chat.md`; *Forum* (536–538, 3) — `forums.md` (⚠ organizer `open` / `ordered`, not *wiki-namespace-shaped*). Struck with pointers; the *Email / aether-mail* bullet and the *What's genuinely new* paragraph KEPT (the inbox is unbuilt)
- `## Open questions` → **Q1** *the Saxonberg address scheme* (558–560, 3) — resolved by the code: fourteen Localities under `terminus/` (+ `narnia`, `moor`, `lounge`, `last-counted-mile`), the typable form + disambiguation is `AddressApi.resolvePlace` (`address.md § The resolve chain` — name collisions resolve to the BROADER place) → struck with pointer to the graduated `§ The realm's scheme, as shipped`; **Q4** *subsystem name + home* (568–569, 2) — `lib/address/`, `AddressApi`, `address.md`; **Q6** *address node reification* (571–573, 3) — `address.md § The Locality node`. Both struck with pointers; the slate's own § Separable build units already said Q4/Q6 were resolved
- `## Separable build units` → *Addressing foundation — shipped* (583–590, 8) — `address.md`. Struck to one line; *anchors + provider-grade off-grid remain deferred* carried in the line

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `### Addressing` → **Decided** bullet 4 *One shared physical address per place … per-substance physical IDs rejected — "shared is simpler," one-building-one-address is how people think; Layer-2 handles are separate namespaces* (154–159, 6) — code: `Addressable.ts` (one `_address: string | null`, no per-service field anywhere) → inserted at `address.md § The realm's scheme, as shipped` (new subsection after § The suburb tier; the bullet's why is its second paragraph, 4 lines). The same subsection carries the shipped scheme's three rules (one root `terminus` · every town a sibling of the city, generalizing the § suburb tier rule the `hearts-delight` row's comment states · ungoverned ground holds its own root), *a node is any kind of place at any depth — never a street-address model* (from the cut Proposed bullet 1), and the deliberately unclaimed corridor (`logistics.md § Addresses, and the jurisdictional gap`). 21 lines total
- (from the code, not the slate — batch finding 3) the **roster rule**: `AddressRegistry` walks only `TemplatePathRosters.locality`, so a Locality row outside `/platform/idea/Locality/` + `/stuff/idea/Locality/` is silently absent → inserted at `address.md § The coverage index`, a new bullet after *Eager roster clone* (11 lines). Source: `lib/paths.ts:122`, `platform/idea/AddressRegistry.ts:49`, the `hearts-delight.yaml` comment

### Superseded — cut
- `### Email and forums are facets, not new subsystems` (478–498, 21) — by the code: the forum shipped as `Subject → Board → Thread → Post` with `grain` / `parentSubject` / `boardScopedName` organizers (`lib/forum/Subject.ts`, `forums.md § The Subject layer`), NOT a `FolderZone` + `AccessApi` namespace; the L0 genre is the closed root `publication.forum` (`topics.md` — seven roots, no `world.forum.*` / `world.mail.*`); L1 is `Subject.groupRef`. The email / inbox half is unbuilt and is carried by the kept *Email / aether-mail* bullet. Heading + note left
- `### Surfaces bind a GroupRef + an override layer` (500–527, 28) — by the code: shipped as the Subject layer — `curated` (a managed Group minted alongside) / `bound` (an existing `guild:` / `mql:` / `contacts:` ref) / `open`; à-la-carte surfaces under one `groupRef`; and the slate's own *"There is no 'Subject' entity"* was REVERSED (a thin `Subject` Document, `forum_subjects` — the slate's 2026-06 note already said so) → `forums.md § The Subject layer — the linking spine`. Heading + note left
- `### Two animals — comms vs reference` (444–454, 11) and `### Build-vs-integrate — own it, top to bottom` (456–476, 21) — shipped as decided (forums and chat ride the aether implant, `forums.md` l.3; the wiki is ours, `wiki.md`; an external service is a mirror only, `streaming.md` / `twitch-relay.md`) but **no subsystem doc states the why** — `wiki.md` never says *out-of-fiction* or *own-not-external* (grep), `forums.md` never says why a Reddit front-end was refused. Cut with headings + notes pointing at this ledger; the text is verbatim in Handoff → `wiki.md` / `forums.md`

### Kept (UNBUILT)
- the status block (re-stamped) · the 2026-06 forum-factoring note (still the pointer for the Layer-2 reversals; its *`logged` retention* claim is about `forums-slate`, and `chat.md` l.244 still defers history) · *See also* (nothing it links was cut)
- `## Graphs over one node set` — the Delivery overlay row and the **anchor** (`address.md § What's NOT in this build`: *anchors* deferred; no anchor object exists)
- `### Addressing` → **Decided** bullet 3 *routing is longest-prefix over provider-claimed subtrees; cross-locality climbs and trunks* (mixed: the longest-prefix half shipped — `address.md § The resolve chain` step 3; *provider-claimed*, the climb and the trunk did not) and bullet 5 *catchment vs delivery* (catchment shipped as many rooms declaring / zone-inheriting one address; the anchor function did not); the **Off-grid** paragraph (mixed: `null` = off-grid shipped, `address.md` step 4, and the unclaimed corridor is authored, `logistics.md`; per-service off-grid, general delivery, service grades did not)
- `### Providers & coverage` — whole (see Uncertain) · `### Distribution` — whole, all four `####` (see Uncertain) · the *Boundary: metering and per-parcel billing belong to the property/residences build* paragraph (no billing anywhere; `holding.md § deferred`: *a lease is a grant with no money leg*)
- `### The carrier (post)` — no `delivers` brain, no mailbox / postbox; the substrate it consumes (`patrols`, `tree-dialogue`, `reacts`, `idles`, engagement slots) all exists
- `### The aether line` (see Uncertain) · `### Broadcast / field` (see Uncertain)
- `## Layer 2` intro · `### The three products` → *Email / aether-mail* + *What's genuinely new* (mixed paragraph: the board Document + browse views shipped, the inbox Document and `world.mail.*` did not — kept whole)
- `## Open questions` Q2, Q3, Q5, Q7 (mixed: forums shipped; mail / broadcast open) · `## Separable build units` → providers + source service · aether-line ↔ comms · post · Layer 2 (mixed) · the vertical seam · `## What this slate does NOT cover`

### Uncertain — kept
- `### Providers & coverage` — **kept-but-contradicted by two builds.** The *Source* facet (*covered points are served because a provider covers them and is up; metered at the point*) shipped twice, neither as an address-tree coverage claim: water's `Conduit` serves a **template-path prefix extent** (*resolved the way `ParcelRegistry` resolves title* — `watershed.md § Delivery: longest-prefix extent`), with an owner and the six-word `SupplyState`; mana's `ManaMain` is a **fixture a device's row names** (`mainsRef`; `fasttravel.md § The three supplies`), with no coverage and no walk. Neither is a *Provider*; `address.md § The seam weather consumes` still says *the delivery build hangs provider-coverage refs there* and none did. The *Conveyance* facet (post) is unbuilt and uncontradicted. The two-level presence override shipped as `SUPPLY_STATE_PRECEDENCE` in a different shape (*the one furthest from being fixed by the person asking*). Q2 must decide whether a Provider substrate unifies three shapes or the address-tree design is withdrawn
- `### Distribution` — the split *coverage is legal, connection is physical* was adopted **verbatim** by `watershed.md § Conduit`, and then the opposite of the slate's mechanism was chosen: ⛔ *nothing inside the delivered extent is modelled — no pipe segments, no street network* (so `#### Lines are edge attributes on exits` did not ship and is explicitly out of that pack's scope), and **`cut` / `off` are the two STORED words** (`ManaMain.severed` / `.closed`; `watershed.md § The six-word failure vocabulary`) where the slate's blockquote says *the `cut` flag becomes DERIVED*. `#### Topology differs by service` half-shipped: *sewage flows downhill* is `Conduit.direction = disposal` (`watershed.md § A sewer is the same object reversed`); *the aether radiates from towers* did not (mana is by ref). The easement / holdout / *digging up the road* is unbuilt (no `speed` damage, no right-of-way record). Kept whole; flagged in `Left`
- `### The aether line — unifying utilities with comms` — **kept-but-contradicted.** The utility half shipped as **mana**: `ManaMain` (*the city's line … refills unless somebody cut it or closed it*), `ManaPoweredMixin`'s three supplies (a cell · the line · a person in contact), the `ManaLamp` (*a resident is a sufficient battery*) — `magic-items.md § ChargedMixin's second consumer: the wall socket`, `fasttravel.md § The three supplies`. That severs the unification the paragraph exists for: the comms implant's substance is the **aether**, and `mortality.md:389` states the doctrine — *the aether is the internet*. `ManaMain.ts`'s own comment: *no electrical noun appears anywhere near it*. Requirements must decide whether *piped aether* is now simply *mana on a line* (and the paragraph retires) or a second substance is wanted; flagged in `Left`
- `### Broadcast / field` — the *zone-varying ambient field* shipped its **dead-zone** half as suppression (`Location.suppressesMagic`, `Zone.lookupField('suppressesMagic')`, `MagicApi.suppressionAt` — `magic.md § Impulse vs modifier; provenance; suppression`) and an `emit-field` Effect exists (`lib/magic/Effect.ts`); the transmitter + receiver **carry** (range-parameterized, payload-agnostic) has no code, and the press (`press.md`) is one→many without range. Kept whole
- `## Principle` 2 *the comms acoustic/implant split is the line/field duality, already shipped* — still the only shipped instance; `display.md § The modem is a predicate on the driver` is a second field-ish case (a screen as an aether host) not reconciled with this framing. Doctrine, kept
- `## Open questions` Q3 — *service-absent gates fixtures off* shipped for mana (`ManaLamp` goes dark; `getStatus()` derives from `supplyState()`), *finite local store (a charged crystal)* shipped as `ManaCell`, *metered-infinite grid* shipped as `ManaMain` (*abundant by construction*). The **billing** half (integrated, scheduler) did not. Kept as an open question because water has none of this and the general answer is unmade
- Overlaps for the cluster pass: the hub-and-spoke blockquote (244–256) repeats `freight-slate § Topology` (two-slates rule; kept in both); the LULU / holdout module ↔ `amendment-library-slate` + `zoning-slate`; the three monopoly shapes ↔ `sanitation-slate`; async mail ↔ `comms-slate`; the carrier ↔ `npc-behavior-slate`; per-parcel billing ↔ `property-slate` Phase 3

### Doctrine — kept, labelled
- `## Principle` (the six) — the thesis; 1–3 have shipped instances, 4–6 are the argument. Candidate home: `address.md`'s intro *Why* if the coordinator wants one
- `### Distribution` → `#### ⭐⭐ The unifying concept: natural monopoly` (340–368) — pedagogy (*the polity learns "natural monopoly" by meeting it three times*; the three monopoly shapes + the second-hand market). Nothing to build; `compact-political-science.md` is the likely home
- `### The vertical seam (gamification — validation lens, not a build)` (418–431) — self-described as *a lens, not a slated build*; the binding pattern it cites shipped (`streaming.md`). Kept, not in `Left`

### Handoff (belongs in a doc outside my list)
- → `wiki.md` (a *Why the wiki is out-of-fiction, and ours* paragraph beside its principles) and `forums.md` (the intro's *riding the aether implant* sentence is the what; this is the why), verbatim from the cut sections:

  > ### Two animals — comms vs reference
  > 
  > - **Comms** (chat, DM, email, forum) — *agents communicating*. **Diegetic,
  >   rides the aether/implant**: every channel is a frequency on the universal
  >   implant, history is implant storage (chat-slate). Email/forums are Layer-2
  >   payloads over the aether transport.
  > - **Wiki / help** — a *reference reading surface*, **deliberately
  >   out-of-fiction** (wiki-slate Principle 2), **not** aether, **not** comms.
  > 
  > The line: **you talk in-world (diegetic, aether); you look things up
  > out-of-world (a tool).** Don't merge them.
  > 
  > ### Build-vs-integrate — own it, top to bottom
  > 
  > Canonical + diegetic is **always ours**; an external service attaches only as
  > an optional **binding-facet mirror** (the relay pattern), never a front-end or
  > source of truth. So: **not** a Reddit front-end, **not** an external-wiki
  > front-end. The reasons are already in the slates:
  > 
  > - **Diegesis** — a forum is an aether board; an external service isn't our
  >   world and can't be the canonical store.
  > - **Bus primacy** — everything flows through the command bus so NPCs / quests
  >   / systems can *react*; an off-platform service is a parallel channel the
  >   game is blind to.
  > - **The in-client integration *is* the value** (wiki-slate) — live MML
  >   transclusion, spoiler tiers, source-at-L3, the cockpit — none survive on an
  >   external host.
  > - **Cheap on our substrate** — Documents, Channels, grouping/facade,
  >   messaging, MQL-subscription, reactions-threading, the offline inbox,
  >   AccessApi are all shipped or slated.
  > 
  > Reddit fails both tests the Twitch relay passed (no diegetic fit, no adjacent
  > use-case pull); an external wiki fails wiki-slate's own-not-external call.

  (What shipped, for the docs' *what* line: `Subject → Board → Thread → Post` over `forum_subjects` / the board collections, riding the aether implant — `forums.md`; `Channel` + the 200-frame ring — `chat.md`; the wiki's frozen render pipeline and reveal model — `wiki.md`; the Twitch / YouTube / Kick transports as mirrors — `streaming.md`.)

- → `settlement-model.md § 8` / `logistics.md`: nothing new — but the slate's hub-and-spoke blockquote's *three networks are genuinely distinct objects* (a utility is a tree rooted at a source · freight a sourceless O-D matrix · the TPA an authored graph where distance costs nothing) is stated more sharply here than in either doc; the coordinator may want it beside the six-networks table. Kept in the slate meanwhile

### Status block
- Status line: *the addressing foundation shipped → address.md; carriage and the freight market shipped → logistics.md* → *+ the realm's scheme; forums + the Subject layer → forums.md; ⚠ two utilities shipped WITHOUT the provider substrate designed here (water as `Conduit`, the "aether line" as mana)*
- Left: *providers + coverage + metering (power, aether) · the aether-line ↔ comms unification · post/mail to an address · the broadcast/field carry* → *providers + coverage + metering as ONE substrate (⚠ reconcile with the two shipped shapes) · anchors + catchment-vs-delivery · per-service off-grid + service grades · the delivery overlay + trunking (Q5) · the network walk / lines on exits / the easement (⚠ `cut` shipped STORED) · post — the `delivers` brain, the carrier round, mailboxes · the aether-line ↔ comms unification (⚠ contradicted: the line is mana; the aether is the internet) · aether-mail + the inbox · the broadcast / field carry + the zone-varying ambient field · per-parcel billing (the boundary) · Q2 · Q3 · Q7's mail / broadcast half*. The body's unrepresented items (anchors, off-grid grades, the overlay, the network walk, billing) were added; *"(power, aether)"* dropped because mana shipped and *power* (`analyze power`, hydro watts) is watershed's, not a utility to a building
- Size: a build → a build

---

## Inserts into subsystem docs (all `address.md`, +36 lines)

- `§ The coverage index`, a new bullet after *Eager roster clone* — ⚠ **Only the two roster prefixes are walked** (11 lines) ← the code (`lib/paths.ts:122`, `AddressRegistry.ts:49`) + the `hearts-delight` Locality row's comment
- after `§ The suburb tier`, a new `### The realm's scheme, as shipped` (25 lines incl. heading/blank lines) ← delivery-slate § Addressing Decided bullet 4 (one address per place + why) and Proposed bullet 1 (any kind of place, not a street model), plus the shipped scheme's three rules and the unclaimed corridor

No existing sentence in any subsystem doc was edited.

## Findings outside this batch (not acted on)

- `address.md § What's NOT in this build` still lists *"the concrete Saxonberg address scheme (content)"* as deferred, and `§ Cross-references` says *"providers/anchors/carrier/aether/Layer-2 remain deferred"* — the scheme shipped (the new subsection says so beside it); the aether line shipped as mana; Layer-2 forums shipped. Left as-is under INSERT-never-replace; the sweep should trim both lists
- `address.md § The seam weather consumes` — *"the delivery build hangs provider-coverage refs there [on Locality]"* — no build did; water put its extent on `Conduit`, mana put its line on the device row. Not false yet (a future build still could), so not touched
- `address.md § Roster` still shows the five-row demonstrative roster; fourteen rows ship. The new subsection names the scheme rather than re-tabling them
- `settlement-model.md § 8` *roads: ⚠ three rooms* and § 2 *Heart's Delight … being bypassed*; `watershed.md § Three basins` *"Rejection and Heart's Delight do not exist as content"* — stale since logistics + farmstead (Handoff above)
- `docs/roadmap.md` l.42 cites *towns-slate D27* for the farmstead's cuts; D27 is now a one-line resolved pointer in the slate. The citation still lands (the bullet exists) but says less — the sweep may want to repoint it at `soil.md § Winter`

## Calibration notes for the coordinator

1. **"Shipped in a different shape" was the dominant class for the delivery slate, and twice it was a different shape per SERVICE.** Water and mana each answered the provider question without a provider. I kept the provider design rather than superseding it because a third service (post) is still designed against it and nothing has withdrawn the address-tree coverage idea in writing — but the reconciliation is now the slate's first `Left` item, not a footnote.
2. **A slate's own "does not exist" is the most dangerous sentence in a backlog** — the towns slate's Heart's Delight section opened with one that was two weeks stale. Grep the pack directory before trusting a negative.
3. **Restated-by-a-design-doc (the settlement model) is a thinner claim than shipped-and-documented.** I applied the coordinator's ruling only where the restatement was literal (the three depots, the policing table, the watershed misalignment); the civic triptych and the District razor are partially restated and stayed, flagged.
4. **The `homes` brain is a false friend** — it reads as *NPC homes* and is the pet's way back to its bond. Worth a line wherever the residence build starts.
