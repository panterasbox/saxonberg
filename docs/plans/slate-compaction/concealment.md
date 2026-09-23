# Slate compaction ledger — batch `concealment`

Agent scope: `docs/slates/tails/search-slate.md`,
`docs/slates/tails/concealment-detection-slate.md`. Insert-only into
`docs/subsystems/concealment.md` and `docs/subsystems/stealth.md`.
Everything else is cut-only per the `compact-slate` skill.

## Findings (repo-verified, not from slate ✅ markers)

- `effectivePerceptionImpl` (`PerceptionLogic.ts`) is still exactly
  `capacityOf(viewer) + attention + lightConditionsFor(viewer, target)` —
  no equipment term. Confirmed unbuilt.
- `setConcealment` still has exactly two production callers
  (`ArmController`, `Exit`) — nothing spawns concealed at mint. Confirmed
  unbuilt.
- No `camouflage`/`matchesBiome`/terrain-matched concealment anywhere in
  `packages/server/src/mud` or `packages/content`. Confirmed unbuilt.
- `AssessController` (shipped, `perception` category) is a **combat/
  medical condition readout** (wounds/poise band), not the pre-combat
  "threat read" (armor/renown/skill/bluff) the concealment-detection
  slate's "Threat reads" section designs. **Naming collision**: a future
  build of that design cannot simply reuse the verb name `assess` — it's
  taken by a different, shipped feature. Flagged in that slate's Uncertain
  list.
- No graded awareness states (`safe`/`threat present`/`threat located`),
  no morale↔ambush interaction (`grep morale` in `Morale.ts`/
  `CombatSession.ts` has no ambush hits), no ambush→coup compression
  (`Coup.ts` has no ambush awareness), no "detection net"
  (allies/lookout/pet) substrate. All confirmed unbuilt — kept in the
  slate.
- Combat is no longer a declared 1v1 (multi-party `CombatGraph` ships,
  per `docs/subsystems/combat.md`), so the concealment-detection slate's
  "Cycle-1 combat is a declared 1v1" deferred-boundary bullet is
  SUPERSEDED by the code.
- The presentation-build "two gates disagree" (`perceives` vs `canSee`)
  tail is still live in `LookController.ts` (comment: "it is not this
  build's to settle") — SHIPPED·UNDOCUMENTED (the local fix + its
  rationale) with a genuinely still-open reconciliation. Graduated the
  decision into `concealment.md § Known tension`; kept a one-line open
  pointer in the slate.

---

## docs/slates/tails/search-slate.md — 286 → 233 lines · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- `## ⭐ What already ships — audited 2026-09-02` (54 lines) — code:
  `PerceptionLogic.ts` (`effectivePerceptionImpl`, `capacityOf`,
  `hintsFor`, `resolveSearch`), `Concealable.ts`, `SearchActivity.ts`,
  `LookController.ts`; doc: `concealment.md` §§ "The gate", "The
  detection surface", "Passive hints + active search", "The `awareness`
  Discipline", "The care↔speed detection axis". Replaced with a 9-line
  compact confirmation (re-verified against code, not just re-asserted)
  ending in the same "equipment half is missing" callout the slate's
  argument turns on.

### Kept (UNBUILT) — unchanged
- `## ⚠ The gap — one thing, two sides`
- `## ⚠⚠ Nothing in the world is ever placed hidden`
- `## The design surface` (all four numbered subsections)
- `## Open questions`
- `## Cross-references`
- The framing blockquotes at the top (Captured/User-framing/"Read the
  audit first") — kept verbatim as spine/history even though the audit
  they point at is now a pointer rather than inline detail; the claim
  ("search is in better shape than expected") still holds.

### Status block
- Left: unchanged (equipment term · terrain-matched camouflage ·
  concealment-at-mint · standing search posture + hint aggregation) —
  the body still names exactly these four items, nothing else.
- Size: unchanged — a wave.
- Status: unchanged — PARTIAL.

---

## docs/slates/tails/concealment-detection-slate.md — 236 → 168 lines · Status PARTIAL → PARTIAL

### Cut (duplicate status block — history, not the canonical claim)
- The second `> **Status: MOSTLY SHIPPED (MR!142 + MR!145).**` narrative
  block (lines 11–30 of the original) — superseded by the canonical
  `> **Status: PARTIAL**` block immediately above it (pilot rule: one
  status block, keep the canonical one).

### Cut (SHIPPED · DOCUMENTED)
- `## Thesis 1 — One concealment gate on every perceivable` (whole
  section, 20 lines) — code: `Concealable.ts` (`ConcealableMixin`
  composed on `Thing`/`Creature`/`Exit`), `PerceptionLogic.ts`
  (`perceives`); doc: `concealment.md` § "The gate —
  `ConcealableMixin` + `ConcealmentLevel`" + § "Honest fog". Replaced
  with a one-line pointer.
- Thesis 2 bullet "The honest surprise attack…" — code:
  `AttackController`/`openSessionImpl` ambush handling; doc:
  `stealth.md` § "Ambush denies the poise contest" (word-for-word same
  claims: poise denial, deterministic open strike, not a damage
  multiplier). Removed outright (nothing else in the slate refers back
  to it).
- Thesis 2 bullet "PC/NPC asymmetry…" — code: the wire-shape leak test +
  `perceives` gate; doc: `concealment.md` § "Honest fog — the
  enumeration seams" (server-authoritative, never sent to client, no
  metagaming — same claims). Removed outright.
- Thesis 3 bullet "Passive vs. active…" — doc: `concealment.md` §
  "Passive hints + active search". Removed outright.
