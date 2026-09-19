# Slate-compaction pass — parcel batch ledger

Six slates. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `access.md` ·
`furnishing.md` · `parcel.md` · `shell-workspace.md` (`furnishing.md` and
`shell-workspace.md` needed nothing). Line numbers below are the ORIGINAL
file's. Originals saved under the scratch dir `parcel/orig/` for diffing.

Two batch-wide findings before the per-slate detail:

- **The balance slate's 2026-08-06 ledger audit is still the current
  state.** `BankingLogic.postTransaction` still takes `opts.locality`
  (`platform/idea/api/BankingLogic.ts:1510,1547`) and every caller passes
  none; `AccountabilityLogic.ts:68` still writes `fields.locality ?? null`;
  `jurisdictionBound` is still planted only by governed eval
  (`SandboxLogic.ts:851`, read at `api/execution-context.ts:648`); there is
  no `actingParcelKey`. So the audit section is KEPT as the spec for
  #0a–0c, not cut as history.
- **One real graduation surfaced by the grep, not by the slate:**
  `AccessRegistry.holdsPrimeMinister` (`platform/idea/AccessRegistry.ts:317`,
  consulted by both `isWizard` :257 and `isArchwizard` :290) makes the
  holder of `prime-minister` a wizard and an archwizard, derived, never
  stored. That is the balance slate's Part 6 *PM → archwizards → wizards*,
  shipped — and `access.md` predicate 6 still said the PM office was
  *deferred* above archwizards. Fixed by insert + one clause (below).
  ⚠ `api/access.ts:194`'s docstring carries the same stale "is deferred"
  clause — code, not my remit; flagged for the coordinator.

---

## docs/slates/builds/balance-slate.md — 1607 → 1590 · Status PARTIAL → PARTIAL

Almost entirely UNBUILT design doctrine (the enumeration, the `bound`
instrument, the docket sweep, the denominators, the ops seat, the standing
ladder, disclosure, Part 8). Grep: no `Statute`/`Instrument`/`bound`
kind/`docket`/`enactment`/`quarantine` under `packages/server/src/mud`
outside forums/sandbox; `ParcelRecord` carries no class-per-matter field
(`lib/parcel/ParcelRecord.ts:132–142`: extent · zonePath · area · storeys ·
owner · parentParcel · grants · allowance · keyway · landUse · reach);
`allowance` has no consumer (`ResidencyLogic.ts:254` says so). `LICENSE`
is plain AGPL-3. Cuts are three.

### Cut (SHIPPED · DOCUMENTED)
- the stale second status block *"design conversation, captured. Not requirements…"* (30–33, 4) — history; the canonical block is kept and re-stamped

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `## ⭐⭐ The PM heads the executive, period` → the CORRECTED-2026-08-04 paragraph + the user's call + *"So the seat access.md defers above archwizards is now specified… PM → archwizards → wizards"* + *"This makes code-trust politically accountable"* (950–969, 20) — code: `AccessRegistry.holdsPrimeMinister` via `CompactApi.holdsOffice(subject, 'prime-minister')`, consulted by `isWizard`/`isArchwizard` after the group caches → inserted at `access.md` as a new `### The Prime Minister backstop — code trust follows the seat` under predicate 6 (19 lines: derived-never-stored and why — a stored grant survives the handoff; floor not ceiling; no seeded wizards, the founder is only the default office holder). Heading + pointer left; the two following paragraphs (the captured-PM risk absorbed by the inalienable floor; *appointment is not exercise* — the PM seats ops) are KEPT as unbuilt. **One existing sentence in access.md was changed** because the code proves it false: predicate 6's *"with a Prime Minister office deferred above `archwizards`"* → *"with the Prime Minister's office above `archwizards` — the derived backstop, next."*

### Superseded — cut
- `### ⭐⭐ The third case is a trade pack, not platform architecture` → the intro paragraph + the *"There is no 'the' editorial office"* blockquote (1031–1041, 11) — by the code: press shipped as **kernel substrate** (`PublisherMixin`, publishers are organizations, each governed by its holder; the front page reads an enumerated list of publishers), not as a trade pack → `press.md § 1–2`. Heading + note left; the *"Same for ranking…"* paragraph is KEPT (no ranking formula exists)

