# Multi-party combat + the party operational core — requirements

Cycle 2 of the combat build, over the merged 1v1 core (builds 1+2,
[combat.md](../subsystems/combat.md)). The 1v1 fight **goes plural**: one
session holds N combatants joined by a **threat graph** (who's-locked-on-
whom), focus-fire splits a defender's guard, a bystander can join an
in-progress fight, and `defend <ally>` lets you interpose for a friend.
Riding underneath is the enabling social substrate — a **party**
operational core (form a crew, a captain, a combat side) that combat reads
to tell friend from foe — and a foundational fix the 1v1 live demo forced:
a **real-time combat tick** so pace stops being coupled to the world-clock
scale. Seeds: [combat-slate](../slates/deferred-rpg/combat-slate.md),
[combat-tactics-slate](../slates/deferred-rpg/combat-tactics-slate.md),
[party-slate](../slates/deferred-rpg/party-slate.md),
[combat-experience-slate](../slates/deferred-rpg/combat-experience-slate.md).

Terminal-only. The client `CombatPane` is the *next* cycle — this build
creates the threat-graph information model that pane will read.

## Goals

**Multi-party combat**

- A single combat session holds **N combatants** (not two), each with a
  `body` hold, joined by a **threat graph** whose edges are engagements
  (who is locked onto whom). Sides partition the graph into friend/foe.
- **Focus-fire changes the poise economy**: a combatant with more incoming
  engagement edges loses poise faster and **cannot recover while
  focus-fired** — so a lone defender genuinely cannot turtle against two
  attackers (the 1v1 defender-advantage self-corrects in the plural case).
- A bystander can **join an in-progress fight** — `attack`ing a combatant
  already in a session merges into that session on a chosen side (the join
  handshake), rather than opening a separate fight.
- A combatant can **flee** — break off and leave. Fleeing is not a verb or
  a locomotion mode; it is combat's resolution of a **locomotion attempt
  made while engaged** (at the `LocomotionApi` traverse seam that combat's
  `body`-hold already gates). It is **opposed**: foes still locked on get a
  parting shot and focus-fire can pin the break; the locomotion mode used
  is an input (running breaks off better than walking).
- **`defend <ally>`** is playable: interpose in an ongoing fight and draw
  (redirect) an attacker's engagement edge from the ally onto yourself.
  `intervene` (stay a coup) and `fight defend` (cover yourself) **converge
  into the one `defend` verb** — `defend <fallen>` = today's coup-stay,
  `defend` (self) = cover, `defend <ally>` = interpose.
- **Terms and blame are per-directed-edge**, so a melee of combatants with
  different lethality postures attributes crime correctly (a consented duel
  plus a lethal interloper: the interloper's kill is a crime, the duelist's
  is not).
- **Combat pace is real-time**, independent of the world-clock scale.

**The party operational core**

- A **`Party`** exists as first-class Stuff that **owns its own membership**
  (roster + roles + captain) and carries the operational facet (active
  combat side, a durable name). It **exposes** that membership to the
  [grouping](../subsystems/grouping.md) facade as a new source
  (`party:<id>` — a fourth `GroupProvider` beside managed / MQL / contacts),
  so any consumer (chat, future targeting/permissions) can resolve the crew
  without the party storing membership in the generic managed provider.
- **Membership lifecycle** works — form / invite / accept / leave / kick /
  disband.
- A party has **two lifetimes** (the same primitive, a durability flag):
  **ad-hoc** (transient, in-memory, disbands after the task) and **durable**
  (a **named crew that persists across restarts**, keeps its roster +
  identity, and can be re-formed later). The durable crew's *accruals*
  (reputation / odometer / deeds-chronicle) are deferred — the identity
  persists, the reputation does not yet.
- A durable party can **stand down** (go dormant — members disperse, the
  crew persists) and **muster** (re-materialize / re-activate). A player
  may **belong to several durable crews** but has **one active party at a
  time** ("one tactic governs you"); switching is stand-down-one /
  muster-another.
