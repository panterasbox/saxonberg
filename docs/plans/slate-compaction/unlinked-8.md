# Slate-compaction pass — unlinked-8 batch ledger

Eight slates whose status block names no subsystem doc. Branch
`design/slate-compaction`. Procedure: `.claude/skills/compact-slate/SKILL.md`.
Write list: **none** — every graduation is in a *Handoff* section below,
verbatim, with its target doc named. Line numbers are the ORIGINAL file's.
Originals saved under the scratch dir `unlinked-8/orig/` for diffing.

Batch-wide findings first:

- **These are what their stamps say — unbuilt design — with one
  exception in each direction.** Nothing in the batch shipped *from* its
  slate; three shipped *beside* one: the libations MR's
  registry-then-predicate correction (lifecycle-signals — documented in
  `persistence.md` and `antipatterns.md`), the ranching build's carcass
  seam + `render-tallow` (rendering — documented in `ranching.md`), and
  `connection.md`'s `--async` box (script-interaction). Each is a cut
  with a pointer; none needed a graduation, so **Handoff is empty for the
  whole batch**.
- **Three `Left` clauses were false on arrival.** rendering's *no
  `tallow`* (it ships twice: `trade-cooking`'s material + recipe,
  `trade-ranching`'s pail of fat) and *the carcass → named-materials seam
  in ranching* (shipped exactly as the slate asked); authored-vs-
  procedural's *a `forage`/`gather` verb (none exists)* (`gather` is now
  `trade-ranching`'s egg collection — the wild act is still missing, so
  the item is corrected, not dropped). The brief's other question —
  whether discovery's D31 finding touches authored-vs-procedural — it
  does not: that slate never claimed the distribution was missing.
- **The nearest-kin trap.** implements-slate's design (*passive mage gear,
  nothing to top up, specialisation by inventory*) has a shipped
  neighbour, `ConduitMixin`, whose docblock cites the slate by name as
  the thing it is NOT. The status line now names it so requirements do
  not mistake it for the implement — or re-derive the three leans it
  already settled (no second clock · `Durable` wear · no membership
  gate).
- **Two second status blocks were kept, with a reason** (attestation,
  authored-vs-procedural): in both the status clause is the first sentence
  of the paragraph that carries the user's reframing, and splitting a
  paragraph is below the cut granularity — the tradition-slate call from
  unlinked-1, repeated. rendering's second block lost only its stale
  gating paragraph (a paragraph of its own); implements' was a pure
  status line and went.
- **The hydration census drifted the way the slate predicted** — 63 of
  109 → 67 of 123 with the slate's own script — which is the ratchet's
  whole argument, and there is still no gate.

---

## docs/slates/builds/attestation-slate.md — 170 → 175 · Status UNBUILT → UNBUILT

Nothing shipped. `attestation` / `attest` under `packages/server/src/mud`,
`packages/content/*/src`, `packages/server/src/schema` and
`packages/types/src` hits only the word *attested* in two provenance
comments (`lib/trait/DispositionEntry.ts:25,73`,
`lib/advancement/TranscriptEntry.ts:22`); the only ledger of the family is
`schema/authoring_events.yaml`. `cms.md § Save go-live` still lists *the
law==code / forums-review publish gate* and *drafts / staging / atomic
publish* as later waves (`:258-262`). `record-layer.md § The window`
(`:71-83`) explicitly defers clips + attestation to *"the attestation
substrate"*. Every linked slate exists at its path. No cuts; the file grew
by five lines because the status block grew.

### Cut
- none

### Kept (UNBUILT)
- everything, verbatim: the capture paragraph · the user quote · *Related* · `# The primitive` · `## Why this shape and not a workflow` · `# How it generalizes across the 9th/10th line` · `# The gate already exists: save vs. go-live` · `# What an attestation carries` · `# Why this is worth building beyond the grid` · `# Open questions` 1–5 (all open)

### Doctrine — kept, labelled
- `# ⭐⭐⭐⭐ The primitive` → *a PROCESS is just a POLICY OVER REQUIRED ATTESTATIONS* and `## Why this shape and not a workflow` (*the only shape that survives federalism*) — the thesis, not a backlog item
- `# ⭐⭐ How it generalizes` → *a committee may REQUIRE review on its own ground; it may never RELAX the Compact's floor*

