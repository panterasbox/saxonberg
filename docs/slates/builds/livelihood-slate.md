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
> **Second pass (2026-07-23): employment in the abstract.** The shipped
> employment engine ([employment.md](../../subsystems/employment.md))
> built §5's standing slice; this pass generalizes it — the arrangement
> schema (§6), the four constituency walks (§7), and the macro + the
> two-tier public-works program (§8).
> **Built (2026-07-25, the work-contracts build):** the §5 gig kernel +
> the §6 arrangement generalization SHIPPED →
> [contract.md](../../subsystems/contract.md) (clause/condition
> templates, the five-state gig over conserved escrow, the two-beat
> turn-in, the job board + `work` verbs),
> [banking.md](../../subsystems/banking.md) (the closed leg-kind
> vocabulary incl. escrow + `draw`; the custodian rule — custody is a
> relationship; institution-keyed accounts), and
> [employment.md](../../subsystems/employment.md) (compensation bases on
> `Position`, `banksAt`, the draw verb). Remaining design surface: §1
> (death), §2's adjudication stack, §3's systemic generator + NPC
> claiming, §4's macro, §6.3–§6.5 (schedule/perks/liability), §7 (the
> constituency walks), §8 (the Circulation Reserve + public works).
> **Retire when:** the remaining halves fold into their consuming builds
> (death → the deferred-rpg combat line; macro/public-works → the
> cooperative/economy build) or split to their own slates.

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
- [crafting-slate](../tails/crafting-slate.md) /
  [banking.md](../../subsystems/banking.md) — Dave's Bar venue + the
  conserved money substrate (`payWage`, the CB mint/drain chokepoint, the
  deficit P&L) the employment model lands on.
- [cooperative-slate](./cooperative-slate.md) — the CB allocation policy
  (§4) is *monetary policy*, i.e. a governance decision, not a hardcode.
- [vitals.md](../../subsystems/vitals.md) /
  [activity.md](../../subsystems/activity.md) — the cascade/consciousness
  seam (death) and the engagement + anti-AFK substrate (the wage gate).
