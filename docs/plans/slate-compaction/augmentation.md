# Slate-compaction pass — augmentation batch ledger

One slate. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: this file plus
`docs/subsystems/augmentation.md` (insert only). Code verified in
`packages/server/src/mud/lib/augmentation/{Augment,AetherHosted,
AetherImplant}.ts`, `lib/message/Aether.ts`, `lib/magic/Caster.ts`,
`lib/craft/Maker.ts`, `lib/employment/Employed.ts`,
`api/mixin.ts` (`getActiveMixins`, `collectAugmentConferralNames`),
`packages/content/platform/content/platform/cmd/medical/*.yaml`,
`packages/server/src/mud/platform/idea/cmd/medical/*.ts`. Also checked
`docs/subsystems/{comms,combat-hooks,magic,employment}.md` and
`docs/slates/**/instrumentation-slate.md` per the batch brief — no
overlap found (see Handoff note on `comms.md`, and the negative finding
on `combat-hooks.md` / instrumentation below).

## docs/slates/tails/augmentation-slate.md — 322 → 164 lines · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- Second status block ("Wave 1 shipped 2026-06...") and the
  2026-08-08 audit banner — both historical status narrative; the
  Wave-1 facts are in the canonical block + `augmentation.md`, and this
  pass re-verified the audit's conclusion fresh (see Uncertain/none —
  confirmed still true) rather than carry a stale-dated banner. One
  status block rule (pilot calibration).
- `The load-bearing decisions:` list, all 5 items:
  - #1 (innate⊕acquired, effective=innate×condition×augments derived)
    → `augmentation.md § The mental model` + `§ MixinApi.getActiveMixins`
    (the innate⊕acquired union formula). The "×condition" quality
    nuance isn't shipped as a scalar — it survives verbatim in the KEPT
    "Condition & failure" paragraph under `## The mechanism`.
  - #2 (arms/sensors same category; forms; flavor-agnostic) — the forms
    taxonomy duplicates the KEPT `### Forms` subsection; the
    flavor-agnostic claim is now demonstrated in practice by
    `CasterMixin` (a magic capability on the same `_augmentGated`
    substrate) — graduated into `augmentation.md`, see below.
  - #3 (mechanism = Stuff-in-slot contributes capability) → superseded/
    expanded by `augmentation.md § The three-base capability model`
    (capability can now also be a hosted `Idea` update, not only a
    slotted `Thing`) — see Superseded below.
  - #4 (three operations) — duplicates the KEPT `### The three
    operations` subsection.
  - #5 (baseline implant is do-now) → `augmentation.md § AetherImplant`
    + `§ Wave 1 boundary`.
- `## Principle` (5 bullets) — same five decisions restated; all cut for
  the same reasons as above.
- `### Capability-types` table (sense/motor/organ/cognitive → subsystem)
  → `augmentation.md § How other augment kinds plug in (substrate
  proof)` — same shape (sensor→sensorium shipped; motor/organ/cognitive
  rows marked future in both).
- `## The mechanism` — the "An augment is a `Stuff` occupying an
  anatomical/internal slot ... contributes capabilities" paragraph and
  its three example bullets (sensor/cyber-arm/artificial-organ) — the
  sensor case ships (`augmentation.md § Substrate`,
  `_grantsModalities` → `PerceptionApi.sensorium`); the other two
  examples restate the doc's own future-rows table. Superseded in
  shape by the three-base capability model, see below. **Kept**: the
  body-region enumeration (`cranial/ocular/cochlear/…`) was folded into
  one restored sentence so the still-open "Slot model" question (which
  says "per the list above") keeps its antecedent — see note in the
  slate diff; this is bookkeeping, not new design content.
