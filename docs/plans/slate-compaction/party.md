# Slate-compaction pass — party batch ledger

One slate. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: this file plus
`docs/subsystems/party.md` (insert only). Code verified in
`packages/server/src/mud/platform/idea/Party.ts`,
`packages/server/src/mud/platform/idea/api/PartyLogic.ts`,
`packages/server/src/mud/platform/agent/Mercenary.ts`,
`packages/server/src/mud/lib/party/{PartyMember,PartyGroupProvider,
PartyRecord}.ts`, `packages/server/src/mud/lib/behavior/{backs-up,
combatant}.ts`, `packages/server/src/mud/platform/idea/api/__tests__/
PartyLogic.test.ts`. Also read `docs/subsystems/{grouping,
combat-formations,chat,advancement}.md` per the batch brief.

## docs/slates/tails/party-slate.md — 294 → 232 lines · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- Second status block's first paragraph ("Status: design-phase,
  deferred-rpg... Nothing here is a build") — stale; most of what it
  says is undefined is now built. The second paragraph ("The governing
  discipline...") is DOCTRINE, not status — kept in place, see Doctrine.
- `## Principle` #3 (one primitive, two lifetimes) and #4 (reuse
  membership via `GroupApi`, add a thin bundle) — #3 →
  `party.md § Two lifetimes over one primitive`; #4 is also SUPERSEDED
  (see below).
- `## Ontology`'s opening paragraph ("A `Party` is a first-class Stuff
  that references a managed group... a facet on a bare group couldn't")
  — SUPERSEDED, see below.
- `## Ontology`'s "You are actively in one party at a time..." bullet →
  `party.md`'s "one **`activePartyPath`** at a time (the one-active-
  party rule, rejected at `form`/`accept`)".
- `## Membership & leadership`'s opening sentence ("Standard group
  lifecycle over the grouping substrate — form/invite/accept/leave/
  kick/disband") → `party.md § The party verb + PartyApi` (same six
  verbs plus more). Its "Tactic-assigned member roles (master/vanguard/
  medic)" bullet → `combat-formations.md` (`roleAssignments`, `party
  assign <role> <member>`, "roles are sets, not seats").
- `## NPC / AI members`'s "Hire a merc" bullet → `party.md` (`Mercenary`
  = `PartyMemberMixin(NPC)`, the `enlist` verb) +
  `combat-formations.md` ("The combatant brain is formation-aware
  through the same chain a player resolves (NPC≈PC)") +
  `lib/behavior/{backs-up,combatant}.ts` (both call `PartyApi`).
- `## Settled decisions` #3 (one active party) → same as the Ontology
  bullet above. #5 (three-axis wall one-liner) — redundant with the
  KEPT `## The three-axis wall` section (fuller table + prose); cut as
  duplicate, not because it's shipped (it's doctrine, see below). #6
  (party≠combat-side one-liner) → `party.md § The combat seam` +
  redundant with the KEPT `## Party vs. combat-side` section. #7 (no
  party-XP; reputation+odometer) — redundant with the KEPT
  `## Progression`/`## Reputation`/`## The odometer` sections (fuller
  content, all still unbuilt). #8 (reputation attaches to name) —
  redundant with the KEPT `## Reputation` section. #9 (payout is a
  split policy) — redundant with the KEPT `## What a party holds`
  section's "anti-loot payoff" paragraph.
- `## Open questions` #1 (reputation v1 scope) — redundant with the
  KEPT `## Reputation` section's own "v1 vs depth" paragraph, which
  states the identical lean with more detail; nothing shipped either
  way (no chronicle/renown-party code exists), so this is a duplicate
  of kept content, not a resolved-and-shipped item.
- `## Open questions` #2 (party purse/stash: deferred or v1) —
  redundant with the KEPT `## What a party holds` section's
  "Deferred-with-seam" paragraph, same question already answered there
  (deferred).