- **Party chat** — a group-backed channel bound to the party's membership,
  so a crew can talk to itself; it rides the shipped chat/channel substrate
  over the party's managed group.
- A **captain** holds command authority (manage membership, set the party's
  combat side, muster/stand-down); founder-is-captain, a `transfer`, and
  succession on the captain's departure.
- **Friend/foe in combat derives from the party**: a party maps to a combat
  side by default; NPC and player members fight the party's foes and never
  their allies.
- **NPC party members** (a companion / a hired merc) follow the party's
  combat side via a brain.

## Non-goals

Deferred, with the owning slate/build named:

- **Party economic & progression facets** — loot-split policy +
  contract-binding (banking remittance-split + contracts), the **party
  odometer** ([odometer-slate](../slates/deferred-rpg/odometer-slate.md)),
  **party reputation / renown-as-subject** + the notoriety twin
  ([renown.md](../subsystems/renown.md)), the party **purse / stash**
  (banking joint-account + co-owned container). → party-slate later waves.
  *This cycle's party is operational only (the three-axis wall: a party is
  not a guild and not a corp; it teaches nothing and employs no one).* The
  durable crew's **identity persists** (name + roster + captain, so muster
  works) but it accrues **no reputation or odometer** yet — a durable party
  is a re-formable named crew, not yet a famous one.
- **The tactic-preset system** — formations, march order, focus-the-caster,
  protect-the-VIP, parley / rally, the field-target affordances. This cycle
  ships **sides + a default target policy** (fight foes, spare allies), not
  the tactic vocabulary. → combat-tactics-slate.
- **Group morale / rout / rally** (leader-down shock, ally-fleeing
  contagion, the `shaken` status) → combat-experience Thesis 13. A
  **coordinated party-retreat** (a captain breaking the whole side off
  together) rides this — this cycle a party flees the way it fights,
  member by member.
- **The chase** (foes *pursuing* a fleer into adjacent locations,
  pursuit-as-activity) → wayfaring. This cycle a fleer who breaks off is
  simply gone — unpursued.
- **The client `CombatPane`** → next cycle (this build makes its info model).
- **The combat gym** (headless N-party matchup sweeps for tuning the
  focus-fire curve) → its own build; numbers are hand-tuned + playtested
  this cycle.
- **Master-Apprentice** competence-manufacture, **reach / space-caps** on
  attacker count, **guilds / corps** → their own theses/slates.
- **Formal multi-party alliances** (an "allied sides" object) — this cycle
  aligns independent parties only through the per-fight combat side.

## Surface decisions

### Session model — one shared session, N per-participant holds

The two-sided 1v1 shape (`CombatSession` + one `CombatPartnerHold`)
generalizes to **one session holding a collection of per-participant
`body` holds** plus the threat graph — the slate's "a `SustainedEngagement`
on every participant." Combatants are a mutable set on the session (join /
leave), not a fixed pair. Merge (two fights becoming one) and split (a
fight fragmenting) are **synchronous, lock-free** operations on the single
cooperative-coroutine thread — the settled single-thread constraint
(combat-slate) is precisely what makes them trivial. Poise and tempo stay
**per-combatant** (each `CombatantState`); only the graph is shared.

### The threat graph — the geometry substitute

A `combat.graph` of **nodes = combatants, directed edges = engagements**
(A is locked onto B: `{attacker, defender, instrument}`). This replaces
spatial position entirely — "who can hit whom, who's protected, who's
free" is a property of the graph. Edges are formed by `attack` / target
choice, broken by disengage / kite / redirect. A combatant's **target** is
which edge(s) they act on this beat; a defender's **incoming edges** are
who's pressing them.

### Focus-fire → poise economy (the one specified N-party rule, and the balance fix)

Poise erosion scales with **incoming-edge count**; recovery is **suppressed
while focus-fired** (≥ some incoming threshold). This is the single rule
that generates the plural tactics (peel, focus-fire, protect-the-VIP) and
the reason a lone patient defender loses to two attackers — directly
countering the 1v1 defender-advantage. Magnitudes are `combat.*`
AppSettings dials, hand-tuned (the gym that would sweep them is deferred).

