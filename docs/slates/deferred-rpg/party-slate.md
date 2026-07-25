# Party system (working slate)

> **Status: design-phase, deferred-rpg.** The **party** is the social axis
> the combat design leaned on throughout (tactics are "party-level,"
> master-apprentice, coup attribution, crew contracts, payout split) without
> ever being defined. This slate defines it. Nothing here is a build.
>
> **The governing discipline: keep the party small and *operational*.** The
> biggest risk is scope-creep — a party wanting to become a **guild** (teach
> you), a **corp** (employ you), or an **XP treadmill** (level up as a
> group). It must be none of those. A party is *"who I'm doing this with
> right now,"* full stop. Everything below defends that line.

See also:

- [combat-slate.md](./combat-slate.md) — the heaviest consumer: tactics as
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
- [odometer-slate.md](./odometer-slate.md) — the fast progression layer (the
  party is one odometer *subject*).
- [../builds/advancement-slate.md](../builds/advancement-slate.md) — the
  three orthogonal social axes (**guild ≠ party ≠ corp**); competence stays
  individual (the honesty firewall).
- [../../subsystems/behavior.md](../../subsystems/behavior.md) — NPC party
  members run a brain that follows the party tactic; the employment engine
  hires them in.

---

## Principle

1. **Small and operational.** A party is a squad (≈2–6), not an army —
   because party-level tactic presets are legible *only* because parties are
   small (the text-medium requirement). It's the **disposable axis**: you
   form and dissolve parties constantly.
2. **General-operational; combat is one facet.** You party up to travel,
   explore, work a contract, *and* fight. The tactic is just the combat
   facet, dormant otherwise.
3. **One primitive, two lifetimes.** Durable (a named crew you re-form) vs
   ad-hoc (spun up for one task, disbanded) is a *lifetime*, not a type.
4. **Reuse membership, add only the operational facet.** Membership is a
   managed group (`GroupApi`); the party adds a thin bundle (captain, tactic,
   loot-policy, contract-binding, identity).

---

## Ontology — Party is first-class Stuff

A `Party` is a **first-class Stuff** that *references a managed group* for
membership (DRY over `GroupApi`) and carries the operational facet: an
optional **captain**, the **tactic**, a **loot-split policy**, an optional
**contract-binding**, and (for durable parties) a persistent **identity**
(name + founding + a deeds chronicle). Being Stuff is what lets it *hold* an
identity and accrue a reputation/odometer over its lifetime — a facet on a
bare group couldn't.

- **You are actively in one party at a time** — one tactic can govern you.
  Durable memberships you're not currently formed-up-with are dormant.
- **Durable vs ad-hoc** is lifetime: a durable party persists (named,
  re-forms, accrues reputation); an ad-hoc crew dissolves after the task. The
  contract's staffing model (hire-a-formed-crew vs hire-and-compose) picks
  which.

## The three-axis wall — party ≠ guild ≠ corp

The most important thing to hold, because it's what stops the party
swallowing the design:

| Axis | Answers | Scale | Nature |
|---|---|---|---|
| **Party** | *who I'm doing this task with* | small | operational / tactical |
| **Guild** | *where I learned my craft* | large | educational / professional |
| **Corp** | *who I work for* | large | economic / affiliation |

A party of people from different **guilds** can work a contract for a
**corp**. A party does **not** teach you and does **not** employ you. The
party is fluid and disposable; guild/corp membership is durable and
consequential.

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

Standard group lifecycle over the grouping substrate — **form / invite /
accept / leave / kick / disband** (invite works like introductions). The
party-specific part is **leadership — both forms coexist:**

- An optional **captain** with **command authority**: sets the tactic, holds
  the **coup decision** + **command responsibility** for blame
  (combat-slate Thesis 7), manages membership.