- `## Open questions` #4 (multi-party alliances: formal concept or
  per-fight alignment) — RESOLVED: no formal alliance concept exists;
  `PartyApi.setSide` (shipped, player-facing via the `party` verb) lets
  a captain point the party's `combatSide` at an arbitrary shared key,
  which is exactly the mechanism `party.md § The combat seam` describes
  ("captain-settable, so 'two parties ally into one side' is reachable
  ... by pointing both `combatSide`s at one key"). Cut with this
  pointer.
- `## Once shaped into formal requirements` (whole section) — a
  pre-build requirements-shape synthesis; item 1 (Party Stuff def.) is
  SUPERSEDED (see below); item 2 (membership lifecycle + captain +
  tactic-role, one-active-party) is shipped/documented per the cuts
  above; item 5 (NPC party membership) is shipped/documented per the
  "Hire a merc" cut above; items 3–4 (loot-split/contract-binding,
  odometer/reputation wiring) restate the KEPT `## What a party holds`
  / `## Progression` / `## Reputation` / `## The odometer` sections,
  which carry the same unbuilt content in fuller form. Its Tests bullet
  is partly covered today (`PartyLogic.test.ts` exercises form/disband
  over the grouping substrate) and partly not (no payout/odometer
  tests exist, matching the unbuilt facets above).

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `## Open questions` #3, "Captain succession — founder-is-captain +
  transfer? election? What happens on the captain's departure
  (auto-promote / dissolve / leaderless)?" — RESOLVED in code:
  `Party.release` repoints `captainId` to `memberIds[0]` (simple FIFO,
  no election) whenever the departing member was captain;
  `PartyLogic.settleAfterDeparture` handles the empty-party terminus
  (durable → dormant via `setCaptainId("")`; ad-hoc →
  `StuffApi.destruct`). None of this was in `party.md`, which only said
  "succession repoints `captainId`" with no mechanism. Inserted a new
  paragraph into `party.md` (§ The Party Idea) stating the FIFO rule,
  the no-leaderless-mode fact, and the terminus split. This insertion
  also directly resolves the "leaderless/egalitarian" ambiguity flagged
  under Uncertain below.

### Superseded — cut
- `## Principle` #4 ("Membership is a managed group (`GroupApi`); the
  party adds a thin bundle") and `## Ontology`'s opening paragraph ("A
  `Party` is a first-class Stuff that *references a managed group* for
  membership (DRY over `GroupApi`)...") — by `party.md § The governing
  decision: a party owns its own membership`, which explicitly says so:
  *"This overrides the party-slate's original 'back a party with a
  managed Group' sketch... reaching for `GroupApi` to store membership
  is the anti-pattern the cycle corrected."* Also folds in `## Settled
  decisions` #1, the same claim restated.
- `## Once shaped into formal requirements` item 1 ("The `Party` Stuff
  — a managed-group reference...") — same supersession as above.

### Kept (UNBUILT)
- `## Ontology`'s remaining bullet ("Durable vs ad-hoc is lifetime...
  The contract's staffing model (hire-a-formed-crew vs
  hire-and-compose) picks which.") — no contract↔party integration
  exists (`Party`'s fields per `party.md` are `name`/`founderId`/
  `captainId`/`memberIds`/`combatSide`/`durable`/`channelRef` — no
  contract-binding field, confirmed by grep for "contract" in
  `Party.ts`/`PartyMember.ts`, which only turns up the unrelated
  call-security "participant contract" term).
- `## What a party holds` (whole section) — loot-split policy,
  contract-binding, and the party purse/stash are all unbuilt
  (confirmed: no `lootSplit`/`payoutSplit`/`partyPurse` anywhere under
  `lib/party` or `api/party.ts`). The section's intro line names
  several already-shipped facets (membership, captain, tactic→now
  formation) alongside the unbuilt ones — kept whole rather than
  trimmed, since the two substantive paragraphs that follow are both
  entirely about the still-open payout/purse mechanics.
- `## Membership & leadership`'s captain-authority bullet and the
  trailing "Leaderless/egalitarian..." paragraph — see Uncertain,
  below (kept per the pilot's kept-but-contradicted rule, not because
  they're unbuilt in the ordinary sense).
- `## Progression`, `## Reputation`, `## The odometer` (whole sections)
  — no party-chronicle, party-renown, or party-odometer code exists
  anywhere (grepped `RenownLogic.ts`, `lib/renown`, `lib/chronicle`,
  `ChronicleLogic.ts`, and `Party.ts`/`PartyRecord.ts` for
  "party"/"odometer"/cross-references — none found). Matches the
  status block's `Left`.
- `## NPC / AI members`'s "Companions / followers" bullet (no
  `Companion` class — grepped every `PartyMemberMixin` composer:
  only `Avatar` and `Mercenary`) and "The mixed human+AI formation...
  the master can be an AI tutor" bullet (the human+AI mix and
  brain-following-tactic half is shipped/documented, but "the master
  can be an AI tutor — the education vertical" has no code anywhere;
  kept whole per the mixed-paragraph rule).
- `## The three-axis wall` (whole section) — kept as Doctrine, not
  backlog; see below.