- `## The baseline implant` bullets 1–2 (universal/issued/hardened;
  verbal+emotive ESP channels) → `augmentation.md § AetherImplant`
  ("Hardened per the slate: no power state...") and `§ Wave 1
  boundary` ("Reception-gating integration ... drops `dm` frames for
  implant-less recipients"). The closing "Build this; defer the rest."
  line is a stale build instruction (Wave 1 IS built) — cut.
- `## Character generation` bullet 1 ("Baseline implant: always
  issued") → `augmentation.md § AetherImplant`
  (`Avatar.installDefaultLoadout`, "keys off whether the avatar is
  attuned by any source").
- `## What this stresses` (whole section) — a subsystem cross-reference
  list with no decision of its own. Verified each claim's home:
  senses → `§ Substrate`/sensorium; slot/embodiment → `§ The cranial
  slot`; race/BodyPlan → same; comms/emotes → `§ AetherImplant` +
  `comms.md`; access/command-affordances → `§ The contribution walks
  generalize` (command-source, shipped — `CommandApi.
  collectHostedUpdateDefs`); char-gen → kept `## Character generation`
  section. vitals and capability-magic bullets restate still-open work
  already tracked under kept sections (Mechanism's Condition & failure,
  Open questions #3) and the `See also` list.
- `## Open questions / forks` #1 (umbrella term, resolved: augmentation)
  — trivial, resolved inline in the question itself.
- `## Open questions / forks` #2 (char-gen scope) — the lean (baseline
  now, loadout later) is what shipped; the still-open loadout item
  lives in the KEPT `## Character generation` bullets + the status
  block's `Left`.
- `## Open questions / forks` #3 (mechanism = slotted-Stuff-contributes-
  capability, resolved yes) → `augmentation.md § The three-base
  capability model` — resolved and then expanded beyond the original
  question's framing.
- `## Open questions / forks` #4 (magic augments later, lean: flavor-
  agnostic/cybernetic-only-now) — the lean held (no magic augment
  Stuff exists), and the flavor-agnostic premise is now positively
  demonstrated by `CasterMixin`'s use of the same substrate for a
  magic capability (graduated note, below); `augmentation.md`'s own
  Wave 2+ reserved list already names "Magic-flavor augments."
- `## Open questions / forks` #8, "Failure-mode depth in v1" (lean:
  baseline reliable, power/jam/hack/spoof later) — the lean shipped
  (`AetherImplant`: "no power state, no failure modes, no fuel"); the
  deeper design (trust boundary, espionage framing) survives verbatim
  in the KEPT "Condition & failure" paragraph. Renumbered the surviving
  items 2–4 after this and #1/#4 removal (bookkeeping, not content).
- `## Build order` Wave 1 bullet (implantable affordance + baseline
  implant) — fully shipped, matches `augmentation.md § Wave 1
  boundary`'s "What ships" list verbatim.
- `## Once shaped into formal requirements` (whole section) — a
  pre-build requirements-shape synthesis of every decision above, now
  redundant with the shipped+documented sections; its "Tests" bullet
  is covered by `Augment.test.ts`, `AetherHosted.test.ts`,
  `RequiresActive.test.ts`, and
  `api/__tests__/perception.sensorium.augment.test.ts`. Its closing
  line restates the status block's `Left`.

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- The substrate's generalization beyond `AetherMixin` was found in
  code, not named anywhere in the slate as a decision to cut — it's a
  code-only finding, not slate content — but it directly bears on
  several slate claims above ("v1: AetherMixin" read as exhaustive;
  the flavor-agnostic lean; the active-set formula). Two insertions
  into `augmentation.md`:
  1. `## The mental model` — a new paragraph naming `CasterMixin`
     (`lib/magic/Caster.ts`) and `MakerMixin` (`lib/craft/Maker.ts`) as
     real, shipped `_augmentGated` consumers beyond `AetherMixin`.
  2. `### MixinApi.getActiveMixins / isActive` — a new paragraph
     documenting the third (employment) conferral leg
     (`EmployedMixin.getConferredMixinNames` →
     `collectAugmentConferralNames` in `api/mixin.ts`), with the
     on-shift bartender's `MakerMixin` as the concrete example.

### Superseded — cut
- `## The mechanism`'s core claim, "An augment is a `Stuff` occupying
  an anatomical/internal slot ... So effective capability = innate
  baseline + slotted contributions" — by `augmentation.md § The
  three-base capability model`: a capability can now also be a hosted
  `Idea` **update** (comms, credential wallet) on an aether host, not
  only a carried/slotted `Thing`. The doc's own "Canonical statement"
  callout says so explicitly.

### Kept (UNBUILT)
- `### Forms` (implant/prosthetic/graft) — only the implant form
  shipped (`AetherImplant`); prosthetic/graft have no code.
