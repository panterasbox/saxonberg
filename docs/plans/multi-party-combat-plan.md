# Multi-party combat + the party operational core — implementation plan

*Cycle 2 of combat, over the merged 1v1 core (builds 1+2). Turns the
two-sided fight into an N-party melee with a threat graph, and builds the
party operational core that feeds it friend/foe. Requirements:
[multi-party-combat-requirements.md](../requirements/multi-party-combat-requirements.md).
Terminal-only; one big-swing build with internal phases for reviewability
(each phase ends green). Branch off current master.*

## 1. Architecture in one screen

Two subsystems joined by one seam:

- **The party operational core** (`lib/party/`, `api/party.ts`,
  `obj/api/PartyLogic.ts`) — a `Party` first-class Stuff that **owns its
  membership** and **registers as a `party:` `GroupProvider`** (a fourth
  grouping source), membership lifecycle, captain + succession, a **party
  chat channel** whose `groupRef` is `party:<id>` (chat consumes the
  facade), and the **two-lifetime** model (ad-hoc / transient vs durable /
  persisted — a named crew that survives a restart and **musters**;
  accruals deferred). It exposes **the whole seam combat needs in two pure
  functions** (which read the party's own store — no `GroupApi`).
- **The multi-party combat engine** (`lib/combat/`, `obj/api/CombatLogic.ts`)
  — the session stops being two-sided: one plain N-container owning its own
  **real-time** beat, a **threat graph** of directed engagement edges,
  focus-fire poise economy, per-edge terms/blame, join/merge, the `defend`
  family.

**The seam (the crux — everything hinges on it):** combat asks the party
subsystem exactly two questions, both pure synchronous gated statics on
`PartyApi`:

```ts
// api/party.ts — combat imports ONLY these (the "go through the Api" rule)
type SideRef = string;                    // per-fight alignment key; equality == allied
PartyApi.sideOf(combatant: Stuff): SideRef;   // NEVER null: party's combatSide,
                                              //   or `solo:<durableId>` for the partyless
PartyApi.areAllied(a: Stuff, b: Stuff): boolean;  // === sideOf(a) === sideOf(b)
```

`sideOf` is a **three-rung resolution chain** (mirroring the codebase's
`ownerOf` walk):

```
sideOf(x) =  the active party's combatSide          (DE JURE — Avatar / Mercenary)
          ↳  else the OWNER's sideOf   (DE FACTO — pet / companion; SEAM, not built)
          ↳  else  solo:<durableId>                 (a side of one)
```

- **Rung 1 (party):** `Party.combatSide` **defaults** to `party:<ownPath>`
  but is **captain-settable** — so "the captain sets the side that governs
  friend/foe" falls out, and the deferred "two parties ally into one side"
  is reachable later (point `combatSide` at another party's key) without
  reshaping the seam. Only combatants that carry `PartyMemberMixin` with an
  active party hit this rung.
- **Rung 2 (owner — a seam, pets not built this cycle):** a **pet is not a
  party member** — the party is *peers*, a pet is an *extension of its
  owner*. So a pet derives its side from its **owner's** `sideOf`
  (transitively onto the owner's party side), with zero party machinery.
  Pets aren't built yet; `sideOf` is structured to admit this rung, and
  pets slot in when they land. **No pet work this cycle.**
- **Rung 3 (solo):** any combatant with no active party and no owner is a
  **side-of-one** keyed by its `templatePath`; two distinct solos are never
  allied → today's 1v1 (two partyless combatants) is the degenerate case,
  unchanged. This is also why party membership needn't live on the base
  `Character` — a plain NPC (townsperson, wolf) is `solo` for free.

Combat reads `sideOf` **once** at session-open / join and **freezes** it on
the combatant's graph node (sides are per-session; the party persists).
Combat never touches party membership, the captain, or the roster — only
these two functions. One-way dependency (combat → party; party never
imports combat), so no cycle.

## 2. The session-shape decision (load-bearing)

**Uniform per-participant holds + a session that is a plain container
owning its own real-time tick — NOT the anchored-A shape generalized.**

Today the session *is* combatant A's `body` engagement and carries the beat
on A's `ScheduledEmission` (game-time). In a melee A can die or flee first,
orphaning the tick and the container. So:

- `CombatSession` stops being a `SustainedEngagement`. It becomes a plain
  object: `states: Map<Stuff, CombatantState>`, a `CombatGraph`, and a
  `ScheduleHandle` for its own `ScheduleApi.recurring(tickMs, () => this.tick())`
  beat. `sessionId` = a `SecurityApi.uuid()`.
- Every participant (including the initiator) carries **one uniform
  `CombatParticipantHold`** (generalized `CombatPartnerHold`) occupying
  `body`. Mutual-idempotent teardown generalizes exactly: a hold's
  `onAbort` → `session.removeParticipant(combatant)`; emptying a side →
  `session.dissolve()` cancels the tick + every remaining hold.
- `sessionForImpl` → find the participant hold → `hold.getSession()`.

This is closer to a lifecycle rewrite than a diff, but it's the only shape
that survives arbitrary participant departure — and the real-time-tick
migration *enables it for free* (the session no longer needs to ride any
participant's emissions). That synergy is why **Phase 1 bundles the tick
move with the container refactor**. Merge/split stay trivial because holds
reference the session by object ref (merge repoints `hold.session`; nothing
else moves). A `CombatRegistry` singleton (the `GroupRegistry` precedent) is
the fallback if split (Phase 8) needs O(1) session discovery — not built
up front.

## 3. Module taxonomy (new homes, respecting the taxonomy)

| Module | Home | Precedent |
|---|---|---|
| `PartyMixin` + concrete `PartyEntity` (default export) | `lib/party/Party.ts` | `lib/employment/Business.ts` (BusinessMixin + BusinessEntity no-merge) |
| `PartyMemberMixin` (`activePartyPath`, `pendingInvitePartyPath`) — composed on **`Avatar`** only, **not** the base `Character` | `lib/party/PartyMember.ts` | `lib/employment/Employed.ts` (sparse, ApiOnly setters) |
| `Mercenary` — the hireable-into-a-party NPC (`PartyMemberMixin(NPC)`) | `lib/party/Mercenary.ts` (new) | `lib/npc/NPC.ts` (`NPC = Behaved(PostRegistration(Character))`) |
| `PartyRegistry` singleton + seed — holds active parties; **boot-warms durable parties** from the `parties` collection | `obj/PartyRegistry.ts` | `obj/GroupRegistry.ts` + `obj/ChannelCatalogue.ts` (boot-warm) |
| `PartyGroupProvider` — the fourth `GroupProvider` (`party:<id>` → the party's own roster), registered with the grouping registry | `lib/party/PartyGroupProvider.ts` (new) | the managed / MQL / contacts `GroupProvider` impls |
| `parties` collection (durable party: `memberIds`/roles/`captainId`/`combatSide`/`name`/`channelRef`) + `Collections.Parties` | `backend/PersistenceManager.ts` | `channels` collection |
| Party chat channel — **reuses** the shipped `Channel` + `ChannelCatalogue`; its `Subject.groupRef` = `party:<id>` (no managed `Group` minted) | — | `obj/ChannelCatalogue.ts:452` |
| `PartyApi` gated facade (+ `SideRef`/`PartyRef` types) | `api/party.ts` | `api/group.ts` |
| `PartyLogic` logic singleton | `obj/api/PartyLogic.ts` | `obj/api/GroupLogic.ts` |
| `party` verb (subcommand dispatch) | `cmd/social/party.yaml` + `obj/command/social/PartyController.ts` | `cmd/social/group.yaml` + `GroupController.ts` |
| `CombatGraph` value-object | `lib/combat/CombatGraph.ts` (new) | `lib/combat/Poise.ts` (pure, unit-tested) |
| `CombatParticipantHold` (rename+generalize `CombatPartnerHold`) | `lib/combat/CombatSession.ts` | in place |
| `DefendController` + `defend.yaml` | `obj/command/combat/` + `cmd/combat/` | `InterveneController` |
| Side-aware brain | extend `lib/behavior/combatant.ts` | in place |
| `docs/subsystems/party.md` (new) | `docs/subsystems/` | grouping.md |

## 4. The phased plan

Dependency spine: party's **seam** (Phase 2) must exist before combat
consumes sides (Phase 4); combat's **container** (Phase 1) is independent
and goes first. Each phase ends green.

### Phase 1 — N-capable session container + real-time tick (combat)
The 1v1 fight runs **unchanged**, now on a real-time beat over an N-ready
container. `CombatSession`: `a`/`b`/`partner`/`terms` → `states` map +
`holds` map + a `CombatGraph` (seeded with the single edge) + a
`ScheduleApi.recurring` handle; drop `SustainedEngagement`/`emissions`.
Rename `CombatPartnerHold`→`CombatParticipantHold` (one per participant).
`CombatLogic`: `openSessionImpl` builds the container + 2 participants + 2
holds + the tick; `advanceImpl`/`endWith`/`checkVitalsResolution`/
`sessionForImpl` off the maps, not `[a,b]`. `CombatNarration.combatants:
[Stuff,Stuff]` → `readonly Stuff[]`. **Bleed stays game-time** (harm
reconcile-on-read untouched; only the beat leaves the clock).
*Satisfies:* real-time-tick criterion. *Validated:* existing combat tests + 1v1 demo.

### Phase 2 — the party operational core (party, self-contained)
The whole party subsystem as one green slice — ships the seam. Internally
sequenced: **(a) core + chat**, then **(b) durable lifetime + muster**.

**(a) Core + chat.** `Party.ts` (mixin+entity — fields `memberIds`,
`memberRoles`, `captainId`, `combatSide`, `name`, `durable`, `channelRef`;
the party **owns its roster**), `PartyMember.ts` (`PartyMemberMixin`, the
one-active `activePartyPath` + `pendingInvitePartyPath`) **composed on
`Avatar` only**, plus a **`Mercenary` NPC class** (`PartyMemberMixin(NPC)`)
— the base `Character`/`NPC` stays party-less (a plain NPC is `solo`).
`PartyGroupProvider` (`party:<id>` → the party's `memberIds`) registered
with the grouping registry. `PartyRegistry`, the gated `PartyApi`/
`PartyLogic`, the `party` verb suite (`form` · `invite` · `accept` ·
`leave` · `kick` · `disband` · `transfer` · `side` · `show`). Membership
mutations are **direct on the Party's roster** (no backing managed
`Group`, no two-store sync); `PartyApi.membership` methods add/remove
`memberIds`. **Party chat**: `form` mints a `Channel` whose
`Subject.groupRef = 'party:<id>'` (stored as `channelRef`), resolved by the
`PartyGroupProvider` — chat is a *consumer* of the facade, no new chat
machinery, no separate membership store. Invite = offer+accept
(introductions model; `pendingInvitePartyPath`). Captain:
founder-is-captain; `transfer`; on-leave auto-promote / leaderless; disband
destroys the party + channel. **One-active-party** rejected at
`form`/`accept`. **The seam** `sideOf`/`areAllied` (§1) reads the Party's
roster directly.

**(b) Durable lifetime + muster.** A `durable` flag distinguishes the two
lifetimes (slate's "one primitive, two lifetimes"). **Ad-hoc** = in-memory
(PartyRegistry only), gone on restart, auto-disbands when empty.
**Durable** = **persisted** so name + roster + captain survive a restart:
the whole party — `memberIds`/roles/`captainId`/`combatSide`/`name`/
`channelRef` — persists as a **`parties` collection** row (the party owns
its roster, so there's one thing to persist; mirror how `createPlayerChannel`
persists a `Channel`), re-materialized into the `PartyRegistry` at boot (a
warmed catalogue, the `ChannelCatalogue` precedent) — which also
re-registers each durable party's `PartyGroupProvider` entry. Verbs add
`muster <crew>` (re-activate — sets the musterer's `activePartyPath`,
standing down their current active first), `stand-down` (go dormant —
clears members' `activePartyPath`; the party + channel persist), and
`party list` (your durable crews — the parties whose roster lists you). A
durable party is **not** destroyed on empty — it persists dormant;
`disband`/`retire` is the explicit destroy. Multi-membership: your id sits
in **many parties' rosters** (`memberIds`), but `activePartyPath` is the
single active pointer.

*Satisfies:* all party-lifecycle + captain/succession + one-active + the
durable/muster + party-chat criteria. *Tests:* form/disband on the party
roster; lifecycle; one-active rejection; succession; the `sideOf`/`areAllied` truth
table; a durable party round-trips a restart + musters; stand-down leaves
it dormant; party chat reaches the crew.

### Phase 3 — the threat graph + per-edge terms (combat)
`CombatGraph.ts`: directed `ThreatEdge {attacker, defender, instrument?,
terms: CombatTerms}` + query surface (`addEdge`/`removeEdge`/`removeNode`/
`edgeBetween`/`incomingEdges`/`edgeCount`/`targetsOf`/`edgesInto`/
`redirect`), pure/unit-tested. Session holds the graph; **session-level
`terms` moves onto edges**. `resolveExchange` acts along an edge;
`handleDown`/`recordDeath`/`checkVitalsResolution` read the **killing
edge's** terms via `graph.edgeBetween(killer,victim)`; add `lastStruckBy`
to `CombatantState` so an attrition/bleed-out death names its killing edge.
`deriveBlame` untouched (already per-death-row).
*Satisfies:* the per-edge-blame foundation. *Tests:* graph mutation; per-edge blame.

### Phase 4 — sides + join / merge (combat ⟂ party seam)
`CombatApi.join(joiner, target, terms)` (new `CombatantState`+hold+edge,
terms reconciled joiner-vs-target) and `merge(sessionA, sessionB)` (fold
participants+edges into the survivor, repoint moved holds, cancel the
defunct tick). Side assignment reads `PartyApi.sideOf`, frozen on the node;
**foe = `!PartyApi.areAllied(self, other)`** replaces `opponentState`.
`AttackController`: the busy-reject becomes the handshake — target in a
session → `join`; givers in different sessions → `merge`; neither →
`openSession`. Merges happen **at beat boundaries** (start of `advanceImpl`),
never mid-`resolveExchange`.
*Satisfies:* 3-way/2v1 to resolution; bystander-joins-via-attack; side
friend/foe; per-edge crime attribution (duel + interloper). *Tests:* the
consented-duel-plus-lethal-interloper blame case; friend/foe.

### Phase 5 — focus-fire poise economy (combat, the balance fix)
Scale target poise erosion by `graph.edgeCount(target)` and **suppress the
recover/defend branch** when the actor's incoming count ≥ threshold. New
dials `combat.focusFire.erosionPerEdge`, `combat.focusFire.suppressRecoveryAt`
(Poise stays a pure state machine; the multiplier is passed into
`poise.erode`).
*Satisfies:* focus-fire — 2 incoming edges erode faster + block recovery; a
lone defender who beats one loses to two (**the turtle is broken**). *Tests:*
erosion at fixed inputs; the qualitative loses-to-two / beats-one flip
(not a magnitude, since the gym that would tune it is deferred).

### Phase 6 — fleeing = disengage at the locomotion seam (combat)
Fleeing is **not** a verb or a locomotion mode — it is combat's resolution
of a **locomotion attempt made while engaged**. Combat holds the actor's
`body`, which vetoes movement; this phase turns that flat veto into an
**interception at the `LocomotionApi` traverse seam** (the move substrate
stays agnostic — combat registers the consequence, the way encumbrance
hangs its traversal-drain there). When an engaged actor attempts to
traverse in any mode: run the **opposed-lite disengage** — shed the actor's
edges, every foe still locked on gets **one parting shot**, and a
focus-fire pin (incoming-edge count ≥ threshold, reusing Phase 5) can block
the break for a beat. On success → `session.removeParticipant` + the
traversal **proceeds under the chosen locomotion mode**; on failure → the
traverse is vetoed, the actor stays. The locomotion **mode is an input**
(`run` = a better break at higher endurance cost vs `walk`; `swim`/`climb`
if the exit leads there). New dial `combat.flee.partingShotEnergy`.
*Scope:* **individual** flee only — coordinated party-retreat (rout/rally →
Thesis 13) and the chase (pursuit → wayfaring) stay deferred; a fleer is
simply gone, unpursued.
*Satisfies:* an engaged combatant can break off and leave; ganging-up has
teeth on the exit (parting shots / focus-fire pin). *Tests:* disengage
sheds edges + fires parting shots; a focus-fired actor is pinned at fixed
inputs.

### Phase 7 — the `defend` family (combat)
`DefendController` + `defend.yaml`: `defend` (self → the `defend` gambit),
`defend <fallen>` (→ coup-stay, today's `intervene`), `defend <ally>` (→
`CombatGraph.redirect` a chosen attacker's edge off the ally onto the
interposer; `join` first if not yet in the session). Keep `intervene`/`stay`
and `fight defend` as **aliases**; `defend` is canonical.
*Satisfies:* one `defend` verb, three cardinalities (ally's incoming
pressure drops, interposer's rises).

### Phase 8 — NPC side-following brain + the demonstrator (combat ⟂ party)
Make the **one** default `combatant` brain side-aware (don't fork a second):
enumerate the session's combatant set (`session.getCombatants()`), **filter
foes** via `!PartyApi.areAllied(host, other)` (never queue against an ally),
default target = the captain's current target if a foe else nearest foe,
then queue as today. The NPC ally is a **`Mercenary`** instance (carries
`PartyMemberMixin`) that joins the player's party via `PartyApi.invite`+
`accept` (or a direct merc-hire add); a plain-`NPC` foe stays `solo`. Wire
the **multi-party demonstrator** (you + a Mercenary ally vs a 2-foe crew,
newbie-wilds).
*Satisfies:* NPC attacks foes-not-allies; the end-to-end demo.

### Phase 9 — split (optional / deferrable)
Connected-component recompute on edge removal; if the graph disconnects,
spawn a second session + re-home holds. **No acceptance criterion requires
it** — defer unless the demo produces genuine fragmentation. Where a
`CombatRegistry` would earn its place.

### Docs (fold in at finalize)
`docs/subsystems/party.md` (new — the party-owns-membership + `party:`
provider model, party≠side,
the seam, captain/succession, one-active); `combat.md` extended (N-party
session + threat graph + focus-fire + `defend` family + real-time tick);
doc-map + architecture rows.

## 5. Risks

- **Single-thread merge/split.** The settled cooperative-coroutine
  constraint makes these lock-free, but merge must repoint every moved
  hold + union the graph **atomically at a beat boundary**, never inside
  the tempo inner loop. Split (Phase 8) is the sharper edge — kept
  deferrable.
- **Poise-economy tuning (Phase 5).** The focus-fire curve is hand-tuned
  (the gym is deferred). Over-scaling → 2v1 one-beat stomp; under → the
  turtle survives. Gate the test on the qualitative flip, not a magnitude;
  bound `erosionPerEdge`.
- **Killing-edge attribution for attrition deaths.** A bleed-out has no
  single striker — `lastStruckBy` must be set on every landed blow or a
  death row grabs the wrong edge's terms and misclassifies a crime.
- **Anchor-departure (mitigated by design).** Uniform holds remove the
  orphaned-tick failure; audit every `getState`/`opponentState` caller
  (`FightController`, `Combatant.combatStateAugmenter`) for two-ness
  assumptions.
- **Seam timing.** Phase 4 (combat consumes the seam) depends on Phase 2
  (party ships it). The `combatant` brain degrades to today's
  `opponentState` until `getCombatants` lands — the two halves meet at that
  one method.

## 6. Test strategy

Pure value-objects unit-tested (the build-1/2 precedent): `CombatGraph`
(mutation, edge queries, redirect), the focus-fire erosion rule (fixed
inputs), per-edge `deriveBlame` (the interloper case), `PartyApi.sideOf`/
`areAllied` (the truth table), party membership lifecycle on the party's
own roster. Integration validated by the **live multi-party demo**
(the 2v1 / you+ally-vs-crew), the build-1/2 acceptance shape. The real-time
tick is asserted by pace-independence across world scale.

## 7. Acceptance-criteria coverage

3-way/2v1 → P1+P4 · focus-fire/turtle → P5 · bystander-join → P4 ·
individual flee (opposed-lite, locomotion seam) → P6 · `defend` three
cardinalities → P7 · per-edge blame → P3+P4 · real-time tick → P1 · party
lifecycle/one-active/captain/succession + durable/muster + party-chat → P2 ·
NPC side-following → P8 · demonstrator → P8 · `party.md` + `combat.md` → docs.

## 8. Critical files

- `lib/combat/CombatSession.ts`, `obj/api/CombatLogic.ts`,
  `lib/combat/CombatGraph.ts` (new), `api/combat.ts`,
  `obj/command/combat/AttackController.ts`, `lib/behavior/combatant.ts`.
- `lib/party/Party.ts` (new), `lib/party/PartyMember.ts` (new — on `Avatar`),
  `lib/party/Mercenary.ts` (new — `PartyMemberMixin(NPC)`),
  `lib/party/PartyGroupProvider.ts` (new — the `party:` grouping source),
  `api/party.ts` (new), `obj/api/PartyLogic.ts` (new),
  `obj/command/social/PartyController.ts` (new), `obj/PartyRegistry.ts` (new).
- Precedents to mirror: `lib/employment/Business.ts`, `api/group.ts` +
  `obj/api/GroupLogic.ts` (facade+provider shape), the managed/MQL/contacts
  `GroupProvider` impls (the party's fourth), `obj/command/social/GroupController.ts`,
  `obj/ChannelCatalogue.ts` (Channel mint — `groupRef` = `party:<id>`).

## Cross-references

- Requirements:
  [multi-party-combat-requirements.md](../requirements/multi-party-combat-requirements.md).
- Seeding slates: combat-slate, combat-tactics-slate, party-slate,
  combat-experience-slate (all `docs/slates/deferred-rpg/`).
- Subsystems: [combat.md](../subsystems/combat.md),
  [grouping.md](../subsystems/grouping.md),
  [behavior.md](../subsystems/behavior.md),
  [activity.md](../subsystems/activity.md).
