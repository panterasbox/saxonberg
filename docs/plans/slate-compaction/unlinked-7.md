# Slate-compaction pass — unlinked-7 batch ledger

Eight slates whose status block names no subsystem doc. Branch
`design/slate-compaction`. Procedure: `.claude/skills/compact-slate/SKILL.md`.
Write list: **none** — every graduation is in a *Handoff* section below,
verbatim, with its target doc named. Line numbers are the ORIGINAL file's.
Originals saved under the scratch dir `unlinked-7/orig/` for diffing.

Batch-wide findings first:

- **Six of eight are what their stamps say — unbuilt design** (warranty ·
  enforcement · branch-policy · connection-quality · wizard-axis-cleanup ·
  altar). For each the verification found nothing behind the nouns, and
  the only edits are the status block: a re-verified clause on the status
  line and a `Left` that now names every open section in the body. Net,
  those six **grew** by 24 lines; that is the pass working.
- **Two were stale on arrival.** `reference-lifetime` (a tail) is
  199 → 59: its design AND its "deliberately not bundled" follow-on both
  shipped (`fieldMeta` unified every field static; `authorable` /
  `runtimeState` folded in), and the tail it points at moved hosts
  (`DormWarren` maps → `OuterWarren` / `HoldingWarren`) and half-closed
  (`ref: 'identity'` is declared once). `alignment-religion` is 174 → 82:
  superseded exactly as it said, with one unowned block (the DRG
  conflict model) that also contradicts shipped consented combat.
- **One leak moved under the slate that tracks it.** wizard-axis's
  lease/provision `isWizard` bypasses were deleted from the two
  controllers by the lib-statics build and re-homed as the leading
  short-circuit of `AccessLogic.isAgentOf` (`:147`), whose comment names
  this slate. The stamp's line numbers were wrong; the leak count fell
  from four lines to one plus four YAML validators.
- **Stale doc facts flagged for the coordinator (outside my list):**
  `ref-shapes.md:132` (identity declared nowhere — it is), `:120` (the
  `DormWarren` maps — moved), `§ R2.1` (*convention* — a declared `owned`
  cascades in slot 2.5), `studio.md:41-57` (classification by TSDoc scan —
  it is `fieldMeta` now); `connection-quality`'s *Related* links a
  `cockpit-layouts.md` that does not exist.

---

## docs/slates/builds/warranty-slate.md — 202 → 194 · Status UNBUILT → UNBUILT

Entirely unbuilt, exactly as stamped. `CLAUSE_SHAPES` is still
`["achieve", "maintain"]` (`packages/server/src/mud/lib/employment/Clause.ts:22`)
— no clause evaluated after delivery; `warrant` / `puffery` / `merchantab` /
`caveat emptor` / `rescission` hit nothing in `packages/server/src/mud`,
`packages/content` or `packages/server/src/schema` except `Competence.ts`'s
English use of *warrants* and a notice-board keyword in `newbie-wilds`;
`contract.md` / `retail.md` / `accountability.md` still have no
representation primitive. The cures table is accurate: the herdbook is
shipped (`ranching.md § The herdbook`), renown / chain-of-title /
`authoring_events` / `BrandedMixin` ship; the auction and appraiser do not
(`auction-slate.md` exists, unbuilt). One cut.

### Cut (SHIPPED · DOCUMENTED)
- the second status block's first two paragraphs *"Status: design surface, unbuilt, no phase gate passed. Found 2026-09-03 by the farmstead multiplayer pass…"* + *"⚠ Verified gap. Checked against the three docs…"* (13–22, 10) — history; both duplicated by the canonical block (the *found by farmstead* provenance was folded into the canonical block's status line so nothing is lost). The third paragraph (*This is not a farming feature*) is framing and stays as the slate's framing blockquote

### Superseded — cut
- none

### Kept (UNBUILT)
- the status block (re-stamped) · the framing paragraph · *See also* (every linked slate exists: auction · legal-code · credit · reputation · identification)
- `## ⭐⭐⭐ The frame — a warranty is a clause verified after delivery` · `## Three kinds of thing a seller says` · `## The remedy ladder — and D48 is why it matters` · `## ⭐⭐ The polity question — caveat emptor, or an implied warranty?` · `## ⭐ It creates the demand for instrumentation` · `## The sharpest case is not agricultural` (BUC ships — `magic-items.md`; nothing sells it *as* uncursed) · `## Open questions` 1–6, all open · `## Scope guardrails`

### Doctrine — kept, labelled
- `## The problem it exists to solve, and every cure is already in the game` — Akerlof's lemons + *every other cure informs the buyer; a warranty binds the seller*; the thesis of the slate, not a build item
- `## ⚠⚠ The design rule that keeps it honest` — *the engine must never decide whether you lied* (the measurement doctrine applied to speech). Also a binding constraint on the build, so it stays in the slate either way; a candidate for `measurement.md`'s no-gauge rules once the build lands

### Uncertain — kept
- none contradicted by code. Overlaps for the cluster pass: the lemons problem / appraiser ↔ `auction-slate`; the polity fork ↔ `legal-code-slate`; the BUC proof case ↔ `identification-slate`; consequential damages (D48, the hay that burns the barn) ↔ the farmstead build (`fire.md` has no hay self-heating; the plan is retired, so D48 is an unbuilt design reference, not a shipped mechanic)

### Handoff
- none

### Status block
- Status: UNBUILT → UNBUILT (re-verified clause added to the status line)
- Left: unchanged — *the representation/assertion primitive · post-delivery clause verification on contract.md · the remedy ladder · the caveat-emptor vs implied-warranty polity fork · resale travel · BUC as the proof case* — every item has a section; every section is represented (the instrumentation demand is an argument, not an item)
- Size: a build → a build

---

## docs/slates/tails/reference-lifetime-slate.md — 199 → 59 · Status PARTIAL → PARTIAL

