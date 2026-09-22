# Slate-compaction pass — unlinked-3 batch ledger

Eight slates whose status block names no subsystem doc. Branch
`design/slate-compaction`. Procedure: `.claude/skills/compact-slate/SKILL.md`.
Write list: **none** — every graduation is in a *Handoff* section below,
verbatim, with its target doc named. Line numbers are the ORIGINAL file's.
Originals saved under the scratch dir `unlinked-3/orig/` for diffing.

Batch-wide findings first:

- **Seven of eight are exactly what their stamps say — unbuilt design.**
  Every class, verb, collection and row named as *proposed* was grepped
  for and not found; every piece named as *reused substrate* was found.
  Fourteen cuts in total, seven of them duplicate status blocks; the
  batch shrank 3,240 → 3,165 lines (re-stamped `Left` lists grew some
  files back). `Left` GREW on five
  slates (the body wins) and was wrong in one place: llm-content named
  *the one mine* as its first experiment; its own § *The first experiment*
  says one Dave's Bar NPC.
- **One slate is PARTIAL by a build it did not run.** sanitation-slate's
  *lossy salvage loop* shipped inside the crafting build
  (`CraftingApi.salvage`, `crafting.salvageRate`, the chattel id dies with
  the form). `crafting.md` has the what but not the slate's economic why
  → Handoff. The slate's `collect` verb now COLLIDES with the shipped
  employment `collect` (wages/tips) — flagged under Uncertain.