### Uncertain — kept
- ⚠ **The second `> **Status: design conversation, captured. Not requirements.**` blockquote was NOT cut** despite the one-status-block rule: its status clause is the first sentence of the paragraph that states the design in one line (*build tools that leave marks; let any group compose a process out of them*). Splitting the paragraph is below the cut granularity (same call as tradition-slate in unlinked-1). The coordinator may strip the leading bold clause
- Q1 (*one collection or a facet of `authoring_events`*) sits beside the standing *no new Mongo collections* agreement (memory: `no-new-mongo-collections-document-tree`); a global append-only ledger is the class that agreement did not rule on, so it is a requirements question, not a contradiction
- Overlaps for the cluster pass: durable clips ↔ `tails/client-slate.md:97` (*storage is a mailbox* — the model `record-layer.md` cites as *the attestation slate's* is actually stated there, not here); the review gate ↔ `cms.md:258` (*the law==code / forums-review publish gate*, deferred) ↔ `cms-law-code-unified` memory; break-glass review-after ↔ `wizard-duty-slate`; the showroom as the review artifact ↔ `content-packs-slate`

### Handoff
- none

### Status block
- Status line: added the code-verified clause + the `record-layer.md` deferral
- Left: *the `attestation_events` collection · the closed assertion vocabulary (`approves`/`objects`/`notes`) · the go-live predicate on the CMS save/publish split · the per-group policy grammar (data, not code) · the pack-release + Art. VI judiciary consumers* → *the `attestation_events` collection (Q1: its own, or a facet of `authoring_events`) · the closed assertion vocabulary (`approves`/`objects`/`notes` — `objects` non-blocking by default; superseded, never retracted) · the go-live predicate on the CMS save/publish split · the per-group policy grammar (data, not code — Q2) · the consumers: pack release · Art. VI judiciary · wizard-duty review-after · parcel inspections / certificates of occupancy* (the body wins: the supersede rule and two of the five named consumers were unrepresented)
- Size: a build → a build

---

## docs/slates/tails/lifecycle-signals-slate.md — 170 → 153 · Status UNBUILT → UNBUILT

The finding still holds exactly: `AppBootstrap.shutdown()`
(`packages/server/src/backend/AppBootstrap.ts:286-327`) names
`CompileWatcher.get().stop()` → `WorldClockApi.shutdown()` →
`RecordApi.flush()` → `PersistableApi.captureAtShutdown()`, each in its
own `try`/`catch`; no `quiesce` / `onShutdown` / lifecycle-subscription
seam exists anywhere under `packages/server/src`; `lifecycle.md` has no
shutdown section. The one section that describes shipped work — the
libations MR's registry-then-predicate correction — is carried in full,
with its why, by `persistence.md § captureHostOf` (*it ASKS rather than
remembering*, the deleted `PersistableRegistry` paragraph) and
`antipatterns.md § A registry caching a fact its members already hold`
(which itself points back at this slate for the subsystem-closure
distinction). One cut.

### Cut (SHIPPED · DOCUMENTED)
- `## Scope, and what already moved` → *"What the libations MR did, in two moves…"* through *"…a destroyed host is simply not there to answer."* (124–151, 28 lines + blank) — code: `lib/persistence/Persistable.ts:228` (`capturesAtShutdown()`, Avatar exclusion), `platform/idea/api/PersistableLogic.ts:613-624` (`captureAtShutdownImpl` over `world:[mixin.PersistableMixin]`), `api/persistable.ts:88`, `PersistableShutdown.test.ts`; no `PersistableRegistry` class remains (only three comments recording its deletion); doc: `persistence.md § captureHostOf — the mutating-act capture` (`:719-745`, the four bullets and *a cache whose reader revalidates everything it caches is buying nothing* verbatim), `antipatterns.md § A registry caching a fact its members already hold` (`:3792-3834`). Replaced by a six-line pointer so the *"See What the libations MR did below"* reference in `## What it should look like` still resolves

### Kept (UNBUILT)
- the status block (re-stamped) · the founder-quote framing · `## The finding` (the diagram's fourth entry is now `PersistableApi.captureAtShutdown()`; the three-deletions parallel is history the section leans on, kept whole) · `## Why it is against the philosophy specifically` · `## The one real design question — ordering` + the phase table · `## What it should look like` (all three bullets + the three questions; Q3's *provisionally answered — only subsystems* is answered by the slate's own correction, not by code, so it stays) · `## Scope` → *Not this MR* · `⭐ The distinction this build must respect` (design for the unbuilt seam — `antipatterns.md:3830-3834` states the same distinction as the rule, but this paragraph is the seam's scope constraint, so it stays) · `## Cross-references`

### Doctrine — kept, labelled
- `## The finding` → *when a peripheral thing needs a central list edited, the list is in the wrong place* — the general rule; the three deletions it cites (`ToolCapability`, the `Technique` union, `GENERIC_*_MATERIAL`) are the libations build's and are recorded in their own docs

### Uncertain — kept
- none contradicted by code. Overlaps for the cluster pass: a pack that *cannot care about shutdown* ↔ `content-packs.md` (a pack ships classes and brains; nothing there mentions lifecycle hooks); the phase vocabulary ↔ `time.md` (`WorldClockApi.shutdown` is today's `quiesce` occupant and the snapshot-on-stop is documented there)

### Handoff
- none

### Status block
- Status line: added the code-verified enumeration + the no-seam finding
- Left: *the `quiesce`/`persist`/`flush`/`close` phase vocabulary · the subsystem subscription seam · per-subscriber failure isolation + a per-phase deadline · retiring the hand-written list* → *the `quiesce`/`persist`/`flush`/`close` phase vocabulary · the subsystem-only subscription seam (Q3: never Stuff — a predicate serves those) · per-subscriber failure isolation + what is logged (Q1) · a per-phase deadline + its budget (Q2) · retiring the hand-written list* (the body wins: the three questions are the build's declared content and were only half-represented)
- Size: a wave → a wave

---

## docs/slates/builds/implements-slate.md — 167 → 149 · Status UNBUILT → UNBUILT

Unbuilt. No implement / lens / `FocusMixin` / `getPatternIntegrity`
anywhere under `packages/server/src/mud` or `packages/content/*/src`
(`FocusController` / `FocusedMixin` are the unrelated command-focus
feature); `potencyFactor` (`platform/idea/api/MagicLogic.ts:2230-2251`)
reads the caster's two competence bands and nothing else;
`suppressesMagic` (`MagicLogic.ts:1083`) is still the one world→caster
field. ⚠ **The nearest shipped kin is `ConduitMixin`**
(`packages/content/arcana/src/lib/magic/Conduit.ts`, `brass-conduit.yaml`,
`magic-items.md § The three item classes` + the `delivered = committed ×
coupling × competence` table): passive, held, nothing to top up, wears
through `Durable`, *specialisation by inventory, never by guild* — its
docblock cites this slate by name as the thing it is NOT. It modifies
**recharge**, not casting, so the implement is still unbuilt; but three
of the slate's open leans (no second clock · `Durable` wear if any · no
membership gate) now have a shipped precedent. Two cuts.

### Cut (SHIPPED · DOCUMENTED)
- the second status block *"design opened. Extracted from the magic-items build… Nothing built."* (12–13, 2) — history
- `## Why the cut happened, because it is the whole design brief` → the intro, *Three things were wrong*, **1** / **2** / **3**, *The salvage was ~nothing* (27–39 · 45–57, 26) — the decision: `Focus` deleted (no class remains); doc: `magic-items.md:110` (the struck row), `:188-200` (the box: same-sentence-as-a-wand · no verb to fire it · no NetHack analogue · *mages should have gear* is a different mechanic → this slate), `:354-357` (the pattern-rot clock went with the class). Heading + a pointer + the ⭐ *test this build must pass* blockquote left (the constraint on the unbuilt build, which `## Open questions` → *Does it wear out?* refers to as *the resource test above*)

### Kept (UNBUILT)
- the status block (re-stamped) · `## The one sentence` · the ⭐ test blockquote
- `## What it is for` → all three subsections (`suppressesMagic` is still the only world→caster field; the no-guild doctrine; the grid table — no `create` / `lightning` / `mind` implement rows exist)
- `## The seam already exists` — kept whole: paragraph 1 is a true substrate statement (`potencyFactor`, documented at `magic.md:139-140`) and paragraph 2 (*the band-lifting case wants a second read where the competence gate is checked*) is design that reads *That* off it; splitting would dangle the pronoun
- `## Open questions` — all five open (see Uncertain for the two the conduit pre-answered) · `## Non-goals` · `## Cross-references`

### Doctrine — kept, labelled
- `### Specialisation without a guild` → *an implement is specialisation by INVENTORY, not by membership* — stated for the conduit on `Conduit.ts:52-56` and nowhere in a subsystem doc as a rule for mage gear generally; a candidate for `magic-items.md`'s *Why*
- `### ⭐ The grid is already the specialisation axis` — *no new vocabulary*; the argument for why the build is small

### Uncertain — kept
- `## Open questions` → *Does it wear out?* — the conduit shipped exactly this lean (*a conduit stores nothing… tools wear through the shipped `Durable.getCondition()`*, `Conduit.ts:47-50`) for a passive mage tool; the question is open for implements only in the sense that nobody has decided it FOR them. Kept; folded into `Left` as *default none; else `Durable`, as the conduit did*
- `### Specialisation without a guild` → *Anyone may carry one; only a caster benefits, so it self-selects with no gate to write* — shipped verbatim in spirit for the conduit (`recharge` affords on the target, a conduit-less caster fails audibly, `magic-items.md:441-444`). Kept because the implement's own gate-free-ness is unbuilt
- `### The world barely touches mages` → *"in exactly one way"* — still true of world→caster fields; the arcana pack has since added the mana grid / `ManaPowered` (`magic-items.md § the wall socket`), which is the world USING mana, not touching a caster. Not a contradiction; noted so requirements do not re-derive it
- Overlaps for the cluster pass: BUC on the effect axis ↔ `magic-items.md § BUC` (shipped for items; the implement would be a fourth consumer); the lens-maker ↔ `vocations.md` (the demand test) ↔ `insurance-slate`'s vocation register; the reach case *must not become a key* ↔ `credential.md` (the key kind)

### Handoff
- none

### Status block
- Status line: added the code-verified clause + the `ConduitMixin` kin (so the next reader does not mistake it for the implement, or re-invent what it already settled)
- Left: *the implement class itself · choosing what it modifies (magnitude / cost / band-reach) · BUC on the effect axis · the stacking rule, before content exists · craftability (the lens-maker vocation)* → *the implement class itself · choosing what it modifies (magnitude / cost / band-reach — and the reach case must not become a key) · wear (default none; else `Durable`, as the conduit did) · BUC on the effect axis · the stacking rule, before content exists · craftability (the lens-maker vocation)*
- Size: a build → a build

---

## docs/slates/builds/hydration-framework-slate.md — 164 → 171 · Status UNBUILT → UNBUILT

Nothing shipped and nothing to cut. `PersistentHydrator`
(`platform/idea/persistence/PersistentHydrator.ts`) is still the only
`Hydrator` implementer and every `hydratorClass:` row under
`packages/content` names it (1,339); `templates.md:211` still states the
design this slate would reverse (*hydrators don't mirror-compose the
backing's mixin chain — they introspect*); `PersistenceContributor` slices
still run only from `PersistableLogic`'s record restore (`captureSlice`
on `Container` · `Adornable` · `Estate` · `Slotted` · `BeliefStore` +
`ChattelLogic`); `Cast.postRegister` still self-calls `hydrateBeliefs()`
(`lib/npc/Cast.ts:173`) with the same *nothing ever read it back* comment;
no source-naming field (`persistenceSource` / `sourceCollection`) exists;
no `lint:*` gate names `postRegister`. **The census re-run with the
slate's own script** (packs' `src/` included, `PostRegistration.ts`
excluded) gives **67 of 123** — it has drifted four in the direction the
slate predicts, which is the ratchet's whole argument. The file grew by
seven lines because the status block grew.

### Cut
- none

### Kept (UNBUILT)
- everything, verbatim: the capture + provenance quotes · the *first answer was wrong* box · *Sits on* · `## The claim` · `## Three frameworks, none aware of the others` (the table's counts are the `868c35b46` figures; the re-run is in the status line, not the body) · `## So the gap is the DRIVER, not the framework` + the three answers · `## The census, and why it is the shape of the work` + the script + the finishing-vs-warming split · `## Open questions the build must answer` 1–4 · `## What is NOT in scope`

### Doctrine — kept, labelled
- `## The claim` → *`postRegister` is for work that happens AFTER a thing is filled in; it is not where filling it in finishes* — the invariant; a candidate for `lifecycle.md` beside `postRegister` once the gate exists

### Uncertain — kept
- `## Three frameworks` table → *1,221 rows* / *5 contributors* / *63 of 109*: today 1,339 rows, the same five contributors (plus `ChattelLogic` capturing on the chattel side), 67 of 123. Figures stale, claim intact
- `## What is NOT in scope` → *"the 63rd instance"* — now one of 67; and the pets MR (!257) has merged, so *stays as shipped* is a description, not a scope decision any more
- Overlaps for the cluster pass: the census-then-ratchet ↔ `lint-family.md § The pattern these gates share`; the *warming a roster* half ↔ memory `reference-ideas-inert-at-boot` (nothing warms the roster — the opposite failure of the same hook) and `api-boot-is-an-operator-act` (self-warming catalogues); the two belief restore paths ↔ `belief.md`

### Handoff
- none

### Status block
- Status line: added the 2026-09-19 re-run (67/123), the single-implementer check, the `Cast.ts:173` pointer and the no-gate finding
- Left: *the census + ratchet on 63 `postRegister` implementations that load state · let a `PersistenceContributor` name its own SOURCE · decide whether `Hydrator` becomes mixin-composed · the `Cast` belief load as the first consumer* → *the census + ratchet on the `postRegister` implementations that load state (63 → 67, ungated) · the finishing-hydration vs warming-a-roster ruling the census feeds · let a `PersistenceContributor` name its own SOURCE · pre- vs post-register for a source-naming contributor (Q1) · unreachable-source as a declared property (Q2) · the per-clone cost (Q3) · `Hydrator` mixin-composed or not (Q4) · the `Cast` belief load as the first consumer* (the body wins: the ruling and the four questions were unrepresented)
- Size: a build → a build (the *63 call sites* clause widened to *60-odd* so the stamp does not carry a stale exact count)

---

## docs/slates/builds/authored-vs-procedural-slate.md — 161 → 170 · Status UNBUILT → UNBUILT

The forcing case is exactly as written: `ferrow.yaml:41-44` still declares
`cricket: 40 · delve-rat: 12 · pale-grazer: 3` under a 14-line comment
saying *INERT AS SHIPPED, and it fails SILENTLY*; the only `censusKey`
rows in any pack are arcana's (`cell` · `ring` · `spellbook` …); the
glowcap fixture (`glowcap-fixture.yaml:28`) and jar are
`/platform/thing/equipment/PortableLight`, placed by hand in
`timbered-drift.yaml:26` and `winze-head.yaml:27`, with the `Mycena
lucifera` species row sitting unlinked at `rejection/…/mycena/lucifera.yaml`;
`ResidencyLogic.ts:305` still carries *authored placement suppressing
random spawning without either channel knowing about the other*. No
fungiculture pack; no `LightSourceMixin(Plant)`; `lint:census`
(`check-template-census.ts`) checks that template-path-valued fields
resolve, not that a species can occur. ⚠ **The brief's question:** the
slate's *"there is no `forage` or `gather` verb anywhere in the repo"* is
now false in letter — `trade-ranching` ships `gather`
(`cmd/ranching/gather.yaml`, *collect what has been laid*) — and true in
substance: it is egg collection on a `HandlingMixin` target, not the wild
act. The discovery slate's finding (the NetHack distribution shipped under
magic-items D31) does not touch this slate: it never claimed the
distribution was missing, only that the *authored* layer has no relation
to it, which still holds. One cut; the file grew by nine lines because the
status block grew.

### Cut (SHIPPED · DOCUMENTED)
- `## What already exists to build on` → *"The substrate is shipped too — `Biome`'s outward-walking chain, Zone field inheritance, `SpatialZone.stocks` / `favours` / `blessingOdds`, and `SpawnTable.draw`…"* (68–70, 3) — code: `lib/residency/SpawnTable.ts`, `ResidencyLogic.runSpawnSweep`, `Zone.lookupField`; doc: `biome.md`, `zone.md § Declared spawn fields — stocks, favours`, `residency.md § Zone fields the spawn sweep reads` + `§ The sweep is a faucet`. Replaced by a two-line parenthetical pointer; the two discovery-slate quotes above it are KEPT (the next section reads *Override the exception* off them)

### Kept (UNBUILT)
- the status block (re-stamped) · `## The forcing case, in one room` (verified line by line) · `## What already exists to build on` → the two quotes · `## What it does NOT cover — the actual gap` 1–4 + the no-verb paragraph (see Uncertain) · `## The concrete follow-on: fungiculture` (see Uncertain for the `ramp` detail) · `## Open questions for the design pass` (all four open) · *Related*

### Doctrine — kept, labelled
- `## The forcing case` → *each one is a claim the code does not make true, and nothing anywhere said so* / *the two layers cannot see each other* — the finding that names the slate; memory `authored-vs-procedural-slate` carries the one-liner (*a `stocks:` entry matching no candidate is ABSENT not an error*)

### Uncertain — kept
- ⚠ **The second status blockquote was NOT cut** (11–21): its status clause opens the paragraph that carries the user's reframing (*it's not even foraging we need…*) and the *foraging is one consumer* conclusion; splitting is below granularity. Coordinator may strip the leading bold clause
- `## What it does NOT cover` → *"there is no `forage` or `gather` verb anywhere in the repo"* — kept-but-contradicted in letter by `trade-ranching`'s `gather` (eggs). The wild half still has no act, so the paragraph's conclusion (*a dependency, not a polish pass*) stands; `Left` now says `gather` is taken
- `## The concrete follow-on` → *"`ramp` returns `1` unconditionally when `hi <= lo`"* — `Growing.ts:182-183` now reads `if (hi <= lo) return x >= hi ? 1 : 0;`; with both bounds at `0` any non-negative lux still yields `1`, so *thrives in total darkness with no kernel change* holds; the word *unconditionally* is stale
- `## Open questions` Q1 → *"the smallholding build's `CultivableMixin` may already answer this"* — `lib/husbandry/Cultivable.ts` is GROUND you plant in (a bed / pot), not a category for the plant; `husbandry.md § Durability — growing ⇒ cultivated ⇒ durable` uses *cultivated* for the persistence rule only. Q1 is open, and the check the question asks for has now been made
- `## What it does NOT cover` → gap 2 cites *"`ResidencyLogic`'s own comment says authored placement 'suppresses random spawning'"* — the comment is at the census-at-target decline (`:302-308`) and says it is REGIONAL, never global (AC 34); the inference the slate objects to is still an inference
- Overlaps for the cluster pass: the whole slate is the upstream of `discovery-slate` (unlinked-1: *the forage verb + the patch Stuff* is in its `Left` too — two slates, one verb); fungiculture ↔ `mining-slate § Rejection's light is biological` (NOT SHIPPED); *cultivated* ↔ `farmstead` / `two-kinds-of-farm` memory; the census gate ↔ `lint-family.md § lint:census`

