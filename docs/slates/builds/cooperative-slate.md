# Cooperative slate (working doc)

> **Status: model settled, build the stake-ledger slice; the full
> republic deferred until there's a population to govern.** The
> *substrate* — what influence is, how it's earned/spent/replenished,
> the membrane that keeps real funding and in-world governance from
> contaminating each other — is worked out far enough to build the
> near-term slice: a **stake ledger** that turns Twitch donations into
> accrued influence, redeemable at launch. The *polity* — three
> co-equal chambers, a parliamentary executive over a civil service of
> chartered institutions, a judiciary that runs one async process —
> scaling from an operator pool-of-one to a sortition jury (letter-
> verification + spirit-judgment) — a tamper-evident archive whose
> integrity is guaranteed by construction rather than by a separate
> operator, and live legislation over the real budget and the in-world
> reserve — is designed but explicitly parked: you can't run a
> government with one citizen, and most of its hard questions
> (apportionment, the dilution curve, judiciary staffing, the
> separation-of-powers population ladder, the tamper-evident archive
> substrate) can only be answered against a real member body. Build the honest ledger now; stand up the
> republic when there's someone to govern.

> **Consolidation:** a formal [draft constitution](./draft-constitution.md)
> distilling this slate into normative articles now exists (status: draft,
> not ratified; four undecided points marked `[OPEN]` with recommendations).
> This slate remains the *rationale*; the constitution carries the
> *provisions*.

Working slate for the **cooperative** — the unified model where the
people who *fund* Saxonberg are the people who *govern its world*. The
governing claim, and the reason this is its own build rather than a tail
of the economy: **funding and governance are the same act seen twice.**
A backer's dollars keep the lights on (real budget); the same backer's
standing is citizenship in the world those dollars pay for (in-world
governance). The cooperative is the bridge — but a bridge is only safe
if the two banks never flood into each other, which is what the whole
first half of this slate is about.

See also:

- [docs/slates/builds/economy-slate.md](./economy-slate.md) — **the
  sibling.** Economy is value-as-physics (how matter and money enter,
  move, leave); this slate is governance *over* that value. The economy
  slate left one macro thread open — how you *deliberately* inject new
  value/content without printing inflation — and the **government
  reserve** below closes it (appropriation = legislative, execution =
  executive; a governed faucet, not a free one).
- [docs/lenses/endogenous-value.md](../../lenses/endogenous-value.md) —
  the membrane this slate lives or dies on. Effort-anchored real worth
  vs pure-play arbitrary value is the *same* line as **stake-is-not-
  stock**: governance/recognition value (legitimate, arbitrary, never
  cashes out) vs financial value (the thing you must never sell). The
  Goodhart seam, one level up.
- [docs/lenses/community.md](../../lenses/community.md) — the social
  body the cooperative formalizes.
- [docs/slates/tails/auth-providers-slate.md](../tails/auth-providers-slate.md)
  — **the keystone the funding ledger rides.** Generalizing the
  Google-only auth spine to Twitch-co-equal + account linking is what
  lets a Twitch sub/dono attach to a Saxonberg identity. The stake
  ledger cannot exist before this.
- [docs/slates/tails/external-chat-relay-slate.md](../tails/external-chat-relay-slate.md)
  — the Twitch binding (inbound reader); the same integration surface
  the dono webhook lands on.
- [docs/slates/deferred-rpg/affiliation-slate.md](../deferred-rpg/affiliation-slate.md)
  — **distinct from this.** Houses / guilds / corps are *social*
  organization (the class system, in-group cooperation + rivalry). The
  cooperative is *governmental* — the polity over all of them. Don't
  conflate a guild with a chamber.
- [docs/roadmap.md](../../roadmap.md) — the funding-model entry.

---

## Why this shape — native-digital governance

The cooperative is a deliberate attempt to answer a question the medium
makes newly askable: **is there a better system of government now that a
polity can communicate in real time, full-duplex, at no distance?** Most
of historical government's machinery was shaped by constraints this
environment doesn't have — and the design discipline is telling those
apart from the constraints that still bind.

Meatspace government fused two different kinds of constraint into one
machinery, and from the inside they feel identical:

- **Logistical artifacts** — you couldn't assemble millions, comms were
  slow, so participation got *batched* into periodic elections; you
  districted by *geography* because power sat in space; you *couldn't
  measure* intensity or stake, so you defaulted to one-person-one-vote.
  This environment dissolves all of them.
- **Protective functions** — deliberation doesn't scale, transient
  majorities need restraining, decisions must *settle*, someone must be
  accountable, identity must be real. These *look* like the same
  friction but were doing load-bearing work; they survive into a digital
  polity (and identity gets *harder*).

The move is never "remove the friction." For each inherited mechanism,
ask *what was this for*: if it propped a logistical limit you no longer
have, replace it with something native to the medium; if it protected a
function, keep the function (you can often implement it better).
**Conviction voting (below) is the template, not a one-off:** it deletes
the artifact (periodic batched voting → continuous allocation over the
full-duplex channel) while re-creating the protective function
(time-weighting restrains transient majorities) in a native form.

### Affordances this polity has that no meatspace state did

- **Continuous preference** — no election day, no stale mandate; standing,
  instantly-revocable positions.
- **Perfect measurement + memory** — weight by *verified* contribution
  (the influence model); every vote transparent and auditable.
- **Fluid delegation (liquid democracy)** — direct-vs-representative is a
  *false binary* here. Delegate your weight on one topic, vote directly
  on another, revoke in a keystroke: division-of-labor without locking in
  a representative for everything. (The "everyone holds influence in all
  three chambers to varying degrees" structure is already
  delegation-shaped.)
- **Computation in the loop** — ML/LLM-mediated mass deliberation
  (cluster a million opinions, surface cross-faction *bridging*
  statements, summarize debate). The one thing that genuinely *partially
  repeals* "deliberation doesn't scale" (cf. Taiwan's vTaiwan / Pol.is).
- **Programmable law + cheap exit** — rules as self-executing code (the
  bound executive made literally automatic); and a faction can *fork the
  world*, so exit is cheap and disciplines the government.

### What does not dissolve — and the new wound

- **Attention is the new scarcity.** Bandwidth is infinite; human
  attention isn't. Always-on governance that demands vigilance swaps the
  wealthy elite for the *terminally-online* elite. Delegation +
  conviction-parking are the mitigations — you needn't watch everything.
- **Sybil is worse, not better.** One human is a thousand accounts. Every
  weighted digital democracy lives or dies here — **and this is where the
  design wins: influence earned only through costly, verified
  contribution (real dollars, adjudicated labor, time-in-play) is
  Sybil-resistant by construction.** Sock puppets cost real
  money/labor/time to empower. The funding model isn't only how dev gets
  paid — *it's the Sybil floor that makes weighted digital democracy
  possible at all.* Load-bearing, not incidental.
- **Measurement invites plutocracy.** The instant you *can* weight by
  stake, you can accidentally weight by wealth. The concave curve,
  non-fungibility, and cap are the guardrail, not polish.
- **Protective friction stays protective.** Instant governance enables
  instant mob reversals; the continuity mechanics below are the
  deliberate friction that replaces the logistical kind.

### The reframe: a polity is content, not overhead

This isn't a nation — it's a **game-world's polity**, which makes it a
*political laboratory*: bounded stakes, a self-selected population that
can exit, room to **run governance experiments reckless in meatspace.**
For an educational platform that's not overhead — it's the **payload.**
Players don't read about civics; they *live inside* a working polity that
can't physically exist. "Is there a better government now that we're all
full-duplex?" is a question this world is built to let people answer by
playing.

**Prior art** (this is a live field worth reading into): liquid democracy
(LiquidFeedback / Pirate Party), quadratic voting & funding (Weyl &
Posner, *Radical Markets*; Gitcoin), conviction voting (Commons Stack /
1Hive), computational deliberation (vTaiwan / Pol.is), futarchy (Hanson —
"vote on values, bet on beliefs"), the DAO space (the largest live
experiment — and a catalog of how these capture and fail), and sortition
(the outlier that fights capture by refusing to weight at all).

---

## The two laws

Everything below falls out of two rules. They are the whole house style
for this subsystem, and the first one is also the legal firewall.

### Law 1 — Stake is not stock

**Membership confers governance and recognition. It never confers
financial ownership, profit, or a redeemable claim on money.**

This is the single line that lets the whole cooperative exist *without a
lawyer*. The moment a backer's contribution carries an expectation of
financial return, it stops being a donation and becomes an unregistered
security — the exact thing this design refuses to be. So:

- What a backer **gets**: influence (voting weight over the world),
  citizenship, recognition, in-world standing, perks. All of it is
  fiction or honor. Nobody can sue over voting weight in a MUD.
- What a backer **never gets**: equity, a share, a dividend, a cut of
  surplus, or anything that converts back to cash.

The discipline in three words an author/operator can hold: never write
the words **investor, share, equity, return,** or **dividend** where a
contributor can read them. The funding chamber is the **Patron House**,
not the investor house. Stake, never stock.

> A backer funds a world and earns a seat in it. They do not buy a piece
> of a company.

### Law 2 — Power is earned and spent, never owned

**Influence is a spendable, regenerating resource — not a permanent
share.** You earn it by contributing, you spend it by voting, and it
replenishes through *continued* contribution. It is never a static
holding that sits and rules forever.

This is the same shape as the economy slate's Law 2 ("use consumes;
never tax absence"):

- **Voting consumes influence** — the use that spends it. The person who
  votes on everything spends down; the person who saves for what matters
  keeps their weight. Power is consumed by exercise.
- **Contribution replenishes it** — the faucet. Recurring dollars,
  ongoing labor, continued play each refill the relevant influence.
- **Absence is never taxed** — stop contributing and the faucet stops,
  but the tank is never drained as a penalty. You simply don't refill.

The consequence is a body that reflects who is *present and
contributing now*, not who funded you in year one. That is what keeps
the republic alive after any founder's personal lock has sunset.

Whether that exercise is a discrete *spend* or a continuous *allocation*
is the chamber's voting rule (see *One resource, not two* below) — the
law is the same either way: **influence is exercised and renewed, never
owned and hoarded.**

---

## Influence — the keystone resource

Influence is the currency of governance. It is assigned to a member and
spent via voting. Three properties make it work.

### Three types, one per chamber, non-fungible

Members aren't sorted into three rival populations — **everyone holds
influence in all three chambers to varying degrees.** The chambers are
three *kinds of earned standing*, each with its own faucet:

| Influence type | Earned by | Chamber |
|---|---|---|
| **Producer** | labor on the project | Producer House |
| **Patron** | dollars contributed | Patron House |
| **Consumer** | engaged consumption (engagement × reputation) | Consumer House |

The load-bearing rule: **the three types are non-fungible.** Producer
influence votes only on the Producer floor, patron only on the Patron
floor, consumer only on the Consumer floor. **No cross-chamber
conversion, ever.** Without this, there is really only one resource
wearing three hats, "majority of chambers" collapses into a single
weighted vote, and bicameralism is theater. Non-fungibility is the
stake-is-not-stock membrane one level down: keep the currencies
separate and the structure is real.

A consequence worth stating: all three faucets reward *sustained
engagement* in their own currency — labor that continues, dollars that
recur, play that keeps happening. The republic structurally favors the
present, engaged contributor over the one-shot backer or the absentee
first-mover, across all three kinds of standing alike. One value, three
faces.

### Three kinds of contribution

The three faucets are three **kinds of contribution**, each earning
standing in its own house — and all three are *meritorious*, which is the
deepest reason the chambers are co-equal:

- **Producer = creation** — you *built* valued things, **measured by the
  engagement your content earns** (below), not by anyone's say-so.
- **Patron = patronage** — you *funded* it (measured dollars).
- **Consumer = participation** — you *consume*, and **consumption is the
  contribution.** Producers build *for* someone; patrons fund *for*
  someone; without the engaged audience the other two houses have **no
  charter.** The consumer house represents the people who are the *reason*
  — the foundational contribution, not a softer one.

Most polities pick *one* basis of standing and live or die by it; holding
three co-equal means **none dominates** (a runaway in any one still needs
two of three to pass anything). The consumer's contribution is framed
around consumption and measured on **two axes — quantity (engagement) ×
quality (reputation)**: you must participate *substantially* **and** be
*valued* for it. That product is what keeps it from collapsing into a
**popularity contest** (reputation alone) or an **idle-farm / no-life
grind** (engagement alone) — neither buys standing without the other. See
*The consumer fault line* under the economy section for the substrate.

**And producer standing is instrumented the same code-first way — engagement is
the rule.** Author something — a zone, a quest, an *assassins guild* — on your
own dime; the engine **measures the engagement it draws.** That much is code: no
human *decides* a producer deserves standing — the engine measures how much the
community uses what they made. But **whether that engagement *betters the world*
— whether the content is good, not just sticky — is morality, and we don't
pretend to measure morality in code** (maybe someday; not now). So the value
judgment falls to the **human layer**: the bounded **merit-pay** bank (*Two
merit channels*, below) is where competent humans reward genuine worth — both
work the engagement-measure can't *see* (infrastructure) and worth it can't
*judge* (the sticky-but-hollow problem, the producer's idle-farm). The split is
the honest one, and it's code-first to the bone: **code measures the measurable
(engagement); humans judge the unmeasurable (value)** — the human layer
load-bearing precisely where the first can't reach. (Fully countering
engagement-farming with a code-grade value signal is the open problem; for now
the human call carries it.)

### Two markers: a stock and a flow

Real funding arrives two ways — **recurring** (subs; the thing you can
write a budget against) and **one-time** (lumps; welcome but
unbudgetable). The design encourages recurring *without* disallowing
one-time by mapping each onto a different physical quantity instead of
making them fight over one number:

| Marker | Measures | Drives | Behavior |
|---|---|---|---|
| **Lifetime total** (cumulative) | everything ever given | influence **reservoir cap** + permanent **honor/standing** | only ever rises; never spent, never decays |
| **Recurring rate** (current) | what you give *now*, per period | influence **regeneration rate** | tracks current subs; stops when you lapse |

Lifetime total sets how much influence you *can* hold and your permanent
place in the project's history; recurring rate sets how fast it *refills*
after you spend. Power at any instant is the *filled* amount — needing
both a reservoir (you've contributed over time) and a faucet (you're
contributing now). The cases fall out for free:

- **Steady subscriber** — modest cap, reliable refill, always topped up.
  The engaged citizen whose voice is always present; the most powerful
  per dollar precisely because it's *sustained*. The profile to grow.
- **One-time whale** — a lump permanently raises cap + honor and deposits
  a **burst** of spendable influence. But no faucet: it drains as they
  vote and doesn't refill. A **moment in the sun, not a throne** —
  honored forever, unable to dominate.
- **Lapsed contributor** — keeps cap and honor (never punished), faucet
  off. Drains down as they vote, then goes quiet until they give again.
  *Stop the faucet; never drain the tank.*

This is also *just*: the legislature can only responsibly appropriate
against **predictable** income, so the recurring base — the people who
make a budget possible — earn the *sustained* voice, while a one-time
lump is **extraordinary revenue** that earns *extraordinary but
temporary* voice. The influence model and the budgeting reality are the
same fact twice.

### One resource, not two — continuity lives in the voting rule

A spendable resource invites a worry: bank influence by ignoring
everything, then dump it to swing one issue (the *ambush*). Two
clarifications defuse it:

- **Concentration isn't the bug; ambush is.** A minority that cares
  *intensely* outvoting an indifferent majority is the *point* of
  intensity-weighted voting. The failure is only power that's *invisible
  until it strikes* — and the **cap already bounds it.** Influence
  regenerates only up to a ceiling set by lifetime contribution
  (concave-damped), so the largest possible strike is your own standing,
  itself bounded. Hoarding is mostly solved by a mechanic already in the
  design.
- **So reject use-it-or-lose-it.** A per-session budget would force
  triage (which issues to spend on, which to abstain), and triage means
  different coalitions show up each session — *manufacturing* the very
  volatility you wanted to avoid. It kills a problem the cap already
  killed and births a worse one. Don't add it.

The deeper instinct — "maybe influence and political capital are two
resources" — is half right. They're *not* two resources (those words are
synonyms; splitting them just doubles the hoardable surface). The two
things really in play are **one resource + a voting rule**:

