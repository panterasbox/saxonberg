# Advancement (measurement layer) — implementation plan

A grounded, wave-structured plan for the advancement measurement
substrate (lane 3 of the Dave's-Bar wave). Authoritative spec:
[advancement-requirements.md](../requirements/advancement-requirements.md).
The build is **server-only**; all paths are under `packages/server/src/`.
Every step names the real file it mirrors. Scope is the measurement
substrate only — the requirements' Non-goals (loadout, guilds, stakes,
graph-propagation, estimator tuning, raw-θ view, per-verb signature
authoring) are firm.

## 1. Approach overview

### The shape

Advancement is the **`Catalogue`-of-`Idea`** pattern (Topic/Soul) for the
Catalog, the **chronicle `Document` + `Api`↔`Logic` split** for the
Transcript, a **pure derive-on-read value-object** for Competence (the
renown divergence — *never materialized*), and a **push-on-append
affordance source** for conferral (the hosted-update delta pattern). Build
against these mirrors; don't invent:

| Advancement piece | Mirrors exactly | Evidence |
|---|---|---|
| `Discipline` (Idea data-leaf) | `Topic` (pure-data leaf, read from `template.data`, never cloned) | `mud/lib/messaging/Topic.ts` |
| `DisciplineCatalogue` (warm-cache singleton) | `TopicCatalogue` (`PostRegistrationMixin(Idea)`, `postRegister`→`Template.findDescendants`) | `mud/obj/TopicCatalogue.ts` |
| `TranscriptEntry` (append-only ledger) | `ChronicleEntry` (`extends Document`, `collectionName`, `persistentFields`, owner-indexed, one row per entry) | `mud/lib/chronicle/ChronicleEntry.ts` |
| `AdvancementApi` / `AdvancementLogic` | `ChronicleApi`/`ChronicleLogic` (thin shell ↔ HMR singleton, `FromModule` gate, module-private helpers) | `mud/api/chronicle.ts` + `mud/obj/api/ChronicleLogic.ts` |
| Connection gating | `RenownLogic` via **`PersistApi.isConnected()`** (the `lint:pm` chokepoint) | `mud/obj/api/RenownLogic.ts` |
| Edges (typed refs on the node) | `Entry.relation` (edge = field on node, no edge documents) | `mud/lib/forum/Entry.ts` |
| Conferral affordance source | hosted-update `applyHostedUpdateDelta` push/pop + `pushCommandSource`/`commandSource` | `mud/lib/command/CommandGiver.ts`, augmentation/command-routing docs |
| Self-view verb afforded by a mixin | `PersonaMixin.commandContributions.self` affording `chronicle` | `mud/lib/character/Persona.ts` |
| Collections + indexes | `Collections` enum + `createIndexes()` | `backend/PersistenceManager.ts` |

### Constraints the investigation resolved

1. **Discipline join key ≠ templatePath.** A `Discipline.key` (`'mixology'`)
   is the durable id that edges and Transcript rows reference, *distinct*
   from the templatePath — so re-pathing/re-parenting the Catalog leaves
   edges and Transcript rows valid (the additive-evolution constraint).
   Precedent: `Topic.topic` / `Emote.verb` are domain keys separate from
   path. The **owner** key on a Transcript row stays the character's
   durable `templatePath` (the chronicle/renown re-key).
2. **Conferral needs a trigger because Competence is derive-on-read.**
   Affordances are *push-based* (`pushCommandSource`); a band-crossing has
   no event. The only band-mover is a Transcript append, so
   `AdvancementApi.recordSignature` refreshes the owner's conferred
   affordances *after* the write (a gated refresh, push/pop mirroring
   `applyHostedUpdateDelta`). A read-time-dynamic `getAffordances` is
   **rejected** — it's a hot sync path and a BKT read touches Mongo.
