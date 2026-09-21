# Slate-compaction pass — identity batch ledger

Three slates. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `identity.md` only.
Line numbers below are the ORIGINAL file's.

Two facts that framed every call:

- ⚠ **`lib/archetype/Archetype.ts`, `ArchetypeCatalogue` and the `archetype`
  `DocumentKinds` entry are the VENUE archetype** (content-packs A13/A14 —
  an industry's floor in capabilities), not character archetypes. Grep
  found no `kind: temperament`, no `/stuff/role/`, no `roleConfig`, no
  `deviations:` anywhere in `packages/content` or the kernel. The
  `archetype:` field on a `Cast` row is a free-string **stamp**
  (`hand` ×10, `barkeep` ×4, `registrar` ×2 …), exactly as identity.md
  says. So the cast slate's "archetype rows" are genuinely unbuilt — and
  its Q1 now has a name collision (below).
- The identity build's shipped surface, verified: `lib/npc/Cast.ts`
  (`CastMixin = SingletonMixin(NamedMixin(Base))` + `archetype · prologue
  · competence · renown`, `_seedDossier` at `postRegister`),
  `platform/agent/{Cast,Extra}.ts`, `scripts/check-{identity,dossiers,
  dispositions}.ts`, `Competence.seedRunFor`, `RenownApi.seedTo` +
  debounced fold, `AccountabilityEvent.partyIdOf` on `getIdentityPath()`,
  `Employed.institutionPath` (authored → employer → `null`; the parcel
  tier deliberately dropped — `Employed.ts` § *Why there is no parcel
  tier*), `ConditionLogic.corpseIdentityFor(body, nowS)` (deceased +
  moment), the `archetype` field on `ChronicleEntry` / `TranscriptEntry`
  / `DispositionEntry`, `register:` on `Visible.fieldMeta`, and the
  19-axis `DISPOSITION_AXES` (`candor`, `warmth` added 2026-09-04). Row
  census today: 33 `Cast` · 7 `Crafter` · 4 `Extra` · 1 `Mercenary` ·
  1 `Gus`; `/platform/agent/NPC` names no row.

---

## docs/slates/builds/cast-archetype-slate.md — 925 → 825 · Status PARTIAL → PARTIAL

Most of the body is the unbuilt archetype-row design the `Left` names, and
it stays verbatim. The cuts are the shipped identity half (which this slate
reached first and the identity build implemented in a different shape), two
defects that shipped as gates, and stale censuses.

### Cut (SHIPPED · DOCUMENTED)
- `## ⚠ A category the model does not name: the FUNCTIONARY` body (550–554, 5) — code: `lib/npc/Cast.ts` (`NamedMixin` composed on the rung; the field may be empty), `Visible.fieldMeta.register`; doc: `identity.md § The two rungs` (*a nameless `Cast` is still `Cast` … `register: definite` is what makes it the collier*). Heading + note left
- `## ⚠⚠ The disposition-key defect (independent, and shippable alone)` body (558–579, 22) — code: `scripts/check-dispositions.ts` (rules 1–3), `lib/trait/Disposition.ts` l.44–92 (`candor`/`warmth` added; `greed`→`generosity`, `gregariousness`→`sociability` renamed); doc: `trait.md` l.31–40 + l.247–251. The slate's open fork (*typo or real gap?*) was answered **both**: two of each. Heading + note left
- `# ⚠⚠ The deed-row hazard (a prerequisite, not a footnote)` body (611–626, 16) — the decision it asked for (*props need either no deed recording or a distinct key, decided before anything writes*) shipped as: an `Extra`'s harm attributes to the institution only, a role's personality never changes; code: `platform/agent/Extra.ts` header, `AccountabilityEvent.partyForOf`; doc: `identity.md § The two rungs` (table rows *harm attributes to* / *personality*), `trait.md` l.194–195 (`imprintDeed` has no production call site — grep confirms zero `TraitApi.recordDeed` callers) + l.269–270. Heading + note left
- `## ⚠⚠ The requirement this creates, cheap now and impossible later` body (828–841, 14) — code: `DispositionEntry.archetype` (l.48–99), `TranscriptEntry.archetype` (l.53–67), `Persona.seedChronicleClaims` (`archetype: seed.archetype`), `check-dossiers.ts` rule 1; doc: `identity.md § The archetype stamp`, `trait.md` l.261–264. Heading + note left
- `# What this slate does NOT cover` → the *prop/cast mechanism, being built in build-3* bullet (915–916, 2) — struck bullet + pointer left
- `# ⭐⭐ It reduces to identity: props cannot own a profile` → paras 1–2 (145–149, 5: `getIdentityPath()` = `getTemplatePath()`, one ledger per row) and the *prop/cast split being built in build-3* para (159–163, 5) — code: `platform/agent/{Cast,Extra}.ts`; doc: `identity.md § The two rungs`. The table + *a prop gets a lens because it cannot have a seed* (151–157) KEPT — that is the lens premise, still open

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none from this slate (both graduations in this batch came from the dossier slate)

### Superseded — cut
- the second status block `> **Status: design conversation, captured. Not requirements.**` + the *REVISED 2026-09-03* pointer (29–38, 10) — by the canonical block; the stress-test section it points at is kept
- `# The measured gradient (verified 2026-09-01)` body (97–111, 15) — by `§ The 41-character stress test` in the same slate (the later, larger census) and by the code: the class column names `/platform/agent/NPC` ×17, which is retired (0 rows today). Heading + note left
- `## ⚠ Class is a third axis, and it is NOT the same as role` paras 1–3 (115–125, 11) — by `identity.md § It is a MIXIN, and that is forced`: class now carries the **identity** rung too (`Cast`/`Extra` × the capability mixins), so *"the class axis stays as it is"* no longer describes the tree. The REVISED blockquote (*a bespoke class exists exactly when the NPC affords a VERB*; Gus the possible exception) KEPT — the general rule is at `command-spec.md § who affords a verb` / `mining.md` l.536, and the NPC reading still guards the rows design (rows must never need a class); `terminus/src/{mayfield-row/agent/Walter,realty/agent/Realtor,terminal/agent/TicketClerk}.ts` still exist and still front verbs
- `## Promotion falls out` body (167–173, 7) — by `identity.md § Promotion is an authoring act` (author a `Cast` row; identity is a stamp, `setTemplatePath` re-keys every index — no re-mint). Heading + note left

### Kept (UNBUILT)
- the captured framing + the two user quotes · `Related:` (no cut section referenced)
- `# ⭐⭐ The finding that starts it` · `## And when a comment isn't enough, an author escapes to a CLASS` (Gus is still a class; kit still has no declarative path on an NPC row)
- `# ⭐⭐ One archetype, two compilation targets` + `## The mechanism is cheaper than it sounds` — the lens (`Left`)
- `# Two closed kinds, open entries, gated` + `## The warning that transfers` — the rows (`Left`)
- `# The shape, written out` (role · temperaments · what a row becomes) · `# Coverage against the shipped cast`
- `# ⭐⭐⭐ The 41-character stress test` → `## What worked` · Change 1 (ten temperaments) · Change 2 (standing as pointers — `Left`; no `holdings:`/`bonds:` anywhere) · Change 3 (elsewhere/seasonal/borrowed — no calendar axis in code) · Change 4 (`temperament: opaque`) · Change 5 (the ungateable role) · `## Coverage after the stress test`
- `## a row must be able to SUPPRESS` — role suppression (`Left`), subsumed by deviations
- `# The balance question: axes, not count` (design rules for the unbuilt rows)
- `# ⭐⭐⭐ Char-gen already built this` (all subsections) — `Login.ts:302` and `EnrollController.ts:742` still both loop `aspiration.outfit`; the expander is still duplicated (`Left`); `pickRandom(cfg.aspirations)` at `Login.ts:245` still the drawn selector; kit still unreachable from a row
- `# ⭐⭐⭐ Deviations` → the model, `## Why it is worth modelling`, `## An authored deviation and an earned drift are the same quantity` — no `deviations:` in content or code; nothing reads the drift delta
- `# Settled in conversation` · `# Open questions` (all eight still open) · `# What this slate does NOT cover` (spine)

### Doctrine — kept, for the coordinator to home
- `## ⭐ A falsifiable health metric` (*archetypes should grow logarithmically against cast size; if linear, delete the abstraction*) — a thesis about the abstraction, not a backlog item
- `# The balance question` → *archetypes cover boilerplate, never character; the test is "would you be annoyed to type it again?"* — same

### Uncertain — kept
- `# Open questions` Q1 (*where do archetype rows live — a `DocumentKinds` entry?*) — ⚠ the `archetype` document kind is now TAKEN by the venue archetype (`DocumentKinds.ts` l.63–64, `content/archetypes/<id>.yaml`, natural key `archetypeId`). A character-archetype kind needs a different name. Kept verbatim; requirements must not inherit the collision
- `## Coverage after the stress test` → *still open: … the functionary tier* — the functionary is resolved (a nameless `Cast`); kept inside the summary table because the rest of the row is live
- `## What a row becomes` — the example row says `class: /platform/agent/NPC`, which is retired (`Cast`/`Extra`). Kept verbatim (it is design, not a census); requirements should read it as `/platform/agent/Extra` for a hand
- `Related:` + `# Two closed kinds` — say *"the 17 disposition axes"*; the roster is 19 (`trait.md` l.31). Kept verbatim
- `# Coverage against the shipped cast` → *duelist / sentry / wolf — roles only, no temperament, correctly* — the identity build made a sentient `Extra` with no institution a build error; the sentry now states `institution:` (`newbie-wilds/…/idea/watch.yaml`). The coverage row is still true of temperament; noted because a *role* for an Extra now implies an institution
- Overlaps for the cluster pass: Change 2 (standing as pointers) ↔ `dossier-slate § The join` (the *circumstance* vocabulary note); the lineage re-reading ↔ `lineage-slate`; the LLM `voice:` ↔ `llm-content-slate`; the calendar axis ↔ wherever schedules land (`npc-behavior-slate`)

### Handoff (belongs in a doc outside my list)
- none

### Status block
- Left: *the archetype rows themselves (closed `role` + `temperament` kinds, open entries) · the lens-vs-seed dual compilation · the `requires` config gate + its lint · standing as pointers · role suppression · the expander extracted out of `EnrollController.commit`* → *the archetype rows themselves (closed `role` + `temperament` kinds, open entries; the ten temperaments + `counter`/`venue-staff`) · the lens-vs-seed dual compilation · the `requires` config gate + its lint (with `temperament: opaque` and the ungateable role) · standing as pointers (Change 2) · deviations — the declared delta subsuming role suppression, and the drift readout · elsewhere / seasonal / borrowed roles (the calendar axis) · the expander extracted out of `EnrollController.commit` + `Login` (kit for NPCs; the three selectors) · `role`/`temperament` as char-gen fields · the lineage re-reading*
- Size: a build → a build

---

## docs/slates/tails/dossier-slate.md — 843 → 148 · Status PARTIAL → PARTIAL

The slate's own status block said it: *"everything above [Q2–Q5] is the
design conversation as it happened; where it disagrees with identity.md,
the subsystem doc is right."* Every mechanism above the open questions is
in `lib/npc/Cast.ts`, `platform/agent/{Cast,Extra}.ts`, the three gates,
`AccountabilityEvent`, `Employed.institutionPath` and
`ConditionLogic.corpseIdentityFor`, and identity.md / accountability.md /
mortality.md / advancement.md / renown.md carry the decisions. Cut to the
four open questions plus the spine and one vocabulary note.

### Cut (SHIPPED · DOCUMENTED)
- `## The problem, precisely` (57–84, 28) — doc: `identity.md § The problem it solves` (the same Dave / registrar sentences), `advancement.md § Seeding a band` (the fork it names, closed)
- `## ⭐ The pattern already exists — invented twice, homed twice` + `### The property that makes this safe` (86–126, 41) — code: `Persona.seedChronicleClaims`, `Behaved._seedDispositions`, `Cast._seedDossier`; doc: `identity.md § The dossier — evidence, never values` (properties 1–2), `chronicle.md § deed vs. claim` + `§ Authored history — the dossier seeder` (l.156), `trait.md`
- `## The scorecard — three grades of not-solved` + Grades 1–3 (128–207, 80) — Grade 1: `advancement.md § Seeding a band` (*seeded evidence, never a declared floor*); Grade 2: `identity.md § The Compact stays players-only by ARITHMETIC` (the product, the *measure don't assign* reading, the fold), `renown.md § Seeding an authored reputation` + `§ Seeding the log does not move the figure`; Grade 3: the fragmentation is Q5, kept. The *vitals* row of the table is Q3, kept; the *participation / influence* rows are Q2, kept
- `## ⭐⭐⭐ The join` → paras 1–4 (211–225, 15: the stress-test quote, Jory/Bia, *standing is the INSTANCE* — verbatim from cast-archetype, which keeps it) and paras 6–9 (237–256, 20: pointers, *not enough*, the archetype/dossier sentence) — doc: `identity.md § The dossier`; the pointer axis stays with `cast-archetype-slate § Change 2`; body claims are Q3. The **word-collision paragraph KEPT** (226–235 — `standing` is a taken term; this slate says *circumstance*): it is the one thing whoever builds Change 2 must read
- `## What a dossier is` (260–298, 39) — code: `Cast.ts` fieldMeta + `_seedDossier`; doc: `identity.md § The dossier` (the shipped block and the four properties, verbatim). The sketch's `history:` (Q3) and `circumstance:` (Change 2) did not ship; property 4 (*is it the row?*) was closed by Q1
- `### The stamp requirement, inherited` (300–318, 19) — doc: `identity.md § The archetype stamp`
- `## ⭐⭐⭐ The identity rung — Extra and Cast as two classes` intro (322–341, 20) · `### The finding: it protects a property that currently holds by accident` (342–362) · `### The grammar already encodes it` (380–400) · `### Three rungs, and every mechanism already ships` (410–435) · `### Promotion is an AUTHORING act` (437–469) — code: `lib/npc/Cast.ts`, `Extra.ts`, `check-identity.ts` rules 1–3; doc: `identity.md § The two rungs` (the article, the singleton, the 39-row accident, the correlation trap), `§ Promotion is an authoring act`; the middle rung (`asIdentityPath`) is `ref-shapes.md`'s identity/lineage doctrine. The *"a guard killed me" → "the watch killed you", permanently* consequence: `accountability.md` l.121–122
- `### ✅ DECIDED — what happens when an extra ACTS` (471–502) · `#### The consequences, stated` (533–552) — code: `AccountabilityEvent.partyForOf`, `Employed.institutionPath`; doc: `identity.md § Who answers for you` + `§ A sentient Extra that answers to nobody is a BUILD ERROR`, `accountability.md § two parties` (l.100–135), `institutionRecordFor` = the casualty list (l.152)
- `### Accountability is the outlier` (554–575) · `### A pre-existing inconsistency — filed as #42` (577–619) — code: `AccountabilityEvent.partyIdOf` (l.37–52, l.205), `CombatLogic.durableIdOf`; doc: `accountability.md` l.25–38 (*keyed on `getTemplatePath()` until the identity build*; the `WireBody` case), `sandbox.md § The accountability row is now actually WRITTEN (2026-09)`
- `### The victim mirror — and what checking the corpse actually found` (621–665) — code: `ConditionLogic.corpseIdentityFor(body, nowS)` (deceased + moment, ordinal for two deaths in one second); doc: `mortality.md § A corpse's own identity (2026-09) — #40 unblocked` (l.668–692, including the `reembody` reason)
- `## ⭐⭐ The falsifiability property` (668–696, 29) — code: `check-dossiers.ts` rules 1–5 (`seedRunFor` run for real; renown checked at seed time by `seedTo`); doc: `identity.md § The three gates`
- `## ⚠⚠ A shipped defect this space already contains` (700–715, 16) — as in the cast slate: `check-dispositions.ts`, `trait.md`
- `## Open questions` Q0 (740–747, 8) — resolved: `identity.md § Who answers for you`, `accountability.md`. One line left
- `## Open questions` Q1 (748–764, 17) — resolved: a block on the row (`CastMixin` fields); `identity.md § The dossier`. One line left, carrying the *revisit if a CMS surface* caveat
- `## Build shape (sketch)` (805–843, 39) — steps 1–4, 7, 8 shipped (MR !248); 5 is Q2, 6 is Q3. One line left

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `### The naming — Extra, not "prop"` (364–378, 15) + `### The class difference is exactly one thing` (402–408, 7) — code: `platform/agent/Extra.ts` (the class exists under that name; its header does not say why), `lib/npc/Cast.ts` (*SingletonMixin, and that is the whole enforcement*) → inserted at `identity.md § The two rungs` as a new `### Why Extra and not "prop" — and why the difference is ONE thing` after `### Promotion is an authoring act` (16 lines: the `props:`/`cast:` designation collision the food-safety build paid for; theatre's word; *resist making Cast rich — the difference is entitlement to an individual ledger, everything else a consequence*)

### Superseded — cut
- the second status block `> **Status: ✅ SHIPPED 2026-09** … This slate is now a tail` (20–25, 6 + blank) — by the canonical block, which says the same
- `#### ⚠⚠ SUPERSEDED — the mechanism is NOT an identity projection` (504–531, 28) — already self-marked; by `identity.md § Who answers for you`. Inside it, *"the institution resolves … else `ParcelApi.ownerOf(<declared home>)`, else null. Plan § D7a"* — the parcel tier was **dropped** in the build (`Employed.ts` § *Why there is no parcel tier*: async, no consumer, two of three owner kinds wrong); the shipped chain is authored → employer → `null`, as identity.md states. Named in the pointer line

### Kept (UNBUILT)
- `## Open questions` Q2 (the materialized trio — `renownOf` still reads the warmed `renown` collection, `renown.ts` l.71–88; the warning still lives in `renown.md` l.258, `participation.md` l.200, `influence.md` l.333) · Q3 (a seeded condition's cause — no `history:` channel anywhere) · Q4 (dossiers for organizations — `institutionRecordFor` reads harm only, no authored history) · Q5 (char-gen convergence — `EnrollController.ts:764` and `Cast._seedDossier` both call `seedChronicleClaims`, neither knows the other)
- `## Non-goals` (spine)
- the captured framing, the user quote, *Read first*, *Substrates*, *Consumers waiting* (see-also spine)

### Doctrine — kept
- none (the falsifiability thesis shipped as the gate and is stated in `check-dossiers.ts`'s header + identity.md)

### Uncertain — kept
- `## Non-goals` → *Retro-fitting histories onto the existing cast → a follow-on content pass* — that pass happened: `UNDOSSIERED_CAST_CEILING = 0` in `check-dossiers.ts`, 44 `competence:` blocks and 16 `prologue:` blocks in content. Kept because Non-goals is spine; the item is stale
- `## Non-goals` → *Reworking accountability around extras … not this build's to change* — it WAS changed (seven producers moved to `getIdentityPath()`). Stale, kept as spine
- *Consumers waiting* + Non-goals link `./llm-npc-design.md` — no such file under `docs/` (it is a memory note). Broken link, left for the sweep
- Q3 cites *plan § D3* and Q0/Q1 cited *plan § D1/D7* — the identity plan is retired; the pointers are dangling but the questions stand
- Overlaps for the cluster pass: Q5 ↔ `cast-archetype-slate § The expander exists` (both are the char-gen seeding path); Q2 ↔ `antecedents-slate` (the trap's participation/influence share); the *circumstance* note ↔ `cast-archetype-slate § Change 2`

### Handoff
- none

### Status block
- Left: unchanged — *Q2 the materialized trio (participation + influence still seed-and-fold; make `renownOf` derive) · Q3 a seeded condition's cause · Q4 dossiers for organizations · Q5 converging char-gen's claim seeding* (the body now contains exactly these four plus spine)
- Size: a tail → a tail

---

## docs/slates/builds/antecedents-slate.md — 538 → 480 · Status PARTIAL → PARTIAL

Largely UNBUILT, as the assignment said: no `background:` in content, no
effort→prior function on `Competence`, no cohort/`knows:` authoring in
`lib/belief`, nothing federation-shaped in the kernel (`iscedf` is on
`Discipline` but nothing reads it across instances). The cuts are the
three sections whose decision the identity build shipped in a different
shape — and that shape **contradicts** two kept sections, flagged below.

### Cut (SHIPPED · DOCUMENTED)
- `## The gap` body (54–69, 16) — the fiat-band rejection shipped as *a competence claim is SEEDED EVIDENCE, never a declared floor*; code: `Competence.seedRunFor`, `Cast.competence`; doc: `advancement.md § Seeding a band — Competence.seedRunFor` (l.401–431, the same three objections in the doc's words), `identity.md § The dossier`. Heading + note left. The first sentence (*no way to say Dave is expert*) is now false — there is one
- `## ⭐ The house already answered this twice` (71–87, 17) — the principle it says *"should not be re-argued"* shipped as the dossier's founding move; doc: `identity.md § The dossier — evidence, never values`, `chronicle.md`, `trait.md`. One pointer line left
- `### ⚠⚠ Gap 2 — renown, and the materialized-standing trap` body (270–289, 20) — code: `Cast.renown` + `RenownApi.seedTo` (appends `reception` evidence to the asserted band, schedules the fold, debounced); doc: `identity.md § The Compact stays players-only by ARITHMETIC` (the fold paragraph), `renown.md § Seeding an authored reputation`. The trap's participation/influence share is `dossier-slate` Q2. Heading + note left

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none

### Superseded — cut
- the second status block `> **Status: design proposed, nothing built.** Two questions that turn out to be one …` (13–22, 10) — by the canonical block (Phase A landed as a stated band). Its thesis sentence survives in `## The one idea`; its sizing note (*Phase A a tail of advancement, Phase B new substrate*) by `Size: a build`

### Kept (UNBUILT)
- `# Phase A` → `## The mechanism — author the prior, not the evidence` · `## ⭐ Stated effort, not stated band — DECIDED` · `## ⭐ The crowd costs nothing` · `## Background is a content-trust surface` · `## Players have backgrounds too` · `## Open questions (Phase A)` (1–5) — all `Left`
- `## The sibling ledgers` (the table — mixed, see Uncertain) · `### ⚠ Gap 1 — authored acquaintance` (`Left`; `introduces` brain still the only way an NPC learns an identity) · `### Scope`
- `# Phase B` → every section (`## Two engine facts` · `## The three buckets` · `## Export the evidence, not the estimate` · `## The adapter — four rules` · `## Difficulty is world-relative` · `## The claim faucet` · `## The three variants` · `## Identity, consent, revocation` · `## Acceptance policy is a published artifact` · `## Open questions (Phase B)`) — nothing in code
- `## What this slate does NOT cover` · `## Cross-references` (spine; every link's target still exists, including `docs/study-com/`)

### Doctrine — kept, for the coordinator to home
- `## The one idea` — the thesis: one answer to *"what did this character do before now"*, three provenances (native / authored / foreign), *an import is just a background whose author was another world*
- `### Scope` → the second paragraph (*neither is the immersion bottleneck; a fully-seeded NPC with a thin brain reads worse than a thinly-seeded one with a rich brain*) — a claim about what the ledgers are for; its first paragraph (*both gaps adjacent, probably not this build*) is half-stale since Gap 2 shipped
- `## The three buckets` → *skill is in your hands; standing is in other people's heads* + *this is not a blockchain* — a thesis inside an unbuilt section; left in place, listed here so it is not lost if Phase B is re-cut

### Uncertain — kept
- ⚠ `## ⚠ Why competence can't just seed claim rows` — **contradicted by the shipped mechanism.** The build seeds claim ROWS: `Competence.seedRunFor(band)` searches difficulties in ascending order for the shortest run whose fold lands on the band (`advancement.md` l.410–426: *`hard` reaches `expert` in four*; a run of `easy` saturates at θ≈0.612). So *"you would need hundreds of them or a fiat weight"* is false as stated — the search is what the section did not anticipate. Kept verbatim because `Left` names the effort→prior design and this section is its argument; requirements must reconcile it against `seedRunFor` rather than inherit it
- ⚠ `## ⭐ Stated effort, not stated band — DECIDED` — the shipped dossier takes a **stated band** (`asserting: expert`), the exact thing this section says the author *never types*. The canonical status block already records this. Kept because `Left` keeps the effort→prior function; the section's consequences (grain-sensitivity, fiction-not-dial, recalibration) are partly delivered by `seedRunFor`'s ascending search — *you do not become an expert by doing ordinary things very often* is now the doc's own sentence
- ⚠ `## Background is a content-trust surface` — proposes `background:` as **wizard-only**, on the `class:`/`hydratorClass:`/`brain` list. The shipped `competence:` field is `authorable: true` with no such gate (`Cast.ts` fieldMeta), and the project's standing rule is that a new wizard check is wrong by shape (a seat, or no check). Kept verbatim; flagged so requirements decide it as a seat question, not inherit the gate
- `## The sibling ledgers` table — three rows have moved: `transcripts` (*← this slate*) shipped as the dossier's `competence:`; `renown_events` (*⚠ gap*) shipped as `renown:`; `beliefs` is still the gap. Kept whole (a table is one paragraph); the *influence family already settled* paragraph under it still holds
- `## Open questions (Phase A)` Q1 (*rows or a parameter?*) — the build answered **rows** for the stated-band shape; whether a `background:` prior would be a parameter is still open. Kept
- `## Players have backgrounds too` — *"char-gen produces `bioSeed` and `claimSeeds` (prose) but nothing measurable"* is still true (`EnrollController.ts:764` seeds chronicle claims only; no competence seed from an aspiration). Kept, and it is in `Left`
- Overlaps for the cluster pass: Gap 1 ↔ `pets-slate`'s institution-held opinion for Extras (`Extra.keepsPersonalRegard`) and `npc-behavior-slate`; the crowd/cast split ↔ `npc-behavior-slate`; Phase B variant 3 ↔ `college-slate` / `eternal-university-slate`; Q2 (does background decay) ↔ `advancement-slate` (the forgetting term)

### Handoff
- none

### Status block
- Left: *the `background:` effort→prior function (kind × years × at) · the zero-write crowd prior · authored acquaintance (Gap 1) · all of Phase B — the foreign-evidence adapter, the three buckets, the published acceptance policy, revocation* → *the `background:` effort→prior function (kind × years × at) + the Phase A open questions (decay · Catalog edges · `conditioning` · in-world readability) · the zero-write crowd prior · char-gen aspirations compiling to a background · authored acquaintance (Gap 1, the cohort declaration) · all of Phase B — the foreign-evidence adapter, the three buckets, the acceptance cap, identity/consent/revocation, the published acceptance policy, the three variants*
- Size: a build → a build

---

## identity.md — what changed, and two things I did not touch

- **Inserted** (16 lines) `### Why Extra and not "prop" — and why the difference is ONE thing` under `## The two rungs`, after `### Promotion is an authoring act`. Nothing existing was edited.
- ⚠ **Not edited, for the coordinator:** `identity.md § The drive` cites `packages/server/scripts/drive-identity.ts` and `pnpm --filter @saxonberg/server drive:identity`. Neither exists (`find packages -name 'drive-identity*'` is empty; no `drive:identity` script in `package.json`). Either the drive moved with the wire-tests build or it was retired with the plan; the paragraph describes a run that happened, so it may be history rather than a false statement. Outside a graduation, so left alone and reported.
- The `Extra.keepsPersonalRegard()` hook says the institution-held opinion is *"deferred to the pets slate's Wave 2"* — consistent with the pets ledger; nothing to do here.

## Calibration notes for the coordinator

1. **A tail whose body says "the conversation as it happened" cuts to its questions.** The dossier slate went 843 → 148 with no loss the ledger cannot recover: every mechanism above Q2 is in code AND in one of five docs. The two graduations were the only paragraphs identity.md lacked.
2. **"Shipped in a different shape" hit the antecedents slate hardest**, and the different shape *contradicts* kept sections (`seedRunFor` seeds rows; the dossier states a band). Both are in `Left`, so both are kept — and both are flagged Uncertain so requirements reconcile rather than inherit.
3. **A name collision surfaced by grep, not by reading:** the `archetype` `DocumentKinds` entry is the VENUE archetype. The cast slate's Q1 should not be answered "a `DocumentKinds` entry" without a rename.
4. **A kept section can propose something the project has since forbidden by shape** (`background:` as wizard-only). Kept verbatim per the rule; flagged, because the standing memory says the answer is a seat or no check.