### Kept (UNBUILT)
- `## ⚠ Already decided elsewhere` (spine) · all of **Part 1** (the mints table, the two-halves enumeration, portable objects + the retraction, risk-weighting, meter outcomes, *Federalism is already built*, supremacy/void-at-write, capability-fails-closed/authority-fails-open, *Three tiers* + the inalienable-content correction)
- all of **Part 2** including `#### ✅ AUDITED 2026-08-06` and Findings 1–5 (still the current state — see the batch finding above), the denominator doctrine
- all of **Part 3** (class-per-matter, accessory use, targeting-is-zoning, undeclared-mints-nothing, particular exemption, the parked `/compact` allowance — `parcel.md § The /compact title` points here)
- all of **Part 4**, **Part 5**
- **Part 6** except the two cuts above: *Regulatory in shape*, the two kept PM paragraphs, *Why ops is its own seat* (no ops office in `OFFICE_APPARATUS` — `governance.md` l.68), *Publishing is three problems* intro + table, *Authority is required to PUSH* (see Uncertain), *The two senses of public/private* (see Uncertain), *The one concrete gap in case 2* (no community-default tier in `social-graph.md`; only deployment baseline seeds), the un-ruled proposals, *Removal not confirmation*, the inflation risk + the patronage sensor + *ship the cheap version*
- all of **Part 7**, **Part 8** (the census damper is shipped for magic items only — `magic-items.md § The census`, which the slate quotes; the generalization #13 is open)
- `# What is actually net-new` (the build surface) · `# Open questions`

### Uncertain — kept
- `## ⭐⭐⭐⭐ Federalism is already built — it is the longest-prefix walk` (292–302) — the slate's own Finding 1 (498–520) corrects it (*two* prefix hierarchies, title vs jurisdiction, neither derived from the other; `address.md` l.186/213 confirms `_governmentKey` is a separate jurisdiction chain). Kept because the correction is in the same slate and requirements must read both
- `### The two senses of public/private` (1068–1082) — says *"`/compact` is not a parcel at all"*; it IS a `parcels` row (a path-branch title with no `landUse`/`area` — `parcel.md § The /compact title`; `packages/content/platform/pack.yaml` `requires.title`). The vocabulary point (fiction-public ≠ parcel-public) stands; the factual clause is stale
- `### ⭐⭐⭐ Authority is required to PUSH, never to PUBLISH` (1046–1066) — the *who may publish AS an organization* half shipped (`press.md § 2`: the position publishes); *tuning in is unrestricted* shipped (`streaming.md` `watch`/`tune`); *syndication / promotion as a publication* has no code. Kept whole
- Part 1 `## ⚠ Three tiers` — *"the polity governs who holds the keys"* is now literally true via the PM backstop; the **inalienable content-authorship floor** and *compute as the only throttle* remain doctrine with no code. Kept as constitutional design per the batch brief
- Overlaps for the cluster pass: the jurisdiction stamp ↔ `instrumentation-slate`; the standing ladder / courts ↔ `courts-judiciary-primitive` (memory) and `legal-code-slate`; the notification default chain ↔ `social-graph.md § Deferred`; the ops seat ↔ `wizard-duty-slate`

### Handoff
- none

### Status block
- Status line: added *"and the Prime Minister backstop on the code-trust chain"* + the access.md pointer
- Left: *the jurisdiction stamp on the 4 unstamped ledgers (#0a-0c) · the cross-jurisdiction enumeration · the void-at-write validity predicate · the `bound` instrument · class-per-matter on `ParcelRecord` · quarantine · the two divergence dockets* → *the jurisdiction stamp (#0a plant the parcel extent at the command root · #0b `actingParcelKey()` + delete `opts.locality` · #0c title/jurisdiction congruence) · the cross-jurisdiction enumeration · the void-at-write validity predicate · the `bound` instrument · class-per-matter + the prediction half on `ParcelRecord` · undeclared-mints-nothing · breach entries in the docket sweep · quarantine · conform-on-`saveTemplate` · lapse-on-amendment · the cross-parcel attribution rule · the provisioning↔measurement firewall · the census damper generalized · the two divergence dockets · the ops seat + the supervisor seat (removal by crossing) · the fund-standing trend gauge · the notification default chain* (the body wins: the net-new table's #5–#13 and Part 6's seats were unrepresented)
- Size: a build → a build

---

## docs/slates/builds/property-slate.md — 1075 → 643 · Status PARTIAL → PARTIAL

The 2026-07-02 addendum (§A–§K) is the design that became property 0a/0b,
the sandbox door, residences and holding; nearly all of it is shipped and
documented across `parcel.md` / `chattel.md` / `sandbox.md` /
`residence.md` / `holding.md` / `persistence.md` / `furnishing.md`. What
remains unbuilt is the **compute economy** (Phase 1 — no `costOwner`,
`heartbeat`, `degradation` or allowance consumer anywhere), governance
allocation (Phase 2), tenancy economics (Phase 3 — `holding.md § deferred`:
*"a lot sells at the book's authored price and nothing values it
afterwards; there is no market"*, *"a lease is a grant with no money
leg"*), and the release gate for unreleased power.

### Cut (SHIPPED · DOCUMENTED)
- the duplicate *"⭐ PARTLY SHIPPED"* status paragraph (11–22, 12) — restates the canonical block; its content (Hinkley `title` verbs, `smallholding.md`) is in the re-stamped Status line
- `## The parcel — the missing noun` body (126–147, 22) — code: `lib/parcel/ParcelRecord.ts`, `platform/idea/ParcelRegistry.ts`, `cmd/system/subdivide.yaml` + `transfer.yaml`; doc: `parcel.md` (intro, § The governing security invariant, § The verbs). Heading + pointer left
- `## Author ≠ owner — brick zero` body (150–166, 17) — code: `ParcelApi.ownerOf` two-rung chain, `lib/standing/CreditRouting.ts` (credit); doc: `parcel.md § ownerOf` (*"There is no author rung… credit, never title"*), `§ grants[]` (the tenancy half). Heading + pointer left
- `## Build waves` → **Phase 0 — Possession core** bullet (324–328, 5) — doc: `parcel.md` (0a), `chattel.md` (0b). Replaced by a one-line pointer bullet
- `### A. The zone tree is the ownership tree` body (393–417, 25) — doc: `parcel.md` intro (*a Zone + a title record*), `§ The sparse hierarchy` (`coveringParcelOf` longest-prefix, `parentParcel` carve-outs). Heading + pointer left (`parcel.md:537` cites §A)
- `### B. Ownership + authorship + allowance live in a separate collection` body (420–442, 23) — code: `parcels` collection, `AccessRegistry` repoint; doc: `parcel.md § The governing security invariant`, `§ The AccessRegistry repoint`, `access.md § Ownership: the parcel layer`. ⚠ `ownerOf = title ?? authorOf` did not ship (R2a removed the author rung — `parcel.md § History`); the pointer says so. Heading + pointer left (cited by `parcel.md:537`)
- `### D.` → *One invariant* · *Mechanism = scoped ledger quarantine* · *Allowlist principle* bullets (470–483, 14) — code: `lib/sandbox/`, `SandboxLogic`; doc: `sandbox.md § The scope taint`, `§ The crossing` (`Contacts` is the one merge-allowlist entry). Pointer left; the *gamified home is canonical* bullet is KEPT (its release gate is unbuilt)
- `### D.` → *Consistency note* bullet (493–496, 4) — reconcile-on-read is the shipped pattern (`husbandry.md`, `metabolism.md`)
- `### Net (phase-sequencing impact)` (545–557, 13) — history of a phase that shipped; its three scoping changes are `parcel.md`. Heading removed
- `### F.` → the parcel = zone bullets + the bright line + the two-registries table + the pets-gap paragraph (560–598, 39) — code: parcel + chattel registries; doc: `parcel.md`, `chattel.md § The trio`, `chattel.md § Deferred` (the `Charge`-debtor gap). The bright line itself was undocumented → graduated (below). *Two tensions* KEPT
- `### G. The wardrobe` → intro + the mechanism bullets + the *Two orthogonal gates* table (616–647, 32) — code: `lib/sandbox/SandboxCrossing`, `SandboxCrossingExit`, `/platform/thing/sandbox/wardrobe`; doc: `sandbox.md § The door, the aperture, the harness` (skin-not-class, `linkedSandboxPath`, guest access over `grants[]`, *`isWizard` required for every mode — jurisdiction gates where, never whether*). *Two exits* and *Edges* KEPT (the publish-via-review exit is unbuilt — `cms.md` defers the review gate)
- `### G.` → *Architectural payoff* paragraph (656–661, 6) — prose over the shipped door
- `### H. Wardrobe ↔ zone lifecycle` → the split + Move/Sell/Destroy + the invariant correction (671–704, 34) — doc: `sandbox.md § The door` (`onMoved` re-seats; the public-booth rule makes sell-empty work; `onDestruct` reaps via `closeSession` and orphans the re-bindable zone; doors are concurrent). *Interactions carried forward* KEPT
- `### H.` → *Payoff* paragraph (713–719, 7) — prose
- `### I. Chattel, persistence, and the capability-vs-relation correction` body (723–832, 110) — code: `lib/chattel/`, `lib/persistence/Persistable.ts`, `lib/creature/Creature.ts` (composes `ChattelMixin`); doc: `chattel.md` (stamp + rebuildable index; `_chattelId`; no `PossessableMixin`), `persistence.md § The self-persistence spine` (`PersistableMixin` over `holder_snapshots`, seed-then-persist), `furnishing.md § ownerOf — three rungs`, `ranching.md § Ownership`. The mixin guardrail → Handoff (below). Heading + pointer left
- `### J.` → *Architecturally: the shared things are the operation primitives* + *Possessions is a sparse minority* + *Shops are a primary consumer… the sale promotes* (847–865, 19) — code: `ChattelApi.transfer`, `BankingLogic.settle`, `BuyController`; doc: `chattel.md § The trio`, `retail.md § The buy loop (stamps ownership)`, `chattel.md § Deferred` (the general `give`/`sell`/`claim` surface, still deferred — named in the pointer). The custody/title bullets and the *What a shop belongs to* table are KEPT (see Uncertain)
- `### K. Dorms — the proto-parcel` body (884–975, 92) — code: `ParcelRecord.selfHomeOwnerOf`, `UseGrant`, `grantUse`/`revokeUse`/`hasUseGrant`/`heldUnitsOf`, `DormWarren` keyed on unit parcel; doc: `parcel.md § Self-home generalization`, `§ grants[]`, `holding.md` (the Granted/Let/Owned ladder table), `residence.md § D1`. Two leans did NOT ship as written — see Superseded. Heading + pointer left (cited by `parcel.md:537`)
- `## Phase re-slice & readiness` → *Why 0a first* + *The one risk to scope first — the `AccessApi.can` blast radius* (990–1001, 12) — history; the blast radius is recorded in `parcel.md § History`
- `## Phase re-slice` → *Next action: `/requirements` on Phase 0a* (1022–1023, 2) — stale
- `## §L` → seam 1 *Chain-of-title* (1050–1055, 6) — code: `parcel_events` (`ParcelEvent`); doc: `parcel.md § Chain of title` (which cites *"slate §L"*). Replaced by a one-line item noting the readout is still deferred

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `### F.` → *"real property bottoms out at the zone; everything finer is chattel or slots"* (565–582, inside the 560–598 cut) — code: every interior a zone (non-cardinal `enter` = zone break, `zone.md`), chattel per-instance stamp, farm beds as `CultivableMixin` slots (`smallholding.md`) → inserted at `parcel.md` as a new `### What is a parcel, and what is not` under § The sparse hierarchy (18 lines: the bright line, coarser = multi-extent, finer = chattel or slots, rent-a-stall, the one inexpressible case = the deferred region parcel)

### Superseded — cut
- `## Enforcement is dormancy` → *Freeze (built)* + *Evict (net-new): nothing is ever unloaded, `lifecycle.md` defers idle eviction* (274–282, 9) — by the code: eviction shipped as the residency sweep (`residency.md`: *"abandoned in-memory Stuff evict itself, reclaiming the cold tail"*, `Stuff.canEvict`). Note left; the insolvency/over-deficit TRIGGER paragraph is KEPT
- `## The gap map (from three probes)` table (311–321, 11) — by the slate's own `## Phase re-slice & readiness` table (five of eight rows since shipped). Heading + note left
- `### K.` → decision 2 *room persistence = the document-store customization-doc, NOT the holder-snapshot* (904–910) and Thread 1's recommended resolution (A) *dorms aren't Warrens* (912–931) — by the code: `residence.md § D1` — rooms persist through the `(scope, key)` spine into `holder_snapshots`; dorms stayed `DormWarren`s keyed on the unit parcel (resolution B). Both named in §K's pointer

### Kept (UNBUILT)
- `## The frame` · `## The two scarcities` · `## The compute model` (Layer A/B, two numbers) · `## Measurement` (CPU via the Proxy, memory sweep, attribution buckets) · `## Enforcement is dormancy` (the trigger) · `## Governance — scarcity is an invented, tuned policy` · `## Build waves` Phases 1–3 · `## Open forks / questions` · `## Scope guardrails` · the addendum intro
- `### C. Compute attribution = cost-owner` (`chattel.md § Deferred` names it) · `### D.` the *gamified home is canonical* bullet (the release gate) · `### E. Home personalization = capability tiers` (see Uncertain) · `### Open threads carried forward` · `### F.` *Two tensions* · `### G.` *Two exits* + *Edges* · `### H.` *Interactions carried forward* (credit routing on a furnished sale) · `### J.` the custody/title bullets (`give` as combined custody + title, `claim`, `sell` — no such verbs: `cmd/inventory/give.yaml` moves custody only; no `claim.yaml`/`sell.yaml`) + *What a shop belongs to* (see Uncertain)
- `## Phase re-slice & readiness` — the table, *Firm (decided…)*, both *Still open* lists
- `## §L` — intro, the mapping table, seams 2–3, the coord-region deferral, *Net*

### Uncertain — kept
- `## The frame` → *"Today's dorm is a shell — `HomeZone` … empty"* — stale: the dorm shipped as a leased, furnishable, persisted room (`residence.md`, `furnishing.md`); `HomeZone.ts` still exists at `platform/idea/HomeZone.ts`. Kept inside the framing paragraph (paragraph rule)
- `### E. Home personalization = capability tiers` — Tier 0 shipped as furnishing (`place`/`hang`, chattel) but NOT as a data-field editor (no `describe` verb — scoped-authoring audit); Tier 1 shipped (`scripting.md` author-tiered limits); Tier 2's *publish via CMS/forums review* has no review gate (`cms.md § Deferral`); the *release gate* has no code. The governing principle (*review the vocabulary, not the sentence*) is undocumented but not shipped as a mechanism, so kept rather than graduated
- `### J.` → *What a shop belongs to — three layers* — premises/business/stock separate in the model (`employment.md` Business Idea, `retail.md` consignment, `parcel.md`), but no commercial premises lease has ever been exercised (Seznick's `lease` is residential) and the compute layering is unbuilt. Kept whole
- `## Phase re-slice` → *Firm (decided, in §A–§K)* — lists decisions that shipped beside three (cost-owner, the released gate, capability tiers) that did not; one paragraph, kept
- `## §L` mapping table → *Prestige = allowance* (unbuilt), *rent → own progression* (shipped — `holding.md` ascent gate), *sandbox adjacent* (shipped). One table, kept
- Overlaps for the cluster pass: §L / Phase 3 ↔ `development-slate`, `residences` (holding.md § deferred); the compute economy ↔ `land-compute-and-license` Movement 2 (same open thing, kept in both); `describe`/Tier 0 ↔ `scoped-authoring-slate`

### Handoff (belongs in a doc outside my list)
- → `mixins.md` (a short *Before proposing a mixin* rubric; `antipatterns.md § Custody Is a Relationship` is the nearest existing sibling), verbatim from the cut §I:

  > **The guardrail — a mixin test (adopt this project-wide).** Before proposing any
  > mixin, ask:
  > 1. **Capability or relation?** A *capability* is intrinsic ("this KIND of thing
  >    can be worn / contains / is a portal") → a mixin on the templates that have it
  >    (`Wearable`, `Container`, `SandboxPortal`). A *relation* is runtime ("this
  >    instance is owned-by / regarded-by / authored-by that one") → a **registry
  >    keyed on identity, never a mixin** (`belief`, `regard`, `renown`,
  >    `authoring_events` — none is a `RegardableMixin` on its target).
  > 2. **If a mixin: does *every* instance of the base have it?** If yes it's
  >    base-class, not a mixin; if only some, it's opt-in.
  > 3. **Where does the concept bottom out** in the hierarchy?
  >
  > Possession fails #1 — **being owned is a relation, not a capability** → **there is
  > no `PossessableMixin`.** (Contrast: the wardrobe's `SandboxPortalMixin` confers
  > *behavior* → a legit mixin. The test discriminates.)

### Status block
- Status line: *the title substrate, chattel, and the first land market … all ship* → *the title substrate, chattel, the use-grant, the wardrobe and the first land market … all ship*
- Left: *the compute-allowance scarcity (the field is inert) · dormancy-as-reclamation · un-fusing author from owner · real-estate above one lot (resale, leases, valuation)* → *the compute economy (Phase 1 — predicted heartbeat budget, measured degradation, cost-owner attribution; `allowance` is inert) · dormancy-as-reclamation for insolvency / over-deficit · governance allocation (Phase 2 — fiscal cycle, commons subsidy, frontier/center curve, over-subscription) · tenancy economics (Phase 3 — rent as a recurring charge, sublet, valuation + resale) · the general `give`/`sell`/`claim` surface + lease-on-chattel · the release gate for unreleased power + home-personalization Tier 2 · coord-region parcels + zone-proliferation perf · prestige-as-allowance + the safer-neighbourhood policy attribute · credit routing on a furnished sale*. ⚠ **`un-fusing author from owner` is REMOVED from Left** — it shipped (`parcel.md § ownerOf`: no author rung; the slate's own re-slice table said so at 0a). *leases* removed from the Phase-3 gloss (the use-grant is live); *rent as a recurring charge* is what remains
- Size: a build → a build

---

## docs/slates/tails/access-slate.md — 410 → 329 · Status PARTIAL → PARTIAL

`can()` shipped as **title dispatch**, not as a capability-source engine
(`access.md § The two account axes`: *"never a tier"*; `§ Subject = current
command giver`). The reserved call-security slots the slate meant to fill
were retired: `AdminOnly` no longer exists in
`lib/security/SecurityPolicies.ts`; `call-security.md:106–109` —
*"`getActingAvatar()` / `getResponsibleAvatar()` … `Admin`,
`ByCommandGiver`, `ByActingAvatar`, `ByResponsibleAvatar`. Those aren't on
the roadmap."* The audit sink is still the clean survivor
(`call-security.md:31–33`, `:1913`: *"The shipped code emits none of
these. `MudlogApi` exists as a separate…"*; `MudlogLogic.ts` exists, 13
call sites, none an audit stream).

### Cut (SHIPPED · DOCUMENTED)
- the stale second status block *"architecture set, forks leaned"* (15–21, 7) — history
- `## Force-bypass & deny composition` → the `forceX` bullet (269–272, 4) — code: `StuffApi.forceDestruct` / `ContainmentApi.forceMove` gated `FromController`; doc: `access.md § The narrow-entry pattern`. Replaced by a one-line pointer bullet; *Deny-wins* KEPT

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none

### Superseded — cut
- *"The unlock: call-security already reserved the slots…"* + the four slot bullets + *"We're filling those reserved slots"* (63–77, 15) — by the code: the slots were retired, not filled (`call-security.md § caller-identity policies`); privileged mutations ship as narrow-entry (`access.md`). Note left
- `## Principle` body (108–122, 15) — by `access.md § The two account axes` (title within your extent, never a tier) and `§ Where the gate lives` (validators + controller checks). Heading + note left
- `## The layers` diagram (124–145, 22) — by the code: no capability sources, no tier, no stack-walked subject. Heading removed
- `## The capability core` body (150–178, 29) — by `access.md § The two account axes` + `§ Subject = current command giver` (title dispatch: group membership / player identity / organization staff-or-authority over `ParcelApi.ownerOf`). Heading + note left
- `## Two enforcement surfaces, one core` body (182–199, 18) — by the code: method-level is the narrow-entry pattern, not an `Admin` policy; action-level is the typed-preload validators + controller-body checks (`access.md § The narrow-entry pattern`, `§ Where the gate lives`). Heading + note left
- `## Diegetic-first` body (204–212, 9) — by the code: `can()` reads title only; a locked door never consults `can()` — the lock asks what you carry (`credential.md`, `boundary.md`; `furnishing.md § The posted designation`: *"identity-blind: it asks what you carry, never who you are"*); the location/context source never shipped (`access.md § What's NOT in this build`). Heading + note left

### Kept (UNBUILT)
- the AUDIT 2026-08-08 block (the current analysis of the lease question — spine) · the framing paragraph · See also
- `## The unification` (see Uncertain) · `## The broader shape: do / see / write × circumstances` (the meta-framing `scoped-authoring-slate` defers to) · `## Force-bypass & deny composition` → *Deny-wins* (no deny source ships — `access.md § What's NOT`) · `## Audit (a free win)` · `## Worked scenarios` (see Uncertain) · `## What this stresses` · `## Open questions` · `## Build order` · `## What this slate does NOT cover` · `## Once shaped into formal requirements` (no requirements doc was ever written; see Uncertain)

### Uncertain — kept
- `## The unification` table — mixed: *file / source-tree write-scope → `can(actor,'write',path)`* shipped literally (`access.md § Verb-controller gates`); *command validators* shipped as `requiresWizard`/`requiresStreamer`/`requiresArchwizard`/`requiresPackInstaller` (not tier); *door locks* shipped WITHOUT `can()` (credential); *`AdminOnly` + forceX → Admin policy* superseded (narrow-entry); *chat gag*, *guild kick*, *field masks* unbuilt (`chat.md:482` — the channel role overlay is deferred). One table, kept
- `## Worked scenarios` — *owned room* shipped (title), *locked door* shipped without `can()`, *wizard force* shipped as narrow-entry (`can(giver,'force-destruct',…)`, no tier), *guild kick* / *gag* unbuilt. Kept whole
- `## Build order` Wave 1 — the tier source + the `Admin` policy are superseded; the audit sink and group-role remain. Kept
- `## Once shaped into formal requirements` — most bullets are superseded (capability sources, tier, `Admin`); kept as the slate's boil-down since no requirements doc exists, flagged for requirements
- `## Open questions` 2 (subject resolution) and 5 (tier ladder) are answered by what shipped (current `CommandGiver`; no tier) — open questions are spine, kept
- The one remaining design item (*the lease-vs-quota question*) has no consumer pushing it (the AUDIT block says so) — **merge candidate for the cluster pass** with `parcel.md § grants[]` (the lease that DID ship is a parcel use-grant, not an access lease)

### Handoff
- none

### Status block
- Status line: added *"the deferred caller policies were RETIRED, not built"*
- Left: *the structured audit sink (call-security Pillar 5 — `MudlogApi` is unwired) · the deferred caller policies (`Admin`, `ByCommandGiver`, `ByActingAvatar`, `ByResponsibleAvatar` + `getActingAvatar`/`getResponsibleAvatar`) · the lease-vs-quota design question* → *the structured audit sink (call-security Pillar 5 — denies + `forceX` uses → `MudlogApi`, which is unwired) · action-level `can()` for non-staff verbs (chat gag-as-deny, channel post/moderate roles, guild kick, field masks) + deny-wins composition · the location/context source · the lease-vs-quota design question, which should not ride the audit sink's cycle*. ⚠ **the deferred caller policies are REMOVED** — retired per `call-security.md:106–109`; the body's remaining unbuilt items (deny-wins, the non-staff action-level checks, the location source — all listed in `access.md § What's NOT in this build`) were unrepresented and are added
- Size: a tail → a tail

---

## docs/slates/tails/scoped-authoring-slate.md — 345 → 337 · Status PARTIAL → PARTIAL

The 2026-08-08 AUDIT block at the top already classified the slate
correctly and is kept as its spine. Verified: no `describe.yaml` anywhere
under `packages/content/**/cmd/`; `make.yaml` exists
(`platform/cmd/crafting/make.yaml`) with no catalog-membership validator;
`write`/`cat` are `shell-workspace.md`; the code-trust per-field gate is
`access.md § The code-trust lockdown`.

### Cut (SHIPPED · DOCUMENTED)
- the stale second status block *"model set, GUI is the bulk"* (14–21, 8) — history

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none

### Superseded — cut
- load-bearing decision 3 *One authoring ladder, access-gated (personal → granted → wizard)* (85–88, 4) — by `access.md § The two account axes` (there is no author tier; content-packs wave 3 deleted `isAuthor`/`requiresAuthor`). Struck + note in place
- `## Principle` item 4 *One access-gated ladder* (136, 1) — same. Struck + note in place
- `## The permissions structure (the access half)` body (217–224, 8) — by the code: `can(giver, 'write', target)` over `ParcelApi.ownerOf`, `heldExtents` as the scope listing, a group-held title for a shared space (`access.md`, `parcel.md`); no granted rung. Heading + note left
- `## Persistence` body (250–254, 5) — by the code: owned goods persist with their OWNER carrying a `place`, a titled room persists itself through the `(scope, key)` spine (`furnishing.md`, `persistence.md`); `TemplateApi.snapshotToTemplate` is retired (`persistence.md:293`). Heading + note left

### Kept (UNBUILT)
- the AUDIT block · load-bearing decisions 1, 2, 4, 5, 6 · See also · `## Principle` 1, 2, 3, 5 · `## The thin server surface` (see Uncertain) · `## The validation core` (all — only the code-trust axis of the per-field gate exists) · `## The player surface (the GUI)` · `## Quotas & the catalog` · `## What this reveals / needs` · `## Open questions / forks` · `## Build order` · `## What this slate does NOT cover` · `## Once shaped into formal requirements`

### Uncertain — kept
- `## The thin server surface` → *"(`describe`/`put` already exist for trivial cases)"* — false (`put` does, `describe` does not); already flagged by the AUDIT block; kept in place per the paragraph rule
- load-bearing decision 6 / `## The thin server surface` — *"two front-ends over `write`/`cat`, gated by the same policy/validator"* — the wizard front-end shipped; the player GUI and the shared (policy, validator) gate did not. Kept
- `## Once shaped into formal requirements` — carries the superseded ladder; no requirements doc was ever written, kept as the boil-down
- Overlap for the cluster pass: the `describe` prose rung ↔ `property-slate § E` Tier 0; the moderation validator it is blocked on ↔ `comms-slate § Moderation`; the GUI ↔ `client-cockpit-slate`

### Handoff
- none

### Status block
- Left: *⭐ the `describe` verb … · the vetted-catalog membership validator behind `make` · authoring quotas · the client authoring GUI* → *⭐ the `describe` verb (the prose rung — no such verb exists; blocked on a moderation validator) · the per-field (access policy, value validator) gate on `write`, default-deny · the vetted-catalog membership validator behind `make` · authoring quotas · co-owned spaces · the client authoring GUI* (the validation core itself — the slate's load-bearing decision 4 — was unrepresented)
- Size: a wave → a wave

---

## docs/slates/builds/land-compute-and-license.md — 254 → 244 · Status PARTIAL → PARTIAL

Constitutional/design doctrine — the title/entitlement split, the
compute floor, subsidiarity, the license regime, the necessity-kernel
test (which `wizard-bar-slate` applies) — all KEPT. Verified unbuilt: no
compute meter or entitlement function; `LICENSE` is plain AGPL-3 with no
§7 additional permission; no capacity door. Cuts are the shipped land
bullets only.

### Cut (SHIPPED · DOCUMENTED)
- the stale status paragraph *"design capture, not built … Nothing here changes shipped code"* + the video-treatment sentence (12–23, 12) — history; the *spine* sentence that followed it is kept
- Movement 1 → *The land = the code/data namespace … carved into parcels* (29–32, 4) — code: `ParcelRegistry` `PathTrie`, `subdivide`/`parentParcel`; doc: `parcel.md`, `document-store.md § The four namespace kinds`. Replaced by a one-line pointer bullet
- Movement 1 → *Group-WIP organization (a dedicated `/studio/<id>/` branch vs …) is an implementation detail — deferred* (63–65, 3) — code: `/studio` title claimed by the platform pack; doc: `document-store.md § The four namespace kinds` (`/studio/<group>` — the multiseat `/home`). Replaced by a one-line pointer bullet

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none

### Superseded — cut
- none

### Kept (UNBUILT)
- Movement 1 → the three-things-a-parcel-carries bullet (compute inert; publish-state design), the publish-gate bullet (see Uncertain), public vs private land (see Uncertain), *Why it's federalism*, *due process not exclusivity*, *the frontier term drops away*
- all of **Movement 2** (Levels 0–2, over-budget, felt/legible scarcity, the admission taxonomy, subsidiarity) · all of **Movement 3** (the license regime; the distribution bullet is mixed — content-packs shipped, the licence split did not) · `## The kernel/necessity refinement` · `## Open questions` · `## Cross-refs`

### Uncertain — kept
- Movement 1 → *public / commons = the kernel … "The `core` default in the parcel `ownerOf` walk"* — contradicted: content-packs wave 3 deleted `core`; `ownerOf` returns `null` on an untitled path and the platform's roots are explicit claims held by `/compact/executive` (`parcel.md § ownerOf`, `access.md § History`). The public/private doctrine stands; the mechanism clause is stale
- Movement 1 → *The publish gate … pre-gate / sandbox (`/home/<playerid>/`) … powerless by design* — shipped in a different shape: the holodeck's circle-scope taint (`sandbox.md`), with `/home/<self>` as the self-home title; kept because the bullet's point is the *boundary being security, not compute*, which is design
- Movement 3 → *Distribution — content-packs + code-modules* — content-packs shipped (36 packs, capability packs with `src/` — `content-packs.md`); *AGPL if it touches the core, the author's license if it composes* has no licence text behind it. One bullet, kept
- Overlap for the cluster pass: Movement 2 ↔ `property-slate` Phase 1 / §C (the same compute economy from two ends — the slate says so); the takings path ↔ `courts-judiciary-primitive` (memory); the eternity-clause framing ↔ `amendment-library-slate`

### Handoff
- none

### Status block
- Status line: *the three path-addressed trees* → *the path-addressed trees + `/studio`*
- Left: *compute metering and the entitlement function (quality vs demand weights) · the per-citizen or per-parcel compute floor · the license regime (author's-choice licensing + the visibility floor) · the takings / eminent-domain path private→public* → *compute metering and the entitlement function (quality vs demand weights) · the per-citizen or per-parcel compute floor · the capacity door + the admission taxonomy (instanced / ticketed) · subsidiarity (delegated sub-allocation below the top-level seam) · Level 2 sharding · the license regime (author's-choice licensing + the visibility floor; the AGPL §7 composition exception — `LICENSE` is plain AGPL-3 today) · the takings / eminent-domain path private→public* (Movement 2's door, taxonomy, subsidiarity and sharding were unrepresented)
- Size: a build → a build

---

## docs/slates/builds/wizard-bar-slate.md — 238 → 233 · Status UNBUILT → UNBUILT

Entirely unbuilt. Grep under `packages/server/src/mud` for safe-harbour /
disbar / break-glass / roster: nothing. `WizardController` (`wizard
grant/revoke`, `requiresArchwizard`) writes no conspicuous record.

### Cut (SHIPPED · DOCUMENTED)
- the stale second status block *"design conversation, captured. Not requirements"* (27–31, 5) — history; the canonical block is kept

### Graduated / Superseded
- none

### Kept (UNBUILT)
- everything else: `# It is a bar, not a guild` (+ the test, not-a-caste) · `# What the bar does` · `# Almost all of this is configuration, not kernel` · `# What the bar does not fix` · `# Open questions`

### Uncertain — kept
- *"Enforcement already ships (the PM may revoke any wizard)"* (l.24) and the Disbar row's *"the PM revocation that already ships"* — now literally true: the PM is a derived archwizard (`AccessRegistry.holdsPrimeMinister`) and so passes `requiresArchwizard` on `wizard revoke`. Not contradicted; noted because it was unverifiable before this batch
- `# Almost all of this is configuration` → item 2 *"an in-world social process minting `isWizard`"* must never happen — in tension with the shipped PM backstop, where a seat filled by the polity's conviction process DOES confer `isWizard`, derived. The slate's wall is guild-slate's (*guild rank* never confers the bit) and the balance slate decided the PM chain deliberately (2026-08-04), so this is a distinction (a constituted seat vs a guild rank) rather than a contradiction — but requirements should state it out loud
- Overlap for the cluster pass: the parent `wizard-duty-slate` (break-glass, the conspicuous record); the University-examines fork ↔ `college-slate`

### Handoff
- none

### Status block
- Left: unchanged — every item corresponds to a section still in the body
- Size: a build → a build

---

## Calibration notes for the coordinator

1. **A "constitutional" slate compacts almost nothing, and that is correct.** Balance and land-compute lost 17 and 10 lines; their `Left` lists roughly doubled because the body's unbuilt items were unrepresented. The pass's value there is the honest stamp, not the shrink.
2. **The grep found a graduation the slate did not claim.** The PM backstop is shipped code that a subsystem doc described as deferred. Worth a batch-wide rule: grep the doc's own "deferred" claims against the code, not only the slate's "shipped" claims.
3. **`Left` items that were RETIRED, not built** (the access slate's caller policies) are the most misleading kind of stale stamp — they read as backlog and are actually closed decisions. Both removals are called out inline above.
4. **A pointer stub is kept where another doc cites the section by name** (`parcel.md:537` → property §A/§B/§K). Cutting the heading would strand a live cross-reference.
5. **One off-by-one in my own cut** (the balance slate's *"Same for ranking…"* first line) was caught on the post-apply read and restored; two swallowed `---` dividers likewise. The post-cut read of every boundary is not optional.