- Thesis 3 bullet "Honest resolution (anti-slots + anti-tedium)…" —
  doc: `concealment.md` § "The detection surface" ("pure and
  deterministic… monotone in attention"). Removed outright.
- "Deferred / boundaries" bullet "Belief generalization…" (identity
  memory → world-facts) — code: `BeliefStore.ts`'s `DISCOVERY` realm +
  `found` payload flag; doc: `concealment.md` § "The `DISCOVERY` belief
  realm". Removed outright.
- `## ⭐⭐ Tail from the presentation build (2026-09-11)` (28 lines) —
  the local fix + its rationale graduated into `concealment.md` §
  "Known tension: `perceives` vs `canSee`" (new subsection, ~15 lines,
  inserted before "Deliberate v1 boundaries"). The still-open
  reconciliation is kept as one line in the slate (see Kept, below) and
  added to `Left`.

### Superseded — cut
- "Deferred / boundaries" bullet "Combat's slice… Cycle-1 combat is a
  *declared* 1v1" — superseded: combat is no longer 1v1-only (multi-party
  `CombatGraph` ships, per `docs/subsystems/combat.md`), and
  surprise/ambush is no longer a *deferred* alternate initiation — it
  already shipped (`stealth.md` § "Ambush denies the poise contest").
  One-line note left in place naming both docs.

### Kept (UNBUILT) — unchanged
- `## Thesis 2` heading + its shipped-summary blockquote + framing
  paragraph ("Stealth is managing others' belief about you…")
- Thesis 2 bullets: "Awareness is the pivot…" (graded `safe → threat
  present → threat located` states — not built, only a boolean
  `perceives` check ships), "Three depths…" (`unsuspected`/
  crowd-assassin not built), "Multi-sense…" (channel-specific hiding —
  explicitly still deferred per `concealment.md`'s "Deliberate v1
  boundaries" and `stealth.md`'s "Deferred"), "Surprise × morale…" (no
  ambush↔morale code), "Assassination = two-stage death compressed by
  surprise…" (no ambush↔`Coup` interaction), "Counter-play…" (mixed —
  `wary` brain ships, "detection net" does not), "Blame/initiation…"
  (mixed/uncertain, see below)
- `## Thesis 3` framing paragraph + bullets: "Multi-modal + tools +
  deduction" (tools/deduction unbuilt — overlaps search-slate's
  equipment-term gap), "Found → belief → a knowledge economy" (found→
  belief ships; the economy itself is the named `Left` item), "Players
  hide things too" (mixed — `arm`/`TrapKit` ships per `stealth.md`;
  generic stash/conceal + `frisk` do not), "Content discipline" (kept as
  Doctrine, see below)
- `## The verb-surfaces over the one gate` (short index; `frisk` and
  disguise-as-concealment unification are still unbuilt, so the list as
  a whole isn't fully shipped)
- `## Threat reads (sizing someone up before combat)` — entirely unbuilt
  as designed; see Uncertain (naming collision with the shipped `assess`
  verb)
- `## Deferred / boundaries` — "The knowledge economy" bullet (matches
  `Left`)
- `## Cross-references` — untouched

### Doctrine
- Thesis 3 bullet "Content discipline (non-negotiable): secrets are
  rewards and shortcuts, not required paths…" — a design thesis about
  what discovery is *for*, not a backlog item. Kept verbatim, not folded
  into `Left`.

### Uncertain — kept
- Thesis 2 bullet "Blame/initiation…" ("opening a session with the
  target unaware marks the ambusher as the aggressor") — looked for
  `aggressor`/`initiator` handling specific to ambush in
  `CombatTerms.ts`/`CombatLogic.ts`; found only the *generic* initiator/
  consent record every combat open carries (`CombatTerms.initiator`,
  documented in `combat.md`), not an ambush-specific "marks as
  aggression" beyond the existing `crime`-via-accountability path
  already in `stealth.md`. Unsure whether the generic record already
  satisfies this bullet or whether it names a still-missing distinction.
- `## Threat reads` section — the shipped `assess` verb
  (`AssessController.ts`) is a **different feature** (combat/medical
  condition readout), not the pre-combat threat-sizing design this
  section describes. The verb name is taken; a future build of this
  design needs a new verb or to extend `assess`'s scope. Not cut because
  the described feature does not exist; flagged because the slate's own
  closing line ("the same `assess` verb, threat-scoped, no new
  substrate") is now false and would mislead a future builder.
- Thesis 3 "Players hide things too" bullet's `frisk` clause overlaps
  the `Left` line in this slate's own status block *and* `stealth.md`'s
  "Deferred" list — noted, not merged (cluster pass's job).

### Handoff (belongs in a doc outside my list)
None — every graduation this pass made belongs in `concealment.md` or
`stealth.md`, both in scope.

### Status block
- Left: `the knowledge economy (sharing / selling / transferring found
  secrets, maps as currency) · frisk and searching a downed body ·
  player-placed concealment beyond pick-up-your-own · ranged / remote /
  linked traps · resettable / rearming traps` →  **grown** to add:
  `· graded awareness states (safe→threat-present→threat-located) as
  the ambush initiation seam · ambush's interaction with morale + the
  two-stage-death (coup) compression · multi-sense (channel-specific)
  hiding · a detection net (allies/lookout/a keen-sensed pet) ·
  deduction-from-clues search · the out-of-combat threat read (name
  collision: assess already means the combat/medical condition
  readout) · reconciling perceives/canSee as one gate`. The body wins —
  all of these are UNBUILT sections/bullets still present after the
  cuts above.
- Size: unchanged — a wave (nothing here needs a new subsystem; all
  rides perception/combat/belief/locomotion substrate that already
  ships).
- Status: unchanged — PARTIAL.
