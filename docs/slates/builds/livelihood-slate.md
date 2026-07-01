# Livelihood & consequence (working slate)

> **Status:** foundational design, conversational first pass (2026-06-30).
> A *model*, not a build. Captures one connected chain of reasoning that
> ran from "how do we model death?" and landed on an economic spine:
> **violence has no payday; livelihood comes from work; the world's money
> is conserved with authors running their own budgets; and consequence is
> recorded, not mechanized.** Spans the platform↔game-design line on
> purpose — the **death / violence / contract** half is deferred RPG
> game-design (sibling to
> [combat-tactics](../deferred-rpg/combat-tactics-slate.md)); the
> **labor-market / economy / employment** half is economy-build substrate,
> and its near-term **buildable payload is the employment model** (§5).
> **Retire when:** the employment kernel promotes to formal requirements,
> and the death/contract halves either fold into the combat build or split
> to their own deferred-rpg slate.

Markers used below: **[DECIDED]** locked in the conversation ·
**[LEAN]** a recommendation the user delegated or tentatively accepted ·
**[OPEN]** an unresolved fork · **[NOW]** the current built reality.

## Load-bearing decisions (the spine)

1. **Death is the terminus of a body-state cascade, not an HP bar — and
   the engine already commits this.** Vitals has no stored health scalar;
   the consciousness band sits *before* death, giving a free **defeat ≠
   death** split. Combat is just a fourth driver into the same socket the
   environmental drivers already use, so death is designable *without* the
   combat loop.
2. **Kill→reward is severed.** You don't kill for exp/coin/loot. Income
   comes from **employment and contracts**. Removing the payday — not a
   penalty — is the real anti-griefing lever.
3. **You cannot code significance.** Notoriety / whether anyone *cares*
   lives in the humans, not the avatar. The engine's job is to make facts
   **true, legible, attributable** and then get out of the way (EVE
   killmails as proof). Over-mechanizing consequence *crowds out* the
   human reaction that is the whole point → keep death's mechanical
   footprint light.
4. **One conserved economy, central bank at the bottom.** There is **no
   NPC money faucet.** The CB is the only mint; authors, NPCs, and players
   all run on conserved balances. Each author funds his content from a
   **budget account**.
5. **The labor market routes fun, it doesn't generate it.** A contract /
   job is a motivation-and-payment wrapper around an underlying systemic
   activity. It's only as good as the activity beneath it.
6. **The engine verifies; it only verifies what it simulates.** Work is a
   set of *clauses* (achieve / maintain), and a clause is checked by the
   engine against **modeled world-state** — never by an agent's diegetic
   witness. Judgment lives at *specification*-time (defining the
   condition), not *verification*-time. You may only escrow a condition
   the engine can verify; anything fuzzier falls back to an informal,
   un-underwritten arrangement. This is the **anti-magic / anti-exploit**
   keystone — see §5.

See also:

- [combat-tactics-slate](../deferred-rpg/combat-tactics-slate.md) — the
  death model's combat sibling (engaged-relationship graph + party
  presets). That slate explicitly does **not** cover death/consequence;
  this one does.
- [quest-modeling-slate](./quest-modeling-slate.md) — the *narrative*
  abstraction; the contract here is its **Material/Standing** dimension
  given an economic + legal spine (escrow, authorization, adjudication).
- [economy-slate](./economy-slate.md) — currency / value / faucet-sink /
  the employment-venue section this deepens; the author-budget model (§4)
  closes its open "deliberate faucet without inflation" thread.
- [crafting-slate](./crafting-slate.md) /
  [banking.md](../../subsystems/banking.md) — Dave's Bar venue + the
  conserved money substrate (`payWage`, the CB mint/drain chokepoint, the
  deficit P&L) the employment model lands on.
- [cooperative-slate](./cooperative-slate.md) — the CB allocation policy
  (§4) is *monetary policy*, i.e. a governance decision, not a hardcode.
- [vitals.md](../../subsystems/vitals.md) /
  [activity.md](../../subsystems/activity.md) — the cascade/consciousness
  seam (death) and the engagement + anti-AFK substrate (the wage gate).

---

## 1. Death & violence