- [employment.md](../../subsystems/employment.md) /
  [governance.md](../../subsystems/governance.md) /
  [accountability.md](../../subsystems/accountability.md) — the shipped
  seat/wage engine (§5's standing slice), the Office + treasury layer
  §7.3 joints onto, and the harm ledger §6.5's liability rule rides.

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

> **[NOW]** Shipped by the work-contracts build — the five-state gig
> over conserved per-contract escrow, exclusive + open-bounty claim
> modes, the two-beat turn-in (`fulfill`/`job complete`), lazy expiry,
> breach-with-regard-nudge, and the terminal-hall job board. See
> [contract.md](../../subsystems/contract.md). The systemic generator
> ("Dave's stock is genuinely low → a gig posts itself") and NPC
> claiming remain open here.

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

## 6. The arrangement schema (employment in the abstract)

> Second-pass core (2026-07-23). The question: one model spanning
> different kinds of arrangements, business models, liability
> concerns, compensation models and schedules — with every seat
> fillable by an NPC or a player.

- **[DECIDED] Contract is the genus; employment is a species.** An
  **arrangement** = **parties + a bundle of clauses (§5.1) + terms**
  (compensation basis, schedule, capability grant, perks, liability
  assignment, duration, revocation, breach consequence). Employment,
  gig, consignment, franchise, and lease are all species. The
  codebase has already shipped four species independently without
  naming the genus — `Employment`, `ConsignmentListing` (a
  commission agreement, person↔business), the dorm `UseGrant` (a
  lease), `CombatTerms` (consent terms). **Do not rush a code
  unification** — the design names the shared schema so each new
  business model is authored as *data on the arrangement*, not a new
  subsystem; unify code only where it pays.
- **[DECIDED] Parties may be entities.** A Business can be a party
  to an arrangement (the franchise's parties are two Businesses —
  §7.4). The participant-contract gating pattern shipped for
  employment already points the way.

### 6.1 The four compensation bases

> **[NOW]** Shipped — `Position.compensation` (`time` /
> `per-settlement` / `share-of-flow` as data; residual = the
> solvency-checked `draw` leg + verb). See
> [employment.md](../../subsystems/employment.md) § Compensation bases
> and [banking.md](../../subsystems/banking.md) § The leg-kind
> vocabulary (the wage-vs-draw tax wedge).

- **[DECIDED] Every compensation model is a mix of four bases** —
  the first two fall straight out of the clause shapes, and the
  third is already shipped twice without the name:
  1. **Time** — pay for *holding a maintain clause* (wage / salary /
     retainer). Structurally unsettleable → paid by interval; the
     **employer bears demand risk** (lulls still pay).
  2. **Per-settlement** — pay per *achieve* settlement (piece-rate,
     bounty, per-unit). The **worker bears demand risk** in exchange
     for freedom — the miner's natural basis.
  3. **Share-of-flow** — a conserved split leg taken at the moment a
     flow moves (commission, royalty). Shipped as the consignment
     sale split and the bank-fee corpo royalty
     (`ensureCorpoTreasury`); commission and royalty are the same
     primitive.
  4. **Residual** — the P&L remainder. **Not a clause at all**: this
     is *ownership*, a claim on the account, the reward for bearing
     risk. Variable, sometimes zero, sometimes negative — and that
     riskiness is pedagogically load-bearing (profit is not a wage).
- Dave's Bar is the canonical two-layer case, not a complication:
  time-wage for availability (the maintain clause) + tips on the
  order-driven achieve bursts riding on top.

### 6.2 Ownership vs the seat (and the tax hook)

- **[DECIDED] Seat-occupancy is orthogonal to ownership.** A
  Position is the capability vehicle (on-shift confers the mixin —
  shipped); the owner *may* hold a seat, with or without a wage term
  — Dave's unpaid `beginCover` is the shipped exemplar. A pure
  absentee owner holds only the residual. The uniformity instinct
  ("just make the owner an employee") is satisfied at the *seat*
  level; the money side stays honest.
- **[DECIDED] The owner's take-home is a *draw/distribution*, never
  silently a wage.** The tax argument cuts this way, not the other:
  if the owner's take-home were a wage, "what the business earns vs
  what the owner takes home" collapses into payroll and there is
  nothing left for a differential tax policy to see. The
  wage/profit distinction the tax wants to price only exists if the
  model keeps the two movements distinct.
- **[DECIDED] Ledger-leg-kind discipline — the load-bearing
  commitment *now*.** Every economically distinct money movement is
  a distinct, named ledger leg kind: wage, draw, sale, fee, royalty,
  tip, escrow settlement, match, appropriation draw. The ledger
  already tags legs by `kind`, so this is a discipline, not a build.
  Tax policy later = a governance-set rate table over leg kinds —
  no rework regardless of how entity forms evolve.
- **[DECIDED] Entity form becomes a term on the Business — later.**
  Whether the owner must be an employee is a property of the *form*,
  and the real world's answer is the lesson: a sole proprietor is
  **not** an employee (pass-through, draws); an S-corp
  owner-operator **must** pay themselves a reasonable salary (the
  payroll-vs-distribution wedge, closed by law because owners gamed
  it); a C-corp owner-executive is an employee with double-taxed
  dividends. The tax/liability wedge between forms is *why the
  choice exists* — discoverable gameplay. v1 businesses are all
  pass-throughs (true to their fiction: Dave, the mine folk); forms
  arrive with live tax policy, imposed **diegetically by the
  polity**, not by the engine — that rule is law, not physics.

### 6.3 Schedule is a term

- **[DECIDED] Four schedule shapes** on the Position: **rostered**
  (NPC default — the shipped day-hour `Roster`),
  **voluntary-within-windows** (player default), **on-call**,
  **self-directed** (the mine). All four are data.
- **[DECIDED] For players the roster is an expectation, not an
  enforcement.** The engine records attendance-vs-roster as fact;
  showing up badly is input to the boss's judgment — firing is an
  agent reacting to the engine's facts, never a meter (§5.4's rule).

### 6.4 Employee-as-customer perks

- **[DECIDED] Perks are terms on the arrangement** — in-kind
  compensation (employee discount, first refusal), fully diegetic.