- the **resource** — influence (a stock: cap + regen, non-fungible), and
- the **rule that converts it to decisions** — and *continuity lives
  here,* not in a second currency.

The voting rule runs a spectrum from **discrete spend** (simple, but
volatile and ambush-prone) to **conviction voting** (time-weighted:
weight on a proposal *builds the longer you hold it there and decays when
you move it*). Conviction voting dissolves all three problems at once: no
ambush (a sudden dump is weak — weight needs *time on position*); no
sessions, so no forced triage; continuity *by construction* (the system
has inertia and memory). Its cost: decisions are slower, and "voting"
becomes continuous *allocation* rather than a discrete act — which
ripples into the two markers (under allocation you don't deplete, so
recurring-rate would gate your current *allocatable weight* rather than a
refill rate; to be worked out as the kernel's conviction rule is specified).

The resolution, updated for the kernel-fixed voting system: **the conversion
rule is itself kernel — a conviction-style continuity, uniform across
chambers** (a chamber is *everyone*, with no prior method to vote a new one
in, and the rule is engineered for stability, so a house can't swap it). What
*is* chamber-internal is the layer *above* the tally: **representation** —
whether members vote directly or delegate to seats. The tiny Producer and
Patron houses can run direct; the huge, volatility-prone **Consumer House** is
precisely the body that would go **representational** — delegation/seats
riding on the *same* conviction tally, not a different one. You don't push the
*rule* down to the chamber (it's kernel); you let the chamber choose its
*representation* on top of it.

**Term limits are a different layer.** They cap *tenure in an office*, so
they belong wherever there are **offices** — the executive, and any
representative seats the Consumer House creates — never on the directly-
exercised resource. The temporal cap on *direct* influence is the
regen-ceiling (and, under conviction voting, the time-to-build).

### Anti-oligarchy by construction

Because influence regenerates only through *continued* contribution,
**money buys moments, not thrones.** A wealthy backer can refill a large
reservoir and unleash a big vote once — but cannot *hold* dominance
without paying continuously, and the Consumer House (co-equal, below)
checks the Patron House regardless. Under a time-weighted voting rule
(conviction voting) the purchased strike is weak anyway — weight accrues
with *time on position*, not with a momentary balance — so the same
guardrail compounds at the rule layer. The dollar→influence curve should be
**concave** (the 10×-bigger donor gets meaningfully less than 10× the
voice) to blunt plutocracy without pretending money doesn't matter — but
the exact curve is a *tuning* number, parked with the rest of the macro
balance (you can't pick it honestly without a running game to measure).

### The franchise is the deepest power — and who holds it

Whoever owns the code that turns contribution into influence controls the
**franchise itself** — the deepest power here, one level under "who counts the
votes": *who measures the contribution that becomes the votes.* By nature it
lands in the **executive** (implementation is executive), the branch
**producers dominate** — so the two risks compound. What contains it is the
whole anti-tyranny stack pointed at its prime target: the franchise code is
**boxed from three sides** — the legislature sets its requirements (all three
co-equal houses, amendment-tier), the executive only *implements*, the
egalitarian judiciary *verifies conformance* before it ships — and every award
is **universally re-derivable** from the record, so a tilt is detectable,
justiciable, and no-confidence-triggering.

The honest residual: the bound is only as tight as the spec is precise. So the
discipline — **specify the franchise function mechanically enough to be
conformance-verifiable** (discretion in the gaps is power), **source
irreducibly-qualitative inputs democratically** (consumer regard already is the
players' quality judgment), and **audit the franchise code continuously** (the
highest-stakes implementation). The aim: the implementer may *make the meter
read what all three houses specified*, never *decide what the meter measures.*
Producer-dominance of the *rest* of the executive is contained by its no-policy
role + confidence + verification; the franchise code is the one place "how"
bleeds into "what," which is why it alone earns these safeguards — and why the
*merit* mechanisms below keep human discretion off it.

### Two merit channels — renown for consumers, merit pay for producers

Pure mechanism can't reward the contribution it doesn't measure. But the human
release-valve isn't *one* lever — because the two houses earn by different
vectors, and the merit mechanism should match each:

- **Consumers earn by participation, and the social signal is renown.** So
  consumer merit is **renown, as a weight, never a mint.** Regard —
  conduct-earned, peer-sourced — **multiplies** the consumer influence a member
  earns by participating (`engagement × regard`); it never mints standalone
  voting weight. This is the safe arrow already designed: *conduct → reputation
  → bounded weight, never reputation → authority.* It kills the
  self-dealing / popularity / Sybil attacks at the root, because **renown ×
  no-participation = nothing** — you can't farm regard into power without doing
  the participation it multiplies. (A per-member "award-only allowance" is one
  way to *source* this regard explicitly — recognition as a deliberate peer act,
  not only an inferred metric.)

- **Producers earn by creation, which renown doesn't track.** Renown is a
  *social* vector — there may be "celebrity wizards" (old MUDs had them), but
  authoring good work isn't what earns renown, and producer influence isn't
  measuring that vector at all. **The rule for producers is the instrumented
  measure** (above): the engagement your content earns. **Merit pay is the
  *exception*** — and it's where the **value judgment** lives, because whether
  content is *good* (not just used) is morality, not a code metric. A bounded,
  minted **bank of producer influence** recognizing creation that measure can't
  capture — *because producers largely contribute unpaid, and
  this is how the polity compensates good work it can't pay for in money.*
  - **Producer influence only** — never consumer or patron.
  - **Minted and capped by the legislature** (the central-bank pattern again).
  - **Evaluated by competence** — judging *good work* needs people who can judge
    it, so this is the one place a flat sortition jury is the *wrong* body and
    competence-based evaluation (the executive that manages the work, or a
    competence pool drawn by lot) is right. It is the conscious exception to
    "never the implementing branch": for craft, competent evaluation *is*
    producer-ish evaluation — the way peer review is.
  - The leashes that replace sortition: **recusal** (no self-award —
    load-bearing here), **sub-decisive** magnitude, **transparency** + public
    rationale, **justiciable**.

**Why the producer bank isn't a power-pump.** Minting producer influence
redistributes power *within* the producer house (toward the meritorious) — it
**cannot tilt producers against consumers or patrons**, because passage is by
**co-equal chambers** counted separately, not a pooled tally. The co-equality
already entrenched is what contains the merit pay; the only residual is
*intra*-producer cronyism, which recusal + the cap + transparency + review
address.

So the mechanism is asymmetric by design, matching each house's nature:
**consumer = social → renown (weight); producer = labor → merit pay (bounded
mint); patron = dollars → neither** (the firewall axis takes no merit).
Placement: the **bounds** are constitutional (Art. III §§6–7); the **specific
instruments** (the renown sourcing, the producer merit-pay institution) are
legislated modules.

---

## The legislature — three co-equal chambers

Non-negotiable design constraint from the outset: **the chambers are
co-equal, or it doesn't work.** They may carry different
*responsibilities*, but a bill is a bill:

> A bill passes on a **majority of chambers** — both in a bicameral
> body, two-of-three in a tricameral one.

The three chambers differ in *center of gravity* — the concerns each
constituency cares most about — but not in procedure:

- **Producer House** — what gets built, production direction.
- **Patron House** — the budget (real dollars) and reserve appropriations.
  The "purse."
- **Consumer House** — world/community matters: lore, events, world policy.

**Bills are global and concurrent — there is no originating house.** Because
membership is shared (everyone holds all three influence types to varying
degrees), "which chamber introduced it" carries no weight. So there is **one
central floor** — one pool of bills up for debate, one *global* deliberation
per bill (a single shared argument-map) — and every bill is voted
**concurrently** by all three houses, passing on a majority of them. (This
resolves the old origination question: the answer is *none*.)

**Voting is per-house and splittable.** A member casts their three influence
types *independently* into the three house-tallies on the same concurrent
bill — and they may **disagree**: yes with producer-influence, no with
consumer-influence. That isn't a quirk; it's the three-contributions design
paying off — you're a producer *and* a patron *and* a consumer, those roles
have different interests, and a bill good for your maker-self may be bad for
your player-self. Each house tallies its own type; passage is by majority of
houses.

A deliberate, permanent property of this shape: with three co-equal
chambers and two-of-three passage, the **Consumer House — however
enormous its population — is still only one vote of three.** The makers
and patrons can never be steamrolled by sheer player numbers. This is
the *permanent* structural check, distinct from any founder's transient
control (below).

### Near-empty chambers — abstain, full-count, fall back

Co-equality has a failure mode at the *bottom*: a chamber with almost no members
(the lone-producer founding phase is the limiting case) isn't a deliberative
body — its "vote" is one person's will, yet it counts as a full co-equal house.
The rule that resolves it without bricking the polity:

- **A house below a `vote.quorum` of active members abstains** — counting toward
  neither passage nor blocking. Not rubber-stamped (assent would make it a
  capture vector), not a permanent veto (dissent would freeze governance):
  *abstain.*
- **Passage is measured against the *full* count of houses, never a shrunken
  one.** One sparse house → the other two must *both* assent (legislate
  cautiously when a constituency is unrepresented). The reason not to shrink the
  denominator: the polity can **never collapse to single-house rule** — if two
  houses go sparse you reach *no* majority, rather than letting the last house
  rule alone.
- **Below viability, fall back — the population ladder in reverse.** Too few
  quorate houses to reach a majority → ordinary law can't pass until
  constituencies recover; sustained sub-viability reverts to the
  **caretaker/operator floor**, the same door the polity rose through at
  ratification. You climb into a republic at a population threshold; you descend
  through the same one if the population craters.

This also **completes the founder's self-binding** — precisely. A polity can
cross the ratification threshold on consumers while the producer house is still
basically the founder; under this rule that sparse house *abstains* rather than
handing the founder a chamber, and the *granted* patron-match sunsets — so the
founder's **control** ends. What does *not* end is the founder's **earned**
producer influence: it reflects real work (the game awards it the same as for
any producer), persists like any member's, and becomes a legitimate, diluting
voice once the producer house reaches quorum. The self-binding strips the
*unearned control*, not the earned standing — the founder steps from controller
to large contributor, **not to zero.** The near-empty rule and the dilution
curve are the same mechanism. (Constitution Art. IV §3; founding charter.)

### The constitution is thin — but the voting system is kernel, not chamber-set

Like the US Constitution, the document is short and the chambers are
internally self-governing — with one sharp exception, forced by a
chicken-and-egg: a chamber is *every member*, so there is no prior body to
choose a voting method and no method to choose it with. The **voting system
itself** — the spend-and-regenerating influence tally, its conviction-style
continuity, count-not-price — is therefore **kernel-given and fixed by the
constitution**; a chamber *cannot vote to change how voting works*. And
because the system is engineered for the game's stability, loosening it is an
**amendment, not a bylaw**: its **structure** changes only by constitutional
amendment, its **tuning constants** (regen rates, caps, thresholds) flex as
*organic law*. So the constitution fixes the **branches, the influence types,
the voting system, passage, origination, the treasury membrane, and the
amendment rule** — and stops. What's left to the chamber is its **internal
organization**: whether it runs direct or representational, its rules
committee, deliberation norms. The Consumer House in particular, with so many
participants, will likely want something **representational** — and that's
exactly the layer where **term limits** belong (capping tenure in a seat). All
*that* is chamber-internal — its own bylaw, not constitutional text; the
voting *method* is not.

---

## Parties & delegation

How do parties and representation shape up here? Start from a structural
surprise: **this system has almost no elections** — the legislature is
influence-weighted (you accrue weight by contributing, you don't *win a
seat*), the judiciary is sortition, the executive is parliamentary (the
PM emerges from confidence). Meatspace parties are overwhelmingly
*electoral machines* — recruit candidates, run campaigns, turn out the
vote — so stripping out elections guts the function they professionalized
around. Run the rest through the artifact-vs-function filter:

- **Information compression** (the party label as heuristic) — *mostly
  artifact.* Transparent voting records + per-topic delegation to people
  you trust replace the coarse brand with a finer instrument.
- **Coordination into a bloc** (aggregating dispersed preference to clear
  a threshold) — *protective function, survives.* Coalitions *will*
  form; the question is fluid vs. ossified.
- **Stable governing coalition** — *survives*, and is the one place the
  system rewards durability: a PM holding 2-of-3 confidence prefers a
  standing alliance to re-negotiating daily.

So durable factions emerge at exactly two pressure points — the
**executive-confidence layer** (stability) and **identity/tribe** (the
three influence-types are a ready-made fault line). Everywhere else the
native affordances push toward *fluid, issue-specific coalitions* that
reform per vote.

### Delegation is already built — it's allocation pointed at a person

**Liquid delegation is the same mechanic as conviction voting.**
Conviction voting parks influence on a *proposal*; delegation parks it on
a *person* who votes it for you — a delegate is just another thing you
point influence at, so the substrate already supports it. Natively:

- **Per-topic, per-chamber delegation** — delegate producer-influence to
  a trusted maker, consumer-influence to a player-advocate; different
  delegates by domain, because expertise is by domain. The delegation
  graph is really three graphs.
- **Instant revocability** — no fixed terms; a delegate holds your weight
  only while you leave it parked. The archive shows exactly how it was
  voted, so accountability is trivial; lose trust, yank it.
- **Transitivity** — chains form, trusted hubs accumulate weight and
  become **emergent representatives**: earned, fluid, instantly-revocable
  — *representation without elections*, more accountable than a termed
  seat.

This is also **how the Consumer House "goes representational"** — not
fixed-term elected reps, but a live liquid-delegation graph.

### Parties are delegation brands

A "party" here isn't a membership org fielding candidates — it's a
**trust/reputation brand competing for your delegated weight** in the
delegation market: lightweight, fluid, instantly losable. The
three-chamber structure shapes them: because the PM must bridge ≥2
chambers, **cross-cutting coalitions** (a "growth" vs. "stability"
faction, each spanning producers/patrons/players) are favored over
hostile chamber-tribes — a pure "patrons' party" can't govern alone.
That's healthy: it keeps the producer/patron/consumer cleavage from
hardening into tribal war.

### The two real dangers

- **Delegation super-hubs.** Real liquid-democracy systems show a
  power-law — a few charismatic hubs accumulate enormous delegated
  weight, an oligarchy of delegates. Mitigate by extending the existing
  guardrails to *delegated* weight: a **cap** on how much one person can
  hold, the concave curve, **decay/re-affirmation** (Law 2 — delegated
  weight lapses unless renewed), and full **transparency of the
  delegation graph.**
- **Transparency vs. coercion.** Perfectly visible votes enable
  accountability *and* whipping/retaliation (a hub sees who defected).
  The fix is already in the toolkit: the archive's **verifiable-but-
  secret ballot** (the "private but provably-unaltered" property) —
  secret where coercion-resistance matters, public where accountability
  does, per-decision as a chamber bylaw.

### The design stance

You can't *ban* coordination — people caucus, and forbidding it is futile
and illiberal. So you don't legislate against parties; you pick mechanics
that keep coalitions **fluid and contestable** rather than entrenched —
and you already have them: per-issue delegation, conviction decay,
instant revocation, the sortition judiciary (party-proof by
construction), and the cross-chamber bridging requirement. The protective
function of parties (coordination) is kept; the pathological form (the
captured, ossified machine) is designed against.

---

## Pay-to-win: political voice, not gameplay advantage

The funding model lets real money buy **influence** — a say in how the
world is governed. The line that keeps that from being pay-to-win: **money
can buy a *say in governance*; it can never buy an *advantage inside the
game.*** Political voice and gameplay power are different axes — a
donation buys **a vote and a name, never a sword or a pile of coin.**

This seals the **stake-is-not-stock** membrane in its second direction;
the membrane is bidirectional:

- **Outbound — stake-is-not-stock** (Law 1): in-game stake/standing never
  becomes real money.
- **Inbound — no-pay-to-win**: real money never becomes in-world currency
  or advantage.

The inbound seal has a live temptation — *give people in-world currency
for donations* — and it's **forbidden**: it's pay-to-win (buying in-world
value severs the endogenous-value spine — value must trace to *effort*)
and gambling/RMT (real-money-in, valuable-out — the pattern that got
lootboxes banned and reopens the legal can stake-is-not-stock closed).

### A hill, not a wall — and the hill *is* the game

Honesty: the inbound seal isn't perfectly impassable. *Buy enough
influence and you could pass a law that makes your avatar rich* — each
step (buy patron influence, legislate, move the reserve) is individually
legitimate, so the *composition* can't be sealed. The design doesn't claim
it can; it does what it does everywhere — makes the path **costly,
visible, and self-defeating** rather than impossible (the same stance as
the root-power floor and tamper-evidence). To traverse it you'd have to
beat, in series:

- **buy only one chamber** (patron — concave + capped) but **need 2 of 3**
  — so persuade producers and consumers too, with "make me rich" as the
  pitch;
- **survive transparency** — a self-enriching bill names its own sponsor
  and beneficiary, in public, in the archive;
- **route through the reserve** — the most-checked surface (appropriation,
  archive, judicial review; the only mint);
- **survive spirit-review** — the judiciary strikes neutral-letter,
  self-dealing-purpose laws; equal-protection (once rights are on) kills
  targeted-benefit laws outright;
- **and collect a poisoned prize** — *unmonetizable* (the outbound seal),
  and looting the world *depopulates* it, which makes the coin worthless
  (in-world wealth is only worth anything in a *living* economy).

By the time real money has crossed all that, it isn't "buying gameplay
advantage" anymore — it's "winning a transparent public political campaign
to pass a self-serving law, for a prize you can't cash out, in a world you
just emptied." **The abstractions don't merely add friction; they change
what the act even is — and that friction stack isn't overhead bolted onto
the game, it *is* the game design.** Standing between power and its abuse
is what a state is *for*; here, the layers of mediation between money and
in-world power *are* the political gameplay.

Cheap insurance for the crude case: a **generality requirement** — laws
must be general; no targeted private benefit, no "enrich avatar X" (the
private-bill / bill-of-attainder ban). It kills the naked version
outright; the friction stack handles the subtle ones (a law broadly
favoring patrons-who-happen-to-be-the-whale is genuinely hard to tell from
policy — there you lean on transparency + spirit-review, not a bright
line). The one condition under which the whole hill flattens into a ramp
is a **disengaged electorate** — which is why engagement is the substrate
everything rests on (next).

---

## Engagement — the substrate every guardrail rests on

**Disengagement is the universal solvent of every guardrail.** The
cross-chamber bridging, the supermajorities, the transparency, the
spirit-review all assume *someone is watching and will show up to oppose.*
An apathetic electorate defeats them all at once — the apathetic don't
turn out to block the whale — which is the single condition that flattens
the pay-to-win hill into a ramp. Engagement is what the whole safety story
silently rests on.

And it's harder here than in a real polity: a disengaged citizen still
*lives in the country*; a disengaged player just **quits.** Worse, it
compounds — apathy → governance feels captured/pointless → people leave →
power concentrates → governance worsens → more leave. A **death spiral.**

The reframe that matters: **the death spiral is a game problem, not a
governance problem.** No voting mechanic saves a game that isn't fun —
which is *exactly why this is a game and not a model*, and the genuinely
novel part of the combination: **every prior digital-governance experiment
dies of apathy.** DAOs are infamous for it (tokens idle, proposals passing
on single-digit turnout); liquid-democracy pilots the same. They built the
*model* and nobody showed up. **The game is the engagement engine those
experiments never had** — it manufactures the living, caring electorate
pure governance can't conjure. That's the bet, and the answer to a problem
the prior art couldn't solve.

Governance can't *force* engagement (trying drives people out). Its job is
two things:

- **Engagement-optional — never tax the apolitical.** Mandatory voting or
  punishing non-participation is *taxing absence* (Law 2's exact
  prohibition) and the fastest way to make a casual quit. Non-voting must
  be *safe and represented*: conviction/parked-influence + **liquid
  delegation** make *not actively voting still participation* — your weight
  stays deployed, or your delegate carries it. Set a delegate **once**, be
  represented forever, effortlessly. Apathy channels; it doesn't
  disenfranchise.
- **Engagement-rewarding — make governance *fun content*, not a chore.**
  The thing a game has that a DAO doesn't: politics can be *gameplay.* EVE
  Online's player politics — coalitions, betrayals, campaigns — are its
  most engaging content, and they're emergent governance. Fun politics
  makes the engaged a **retention engine**, not dutiful volunteers.
  Civics-as-payload only works if civics is a blast.

The specific tools for "people don't vote":

- **Decay self-selects the engaged electorate.** Undelegated, unparked
  influence fades (stop-the-faucet, never drain-the-tank — not a penalty).
  But a *standing delegation persists*, so only the truly-absent (neither
  vote nor delegate) fade, which is correct. Tune decay *slow* and
  delegation *sticky* so casuals never hit a cliff and bolt.
- **Quorum for high-stakes turns disengagement protective.** Amendments
  and big changes require a participation quorum; too checked-out an
  electorate and the measure *fails to status quo.* A disengaged
  electorate can't be *exploited* for capture — worst case is stasis, not
  a whale rewriting the rules. The direct answer to the "extreme edges"
  worry: apathy defaults to *nothing-changes*, not
  *the-motivated-minority-wins.*
- **Channel fork-not-quit.** Cheap exit disciplines bad governance but is
  also the spiral's accelerant; so make *forking* (move to a better-run
  instance, keep your stuff) easier than *quitting* (leave the platform).
  Unhappy players relocate *within* the ecosystem instead of leaving it —
  the multi-instance architecture is itself churn insurance.

The honest bottom line: governance can make disengagement **safe** (coast,
delegate, quorum, gentle decay) but it cannot make the game **fun** —
that's the game's job. So the rule for the governance layer is *never be
the reason someone quits*, and ideally *be a reason someone stays.*
Engagement is earned by the game; governance must not squander it, and must
**fail safe** when it dips.

---

## Deliberation

The legislature has to *deliberate* before it decides, and the medium flips
the problem. **Robert's Rules exists to ration a scarce serial floor** (in a
room, sound is serial — two speakers are noise), so most of it is fair
rationing of that scarcity. The digital medium has **no serial floor**:
deliberation is **parallel and async** (everyone contributes at once,
threaded, read at your own pace), so most of Robert's Rules dissolves as
logistical artifact — and the hard problems *invert*:

- meatspace: *getting heard* (ration the floor);
- digital: *reading everything* (abundance → synthesis), *converging* (no
  natural silence → debate runs forever), *signal vs noise* (spam /
  attention-capture, not floor-hogging).

### Three surfaces, three jobs — don't make one thing be all of them

The mistake is lumping this under "forums." Deliberation, social discussion,
and opinion-sensing are **three distinct surfaces** — and separating them
dissolves the tension between "people want popularity-driven boards" and
"deliberation must be ungameable." It's also, not by accident, the **policy
world's actual instrument set**:

| Surface | Job | Organization | Popularity? | Owner |
|---|---|---|---|---|
| **Social forum** | conversation / the public square | threaded, reddit-style | **yes — wanted, fine** (low-stakes social) | comms ([delivery-slate](./delivery-slate.md)) |
| **Polling** | sense *where the body stands* | opinion-clustering (Pol.is) | the map — **advisory, acknowledged-gameable, never decisive** | governance |
| **Deliberation** | reason through a *bill* | **argument-map** (Kialo): claims → objections → rebuttals | **none — structural** | governance |
| **The vote** | the binding decision | weighted ballot (conviction + quorum) | weighted | governance |

The workflow reads: **chatter** (social forums) → **poll** (sense interest +
positions, advisory) → **deliberate** (structure the argument) → **converge**
→ **vote.** Each surface optimized for its job; none forced to be all of
them. (My earlier "no upvotes anywhere" was an overreach — popularity is fine
on *social* forums; the discipline is about *deliberation*, a different
surface.)

### Deliberation is an argument-map, not a forum

The load-bearing surface is genuinely distinct from a conversation: the
**bill is the spine**, and the debate hangs off it as a navigable,
linearly-followable structure of **claims → objections → rebuttals**
(argument-mapping; Kialo is the clean reference). You follow the *logic*, in
coherent order — you can't sample your way through reasoning. Properties:

- **No ranking to game.** Organization comes from the argument's own shape,
  which is *authored*, not *voted* — so there's no popularity signal to
  capture. The failure mode shifts from "exploit the ranking" to "make
  bad-faith arguments," which is a **moderation/judiciary** problem (the
  constabulary, appeals) your governance already handles — a far better
  failure mode.
- **Version-controlled proposals.** The bill is a document; amendment =
  branch / edit / merge (git-like); the body converges on a version, every
  change in the archive (law is versioned like code).
- **Convergence-detection + a time-box** is the new "closing debate" (no
  natural silence): deliberation *matures* (the structure stabilizes,
  objections are answered, novelty dries up) → moves to the vote, with an
  anti-railroad minimum period (you can't close into a vacuum — the
  constructive-no-confidence instinct).
- **Reading at scale is by structure + your delegation graph**, not a global
  ranking: you navigate the argument tree, and personalized triage comes from
  **delegated attention** (what the people you trust on this topic flagged —
  per-person, revocable, not a capturable global number). **Dissent is
  preserved by construction** — an objection is a *node in the map*, not a
  downvoted post that disappears.

### Caucuses — slice deliberation & the bill lifecycle

Deliberation on a bill is **global** (one shared argument-map on the central
floor) — but a constituency may also want to deliberate *among itself* first.
A **caucus** is a **group-scoped deliberation**: the same argument-map
substrate, scoped to a `GroupRef` (a whole house — *the patrons* working out
how they want the money spent — or a guild, or an ad-hoc coalition) instead
of the whole polity. It's where a slice forms a position before a bill hits
the floor. Two rules keep it clean:

- **A caucus recommends; it never binds.** "Voting as a bloc" is members
  *choosing* to align with the caucus's position — which is just
  **delegation** (delegate your patron-influence to the caucus line,
  revocably). Opt-in coordination, not a whip; any member can split off (the
  vote is per-house and splittable — always the individual's).
- **Caucuses are emergent, not constitutional organs.** They're
  parties/delegation applied to a constituency — same substrate, same guards
  (egalitarian, ungameable-organization, conduct→reputation). The
  constitution defines the *global floor + concurrent vote*; how a
  constituency self-organizes within it is bylaw/emergent.

So the **bill lifecycle**: *(optional)* **caucus / slice deliberation** →
surface to the **central floor** → **global deliberation** (one argument-map)
→ **concurrent, per-house, splittable vote** → **majority of houses.**
Constituency power lives in *the vote* (each house decides) and *coordination*
(caucuses), not in gatekeeping origination — cleaner and harder to abuse than
an originating-house veto.

**And bills don't live forever.** Because the vote is continuous conviction
*allocation* (not a discrete vote-day), a bill on the floor is a *standing*
question that **accumulates** weight — so it needs a death, or the floor fills
with zombies. A bill is **tabled** by a minimal **sponsoring allocation** (no
sponsor, no floor — the cost of tabling is the anti-spam gate); it **lives**
while its support holds above a **survival floor**, and **lapses** when support
decays below it (abandonment — mostly automatic, since conviction weight decays
the moment people move on) or when it hits a hard **maximum lifespan** without
carrying. To keep a still-building bill alive past the maximum, its backers pass
a **continuing resolution** — a deliberate renewal that must carry its own
sustained support — so the only bills that persist are ones people are actively
willing to re-commit to. Lengths are tuning constants; the constitution fixes
the *shape* — finite life, survival floor, renew-to-extend — in Art. IV §4.
(Whether a *passed law* also sunsets-and-renews is a separate, looser question,
left to legislation per statute.)

### Synchronous deliberation — the serial floor returns

The argument-map is *async*, and async is what dissolves the serial floor.
But **synchronous deliberation re-creates it**: in a live text debate
attention is serial (you can't follow ten people typing at once in real
time), so the floor is scarce again — and **Robert's Rules becomes relevant
again**, with three native twists:

- **The chair is automated** — a **floor-bot** rations the floor (speaking
  queue/stack, turn-taking, time-limits). Floor-management is *mechanical*,
  so it automates cleanly (the same "automate the mechanical" line as the
  executive).
- **Role-gated, not room-managed** — only active speakers post in the debate
  channel during their turn; the audience watches and reacts in a **gallery
  side-channel** (the delivery-slate's `GroupRef` + surface-governance).
- **Bounded — sync can't scale** — a few active speakers + an audience, never
  the whole polity. So sync deliberation is inherently *small-group /
  representative* (committees, delegate debates, town-halls, panels).

This is how the **Discord structured-debate channels** already work: a
role-gated channel, a **bot enforcing turns + timers**, borrowed
competitive-debate **formats** (Oxford / parliamentary / Lincoln-Douglas —
opening → rebuttal → cross-ex → closing, timed), a gallery channel, a
scheduled topic. Mapped onto our substrate almost nothing is new: chat
channel ([delivery-slate](./delivery-slate.md)) + role-gating (`GroupRef` +
override) + a floor-bot (automation) + the transcript (archive); the *format*
(assembly à la RRO, debate à la Oxford, town-hall Q&A) is authored /
à-la-carte, not hardcoded.

The integration that keeps sync from re-importing the serial-floor's
*failure* (only-those-present decide): **synchronous deliberation feeds the
async record; it doesn't decide.** A live debate surfaces claims / objections
/ clarifications → captured into the persistent **argument-map**; the binding
**vote stays async** (weighted, quorum-protected, conviction). Sync is for
the *live human exchange* (persuasion, clearing a misunderstanding, the heat
of real-time argument) that async can't give; the async map is for thorough,
scaled, recorded reasoning and the decision. Complementary, not competing —
**the event feeds the structure.** (Small bounded bodies — a committee — *can*
take a live procedural vote, the population-ladder again; polity-scale binding
decisions stay async-protected.)

A bonus: a live debate is **spectacle** — engaging content,
governance-as-gameplay (a delegate debate is the EVE-politics-as-best-content
move) — so sync deliberation doubles as a retention mechanism, drawing people
*to* governance.

### The load-bearing principle: ungameable organization

Why argument-structure and not a clever ranking: **in a gamified polity, any
outcome-affecting user-signal ranking collapses to popularity/exploit over
time** (people reverse-engineer it; the meta finds the dominant strategy).
So **load-bearing organization must be ungameable** — *structural* (the
argument's shape) or *chronological* — and every gameable user signal is
confined to a **bounded** role (the vote, guarded by weight + conviction +
quorum) or a **merely-advisory** one (polling). This is *count things, don't
price things* applied to comms: the agree/disagree tally is a legitimate
signal; what's banned is letting a vote-*count* masquerade as the
authoritative *verdict* on what's true or worth reading (the price-oracle,
in a comms costume).

### Deliberate as equals, vote by weight

Across all of it: contribution and argument are **egalitarian** (everyone
participates one-person-one-voice — where the free-expression right lives);
influence-**weighting** enters only at the separate *vote.* Speech equal,
decision weighted — mirroring the judiciary-egalitarian /
legislature-weighted split.

### Reputation intersects the edges, never the structure

Renown / notoriety / alignment (the [reputation](./reputation-slate.md)
system) must not *organize* deliberation or *weight* arguments — that would
rebuild the appeal-to-authority fallacy plus a gameable rank (farm renown →
dominate). The argument-map stays **reputation-blind**: arguments on their
merits, not their author's fame. But reputation intersects *safely* at the
edges:

- **Attention** — renown routes *whom you read* (opt-in, per-circle,
  domain-relevant), never an argument's place in the map.
- **The vote** — reputation already weights it *via the consumer chamber*
  (engaged consumption = engagement × regard), so reputation meets governance
  at the *vote*, not in deliberation (the deliberate-as-equals /
  vote-by-weight split).
- **Moderation** — notoriety informs *scrutiny* of a known bad actor, never
  an auto-discount of the argument (ad hominem stays a fallacy).
- **Alignment** is affiliation, so it intersects **parties & delegation** (who
  you coalition with), not argument-weight; filtering arguments by alignment
  is echo-chamber capture, refused.

The principle that orders all of it: **the safe arrow is conduct →
reputation, not reputation → authority.** Your governance conduct (arguments,
votes, moderation — all archived) *feeds back into* your renown/notoriety:
good-faith deliberation earns regard, bad-faith earns notoriety. Reputation
is the *consequence* of political conduct (accountability — and anti-gaming:
you can't farm renown to dominate deliberation, but conducting yourself well
*earns* it), never an *input* to deliberative weight (capture).

### The cross-slate seam

**Comms owns the social forum** (delivery-slate, popularity-OK); **governance
owns polling and deliberation** as distinct surfaces. **Polling**
(opinion-clustering) is an *advisory* sensing instrument — where used it
needs neutral/randomized statement exposure + an integrity-grade algorithm,
but it's never decisive, so its residual gameability is tolerable.
**Deliberation** (the argument-map) is a structured argumentation surface —
*not* a forum mode, and distinct enough it has **its own slate**
([argument-map-slate](./argument-map-slate.md)), with the comms family
providing only the *social* layer around it.

---

## Branches & separation of powers

The executive is where the "we're running a community, not just shipping
software" truth bites. The clean reference isn't a corporation — *there's
a reason we elect prime ministers, not CEOs.* A CEO's authority comes
from **ownership** (the board represents capital); a government's comes
from **the consent of the governed**, bounded by **law and rights.** So
the model is a **parliamentary executive sitting on a civil service of
chartered institutions** — the three branches (legislative, executive,
judicial) over a **tamper-evident record** whose integrity is guaranteed by
construction, not by a separate operator (see *The record* below) — all
staffed from one player pool. Two corrections to the corporate sketch
carry the weight:

- **Prime minister, not CEO.** The executive is already parliamentary —
  "appointed by, and serving at the pleasure of, the legislature" *is*
  "commands the confidence of parliament." Keep that wiring; drop the
  owner-and-command connotations. The executive is a *temporary servant
  of the governed*, justifiable to them and removable by them. (That the
  legislature-as-board answers to three constituencies, not shareholders,
  is itself a real if uncommon form — co-determination and
  multi-stakeholder co-op boards are the prior art.)
- **Institutions, not hierarchies.** The executive isn't one chief with
  an org-chart beneath; it's a set of durable, chartered, rule-bound
  bodies (below).

### The executive — a government, not a management

What to spend the reserve or budget *on* is a **legislative** function;
*executing the transaction* is an **executive** one — hence a distinct
branch. Its constitutional core: **the executive executes only what the
legislature authorized.** It can move the reserve; it cannot decide
*whether* to. The legislature **oversees but does not manage** — it sets
policy and holds the executive to account; it does not do the executing.
Being an **office**, the executive is the natural home for **term limits**
*if the polity adopts them* (the temporal cap the directly-exercised
influence resource doesn't take) — **available, not required out of the
gate.** Confidence is the standing accountability either way; a term limit is
an optional anti-entrenchment cap the legislature can add by law (Westminster,
notably, has no PM term limit).

### How the prime minister is chosen

A PM isn't chosen directly — that would be a **president**, carrying an
independent mandate that fights the legislature and re-creates a rival
strongman. The executive here *executes the legislature's will, bound*,
so the parliamentary form fits: the PM holds office by **commanding the
confidence of the legislature** and serves only as long as that
confidence holds.

- **Confidence = a majority of chambers.** The PM is whoever 2 of 3
  chambers will currently back — confidence is the standing, always-on
  form of the ordinary passage rule. A property falls out for free: to
  hold two of three chambers the PM must **bridge at least two of the
  three constituencies** (producers / patrons / consumers), so the
  executive can't be captured by money, makers, or players alone —
  anti-capture by construction.
- **Install by investiture** — a bill (majority of chambers) names the
  PM: a clean, certified moment, not a vibe.
- **Retain by continuous confidence** — the native upgrade: confidence is
  *live* (full-duplex), recomputed continuously, not a periodic vote.
- **Remove by constructive no-confidence** — the stability guard: you
  can't topple the PM into a *vacuum*; a majority of chambers must
  *simultaneously name a successor* (Germany's trick). That + a short
  cooldown stops the live signal from thrashing the government.
- **Tenure** — removable anytime (confidence is the standing accountability);
  a **term limit** *may* additionally cap it (anti-entrenchment), but is
  **available, not baked in** out of the gate.

**Legitimacy is the PM's; competence is the institutions'.** The PM is a
*political* office (commands confidence, sets direction, accountable);
they *appoint* the competence-staffed institutions below that actually do
the work. The PM doesn't personally sysadmin — the PM is who the
legislature trusts to *direct* those who do.

**The integrity branch certifies the count.** Where Westminster's monarch
ceremonially "invites" whoever can command confidence, the
archives/integrity branch attests *who currently commands
majority-of-chambers confidence* — drawn from the tamper-evident record,
certified by the one body with no political power, so no branch
adjudicates its own claim to the office.

During design the founder is PM trivially (sole Producer + 51% Patron =
2 of 3) and holds it only while still commanding 2-of-3 confidence — note
that 51% of *one* chamber doesn't secure it, a majority of *chambers*
does, so even the PM-ship rides the honest 2-of-3 structure, not a
personal clause.

### Institutions, not hierarchies

A **hierarchy** is a command tree: authority flows down from a chief, and
replacing the chief changes everything. An **institution** is a durable,
chartered body with *its own* legitimacy, procedures it follows
regardless of who staffs it, and persistence independent of individuals.
Institutions *constrain* power — including the power of whoever's
nominally on top. The executive is therefore a **set of chartered
institutions**, each with a bounded mandate, a procedure it's bound to
(due process, not whim), its own staffing mechanism, judicial oversight,
and — load-bearing — **durability.**

That durability is the actual mechanism of the founder's safe sunset: you
don't hand the keys to a successor, you build bodies that outlast any
individual. **Institution-building *is* "the founder dilutes safely."**

And you need institutions *more* than a game studio does. A studio hires
neutral community managers from *outside* the player base; you can't —
your mods, cops, and onboarders are all *also players and constituents.*
There's no outsider neutrality to borrow, so neutrality must be
*manufactured by institutional design* (rules, rotation, recusal, review)
rather than supplied by separate staff. Same-pool labor is exactly why
hierarchies won't do. The rough roster:

- **Operations / sysadmin** — the genuine management core: keep the
  lights on, deploy, execute transactions.
- **Treasury-execution** — moves the reserve / disburses the budget on
  legislative appropriation.
- **The constabulary** — moderation / enforcement; *semi-independent*
  (below), because the coercive arm is the one you most want off the
  executive chief's leash.
- **Onboarding / engagement** — welcoming, events, community cultivation.
- **Content stewardship** — curating and maintaining the authored world.

Some are plain management; the coercive ones want independence, due
process, and judicial review.

### Code-first enforcement — and the surveillance answer

A load-bearing executive principle: **what can be enforced by code, *must*
be.** The dystopia of surveillance was never the *sensing* — it's the
**discretion**: a human deciding, opaquely and selectively, who to watch,
target, or let slide. Code-first enforcement removes exactly that. A rule
applied by code applies to *everyone, uniformly, automatically* — unbribable,
no favorites, can't be aimed at an enemy or waved through for a friend. So
the "must" is the **anti-tyranny guarantee**, not an efficiency note: leaving
a codifiable rule to human enforcement leaves open the discretionary power
surveillance-states run on. It is **rule-of-law made literally true** — an
aspiration in meatspace, an executable fact here.

It matters most because the server *senses enormously* (far more than real
life), and — as a gamification project hooking real-life sensors (the
toothbrush, the fitness band, the study tracker) — the executive could come
to hold **real-world** behavioral data. That is real power; the three-branch
+ code-first design is what keeps it from the nightmare:

- **Legislature → requirements.** The democratized body sets *what* the rule
  is and the intent it serves — in plain **requirements, not code** (you need
  no programming to make law, or only coders could rule). It may additionally
  pin specific **invariants** it wants guaranteed (and may supply code for
  those).
- **Executive → implementation.** Programming the machine to enforce the
  requirements is specialized work, hence an executive function. Code-first
  enforcement is the executive *running* that implementation — uniformly and
  automatically.
- **Judiciary → verification + spirit.** The **verification** face checks the
  implementation conforms to the legislated requirements — so the executive
  can't subvert intent through implementation or smuggle in a loophole — and
  the **spirit** face checks it serves the purpose. Code applies; humans
  review.
- **Human enforcement** is the **bounded exception** — only the judgment
  cases code can't decide (harassment? good faith?), and even then recorded,
  recusal-gated, reviewable. In a surveillance state discretion is the
  default; here code is the default and human discretion the narrow, watched
  exception.
- **The archive** records every enforcement act; **separation of powers**
  splits the chain (sense → rule → implement → enforce → judge) so no single
  actor owns it.

The thesis under it: **this is a blueprint for *legitimate* surveillance** —
enormous sensing, but the rules **democratic**, the application **mechanical
and uniform**, the implementation **verified against intent**, the check
**judicial**, the record **transparent**, the power **split three ways**. The
inversion of the dystopia, not a softer version — and the governance answer
to the gamification "honest edge" (sensors imply surveillance; behavior-
engineering needs a leash). A game can be the political laboratory that
*demonstrates* surveillance + democracy + code-first + judicial review can be
legitimate rather than nightmarish.

### The judiciary — verification and spirit

The third branch answers a single question — **does this conform to the
law?** — and the law has a *letter* and a *spirit*, which need two
different competences:

- **Verification (the letter)** — *does it work and match the spec?*
  Reading code, but also testing, reproducing, reading the data. Guards
  that an implementation is correct and does what it claims.
- **Spirit-judgment (the intent)** — *does it do the right thing?* A
  change can be provably correct and still betray what the legislature
  *meant* — "technically compliant" is the malicious-compliance move.
  This is the *product* call, and it's the same judgment whether the
  object is a **code change** (does it serve the purpose?) or a **human
  dispute** (appeals): "intent" and "appeals" are one competence pointed
  at different defendants.

The two are a **dual-key greenlight**: verification can't ship a correct
thing that violates the spirit; spirit can't ship a well-meaning thing
that's broken. Neither overrides the other — exactly why a real release
needs QA *and* product. And it's a **gate, not just a complaints desk**:
because the law's *implementation* is code, changes that touch the
rules-engine route through judicial review *before* they go live (the way a
sensitive
PR needs review before merge) — which is also *how the executive's
"executed only what was authorized" gets verified.* The greenlight is the
verification, captured in the archive.

### One process, two knobs — the streamer is the pool of one

There is **one judicial process at every scale** — not fiat below and
machinery above, bridged by a leap. The process is the async case: a matter
is filed with its argument, a verdict comes back by a deadline (the *Trials*
section below). What a streamer **already does** — hearing a ban appeal
filed through a form, weighing the argument, deciding — *is this process*,
with two knobs turned all the way down:

- **the jury pool** — *who judges.* At the floor it's a **pool of one** (the
  operator); at the republic it's a **sortition of equals** (the staffing
  below). The whole "How the judiciary is staffed" section is the
  *sortition setting* of this one knob, not a separate institution.
- **bindingness** — *whether the verdict is final.* At the floor the operator
  may **override** their own verdict; at the republic they are **bound** by
  it.

This is the integration, and it's deliberate: **we impose no new procedure on
a community that already hears appeals.** The autocratic streamer isn't
*outside* the judiciary — they are the judiciary at pool-of-one, overridable.
**Due process** (the right, switched on with the republic) is then not "start
using a process you lacked" but simply *widen the pool to a sortition of
equals and remove the override.* Code review is the same case with the
verification face pointed at a change; a ban appeal the same case with the
spirit face pointed at a person.

### How the judiciary is staffed

Start from the principle that orders everything else: **the judiciary is
the polity's *egalitarian* branch.** The legislature is
influence-weighted — more contribution, more say; justice must be
*equal*, or the cross-branch membrane fails and a patron whale buys a
friendly court. So the inverting rule: **influence buys nothing here.**
The two competences then staff differently:

- **Spirit-judgment → sortition: a jury of equals.** Draw a panel **by
  lot** from the membership (intent reviews and appeals alike). Impartial
  by construction — no campaigning, nothing to lobby or pack, no faction
  in a body re-drawn each case. The pool is **flat**: eligibility is a
  *threshold* (a real member past a minimum tenure — also the Sybil
  floor), never a *weight*; one-member-one-lot, the whale and the
  newcomer equally drawable. This is the chamber where the polity is a
  pure democracy of equals. Panels are **per-case** (no standing bench to
  capture) and judge intent from the **archived legislative history** —
  the recorded *why* of a law — not by asking the sitting legislature,
  which would let a transient majority reinterpret intent at will.
- **Verification → sortition *within the qualified*.** You can't draw a
  random citizen to vet a kernel change, so draw verification panels by
  lot from a *qualified* pool. Pool membership must dodge two traps:
  don't let a political branch certify competence (the executive would
  pack the court that reviews it), and don't let influence buy in. The
  native answer: **competence is earned and measured from the
  tamper-evident record** — your track record of verifications upheld vs.
  reversed, computed from the archive, not granted and not purchasable;
  you qualify by being *right over time.* The skill is broad —
  code-reading *or* testing *or* data analysis — so the pool is wider
  than just coders. Per Law 2, membership **decays without participation
  and refreshes with it**, so the body is the *currently-active*
  competent, never an entrenched priesthood (the wizard-clique failure).

**The integrity branch runs the draws** — verifiable random selection,
maintains the qualified pool computed from the record, certifies each
panel: the same neutral-attestation role it plays for PM confidence,
keeping selection provably honest and out of political hands.

**Watching the watchmen.** Per-case panels and the decaying competence
pool block entrenchment; the backstops are the **legislature amending the
law** (checking the court *forward* — changing the standard, never
re-judging a case), a **whole-membership referendum** for
constitutional-grade questions, and the transparency floor under all of
it. Bootstrap: in a tiny world the founder + early producers self-certify
transparently, and the track-record mechanism takes over as the pool
fills — the same population ladder as the rest of separation of powers.

### Trials — async-first, sync-optional

A trial (the appeals/spirit face adjudicating a dispute) is **not a new
capability — it reuses the deliberation substrate + judicial apparatus.** And
like deliberation, it's **async-first, sync-optional**: a scheduled "court
date" needing the parties + a random jury all present at one moment is
exactly the synchronous-assembly friction the medium dissolves — and a recipe
for no-shows in a game. So the default trial is **async**, reusing the
**argument-map** substrate (not the live hearing):

- **the parties file their case** as a structured adversarial argument over a
  *window* — claims / objections / rebuttals (cross-examination becomes
  *rebuttal rounds*) + **evidence from the archive**;
- **the sortition jury reviews async** — jurors read the case at their own
  pace and submit their verdict-vote by a *deadline*;
- **no simultaneous presence required.**

**Time-boxes replace the court date, and a no-show has a defined consequence,
not a stall:**

- **party no-show** → the trial proceeds on the available record (default
  judgment, in absentia) — you gave a *window*, not a moment;
- **juror no-show** → handled by **over-drawing the jury** (draw N + buffer;
  verdict by those who vote within the window, against a quorum).

That second point is load-bearing beyond convenience: **async is what makes
sortition juries viable at all.** Random jury duty + *synchronous* attendance
= no-shows and failure; random jury duty + *async* review (read when you can,
vote by the deadline, over-drawn for buffer) is the only version that works
for a game population. Async isn't bolted on — it keeps the egalitarian-jury
design from collapsing on contact with real availability.

What makes it a *trial* (not just async deliberation), unchanged: **it
decides** — a **verdict** by the egalitarian sortition jury
(one-juror-one-voice, per-case, **(identity, matter)**-recusal-gated; a third
decision mechanism, distinct from deliberation-doesn't-decide and the
legislature's weighted ballot); **fixed adversarial roles** (the **parties**
with standing, the jury, a presiding facilitator); **evidence is the
archive**; a **backward-looking standard** (*did this conform* —
adjudication, not *what should the rule be*).

**Sync earns its place as an option, not the default.** Async loses live
*cross-examination* (rapid back-and-forth) and *spectacle* (a public trial as
an event) — so for a high-stakes, hotly-contested case the parties may *opt
into* a sync hearing (the floor-managed adversarial debate of *Synchronous
deliberation*), and a notable trial can be staged live (the engagement
bonus). The natural shape is a **hybrid**: async filing → an *optional* sync
hearing for live cross-ex → async jury deliberation + verdict.

So the deliberation principle governs trials too: **async is the respectful,
scalable default; sync is the optional live enhancement** (engagement-optional
/ respect-time + the population ladder, applied to the judiciary — a tiny
community can hold a live hearing among the handful around; at scale the
trial is async-with-a-deadline). (Scoping: this is the **appeals/spirit**
face; the **verification/QA** face is a *review* — author + competence panel,
conform-to-spec — not adversarial-with-a-jury, so the trial shape doesn't
apply there.)

### Abatement — taking live content offline

Putting content online is well-covered (the dual-key greenlight). **Taking it
*offline* — someone else's live, greenlit work, because the polity later judges
it bad — is the part we'd glossed, and it is not the greenlight's mirror.**
Putting-online is *additive* and cheap to refuse (you just don't get the new
thing); taking-offline is *subtractive* and dear (the producer loses live work
and the influence it's earning; the community loses something it was using). The
governing asymmetry: **deprivation demands more process than denial** — the
oldest rule in procedural fairness, that taking what you *have* is graver than
denying what you *want*. So abatement **inverts** the greenlight rather than
copying it:

- **Live content holds a presumption** it earned by passing review *and* by
  being used — so the burden flips onto the **challenger** to show it fails a
  standard (the greenlight put the burden on the submitter).
- The remedy is a **cure order, not a guillotine.** A fault-based takedown runs
  as a **case** — the same two faces asking whether the content still *verifies*
  (broken? exploited? rotted?) and still serves the *spirit* (harmful?
  malicious-compliance that degraded?) — and ends in **fix-it-or-lose-it**: the
  producer is told the specific defect and given a **remediation window**
  (`abatement.cure_window`); the area goes **dark** (code-first enforcement)
  only if uncured. The cure window is the humane core — the structural form of
  "this is shittier, so handle it with care."

**Fault vs. taste — the line that keeps this from becoming a weapon:**

- **Fault** (broken / harmful / exploitative): **judicial abatement**, requires
  a *named standard it violates*, a cure order, and — because the standing was
  ill-gotten — a **clawback** of the influence that content farmed (it was never
  legitimately earned; the instrumentation knows how much it added, so it can be
  un-credited).
- **No-fault** (obsolete / tastes moved on / superseded): **legislative
  deprecation** — an ordinary sunset, no producer in the dock, no punishment;
  the earned influence simply **decays naturally** (the faucet stops), never
  clawed back.

Content is **never pulled for mere unpopularity** — that would put its very
existence under the popularity rule we've banned everywhere else. Unpopular but
conforming → the hard, deliberate legislative path; broken or harmful → the
fault path with its cure. **The grounds determine the consequence: clawback on
fault, natural decay on no-fault.** Like the rest of the judiciary it **scales**
(one process, two knobs): below the republic the operator darkens content at
will (their instance, their call); the cure-order-and-burden-flip machinery is
the *republic* setting, switched on with due process.

**Open work:**

- **Standing & abuse.** Who may petition to pull live content, and at what cost
  — a vexatious-takedown harassment guard (a filing cost, the producer's
  defense, conduct→reputation for bad-faith petitions). Pull-requests can't be
  free, or they become a cudgel.
- **Clawback mechanics.** Un-crediting the pulled content's contribution from
  the producer's lifetime cap/reservoir — and how that interacts with the
  spend-and-regenerate stock without punishing influence already spent in good
  faith.
- **The hole it leaves.** A dark area is a gap in the world: consumers mid-use
  need notice/transition, and the world must **seal or backfill** it (the
  NPC/automation floor again). Abatement isn't done when the verdict lands —
  it's done when the gap is handled.

### Advocacy — right to counsel & public defenders

> **Not in the founding constitution** — available design, to be *amended in
> if it proves needed* (the system is built to need lawyers less). Kept here
> so the design exists when/if the polity adds it — a natural entry for the
> [amendment library](./amendment-library-slate.md) (a justice lego a
> community opts into, not kernel text).

The system is *designed* to need lawyers far less than meatspace: the
**argument-map scaffolds laypeople** (attaching a structured objection beats
performing legal argument), the law is **legible** (clear requirements + a
spirit standard), and trials are **async** (no courtroom theater). So the
complexity barrier that makes lawyers near-mandatory is much lower. But
advocacy still matters — most of all for the **individual-vs-institution
asymmetry**: appealing an enforcement action against the **constabulary**
pits one person against an institution with experience and resources, and
*that's* the case a right to counsel exists for. So a **right to advocacy**
(your side gets competently argued) is reasonable — switching on **with the
republic**, like the other rights (instance scale leans on the AI floor
below).

Advocacy is a **composition** of substrate already built, in three tiers:

- **Floor — AI-assisted case construction.** Everyone gets help building
  their strongest argument-map from the facts + the law (the NPC/automation
  floor, applied to advocacy) — the answer to "can't afford a lawyer." It is
  *partisan* (argues your side), grounded, the raw record always drillable.
- **Human advocates — delegation or hire.** "Having a lawyer" is *delegating
  your case* to a skilled member you trust (the delegation graph) or *hiring*
  one (a reputation-tracked advocacy market). No licensed bar — advocates are
  **emergent skilled members** whose track record *is* their renown
  (conduct → reputation), and whose arguments are structured + checkable.
- **PDs — for those who can't self-provide.** A **reserve-funded advocacy
  institution** (a public-defender office — an executive institution like the
  constabulary, funded from the treasury) that **assigns advocates by
  sortition / rotation** from the willing-competent pool. So a "PD" = a
  drawn-or-funded advocate, coordinated by the institution. (Symmetry: jurors
  are drawn by lot — so is your defender.)

It reuses **delegation** (point your case to an advocate), **sortition + the
reserve** (draw/fund a PD), the **NPC-floor** (AI-assisted representation),
**conduct→reputation** (advocate renown), and the **argument-map** (the
structured case) — no new machinery, which (like trials composing) is a
coherence sign. The one place it's load-bearing rather than nice-to-have:
**the individual appealing an institution** — without it, the constabulary
quietly wins everything by outclassing lone players.

### Rule-of-law enforcement — the mudcopping fix

Every MUD policed itself, and the classic failure was **fusion**: the
wizard was legislator, cop, *and* judge at once — so enforcement was
arbitrary, relationship-based, un-appealable, and resented ("wiz abuse").
That is precisely what separation of powers exists to prevent, and the
parts are already here:

- the **legislature** writes the code of conduct — offenses and sanctions
  are public law, not wizard whim;
- the **constabulary** (an executive institution) *applies* it with due
  process — notice, evidence, a hearing — bound to the written rules, not
  inventing them;
- the **appeals judiciary** hears challenges — *"did this enforcement
  conform to the spirit of the law?"* is literally the sanctioned
  player's appeal;
- **transparency** logs every action; **recusal** stops the mod who acted
  from also judging the appeal.

That converts mudcopping from "the wizard does what he wants" into
**rule-of-law community policing.** The live fork: how *independent* is
the constabulary from the executive chief? Policing is the coercive arm
and the danger is a faction weaponizing it — so lean
**independent-prosecutor**: chartered by the legislature and reviewable
by the judiciary, but *not* a personal tool of whoever holds the
executive, so it can't be aimed at enemies.

### Moderation is the on-ramp

The whole government has a concrete, demand-driven adoption path, and it's
moderation — because **moderation is the one government every community
already runs.** Every Twitch channel and Discord server has a broadcaster
(executive), mods (constabulary), a role/status ladder, and a body of
rules (usually unwritten). The cooperative doesn't impose governance on a
blank slate; it **formalizes and matures the government already there**,
and each organ enters wearing a familiar moderation coat:

- the **constabulary** *is* the mod team (already same-pool volunteers);
- the **legislature** enters as *"a place to write and vote on the server
  rules"* (today unwritten, living in the streamer's head);
- the **judiciary** enters as *"ban appeals"* — the most-wished-for
  missing feature in every community;
- the **archive** enters as *"a tamper-proof mod log"* (every owner has
  wanted immutable receipts on what mods did);
- the **broadcaster** is the executive, and the Discord *"role"* splits
  into **office (power) + standing (recognition)** — the two axes kept
  distinct throughout.

So communities adopt the organs one at a time, as *moderation tools*, long
before anyone calls it "government."

**Drama is the demand signal.** Every moderation pathology is something
the design already fixes: power-tripping mods → a conduct code + appeals +
logged actions; favoritism ("mods protect their friends") → rule-of-law +
recusal + the egalitarian court; invisible bans → due process + the
archive; entrenched mod cliques → rotation, decay, term limits. Every
community that has imploded over mod drama validates that these organs
solve *real* problems, not hypothetical ones.

**Rule-of-law moderation is a gift to the operator, not a constraint.**
Unfettered discretion is a liability that grows with the community: every
ban lands personally, every removal becomes a referendum on the operator's
fairness. Rule-of-law **launders the legitimacy** — *"you broke rule 4,
here's the log, you may appeal"* generates far less drama than *"a mod
didn't like you,"* because **the rules take the heat, not the person.** So
the operator adopts process not because they're forced but because
**discretion stops scaling** — they're offloading the legitimacy burden
onto a system. And it costs no speed: **due process here is fast action +
after-the-fact appeal, not slow pre-approval.** The constabulary still
insta-bans the hate-raider *now*; the appeal only means recourse *if it
was wrong* — exactly how real policing works (act immediately, review
after). Enforcement stays instant; only accountability is added.

This is why the rights deferral is right *and* adoption is inevitable:
small communities keep their discretion, and as they grow, mod drama makes
them **ask for** the rule-of-law organs the design already has — at the
very threshold where the republic comes on.

### The gotcha: separation of powers without separation of persons

Labor is scarce and comes from one player pool — so a member may
participate in all three branches, just as they hold influence in all
three chambers. That threatens the checks, because checks need
independence. The resolution:

> **Separate powers per-matter, not persons per-branch.** The unit of
> conflict is the pair *(identity, matter)*, never the person.

Holding three offices is fine; exercising two of them *on the same
matter* is the violation. Act in one capacity on matter X and you are
recused from any other capacity's review of that same X. This is the
**CEO-on-the-board** problem corporate governance solved long ago — the
answer was never "ban dual roles," it was **recusal on conflicted
matters.** Separation moves from *personnel* to *per-decision capacity*,
and labor scarcity stops threatening it. Two reasons it works better
here than in meatspace:

- **Recusal is mechanically enforceable.** The system knows who acted on
  what (the perfect-memory affordance), so the same identity *cannot*
  also review the matter it acted on — a hard constraint in code, not an
  honor-and-shame system.
- **The judiciary's two faces share one rule.** QA recusal = *don't
  approve your own commit*; appeals recusal = *don't judge your own
  dispute.* One *(identity, matter)* bar covers both.

### Separation that scales with population

The strength of separation is designed to **degrade gracefully** with
available labor, so it works for a five-member world and a
five-thousand-member one alike:

| Population | Mechanism |
|---|---|
| **Large** | separation of *persons* — distinct people staff distinct branches; recusal rarely even binds |
| **Mid** | **per-matter recusal** — automatic, native |
| **Small** | **sortition** — when everyone near a matter is conflicted, draft an uninvolved member at random to review it; impartial by construction, Sybil-floored by the influence requirement |
| **Tiny** (one person *is* the government) | **the transparency floor + cheap exit** — stop pretending separation is real at N=3; every act is logged and public, and a dissatisfied faction can fork the world |

The governing property: **the system asks for the strongest separation
the population can support, and never fails *closed* (governance halts)
or *wide open* (no checks).** The tiny-community case isn't a failure — a
transparent operator of a five-person world is honest, and it *grows
into* real separation as the pool fills.

### The cross-branch membrane

The non-fungibility rule that keeps the three *influence types* apart
rises one level to keep the three *branches* apart: **legislative
influence must not buy executive or judicial office** — else a patron
whale simply purchases the court that reviews him. So the branches staff
by **deliberately different mechanisms**: legislative seats are
influence-weighted; the executive is *appointed by the board*; the
judiciary is *sortition + a competence panel.* You cannot convert
standing in one branch into power in another. The same membrane as
stake-is-not-stock, one storey up.

### The root-power floor

Beneath every institution sits a brute fact: **whoever can change the
code can undo any of this.** Root power is real and unremovable.
Institutions don't delete that gun — *they make picking it up a visible
coup.* Legitimate power is chartered, processed, and logged; reaching for
raw root *outside* the institutions becomes a recognizable, illegitimate
act. The discipline isn't physical, it's **legitimacy + consequence** —
and the consequence engine is the transparency floor + **cheap exit**:
abuse is logged, visible, and the community forks away. You can't depose
the sysadmin-god; you can make the worshippers able to leave for free,
which disciplines the god. (Native-digital, the same forkability
primitive as the thesis.)

### The record — integrity by construction, not by org-chart

In a digital polity **the record *is* reality.** A state that loses its
archives reconstructs truth from a thousand external sources; a digital
polity has *no ground truth outside its own logs.* So archive integrity is
**existential** here — the floor under the floor, because the
**perfect-memory affordance** the whole design leans on (per-matter recusal,
judicial review, the transparency floor) is only real if the memory is
incorruptible.

Here's the honest part, correcting a tempting overclaim: **the archive is
*not* an independent fourth branch with its own operators.** *Operating* it —
running the logging, holding the backups — is a *doing*, so it's an
**executive function** (whoever has root touches the logs). You can't
constitutionally hand a separate body enforceable operational control over
infrastructure the executive runs; that's the **DOJ-norm trap** —
independence by *promise*, unenforceable. So the independence isn't
**organizational**, it's **cryptographic and epistemic**:

- the record is **tamper-evident by construction** (below), so the executive
  *operates* it but **cannot falsify it undetectably**;
- every integrity output — the record, the verifiable draws, the vote and
  confidence counts, the canonical text — is **universally re-derivable**, so
  **who runs it is irrelevant to trust**: nobody need be trusted, because
  everyone can check. *That* is the independence — **verifiability, not a
  separate operator.**

So the enforceable invariant (what the constitution actually grants) is the
**property + a universal audit right + judicial voiding**: the record *must
be* tamper-evident, anchored, replicated, and verifiable; every member may
verify; and the judiciary voids any act resting on a falsified or unverifiable
record (a non-compliant archive is itself a justiciable violation). Not "a
neutral body we trust," but "a function that is true or detectably-false
regardless of operator."

The native upgrade replaces *trusting the archivist* with
**tamper-evidence by construction**:

- **append-only, hash-chained entries** — each commits to the prior, so
  any retroactive edit snaps the chain and is *detectable*;
- **signed actions** — every entry signed by the actor's key; authorship
  can't be forged or repudiated;
- **replication + external anchoring** — copies held by many parties
  (even player clients; even forks carry the history), and the chain's
  root hash periodically published *outside the operator's control*, so
  even root can't rewrite the past without contradicting an outside
  witness.

The archivist's job shifts from *"be a trusted neutral"* to *"operate the
tamper-evident substrate and raise the alarm when the chain breaks."* Be
honest about the limit: tamper-*evident* is not tamper-*proof* — root can
still delete or refuse to record, but with hash-chaining + anchoring +
replication that is **detectable, not silent.** Same move as the
root-power floor: you don't make the coup impossible, you make it
*visible* — and the cryptographic archive is exactly **what makes the
transparency floor hold against a root-holder** (without it, root tampers
silently and "transparency" is a lie). Two further properties:

- **Maximal automation** — recording is mechanical (logged by
  construction), minimizing the human discretion there is to capture; the
  institution is the oversight that audits integrity and sounds the
  alarm, not a clerk choosing what to write down.
- **Private but provably-unaltered** — commitment schemes prove a sealed
  record *exists and is unaltered* via its hash *without revealing its
  contents*, so integrity holds even on records that can't be public
  (sealed disputes, secret ballots); declassification/retention is then a
  legislative matter, integrity stays the archive's.

The historical resonance is the admin-abuse case: every MUD's admin
controlled the logs, so abuse was *deniable* — dupes erased, grants
scrubbed, "what database edit?" Tamper-evidence + independence is the
fix: the admin can still *act*, but can no longer make it *unprovable.*

---

## The money membrane — two unrelated concerns

The real operating budget and the in-world reserve get lumped together as
"money," but they're **different universes, not two treasuries**: one is
*business finance*, the other a *game mechanic.* They're so distinct
they're barely worth mentioning together — except to name the **membrane**
that forbids bridging them, which is the one thing they have to do with
each other.

### The budget — real dollars

Real donation income pays real costs (hosting, infrastructure), then —
once there's surplus — a **wage for real work** (the producers who build the
world and the operating staff who run it), then whatever the legislature
appropriates. **So the first question a prospective adopter actually asks —
*can I contribute real work and still get paid?* — has a plain answer: yes.**
Paying labor in cash is legitimate, and it *strengthens* the stake-isn't-stock
wall: once work is paid in money, stake genuinely needn't be. The line the
firewall draws is **direction, not payment**: money flowing *outward* as wages
for work done is fine; money flowing *backward* to a contributor as a return on
what they *donated* is the investment the lawyer-free structure forbids. The
bedrock rule, written before there's a surplus to fight over:

> Surplus may fund reserves, infrastructure, new features, the
> producer's salary, or be given away. It may **never** be distributed
> back to backers in proportion to their contribution.

Money flows *outward* — to costs, to labor, to the world. The instant it
can flow *back* to a contributor as a function of what they put in, the
donation becomes an investment with an expected return and the whole
lawyer-free structure collapses. (Honest operational note, not a legal
one: the day real dollars pay a salary, that pool is taxable income with
a bookkeeping reality — an *accountant's* concern, not a lawyer's, but
real from day one.)

### The reserve — a game mechanic

The in-world reserve is **not a treasury sibling of the budget** — it's a
*game system*, governed in-world monetary policy (its central-bank
mechanics and the economy bootstrap are in *Bootstrapping the economy*
below). The membrane: **real money and in-world value never convert** — in
both directions (the bidirectional seal is detailed under *Pay-to-win*:
stake-is-not-stock outbound, no-pay-to-win inbound). The legislature
governs *both* the real budget and the reserve, but as **unrelated
portfolios** — a studio's payroll and a game's economy-patch — never a
shared balance.

---

## Bootstrapping the economy — the reserve, accounts, and the authorial subdivision

The government bootstrap was operator-discretion-at-tiny-scale →
republic-as-it-grows. The economy mirrors it, and ties capital *and*
influence to the same structural coordinate. (Sibling: the
[economy slate](./economy-slate.md), which owns the value-physics; this
section owns the *governed* macro layer that rides on top.)

### The reserve as central bank

The reserve is the deliberate, governed faucet/sink the economy slate
deferred. Its in-world toolkit: **mint** into the reserve (controlled
faucet), **drain** from circulation (sink), **seed** new localities and
**float NPC vendors** (liquidity), and **bounties/grants** that pay
in-world coin for content, gathering, and quests (fiscal spending that
funds the world's production). Appropriation is legislative; execution is
treasury-execution; every operation is archived and judicially reviewable.
Two disciplines keep it honest:

- **Quantity, never price.** The reserve manages how much coin exists and
  where liquidity sits; it never declares what a thing is *worth* — that
  would rebuild the anti-oracle the economy forbids.
- **The reserve is the only mint.** No loot faucet, no coin from nowhere —
  every coin that enters is a legislative appropriation, executed,
  archived. The money supply is fully governed and auditable, so inflation
  is an **accountable policy choice**, not an emergent bug. This is the
  governed answer to the economy slate's deferred macro problem: the
  reserve + legislature is *who tunes faucet/sink, and how* — central
  banking as ongoing governance against the live game, not devs patching
  numbers.

**The in-world fiscal cycle is code-executed end to end.** Beyond mint/drain,
the legislature may **tax** in-world activity (the sink with a revenue face) and
**appropriate** in-world coin to a budget — and because collection *and*
disbursement run through the reserve, the whole cycle (tax → budget →
appropriate → disburse) is **mechanical**: executed by code, archived,
reviewable. This is the firewall's other half. The **real-dollar operating
budget** (the *budget* above) is governed by the same legislature but is **real
money** — owed to real creditors under real law. Its execution *can* be modeled
and automated too: model accounts-payable as world objects, wire real payment
rails, and the in-world creditor and the real one **collapse into one
high-fidelity actor** — the fiction stops being fiction (the project's own
thesis, pointed at its own books). So the line between the budgets was never
*code vs. not-code* — both can be coded. It is **denomination + the firewall +
the failure mode**: in-world coin you can crash the *economy* with; real money
you can turn off the *lights* with; and what stays human in both is the
*administration* — the judgment to pay — never the rails. (Constitution
Art. VIII; the human boundary, Art. V §9.)

### Genesis: capital earned the way influence is

At genesis the reserve mints the first liquidity and **seeds initial
production via bounties** — players earn genesis coin by doing genesis
*work* (gather, craft, author). Coin distribution mirrors influence
accrual: earned by contribution, Sybil-floored, fair (no "the founder's
friends got rich at genesis"). NPC vendors, resupplied from the reserve,
give coin its bootstrap *acceptance* (the economy slate's legible floor).
Tiny instance: the operator/reserve hands out starting coin and seeds
vendors (discretionary). Growing: real extraction → transformation →
circulation kicks in, and the reserve shifts from *direct seeding* to
*macro management.* Mature: a self-sustaining loop with the reserve as
central bank. Macro tuning waits for the scale where there's activity to
tune against — the economy slate's parked problem, with the
reserve+legislature standing ready.

### The NPC market floor — a guaranteed market, not a living one

A subtlety that decides whether the bootstrap works: NPCs "shuffling coins
among themselves" is a **screensaver, not an economy** — a closed NPC loop
is net-neutral, set dressing. What players actually slot into is a
**guaranteed market**: standing NPC offers to *always buy, always sell,
always hire* at tuned prices. The economy doesn't *flow* until players
transact against those offers; the NPC layer is the **liquidity backstop /
counterparty of last resort** that makes a market *exist* before there are
enough players to be each other's market.

Which forces the load-bearing rule: **NPC offers must be deliberately
mediocre.** If an NPC buys gold at exactly what it's worth, no player gold
market can ever form — the NPC becomes the price oracle the economy
forbids. So NPCs are the *worst acceptable* counterparty: buy a little
low, sell a little high, pay slightly-below-market wages — so players
*prefer* each other when they can, and fall back to NPCs only when they
can't. The floor provides liquidity **without suppressing** the emergent
player economy. Tune it generous in the wrong direction and everyone just
trades with NPCs and the player economy never sparks (the economy slate's
"bounded, not infinite" discipline, sharpened into a price-margin rule).

### Bootstrap → evolution — NPCs fill in, then fade out

The arc, run forward:

- **NPC-dominated.** Heavy seeding + market-making; the floor running so
  the world isn't dead. Players slot into guaranteed counterparties, jobs,
  and venues — no empty-server cold-start.
- **Mixed.** Players start trading with *each other* (better than the
  mediocre NPC offers), open their own venues (player business is the
  apex), and the player economy grows *on top of* the NPC floor.
- **Player-dominated.** NPCs recede to the backstop — buyer of last
  resort, jobs nobody wants, venues in dead zones; the reserve shifts from
  *seeding* to *light-touch policy.* NPCs fill in at genesis and **fade
  out** as players fill in — the graceful-degradation pattern run forward.

Honesty about what this buys and doesn't: the design gives a **guaranteed
cold-start**, the **levers** (the reserve toolkit + dual mandate), and the
**governance** to decide the tuning. It does **not** guarantee the economy
*balances.* Equilibrium-at-scale is irreducibly hard and **empirical** —
players will arbitrage NPC prices, pile onto whatever pays too well,
hoard, and exploit loops you thought were closed — so tuning is
**continuous and reactive, not set-and-forget.** That is the whole reason
the economy sits under a governing central bank rather than a static
config: *you keep steering it* (the economy slate's "can't tune against
physics, only against a running game," made operational).

### Capital pools; influence individuates

Both are injected "along the same lines," but they behave oppositely —
which answers *to what accounts*:

- **Capital pools.** Fungible, so it lives at several levels: an
  **individual** balance, a **locality/zone treasury** (funds to develop
  and maintain an area, controlled by its owner-group), a **group
  treasury** (a guild's purse). A place *can* hold money; shared work is
  funded from the shared account.
- **Influence individuates.** Political standing attaches *only* to a
  person — never a shared account. A locality can hold a treasury; it
  cannot hold a vote. There is no "group's influence." (Same instinct as
  stake-is-not-stock: standing never becomes a transferable asset.)

### Institutions are private actors, not a tier of government

A guild, a company, a locality-as-development is **a private institution
inside the one polity — not a sub-government.** This is the institutional
model, not a federal one: a single sovereign (the cooperative), with
everything else a voluntary association operating *under* its law. The
distinction is sovereignty vs. autonomy — a federal sub-unit would hold a
*slice of governmental power* (its own jurisdiction, citizenship tier,
representation upward, conflict-of-law); a private institution holds only
**autonomy under the one sovereign** (its own members, treasury, property,
and internal bylaws — never a franchise).

The substrate already encodes this. **Influence individuates** (only
persons vote; no group holds a vote) is exactly "an institution has a
board and assets but no franchise." The **treasuries** above are
institutional assets — poolable, fungible, politically inert. The **zone /
access** stack (`ownerGroup` / `accessGroups`) is *property rights
enforced by the one polity* — "no X in my tavern" is house rules, not a
local ordinance. And **"how the chamber wields it is its own bylaw"** is
private internal governance.

Two consequences, both small and neither structural:

- **The private↔public power boundary is *legislation*, not a
  constitutional tier.** A guild that comes to own half the map is the
  civil-society problem (private power rivalling the state); the remedy is
  ordinary law from the one legislature (the antitrust analogue), not a
  new layer of government.
- **Internal institutional governance, if wanted, is a *library*.** The
  cooperative's own influence / delegation / voting primitives can be
  instantiated *privately* by any institution that wants to run its own
  votes — making the polity the **reference institution** and largest
  tenant of a reusable governance kit, never a federal head. (This is what
  the earlier "cooperative as the federal layer" framing was reaching for,
  corrected.)

### The authorial subdivision is the shared coordinate

The world is subdivided into **authorial units**, and the substrate
already exists: **Locality** ([location.md](../../subsystems/location.md))
addresses them, **zones** ([zone.md](../../subsystems/zone.md)) give
ownership + permissions (ownerGroup / accessGroups), **groups**
([grouping.md](../../subsystems/grouping.md)) say who authors, **access**
([access.md](../../subsystems/access.md)) gates who may. That one
subdivision is the coordinate system for three things at once: **content**
(what's authored where), **capital** (the reserve funds *localities*,
landing in locality/individual accounts), and **influence** (producer
contribution **measured per locality** and **attributed to the individual
authors**). Capital injection and influence-award ride the
zone/Locality/group/access stack — they mint no new structure.

One guard on the producer metric: it can't be a raw *count* of objects
authored (farmable — spam empty rooms). It must be **usage/quality-
weighted** — a frequented, well-kept locality earns its authors more than
a sprawling dead one — inheriting the economy slate's *quality is a
verdict, not a property*, and making **consumer patronage the quality
signal for producer contribution.** Measurement rides the archive
(authoring record + usage telemetry).

### The consumer fault line — engaged consumption

Producers measure contribution along the spatial/authorial subdivision
(zones). The consumer's contribution is **consumption itself**, measured
on **two axes** — quantity and quality — never one alone:

- **Quantity — engagement.** How much you actually show up and
  participate: the raw contribution of being an active audience.
- **Quality — reputation.** How *valued* that participation is: regard
  among peers, drawn from the reputation system already on the board
  ([reputation-slate](./reputation-slate.md): regard / renown /
  susceptibility / notoriety; scoped cooperative-wide for governance —
  see below).

The **product** is the point. Reputation alone is a *popularity contest*
(charisma wins, presence doesn't); engagement alone is an *idle-farm /
no-life grind* (raw hours, bots, AFK); **engagement × reputation** demands
both — substantial participation *and* regard for it. Two further
properties fall out:

- **Governance renown is cooperative-level; per-circle is a *social*
  signal, not a governance subdivision.** The standing that feeds the
  consumer chamber is `engagement × regard` measured against **one circle
  — the polity itself**, rolling up into the single, individuated
  influence stock every member spends on the one central floor (no
  *per-circle vote*, just as there is no *group's influence*). Renown
  *within* a community, guild, or locality is real and load-bearing — but
  for **game and social outcomes** (trust inside the institution, NPC
  behaviour, the bandits-esteem / lawful-notoriety split), riding
  `GroupApi` on its own timeline. It is deliberately **not** an input to
  the governance stock: letting per-institution standing mint governance
  weight would make every private institution a venue to farm the vote.
- **Turnout-free.** Both axes are continuous, so the chamber most exposed
  to apathy gets a standing source that doesn't hinge on an election day —
  it tracks ongoing valued presence (an engagement signal, not a turnout
  problem).

This product is the **resource** (the consumer chamber's influence
substrate — individuated like all influence); **how the chamber wields it
is its own bylaw.** It may run formal elections for a representative
council, or ride **emergent delegation** (delegate to those you regard;
the well-engaged-and-regarded accumulate weight and *become* the de-facto
council, continuously and revocably). Recommended default: **emergent
delegation** (native — no turnout, instant revocation, no campaign
machines), with **elections an option** the rules committee may adopt;
don't constitutionalize the form.

Two guards, because the people's house is the one most prone to going
pathological:

- **Popularity contest / idle grind** — half-killed by construction (the
  quantity×quality product needs both presence and regard), and the
  tricameral check tempers the rest (a popular faction still needs the
  creation and patronage houses).
- **Goodhart** — once standing buys governance power, people farm both
  axes for politics, not just play. The defense is the **product itself**
  (engagement × regard needs real presence *and* peer regard), the
  **conduct → bounded weight, never → authority** rule (renown multiplies
  earned participation, never mints standalone weight — so renown ×
  no-participation = nothing), and the **tricameral check**; let
  reputation *inform* rather than *solely determine* standing, and lean on
  the signed twin (notoriety) + susceptibility as counterweights.
  Goodhart-by-circle-conquest doesn't arise: governance renown is one
  cooperative-level score (no patchwork of small circles to pick off), and
  the per-circle social renown buys no vote.

---

## Employment & economic engagement

The in-game labor economy — the **role-slot** model (both ends
NPC-or-player-fillable), the NPC bootstrap/backstop layer, the
reserve-governed labor faucet/sink, the employment-viability *value-add rule*,
and **Dave's Bar** as the unit cell — is **game design, not governance**, and
has moved to the economy slate:
[economy-slate.md](./economy-slate.md) § *Employment & economic engagement*.
What's relevant *here* is **real** employment — a real wage from the operating
budget for real work — answered under *The budget — real dollars* above: yes,
you can.

---

## Founder control — transient lock, permanent check

The founder's override during design is **structural, not privileged** —
and that distinction is the point. As sole member of the Producer House
and holder of ~51% of Patron influence, the founder controls two of
three chambers, which in a two-of-three system is total override (the
necessary two for anything to pass; no lone chamber can pass anything
alone). But this is *honest* control: it exists because the founder is
currently almost the entire government, not because the constitution
names them. The document stays symmetric and fair; nobody can ever say
it was rigged, because it doesn't mention the founder at all.

The self-award is normal: sweat equity (real unpaid labor) converted to
governance **stake, not stock**. The 51% baseline is the architect
holding the pen while the thing is still on the drafting table — *"I need
to make sweeping changes at this stage without red tape, but that won't
always be the case."*

The dilution discipline that makes this safe to relinquish:

- **Codify the co-equality, not the founder's majority.** The permanent
  protection was never the 51% — it's that a co-equal Producer House
  *exists*, so makers can't be outvoted by the player multitude even
  after the founder is just one citizen. Entrench the structure; let the
  person dilute.
- **Pure-natural dilution.** The founder starts at majority because
  they're the only member; every new contributor's influence dilutes
  them arithmetically, no special minting. They drift toward an ordinary
  citizen's weight automatically as the community grows.
- **Devolve by seating people, not by a clock.** Recommended amendment
  rule: **hard and symmetric** (deliberately difficult, like the US),
  with control handed down by the founder *choosing to seat trustworthy
  people* in the Producer House — not by a hardcoded schedule that can't
  be stopped if the wrong people arrive first.

---

## Amendment & entrenchment

A constitution no harder to change than ordinary law isn't higher law at
all. **Amendment must be harder than legislation** — that bar is the
master entrenchment dial, with two failure modes: too easy (a transient
majority rewrites the deal) and too hard (ossification until the only
route left is extra-constitutional). So the dial is set *per provision*,
in four tiers:

1. **Ordinary law** — majority of chambers (2 of 3), reversible by the
   same. Baseline, not amendment.
2. **Organic law** — chamber bylaws, institution charters, tuning
   constants. A raised bar (supermajority in the affected chamber) but
   meant to evolve as the community learns.
3. **Constitutional amendment** — the branches, influence types, passage
   rule, treasury membrane. Three requirements *together*:
   - **Supermajority across *all* chambers** (e.g. 2/3 within each of the
     three, not merely 2-of-3) — no chamber steamrolled; broad
     cross-constituency consensus.
   - **A sustained-time element** — it must *hold* that supermajority
     continuously through a mandatory cooling period (conviction voting
     makes this native), so no flash passion or coordinated raid can
     rewrite the rules.
   - **Egalitarian ratification** — below.
4. **Eternity clauses** — the load-bearing core, *unamendable within the
   polity*: chamber co-equality, the cross-branch and stake-is-not-stock
   membranes, the surplus bedrock, judicial egalitarianism, the archive's
   independence, **and the amendment rule itself** (so capture can't make
   capture easier). The provisions that, if amendable, would let the
   constitution be weaponized to destroy its own protections.

### Amendment is ratified by equals

The deepest structural statement: **ordinary governance is
influence-weighted, but amending the constitution requires
one-member-one-vote ratification** — a referendum of equals, even though
legislation is weighted. The day-to-day belongs to those who contribute
most; the *social contract* belongs to everyone equally. It mirrors the
egalitarian judiciary — the fundamental rules, like justice, are the one
place money buys nothing — and it is a hard anti-capture wall: a whale
(or the founder) can dominate weighted legislation but cannot buy a
constitutional change past the equal consent of the governed.

### Fork is the amendment of last resort

The move meatspace can't make. A state makes amendment *flexible*
precisely *because there's no exit* — a constitution that can't evolve
internally yields revolution. **Cheap exit (forking) inverts this:**
because an irreconcilable faction can *found a new polity* rather than
capture this one, you can afford **stronger eternity clauses.**
"Unamendable" honestly means *"unchangeable within this polity — to
change it you fork a new one and people migrate."* So eternity clauses
aren't tyranny, they're a choice of which world you live in; and
**over-entrenchment is self-punishing** — entrench too much, the polity
can't adapt, people fork away. Exit disciplines the eternity clauses the
way it disciplines root power.

### Founding vs. amendment — the founder's self-binding

The credible commitment that makes the stake trustworthy: **the founder
authors the initial constitution (the drafting-table phase), ratification
*locks* it, and amendment thereafter is hard even for the founder.** The
2-of-3 control passes *legislation* freely but *not amendments* (those
need all-chambers supermajority + the equal referendum, where the founder
is one vote). The founding is a one-time architect act; after
ratification the deal binds its author — exactly what lets an early
backer trust the stake: *"even the founder can't quietly rewrite the
rules after launch."* Below the ratification threshold on the population
ladder the constitution is founder-set; crossing it triggers the
**ratifying convention** that converts fiat into consented law.

The **fiat-phase stake** is itself bound by a published, code-enforced
formula, in force from the first dollar: the founder is the **sole producer**
(~100% of the producer house, *diluting* as authors join — a starting state,
not a lock), takes **0% of the consumer house** (the players' chamber is
theirs from day one), and **matches patron influence one-for-one, plus one
unit** for a working majority — two chambers of control that *erode on their
own* as the community grows, then **sunset entirely at ratification**, after
which the founder earns only a **legislated wage**. The binding before
ratification isn't law (there is none yet) but **code + publication + exit** —
the founder binds himself by machine, in public. The generic *shape* of this
is constitutional (kernel, Art. XI); the specific formula is the instance's
published commitment — [founding-charter.md](./founding-charter.md) — and it
ships with the **stake-ledger slice**, the first real test of code-first
self-binding.

### Where it lives

The constitution and its full amendment history are a versioned,
**tamper-evident artifact in the archive** — the integrity branch attests
the current canonical text, every change auditable. And because an
amendment changes the law (and its implementation), it routes through the
**judiciary's dual-key greenlight** (verification + spirit) before going
live: the highest-stakes change gets the strongest review.

### The kernel and the library — amendments as political legos

The constitution that ships to every community is deliberately a
**bare-bones kernel**: the firewall, the machine, and the executive-provided
tools, *nothing more* (a three-floor test decides what earns kernel status —
the firewall is the no-lawyer floor; the machine and its tools are what make
it a polity; everything else is deferred). Communities are *not* meant to
each reinvent due process, monetary policy, or term limits from a blank page.
Those deferred choices are filled from a shared **library of model
amendments** — pre-drafted, vetted, composable **"political legos"** adopted
through the ordinary amendment path above. The keystone that makes this
clean: **most modules are bindings on tools the kernel already built** — *due
process* is simply "you must use the judicial machinery," *free expression*
"you must use the deliberation surface." The kernel is common to all; the
library is how communities differ without each re-solving the same problems.
Full design — the catalog, the presets-as-distros, the governance package
manager — in [amendment-library-slate.md](./amendment-library-slate.md), with
the kernel itself consolidated in [draft-constitution.md](./draft-constitution.md).

---

## Buildable now — the stake-ledger slice (v1)

Enough is settled to ship the near-term funding mechanism without
standing up any of the republic:

- **The stake ledger.** Every Twitch dono/sub accrues `influence`
  against the giver's Saxonberg identity, tracking the **two markers**
  (lifetime total + current recurring rate). A glorified, honest
  counter. No chambers, no voting, no executive — just accrual.
- **Identity binding.** Rides the **auth-providers** keystone (Twitch
  co-equal auth + account linking) and the **external-chat-relay**
  integration surface (the dono/sub webhook lands next to the inbound
  chat reader).
- **Mint-at-launch.** Accrued ledger entries convert to Patron-House
  influence + citizenship tier when the government comes online.
  Pre-launch, the ledger only *records*; nothing is governed yet.
- **The Law 1 wording discipline** from day one — "stake," "patron,"
  "citizen," never "investor/share/return."

What v1 deliberately does **not** ship: the chambers, voting, the
executive, the in-world reserve, the real-dollar budget process, and any
of the macro tuning.

---

## Open problems — deferred to a real member body

The substrate is honest; the *polity* can't be finished against one
citizen. Parked until there's a population to govern:

- **The surplus bedrock — confirm and entrench.** "Never back to
  backers" is the load-bearing legal-safety line; written here as the
  recommendation, wants explicit sign-off before it's constitutional
  text.
- **One-time = spendable burst, or cap+honor only?** Whether a lump gift
  grants an immediate burst of votable influence (a real moment of
  voice) or only raises the reservoir cap + honor (slower, no immediate
  say). Open.
- **Loyalty/tenure bonus on recurring?** A modest, *capped* streak bonus
  rewards the backbone subscriber; uncapped, it re-creates a tenure
  aristocracy. Recommended: small and capped. Open.
- **The dollar→influence curve.** Structurally concave (decided);
  the exact shape is macro tuning, deferred to a running game.
- **Voting rule per chamber.** Resolved in principle — one influence
  resource; the rule that converts it to decisions is chamber-internal;
  conviction voting recommended for the volatility-prone Consumer House.
  The concrete rule + its ripple into the markers (allocation vs spend,
  what recurring-rate then gates) is undesigned until a chamber adopts
  one.
- **Delegation guardrails.** Liquid delegation rides the existing
  allocation substrate (resolved); open is the tuning that keeps it from
  ossifying into super-hubs — the per-delegate weight cap, the
  decay/re-affirmation rate, and the per-decision public-vs-secret-ballot
  policy (the archive supports verifiable secret ballots).
- **No-pay-to-win firewall — resolved in shape.** Direct purchase
  (donos→currency/advantage) forbidden; the indirect path
  (influence→law→wealth) left a costly/visible/self-defeating hill, not an
  overclaimed wall; the generality requirement (no targeted private
  benefit) backstops the crude case. Open: how the spirit-review branch
  detects *subtle* self-dealing (a law that broadly favors the
  whale-as-patron is hard to distinguish from policy).
- **Engagement & disengagement — the master risk.** Resolved in
  principle: governance is engagement-optional (delegation/conviction so
  non-voting is still represented; never tax absence) and aims to be
  engagement-rewarding (governance-as-gameplay); high-stakes quorum makes
  apathy fail-safe to status quo; fork-not-quit channels churn into the
  ecosystem. Open tuning: the decay rate + delegation stickiness/defaults
  (slow enough that casuals don't bolt), the quorum thresholds, and the
  fork-easier-than-quit UX. The death spiral itself is a *game* problem
  the governance layer can only avoid worsening — solved by the game being
  fun, not by a mechanic.
- **Deliberation — three-surface model settled.** Social forum
  (comms/delivery-slate, popularity-OK) · **polling** (advisory
  opinion-clustering — acknowledged-gameable, never decisive; needs neutral
  exposure + integrity-grade algorithm) · **deliberation** in two flavors —
  **async** = an **argument-map** (Kialo-like: bill-as-spine,
  claims→objections→rebuttals, *no ranking*, navigated by structure +
  delegated attention; now its own [argument-map-slate](./argument-map-slate.md))
  and **sync** = floor-managed structured chat (automated floor-bot,
  bounded/small-group, RRO/debate-format, *feeds the async record, doesn't
  decide*) · the weighted vote. Governing principle: **load-bearing organization must be ungameable**
  (structural/chronological), because in a gamified polity any
  outcome-affecting user-signal *ranking* collapses to popularity over time —
  so user signals are confined to the guarded vote or advisory polling. Open:
  the argument-map surface design (likely its own treatment),
  convergence-detection tuning (+ the anti-railroad minimum), and the
  comms-slate handoff (social forum = comms; polling + deliberation =
  governance surfaces distinct from forums).
- **The consumer fault line — resolved: engaged consumption.** Consumer
  influence is **consumption itself**, measured **quantity × quality =
  engagement × reputation**, scored cooperative-wide (governance renown is
  *not* per-circle — per-circle standing is a social/game signal that buys
  no vote) — the
  *participation* third of three kinds of contribution (creation /
  patronage / participation), and the foundational one (without the
  audience the other houses have no charter). The product beats both the
  popularity contest (reputation alone) and the idle grind (engagement
  alone). Representational form (emergent delegation by default, elections
  optional) is a chamber bylaw. The engagement metric's **quantity axis is
  now built** — active-time-buckets (anti-AFK: idle buckets score nothing;
  anti-spam: a burst credits one), the consumer influence stock's
  participation faucet (see
  [participation.md](../../subsystems/participation.md)). Still open: the
  Goodhart dial on reputation (determines-vs-informs — provisionally
  *informs/gate*, see [polity-decision-register.md](../../polity-decision-register.md)
  D4), second-order engagement (D2), and the remaining reputation design.
- **The producer-contribution metric.** Usage/quality-weighted, not raw
  count (decided, to dodge content-spam farming) — but *how* to weight
  (quality-is-a-verdict measurement, patronage signals, anti-Goodhart) is
  undesigned and overlaps the economy slate's quality model.
- **Account structure + capital injection.** Resolved in shape (capital
  pools at individual / locality-zone / group levels; influence
  individuates; both ride the zone/Locality/group/access stack). Open: the
  banking/holding layer, who may spend a locality/group treasury, and the
  reserve toolkit tuning (mint/drain/seed/bounty rates — the economy
  slate's parked macro problem).
- **Employment & labor economics — game design, moved to the economy slate**
  (§ *Employment & economic engagement*): the role-slot model (both ends
  NPC-or-player), NPCs as bootstrap-scaffold + disengagement-backstop, the
  reserve-governed labor faucet/sink, employment-viability (the value-add
  rule), and the NPC-offer mediocrity margin — with their open questions
  (role-slot primitive shape, role hand-off, labor-policy surfaces, the actual
  rates/curves; gated on the deferred npc-behavior brains). Not a governance
  concern.
- **Paid governance roles (mods)** must reward *service not enforcement*, tie
  to *upheld* actions (judiciary + archive), and lead with standing not coin —
  the moderation on-ramp, and the one governance residue of the above.
- **PM selection — resolved.** Confidence = majority of chambers;
  investiture to install, constructive no-confidence to remove, an
  *optional* term-limit cap (available, not mandated), integrity-branch
  certification. Open only the tuning: the no-confidence cooldown/hysteresis,
  the term-limit length *if adopted*, and whether retention-confidence is
  periodically polled or truly
  continuous.
- **The executive institution roster + their charters.** Which bodies
  exist (operations, treasury-execution, constabulary, onboarding,
  content stewardship), each one's mandate/limits, and how each is
  staffed. Open: how independent the **constabulary** is from the
  executive chief (independent-prosecutor recommended).
- **Bureaucracy — deliberately deferred (accretes from operation).** Not
  designable up front (premature red-tape); it rides the
  chartered-institutions substrate (just "institutions not yet needed"), and
  the digital/automation floor eats the bureaucratic *mass* — the mechanical
  routing/paperwork becomes **code, not headcount** — but **not the judgment**:
  *administering* the instance is irreducibly human (you tune the levers, you
  never code the hand — constitution Art. V §9). Administrative *function*
  without administrative *mass*, but the **deciding stays a person's**. A future
  capture/ossification surface (the permanent administrative state,
  process-as-weapon) governed by the standard institution-discipline
  (mandate+limits · sunset/review · transparency · conduct→reputation · the
  integrity branch). Pre-build the *leash*, not the bureaucracy.
- **Archives / integrity.** The tamper-evident substrate concretely
  (hash-chain + signing + replication + external-anchoring choices), how the
  integrity *function* is operated by the executive yet kept verifiable
  independently of it (the cryptographic/epistemic independence, not an
  org-chart one), and the read-access / declassification policy seam (private-
  but-provably-unaltered via commitments).
- **Judiciary staffing — resolved.** Egalitarian branch (influence buys
  nothing); spirit-judgment by flat sortition, verification by
  sortition-within-an-earned-competence-pool, integrity-branch-run draws.
  Open only the tuning: jury size, the eligibility-tenure threshold, the
  competence-decay rate, and whether verification is a pre-ship gate, a
  post-hoc review, or both.
- **The separation-of-powers population ladder.** At what member counts
  each rung kicks in (persons → recusal → sortition → transparency
  floor), and how the recusal *(identity, matter)* graph is computed in
  practice.
- **Rights — deliberately deferred (they scale on with the polity).** No
  bill of rights at instance scale: a streamer running an instance for
  their community wants operator discretion — ban whoever, whenever — and
  on the tiny-community rung the operative protections are already
  **operator discretion + transparency + exit** (the open internet *is*
  the right to leave). Due process arrives as an **opt-in** the appeals
  judiciary provides — a capability a community adopts as it matures, not
  a day-one mandate — and the full rights layer (due process, free
  political expression, property, privacy, no-disenfranchisement, exit +
  portability) switches on **with the republic**, at the same population
  threshold separation-of-powers does. (**Advocacy / right to counsel** is
  *not* in the founding set — its design is parked in the *Advocacy*
  subsection, to be amended in if needed.) When it does, rights slot into the
  eternity-clause / amendment tiers as the clauses that protect *persons*
  (the egalitarian judiciary enforcing them against the weighted
  legislature via constitutional review). One coupling to honor:
  **stake-protection and rights must flip on together** at that
  threshold, so there's never a window where stake is real but an
  operator can confiscate it arbitrarily.
- **Amendment — resolved in shape.** Four-tier entrenchment, all-chambers
  supermajority + sustained-time + egalitarian ratification, eternity-
  clause core, fork-as-last-resort, founder self-binding. Open: the exact
  supermajority fraction, the cooling-period length, the population
  threshold for the ratifying convention, and precisely where the
  eternity-clause boundary is drawn.
- **Origination — resolved: none.** Bills are **global and concurrent** (one
  central floor, one global deliberation, voted by all houses at once) —
  there is no originating house, because membership is shared. Voting is
  **per-house and splittable** (a member's three influence types may disagree
  on the same bill). Constituency coordination lives in **caucuses**
  (opt-in group-scoped deliberation / delegation), not in origination.
- **Who adjudicates producer influence?** Labor is the fuzziest faucet
  to meter (dollars and play measure themselves). The founder does it
  now; the durable answer is open.
- **Apportionment inside the Consumer House.** Almost certainly
  representational at scale — but that's the chamber's own bylaw, not
  constitutional, and not designable until there's a population.
- **The bookkeeping/tax reality.** Real dollars paying a salary is
  taxable income — an accountant's matter to stand up alongside the
  budget, flagged so it isn't discovered late.

The throughline mirrors the economy slate exactly: **build the honest
substrate now; stand up the governance against a real body later.** You
need real members to run a republic — just as you need a real game to
solve the macroeconomics.
