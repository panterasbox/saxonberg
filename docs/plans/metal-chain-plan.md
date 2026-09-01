# The metal chain, Stage A — the copper rung — implementation plan

**Input:** [metal-chain-requirements.md](../requirements/metal-chain-requirements.md)
— closed scope, every Surface Decision settled. This plan is the HOW.
Read alongside: [field-substrate-slate](../slates/builds/field-substrate-slate.md)
(the field rules), [mining-slate](../slates/builds/mining-slate.md)
§§ *The mine's machinery* · *The `Deposit` Idea* · *Surveying* ·
*Ground support* · *Room identity*,
[rejection-slate](../slates/builds/rejection-slate.md) § *The venue*,
[metal-chain-slate](../slates/builds/metal-chain-slate.md) §§ *Fuel is
the trade* · *The smelt is physics* · *Recipe scope*, and the subsystem
docs the requirements cross-reference —
[content-packs](../subsystems/content-packs.md),
[persistence](../subsystems/persistence.md),
[parcel](../subsystems/parcel.md), [chattel](../subsystems/chattel.md),
[crafting](../subsystems/crafting.md), [fire](../subsystems/fire.md),
[weather](../subsystems/weather.md), [zone](../subsystems/zone.md),
[advancement](../subsystems/advancement.md),
[command-spec](../subsystems/command-spec.md).

**Build discipline.** One MR, reviewed once; the kernel wave first, packs
and content behind it on the same branch. `pnpm test:near` plus the
touched packs' own suites per wave; **ONE** full `pnpm test` at finalize.
The lint family green every wave. No migrations — content edits plus a
dropped database. Stage by name, never `git add -A`; push every turn.

**Concurrency — do not touch.** `packages/content/terminus/`,
`packages/server/src/mud/lib/location/` and
`packages/server/src/mud/api/mql/` belong to build-2 (residences).
`packages/server/src/mud/lib/husbandry/`, `lib/retail/` and
`packages/content/world-seed/` belong to build-3 (farming). This plan
**imports** from all of them and **edits** none. If a wave appears to
need an edit there, stop and say so rather than making it — see
Risks R7 and R8.

**The five stages.**

| Stage | Waves | What it is |
|---|---|---|
| **K** | K1 | the one kernel wave — the archetype `needs` vocabulary |
| **M** | M1–M9 | `trade-mining`, the mechanism |
| **F** | F1–F2 | `trade-fuel`, the coppice and the burn |
| **S** | S1 | `trade-smelting`, the furnace and the smelt |
| **R** | R1–R6 | `rejection`, the locality |
| **Z** | Z1–Z2 | the live drive, the docs, the finalize runway |

---

---

## ✅ RE-GROUNDED — verified against merged master (2026-09-01)

**Both siblings have merged.** !212 (residences) and !213 (farming) are on
master; this branch has merged master in and is current. **The concurrency
fence is gone** — it survives in this document only as the record of why
the design avoided those trees. Every item below was re-checked against the
merged code, not against an MR description.

**What changed, and what it costs:**

1. ✅ **`MineWarren extends InnerWarren`** — and there is now a **shipped
   non-residential precedent**: `LoungeWarren extends SingletonMixin(InnerWarren)`.
   `HoldingWarren`, `PlatWarren` and `PlatBook` all remain
   **`packages/content/residence/` pack content**, so P7's reasoning and
   P5's `stake` verb both stand unchanged.
2. ⭐⭐ **K1 HALVES.** `CapabilityNeed` on master already carries **eight**
   members — `tool · heatK · bulkSource · surface · seating · coldStorage ·
   rest · presence`. **`presence: string`** is a kind-is-here need
   (`{ presence: toilet }` in the bathroom archetype), which **covers
   haulage and air directly** — `{ presence: pit-pony }`,
   `{ presence: canary }`. So the proposed `species` need is **dropped**,
   and **K1 adds exactly one member: `lightLux`.** ⚠ It inherits
   `presence`'s keyword-match semantics, which is the same ambiguity hazard
   named at the end of this section — author the two species' keywords
   distinctly.