- **[DECIDED] Defeat ≠ death.** Combat resolves at *defeat*
  (unconscious / yield), the common outcome. Death is a further, usually
  preventable threshold on the same axis.
- **[DECIDED] Two routes to death, and salience is set by context.**
  *Intent* (someone chooses to kill — the bar murder) and *context* (you
  entered a place where death is the ambient stakes — the lion's den).
  The same death has wildly different social amplitude depending on the
  expectation-baseline of the *place* — a property you can hang on
  locality/zone. A nobody in the lion's den passes unremarked; a regular
  murdered in Dave's Bar is a shockwave, because reach across the
  belief/recognition graph carries it.
- **[DECIDED] Killing is economically dominated and incurs a debt.**
  Lethal and non-lethal victory pay the *same*; lethal costs *more*. So
  killing is never an economic choice — only rational when something
  external pre-pays the debt (a sanctioned bounty) or the player decides
  it's personally worth eating (revenge / RP).
- **[DECIDED] The engine's only jobs re: death** — make it **true**
  (irreversible enough to be a fact worth remembering), **legible**, and
  **attributable**. "Make it matter" is the players'.
- **[OPEN] Recovery / consequence *cost* of death** — un-pricable until
  advancement has real producers (can't price recovery without knowing
  how gains are made). The *social* consequence is answerable now; the
  *mechanical* one is deferred. These are independent — stop treating them
  as one question.
- **[OPEN] Old age / lifecycle / succession** — parked; non-violent,
  doesn't touch the kill economy. CK3-style succession collides with the
  banked "renown is per-character, no cross-character transfer" rule.

## 2. Contracts & adjudication

- **[DECIDED] One Contract abstraction, three parties:** **issuer**
  (posts / pays / authorizes), **contractor** (performs / bears breach
  liability), **target** (bears the force — sometimes just an objective
  with no standing, e.g. the lion).
- **[DECIDED] Invariants across every flavor:** **escrow** (payment held
  *by the contract*, not promised by the issuer); **bounded terms**
  (authorized action + limits + success condition — exceeding them is
  *breach*, the "hired to muscle, killed instead" penalty site);
  **attribution** (completion *and* breach); **conserved settlement**.
- **[DECIDED] The real flavor axis is not NPC-vs-player** — it's
  **(1) target standing** (person-who-can-be-wronged vs objective →
  whether a social debt exists at all) **× (2) authorization legitimacy**
  (a legit bounty *launders* lethality to the sanctioning authority; an
  illicit player hit launders nothing → issuer + contractor *share* the
  debt). The bounty board and the back-alley hit differ because one
  carries authorization and the other is a conspiracy.
- **[DECIDED] A contract grants no permission** — only escrow + recorded
  terms. A player "murder contract" makes you a *documented,
  escrow-paying conspirator* — **worse** than impulsive murder, not a
  license. This dissolves the "draft a contract, murder freely" hole.
- **[DECIDED] Adjudication is three layers; you don't build a court.**
  **Facts** = the engine, deterministic + attributable (truth, never
  legitimacy). **Legitimacy** = in-world **institutions, which are
  content not code** (guards / magistrate / bounty authority, acting in
  fiction on the engine's facts with ordinary tools — no `canMurder()`).
  **Significance** = the humans. **Liability** = the engine's piece of
  layer 1: a durable, queryable record of who's on the hook, *not* an
  auto-punisher (engine holds the ledger; it doesn't dispatch the
  bailiff).
- **[DECIDED] Law is local + content.** Where no institution exists = the
  **frontier**, murder is mechanically free *by design* (EVE nullsec) —
  not a hole, because lawful places hold both the facts and the means, and
  the facts follow you out. The one commitment: **wherever you want law,
  you author an institution.**
- **[DECIDED] NPC-vs-player contracts differ economically only in**
  verification (NPC can use privileged authored success-checks; player
  contracts limited to world-verifiable conditions or need an adjudicator)
  — *not* in conservation (see §4, which removed that distinction).
- **[OPEN] Illicit / unenforced arrangements** — you *can* conspire to
  murder, but get none of the invariants (no escrow, no enforced
  settlement; trusting a criminal is the friction). Confirmed they exist;
  depth deferred.

## 3. The labor market

- **[DECIDED] NPC-bootstrap → player-goal.** Early / low-pop the world
  supplies most work *and* services so a solo player has a real loop; as
  population grows players take over both sides and NPCs recede to the
  monetary boundary.
- **[DECIDED] A new player earns off an NPC job board** = the discovery
  layer over NPC-issued Contracts.
- **[DECIDED] Procgen + bespoke, by division of labor:** **procgen
  carries the economy** (renewable, fungible, **metered coin**, lives on
  the board, generated from real world needs — depth tracks the sim's
  depth); **bespoke carries the meaning** (sparse, hand-authored,
  **non-monetary** rewards off the money-supply math, surfaced through the
  NPC themselves, not the board). Reframe: not authored-vs-not but
  **author-the-generator vs author-the-instance**. Same Contract/board
  substrate. Heuristic: *"would two of these on the board at once feel
  wrong?"* → bespoke.
- **[DECIDED] Two labor forms, one primitive:** **gig** (a discrete
  *achieve* clause that settles and closes) vs **employment** (a standing
  *maintain* clause, paid by time). "Haul these crates" = gig; "tend
  Dave's bar" / "keep out the riffraff" = employment. Both are clauses on
  one model — see §5.
- **[OPEN] Discoverability surface** — physical board per locality vs a
  queryable panel (user: "dunno yet"). **[OPEN] Pricing** — flat
  difficulty-band vs demand-driven. **[OPEN] Gating** — employer-specific
  standing (buildable now) vs competence bands (advancement dependency).

## 4. The conserved economy (the big model)

- **[DECIDED] No NPC faucet.** Corrects the earlier "NPCs mint money"
  framing. The **central bank is the only mint**; authors, NPCs, players
  all run on conserved balances.
- **[DECIDED] Each author runs a budget account** ("whoever builds Narnia
  has a Narnia account"). NPCs draw wages / bounties *from* it; player
  spending + taxes flow *back into* it. Account granularity is the
  author's choice (one account vs per-business).
- **[DECIDED] Faucet and sink are the same account read two directions**
  → the balancing problem is **distributed to every author**, who must
  balance his own books. Not a global tuning problem.
- **[DECIDED] Authorship becomes an economic game.** A wizard must build a
  *solvent* zone, not just a pretty one; content that only pays out and
  earns nothing drains its account and can't pay its NPCs → **content that
  doesn't sustain itself withers** (natural selection on content — a
  feature; every author is a small-business operator; raises the
  authorship floor).
- **[DECIDED] NPC and player contracts are economically identical** —
  both are "an account funds the escrow" (author budget vs player
  balance). The only diffs left are verification + authorization (§2).
- **[LEAN] The real monetary lever relocates to CB allocation policy** —
  when the CB mints, and how a new author gets a starting budget (grant vs
  loan; fixed pool vs inflate). That's the inflation dial now, and it's a
  **monetary-policy / governance decision** → belongs to the cooperative,
  not a hardcode. Note: a **Central-Bank-Governor** seat is already in the
  government-offices design (monetary policy = executive).
- **[OPEN] The two ends of an author budget** — initial CB allocation, and
  insolvency (does the CB backstop a failing zone / author deposit
  insurance, or does Narnia's economy simply fail and strand its
  players?). Both governance calls. **[OPEN] Wizard capital market**
  (authors borrow / trade budget, same mechanism as player trade) — falls
  out naturally; deferred.
- **[DECIDED] Player contracts self-fund via escrow from the player's own
  balance.**

## 5. The work model — gigs & employment

Gig and employment are not two systems; they are two *shapes* of one
primitive. This section is the buildable core (grounded in Dave's,
`payWage`, conserved banking, the Contract abstraction, and the shipped
MQL/event detection seam), and the employment slice is buildable without
first settling §4's monetary policy.

### 5.1 The clause primitive

- **[DECIDED] A unit of work is a clause: `{shape, condition, observer}`.**
  - **shape** = **achieve** (make a condition *eventually* true — deliver
    the box, kill the lion, name the thief) or **maintain** (keep a
    condition true / keep one from becoming true over an *open interval* —
    no riffraff, the bar stays tended).
  - **condition** = a predicate over modeled world-state (§5.2).
  - **observer** = what evaluates it — and per §5.2 that is the engine.
- **[DECIDED] A Role/Contract is a *set* of clauses** (real jobs are
  conjunctions — a bouncer = *maintain*(peace) + reactive *achieve*(break
  up the fight)). **A gig** = (dominantly) one **achieve** clause that
  settles and closes. **Employment** = a standing **maintain** clause,
  usually spawning a stream of **achieve** micro-tasks.
- **[DECIDED] Why employment never "completes":** a maintain clause is
  defined over an open interval — structurally never *done* — so it's paid
  by **time**, not settled by completion. This is the deep reason
  durative/prevention work ("guard the shop a week") *is* employment, not
  a gig.

### 5.2 The verification model (the anti-magic / anti-exploit keystone)

The load-bearing rule that closes the "no-witness" exploit without
resorting to "the agent just magically knows."

- **[DECIDED] The engine is the observer, not the agent.** Verification
  reads *modeled world-state*; the engine cannot be fooled about state it
  computed. That is ground truth, **not magic** — magic would be knowing
  something un-simulated. (The whole project already rests on a
  high-fidelity sim, so the engine is a legitimate ground-truth oracle —
  the same fidelity that makes the sim the *pathfinder* makes it the
  *verifier*.)
- **[DECIDED] Judgment lives at specification-time, not
  verification-time.** The agent's subjectivity goes into *defining* the
  condition (who counts as "riffraff" → a banned list; what counts as
  "delivered"). Once defined it's a query over modeled state the engine
  checks objectively. The agent judges the *policy*; the engine enforces
  it. My earlier "the observer is almost always an agent" was wrong — it
  conflated *judgment* (spec-time) with *verification* (engine).
- **[DECIDED — HARD RULE] Only contract on what you simulate.**
  System-backed contracts (escrow + the §2 invariants) are offered *only*
  for conditions expressible as a query over modeled state. Anything
  fuzzier ("muscle him into compliance" with no modeled correlate) does
  **not** get escrow — it falls back to the §2 informal/illicit
  arrangement the system doesn't underwrite. **Not a hole:** the system
  never wrote a check it can't cash, so there's nothing to exploit.
- **[DECIDED] Keep verification diegetically grounded (authoring
  discipline).** Structure conditions so verification is *locally
  observable* (the box is literally inside Dave's bar), *proof-carrying*
  (bring back the lion's pelt — a modeled item), or *institutionally
  confirmed* (the bounty authority certifies the kill). Engine omniscience
  stays backstage; the player only ever meets grounded verification. **If
  you can't ground it, that's the signal it isn't contractible.**
- **[DECIDED] The agent's real job is specify / pay / react /
  bear-spec-risk** — the significance layer (§1's "can't code
  significance"), *never* witness. A badly-specified condition (deliver an
  empty box that satisfies the letter) is the agent's risk to eat and
  learn from.
- Both clause shapes ride the **shipped detection seam**: an *achieve*
  clause fires on *satisfied* (state-test becomes true / event matches); a
  *maintain* clause fires on *violated* (same machinery, opposite
  polarity). Only the agent-as-reactor half is new, and that's mostly an
  NPC brain doing its job.

### 5.3 The gig (an achieve clause that settles)

**[DECIDED] Task-agnostic five-state lifecycle.** Modeled on **delivery**
(buildable today; crisp engine-verifiable completion) — "cull the lion" is
the identical machine once combat exists; the task only fills the "work"
slot.

1. **open** — a Contract record in the pool: issuer + task + reward + the
   achieve-condition (a query over modeled state). Posted *systemically*
   (Dave's stock is genuinely low) or offered by an NPC. Discovery: the
   board, or an NPC offer.
2. **claimed / escrowed** — acceptance commits the reward into **escrow**
   (a real held balance out of the issuer's account, owned by the
   contract). *[REQ: escrow must be legible — the stakes are real because
   the money is locked and visible.]*
3. *(work)* — the contract waits; the world does the work
   (haulage/movement/…). It names a **goal, not a path** — the sim is the
   pathfinder.
4. **settled** — the achieve-condition holds (engine reads modeled state
   via the detection seam); escrow releases issuer→contractor, attribution
   recorded, contract closes. *[REQ: completion is acknowledged in-world —
   the world *noticing* is the emotional payoff; the coin is the
   receipt.]*
5. **breached** — abandon / timeout → escrow reverts, small standing /
   regard ding. *[REQ: failure must cost something felt, or there's no
   stake.]*

Forks: **[OPEN]** exclusive-claim vs open-bounty (delivery wants
exclusive; "cull the lion" may want open) · **[OPEN]** expiry · v1 gigs
**must** carry an engine-verifiable condition (§5.2) — completion crispness
is a content constraint, not a fork.

### 5.4 Employment (a standing maintain clause)

Employment is the gig's **relationship** case: step 4 never fully fires —
you keep showing up, nothing re-settles, the wage accrues, trust ramps.

- **[DECIDED] The fantasy is *belonging* (the gig's is *achievement*).**
  Judge every employment mechanic by one question: *does it make the
  player feel they belong to this place and these people?* Tips = the
  regulars like you; firing = you don't belong here anymore; the
  capability grant = you've got the keys, you're staff; being recognized
  (boss + regulars know your face) *is* the belonging.
- **[DECIDED] Three objects.** **Position** — the job definition on the
  workplace (the maintain clause + the achieve micro-tasks it spawns + the
  wage rate + the duties it authorizes; the *seat*). **Employment** — a
  character filling the seat: a standing record (employer-account ↔
  employee; status: employed / on-duty / off / quit / fired); persists
  instead of settling. **Shift** — the bounded on-duty interval; dormant
  until clock-in.
- **[DECIDED] Backbone: employment is a time-and-role-boxed capability
  grant.** On-shift confers the position's authorizations (work the taps,
  reach the till); off-shift / terminated revokes them. Makes "fired/quit"
  bite (you lose the keys); opens the trust dimension for free (reach the
  till → skimming possible; depth deferred). **The grant ramps with the
  relationship** — the stranger gets the grunt slice and *earns* the till;
  low-trust onboarding is a feature, not a limitation.
- **[DECIDED] The compensation model falls straight out of the clause
  primitive** (it's not four bolted-on mechanisms — it's the two shapes):
  1. **Flat time-wage for the *maintain* clause** — you're paid for
     *holding the maintenance* (presence / availability), because a
     maintain clause is unsettleable. The **employer bears demand risk**
     (lulls still pay — that's what makes it employment, not a bounty).
  2. **AFK gate the engine owns** — wage pauses / auto-clock-out on
     genuine checked-out idle (the shipped anti-AFK predicate). Honest
     players never see it; only exploiters hit it.
  3. **Tips / credit reward the *achieve* micro-tasks** — discrete,
     settleable, social; off payroll; a gift not a meter; can't be faked
     to mint wage.
  4. **Firing for cause** — whether you're holding the maintain clause
     *well* is the boss's judgment (an agent *reacting* to the engine's
     facts), never a productivity meter (a meter is grind; §1's "don't
     mechanize significance").
- **[DECIDED] The bartender is the right first slice** — the work beneath
  it is already built (the by-hand pour/stir/shake/strain/garnish loop);
  employment wraps *purpose + wage + authorization* around an activity
  that's already fun.

**Experiential requirements the first-day walk surfaced** (experience →
the model it demands):

- **[LEAN] Diegetic discovery** — Dave *offers* (because he's genuinely
  short-handed — the systemic posting), the menu is the fallback path.
- **[LEAN] A person teaches the first shift** — the simplest recipe is the
  lesson, taught in character (the Dr. Limen precedent), not a popup.
- **[DECIDED] The first tip is the emotional payday; the wage is
  deliberately ambient underneath it** — reward feels *social*, not like a
  meter ticking.
- **[OPEN — biggest undiscovered requirement] Cozy downtime.** The lull
  must be presence you *want* (wipe the bar, learn the regular's name,
  hear Dave's stories), not dead air — or belonging never forms and the
  player alt-tabs. **Has no mechanics behind it yet.**
- **[LEAN] Shift model** — voluntary clock-in, employer-bounded; rigid
  schedules are hostile to real humans, deferred.

## Current build state [NOW]

- Coin is **minted at a deficit and logged** (CB subsidy; the
  red-by-design P&L already exists in banking).
- The **only consumer of coin is Dave's bar staff wages**.
- This placeholder is **correct** until a second author or
  coin-players-actually-feel appears (nothing to inflate; no second author
  to be unfair to).
- **The deficit log *is* the seam** the §4 model plugs into. Graduation is
  **mechanical, not a rewrite**: give Dave's a real account, point payroll
  at it instead of the CB, let drink revenue flow back in; the deficit
  line becomes earned-vs-spent (its P&L).

## Open questions / forks (consolidated)

1. **Cozy downtime** (§5.4) — the biggest *undiscovered* requirement; the
   lull must be presence the player wants, and it has no mechanics yet.
2. **Death's mechanical cost** (§1) — blocked on advancement producers.
3. **Discoverability / pricing / gating** of the job board (§3); gig
   **exclusive-claim vs open-bounty** and **expiry** (§5.3).
4. **The two ends of an author budget** — CB allocation + insolvency
   backstop (§4); both governance calls.
5. **The high-stakes adjudicator role** (§5.2) — the residual case the
   hard rule sends *outside* escrow but that a player might still want
   underwritten (third-party attestation); + illicit-contract depth (§2).
6. **Old age / lifecycle / succession** (§1) — parked.

## What this slate does NOT cover

- **The combat system itself** (stats, damage, the engaged-graph, party
  tactics) — [combat-tactics-slate](../deferred-rpg/combat-tactics-slate.md).
- **The narrative/quest layer** (beats, genres, the goal-set) —
  [quest-modeling-slate](./quest-modeling-slate.md). A contract here is
  economic/legal, not a narrative arc.
- **Macro money-balance at population scale** — deferred to a running game
  (economy-slate's standing caveat); §4 resolves the *structure*, not the
  *numbers*.
- **Advancement / how gains are made** — the dependency that unblocks
  death's recovery cost; [advancement.md](../../subsystems/advancement.md).

## Once shaped into formal requirements

The buildable kernel is the **work model** (§5) — the clause primitive +
its verification, with employment as the first standing instance:

- **The clause + verification core** — a `{shape: achieve|maintain,
  condition, observer}` unit, where `condition` is a query over modeled
  state on the shipped detection seam and the observer is the engine.
  Enforce the hard rule at the contract boundary: **a clause may only be
  escrowed if its condition is engine-verifiable**; fuzzier intents are
  rejected from the system-backed path (informal/no-escrow).
- **The gig** — the five-state Contract lifecycle (open → claimed/escrowed
  → settled | breached), funded by escrow from the issuer's account,
  resolved by an *achieve* clause; modeled end-to-end on a **delivery**
  gig (crisp completion). Legible escrow; in-world completion
  acknowledgement; a felt breach cost.
- **Position** authored on a workplace (the *maintain* clause + spawned
  *achieve* micro-tasks + wage rate + afforded duties).
- **Employment** standing record (employer-account ↔ employee; status
  machine: hire / clock-in / clock-out / quit / fire).
- **The capability grant** — on-duty confers the position's
  authorizations; off-duty/terminated revokes them; the grant **ramps**
  with relationship standing (grunt slice → the till).
- **Compensation** — `payWage` on a timer for the *maintain* clause
  (drawn from the employer account, the CB-deficit placeholder until the
  account is real), gated by the anti-AFK predicate; **tips** rewarding
  the *achieve* micro-tasks as a voluntary off-payroll transfer; **firing**
  as a termination (the boss's judgment on the maintain clause).
- Tests: a clause with a non-engine-verifiable condition is rejected from
  escrow; a delivery gig settles when the box-state holds and reverts on
  abandon; on-duty confers the bar affordances and off-duty denies them; a
  clocked-in-but-AFK employee stops accruing wage; a tip moves coin
  customer→employee off payroll; firing revokes the affordances and ends
  accrual; the wage draws from the employer account (deficit-logged in v1).

Everything above this kernel — the full contract/adjudication stack, the
job board, the author-budget economy, the death model — waits on its own
builds (and, for the death/contract half, on combat reaching its design
phase).