- **Tactic-assigned member roles** (master / vanguard / medic), distinct
  from the captain role.

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
    number-go-up; see [odometer-slate.md](./odometer-slate.md)).

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
[odometer-slate.md](./odometer-slate.md)), the party odometer is the same
mechanic as the personal one, at the party cardinality. A contract done *as
the crew* **double-bumps** the party odometer and each member's personal
odometer. It gives the crew fast, granular, monotonic progress ("47
contracts, 312 leagues, 89 fights *together*") — honest shared history,
making no capability claim.

## NPC / AI members — parties are heterogeneous

Human + NPC + AI, each reusing substrate:

- **Hire a merc** — an NPC into the crew via an *employment contract* (you're
  the employer; the NPC runs a brain following the party tactic).
- **Companions / followers** — a rescued ally, a bought-in beast.
- **The mixed human+AI formation** (the combat-tactics keystone); and **the
  master can be an AI tutor** — the education vertical expressed through the
  party. The NPC reads the party tactic through the same command bus.

---

## Settled decisions

1. **Party is first-class Stuff** referencing a managed group for membership.
2. **Both** an optional captain (command authority) *and* tactic-assigned
   member roles; leaderless/egalitarian is captain-absent.
3. **One active party at a time**; durable memberships otherwise dormant.
4. **One primitive, two lifetimes** (durable / ad-hoc).
5. **The three-axis wall** — party (operational) ≠ guild (educational) ≠
   corp (economic); the party is the disposable axis.
6. **Party ≠ combat-side** — persistent group vs per-session alignment.
7. **No party-XP** — competence individual (firewall), synergy emergent;
   party-level progression is reputation (slow) + odometer (fast).
8. **Reputation attaches to the name, not the roster** — provenance-grounded
   via the party chronicle; the halo is recognition, not renown transfer.
9. **Payout is a split *policy*, not a loot scramble** (the anti-loot-economy
   payoff), riding banking's remittance-split.

## Open questions

1. **Reputation v1 scope** — identity + basic contract-gating reputation now,
   the multi-valent faction-vector / notoriety / halo deferred? (Lean yes.)
2. **Party purse / stash** — deferred behind the banking joint-account +
   co-owned-container seams, or v1?
3. **Captain succession** — founder-is-captain + transfer? election? What
   happens on the captain's departure (auto-promote / dissolve / leaderless)?
4. **Multi-party alliances** — a formal "allied sides" concept, or purely a
   per-fight combat-side alignment of independent parties?
5. **Odometer/reputation credit gate** — exactly what counts as "operating as
   the party" (formed up) for double-attribution.

## What this slate does NOT cover

- **Guilds and corps** — the other two social axes; their own designs
  ([advancement-slate](../builds/advancement-slate.md) /
  [corpos-slate](./../builds/corpos-slate.md)). The party must not absorb them.
- **The combat tactic mechanics** — owned by
  [combat-tactics-slate.md](./combat-tactics-slate.md) /
  [combat-slate.md](./combat-slate.md); the party merely *holds* the active
  tactic.
- **The odometer mechanic** — owned by [odometer-slate.md](./odometer-slate.md);
  the party is one subject of it.
- **The employment relationship** — hiring an NPC is an employment contract
  (the economy/employment engine); the party is the crew it joins.

## Once shaped into formal requirements

1. The **`Party`** Stuff — a managed-group reference + the operational facet
   (captain, tactic, loot-split policy, contract-binding) + durable identity
   (name / founding / chronicle).
2. **Membership lifecycle** (form/invite/accept/leave/kick/disband) + the
   **captain** authority and **tactic role** assignment; one-active-party.
3. **Loot-split policy** over the banking remittance-split; contract-binding
   routing payout + blame to the party for hire-a-crew contracts.
4. **Party-as-subject** wiring for the odometer (fast) and a **basic
   renown-as-subject** over the party chronicle (slow), gating contract
   access.
5. **NPC party membership** (employment hire → a brain following the tactic).

Tests gating: a party forms and disbands over the grouping substrate; a
crew contract routes payout to the party and splits per policy; a deed done
as the party double-bumps the party and members' odometers; reputation
persists across a roster change and starts fresh on a re-founding; a captain
sets the tactic that governs the combat side; an NPC merc joins and follows
the party tactic.

The multi-valent faction reputation, party purse/stash, and formal
multi-party alliances wait for their own waves.