- **[LEAN] Under authored fixed prices: queue priority, not price
  break.** Scarcity at a posted price is an arbitrage for *whoever*
  buys first — first-crack just picks the winner, it doesn't create
  the problem. Priority rides the shipped Attendant substrate (the
  Circle skip-the-queue precedent). Save price-break perks for real
  pricing (retail S3). The co-op form is cleaner still: first crack
  at output = residual-share paid in kind (§7.2).

### 6.5 Liability

- Two kinds, both with shipped substrate: **breach** (escrow
  reversion + a recorded fact — §2) and **harm in the course of
  work**.
- **[DECIDED] Liability follows authorization/control, per
  dimension, as recorded in the arrangement** (respondeat superior,
  generalized). An act within a Position's authorized duties assigns
  liability to the **Business**; outside scope it stays personal.
  The bouncer who ejects someone is the bar acting; the bouncer who
  follows them home is a person committing a crime. Rides the
  shipped accountability ledger (add acting-as/scope context to the
  row) — the same move §2 already made for bounties ("authorization
  launders lethality to the sanctioning authority").
- The rule extends up chains of control: harm from a corpo-*mandated*
  dimension (the required recipe poisons a customer) walks up to the
  mandate's author; the franchisee's own shortcut stays local — the
  real-world joint-employer line, made inspectable, because the
  arrangement record *is* the document that answers "who controlled
  this dimension" (§7.4).
- The Business account is the damages pool — one more reason
  businesses need real accounts. Entity forms later differentiate
  the shield (sole-prop = personal liability; corp = the firewall
  that is the reason LLCs exist).

## 7. The four constituencies (structural walks)

**[DECIDED] Stress the schema by employer *kind*, not by job.** Jobs
multiply forever but only vary clause *content*; constituencies vary
**structure** — who authorizes, who bears which risk, where the
residual goes, who is liable. Four kinds; the schema survived all
four walks with no special case.

### 7.1 Proprietor — Dave's Bar (shipped baseline)

Time-wage + achieve bursts (§6.1); owner works via the unpaid cover
seat; employer bears demand risk. The shipped engine
([employment.md](../../subsystems/employment.md)) is this walk's
implementation.

### 7.2 Co-op — the mine (designed, unbuilt)

Maximally unlike the bar on every axis, which is why it's the best
stress test: **per-settlement** comp (piece-rate on ore delivered),
**self-directed** schedule, the **residual belongs to the
member-folk** (the mining-slate's proto-cooperative), perks-in-kind
(first crack at output = a membership benefit — §6.4). Needs almost
nothing new from employment: a Position whose comp term is
piece-rate. Mining itself is its own build
([mining-slate](./mining-slate.md)); the *arrangement* is designable
now.

### 7.3 The state (public sector)

- **[DECIDED] The state is a business with no owner.** The
  residual-claim slot is empty: surplus rolls to the treasury,
  deficits are covered by tax or the CB. Everything else fits the
  schema — the public sector is the degenerate case, not a new one.
- **[DECIDED] The new primitive is the appropriation.** Collectives
  can't sign; they act through votes that produce authorizations.
  The legislature votes an **appropriation** — `{purpose, cap,
  executing office, drawn-down balance}` — and an office-holder
  executes it as perfectly ordinary contracts and positions.
  Legislature appropriates; the executive contracts. It's the small
  missing joint between three shipped layers: the Office substrate,
  the conviction/quorum machinery, and the treasury.
- **[DECIDED] Office ≈ Position** — the same seat-confers-capability
  shape (`requiresGovernor` ↔ on-shift `MakerMixin`). Don't merge
  the code (offices carry constitutional weight); the design names
  the rhyme. A civil-service job is a Position whose Business is the
  polity.
- **[DECIDED] Public money is glass.** Players directing public
  money to players (procurement) is the corruption surface — a
  surface to make **legible**, not a hole to plug. The engine chains
  vote → appropriation → contract → settlement, publicly queryable
  (the chain-of-title / append-only-ledger shape); institutions and
  elections do the judging. No `canEmbezzle()`. Private books stay
  private; public books are glass — an honest asymmetry.
- What the state buys slots into existing shapes with zero new
  mechanics: **civic wages** (the employer-of-last-resort program,
  §8), **procurement gigs** (achieve clauses with treasury escrow),
  and **bounties** — which §2 already designed as public-sector work
  without naming it (the sanctioning authority is the state issuing
  a gig).

### 7.4 Corpo — the franchise spectrum

- **[DECIDED] Three arrangements on one axis: who fronts capital and
  who bears which risk.** Blurring them loses the lesson:
  1. **Company-owned unit + salaried manager** — just employment;
     the corpo is the residual claimant.
  2. **Operator agreement** (the sharecropper shape) — the corpo
     fronts capital, premises, and inventory; the operator fronts
     *labor only* for a share of revenue. This is the
     economy-slate's "capital on-ramp," named honestly.
  3. **True franchise** — the operator fronts their *own* capital,
     owns the unit, bears all demand risk, and pays a **royalty on
     gross revenue** for brand, playbook, supply chain, and
     territory. Royalty-on-gross is the crown-jewel lesson: **the
     corpo gets paid even when the franchisee loses money** — rent
     on the flow, never a share of the residual.
- **[DECIDED] Entity↔entity parties** — the agreement's parties are
  two Businesses (§6's schema extension).
- **[DECIDED] Two-hop conferral.** The franchise confers onto the
  *business* (brand license, recipe access, territory), whose seats
  then confer onto whoever's on-shift: corpo → unit → seat → worker.
  Quit and the recipes go dark — the license was the business's,
  never yours. Trade secrets, modeled truthfully with shipped shapes
  (`RecipeCatalogue`/`offeredRecipes`, the `BrandedMixin` mark,
  parcels for territory).
- **[DECIDED] Termination is a revocation cascade** — de-branding:
  license revoked, recipe access gone, the mark comes off the sign.
- **[DECIDED] The operator agreement is the ownership ladder in a
  no-credit economy.** All credit is deferred wholesale; revenue-
  share arrangements are how capital reaches labor without loans
  (historically exact — sharecropping arose where credit was
  absent). The rung sequence: seat → operator share → franchisee →
  independent proprietor. Likely the first corpo-constituency
  *build* (retail S4), though the true franchise is the richer
  model.
- **Player-shop symmetry check** (cross-cutting): absentee owner =
  residual-only; NPC clerk = the actor-agnostic seat (the shipped
  `EmployedMixin` is already actor-agnostic; only the
  player-capability composition seam waits). NPC↔player
  interchangeability holds in both directions.

## 8. The macro — unemployment & the public-works program

### 8.1 Unemployment decomposes into two problems

- **Unfilled seats** (too few workers) — already solved
  structurally: NPCs are the backstop (rosters, the `covers` brain),
  receding as players take seats. §3's NPC-bootstrap doing its job.
- **Too few jobs** (players saturate the demand-derived work) — the
  real macro lever. Jobs derive from demand ← spending ← money
  supply, so the dial is the **CB dual mandate**
  ([economy-slate](./economy-slate.md)'s "wage rate = the policy
  instrument"). **[DECIDED] Balance = policy, not formula** —
  governance owns the dials; the engine supplies instruments.

### 8.2 The floor: authoring the world as public works

- **[DECIDED] The employer-of-last-resort job is content
  authoring** — the always-available base job, paid from the public
  budget, that *creates the content that creates the jobs*.
  Self-healing loop: unemployment → floor job → new content → new
  solvent businesses → new seats → the pool drains. The make-work
  isn't make-work. Real-world analog, exact: a job guarantee funding
  public works, and specifically the WPA Federal Writers'/Art
  Projects — except here new content is new *productive capacity*.
- **[DECIDED] It is a real Position of the polity** (§7.3): a
  maintain clause at a **fixed floor wage deliberately below private
  wages** — the buffer-stock anchor. Private employers can always
  hire out of the pool by beating the floor, so the program is
  **counter-cyclical by construction**: empty in booms (spends
  nothing), absorbing in slumps (spends exactly when demand is
  scarce), self-draining on recovery.
- **[DECIDED] Pay time, never piece-rate.** A per-room bounty is an
  incentive to spam dead rooms. The floor wage rides the shipped
  anti-AFK machinery; the upside for *good* authors is not the wage
  (see 8.3 and the shipped producer stock — provenance-attributed
  standing on real engagement).
- Rides the authoring stack as built/planned: protowizard
  content-write (never code-trust), scoped parcels, provenance
  attribution, the deferred forums-review publish gate as the
  curation layer (the WPA had editors too), and a commissioning
  surface off real-need signals ("the Port district needs a tavern"
  — the city design's archetype-instantiation model).
- **The program quietly unifies five threads:** the unemployment
  floor (§8.1) + the fiscal transmission lever + the author-budget
  intake end (§4's open "how does a new author get a starting
  budget" — *you don't get a grant, you get a job*) + the
  player→contributor on-ramp (help.md names the shape as a platform
  goal) + the cooperative's "make" chamber paid by the polity to
  grow the commons — the founding thesis rehearsed as a game loop.

### 8.3 The match: demand-gated growth funding

- **[DECIDED] Second tier: the state matches the content's earned
  revenue.** Demand has to be there or nothing earns and nothing
  depletes the pool — quality converted from a curation judgment
  into a market test. Honestly framed: a **subsidy for positive
  externalities** — private revenue captures the private value; the
  match pays out the public value (jobs, circulation, a bigger
  world), proportionally to evidence it exists (people showing up).
  The state stays out of taste-making: the legislature votes the pot
  size; players decide who earns it by voting with their feet.
- **[DECIDED] The match does not replace the floor.** A match is
  **pro-cyclical** (low traffic → no revenue → no payout, exactly
  when a rung is needed most; the day-one author earns zero). Two
  tiers, two jobs: the floor stabilizes, the match grows. The career
  ladder: floor wage → first content → the match amplifies early
  demand → the content self-sustains → the author graduates off the
  program entirely. **[LEAN]** Taper the match rate as revenue grows
  — an infant-industry subsidy with a built-in phase-out.
- **[LEAN] Match *earned revenue*; don't privilege tolls.** Any
  conserved leg into the content's business account counts (cover
  charge, sales, fares, rent). Entry tolls are one authorable
  revenue model — cheap to build (parcels + doors + the
  credential/key substrate) and self-policing (a toll booth on
  boring content earns nothing twice).
- **[DECIDED] Wash-trade defense: never match raw coin flow.**
  Matching raw flow is a mintable faucet (pay a confederate's toll
  on repeat, split the match — conservation doesn't stop it because
  the match leg is new money). Match against **deduped,
  distinct-visitor, per-period-capped revenue** — per-`{payer,
  content, bucket}` dedup + self-credit exclusion + caps, the exact
  shape the shipped producer stock already uses against
  engagement-farming.
- **[LEAN] Fund the match from a fixed appropriated pool per period,
  distributed pro-rata to matched-revenue shares** (the
  creator-fund shape). Total spend = the voted appropriation no
  matter what happens in the world; demand decides *distribution*
  only. Wash-trading under pro-rata steals share from other authors
  instead of minting — bounded, glass-ledger-visible (§7.3),
  institutionally punishable.
- **[DECIDED] Nothing is uncapped.** Floor = wage × pool cap; match
  = the pot. Both legislative (appropriations); only allocation is
  demand-driven. This answers the "how do you prevent inflation if
  you uncap the accounting" worry: the accounting is never uncapped.
  Third bound, structural: the output is real supply — the money
  chases a *bigger world*, not the same one.
- **[NOW] Honest wrinkle:** under authored fixed prices (Law 1),
  excess money shows up as hoarding and queue pressure, not price
  inflation; the Circulation Reserve's floating terms-of-trade
  controller ([terminus-city](../../staging/terminus-city.md)) is
  the designed answer. This program lands **after or alongside the
  Reserve**, not before.

## 9. Seasonality — the labor market's missing time dimension **[2026-07-31]**

Everything above models labor demand as **flat**. It is not: agriculture's
demand for hands is violently seasonal, and that single fact is the historical
origin of day-labor markets, migrant work, winter unemployment, and
counter-cyclical industry. Giving the curve a shape costs almost nothing here,
because **three things already designed separately click together the moment it
has one.**

### It explains the compensation basis — the best consequence

§6.1 already states the economics without naming the cause:

> **time** — "the **employer bears demand risk** (lulls still pay)"
> **per-settlement** — "the **worker bears demand risk** in exchange for
> freedom"

**Seasonality is what creates that demand risk.** Nobody carries a wage through
an off-season, so:

| Role | Basis | Why |
|---|---|---|
| **Permanent farmhand** | **time** | the employer accepts carrying them through winter — that is what a permanent seat *is* |
| **Harvest hand** | **per-settlement** | paid per bushel brought in; nobody pays a wage for a fortnight of need |
| **Miner** | **per-settlement** (§7.2) | the same logic, for the same reason |

So agriculture's piece-rate and the mine's piece-rate are **the same
phenomenon**, derived from a shipped data field rather than invented. A farm
naturally runs a **small permanent crew plus a seasonal surge** — exactly as
real farms do — and the two rungs of the automation ladder stop competing and
start composing.

### Three designed pieces, already the right shape

- **`voluntary-within-windows`** (§6.3, the player default) **is the seasonal
  shape.** Make the window the harvest and no new schedule vocabulary is needed.
- **The mine is `self-directed` + piece-rate + co-op residual** (§7.2) — an
  arrangement chosen for other reasons that happens to be *built to absorb
  intermittent labor*.
- **The public-works floor is "counter-cyclical by construction"** (§8.2) —
  empty in booms, absorbing in slumps, self-draining on recovery.

### Seasonality gives the job guarantee its clearest demonstration

§8.2's floor is designed against the **business cycle** — which is aperiodic,
invisible, and hard to feel. Seasonality hands it a **predictable annual
cycle**:

> **Every winter the pool fills. Every harvest it drains into the fields**, as
> private wages beat the deliberately-below-market floor and employers hire out
> of the buffer stock.

Players *watch the buffer-stock mechanism work*, once a real month, forever. The
WPA analogy stops being an analogy — it becomes **literal winter public works.**

### Two absorbers, not one

Winter labor has both a **public floor** (the wage anchor, below private) and a
**private alternative** (the mine, competing above it). That is a richer and
more honest macro than a single absorber: the floor sets the ground, the mine
bids against it, and a player chooses.

**And the mine gains a labor-supply constraint it did not have** — cheap hands
in winter, scarce at harvest. Free, and true: miners were farmers in the
off-season.

### Players are structurally seasonal labor

Intermittent play *is* the seasonal-work pattern. Gigs (achieve → settle) fit
players; standing employment (maintain → time) fits NPCs, who are always
present. That is not a limitation — it is the natural division, and §3's
NPC-bootstrap already leans this way.

### It answers §5.4's open question at world scale

**"Cozy downtime"** is called this slate's *"biggest undiscovered requirement…
has no mechanics behind it yet."* **Winter is that lull, at the scale of the
whole world** — and seasonality supplies the answer the shift-level version
lacked: *you do different work.* The mine, the floor, indoor crafts,
[preservation](./preservation-slate.md), repair, teaching. The lull is not dead
air; it is the other half of the year.

### Two guard rails

> **1. Seasonality changes WHAT you do, never WHETHER you can earn.** If harvest
> pays triple and winter pays nothing, rational play is to appear only at
> harvest. The counter-cyclical employers are precisely what prevent that: there
> is always work, it is just different work.

> **2. The harvest must never require attendance.**
> NPC hands are always hireable at standard rates for a standard result. Player
> labor is *better or cheaper*, never *required* — a landowner who finds nobody
> still gets a harvest. Same rule [weather](../tails/weather-slate.md) runs on:
> **modulate, never gate.** A scheduled world-event you must attend is a
> treadmill, and Law 2's spirit forbids it.

### The mechanism is already shipped

[contract.md](../../subsystems/contract.md) has everything a harvest gig needs:
**open-bounty** posting (escrow-held at post rather than claim — right for
"anyone who brings in a bushel gets paid"), **`expired`** as a terminal that
reverts escrow, and the physical **job board**. A seasonal gig is an open-bounty
contract whose expiry is the end of the window.

**What is new is only the seasonal *posting*** — more gigs, at better rates,
inside the window.

### Pricing — seasonality argues for the cheap answer

§3 leaves pricing **[OPEN]**: flat difficulty-band vs demand-driven. Seasonality
does not require emergent price discovery to be legible — **seasonally varying
postings** (more work, better rates, in-window) deliver the felt effect at a
fraction of the cost, and stay authored and tunable. Demand-driven pricing
remains the richer answer; it is no longer the *necessary* one.

### Forecastability makes it plannable

Seasons are known in advance and weather is forecastable, so **both sides can
plan** — a landowner lines up hands, a laborer positions for the window. That is
the first genuine *economic* consumer of the forecast surface
[weather-slate](../tails/weather-slate.md) notes is currently inert.

---

## Current build state [NOW]

*(Refreshed 2026-07-23.)*

- **§5's standing slice is built** — the employment engine
  ([employment.md](../../subsystems/employment.md)): Business-as-Idea
  with a real account, Position / Employment / Roster, roster-driven
  shifts, the wage settled at the on→off boundary **from the Business
  account** (§4's graduation happened for Dave's: payroll draws the
  house account, drink revenue flows back in — the P&L is real), tips,
  the capability grant (on-shift confers `MakerMixin`), the unpaid
  owner cover-seat. Around it: banking's Terms/fees/royalty + coinage
  + withdrawal quota, the Attendant queue/lease substrate, and chattel
  + the general store — whose **consignment is a live share-of-flow
  arrangement** (§6.1) already in production.
- **⚠ Stale as written — corrected 2026-07-31.** The **work-contracts
  build shipped** (MR !149 → [contract.md](../../subsystems/contract.md)):
  the clause primitive with engine verification, the gig lifecycle over
  conserved escrow, the **physical job board**, and the two-beat turn-in.
  Strike those four from this list.
- **Genuinely not built:** comp bases beyond time-wage as *authorable
  terms* (**piece-rate** — which §9 makes load-bearing), share-of-flow
  employment, the draw as a named leg kind, entity forms, the
  appropriation, and the **public-works floor + match (§8)** — the last
  of which §9 depends on for its winter half.
- The CB deficit subsidy + red-by-design P&L still backstop the
  system; the deficit log remains the seam the full §4 author-budget
  model plugs into.

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
7. **The public-works dials** (§8) — floor-wage level + pool cap,
   match rate/taper + pool period. Governance dials, not design
   problems; they need seats to own them (CB Governor for the anchor,
   legislature for the appropriations).
8. **The commissioning surface** (§8.2) — who translates "the economy
   needs X" into postings: the systemic need-generator, an
   office-holder's judgment, or both (procgen-carries-the-economy /
   bespoke-carries-the-meaning says both).
9. **The review gate's teeth** (§8.2) — curator office vs forums
   review vs solvency-only; where grief and quality actually get
   decided for floor-job content.
10. **Perks under real pricing** (§6.4) — when retail S3 lands,
    revisit price-break perks (employee discount) vs
    queue-priority-only.

## What this slate does NOT cover

- **The combat system itself** (stats, damage, the engaged-graph, party
  tactics) — [combat-tactics-slate](../deferred-rpg/combat-tactics-slate.md).
- **The narrative/quest layer** (beats, genres, the goal-set) —
  [quest-modeling-slate](./quest-modeling-slate.md). A contract here is
  economic/legal, not a narrative arc.
- **Macro money-balance at population scale** — deferred to a running game
  (economy-slate's standing caveat); §4 and §8 resolve the *structure*
  (conservation + the hard-capped two-tier program), not the *numbers*.
- **Advancement / how gains are made** — the dependency that unblocks
  death's recovery cost; [advancement.md](../../subsystems/advancement.md).

## Once shaped into formal requirements

*(2026-07-23: the Position / Employment / capability-grant / wage /
tips bullets below shipped as the employment engine — see
[employment.md](../../subsystems/employment.md). The remaining kernel =
the clause + verification core, the gig lifecycle, and §6's
generalization: comp bases as authorable terms, the ledger-leg-kind
discipline, the draw as a named movement. §7.3's appropriation and
§8's floor + match are their own later builds, gated on the
Circulation Reserve.)*

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
