# Slate-compaction pass — civics batch

Two slates. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `civics.md` ·
`influence.md` — **neither needed an insert**: everything shipped that
either slate describes is already stated in the doc it points at, so the
batch is cuts + re-stamps only. Line numbers below are the ORIGINAL file's.

---

## docs/slates/builds/legal-code-slate.md — 1640 → 1627 · Status PARTIAL → PARTIAL

The whole slate is UNBUILT design over a shipped substrate that is not its
own. Grep (`packages/server/src/mud/**`, `packages/content/**`): no `law`
in `lib/document/DocumentKinds.ts` (kinds: `msh · release · emote · recipe
· name-bank · blueprint · command-view · archetype · water-right · herd ·
bill-of-lading · warehouse-receipt · rate-card`); no `LawApi` / `LawLogic`
/ `LawCatalogue`; no `docket` anywhere (and no `docket` stanza on
`platform/cmd/civics/government.yaml` — only `list` / `residency`); no
`writers` in `api/document.ts` / `DocumentLogic.ts`; no `totalStanding`,
`enfranchised`, `passage_threshold`, `vote.quorum`, `holdThrough` or
crossing hysteresis (the only `hysteresis` hits are `Condition.ts` /
`ThermalRegulation.ts` / `Vitals.ts` — body state, unrelated); no
`delegat*` in `api/conviction.ts` / `ConvictionLogic.ts` / `lib/standing/`;
`Government.charter` is a pointer-only string (`platform/idea/Government.ts:56`,
*"pointer only in v1"*). What IS shipped: `ConvictionApi` `hold / abstain /
flip / drop / positionOf / tally / quorumWeight` (`api/conviction.ts:72–149`)
over `positions` (`schema/positions.yaml`), `conviction.buildPeriodSeconds`
(`platform/content/settings/conviction.yaml`), the `release` document kind in
the tree — and `influence.md § Conviction` + `§ Present vs absent (quorum)`
state every commitment the slate lists. `civics.md § Deferred / never` says
*never: statute engine, trials, arrest* and *deferred: the charter as a
readable StoredDocument* — consistent with keeping all of this as design.

The status block's PARTIAL is kept as written: its own rationale sentence
(*the substrate it sits on shipped … no legal machinery*) is exactly the
PARTIAL definition (substrate shipped, surface remains), and the passage
rule is a surface over the shipped conviction substrate.

### Cut (SHIPPED · DOCUMENTED)
- `## Conviction weighting — shipped, and what actually remains` → the *"What exists"* paragraph + the two-line formula block + `### Four commitments the shipped math already makes` (1085–1115, 31 lines) — code: `api/conviction.ts` (`hold`/`abstain`/`flip`/`drop`/`positionOf`/`tally`/`quorumWeight`), `platform/idea/api/ConvictionLogic.ts`, `lib/standing/Position.ts` + `ConvictionTally.ts`, `settings/conviction.yaml`; doc: `influence.md § Conviction` (the ramp, full weight/no pool, non-fungible by stock, *"code, never keys"*), `§ Present vs absent (quorum) — abstain` (present-net-zero at full standing, the founder-supermajority case, quorum conviction-independent). One pointer line left; the section's correction blockquote (1080–1083) already pointed at the doc and stays, as do *What was missing*, *Passage is a crossing* and *delegation* (unbuilt)
- `### Sibling candidates for the tree` → the **`bulletins`** bullet (845–849, 5) — shipped exactly as proposed: `DocumentKinds.release`, `lib/press/Release.ts`, `PressBoard` as a warm cache over the tree; doc: `press.md § 3. A release lives in the document tree, not a system collection`, and its retirement table l.424 (*the `bulletins` collection — retired — the tree*). No `bulletins` in `schema/`. Struck bullet + pointer left; the **recipes** bullet is kept (recipes are a document kind now, but the per-institution book under a `writers` policy is unbuilt)

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none — nothing shipped here is missing from `influence.md` / `civics.md` / `press.md` / `document-store.md`

