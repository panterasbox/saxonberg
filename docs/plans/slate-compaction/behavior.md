# Slate-compaction pass — behavior batch ledger

Six slates: `npc-behavior` · `narration` · `npc-dialogue` · `alignment` ·
`trait` · `psychology`. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `behavior.md` ·
`npc-dialogue.md` · `trait.md`. Line numbers below are the ORIGINAL file's.

Code verified against (2026-09-18): `packages/server/src/mud/lib/behavior/`
(27 brain modules + `Behaved.ts`/`brain.ts`/`BehaviorBeat.ts`), `lib/npc/`
(`NPC`, `Cast`, `tree`, `DialogueConversation`, `DialogueEffects`), `lib/trait/`
(`Disposition`, `DispositionEntry`, `Dispositioned`, `TraitBand`,
`TraitPosition`), and seven pack `src/behavior/` dirs (`residence/maintains`,
`trade-farming/farms`, `trade-haulage/hauls`, `trade-mining/delves`+`reads-air`,
`trade-ranching/herds`+`raids`, `trade-tailoring/tailors`, `trade-textiles/weaves`).

**Negative findings that decide most of this batch** (each grep was re-run
with quoted globs after zsh ate the first pass):

- no `intent-dialogue`, `scripted-behavior`, `llm-brain`, `guards` or `defends`
  brain anywhere (`brain.ts:113` names `intent-dialogue` only as "the later");
- `brain.ts:155–161`: `ParsedTrigger` is `cadence | witness | engage` — no
  `addressed`, no `given`;
- `BehavedMixin(` composes only on `lib/npc/NPC.ts`, `lib/creature/KeptAnimal.ts`,
  `transport/src/agent/DraftHorse.ts`, `trade-mining/src/agent/PitPony.ts` — all
  Creature-class hosts; no `Thing`/`Location` reactive scenery;
- no `behaviors`/`brain` in `packages/client/src` — no CMS behavior editor;
- `lib/trait/*`: no `equilibrium`/`expressed`; `Disposition.ts` has **19**
  axes (`composure` there is Calm/Wrathful, not a Reserve — no composure /
  equanimity Reserve exists anywhere);
- `dispositionValence` appears in **zero** content YAML; `imprintSignature` /
  `imprintDeed` have **zero** production call sites; `Advancement.ts:107` still
  says *read-but-ignored*; the only writer is `Behaved._seedDispositions`
  (45 rows carry `dispositions:`) — the narration slate's opening finding holds;
- `TraitsController.ts:27,41` and `ProfileLogic.ts:318–322` still print
  `band` — the `traits`/`score` self-readouts still self-report;
  `Avatar.standing.test.ts:134` still guards `/trait|disposition|personality/i`
  off the wire figures;
