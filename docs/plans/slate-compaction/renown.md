# Slate compaction ledger — batch `renown`

Slates: `docs/slates/builds/reputation-slate.md`,
`docs/slates/builds/standing-mint-slate.md`.
Insert-only target: `docs/subsystems/renown.md`. Anything belonging
elsewhere (influence.md, participation.md, chronicle.md, belief.md,
polity-decision-register.md, wiki.md, …) is a Handoff line, never an
edit to that doc.

## Findings before cutting

- `docs/subsystems/renown.md` already documents, verbatim in substance:
  the regard/renown/susceptibility unbundling (its "Where renown sits"
  table), the signed esteem/notoriety axis with asymmetric decay
  half-lives (`renown.decayHalfLives`, legislated knob), the per-scope
  (`Group` ∪ locality) derive that supersedes "per-circle scoping" and
  the "frontier reset" narrative, and the authored-reputation seeder
  (`RenownApi.seedTo`) that covers the NPC-consumption angle raised in
  reputation-slate's "NPCs" section. No new graduation into renown.md
  was needed — everything code-verified as shipped was already stated
  there.
- `docs/polity-decision-register.md` **D9** ("The engine measures and
  may publish; it is never the only rater", Tier 2) already carries
  standing-mint-slate's Parts 2/3/4 near-verbatim (the "scalar is
  produced by the decision" argument, the plurality-not-abstention
  rule, the market-condition rule), and Tier 3's "What conduct confers
  standing, and at what weight — the mint" bullet explicitly hands the
  *political* argument back to `standing-mint-slate.md` **by name**,
  saying it is deliberately not decided and both opening arguments are
  "handed over intact" there. That means standing-mint-slate is not
  simply an antiquated design note — the register treats it as the
  **canonical carrier** of the still-live political argument, and
  Parts 5/6/7/8/9 (the two-layer framework, the distributional impact
  statement, the required-pathologies argument, intrinsic/extrinsic,
  wiki-carries-arguments) are kept for that reason even though no code
  exists for any of them.
- No code evidence anywhere in `packages/server/src/mud/**` or
  `packages/content/**` for: susceptibility, NPC renown/regard
  consumers beyond `Cast`'s authored seeding, disguise-piercing
  wanted-profiles (`watch-for`, `distinctiveFeatures`), brand-trust
  reading renown, eigenvector/reactor-weighted renown, published
  weights as content, the distributional impact statement, rater
  agencies, disclosure-regulation law, or an audit vocation. All of
  these stay UNBUILT.
- `docs/subsystems/participation.md` / `influence.md` ship the
  `engagement × renown` consumer-influence projection (`ConsumerLogic.
  standingOf`) — this **is** reputation-slate's "governance-influence
  coupling," shipped in a different shape than imagined (no ballot
  consumes it yet, but that gap is tracked in influence.md/
  participation.md's own Deferred lists, not here).

## docs/slates/builds/reputation-slate.md — 364 → 343 lines · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- Second (narrative) status block (9 lines) — one-status-block rule; the
  canonical block above already says the same thing.
- `**Propagation asymmetry (flavour)**` paragraph — code: `renown.decayHalfLives`
  in `platform/idea/api/RenownLogic.ts`; doc: `renown.md` § The value-function.
- `**Frontier reset**` paragraph — code: `RenownLogic`'s per-scope derive
  (`lib/standing/RenownStanding.ts`); doc: `renown.md` § Scope.
- Objective-groups / egocentric-circles bullet pair under "Per-circle
  scoping" — code: `GroupApi.sharedManagedGroups` read in `RenownLogic`;
  doc: `renown.md` § Scope + § Where renown sits.
- "Reactions / agreement", "Recognition-spread", "Being sought" bullets
  under "Measurement — what feeds renown" — superseded in-slate by the
  § Revisited 2026-08-02 pass immediately below (reactions confirmed
  shipped: `renown.md` § The two signal kinds).
- Open question 1 (valence richness) — resolved as leaned; doc:
  `renown.md`'s signed esteem/notoriety axis, per-scope.
- Open question 2 (decay rates) — resolved in shape; doc: `renown.md` §
  The value-function (`renown.decayHalfLives` legislated knob).

### Kept (UNBUILT)
- `## Principle — measure, don't assign` (kept as Doctrine — see below;
  the susceptibility/persuasion-resolution design is still unbuilt)
- `**Fame/notoriety symmetry**` paragraph — no fame/wanted-broadcast
  mechanic exists in code
- `## Notoriety pierces disguise — the wanted-profile` (whole section) —
  no `watch-for` realm, no `getDisguise().covers` consumer, no mutable
  `distinctiveFeatures` found anywhere in `packages/server/src` or
  `packages/content`
- The "bridge" paragraph under "Per-circle scoping" (eigenvector
  weighting still deferred per `renown.md` § Deferred)
- `**Anti-gaming = recursion**` paragraph (same eigenvector item)
- `### ⭐⭐⭐⭐ Revisited 2026-08-02…` (whole section, ~90 lines) — no
  code ties tips/repeat-interaction/contacts-use/tenure to renown; the
  section's own "(shipped)" annotations on reception/reactions rows are
  already accurate and left untouched (reformatting the table risked a
  rewrite, so the whole table stays)