### Superseded — cut
- none

### Kept (UNBUILT)
- the framing (*Captured 2026-07-31* + the brief) · *Related:* (every link resolves — `enforcement` / `policing` / `amendment-library` / `branch-policy` / `cooperative` / `press` / `prison` / `freight` / `ranged` all under `docs/slates/builds/`)
- `## The substrate` — the extent-rooted rule (`<extent>/law/`) + the CORRECTED block + the open realm/city tier question. Kept whole: the first paragraph mixes a shipped fact (kind-agnostic `StoredDocument`) with the unbuilt claim (*a law is a StoredDocument of kind `law`*) in one paragraph
- `## The instrument taxonomy` · `## Shipping with laws on the books: received law` · `## A law is prose plus typed clauses` (its *⚠ Open* bullet is answered later in the slate, not in code — kept) · `## History: append-only` · `## Deliberation pointers` (no `deliberation` field anywhere) · `## Each charter declares its own enactment process` · `## Hierarchy is declared, never assumed`
- `## Codification and chronology` (all: the Roll, the Code, *as it stood*, subject placement, the three layers + `LawCatalogue`, conflict detection, naming)
- `## The docket` (all: placement, the sweep + its seven sub-rules, the closed kind vocabulary, the press payoff, sealing, `government docket`, the naming call)
- `## Prose ⊗ clause authority — RESOLVED` (all — resolved in design, not in code; `ProseApi` Liquid ships (`api/prose.ts`, `prose.md`) but nothing renders clause values)
- `## Sunsets` (all) · `## The founding corpus` (all — content work; nothing under any `law/` path in any pack)
- `## Storage — the tree` (all except the `bulletins` bullet): the principle, the Compact exception, the `writers` dependency (→ branch-policy-slate), the residual gap table, the recipes bullet
- `## The catalog and adoption` (all) · `## The enactment check` (all — no proposals branch, no `LawApi.vote`/`enact`; `CompactApi.committeeOf` ships so the *committee — now-ish* row is still accurate)
- `## Conviction weighting` → the correction blockquote · *What was missing: the passage rule* (still true — nothing says "passed") · *Passage is a crossing* · *The bigger remaining gap: delegation*
- `## The vote as spectacle` (all — see Doctrine for the argument subsections; the design rails and build notes are unbuilt: no bill card, no ticker stance)
- `## The passage rule — RESOLVED` (all — the two ratios, breadth⊗depth, the reservoir conflict, the latch, emergencies, *Buildable today*)
- `## The roll — disenfranchisement by inactivity` (all — no `enfranchised(subject, stock)`; the `ConsumerLogic.ts:240` comment *"notoriety disenfranchises"* is renown, a different concept)
- `## Open questions (for requirements)` — spine; the struck items are resolved **in this slate's own design**, not in code + doc, so the wave-1 ruling (cut answered questions with a pointer) does not apply

### Doctrine — kept, for the coordinator's home decision
- `## Worked example: the turnpike trust` — an argument that the instrument taxonomy does real work, not a backlog item
- `## The vote as spectacle` → `### The spectacle object is a countdown, not a gauge` · `### Flip economics` · `### Every stake is a fading number times a growing one` · `### The real risk is apathy, not volatility` (its *never reward holding a position* rail is doctrine; its quorum-floor lean is in `Left`) · `### This confirms hold-through`
- `## Sunsets` → `### The magic` · `### The honest counterweight` (*a polity adopting sunsets is redistributing power*)
- `## The founding corpus` → `### The rule separating provocation from endorsement` · `### The volume rule`
- `## The docket` → `### The sweep — a backstop, not a heartbeat` (*a sweep exists only where a state change must be stamped*) and `#### ⭐ The consequence: enactment has no human actor`
- `## The roll` → `### Why it is excellent pedagogy`