3. ⭐ **The location tier is a real choice, and `lint:locations` gates it.**
   `Room` is gone; the tiers are **`CartesianLocation`** (a row describing
   a KIND of place minted many times — the doc's own example is *"a landing
   per floor"*) and **`SingletonCartesianLocation`** (*"one row IS one
   place"*), and ⚠ **the mixin SUBTRACTS**: a class with it can back ONLY
   singleton templates. So:
   - **R1's Spine** — the five surface rooms, the adit, the three Upper
     Galleries → **`SingletonCartesianLocation`**.
   - **R2's four type rows** — `Face`/`Junction`/`Stope`/`Fall`, each
     minted many times → **plain `CartesianLocation`**.
4. ⚠⚠ **The lint list in this plan was badly short.** Master ships
   **22**: `gates · blessed-bands · field-meta · module-scope · boundary ·
   world-scan · thin-forwarder · pm · imports · does-nothing ·
   inert-weapon · combat-dynamics · instanceable · locations · census ·
   arg-kinds · descriptors · topics · test-bootstrap · test-content ·
   schema · untitled`. **Run the family, not a list** — and note
   `lint:census`, `lint:locations` and `lint:descriptors` all police
   decisions this plan makes (P8's keyed members, the tier choice above,
   and P10's refusal to use the descriptor-bank kind).
5. ✅ **`survey` is on master** — P17 stands unchanged.
6. ✅ **`analyze`/`measure` are unchanged by either merge** — P1's
   dispatch findings and P12's `drive` collision both stand. Build-3's only
   `CommandGiver` edit was the `getInteractives()?.size` null-guard.
7. ⭐ **`Consignment.listingCapOverride` is on master** — M6's ore sale
   should use it; a per-shelf cap is right for ore lots, and it is farming's
   own answer to the same problem.

### ⚠ The hazard both merged builds hit, and mining has worse

Farming's drive found **substring keyword matching makes compound nouns
ambiguous** — *"`pot` matches **pot**ting soil and **plot**"* — and the MQL
"which target?" prompt then swallows following commands. **Mining is denser
in near-identical nouns**: dial/drift, ore/ore-pass, pick/pick head,
face/carve-face, shore/shoring, drive/drift, and now pit-pony/canary as
archetype `presence` keys. **Author keywords defensively from wave one and
drive them early.** Content hazard, not a code one, and far cheaper before
forty rows exist.

## Grounding — facts verified against the code this cycle

File refs are current at plan time. Everything below was read, not
assumed.

**Command views are one document per file, keyed by path.**
`CommandLogic` caches `CommandDefinition`s in a `Map` keyed on the view's
content-relative path (`platform/cmd/perception/measure.yaml`);
`preloadAll` reads every `command-view` document from the store (offline:
every pack's `cmd/**`). There is **no verb-level merge across files**,
and `command.schema.json` is `additionalProperties: false` with no
`extends` / `patch` / `contributes-to` field.

**Dispatch commits on shape, and an unknown subcommand stops the chain.**
`CommandGiver._runChain` (≈ line 970) filters affordances by
`command.hasVerb(verb)` and walks them; only `error: 'shape'` falls
through (line 1052). `CommandLogic.assemble` Phase 2 (≈ line 690) returns
`error: 'unknown-subcommand'` for a token that is not a declared
subcommand, and `_runChain` **stops the chain** on that error. Once a
match binds, resolve/validator failure returns the attempt — no
fall-through. `bindPositionals` (≈ line 2280) judges arity, prepositions
and struct-ness only; **`requires:` is not a shape criterion.**

**Two shipped views may declare one verb.** `platform/cmd/crafting/pour.yaml`
and `platform/cmd/bulk/pour.yaml` both declare `pour`. So a second
definition for a shipped verb is precedented — but ordering, not
`requires:`, decides who claims.

**`platform/cmd/movement/drive.yaml` is afforded by nothing today.**
`DrivableMixin` (`lib/slot/Drivable.ts`) carries no
`commandContributions`, and no `.ts` or `.yaml` in the repo names
`platform/cmd/movement/drive.yaml`. The collision with mining's `drive`
is latent, not live (P12).

**`Sextant` contributes the whole `measure` view.**
`platform/thing/instrument/Sextant.ts` names
`platform/cmd/perception/measure.yaml` in its `environment` and `peers`
buckets. An instrument gates a channel by being *in hand* and the
controller checking (`MeasureAltitudeController` does
`inv.some(i => i instanceof Altimeter)`), not by the view.

**A subcommand names its own controller, and the path may be absolute.**
`CommandDefinition.resolveController` (line 40): a `controller:` starting
`/` **is** the mud template path, used verbatim; no `/platform/` prefix,
no `world/` special case. A controller template that fails to clone is
caught in `CommandGiver._executeOne` (line 1214) and filed as a
`controller-error` note — a legible failure, not a crash.

**`Archetype` (`lib/archetype/Archetype.ts`, 260 lines).** `CapabilityNeed`
is a closed six — `tool` (an open capability string) / `heatK` /
`bulkSource` / `surface` / `seating` / `coldStorage` — validated by
`needOf` against `NEED_KEYS`. There is **no ArchetypeApi and no runtime
evaluator**: the two reads are `describe()` (authored residue + tool/heat
needs derived from the industry's recipes) and `materialize()` (clone each
slot's `default` into a bare `/platform/location/venue`). Nothing gates
on it — `hospitality.yaml` says so in its own header comment.

**`ToolCapability` is an open vocabulary** (`lib/craft/ToolCapability.ts`)
— *"any non-empty string a recipe's `toolCapabilities` and a tool row's
`capabilities` agree on… the kernel keeps no list"*. A capability entry
names no verbs; verbs ride `static commandContributions`.

**`Warren` (`lib/location/Warren.ts`) — abstract, five policy hooks.**
`createMember(): Promise<MemberStuff>` takes **no arguments**;
`admitArrival`, `attachmentFor`, `reconcile`, `wireHostFixtures` /
`unwireHostFixtures` complete the set. The base owns the member set,
host designation/migration, `spawnMember`/`reapMember`, hub-exit wiring,
`teardown`, and `_memberCreateChain` (serialized member clones). Members
are transient instance refs; the base persists nothing.

**`DormWarren` is the keyed-member precedent**
(`mud/world/eternal/duncan-hall/DormWarren.ts`, 437 lines):
`admit(unitKey)` → `createMemberSerialized()` → `PersistableApi.restoreOrSeed(room, unitKey)`
→ its own `_unitsByKey` map; `reconcile()` does
`PersistableApi.capture(room, key)` then tears the room down;
`wireHubExit` is overridden wholesale to wire to a corridor rather than a
hub. Exactly the shape a mine needs.

**`PlatBook` + `LotHolder` + `title buy` are the whole title path.**
`TitleController` (`platform/idea/cmd/civics/TitleController.ts`) does
banking settle → `ParcelApi.subdivide` → `ParcelApi.transfer` → the
book's provisioner. ⭐ `holderFor(book)` returns **null when the book
names no holder** (line 108–115) and `provision` is skipped — so a
`PlatBook` with an empty `holderPath` mints a **title and no room**,
which is exactly a mining claim. `ParcelApi` carries `subdivide`,
`transfer`, `grant`, `ownerOf`, `coveringParcelOf`, `landUseOf`; parcels
resolve by longest path prefix.

**Grade pooling has a shipped hook.** `GlobbableMixin`
(`lib/stuff/Globbable.ts`) exposes `canMergeWith(other)` (default: same
`templatePath`, no shadows) and `onMerged(absorbed)` — an `@hook` with a
no-op terminal *"so subclasses can `super.onMerged()`"*.
`GlobbableLogic.merge` (line 167) calls `survivor.onMerged(absorbed)` at
line 185. ⚠ Verify the absorbed stack still carries its `quantity` at
that point (Risk R3).

**`Material.hardness` already ships** (`lib/material/Material.ts:231`,
persistent, MPa, `fieldMeta` line 607). `element/iron.yaml` authors
`hardness: 350`; `rock/granite.yaml` authors none and is the only rock in
`base-library`. Adding `hardness` to granite and minting `rock/slate` are
**pure content**.

**Occurrence is already a zone fact.** `SpatialZone` carries authorable
`stocks: Record<string, number>` (`lib/zone/SpatialZone.ts:42–57`) and
`ResidencyLogic.regionStockFor` reads it through
`zone.lookupField('stocks')` (line 352) to override a census row's
regional target. There is **no `Biome` occurrence table** — that is
discovery-slate's unbuilt work (P11).

**Zone field inheritance** is `Zone.lookupField<T>(name)` →
`lookupAncestorField` → the enclosing zone (`lib/zone/Zone.ts:128–162`),
reading a `getPascalCase()` accessor first, then the raw field.

**The seed-from-identity precedent** is `WeatherLogic.localitySeed`
(line 106): FNV-1a over the covering Locality's claimed address, XOR the
global base seed; no seed field stored anywhere.

**`CardId` is a closed union in `packages/types`** (`src/index.ts:929`,
`CARD_IDS` at 942) and the client dispatches on it
(`packages/client/src/components/cards/CardBodies.tsx`). `opens_card:` is
**verb-level** in `command.schema.json` (line 81), not per-subcommand;
`CardApi.open` refuses a card the running command did not declare.

**The DISCOVERY realm ships** — `lib/belief/BeliefStore.ts:96` exports
`DISCOVERY = 'discovery'`, and line 359 exempts it from the liveness GC
*"its referent is a place, not a live Stuff"*.

**A pack's `src/` taxonomy** (content-packs.md ≈ line 508): the four
branches, `idea/cmd/<category>/`, **`behavior/`** for brains, `__tests__/`;
no `lib/`, no Api. `packages/content/<pkg>/src/<rel>.ts` **is**
`<root>/<rel>`. `Discipline` rows ship with the pack that derives them
(`trade-distilling/.../idea/Discipline/distilling.yaml`). A trade pack's
verbs report `category: 'domain'` regardless of subdirectory
(`CommandDefinition.category`).

**Nothing in the shipped world sells copper.** The only copper rows are
`base-library`'s `element/copper.yaml`, `alloy/bronze.yaml` (which is
*authored as 88% copper and 12% nothing* — a known lie needing tin, out
of scope), and `trade-hospitality`'s copper mug. The three shipped ingot
rows are all **iron**. ⭐ The copper faucet is closed **by construction**
(P13) — `world-seed` needs no edit.

**`climb` ships** — `platform/cmd/movement/climb.yaml` plus
`lib/locomotion/Climbable.ts` and the `climbing` capability Property.
Winzes need no new locomotion.

**Verb-name availability.** Of the acts, `hew` · `sink` · `raise` ·
`shore` · `smelt` · `char` · `stake` are free. **`drive` and `dress` are
taken** (P12).

---

## Plan-level decisions

### P1 — A pack CANNOT contribute a subcommand to a platform verb

> ⚠ **REVISITED 2026-09-01 — the finding stands, the workaround may not
> be needed.** The user reopened the `measure`/`analyze` model, and
> [instrumentation-slate](../slates/builds/instrumentation-slate.md)
> § *Session addendum* diagnoses the root cause this decision runs into:
> **the unit of affordance is the VIEW and the unit of capability is the
> SUBCOMMAND.** Under the model captured there — an instrument declares
> its own channels and `measure` becomes one verb with a string
> positional (the `cast <spell>` shape, no subcommands) — **mining ships
> a dial and the platform pack is not touched at all.** That retires this
> decision's wart and Risk R4 with it. **If the `analyze` retrofit lands
> before wave M7, use it; the rest of this plan is unaffected either
> way.** What follows remains correct as the answer *within* today's
> subcommand model.

**Resolved against the code; the answer is no, and the reason is
structural rather than a missing feature.**

A command view is **one document, one file, one `CommandDefinition`**,
cached by path. There is no merge, and the schema is
`additionalProperties: false` with no extension key. A second file
declaring `verbs: [measure]` with `subcommands: {strike, dip}` would
produce a *rival* definition, and `_runChain` would not reconcile them:
the first afforded `measure` to bind claims the line, and if the token is
not one of *its* subcommands the result is `error: 'unknown-subcommand'`,
which **stops the chain** instead of falling through. Whichever
definition sorts first shadows the other's whole channel set. That is not
a tuning problem; it is what the dispatcher means by a subcommand.

**So the platform views are edited.** `measure.yaml` gains `strike` and
`dip`; `analyze.yaml` gains `ground`. Three stanzas, in
`packages/content/platform/content/platform/cmd/perception/`.

⭐ **But no kernel TypeScript follows from it.** `resolveController`
accepts an absolute mud path verbatim, so each stanza names a controller
the **mining pack** ships:

```yaml
  strike:
    controller: /trade/mining/idea/cmd/perception/MeasureStrikeController
```

This is the correct home under CLAUDE.md's own rule — *the platform
pack's `content/platform/cmd/` and `mud/platform/idea/cmd/` are the core
trees; nothing content-specific belongs there*. These controllers are
content-specific three times over: they gate on a mining instrument, they
band by the `geology` discipline, and they speak mining prose. Putting
them in `mud/platform/idea/cmd/perception/` would be the antipattern the
rule exists to prevent.

**The cost, and its mitigation.** In an install without `trade-mining`,
`measure strike` is advertised in `measure`'s help and dies on dispatch
with a `controller-error` note — legible, not a crash (verified at
`CommandGiver.ts:1214`). Mitigations, all in M7: the three stanzas'
`help` says the channel needs a surveyor's instrument; a `trade-mining`
test asserts each stanza's controller path resolves to a row the pack
ships; and `command-spec.md` gains a line recording that a platform view
may name a pack controller and what happens when the pack is absent.

**The alternative, weighed and rejected.** Generic kernel controllers
reading a `GeologySource` interface declared in `lib/zone/` would give a
clean refusal everywhere — at the price of a new kernel substrate module,
a kernel-named method contract across the pack boundary, and mining prose
in a core tree. For three stanzas whose only consumer is one pack, that
is more kernel, not less.

### P2 — The archetype vocabulary does NOT cover a mine; widen it by two

**Resolved against the code.** Mapping the requirements' six mine slots
onto the closed vocabulary:

| Slot | Expressible? | As |
|---|---|---|
| support | **yes** | `{ bulkSource: timber }` — a stocked prop stack |
| assay | **yes** | `{ tool: assay-scale }` — the capability string is open |
| survey | **yes** | `{ tool: miners-dial }`, `{ tool: compass }` |
| a place to sell | **yes, re-read** | see below |
| **light** | **no** | — |
| **haulage** | **no** | — |

*"A place to sell"* is not a capability of a venue's contents; it is an
institution. The venue capability the assay shed actually needs is
**weighing and assaying** (`{ tool: assay-scale }`); *whose* money changes
hands is the Business layer, which this build ships four of. No slot, no
widening — recorded here so the requirements' phrase is answered rather
than dropped.

**Light and haulage do not express, and forcing them would break the
⭐ demonstration.** The one falsifiable claim the archetype has to
carry is *"the archetype says you need light underground; Rejection
answers with cultivated glowcap, another mine answers with oil lamps."*
`{ bulkSource: lamp-oil }` binds the oil and refuses the fungus.
`{ tool: lamp }` makes a glowcap bed a tool, which it is not. Haulage is
worse: the pit pony is an animal, and the whole point of the slot is that
haulage is a need any mine has.

**So `CapabilityNeed` gains exactly two members, both mirroring shapes
already there:**

```ts
  | { lightLux: number }      // the heatK / coldStorage shape: a property
                             // of the SPACE, satisfied by any source
  | { species: string }       // the bulkSource shape: a path, satisfied
                             // by a living member of that species
```

`lightLux` is the ⭐ demonstration's whole mechanism — same slot, glowcap
or lamp, and the platform already measures lux (`measure light`,
`AnalyzeLightController`). `species` carries haulage (the pit pony) and
air-reading (the canary), and is plainly reusable — a stable needs a
horse, a dairy needs a cow.

**This is the build's entire kernel-TypeScript footprint**: `NEED_KEYS`,
two `switch` arms in `needOf`, two lines in `Archetype.needKey`, the union
member and its doc comment. One file, ~20 lines, wave K1.

**Fallback if the user wants it smaller:** `lightLux` alone ships and
haulage/air move to the Business roster. Say so before K1; nothing else
in the plan moves.

### P3 — K1 is the only kernel wave; the platform-view stanzas ride M7

*"Kernel waves first"* orders review, and there is exactly one kernel
wave. The three platform-view stanzas are **content**, not kernel source
— and splitting them out ahead of their controllers would land a commit
whose only effect is three dangling controller paths. They land in M7
with the controllers that answer them, in the same commit. Called out
here so the ordering reads as a decision rather than a slip.

The **survey card** touches two further trees that are neither kernel
mudlib nor pack: `packages/types` (the `CardId` union is closed and the
server validates against it) and `packages/client`
(`components/cards/CardBodies.tsx` dispatches on the id). Also M7. The
claim to make in the MR description is precise: **zero edits under
`packages/server/src/mud/` except `lib/archetype/Archetype.ts`.**

### P4 — The geology field: a pure-data `Deposit` Idea, seeded from the zone's address, resolved through one read

The three layers land exactly as field-substrate-slate names them.

**The model** is `Deposit`, a pure-data `Idea` shipped by `trade-mining`
at `/trade/mining/idea/Deposit` (source
`packages/content/trade-mining/src/idea/Deposit.ts`) — the
`platform/idea/material/Material` and `Biome` shape: authorable
persistent fields, hydrated from `template.data`, never cloned per read.
Its data is the mining-slate block verbatim in structure —
`stratigraphy[]`, `waterTable`, `lode {through, strike, dip, thickness,
strikeExtent, dipExtent}`, `zones[]`, `depletion[]`,
`features {pins[], seeded[]}`.

⚠ The requirements' § *The `Deposit` Idea* line calling the class
"kernel" means *code, not content* — the pack table (requirements
line 295) and § *One MR* (line 587) both put the class in
`trade-mining`, and the ⚠ at line 308 is about the **row** being venue
content. The row is `rejection`'s.

**The instantiation** is the zone. `Deposit` is **never handed a seed in
data.** The mine zone declares `deposit: /world/rejection/idea/deposit/ferrow`
and the seed is derived at read time from the covering Locality's address
— `WeatherLogic.localitySeed`'s exact rule, re-implemented in the pack
(field-substrate-slate Open 2: *"resist a premature `FieldApi`"* — two
instances is where a pattern is named, not factored). Rename the mine and
its ore moves; no author manages a magic number.

⭐ **The `deposit` field goes on the shared parent zone, not on the mine
zone.** `Zone.lookupField` walks outward, and the surface pithead must
resolve the same deposit — the outcrop, the float and the three-point
problem are all played **above ground**. So `rejection`'s region zone
carries `deposit:` and both the pithead zone and the mine zone inherit
it. That inheritance is also what makes a second mine's zone pair a pure
content copy.

**The values** are computed and stored nowhere. The class exposes exactly
**one resolved read** and no raw branch:

```
sampleAt(cell, seed) -> GroundSample {
  host, inLode, mineral, grade, water, feature, hardness
}
```

`sampleAt` folds in the order weather's spine invariant requires:
authored **pin** (`features.pins[cell]`) over authored **lean**
(`depletion[]` bands) over the **procedural** value (stratigraphy band →
plane distance → zone band → `mean + spread × roll01(seed ^ hash(cell))`).
An authored pocket and a computed cell are indistinguishable downstream,
and no consumer may reach past `sampleAt`. A second read,
`surfaceReadingAt(x, y, band)`, answers the surveying channels (P6); it
is a projection of the same plane parameters and reads nothing else.

**Determinism** is FNV-1a over the cell string, XOR the derived seed —
process-independent, memoizable by construction. `hardness` comes from
the resolved host `Material` (`getHardness()`), which is why granite gains
the field and slate is minted in M1: **carve cost cannot be priced until
rock carries what metal already does.**

### P5 — Cell ↔ claim: authored parcels at adit level, declared blocks on the warren, no coordinate-extent parcels

The requirements' constraint is the whole design: cheapest answer that
does not foreclose, and *do not invent coordinate-extent parcels*.

**A claim is STAKED, not bought** (revised 2026-09-01). `PlatBook` moved
into the residence pack with the rest of the ladder — and we should not
want it regardless:

> ⭐⭐ **`title buy <lot>` is buying from a catalogue. Staking a claim is
> a first-come registration.**

`PlatBook` is *land-sales* machinery — lots for sale, prices, terms, and a
provisioner that builds you a house. A mining claim has none of that. You
find ground, you post a notice, the recorder writes it down.

So **`trade-mining` ships a `stake` verb** (the name is free), afforded by
the Claims Office counter, whose controller calls the gated `ParcelApi`
directly: `subdivide` beneath the mine's extent, then `transfer` to the
staker. **A pack calling a kernel Api is sanctioned**, no residence
dependency exists, a claim mints a **title and no room**, and the security
invariant is untouched — parcels stay written only by `ParcelApi`, never
declared in content.

**The mapping is declared on the warren, not derived from geometry.**
`MineWarren` carries an authored, persistent `claimBlocks`:

```yaml
claimBlocks:
  - parcelExtent: /world/rejection/ferrow/claims/2
    from: [-10,  0, -45]
    to:   [ 10, 20,   0]
```

`MineWarren.claimFor(cell)` is a linear scan over that authored list;
`holderOf(cell)` is `ParcelApi.ownerOf(block.parcelExtent)`. The parcel
extent stays a **path**; the correspondence is a locality-authored fact
in content. No parcel grows a coordinate, and a property-substrate build
later can replace the scan without touching a title.

**The split estate falls out of the path split, exactly as the
requirements say.** The estate parcel is `/world/rejection` (the surface
grant, covering the pithead rooms by longest prefix); severance is
`subdivide` minting `/world/rejection/ferrow` to a different owner, and
every carved cell under it re-resolves. With no `ferrow` parcel the
surface holder owns what is beneath. Nothing new.

**Ownership of the ore** rides [chattel](../subsystems/chattel.md):
`hew` stamps the lump with `ChattelApi.stamp` — the co-op when the hewer
is on its roster (`EmploymentApi`), the actor when `holderOf(cell)`
resolves to them. Sale is the shipped `consign` at the assay shed.

### P6 — The survey card is fed by the DISCOVERY belief store, and the card renders the belief

Two mechanisms, cleanly separated, and only the second is client work.

**What `measure strike` / `measure dip` / `analyze ground` learn is
written to the belief store's DISCOVERY realm**, keyed by
`(viewer, deposit, observation point)` — per-viewer by construction, so
two characters on one outcrop hold different records, and a survey record
is a tradeable asset rather than a UI cache. DISCOVERY is exempt from the
liveness GC (`BeliefStore.ts:359`) precisely because its referent is a
place, which is what a survey point is.

**The card is a projection of those beliefs and holds no state of its
own.** `analyze ground` opens `survey`; the body is assembled from the
actor's DISCOVERY records for the covering deposit — one row per
measurement point with its reading and error band, plus the solved
parameters where competence makes the inference available. Re-running
`analyze ground` after a third measurement re-projects and the strike row
tightens. Nothing accumulates in the card; the card shows what the
character knows.

**Competence sets resolution and the availability of inference, never the
number.** `AdvancementApi.bandFor(actor, 'geology')` (the `assess`
template, `AssessController.ts:98`) picks the error band; three points
under a band that can solve a plane yield `strike 041 ± 3°`, the same
three under a novice yield three separate `± 15°` readings and no
solution. The underlying figure is `Deposit.surfaceReadingAt`'s and is
identical for both — asserted by test in M7.

**Dip is unobtainable from the surface**, by construction rather than by
a gate: `surfaceReadingAt` projects the plane's intersection with `z ≈ 0`,
which contains no dip information. `measure dip` underground returns it.
That is the push-your-luck decision arriving as a missing parameter.

### P7 — `MineWarren` extends the kernel `InnerWarren`, and keeps its own carve chain

> ⭐ **RESOLVED 2026-09-01 — `InnerWarren`, and NOT a holding.** Residences
> split the base and `Warren.occupantsOf` is now **abstract**, so a bare
> `extends Warren` will not compile. `holding.md` states the tier
> vocabulary applies to *"any warren, not just residential ones"*, and
> `InnerWarren` (`lib/location/InnerWarren`) is **kernel** — the sanctioned
> path for a non-residential warren whose members are rooms.
>
> ⚠ **Not `HoldingWarren`** — but **only** because it lives in
> `packages/content/residence/` and a trade pack must not depend on a
> residence pack. **The fit is otherwise good**, and an earlier draft of
> this decision was wrong to call it *"incompatible by construction."*
>
> ⭐ **A holding is a parcel being put to a use** — tenure plus purpose —
> and `landUse` names the purpose. Rooms serve residential, fields serve
> agricultural, workings serve industrial. The weathering shell is a
> *residential* concern that happens to live on the general class, not a
> defining property of holdings (farming's fields prove it — a field has
> no paint).
>
> ⭐⭐ And `HoldingWarren` is **already** two of this plan's own decisions:
> its identity model is *"each holding gets a keyed instance (scope = the
> row, key = the holding's parcel extent); each room is a keyed instance of
> a REAL room row (scope = the room row, key = `<extent>/<leaf>`)"* — P8
> verbatim — and its member contract *"stays **open to runtime-added
> members** (the cross-build interface with farming's break-ground act):
> the floorplan is the **initial** mint, never the closed set."* It was
> designed for a build that carves rooms at runtime.
>
> **Dormancy is not lapse.** Held workings would sleep and wake whole like
> any holding. **Provisional ground was never a member** — it is the
> commons you are cutting into, and it reverts because you never secured
> it. Which makes *"shoring is this mine's provisioning act"* literal:
> **shoring is what admits a cell to the holding.**

> ⭐ **So shape `MineWarren` for a base swap, not a redesign** (see P8's key
> convention). When `HoldingWarren` graduates to kernel — **Stage B, with
> mining as the second consumer, per the two-consumers rule** — adopting it
> is `extends InnerWarren` → `extends HoldingWarren`. The only genuinely
> residential residue to leave behind or make optional is the **shell
> condition and weathering clock**; everything else that class owns
> (keyed identity, dormancy as a unit, tenure term, archetype aggregation,
> runtime-added members) is general.

`Warren` is build-2's tree and `createMember()` takes **no arguments**,
while a mine carves a *keyed* member of one of *four* type rows. Both
facts are load-bearing and neither needs a kernel edit.

`MineWarren extends InnerWarren` (pack source
`trade-mining/src/idea/MineWarren.ts`; a Warren is an `Idea`, so it sits
under the `idea/` branch) and:

- implements the five abstract hooks — `createMember()` clones
  `this._carveType`, `admitArrival` lands at the adit, `attachmentFor`
  is unused (see below), `reconcile` culls cold Provisional cells,
  `wireHostFixtures`/`unwireHostFixtures` are no-ops (a mine has no
  host fixture; the adit is an authored singleton, not a member);
- **overrides `wireHubExit` wholesale**, the `DormWarren` precedent
  (`DormWarren.ts:312`), to wire the new cell to its already-carved
  orthogonal neighbours rather than to a hub;
- carves through **its own serialization chain**: `carve(cell, type)`
  awaits `_carveChain`, sets `_carveType`, calls the base's
  `createMemberSerialized()`, then `addMember` +
  `PersistableApi.restoreOrSeed(room, cellKey)`. The subclass chain is
  what makes the field-set and the clone atomic; the base's chain still
  serialises the clone itself. Nested chains are fine.

`getHost()` / `spawnMember()` are never called — the mine has no elastic
host — so `createMember()` is reachable only through `carve`. That is
deliberate and comment-documented, not dead code.

**The carved-set ledger is instance state on the warren**, persisted
through `PersistableApi.capture/materialize` into `holder_snapshots` —
`{cell, tier, holder}` per entry, plus a sparse `workedFaces`
`(cell, direction) → ore remaining`. **No new Mongo collection**, so
`lint:schema` needs no new doc, exactly as the requirements require.

**Stability and air are derive-on-read over that ledger**, never stored:
`stabilityAt(cell) = f(span, ground, support, water)` where span comes
from the carved set, ground from the resolved host `Material`, support
from the timber sets present and their `Durable` condition, water from
the wetness substrate — **a threshold, never a roll**.
`airAt(cell)` is a function of the workings' own topology: distance along
the carved graph to a through-connection, so a dead end degrades and a
holed-through one recovers. Both are pure functions of facts already
held.

### P8 — Room identity: four type rows as locality policy, the coordinate as the key

Per residences D17 and the requirements' § *Room identity*, and with no
MQL work of any kind (build-2 shipped the `:members` + `key`/`address`
locator; this build only *uses* it).

- **Spine** — the five surface rooms, the adit and the three Upper
  Galleries are **authored singletons**, real rows in `rejection`, one
  instance each. Never members. ⭐ Class:
  **`SingletonCartesianLocation`** — *"one row IS one place"*, and
  `lint:locations` checks the choice.
- **Workings** — every carved cell is a **keyed member**: scope is one of
  `rejection`'s four type rows (`Face` / `Junction` / `Stope` / `Fall`),
  key is **`<claimExtent>/<cell>`**. ⭐ The four type rows take **plain
  `CartesianLocation`** — a kind of place minted many times; ⚠ *not* the
  Singleton face, whose mixin SUBTRACTS and would refuse the second clone. ⭐ **Not a bare coordinate** — this
  matches `HoldingWarren`'s shipped `<extent>/<leaf>` convention, so the
  Stage-B graduation is a base swap; and it puts **claim scoping in the
  key**, which makes part of `claimFor(cell)` derivable rather than a
  ledger scan. `restoreOrSeed(room, key)` is the whole identity mechanism;
  nothing mints a template row, and `lint:instanceable` passes because
  every `class:` and `templatePath` belongs to one of the four authored
  rows.
- **The warren itself** is keyed on **the claim's parcel extent**
  (`scope = an authored `rejection` row, key = the extent`) — again
  `HoldingWarren`'s convention, taken now so it costs nothing later.
- **Geology** — no identity at all.

⭐ **The four type rows are LOCALITY content and are passed in as
policy.** `MineWarren` reads them off an authored field on its own row
(`typeRows: {face, junction, stope, fall}`), and `_carveType` selects
from it. A second mine supplies sandstone galleries and the machinery
does not care — which is the falsifiable test the requirements set.

**The key is the coordinate, and so is the survey address.** The room's
declared Locality address is
`terminus/rejection/ferrow/<level>-<bearing>`; the persistence key is
`x,y,z`. One fact, three faces (key, address, MQL atom).

### P9 — Grade pools through the shipped `onMerged` hook

`Ore` (`trade-mining/src/thing/Ore.ts`) composes `GlobbableMixin` and
carries **one new field, `grade`** — a fraction, persistent, authorable,
explicitly **not** `GradedMixin` (that is the `poor…masterful` quality
band). `canMergeWith` keeps the shipped default (same `templatePath`,
no shadows), so **two lumps of one ore row pool regardless of grade**,
which is what happens in a cart. `onMerged(absorbed)` overrides to
mass-weight the average:

```
grade = (grade*qty + absorbed.grade*absorbed.qty) / (qty + absorbed.qty)
```

then `super.onMerged(absorbed)`. Zero kernel. Assay is per-lot at the
scale, reading the pooled figure — and the lie moves from physics to
declaration, which is the requirements' point about high-grading (the
*offence* is Stage B; the pooling and the honest assay ship here).

### P10 — Prose vocabulary is authored data on the type rows, NOT the `descriptor-bank` document kind

The requirements invoke *"the `arcana` precedent"* for descriptor banks.
The **idea** transfers; the **document kind does not**, for a checkable
reason: `content/descriptor-banks/<kind>.yaml` exists to give an
*unidentified item* an appearance (`primary`/`secondary` axes,
`unidentifiedLong`), and `pnpm lint:descriptors` enforces
**descriptor ∩ material keywords = ∅ in both directions**. Mining prose
must name slate, quartz and malachite — the lint would refuse it, and
rightly.

So `rejection`'s four type rows and its Deposit row carry authored word
banks as plain data (`backPhrases`, `seamPhrases`, `airPhrases`,
`groundPhrases`), drawn deterministically by the cell seed and rendered
through `ProseApi`. The materials the prose names stay commons; the voice
is the locality's. A second mine overwrites the banks and nothing else.

### P11 — Occurrence is the zone's `stocks`, not a new `Biome` table

*"Author the biome, override the exception"* is discovery-slate's rule,
and discovery-slate is **designed, not built** — `Biome` carries no
occurrence table today. Building one is that slate's build, not this one.

The shipped expression of the same rule is `SpatialZone.stocks`
(`{censusKey: count}`, authorable, read by `ResidencyLogic` through
`lookupField`). `rejection`'s mine zone declares its ecology's census
keys there; a second mine's zone declares different ones. That satisfies
*"occurrence is a fact about the place, not the species"* with zero new
substrate, and it keeps `species-and-names` from growing.

⚠ `stocks` is per-zone, so depth-banded ecology is not expressible. The
requirements put the middle and deep bands out of scope, so one
zone-level table is exactly enough. Recorded as the seam a later build
widens.

Depth-banded **atmosphere** is separate and already works: `rejection`
ships cave `Biome` rows and the mine cells resolve light/air/heat by `z`
through the shipped biome chain.

### P12 — `drive` collides with a shipped verb; `dress` is not a verb here

`platform/cmd/movement/drive.yaml` ships (vehicles) and takes one
required object positional — **the same arity** as `drive <direction>`.
`requires:` does not discriminate at shape, so the two would be separated
only by affordance order.

**Mitigating facts.** Nothing in the repo affords the movement view
today (`DrivableMixin` has no `commandContributions`), and the two-`pour`
precedent shows coexistence is intended. So:

- mining ships `trade/mining/cmd/mining/drive.yaml` with
  `verbs: [drive, drift]`, one string positional;
- **M3 ships the tripwire**: a test that synthesises a `Drivable`
  affording the movement view in the same room and asserts
  `drive north` reaches the mining controller. If the chain proves
  order-dependent, the fix is one line — swap the order in the `verbs:`
  list so `drift` is primary — and the build reports it to the user
  rather than silently renaming an act the requirements named;
- `command-spec.md` gains a line recording the collision and the rule.

**`dress` is taken** (clothing) and is **not** in the requirements' act
list. Hand cobbing rides the shipped `make` with a recipe over an
engagement, not a new verb. Nothing to resolve.

### P13 — The faucet is closed by construction; the wave is a test, not an edit

⭐ **No shipped content sells or spawns copper stock.** The three ingot
rows in the repo are iron; `world-seed`'s
`terminus/general-store/counter.yaml` stocks **iron**, which this build
does not close (that is the iron rung, Stage C). So *"nothing in the
shipped world mints copper stock from nowhere"* is already true, and the
acceptance criterion is met by an **asserting test**, not an edit.

⭐ This is what keeps the build off build-3's tree entirely:
`packages/content/world-seed/` is **never touched**. The test lives in
`trade-smelting`'s own suite and scans every pack's `stockLines` /
`populates` / `offers` for a copper-composed row with no producer.

`base-library`'s bronze lie (88% copper, 12% nothing) needs tin to fix
and stays as it is — recorded in the sweep notes, not fixed here.

### P14 — The coppice imports build-3's husbandry and edits none of it

`trade-fuel`'s managed stand is `GrowingMixin` +
`CultivableMixin` over authored beds, exactly as farming ships them.
`packages/server/src/mud/lib/husbandry/` is **read-only to this build**.
If the coppice needs a growth-model change — a cut-and-regrow cycle the
fruit cycle does not cover — **stop and say so** rather than editing:
the honest Stage-A answer is a coppice authored *already grown* with a
long `goodAt`, harvested by the shipped `harvest`/`pick` path, and the
rotation seam named in a comment for whoever lands coppicing properly.
Same rule for `lib/retail/`: the yard's charcoal sale is the shipped
`consign`/`buy` path, unmodified.

### P15 — Where each row lives, and what a second mine copies

Four packs, per the requirements' table. Stated as file layout so a
reviewer can check membership by path.

| Pack | `src/`? | Root | Title claim |
|---|---|---|---|
| `trade-mining` | yes | `/trade/mining` | `/trade/mining` |
| `trade-fuel` | yes | `/trade/fuel` | `/trade/fuel` |
| `trade-smelting` | yes | `/trade/smelting` | `/trade/smelting` |
| `rejection` | **no** | `/world/rejection` | `/world/rejection` |

⭐ `rejection` ships **no TypeScript at all** — the `hearthworks`
precedent. Every class it names belongs to one of the three trades or the
platform. That is what makes *"a second mining town needs zero pack
code"* true rather than aspirational, and the Z2 exemplar note is written
by listing `rejection`'s files and observing that none is `.ts`.

The root is `/world/rejection`, **not** `/world/terminus/rejection` —
a claim nested inside build-2's terminus claim would contend at install
and couple the two packs. Arrival is by TPA (the moor/substation
precedent); **no file in `packages/content/terminus/` is touched** and
the walked valley road lands when residences merges.

`base-library` gains four material rows and one field (P4); no other
pack gains anything.

### P16 — Recipes ship iff an act here demands the object and it fills a missing rung

crafting.md's gating is not re-opened: open canon, reading mints the
known-of claim, only a first faithful by-hand performance mints the deed.
⚠ **`hew`/`drive`/`sink`/`raise`/`shore` acquire no deed gate** — they
are labour, and gating labour on a deed is the band-gate violation
wearing a hat. The M8 recipe set is metal-chain-slate's Wave A minus
everything Stage A cannot reach: **mining 9** (timber set, pick haft ·
shovel, pinch-bar, billhook · pick head, sledge, felling axe, tongs),
**instruments 2** (the miner's dial, the assay kit — the top rung, and
rightly), **fuel 1** (charcoal), **smelting 2** (smelt oxide copper,
cast a bar). Roasting, bronze, bloomery iron and steel are the rungs
Stage A does not reach; Wave B's arms and armor are out.

### ⭐⭐ P18 — The warren creates rooms; it does not interpret them

**A bespoke, hand-authored mine — all singletons, no warren — must work.**
That is not a nicety: the exemplar test already says *a second mining town
needs zero pack code*, and **a static hand-built mine is the most likely
second mine anybody authors.** If the substrate only functions when the
warren drives it, the exemplar claim is false.

An earlier draft of P7 put `stabilityAt`, `airAt` and `facesOf` on
`MineWarren`, deriving them from its carved-set ledger. **That breaks the
static case outright** — no warren, no ledger, no ground refusal and no
foul air, which is half of what makes a mine a mine. It also contradicts
the rule this plan quotes approvingly from the content bible:

> *"the Warren bud/reap machinery is the **mutation** layer, the
> `CartesianZone` is the **space**."*

A read placed on the mutation layer. So:

> ⭐⭐ **The warren creates rooms. It does not interpret them. Reads go to
> the space.**

**`WorkingMixin`** (`trade-mining/src/…`) is composed by the mine's room
class and derives everything from **the room itself and its zone**:

| Read | Derived from |
|---|---|
| `facesOf()` | the neighbour cells' geology — a zone lookup by coordinate |
| `stabilityAt()` | span (*which neighbouring cells are open rooms* — a zone lookup, **not** a ledger scan) · ground (the deposit's host material) · support (**the timber sets in this room**) · water |
| `airAt()` | a walk over the **exit graph** to a through-connection |

**A hand-authored room composing `WorkingMixin`, at real coordinates in a
deposit-bearing zone, behaves identically to a carved one**, because
nothing consults how it came to exist.

`MineWarren` keeps only what it genuinely owns: **`carve` · `abandon` ·
the tier ledger · seal-and-reap.** Which is closer to residences' own
framing of the base — *"a coordinator, not a containment tier."*

⭐ **And a static mine is simpler in one place**: authored rooms have real
paths, so `ParcelApi`'s longest-prefix resolution answers *whose claim is
this* directly. **The `claimBlocks` coordinate mapping (P5) is a workaround
for keyed members not having distinct paths — a static mine does not need
it at all.**

**What a static mine still cannot do, and should not:** carve, the
Held/Provisional tiering, seal-and-reap. Those *are* the elastic half.
**A static mine is a mine that does not grow** — every room is Spine by
definition — which is a coherent thing to be, not a degraded one.

### P17 — `survey` answers in the mine, and is NOT the geological read

Residences shipped **`survey` as a platform verb** — *"take stock of the
place you're standing in."* Two decisions, and they point opposite ways.

**We do not fold the geological read into it.** Its own help states the
contract: *"Nothing in the game is gated on any of this… the survey is a
mirror, not a score."*

> ⭐⭐ **`survey` is a MIRROR. The mine's read is a MEASUREMENT.**

The geological read is instrument-mediated, competence-banded, and the
thing a player pays for and acts on — the opposite of a read nothing is
gated on. Two more reasons, both concrete: `survey` takes **no target and
no channel** (parameterising it for strike, dip and grade re-creates
exactly the subcommand accretion this build is already working around),
and its archetype filter excludes us **by design** — *"room archetypes are
the industry-less ones,"* and the mine archetype is an industry one.

**But `survey` should work in a mine, and it is free.**
`SurveyController` reads its holding half **duck-typed by shape** through
the `WarrenMember` back-ref — *"never by import: the residential programme
is a capability pack's class and the kernel does not import packs."*

⭐ **That seam is open to us.** `MineWarren` answering the same shape gets
`survey` reporting honestly in a working — *a stope, shored, on claim 3* —
with **no kernel change, no platform edit and no residence dependency.**
The mirror doing its job in a new venue is what it was built for.

So the surface reads in three layers, matching
[instrumentation-slate](../slates/builds/instrumentation-slate.md)'s own
line:

| | Verb | What it is |
|---|---|---|
| **the mirror** | `survey` — shipped, free, ungated | *what is this place* — a stope, shored, whose claim |
| **the measurement** | `measure <channel>` | instrumented, banded, load-bearing |
| **the interpretation** | `analyze ground` | route-gated synthesis with error bands |

⭐ `analyze ground` is therefore clearly the **interpretive** read rather
than a place-identity one, since `survey` covers that half for free. If the
instrumentation retrofit lands before M7, `analyze ground` likely folds
into the channel model and P1's platform edit drops to zero.

---

## Stage K — the kernel

### Wave K1 — the archetype `needs` vocabulary

Per P2, **as reduced by re-grounding item 2**:
`packages/server/src/mud/lib/archetype/Archetype.ts` gains **exactly one**
`CapabilityNeed` member — **`lightLux: number`** — with its entry in
`NEED_KEYS`, its validation arm in `needOf` (a positive finite number, the
`heatK`/`seating`/`rest` shape), its arm in `Archetype.needKey`, and a
doc-comment paragraph matching the existing eight.

⚠ **`species` is dropped**: master's shipped **`presence: string`** already
answers *a thing of this kind is here*, so haulage and air author as
`{ presence: pit-pony }` and `{ presence: canary }`.

**Tests:** extend `platform/__tests__/ArchetypeCatalogue.test.ts` — a
`lightLux` slot round-trips through `fromData` → `toData`; a zero or
negative `lightLux` fails with the archetype id in the message; `needKey`
merges two `lightLux` slots; the shipped `hospitality.yaml` is
byte-identical in `describe()` output (the no-regression pin).

**Unblocks:** M8. Nothing else depends on it, so K1 can land first and
sit.

---

## Stage M — `trade-mining`

### Wave M1 — the pack, the materials, and the `Deposit`

**The pack scaffold**, the `trade-smithing` shape:
`packages/content/trade-mining/{pack.yaml, package.json, tsconfig.json,
vitest.config.ts, README.md, content/, src/}`; `pnpm-workspace.yaml`
already globs `packages/content/*`. `pack.yaml`: `root: /trade/mining`,
a `mining` group owned by the prime minister, `title: [{extent:
/trade/mining, holder: {group: mining}}]`. Dependencies:
`@saxonberg/server`, `@saxonberg/types`, `@saxonberg/content-platform`,
`@saxonberg/content-base-library`.

**The materials** (`base-library`, the four rows the requirements
budget): `rock/slate.yaml` (new — density, hardness ~90 MPa, the
`sedimentary`/`foliated` tags, `cleavage` in the prose);
`rock/granite.yaml` gains `hardness: 200` (the shipped `Material` field,
authored nowhere on rock today); `mineral/malachite.yaml`
(Cu₂CO₃(OH)₂ — the visibly green oxide ore), `mineral/quartz.yaml`
(the gangue), `mineral/chalcopyrite.yaml` (CuFeS₂ — declared below the
water table so the survey's *"sulfides below, if it holds"* inference has
a real referent Stage A cannot reach). Each carries `formula` and
`molarMass` so the smelt's yield is chemistry, not a dial.

**`src/idea/Deposit.ts`** per P4: the authored fields, the derived seed,
`sampleAt(cell, seed)`, `surfaceReadingAt(x, y, band)`,
`waterTableOf()`, `hostAt(z)`, and the FNV-1a `hash`/`mix`/`roll01`
trio. No Api, no `lib/`, no exported helpers — the arithmetic is private
methods on the class.

**Tests** (`trade-mining/src/idea/__tests__/Deposit.test.ts`, over a
synthetic deposit row — never shipped content, so `lint:test-content` is
satisfied by living in the pack anyway):
determinism (the same cell twice, and across two freshly-constructed
instances); the seed changes with the address and only with the address;
a cell inside the lode plane is ore and one `thickness` away is barren;
the zone band switches at `waterTable`; the depletion lean scales the
computed grade without replacing it; an authored pin and a computed cell
are **indistinguishable** through `sampleAt` (the spine invariant, and
the test asserts it by shape rather than by value); barren is the default
across a random walk of 1000 cells; hardness resolves off the host
material and granite/slate differ.

**Unblocks:** everything.

### Wave M2 — `WorkingMixin` and `MineWarren`

Per P7, P8 and **P18 — two classes, and the split is the point.**

**`WorkingMixin`** (composed by the mine's room class, and by any
hand-authored mine room) owns every **read**: `facesOf(cell)` (the
ten-direction model, off the neighbour cells' geology), `stabilityAt()`
(span from a zone lookup, ground from the deposit, support from the timber
sets present, water from the wetness substrate) and `airAt()` (a walk over
the exit graph to a through-connection). ⭐ **None of these consults a
warren**, so a fully authored static mine behaves identically.

**`MineWarren`** owns only the **mutation**: `src/idea/MineWarren.ts`: the five hooks, the carve chain,
`carve(cell, type)`, `abandon(cell)`, the `{cell, tier, holder}` ledger
and the sparse `workedFaces` map, `claimBlocks` + `claimFor(cell)` +
`holderOf(cell)`, `typeRows` policy, `promote(cell)` / `demote(cell)`
(Provisional ↔ Held), seal-and-reap, **the duck-typed `WarrenMember` shape
`survey` reads by (P17)**, and the `wireHubExit` override wiring
orthogonal neighbours. Capture/restore through `PersistableApi`.

**Tests** (`src/idea/__tests__/MineWarren.test.ts`, synthetic type rows
and a synthetic deposit): a carve mints a keyed member and no template
row; two carves of one cell are refused (the `(scope,key)` singleton
invariant); Provisional culls on `reconcile` and re-carving regenerates
the identical tunnel from the seed; Held survives a capture/materialize
round trip **with its contents**; the ledger round-trips through
`holder_snapshots` and no new collection appears; `facesOf` reports a
seam where the neighbour is ore and a carve-face where it is barren;
`claimFor` finds the declared block and misses outside it;
`airAt` degrades along a dead end and recovers when holed through;
`stabilityAt` is monotone in span and in support condition and never
consults a random source.

**Unblocks:** M3–M6.

### Wave M3 — the acts: `hew`, `drive`, `sink`, `raise`

`content/trade/mining/cmd/mining/{hew,drive,sink,raise}.yaml` +
`content/trade/mining/idea/cmd/mining/*Controller.yaml` +
`src/idea/cmd/mining/*Controller.ts`. All four report
`category: 'domain'` (derived from the tree, per `CommandDefinition`).
Afforded by the working rooms' class and by the pick
(`static commandContributions`), never by a core mixin.

- **`hew <face>`** — an engagement over game time against reserve;
  duration scales with the host material's hardness; mints an `Ore`
  lump stamped with the resolved `grade` and its chattel owner (P5),
  decrements `workedFaces`, and credits `geology` at **world-derived**
  difficulty. **No deed gate.**
- **`drive <direction>`** — carve cost = hardness × cell; refuses on
  bad ground with a reason naming the state (M4); calls
  `MineWarren.carve` on success. Per P12, `verbs: [drive, drift]` plus
  the collision tripwire.
- **`sink` / `raise`** — the vertical pair; the winze is reached by the
  shipped `climb`, and the exit pair carries the `climbing` mode.

**Tests:** each act's happy path over the M2 fixture; carve cost tracks
hardness (slate cheaper than granite, ore cheaper than barren);
`hew` mints a lump whose grade equals `sampleAt`'s figure exactly (the
*competence never multiplies yield* pin — two actors of different bands
get the same number); reserve is spent and the engagement is
interruptible; **no `requireDeed` appears on any of the four**, asserted
by reading the views; the `drive` collision tripwire.

### Wave M4 — ground support: the timber set, `shore`, refusal, face falls

Per the requirements' § *Ground support*. `src/thing/TimberSet.ts` —
a placed `Durable` object, maintained on the shipped repair economy
(`analyze` reads its condition, `repair` restores it); it is **not a
flag**. `shore.yaml` + `ShoreController`: place a set, and — this is the
act that writes the record — **promote the cell from Provisional to
Held**, which is what makes *"shoring is this mine's provisioning act"*
literal.

Refusal: `drive` and `hew` consult `stabilityAt` and stop with a reason
naming the state (*"the back is working here — set timber before you cut
further"*). Loose falling: a face below threshold **blocks that face**
(cleared by an engagement), never the room; a bruise through the shipped
harm system. The free telegraph (creaking timber, dust, drummy rock)
rides the room's prose off the same threshold.

**Tests:** an unshored heading refuses further driving and the refusal
names the state; shoring clears it; a decayed set re-raises the refusal;
a face fall blocks exactly one face and the room stays traversable; **no
character can be trapped or killed by ground**, asserted by driving a
character into a fully-blocked cell and confirming every exit and their
vitals; stability is a threshold — the same inputs give the same answer
across 100 evaluations.

### Wave M5 — air, the canary, the pit pony

`airAt` (M2) becomes visible. `src/agent/Canary.ts` — a caged bird whose
**behaviour** tracks the air value and whose silence is the reading; it
is the only free reading of it, and it can die. `src/agent/PitPony.ts` —
haulage: pulling a cart at a measurably lower draft cost (the shipped
`encumbrance` surface) than a character carrying the same load. Both are
**functional**, hence trade content, and both land at the
`/stuff/idea/species/…` commons **path** with their rows inside
`trade-mining` (the requirements' § *Species* rule; `species-and-names`
does not grow).

Air is the build's only lethal hazard, riding shipped `respiration` and
mortality's rescuable dying clock — with a free continuous warning, an
obvious unilateral escape, and no rescue required.

⭐ **The canary is not redundant with a nose.** Sour, sulfurous air
announces itself; blackdamp and CO do not — the historical reason for the
bird. Author the two classes distinctly so the nose warns on one and only
the canary warns on the other. ⚠ **The aether reaches underground** —
implant comms keep their shipped distance-free property, and nothing in
this build gates or degrades them.

**Tests:** a dead-end heading degrades and recovers when connected
through; the canary's behaviour tracks the value and precedes the
character's own symptoms; **odourless bad air is caught by the canary and
NOT by smell, while sour air is caught by both**; a character who ignores it can die and can
always walk out; the pony's draft cost is measurably lower than a
character's for the same load.

### Wave M6 — the ore lump: grade, pooling, ownership, sale

Per P9. `src/thing/Ore.ts` (`Globbable`, `grade`, `onMerged`), the
oxide-copper ore row, hand cobbing as a `make` recipe over an engagement
(P12 — no `dress` verb), `ChattelApi.stamp` at `hew` with the co-op /
holder rule, and the sale: the shipped `consign` at the assay shed with
payment on assay, which is the historically exact delay and zero new
mechanism.

**Tests:** two lumps of different grade pool to the mass-weighted
average; the pooled figure survives a split; `analyze` reads the grade
back; a lump cut on tutwork resolves to the co-op as owner and one cut on
a held claim to the holder; consign/reclaim round-trips.

### Wave M7 — surveying, the instruments, the discipline, and the card

The build's widest wave; three trees.

**Platform content** (P1, P3):
`packages/content/platform/content/platform/cmd/perception/measure.yaml`
gains `strike` and `dip`; `analyze.yaml` gains `ground` and
`opens_card: survey` at verb level. Each stanza names its controller
absolutely under `/trade/mining/idea/cmd/perception/`; each `help`
states the instrument it needs.

**`packages/types`** (`src/index.ts`): `"survey"` joins the `CardId`
union and `CARD_IDS`, and the cockpit arrangement map if it enumerates.

**`packages/client`**: a `survey` body in
`components/cards/CardBodies.tsx` — a table of measurement points, each
with reading and error band, and the solved parameters where available.
⚠ Not a map, not a minimap; the card is the whole of the client work.

**`trade-mining`**: `src/idea/cmd/perception/{MeasureStrike,MeasureDip,
AnalyzeGround}Controller.ts` + their controller rows; the instruments
(`src/thing/instrument/{Compass,MinersDial,HandLens,AssayKit}.ts`, each
with `commandContributions` naming `platform/cmd/perception/measure.yaml`
— the `Sextant` shape); the `geology` `Discipline` row
(`content/trade/mining/idea/Discipline/geology.yaml`, ISCED-F 0532,
`channel: skill`); the DISCOVERY writes.

**Tests:** three surface measurements narrow strike to a tighter band
than one does; **dip is unobtainable from the surface** and obtainable
underground; a barren survey returns an informative negative naming *why*;
the same cell read by two characters of different band returns the
**identical** underlying figure at different resolutions (the test
asserts the identity, not the presentation); two characters on one
outcrop hold different DISCOVERY records; each platform stanza's
controller path resolves to a row `trade-mining` ships; no instrument in
hand refuses with `no-instrument` (the `MeasureAltitudeController` shape).

### Wave M8 — the mine archetype and the recipe ladder

Per K1, P2 and P16. `content/archetypes/mining.yaml`:
`archetypeId: mining`, `industry: mining`, and the slots —
`light {lightLux: 20}` **with no default** (the ⭐ divergence slot),
`haulage {species: …/pit-pony}`, `air {species: …/canary}`,
`support {bulkSource: timber}`, `assay {tool: assay-scale}`,
`survey {tool: miners-dial}`, `strike {tool: compass}`,
`winning {tool: pick}`. Defaults name `trade-mining` rows only where the
trade genuinely owns the row; the rest `rejection` binds.

The recipes: mining 9 + instruments 2, in `content/recipes/`, each on the
rung P16 names, each demanded by an act this build introduces.

**Tests:** the archetype loads and `describe()` reports every slot; the
tool/heat rows the mining recipes derive merge into the authored slots
rather than duplicating them; a `materialize()`d venue contains every
defaulted slot's row and *visibly lacks* `light` — the archetype's own
honesty; each recipe resolves and sits on its declared rung; the
knowledge-ladder pins (the `trade-smithing` suite's shape) hold.

### Wave M9 — the mine producer brain

`src/behavior/delves.ts` — the pack's own brain
(content-packs.md § *Brains in packs*), modelled line-for-line on
build-3's `farms.ts` producer brain and inheriting every `consigns`
guard: bounded loops, literal verbs through `CommandApi.forceCommand`,
never a bare `get <kw>`, teleport home in `finally`. Per beat: walk the
level, `hew` a workable face, load the cart, hand the pony, tip at the
scale, `consign`. ⭐ Supply must not be a function of concurrency — a
smelter whose input dries up on a quiet night is not an economy.

**Tests:** the source-shape suite (bounded, literal, `get 1`,
finally-home — the `tends.bounded` pattern) plus a fixture-world beat
test: ore appears at the scale without a player.

---

## Stage F — `trade-fuel`

### Wave F1 — the pack and the coppice

Scaffold as M1 (`root: /trade/fuel`). The coppice per P14: authored beds
composing the shipped `CultivableMixin`/`GrowingMixin`, authored
**already grown** under D7's model-consistency rule, harvested through
the shipped `harvest`/`pick`. Charcoal's material row and the
`Charcoal` thing (`Combustible`, fuel value and ignition point derived
from the material — the shipped `CombustibleMixin` behaviour). Timber
for the mine's sets comes off the same stand — ⭐ two consumers, one
supply, which is the wood contest the slates kept asserting.

**Tests:** the coppice's authored state is one the reconcile could have
produced (a content test, farming's precedent); charcoal's fuel value and
ignition read off the material; a cut stool regrows on the clock.
⚠ **Nothing under `lib/husbandry/` is modified** — asserted by the
reviewer, and if a wave appears to need it, stop (P14).

### Wave F2 — the burn

`src/thing/CharcoalPit.ts` (or the clamp) composing `Combustible` +
`Furnace`, and the burn as a **watched engagement over game time**: the
volatiles leave, the carbon stays, and **airflow is the decision** —
`Firewood.charMaterialPath` is what it becomes when it burns out. Too
much air and the charge goes to ash; too little and you get half-burnt
brands. ⭐ The failure mode is the point: **you can lose a whole burn.**
The single `char`/`burn` verb ships in the pack under
`trade/fuel/cmd/fuel/`.

**Tests:** a well-tended burn yields charcoal at the authored ratio;
over-air yields ash and nothing; under-air yields brands; the burn runs
on the world clock and survives a scheduler round; a lost burn is
recorded and legible in hindsight.

---

## Stage S — `trade-smelting`

### Wave S1 — the furnace, the smelt, and the ingot

Scaffold as M1 (`root: /trade/smelting`). The furnace composes the
shipped `FurnaceMixin` (`burnTemperatureK × bellows`); copper melts at
1358 K, which charcoal reaches. `smelt.yaml` + `SmeltController` under
`trade/smelting/cmd/smelting/`: a craft with a maker, tools and inputs so
it rides the shipped crafting spine and the deed ladder — but ⭐ **the
yield derives from the charge's composition**, never from a recipe
constant. Metal out = Σ(lump mass × lump grade × the mineral's metal
fraction by `formula`/`molarMass`); the gangue fluxes off as slag. The
product freezes through the shipped `Casting` path
(`ThermalApi.reconcilePhase`) into a stamped copper ingot.

The **faucet test** (P13) lives here.

**Tests:** two lumps of different grade yield measurably different metal
from the same smelt, and the difference is visible through `analyze`;
the yield is arithmetic on `Material.composition` and moves when the
grade moves; a charge below the furnace's reachable temperature refuses;
the ingot re-melts (the bidirectional phase change, honestly); **no
shipped content sells or spawns copper stock from nowhere.**

---

## Stage R — `rejection`

### Wave R1 — the pack, the two zones, and the authored spine

Scaffold — **content only, no `src/`** (P15). `root: /world/rejection`,
title claim `/world/rejection` held by a `rejection` group. `requires`
the three trades plus platform.

The zones: a region zone carrying `deposit:` (P4), under it the
**pithead** surface zone (sky-exposed) and the **mine** zone — one 3D
`CartesianZone`, `cellSize: 10.0`, z negative going down. The eight
authored singletons: P1 Pithead Yard · P2 Claims Office · P3 Assay Shed ·
P4 Provisioning · P5 The Dry; the adit; U1 Cage Bottom · U2 Timbered
Drift · U3 Winze Head. Prose from the preserved bible draft
(`docs/staging/ferrow-delving.md @ 714d3f9a7`) rather than rewritten.
**No inbound exit is wired** — arrival is by TPA, so
`packages/content/terminus/` is untouched.

**Tests:** a pack annex test — every row resolves, the zones' fields
inherit, a fresh-DB boot installs the pack, the title claim covers every
shipped path (`lint:untitled`).

### Wave R2 — the deposit row, the four type rows, the prose, the warren

`idea/deposit/ferrow.yaml` — the mining-slate block, trimmed to what
Stage A reaches (the oxide cap above `waterTable: -45` fully authored;
the sulfide band declared so the survey's inference has a referent; tin
and the Hush pin **not** authored). The four procedural room type rows
(`Face`/`Junction`/`Stope`/`Fall`) with their prose banks (P10). The
`MineWarren` row: `class: /trade/mining/idea/MineWarren`, path
`/world/rejection/idea/ferrow-warren`, carrying `typeRows`, and its
`stocks` on the mine zone (P11).

**Tests:** the deposit resolves and its material paths all exist; the
four type rows resolve and none is named by more than one scope; a carve
against the real row produces a room of the right type for the ground;
`lint:instanceable` passes with zero minted rows.

### Wave R3 — the ecology and the lighting

⭐ **The glowcap is the lighting infrastructure, not decoration** — it
binds the archetype's defaultless `light` slot in the Spine fixtures and
in a carried jar, and it decays rather than burns, so the money sink is
biological and local (requirements § *Light and the sensorium*). A Held
working's fixture is a placed `Durable` on M4's pattern; Provisional
workings are dark. ⚠ No burn-time: `PortableLight` defers fuel to the
combustion build, and Rejection needs no flame.

**Light tests:** `REQUIRED_BAND_FOR_DETAIL` gates the fine read, so a
character underground with a hand lamp reads *a seam* and **cannot** read
grade, while the same sample at the surface or under the assay scale can —
the reason the Assay Shed is a room. A character whose light fails can
still walk, listen and smell their way out and **cannot** hew, read a face
or shore.



`rejection`'s own rows — crickets, delve-rats, the pale grazer, the
cultivated **glowcap** — at the `/stuff/idea/species/…` commons path,
inside this pack. The cave `Biome` rows carrying the depth gradient in
light, air and heat. The glowcap binds the archetype's `light` slot,
which is the ⭐ demonstration made real: same slot, another mine's oil
lamps.

**Tests:** ⭐ **`survey` in a carved working reports honestly** — the room
type, whether it is shored, and whose claim — through the duck-typed seam,
with no platform edit (P17); the ambient band is present in the upper
workings and its silence tracks the air value; `measure light` in a glowcap-lit working
clears the archetype's `lightLux` threshold and an unlit one does not.

### Wave R4 — title: the claim register, the office, the split estate

Per P5. The **`stake` verb** in `trade-mining`
(`content/trade/mining/cmd/mining/stake.yaml` + its controller), afforded
by the Claims Office counter; the registrar NPC; the `claimBlocks` on the
warren row; and the estate parcels. **No `PlatBook`, no residence-pack
dependency.**

**Tests:** a claim is stakeable through `stake` and transferable; it
mints a title and **no room**; staking already-claimed ground refuses; the mine's estate severs from the surface
parcel and each resolves to its own owner; an unsevered mine resolves to
the surface holder; ⭐ **a content edit cannot mint or alter a title** —
asserted directly; `landUse` resolves `industrial`.

### Wave R5 — the four businesses, the cast, the fuel yard, the smelter

The four `Business` rows in a row — the Ferrow co-op (buys timber and
tools, sells ore, employs on **tutwork**), the fuel yard (works its own
coppice, sells charcoal, employs a burner), the smelter (buys ore and
charcoal out of ingot revenue, sells ingots, employs a smelterman), and
the shipped Hearthworks smithy as the fourth customer. The functional
NPCs (registrar, buyer, storekeeper, onsetter), canned. Seeded starter
prices on the offers — ⭐ **pricing is parked**; no discovery. The fuel
yard with its coppice and the smelter beside it, sited a short walk off,
because you burn more mass of charcoal than you smelt of ore.

⭐ **No new money is minted anywhere.** The smelter buys ore out of
revenue through the shipped banking engine; there is no ore-buyer
endowment and no CB lending tier — this build removed the need for one by
building the trade.

**Tests:** ore sold to the smelter, ingots to the smith, tools bought by
a miner — **with no net money created**, asserted by totalling the ledger
across the loop; a character with no capital takes tutwork and is paid;
a character holding a claim sells ore without the co-op's involvement.

### Wave R6 — the chamber seam

One hand-built cavern: an authored `features.pins` entry, a
`SphericalZone` for the chamber, and an ordinary cross-zone exit pair
**explicit on both sides** (the counting-houses precedent). ⭐ The
workings are Cartesian because labour is orthogonal; the cavern is
spherical because water and geology are not. ⚠ Authored chambers only —
a zone is a template row, so a per-discovery zone would be the rowless
mint D17 forbids.

**Tests:** breaking into the pin lands the character in the chamber zone
with its own geometry and returns them to the correct grid cell; both
sides of the pair are declared; no zone is minted.

---

## Stage Z — the drive, the docs, the runway

### Wave Z1 — the live drive (acceptance leads here, not in tests)

⭐ **The acceptance criterion is a driven session, and it comes before
the docs, not after.** `e2e/tests/drive-metal-chain.spec.ts`, the
`drive-crafting.spec.ts` shape: Playwright against a running server, a
compressed clock (`world_state` scale ~6000×; above ~10000× the
schedulers starve the event loop — build-3's measured finding), spawning
at the pithead by `startLocation` because arrival is TPA-only.

The leg, in order: **buy a lamp and a pick at Provisioning · stake a
claim at the Claims Office · walk the outcrop and `measure strike` three
times · `analyze ground` and read the card · descend the adit · `drive` a
heading · `shore` it · `hew` ore · load the pony · `consign` at the scale
· walk to the fuel yard and burn a charge · smelt at the furnace ·
`forge` a copper pick head.** Then the second pass: restart the server
and confirm the shored working survives with its contents while the
unshored one is gone and left no record.

Screenshots land in `SNAP_DIR`. **The drive is recorded** — a Checkpoint
section appended to this plan at build time, in the farming plan's shape:
what ran, what was cut down by harness artifacts, what defects the drive
found and which were fixed, and what seams it surfaced for the slates.

Drive-found defects are fixed **in this wave**, not deferred.

### Wave Z2 — docs, the exemplar note, the finalize runway

**A subsystem doc**, `docs/subsystems/mining.md`: the three-tier room
identity, the carved-set ledger and what it does and does not persist,
the geology field and its one resolved read, the face model, the support
threshold, the air function, and the pack split.

**The ⭐ exemplar note** — a section in `rejection`'s README (or a short
`docs/subsystems/mining.md` appendix) showing on paper that a second
mining town is a locality pack plus a deposit row plus room rows:
`requires` the three trades, touches no `src/`. The proof is a listing of
`packages/content/rejection/` with no `.ts` in it, plus the archetype's
slots and which `rejection` row binds each.

**`docs/vocations.md`** — the miner, collier and smelter rows move off
**GAP**.

**Slates** — the four seeding slates annotated per the sweep rules;
field-substrate-slate's register updates *mine geology* from **designed**
to **shipped** and its Open 2 (*"is there a shared implementation?"*)
gains this build's answer: **a shared shape, not shared code — resisted
on purpose.**

**The runway**: source-change check, **one** full `pnpm test`, the whole
lint family, push, and stop for the user's MR review. The `/finalize`
sweep is its own phase and is not run here.

---

## Dependency order and what can be parallelised

```
K1 ─────────────────────────────────────────────► M8
M1 ──► M2 ──► M3 ──► M4 ──► M5
        │      └─────────────► M6 ──► M7 ──► M8 ──► M9
        └──────────────────────────────────► R2
F1 ──► F2 ─┐
S1 ────────┼──► R5
R1 ──► R2 ──► R3
        └──► R4
        └──► R6
                     R5 ──► Z1 ──► Z2
```

**Hard order.** M1 is the spine — nothing in Stage M starts without the
`Deposit`. M2 needs M1. M3–M6 need M2. M8 needs K1 and M6 (the recipes
consume the ore). R2 needs M2 (it authors the warren's policy fields) and
R1. Z1 needs everything; Z2 needs Z1.

**Genuinely parallel.** **K1 · F1 · S1 · R1** have no dependency on each
other and could be worked in any order or concurrently — K1 is 20 lines
of kernel, F1/S1 are pack scaffolds over shipped substrate, R1 is
authored rooms. A second pair of hands starts there.

**F2 and S1 are independent of all of Stage M** — the burn and the smelt
are exercised against authored ore in their own fixtures until R5 wires
the real supply. That is deliberate: it keeps two of the four packs
buildable while the mine is still being cut.

**The long pole is M1 → M2 → M7.** The geology field, the warren and the
survey channels are the three pieces with no substitute and no parallel
path; everything else is either scaffolding or content over them.

---

## Acceptance-criteria coverage

| Criterion (requirements) | Waves |
|---|---|
| The chain runs end to end, driven live; the drive is recorded | **Z1** |
| Determinism across boots and eviction round trips | M1, M2 |
| Persistence: shored survives, unshored leaves no record; no minted rows | M2, M4, R2, Z1 |
| Grade load-bearing end to end; two lumps, two yields | M6, S1 |
| Surveying is inference; three points beat one; dip unobtainable; barren informative | M7 |
| Competence changes readings, not the world (identity asserted) | M3, M7 |
| Support: refusal, shoring clears it, faces block and rooms do not | M4 |
| Air and inhabitants: degrade/recover, the canary, the pony's draft | M5 |
| The stakes are real: warning, death possible, escape always | M5 |
| Survey knowledge personal and portable; the card solves strike | M7 |
| Title holds; severance; content cannot forge a title; ore ownership | M6, R4 |
| The economy circulates with no net money created | R5 |
| The exemplar test — a second mine needs zero pack code | M8, R3, Z2 |
| The chamber seam | R6 |
| The faucet is closed | S1 (P13) |
| Lints and the single full suite | every wave; Z2 |
| Docs, slates, vocations off GAP | Z2 |

---

## Risks, unknowns, and the file that resolves each

**R1 — `Warren.createMember()` is argument-less and the base is
build-2's.** P7's carve chain is the answer, but it is designed against
`Warren.ts` as it stands on this branch and build-2 is actively editing
`lib/location/`. *Resolves at:* `packages/server/src/mud/lib/location/Warren.ts`
(lines 249, 365, 407, 510–534) and
`mud/world/eternal/duncan-hall/DormWarren.ts:110,282,312,339` — re-read
both at the start of M2. If `Warren`'s hook signatures moved under
build-2, **say so before writing M2** rather than adapting silently.

**R2 — the `drive` collision.** P12. *Resolves at:*
`packages/server/src/mud/lib/command/CommandGiver.ts:970–1055`
(`_runChain`) and `platform/idea/api/CommandLogic.ts:2280` — plus M3's
own tripwire test, which is the real answer.

**R3 — ⚠ ORDERING NOW KNOWN, and P9's formula must change.**
`GlobbableLogic.merge` runs, in order:
`survivor.setQuantity(survivor + absorbed)` → `StuffApi.destruct(absorbed)`
→ `survivor.onMerged(absorbed)`. **So by the time the hook fires the
survivor's quantity is already the TOTAL and the absorbed stack has been
destructed.** P9's `(g·q + g'·q')/(q+q')` cannot be written as stated. Use
the **delta** form — with `Q` the new total and `a` the absorbed count:

    grade = (grade × (Q − a) + absorbedGrade × a) / Q

⚠ **The one thing left to verify in M6:** whether `absorbed`'s `grade` and
`quantity` are still readable *after* `destruct`. If they are not, read
them in an `onSplit`-style pre-hook or have `canMergeWith` stash them —
either way a pack-side change, no kernel.

**R4 — a platform view naming a pack controller is new.** P1 argues it is
legal and the failure is legible, but nothing in the repo does it today.
*Resolves at:* `lib/command/CommandDefinition.ts:40` (`resolveController`)
and `lib/command/CommandGiver.ts:1214` — plus M7's test that the three
stanzas resolve. If the user prefers the dependency to point the other
way, the fallback is the rejected alternative in P1 (generic kernel
controllers over a `lib/zone/GeologySource` interface) and it costs one
kernel module.

**R5 — the survey card touches `packages/types` and `packages/client`.**
The requirements call it "the one piece of client work" but do not name
the `CardId` union. *Resolves at:* `packages/types/src/index.ts:929–953`
and `packages/client/src/components/cards/CardBodies.tsx`. Sized in M7;
flag to the user if the cockpit arrangement map turns out to need a row
too.

**R6 — `opens_card` is verb-level, not per-subcommand.** Declaring it on
`analyze` licenses every analyze subcommand to open `survey`, which none
but `ground` will. *Resolves at:*
`packages/server/src/mud/lib/command/command.schema.json:81` and
`api/card.ts:133–165`. Acceptable as-is; recorded so a reviewer does not
read it as a leak.

**R7 — the coppice may want a growth model husbandry does not have.**
P14 gives the Stage-A answer (authored-grown, harvested by the shipped
path, the rotation seam named in a comment). *Resolves at:*
`packages/server/src/mud/lib/husbandry/Growing.ts` — read it in F1, and
**if a cut-and-regrow cycle genuinely needs a mixin change, stop and
say so.** That file is build-3's.

**R8 — the terminus/world-seed boundary.** Arrival is TPA and the copper
faucet is closed by construction (P13), so neither tree should be
touched. *Resolves at:* the diff — if any wave's `git status` shows
`packages/content/terminus/` or `packages/content/world-seed/`, the wave
is wrong.

**R9 — ~~`PlatBook` with an empty `holderPath`~~ — RETIRED.** P5 no longer
uses `PlatBook` (it moved to the residence pack, and staking is not
buying). The replacement risk is smaller: **`ParcelApi.subdivide` may
require a parent parcel shape the mine has not minted yet.** *Resolves
at:* `packages/server/src/mud/api/parcel.ts` and
`lib/parcel/ParcelRegistry.ts` — read before R4, and mint the estate
parcels in the same wave.

**R10 — `stocks` is per-zone, so ecology cannot band by depth.** P11.
Out of scope by the requirements (upper band only), recorded as the seam.
*Resolves at:* `lib/zone/SpatialZone.ts:42–57` and
`platform/idea/api/ResidencyLogic.ts:352`.

**Opens for the user (defaults stated; say the word to change one).**

1. **P2's second need kind.** `lightLux` alone would do if `species`
   reads as speculative; haulage and air then move to the Business
   roster. Default: **both ship.**
2. **P1's controller home.** The plan puts the three survey controllers
   in `trade-mining` and has the platform view name them. The
   alternative is generic kernel controllers over a new `lib/zone`
   interface. Default: **the pack.**
3. **The three minerals.** Malachite, quartz and chalcopyrite — the
   oxide ore, its gangue, and the sulfide the survey can infer but Stage
   A cannot reach. Default: **those three.**
4. **The mine's cell size.** `10.0 m` (Terminus is 3.0, Hinkley 6.0),
   chosen because it is the distance over which grade meaningfully
   changes. Default: **10.0.**
5. **Names.** The co-op, the registrar, the buyer and the storekeeper
   are yours when R5 nears; the plan will not invent them.
