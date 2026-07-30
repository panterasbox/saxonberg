# Civics (diegetic government) — implementation plan

The **Government** substrate: diegetic governments as plural authored
content — the pure-data `Government` Idea (the Corpo recipe verbatim),
jurisdiction declared as a sparse tier-field on `Locality` and derived
by the existing longest-prefix machinery, derive-on-read residency over
a new domicile seam, seats as employment positions, the read-only
`government` verb, and the thin Terminus flagship (one government, one
Registry department, one Magistrate seat, one clerk). Read
`docs/requirements/civics-requirements.md` in full before starting —
scope is CLOSED; this plan implements exactly it.

Jargon (locked): **the Compact** = the meta institution; **Government**
= the diegetic Idea; **resident**, never "citizen"; "polity" never
appears in new code or docs except when naming the meta contrast.

## Grounding (facts established by investigation)

- **The corpo recipe files to mirror byte-for-byte in structure**:
  `packages/server/src/mud/lib/corpo/Corpo.ts` (data Idea +
  `Descriptor` interface + `TEMPLATE_PATH_PREFIX` from
  `lib/paths.ts`), `obj/CorpoCatalogue.ts` (`PostRegistrationMixin(Idea)`
  data-cache; `postRegister` → `Template.findDescendants(prefix)` →
  descriptor map keyed by `key`; module-private coercers; `ensureCache`
  cold-state; `canEvict`/`canDestruct` refusals; `invalidateCache`),
  `obj/api/CorpoLogic.ts` (`extends ApiLogic`, `@Unshadowable`,
  `@internal`, every public method
  `@CallSecurity(SecurityPolicies.FromModule('/api/corpo#CorpoApi'))`,
  impls as module-private free functions), `api/corpo.ts` (statics
  forward via `StuffApi.singletonSync` + `HotReloadApi.getCurrentExport`;
  tail `SecurityApi.decorateApiClass(CorpoApi)`). The catalogue's public
  methods are **ungated** (read-only data) — mirror that too.
- **Address**: `lib/address/Locality.ts` already carries two realized
  tier fields (`_weatherPin`, `_climateLean`) — the exact sparse-field
  precedent for the government key. `obj/AddressRegistry.ts` **already
  has `coverageChainOf(address): Locality[]`** (sync, most→least
  specific, used only by `traceResolveFor`); it is *not* exposed on
  `AddressApi`/`AddressLogic` — the civics build adds that passthrough.
  `AddressApi.resolveFor(scope)` (async) returns
  `{ locality, address, source }`; never throws; `null` off-grid.
- **`Location` composes `AddressableMixin`** (`lib/stuff/Location.ts:34`),
  so any Location seed can declare `_address:` (raw field) or
  `address:` (hydrator Phase-1 → `setAddress`) — both forms are live in
  shipped seeds (`hub.yaml` uses `_address`, `weeping-chamber.yaml` uses
  `address`).
- **Zone-level `address` is a trap**: `CartesianZone.persistentFields =
  ['name','cellSize']` and `Zone.persistentFields = []` — an `address:`
  key in a zone seed's `data` does **not** hydrate onto the instance, so
  `zone.lookupField('address')` finds nothing. No shipped zone carries
  one. Therefore all content addressing in this build uses **declared
  `_address` on Location templates**, not the zone fallthrough.
- **A `terminus` Locality already exists** —
  `seeds/lib/address/terminus.yaml` claims `terminus` (fasttravel
  build), and `seeds/domain/terminus/terminal/arrival-gate.yaml` etc.
  already declare `terminus/...` addresses. `counting-houses` and
  `university-avenue` claim **sibling roots** (not under `terminus`) —
  out of scope, noted in Risks. The demonstrative `narnia/*` roster
  (`narnia`, `narnia/castle`, `narnia/wild`) stays untouched.
- **Residence/dorm**: `DormRoom.SCOPE = '/domain/eternal/duncan-hall/dormroom'`
  (shared template, D1-keyed by unit parcel extent);
  `ParcelApi.heldUnitOf(holderPath)` → the tenant's unit
  `ParcelRecord | null`; provisioning lives in the `duncan-hall` content
  namespace (`ProvisionController`), room fault-in in
  `DormWarren.admit(unitKey)`. There is **no residence module** (no
  `DormApi`/`lib/dorm/`) — the domicile seam cannot live on a
  residence Api that doesn't exist.
- **Employment**: `Employment { businessPath, positionKey, status, … }`
  on `EmployedMixin` (`Character` composes it);
  `getEmployments(): readonly Employment[]` is a **public ungated
  read**. `Business` seeds carry `positions` / `rosterSlots`
  (`RosterAssignment { positionKey, assignee /* templatePath */,
  schedule }`) / `banksAt` / `operatingLocations`; the Business account
  keys on its own templatePath; municipal precedent =
  `seeds/domain/terminus/budget.yaml` (proprietor-absent,
  `proprietorPath: ''`). Businesses stand up lazily; the account is
  provisioned via `EmploymentApi.operatingAccountOf(business)`.