- `## NPCs` (whole section) — susceptibility and per-NPC vs shared-
  reputation storage are both unbuilt (`Cast`'s `RenownApi.seedTo` use is
  authored-dossier seeding, already documented in `renown.md`'s closing
  section, not an NPC *consuming* another's renown)
- Open questions 3, 4, 5 verbatim

### Doctrine
- `## Principle — measure, don't assign` — the "measure, don't assign"
  thesis and the D&D-charisma-unbundles-into-three argument. `renown.md`
  states the conclusion tersely; this slate carries the fuller argument.

### Uncertain — kept
- None beyond what's listed as UNBUILT above with reasons given.

### Handoff (belongs in a doc outside my list)
- None. The one candidate considered — reputation-slate's
  "governance-influence coupling" Left item — is not a graduation; it's
  SUPERSEDED: `participation.md`/`influence.md` already ship the
  `engagement × renown` consumer-influence projection
  (`ConsumerLogic.standingOf`), documented there. Removed from the
  status block's Left list; no text needed elsewhere since those docs
  already carry it, complete with their own Deferred lists noting the
  still-missing ballot.

### Status block
- Left: `susceptibility · the NPC consumers · the governance-influence
  coupling · the substance economy's brand-trust · the
  anonymity/disguise counterweight · per-circle consumers · eigenvector
  trust-weighting` → `susceptibility · the NPC↔NPC consumers · the
  substance economy's brand-trust · the notoriety/disguise counterweight
  (wanted-profile, getDisguise().covers, mutable distinctiveFeatures) ·
  eigenvector trust-weighting · the revised measurement feed (repeat
  interaction, tips-by-distinct-tipper, contacts-weighted-by-use,
  tenure/re-rostering, being-sought)`
- Size: a build → a build (unchanged — the remaining body is still
  build-sized: disguise-piercing, susceptibility, the revised feed)

## docs/slates/builds/standing-mint-slate.md — 293 → 235 lines · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED — decided-and-recorded, not code)
- `## Part 2 — The scalar is produced by the DECISION, not the ledger`
  (whole section, ~22 lines) — doc: `polity-decision-register.md` § D9
  rationale carries this near-verbatim (the binary-choice-collapses-to-
  one-bit argument, the "relocates to whoever has the best scraper with
  private weights" point, the retracted "engine never values" line).
- `## Part 3 — Plurality, not abstention` (whole section, ~23 lines) —
  doc: D9's Decision field ("the engine records deeds and may publish
  weights and aggregates, but it must never hold a monopoly on rating…
  trust in a rater is itself renown").
- `## Part 4 — Where a scalar belongs, and where minting one is a lie`
  (whole section, ~20 lines) — doc: D9's Decision field ("ship a scalar
  only where the market condition holds… never manufacture one where it
  does not"); the can worked example already lives in
  `aluminium-can-slate.md` (cross-referenced, not this batch's file).
- Part 10's "**Ships (small, now-ish)**" bullet — doc: `chronicle.md`
  (deeds) + `renown.md` § Scope (per-scope derive), both pre-existing
  substrate this slate rode rather than built.

### Kept (UNBUILT / still-open political question)
- `## Part 1 — Yes, it is a morality score. Say it.` (the five tests) —
  D9 *references* tests by number ("test 4 fails", "test 5") but never
  restates them; this is their only home. See Handoff.
- `## Part 5` through `## Part 9` (the two-layer mechanical/political
  framework, the distributional-impact-statement design, the required-
  pathologies argument, intrinsic-vs-extrinsic, wiki-carries-arguments)
  — no code anywhere for a distributional impact statement, rater
  agencies, disclosure regulation, an audit vocation, or a wiki
  arguments-both-sides feature (`grep` for "argument"/"both side" in
  `docs/subsystems/wiki.md` found nothing on point). **These are also
  the two "opening arguments" that
  `polity-decision-register.md`'s Tier 3 bullet "What conduct confers
  standing, and at what weight — the mint" explicitly says are "handed
  over intact in slates/builds/standing-mint-slate.md"** — the register
  treats this slate as their canonical carrier, not a draft superseded
  by it. Kept in full for that reason.
- Part 10's "**Defers**" and "**Never ours**" paragraphs, and
  `### The three rules that outlive this slate` — all still true,
  matches the status block's `Left`.

### Doctrine
- Parts 1, 5, 7, 8, 9 (see above) are simultaneously "kept because
  still open" and doctrine in the compact-slate sense — arguments about
  what the design is *for*, not a backlog item with an implementation
  shape. Flagged here rather than double-listed.

### Uncertain — kept
- None new; see Handoff for the one loose end.

### Handoff (belongs in a doc outside my list)
- → `polity-decision-register.md` § D9: the **five tests** (Exit ·
  Published weights · Amendability-and-by-whom · Plurality · No
  coupling to unrelated goods) from Part 1, verbatim as they stand in
  the slate (lines 43–57 as of this pass). D9's rationale and tradeoff
  fields already cite "test 4" and "test 5" by number without ever
  defining them — the definitions currently exist only in this slate.
  Not inserted by me (outside my assigned doc list: only
  `docs/subsystems/renown.md`); left in place in the slate so nothing is
  lost, flagged here for the coordinator to graduate into the register
  if that inter-doc gap is worth closing.

### Status block
- Left: unchanged — `published weights as readable content · the
  distributional impact statement · rater agencies as a player
  institution · disclosure regulation as passable law · the audit
  vocation` (already matched the body before and after; only the
  now-redundant elaboration around it was cut)
- Size: a build → a build (unchanged)

---

## Coordinator (2026-09-20) — handoff applied

- `polity-decision-register.md § D9` — *The five tests* bullet inserted
  before the revisitation trigger, so "test 4" / "test 5" resolve inside
  the register. The slate keeps Part 1 as the canonical argument.