The design shipped, and so did its "follow-on". `static fieldMeta` with
`ref: 'identity' | 'instance'` + `lifetime: 'weak' | 'symmetric' | 'owned'`
is declared 386 times across kernel + packs (27 `lifetime:` entries);
`MixinApi.getAllFieldMeta` (`api/mixin.ts:756`) is the collector and
`getAllPersistentFields` (`:800`) is now a derivation of it; the
read-side heal is the `ProxyApi` get trap (`api/proxy.ts:203-211`); the
destruct-side rules run in slot 2.5 — symmetric clears then owned
cascades (`api/stuff.ts:1176`); `lint:field-meta` exists
(`package.json:39`). **The metadata unification shipped too**:
`FieldMetaEntry` (`lib/mixin.ts:40-62`, each entry annotated *"Was
`static persistentFields`"* etc.), zero `static persistentFields` /
`instructionFields` / `fieldMarshallers` / `stackIdentityFields`
declarations remain, and the doc tags folded in — `authorable` /
`runtimeState` are `fieldMeta` entries (444 `authorable: true`; zero
`@authorable` TSDoc tags) read by `StudioLogic` via `getAllFieldMeta`
(`StudioLogic.ts:570` *"It used to be recovered by scanning the mud
source"*, `:605`). Docs: `ref-shapes.md § The two axes` / `§ Declaring
it` / `§ R2.1–R2.4`; `mixins.md § Static contributions` (the `fieldMeta`
row lists every key).

**The tail is `ref-shapes.md § Known gaps`, re-verified:**
`SandboxCrossingExit.crossing` (`lib/sandbox/SandboxCrossingExit.ts:38`,
`private`, no `fieldMeta`), `ExitableVessel.outCache` / `entryCache`
(`lib/boundary/ExitableVessel.ts:63,70`), `LoungeWarren._reapTimers`
(`world/lounge/idea/LoungeWarren.ts:83`) — all still hand-guarded. The
six held-side R2.4 unhooks are still `cleanupOnDestruct`-form
(`Containable.ts`, `Spawned.ts`, `WarrenMember.ts`, `AetherHosted.ts`,
`Slottable.ts`, `Slotted.ts`). Two items of the stamp were stale:
**`DormWarren._unitsByKey` / `_corridorsByFloor` / `_doorsByKey` no
longer exist** — the residences build lifted them to
`OuterWarren._holdingsByKey` / `_circulationByNode` / `_entriesByKey`
(`lib/location/OuterWarren.ts:137-141`) and `HoldingWarren._roomsByKey`
(`packages/content/residence/src/idea/HoldingWarren.ts:127`), all still
undeclared (only `UnprovisionController.ts:14` and `Corridor.ts:4`
mention the old names in comments); and **`ref: 'identity'` is no longer
declared nowhere** — `Employed.institution` declares it
(`lib/employment/Employed.ts:227`). Nine cuts.

### Cut (SHIPPED · DOCUMENTED)
- the second status block *"BUILT, WITH A TAIL (2026-08-02)… Two claims here were corrected by the build"* (11–20, 10) — history; the tail pointer moved into the canonical block
- the third status block *"design captured 2026-08-01, not built… The one-line thesis"* (22–32, 11) — history; the thesis (*declare the rule per field and let the framework enforce it*) is `ref-shapes.md § The two axes` (*declared, not inferred*)
- `## What already exists` (47–71, 25) — the pre-build enforcement table + the hand-written R2.3 guard; code: `api/proxy.ts:203` (the heal), `api/stuff.ts:1176` (the owned pass); doc: `ref-shapes.md § R2.3` (*You no longer write this*; all six exemplars one-line reads), `§ R2.2` (framework-enforced, slot 2.5)
- `## The follow-on it implies — metadata unification` (124–159, 36) — code: `lib/mixin.ts:40-62` `FieldMetaEntry`; doc: `ref-shapes.md § Declaring it` (the unified example), `mixins.md:271`. The *Deliberately NOT bundled* paragraph is sequencing advice for a build that ran; the *doc tags fold in* question is answered by `StudioLogic.ts:570,605`. Heading + pointer left
- `## Rough shape of the work` (161–176, 16) — steps 1–5 all done: the collector (`getAllFieldMeta`), R2.3 (`Containable` / `Spawned` declared — `ref-shapes.md § R2.3` exemplars), R2.2/R2.1 (slot 2.5), the sweep (its residue IS `§ Known gaps`), the doc graduated
- `## Open questions` Q1 (*eager `weak` variant*) (180–183, 4) — resolved by the code: lazy heal on read, eager rules are `symmetric`/`owned` → `ref-shapes.md § R2.3` (*Arity is decided at heal time*). One-line pointer left
- `## Open questions` Q2 (*declared + persisted*) (184–187, 4) — resolved: throws at registration → `ref-shapes.md § Declaring it` (*`instance` with `persistent` — nothing durable to write down*). One-line pointer left

### Graduated (SHIPPED · UNDOCUMENTED) — then cut (→ Handoff, no write list)
- `## Why it matters more than it looks` (34–45, 12) — the why of *declared, not inferred*: the world's refs will be mostly instance refs as content grows, so it is the pattern authors follow thousands of times. `ref-shapes.md § The two axes` gives a different why (*only the author knows which question the field asks*). Heading + pointer left
- `## Options considered and rejected` → the wrapper-type, `WeakRef` and decorator paragraphs (98–101, 103–109, 116–122; 18) — roads not taken for a shipped decision; no doc carries them (`WeakRef` appears nowhere in `docs/` but this slate). The stuffId-handle paragraph (111–114) is SHIPPED · DOCUMENTED — `ref-shapes.md § Live ref, not stuffId` carries it nearly verbatim. Heading + pointer left

### Superseded — cut
- `## The shape` (73–94, 22) — by the code: shipped as `fieldMeta = { _x: { ref: 'instance', lifetime } }` (the section's own follow-on, inverted), not a `referenceFields: { _x: 'weak' }` map → `ref-shapes.md § Declaring it`. Heading + note left

### Kept (UNBUILT)
- the status block (re-stamped) · `## Open questions` Q3 (*should R2.4 collections fold into the same declaration* — this IS the six-unhook tail; `§ Known gaps` says each must convert atomically because slot 3 runs after 2.5) · `## Cross-references` (all three live; the `MortalArc` note is still true — `lib/vitals/MortalArc.ts` holds no object handle, not re-verified beyond the doc)

### Doctrine — kept, labelled
- none (the one doctrine paragraph is the graduated why above)

### Uncertain — kept
- the `Left` names for the warren maps — I re-pointed the stamp at `OuterWarren` / `HoldingWarren` because the `DormWarren` fields are gone from code; `ref-shapes.md § Known gaps:120` still names the `DormWarren` maps (stale, outside my list, flagged). Whether `HoldingWarren._roomsByKey` / `OuterWarren._keywayByHolding` (a `Map<string,string>`, not a ref) belong on the list is the tail's own audit to make

### Stale doc facts flagged (outside my list)
- `ref-shapes.md:132` *"`ref: 'identity'` is declared nowhere yet"* — `Employed.institution` declares it (`Employed.ts:227`)
- `ref-shapes.md:120` the `DormWarren` maps — moved to `OuterWarren` / `HoldingWarren` (above)
- `ref-shapes.md § R2.1` (*"Mechanism: eager, convention-based. Enforcement: convention"*) — a declared `lifetime: 'owned'` IS framework-enforced in slot 2.5 pass 2 (`api/stuff.ts:1176`; declared on `Boundary.anchorA/B`, `Exitable` exits, `Aether._hostedUpdates`); the doc's own two-axis table says *destruct cascades*. The section reads as pre-declaration text
- `studio.md:41-57` *classification is an inline TSDoc block tag… read by a source-scan (`StudioLogic.scanClassification`)* — the tags are now `fieldMeta` entries read via `getAllFieldMeta` (`StudioLogic.ts:570,605`); zero `@authorable` tags remain in `lib/` + `platform/`

### Handoff (belongs in a doc outside my list)
- → `ref-shapes.md § The two axes` (as a second *why* after *declared, not inferred*), verbatim from the cut section:

  Today most cross-object references in the world are **path strings**
  (identity refs) because most of the world is still singletons. That is a
  property of a young world, not of the design. As content grows, most
  objects are **clones, instanced all over the place** — and every one of
  those relationships is an instance ref — a live ref — carrying a cleanup
  obligation.

  So this is not an engine-internals nicety. It is the pattern content
  authors will follow thousands of times, and it should be one they cannot
  get wrong by forgetting four lines.
- → `ref-shapes.md § Live ref, not stuffId` (extend to *Roads not taken*), verbatim:

  **A wrapper type (`StuffRef<T>` with `.get()`).** Adds a competing pattern
  beside R2.3 rather than completing it, and puts ceremony at every read
  site. The declaration keeps the field naturally typed and the call sites
  unchanged.

  **Real `WeakRef<>`.** Wrong tool, specifically: `StuffApi` holds strong
  refs in its registries while an object is registered, so a `WeakRef` could
  essentially never clear while the target is live — and after `unregister`
  it clears **nondeterministically**, on GC timing. That imports irreproducible
  behavior into a residency story that is otherwise deterministic and tested.
  Lifetime here is *managed* (`canEvict` → `unregister` → destruct), not
  refcounted; GC-flavored answers are a category mismatch.

  **Field decorators (`@weak`).** Blocked in practice: **102 mixins return a
  class *expression***, and legacy decorators are not valid there (verified —
  `VitalsMixin` had to become a class declaration to take `@CallSecurity`).
  Converting all 102 is its own build, and it buys ergonomics rather than
  capability. There is also a mixin wrinkle: each mixin's decorator writes to
  its own class's static, so the union-up-the-chain collection would need a
  constructor-keyed registry anyway.

  (⚠ `VitalsMixin` is a class *expression* inside a factory again today — `lib/vitals/Vitals.ts:588-592` — so the parenthetical is history; the decorator-on-class-expression limit itself still holds.)

### Status block
- Status: PARTIAL → PARTIAL (the tail is real: five undeclared sites + six unhooks; not rounded to ABSORBED)
- Left: *four undeclared instance-ref sites (`SandboxCrossingExit.crossing`, the `ExitableVessel` caches, `LoungeWarren._reapTimers`, the `DormWarren` maps) · the six held-side R2.4 unhooks · the identity axis, declared nowhere* → *the undeclared instance-ref sites still guarding by hand (`SandboxCrossingExit.crossing` · the `ExitableVessel` caches · `LoungeWarren._reapTimers` · the warren maps, now `OuterWarren._holdingsByKey` / `_circulationByNode` / `_entriesByKey` and `HoldingWarren._roomsByKey`) · the six held-side R2.4 unhooks folded into declarations (open question below)* — the identity-axis item dropped: it is declared (`Employed.institution`), and the doc says the axis carries no runtime behaviour by design, so there is no work
- Size: a tail → a tail

---

## docs/slates/builds/enforcement-slate.md — 198 → 204 · Status UNBUILT → UNBUILT

Unbuilt, as stamped. `enforcementMode` / `barricade` / `border notice` /
`testimon` / `perjur` hit nothing under `packages/server/src/mud` or
`packages/content`; there is no `report.yaml` in any pack's `cmd/`;
`Government` (`platform/idea/Government.ts:71-83`) has `key ·
displayName · description · charter · treasury · departments · seats`
and no per-rule mode; the `honesty` axis exists (`lib/trait/Disposition.ts:75`,
*Honest / Deceitful*) but nothing writes a `disposition_event` from a
lie; no code compares an assertion against a `BeliefStore`;
`civics.md:20-23` states the premise this slate builds on (*no legal
machinery… enforcement is content built on existing substrates*).
`logistics.md:720,924` names the barricade as a design item, not a
shipped one; `freight-slate.md § The barricade` still holds it. The
substrate the slate cites as shipped is shipped: belief (`belief.md`),
concealment, `disposition_events`, regard baseline from traits
(`trait.md:114`). Zero cuts; the file grew by six lines because `Left`
grew. One status block only.

### Cut (SHIPPED · DOCUMENTED)
- none

### Superseded — cut
- none

### Kept (UNBUILT)
- the status block (re-stamped) · the two framing paragraphs · *Related* · *Institutional sibling* (`policing-slate.md` exists)
- `## The enforcement-mode vocabulary (closed set)` (the table, the barricade blockquote, *posted law is a hard build requirement*) · `## The evidence firewall` · `## Testimony — reports are claims, never queries` (all of it: the three categories, the lie discriminator, the scope rail, the four costs, the meta rail) · `## Open questions (for requirements)` 1–5, all open

### Doctrine — kept, labelled
- `## The enforcement-mode vocabulary` → *the speed-camera doctrine* paragraph (*prevention reads as physics; automated punishment reads as tyranny; witnessed process reads as law*) — the governing analogy; also the design's rationale, so it stays with the vocabulary either way
- `## The evidence firewall` → the first paragraph (*the kernel's omniscience serves exactly two masters*) and *a crime genuinely unseen is genuinely unproven* — doctrine that `concealment.md` half-states (honest fog) but not as a rule about diegetic law; candidate for `measurement.md`'s layer-3 list or `accountability.md § Why`
- `## The two layers — intrinsic vs. social` — the split (*what you are* vs *what others know*; *the intrinsic layer is never admissible in the social layer*). The members table is accurate about shipped ledgers; the rule itself is stated in no doc (`trait.md`, `belief.md`, `measurement.md` — none has *intrinsic* / *admissible*). The section's one build item (*a lie moves your `honesty` axis the moment you tell it*) is unbuilt and is in `Left`. Candidate home: `measurement.md § The three layers` or `trait.md § Why`

### Uncertain — kept
- none contradicted by code. Overlaps for the cluster pass: the barricade ↔ `freight-slate § The barricade` (owner) and `logistics.md`; the three enforcement tiers + confinement ↔ `prison-slate`; the department roster + commissioner ↔ `policing-slate`; the trusted-recording instruments ↔ memory `trusted-recording-seed` / `record-integrity-slate`; the courts + venire ↔ `courts-judiciary-primitive`; the *Meta rail* ↔ the Compact's meta-moderation (`measurement.md` A-tier)

### Handoff
- none

### Status block
- Status: UNBUILT → UNBUILT (re-verified clause added)
- Left: *the enforcement-mode vocabulary … as a committee-picked field · the evidence firewall · testimony as claims never queries, and the lie discriminator · the intrinsic vs social two-layer split* → *+ posted law on the land (the border notice) · the barricade as `wall`'s physical form (owned by freight-slate) · credibility derived from the claims record + false accusation as an offence · (the two-layer split's) unadjudicated `honesty` write* (the body wins: the border notice is a *hard build requirement* in the body and Q4/Q5 hang on it; the barricade blockquote and the four costs were unrepresented)
- Size: a build → a build

---

## docs/slates/builds/branch-policy-slate.md — 192 → 195 · Status UNBUILT → UNBUILT

Unbuilt, as stamped. `DOCUMENT_KINDS`
(`packages/server/src/mud/lib/document/DocumentKinds.ts:49-157`) carries
`msh · release · emote · recipe · name-bank · blueprint · archetype …
herd` and no `policy`; `'policy'` / `writers:` hit nothing in
`packages/server/src/mud` or any pack `src/`; `document-store.md` has
no writer / process concept (its only *policy* is the vanish policy at
`:22` and the press-path gate at `:349`). The substrate the slate
leans on is real: `resolveModuleId`, `FromModule`, `lint:gates`
(`call-security.md`), the parcel longest-prefix `ownerOf`
(`parcel.md`), pack `requires:` (`content-packs.md:116`). Zero cuts; one
status block only; the file grew by three lines because `Left` grew.

### Cut (SHIPPED · DOCUMENTED)
- none

### Superseded — cut
- none

### Kept (UNBUILT)
- the status block (re-stamped) · the two framing paragraphs · *Related*
- `## The design, in one sentence` · `## Where it lives, and how it resolves` (incl. the 2026-08-04 correction — per-institution law, the pack-provisioning mitigation, the rejected glob alternative) · `## The invariant that makes it safe` · `## Nearest-wins — and why that still cannot widen` · `## Self-amendment` · `## The escape hatch, stated honestly` · `## Scope — and what this deliberately is not` · `## Footguns and mitigations` · `## Consumers` · `## Open questions (for requirements)` 1–5, all open

### Doctrine — kept, labelled
- `## Where it lives` → *the loss aligns with doctrine rather than fighting it* (hierarchy is DECLARED, never assumed — `legal-code-slate`'s rule) — an argument, embedded in an unbuilt section; not cut

### Uncertain — kept
- `## The design, in one sentence` / `## Consumers` — `writers: ["/platform/idea/api/LawLogic"]` assumes the check reads the *logic singleton's* identity. `document-store.md:349-351` records the shipped precedent that cuts against that: *"the gate lives on the Api static, not the logic method: every logic method's caller is its own Api face, so a policy there would name `DocumentApi` and narrow nothing."* A `writers` check inside `DocumentLogic.save` would see `DocumentApi` as every caller; it must sit on `DocumentApi.save` itself. Requirements should place it there; the slate's text does not say
- `## The escape hatch` — *the wizard axis breaks glass* names the code-trust axis (`access.md`, `AccessApi.isWizard`), which is the one axis a gate may consult for TS-escape acts; the standing working agreement (memory `requires-wizard-is-typescript-only`) is that no *new* wizard check gates a game act. A document write under a `writers` policy is arguably a code-trust act (the policy names modules). Flagged for requirements, not decided
- `## Open questions` Q5 (*Migration — retrofitting a policy onto an existing branch*) — the project's standing rule is no migrations (a rename drops the DB); a retrofit here is a set-time act on live data, not a schema migration, so it may survive — flagged
- Overlaps for the cluster pass: the enactment chokepoint ↔ `legal-code-slate`; *seal-don't-hide* ↔ `press-slate` (the slate already distinguishes them); the pack-declared requirement ↔ `content-packs.md § The requires phase` (groups + title claims today; a *policy* requirement kind does not exist)

### Handoff
- none

### Status block
- Status: UNBUILT → UNBUILT (re-verified clause added)
- Left: *the `policy` kind + the `writers` allowlist · the longest-prefix resolve at `DocumentApi.save` · nearest-wins + self-amendment · set-time validation via the `lint:gates` resolver · the wizard break-glass log* → *+ the narrows-never-widens invariant · the pack-declared policy requirement (the per-institution mitigation)* (the body wins: the invariant is its own section and the mitigation is the correction's whole point)
- Size: a build → a build

---

## docs/slates/tails/connection-quality-slate.md — 178 → 165 · Status UNBUILT → UNBUILT

Unbuilt, as stamped, and its Part 0 is shipped-and-documented. The probe:
`packages/server/src/backend/inbound/ping.ts` (the reply now carries
**both** clocks — `timestamp` + the echoed `clientTimestamp` — which the
slate's quoted docstring predates), `packages/client/src/services/websocket.ts:773`
(`rtt = Date.now() - sent`, negative discarded, `setConnection({
roundTripMs })`), `components/frame/ConnectionChip.tsx:155-226` (renders
`"<n> ms"` — the raw number, on the player's own chip only); nothing
server-side reads the stamp. Doc: `client-shell.md:920-932`. The design
half: no `jitter` / `laggy` / `unstable` / `connectionQuality` in
`packages/client/src`, `packages/types/src` or the server (the only
`jitter` is `Behaved.ts`'s cadence anti-lockstep); `PresenceStatus` is
`'active' | 'idle' | 'engaged' | 'reconnecting'` (`types/index.ts:202`)
— no connection band; `party.md` / `social-graph.md` say nothing about
latency. The precedent it cites is real: `connection-origin-slate`
PARTIAL, country v1 via `geoip-lite` (`backend/Application.ts:78`). Three
cuts.

### Cut (SHIPPED · DOCUMENTED)
- the second status block *"design conversation, captured. Not requirements. The measurement already ships; what is undesigned is what may cross to the server"* (19–21, 3) — history; the sentence survives as Part 0's closing blockquote
- `# Part 0 — It already ships` → the `ping.ts` docstring quote + the *by construction, not by policy* posture table (39–52, 14) — code: `ping.ts`, `websocket.ts:773`, `ConnectionChip.tsx`; doc: `client-shell.md:920-932` (*the stamp is echoed, never trusted: nothing server-side reads it*; `roundTripMs` absent until the first pong, cleared on a drop). ⚠ The quoted docstring is stale (single clock) — the doc and code have the both-clocks fix. Heading + pointer + the closing framing blockquote left

### Superseded — cut
- none

### Kept (UNBUILT)
- the status block (re-stamped) · the framing paragraph + the user quote · *Related* (⚠ `cockpit-layouts.md` is a dead link on arrival — no such doc; `cockpit.md` is the live one. Not a cut, so left; flagged)
- `# Part 3 — Publish the STATE, not the NUMBER` (the recommendation + the connection-origin precedent) · `# Part 4 — Legitimate uses` (client-side smoothing — the chip *renders* RTT, nothing smooths on it; ops diagnostics; party) · `# Open questions` 1–5, all open (Q4's *LEANED* is a lean, not a resolution)

### Doctrine — kept, labelled
- `# Part 1 — The rule, and what it does not say` — *a rule about FORMULAS, not about telemetry; measure freely, never let it reach a formula* + publishing as the transparency counterpart
- `# Part 2 — The hazard that is not obvious` + `## The distinction that does the work` — *ping is a proxy for geography, geography for infrastructure wealth*; *latency is a fact about your CONNECTION, not your CHARACTER* (player-scoped · never a world fact · opt-in and ephemeral). Both are the design's constraints as well as its philosophy; candidates for `measurement.md`'s layer-3 list (*what the platform may count*) once anything publishes
- Part 3's *bands over numbers is the house rule* blockquote — already `measurement.md`'s no-gauge rule; kept inside the unbuilt recommendation

### Uncertain — kept
- none contradicted by code. Note for requirements: the chip today shows the **raw millisecond figure** to its own player, which is not in tension with the slate (client-local, never crosses back) but is the number the slate says should band the moment it is shared. Overlaps for the cluster pass: the precedent ↔ `connection-origin-slate` (country-not-IP); the ops read ↔ `wizard-duty-slate` (*not whether, but why*); the status ↔ `PresenceStatus` / `NotifyPolicy` (`social-graph.md § Notification policy`) as the obvious carrier

### Handoff
- none

### Status block
- Status: UNBUILT → UNBUILT (re-verified clause added)
- Left: unchanged — *the three-band jitter state (fine / laggy / unstable) · the opt-in party publish as an `AFK`-style status rather than a number · the operator's aggregate distribution read + the per-player break-glass* — each has a section (Part 3 / Q1–Q4, Part 4)
- Size: a tail → a tail

---

## docs/slates/builds/wizard-axis-cleanup-slate.md — 176 → 183 · Status UNBUILT → UNBUILT

Unbuilt, and no requirements doc was ever produced from it
(`docs/requirements/` holds `demo-content` · `economic-bootstrap` ·
`return-leg` only; nothing under `docs/plans/` names it). The lint
family has 46 `lint:*` scripts and no `lint:wizard-axis`
(`packages/server/package.json:36-82`); `AppSettings.ts` (1,849 lines,
428 keys by a rough count against the slate's 361) carries no `tier`
tag; `config.yaml:19` is still `requiresWizard`. **The inventory is
intact except one row that moved.** The 82 `isWizard` / `requiresWizard`
mentions across `packages/server/src/mud` + `packages/content` +
`services/auth` resolve to the same file set the slate lists (the extra
files — `HouseController.ts:9`, `warehouseman.yaml:1`, `Author.ts`,
`OfficeRegistry.ts:28`, the sibling validators, `banking.ts:17`,
`Effect.ts:245` — are comments saying *seat, not wizard*). The moved
row: `LeaseController.ts:151` / `ProvisionController.ts:208` no longer
contain `if (await AccessApi.isWizard(actor)) return true;` — commit
`34cd4be5d` (2026-09-13, the lib-statics build) deduplicated
`isBuildingAgent` / `isDormsAgent` onto `AccessLogic.isAgentOf` and
**carried the short-circuit with it** (`AccessLogic.ts:140-147`: *"a
known wrong shape… Carried unchanged rather than silently re-decided
here; see the wizard-axis-cleanup slate"*). The four views
(`lease.yaml:17`, `unlease.yaml`, `provision.yaml:19`,
`unprovision.yaml`) still carry `requiresWizard`, which
`ProvisionController.ts:18-30` explains as *only operators SEE the raw
verb; Katie's `forceCommand` bypasses the validator*. `execScript` is at
`MagicLogic.ts:2090` (was `:1670`), still `isWizard`-gated, still *"the
one non-diegetic gate"*; `practice.yaml` still ships. Zero cuts; the
file grew by seven lines because the status block now says where the
leak went.

### Cut (SHIPPED · DOCUMENTED)
- none

### Superseded — cut
- none

### Kept (UNBUILT)
- the status block (re-stamped) · the framing paragraph (the !231 provenance)
- `## The inventory (complete, 2026-09-03)` and all four subsections (see Uncertain for the moved row) · `## ⭐⭐ The settings keyspace — the sharp end` · `## What makes it stick` · `## Sequencing` W0–W4 · `## Open questions` 1–5, all open

### Doctrine — kept, labelled
- `## The rule, as stated by the user` — *wizardness is TypeScript access, that is all it is* + *everything else is authority, and authority comes from the seat*. `access.md` carries the code-trust axis and *a missing authority is not a grant*; the slate's statement is the sharper form and is the rule the whole slate enforces. The second paragraph (*the failure mode this slate is really about — the seat is missing, not that a wizard should do it*) is the why; a candidate for `access.md § Why` / `antipatterns.md` once W0 lands, and it is literally the comment now sitting on `AccessLogic.isAgentOf`

### Uncertain — kept
- `### ✗ Must lose the axis` → the lease/provision row (79) — names `ProvisionController.ts:208`, `LeaseController.ts:151` and says *delete the line*; the line now lives once, at `AccessLogic.ts:147`, and the views' `requiresWizard` is a second, separate leak the row does not name (the controllers' own comments call the validator the *visibility* gate — which is the "author tier" shape `access.md` rejects). Kept verbatim (a table row is below paragraph granularity); the status block carries the correction
- `### ✗` → the `execScript` row cites `MagicLogic.ts:1670`; it is `:2090` now. Same mechanism
- `## The settings keyspace` — *361 keys*; `AppSettings.ts` has grown (≈428 top-level keys by a rough count). The tier argument is unchanged
- Overlaps for the cluster pass: Tier C → an office ↔ `wizard-duty-slate` (the ops-read discipline) and `amendment-library-slate`; the CMS/Studio/Git conjunction ↔ `call-security-pass-slate` (memory: *trust = TEMPLATE + FUNCTION, not module*); `requiresGovernor` is the shipped precedent for *re-gated from `requiresWizard`* (`validators/requiresGovernor.ts:5`, the `reserve` verb) and is not cited by the slate

### Handoff
- none

### Status block
- Status: UNBUILT → UNBUILT (the status line now records the moved leak, the surviving view validators, and the current `execScript` line)
- Left: *W0 … · W1 the four lease/provision `isWizard` bypasses + the `execScript` verdict · W2 … · W3 `AppSettingKeys` B/C tier tags + Tier C routed to an office · W4 …* → *W1 the `isAgentOf` wizard short-circuit + the four lease/provision views' `requiresWizard` + the `execScript` verdict + the `practice` verdict · W3 + the tier-totality check* (the body wins: `practice` is a row and Q3; the totality check is the second of *What makes it stick*)
- Size: a build → a build

---

## docs/slates/builds/altar-slate.md — 175 → 181 · Status UNBUILT → UNBUILT

Unbuilt, as stamped. `altar` / `sacrific` / `consecrat` / `desecrat`
under `packages/server/src/mud` + `packages/content` hit five files, all
incidental prose (`platform/thing/Thing.ts:22` — the `Prop` rename
rationale; `api/condition.ts:296` — *"a quest, an altar — anything that
wants to offer a way back"*; `CraftingLogic.ts:2422` — a donor stack
*sacrificed whole*; `white-coat.yaml:13`; `Effect.ts`); no
`swear` / `offer` / `consecrate` / `dedicate` view in any pack's `cmd/`;
no patron name (Moloch · Mammon · Goibniu · Cernunnos · Vesta · Eir ·
Aletheia) in any content row; `renown.md` keys standing on persons
(`templatePath` of the subject), with no object-scoped renown. The
theology it defers to is where it says: `story-bible.md:587 § Sacrifice
— blood, presence, and the Feed [settled]`, `:361 § The Ordinance`,
`:551 § Worship in practice`, `:326 § Evil`. `alignment-slate.md` and
`mining-slate.md § Economics` exist. Zero cuts; the file grew by six
lines because `Left` grew.

### Cut (SHIPPED · DOCUMENTED)
- none

### Superseded — cut
- none

### Kept (UNBUILT)
- the status block (re-stamped) · the second status block (⚠ NOT cut: its status clause is the first sentence of the one paragraph that says what the slate holds vs what the bible holds — splitting a paragraph is below the granularity allowed; same call as tradition-slate in unlinked-1) · *See also* · *Markers*
- `## The altar — object and class` · `## What altars do — the rite-instrument` · `## Sacrifice — the mechanic` · `## Altar taxonomy — patron & alignment` · `## The exemplar — the prophet's wilderness altar` (+ the OPEN valence fork) · `## Open (residual)` — all five still open · the retire-when line

### Doctrine — kept, labelled
- `## Sentient sacrifice — the forbidden` — personhood-not-species as the evil line; *never a player affordance*; the consent hinge. Banked in `story-bible.md § Sacrifice` / `§ Evil` (the slate says so); the one mechanics consequence (*never a player affordance*) is the constraint any build inherits
- `## The Ordinance mirror — the Feed as the anti-altar` — *the altar is the consent the Ordinance deletes*. Banked in `story-bible.md § The Ordinance`
- `## Sacrifice — the mechanic` → *the load-bearing guardrail: recognition, never reward* — also the build's constraint; kept in place and put in `Left` with the fork it governs
- These are duplicated from the bible by the slate's own account; the cluster pass can cut the two theology sections with a pointer each if the bible's text is judged sufficient. Not cut here (no code, no subsystem doc, and the bible is lore not a subsystem reference)

### Uncertain — kept
- none contradicted by code. Overlaps for the cluster pass: the derived alignment ↔ `alignment-slate` (compacted) and `alignment-religion-slate` (this batch — the patron taxonomy Pan/Goibniu/Vesta/Eir/Aletheia/Mammon/Moloch appears in both); the economic sink ↔ `mining-slate § Economics`; the *honest count* as the reformed altar ↔ `measurement.md` (Mara/Aletheia); renown-of-the-object ↔ `renown.md` (person-keyed today — an object scope is new substrate)

### Handoff
- none

### Status block
- Status: UNBUILT → UNBUILT (re-verified clause added)
- Left: *`AltarMixin` · `swear` / `offer` / `consecrate` / `dedicate` · accreted weight as renown-of-the-object · the patron taxonomy + taint · the prophet's wilderness altar · sacrifice tuning* → *+ the butcher-or-offer fork + the recognition-never-reward guardrail · consecration / desecration / cleansing · non-kill offerings · (the prophet's) valence · the reformed "altar" as the honest count* (the body wins: three of the five residual opens were unrepresented)
- Size: a build → a build

---

## docs/slates/builds/alignment-religion-slate.md — 174 → 82 · Status UNBUILT (superseded) → UNBUILT (pointer stub)

A superseded slate, and the supersession is real: `alignment-slate.md:16`
says *Supersedes the preliminary alignment-religion-slate* and its body
carries every decision the old slate reached — the Good floor as the
player clamp on the projection (`§ Worship vs. alignment`), alignment
derived off the chronicle and never picked (`§ One machine, two
rosters`), `DevotionMixin` with `patronKey` + `tone` (devout / convert /
lapsed / doubter), the char-gen pick from Good + Neutral demigods with
*seeking / unaffiliated* as default and the Chapel on the Temple of the
Ages ruins, the dark-god arc (*never a fall*), the pantheon as the
disposition roster (`§ The pantheon as legend`), the world-not-dialogue
reactivity (`§ The mirror`). Where the old slate diverges it is the
older text that is stale: `story-bible.md:432-445` names the high gods
**Mitra / Pan / Moloch**, not *Presence / Nature / Hollow*; the bible's
*never embodied* is at `:143`. None of it is code: `EnrollController`'s
fields are `species · sex · name · pronouns · aspiration` (no patron);
no `DevotionMixin` / `Faction`; the aspiration roster shipped as
`something-better · healer · teacher · guardian · founder · seeker`
(`packages/server/src/mud/config/char-gen.yaml`) — a different shape from
the slate's *Healer / Guardian / Builder / Seeker / Mentor / Founder*,
documented in `char-gen.md`. **One thing no other slate owns**: the DRG
/ interdependent-roles conflict-model paragraphs (`Deep Rock` appears
only here and in `mining-slate.md:41`, as a genre reference). Kept, and it
becomes the honest `Left`. Under the pilot's rule this is *ABSORBED into
alignment-slate* for the cluster pass; not deleted here because the DRG
material has no home and the two-slates rule says the cluster pass
decides. Three cuts.

### Superseded — cut
- the third status block *"VERY preliminary — RPG-layer, deferred… Reconciled (2026-06-29) with story-bible.md: the 3 high gods are Presence / Nature / Hollow"* (16–28, 13) — history, and stale on its face: the bible's high gods are Mitra / Pan / Moloch (`story-bible.md:439`)
- `## Alignment` → the 3×3-as-the-world's-grid paragraph + bullets, *derived/witnessed, not chosen*, *the good floor* (37–63, 27) — by `alignment-slate § Two asymmetric axes` (*the trap is a tidy symmetric 3×3*; player freedom *floored at Good — drift = dissonance + cost, never a flip*), `§ One machine, two rosters`, `§ Worship vs. alignment` (*alignment is never picked — only worship is declared*). Note left under the heading
- `## Religion (worship + deities)` → the intro paragraph + `### Pantheon structure — a tree, not a crowd` + `### What's chosen at char-gen` + `### Can you pray to an evil deity?` + `### Devotional flavor` (85–154, 70) — by `alignment-slate § Worship vs. alignment` (`DevotionMixin`, the pick, the Chapel, the tone vocabulary, the dark-god arc), `§ The pantheon as legend` (Mitra / Pan / Moloch; Mara = the Feed as Aletheia's dark twin; the Pan row *off-network, no new demigods* — the old/new-era split in the grid's own terms), `§ The mirror` (reflection through the world), `§ Deferred` (multi-patron; Aletheia at creation), and `story-bible.md § The gods and demigods` (*a god here is not a being but a gravity*, never embodied). Note left under the heading

### Kept (UNBUILT)
- the status block (re-stamped) · the SUPERSEDED blockquote (it IS the pointer) · the framing paragraph
- `## Deferred / content` — one list, one paragraph: three of four items are `alignment-slate § Deferred` (the roster; favor / access; favor's manifestation) but *the interdependent-roles / co-op party design (the DRG mechanics)* is owned by nobody, so the list stays whole
- `## Connections` — verbatim (the `[[capability-magic]]` / `[[game-stands-alone]]` wikilinks are dead on arrival; not a cut, left)

### Doctrine — kept, labelled
- `## Alignment` → *Harm lives OFF the alignment grid* + the DRG bullets + *"no evil players" and "a DRG-quality community" are the same design* (65–81) — a community-health thesis (conflict points outward; interdependence; camaraderie rituals). The lead sentence is absorbed by `alignment-slate § The political axis`, but the paragraph's body is not, and paragraph granularity keeps it whole. See Uncertain

### Uncertain — kept
- the DRG block's closing claim *"Conflict model = fundamentally PvE-narrative — load-bearing for the eventual combat/quest/wilderness design"* — **contradicted by shipped combat**: `combat.md § Terms & consent` ships consented player-vs-player fights (the bar-fight build; `accountability.md`'s consent ledger). The community-health mechanics (interdependence, help, ritual) are not contradicted; the *PvE-only* conclusion is. Requirements for any co-op / party-roles build must reconcile rather than inherit it
- the *aspiration archetypes are complementary roles (Healer / Guardian / Builder / Seeker / Mentor / Founder)* — the shipped roster is `something-better · healer · teacher · guardian · founder · seeker` (`char-gen.yaml`); no complementarity mechanic exists. Stale names inside a kept paragraph
- **ABSORBED into `alignment-slate`** for the cluster pass — everything but the DRG block. The two-slates rule leaves the pointer stub standing; the cluster pass decides whether the DRG block moves to `alignment-slate`, `cooperative-slate` (exists) or `party.md`'s open list, after which this file can be deleted

### Handoff
- none

### Status block
- Status: UNBUILT (*superseded; kept only for early intuitions and the reconciliation history*) → UNBUILT (*a pointer stub*; the reconciliation history is cut because it was stale, the early intuitions are in the successor)
- Left: *nothing here — design from alignment-slate* → *the interdependent-roles / co-op conflict model (the DRG lesson) — owned by no other slate* (the body wins: the Deferred list has an unowned item and the doctrine block is its argument)
- Size: a build → a build (the stamp is the successor's; this stub builds nothing on its own — the cluster pass re-sizes or deletes)

---

# Batch summary

| slate | lines | Status | Left items | Size |
|---|---|---|---|---|
| `builds/warranty-slate.md` | 202 → 194 | UNBUILT → UNBUILT | 6 → 6 | a build → a build |
| `tails/reference-lifetime-slate.md` | 199 → 59 | PARTIAL → PARTIAL | 3 (2 stale) → 2 | a tail → a tail |
| `builds/enforcement-slate.md` | 198 → 204 | UNBUILT → UNBUILT | 4 → 8 | a build → a build |
| `builds/branch-policy-slate.md` | 192 → 195 | UNBUILT → UNBUILT | 5 → 7 | a build → a build |
| `tails/connection-quality-slate.md` | 178 → 165 | UNBUILT → UNBUILT | 3 → 3 | a tail → a tail |
| `builds/wizard-axis-cleanup-slate.md` | 176 → 183 | UNBUILT → UNBUILT | 5 → 5 (W1/W3 re-scoped) | a build → a build |
| `builds/altar-slate.md` | 175 → 181 | UNBUILT → UNBUILT | 6 → 11 | a build → a build |
| `builds/alignment-religion-slate.md` | 174 → 82 | UNBUILT (superseded) → UNBUILT (pointer stub) | 0 → 1 | a build → a build (stub; cluster pass re-sizes) |

1,494 → 1,263 lines. Cuts: 1 + 9 + 0 + 0 + 2 + 0 + 0 + 3 = **15 cut
operations** (reference-lifetime: 7 SHIPPED·DOCUMENTED incl. two answered
open questions + 1 SUPERSEDED + 2 graduated-to-handoff; connection-quality:
2 SHIPPED·DOCUMENTED; alignment-religion: 3 SUPERSEDED; warranty: 1
history). Duplicate status blocks cut in four slates (warranty · reference-
lifetime ×2 · connection-quality · alignment-religion); altar's second
block kept because its status clause opens the one framing paragraph
(tradition-slate's precedent). Handoffs: **2** (both reference-lifetime →
`ref-shapes.md`: the *why declare* paragraph; the wrapper / `WeakRef` /
decorator rejections). Doctrine labelled in six slates for the
coordinator's one pass. No file outside the eight slates + this ledger was
touched (the `ranching-slate.md` / `subsystems/ranching.md` / `plans/slate-compaction/ranching.md`
changes in the working tree belong to another batch).

Hardest calls:
1. **Reference-lifetime — 199 → 59, but PARTIAL, not ABSORBED.** Everything the slate designed shipped, including the follow-on it said not to bundle, and every remaining line of the body was a pointer. The tail is real (five hand-guarded ref sites, six `cleanupOnDestruct` unhooks) and lives in `ref-shapes.md § Known gaps`, which is itself stale in two places. Kept the slate as the backlog entry pointing at the doc rather than deleting it and leaving the tail only in a doc's *Known gaps* aside; re-pointed the warren-map names at their current hosts because the `DormWarren` fields no longer exist and a stamp naming ghosts is worse than a stamp that edits.
2. **Alignment-religion — cut 110 lines of a superseded slate but kept the DRG block.** The successor carries every alignment / worship / pantheon decision, so those sections are SUPERSEDED with pointers; the community-health / interdependence paragraphs are in no slate and no doc, and their *PvE-only* conclusion contradicts shipped consented combat — exactly the *kept-but-contradicted → Uncertain* case. Stamped as a pointer stub with one honest `Left` item instead of ABSORBED, so the cluster pass decides the DRG block's home before the file goes.
3. **Wizard-axis — a moved leak is not a fixed one.** The stamp's two controller line numbers were dead, and a naive grep would have called W1 half-done. The bypass was consolidated into `AccessLogic.isAgentOf` with a comment deferring to this slate; the YAML views still gate on `requiresWizard` as a *visibility* filter (the author-tier shape). Recorded both in the status line, left the inventory row verbatim (a table row is below paragraph granularity), and put the correction in Uncertain.
4. **Altar's second status block stayed.** Its status clause is the first sentence of the only paragraph that says what the slate holds versus what the story-bible holds; cutting the clause alone would split a paragraph.