- no `DevotionMixin`, no `Faction` class, no `patronKey` (the one hit is
  `TipController`'s tipping patron); `chronicle.md:330` still lists alignment
  as a deferred readout;
- no disclosure grant, therapist file, or psychology Discipline (the only
  `psycholog` hit is a comment in `Avatar.ts:309`);
- ⭐ the `domain` → `content` collection rename **shipped**
  (`schema/content.yaml`; `Template.ts:44 collectionName = Collections.Content`).

---

## docs/slates/builds/npc-behavior-slate.md — 688 → 439 · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- the stale second status block *"model set — declarative behavior over path-resolved brains"* (18–25, 8) — history; the canonical block stays
- load-bearing decisions **2–4** (40–61, 22) — code: `lib/behavior/Behaved.ts` (`behaviors:` field, `postRegister` wiring, `StuffApi.resolveExportSync` per fire); doc: `behavior.md § The model`, `§ Brains are a module category`, `§ Path resolution + HMR`. Decisions 1 and 5 (the ladder, the tiers) KEPT — they name the unbuilt rungs. Pointer left
- See also → `hot-reload.md` entry (81–83, 3) — existed for the cut HMR section
- `### How it maps to the hierarchy` body: the NPC-is-an-instance, `Behaved` branch-agnostic, spec-is-data, brain-is-a-module bullets + the Guard example + the spawn flow (125–193, 69 incl. the superseded paragraph below) — code: `Behaved.ts`, `brain.ts`; doc: `behavior.md § The model`, `§ The NPC class` (reactive scenery *"later"*). Heading + pointer left
- `### It rides substrate` → **Emission** bullet (244–245) + **Per-brain slot declaration** bullet (263–278) — code: `brain.ts` (`claims`/`requiresFree` statics), `Behaved.ts` (`_runAct` yields; `BehaviorBeat`); doc: `behavior.md § Slot contention` (*witness-preempts-cadence, no priority numbers*). The **Triggers** bullet (227–243) is KEPT — see Uncertain
- `### HMR (falls out of path-resolution)` body (282–289, 8) — code: `Behaved.ts` stores the path string, `resolveExportSync` per fire; doc: `behavior.md § Path resolution + HMR`, `§ Dev workflow & isolation`. Heading + pointer left
- `## Traits` → the CK3-adoption paragraph (348–354) — doc: `trait.md § The roster` (*"Everything CK3 handled via its other trait categories is left to Saxonberg's own systems"*). The roster bullets are under Superseded
- `### Traits are competence for dispositions` body (389–411, 23) — code: `lib/trait/TraitPosition.ts`, `TraitBand.ts` (position on every axis; mass → unformed/defined/entrenched; the clamp as inertia); doc: `trait.md § The model`, `§ The estimator`. Heading + pointer left
- `## Open questions` → **Q1** the trigger vocabulary (447–452) — doc: `behavior.md § Triggers` (the alias table answers the *"remaining sub-question: the exact v1 alias set"*)
- `## Once shaped into formal requirements` (546–584, 39 incl. the rule) — history: `behavior.md § Cross-references` says the Wave 1 requirements + plan were retired into it; every unbuilt item it summarizes remains in its own section
- `## NPC schedules` → `### And the schedule already exists: it is the SHIFT ROSTER` body (608–621, 14) — code: `lib/behavior/shifts.ts` reads `EmploymentApi.shiftStateOf`; doc: `behavior.md § The canned brains` (*"presence is now a consequence of employment state, not a clock read"*), `employment.md` l.371 (*the game-clock schedule match is gone*). The opening-hours corollary is graduated below. Heading + pointer left

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `### It rides substrate` → the **Coordination of concurrent behaviors** bullet (246–262, 17) — code: `lib/activity/Engaged*` slot map is the same four names on every agent; nothing in `activity.md` or `behavior.md` stated *why* → inserted at `behavior.md § Slot contention` (13 lines: slots are abstract capacity axes not anatomy; an absent affordance is a permanently-unfillable, trivially-free slot; anatomy is `slot.md`'s; non-agent hosts have none; the one-coarse-`hands` limit + per-slot capacity deferred)
- `### … SHIFT ROSTER` → the *"opening hours a business strategy"* paragraph (617–621) — code: `shifts.ts` + `employment.md`'s `Roster`; neither doc drew the consequence → inserted at `behavior.md § The canned brains` after the `shifts`/`covers` paragraph (7 lines: the roster is the schedule, no scheduling system is planned, a business chooses and pays for its hours, always-open is a rostering choice)

### Superseded — cut
- `### How it maps` → the **config "four homes"** paragraph (147–175) — by the code: a dialogue tree is the `tree-dialogue` spec's inline `config` blob; no `DialogueTree` Document, no `dialogue_trees` collection → `npc-dialogue.md § The tree format`. Named in the pointer
- `## Traits` → **the roster** bullets + *"~15 pairs"* (356–373) — by the code: 19 axes (`candor`, `warmth` added 2026-09-04; `boldness`/`fairness`/`worldview` the reframes) → `trait.md § The roster`. Pointer names the count
- `## Open questions` → **Q2** brain self-marking (453–468) — by the code: `export const brain = class {…}` with statics, a **named class-expression** (a plain descriptor object would be dropped by the hot-reload registry) → `behavior.md § Brains are a module category`. The framework-boundary half (runtime never enumerates; enumeration is the CMS's) is documented at `§ CMS save-gate validation` + `§ Dev workflow`
- `## Open questions` → **Q3** config-inline vs reference (469–484) — by the code (the inline blob; see above) → `npc-dialogue.md § The tree format`

### Kept (UNBUILT)
- framing + decisions 1 and 5 · `## Principle` · `### The automation ladder` (the intent/scripted/LLM rows) · `### Tooling` (no client editor) · `## Worked scenario` (see Uncertain) · `## Traits` → the STATUS blockquote, *the three jobs* list (mixed — job 3), `### Stress — the divergence signal` + its **Open** paragraph · `## Open questions` Q4 (`scripted-behavior`), Q5 (per-slot capacity, see Uncertain), Q6 (reactive scenery + the Avatar lean), Q7 (LLM) · `## Build order` W1 (mixed — see Uncertain), W2 (tree widget, `intent-dialogue`), W3+ · `## What this slate does NOT cover` · `## NPC schedules` intro, `### A schedule is a claim about POPULATION`, `### The ambient crowd is PROSE` (no clock read in `api/prose.ts`/`ProseLogic.ts`), `### The cast, and why it will not break`, `### Night's gameplay`, `### The 12× clock`

### Uncertain — kept
- `### It rides substrate` → the **Triggers** bullet — a single paragraph mixing shipped (two sources, guards in brain code, no DSL), deferred (`addressed`/`given`) and **contradicted** design: *"the extensibility surface is the event system (fire a new event class → a brain subscribes)"* — `behavior.md § Triggers` says the trigger surface *emits zero new events and subscribes to zero global buses*; extension is the host's own perception stream. Kept whole per the paragraph rule; requirements should read the doc, not the bullet
- `### Brains: path-resolved …` — one paragraph; the resolution half shipped, the *"editor palette is a derived tree-walk over self-marked modules"* half is the unbuilt CMS tooling. Kept whole
- `### Subclassing happens only for code` — bullets 1 and 3 are shipped doctrine; bullet 2 (scripted) unbuilt; bullet 4 *"a thin archetype/combo class ships a default behavior-spec preset (the combo catalog)"* — the shipped `archetype:` is the identity build's dossier stamp (`identity.md`), **not** a behavior preset; no combo catalog found. Kept whole
- `## Worked scenario — building a Guard` — one paragraph; cites *"a shared tree is its own `Document` in a `dialogue_trees` collection"* (superseded — inline blob) and the holodeck/publish flow (unbuilt). Kept whole; the pointer under `### How it maps` names the superseding shape
- `## Open questions` Q5 — marked *resolved* and the `claims`/`requiresFree` table shipped (`behavior.md § The canned brains`), but the paragraph also holds the open *per-slot capacity for multi-limbed bodies*. Kept whole; `Left` names capacity
- `## Build order` → **Wave 1** — one paragraph; the mixin, brains, triggers and contention shipped, but its last clause *"The behavior spec-list editor + brain path-picker"* did not. Kept whole per the paragraph rule
- `## Traits` → the STATUS blockquote says *"see trait.md"* for jobs 1 & 2 — the roster count there (19) contradicts the section's own history (~15); flagged by the pointer
- `## NPC schedules` → `### Night's gameplay` calls schedules *"fewer witnesses on the street"* as if built — only the bar cast's `shifts` exists; the crowd/derive half is unbuilt. Kept as design commentary inside the unbuilt section
- Overlaps for the cluster pass: `intent-dialogue` + the `addressed` trigger ↔ `npc-dialogue-slate` (`Left` in both); stress/composure ↔ `trait-slate § What this slate does NOT cover` names the same `traits-stress` follow-on; the `guards` brain ↔ `collision-slate`

### Handoff (belongs in a doc outside my list)
- none

### Status block
- Left: *the upper rungs of the ladder — intent-match, the code-tier `scripted-behavior` brain, the LLM brain · the `addressed` and `given` triggers · stress as the divergence signal (the `traits-stress` follow-on) · the schedule model (a schedule is a claim about POPULATION; the shift roster IS the schedule) · the ambient crowd as prose, not objects · the CMS behavior-composition tooling + its drafts→publish gate* → *the upper rungs of the ladder — intent-match, the code-tier `scripted-behavior` brain, the LLM brain · the `addressed` and `given` triggers · the `guards` brain + the block-substrate seam · reactive scenery (`Behaved` on a `Thing`/`Location` host) · archetype behavior presets (the combo catalog) · per-slot capacity for multi-limbed bodies · stress as the divergence signal (the `traits-stress` follow-on) · the schedule model (derive the crowd, simulate the cast — schedule as preference, diegetic failure, the observability boundary, the night pulse + staggered hours) · the ambient crowd as prose, not objects · the CMS behavior-composition tooling (the spec-list editor, the brain palette by tree-walk, the dialogue-tree widget) + its drafts→publish gate*
- Size: a build → a build

---

## docs/slates/builds/narration-slate.md — 498 → 496 · Status PARTIAL → PARTIAL

Nothing in this slate has shipped: the finding it opens with was re-verified
(zero authored `dispositionValence`, zero production writers, `traits`/`score`
still print a band, the wire guard test still stands). Every section is
UNBUILT design or a recorded rejection.

### Cut (SHIPPED · DOCUMENTED)
- the stale second status line `> **Status: design conversation, captured. Not requirements.**` (23–24, 2) — duplicate of the canonical block

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none cut. ⚠ **Doc fix by insert**: `trait.md § Deferred` said *"only a starter set rides authored `ActSignature`s today"* — the code proves the set is **empty**. Inserted a 12-line ⚠ paragraph after `§ Deferred` (verified 2026-09-18: no YAML, no production writers, `Advancement.ts` read-but-ignored, `Behaved._seedDispositions` the only writer; players derive over an empty ledger; authored moments are the intended writer, pointer to this slate; the first authored valence switches the self-readouts on). The slate's `# The finding that starts it` is KEPT — it is the framing the whole slate hangs on

### Superseded — cut
- none

### Kept (UNBUILT)
- everything else: `# The finding` · `# Traits move at authored moments` + `## The dials already assume it` (dials confirmed: `Dispositioned.ts:120–132`, `settings/traits.yaml`) · `# The three jobs` · `# The narrator's job is SALIENCE` + `## never embodied` · `# Platform owns the frame` + `## The shape` + `## The trap` + `## The cost` · `# Acts, never axes` + `## The one constraint` + `### Scope` + `## Two shipped surfaces already break this rule` · `# "There's a fact of the matter"` · `# Rejected` (all three) · `# The status of B4` · `# Guardrails` · `# Open questions` 1–7

### Uncertain — kept
- `## Two shipped surfaces already break this rule` — states *"verified on master at 0d25ab62c"*; re-verified today at the paths above (`TraitsController.ts`, `ProfileLogic.ts:318`). Still true; the commit hash is stale but the claim is not
- Q4 *"Which `self` leaf?"* — `topics.md` l.52 confirms the closed root `self` = `body standing holding group`; still open
- Overlaps for the cluster pass: the *acts-never-axes self-view* ↔ `trait-slate § The write is visible` (which proposes a **deviation-triggered** narrator this slate's `## The trap` rejects in its band-transition form — see the trait-slate entry); the keep-or-withdraw call on `traits`/`score` ↔ `psychology-slate` `Left`

### Handoff
- none

### Status block
- Left: *… · the salience budget* → *… · the salience budget · the practitioner's no-notes option* (open Q6 was in the body and unrepresented)
- Size: a build → a build

---

## docs/slates/tails/npc-dialogue-slate.md — 372 → 239 · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- the stale second status block *"Wave 1 shipped (2026-06)"* (14–25, 12) — history; the canonical block carries the same pointer
- the load-bearing-decision paragraph (31–40, 10) — code: `platform/idea/cmd/social/TalkController.ts` → `brain.open` → `lib/npc/DialogueConversation.ts`; doc: `npc-dialogue.md` intro + `§ The responder seam` (*choosing is interior, speaking is exterior*). Pointer left
- See also → `prompt.md`/`prompt-stack-slate` and `activity.md` entries (63–70, 8) — they existed for the cut tree section
- `## Architecture: the responder seam` body (106–127, 22) — code as above; doc: `npc-dialogue.md § The responder seam`. Heading + pointer left; the pointer notes the shipped input is `talk to`, not the diagram's `say --to`
- `### Branching tree` body (141–161, 21) — code: `lib/npc/tree.ts` (`DialogueTree`/`DialogueTreeSchema`), `DialogueConversation.ts` (both-sides slot hold, `PromptApi.choice`, `player.say(choice.line, npc)`); doc: `npc-dialogue.md § The tree format`, `§ The conversation engagement`. The *multiplayer participation* fork paragraph (163–166) KEPT. Heading + pointer left
- `### B — quest-giver setpiece (tree)` (228–235, 8) — content: the lounge cast's trees (Mara, Dave); doc: `npc-dialogue.md § The conversation engagement` (the room overhears both halves, never the wheel)
- `## What this stresses` (252–271, 20) — a consumption list: prompt / activity / messaging / module-taxonomy bullets all shipped (`npc-dialogue.md § The responder seam`, `§ The conversation engagement`; responders are brains under `behaviors:`); the quest-state bullet shipped as the guard facts `regard`/`trait:`/`time:hour`/`state:`/`position:` (`§ The tree format`); the comms + language bullets restate See also entries that remain
- `## Open questions` → Q1 tree format (274–276), Q3 wave order (280–283), Q4 where responder logic lives (284–286), Q8 discoverability rendering (295–296) — code: `tree.ts`; tree-first happened; brains; `BehavedMixin.getInstanceContributions` + the authored examine cue; doc: `npc-dialogue.md § The tree format`, `§ Discoverability`. Pointer left
- `## Build order` → **Wave 1** (309–314, 6) — shipped; pointer left
- `## Once shaped into formal requirements` (342–372, 31 incl. the preceding rule) — history; the Wave 1 requirements were retired into `npc-dialogue.md`; the unbuilt items it summarizes (scripted responder, mode-mixing, LLM, multiplayer) remain in their own sections

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none. ⚠ **Doc fix (one word)**: `npc-dialogue.md § The tree format` said the tree blob persists *"in the existing **`domain`** collection"* — the collection is `content` (`schema/content.yaml`; `Template.collectionName = Collections.Content`). Corrected in place; recorded here

### Superseded — cut
- `## Architecture` → the diagram's `say --to barkeep` input — by the code: the shipped entry is `talk to <npc>` → `open`; directed speech as an entry is the unbuilt `addressed` trigger. Named in the pointer

### Kept (UNBUILT)
- framing + the two anti-goals · `## Principle` · `## The three responder modes` table · `### Branching tree` → the multiplayer fork paragraph · `### Scripted conversation` (all) · `### LLM` · `## Conversation state` (see Uncertain) · `### A`, `### C`, `### D` · `## Open questions` Q2, Q5, Q6, Q7, Q9, Q10 · `## Build order` intro, W2, W3 · `## What this slate does NOT cover`

### Uncertain — kept
- `## Conversation state` — one paragraph, half answered: per-conversation state shipped as the ephemeral `scratch` bag (`DialogueConversation.ts:132`, *"never persisted"*) and cross-conversation warmth lives in regard; *per-relationship state* is the open half `Left` names. Kept whole
- Q7 *NPC initiative* — `greets`/`introduces`/`idles` + the ambient pacing budget (`behavior.md § Ambient pacing budget`) answer much of *"how much"*; *"how authored"* for leading-without-prompt is the scripted responder's, unbuilt. Kept
- the second anti-goal (*not a modal minigame*) shipped as designed; kept because it is the framing pair with the first (*not interrogation*), which motivates the unbuilt scripted mode
- Overlaps for the cluster pass: `intent-dialogue` + `addressed` ↔ `npc-behavior-slate` `Left`; per-relationship state ↔ `social-graph-slate`; the LLM front-end ↔ `llm-content-slate`. The `Size: a wave` stands because the intent responder rides the npc-behavior upper-rungs build

### Handoff
- none

### Status block
- Left: *the scripted free-text `intent-dialogue` responder (pattern/synonym tables + the `addressed`/`handleMessage` trigger + the implant `tell` entry) · the LLM front-end · persistent per-relationship state · multiplayer tree participation beyond overhearing* → *the scripted free-text `intent-dialogue` responder (pattern/synonym tables + the `addressed`/`handleMessage` trigger + the implant `tell` entry; NPC-led hooks, conditional state rules, graceful redirects) · mode-mixing (banter ↔ setpiece over shared state) · undirected `say` as an opt-in bark trigger · NPC initiative depth · the LLM front-end · persistent per-relationship state · multiplayer tree participation beyond overhearing*
- Size: a wave → a wave

---

## docs/slates/builds/alignment-slate.md — 351 → 343 · Status UNBUILT → UNBUILT

The model is unbuilt end to end (no `DevotionMixin`, no `Faction`, no
alignment derivation; `chronicle.md:330` still lists it as deferred). Cuts
are the second status block and one deferred item that shipped.

### Cut (SHIPPED · DOCUMENTED)
- the second status block *"design spine SETTLED, pre-requirements"* (16–24, 9) — one status block per slate; its one unique fact (supersedes `alignment-religion-slate`) is left as a one-line note in its place
- `## Deferred` → *"Content-collection rename (`domain` → `content`)"* (318–319, 2) — code: `schema/content.yaml`, `lib/stuff/Template.ts:44 collectionName = Collections.Content`; there is no `domain` collection

### Graduated · Superseded
- none

### Kept (UNBUILT)
- everything else: `## The shape in one breath` · `## Two asymmetric axes` · `## One machine, two rosters` · `## The pantheon as legend` · `## The political axis` · `## Worship vs. alignment` · `## The two readers` · `## The mirror` · `## NPCs — how alignment presents` · `## Factions` · `## Model the antidote` · `## What ships` · `## Deferred` (remaining seven) · `## Open questions` · `## Connections`

### Uncertain — kept
- `## The pantheon as legend` — *"the 17 opposed-pair dispositions"* is now **19** (`trait.md § The roster`); the parenthetical *"the colliding `domain` template collection renames to `content` as a standalone task"* is **done**. Both inside kept paragraphs
- `## Factions` — *"reuse `trait.compatibility`"* — the Api OO sweep retired `TraitApi`; the kernel is `DispositionedMixin.compatibilityWith` (`trait.md § The owner face`). Stale name, live idea
- `## NPCs` — *"seeded via claim-evidence (the trait `BehavedMixin` pattern)"* — the pattern shipped for **traits** (`Behaved._seedDispositions`, `DispositionEntry.archetype`); no deed/gravity seeding exists. Kept as design
- `## Worship vs. alignment` names the **Chapel on the Temple of the Ages ruins** and `## The mirror` names *An Honest Count* — content that may not exist yet; not verified, kept
- Overlaps for the cluster pass: `alignment-religion-slate.md` (superseded by this slate, still on disk), `faith-slate.md` and `altar-slate.md` both cite this slate; the Faction primitive ↔ `corpos-slate`; per-faction standing ↔ `reputation-slate`

### Handoff
- none

### Status block
- Left: *… reflection-only · `Corpo` → `Faction` …* → *… reflection-only · NPC gravity seeded as claim-evidence + the legibility × honesty grid · `Corpo` → `Faction` …* (`§ NPCs` was in the body and unrepresented)
- Size: a build → a build

---

## docs/slates/tails/trait-slate.md — 346 → 341 · Status PARTIAL → PARTIAL

Nothing this slate proposes has shipped: no `equilibrium`/`expressed` in
`lib/trait/`, no narrator, no valence-scale vocabulary, no disposition field
on `Species.ts`, and `seedTraitClaims` has one caller (`Behaved.ts:189` — NPC
seeding, not upbringing). All four problems in `## The gap` still hold
(`TraitPosition.ts` is one half-life; `trait.md § The estimator` still
documents the unresisted reversal).

### Cut (SHIPPED · DOCUMENTED)
- the second status block's first paragraph *"design proposed, nothing built. A change to a shipped subsystem: split … settle the valence-scale question"* (10–16, 7 incl. the bare `>`) — one status block per slate; it restates `Left`. The blockquote's two remaining paragraphs (*Also settles how species and culture…*; *Companions*) KEPT as framing

### Graduated · Superseded
- none

### Kept (UNBUILT)
- `## The gap` · `## Two values, one ledger` · `## The write is visible; the value is not` + `### Announce the surprising` + `### What this preserves` · `## The anti-farming argument` · `## Before wiring it everywhere — the denominator` · `## Species, culture, and personality` + Tiers 1–3 + `### The carve-out` + `### How it composes` + `### The one thing to avoid` · `## Deviation is the general narration rule` · `## Open questions` 1–7 · `## What this slate does NOT cover` · `## Cross-references`

### Uncertain — kept
- ⚠ **Cross-slate contradiction for requirements**: `### Announce the surprising, not the every` proposes a **platform-decided** trigger (fire when an act pushes `expressed` off `equilibrium`) and `## The anti-farming argument` rests on *"cheap to look different this week, expensive to be different"*. The later `narration-slate` (2026-08-25) rejects platform-decided triggers (*"a gauge with one tick"* — `## The trap`), moves the trigger to the **author**, and **strikes** the anti-farming framing (*"cheap to look different… expensive to be different" as a design goal* — `## The anti-gaming arguments`). Neither shipped, so both are kept verbatim; requirements must pick. The equilibrium/expressed split itself is untouched by the disagreement
- `### What this preserves` — *"the `traits` verb self-reports today … the doc calls it a product decision"* — still true (`TraitsController.ts:41`; `trait.md § Trait position and the live dashboard`)
- `## Species, culture` Tier 2 — *"seeded upbringing"* — the identity build shipped `DispositionEntry.archetype` (which archetype minted a claim row) for NPCs; whether that is the upbringing seed for **players** at char-gen is unbuilt (`seedTraitClaims` has no char-gen caller). Kept
- Overlaps for the cluster pass: the acts-not-positions self-view ↔ `narration-slate`; Tier 2 ↔ `lineage-slate`; the stress follow-on named in `## What this slate does NOT cover` ↔ `npc-behavior-slate § Traits`

### Handoff
- none

### Status block
- Left: *… · seeded upbringing claims before full-surface wiring* → *… · species/culture personality by seeding tier (emergent from affordances · the upbringing · a distribution never a value; the non-sapient carve-out) before full-surface wiring* (Tiers 1 and 3 + the carve-out were in the body and unrepresented)
- Size: a wave → a wave

---

## docs/slates/builds/psychology-slate.md — 290 → 290 · Status PARTIAL → PARTIAL

⚠ Per the batch brief this slate is kept whole: nothing in it has shipped
(no disclosure grant, no practitioner file, no psychology Discipline; the
`UseGrant` it models on exists in `platform/idea/ParcelRegistry.ts`). The
only cut is the duplicate status line; the line count is unchanged because
`Left` grew by two lines.

### Cut (SHIPPED · DOCUMENTED)
- the stale second status line `> **Status: design conversation, captured. Not requirements.**` (28–29, 2) — duplicate of the canonical block

### Graduated · Superseded
- none

### Kept (UNBUILT)
- everything else: `# Why it is not contrived` · `# Disclosure IS discovery` · `# A READING, not a readout` · `# A player vocation, not an NPC service` + `## The mechanism` + `## The therapist's file` + `## The one profession that must not be an NPC` + `### The proxy for trust` + `### The gradient` · `# The four tie-ins` (all four) · `# Guardrails` · `# Open questions` 1–5

### Uncertain — kept
- `# Why it is not contrived` — *"The engine already derives `TraitPosition` and shows nobody — so privacy is the default and costs nothing"* is **contradicted by shipped code**: `traits` (`TraitsController.ts:41`) and `score` (`ProfileLogic.ts:322`) print a band to the self. `trait.md § Trait position and the live dashboard` already flags this as the product decision this build must make; the slate's own `Left` names it. Kept verbatim
- Related: *"17 opposed pairs"* → 19 (`trait.md § The roster`)
- Overlaps for the cluster pass: the keep-or-withdraw call ↔ `narration-slate` Q1; treatment ↔ `mind-slate`; the credence-good frame ↔ `pharma-slate`; privilege as a conflict class ↔ `enforcement-slate`

### Handoff
- none

### Status block
- Left: *… · privilege and the conflict class · whether `traits`/`score` keep self-reporting* → *… · privilege and the conflict class · the NPC clinic as the cheap institutional tier after the player practitioner · reading from witnessed behaviour without a grant · whether `traits`/`score` keep self-reporting* (`### The proxy for trust` and open Q1 were in the body and unrepresented)
- Size: a build → a build

---

## Subsystem-doc changes in this batch

| doc | change | lines |
|---|---|---|
| `behavior.md § Slot contention` | INSERT — slots as abstract capacity axes, not anatomy; per-slot capacity deferred | +14 |
| `behavior.md § The canned brains` | INSERT — the roster is the schedule; opening hours are a business strategy | +8 |
| `trait.md § Deferred` | INSERT — ⚠ the starter set is empty; players derive over an empty ledger (fixes *"only a starter set rides authored ActSignatures today"*) | +12 |
| `npc-dialogue.md § The tree format` | FIX — `domain` → `content` (the collection was renamed) | ±1 |

## Calibration notes for the coordinator

1. **Resolved open questions were cut as SHIPPED·DOCUMENTED when the resolution is in code and doc** (npc-behavior Q1–Q3; npc-dialogue Q1/Q3/Q4/Q8), with a pointer line in their place. The skill lists "the open questions" as spine; I read that as *questions still open*. A stricter reading keeps them — every cut is recoverable from the ledger's line numbers.
2. **A paragraph that mixes shipped, deferred and contradicted claims stays whole** (the npc-behavior Triggers bullet) and goes under Uncertain naming the contradiction — the same move the pilot made for *Feral*.
3. **Two doc fixes rode along** (`trait.md` starter-set; `npc-dialogue.md` collection name). Both are code-proves-false cases the skill permits; both are recorded above.
4. **`Left` grew on five of six slates** — body items unrepresented in the stamp (reactive scenery, archetype presets, per-slot capacity, the no-notes option, mode-mixing, the NPC clinic tier, the seeding tiers, NPC gravity seeding). The body won.
5. **The trait ↔ narration contradiction** (platform-decided deviation trigger vs author-decided salience; anti-farming struck) is the one thing requirements must settle before either slate is built. Neither side shipped, so nothing was cut for it.
