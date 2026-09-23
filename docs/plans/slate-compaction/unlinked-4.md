# Slate-compaction pass — unlinked-4 batch ledger

Eight slates whose status block names no subsystem doc. Branch
`design/slate-compaction`. Procedure: `.claude/skills/compact-slate/SKILL.md`.
Write list: **none** — every graduation is in a *Handoff* section below,
verbatim, with its target doc named. Line numbers are the ORIGINAL file's.
Originals saved under the scratch dir `unlinked-4/orig/` for diffing.

Batch-wide findings first:

- **Every slate in this batch is UNBUILT or PARTIAL by substrate that
  shipped beside it, never from it.** No section of any of the eight
  turned out SHIPPED·DOCUMENTED on its own terms; what the code moved was
  the *ground* the slates stand on (the body plan's `covers`/`bodyPart`
  relations under hand-slot; the pack installer, `lint:family`, and the
  sandbox under authoring-intelligence; the spoilage build under
  room-condition; the residence / holding / soil builds under land-use
  and grid). Each is recorded per slate as Uncertain, never rewritten.
- **Stale paths are the commonest defect.** `seeds/lib/body-plans/…`,
  `mud/cmd/…`, `spoilage-design-pack.md` — all moved by later builds. Left
  in place (a rewrite is out of scope), listed under Uncertain so the
  requirements pass corrects them.

---

## docs/slates/tails/hand-slot-slate.md — 340 → 343 · Status UNBUILT → UNBUILT

The v1 shape is exactly as the slate describes it. The biped plan
(`packages/content/species-and-names/content/stuff/idea/species/BodyPlan/biped.yaml`)
still declares `hands` as a `WearableMixin` pair-slot and `hand:left` /
`hand:right` as `WieldableMixin` singles; no `wrist:*`, no `:worn` /
`:held`, no `HandheldMixin` anywhere under `packages/server/src/mud` or
`packages/content` (`Handheld` hits are prose in five unrelated files).
`SlotSpec.accepts` is a single `string` (`lib/slot/Slotted.ts:91`,
validated `typeof spec.accepts !== 'string'` at `:216`).
`embodiment.md § Wearable + Wieldable overlap` still says *no umbrella
mixin* and describes the disjoint-slots shape the slate calls accidental.
What DID move is the ground under the slate: the covering slots carry
`capacity: 4` (layering *within* a wear slot — the shipped
gambeson-over-shirt stack) and `covers: [body.arm.left.hand, …]`; the
wield and finger slots carry `bodyPart: body.arm.left.hand`; a `sidearm`
slot exists; and combat treats the two hands as a live allocation
(`combat.md § Weapon playstyle & the hand-slot economy` — `fight switch` /
`fight draw` / dual-wield). One cut. The file grew by three lines because
the status line now carries the code-verified state and the new
dependents.

### Cut (SHIPPED · DOCUMENTED)
- none

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none

### Superseded — cut
- the second status block *"Status: deferred — design exploration, unbuilt… flagged during locomotion-plan review"* (10–13, 4 + blank) — history; the same framing survives verbatim in the two paragraphs below it (*This is a **deferred** concern — flagged during locomotion-plan review*)

### Kept (UNBUILT)
- the status block (re-stamped) · the framing paragraphs · *See also*
- `## Current state` — the five-row YAML is still the shape (minus the later `capacity` / `covers` / `bodyPart` annotations; see Uncertain for the stale path)
- `## The four tensions` 1–4 — all four still hold in code (see Uncertain for the part of 3 that anatomy relations now soften)
- `## Design space — three candidate redesigns` — Option A (needs `accepts: string[]`, unbuilt) · Option B (no `:worn`/`:held` slot exists) · Option C (no `HandheldMixin`) · `### Lean (working)`
- `## Open questions` 1–6 — all still open (Q2: no wrist slot on any plan; Q3: `finger:left` / `finger:right` are still the only finger slots)
- `## What this slate does NOT cover` · `## Suggested next step`

### Doctrine — kept, labelled
- none

### Uncertain — kept
- `## Current state` + *See also* (32, 39) — the path `seeds/lib/body-plans/biped.yaml` is stale; the row is now pack content at `packages/content/species-and-names/content/stuff/idea/species/BodyPlan/biped.yaml` (content-packs wave). Not rewritten
- `### 3. Same physical body part, three slot names` (106–117) — *"independent slots that don't know about each other"* is softened, not answered: `hands.covers`, `finger:left.bodyPart` and `hand:left.bodyPart` all name `body.arm.left.hand` now (vitals build), so *what is on this actor's left hand* is answerable by anatomy key. The slot vocabulary itself is unchanged, so the tension stands; requirements should start from the anatomy relations rather than the slate's premise
- `### 4. Worn-and-wielded-on-same-hand is accidental` (119–133) — layering is now expressible *within* the worn slot (`capacity: 4`, the covering ladder in `embodiment.md § The covering ladder`) but still not *across* worn/held. Option B's cross-layer predicate is still the only proposal that reaches it
- Q5 *"Currently a small content set"* (296–298) — `slotClaims` appears 51 times under `packages/content/`; the migration is no longer small. Do it before the next content wave, as the slate says, but re-count
- Q6 names `mustBeWearable` / `mustBeWieldable` validators (299–301) — neither exists; the precise verbs gate with `requires: WearableMixin` / `requires: WieldableMixin` on the view arg (`embodiment.md § Verbs`, *why the precise verbs were NOT made aliases*). The conclusion (the slot-side `accepts` change is independent) still holds
- `## Suggested next step` step 3 *"If Option B, no substrate change"* (324–326) — true of `SlotSpec`, but Option B now also has to say what `covers` / `bodyPart` each layered slot carries (the anatomy relations did not exist when this was written), and how combat's `fight switch` / `fight draw` / sidearm reads resolve a grip slot (`lib/combat/WeaponSwitch.ts`, `combat.md:950`)
- Overlaps for the cluster pass: the hand-slot economy ↔ `combat.md` (shipped); the `equip` orchestrator's `claimAs` decides the worn/held face (`embodiment.md § Verbs`) and would be the one place a layered vocabulary lands

### Handoff
- none

