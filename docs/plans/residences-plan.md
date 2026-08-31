# Residences — implementation plan

**Input:** [residences-requirements.md](../requirements/residences-requirements.md) (D1–D17 are settled; this plan is the HOW). Read alongside: [residence.md](../subsystems/residence.md), [smallholding.md](../subsystems/smallholding.md), [furnishing.md](../subsystems/furnishing.md), [persistence.md](../subsystems/persistence.md), [parcel.md](../subsystems/parcel.md), [credential.md](../subsystems/credential.md), [mql.md](../subsystems/mql.md), [address.md](../subsystems/address.md), [boundary.md](../subsystems/boundary.md) § Adornable, [ref-shapes.md](../ref-shapes.md) § Identity, [npc-dialogue.md](../subsystems/npc-dialogue.md), [retail.md](../subsystems/retail.md), [app-settings.md](../subsystems/app-settings.md).

**Build discipline:** one MR. `pnpm test:near` + the touched pack suites per wave; **one** full `pnpm test` at finalize. Every lint family in CLAUDE.md stays green each wave; the new census lint (Wave 1) joins them. No migrations ever — seed/pack edits + drop the DB; no compat shims. Stage by name, never `git add -A`; push every turn. Scope boundary: nothing under cultivation (`GrowingMixin`/`CultivableMixin`, plants, harvest, husbandry.md, the cultivation half of smallholding.md) is touched; drives buy **fresh** lots with Governor funding (`reserve issue`, the shipped `hinkley.spec.ts` pattern).

---

## Plan-level decisions

These are the calls the requirements delegated to the planner. A build agent follows them as written.

### P1 — D16 convergence depth: the dorm converges FULLY, in two steps, keeping its classes

The dorm converges onto both new pieces — `DormWarren` re-parents onto the shared two-tier base (Wave 3), and each dorm unit gets a keyed `HoldingProgramme` instance (Wave 4) — because the acceptance criteria demand it: the dorm's condition must be readable (the ascent gate reads it at `title buy`), its upkeep term (`institution-all`) must be readable on its programme, and the bedsit must answer the archetype read. A shallower convergence (base only, no programme) would need a parallel dorm-only condition home, which is the "different mechanism per rung" failure D5 exists to prevent.

What does **not** move: `DormWarren`, `DormRoom`, `DormDoor`, `FloorStairExit` keep their class names, template paths, extent scheme (`f<n>-r<p>`), and observable behavior — the existing duncan-hall suite (`packages/server/src/mud/world/eternal/duncan-hall/__tests__/`) is the pin and runs unchanged (only internal wiring may be edited where the base now supplies it). The dorm's programme is degenerate: a one-room floorplan citing the shipped `dormroom` row, no front-door change (`DormDoor` stays; the generic `FrontDoorExit` is for the two new rungs). Live-record churn is a non-issue: no migrations, drop the DB.

### P2 — D17 mechanics: `identityPath` becomes a stamped slot; `asTemplatePath` is retired, not renamed-in-place

- `Stuff` gains a hard-private `#identityPath` slot + `_stampIdentityPath` seam (caller-gated exactly like `_stampTemplatePath`). `getIdentityPath()` returns the stamped identity ?? `getTemplatePath()` (the sandbox WireBody override keeps working — it overrides the method).
- `StuffApi.clone` option `asTemplatePath` is **deleted** and replaced by `asIdentityPath`: the clone's `templatePath` is now **always the source row's path** (resolves to a row by construction); the minted identity is stamped on the identity slot. The `byTemplatePath` registry index keys on **identity** (`identityPath ?? templatePath`) — byte-identical lookup behavior for every existing caller (`findByTemplatePath('/platform/agent/Avatar/<pid>')` still finds the avatar), and the singleton pre-flight guard keeps checking the identity path.
- **Principal strings keep their values.** Call sites that mean *identity* — grants (`grantUse` holder), group-membership keys (`isDormsAgent`), chattel stamps, snapshot owners, the domicile stamp, `heldUnitOf` — switch from `getTemplatePath()` to `getIdentityPath()`. Values are unchanged (`/platform/agent/Avatar/<playerId>` etc.), so no stored data changes shape.
- Production `asTemplatePath` callers and their fates: `PlayerLogic.materializeAvatar`, `Login.ts`, `EnrollController.ts` → `asIdentityPath` (identity axis, backed by `holder_snapshots`); `LotHolder.provision` → **deleted** by the Wave 5 rework (rooms become keyed instances of real rows); `PlayerLogic.ts:208`'s legacy per-player-row fallback → **deleted** (never extended).
- **The six framework registries** (Card / MqlSubscription / WorldClock / Scheduler / reaction / event): the platform pack already ships trivial rows (`packages/content/platform/content/platform/idea/CardRegistry.yaml`, `MqlSubscriptionRegistry.yaml`, `WorldClockRegistry.yaml`, `SchedulerRegistry.yaml`, `ReactionRegistry.yaml`, `EventRegistry.yaml` + `EventSubscriptions.yaml`, each `class:` + `data:{}`). Wave 1 audits that each is stood up via `StuffApi.singleton(path)` (clone-from-row) rather than a create-plus-stamp, converts any stragglers, and the new lint proves the set closed. No case needs the identity axis.
- **The lint** — `pnpm lint:census` (`packages/server/scripts/check-template-census.ts`, the `check-instanceable-placement.ts` shape, CI-gating, registered in `packages/server/package.json` + root `package.json`): (a) the string `asTemplatePath` appears nowhere in `src/` or pack `src/` (the channel is retired); (b) every template-path-valued field in every seed + pack YAML resolves to a real row — `populates:` entries (incl. `{template, onto}`), `exits.*.destination`, `adornments`, `stockLines[].itemTemplatePath`, `prices` keys, `roomTemplate`, `holderPath`, `streetPath`, `hydratorClass` (already covered by lint:instanceable — shared reader, no duplicate check), and the new `floorplan`/`programmePath`/`corridorTemplate` fields; (c) every `TemplatePaths` constant in `lib/paths.ts` that names a *singleton registry/catalogue* resolves to a pack row. No exemption list.
- The ref-shapes doctrine edit (`templatePath` = kind, always a row; `identityPath` = instance, scheme-derived, backed per family, with the mint schemes enumerated) lands **at sweep**, per D17 — the plan's Wave 11 notes it for the finalize agent; CLAUDE.md's one-line summary likewise waits for sweep (worktree rule 5: index files get swept, not raced).