3. **Competence bands are their own vocabulary.** `lib/standing/` has a
   `Band` already, but it's influence-flavored (`dormant…pillar`, thresholds
   from `influence.bandThresholds`). Competence keeps a **distinct
   capability-flavored band vocabulary** in `lib/advancement/` — do not
   overload the influence Band (the requirements' divergence).
4. **Seed-controller registration layer.** Each new verb controller needs a
   `seeds/obj/command/<cat>/<X>Controller.yaml` (`{class, data:{}}`) reg
   seed alongside the YAML view and the Controller — the layer
   `ChronicleController.yaml` uses. Both new verbs need one.

## 2. Proposed file/module layout

All under `packages/server/src/mud/`. Every file maps to an existing
Module Category (CLAUDE.md); nothing invents a new one.

**`lib/advancement/` (new subsystem folder — sanctioned by requirements):**
- `Discipline.ts` — `extends Idea`, pure-data leaf template. [Stuff/Idea]
- `TranscriptEntry.ts` — `extends Document`, `transcripts` collection. [Document]
- `ActSignature.ts` — the cross-lane value-object: `Subcheck`, `ActSignature`, `Difficulty`/`Outcome` vocabularies + validation arrays. [Value-object/vocabulary]
- `CompetenceBand.ts` — competence band vocabulary + thresholds + `bandFor(theta)`. [Value-object/vocabulary]
- `Competence.ts` — the BKT estimator as a **pure, stateless value-object** (`Competence.derive(discipline, entries) → {theta, band}`); no persistence. [Value-object]
- `CompetenceMixin.ts` — exports `CompetenceMixin`, `_mixinName='CompetenceMixin'`; per-character mixin owning the conferral affordance source + the self-view `commandContributions.self`. [Mixin]

**`api/`** — `advancement.ts` (`AdvancementApi`, thin forwarding shell). [Api]
**`obj/api/`** — `AdvancementLogic.ts` (`extends Idea`, write+derive logic singleton). [Api logic singleton]
**`obj/`** — `DisciplineCatalogue.ts` (`PostRegistrationMixin(Idea)` at `/obj/DisciplineCatalogue`). [Stuff/Idea singleton]

**Verbs (MVC triple + reg seed each):**
- `cmd/author/practice.yaml` + `obj/command/author/PracticeController.ts` + `seeds/obj/command/author/PracticeController.yaml`.
- `cmd/charactergen/competence.yaml` + `obj/command/charactergen/CompetenceController.ts` + `seeds/obj/command/charactergen/CompetenceController.yaml`.

**Seed data:**
- `seeds/lib/advancement/Discipline/{mixology,recipe-knowledge,darts,alcohol-tolerance,appraisal}.yaml` — the seed Catalog (≥4, all channels, all edge kinds). [seed YAML, like Topic seeds]
- `seeds/obj/DisciplineCatalogue.yaml` — `{class: /obj/DisciplineCatalogue, data: {}}`.

**Edits to existing files:**
- `backend/PersistenceManager.ts` — add `Collections.Transcripts = 'transcripts'`, add an `owner` index block in `createIndexes()` (mirror the Chronicles block).
- `lib/character/Character.ts` — compose `CompetenceMixin` into the Character stack.
- `lib/mixin.ts` — add `Mixins.Competence`.
- `lib/paths.ts` — add `TemplatePathPrefixes.discipline` (mirror `.topic`).
- `docs/subsystems/advancement.md` (new), `CLAUDE.md` (doc map + collections list).

## 3. Wave breakdown

Each wave ends green (typechecks + its colocated Vitest suite passes) and
is independently reviewable. AC# refers to the requirements' Acceptance
criteria.

### Wave 1 — The Catalog (Discipline + DisciplineCatalogue + seed graph)

The authored, typed, hot-loadable field-of-study graph exists; no ledger
or estimator yet. Also lands `ActSignature.ts` and the `CompetenceBand`
vocabulary stub early, so the shared types are stable for everyone
downstream.

- **Create** `lib/advancement/Discipline.ts` — `extends Idea`,
  `persistentFields = ['key','channel','label','description','requires',
  'specializes','synergizes','conferrals']`. `key` = durable join id
  (Constraint 1). `channel: 'skill'|'knowledge'|'conditioning'` + a
  validation array. Edges = `string[]` of Discipline `key`s (Constraint:
  authored + stored, consumption deferred). `conferrals:
  {band: CompetenceBandName, verbs: string[]}[]` (authored here, consumed
  in Wave 4).
- **Create** `obj/DisciplineCatalogue.ts` — `extends
  PostRegistrationMixin(Idea)`; `postRegister` →
  `Template.findDescendants(TemplatePathPrefixes.discipline)`, build
  `Map<key, DisciplineDescriptor>` from `template.data` (the
  `TopicCatalogue` recipe — no Stuff cloning). Gated readers
  `getDiscipline(key)`, `allDisciplines()`, edge-walks
  (`getRequires`/`getSpecializes`/`getSynergizes`). `canDestruct`
  singleton-refusal verbatim from `TopicCatalogue`.
- **Create** `lib/advancement/ActSignature.ts` and
  `lib/advancement/CompetenceBand.ts` (see §4 and Wave 3).
- **Modify** `lib/paths.ts` — `TemplatePathPrefixes.discipline`.
- **Create** seed templates + `seeds/obj/DisciplineCatalogue.yaml`. Seed
  graph: `mixology`(skill)`requires:['recipe-knowledge']`;
  `recipe-knowledge`(knowledge); `alcohol-tolerance`(conditioning);
  `darts`(skill, leaf); `appraisal` `synergizes:['mixology']` — all three
  channels, all three edge kinds, a leaf.
- **Tests** `lib/advancement/__tests__/Discipline.test.ts`,
  `DisciplineCatalogue.test.ts` — field/edge round-trip, channel
  validation, warm-from-stubs, edge readers, not-warmed fallback,
  `canDestruct` refusal.

**AC:** Catalog warms from authored templates; seed graph of ≥4
Disciplines across all channels + all edge kinds is queryable. *(AC#1, #2)*

### Wave 2 — Transcript + Api append/read seam

The `transcripts` ledger exists; the gated append explodes a signature
into rows; owner-scoped + per-Discipline reads. No estimator yet.

- **Create** `lib/advancement/TranscriptEntry.ts` — `extends Document`,
  `collectionName = Collections.Transcripts`, `persistentFields =
  ['owner','kind','when','discipline','difficulty','outcome','tags']`.
  `owner` = character durable `templatePath`; `kind:'deed'|'claim'`
  (provenance reused); `discipline` = Discipline `key`;
  `difficulty`/`outcome` typed from `ActSignature`. One row per `Subcheck`.
- **Modify** `backend/PersistenceManager.ts` — `Collections.Transcripts`;
  `{ owner: 1 }` index in `createIndexes()` (mirror Chronicles).
- **Create** `api/advancement.ts` (`AdvancementApi`, `StuffApi.singletonSync`
  getter, `SecurityApi.decorateApiClass` tail) + `obj/api/AdvancementLogic.ts`
  (`@Unshadowable extends Idea`, gate `FromModule('mud/api/advancement#AdvancementApi')`,
  module-private free fns `buildAndSaveEntry`/`ownerKey`/`active` via
  `PersistApi.isConnected()`). Surface:
  - `recordSignature(owner, signature, {kind, when?})` — explodes each
    `Subcheck` in `signature.discipline` into one `TranscriptEntry`. The
    `signature.dispositionValence` field is **read-but-ignored** (the
    defined-but-empty cross-lane seam).
  - `recordDeed`/`recordClaim` convenience (force `kind`).
  - `entriesFor(owner)` and `entriesFor(owner, discipline)` (the
    per-Discipline slice Wave 3 consumes).
  - **Only writer**: no `new TranscriptEntry().save()` outside the logic
    (the go-through-the-Api constraint).
- **Tests** `TranscriptEntry.test.ts` (round-trip, owner keying),
  `AdvancementLogic.transcript.test.ts` (multi-triple → N rows; deed/claim
  provenance; owner-scoped + per-discipline read; connection-guard no-op;
  disposition channel accepted-and-ignored).

**AC:** `TranscriptEntry` is owner-indexed in `transcripts`; deed/claim by
provenance; signature append works. *(AC#3, partial #7)*

### Wave 3 — Competence estimator (derive-on-read)

Bands derive from the ledger on read; nothing is persisted.

- **Create** `lib/advancement/CompetenceBand.ts` — capability band
  vocabulary (e.g. `untrained|novice|competent|proficient|expert`) +
  threshold cutoffs + `bandFor(theta) → CompetenceBandName` (Constraint 3,
  not the influence Band).
- **Create** `lib/advancement/Competence.ts` — a **pure** per-Discipline
  two-state BKT. State = P(mastery); fixed params (prior `P(L0)`, learn
  `P(T)`, slip `P(S)`, guess `P(G)` — constants this increment, tuning is a
  Non-goal). Fold each `TranscriptEntry` for the Discipline in `when` order;
  `outcome` updates the posterior; `difficulty` modulates effective
  slip/guess so off-level evidence is near-inert (the informative-evidence-only
  / desirable-difficulty math). Returns `{theta, band}` — **stateless, no
  `.save()` reachable**.
- **Wire** `AdvancementApi.bandFor(owner, discipline)` → derive from
  `entriesFor(owner, discipline)`, return **only the `CompetenceBand`** (no
  theta, no number to any player surface — the honesty firewall). Each
  Discipline independent (no edge propagation — Non-goal).
- **Tests** `Competence.test.ts` — band derivation across a practice run;
  difficulty modulation (trivial-success barely moves vs at-level advances);
  informativeness (hopeless-flop near-inert); empty-evidence → lowest band;
  **no-persistence assertion** (spy on `PersistApi.save`, derive twice,
  zero writes).

**AC:** difficulty-aware bands derive on read; no scalar persisted; no
number surfaces. *(AC#4)*

### Wave 4 — Conferral + proof harness (the standalone loop)

The observable loop: practice → Transcript → derived band → conferred verb,
plus the bands-only self-view.

- **Create** `lib/advancement/CompetenceMixin.ts` — per-character
  affordance source. On a band-mover (Transcript append), refresh: walk
  `DisciplineCatalogue`, for each Discipline the actor has evidence in
  compute `AdvancementApi.bandFor`, collect every `conferral.verbs` whose
  `band ≤` current, `pushCommandSource(actor, 'self', defs)` (pop+re-push on
  a crossing, mirroring `applyHostedUpdateDelta`). `commandSource` resolves
  to the mixin so attribution reads "competence in `<Discipline>`." Also
  owns the self-view `commandContributions.self`.
- **Wire the refresh trigger** (Constraint 2): after `recordSignature`
  writes, a gated `AdvancementApi.refreshConferrals(owner)` (or folded into
  `recordSignature`) resolves the live in-session host and refreshes — the
  Api layer pokes the mixin (go-through-the-Api), never a direct mixin call.
- **Compose** `CompetenceMixin` into `lib/character/Character.ts`; add
  `Mixins.Competence` to `lib/mixin.ts`.
- **`practice` verb** (`author/`): `practice <discipline> [difficulty]
  [outcome]`, AuthorMixin-afforded (add to `AuthorMixin.commandContributions.self`),
  developer-gated like `clone`. Controller builds a single-triple
  `ActSignature` → `AdvancementApi.recordSignature(actor, sig, {kind:'deed'})`.
  The controllable harness standing in for lane-2 craft verbs.
- **Self-view verb** (`charactergen/competence`): zero-arg, self-only,
  read-only, afforded by `CompetenceMixin`. Renders `bandFor` per
  evidenced Discipline as **band names only** + an empty-state line; MML
  composition mirroring `ChronicleController`.
- **Seed conferred verb**: one seed Discipline (e.g. `mixology`) declares
  `conferrals:[{band:'competent', verbs:['author/<placeholder>']}]` — a
  self-contained placeholder verb (lane-2 verbs don't exist here), proving
  "advancement = the door opens" end-to-end.
- **Tests** `CompetenceMixin.conferral.test.ts` (practice past band → verb
  appears in `getAffordances()` with competence-attributed `commandSource`;
  below band absent; crossing re-evaluates), `PracticeController.test.ts`
  (appends deed, author-gated), `CompetenceController.test.ts` (bands only —
  assert no digit; empty-state; self-only).

**AC:** band-gated conferred verb appears + is usable; `practice` appends;
self-view renders bands; signature type defined with empty disposition
seam. *(AC#5, #6, #7)*

### Doc wave (folded into the sweep)

`docs/subsystems/advancement.md` describes Catalog / Transcript /
Competence / conferral + the deferred seams; `CLAUDE.md` doc map +
collections list updated. *(AC#8)*

## 4. The act-signature type shape (cross-lane seam)

In `lib/advancement/ActSignature.ts` — the canonical definition (per
requirements, authoritative if lane 1 hasn't reached signatures):

- `Subcheck = { discipline: string; difficulty: Difficulty; outcome: Outcome }`
  — the unit of credit (`discipline` = Discipline `key`).
- `ActSignature = { discipline: Subcheck[]; dispositionValence?: DispositionSubcheck[] }`
  — an act decomposes into a **list** of per-Discipline sub-checks (Wren's
  deal: succeeds at Appraisal, fails at Logistics). `dispositionValence` is
  **declared but unpopulated** — lane 1's trait build grafts onto it
  without reshaping ("one signature, two outputs").
- `Difficulty` (e.g. `trivial|easy|standard|hard|hopeless`) and `Outcome`
  (e.g. `failure|partial|success|critical`) as named unions + validation
  arrays, consumed by the BKT.

## 5. Open risks / seams

1. **Durable Discipline `key` vs templatePath** — resolved to a stable
   `key` join (Constraint 1). Tests assert a re-pathed Discipline leaves
   Transcript rows valid.
2. **No-persisted-scalar invariant** — the risk is a "harmless" warm cache.
   Wave 3 test spies on `PersistApi.save`; `Competence` stays a pure
   value-object with no reachable `.save()`.
3. **Forums `Subject` collision** — resolved by the `Discipline` rename. Do
   **not** import/extend `lib/forum/Subject.ts` or the forums
   `SubjectCatalogue`; the two-index warm pattern is *copied, not reused*.
4. **PersistApi / `lint:pm`** — all connection-gating via
   `PersistApi.isConnected()`; `TranscriptEntry.find/save` ride the
   `Document` base. Verify `pnpm lint:pm` stays green.
5. **Cross-lane signature compatibility** — the one hard cross-lane
   obligation. Keep `dispositionValence` optional + additive; if lane 1
   reaches signatures, align the disposition field names then, else lane 3's
   is canonical.
6. **Conferral refresh routing** — resolved push-on-append via a gated
   refresh (Constraint 2); not a read-time `getAffordances` recompute.
7. **Verb category/name** — `practice` in `author/`; self-view named
   `competence` in `charactergen/` (beside `chronicle`/`standing`). Adjust
   if a different player-facing verb name is preferred.

## 6. Cross-references

- Spec: [advancement-requirements.md](../requirements/advancement-requirements.md).
- Precedents: [chronicle.md](../subsystems/chronicle.md),
  [renown.md](../subsystems/renown.md),
  [augmentation.md](../subsystems/augmentation.md),
  [command-routing.md](../subsystems/command-routing.md),
  [persistence.md](../subsystems/persistence.md) (`PersistApi`/`lint:pm`).
- Cross-lane: [npc-behavior-slate.md](../slates/builds/npc-behavior-slate.md)
  § *Traits are competence for dispositions*.
- Related lanes: crafting (`feature/crafting-build`), npc-behavior (lane 1).