### Status block
- Status: UNBUILT → UNBUILT (status line now carries the code-verified state + the three dependents that grew on the same vocabulary)
- Left: *picking Option A vs B (layered `:worn` / `:held` slots) · wrist slots · single-hand wearables · `SlotSpec.accepts` as an array if A · the body-plan + `slotClaims` content migration* → same + *the cross-layer constraint (tension 4)* (the body wins: tension 4's mitten-and-stylus gate was unrepresented)
- Size: a wave → a wave

---

## docs/slates/builds/wizard-duty-slate.md — 331 → 335 · Status UNBUILT → UNBUILT

Nothing of the duty has been built. No `su` view under any pack's `cmd/`;
no `break-glass` / `breakGlass` string anywhere under
`packages/server/src` or `docs/subsystems`; no agency subsystem doc
(`agency-slate` is still a slate); `requiresWizard`
(`lib/command/validators/requiresWizard.ts`) still reads
`AccessApi.isWizard`, which is `false` for any non-Avatar
(`AccessLogic.ts:159`). **The `requiresWizard` census moved under the
slate's table**: 12 view sites today — `provision` / `unprovision`
(`eternal-university/…/duncan-hall/cmd/`), `lease` / `unlease`
(`…/terminus/mayfield-row/cmd/`), `config`, `practice`, `cms`, `studio`,
`eval`, `reload`, `git`. Two rows of the slate's eight resolved the way it
asked: `house` is seat-gated (`house.yaml` carries only `requiresAnimate`;
`banking.md:332` *"`house` is seat-gated since libations — the position
held or the proprietorship, never `requiresWizard`"*) and `pack` rides
`requiresPackInstaller` (`pack.yaml:43`). The `trade-haulage` pack states
the doctrine at its site (`warehouseman.yaml:1-6`: *"a SEAT, not a wizard
stand-in… a MISSING SEAT gets filed as a finding"*). **The probable live
defect still stands in code**: `provision.yaml:19` carries verb-level
`requiresWizard`, Katie's `katie.yaml:108` dispatches `unprovision
$player`, `npc-dialogue.md:121` says validators run unconditionally on a
forced dispatch, and ⚠ `residence.md:220` **still says the opposite**
(*"`forced` bypasses the `requiresWizard` validator"*) — a doc
contradiction outside my list, flagged. One cut. The file grew by four
lines: the status line carries the re-counted census and `Left` grew.

### Cut (SHIPPED · DOCUMENTED)
- none

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none

### Superseded — cut
- the second status block *"Status: design conversation, captured. Not requirements. The honest version, deliberately…"* (26–28, 3 + blank) — history; the canonical block above it now carries the state

### Kept (UNBUILT)
- the status block (re-stamped) · the *Captured 2026-08-04* framing + the tetrad paragraph · *Related* (every linked slate exists at the linked path)
- `## ⭐⭐ Break-glass already is the corpus's vocabulary` (the table: act stays available · purpose declared · log conspicuous · reviewed after) — nothing declares a purpose at use anywhere
- `## ⭐⭐⭐⭐ `su` should be AGENCY, not identity substitution` — no `su`, no agency substrate; `agency-slate` unbuilt
- `## ⭐ The asymmetry psychology makes uncomfortable` — the subject-notification rung; nothing notifies on a `disposition_events` / `beliefs` read
- `# ⭐⭐ The video: "The people who can see everything"` — a manifesto appendix, not code; `rerecord-appendix-plan.md` exists and does not carry it
- `# ⚠⚠ Axis hygiene — `requiresWizard` is doing work that is not its job` + the table + the *tell* blockquote (one paragraph each; see Uncertain for the two resolved rows and the four unlisted sites)
- `## ⚠⚠⚠ And one of them is a probable live defect` — still true in code (above); the live drive it asks for has not been recorded anywhere
- `# Open questions` 1, 0, 2–5 — all still open

### Doctrine — kept, labelled
- `# ⭐ The premise, stated without comfort` + `## ⭐⭐ And the case that matters most here is not snooping` — *runtime guards constrain code that goes THROUGH the framework; the record is unforgeable relative to players, not operators*. Already half-stated at `branch-policy-slate` (*a gate pretending otherwise is theater*) and in the memory doctrine (*resilience posture: TS access IS root*); a candidate for `access.md § Why` or `call-security.md`'s threat-model paragraph
- `# ⭐⭐⭐⭐ The law the technology suggests: constrain by DUTY` + `## ⭐⭐ A wizard is a wizard regardless of position` + `### ⚠ And the recursion has an answer, up to a point` — *when you cannot constrain by structure, constrain by duty; the duty attaches to the capability, never the title; the founder's constraint is the AGPL*. The first two are the thesis the whole `Left` list serves; the AGPL-as-exit line is already the manifesto's
- `# ⭐⭐⭐ Carve-outs: prohibition is the wrong shape` — *not WHETHER but WHY, and did you say so* (the HIPAA model)
- `## ⭐⭐⭐ The meta-design that makes it hold` + `## ⚠ The honest limit, and why it is acceptable` — *make the sanctioned path so convenient that using anything else is evidence of intent; break-glass is a good-faith instrument*. Already in memory as the resilience posture (*detect EVASION not malice*)
- `# The mechanisms, ranked by whether they survive a hostile wizard` — the table is doctrine with an embedded backlog (JIT elevation, two-person rule, public roster — all unbuilt, all still open as Q4/Q5); kept whole

### Uncertain — kept
- the `requiresWizard` table (272–281) — two of eight rows are resolved as the slate asked and cannot be cut below paragraph: `banking/house` → seat-gated (`banking.md:332`, `employment.md`); `author/pack` → `requiresPackInstaller` (`pack.yaml:43`). Four live sites are not in the table at all: `lease` / `unlease` (the mayfield-row twins of `provision` / `unprovision`, same defect shape), `cms`, `studio` (content-write surfaces — the validator's own docstring calls a content author without code trust a *protowizard*, so these two are the next candidates to classify). The *"four of the eight"* tell is now *four of twelve*, and the argument holds
- `## ⚠⚠⚠ And one of them is a probable live defect` (292–309) — names `isDormsAgent`; the OO sweep folded it into `AccessApi.isAgentOf` (`ProvisionController.ts:74`, `UnprovisionController.ts:57`; `DormResidence.test.ts:228` says so). Mechanism unchanged, name stale. ⚠ `residence.md:216-222` still asserts the bypass `npc-dialogue.md:121` disproved by experiment — the two docs contradict each other on exactly the point this section turns on; whichever is right decides whether the defect is live. Nobody has driven it
- `## ⭐⭐⭐⭐ `su` should be AGENCY` (164–184) + Q0 — the *"an `su` command designed somewhere"* the user cites was not found: no `su` view, no `SuController`, no `impersonate` under `packages/server/src/mud` or `packages/content`. Either it was never written down or it lives in a memory file, not the tree
- Overlaps for the cluster pass: the PM-revokes-any-wizard path ↔ `balance-slate` (unverified here — `governance.md` names five seats; whether one revokes wizard membership is that slate's audit); external anchoring ↔ `record-integrity-slate`; the withheld slice ↔ `psychology-slate`; the seat-not-stand-in doctrine ↔ memory *NEVER a new isWizard check* (a working agreement, already enforced by review, not by a gate)

### Handoff
- → `residence.md § Authorization` (line 220, a **correction**, not an insert — flagged, not made): the parenthetical *"`forced` bypasses the `requiresWizard` validator"* is the sentence `npc-dialogue.md § The `dispatch` effect` says was **corrected 2026-08-04 and is false**; the two docs must agree before the `provision` re-gate is designed. Paths only; no text to graduate

### Status block
- Status: UNBUILT → UNBUILT (status line re-counted: 12 sites named; `house` / `pack` recorded as resolved)
- Left: *re-gating those four off the code-trust axis · break-glass declared-purpose logging for reads and impersonation · `su` as an agency consumer · the duty text + safe harbour in the wizard grant · subject notification on record access* → *re-gating the non-code-trust sites off the wizard axis (`provision` / `unprovision` / `lease` / `unlease` → agency or title; `config` → an office; `practice` → a harness gate) · live-driving the Katie `dispatch provision` path · break-glass declared-purpose logging for reads and impersonation · `su` as an agency consumer · the duty text + safe harbour in the wizard grant · subject notification on record access · the "people who can see everything" appendix* (the body wins: the live drive the defect section asks for and the video section were unrepresented; `lease` / `unlease` are the same defect at a second locality)
- Size: a build → a build

---

## docs/slates/builds/authoring-intelligence-slate.md — 321 → 314 · Status UNBUILT → PARTIAL

The delivery half is unbuilt: no `monaco-languageclient` /
`vscode-languageserver` / `yaml-language-server` in any `package.json`; no
language server, no VS Code extension, no `.d.ts` shipping pipeline;
`cms.md:253` (*"Engine-typed IntelliSense, the LSP, the VS Code extension →
the authoring-intelligence slate. Monaco ships with stock language support
only"*) and `studio.md:288` both still defer here. **The catalog half
shipped in the Studio build**, and `studio.md:5-11` says so by name:
*"the first build of cms-slate § Composition & the blueprint catalog +
authoring-intelligence-slate's two catalogs (mixin particles + named
blueprints)"* — `StudioApi.listMixins` (the palette vocabulary),
`describeMixin`, `describeClass` (`api/studio.ts:125`, effective mixin set
+ `@authorable` field schema from the TSDoc scan), `BlueprintCatalogue`
with the *"already <Name> — use it?"* dedup prompt (`studio.md:255`).
`studio.md:282` records that **composition-rule metadata
(`@requires`/`@conflicts`) is not authored** — so the mixin-catalog
paragraph is mixed and stays. The save re-validates (`cms.md § Save
go-live`: payload shape, then `HotReloadApi.reload` / `restoreFromTemplate`)
but runs no semantic model. Two cuts.

### Cut (SHIPPED · DOCUMENTED)
- none

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none

### Superseded — cut
- the second status block *"Status: architecture set; it's a brain, not a feature… One semantic model, surfaced three ways…"* (11–19, 9 + blank) — history; the same five decisions are the framing list (*The load-bearing decisions* 1–5) and `## Principle` 1–5, both kept
- `### The two-level composition vocabulary` → the **combo catalog** paragraph (154–161, 8) — by the code: shipped as named **blueprints** (`BlueprintCatalogue`, the use-existing / name-it prompt, the palette) → `studio.md` (intro + § the composer). Three-line pointer left. ⚠ `studio.md:20` marks the `blueprints` *collection* a deletion candidate (a cache that persists) — the mechanism shipped; its storage may move

### Kept (UNBUILT)
- the status block (re-stamped) · the framing paragraph · *The load-bearing decisions* 1–5 · *See also* (every link resolves: `cms-slate.md`, `access-slate.md`, `standard-model.md`, `command-spec.md`; `command.schema.json` is at `lib/command/command.schema.json`)
- `## Principle` 1–5
- `### One semantic model, three faces` (the table; the save-gate row's *authoritative* validation is today shape + compile, not the model)
- `### The three composed layers` — TS (no `.d.ts` fed to Monaco), YAML (no schema wired to the editor), the platform-semantic bullets (none built; see Uncertain for two stale words)
- `### The two-level composition vocabulary` → the **mixin catalog** paragraph (mixed: authorable fields + the palette shipped as `listMixins` / `describeMixin`; the *composition rules (requires / conflicts)* half is unbuilt per `studio.md:282`; kept whole under the paragraph rule)
- `### What the language service provides` · `### Where it runs` · `### Scope, the type surface, and version sync` · `### The shared-with-validation insight`
- `## Worked scenario` · `## Open questions` 1–6 (all open; Q6 *platform-rule source* is exactly the `@requires`/`@conflicts` gap studio left) · `## Build order` W1–W3 · `## What this slate does NOT cover` · `## Once shaped into formal requirements`

### Doctrine — kept, labelled
- `### The two-level composition vocabulary` → *"The catalog family is open-ended — and decoupled from the runtime"* paragraph (163–179) — **the catalog is a CMS-side artifact the runtime never depends on; the runtime only path-resolves; the worst failure of a stale catalog is a palette omission**. It is the reason `studio.md:20` can call `blueprints` a deletion candidate and `behavior.md` can re-resolve a brain per invocation, and neither doc states the principle. Home: `studio.md` (a *Why the catalogs may be loose* paragraph) — Handoff below

### Uncertain — kept
- the word **lease** throughout (*lease-scoped*, *outside your lease*, *the lease gate*; framing ¶, decisions 4–5, `## Principle` 5, the model, the scenario, Q3, the tests) — the access model that shipped is **parcel title** (`AccessApi.canAtPath`, `heldExtents`; `document-store.md § the parcel-title gate`), and `access.md:105-108` says in terms that a lease is *not* title (*"quietly makes a lease into title, and the whole point…"*). The scope input to the intelligence is therefore the **titled extent**, and a lease is a use-grant on it. Vocabulary stale, mechanism the same; requirements must rename before anything reads *lease* as the scope
- `### The three composed layers` → *"template-path completion (complete `/lib/…` paths that exist)"* and *"a template that points at `/lib/x`"* (129–131) — `/lib/` is the one root a template may **not** name (`lint:instanceable`: *nothing instances `/lib/`*); the example paths are now the negative case. The feature (complete paths that exist and are the right kind) is unchanged
- `### One semantic model, three faces` save-gate row + `### The shared-with-validation insight` — the slate assumes the access layer's save-gate does *recompile + lint + invariants*; today the CMS save does shape validation + `HotReloadApi.reload` for source (`cms.md § Save go-live`), and the lint family runs at build time, not at save. The *shared core* is still the right target; the gate it would share with is thinner than described
- Overlaps for the cluster pass: `cms-slate` (the UI + the external-editor / git path — `git-workflow.md` shipped the in-runtime VCS this slate's W2 rides); `access-slate` (the gate); `studio.md § Deferred` lists *composition-rule metadata* as its own leftover, which is this slate's Q6 — one item, two homes

### Handoff
- → `studio.md` (a new short paragraph after the `blueprints` cache note, or under *Field-schema derivation*), verbatim from the KEPT doctrine paragraph (still in the slate; not duplicated here — slate lines 163–179 of the original, *"The catalog family is open-ended — and decoupled from the runtime…"*). Once inserted, the slate paragraph can be cut with a pointer

### Status block
- Status: UNBUILT → PARTIAL (the two catalogs shipped via Studio; the status line names the Api surface and the unbuilt rule metadata)
- Left: *the platform-semantic model (template-path completion, reference validation, mixin-composition rules, lease scope) · the LSP server · the VS Code extension · the engine `.d.ts` pipeline · the shared core with the save-gate* → *the platform-semantic model (template-path completion, reference validation, mixin-composition rules + their declared source, scope awareness over the titled extent) · the LSP server · the VS Code extension · the engine `.d.ts` pipeline · the shared core with the save-gate* (Q6's declared rule source made explicit; *lease* → *titled extent* per access.md)
- Size: a build → a build

---

## docs/slates/builds/room-condition-design-pack.md — 321 → 314 · Status UNBUILT → UNBUILT

The decomposition is unbuilt. `Soilable` / `SoilableMixin` / `debris` hit
nothing under `packages/server/src/mud` or `packages/content/*/src` outside
one textile test; `getRestQuality` is still the authored constant on
`Postured` (`lib/slot/Postured.ts:54`, consumed by `Metabolic.ts:1544` and
`Archetype.ts:536`) with no aggregation over bedding or room state;
`furnishing.md:538-542` still lists the `restQuality` aggregation, the
debris cadence and *pests get no field* as needing *the condition model*.
Of the seven verbs only `wash` exists
(`platform/content/platform/cmd/crafting/wash.yaml`); no `sweep` / `wipe`
/ `tidy` / `dispose` / `bathe` / `clean` view under any pack. **What
shipped around it:** (1) the doctrine amendment this pack asked for —
`stewardship-doctrine.md:74` (archetype 1: *"◐ room condition (deposition
— designed)"*), `:97-105` (the dated amendment: *the real classifier of
absence-behavior is the driver, not the domain*, pointing back here),
`:115-124`; (2) the textiles build's soiling seam — `Attired.outermostAt`
(`lib/slot/Attired.ts:128-137`, *"a METHOD the future build calls, not a
signal it listens for"*), `textiles.md § The soiling seam`, which also
**rules that the attributed events are ledger records, not an `EventApi`
emit** (three reasons at `textiles.md:299-306`); (3) spoilage
(`spoilage.md`, MR!244) — the first step of this pack's build order, with
`ContaminableMixin` whose one source is butchering, not a dirty surface.
Two cuts; one link retargeted (the retired `spoilage-design-pack.md` →
`docs/subsystems/spoilage.md`, as instructed — the second copy of that
link went with the cut status block).

### Cut (SHIPPED · DOCUMENTED)
- `### The correction to the doctrine` body (131–145, 15) — doc: `stewardship-doctrine.md` Part 1 table row 1 + the *Amendment (2026-08-06, from the room-condition build)* blockquote + Part 2's fish-vs-room comparison. The correction was the section's whole job and it is applied verbatim (continuous-natural vs act-deposited; the driver classifies). Heading + a four-line *Applied* pointer left

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none

### Superseded — cut
- the second status block *"Status: design, planner-ready, captured 2026-08-06. Not requirements… Same per-object format as the fridge and spoilage packs"* (10–16, 7 + blank) — history; the format pointer to `fridge-design-pack.md` is lost with it (the file exists at `docs/slates/builds/fridge-design-pack.md`; the See-also line does not carry it — recorded here so the cluster pass can restore it if the format cross-reference matters)

### Kept (UNBUILT)
- the status block (re-stamped) · *See also* (every link resolves; the spoilage link retargeted)
- `## Part 0` reframes 1–2 (see Uncertain for reframe 2's past tense)
- `## Part 1` — the five-piece table · deposit-and-clear · pests emergent · `### ⭐⭐⭐ Every deposit and every clear carries an ACTOR` · `### ⚠ And it must NOT become a blame ledger`
- `## Part 2` — the governing decision paragraph (*model the mess you MAKE*) — a build decision, kept; the doctrine doc now states the archetype consequence but not the explicit omission of time-dust, which fork 5 restates
- `## Part 3` items 1–7 (see Uncertain for the `Resists.factor` name)
- `## Part 4` · `## Part 5` (every bullet's counterpart is unbuilt or pending: `restQuality` aggregation, cross-contamination from a surface, `dispose` → sanitation, the ladder's condition gate, guest regard, frozen persistence) · `## Part 6` forks 1–5 · `## Fault line / build order` (see Uncertain) · `## Open questions / forks` 1–6

### Doctrine — kept, labelled
- `## Part 2` → *"We model the mess you MAKE, not the mess TIME makes"* — the Law-2 line; already restated as the doctrine's amendment and as fork 5. Kept in the slate because it is the rationale the build's tests will assert (a room left alone changes nothing)

### Uncertain — kept
- `## Part 0` reframe 2 (39–43) — *"The doctrine filed 'a dirty room' beside the rotting fish… **Wrong**"* is past tense now: the doctrine is corrected. One numbered item of a two-item list; not split. The reframe itself (archetype-1-shaped) is the shipped doctrine
- `## Part 3` item 3 table row *Disease resistance read → wire into `Resists.factor`* + `## Part 5`'s *the same `Resists.factor` seam* (168, 239) — no disease `Resists.factor` exists; the only `Resists` in the tree is the **magic** resist fold (`lib/magic/Resist.ts`, `MagicLogic.ts:1570`). The disease-slate seam this names is unbuilt and its name collides with a shipped value object; requirements should pick another
- `### ⭐⭐⭐ Every deposit and every clear carries an ACTOR` + Q6 (73–96, 315–321) — the *shape* is unchanged, but `textiles.md:299-306` has since ruled on the *transport*: **a ledger record, not an `EventApi` broadcast** (an emit would not feed the log; zero emitters; a local interaction is a call). Q6's candidate destinations (`transcripts` / `participation_events` / producer-local) are still open; the `EventApi` option is closed. Also the memory rule *NO new Mongo collections* → a producer-local log would be the document tree, not a collection
- `## Part 5` → *Spoilage* bullet (247–249) — *"a dirty prep surface seeds microbial load onto food (cross-contamination)"*: `spoilage.md:503-540` ships `ContaminableMixin` with **butchering as its one source** and deliberately narrowed hosts (`BoningKnife`, `KitchenTool`); a soiled surface as a second source is exactly what this build adds, and the narrowing rule there (*never a guard*) binds how
- `## Fault line / build order` (288–294) — *"spoilage → room condition → disease → room condition (the immunity wire)"*: step 1 is done (MR!244); the disease build is still a slate. The sequence holds; its first arrow is history
- `## Part 3` item 4 → the water precondition for `wash` / `wipe` / `bathe` (176–181) — `wash` shipped in libations as a crafting verb; whether it takes the water-pack precondition (a tap in reach or a filled vessel) was not verified here. `water-design-pack.md` still exists as a tail slate; `watershed.md` shipped the `Conduit` ladder + `SupplyState`, which is the tap
- Q2 ✅ *answered 2026-08-11* (303–307) — answered by a slate (`water-design-pack § Part 4`), not by code or a subsystem doc; kept as spine per the rule (only code-and-doc resolutions are cut)
- Overlaps for the cluster pass: the actor-attributed commons ↔ `household-design-pack` (the constraint's source); `dispose` ↔ `sanitation-slate`; hygiene → infection ↔ `disease-slate`; the ladder's condition gate ↔ `holding.md` (shipped — whether the D/P decision index reads any condition today was not checked)

### Handoff
- none (the doctrine graduation was already made by the 2026-08-06 amendment; nothing further to insert)

### Status block
- Status: UNBUILT → UNBUILT (status line carries the verification, the applied correction and the two shipped dependents)
- Left: *`SoilableMixin` · the room debris field · `sweep` / `wipe` / `tidy` / `dispose` · the `restQuality` aggregation · the pest threshold · the attributed `(actor, target, extent)` deposit/clear events* → *`SoilableMixin` · the room debris field · `sweep` / `wipe` / `tidy` / `dispose` / `bathe` (the water precondition) · the `restQuality` aggregation · tidiness from placement · the pest threshold · the attributed `(actor, target, extent)` deposit/clear events (a ledger record, never an `EventApi` emit — textiles.md) · the `Resists.factor` immunity wire (after disease)* (the body wins: `bathe`, tidiness-from-placement (fork 2, Q3) and the immunity wire (Part 5, item 3 row 5) were unrepresented)
- Size: a build → a build

---

## docs/slates/builds/land-use-covenant-slate.md — 318 → 327 · Status UNBUILT → PARTIAL

Merged to master 2026-09-18 (`design/land-use-covenant`), so nearly
nothing has had time to ship — and the one thing that has is the *cheap
half* the slate asked every RGO build to do first. No `covenant` /
`covenants` field, row or predicate anywhere (the word hits only the two
doc comments that name this slate as their future reader);
`AccountabilityKind` is still `'opened' | 'violated' | 'death' | 'harm'`
(`lib/accountability/AccountabilityEvent.ts:68`); no designation tier
(`legal-code-slate` unbuilt). **Shipped beside it:** `lib/craft/Epoch.ts`
— `EPOCHS = prehistory · medieval · industrial · modern · future`, a closed
`const` tuple, ordinal (*"nothing later than X" is an `indexOf`*), whose
module doc says in terms *"the land-use covenant… is the vocabulary's
first reader; the forestry build stamps the axe and the billhook `medieval`
and reads nothing yet"*; `ToolMixin.epoch` (`lib/craft/Tooled.ts:58,71`,
persistent + authorable, setter refuses a sixth word); the two forestry
rows (`felling-axe.yaml:17`, `billhook.yaml:16`) — and **no other row in
any pack** carries `epoch`. Documented at `forestry.md:363-369`.
`lint:instrument-args` is merged (`package.json:65`), at zero (*293
controllers scanned; 0 bespoke instrument resolutions (ceiling 0)*, run
2026-09-19), documented at `lint-family.md:386`. No cuts — every section
still has an unbuilt remainder. The file grew by nine lines: the status
line names the shipped substrate and `Left` grew.

### Cut (SHIPPED · DOCUMENTED)
- none. `## What each RGO build does NOW — the cheap half` bullets 1–2 are shipped-and-documented **for forestry only** (`lint-family.md § lint:instrument-args`, `forestry.md`), but the section states an obligation on *every* RGO build and mining / milling / baking have zero stamped rows — the section is live and kept whole

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none

### Superseded — cut
- none

### Kept (UNBUILT)
- the status block (re-stamped) · the *Captured 2026-09-17* framing + the user's quote · *Related* (all eight slates + `forestry-slate.md`, `field-substrate-slate.md`, `measurement.md`, `design-lenses.md` resolve)
- `## The precedent, and it settles most of the design` · `## Three limits on one act — do not collapse them` (the table's two ✅ rows are accurate — advancement and `landUse` both ship) · `## ⭐⭐ Hard or soft` (`Location.suppressesMagic` + `MagicApi.suppressionAt` exist — `magic.md`; no tech-side suppression field exists)
- `## ⭐⭐ The uniform seam — an instrument is an argument` + `### Coverage — the same predicate, per RGO` (step 1 of the three shipped for forestry; steps 2–3 unbuilt; see Uncertain for the *on `design/grain-chain`* clause)
- `## Who declares it — three tiers` (no `covenants` row on `ParcelRecord` — `parcel.md:44` lists `landUse | null` and nothing beside it) · `## Enforcement — a producer, not a chokepoint` · `## Lens pass` 1–5 · `## What must not happen` · `## What each RGO build does NOW — the cheap half` · `## Open questions` 1–5 (all open) · `## ⭐ Consumer — the RGO-unification build`

### Doctrine — kept, labelled
- `## Three limits on one act` → *the covenant is about the land; the ladder is about the person* — the anti-collapse rule; consumed by `## What must not happen`
- `## ⭐⭐ Hard or soft` → *the tell that a design has merged them: a refusal message with no diegetic cause* — the lens-3 rule restated for law vs physics; a candidate line for `design-lenses.md` § lens 3 or `docs/antipatterns.md` once the build lands
- `## Enforcement` → *hidden covenants are not a thing… a restriction that is not visible in the prose is a lie about the land* — the discovery honesty rule applied; the same sentence family as `concealment.md`'s honest fog

### Uncertain — kept
- `## ⭐⭐ The uniform seam` (135–137) — *"`lint:instrument-args`, on `design/grain-chain`, at zero"*: the branch is merged; the gate is in the family (`lint-family.md:386`) and at zero today. The clause is history, the fact is current
- `## Who declares it` (194–196) — *"`landUse: wild` … today has no teeth"*: `smallholding.md:164` § *`wild` admits nothing, and that is load-bearing* — `wild` refuses every cultivation act (no bed may be dug on unclaimed ground). It has teeth on *ends*; the slate means *means*, and the sentence should say so
- `## What each RGO build does NOW` bullet 3 (272–273) — *declare the act's `kind`* (felling a standard vs cutting coppice): `fell.yaml` distinguishes a standing standard from a felled bole by the *argument's* kind (`lint:arg-kinds`), which is the binder's word, not a covenant-readable act `kind`. Whether forestry satisfied this bullet was not settled here; `coppice.test.ts:70` types an `epoch` string, which is the test the closed vocabulary made moot
- `## ⭐⭐ The uniform seam` step 3 + `## Enforcement` bullet 1 — *a fifth `AccountabilityKind`*: `accountability.md` says producers, not a chokepoint, but whether a **kernel** producer at the binder (which would touch `CommandApi` dispatch) is a *producer* in that doc's sense or the chokepoint it forbids is a question the plan has to answer; noted so requirements ask it
- Overlaps for the cluster pass: the close season ↔ `hunting-slate`; wheels-as-instrument ↔ `logistics-slate`; the designation tier ↔ `legal-code-slate`; the taxonomy + three-pack chain bullets in `## ⭐ Consumer` belong to the unification build, which has no slate of its own yet — this section is that slate's seed

### Handoff
- none

### Status block
- Status: UNBUILT → PARTIAL (the epoch vocabulary + stamp + the lint shipped; the covenant has not)
- Left: *the covenant row on the title · the `epoch` stamp on instrument rows · the one breach producer at the binder · the designation tier (polity-imposed, via legal-code) · the vehicle/act forms of the same predicate · the suppression twin, kept separate* → *the covenant row on the title · the `epoch` stamp on every other trade's instrument rows + the act's declared `kind` · the one breach producer at the binder (a fifth `AccountabilityKind`) · the designation tier (polity-imposed, via legal-code) · the vehicle/act/time forms of the same predicate · the suppression twin, kept separate* (forestry's stamps are done; the time form — the close season — was in the body and unrepresented)
- Size: a build → a build

---

## docs/slates/builds/saxonberg-city-slate.md — 311 → 324 · Status UNBUILT → UNBUILT

Entirely unbuilt, and honestly stamped. No pack carries a City of
Saxonberg: the `/world` roots under `packages/content/*/content/world/`
are `eternal · hearthworks · hearts-delight · terminus (two packs) ·
newbie-wilds · rejection · lounge · moor · practicum · substation`.
`OFFICE_APPARATUS` (`lib/governance/Office.ts:140`) is the five seats —
`prime-minister`, three speakers, `central-bank-governor` — with no
`record-archivist` (the string hits nothing in code or content). The
`Government` rows that exist are `terminus-realm`, `terminus-city`,
`eternal-university`, `hinkley-hills`. No office-keyed tenure (`ex
officio` / `officeKey` hit only `governance.md:133`'s `office_holders`
shape, never the residence spine). The TPA pack has no Saxonberg node.
**What the slate assumes is shipped, is**: Locality-declared jurisdiction
+ `Government` rows (`civics.md`), the committee as the title-holding
principal (`access.md:594`, `CompactApi.committeeOf`), parcel title + the
closed six (`parcel.md`, `smallholding.md`), the TPA network
(`fasttravel.md`). **What it depends on and is NOT shipped**: the
allowance cascade — `stewardship-slate.md` is on master (Q4's branch
premise is stale) but its `Left` still lists *the allowance meter · the
cascade + the zoning authority*. No cuts. The file grew by thirteen lines:
the status line names the verified roots and `Left` grew from six items
to thirteen because the body carried seven unrepresented deliverables.

### Cut (SHIPPED · DOCUMENTED)
- none

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none

### Superseded — cut
- none

### Kept (UNBUILT)
- the status block (re-stamped) · the *Captured 2026-08-01* framing (see Uncertain for the branch clause) · *Related* (every link resolves, incl. `docs/staging/terminus-city.md`)
- `## What Saxonberg is` (all four bullets) · `## The doctrine tension, threaded` · `## The short-term build (the thin frame)` 1–5 incl. the seven premises, the venue doctrine and the municipal mechanism · `## The launch map` + the ASCII plan + the five deliberate touches + the zoning line · `## What we deliberately do NOT build` · `## Decided in the 2026-08-01 review` (decisions, not code — all four still bind and none is in a subsystem doc, because nothing has shipped to attach them to) · `## Open questions` 1–4 · `## Where to start`

### Doctrine — kept, labelled
- `## The doctrine — the frame is ours; the furniture is theirs` — *the legislature decides what the content of its own seat is; if we find ourselves authoring a statue, stop*. The never-half-grown reconciliation (*every system in the frame is complete; what is absent is discretionary content*) is the rule the build's acceptance will be judged by; a candidate for the locality's own doc when it exists, not before
- `## The short-term build` item 4 → **the venue doctrine** (*venues are never workplaces… no mechanic may ever require presence for governance*; the four things a venue honestly provides — ceremony · spectacle · legibility · address) — a governance-wide rule stated here first; `governance.md` and `civics.md` carry nothing about presence. Handoff candidate below, but kept because the build has not happened and the rule binds its shape
- `## What Saxonberg is` → *the allowance is an honestly-labeled out-of-fiction meter… it never wears a diegetic costume* — the metaresource guardrail, already the memory's (*compute is a metaresource*) and the stewardship slate's

### Uncertain — kept
- the framing paragraph (14–16) + Q4 (297–300) — *"that slate currently lives on the `docs/husbandry-conventions` branch"*: it lives at `docs/slates/builds/stewardship-slate.md` on master, `PARTIAL`. The *branch* half of the dependency is resolved; the *mechanism* half is not — land use shipped, the cascade / second grant did not (`stewardship-slate.md` Left). Q4's second arm (*this build carries the two decided mechanisms with it*) is therefore still live for the cascade. Not rewritten
- Q2 *[RESOLVED by the map]* (290–292) — resolved by the slate's own launch map, not by code or a doc; kept as spine
- `## The short-term build` item 5 — *"the shipped committee concept (access.md § the committee…)"*: accurate (`access.md:594-605`); *"seats as employment positions"*: `civics.md` says seats-as-positions — accurate; the *interim `core` committee* is the founder-default pattern `governance.md` describes for offices, applied to a title — no shipped precedent for a committee marked *interim*
- `## The short-term build` item 3 — office-keyed tenure: `residence.md`'s `(scope, key)` multi-instance persistence and `holding.md`'s tenure terms are the substrate; neither has a key that is an office. The slate calls it *the one genuinely novel mechanic*, correctly
- Overlaps for the cluster pass: the Archivist ↔ `record-integrity-slate` (*anchoring beats chaining*) and `trusted-recording`; the Courthouse ↔ `courts-judiciary` memory + `enforcement-slate`; the prison parcel ↔ `prison-slate.md` (exists); the second housing market ↔ `stewardship-slate`'s Tiebout; the storefront leases ↔ `holding.md`'s let rung (shipped — the shells could be `HoldingWarren` units)

### Handoff
- → `governance.md` (a short *Venues* paragraph, once any office has premises) or `civics.md`: **the venue doctrine**, verbatim from the KEPT item 4 (slate lines 163–180 of the original — *"venues are never workplaces… no mechanic may ever require presence for governance — no vote cast in a room, no quorum of bodies, no attendance-gated anything. What a venue honestly provides is exactly four things, all compatible with standing empty: ceremony · spectacle · legibility · address"*). Not duplicated here; still in the slate. It binds any build that gives an office a room, not only this one — which is why it is flagged now

### Status block
- Status: UNBUILT → UNBUILT (status line carries the verified roots, the five-seat apparatus, and the cascade dependency)
- Left: *the Locality + parcel spine · the residential district and its launch stock · the PM's Residence (office-keyed tenure) · the three chamber halls + the Central Bank · the TPA node · the municipal Government row* → *the Locality + parcel spine · the residential district and its launch stock (six units) · the four leasable storefront shells · the second Compact grant (waits on the stewardship cascade) · the PM's Residence (office-keyed tenure — the one novel mechanic) · the three chamber halls + the Central Bank · the Courthouse (no chambers) + the Archive · the `record-archivist` sixth office · the TPA node · the municipal Government row + the interim `core`-committee sanction · the empty plinth · the reserved prison parcel* (the body wins: seven premises were decided and only four were listed; the sixth office, the second grant, the shells, the plinth and the reserved parcel were unrepresented)
- Size: a build → a build

---

## docs/slates/builds/grid-slate.md — 307 → 306 · Status UNBUILT → PARTIAL

The network is unbuilt: `ParcelRecord` (`parcel.md:36-49`,
`lib/parcel/ParcelRecord.ts:132-139`) carries `extent · zonePath · owner ·
parentParcel · grants · allowance · landUse · area · storeys · reach` and
no service declaration; `Exit.ts` carries no service attribute; no
`Street*.ts` anywhere; no lint. **Both ends of the wire shipped without
the wire.** Generation: `ControlStructure.generationW` (water pack,
`ρ·g·Δh·Q·η`), `analyze power` with a generator arm and a consumer arm
(`AnalyzePowerController.ts`), `GristMill` (`trade-milling`) and the
kernel's `Comminuting` reading `availablePowerW` from the reach they stand
on — `watershed.md:16-34`; the Wharfside aqueduct house `generates: true`.
Rights: `WaterRightRegistry`, prior-appropriation records + riparian
derived (`watershed.md:734-738`). The frontier tier: the τ charge economy
(`magic-items.md`), TPA gates drawing off `ManaPowered` with the arming
floor and the three bands (`fasttravel.md:432`), `SupplyState` as the one
kernel vocabulary both utilities fail in (`lib/supply/SupplyState.ts`,
`watershed.md:50`). Q4's currency premise holds: *a ledger leg may never
cross currencies* (`banking.md:126`), *a mint is Compact-level, never a
locality's* (`banking.md:74`). Four cuts.

### Cut (SHIPPED · DOCUMENTED)
- `# Part 3` → the user's *"how does Terminus get its power"* quote + the `story-bible.md` watershed quote + *"Hydro is not a proposal. It is reading the map"* (162–173, 12) — code: `packages/content/water/src/thing/ControlStructure.ts` (`generationW`), `AnalyzePowerController.ts`; doc: `watershed.md § analyze power — the equation finally has a consumer`. Heading + a four-line *decided and shipped* pointer left; the *geography does the design work* bullets kept (see Kept)
- `# Part 3` → *"It also merges the two utilities into one: one river, water and power, one set of rights, one political fight"* (192–193, 2) — code: `WaterRightRegistry` on the same `Watercourse` the generator draws from; doc: `watershed.md § rights`. Four-line pointer left
- `## ⭐⭐⭐ And this is what magic is FOR` → the *"Refreshed 2026-08-05 — the magic-items build makes the 'expensive' column MECHANICAL"* blockquote (208–214, 7) — a status refresh of a build that shipped; doc: `magic-items.md § the charge economy` (`S* = inflow/d`, τ, caster-sourced, metabolism-capped). Three-line pointer left

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none

### Superseded — cut
- the second status block *"Status: design conversation, captured. Not requirements. Most of the topology was already designed…"* (23–25, 3 + blank) — history

### Kept (UNBUILT)
- the status block (re-stamped) · the *Captured 2026-08-04/05* framing + the user's quote · *Related* (all eight slates + `story-bible.md` resolve)
- `# Part 1 — The topology was already solved` (designed in `delivery-slate`, not built: no edge attribute on any exit) · `## ⚠ But the full walk is overbuilt — the meter is the boundary` (the three-edge model; the cascade it cites is unbuilt — `stewardship-slate` Left)
- `# Part 2 — Streets: subdivision and DEDICATION` (`subdivide` / `transfer` ship — `parcel.md`; the dedication *process* and municipal acceptance do not) · `## ⚠ No `Street.ts`` (the recommendation holds: none exists) · `## Underground is an ACCESS POINT, not a layer` (`smallholding.md` acreage split is real; no manhole exit exists)
- `# Part 3` → *And the geography does the design work* bullets — mixed: *transmission the political object* is unbuilt (nothing carries power from the highlands to the confluence); *upstream/downstream is realm-wide + riparian vs prior appropriation* shipped (`watershed.md § rights`, the three basins); *limited fall sites* is what `analyze power`'s bare arm answers (*could I put a mill here*); *rate-capped → coal* is the metal chain's fuel pack. One list, kept whole
- `## ⭐⭐⭐ And this is what magic is FOR — the frontier tier` — the availability table (still the design; the *grid* column has no shipped instance) · the *development arc* paragraph (doctrine, below) · *Terminus can be wood-and-water today* · the TPA paragraph (see Uncertain)
- `# Part 4 — The declaration, and what is mandatory` · `## ⭐⭐⭐ Build the METER, never the RULE` · `## Authoring: default connected, and the tool is a lint` · the newbie-wilds paragraph
- `# Open questions` 1–5, all open (Q4's *added 2026-08-05* blockquote is a derivation from the shipped currency rules, kept as the slate's own reasoning — banking.md states the rules, not this consequence)

### Doctrine — kept, labelled
- `# Part 1` → *"Coverage is legal, connection is physical"* — `delivery-slate`'s, quoted; and *THE METER IS THE BOUNDARY* — the utility answers to the meter, never to your lamp
- `# Part 2` → *Path is location. Title is ownership. They were never the same question* — already `parcel.md`'s premise; and *a class with no unique state is decoration* — the `Street.ts` refusal, a general rule stated here
- `## ⭐⭐⭐ And this is what magic is FOR` → *A community's development arc IS the replacement of magic by infrastructure… the visible sign of a place developing is that the premium goes away* — the thesis `fasttravel.md`'s arming floor now instantiates for one network; a candidate for `magic-items.md` or `docs/design-lenses.md § lens 5`
- `## ⭐⭐⭐ Build the METER, never the RULE` → *the engine models service and access as FACTS; it never models requirements* — `balance-slate`'s *a statute is a constraint on a meter*, applied
- Q4's blockquote → *a utility can overcharge, but it cannot pay or bill you in something only it issues* — the truck-system answer, structural; belongs beside `banking.md:74/126` when billing exists

### Uncertain — kept
- `## ⭐⭐⭐ And this is what magic is FOR` → the TPA paragraph (226–229) — *"right now everywhere it goes is developed"* and *"once terminals draw power"* are both overtaken: TPA gates now draw τ off `ManaPowered`, with an arming floor and amber band, and the frontier crossroads runs on bought cells (`fasttravel.md:432, 521, 626`). The conclusion — *the network's reach becomes a statement about which places are developed* — is now a live property nobody has read as a map. Premise stale, conclusion current; not rewritten
- `## Authoring` bullet 1 (258–260) — *"Same present-but-inert pattern as `grants[]` / `allowance` in parcel 0a"*: `grants[]` is LIVE now (`parcel.md:43` — the lease relationship, residence + holding builds); `allowance` is still the inert 0a seam. Half the analogy moved
- `# Part 1` → *"the line to Wharfside is cut and only Wharfside goes dark"* — the water pack shipped exactly this for WATER (`SupplyState.cut`, the `Conduit` ladder, `watershed.md § Conduit`); power has no conduit. The slate's *zero new topology* claim should be re-read against `Conduit` — a mains IS a topology object in the shipped water design, which is the opposite of the edge-attribute model this slate adopts. Requirements must pick: power as an exit attribute (this slate) or power as a `Conduit` sibling (the water pack's precedent)
- Overlaps for the cluster pass: `delivery-slate` (the topology's origin), `power-utility-slate` (the middle tier), `mana-economy-slate` (sources / nodes / capacitors — largely shipped by magic-items + TPA reform; its own compaction decides), `stewardship-slate` (the cascade), `zoning-slate`, `attestation-slate` (the review tool the declaration's *fallible value* needs)

### Handoff
- none (the shipped decisions are already documented where they shipped)

### Status block
- Status: UNBUILT → PARTIAL (the generation end and the frontier tier shipped; the network did not)
- Left: *the service declaration on `ParcelRecord` (default connected, author disconnection) · connection-not-consumption metering · street dedication + municipal title acceptance · the every-declared-consumer-resolves-to-a-source lint · underground as an access point* → *the service declaration on `ParcelRecord` (default connected, author disconnection; a band, not a number) · service as an exit attribute + the three-edge walk (generation → street → connected) · transmission from the falls to the city · connection-not-consumption metering · street dedication + municipal title acceptance · the every-declared-consumer-resolves-to-a-source lint · underground as an access point · the newbie wilds' declared posture* (the body wins: Part 1's edge attribute and three-edge walk, Part 3's transmission, and Q5's newbie-wilds posture were unrepresented)
- Size: a build → a build

---

## docs/slates/builds/intervention-slate.md — 286 → 289 · Status UNBUILT → UNBUILT

Nine days old and honest about its substrate. Every row of its *What
already exists* table re-verified: `CombatGraph.ts` (`ThreatEdge.terms`,
`redirect` at `:172`, the *"or interposing"* docstring at `:6`),
`defend.yaml` / `intervene.yaml` / `fight.yaml` under
`platform/cmd/combat/`, `CombatNarration.narrateInterception` (`:314`),
`onlookersOf` (`CombatLogic.ts:3462`), `Morale.onlookers`. The three things
it says the model cannot say, it still cannot: `side: string`
(`CombatSession.ts:123`); no pair-relation (`interpos` in `lib/combat/`
hits only the docstring and the narration); `LETHALITIES = ["non-lethal",
"lethal"]` (`CombatTerms.ts:24`) with no restraint kind. `disengage` is
declared (`CombatSession.ts:72`) and still unconsumed (Q7 open). **The
one omission in the table**: `lib/behavior/enforces.ts` (bar-fight build,
`db2926fdf` 2026-09-02 — eight days *before* the slate) — a kernel-commons
brain that shouts *break it up!*, then wades in **`subdue`-first** on the
fighter it *believes* started it, fetches a taser under real threat, and
is attributed like anyone's blow (`behavior.md:426`). That is the bouncer
of the slate's `Left`, shipped on the partisan substrate: he joins the
session with a side and no peacemaker category. One cut. The file grew by
three lines: the status line records the verification and the omission.

### Cut (SHIPPED · DOCUMENTED)
- none

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none

### Superseded — cut
- the second status block *"Status: design surface, unbuilt, no phase gate passed. Spun out of the consequence build's MR review (MR!254, 2026-09-10)…"* (14–17, 4 + blank) — history; the provenance survives in `## The gap`'s *lesson that produced this slate* paragraph and in `combat.md § Why there is no verb for talking a fight down`

### Kept (UNBUILT)
- the status block (re-stamped)
- `## The gap` (the ambient half is accurately described — `combat.md:163` § *Onlookers — third parties break up fights, and it took no verb*; the *lesson* paragraph is the slate's own guard, kept)
- `## What already exists` — the table (accurate; one omission recorded in the status line and under Uncertain, not added to the table — no rewrites)
- `## ⭐⭐⭐ The three things the model cannot say` 1–3 · `## ⭐⭐ The two poles that exist, and the hole between them` · `## ⭐⭐ The experience` · `## ⭐⭐ Standing — who may do this` · `## ⚠ What must not happen` · `## Open questions` 1–7 (all open; Q6 see Uncertain) · `## What this slate does NOT cover` (T12 / T13 resolve in `combat-experience-slate.md:7,573`; `legal-code-slate.md` exists; no courts slate, as it says) · `## Cross-references`

### Doctrine — kept, labelled
- `## The gap` → *any design that arrives here answers "what does the engine honestly measure?" first* — the parley lesson, already `combat.md § Why there is no verb for talking a fight down` and the memory (*consequence build*); kept at the top by the slate's own instruction
- `## ⭐⭐ Standing` → *does standing change what you MAY do, or only what it COSTS you afterward? — the second; a permission needs a gate at the act, a price goes on the ledger* — the project's gate-vs-price rule applied; a candidate line for `accountability.md`
- `## ⭐⭐ The two poles` → *why `intervene` gets to be free and this must not be: a coup is a discrete scheduled act, a fight is a standing relation* — the reason the build is a build

### Uncertain — kept
- `## What already exists` + `Left`'s *bouncer content* + Q4 + Q6 (53–66, 228–238) — the `enforces` brain predates the slate and is missing from its *verified* table. It answers Q4 for the shipped world (*does breaking up a fight compose out of `subdue`?* — today, yes: that is all a bouncer can do) and half of Q6 (*do NPCs do this?* — one does, partisan, with a read-the-room aggressor heuristic the slate's design would have to keep or replace). The `guards` brain `combat-slate.md:6,688` still names is unbuilt; `enforces` is its taproom cousin. Requirements should start from `enforces` as the first consumer to **rehost**, not from a blank
- `## ⚠ What must not happen` → *double-counting with the ambient read* (196–201) — `enforces`'s proprietor is exactly this case today: he counts as an onlooker until `subdue` joins him, then stops. Whether the shipped behaviour double-counts him for a beat was not checked
- Q7 (239–243) — `disengage` has **two** claimants per the slate (fleeing, and this); `CombatSession.ts:72` declares it and nothing resolves to it. Still exactly as described
- Overlaps for the cluster pass: `combat-slate` (the `guards` brain; pursuit); `combat-experience-slate` T12 / T13; `legal-code-slate` (adjudication); the bouncer as an employment position ↔ `employment.md` (shipped) + `bar-fight` memory (*anti-lounge; OPEN: live drive*)

### Handoff
- none

### Status block
- Status: UNBUILT → UNBUILT (status line carries the re-verification and the `enforces` omission)
- Left: *the sideless participant · a relation whose object is a **pair** · restraint terms (force authorized to stop force) · the interposition act and what it costs · going-through-a-peacemaker as a distinct act on the ledger · who has standing · the bouncer / constable / regulars content* → same + *what a broken-up fight resolves AS* (Q7, unrepresented) and *the bouncer (rehost `enforces` on the new substrate)* (the body wins; the bouncer exists and the item is now a rehost, not a mint)
- Size: a build → a build

---

## Batch totals

| slate | before → after | Status | Left items | Size |
|---|---|---|---|---|
| `tails/hand-slot-slate.md` | 340 → 343 | UNBUILT → UNBUILT | 5 → 6 | a wave → a wave |
| `builds/wizard-duty-slate.md` | 331 → 335 | UNBUILT → UNBUILT | 5 → 7 | a build → a build |
| `builds/authoring-intelligence-slate.md` | 321 → 314 | UNBUILT → **PARTIAL** | 5 → 5 | a build → a build |
| `builds/room-condition-design-pack.md` | 321 → 314 | UNBUILT → UNBUILT | 6 → 9 | a build → a build |
| `builds/land-use-covenant-slate.md` | 318 → 327 | UNBUILT → **PARTIAL** | 6 → 6 | a build → a build |
| `builds/saxonberg-city-slate.md` | 311 → 324 | UNBUILT → UNBUILT | 6 → 13 | a build → a build |
| `builds/grid-slate.md` | 307 → 306 | UNBUILT → **PARTIAL** | 5 → 8 | a build → a build |
| `builds/intervention-slate.md` | 286 → 289 | UNBUILT → UNBUILT | 7 → 9 | a build → a build |

2,535 → 2,552 lines (+17). **Cuts: 11** — 7 second status blocks (every
slate but land-use and saxonberg-city carried one), 3 SHIPPED·DOCUMENTED
(room-condition's applied doctrine correction; grid's *hydro decided* +
*one river one set of rights* + the magic-items refresh), 1 SUPERSEDED-by-
code (authoring-intelligence's combo catalog → Studio blueprints). **Zero
ABSORBED**; three re-stamped PARTIAL for substrate that shipped beside
them. The net line growth is the status lines: every one now carries the
code-verified state with paths, and five `Left` lists grew because the
body carried unrepresented deliverables (saxonberg-city's seven premises
were listed as four). **Graduations: 0 inserted** (no write list); **three
Handoffs** flagged (a `residence.md:220` correction; the catalog-decoupling
doctrine → `studio.md`; the venue doctrine → `governance.md`), each
pointing at text still in its slate.

Hardest calls, for the coordinator:

1. **land-use's *cheap half* section** — bullets 1–2 are shipped and
   documented for forestry, but the section states an obligation on every
   RGO and only two rows in the whole tree carry `epoch`. Kept whole as a
   live obligation rather than cut as done-for-one.
2. **authoring-intelligence's mixin-catalog paragraph** — one paragraph
   carrying a shipped half (`listMixins` / `describeMixin`) and an unbuilt
   half (`@requires` / `@conflicts`, which `studio.md` names as its own
   leftover). Kept whole under the paragraph rule; the combo paragraph
   beside it was cleanly shipped and cut.
3. **grid's Part 3** — the *decision* (hydro) shipped in `watershed.md`
   but the *transmission* half of the same section has not; cut the
   decision paragraphs, kept the bullet list they introduce. Also flagged:
   the water pack's `Conduit` is a topology object, which contradicts this
   slate's *service is an exit attribute, zero new topology* — a fork
   requirements must pick, recorded under Uncertain.
4. **intervention's `enforces` omission** — a shipped brain the slate's
   own *verified* table missed. Recorded in the status line and Uncertain,
   NOT added to the table (no rewrites); the `Left` item became a rehost.
