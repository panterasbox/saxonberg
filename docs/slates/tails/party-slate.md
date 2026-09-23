# Party system (working slate)

> **Status:** PARTIAL — the party core shipped: the `Party` Idea, the
> fourth `GroupProvider`, roster/captain/formation/roles, the combat
> `sideOf`/`areAllied` seam, captain succession (FIFO to `memberIds[0]`,
> no election) → [party.md](../../subsystems/party.md). Multi-party
> alliance is resolved too, but not as a formal concept — a captain
> `setSide`s to a shared key manually. ⚠ **Captain is not actually
> optional**: `form` always sets one and departure always auto-succeeds
> one while the party is non-empty — the "leaderless/egalitarian" design
> below has no shipped counterpart. See the Uncertain note in the
> compaction ledger.
> **Left:** the party purse + payout/loot-split policy + contract-binding ·
> the crew's durable name (renown-as-subject over a party chronicle) ·
> the odometer layer · party morale · the client party card · NPC-only
> crews (companions/followers; an NPC-vs-NPC crew with no player)
> **Size:** a wave

> **The governing discipline: keep the party small and *operational*.** The
> biggest risk is scope-creep — a party wanting to become a **guild** (teach
> you), a **corp** (employ you), or an **XP treadmill** (level up as a
> group). It must be none of those. A party is *"who I'm doing this with
> right now,"* full stop. Everything below defends that line.

See also:

- [combat-slate.md](../builds/combat-slate.md) — the heaviest consumer: tactics as
  party-level policy, the party-vs-combat-side layering, master-apprentice,
  coup attribution (tactic governs right/credit/decision).
- [combat-tactics-slate.md](./combat-tactics-slate.md) — the party-level
  presets + the engagement graph a preset is a policy over (both
  **shipped** — the combat-formations build; see
  [../../subsystems/combat-formations.md](../../subsystems/combat-formations.md)).
- [../../subsystems/grouping.md](../../subsystems/grouping.md) — `GroupApi`'s
  managed provider + `GroupRef`; a party's *membership* rides this.
- [../../subsystems/banking.md](../../subsystems/banking.md) — the
  remittance-split seam (payout split) + joint `Account` (the deferred party
  purse).
- [../../subsystems/renown.md](../../subsystems/renown.md) /
  [../../subsystems/chronicle.md](../../subsystems/chronicle.md) — reputation
  as a **renown-as-subject** over a party **chronicle** of witnessed deeds.
- [odometer-slate.md](../builds/odometer-slate.md) — the fast progression layer (the
  party is one odometer *subject*).
- [../builds/advancement-slate.md](../builds/advancement-slate.md) — the
  three orthogonal social axes (**guild ≠ party ≠ corp**); competence stays
  individual (the honesty firewall).
- [../../subsystems/behavior.md](../../subsystems/behavior.md) — NPC party
  members run a brain that follows the party tactic; the employment engine
  hires them in.

---

## Principle