### Handoff
- none

### Status block
- Status line: added the code-verified state of the forcing case and the `gather` caveat
- Left: *the design pass itself · a `forage`/`gather` verb (none exists) · cultivated as a category · a census gate tying a species row to a way to occur · declared (not inferred) spawn suppression in furnished rooms · the fungiculture pack + `LightSourceMixin(Plant)`* → *the design pass itself · what a hand-placed ecology member IS (the glowcap: table member or furniture) · a `forage` verb, and whether it differs from `harvest` (`gather` is taken by ranching) · cultivated as a category (husbandry.md uses the word only for the durability rule) · a census gate tying a species row to a way to occur (`lint:census` checks path-valued fields only) · declared (not inferred) spawn suppression in furnished rooms · the fungiculture pack + `LightSourceMixin(Plant)`* (gap 1 was unrepresented; the verb item corrected)
- Size: a build → a build

---

## docs/slates/tails/script-interaction-slate.md — 161 → 158 · Status UNBUILT → UNBUILT

The finding holds: `CommandGiver._dispatchBound` (`lib/command/CommandGiver.ts:1273`)
still builds its `CommandContext` through `CommandApi.createCommandContext`
with no `interactive`; `api/prompt.ts` / `PromptLogic.ts` take
`interactive: Interactive` as a required parameter and have no refusal
for its absence; 20 `context.interactive` sites remain across
`platform/idea/cmd/**` and pack controllers, `WikiController.ts:886`
(`resolveBody`) among them; the only substrate-level no-Interactive
policy is the accept-time cardinality degrade `prompt.md:440-444`
documents (*a scripted / NPC dispatch path has nobody to ask*), which is
exactly the accept-time half this slate says is NOT its subject. The
inbound half is shipped and documented (`connection.md § Two inbound
lanes per socket`, `ConnectionApi.sequenceInbound` at `api/connection.ts:84`).
One cut.