- **Two premises are stale in kept UNBUILT text** (never rewritten, listed
  under Uncertain): quest-modeling says *Dr. Limen is the shipped
  precedent* (Limen is in `onboarding-slate`'s `Left`, nowhere in code);
  llm-content counts *17 opposed pairs* where `trait.md` has 19.
- **Two doc statements the code proves false, outside my list:**
  `messaging.md:625` and the `Mml.actor` docstring (`api/mml.ts:376`)
  still describe a minimal-distinguishing pass that was never built
  (`presentation.md:298` says so). Recorded under naming-slate's Handoff.
- **Three Handoffs, all verbatim:** the salvage-loss why → `crafting.md`;
  *a name is not an identifier* → `identity.md`; the two false doc
  sentences → `messaging.md`. No subsystem doc was written to.
- **Doctrine is heavy in this batch** — quest-modeling's MDA thesis,
  sanitation's competition-policy arc and the lemons problem, resilience's
  five posture sections, pharma's credence-good thesis, faith's prior-art
  table and reading rules. All kept, all labelled, none in `Left`.

---

## docs/slates/builds/quest-modeling-slate.md — 466 → 455 · Status UNBUILT → UNBUILT

Wholly unbuilt. No `Quest` / `Beat` / `Genre` / `MediatedScene` class
anywhere under `packages/server/src/mud` or `packages/content/*/src`;
`DocumentKinds.ts` has no `quest` kind; no `onboarded` / `implantDemo`
flag in the tree (onboarding's *instance #1* is itself still in
`onboarding-slate`'s `Left`); `DialogueConversation`
(`lib/npc/DialogueConversation.ts:119`) is still the 1:1
`SustainedEngagement`; the only `tension` under `lib/npc` is a comment in
`DialogueEffects.ts`. The substrate the slate cites as shipped is shipped:
`EventApi` (`api/event.ts:147`), `ActSignature` / `TranscriptEntry`
(`lib/advancement/`), the five ledgers it names. One cut.

### Cut (SHIPPED · DOCUMENTED)
- the second status block *"foundational design (first pass, 2026-06-29). A model, not a build… Kind… Retire when…"* (9–21, 13) — history / duplicate stamp (one-block rule). Its content survives in the body: the *instance #1* generalization is the first *See also* bullet; the *resist building off N=1* caution is Q1 + Q2; the *retire when* kernel is `## Once shaped into formal requirements`

### Kept (UNBUILT)
- the status block (re-stamped) · the framing paragraph · `## Load-bearing decisions (the spine)` 1–8 · *See also* (every linked slate + doc exists)
- `## 1. The locus of change` (the delta-dimension table, the completeness argument)
- `## 2. The beat — and how a condition is detected` (no condition / subscription-as-beat seam exists; `mql-subscription.md` is per-Interactive card subscriptions, not a quest predicate)
- `## 4. The diegetic director + the multi-party hold` — see Uncertain for the *Limen is shipped* premise
- `## 5. The choice function — utility, not a tree` (no utility scorer in `lib/behavior/`; brains are `act` statics)
- `## 6. Templates — what the content author builds` · `## 7. The library — the genre set`
- `## 8. Validation against the Eternal University arc` · `## 9. Refinements the real content forced` (the party deduction board is a new scope nothing implements)
- `## Open questions / forks` 1–6 — all still open · `## What this slate does NOT cover` · `## Once shaped into formal requirements`

### Doctrine — kept, labelled
- `## 3. Serving all three player modes (MDA)` — *everyone optimizes; the modes are different objective functions over one sim*; *legibility is a per-layer tuning knob*; the plot-lens as the mode-coexistence mechanism. A thesis about what the goal-set is *for*, not a backlog item. Candidate for `docs/design-lenses.md` (lens 3) or the slate

### Uncertain — kept
- `## 4` → *"Dr. Limen is the shipped precedent (§12)"* and `## 8` → *"Dr. Limen is the diegetic director… model-backed"* — Limen is NOT shipped: no `limen` anywhere in `packages/content` or `packages/server/src`, and `onboarding-slate`'s `Left` still names *Dr. Limen (seat, model-backed brain, the reply contract)*. The section is UNBUILT either way; the premise is stale. Also: the slate cross-references *§12* / *§17.G* / *§17.F* — its own sections run 1–9 (§12 means §8 *Validation*; §17.x are the EU narrative slate's), so the pointers are stale but recoverable
- Overlaps for the cluster pass: the objective/trace flags + Limen ↔ `onboarding-slate`; the forensic-win content ↔ `eternal-university-narrative-slate`; world-changing events ↔ `cooperative-slate`

### Handoff (belongs in a doc outside my list)
- none

### Status block
- Left: *the template primitive · the beat + condition-detection seam · the choice function (utility, not a tree) · the genre library · the diegetic director + the multi-party hold* → *the template primitive · the beat + condition-detection seam · the cast surface (typed slot binding, save-gate validated, the two authoring tiers) · one genre cast end-to-end (Mystery, against the forensic win) · the choice function (utility, not a tree) · the genre library · the diegetic director + the multi-party hold · the party deduction board* (the body wins: § 6's cast surface, the *Once shaped* kernel's one genre and § 9.3's board were unrepresented)
- Size: a build → a build

---

## docs/slates/builds/sanitation-slate.md — 459 → 454 · Status UNBUILT → PARTIAL

No `impound`, `pawn`, `scaveng*`, `abandon*`-as-a-rule anywhere in
`packages/server/src/mud` or `packages/content/*/src` (the `abandon` hits
are `AbortReason`s and the enroll draft); no impound yard, no salvage
*yard*, no second-hand venue; `residency.md` has no narrated eviction.
The substrate it reuses is real: `consign.yaml` / `reclaim.yaml`
(`cmd/retail/`), the residency sweep, `pets.md`'s *naming is the
promotion*. ⭐ **One piece it designed has shipped in a different build:**
the lossy teardown — `salvage.yaml` (`cmd/crafting/`, *"Salvage always
loses value — that's the point"*), `CraftingApi.salvage`
(`CraftingLogic.ts:2462`, `mass × fraction × crafting.salvageRate`,
conservation asserted, *provenance, grade, and the chattel id die with the
form*) → `crafting.md § The lifecycle: two wear axes, repair, broken,
salvage`. Three cuts.

### Cut (SHIPPED · DOCUMENTED)
- the second status block *"direction set, nothing built. A small system that reuses the depot design almost wholesale"* (20–21, 2) — history / duplicate stamp (one-block rule); the depot reuse is `## ⭐⭐ And you do not destroy it — you IMPOUND it`'s table
- `## Open questions` → Q5 *Salvage yield — does breaking down a Crafted object return its materials at a loss, and is that loss a Grade/skill read?* (453–456, 4) — answered: at a loss, by a flat `crafting.salvageRate` (`CraftingLogic.ts:2462`); *skill-scaled salvage yield* is on `crafting.md`'s deferred list (l.1380). Replaced by a three-line *Q5 resolved* pointer

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `### ⭐ Salvage is a lossy loop, and the loss is the POINT` body (255–263, 9) — code: `CraftingApi.salvage` + `crafting.salvageRate`; `crafting.md` carries the *what* (lossy, conservation) and a *why* (lossless would break conservation; losing the value-add is self-limiting) but NOT the slate's economic why — *the loss is what keeps mining and farming necessary; the yield rate is a balance lever on the whole primary sector*. Heading + a two-line pointer left; the why → Handoff `crafting.md` below

### Kept (UNBUILT)
- the status block (re-stamped) · the *Captured 2026-07-31* framing · *Related* (every link resolves)
- `## ⭐⭐ The classification problem dissolves` · `## ⭐⭐ And you do not destroy it — you IMPOUND it` (the depot mapping; the depot itself is `freight-slate`'s, unbuilt) · `### ⭐ The abandonment rule does triple duty`
- `### ⭐⭐⭐ The same yard, with creatures in it, is ANIMAL CONTROL` — no pound / shelter; `pets.md` confirms the acquisition model it cites (l.213 *naming is the promotion*) and has no stray-vs-theft enforcement
- `## ⭐⭐ Two legal regimes, and a locality picks` · `## ⭐ The verb is collect, never destroy` (see Uncertain) · `## ⭐ The scavenger is a genuine entry-level vocation`
- `## ⭐⭐ The pipeline ends in MATERIALS, not a void` — the *salvage → materials* step is the shipped verb; collect / hold / auction around it are not (`auction-slate` owns the auction step)
- `## Two smaller payoffs` (no narrated eviction in `residency.md`; the LULU is `zoning-slate`'s)
- `## The salvage yard as a business` → `### ⭐ The first two sell access; this one transforms` · `### ⭐⭐ The core skill is ASSAY, not teardown` (no assay readout on `analyze`; `instrumentation-slate` unbuilt) · `### ⭐ Three exits, and the third matters most` (exit 1 = the shipped `salvage`, exit 2 = the shipped `consign`; exit 3 *part out* does not exist — kept whole for the second-hand-market consequence) · `### ⭐⭐⭐ The salvage yard is the legitimate face of the fence` (no yard book / directive; ⭐ the thief's countermeasure is now REAL — the chattel id dies with the form on `salvage`, so *the race between identity and scrap* exists in code) · `### Rungs, siting, and the second variant`
- `## The second-hand market` → `#### ⭐ Every real-world solution is already a substrate` · `### ⭐⭐ Two axes of asymmetry` · `### ⚠ The gradient is the whole market` (keenness vs condition are two axes in `crafting.md`; the market on top of them is not) · `### ⭐⭐ Buy broken, repair, resell` (`repair` ships; the arbitrage venue does not) · `### ⭐⭐ Pawn is the credit face` · `### Venues`
- `## Open questions` 1–4, 6 — still open

### Doctrine — kept, labelled
- `## ⚠ The rule that applies first` — *do not give compute a diegetic face; build sanitation because cities have sanitation* — the metaresource line applied; already the standing correction in memory / `docs/uncertainty.md`'s neighbourhood, not a backlog item
- `### ⭐⭐ Three businesses, three monopoly shapes — the arc completes` + `### ⭐⭐ The capstone: this market structurally resists monopoly` — competition-policy pedagogy (geography / network effect / vertical integration / none); candidate for `docs/compact-political-science.md` or `docs/design-lenses.md` (lens 1)
- `### ⭐⭐⭐ The marquee is the LEMONS PROBLEM` — *the lemons problem is REAL here, not simulated; it needs naming, not machinery*; a thesis about honest asymmetry, consumed by the instrumentation and perception designs too

### Uncertain — kept
- `## ⭐ The verb is collect, never destroy` — ⚠ `collect` is now a SHIPPED employment verb (`packages/content/platform/content/platform/cmd/employment/collect.yaml`, wages/tips). A sanitation `collect` view would shadow it silently (the 2026-09 nine-collision finding); requirements must pick another verb or a stanza on the existing view. The section's rule (*no player-facing destruction*) stands
- `## ⭐⭐ The pipeline ends in MATERIALS` — the slate reads *collect → hold → unclaimed → auction → salvage → materials → crafting* as one build; the last three arrows shipped without the first three. Kept whole because the paragraph's design is the pipeline, not the verb
- Overlaps for the cluster pass: the impound yard as a depot ↔ `freight-slate`; the dump as a LULU + siting ↔ `zoning-slate`; the auction step + the consignment venue ↔ `auction-slate`; assay ↔ `instrumentation-slate`; the scavenger rung ↔ `livelihood-slate`; the animal-control customer ↔ pets (`pets.md` is shipped; no pets slate remains to own it)

### Handoff (belongs in a doc outside my list)
- → `crafting.md § The lifecycle: two wear axes, repair, broken, salvage` (a second *why* after *"losing the value-add makes it self-limiting"*), verbatim from the cut section:

  > Teardown must return **less** than went in. If it returned everything,
  > materials would never leave circulation and crafting would have **no
  > standing demand for raw extraction.**
  >
  > > **The loss is what keeps mining and farming necessary.**
  >
  > The § *pipeline* above seen from the economy's side — and it makes the
  > **yield rate a real balance lever on the whole primary sector.**

### Status block
- Status: UNBUILT → PARTIAL (the lossy salvage teardown shipped with crafting; the status line says so and points at crafting.md)
- Left: *`collect` + the impound yard · the abandonment rule and the two legal regimes a locality picks · the salvage yard (assay, the three exits, the lossy loop) · the second-hand market + pawn* → *`collect` + the impound yard · the abandonment rule and the two legal regimes a locality picks · animal control (the yard with creatures in it, the shelter as its output) · the scavenger vocation and its rungs · narrated eviction (the cart came by) · the salvage yard (assay, the three exits, the yard's book) · the second-hand market + repair-and-resell + pawn* (the lossy loop dropped — shipped; animal control, the vocation, narrated eviction and the yard's book were in the body and unrepresented)
- Size: a build → a build

---

## docs/slates/tails/naming-slate.md — 452 → 431 · Status UNBUILT → UNBUILT

A tail of the shipped presentation build, checked closely: **nothing the
slate designed has shipped.** No `rename` verb (`find packages/content
-name rename.yaml` empty); `learnIdentityImpl`
(`RecognitionLogic.ts:488-497`) is an unconditional `viewer.know(RECOGNITION,
referent, { knownAs: name })` — no conflict check (Defense A unbuilt);
`EnrollController` validates name TOKENS only (`validateNameToken`, l.357),
no load-bearing-name gate (Defense B unbuilt); nothing notifies a
name-holder (C unbuilt); `Named.ts:196` still carries `alternateNames`
with no `maiden | alias` writer. ⭐ The slate's headline finding is still
true: `api/mml.ts:376` and `messaging.md:625` still claim a
*"minimal-distinguishing form per recipient"* pass that does not exist,
and `presentation.md:298` now says so (*claimed in a docstring for years,
never built*). Every tail is verified live: `describeFor(viewer, 'bare')`
at `Stuff.ts:292`; `wornFeatureOf` still parses a string
(`SocialLogic.ts:498`, its own comment cites this slate); `formal` has no
caller outside `RecognitionLogic`; `Odo the cook` / `Odile, the city
registrar` are still the stems (`hearthworks/.../agent/cook.yaml:13`,
`terminus/.../registry/clerk.yaml:21`). Four cuts.

### Cut (SHIPPED · DOCUMENTED)
- the second status block *"design conversation, captured. Not requirements. The substrate it rides… is all shipped"* (59–62, 4) — history / duplicate stamp (one-block rule)
- a stray `</content>` line (407, 1) — a paste artifact, not prose
- `# Part 5 — Ambiguity and the client` → the *Names are references, not text* bullet (350–353, 4) — code: `Mml.thing/player/npc` carry `stuff-id` (`messaging.md:267-273`); the reboot-ephemeral caveat is `belief.md:44-45`

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `# Part 1 — A name is not an identifier` body (109–127, 19) — code: belief keys on `subject.getIdentityPath()` (`RecognitionLogic.ts:493`), contacts on `playerId` (`contacts.md:47` *stable across name changes*), chronicle on `owner`; no subsystem doc states the invariant *names are not unique; nothing may key on a name string* (grep of `docs/subsystems/` for *not unique* / *non-unique* / *name string* is empty). Heading + a four-line pointer left; the invariant → Handoff `identity.md` below. ⚠ The table's belief row says `templatePath` — the code is `getIdentityPath()` since D17; graduate with that word corrected (noted here, the Handoff text is verbatim)

### Kept (UNBUILT)
- the status block (re-stamped) · `## ⭐⭐ This slate owns MINIMAL-DISTINGUISHING RENDERING` (the docstring finding still holds) · the *Captured 2026-08-12* framing · *Related*
- `# ⭐ The premise most of this rests on` — the substrate IS shipped (`belief.md`: a stranger renders the bare stem, never the name) but the section is the framing premise the three defenses derive from; kept as spine, not as backlog
- `# Part 2 — Renaming` → `## The kernel / dial split` · `## The rename act` 1–6 · `## Prior names are private, and that is free` · `## Dials, with recommendations`
- `# Part 3 — Impersonation` → `## The disaster case` · `## Two channels, very unequal` (`IntroduceController.ts:72` plants `actor.getName()`; l.78 the third-party path passes `knownAs` — the amplifier is exactly as described) · `## The one fact both defenses run on` · `## Defense A` · `## Defense B` · `## Defense C`
- `# Part 4 — Two victims, not one` · `# Part 5` → the *Never silently resolve* + *Reuse the salient-feature mechanism* bullets · `# The never list` · `# The residual, stated plainly` · `# Deferred` (all three still deferred: no contested-name process, no player nicknames — `belief.md` still defers them, no surname act)
- `# ⭐ Tails from the presentation build (2026-09-11)` — all six bullets verified live (above)

### Doctrine — kept, labelled
- `# The never list` — seven *nevers*; the slate's own constitution, three of which restate `measurement.md` Part 9. Listed here so the coordinator can decide whether it belongs in `identity.md § Why` once the invariant lands
- `# The residual, stated plainly` → *a rename does not launder a reputation — leaving the people who know you does*

### Uncertain — kept
- `# Part 5` → *"a bare ambiguous name prefers the one you recognize; if still ambiguous, it prompts (`PromptApi`'s cardinality policy already does this)"* — the prompt-on-ambiguity half is shipped (`prompt.md § Cardinality vocabulary`); I could not find a *prefers-the-one-you-recognize* rule in targeting (no `recogni*` in the targeting Api / Logic), and the lib-statics build just added `onFiltered` (the KIND axis). Kept; requirements should check the order
- `# ⭐ Tails` → the census numbers are stale: `alternateNames:` now sits on **67** content rows (`grep -rl` over `packages/content`), not 60; the *35 on classes that declare no such field* and *17 agent rows* counts were not re-derived. The findings stand; the numbers are the day's
- The `Mml.actor` docstring (`api/mml.ts:376`) and `messaging.md:625` still assert the unbuilt pass — a doc statement the code proves false, outside my list. Flagged for whoever owns `messaging.md`: strike or mark *unbuilt*
- Overlaps for the cluster pass: surname semantics ↔ `blood-slate`; the contested-name process ↔ `corpo.md` (MARK + approval) / `legal-code-slate`; the keyword union's *which keywords are public* ↔ the perception / targeting builds

### Handoff (belongs in a doc outside my list)
- → `identity.md` (a new short subsection, *A name is not an identifier*, beside the rungs), verbatim from the cut Part 1 (⚠ read `templatePath` in the belief row as `getIdentityPath()` — D17 split lineage from identity after this was written):

  > Already true throughout the engine, and it must be written down as an
  > invariant because everything else leans on it:
  >
  > | Subsystem | Keys on |
  > |---|---|
  > | belief — recognition / identification / regard / discovery | `templatePath` (`/platform/agent/Avatar/<playerId>`) |
  > | chronicle | `owner` templatePath |
  > | contacts | `playerId` — *the doc already says "stable across name changes"* |
  > | renown · participation · producer · authoring | identity |
  > | accountability · contracts · parcels · chattel · bank accounts · offices | identity |
  > | MQL targeting | per-viewer `perceivedKeywords`, not the true name |
  >
  > > ⚠ **Nothing may ever key on a name string, and names may never be made
  > > unique.** A rename is display text and nothing else; every consequence
  > > follows you.
  >
  > **This is also the exoneration mechanism** (Part 4). Because every trace
  > keys on identity, an impostor's deeds land on the impostor's ledger and
  > never on the ledger of the person whose name he wore.

- → `messaging.md:625` (a correction, not an insert): the sentence *"server-side disambiguation walks bodies for these tokens to pick the minimal-distinguishing form per recipient"* describes a pass that does not exist; `presentation.md:298` already says *never built*. Same for the `Mml.actor` docstring at `api/mml.ts:376`

### Status block
- Left: *the rename act (…) · Defense A · Defense B · Defense C · the cooldown dial · minimal-distinguishing rendering* → the same six + *the presentation tails (the dead `alternateNames:` blocks → `keywords:` · the agent `keywords:` union + which keywords are public · the two name-bearing stems, a content fix · `formal`'s first consumer · `wornFeatureOf` → `mostNotableWorn`)* (the body wins: the tails section is five backlog items that were unrepresented)
- Size: a wave → a wave

---

## docs/slates/builds/resilience-slate.md — 427 → 401 · Status UNBUILT → UNBUILT

A file-cited inventory from 2026-08-30, re-checked line by line. **No
control has been wired since.** `ScriptLogic.ts:560` is still
`runInContext(createContext(sandbox))` with no options (no eval timeout;
`Author.ts:44,54` still declare `eval.timeoutMs` / `eval.maxDepth` that
nothing reads); `api/hot-reload.ts` and `api/source-tree.ts` carry zero
`@CallSecurity`; `gateSourceWrite` is still four verbatim copies
(`GitLogic.ts:133`, `StudioLogic.ts:192`, `CmsLogic.ts:185`,
`WriteController.ts:249` — `CmsLogic.ts:269` even says so);
`GrepController.ts:48` / `Detailed.ts:831` still compile raw patterns;
`api/security.ts` has no audit log; the only `Events.ModuleReloaded`
subscriber outside the emitter is the type map; `saxonberg.service` is
still `NoNewPrivileges` + `PrivateTmp` only; no `Object.freeze` on a
prototype, no `--experimental-permission`; `RenderBudget` still lives only
in `lib/wiki/`; no `docs/resilience.md`. `EvalController` still records
the act (`/_eval` singleton) and not the payload; no `recordAuthoring` in
any `cmd/shell/` write controller. ⭐ **One item resolved:** the CI
roster. Three cuts.

### Cut (SHIPPED · DOCUMENTED)
- the second status block *"doctrine set, backlog assembled, nothing built… the security-posture companion to access.md and call-security.md. Graduates to `docs/resilience.md` when the posture is real"* (11–18, 8) — history / duplicate stamp (one-block rule). The one-line thesis it carried is restated verbatim at § 1 (*friction plus daylight*) and § 8; the *graduates to docs/resilience.md* target is recorded here for the coordinator
- `## 4. What is already right` body (131–157, 27) — the shipped baseline, each bullet documented: import boundary + module scope (`lint-family.md`), A9 + `enforceCodeFieldGate` (`measurement.md:381`, `access.md`), the interpreter's `ResourceLimits` as *the everyone-surface: untrusted, command-only* (`scripting.md:188-191, 326`), `ownPropertyOnly: true` (`prose.md:73, 84`), the sandbox suite (`sandbox.md` cites its tests), *a window, not a quota* (`record-layer.md`), the synthetic commit author (`git-workflow.md:125`). Heading + a nine-line pointer left
- `### Tier 1` → item 3 *Two lint checks documented as CI-gating are not in CI* (194–199, 6) — resolved by the 2026-09-03 derived roster: `lint:family` (`packages/server/package.json:37`) runs every `lint:*`, CI runs it as one job (`.gitlab-ci.yml:88-96`, which narrates this exact drift); doc: `lint-family.md`, `CLAUDE.md § The lint family`. Replaced by a three-line *Resolved* pointer

### Kept (UNBUILT)
- the status block (re-stamped) · the *Inventory taken 2026-08-30* framing
- `## 1. The governing admission` — the three `isolated-vm` comments are still there (`EvalScript.ts:20`, `Author.ts:60`), so the *should be retired* ask is live · `### ⭐ One capability, many doors` (the loader hook still stamps and denies nothing)
- `## 5. The backlog` → Tier 1 items 1, 2, 4 · Tier 2 (both Apis undecorated; the four copies) · Tier 3 (the table; the eval timeout) · Tier 4 items 6–9 · Tier 5 items 10–12
- `## 6. Static analysis at the load boundary` and all four subsections · `## 7. Lock down what we can — the process layer` (`deploy/prod/` now has a compose file + Caddyfile; `deployment.md § Two instances` still says *live authoring: no* for prod — the point stands) · `## Open` 1–7, all open

### Doctrine — kept, labelled
- `## 1` → *there is no in-process containment of trusted code; the posture is friction plus daylight* · `## 2. Four layers, and only one of them is defeated by root` · `## 3. The performance law` (*prefer build-time > boundary > per-operation; charge the budget at the pipeline*) · `### ⭐ Detect evasion, not malice` · `## 8. The thesis` (*make the dangerous act cheap to perform and impossible to perform quietly*). The whole slate is the intended `docs/resilience.md`; these five are its spine and the coordinator may want them graduated as a doc even before a control ships

### Uncertain — kept
- `## 3` → *"17 lint checks already do"* — `packages/server/package.json` now has 47 `lint:*` entries; the number is stale, the argument unchanged
- `### Tier 1` item 1 → *"`EvalController.ts:203` calls `recordAuthoring({ path: '<parcel>/_eval' })`"* — the line moved (the singleton path is built at l.93 now) and the controller still records the act, not the body; the claim stands, the line number does not
- `## 7` → the *stable host exists on paper* — `deploy/prod/{docker-compose.yml,Caddyfile}` exist now; whether prod runs from a read-only image with no wizard bit is a deployment fact I cannot verify from the tree
- Overlaps for the cluster pass: the code-trust ledger ↔ `call-security-pass-slate` (trust = TEMPLATE + FUNCTION); the in-world wizard feed (Open 1) ↔ `wizard-duty-slate`; the object quota ↔ the compute-metaresource line

### Handoff (belongs in a doc outside my list)
- none (nothing shipped that a doc lacks)

### Status block
- Left: *Tier 1 code-trust auditing (eval payloads, source-tree writes) · the Api tier's default-open · per-call time budgets · input reaching dangerous constructs · daylight/`@Audited` · load-boundary static analysis · the process-layer lockdown* → the same seven, each now naming its body items (*the hot-reload ledger · `HotReloadApi`/`SourceTreeApi` + the four `gateSourceWrite` copies · `RenderBudget` generalized + the `eval` timeout · the object quota · the operator signal · the `check-mud-imports` move, evasion detection, LLM review as advisory*) + *retiring the three `isolated-vm` comments* (the body wins: § 1's retire ask, Tier 1 item 4, Tier 2's duplication, Tier 4 item 9, Tier 5 item 12 and § 6's LLM review were unrepresented)
- Size: a build → a build

---

## docs/slates/builds/llm-content-slate.md — 390 → 385 · Status UNBUILT → UNBUILT

Wholly unbuilt. No `anthropic` / `@anthropic-ai` / `openai` dependency in
`packages/server/package.json`; no `Director`, `llm-brain`, `salience`
anywhere under `packages/server/src` or `packages/content/*/src`;
`lib/behavior/` holds 27 rule brains and no LLM rung; ⚠ **there is no
`force` verb or `force` seam at all** — `forceCommand` occurs only in two
comments (`Avatar.ts:806`, `SocialLogic.ts:557`), so decision #3's *"force
is still verb-dispatch as the target"* names a seam that has to be built,
not reused. The substrate it cites is shipped: the Witness pattern
(`api/event.ts`), the scripting interpreter (`scripting.md`), the four
context axes' subsystems, `twitch_profiles` / `kick_profiles`. One cut.

### Cut (SHIPPED · DOCUMENTED)
- the second status block *"model set — one director, riding the bus, authoring scripts… Fills npc-behavior-slate's open Q7… the director and the ambient narrator are the same agent"* (10–18, 9) — history / duplicate stamp (one-block rule); every clause is restated in *The load-bearing decisions* 1–6 and the first *See also* bullet

### Kept (UNBUILT)
- the status block (re-stamped) · the framing paragraph · *The load-bearing decisions* 1–6 · *See also* (every linked slate exists at the linked path)
- `## Why not the obvious alternatives` (incl. the 2026-08-29 qualification) · `## The model` → `### The director loop` · `### Where the pieces live` · `### MCP boundary`
- `## Distinctness: the four axes` (see Uncertain for the pair count) · `### Over-helpfulness is cured mechanically`
- `## Knowledge asymmetry` · `## Funding: sponsorship, not player budgets` · `## Cost shape` · `## The first experiment` (Dave's Bar + the libations chain are built — `daves-bar-slate`, `crafting.md`; the NPC brain is not)
- `## Open questions` 1–7 — Q2 and Q6 are marked ✅ but are answered by the slate's own sections, not by code or a doc, so they stay · `## What this slate does NOT cover`

### Doctrine — kept, labelled
- `### The line that cannot be crossed` — *it generates, it never resolves*; the LLM as a sampler under `uncertainty.md`'s resolutional ban + A6/A10. Candidate for `docs/uncertainty.md` (a fifth provenance note) once any LLM surface ships

### Uncertain — kept
- `## Distinctness` → *"trait (17 opposed pairs)"* — `trait.md:31` counts **19**; stale number, argument unchanged
- Overlaps for the cluster pass: the brain ladder's top rung ↔ `npc-behavior-slate` Q7; the speech front-end ↔ `npc-dialogue-slate`; the medium ↔ `scripting-slate`; the exemplar town ↔ `rejection-slate`; sponsorship as capital-chamber standing ↔ `patron-intake` / `broadcast-patronage`

### Handoff (belongs in a doc outside my list)
- none

### Status block
- Left: *the director agent + its locality prompt · the forced-cast command-bus seam · the ambient narrator · script emission · sponsorship funding · the first experiment (the one mine)* → *the director agent + its locality prompt · the salience gate + the active-cast set · the forced-cast command-bus seam (no `force` exists) · the ambient narrator · the four-axis context block (a perception query, never a state dump) · the isolated per-character call when knowledge asymmetry is load-bearing · script emission · sponsorship funding + the parity floor (the complete tree) · the cost levers (witness gating · model tiering · prefix caching · Batch offline) · the first experiment (one Dave's Bar NPC, one number)* (the body wins: the salience gate, the four axes, the hybrid, the parity floor and the cost levers were unrepresented; *the one mine* was wrong — the slate's own § *The first experiment* says one Dave's Bar NPC, NOT Rejection)
- Size: a build → a build

---

## docs/slates/builds/pharma-slate.md — 354 → 353 · Status UNBUILT → UNBUILT

Wholly unbuilt. No `neutralizedBy` on `Material` (`Material.ts` has
`corrosiveTo` at l.619 and `toxicity: ToxinTag[]` at l.589, nothing
else); `RinseController.ts:29-35` still knows one substance and its header
defers the design to *"pharma-slate § the right substance"* by name; no
`assay` / `apothecar*` / `pharmac*` / `tincture` in any class or row (the
hits are a `ToolItem` comment, a potion row and a dorm theme); no `forage`
verb; no glassblowing recipe. The substrate row in `## What we would need`
is accurate: the tag mechanism ships (`Material.toxicity`,
`setToxinBehavior` on the Condition seed), content does not. One cut.

### Cut (SHIPPED · DOCUMENTED)
- the second status block *"direction set, nothing built. Depends on physiology-slate… and discovery-slate"* (17–19, 3) — history / duplicate stamp (one-block rule); both dependencies are the first two *Related* entries

### Kept (UNBUILT)
- the status block (re-stamped) · the *Captured 2026-08-02* framing + the five-star epigraph · *Related* (every link resolves; `farming-slate` is at `tails/` as linked)
- `## ⭐⭐⭐ It does not merely cross-cut systems — it creates demand for INSTITUTIONS` → `### ⭐⭐ Brands get their best use case` (`BrandedMixin` ships and is thin — `corpo.md`) · `### ⭐⭐ Batches make RECALLS possible` (`authoring_events` ships; no batch identity)
- `## The supply chain` → `### ⭐⭐⭐⭐ The closed-Material problem, resolved by the shipped architecture` (the mechanism is shipped and documented in `metabolism.md` / `race.md`; the section's content — *a new drug is a Condition seed plus a tag* — is the pharmacopoeia's authoring rule, unbuilt content) · `### ⭐⭐⭐⭐⭐ The central drama: WILD → CULTIVATED` (no quota, no wild herb, no forage) · `### Spoilage caps scale` (spoilage ships — `spoilage.md`; the pharma freight case does not)
- `## ⭐⭐ The illicit branch degrades itself` · `## Disposal closes the loop` · `## The vocations, and one that is new` · `### ⭐⭐ The assayer's instrument` · `## ⭐ The second variant: SCALE`
- `## What we would need that does not exist` — every row re-checked and still true (cultivation: farming Stage A shipped, `husbandry.md` / `smallholding.md`)
- `## ⭐⭐ The right substance for the wound — neutralizedBy` — the injury build's handoff, verified against `RinseController.ts`; the whole section is the build spec
- `## Open questions` 1–5 — all open

### Doctrine — kept, labelled
- `## The thesis` (+ `### And in this sim it is STRUCTURAL` · `### Which makes pharma where the game teaches STATISTICS`) — *you cannot tell whether the medicine worked; snake oil is a business the physics permits; one patient tells you nothing, a hundred tells you everything*. The credence-good thesis; candidate for `docs/design-lenses.md` (lens 1) or `vocations.md § the information vocations`
- `## ⭐⭐⭐ It creates demand for INSTITUTIONS` intro + table — *every institutional mechanism has a natural first customer here*
- `## The vocations` → *this game keeps generating information vocations because it has real hidden state* — already the theme of `vocations.md`

### Uncertain — kept
- `### The closed-Material problem` cites `Material.toxicity: ToxinTag[]`, `nutrientAmounts` and `ToxinBehavior` *on the Condition seed* — present (`Material.ts:589`, `setToxinBehavior`); whether `metabolism.md` states *the closed set is MATERIALS, the open set is TAGS* in those words I did not confirm; if not, that sentence is a graduate candidate for `metabolism.md § toxins` when pharma ships its first row
- Overlaps for the cluster pass: the substance model + Part 7 ↔ `physiology-slate`; foraging ↔ `discovery-slate`; the assay instrument ↔ `instrumentation-slate`; the assayer as the fourth information vocation ↔ `insurance-slate` (appraiser / auditor) + `vocations.md`; disposal ↔ `sanitation-slate` + `zoning-slate`; the perishable freight case ↔ `freight-slate` / `logistics.md`

### Handoff (belongs in a doc outside my list)
- none

### Status block
- Left: *the actives/pharmacopoeia content · extraction as a process · glass vessels · the assay instrument · the apothecary + assayer vocations · the illicit branch · disposal · the batch/recall record* → the same eight + *`neutralizedBy` + `rinse [with <substance>]` (the first row of the pharmacopoeia) · the wild→cultivated quota (the first commons) · the manufactory variant · in-world statistics over the record (Q5)* (the body wins: the 2026-09-17 handoff section, the commons, the scale variant and Q5's query surface were unrepresented)
- Size: a build → a build

---

## docs/slates/builds/executive-slate.md — 348 → 348 · Status PARTIAL → PARTIAL

Written 2026-09-18 and still exactly true. `ls packages/server/src/schema/
| grep _events` returns the ten ledgers the slate lists and no
`executive_events`; `cmd/system/config.yaml:19` is still
`requiresWizard`; no `tier` on `AppSettings`; no `--emergency` in any
view; the five offices, `/compact/executive`, `pack_installs` with its
applied-by line all ship as the status line says. One status block (the
*Captured 2026-09-18* blockquote is framing, not a stamp). **No cuts.**

### Kept (UNBUILT)
- everything: the status block · the framing · *See also* (every link resolves, incl. `docs/governance/draft-constitution.md` and `economic-bootstrap-requirements.md`) · `## The mapping` · `## ⚠⚠ The gap, in one fact` · Parts 1–7 · `# Open questions` 1–4 · `# Build cut`

### Doctrine — kept, labelled
- `## The mapping — Art. V already describes the workflow` → *the branch is not missing; it has power without legibility* · `# Part 7 — The fiat phase, made legible` → *this slate is publication*. Both are the slate's thesis rather than backlog; `Left` already carries their build items (the log; the fiat-phase handover record)

### Uncertain — kept
- none. Overlaps for the cluster pass: the charter primitive ↔ `institutions-slate`; the docket / disbarment ↔ `courts-slate`; the go-live predicate ↔ `attestation-slate`; the covert-act hole ↔ `wizard-duty-slate`; the Schedule's tiers ↔ `measurement.md`'s layer-3 tiers (the slate itself says the two vocabularies should be one)

### Handoff (belongs in a doc outside my list)
- none

### Status block
- Left: unchanged — every item maps to a Part (1 log · 2 Schedule tiers · 3 emergency acts · 4 charters · 6 reports · 5 agent-session principal · 7 the fiat-phase handover record) and every Part is represented
- Size: a build → a build

---

## docs/slates/builds/faith-slate.md — 344 → 338 · Status UNBUILT → UNBUILT

Wholly unbuilt. No `Tradition` class or row anywhere under
`packages/server/src/mud` or `packages/content`; exactly four
`GroupProvider` classes (`lib/social/providers/{Mql,Managed,Contacts}GroupProvider.ts`,
`lib/party/PartyGroupProvider.ts`) — no congregation; no deed-tag
registry (`deed-tags-slate` is itself UNBUILT: *`chronicle.tags` is still
"open vocabulary, inert in v1"*); `chronicle.md:48-50` still marks `who`
and `tags` **inert in v1**; no `congregation` / `liturgy` / `FaithApi`
token in code; no Chapel row. The substrate the status line names ships
(`WorldClockApi.cron` at `worldclock.ts:227`, the Office substrate, parcel
title, belief/perception, the trait arithmetic). One cut.

### Cut (SHIPPED · DOCUMENTED)
- the second status block's stamp paragraph *"sketch / pre-requirements. tradition-slate covers the inherited account half… serves one want of eight. This slate is the other seven."* (16–21, 6) — history / duplicate stamp (one-block rule); the *seven wants* framing is the title, the tradition pointer is the first *See also*. ⚠ The block's SECOND paragraph (*It re-solves nothing…*, 22–26) is the slate's scope boundary and appears nowhere else — kept as a framing blockquote, no longer a status block

### Kept (UNBUILT)
- the status block · the *It re-solves nothing* framing · *See also* (every link resolves; `story-bible.md` exists at `docs/`)
- `# Part 1 — Precepts and the fall` → `## The mechanic nobody has automated` · `## The shape` · `## The derivation — and the hardest constraint`
- `# Part 2 — Congregation` (+ `## How the congregation finds out`) · `# Part 3 — Ritual` · `# Part 4 — The temple as an institution` · `# Part 5 — Founding a faith`
- `## Objects and interactions` (New / Reused unchanged / New collections: none) · `## ⚠⚠ Dangers` 1–4
- `## Open questions` — Q1 is struck as *Resolved 2026-08-12 → deed-tags-slate* but the resolution is a DESIGN in another UNBUILT slate, not code or a doc, so it stays verbatim (its three consequences, `since` above all, are the build's trap list); Q2–Q5 open

### Doctrine — kept, labelled
- `## What prior art got right, in one table` — the genre survey + the NetHack / Graveyard-Keeper bans (*faith as a numeric currency is the Bubsy failure in vestments*); a design philosophy, not a backlog item
- `## The derivation` → *the fidelity value is never readable, by anyone, ever* — `measurement.md` Part 6 applied; the *readable: what you did · not readable: what you are* line is the slate's constitution
- `## ⚠⚠ Dangers` 1–2 — *a congregation is a club, not a jurisdiction*; *measure fidelity to a declared standard and stay silent on whether the standard is good*

### Uncertain — kept
- `## The shape` — the yaml path `seeds/obj/Tradition/eir.yaml` predates the pack + `/stuff/<branch>/` layout (no `seeds/` tree exists; a Tradition row would be `/stuff/idea/Tradition/<key>` in a pack). The path is illustrative; requirements will re-home it
- `# Part 2` → *"`GroupApi` today has four"* — still exactly four; the count is live, recorded here so the next pass need not re-derive it
- Overlaps for the cluster pass: the deed-tag vocabulary + the four tags ↔ `deed-tags-slate` (which owns the registry; this slate owns the precepts that read it); the fall's arithmetic ↔ `trait-slate`; *born into a congregation* ↔ `lineage-slate`; the inherited account ↔ `tradition-slate`; offerings as transfers ↔ `banking.md`

### Handoff (belongs in a doc outside my list)
- none

### Status block
- Left: unchanged — every item maps to a body section (deed tags → Q1 · `liturgy`/`transgressions` → § The shape · the fall + no readable fidelity + the surprising write → § The derivation · the fifth provider + the witness path → Part 2 · the ritual on `cron` → Part 3 · temple → Part 4 · founding/schism → Part 5 · the Chapel → Part 4's table) and nothing in the body is unrepresented
- Size: a build → a build

---