### Uncertain — kept
- `## The passage rule` → `### ⚠ The reservoir conflict — constitution vs. shipped build` — **still live**: `docs/governance/draft-constitution.md` l.164–179 still describes the capped regenerating reservoir (*"remains to be specified"*) and l.200–202 still has the sponsoring allocation + survival floor; the shipped rule is full-weight/no-pool (`influence.md § Conviction`). The slate's *keep no-pool, rewrite §4* recommendation has not been executed; requirements must carry it as a decision. Overlaps `cooperative-slate § RESOLVED (2026-07-31): the kernel's conviction rule shipped — no pool` (l.412)
- `## The enactment check` → `### What this makes buildable` — its *Compact — needs the weighting only* row is contradicted by the slate's own next section (the weighting shipped; the passage rule was the gap). Kept verbatim; the slate self-corrects in place
- `### The bigger remaining gap: delegation` — the design lives in `cooperative-slate § Delegation, re-derived for no-pool` (l.841) + `§ Synthetic constituents` (l.974); this slate keeps only the pointer paragraph + the clock question. Two-slates rule: kept in both; merge candidate for the cluster pass
- `## The roll — disenfranchisement` ↔ `amendment-library-slate § The roll: disenfranchisement by inactivity` (l.361) — same open thing in two slates; kept in both
- `### The named dependency: a writers branch policy` ↔ `branch-policy-slate.md` — this slate says *designed in its own slate*; the mechanism is in neither code nor `document-store.md`. Kept in both
- `### The veto window` / `#### A veto does not kill a bill` ↔ `amendment-library-slate § The executive veto` (l.268–351) — overlap; kept in both
- `### Sibling candidates` → the **recipes** bullet — *"the global `recipes` catalog"* is stale wording (recipes are a document kind since content-packs wave 2, `document-store.md` l.10–14), but the per-institution book + `writers` policy it proposes is unbuilt; kept whole per the paragraph rule
- `### Build notes (both cheap)` — cites `NewsTickerCard`; the only client hit is `layouts/__tests__/affordanceRouting.test.ts`, so I could not confirm the ticker card still exists under that name. Kept

### Handoff (belongs in a doc outside my list)
- none

### Status block
- Left: *the append-only Roll + the derived Code · the instrument taxonomy + the closed clause-`kind` vocabulary · prose⊗clause authoring tooling and its lint · sunsets · the docket · the enactment check (three weight resolvers) + the passage rule (two ratios over `totalStanding`) · delegation · the disenfranchisement roll · the `writers` branch policy · citation format · drafting the founding corpus* (12 items) → the body-derived list (20 items): adds the extent-rooted placement + the realm/city tier re-derivation, received law, deliberation pointers, the charter-declared process + declared precedence, the Compact's own store + per-institution recipe books, the catalog + adoption, the Art. IV §4 rewrite, and the spectacle surfaces — all in the body and unrepresented before
- Size: a build → a build

---

## docs/slates/tails/household-design-pack.md — 443 → 434 · Status PARTIAL → PARTIAL

Grep: no `householdOf` / `household` anywhere in `packages/server/src/mud`.
The tenure substrate is live — `ParcelRegistry.grantUse` / `revokeUse` /
`hasUseGrant`, `ParcelRecord.hasActiveGrant`, `heldUnitOf` **and**
`heldUnitsOf` (`ParcelRegistry.ts:522,544`; `TitleController.ts:485` reads
`heldUnitsOf` for the ascent gate), the sandbox reap
(`lib/sandbox/SandboxCrossingExit.ts`) — and `parcel.md § grants[] — the
use-grant (lease), and it is LIVE` carries the 2026-08-06 correction the
pack asked for. Domicile: `Character._domicileAddress`, `GovernmentLogic`
`residentOf` / `domicileAddressOf`, stamped by `ProvisionController` and the
Mayfield `LeaseController` — `civics.md § Residency + the domicile seam`.
`ParcelOwner` now has three kinds (`player | group | organization`,
`ParcelRecord.ts:59–61`). **Condition shipped as the shell weathering clock
only** (`holding.md § Condition — the weathering clock`: `shellCondition` +
`shellStamp`, calendar-driven, reconciled on read, *no scheduler*); no
act-deposited producer, no `(actor, target, extent)` event —
`room-condition-design-pack` is stamped UNBUILT (*only `wash` ships*).
Contract clauses admit a **closed** template vocabulary
(`CONDITION_TEMPLATES`, `contract.md` l.120) with no condition-band
template. No marriage / registry-record kind (`civics.md § Deferred`).