### P3 — Capacity dials ride AppSettings keys named by the institution row

D10's "runtime operator dial" is the shipped `AppSettings` mechanism (the seam residence.md's own deferred note points at): the institution row authors a `capacityKey` (e.g. `hinkley-hills.lotCap`) and a `defaultCapacity`; provision-time reads go `AppApi.setting(capacityKey)` falling back to the authored default; the wizard-gated `config` verb is the runtime adjustment surface (`config set hinkley-hills.lotCap 60`). Shipped defaults live in a new `settings` contribution: `packages/content/world-seed/content/settings/residence.yaml`. Concretely: the plat book's cap (default 40 — the roster retires, the survey becomes prose), `dorm.roomsPerFloor` (default 12 — `ROOMS_PER_FLOOR` graduates; `DormWarren.roomsPerFloor()` reads the setting), and the apartment building's `mayfield.unitCap` (default 8). The base refuses provision at cap with the reason named — the acceptance's refuse-then-raise-then-admit path.

### P4 — Plan shapes: dorm = linear (floors), Hinkley = branched (the live exercise), static = pinned by a synthetic suite institution

`PlatPlan` (Wave 3) ships all three shapes. Hinkley's book goes generative with a **branched** plan whose segment 1 **is the authored lane** (an authored node inside a branched plan — the "bespoke streets, minted homes" case and the growth case in one institution): 4 frontages per segment; lot-5 extends the lane west (`lane-2` minted from a road-segment row); the plan authors a branch — a court off segment 2 (`hinkley-court`, 4 frontages) — so a real neighborhood shape is expressible and the live drive exercises a branch as frontage fills. Unbuilt reaches read honestly ("the road peters out into stakes and grass" — the road-segment row's prose; a segment with no sold frontage is impassable, the dorm's empty-floor rule horizontal). The **static** shape is pinned by a synthetic institution in the base's unit suite (authored circulation, minted holdings, zero road minting), which is what the acceptance's "still provisions correctly" needs; the dorm suite pins **linear**.

### P5 — Archetype satisfaction extends the SHIPPED archetype substrate, not a new one

D15's bundles ride the existing `archetype` document kind + `ArchetypeCatalogue` + `lib/archetype/Archetype.ts` (libations' venue archetypes — already "reported, never enforced", already open-vocabulary via packs). Changes: `industry` becomes optional (a residue-only archetype derives nothing from recipes); `CapabilityNeed` gains two kinds — `rest: n` (a posture-bearing `lie` slot with `restQuality ≥ n`) and `presence: <keyword>` (a declared thing present — the bathroom's toilet is prose-LOD, so presence is honestly the strongest claim available); and a `satisfies(space)` read joins `describe()`/`materialize()` on the value-object (per-slot: satisfied?, by what). Four residential archetype docs ship in **generic-objects** (`content/archetypes/{bedroom,kitchen,bathroom,living}.yaml`) — bedroom `{rest: 1}`, kitchen `{heatK}`, `{surface}`, `{coldStorage}`, `{bulkSource: water}`, bathroom `{bulkSource: water}` + `{presence: toilet}`, living `{seating: 2}`. Satisfaction derives over a room **or** a holding (the programme unions its rooms' contents), so the dorm bedsit reads all four. No `ArchetypeApi` (the shipped ⭐ rule); the `survey` verb reaches the catalogue + value-object directly, as the two production paths already do.

### P6 — The realtor fires the purchase AS THE BUYER via a prompt, not an NPC dispatch

The dialogue `dispatch` effect runs commands as the NPC — wrong for D14. New pieces: a **domain dialogue effect** `realty-buy` registered in `DialogueEffectRegistry` (the shipped `bank-circle` extension seam — no format reopening): its `apply` builds the live listing (the `TitleController.books()` enumeration), opens `PromptApi.choice` on the **buyer's** Interactive (lot + price + zoning per entry), then on pick + `PromptApi.confirm` calls `CommandApi.forceCommand(buyer, 'title buy <lot>')` — the command runs with the buyer's own affordances, validators, and money; the choice is the consent. A sibling `realty-list` effect messages the cross-book listing (reusing the same enumeration). Registered at boot from the realty content class (`Realtor.postRegister`), the lib-registers-at-boot pattern. The raw `title` verb is untouched as the operator surface.

To let `title` transact at the realty office, `TitleController`'s `REGISTRY_ROOM` constant becomes the venue predicate its own comment promised: the actor's room contains a `DeedDesk` fixture (`platform/thing/DeedDesk.ts`, a trivial `Prop` subclass; rows populated into both the Registry office and the realty office). `title list`/`buy` gate on desk presence; prose unchanged.

### P7 — Names (content is free to re-flavor prose, not paths)

Street: **Mayfield Row** (`/world/terminus/mayfield-row/` — the 'Burbs' Mayfield Place, the Hinkley nod's sibling). Building: **Seznick House** (`…/mayfield-row/seznick-house`). Landlord org: group **`mayfield-holdings`**. Property manager NPC: **Walter** (`…/mayfield-row/npc/walter.yaml`). Realty office: `/world/terminus/realty/` (room `office.yaml`), realtor NPC **Ricky** (`…/realty/npc/ricky.yaml`). Unit extent scheme: `…/seznick-house/units/f<floor>-u<pos>` (reuses `slotOfExtent`'s floor parsing shape; a distinct `u` leaf so dorm tooling never misreads it). Room keys: `<holdingExtent>/<leaf>` (e.g. `…/lot-7/bedroom`), per D16's `(scope, key [+ leaf])`.