- **Verb precedent**: `cmd/governance/office.yaml` +
  `obj/command/governance/OfficeController.ts` +
  `seeds/obj/command/governance/OfficeController.yaml` (check exact seed
  name in that dir), afforded on `lib/character/Persona.ts`
  `commandContributions.self` (line ~68). Per-subcommand validators are
  first-class. The command preloader walks `cmd/` recursively — a new
  category dir needs no wiring.
- **Bootstrap**: `mud/bootstrap.ts` `bootstrapManifest` warms
  `/obj/CorpoCatalogue` etc.; catalogue `postRegister` reads the
  `domain` collection (seeds already written by `SeederManager` before
  `BootstrapManager.run`). `lib/paths.ts` holds `TemplatePaths.*` +
  `TemplatePathPrefixes.corpo` — the civics keys go there.
- **Tests precedents**: `lib/corpo/__tests__/Corpo.test.ts`,
  `obj/__tests__/CorpoCatalogue.test.ts`,
  `obj/api/__tests__/CorpoLogic.test.ts`,
  `lib/address/__tests__/Location.address.test.ts` + `roster.test.ts`,
  `obj/__tests__/OfficeRegistry.test.ts`,
  `obj/command/governance/__tests__/`.

## Design decisions (settled here so the builder doesn't re-derive)

1. **Api file = `api/government.ts`, class `GovernmentApi`.** The
   requirements name the class explicitly; the file-naming rule is
   "lowercase feature name matching the Api class" (`corpo.ts` →
   `CorpoApi`, `office.ts` → `OfficeApi`), so `government.ts` →
   `GovernmentApi`. `api/civics.ts` would force a `CivicsApi` rename or
   break the convention. The subsystem *folder* is still `lib/civics/`
   and the doc `civics.md` (both user-approved in the requirements);
   the logic singleton registers at **`/obj/api/government`** and the
   gate string is **`FromModule('/api/government#GovernmentApi')`**.
2. **The Locality tier field is `_governmentKey: string | null`**
   (default `null`), following `_weatherPin` exactly: sparse raw field,
   `getGovernmentKey()`/`setGovernmentKey()` (setter validates
   `string | null`, trims to `null` on empty), added to
   `persistentFields`. Seeds write `_governmentKey:` raw (the
   `_address` precedent). No index, no registry change — resolution is
   the Api's job.
3. **The jurisdiction chain is computed from
   `AddressApi.coverageChainOf(address)`** — a new, additive, **sync**
   facade/logic passthrough to the *existing*
   `AddressRegistry.coverageChainOf`. Chain semantics: map each covering
   Locality (most→least specific) to its `_governmentKey`, drop
   `null`s, **drop keys unknown to the catalogue** (acceptance
   criterion), dedupe repeats preserving first (most-local) position.
   Sync/async split: `governmentAt`/`governmentChainAt(address)` are
   **sync** (trie + in-memory catalogue — the `coveringLocalityOf`
   fast-path doctrine); `subjectTo(scope)` is **async** (it needs the
   full resolve walk, whose zone step awaits); `residentOf(character)`
   is **sync** (domicile is a character field read + sync chain);
   `holdsSeat` is **async** (may read a Business template row).
   Every read returns `[]`/`null`/`false` off-grid — never throws.
4. **Domicile is an event-written sparse pointer on `Character`, not a
   join through the lease.** New field
   `_domicileAddress: string | null` on `lib/character/Character.ts`
   (Pattern-A address-namespace string; `persistentFields` entry so it
   rides the Avatar snapshot; accessors `getDomicileAddress` /
   `setDomicileAddress`). Writers are the **residence content**:
   `ProvisionController` stamps the tenant at lease-grant, and
   `DormWarren.admit` self-heals pre-existing tenants (stamps from the
   live room's `getAddress()` on entry when unset). Rationale — the
   deliberate deviation from "prefer deriving from the dorm keying,"
   recorded for the doc: (a) a pure `heldUnitOf` derivation **cannot
   honor domicile-persists-until-replaced** (unprovision nulls it);
   (b) mapping a parcel extent to an address without a live room would
   require either core→content coupling (civics importing DormRoom) or
   a new template-data prefix-walk mechanism; (c) the staging doc
   itself calls for "one tombstone field on the residence record, not a
   system," and the requirements explicitly allow "whatever the
   domicile seam needs on the residence side." Persists-until-replaced
   is thus **structural**: nothing ever clears the field; a new home
   overwrites it. The gated read `GovernmentApi.domicileAddressOf`
   (via `GovernmentLogic`) is the seam's face; the setter itself stays
   an ordinary public method (v1 residency confers nothing — no
   security value rides it; noted in civics.md).
5. **`holdsSeat(character, govKey, seatKey)` resolves two paths**, in
   order: (1) the character's live `Employment` records
   (`MixinApi.hasMixin(char, Mixins.Employed)` →
   `getEmployments()` filtered on the seat's
   `(department businessPath, positionKey)` with status ∈
   `employed | on-shift | off-shift`); (2) the authored roster — the
   live Business instance's `getRosterAssignments()` if standing, else
   the Business **template row's** `rosterSlots` (`Template.findByPath`)
   — matching `assignee === character.getTemplatePath()`. Path 2 is
   what makes a never-ticked, lazily-stood-up department's seat
   provable. `quit`/`fired` records never satisfy path 1 and (per the
   employment doctrine "an explicit exit is never resurrected") an
   explicit exit record **suppresses** path 2 for that business.
6. **Verb category = new `civics`** (`cmd/civics/`,
   `obj/command/civics/`). Command categories "mirror the subsystem
   taxonomy" (command-spec) and new categories are routine (`magic`,
   `work`, `device`); filing the diegetic verb under `governance` —
   the meta polity's category — is exactly the layer conflation the
   jargon standard forbids. One dispatch verb `government` (alias
   `gov`), subcommands `list` (bare default) + `residency`, verb-level
   `requiresAnimate` only (fully public, the `offices` precedent);
   afforded universally via `Persona.commandContributions.self`.