> **Graduated** to [party.md § Why the party is small, operational, and nothing else](../../subsystems/party.md#why-the-party-is-small-operational-and-nothing-else)
> (small and operational · general-operational, combat is one facet).

---

## Ontology — Party is first-class Stuff

- **Durable vs ad-hoc** is lifetime: a durable party persists (named,
  re-forms, accrues reputation); an ad-hoc crew dissolves after the task. The
  contract's staffing model (hire-a-formed-crew vs hire-and-compose) picks
  which.

## The three-axis wall — party ≠ guild ≠ corp

> **Graduated** to [party.md § Why the party is small, operational, and nothing else](../../subsystems/party.md#why-the-party-is-small-operational-and-nothing-else)
> (the three-axis table; a party neither teaches nor employs).

## Party vs. combat-side — two layers

The recurring decouple-persistent-from-activity-scoped pattern
(subject/surface, melee-edge/pursuit, belief/perception):

- **The party** = the persistent (durable or ad-hoc) operational group.
- **The combat side** = a *per-session* alignment in one fight (an
  activity-bound group).

Usually a party maps to a side, but the split is what lets **two parties
ally into one side**, a **lone individual join a side**, or a member
**betray** (switch sides mid-fight without leaving the party). The party's
tactic feeds the side; the side dissolves when the fight ends, the party
persists.

## What a party holds

v1 state: **membership + roles**, an **optional captain**, the **tactic**, a
**loot-split policy**, an **active contract-binding**, and (durable) the
**identity + chronicle**.

**The anti-loot payoff.** The hardest part of MMO parties — loot
distribution (who gets the drop) — mostly evaporates, because the economy
pays **contracts, not corpses**. Party economics reduce to *splitting a fee*
per the loot-split policy (even / by-shares / by-role / captain-allocates) —
a *policy*, not a scramble — riding the banking **remittance-split** seam.
No need-vs-greed, no ninja-looting.

Deferred-with-seam (substrate exists, pull when needed): a **party purse** (a
banking joint `Account` owned by the party), a **party stash** (a co-owned
container).

## Membership & leadership

- An optional **captain** with **command authority**: sets the tactic, holds
  the **coup decision** + **command responsibility** for blame
  (combat-slate Thesis 7), manages membership.

Leaderless/egalitarian = no captain, collective defaults (the coup-call goes
to whoever's engaged). Leadership itself advances the **command
disciplines** — leading is a skill.

## Progression — two timescales, and no party-XP

- **Competence stays individual** (the honesty firewall — a party has no
  skills; master-apprentice *manufactures opportunity*, never transfers XP).
- **Synergy is emergent, not stored** — a drilled party is better from
  *members' competence × the right tactic × the threat graph*, **not** a
  stored "party level." Derive-don't-track applied to parties. **No party-XP,
  ever** — a deliberate non-choice.
- **Two legitimate party-level accruals, on different clocks:**
  - **Reputation** (slow) — *what others think of the crew* (below).
  - **Odometer** (fast) — *what the crew has done* (the granular
    number-go-up; see [odometer-slate.md](../builds/odometer-slate.md)).

  Reputation answers *"do we matter?"*; the odometer answers *"look how far
  we've come."* Complementary, not competing — the two feedback timescales a
  party wants.

## Reputation — the durable crew's name

Group reputation is the **reason durable parties exist** (an ad-hoc crew
needs none — it dissolves). Design:

- **Attaches to the *name* (the durable identity), not the roster.** "The
  Ashford Company" stays fearsome as members come and go — a band name / unit
  honors / company brand outliving its people. It's **provenance-grounded**:
  reputation derives from the party's **chronicle** of witnessed, attributed
  deeds (accrued only while **operating as the party** — banner flying). A
  new crew starts at zero; you can't inherit a dead crew's fame by taking its
  name (the provenance shows a new founding). A notorious crew *can* re-found
  clean — but the **members carry their own individual notoriety.** Rebrand
  sheds the banner, not the people.
- **The halo is *recognition*, not renown transfer** (firewall). Joining a
  famous crew makes others *recognize you as one of it* (a belief fact) and
  shifts their **regard** (the affiliation halo) — you don't *earn* the
  crew's renown by walking in. Party renown and individual renown are
  independent accruals; a deed **double-attributes** (crew chronicle +
  members' records), each banks its own.
- **Multi-valent, not scalar** — a **stance vector** across observers/
  factions (the corpo approval model): beloved by merchants, feared by the
  underworld, hunted by the wronged. Plus a **notoriety twin** (derived from
  the blame ledger — collective crimes make the crew *wanted*, recognized by
  guards).
- **Consumers (an access currency, not a power stat):** **contract access**
  (reputable crews get better offers; notorious ones get shunned/hunted — the
  main one), **recruitment** (a known name attracts members), the
  **recognition halo**, and **intimidation / legitimacy**.
- **Guard the wall.** Reputation makes a party *feel* institutional — hold it
  to a **band name + a deeds chronicle + a reputation**, and *no other
  machinery* (no membership-as-affordance, no economy, no teaching). If we
  feel the pull to give parties charters/ranks/treasuries/training, that's
  the design asking for a guild or corp — make one of those, separately.

**v1 vs depth:** v1 = the **identity** (name + founding + chronicle) + a
**basic renown-as-subject** gating **contract access**. Deferred = the full
**multi-valent faction vector**, the **notoriety-pierces-disguise** twin, and
the **recognition-halo** mechanic (renown/belief/corpo extensions).

## The odometer — the fast layer (a party is a subject)

Because the odometer is **subject-scoped** (see
[odometer-slate.md](../builds/odometer-slate.md)), the party odometer is the same
mechanic as the personal one, at the party cardinality. A contract done *as
the crew* **double-bumps** the party odometer and each member's personal
odometer. It gives the crew fast, granular, monotonic progress ("47
contracts, 312 leagues, 89 fights *together*") — honest shared history,
making no capability claim.

## NPC / AI members — parties are heterogeneous

Human + NPC + AI, each reusing substrate:

- **Companions / followers** — a rescued ally, a bought-in beast.
- **The mixed human+AI formation** (the combat-tactics keystone); and **the
  master can be an AI tutor** — the education vertical expressed through the
  party. The NPC reads the party tactic through the same command bus.

---

## Settled decisions

1. **Both** an optional captain (command authority) *and* tactic-assigned
   member roles; leaderless/egalitarian is captain-absent.

## Open questions

1. **Odometer/reputation credit gate** — exactly what counts as "operating as
   the party" (formed up) for double-attribution.

## What this slate does NOT cover

- **Guilds and corps** — the other two social axes; their own designs
  ([advancement-slate](../builds/advancement-slate.md) /
  [corpos-slate](./../builds/corpos-slate.md)). The party must not absorb them.
- **The combat tactic mechanics** — owned by
  [combat-tactics-slate.md](./combat-tactics-slate.md) /
  [combat-slate.md](../builds/combat-slate.md); the party merely *holds* the active
  tactic.
- **The odometer mechanic** — owned by [odometer-slate.md](../builds/odometer-slate.md);
  the party is one subject of it.
- **The employment relationship** — hiring an NPC is an employment contract
  (the economy/employment engine); the party is the crew it joins.
