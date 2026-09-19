# Cooperative slate (working doc)

> **Status: PARTIAL** — the Office seats (founder default, sparse
> handoff, the Governor gating `reserve`, the PM's seat-held title) and
> the three-stock influence substrate (participation + producer faucets,
> conviction hold/flip/tally, **no pool**) shipped →
> [governance.md](../../subsystems/governance.md),
> [influence.md](../../subsystems/influence.md); the argument-map v1 shipped →
> [forums.md](../../subsystems/forums.md); the provisions are consolidated in the
> [draft constitution](../../governance/draft-constitution.md).
> **Left:** the capital faucet (credit per patron per bucket) + the stake
> ledger enforcing the founding charter + the dono/sub webhook +
> mint-at-launch · the honor→chronicle / voice→standing split of the two
> markers · the ballot over the shipped conviction substrate (passage
> `tally / totalStanding` · quorum · the percentile-band fix · the
> top-decile share metric) · delegation re-derived for no-pool (`follow`,
> the conviction clock, per-topic scope) + synthetic constituents · the
> flip notice + the docket · deliberation's scale work (version-controlled
> proposals, convergence-detection, polling, the sync floor-bot) ·
> investiture / no-confidence as a standing target / the
> caretaker-may-not-veto floor / the deputy · the executive institution
> roster + the producer merit-pay bank · (identity, matter) recusal + the
> population ladder · abatement's open work · the in-world reserve toolkit
> (drain / seed / bounties / appropriation) + the NPC market floor +
> treasuries · the justice legos (advocacy, elections) with the
> amendment-library slate
> **Size:** a build

> Compacted 2026-09-19 — every cut is accounted for in [the ledger](../../plans/slate-compaction/governance.md).

> **Consolidation:** a formal [draft constitution](../../governance/draft-constitution.md)
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