### Add-a-combatant — the join/merge handshake

`attack <target>` where the target is **already in a session** does **not**
open a new fight — it **joins the existing session**. The joiner picks a
side (their party's side, or the side opposing their target); a new
engagement edge is added; their per-directed-edge terms are reconciled
against their target (below), not against the whole melee. Two separate
sessions **merge** when an edge would cross them (a third party engages
across two fights). Joining requires a free `body` (not already in a
session). Leaving / fleeing removes the combatant + their edges; the
session dissolves when one side has no standing combatants.

### Fleeing — disengage at the locomotion seam, opposed, individual

Fleeing is neither a verb nor a locomotion mode; it is combat's resolution
of a **locomotion attempt made while engaged**. Combat holds the actor's
`body`, which already vetoes movement — this build turns that flat veto
into an interception at the `LocomotionApi` traverse seam (the move
substrate stays agnostic; combat registers the consequence, as encumbrance
hangs its traversal-drain there). The disengage is **opposed-lite**: shed
the actor's edges, each foe still locked on gets one parting shot, and a
focus-fire pin (incoming-edge count ≥ threshold) can block the break a
beat; on success the traversal proceeds under the **chosen locomotion
mode** (the mode is an input — `run` breaks off better than `walk`).
**Individual only** — a coordinated party-retreat is the deferred rout/rally
command layer, and pursuit (the chase) is deferred wayfaring; a fleer who
breaks off is gone, unpursued.

### Sides — per-session combat alignment, party-derived

A **combat side** is a per-session alignment tag, **not** the party (the
party≠side two-layer split). By default a combatant's side is derived from
their **party** (party members share a side); a partyless combatant is a
side of one (or aligns ad-hoc at join time). Friend = same side (never a
valid `attack`/edge target); foe = other side. Sides dissolve at fight end;
the party persists.

### Terms & blame — per-directed-edge

`CombatTerms` become **per-directed-edge**: each attacker→defender edge
carries its own lethality × stop-condition × consent record, reconciled
pairwise at edge-creation (the build-1 handshake, now per-edge). The blame
ledger is **already** keyed per `{victim, killer, terms}`
(`CombatAttributionEvent`), so it carries N-party blame with no reshape:
each death's terms come from the killing edge. A consented duel with a
lethal interloper attributes the interloper's kill as a **crime** and the
duelist's as **lawful** — `blameFor` distinguishes by the edge that struck
the death blow.

### The `defend` family — one verb, three cardinalities

`intervene` and `fight defend` **fold into** a single `defend` verb:
`defend` (no target) = cover yourself + recover poise (today's `fight
defend`); `defend <fallen>` = stay a coup (today's `intervene`); `defend
<ally>` = interpose in an ongoing fight, **redirecting** a chosen attacker's
engagement edge from the ally onto the interposer (`combat.graph.redirected`
`{fromTarget, interceptor}`). Coup-stay remains reachable by any present
party. (The old verbs may stay as aliases for discoverability; the canonical
surface is `defend`.)

### Party — first-class Stuff that OWNS its membership + is a group source

A `Party` is first-class Stuff that **owns its membership** — the roster
(`memberIds`), roles, captain, and pending-invites live **on the Party**,
one coherent store — plus the operational facet: the **active combat side**
it feeds, a durable **name/identity**, and its chat `channelRef`. It does
**not** store membership in `GroupApi`'s managed provider; instead it
**registers as a new `GroupProvider`** so `GroupApi.membersOf('party:<id>')`
resolves the crew from the party's own store. **This overrides party-slate
settled decision #1** ("references a managed group"): a party's membership
*is* its operational facet (the captain must be a member, muster acts on
members, roles attach to members), so splitting it into a generic managed
`Group` and syncing two stores is a tax the real reuse — being one of the
facade's *sources* — avoids. The grouping substrate is explicitly built to
accept new affiliation sources; a party is one. **One active party at a
time.** Membership lifecycle: form / invite / accept / leave / kick /
disband; invite works like an introduction (offer + accept).

### Two lifetimes — ad-hoc vs durable; stand-down / muster; one active

The **same `Party` primitive** carries a durability flag (the slate's "one
primitive, two lifetimes"). **Ad-hoc** parties are transient — in-memory,
disband when the task ends or they empty. **Durable** parties **persist**
(name + roster + captain survive a restart); the roster rides the managed
group (already a Document), and the party's identity persists alongside so
it can be re-materialized. A durable party is **stood down** (dormant — no
member has it active, the crew persists) and **mustered** (re-activated).
A player may be a member of **many** durable crews but has **one active
party at a time** (`activePartyPath`); muster stands down the current
active. Captain-gated for durable crews. *(Durable *accruals* — reputation
/ odometer — are deferred; only the identity persists.)*

### Party chat — a channel whose `groupRef` is the party source

Party chat rides the shipped chat/channel substrate as a **consumer of the
grouping facade** (which is what chat already is): on `form`, a `Channel`
is minted whose `Subject.groupRef = 'party:<id>'` — resolved by the party's
own `GroupProvider` to the crew. No managed `Group` is minted; the audience
walk (`GroupApi.membersOf`) resolves the party's own roster. Members talk to
the crew through it; it persists with a durable party and goes quiet (not
destroyed) on stand-down; disband / retire removes it. No new chat
machinery, and no second membership store.

### Captain & succession

Founder-is-captain on formation. A `transfer` hands captaincy to a named
member. On the captain's departure, captaincy **auto-promotes** to the
next member (or the party goes leaderless — collective defaults — if the
captain was the last leader-eligible member). The captain sets the party's
combat side and manages membership; **the coup decision stays individual
this cycle** (the victor decides), with captain-held coup authority
deferred alongside the rest of the tactic layer.

### NPC party members

An NPC joins a party (a companion, or a hired merc via the existing
employment path) and runs a brain that **reads the party's combat side** —
attacking the party's foes, never its allies, and (default target policy)
focusing the captain's target or the nearest foe. No tactic-preset
vocabulary this cycle; just side-driven friend/foe + a default target.

### Real-time combat tick

The beat loop moves from the game-time `WorldClockApi.every` /
`ScheduledEmission` to a **real-time `ScheduleApi.recurring`**, so
`combat.tickSeconds` is a real-time pace independent of the world-clock
scale (the 1v1 demo needed a scale=1 hack; N combatants amplify the
coupling). Bleed / wound progression stays keyed to game-time where it
belongs (the harm reconcile-on-read), decoupled from the beat pace.

## Constraints

- **Single-thread cooperative coroutine** — combat is a settled
  single-thread coroutine (combat-slate); the N-party session, merges, and
  splits must be synchronous and lock-free. No worker threads, no locking.
- **Reuse the grouping *facade*, not the managed store** — the party owns
  its roster and **registers as a new `GroupProvider`** (`party:<id>`) so
  consumers resolve the crew through `GroupApi.membersOf` like any other
  source ([grouping.md](../subsystems/grouping.md), which is built to accept
  new sources). Chat consumes that provider; combat's seam reads the party's
  own store directly.
- **Build on the shipped blame ledger** — `CombatAttributionEvent` /
  `deriveBlame` is already per-edge-shaped; extend, don't replace.
- **No party-XP, ever** — competence stays individual (the honesty
  firewall); a party has no skills or level. Party synergy is emergent
  (members' competence × side × the graph).
- **The three-axis wall** — party is operational only; anything that smells
  like teaching (guild) or employing (corp) is out of scope by construction.
- **Go through the Api layer** — `StuffApi` / `GroupApi` / `SchedulerApi`
  (engagements) / `ScheduleApi` (the real-time tick) / `CombatApi`; no
  direct mechanism calls ([antipatterns.md](../antipatterns.md)).
- **Bands, not numbers** — all player-facing combat reads (own + opponent
  poise, focus-fire pressure, threat) stay banded, per the shipped doctrine.
- **Terminal-only** — no client pane; the threat graph is server-
  authoritative and surfaced through narration + the `fight` read.

## Acceptance criteria

- A **3-way / 2v1 fight** runs to resolution on one shared session with a
  live threat graph; adding and removing combatants updates the graph.
- **Focus-fire**: a combatant with two incoming edges loses poise measurably
  faster and cannot recover while focus-fired; a lone defender loses to two
  coordinated attackers where they would beat one (the turtle is broken).
  Asserted in a test at fixed inputs.
- A **bystander joins an in-progress fight** via `attack` (merge into the
  existing session on a side), rather than spawning a separate session.
- A combatant **flees** by attempting to locomote while engaged: the
  disengage sheds their edges and fires a parting shot from each foe still
  locked on; a focus-fired combatant is pinned (cannot break off) until the
  incoming pressure drops. On success they leave the fight and the room
  under the chosen locomotion mode; nobody pursues.
- **`defend`** covers all three cardinalities: `defend` (self, recover),
  `defend <fallen>` (stay a coup), `defend <ally>` (redirect an attacker's
  edge onto the interposer — the ally's incoming pressure drops, the
  interposer's rises). One verb.
- **Per-edge blame**: in a consented duel (A vs B) that C joins under
  imposed lethal terms, `blameFor` reports C's kill of B a **crime** and A's
  hypothetical kill **lawful** — distinguished by the killing edge's terms.
- **Real-time tick**: a fight runs at the **same real-world pace** at world
  scale 1 and at scale 12 (pace decoupled from the clock); bleed still
  tracks game-time.
- **Party**: form / invite / accept / leave / kick / disband work over
  `GroupApi`; one-active-party is enforced; the captain sets the side that
  governs friend/foe; `transfer` and on-leave succession behave.
- **Durable / muster**: a durable party survives a server restart with its
  roster + identity; standing it down makes it dormant (no active member)
  without destroying it; mustering re-activates it; a player in two durable
  crews can have only one active at a time, and muster stands down the
  other.
- **Party chat**: members of a party can talk to the crew over its
  group-backed channel; a durable party's channel persists across
  stand-down / muster.
- An **NPC merc / companion** joins a party and, in a fight, attacks the
  party's foes and never its allies.
- The **multi-party demonstrator** (you + an NPC ally vs a two-combatant
  foe, in the newbie-wilds) runs end-to-end.
- **Docs**: [combat.md](../subsystems/combat.md) updated (the N-party
  session + threat graph + focus-fire + the `defend` family + the real-time
  tick); a **new `docs/subsystems/party.md`** subsystem doc; the doc-map +
  architecture entries added at finalize.
- **Tests** cover the pure/decidable pieces: threat-graph mutation, the
  focus-fire erosion rule, per-edge blame derivation, side friend/foe, and
  party membership lifecycle. Integration validated by the live demo (the
  build-1/2 precedent).

## Cross-references

- **Seeding slates**: [combat-slate](../slates/deferred-rpg/combat-slate.md)
  (session / threat graph / merge-split / consent),
  [combat-tactics-slate](../slates/deferred-rpg/combat-tactics-slate.md)
  (the engagement graph a tactic is a policy over — tactics deferred),
  [party-slate](../slates/deferred-rpg/party-slate.md) (the operational
  core + the party≠side split + the deferred facets),
  [combat-experience-slate](../slates/deferred-rpg/combat-experience-slate.md)
  (focus-fire-splits-guard, the threat graph as geometry, morale deferred).
- **Subsystem docs**: [combat.md](../subsystems/combat.md) (extended),
  [grouping.md](../subsystems/grouping.md) (party membership),
  [behavior.md](../subsystems/behavior.md) (NPC members follow the side),
  [activity.md](../subsystems/activity.md) (the engagement substrate),
  [harm.md](../subsystems/harm.md) (bleed stays game-time under the
  real-time tick).
- **Deferred consumers** named at their sites:
  [odometer-slate](../slates/deferred-rpg/odometer-slate.md),
  [banking.md](../subsystems/banking.md),
  [renown.md](../subsystems/renown.md) (the party's economic / reputation
  facets).