### Cut (SHIPPED · DOCUMENTED)
- `## The interaction with `--async` / `--sync`` body (76–88, 13) — code: the detach in `CommandGiver.runDetachedBody` (`:252`) / `_executeOne`; doc: `connection.md:673-680` (the ⚠ box: *the async detach happens at `_executeOne`, after everything accept-time… `--async` was an accidental workaround for half the bug… should be re-examined on its own merits* — near-verbatim). Heading + a four-line pointer left. No `async: true` view in `packages/content` cites hanging prompts today (grep), so the re-examination it asked for has nothing left to find

### Kept (UNBUILT)
- the status block (re-stamped) · the capture paragraph · *Rides* · `## The finding` (the code shape, the `wiki create` case, the *twenty accidents* box — the count is still 20) · `## Why the inbound fix does not address it` (kept whole: paragraph 1 restates the shipped fix, but the section's job is to keep the two halves from being conflated, and *an interrupt is what a prompt is* is the shared premise the unbuilt guard builds on) · `## Three ways out, cheapest first` 1–3 + the recommendation · `## The adjacent question this exposes` (NPC brains dispatch through the same tail; nothing routes a prompt refusal to `DiagnosticApi`) · `## Not in scope`

### Doctrine — kept, labelled
- `## The finding` → *there is no policy — there are twenty accidents*; `## Not in scope` → *a prompt is a question to a person; the fix is refusing to ask, not inventing a listener* — the guard's design constraint

### Uncertain — kept
- `### 2` → *"(an MQL disambiguation among live objects)"* — for the ACCEPT-TIME disambiguation the substrate now degrades to `controller-rejected { reason: 'ambiguous' }` with no Interactive (`prompt.md:440`), so that case already fails closed; a body-time `PromptApi.mqlObject` from a script still takes whatever the controller's fallback is. The open question (pre-resolve via `with <selector>`) is unaffected
- Overlaps for the cluster pass: the NPC refusal as a diagnostic ↔ `diagnostics.md` (three producers; a fourth would be this) ↔ `behavior.md`; declarative script inputs ↔ `scripting.md` (`def` / `make`); the sweep ↔ the lint-family census pattern (a `context.interactive` census would be the natural ratchet)

### Handoff
- none

### Status block
- Status line: added the code-verified state (required `interactive`, 20 branches, the accept-time degrade as the only policy)
- Left: *the fail-closed guard when a controller would prompt with no `interactive` · the sweep of existing fallbacks, one commit per subsystem · scripts declaring their inputs up front (and pre-resolving an MQL disambiguation) · the NPC variant, routed to `DiagnosticApi`* → *the fail-closed guard when a controller would prompt with no `interactive`, naming the missing input · the sweep of existing fallbacks, one commit per subsystem · scripts declaring their inputs up front (and pre-resolving an MQL disambiguation — a language change) · the NPC variant, routed to `DiagnosticApi`*
- Size: a wave → a wave

---

## docs/slates/builds/rendering-slate.md — 160 → 159 · Status UNBUILT → UNBUILT

(The TRADE — knacker · tanner · chandler — not screen rendering.) No
rendering / tanning / chandling pack exists (`ls packages/content`); no
`soap` or `candle` row anywhere (`candle` survives as a lumen threshold in
`quantity-tags.yaml:57` and `light.md:226`); nothing tans a hide
(`hide.yaml:1-8`: *a SEAM rather than a product… nothing tans it*). **Two
of the slate's premises have moved.** (1) The ranching seam the slate asked
to be *left open, not built* was built exactly as asked:
`trade-ranching/src/idea/cmd/ranching/ButcherController.ts:59-68` yields
meat · offal · tallow · hide · bone as fractions of live mass, the hide is
authored as a seam with no `leather` row, no knacker / tannery / chandler
lives in the ranching pack, and `ranching.md:285-297` documents it. (2)
*"There is no `tallow`"* is false: `trade-cooking/…/material/tallow.yaml`
(*the medieval kitchen's cooking fat and its candle stock*), the
`render-tallow` recipe (trimmings → tallow crock, dry render at 373–420 K)
and ranching's `/trade/ranching/thing/tallow` (the pail of fat, *the
render-tallow recipe finally has something to render*). Soap and candle
are still absent; leather is still unmade. ⚠ One thing the slate did not
anticipate: `trade-tailoring/content/recipes/leather-jerkin.yaml:24-29`
takes `category: hide` directly — a jerkin off a raw hide, no tanning
step — which is the *close the loop with a faucet* the hide row warns
against, one trade over. Two cuts; the file shrank by one line because the
status block grew by ten.

### Cut (SHIPPED · DOCUMENTED)
- the second blockquote's gating paragraph *"**Status: a proposed pack charter. Nothing built.** ⚠⚠ Gated on ranching — no livestock, no carcasses. Ranching is building now, so the seam wants leaving open (§ 5)."* (13–16, 4 + separator) — history: ranching shipped (`ranching.md`), livestock and carcasses exist, the seam was left open. The *Captured* and *only genuinely NEW trade* paragraphs of the same blockquote are KEPT
- `## 5. ⚠⚠ The ranching seam — leave it open, do not build it` body (103–114, 12) — code: `ButcherController.YIELDS` (tallow 5 % · hide 7 % · bone 12 %), `trade-ranching/content/trade/ranching/thing/{tallow,hide,bone}.yaml`, `hide.yaml`'s seam comment, no knacker / tanner / chandler under `trade-ranching`; doc: `ranching.md § Slaughter is sober and complete` + *the hide is a stated seam* (`:293-296`) + `§ What the carcass opens onto`. Heading + a six-line pointer left (§ 8 and the status line refer to the seam)

### Kept (UNBUILT)
- the status block (re-stamped) · the *Captured* + *only NEW trade* paragraphs · *Substrate* / *Siblings*
- `## 1. The evidence: a sink that ships with no source` (see Uncertain — the tallow bullet) · `## 2. The chain — one input, three outputs` · `## 3. And it is what gives the industrial land use teeth` (zoning unbuilt — `zoning-slate` is still a slate) · `## 4. The demand is honest` · `## 6. The cut: one pack or three?` · `## 7. What else the settlement pass implied` (see Uncertain — the miller row) · `## 8. Open` (all four open)

### Doctrine — kept, labelled
- `## 3` → *until there is a trade that stinks, the industrial land use is a label* — the zoning thesis this pack tests; `## 4` → the `vocations.md` *NEVER INVENT A NEED* check applied three ways (already `vocations.md:32`'s rule; the application is this slate's)

### Uncertain — kept
- `## 1` → *"There is no `tallow`, no `soap`, no `candle`"* — kept-but-contradicted on `tallow` (shipped twice over, above); true on `soap` / `candle`. The candle-culture argument (Rejection's *"a two-candle job"*) still stands because nothing makes a candle FROM the tallow. The bullet is one line inside a list; cutting it alone would misstate the evidence, so the paragraph stays and the status line corrects it
- `## 1` → *"Nothing makes leather"* — still true in the sense meant (no tanning); but `leather-jerkin.yaml` consumes a raw `hide` and yields `hide-jerkin`-class goods, so a player CAN reach leather goods without a tanner. Requirements must decide whether tailoring's hide slot becomes a `leather` slot when the tanner arrives
- `## 7` → the *tanner · miller — GAP* row: `vocations.md:138` now lists the **miller** as *shipped* (`trade-milling`) and `:274` says so beside the tanner. The tanner half of the row is accurate
- `## 2` → *the KNACKER* as the carcass source — `butcher` (a live `Livestock`, `instanceof` guard) is the slaughter act; a `Corpse` (`platform/agent/Corpse.ts`) yields nothing, so the knacker's dead-stock function is genuinely unbuilt and distinct. Noted in `Left`
- ⚠ Outside my list: `vocations.md:282` (the knacker · chandler row) repeats *there is no `tallow`* — stale for the same reason; flagged for the coordinator
- Overlaps for the cluster pass: the tannery as LULU ↔ `zoning-slate`; tannin ↔ `textiles.md` (the dye stack) / `cosmetics-slate` (dye is a textiles chain); the packing house ↔ `preservation-slate` / `food-safety`; the scavenger as rung 0 ↔ `sanitation-slate`; the cooper ↔ `fermentation` D15; soap ↔ `disease-slate`

### Handoff
- none (the shipped seam is already in `ranching.md`; the `render-tallow` bootstrap is on its recipe file and `cooking.md`'s domain)

### Status block
- Status line: corrected *no tallow* → *no soap or candle*; added the shipped-seam finding and the knacker/tanner/chandler remainder
- Left: *the knacker · the tanner · the chandler · `tallow` / `soap` / `candle` · the carcass → named-materials seam in ranching · the one-pack-or-three cut* → *the knacker (dead stock — a `Corpse` yields nothing) · the tanner (tannin is the dyeing trade's) · the chandler · `soap` / `candle` · bone → glue · buttons · the one-pack-or-three cut · where soap goes · leather: this pack makes it, textiles' venues sell it (and `leather-jerkin` currently takes a raw hide) · does the knacker collect* (`tallow` and the ranching seam dropped — shipped; § 2's bone outputs and § 8's three open questions added)
- Size: a build → a build

---

## docs/slates/builds/prison-slate.md — 151 → 161 · Status UNBUILT → UNBUILT

Nothing shipped and nothing to cut. `prison` / `gaol` / `jail` /
`PrisonMixin` / `inmate` / `confine` hit nothing under
`packages/server/src/mud`, `packages/content/*/src` or `schema/`; every
`custody` hit is chattel custody (`GetController`, `CheckController`,
`ConsignController`); the only content hit is the word in
`generic-objects`' bathroom row; no courts / venire primitive exists
(`venire` / `class Court` → nothing). The substrate the slate cites is as
claimed: `lib/mortality/Incorporeal.ts` is listed in `mortality.md:609` as
*the capability lever (prison reuses it)*; `civics.md:20` carries the six
landowner powers; `saxonberg-city-slate.md:231,254` still reserves the
off-axis edge parcel (*reserved, not built*); `residence.md` has the
provisioning verbs the *dorm's dark twin* would ride. One status block
only. The file grew by ten lines because the status block grew.

### Cut
- none

### Kept (UNBUILT)
- everything, verbatim: the capture paragraph · *Related* · `## The three enforcement tiers — and the guardrail above all of them` · `## PrisonMixin — a locality you cannot leave` (the two invariants, the content-not-configuration list, the skin checklist, the experience rule) · `## The federal facility` · `## Timing — the split` · `## Open questions (for requirements)` 1–6, all open

### Doctrine — kept, labelled
- `## The three enforcement tiers` → **the guardrail**: *real-conduct moderation never gets a diegetic costume* — the meta/fiction jargon rule applied to enforcement (memory `meta-vs-fiction-jargon`); *the first sentence of any future criminal-code conversation*. Not a backlog item; a candidate for `civics.md`'s jargon-standard section once any enforcement ships
- `## PrisonMixin` → *the experience rule: a sentence must remain a PLACE*; *confinement as pure fun-removal should just be honest and be a ban*
- `## Timing` → *an empty prison is a better statement than an arbitrary one* (Q3's instinct)

### Uncertain — kept
- none contradicted by code. `## Timing` → *"Day-one moderation stays what it already is — meta, staff-held"* — no doc verified for what account-layer moderation exists today; outside this slate's claim
- `## The federal facility` → *"the TPA substrate makes an enclave trivial"* — the TPA reform (`fasttravel.md`) moved the network into the `tpa` pack over the kernel's `TravelNode` shape; an enclave reachable only in custody is still expressible, by a node the network does not list. Design unaffected
- Q6 → *`lib/civics/`* — `lib/civics/` does not exist as a directory today (civics lives at `platform/idea/` + `api/civics.ts`); the module-category check the question defers to is still the right call
- Overlaps for the cluster pass: the three tiers ↔ `legal-code-slate` (law as content) ↔ `courts-judiciary-primitive` memory (the appeal path); escape-as-content ↔ `stealth.md` / `concealment.md` (shipped) + `boundary.md` locks; the panopticon ↔ `perception.md` / `concealment.md`; fines ↔ `banking.md` (the chokepoint); Q2's aether reach ↔ `comms.md` + memory `aether-is-just-the-internet`; the reserved parcel ↔ `saxonberg-city-slate`; Compact crimes ↔ `record-integrity-slate` (anchoring) + `wizard-duty-slate` (code-trust abuse)

### Handoff
- none

### Status block
- Status line: added the code-verified clause (no confinement, no courts, the parcel still reserved)
- Left: *`PrisonMixin` (a locality you cannot leave) · the three enforcement tiers in content · the federal facility on its reserved Saxonberg site · terms and the appeal path* → *`PrisonMixin` (a locality you cannot leave — the boundary + the custody book, and nothing else) · the three enforcement tiers in content · cells as provisioned shelters on the residence spine · interior law as the prison's own jurisdiction (no `securityLevel`) · visitation + appeal over the courts primitive (itself unbuilt) · the federal facility on its reserved Saxonberg site · terms, fines and the appeal path · Q1–Q6* (the body wins: the content list under `PrisonMixin` and the six questions were unrepresented)
- Size: a build → a build

---

# Batch summary

| slate | lines | Status | Left items | Size |
|---|---|---|---|---|
| `builds/attestation-slate.md` | 170 → 175 | UNBUILT → UNBUILT | 5 → 5 (two consumers folded in) | a build → a build |
| `tails/lifecycle-signals-slate.md` | 170 → 153 | UNBUILT → UNBUILT | 4 → 5 | a wave → a wave |
| `builds/implements-slate.md` | 167 → 149 | UNBUILT → UNBUILT | 5 → 6 | a build → a build |
| `builds/hydration-framework-slate.md` | 164 → 171 | UNBUILT → UNBUILT | 4 → 8 | a build → a build |
| `builds/authored-vs-procedural-slate.md` | 161 → 170 | UNBUILT → UNBUILT | 6 → 7 | a build → a build |
| `tails/script-interaction-slate.md` | 161 → 158 | UNBUILT → UNBUILT | 4 → 4 | a wave → a wave |
| `builds/rendering-slate.md` | 160 → 159 | UNBUILT → UNBUILT | 6 → 10 | a build → a build |
| `builds/prison-slate.md` | 151 → 161 | UNBUILT → UNBUILT | 4 → 8 | a build → a build |

1,304 → 1,296 lines. Cuts: 0 + 1 + 2 + 0 + 1 + 1 + 2 + 0 = **7 cut
operations** (every one SHIPPED · DOCUMENTED; no Superseded, no
Graduated); no heading removed anywhere — each cut left its heading and
a pointer. Handoffs: **0**. Status: every slate stays UNBUILT (nothing in
the batch shipped *from* its slate; the three shipped neighbours are
recorded in the status lines). Five files grew because the status block
grew; the net is −8 lines. Stale doc facts flagged for the coordinator
(outside my list): `vocations.md:282` repeats *there is no `tallow`*
(false since `trade-cooking`'s `render-tallow` + `trade-ranching`'s
yield); `leather-jerkin.yaml` consumes a raw `hide` with no tanning step
(the *close the loop with a faucet* the hide row warns against, one
trade over — a requirements question for the tanner, not a doc fix).

Hardest calls:
1. **rendering § 5 — cut a section whose instruction was "do not build it."** The ranching build did exactly what the section asked (yields named materials; authored no knacker / tannery / chandler; minted no `leather`), and `ranching.md` states it with the why. That is SHIPPED · DOCUMENTED even though the "ship" was a refusal — the seam is the decision, and it is on record. Left a six-line pointer because § 8 and the status line lean on it.
2. **implements' Focus brief — cut the three reasons, keep the test.** `magic-items.md`'s box carries the three reasons for the cut near-verbatim, so the brief's paragraphs went; but the ⭐ *does it add a thing the player has to top up?* blockquote is a constraint on the UNBUILT build that `## Open questions` cites by name, so it stayed alone under the heading with a pointer above it. Cutting around a blockquote inside a section is at paragraph granularity, so it was allowed; whether it reads well is the coordinator's call.
3. **authored-vs-procedural's `gather`.** The paragraph *"there is no `forage` or `gather` verb anywhere"* is false in letter (trade-ranching's egg `gather`) and true in substance (no wild act). Kept verbatim under Uncertain; corrected the `Left` item rather than the body, and said `gather` is taken so the design pass does not name a verb ranching already owns.
4. **lifecycle-signals — cut the section the slate calls its most useful.** *"The correction is the most useful thing this slate carries"* — and it is now carried, with the four bullets and the tell verbatim, by two docs, one of which points back at this slate for the one thing it does NOT carry (the subsystem-closure distinction). So the correction went and the distinction stayed.
