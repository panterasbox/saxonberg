# Crew slate — a set of NPCs that acts as one, and the rule that says who acts

> **Status: UNBUILT** — nothing coordinates a set of NPCs outside
> combat. What exists and is NOT this: `GroupApi` + its four
> `GroupProvider`s answer *membership* →
> [grouping.md](../../subsystems/grouping.md); `Party` answers *who is
> on my side in a fight*, players-and-mercenaries shaped →
> [party.md](../../subsystems/party.md); `CombatFormation` answers
> *what does my side DO*, over the threat graph →
> [combat-formations.md](../../subsystems/combat-formations.md);
> `AttendantMixin` queues the **customers** at a counter →
> [attendant.md](../../subsystems/attendant.md).
> **Left:** the whole of it — the crew as a substrate, its arbitration
> rule, the workplace consumer (who serves this order, among several who
> could), the mob consumer (who speaks for the pack; when do they all
> turn), and the retirement of the two placeholder tie-breaks named
> below.
> **Size:** a build.

---

## The question, in one line

> **A set of agents with a shared purpose, that can answer *who acts for
> us, for THIS* — and can act as one when the answer is "all of us."**

Two consumers, one question, two arbitration rules:

| | the set | the request | the rule wanted |
|---|---|---|---|
| **the workplace** | everybody on shift who serves this trade | `order stew` | a queue, or first-free |
| **the mob** | a pack, a patrol, a gang | a greeting, an insult, a drawn blade | who speaks; and when does the whole set turn |

## ⭐ Where this came from

MR !280 (trades & the labor market) shipped `Position.fulfills` — the
list of disciplines a seat serves an `order` in — and the user's
review question was the right one: *does that satisfy all the different
kinds of businesses we might need it for? multiple people, or no one, or
it rotates?*

Three cases, and the answers were not the same:

- **no one** — handled. `covers` puts the proprietor on a fulfilling
  seat; failing that the refusal is honest.
- **it rotates** — handled, by the roster. Rotation over TIME is
  `rosterSlots` + shift windows; `fulfills` is time-blind and the
  on-shift read makes it rotate.
- ⚠ **multiple people** — *not* handled, and the MR is what made it
  reachable. `resolveMaker` returned the first match in **container
  order** — insertion order, which means nothing. Invisible while one
  venue had one fulfilling seat; wrong the moment the Hearthworks had
  three over one business.

That MR closed the half that is genuinely *eligibility* (a smith does
not cook, so `fulfills` names disciplines and `resolveMaker` matches
them). What it could not close is *arbitration*, and it left two
placeholders that this build retires:

1. `CraftingLogic.resolveMaker` breaks ties on **lowest identity path**.
   Predictable beats arbitrary, and neither is right: it means Odo
   always serves and his kitchen-hand never does.
2. `Organization.beginCover` covers **the first fulfilling seat** in
   authored order.

## ⭐⭐ The shape, and why `Warren` is the precedent

The user's framing: *we already have a general solution for this, but
for locations — `Warren`.*

**Where the analogy holds.** A `Warren`'s real content is not
containment, it is **elastic membership plus a compiler that refuses to
let you skip the hard question**: `occupantsOf` is declared *abstract*,
so a warren cannot be written without choosing inner or outer. Same
machinery at two cardinalities, members joining and leaving live. That
is exactly the shape a crew wants — and the reason the residence ladder
is one doc and one code path rather than three
([holding.md](../../subsystems/holding.md)).

**Where it does not.** A `Warren`'s mechanism *is* containment: members
are rooms, occupancy is standing inside one. A crew's members are not
contained by it, they are enlisted in it. So this is a rhyme in
structure, not a reuse of the class — the thing to copy is the
**abstract-arbitration** discipline, not `occupantsOf`.

The concrete proposal to argue with:

```
Crew                      — the substrate. Elastic membership.
  abstract actorFor(request): member | null    ← the forced choice
  abstract actsAsOne(request): boolean         ← does the whole set turn?

WorkCrew   — members are on-shift holders of fulfilling seats
             actorFor = a queue, or first-free
MobCrew    — members are a pack roster
             actorFor = the leader, or the nearest
             actsAsOne = true for a threat, false for a greeting
```

⚠ **`actorFor` must be abstract for the same reason `occupantsOf` is.**
`Warren` shipped with the leaf answer as a concrete default and the
outer tier had to remember to override it — a warren that forgot read
every holding as its own occupant. A crew that forgets its arbitration
rule would silently pick whoever is first, which is precisely the bug
this slate exists to retire.

## The half already recorded

[party.md](../../subsystems/party.md) § Deferred already names *"an
NPC-vs-NPC **crew** standup — a durable-party seeder so two NPCs share a
side without a live player forming the party."* That is the mob case,
written down and waiting. What it does not cover is the workplace case,
because `Party` is combat-shaped (`memberIds` are an Avatar `playerId`
or a Mercenary `templatePath`; the reads are `sideOf` / `areAllied`).

⭐ **The sharpest one-line statement of the gap**: `AttendantMixin`
queues the *customers* at a counter. Nothing queues the *staff*. The
demand side of a storefront has had a substrate since the attendant
build; the supply side has never had one.

## Open questions

1. **Is a crew a `GroupProvider`?** Membership would then be readable by
   the shipped `GroupApi` facade for free, and MQL could seed on it. But
   a provider answers *who belongs*, and the whole content of a crew is
   *who acts* — so it may want to consume a group rather than be one.
2. **Does the workplace crew derive or persist?** The on-shift holders
   of a house's fulfilling seats are already derivable every tick. A
   derived crew has no state to get wrong; a persisted one can hold a
   queue position across a relog. The queue is the reason to persist,
   and it may be the only one.
3. **Does `actsAsOne` belong here or in the existing formation layer?**
   A mob turning on you is a combat-side decision and
   `CombatFormation` already runs party strategy over the threat graph.
   The crew may only need to answer *who speaks*, and hand the turn to
   the formation.
4. **What does a player crew member do to the arbitration?** A player
   kitchen-hand and an NPC cook in one kitchen is the shipped case
   today. First-free favours whoever is idle; a queue favours whoever
   waited. Neither is obviously right, and the answer is probably the
   employer's to author.
5. ⚠ **Nothing in the realm fires anybody** — recorded as the
   trades-and-labor drive's dirty reason, and it bites here: a crew
   whose membership is "holders of fulfilling seats" inherits a roster
   that only ever grows. Sits with `livelihood-slate` §5.4's
   firing / trust-ramp seam.

## Cross-references

- [party.md](../../subsystems/party.md) — the crew standup, already deferred there
- [grouping.md](../../subsystems/grouping.md) — the membership facade and its four providers
- [attendant.md](../../subsystems/attendant.md) — the demand-side queue this is the twin of
- [combat-formations.md](../../subsystems/combat-formations.md) — collective action, combat-side
- [holding.md](../../subsystems/holding.md) — the `Warren` two-tier precedent
- [employment.md](../../subsystems/employment.md) — `Position.fulfills`, the eligibility half
- [livelihood-slate](livelihood-slate.md) §5.4 — firing, the trust ramp, the NPC offer