- `### The three operations` (add/replace/enhance) — only "add"
  (baseline implant) shipped; no `replace`/`enhance` augment exists
  and no doc section states this taxonomy.
- `## The mechanism`'s "Condition & failure" paragraph (hardened
  baseline, trust boundary, spoofed-ESP espionage framing,
  install/remove as medical procedure with risk/recovery/rejection,
  "a rich nursing-pedagogy scenario") — none of this narrative exists
  in `augmentation.md`, which only names the reserved bullets
  ("Failure modes / power state / jamming / spoofing") without the
  why. Restored the body-region enumeration alongside it (bookkeeping
  for the Slot-model open question's forward reference — see Cut
  section).
- `## The baseline implant` bullet 3, "DM is the tutorial on-ramp" — no
  onboarding/tutorial flow found under `packages/server/src/mud` or
  `packages/content` (grepped for "have an implant", "onboard").
- `## Character generation` bullets 2–3 (optional starting-augment
  loadout; in-world acquisition via install) + closing paragraph — no
  char-gen augment code exists (confirmed: no `augment` references
  under any char-gen/enroll/draft controller).
- `## Open questions / forks` — Slot model (#1, was #5): only `cranial`
  capacity 1 exists; no regional slots, no `_grantsSlots` consumer; the
  2026-06-12 fast-travel collision precedent is unique history found
  nowhere else. Prosthetic↔vitals boundary (#2, was #6): no code.
  Effective-capability resolution (#3, was #7): `_grantsModalities` is
  the only grant kind consumed in v1 per `augmentation.md`'s own
  "Substrate" section — motor/vital/attribute-mask grants are
  declared but unconsumed. Cognitive augments vs RPG capability (#4,
  was #9): no capability/skill system exists yet.
- `## Build order` Wave 2 (mixed: install/remove procedure and the
  translation augment are unbuilt; kept whole per the mixed-paragraph
  rule) and Wave 3+ (fully unbuilt).
- Framing intro, `See also`, `## What this slate does NOT cover` —
  spine, unchanged.

### Uncertain — kept
(none)

### Doctrine
(none — the flavor-agnostic principle was resolved as
SHIPPED·UNDOCUMENTED via the CasterMixin graduation rather than kept as
undecided doctrine)

### Handoff (belongs in a doc outside my list)
(none. `comms.md` already documents "`AetherImplant` is granted only by
`Avatar`'s default loadout; no NPC row" — the note this batch's brief
asked me to check for — so no handoff needed there. `combat-hooks.md`'s
"augment carrier" is an unrelated term — the carrier of a combat
`augmentInflict` damage-spec hook (a weapon), not this subsystem's
augments; confirmed by reading the surrounding text. No
measure/analyze/instrument content exists in this slate, so no
instrumentation-slate overlap.)

### Status block
- Left: *the medical install/remove procedure · the char-gen augment
  loadout · translation, prosthetic, sensor, motor and cognitive
  augments · the failure and hacking modes* → same four items, each
  annotated with what's actually shipped today (only the baseline
  implant/cranial-slot form; only `cranial` capacity 1) plus a new
  fifth item, the multi-region slot model — all still true; nothing
  removed, wording tightened.
- Size: a wave → a wave (unchanged — still substantial: a medical
  procedure, char-gen surface, a multi-item augment roster, and a
  failure-mode layer).
- Status: PARTIAL → PARTIAL (unchanged).

## docs/subsystems/augmentation.md — insertions

Two short paragraphs inserted (SHIPPED · UNDOCUMENTED graduations),
~13 lines total. Anchors:

1. `## The mental model`, after the existing "For most mixins ...
   uniformly across both kinds." paragraph: names `CasterMixin` and
   `MakerMixin` as real `_augmentGated` consumers beyond `AetherMixin`.
2. `### MixinApi.getActiveMixins / isActive`, after the existing
   "innate⊕acquired union" paragraph: documents the employment
   conferral leg (`collectAugmentConferralNames` in `api/mixin.ts`)
   with the on-shift `MakerMixin` example.

No existing sentence in `augmentation.md` was edited or removed.