- `## Party vs. combat-side — two layers` (whole section) — the
  party/combat-side split itself is shipped and documented
  (`party.md § The combat seam`), but the elaboration's "a lone
  individual join a side" and especially "a member **betray** (switch
  sides mid-fight without leaving the party)" have no shipped
  counterpart: `combatSide` is set at the **party** level only
  (captain-settable), so an individual member cannot unilaterally
  diverge from their party's side while remaining a member. Kept
  whole; the ledger flags the betray nuance as the open remainder.
- `## Settled decisions` #2 and `## Membership & leadership`'s bullets
  — see Uncertain.
- `## Open questions` #5 (now #1) — odometer/reputation credit gate
  ("operating as the party") — no code, genuinely open, distinct from
  the general Reputation/Odometer sections' framing.
- Framing intro, `See also`, `## What this slate does NOT cover` —
  spine, unchanged.

### Uncertain — kept
- `## Settled decisions` #1 (was #2) and `## Membership & leadership`'s
  "An optional **captain**..." bullet + the "Leaderless/egalitarian =
  no captain, collective defaults..." paragraph — **contradicted by
  shipped code.** `PartyLogic.formImpl` always sets `captainId =
  founderId` (`party.setCaptainId(founderId)`, unconditional — no
  leaderless path), and `Party.release`'s succession always assigns an
  heir (`memberIds[0]`) whenever a non-empty party's captain departs.
  There is **no way to form or remain in a party with no captain**
  short of the empty-party terminus, which isn't "leaderless," it's
  "gone" (dormant or destructed). Kept verbatim per the pilot's
  kept-but-contradicted rule rather than cut or silently believed;
  flagged in the slate's own re-stamped status block too. The
  "tactic-assigned member roles distinct from captain" and "command
  disciplines" clauses inside these same bullets ARE accurately
  shipped (`combat-formations.md`) — the contradiction is narrowly the
  "optional"/"leaderless" premise.

### Doctrine
- Second status block's second paragraph ("The governing discipline:
  keep the party small and *operational*...") — a scope-guard
  principle, not a status claim or a backlog item; kept in place.
- `## Principle` #1 ("Small and operational... a squad ≈2–6, not an
  army") — no size cap exists in code (`Party.size()` is unenforced,
  no `maxMembers`/`MAX_PARTY` constant found), so this is an
  unenforced design aspiration/rationale, not a backlog item with a
  clear "build this" shape.
- `## Principle` #2 ("General-operational; combat is one facet...") —
  explains *why* Party has no combat-only gating; descriptive
  rationale for the shipped shape, not itself a mechanism to build.
- `## The three-axis wall` (whole section) — a standing scope-boundary
  principle (party≠guild≠corp) guarding against scope creep; no guild
  or corp class exists to compare against, so there's nothing to
  code-verify — it's a thesis, not a mechanism.

### Handoff (belongs in a doc outside my list)
(none. `chat.md` and `grouping.md` already document party chat as a
bound `Channel` and the `PartyGroupProvider` respectively — the
cross-batch notes this brief asked me to check for. `combat-formations.md`
already documents tactic/formation/roles/coup governance/the `command`
Discipline in full, so no handoff was needed there either — all cut
pointers above cite it directly instead.)

### Status block
- Left: *the party purse + payout split · the crew's durable name
  (renown-as-subject over a party chronicle) · the odometer layer ·
  party morale · the client party card · NPC-only crews* → same six
  items, tightened (payout split → "payout/loot-split policy +
  contract-binding"; NPC-only crews clarified as "companions/followers;
  an NPC-vs-NPC crew with no player"). `party morale` and `the client
  party card` have no body section in this slate at all — verified
  they're real via `party.md § Deferred` ("party morale (Thesis 13)...
  the client party card"), so they stay in `Left` on that doc's
  authority even though this slate never elaborates them.
- Added to the status block (not `Left`, since both are RESOLVED, not
  open): captain succession is FIFO/no-election, and multi-party
  alliance is resolved as "manual `setSide` to a shared key," not a
  formal concept. Also flagged the captain-optional/leaderless
  contradiction inline, pointing here.
- Size: a wave → a wave (unchanged — still substantial: payout/purse,
  chronicle-backed reputation, the odometer wiring, morale, the client
  card, and NPC-crew work all remain).
- Status: PARTIAL → PARTIAL (unchanged).

## docs/subsystems/party.md — insertions

One paragraph inserted (SHIPPED · UNDOCUMENTED graduation), ~6 lines,
in `## The Party Idea (backed by a document)` right after the field
table: the FIFO captain-succession rule (`Party.release` → `heir =
memberIds[0]`), the fact that no leaderless mode exists (`form` always
sets a captain), and the empty-party terminus split (durable → dormant,
ad-hoc → destructed) that's the only path to clearing `captainId`.

No existing sentence in `party.md` was edited or removed.