### P8 — Where the keyed rooms' rows live (the zone lesson, applied)

With `asTemplatePath` gone, a clone's zone resolves from the **row's** ancestry — so a room reached by a non-cardinal exit from a `CartesianLocation` source must have its row under a spatial zone that is not the source's. That binds exactly one place: the Hinkley **entry** room (the yard, reached by the lane's `lot-<n>` gate). Therefore the yard row **moves** to `packages/content/world-seed/content/world/terminus/hinkley-hills/lots/yard.yaml` (under the shipped `lots` CartesianZone; a seed move + DB drop, no migration), and its stale "lot 2" header is corrected to lot-1 in the same edit. All other new rooms are reached from non-cartesian sources (yard → hall; corridor → unit), so their rows' zones are unconstrained: Hinkley cites the **generic archetype rows directly** (`/stuff/location/room/bedroom`, `/stuff/location/room/living`, `/stuff/location/room/bathroom` — the three uninstantiated archetypes get instantiated) plus two local rows (`lots/hall.yaml` — the locked-door landing; `lots/kitchen.yaml` — local, citing generic fixtures `range`/`counter`/`larder` + the finite `air` reserve, avoiding a cross-pack dependency on trade-hearth-cooking's kitchen row). The apartment authors bare per-building rows (`seznick-house/rooms/{hall,main,bedroom}.yaml` — built-ins only, empty-at-move-in) and cites the generic **bathroom** row directly (it is all built-ins). Coverage/land-use for a keyed room reads its **key** (the parcel extent) — the Wave 4 engine change — so row location never affects title resolution.

### P9 — Mounted goods persist as owner-side placements with a `mounted` marker

The hang path: `hang <item>` moves the owned, `Adornment`-composing good out of custody and `addFixture`s it onto the current room (Adornable — every Location composes it), then `ChattelApi.setPlace(item, roomId, { mounted: true, slot })`. Persistence: the estate entry's placement gains an optional `mounted` flag (+ slot name); the room overlay's restore branch mounts (`addFixture`) instead of floor-placing; and the room-going-dormant path extends the skip/report rule to fixtures — `AdornableMixin` contributes a capture pass that skips player-stamped fixtures and reports them via `CaptureContext.noteOwnedGood` (the exact Container-slice rule, applied to the fixtures map), so a mounted good in a room that sleeps while its owner is offline is captured by its owner, never lost with the room. `get`/take-down: `GetController` grows the dismount branch — target is an attached `Adornment` → verify actor holds title or the room's authority → `removeFixture` → normal get → `followCustody`. Verb `hang` lives in the **inventory** category (with `put`/`get`); it is a core platform verb (view + controller in the platform pack/kernel), affordance-checked in the live drive like every new verb.

### P10 — Condition, terms, and the maintenance act

- **Storage:** on the holding's `HoldingProgramme` instance — persistent `shellCondition` (0..1) + `shellStamp` (game-time), reconciled on read (`reconcileShell()`: linear slope, rate from `residence.weather.daysToWorn` settings; stamp-forward; no scheduler). Banded prose (5 bands: sound / weathered / worn / shabby / dilapidated), cause legible ("the paint has gone; rain has gotten into the sills"). Goods keep use-wear only — a regression test asserts zero clock-wear on a `DurableMixin` good across elapsed game time.
- **Term:** `upkeepTerm` is an authored field on the programme **row** — `institution-all` (dorm), `landlord-shell` (Seznick House), `owner-all` (Hinkley) — readable per instance via `survey`. A closed vocabulary in `lib/` is not needed; it is a validated string vocabulary on the programme class (`UPKEEP_TERMS`), open to future values (`hoa-shell`) without mechanism.
- **The act:** `maintain` verb (crafting category, beside `repair`), conferred by a carried tool with `ToolCapability 'upkeep'` — the **householder's kit**, a new general-store good (the watering-can affordance precedent). Restores `shellCondition` to 1.0, wears the kit (Law 2 — use-wear on the good). Anyone may perform it; the term says who *owes* it.
- **The landlord's agency performs it:** new kernel brain `lib/behavior/maintains.ts` (cadence trigger; config `{extent}`) — resolves the programme(s) under the extent and dispatches `maintain` as the NPC (bounded by affordance: the NPC carries a kit via `populates:`). Wired onto Katie (dorm) and Walter (Seznick shell) in their seed rows. That is the acceptance's "performed by the owning organization's agency."
- **The ascent gate:** at both chokepoints — `TitleController.executeBuy` and the apartment `LeaseController` — read the actor's current holdings (`ParcelApi.heldUnitsOf(holder)` leases + owned residential lots via the books' extents) and refuse below `residence.ascent.minCondition` (shipped default `0.5` in the settings YAML — authored default, not a kernel dial), with the reason named. Holding nothing passes; the dorm grant has no gate.

---

## Wave 1 — The D17 identity split + the census lint

**Goal:** `templatePath` always resolves to a row; instance identity moves to the `identityPath` axis; the lint joins the family. No behavior change for content; the avatar path strings keep their values everywhere.

**Depends on:** nothing. **Blocks:** everything (Waves 3–5 mint keyed instances under the new regime).

**Files — modify:**
- `packages/server/src/mud/lib/stuff/Stuff.ts` — `#identityPath` slot, `_stampIdentityPath` (gated like `_stampTemplatePath`), `getIdentityPath()` returns stamped ?? templatePath.
- `packages/server/src/mud/api/stuff.ts` — `clone` opts: delete `asTemplatePath`, add `asIdentityPath`; stamp templatePath = source row + identity = minted; registry index + singleton guard key on identity; zone resolution keys on identity (unchanged behavior for avatars).
- `packages/server/src/mud/platform/idea/api/PlayerLogic.ts` — `asIdentityPath`; **delete** the legacy per-player-row fallback (~line 195–210).
- `packages/server/src/mud/platform/idea/Login.ts`, `packages/server/src/mud/platform/idea/cmd/charactergen/EnrollController.ts` — `asIdentityPath`.
- Identity-reader sweep (mechanical; grep `getTemplatePath()` at principal call sites): `ProvisionController.isDormsAgent`, `UnprovisionController`, `TitleController` (buyer path), `ParcelApi.grantUse`/`heldUnitOf` callers, chattel stamp/consign controllers, the domicile stamp, snapshot-owner derivation in `PersistableLogic`. Values unchanged; call reads `getIdentityPath()`.
- Audit: the six registries stand up via `StuffApi.singleton(TemplatePaths.*)`; convert any create-plus-stamp site.
- Test updates in `api/__tests__/player.test.ts`, `cmd/charactergen/__tests__/`, `cmd/civics/__tests__/TitleVerb.test.ts`.