### Cut (SHIPPED · DOCUMENTED)
- `### The tenure substrate is built, and the doc says otherwise` (102–119, 18 lines) — code: `platform/idea/ParcelRegistry.ts` (`grantUse`/`revokeUse`/`hasUseGrant`/`heldUnitOf`/`heldUnitsOf`), `lib/parcel/ParcelRecord.ts` (`UseGrant`, `hasActiveGrant`), `lib/sandbox/SandboxCrossingExit.ts` (the reap); doc: `parcel.md § grants[] — the use-grant (lease), and it is LIVE` (*"Corrected 2026-08-06 … previously described `grants[]` as a present-but-inert 0a seam"*) — the doc fix the subsection demanded is done, and its `heldUnitOf` *v1 assumption* bullet is superseded by `heldUnitsOf`. One pointer line left

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none

### Superseded — cut
- none

### Kept (UNBUILT)
- `## Part 0` (framing) · `## Part 1` (the two-sets table, *Both reads ship* — `householdOf` is the unbuilt surface, `### The two shapes of household`) · `## Part 2` (the collective gate / individual transcript split — the ascent gate ships per-holder over `heldUnitsOf`, not over a household) · `## Part 3` · `## Part 4` (household contract clauses — unbuilt; see Uncertain) · `## Part 5` · `## Part 6` (marriage — deferred in `civics.md`) · `## Part 7` (the format table — see Uncertain for its two stale rows) · `## Part 8` · `## Part 9` (the attribution constraint — unbuilt; see Uncertain) · `## Part 10` · `## Interop map` · `## Forks settled, and the blockers` · `## Open questions`
- the second `> **Status: design, planner-ready…**` block (17–24) — **kept deliberately** against the one-status-block calibration: it is the pack's only framing paragraph (*designs the multi-occupant case and finds it needs no new primitive*) fused into one blockquote with the status line, and its state (*design, not requirements*) still holds. Per the coordinator's instruction its `spoilage-design-pack.md` link (retired) is retargeted to `docs/subsystems/spoilage.md` — the one non-cut edit in this batch

### Doctrine — kept, for the coordinator's home decision
- `## Part 0 — with one holder a mirror, with two a commons` (the thesis)
- `## Part 3 — aggregate, never report` (a rule about what NOT to build; nothing to ship)
- `## Part 5` → the *SAFETY property* blockquote (*evicted, never stripped* — a constraint on any future eviction change; a candidate for `parcel.md`'s or `chattel.md`'s *Why*)
- `## Part 10 — Pedagogy`