- [docs/subsystems/governance.md](../../subsystems/governance.md) —
  **the first built piece of this slate's structure.** The Office
  substrate: the apparatus of seats (PM, the three House Speakers, the
  founder-established Central-Bank Governor), founder-as-default-holder
  by external credential, sparse handoffs, and the first authority
  consumer (the Governor gates the central bank's `reserve`). The
  democratic filling process (investiture / elections / no-confidence /
  sortition) this slate describes is the deferred next step.
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
- [docs/slates/deferred-rpg/affiliation-slate.md](./affiliation-slate.md)
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


*Cut 2026-09-19 — Art. I §1 + Art. VIII §2 of the [draft constitution](../../governance/draft-constitution.md) carry the provision (the no-lawyer floor is the preamble's three-floor test). The wording discipline below is kept.*

The discipline in three words an author/operator can hold: never write
the words **investor, share, equity, return,** or **dividend** where a
contributor can read them. The funding chamber is the **Capital House**,
not the investor house. Stake, never stock.

> A backer funds a world and earns a seat in it. They do not buy a piece
> of a company.

### Law 2 — Power is earned and spent, never owned


*Superseded — by the code. There is no spend: `hold` is full weight, no pool ([influence.md](../../subsystems/influence.md) § Conviction). The law itself is Art. I §3 / Art. III §3 of the [draft constitution](../../governance/draft-constitution.md).*


---

## Influence — the keystone resource

*(The three subsections below are pointers: the three stocks, their faucets and the no-pool conviction rule shipped → [influence.md](../../subsystems/influence.md), [participation.md](../../subsystems/participation.md), [renown.md](../../subsystems/renown.md); the provisions are Art. III of the [draft constitution](../../governance/draft-constitution.md).)*

### Three types, one per chamber, non-fungible

*Cut 2026-09-19 — shipped: `InfluenceStanding.stock` ∈ consumer|producer|capital, `ConvictionLogic.tally` partitioned by stock → [influence.md](../../subsystems/influence.md) § The three-stock output contract, § Conviction; Art. III §§1–2.*

### Three kinds of contribution

*Cut 2026-09-19 — shipped: producer = engagement-only draw (`ProducerLogic`), consumer = `engagement × renown` (`ConsumerLogic`) → [influence.md](../../subsystems/influence.md) § The producer stock, [participation.md](../../subsystems/participation.md); the merit-pay exception is Art. III §7.*

### Two markers: a stock and a flow

*Superseded — by no-pool — there is no reservoir cap and no regeneration rate to attach the markers to ([influence.md](../../subsystems/influence.md) § Conviction). Where the two markers landed is § The markers survive by splitting, below.*

### One resource, not two — continuity lives in the voting rule

*Superseded — the reservoir premise is gone; the resolution shipped as the kernel's uniform conviction rule → [influence.md](../../subsystems/influence.md) § Conviction; kernel-fixed method / chamber-internal representation / term limits on offices only are Art. III §4, Art. IV §6, Art. V §2 of the [draft constitution](../../governance/draft-constitution.md).*

### RESOLVED (2026-07-31): the kernel's conviction rule shipped — **no pool**

*Shipped → [influence.md](../../subsystems/influence.md) § Conviction (`hold` is full weight, no pool — an entrenched invariant). ⚠ The [draft constitution](../../governance/draft-constitution.md) Art. IV §2 still describes a capped, regenerating reservoir — stale; the knock-on for Art. IV §4 is worked in [legal-code-slate § The passage rule](./legal-code-slate.md). The WHY of no-pool (attention is the real scarcity; a budget is portfolio politics) is in the ledger's Handoff for influence.md.*

#### The markers survive by splitting, not by merging

The two markers were doing **two different jobs** that a single
reservoir forced together. Under no-pool they separate cleanly, and
each lands somewhere that already exists:

| Old marker | Job | New home |
|---|---|---|
| **lifetime total** (never decays) | permanent **honor** — your place in the project's history | the **chronicle** ([chronicle.md](../../subsystems/chronicle.md)) — the append-only identity ledger, which is exactly what durable, unspendable recognition *is* |
| **recurring rate** | current **voice** | **standing** — which is already a decayed rate, not a total |

> **Honor is durable and belongs to the record; voice is a rate and
> belongs to standing.** They stop fighting over one number because
> they stop being the same system.

And all three original cases still fall out, with no reservoir
machinery:

- **steady subscriber** — credits every bucket, sits at a stable
  standing; still *the most powerful per dollar because sustained*;
- **one-time whale** — credits once, spikes, decays. **A moment in the
  sun, not a throne** — and permanently honored in the chronicle;
- **lapsed contributor** — voice fades, **honor is untouched**.
  *Stop the faucet; never drain the tank* — preserved exactly.

## Standing inflation — mostly a non-problem, and where it *is* real

**(User, 2026-07-31: "we just keep minting more and more… the number
will just go up up up with no end.")** Checked against the shipped
faucets. The premise does not hold for the two built stocks, and the
reasons are worth recording because they are load-bearing.

### The faucets are decayed accumulators with **hard rate caps**

*Cut 2026-09-19 — shipped: participation one credit per `{subject, bucket}` ([participation.md](../../subsystems/participation.md)), renown log-saturated ([renown.md](../../subsystems/renown.md)), producer one credit per `{author, actor, bucket}` and “standing is a rate, not a total” ([influence.md](../../subsystems/influence.md)).*

### And passage is scale-invariant anyway

`support = tally / totalStanding(stock)`. Double everyone's standing
and both sides double. **This is where the inflation question touches
the pool question:** no-pool means standing is *only ever compared to
other standing*, so absolute magnitude never appears anywhere. A
reservoir reintroduces absolute numbers — how big is my pool,
regenerating how fast, in units of what — and with them a permanent
tuning burden. **Resolving toward no-pool is itself the inflation
fix.**

### Where the exposure is actually real — three places

**1. Bands are the one absolute surface.** `influence.bandThresholds`
is *"reused, **stock-agnostic**"* — fixed cutoffs, while everything
else in the system is a ratio. If typical standing drifts for any
reason (bucket-width tuning, half-life changes, population effects on
producer), bands stop discriminating and everyone reads top-tier. And
**bands are the only thing players ever see** (register D6 — never raw
scalars), so this is the failure that would actually be visible. Fix:
percentile-relative bands, or accept re-tuning as organic law.

**2. The real worry is *concentration*, not inflation.** The genuine
growth vector: **content is durable, but engagement with it decays.**
An author's *draw rate* scales with catalog size, and catalog
accumulates monotonically forever. Total producer standing stays
capped by audience-hours — nobody engages more than 24 hours a day —
but the **share** can concentrate arbitrarily.

> **Ratios are immune to inflation and fully exposed to share.** An
> author holding 30% of producer standing holds 30% of the make
> chamber by themselves.

So the metric to instrument is **the top decile's share of each
stock**, not any absolute number. A query, not a mechanic. (This is
the quantitative face of § *Anti-oligarchy by construction* below —
the qualitative argument there needs this number to be checkable.)

**3. Capital is the only faucet with no natural cap.** Consumer is
rate-capped by **hours in a day**; producer by **audience-hours**;
capital by **nothing, because money has no bucket.** That asymmetry —
not squeamishness about money — is the principled argument for capping
it explicitly.

### The capital faucet that falls out of symmetry

Build it like the two that shipped: **credit per patron per bucket,
not per dollar.**

- a one-time $1,000 whale credits **one bucket**;
- $5/month for a year credits **twelve months of buckets**.

Which makes *"recurring donations are the actual model"* **structural
rather than asserted**, using the mechanism already shipped twice — and
it is the no-pool translation of the two markers above. Tier may
weight a bucket, but **the weight must saturate per patron**, or the
uncapped axis walks back in through the side door.

*(Line-item, not pillar: this is one honest consequence of the faucet's
shape, not the design's headline claim.)*

### Anti-oligarchy by construction

Because influence regenerates only through *continued* contribution,
**money buys moments, not thrones.** A wealthy backer can refill a large
reservoir and unleash a big vote once — but cannot *hold* dominance
without paying continuously, and the Consumer House (co-equal, below)
checks the Capital House regardless. Under a time-weighted voting rule
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

*(The producer merit-pay bank — producer influence only · minted and capped by the legislature · evaluated by competence · recusal · sub-decisive · public rationale · justiciable — is Art. III §7 of the [draft constitution](../../governance/draft-constitution.md); cut here 2026-09-19. Unbuilt.)*

**Why the producer bank isn't a power-pump.** Minting producer influence
redistributes power *within* the producer house (toward the meritorious) — it
**cannot tilt producers against consumers or funders**, because passage is by
**co-equal chambers** counted separately, not a pooled tally. The co-equality
already entrenched is what contains the merit pay; the only residual is
*intra*-producer cronyism, which recusal + the cap + transparency + review
address.

So the mechanism is asymmetric by design, matching each house's nature:
**consumer = social → renown (weight); producer = labor → merit pay (bounded
mint); capital = dollars → neither** (the firewall axis takes no merit).
Placement: the **bounds** are constitutional (Art. III §§6–7); the **specific
instruments** (the renown sourcing, the producer merit-pay institution) are
legislated modules.

---

## The legislature — three co-equal chambers

*Cut 2026-09-19 — Art. IV §§1–3 of the [draft constitution](../../governance/draft-constitution.md) (co-equal houses, majority of houses, one central floor, no originating house, per-house splittable voting); the per-stock `Position` partition that makes splitting real shipped → [influence.md](../../subsystems/influence.md) § Conviction.*

### Near-empty chambers — abstain, full-count, fall back

*Cut 2026-09-19 — Art. IV §3 of the [draft constitution](../../governance/draft-constitution.md) (a house below `vote.quorum` abstains; passage against the full count; sub-viability falls back to the caretaker floor) + Art. XI / the [founding charter](../../governance/founding-charter.md) for the self-binding.*

### The constitution is thin — but the voting system is kernel, not chamber-set

*Cut 2026-09-19 — Art. III §4, Art. IV §§6–7 of the [draft constitution](../../governance/draft-constitution.md) (the voting method is kernel-fixed; a chamber governs only its internal organization; structure by amendment, constants as organic law).*

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

*Superseded — by § Delegation, re-derived for no-pool below — the reservoir premise is gone; the conclusions (per-stock, instant revocability, transitivity, emergent representation) are carried there.*

### Parties are delegation brands

A "party" here isn't a membership org fielding candidates — it's a
**trust/reputation brand competing for your delegated weight** in the
delegation market: lightweight, fluid, instantly losable. The
three-chamber structure shapes them: because the PM must bridge ≥2
chambers, **cross-cutting coalitions** (a "growth" vs. "stability"
faction, each spanning producers/funders/players) are favored over
hostile chamber-tribes — a pure "funders' party" can't govern alone.
That's healthy: it keeps the producer/capital/consumer cleavage from
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

## Delegation, re-derived for no-pool (2026-07-31)

The prior sections describe delegation as *allocation pointed at a
person*. With **no pool** there is no allocation, so the mechanic has
to be rebuilt. The rebuild is smaller, cheaper, and has better
properties.

### Delegation steers; it never transfers

> **Your delegate does not receive your standing.** You keep your own
> `Position` row, at your own full weight, in your own stock — the
> delegate supplies only its **direction**.

Nothing pools, nothing moves, and **the tally formula does not change
at all.** This is not bookkeeping: it means **there is no
accumulated-weight object anywhere in the data** — no row reading
*"Alice holds 30% of the play chamber."* Concentration is real in
effect, but the weight is structurally always yours and always one
command from coming home.

### The conviction clock — the question answered, and cheaply

Do **not** write follower rows when a delegate takes a position (write
amplification proportional to the following). Derive it:

```
effectiveRealSince = max(yourDelegationSince, delegateRow.realSince)
```

One `max()`, no stored copies, **derive-on-read** like everything
else. It answers the slate's open question — *does a delegated stake
inherit your `realSince`?* — with **neither**: the clock starts when
**both** facts became true.

| Case | Result | Why it matters |
|---|---|---|
| Alice has held yea 3 weeks; you delegate **today** | `max(today, 3wk)` = today → **conviction 0** | closes an otherwise-fatal exploit: a hub **renting out matured conviction** on the eve of a crossing |
| Alice **flips** | her `realSince` resets → so does yours | a delegate cannot bank ramp through churn |
| you delegated 3 weeks ago, Alice takes the position **today** | starts today | you cannot accrue conviction on a position that did not exist |

Two properties fall out of that one line:

1. **Delegation is slow, exactly like everything else.** A hub that
   gains a thousand followers today moves the tally by **nothing**
   today — they all ramp over the build period. **The anti-buzzer
   property extends to delegation for free.**
2. **A volatile delegate is mechanically weak.** Every flip resets
   every follower's clock, so a delegate who changes position
   constantly has an enormous nominal bloc and near-zero real weight.
   **The delegation market rewards consistency, not activity** — and
   nobody had to design it.

### Delegation is a default, not a transfer

**Your own explicit position always wins.** Resolution order:

> **explicit position → delegate's position → absent.**

So you can defect on one bill without leaving the bloc, at **zero
mechanical cost** — which is exactly Art. IV §6's *"no caucus binds a
member's vote,"* obtained structurally rather than by rule.

One new verb, `follow` (clear an override, revert to the delegate);
`hold`/`flip`/`abstain` become overrides, and `drop` means *"not
voting here even though my delegate is."*

### Scope: per-stock now, per-topic second

**Per-stock is free** — positions are already partitioned three ways,
so *the delegation graph is already three graphs* and "expertise is by
domain" is satisfied with no new data.

**Per-topic needs bills classified, and there is an attack in it:**
⚠ **if the proposer picks a bill's topic, the proposer chooses whose
followers auto-vote on it.** The fix is that topic comes from **the
Code's subject placement** — the taxonomy that already exists, where
mis-filing is visible and reorganization is itself an enactment — and
**never** from the proposer's free choice.

### Chains, quorum, and the tie-back

Chains resolve **at read time**; cycles resolve to *absent* and should
**tell the people in them**; a depth cap is cheap insurance.

**Delegated positions count for quorum** — you are present *through*
your delegate; that is what delegation is. Which makes this the answer
to the apathy problem in
[legal-code-slate § The roll](./legal-code-slate.md):

> **The play chamber cannot be asked to read bills, but it can be
> asked to pick someone once. Delegation is how a mass chamber reaches
> quorum at all.**

### Two corrections to § The two real dangers

**Drop the cap on delegated weight.** It made sense under *transfer*;
under *steering* it means telling follower #501 their vote does not
count because too many other people picked the same delegate — **a
disenfranchisement wearing an anti-oligarchy costume**, which silently
discards real standing. Since the weight is structurally always the
follower's own, the honest remedies are **transparency** (the graph is
public, like positions — and hub concentration is a story the press
can run) and **the top-delegate share metric** (§ *Standing
inflation*, where share — not size — was already identified as the
thing to instrument).

**Keep re-affirmation, but it must refresh `affirmedAt`, never
`since`** — otherwise renewing your delegation resets your own
conviction, which is backwards. Note the heavy overlap with the
**disenfranchisement amendment**: if the roll ships, inactive
delegators leave the denominator anyway and cannot be farmed as a
zombie bloc, so re-affirmation becomes belt-and-braces rather than
load-bearing.

### Three smaller calls

- **No consent required to follow** someone (requiring acceptance
  turns brands back into membership orgs) — but a delegate may **opt
  out of receiving followers** entirely.
- **Delegation covers positions only, never tabling.** Sponsoring a
  bill is an *act*, not a position.
- **"The Consumer House goes representational" needs nothing built
  beyond this.** Representation is **emergent**, not structural. A
  chamber may still legislate actual seats with terms as a bylaw —
  that is a different object.

### Where it lives

**On `ConvictionApi`**, beside `hold`/`flip`/`drop`/`abstain` — it is
part of how positions resolve, so it rides the existing facade rather
than minting one. Storage is one small collection:
`{subject, stock, delegate, since, affirmedAt}`.

## Synthetic constituents — delegating to an institution

**(User, 2026-07-31: "an institution voting and people delegate to the
institution not a specific citizen.")** Already named twice in the
design, and the substrate is already built.

- **The constitution calls it a caucus** — Art. IV §6: *"Constituencies
  may **caucus** to form an opt-in position, but no caucus binds a
  member's vote."*
- **§ Caucuses above already says the quiet part** — *"Voting as a bloc
  is members choosing to align with the caucus's position — which is
  just **delegation** (delegate your capital-influence to the caucus
  line, revocably)."*
- **And the reference type exists: `GroupRef`** — grouping is already a
  facade over pluggable providers yielding typed refs. So **the
  delegation target is a `GroupRef`**, with a person being one ref kind
  among several. Nothing new to invent.

### Steering is what makes it trivial

Because a delegate supplies *direction* rather than receiving weight,
**the delegate needs no standing of its own.** An institution can hold
a position; it simply cannot hold standing. So the tally needs **no
special case**: the institution's `Position` row exists,
`standingOf(groupRef)` is **zero**, and it therefore contributes zero
to both `tally` and `quorumWeight` **automatically**.

> **An institution votes with zero weight. Its power is entirely
> borrowed and entirely revocable.**

Consequence: **an institution with no followers is literally nothing**,
so creating one needs **no gate and no anti-spam cost.**
*Impersonation* is the only real exposure, and that is the existing
mark/brand substrate's job ([corpo.md](../../subsystems/corpo.md)).

### Any existing institution can publish positions

Guilds, businesses, houses, ad-hoc coalitions — **zero new object
types.** And **endorsement** is the honest word for it: *the Smiths'
Guild endorses; three hundred of its members follow the endorsement.*

### Members ≠ followers — and keeping them apart is the whole thing

| | **Members** | **Followers** |
|---|---|---|
| what they do | **decide** the platform | **copy** it |
| how many | whatever the charter says (possibly one) | unlimited |
| consent | joining is mutual | **unconsenting, instantly revocable** |
| overlap | need not be followers | **need not be members** |

Conflating them is exactly the membership-org error that *"parties are
delegation brands, not membership orgs"* rejects. It also yields the
best dynamic in the section:

> **Capture the members, inherit the followers — until they notice.**

A hostile takeover of a caucus is genuinely good content, and it is
**visible**, because the platform sits on an append-only roll like
everything else. **The flip notice is the accountability surface** —
when your caucus changes position you are told, and that is the moment
the borrowed power can be pulled back.

### Who decides the platform: the charter, already designed

The enactment check's **three resolvers** map straight onto the party
taxonomy — same machinery, one level down, exactly like every other
charter:

| Resolver | Reads as |
|---|---|
| **sole** | a **personal brand** — and one that can outlive its founder |
| **body** | one member, one vote |
| **chambers** | conviction-weighted internally |

### Platform stability is priced

A caucus that flips resets **every follower's** conviction clock. So
an institution chasing the news carries an enormous following and
near-zero weight:

> **You cannot drift and be powerful at the same time.**

### Two smaller calls

- **Institutions may delegate to institutions** — same cycle
  detection; a small caucus endorsing a coalition's line.
- **Following is per-stock**, so a guild can be credible on
  `producer` and ignored on `consumer`. **Strictly better than real
  parties.**

## Surfacing — the flip notice and the ticker

Both were one-liners in the sections above. They are **two different
objects**, and the split is the design.

> **News is about the world; the flip notice is about you.**

The bulletin substrate is a **staff→player broadcast** — a *shared*
artifact where everyone sees the same headlines, which is what makes it
a commons and makes press coverage meaningful. Personal notices cannot
live there without either polluting everyone's feed or making the
ticker per-viewer, which destroys the shared-ness. **Two surfaces, two
jobs** — the same rule § *Three surfaces, three jobs* already applies
to argument maps.

### The flip notice rides `NotifyPolicy`, not the bulletin

[social-graph.md](../../subsystems/social-graph.md) already has
attention rules and the `notify` verb, so the notice inherits
**volume-tuning for free** — which matters more here than usual: if it
spams, people mute it, and **a muted accountability surface is a dead
one.**

**Phrase it as what happened to *you*, not what your delegate did.**

> *"Your position on the Arms Ordinance reset to zero — the Growth
> Caucus flipped."*

More honest, more actionable, and it yields a filter for free: **if you
had overridden that bill, your row did not move, so there is no
notice.** Suppression falls out of the mechanic instead of needing a
rule.

### Loudness = the conviction destroyed

A flip at 5% conviction is a whisper; a flip at 95% costs three weeks
and deserves a bang.

> **`notice weight = standing × conviction_lost`** — computable
> exactly, self-tuning, **no authored thresholds and no editorial
> judgment.** The notice is as loud as the loss.

### Three tiers, all with shipped homes

| Tier | What | Home |
|---|---|---|
| **ambient** | the live gauge — always available, **never pushed** | inspection card + live MQL subscription |
| **digest** | flips, platform changes, new positions — batched | the **aggregate + cadence-flush** shape [reactions](../../subsystems/reactions.md) already uses |
| **interrupt** | a crossing imminent on a bill you carry; a **high-conviction** flip | pushed note / ticker |

### ⚠ Auto-generated headlines would make the press redundant

The [press slate](./press-slate.md)'s thesis is that *"anyone can
check"* becomes *"nobody does"* without a press. **If the ticker
auto-reports every crossing, the omniscient feed makes the vocation
pointless before it ships.** Three layers, and the top one is already a
named tree candidate:

| Layer | Character | Status |
|---|---|---|
| **the record** | queryable, complete, **never pushed** — total transparency, machine-provided | the Roll + MQL, already designed |
| **the docket** | an *unedited* chronological feed of governance events; public, boring, complete | **nobody reads the Federal Register — that is the point, and precisely why journalism exists** |
| **the ticker** | a **publication**, therefore it has a **publisher** | wants `bulletins → /feed/<publisher>/`, already floated in [legal-code-slate § Sibling candidates](./legal-code-slate.md) |

**So you subscribe to a publisher.** The Compact runs the default one;
players run others. A press outlet becomes mechanically real as *a
publisher whose ticker you can subscribe to* — which makes partisan
press possible, bias possible, and the record always there to check
against, **with no new mechanism.**

> **The rule that protects the vocation: the default feed reports
> *events*, never *significance*.** "Bill X crossed threshold in the
> Play chamber" — never *"Landmark arms bill advances."* The machine
> can report facts; **only a person can say why it matters.**

### Inline stance stays — with context, not friction

Carry the bill's one-line summary and a link to the argument map.
Voting off a headline is **self-correcting anyway** — a careless
position still needs a build period to matter. And **yes, a
publisher's ticker may carry the stance button too**: that is exactly
what real media does, it is visible, and pretending otherwise would be
the dishonest option.

### Two rails

- **Notices inform; they never incentivize.** No *"log in to keep your
  standing"* nags — that is **taxing absence**, which Law 2 prohibits
  outright. The **disenfranchisement warning** sits right on this line
  and stays on the right side of it because it fires **once** and names
  a **specific** consequence, rather than pleading generally.
- **Push what serves the person notified; never what serves someone
  else's leverage over them.** Concretely: **do not notify a delegate
  that "Bob defected on bill X."** The data is public and queryable,
  but *pushing* it is **building a whip.** Same distinction as the
  record/docket split, applied to people.

---

## Pay-to-win: political voice, not gameplay advantage


*Cut 2026-09-19 — Art. I §2 + Art. VIII §1 of the [draft constitution](../../governance/draft-constitution.md) (money may earn a voice, never in-world currency, property or advantage; the firewall is bidirectional). The hill-not-a-wall argument below is kept.*


### A hill, not a wall — and the hill *is* the game

Honesty: the inbound seal isn't perfectly impassable. *Buy enough
influence and you could pass a law that makes your avatar rich* — each
step (buy capital influence, legislate, move the reserve) is individually
legitimate, so the *composition* can't be sealed. The design doesn't claim
it can; it does what it does everywhere — makes the path **costly,
visible, and self-defeating** rather than impossible (the same stance as
the root-power floor and tamper-evidence). To traverse it you'd have to
beat, in series:

- **buy only one chamber** (capital — concave + capped) but **need 2 of 3**
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
favoring funders-who-happen-to-be-the-whale is genuinely hard to tell from
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
  be *safe and represented*: conviction + **liquid delegation** make
  *not actively voting still participation* — your delegate carries the
  direction while your own standing carries the weight. Apathy
  channels; it doesn't disenfranchise.

  > ⚠ **Correction (2026-07-31), and it matters.** This bullet used to
  > promise *"set a delegate once, be represented forever,
  > effortlessly,"* on the reasoning that undeployed influence decays
  > while *"a standing delegation persists."* That was true under the
  > **pool** — decay hit influence you had not deployed. Under the
  > shipped model **standing decays with inactivity, full stop**, and
  > having a delegate set does not keep it alive. The honest
  > restatement is better for a game anyway:
  >
  > **Delegation relieves you of attention, not of presence. Presence
  > is the price; attention is not.**
  >
  > Which is the same sentence decay, the roll amendment
  > ([legal-code-slate](./legal-code-slate.md)), and delegation have
  > each been saying separately: we want you *playing* — we just do
  > not want to make you read legislation.
- **Engagement-rewarding — make governance *fun content*, not a chore.**
  The thing a game has that a DAO doesn't: politics can be *gameplay.* EVE
  Online's player politics — coalitions, betrayals, campaigns — are its
  most engaging content, and they're emergent governance. Fun politics
  makes the engaged a **retention engine**, not dutiful volunteers.
  Civics-as-payload only works if civics is a blast.

The specific tools for "people don't vote":

- **Decay self-selects the engaged electorate.** Standing fades with
  **inactivity** (stop-the-faucet, never drain-the-tank — not a
  penalty), so only the truly absent fade, which is correct. Tune decay
  *slow* and delegation *sticky* so casuals never hit a cliff and bolt.
  ⚠ **A standing delegation does NOT keep standing alive** — see the
  correction under *Engagement-optional* above; delegation channels
  attention, decay measures presence, and they are different axes.
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

*The bill-as-spine claim-graph, “no ranking to game”, reputation-blind claims and reading by structure + delegated attention shipped as the `ordered` organizer → [forums.md](../../subsystems/forums.md) § The argument organizer (cut here 2026-09-19). Still open:*

- **Version-controlled proposals.** The bill is a document; amendment =
  branch / edit / merge (git-like); the body converges on a version, every
  change in the archive (law is versioned like code).
- **Convergence-detection + a time-box** is the new "closing debate" (no
  natural silence): deliberation *matures* (the structure stabilizes,
  objections are answered, novelty dries up) → moves to the vote, with an
  anti-railroad minimum period (you can't close into a vacuum — the
  constructive-no-confidence instinct).

### Caucuses — slice deliberation & the bill lifecycle

Deliberation on a bill is **global** (one shared argument-map on the central
floor) — but a constituency may also want to deliberate *among itself* first.
A **caucus** is a **group-scoped deliberation**: the same argument-map
substrate, scoped to a `GroupRef` (a whole house — *the funders* working out
how they want the money spent — or a guild, or an ad-hoc coalition) instead
of the whole polity. It's where a slice forms a position before a bill hits
the floor. Two rules keep it clean:

- **A caucus recommends; it never binds.** "Voting as a bloc" is members
  *choosing* to align with the caucus's position — which is just
  **delegation** (delegate your capital-influence to the caucus line,
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

*The bill lifecycle (sponsoring allocation · survival floor · maximum lifespan · continuing resolution) was Art. IV §4 and is superseded under no-pool by [legal-code-slate § The passage rule](./legal-code-slate.md) — bills lapse by time, not starvation; sponsorship gates on eligibility, not allocation. Cut here 2026-09-19.*

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

*Cut 2026-09-19 — the principle graduated verbatim → [forums.md](../../subsystems/forums.md) § The argument organizer; “no number is an authority” is Art. I §4 of the [draft constitution](../../governance/draft-constitution.md).*

### Deliberate as equals, vote by weight

*Cut 2026-09-19 — Art. III §5 of the [draft constitution](../../governance/draft-constitution.md); the argument organizer is reputation-blind and the conviction tally is standing-weighted ([forums.md](../../subsystems/forums.md), [influence.md](../../subsystems/influence.md)).*

### Reputation intersects the edges, never the structure

*Cut 2026-09-19 — Art. III §6 of the [draft constitution](../../governance/draft-constitution.md) (“reputation → bounded weight, never → authority”); the attention edge shipped as the circle highlight ([forums.md](../../subsystems/forums.md) § Delegated attention), the vote edge as `engagement × renown` ([participation.md](../../subsystems/participation.md)). Still open:*

- **Moderation** — notoriety informs *scrutiny* of a known bad actor, never
  an auto-discount of the argument (ad hominem stays a fallacy).
- **Alignment** is affiliation, so it intersects **parties & delegation** (who
  you coalition with), not argument-weight; filtering arguments by alignment
  is echo-chamber capture, refused.

### The cross-slate seam

**Comms owns the social forum** (delivery-slate, popularity-OK); **governance
owns polling and deliberation** as distinct surfaces. **Polling**
(opinion-clustering) is an *advisory* sensing instrument — where used it
needs neutral/randomized statement exposure + an integrity-grade algorithm,
but it's never decisive, so its residual gameability is tolerable.
**Deliberation** (the argument-map) is a structured argumentation surface —
*not* a forum mode, and distinct enough it has **its own slate**
([argument-map-slate](../tails/argument-map-slate.md)), with the comms family
providing only the *social* layer around it.

---

## Branches & separation of powers

*Cut 2026-09-19 — Art. V §§1, 4 of the [draft constitution](../../governance/draft-constitution.md) (a Prime Minister holding confidence; a civil service of chartered institutions, not hierarchies).*

### The executive — a government, not a management

*Cut 2026-09-19 — Art. V §§2–3 of the [draft constitution](../../governance/draft-constitution.md) (executes only what the legislature authorized; a term limit is available, not required).*

### How the prime minister is chosen

*Cut 2026-09-19 — Art. V §§1–2 (confidence = majority of chambers, investiture, constructive no-confidence, optional term limit), Art. VII §2 (the confidence count is universally verifiable) of the [draft constitution](../../governance/draft-constitution.md); the founder as default holder shipped → [governance.md](../../subsystems/governance.md) § The founder default. The cooldown is open (*Open problems*).*

### Confidence, expressed in the shipped substrate (2026-07-31)

"Live, recomputed continuously" has an **exact realization under
conviction, with no new mechanism**:

> **Confidence is a permanently open constructive-no-confidence
> target.**

Nobody continuously *proves* they still have support — a government
falls when a motion **carries**, exactly as in Westminster. The PM is
installed by **investiture** (a discrete bill) and holds until a
no-confidence tally **crosses** by the ordinary passage rule.

And because the motion must **name a successor**, the target is really
*"replace the PM with X"* — so **several rival successors accumulate in
parallel**, all visible on the gauge, and **the first to cross wins.**
A genuinely good political object and first-rate spectacle; the
**cooldown** above is what stops it thrashing.

### Succession — the gap was *disappearance*, not removal

Constructive no-confidence covers **removal**. It does not cover a PM
who quits, is banned, or never logs in again: nobody named a successor
because **nobody moved.**

The floor is already shipped —
[governance.md](../../subsystems/governance.md): **a vacated office
reverts to the founder default**, so the government never runs
ownerless. But a founder holding it by default has **no mandate**, so
that is a **caretaker**, not a PM. Which gives a clean mechanical
expression of a real convention:

> **A caretaker may execute, but may not veto.**

Caretaker governments do not make new policy — and here that is not a
norm anyone enforces, it is a power they simply **lack**. Everything
else keeps running.

### The deputy — duties, never the mandate

A PM cannot be present for every veto window, so they may name a
**deputy** who acts in their absence. The design question is whether
the deputy is in the line of succession, and the answer is firmly no:

> **A deputy inherits the duties, never the mandate. You may hand over
> the desk; you may not hand over the mandate.**

The US Vice-President model hands the office to someone **the
legislature never invested**, contradicting *"the PM holds office by
commanding confidence."* Here legitimacy comes from the chambers and
**cannot be transferred by the person holding it** — a deputy acts
until the legislature invests someone. The contrast is exactly the sort
the pedagogy wants.

### "Running mates" — what the instinct actually maps to

There is no ticket and no PM election, but **two real things** carry
the same intent, and **neither needs a mechanic**:

- **The shadow cabinet.** A PM candidate publishing their intended
  deputy and institution heads **before** investiture is the
  parliamentary analogue — pure content, a document.
- **The caucus as ticket.** A caucus whose platform includes *"we back
  X for PM"* **is** a ticket, emergently, riding § *Synthetic
  constituents*. No ballot needed.

### Elections are a lego, not a kernel feature

The PM must **not** be directly elected — that makes a president with a
rival mandate (above). But elections legitimately belong in three
places, all of them
[amendment-library](./amendment-library-slate.md) material rather than
kernel:

1. **chamber-internal representative seats** — Art. IV §6 already lets
   a chamber create them;
2. **the apparatus offices** (the five seats);
3. **locality governments** — where Tiebout does the arguing.

(2) is **good pedagogy on purpose: let a polity elect its central bank
governor and find out.** Electing regulators is a real and widely
criticized design, and **discovering why beats being told.**

### One consistency worth noting

Three floors now rest on the same principle, and **no admin override
was invented at any of them:**

| Failure | Floor |
|---|---|
| a vacated office | reverts to the **founder default** (shipped) |
| a deadlocked committee | resolves upward to **the Compact** |
| a deadlocked Compact | **the amendment path** + the founder default |

Each is a **declared floor reached by the same rule**, not an
exception.

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

*(The five-way split — legislature → requirements · executive → implementation · judiciary → verification + spirit · human enforcement bounded · the archive — is Art. IV §5, Art. V §§6–7, Art. VI §2, Art. VII of the [draft constitution](../../governance/draft-constitution.md); cut here 2026-09-19.)*

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

*(The two competences — verification of the letter, spirit-judgment of the intent — are Art. VI §2 of the [draft constitution](../../governance/draft-constitution.md); cut here 2026-09-19.)*

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

*Cut 2026-09-19 — Art. VI §§1, 3, 5 of the [draft constitution](../../governance/draft-constitution.md) (one async process at every scale; the jury pool and bindingness are the only knobs; due process widens the pool and removes the override).*

### How the judiciary is staffed

*(The egalitarian branch — influence buys nothing; spirit-judgment by flat sortition past a tenure threshold, judging intent from the archived record — is Art. VI §4 + Art. XIII of the [draft constitution](../../governance/draft-constitution.md); cut here 2026-09-19. The verification pool's track-record mechanism, below, is design the constitution abstracts.)*

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

**Watching the watchmen.** Per-case panels and the decaying competence
pool block entrenchment; the backstops are the **legislature amending the
law** (checking the court *forward* — changing the standard, never
re-judging a case), a **whole-membership referendum** for
constitutional-grade questions, and the transparency floor under all of
it. Bootstrap: in a tiny world the founder + early producers self-certify
transparently, and the track-record mechanism takes over as the pool
fills — the same population ladder as the rest of separation of powers.

### Trials — async-first, sync-optional

*Cut 2026-09-19 — Art. VI §1 of the [draft constitution](../../governance/draft-constitution.md) (async case, verdict by deadline, no-show → judgment on the record, live hearing optional) + the Schedule (`judiciary.overdraw_factor`, `filing_window`, `verdict_deadline`).*

### Abatement — taking live content offline

*(Abatement — the presumption for live content, burden on the challenger, the cure order + `abatement.cure_window`, fault → clawback vs no-fault → natural decay, never for unpopularity — is Art. VI §7 of the [draft constitution](../../governance/draft-constitution.md); cut here 2026-09-19.)*

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

*Cut 2026-09-19 — Art. III §2 of the [draft constitution](../../governance/draft-constitution.md) (no kind of influence converts into another, nor into office in any branch).*

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

*Cut 2026-09-19 — Art. VII of the [draft constitution](../../governance/draft-constitution.md) (operated by the executive, integrity independent of its operator by construction; universally verifiable; no act rests on a falsified record; detectable, not impossible); the build-level design and the four 2026-07-31 findings are [record-integrity-slate](./record-integrity-slate.md) (UNBUILT — every ledger is append-only by convention).*

---

## The money membrane — two unrelated concerns

> **See also** [land-compute-and-license.md](./land-compute-and-license.md) (2026-07-16)
> — the compute economy (compute as *the* scarce resource, riding on parcels; the
> self-balancing title-vs-entitlement allocation; subsidiarity/federated allocation) and
> the AGPL-core-plus-composition-exception license regime. That doc deepens both this
> economy section and § *How territory is held*.

*(Two concerns, one firewall — Art. VIII §1 of the [draft constitution](../../governance/draft-constitution.md); cut here 2026-09-19.)*

### The budget — real dollars

*Cut 2026-09-19 — Art. VIII §§1–2 of the [draft constitution](../../governance/draft-constitution.md) (operating funds vs the in-world economy never convert; surplus may pay wages and costs, never a return to backers). The bookkeeping/tax note is in *Open problems*.*

### The reserve — a game mechanic

*Cut 2026-09-19 — Art. VIII §§1, 3 of the [draft constitution](../../governance/draft-constitution.md) (the in-world economy is ordinary law under the firewall; two portfolios, never a shared balance).*

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

*(The code-executed fiscal cycle — tax → budget → appropriate → disburse — and the real-budget contrast are Art. VIII §4 + Art. V §9 of the [draft constitution](../../governance/draft-constitution.md); cut here 2026-09-19. Shipped today: a demo sales tax that accumulates in a placeholder treasury with **no appropriation path** — `BankingApi.remitDemoTax`, [banking.md](../../subsystems/banking.md).)*

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

*Cut 2026-09-19 — the premise is doctrine in [civics.md](../../subsystems/civics.md) (the Compact is singular; the fiction's governments are content, never a tier of it) and the resource cluster is [polity-decision-register](../../polity-decision-register.md) Tier 1; “influence individuates” shipped (standing keys on the person's identity path — [influence.md](../../subsystems/influence.md)); the library point is [amendment-library-slate](./amendment-library-slate.md).*

### How territory is held — the tenure floor (federal-by-construction)

*Cut 2026-09-19 — [polity-decision-register](../../polity-decision-register.md) Tier 1 § Resource & territory carries the tenure floor verbatim (authority is the protection, not exclusivity; the executive is functional, never territorial; a kernel floor, a module dial; the UN layer parked at Tier 3); the title that binds even the executive shipped → [access.md](../../subsystems/access.md) § Nearest title decides, [parcel.md](../../subsystems/parcel.md).*

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

*(The producer metric is usage-weighted, never a count — shipped as the engagement-only `{author, actor, bucket}` faucet → [influence.md](../../subsystems/influence.md) § The producer stock; cut here 2026-09-19. Second-order quality is register D2, open.)*

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

*(The product rationale graduated to [participation.md](../../subsystems/participation.md) § Why the product, 2026-09.)* Two further
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
  creation and capital houses).
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

*Superseded — the ~51% figure by the [founding charter](../../governance/founding-charter.md)'s published formula (sole producer · 0% consumer · capital matched plus one · sunsets at ratification); “codify the structure, not the founder” and natural dilution are Art. XI of the [draft constitution](../../governance/draft-constitution.md); co-equality is Art. I §5.*

---

## Amendment & entrenchment

*Cut 2026-09-19 — Art. X §§1–3 of the [draft constitution](../../governance/draft-constitution.md) (ordinary · organic · amendment · eternity; the eternity set). The fractions and cooling period are open (*Open problems*).*

### Amendment is ratified by equals

*Cut 2026-09-19 — Art. X §2 of the [draft constitution](../../governance/draft-constitution.md) (one-member-one-vote ratification).*

### Fork is the amendment of last resort

*Cut 2026-09-19 — Art. X §4 + Art. VII §5 of the [draft constitution](../../governance/draft-constitution.md) (the only change to an eternity clause is to found anew; exit disciplines entrenchment).*

### Founding vs. amendment — the founder's self-binding

*Cut 2026-09-19 — Art. XI of the [draft constitution](../../governance/draft-constitution.md) + the [founding charter](../../governance/founding-charter.md) § Why bind at all (formula-fixed · code-enforced · published · auto-sunset → wage-only; the charter ships with the stake ledger). The charter cites this heading for the rationale; the rationale now lives there.*

### Where it lives

The constitution and its full amendment history are a versioned,
**tamper-evident artifact in the archive** — the integrity branch attests
the current canonical text, every change auditable. And because an
amendment changes the law (and its implementation), it routes through the
**judiciary's dual-key greenlight** (verification + spirit) before going
live: the highest-stakes change gets the strongest review.

### The kernel and the library — amendments as political legos

*Cut 2026-09-19 — [amendment-library-slate](./amendment-library-slate.md) (the kernel / library split, presets, the package manager) and the [draft constitution](../../governance/draft-constitution.md)'s three-floor test.*

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
- **Mint-at-launch.** Accrued ledger entries convert to Capital-House
  influence + citizenship tier when the government comes online.
  Pre-launch, the ledger only *records*; nothing is governed yet.
- **The Law 1 wording discipline** from day one — "stake," "funder,"
  "citizen," never "investor/share/return."

What v1 deliberately does **not** ship: the chambers, voting, the
executive, the in-world reserve, the real-dollar budget process, and any
of the macro tuning.

---

## Open problems — deferred to a real member body

The substrate is honest; the *polity* can't be finished against one
citizen. Parked until there's a population to govern:

- *Surplus bedrock — resolved: Art. VIII §2, entrenched by Art. X §3 of the [draft constitution](../../governance/draft-constitution.md).*
- *One-time burst vs cap+honor — superseded by no-pool: a lump credits once, spikes and decays, and is honored in the chronicle (§ The markers survive by splitting).*
- **Loyalty/tenure bonus on recurring?** A modest, *capped* streak bonus
  rewards the backbone subscriber; uncapped, it re-creates a tenure
  aristocracy. Recommended: small and capped. Open.
- **The dollar→influence curve.** Structurally concave (decided);
  the exact shape is macro tuning, deferred to a running game.
- *Voting rule per chamber — superseded: the rule is kernel and uniform (Art. III §4), shipped as conviction hold/flip/tally with no pool ([influence.md](../../subsystems/influence.md) § Conviction).*
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
  whale-as-funder is hard to distinguish from policy).
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
  delegated attention; now its own [argument-map-slate](../tails/argument-map-slate.md))
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
  capital / participation), and the foundational one (without the
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
- *Origination — resolved: none; Art. IV §3 of the [draft constitution](../../governance/draft-constitution.md).*
- *Who adjudicates producer influence — resolved: the engine measures the engagement content draws ([influence.md](../../subsystems/influence.md) § The producer stock); the human layer is the merit-pay exception (Art. III §7), unbuilt.*
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