**Files — create:**
- `packages/server/scripts/check-template-census.ts` (per P2).
- `packages/server/package.json` + root `package.json` — `lint:census` entries.

**Tests prove:** a minted avatar's `getTemplatePath()` returns the seed row and `getIdentityPath()` the per-player path; `findByTemplatePath(identity)` still resolves; the singleton guard still fires on identity collision; PlayerLogic materializes with no legacy row present; `pnpm lint:census` passes the tree and fails a fixture with a rowless populate.

---

## Wave 2 — MQL keyed-member locator + address targeting

**Goal:** D16's locator: target a warren/programme (a real row) and narrow to the member by key and/or address.

**Depends on:** nothing (base `Warren.getMembers` exists). **Blocks:** Wave 11's acceptance drives.

**Files — modify:**
- `packages/server/src/mud/api/mql/types.ts`, `parser.ts`, `resolver.ts` — two new filter atoms: `key` (the object's explicit persistence key, via the Persistable narrow; `undefined` otherwise) and `address` (the declared/`getAddress()` string) — both usable in bracket filters (`[key = '/world/…/lot-1/bedroom']`, `[address = 'terminus/hinkley-hills/lot-1']`).
- `packages/server/src/mud/api/mql/scope-walk.ts` (+ `types.ts`) — new element-derivable seed-shaped chain element `members`: expands each element that is `instanceof Warren` to its live `getMembers()` (programmes are warren-shaped after Wave 4 and expand the same way). Resolves **live** members only — a sync query cannot materialize; the locator is for the operator/author surface, and drives admit first.
- `docs/subsystems/mql.md`, `docs/mql-grammar.md` — the atoms + the `members` element documented.

**Tests prove:** `world:[class.DormWarren]:members:[key = '<unitExtent>']` resolves the admitted room; `world:[mixin.PersistableMixin][address = '<addr>']` resolves the same room by address; unkeyed/unaddressed objects never false-match.

---

## Wave 3 — The shared two-tier base + the plat plan; the dorm converges (step 1)

**Goal:** DormWarren's holdings + circulation + reap-invariant machinery lifted into a shared base all three institutions consume; layout becomes authored data.

**Depends on:** Wave 1 (clone regime). **Blocks:** Waves 4–6.

**Files — create:**
- `packages/server/src/mud/lib/location/HoldingWarren.ts` — abstract, `extends Warren`. Owns: keyed holdings map (`_holdingsByKey`), circulation nodes map (`_circulationByNode`), entry doors/gates map, the provisioned + keyway caches (`refreshProvisioned` off `ParcelApi.childParcelsOf(parentExtent)`), `admit(key)` (cache → stand the holding up → wire), `dropHolding(key, {revert})`, node reachability (`nodeReachable` — a node is passable iff any provisioned holding sits on it or beyond it on its road/stair), the reap invariant in `reconcile` (**circulation reaps outside-in / top-down: a node never reaps while a live holding hangs off it or a live node sits beyond it; the graph stays contiguous back to the authored entrance**), `teardown`, and the capacity read (P3: `capacityKey`/`defaultCapacity` fields, `capacity()` via `AppApi.setting`; `assertBelowCap` refuses with the reason). Policy hooks: `standUpHolding(key)`, `circulationTemplateFor(node)`, `wireCirculationNode(node)`, `entryEdgeFor(key)`.
- `packages/server/src/mud/lib/location/PlatPlan.ts` — named value-object: parsed from authored data on the institution row (`plan:` field). Shapes `static` (nodes enumerated, all authored paths) / `linear` (`frontagesPerNode`, node = index — the dorm's floor math) / `branched` (`roads: [{key, segments, frontagesPerSegment, branchesFrom?}]`, node = `(road, segment)`). Surface: `nodeOfSlot(slotKey)`, `nextFreeSlot(taken, cap)`, `nodesInOrder()`, `isAuthored(node)`.

**Files — modify:**
- `packages/server/src/mud/world/eternal/duncan-hall/DormWarren.ts` — re-parent onto `SingletonMixin(PostRegistrationMixin(HoldingWarren))`; floors become circulation nodes (linear plan, `dorm.roomsPerFloor` per P3); `ensureFloor`/`floorReachable`/`reconcile`/`teardown` delegate to the base where lifted; public surface (`admit`, `ensureUnitDoor`, `keywayOf`, `dropUnit`, `roomFor`, `corridorForUnit`) unchanged.
- `packages/server/src/mud/world/eternal/duncan-hall/idea/cmd/ProvisionController.ts` — lowest-free slot via the plan + capacity read (refuses at cap).
- `packages/content/world-seed/content/world/eternal/duncan-hall/dorm-warren.yaml` — `plan: {shape: linear, frontagesPerNode: …}` + capacity fields.
- `packages/content/world-seed/content/settings/residence.yaml` (**create**) — `dorm.roomsPerFloor: 12` + the P3/P10 defaults as they land.

**Tests prove:** new `lib/location/__tests__/HoldingWarren.test.ts` + `PlatPlan.test.ts` over **synthetic fixtures** (lint:test-content: kernel tests never name `/world/`) — reap invariant (outside-in, never under a live holding), contiguity across an empty middle node, static plan provisions with zero minted circulation, branched plan orders slots road-by-segment, cap refusal + admit-after-raise (settings write). **The whole duncan-hall suite passes unchanged** — the pinned convergence proof.

**Live drive:** dorm smoke — Katie leases a room, walk up, walk in, restart, walk back in.

---

## Wave 4 — The residential programme (keyed per holding) + parcel surface

**Goal:** D16's holding-is-a-warren-one-level-down: dormancy-as-unit, wiring, shell condition + weathering clock, tenure terms, the archetype aggregation point; the dorm converges (step 2).

**Depends on:** Waves 1, 3.

**Files — create:**
- `packages/server/src/mud/platform/idea/HoldingProgramme.ts` — instanceable (`PersistableMixin(PostRegistrationMixin(Warren))`-shaped; **no** SingletonMixin — many keyed instances per row; the D1 unique-key guard carries uniqueness). Fields (authored on the row): `floorplan` (list of `{leaf, room (a row path), exits: [{from, to, direction}], entry?: true, door?: {locked: true}}`), `upkeepTerm`, `addressBase?`. Instance state (persistent): `shellCondition`, `shellStamp`. Behavior: `wake()` (stand every room up keyed `(roomRow, <extent>/<leaf>)` via `restoreOrSeed`, wire intra-holding exits + the locked front-door edge, stamp per-room addresses `<addressBase or derived>/<leaf>` via `setAddress`), dormancy-as-unit (aggregated population witness → when no room holds an interactive, capture **all** rooms + self, then reap the whole set — never room-by-room), `reconcileShell()` + `conditionBand()` (P10), `termOf()`, `satisfiedArchetypes()` (P5 union over rooms), `revert()` (end-lease: `evictToStorage(placePrefix)` + markForRevert + record deletes), `keywayOf` support for its front door. Static re-entry resolver: `HoldingProgramme.admitFor(extent)` — enumerate `world:[class.HoldingWarren]` (boot roster), find the institution whose `parentExtent` prefixes the extent, `warren.admit(key)`.
- `packages/server/src/mud/platform/idea/FrontDoorExit.ts` — generic `DeferredDestinationExit`: eager destination = the entry room's **row** (accurate class template), `canTraverse` = `CredentialApi.presentsKey` against the holding's keyway (sync, off the warren/programme cache; empty keyway admits no one), `computeDestination` = programme admit → entry room. Used by Hinkley's house door and the apartment unit doors; `DormDoor` stays (P1).
- Population witness for `FurnishableRoom` members: `packages/server/src/mud/platform/location/FurnishableRoom.ts` gains the folded-in `onContainableAdded/Removed → notifyPopulationChange` witness DormRoom carries (no-op with no warren back-ref — zero behavior change for existing venues).

**Files — modify:**
- `packages/server/src/mud/api/parcel.ts`, `platform/idea/api/ParcelLogic.ts`, `platform/idea/ParcelRegistry.ts` — `heldUnitsOf(holder): ParcelRecord[]` + optional `underExtent` prefix on `heldUnitOf` (the dorm's already-housed check scopes to `DORMS_EXTENT`; the multi-residence ladder needs the plural).
- `packages/server/src/mud/platform/idea/api/PersistableLogic.ts` — `capturePlacement` records `(scope, key)` for a keyed-host container; `restorePlacement` re-enters through `HoldingProgramme.admitFor(key)` (the dorm's Warren reconciliation, generalized). This is the log-out-in-your-yard acceptance.
- Dorm convergence step 2: `packages/content/world-seed/content/world/eternal/duncan-hall/dorm-programme.yaml` (**create**: one-room floorplan citing the `dormroom` row, `upkeepTerm: institution-all`); `DormWarren.admit` routes through the programme; suite pinned.
- `docs/subsystems/parcel.md` — heldUnitsOf note (full doc pass at sweep).

**Tests prove:** programme wake/sleep is whole-holding (rooms + fixtures + placed goods captured together; partial-reap impossible); `(scope=row, key=extent/leaf)` records restore exact state; the front-door edge refuses keyless and admits a presented key; condition declines over advanced game time with the stamp honest across restarts; `heldUnitsOf` returns both a lease and a title; dorm suite green with the programme underneath.

---

## Wave 5 — Hinkley houses: the keyed rework through the LotHolder seam

**Goal:** a bought lot stands up a keyed multi-room house behind a locked door; keys mint at `title buy`; the ascent gate reads there; the branched plan goes live; no rowless paths survive.

**Depends on:** Waves 1–4.

**Files — modify:**
- `packages/server/src/mud/platform/idea/LotHolder.ts` — re-parent onto `SingletonMixin(PostRegistrationMixin(HoldingWarren))`; `provision(lotExtent)` (the designed `@hook` swap) now: `assertBelowCap` → programme admit (`programmePath` authored field) → returns `{room: entryRoom, firstTime}`; `identityFor` + the `asIdentityPath` mint **deleted**; road-segment circulation from the plan (`ensureGate` hangs the lot's `LotGateExit` on its plan node's segment — the authored lane for segment 1, minted `lane-2`/court rooms beyond); boot re-hang unchanged in spirit (re-hang gates for sold lots, now node-aware).
- `packages/server/src/mud/platform/idea/LotGateExit.ts` — eager destination = the **yard row** path (a real row, per P8); `computeDestination` unchanged shape (provision → entry room = the yard).
- `packages/server/src/mud/platform/idea/PlatBook.ts` — generative: `lots:` roster field retires; `lotPrefix` (`lot-`) + capacity via the holder/plan; `extentFor` accepts any `lot-<n>` ≤ cap; `lotExtents()` returns sold ∪ next-free (for listings); `governs()` by prefix + cap.
- `packages/server/src/mud/platform/idea/cmd/civics/TitleController.ts` — DeedDesk venue predicate (P6); the **ascent gate** before payment (P10); after `transfer`: `Lock.mintKeyway()` → `ParcelApi.setKeyway(lotExtent)` → `CredentialApi.issueKey(buyer, keyway, 'pin-tumbler')` (D7 — the dorm sequence at the sale chokepoint); owner writes use `getIdentityPath()`.
- Content (`packages/content/world-seed/content/world/terminus/hinkley-hills/`): `yard.yaml` **moves** to `lots/yard.yaml` (stale "lot 2" header fixed; exits block dropped — the programme wires the gate-return and house door); **create** `lots/hall.yaml` (entry behind the locked door), `lots/kitchen.yaml` (P8), `lots/road-segment.yaml` (the minted road-reach row, "stakes and grass" prose at the unbuilt end), `house-programme.yaml` (floorplan: yard *(entry via gate)*, hall *(door from yard, locked)*, kitchen, living → `/stuff/location/room/living`, bedroom → `/stuff/location/room/bedroom`, bathroom → `/stuff/location/room/bathroom`; `upkeepTerm: owner-all`); `plat-book.yaml` (generative + branched plan per P4); `lot-holder.yaml` (`programmePath`, plan/cap fields; `roomTemplate` retires); `lane.yaml` (comment updates only).
- `packages/content/world-seed/pack.yaml` — boot entry for nothing new (holder/book already boot); title claims unchanged.
- `e2e/tests/hinkley.spec.ts` — `availableLot` helper reads the generative listing; existing specs stay green (lot-1's pre-sold yard is untouched content-wise except its row path — the pre-sold lot re-provisions through the same seam on first walk-in).

**Tests prove (beside content, `src/mud/world/**` + pack suites):** buy a fresh lot → house stands up keyed on the extent; a stranger walks the gate but is refused at the **door**; the buyer's key (physical + keychain) opens it; restart → same house, fixtures, placed good, exact yard re-entry via `(scope, key)`; lot-45 (beyond the retired roster) sells with no authored row; cap refuse/raise/admit; segment 2 impassable until its frontage sells; the court branch materializes as frontage fills; `lint:census` green (no rowless paths survive).

**Live drive (checkpoint 1 — the Hinkley loop):** fund via Governor → `title buy` a fresh lot → key in hand → gate → locked door refuses a second character → enter → rooms furnished from archetypes → buy a good, place it → restart → everything persists; log out in the yard, log back into the *same* yard.

---

## Wave 6 — Mayfield Row: the district, the elastic building, the landlord, the lease loop

**Goal:** D3/D9 — the residential side street, Seznick House as a `UnitBuilding` (the shared base one cardinality up), owner-conferred management, the full lease/unlease loop with keys and evict-to-storage.

**Depends on:** Waves 3–4 (base + programme). Independent of Wave 5 (can land in either order; sequenced after for the shared FrontDoorExit soak).

**Files — create:**
- `packages/server/src/mud/platform/idea/UnitBuilding.ts` — concrete generic institution (`SingletonMixin(PostRegistrationMixin(HoldingWarren))`), fully data-driven: `parentExtent`, `programmePath`, `corridorTemplate`, `lobbyPath`, `plan` (linear), capacity fields. Holdings = unit programmes; circulation = corridors off the lobby (the dorm shape, member = a multi-room unit); unit doors = `FrontDoorExit` (`unit-<pos>` off the corridor). Land-use-agnostic by construction (the future shop unit is this class under `commercial`).
- `packages/server/src/mud/world/terminus/mayfield-row/idea/cmd/LeaseController.ts` + `UnleaseController.ts` — the ProvisionController/UnprovisionController shape verbatim, plus: the **ascent gate** (dorm-holder's condition, P10) before grant; empty-at-move-in (the programme's rows are built-ins-only); keys (`mintKeyway`/`setKeyway`/`issueKey`); domicile stamp; unlease = revoke → `ChattelApi.evictToStorage(placePrefix)` → programme revert → `deleteAllFor` per room key → `retire` → re-key. Authorization at `execute()`: wizard or agent of the building owner (`mayfield-holdings` membership by `getIdentityPath()`).
- Content (`packages/content/world-seed/content/world/terminus/mayfield-row/`): `mayfield-row.yaml` (CartesianZone, 3 m city cells), `street.yaml` (Room; cross-zone cardinal exits both ways to the University Avenue end — the build agent wires the free cardinal on `/world/eternal/university-avenue/crossing` or `…/counting-houses/avenue-block`, both sides explicit, the shipped cross-zone precedent), `seznick-house/lobby.yaml`, `seznick-house/corridor.yaml`, `seznick-house/rooms/{hall,main,bedroom}.yaml` (built-ins only; bathroom cites `/stuff/location/room/bathroom`), `seznick-house/unit-programme.yaml` (floorplan: hall *(entry, locked door)*, main, bedroom, bathroom; `upkeepTerm: landlord-shell`), `seznick-house/building.yaml` (the `UnitBuilding` row: plan linear, `mayfield.unitCap`), `npc/walter.yaml` (tree-dialogue: lease/unlease dispatch **as Walter**; `maintains` brain + kit come Wave 9), `cmd/{lease,unlease}.yaml` + `idea/cmd/{Lease,Unlease}Controller.yaml` (domain views + controller templates, the duncan-hall pattern; `requiresWizard` on the views, real gate at execute).
- `packages/content/world-seed/pack.yaml` — group `mayfield-holdings` (member: walter's path); titles: `/world/terminus/mayfield-row` → `terminus` (landUse residential), `/world/terminus/mayfield-row/seznick-house` → `{group: mayfield-holdings}` (residential; the units subdivide under it); boot: the building row (producer).
- Optional Locality: none (the `terminus/city` claim covers `terminus/city/mayfield-row/...` addresses).

**Tests prove:** lease → empty unit (built-ins only, count pinned) → key opens, stranger refused; place goods → dormancy (whole-unit) → reconstitute; unlease → goods in storage intact + titled, shell reverts, unit re-leases empty and re-keyed (old key is dead metal); a second lease while holding a dorm passes/fails the gate by dorm condition; the building reconstitutes from the durable slot set after teardown.

**Live drive (checkpoint 2 — the apartment loop):** talk to Walter → lease → key → empty unit → buy furniture (after Wave 7 restock; interim: clone-funded goods acceptable for the checkpoint, re-driven fully at Wave 11) → place → restart → persists → unlease → storage.

---

## Wave 7 — Furniture retail + hang/mount

**Goal:** D7/D11 — the store's furniture line; wall placement over Adornable; mounted goods persist owner-side.

**Depends on:** Wave 4 (placement machinery context); independent of 5–6 content.

**Files — create:**
- `packages/server/src/mud/platform/thing/SconceLamp.ts` — `AdornmentMixin` over the portable-light composition (the NeonSign shape, unbranded); row `packages/content/world-seed/content/world/terminus/general-store/goods/sconce-lamp.yaml`.
- Store goods rows (`…/general-store/goods/`): `bedstead.yaml` (cites the generic-bed composition: `lie:1`, `restQuality: 2.0` — the ladder-visible rung above the dorm's 1.5; mass 80 — encumbrance-honest, haulage-eligible), `table.yaml`, `chair.yaml` (× stock 2+), `wardrobe.yaml` (a lockable-later chest/container), plus Wave 9's `householders-kit.yaml`.
- `packages/server/src/mud/platform/idea/cmd/inventory/HangController.ts` + platform view `packages/content/platform/content/platform/cmd/inventory/hang.yaml` (verbs `[hang, mount]`; target the carried good; mounts to the current room's Adornable per P9).

**Files — modify:**
- `…/general-store/counter.yaml` — stockLines + prices for the furniture line (calibrated against the shipped anchors; the bed dearest).
- `packages/server/src/mud/platform/idea/cmd/inventory/GetController.ts` — the dismount branch (P9).
- `packages/server/src/mud/lib/boundary/Adornable.ts` — owned-fixture capture skip/report (P9).
- `packages/server/src/mud/lib/persistence/PersistenceSlice.ts`, `platform/idea/api/PersistableLogic.ts`, `api/chattel.ts` + `ChattelLogic` — the `mounted` placement marker + overlay mount branch (P9).

**Tests prove:** buy stamps the chattel; hang persists across dormancy + restart (mounted, titled, on the wall — not the floor); take-down returns custody; a non-owner cannot dismount another's good in a room whose authority they lack; the room's own record never carries the mounted good; capacity is read, never enforced (a source assertion that nothing gates placement count).

**Live drive (checkpoint 3):** buy a lamp, hang it, restart, it's on the wall; take it down, carry it out.

---

## Wave 8 — Archetype satisfaction + the `survey` read

**Goal:** D15 — the predicate and its dedicated legible read.

**Depends on:** Wave 4 (holding-level union); Wave 7 helps the studio-kitchen test.

**Files — modify:** `packages/server/src/mud/lib/archetype/Archetype.ts` (optional `industry`; `rest`/`presence` needs; `satisfies(space)`), `platform/idea/ArchetypeCatalogue.ts` (residue-only warm path).
**Files — create:** `packages/content/generic-objects/content/archetypes/{bedroom,kitchen,bathroom,living}.yaml` (P5); `packages/server/src/mud/platform/idea/cmd/perception/SurveyController.ts` + platform view `…/platform/cmd/perception/survey.yaml` — `survey` reports, for the current room and (when standing in a holding) the whole holding: satisfied archetypes with what satisfied each, the shell-condition band + cause, and the upkeep term. Read-only, banded prose, no gauge, no score.
**Docs:** furnishing.md's "archetypes need a provisioner" warning closes at sweep (Waves 5–6 are the provisioners).

**Tests prove:** the dorm bedsit surveys as all four; a bare room as none; a studio corner with heat + surface + cold storage reads kitchen *whatever objects satisfied it*; an unrecognized room provisions/persists/functions identically (the no-enforcement pin); nothing anywhere consumes satisfaction as a multiplier (source-walk assertion, the `postedAs` precedent).

---

## Wave 9 — Condition closes: the maintenance act + the agency

**Goal:** D4/D5 acceptance — decline, restore, the term performed by the right party, the gate refusing dilapidation.

**Depends on:** Waves 4–6.

**Files — create:** `packages/server/src/mud/platform/idea/cmd/crafting/MaintainController.ts` + platform view `…/platform/cmd/crafting/maintain.yaml` (tool-conferred, P10); `packages/server/src/mud/lib/behavior/maintains.ts`; `…/general-store/goods/householders-kit.yaml` (the `upkeep` ToolCapability; store-stocked).
**Files — modify:** `…/duncan-hall/npc/katie.yaml` + `…/mayfield-row/npc/walter.yaml` (the `maintains` brain + a kit in `populates:`); `TitleController` / `LeaseController` gate messages name the condition band.

**Tests prove:** decline over elapsed game time with the cause line; `maintain` restores to sound and wears the kit; the Katie/Walter cadence keeps the institution-owed shells sound; a dilapidated dorm-holder is refused at `title buy` with the reason; interior goods show zero clock-wear (the Law-2 regression); the affordance chain for `maintain` (kit carried → verb visible → parseable → executes).

**Live drive (checkpoint 4):** advance the clock (operator), `survey` shows decline; `maintain` with the kit restores; drive the gate refusal + pass.

---

## Wave 10 — The realty office + Ricky

**Goal:** D14 — one office fronting every plat book; purchase fires as the buyer.

**Depends on:** Wave 5 (DeedDesk venue predicate, generative book).

**Files — create:** `packages/server/src/mud/platform/thing/DeedDesk.ts` (+ Registry-office and realty-office rows); `packages/server/src/mud/world/terminus/realty/Realtor.ts` (NPC class registering the `realty-list`/`realty-buy` dialogue effects at postRegister, P6); content `packages/content/world-seed/content/world/terminus/realty/{realty.yaml (zone or folder), office.yaml, desk.yaml, npc/ricky.yaml}` (tree-dialogue: browse → `realty-list`; buy → `realty-buy` prompt→confirm→forceCommand-as-buyer); pack.yaml: title `/world/terminus/realty` → `terminus` (commercial); street wiring: one cross-zone exit pair off an adjacent Terminus room (the build agent picks the free cardinal; both sides explicit).
**Files — modify:** `…/terminus/registry/office.yaml` (populate its DeedDesk); `TitleController` (already predicate-gated in Wave 5 — verify only).

**Tests prove:** the listing spans books (a synthetic second book appears with no code change); the purchase debits the **buyer** through settle; Ricky cannot complete a purchase for an unfunded buyer; the raw `title` verb still works at both desks; rentals do not appear anywhere in realty dialogue.

**Live drive (checkpoint 5 — the realtor loop):** at the office: browse → pick → confirm → funded purchase lands as the buyer; walk to the new lot.

---

## Wave 11 — Drives, docs, and the finalize runway

**Goal:** every acceptance criterion demonstrably reachable; docs landed; one full suite run.

**Files — create:** `e2e/tests/residences.spec.ts` — the three drives as specs (Hinkley loop end-to-end incl. restart persistence + same-yard re-entry; apartment loop incl. surface + wall placement, unlease-to-storage, re-lease empty/re-keyed; realtor loop; cap refuse→`config` raise→admit; branch growth as frontage fills). `docs/subsystems/holding.md` — the permanent record: HoldingWarren + PlatPlan + HoldingProgramme + FrontDoorExit, condition/weathering, terms vocabulary, the four-role table, capacity dials, deferred seams (inn rooms, remodel, HOA, valuation, resale, rent-as-charge).
**Files — modify:** `docs/subsystems/residence.md` (the ladder + convergence + one-line pointer to holding.md), `docs/subsystems/smallholding.md` (holder half: keyed model, generative book, the retired mint; cultivation half untouched), `docs/subsystems/furnishing.md` (provisioner warning closed; mounted placement), `docs/subsystems/persistence.md` (mounted marker; keyed-placement re-entry), `docs/subsystems/parcel.md` (`heldUnitsOf`, keys-at-chokepoints), `docs/slates/builds/stewardship-slate.md` (the blocker section records the 2026-08-31 verification; "Where to start" re-ordered to what shipped), `docs/requirements/apartment-requirements.md` (superseded banner → retired at sweep). **At sweep, not now** (per workflow + worktree rule 5): ref-shapes doctrine edit, CLAUDE.md map line, plan/requirements retirement, dorm-warren-slate customization-scheme retirement decision.

**Then:** the source-change check, ONE full `pnpm test`, all lint families incl. `lint:census`, both loops re-driven live, push, open the MR.

---

## Acceptance-criteria coverage map

| Criterion | Waves |
|---|---|
| Hinkley loop end-to-end | 5 (+1, 4, 7), driven 5 & 11 |
| Apartment loop end-to-end | 6 (+4, 7), driven 6 & 11 |
| Minted stock, cap dial, dormant reconstitute | 3, 5, 6 |
| Shared base + dorm unmoved + whole-holding sleep + branched & static plans | 3, 4, 5 |
| Realtor loop | 10 |
| Archetype recognition | 8 |
| Identity invariant + locator + same-yard | 1, 2, 5 |
| Condition + zero clock-wear on goods | 4, 9 |
| Terms resolve + agency performs | 4, 9 |
| Docs + slate correction | 11 (+ sweep) |
| Suite + lints + affordance chain | every wave; full run 11 |

---

## Risks & opens

**OPEN for the user (genuinely unresolved):**
1. **No new Apis are planned — confirm.** Everything lands behind existing facades (`ParcelApi` grows methods; the programme/warren/plan are Stuff/lib classes; archetypes keep their no-Api rule; MQL grows internals). The nearest miss is the D17 identity sweep touching many call sites — if during the build a genuine orchestration seam emerges (e.g. a `HoldingApi` for cross-institution reads), that is an explicit ask per the module-categories rule, and the build agent must stop and ask rather than invent one.
2. **`settings` contribution from world-seed.** P3/P10 put the shipped defaults in `packages/content/world-seed/content/settings/residence.yaml`. If the pack installer's `settings` kind turns out to be platform-pack-only in practice, the fallback is the platform pack's `content/settings/` — a one-file relocation; flagging so the build agent doesn't treat a reconcile refusal as a design failure.
3. **The store bed's price vs. haulage reality.** An 80 kg bed is un-carryable for most characters by design; the drive uses haulage or a strong character. If the live drive shows the loop too hostile for the acceptance run, the sanctioned adjustment is mass/stock calibration (content), never an encumbrance carve-out.
4. **`realty-buy` prompt cardinality.** If `PromptApi.choice` proves awkward for a long lot list, the fallback is the effect messaging the listing + walking the buyer to typing `title buy <lot>` at the desk — weaker diegesis, same security shape. Planner's default is the prompt.

**Risks (managed in-plan):** the Wave 1 identity sweep is the widest blast radius — it is mechanical (values unchanged) but must be grepped exhaustively; the census lint is the net. The Wave 5 zone constraint (P8) is the build's re-run of the lesson smallholding paid for — the yard-row move is the load-bearing line; the live drive at checkpoint 1 is non-negotiable before Wave 6 starts. The pre-sold lot-1 re-provisions through the new seam on first walk-in against an old-shape snapshot — the DB is dropped, so no compat path is built or needed, but the e2e DB must be reset when this branch first deploys.

---

## Critical files for implementation

- `packages/server/src/mud/world/eternal/duncan-hall/DormWarren.ts` — the machinery being lifted; the convergence pin
- `packages/server/src/mud/platform/idea/LotHolder.ts` — the designed swap seam the keyed rework goes through
- `packages/server/src/mud/api/stuff.ts` — the `asTemplatePath` → `asIdentityPath` channel (D17's mechanical heart)
- `packages/server/src/mud/lib/persistence/Persistable.ts` — the `(scope, key)` spine every keyed room and programme rides
- `packages/server/src/mud/platform/idea/cmd/civics/TitleController.ts` — the sale chokepoint: gate, keys, venue predicate, realtor integration