7. **Government template fields** (all joins durable strings, never
   live refs): `key`, `displayName`, `description`, `charter`
   (document-store path — pointer only in v1; no StoredDocument is
   seeded, there is no document seeder and nothing reads the charter
   yet — recorded in civics.md's deferred list), `treasury` (bank
   account key — the flagship points at `/domain/terminus/budget`, the
   already-shipped municipal budget Business's account path),
   `departments` (Business templatePaths — Pattern-A strings; a
   Business's path *is* its durable key in the employment substrate),
   `seats` (list of `{ key, label, department, positionKey }`).
   Templates live under **`/lib/civics/Government/<key>`**
   (`TemplatePathPrefixes.government = '/lib/civics/Government/'`).
8. **No `Mixins` registry touches.** Government is a data Idea, not a
   mixin; no new mixin, no `MixinApi` predicate, no `Mixins` constant.
9. **Seeds, not a pack.** The Locality roster and all flagship content
   mirror their precedents' homes: Localities in `seeds/lib/address/`
   (the narnia/terminus precedent — the AddressRegistry boot warm walks
   `/lib/address/`), Government templates in
   `seeds/lib/civics/Government/`, domain content in
   `seeds/domain/terminus/registry/`. No shipped content pack owns
   these trees; migrating them is a later `git mv` per content-packs.
10. **Actor-from-context**: v1 is read-only, and every Api read takes
    its *subject* as a parameter (the `holdsOffice(player, office)`
    precedent — a predicate about a subject, not an authority claim).
    No method accepts an "acting character" whose value confers
    authority; the controller passes the framework-stamped
    `context.commandGiver` as the subject. Any future mutation must
    derive its actor from execution context — stated in civics.md.

## File inventory

### New files (with module category)

| Path (under `packages/server/src/mud/` unless noted) | Category | Contents |
|---|---|---|
| `lib/civics/Government.ts` | Stuff class (data-Idea leaf) | default-export `Government extends Idea`; `TEMPLATE_PATH_PREFIX`; fields `key/displayName/description/charter/treasury/departments/seats`; `persistentFields`; validated setters (`key` non-empty; arrays defensively copied); exports `GovernmentDescriptor` + `GovernmentSeat` (`{ key, label, department, positionKey }`) types. The folder's one concept + its vocabulary — no other file in `lib/civics/` this build. |
| `obj/GovernmentCatalogue.ts` | Stuff class (singleton catalogue) | `PostRegistrationMixin(Idea)` data-cache at `/obj/GovernmentCatalogue`; `postRegister` warms from `Template.findDescendants(Government.TEMPLATE_PATH_PREFIX)` into a `Map<string, GovernmentDescriptor>`; module-private coercers (`str`/`stringArray`/`buildGovernmentDescriptor`/`buildSeat` — drop rows without a non-empty `key`, drop malformed seats); `getGovernment`/`hasGovernment`/`allGovernments` (defensive copies); `ensureCache` cold-state; `invalidateCache`; `canEvict` + `canDestruct` refusals — mirror `CorpoCatalogue.ts` clause-for-clause. |
| `obj/api/GovernmentLogic.ts` | Api logic singleton | `@Unshadowable @internal class GovernmentLogic extends ApiLogic`; template `/obj/api/government`; every public method `@CallSecurity(SecurityPolicies.FromModule('/api/government#GovernmentApi'))`; impls as module-private free functions: `catalogue()` (via `TemplatePaths.governmentCatalogue`), `chainForAddress(address)` (coverageChain → keys → drop null/unknown/dupes → descriptors), `holdsSeatImpl`, `domicileAddressOfImpl`, `seatViewsOf` (holder resolution: roster/live-employment scan per seat). |
| `api/government.ts` | Api | `GovernmentApi` statics (surface below) forwarding via `StuffApi.singletonSync('/obj/api/government', …)` + `HotReloadApi.getCurrentExport`; re-exports `GovernmentDescriptor`, `GovernmentSeat`, `SeatView`; tail `SecurityApi.decorateApiClass(GovernmentApi)` (sanctioned module-scope exception). |
| `cmd/civics/government.yaml` | Command YAML | verbs `[government, gov]`; `controller: civics/GovernmentController`; verb-level `validators: [requiresAnimate]`; subcommands `list` (public; description/help) + `residency` (public); bare invocation defaults to `list` in the controller; authored `help` prose per the help-content rules (no restating generated syntax). |
| `obj/command/civics/GovernmentController.ts` | Controller | subcommand switch (`list` default / `residency`); `list`: `await GovernmentApi.subjectTo(context.commandGiver)` → per-government block (displayName, description, departments, seats with holders, charter pointer) via `MessageApi.scene` + Mml (follow `OfficeController`'s roster rendering + client-buttons-preview-command: an Mml command button offering `government residency`); empty chain → "no government claims this ground" prose + structured note; `residency`: `GovernmentApi.domicileAddressOf(giver)` + `residentOf(giver)` → chain + "domiciled at <address>" line; nowhere-domiciled → honest prose. Returns `void`; Scene.send + ctx.note on every failure path. |
| `seeds/obj/command/civics/GovernmentController.yaml` | Controller seed | `class: /obj/command/civics/GovernmentController`, `data: {}` (mirror the governance controller seed's exact filename convention in that tree). |
| `seeds/obj/GovernmentCatalogue.yaml` | Seed | `class: /obj/GovernmentCatalogue`, `data: {}`. |
| `seeds/lib/civics.yaml` | Seed (folder) | FolderZone admin root for `/lib/civics` — mirror `seeds/lib/address.yaml`'s shape; also mirror whatever folder rows `seeds/lib/corpo*` ships for the `Government/` segment (check `seeds/lib/corpo.yaml` / `seeds/lib/corpo/Corpo.yaml` existence and copy the exact pattern — the folder/leaf invariant per templates.md). |
| `seeds/lib/civics/Government/terminus.yaml` | Content seed | the flagship (data below). |
| `seeds/lib/address/eternal-campus.yaml` | Content seed | Locality `name: Eternal University Campus`, `_address: terminus/campus`, **no** `_governmentKey` (inherits Terminus via the chain — deliberately proves the sparse case). |
| `seeds/domain/terminus/registry.yaml` | Content seed | small `CartesianZone` "Terminus Registry" (mirror `terminal.yaml`). |
| `seeds/domain/terminus/registry/office.yaml` | Content seed | the venue room (`CartesianLocation`): the Registry public counter; `_address: terminus/civic/registry`; explicit cross-zone exit pair to the terminal hall (declared on both sides — the arrival-gate precedent); `details` flavor per the staging fiction (the young retrofit administration). |
| `seeds/domain/terminus/registry/clerk.yaml` | Content seed | the clerk NPC — mirror `seeds/domain/terminus/terminal/clerk.yaml`'s class/behavior shape (no `shifts` brain, no schedule); `_domicileAddress: terminus/civic/registry` (the NPC residency exemplar). |
| `seeds/domain/terminus/registry/business.yaml` | Content seed | the Registry department Business (municipal shape, `proprietorPath: ''`): `positions: [{ key: clerk, label: staffing the registry counter, wageRate: 4, confers: [] }, { key: magistrate, label: sitting as Magistrate, wageRate: 6, confers: [] }]`; `rosterSlots`: clerk NPC on **both** positions with `schedule: []` (shift-less — employment's minimum; the thin administration double-hats its registrar as acting Magistrate, which makes `holdsSeat` live-provable in-game); `banksAt: goodkin`; `operatingLocations: [/domain/terminus/registry/office]`. |
| `docs/subsystems/civics.md` | Doc | outline below. |
| Tests (7 files) | `__tests__/` siblings | listed in the Test plan. |

### Modified files

| Path | Change |
|---|---|
| `lib/address/Locality.ts` | add `_governmentKey: string | null = null` + accessors + `persistentFields` entry (decision 2). Doc comment: "the third realized tier-level field (weather pin / climate lean siblings); resolution is `GovernmentApi`'s job." |
| `api/address.ts` + `obj/api/AddressLogic.ts` | additive `coverageChainOf(address: string): Locality[]` — Api static → gated logic method → existing `AddressRegistry.coverageChainOf`. Sync; `[]` when unregistered/uncovered. |
| `lib/character/Character.ts` | sparse `_domicileAddress: string | null` + accessors + `persistentFields` entry (decision 4). |
| `lib/character/Persona.ts` | `commandContributions.self` gains `'civics/government.yaml'` (beside `'governance/office.yaml'`). |
| `domain/eternal/duncan-hall/command/ProvisionController.ts` (verify exact path/name) | after `grantUse`, stamp `tenant.setDomicileAddress(DUNCAN_HALL_ADDRESS)` — a content constant `'terminus/campus/duncan-hall'` kept beside `DormRoom.SCOPE` (content knows its own address). Best-effort: a stamp failure never voids the lease. |
| `domain/eternal/duncan-hall/DormWarren.ts` | in `admit`-driven entry (or the door-traverse witness — pick the narrowest seam that sees the mover): when the entering tenant's `getDomicileAddress()` is unset and they hold this unit's lease, stamp from the room's `getAddress()` (the self-heal for pre-build tenants). Keep it a few lines; if no clean mover seam exists, restrict the self-heal to `ProvisionController` + note the migration gap in civics.md. |
| `bootstrap.ts` | manifest entry `{ templatePath: '/obj/GovernmentCatalogue' }` after the CorpoCatalogue entry, with the standard warm-comment. |
| `lib/paths.ts` | `TemplatePaths.governmentCatalogue: '/obj/GovernmentCatalogue'`; `TemplatePathPrefixes.government: '/lib/civics/Government/'`. |
| `seeds/lib/address/terminus.yaml` | `data` gains `_governmentKey: terminus` (the jurisdiction declaration — consent-by-construction: this seed is landowner-authored content). |
| `seeds/domain/eternal/duncan-hall/dormroom.yaml` | `data` gains `_address: terminus/campus/duncan-hall` (declared on the shared template; every clone hydrates it — decision in Grounding re the zone trap). |
| `seeds/domain/eternal/duncan-hall/lobby.yaml`, `steps.yaml`, `corridor.yaml` | same `_address: terminus/campus/duncan-hall` (the lobby is where fresh sessions land — the "standing in the Warren" acceptance). |
| `seeds/domain/terminus/terminal/hall.yaml` | the return leg of the registry exit pair. |
| `CLAUDE.md` | (1) docs-map one-liner: `- [civics.md](./docs/subsystems/civics.md) — diegetic government substrate: the Government data Idea + catalogue, Locality-declared jurisdiction, derive-on-read residency, seats-as-positions, the government verb`; (2) the category roster sentence in File Naming Conventions gains `civics` (`government` — the diegetic-government read surface). |
| `docs/subsystems/address.md` | one short paragraph in "Locality is the home for future tier-level fields": the civics build realized `_governmentKey` + exposed `coverageChainOf`. |
| `docs/subsystems/residence.md` | one line under Deferred/seams: the domicile stamp (provision-time + admit self-heal) now lives here; pointer to civics.md. |
| `docs/staging/diegetic-government.md` | header pointer: "Requirements landed → `docs/requirements/civics-requirements.md`; substrate → `docs/subsystems/civics.md`." |

### `GovernmentApi` surface (exact)

```ts
// chain reads — never throw; [] / null / false off-grid
governmentAt(address: string): GovernmentDescriptor | null      // sync; head of chain
governmentChainAt(address: string): GovernmentDescriptor[]      // sync; most-local first
subjectTo(scope: Stuff & Container): Promise<GovernmentDescriptor[]>  // async: full resolve walk
residentOf(character: Stuff): GovernmentDescriptor[]            // sync: domicile field + sync chain
domicileAddressOf(character: Stuff): string | null              // sync; the residence seam's face
holdsSeat(character: Stuff, governmentKey: string, seatKey: string): Promise<boolean>
// descriptor getters + rosters
getGovernment(key: string): GovernmentDescriptor | null
listGovernments(): GovernmentDescriptor[]
seatsOf(governmentKey: string): Promise<SeatView[]>   // SeatView = seat + resolved holder (templatePath | null)
```

## Wave-by-wave build order

**Wave 1 — the substrate (Idea + catalogue + tier field).**
`lib/paths.ts` keys → `lib/civics/Government.ts` →
`obj/GovernmentCatalogue.ts` + `seeds/obj/GovernmentCatalogue.yaml` +
`seeds/lib/civics.yaml` folder rows → `bootstrap.ts` entry →
`Locality._governmentKey`. *Verifiable*: `Government.test.ts` +
`GovernmentCatalogue.test.ts` + the Locality field test green; existing
address/weather suites green (the sparse-field regression);
`pnpm lint`, `lint:module-scope` green.

**Wave 2 — the reads.** `AddressApi.coverageChainOf` passthrough →
`obj/api/GovernmentLogic.ts` → `api/government.ts` →
`Character._domicileAddress`. *Verifiable*: `GovernmentLogic.test.ts`
covers chain ordering / off-grid / unknown-key-drop / residency /
holdsSeat; `lint:gates` resolves the new `FromModule` string.

**Wave 3 — the verb.** `cmd/civics/government.yaml` +
`obj/command/civics/GovernmentController.ts` + controller seed +
`Persona` affordance. *Verifiable*: controller integration test green;
`government` dispatches for a fixture giver; unknown subcommand
rejected by the framework (no controller default case).

**Wave 4 — the content (flagship + roster).** Campus Locality seed;
`terminus.yaml` `_governmentKey`; the Government template; duncan-hall
`_address` declarations; the provision/admit domicile stamps; the
registry zone/room/business/clerk + the hall exit pair. *Verifiable*:
flagship integration test — clerk `holdsSeat('terminus','magistrate')`
true (roster path); `residentOf(clerk)` = `[terminus]`; a provisioned
test player's `residentOf` resolves `[terminus]` through the stamped
domicile and survives `unprovision` (persists-until-replaced); a dorm
room clone's `traceResolveFor` shows `terminus/campus/duncan-hall`
covered by the campus Locality with chain `[campus, terminus]`;
`EmploymentApi.operatingAccountOf(registryBusiness)` provisions/returns
the Business account (the "account exists" acceptance).

**Wave 5 — docs + sweep.** `civics.md`; CLAUDE.md two edits;
address.md/residence.md notes; staging pointer; full
`pnpm lint && pnpm lint:gates && pnpm lint:module-scope && pnpm test`.

### `civics.md` outline

Premise (two strata, pointer to the staging capture + requirements
retirement note) · the Government Idea + catalogue recipe · jurisdiction
on the Locality (consent-by-construction, the tier-field precedent) ·
the reads table with sync/async rationale + never-throws semantics ·
the domicile seam (the stamp decision, persists-until-replaced as
structural, the derive-preference deviation and why, the self-heal,
NPC authored homes) · seats-as-positions (the two-staffs contrast with
governance.md; the deferred generic `holdsSeat` validator as the
`requiresGovernor` twin) · the verb · the flagship inventory · the
doctrine absences (no legal machinery — the six powers; the full
Non-goals list carried over as the deferred/never ledger) ·
cross-references.

## Test plan (per file, mapped to acceptance criteria)

| Test file | Covers |
|---|---|
| `lib/civics/__tests__/Government.test.ts` | setter invariants (empty key throws), defensive copies, seed-shaped hydration round-trip (mirror `Corpo.test.ts`). |
| `obj/__tests__/GovernmentCatalogue.test.ts` | warm-from-templates, keyless/malformed row + malformed seat dropped, defensive descriptor copies, cold-state empty cache, `canDestruct` refusal (mirror `CorpoCatalogue.test.ts`). |
| `obj/api/__tests__/GovernmentLogic.test.ts` | **nested chain ordering** over the demonstrative roster (test-cloned `narnia` + `narnia/castle` Localities given two test government keys via `setGovernmentKey` — seeds stay clean): `governmentChainAt('narnia/castle/closet')` = `[castle-gov, narnia-gov]`; **off-grid → `[]`/`null`**; **unknown `_governmentKey` dropped**; dedupe; `subjectTo` through an addressed fixture room; `residentOf` via `_domicileAddress` on an **NPC** fixture; `residentOf` = `[]` when undomiciled; `holdsSeat` **true via live Employment**, **true via template roster** (no live business), **false** (wrong seat / wrong character / quit record); gate: direct `GovernmentLogic` call from a foreign module throws (the CorpoLogic precedent). |
| `lib/address/__tests__/Location.address.test.ts` (extend) or sibling `Locality.government.test.ts` | `_governmentKey` defaults `null`; a government-less Locality resolves **exactly as today** (assert an existing resolve trace unchanged); setter null/trim behavior; `AddressApi.coverageChainOf` passthrough shape. |
| `obj/command/civics/__tests__/GovernmentController.test.ts` | integration via `giver.executeCommand`: bare `government` in an addressed room renders the chain + seats + departments + charter pointer; empty chain prose + note; `government residency` renders domicile line + chain; undomiciled prose. |
| `domain/eternal/duncan-hall/__tests__/` (extend the provisioning test) | provision stamps `_domicileAddress`; **unprovision leaves it** (persists-until-replaced asserted); admit self-heal stamps an unset pre-existing tenant. |
| new `obj/api/__tests__/GovernmentLogic.flagship.test.ts` (or fold into the logic test) | the seeded flagship end-to-end: campus Locality covers a dorm-room clone (`terminus/campus/...`, chain `[campus, terminus]`); `governmentAt` from the dorm room = terminus descriptor; clerk `holdsSeat` magistrate true; `operatingAccountOf` provisions the Registry account; `narnia/*` roster untouched. |
| Regression | full suite — address, weather, employment, residence/dorm, seeds-integrity (`controller-seeds.integrity` picks up the new controller seed) all green. |

## Risks / open implementation questions

- **Zone-level `address` does not hydrate** (`Zone.persistentFields`
  is empty) — do NOT reach for the zone fallthrough for campus
  coverage; every address in this build is a declared Location
  `_address`. If a builder is tempted to put `address:` on
  `duncan-hall.yaml`, it will silently do nothing.
- **DormRoom clone hydration of `_address`**: warren members clone via
  `createMemberSerialized` — verify in the flagship test that the
  declared template `_address` lands on the clone (it should — it's an
  ordinary `AddressableMixin` persistent field). If it doesn't, the
  fallback is stamping in `DormWarren.admit`.
- **Catalogue warm vs Locality boot order**: none by construction —
  the catalogue reads templates, the AddressRegistry warms Localities,
  and `GovernmentLogic` joins the two only at read time. But note the
  catalogue (like Corpo's) has **no auto-invalidate** on template
  churn beyond HMR re-clone; a CMS edit to a Government template needs
  `dest /obj/GovernmentCatalogue` (same posture as corpo — document).
- **Shift-less roster through the tick**: an empty `schedule` should
  evaluate never-on-shift; confirm `runTick` tolerates it (no wage, no
  crash) — the terminal-clerk bounded-shift seed is the nearest
  precedent; a small assertion in the flagship test is cheap insurance.
- **Existing sibling Localities** (`counting-houses`,
  `university-avenue`, `lounge`, `last-counted-mile`) claim roots
  **outside** `terminus` — those places are under no government after
  this build. Correct per closed scope (re-rooting them is Terminus
  city content), but say it in civics.md so nobody reads it as a bug.
- **Domicile self-heal seam**: if `DormWarren.admit` has no clean view
  of the *mover* (it returns the room; the door drives traversal),
  restrict the self-heal to the door's `computeDestination`/traverse
  path or drop it and document the pre-build-tenant gap — do not
  contort the Warren for it.
- **`gov` alias collision**: grep the verb roster before keeping the
  alias; if anything claims `gov`, ship `[government]` only.
- **`requiresAnimate` on NPC dispatch** is fine (NPCs pass), but the
  controller must not assume an Interactive (no prompts — read-only
  output only).

## Amendment — committee realization + code-level jargon install

Scope added after the initial plan (requirements §Goals last two
bullets, §Surface decisions "Committee is derived from parcel title" +
"Committee channels ride the existing chat substrate"). Grounding:
`ParcelApi.ownerOf(path)` is **total** and returns
`{ kind: 'group', name?, ref? } | { kind: 'player', templatePath }`
with the state default `{kind:'group', name:'core'}`;
`ParcelApi.resolveOwnerRef` maps a group owner → `GroupRef`; since
forums cycle-1 a `Channel` binds audience via its **Subject**'s
`groupRef` (`Channel.subject` → Subject `_id`), and the
group-DM→channel promotion path is the bind-an-existing-group
precedent. The committee is therefore **pure derive-on-read**: the
title-holding group IS the committee; a player-held subdivision has
none.

### Additional design decisions

11. **`CompactApi` is THE meta-institution facade** — `api/compact.ts`
    + `obj/api/CompactLogic.ts` (`/obj/api/compact`, gate
    `FromModule('/api/compact#CompactApi')`). Named for the
    institution; the single designated home for all future meta
    surface (membership, franchise) — per-feature meta Apis are not
    minted (a rejected `CommitteeApi` was the trigger). Pre-existing
    meta Apis (OfficeApi/InfluenceApi/AccessApi) are untouched. It
    composes
    ParcelApi + GroupApi + the chat surface; it owns **no storage**.
    Surface:
    ```ts
    committeeOf(path: string): Promise<CommitteeView | null>
    // CommitteeView = { name, groupRef, subdivisionPath } — null for
    // player-held subdivisions (a committee is a group, structurally)
    isCommitteeMember(player: Stuff, path: string): Promise<boolean>
    membersOf(path: string): Promise<Stuff[]>          // via GroupApi
    channelOf(path: string): Promise<ChannelInfo | null>
    ensureChannel(path: string): Promise<ChannelInfo>  // idempotent
    ```
    `ensureChannel` reuses the promotion-path internals to mint a
    persistent Channel whose Subject binds the committee's existing
    `GroupRef` — if no ChatApi method exposes bind-existing-group,
    add ONE narrow gated method on the chat logic rather than writing
    Channel/Subject Documents from committee code.
12. **The `committee` verb is filed under `system`** (`cmd/system/
    committee.yaml`, `obj/command/system/CommitteeController.ts` +
    seed) — a meta-administrative read, NEVER under `civics` (the
    fiction's category; the jargon standard's layer split). Bare form:
    resolve the covering parcel of the giver's location →
    `committeeOf` → group name, members, channel handle; `committee
    <path>` for an explicit path; `committee channel` ensures + shows
    the channel. Public, read-only except the idempotent ensure.
    Afforded via `Persona.commandContributions.self`. Grep the verb
    roster for a `committee` collision first.
13. **The Terminus committee is seeded real**: a well-known managed
    Group `terminus` (founder-membered — mirror the AccessRegistry
    bootstrap seeding of `core`/`lounge`/`wizards`, whatever that
    exact mechanism is) + a **title transfer** of the terminus
    subdivision from `core` to the `terminus` group, recorded through
    the ordinary `ParcelApi` mutation path so chain-of-title carries
    it (find how the existing terminus parcel row is provisioned —
    seed row vs boot reconcile — and mirror; never hand-write a
    `parcels` row without its event). Access consequence is
    intended: terminus-committee members become content-authors over
    the terminus subdivision — that is what a committee IS; seed
    membership = founder only.
14. **`COOPERATIVE_WIDE` → `COMPACT_WIDE`** in
    `lib/standing/RenownStanding.ts` and every importer
    (`RenownLogic`, `ConsumerLogic`, `ProducerLogic`, tests,
    `PersistenceManager`/`RenownEvent` comments). The stored `'*'`
    value is untouched — no migration; a regression test reads a
    pre-existing standing back. `StandingController` prose: "The
    Compact regards you well/poorly / has yet to form a view of you."
    Touched-file comments saying "the cooperative build" → "the
    Compact-governance build". `chat.md`'s "content-team-created" →
    "committee-created".

### Amendment file inventory

New: `api/compact.ts` (Api), `obj/api/CompactLogic.ts` (Api logic
singleton), `cmd/system/committee.yaml` (Command YAML),
`obj/command/system/CommitteeController.ts` (Controller) + its seed
YAML, the `terminus` group seeding + title-transfer wiring (home per
decision 13), `obj/api/__tests__/CompactLogic.test.ts`,
`obj/command/system/__tests__/CommitteeController.test.ts`.

Modified: `lib/standing/RenownStanding.ts` + importers (decision 14),
`obj/command/social/StandingController.ts`, the well-known-group
seeder, `lib/character/Persona.ts` (committee affordance),
`docs/subsystems/access.md` (the committee section — its doc home:
"the committee = the title-holding group; the jargon standard's
cabal/content-group replacement, realized"), `docs/subsystems/grouping.md`
(pointer line), `docs/subsystems/chat.md` (committee channels = the
promotion shape + the jargon line), `lib/paths.ts` if a committee
logic template key is needed.

### Wave insertion

The amendment lands as **Wave 5 — committee + jargon install**
(after content, before docs; the docs sweep becomes Wave 6 and adds
the access/grouping/chat doc edits):
`COMPACT_WIDE` rename + prose (mechanical, first — keeps the tree
green) → `CompactLogic`/`CompactApi` → verb → terminus group seed
+ title transfer → committee channel ensure. *Verifiable*:
`grep -r COOPERATIVE_WIDE` empty; renown/participation regression
green; `committeeOf` over a group-owned, a player-held, and an
unparceled (→ `core`) path; `ensureChannel` idempotent (two calls,
one channel); flagship — `committee` in the Registry office names the
terminus group, founder `isCommitteeMember` true, a member posts to
the committee channel and the audience resolves through
`GroupApi.membersOf`; chain-of-title shows core → terminus.

### Amendment risks

- **The title transfer is live access policy** — after it, `core`'s
  non-founder members (if any) lose author rights over terminus and
  terminus-committee members gain them. Intended; verify the access
  test fixtures don't assume core-owns-terminus.
- **Chat mint seam**: the promotion path may be controller-embedded
  rather than Api-exposed; budget for the one narrow gated method on
  chat's logic (per decision 11) and gate it
  `FromModule('/api/compact#CompactApi')`-plus-existing-callers
  only if chat's conventions demand.
- **Well-known-group name** `terminus` may collide with an existing
  groups row on long-lived dev DBs — the seeder must be
  reconcile-not-clobber (the AccessRegistry seeding already is;
  mirror it).
- **`standing` snapshot tests** may pin the old prose — update
  alongside the controller.

## Cross-references

- `docs/requirements/civics-requirements.md` — the closed contract.
- `docs/staging/diegetic-government.md` — premise, six powers, jargon.
- `docs/subsystems/address.md` / `corpo.md` / `employment.md` /
  `residence.md` / `governance.md` / `command-spec.md` /
  `content-packs.md` — the load-bearing precedents cited throughout.
- Recipe exemplars: `lib/corpo/Corpo.ts`, `obj/CorpoCatalogue.ts`,
  `obj/api/CorpoLogic.ts`, `api/corpo.ts`; verb exemplar:
  `cmd/governance/office.yaml` +
  `obj/command/governance/OfficeController.ts`.