### Uncertain — kept
- `## Part 2` → *"property condition's two biggest inputs are act-deposited and freeze in absence, so a household does not rot while its members are away"* — **contradicted by the shipped axis**: the shell clock weathers on the calendar and explicitly does not freeze (`holding.md`: *"honest across a restart and across a holding sleeping for a month"*; a regression pins a game YEAR from sound to dilapidated). The act-deposited half is the unbuilt room-condition producer. Kept verbatim; requirements must reconcile which condition the household commons reads
- `## Part 0` → *"the room-condition build has not happened yet"* and `## Part 9` → *"Room condition is designed and unbuilt"* — still true for the deposit producer; misleading now that a condition axis exists. Part 9's *"✅ Landed 2026-08-06 in the room-condition pack Part 1"* landed in a **design pack**, not code
- `### The two shapes of household` — *"`ParcelOwner` is single-valued (`{kind:'player'}` | `{kind:'group'}`)"* is stale: the organizations build added `{kind:'organization'}` (`ParcelRecord.ts:61`), which may be the better co-ownership vehicle than a two-member managed group (bears on Open Q1). Kept whole
- `## Part 7` → the format table's *🧹 `parcel.md` "inert grants[]" claim — doc fix* row is DONE, and *✳ Move-in / move-out — ships* is confirmed; both are table rows (below paragraph granularity), so the table is kept whole
- `## Part 4` — *"a clause like 'each holder keeps the premises above `well-kept`' is verifiable against a read that already exists"* — the band vocabulary that shipped is `sound · weathered · worn · shabby · dilapidated` (no `well-kept`), and `contract.md`'s clause conditions are a closed `CONDITION_TEMPLATES` vocabulary, so a condition-band clause is kernel work, not content. Kept; reflected in `Left`
- `## Forks settled, and the blockers` → *"⚠ Multi-residence. `heldUnitOf` carries a v1 assumption … `civics.md` defers primary-home designation"* — half-closed: the v1 single-dorm assumption is gone (`heldUnitsOf`, and the ascent gate reads every holding), which is what the status block's *"blocker 2 closed"* means; but **primary-home designation is still deferred** (`civics.md` l.120 + `§ Deferred`, `parcel.md` l.140). Kept verbatim; `Left` now names primary-home designation
- `## Open questions` Q5 — *"revisit if a player can legitimately hold two residences"* — they now can (`heldUnitsOf`); the question is live, not moot. Kept (spine)
- Overlaps for the cluster pass: the collective ascent gate ↔ `residence-ladder-design-pack` (parent; its `Left` still names room condition as a producer); Part 9 ↔ `room-condition-design-pack` `Left` (*the attributed `(actor, target, extent)` deposit/clear events*) — the same open thing in three slates

### Handoff (belongs in a doc outside my list)
- none — the `parcel.md` correction the pack asked for is already in `parcel.md`

### Status block
- Left: *`ParcelApi.householdOf(extent)` · the gate made COLLECTIVE plus the leave-and-ascend-alone exit · household contract clauses over the derived condition read · co-ownership as a managed group `ParcelOwner` · the marriage bundle + registry record · Q2* (6 items) → the same six, qualified from the body (contract clauses need a condition-band template in the closed vocabulary; the group owner kind ships but the household flow is undriven), **plus** the act-deposited condition producer with actor attribution (Part 9, unbuilt — the shipped axis is the shell clock) and primary-home designation across two holdings (the blocker half that did not close) (8 items)
- Size: a wave → a wave

---

## Notes for the coordinator

1. **Zero inserts.** Both subsystem docs on my write list were already complete for everything shipped; `git diff --stat` shows only the two slates + this ledger.
2. **The legal-code slate barely shrank (13 lines) and that is the honest result.** It is 1,600 lines of unbuilt design; the only shipped block in it was the conviction math, which `influence.md` states in full. Its `Left` grew from 12 to 20 items because eight designed things were in the body and unrepresented.
3. **The one non-cut edit** is the retargeted `spoilage-design-pack.md` link in the household pack, per the batch instruction.
4. **Hardest calls:** (a) keeping the household pack's second status block — it is the only framing paragraph, fused with the status line; a stricter reviewer may cut it and accept losing the framing; (b) the reservoir conflict — the draft constitution still contradicts the shipped no-pool rule, so it is flagged Uncertain rather than treated as resolved by the slate's recommendation; (c) leaving the legal-code Open questions' struck items in place — they are resolved by the slate's own design, not by code, so the wave-1 ruling does not reach them.
