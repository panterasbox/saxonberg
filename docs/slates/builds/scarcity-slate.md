# Scarcity slate — four meters, three institutions, one bill

> **Status: UNBUILT, and the framing it replaces was shipped doctrine.**
> ⛔⛔ **Nothing in the server meters anything** — verified 2026-10-01 at
> `c2c406848`: no `cpuUsage`, no `memoryUsage`, no `heapUsed`, no
> `dbStats`/`collStats` anywhere in `packages/server/src` outside tests,
> and zero token accounting by design.
> **Left:** the four-channel per-parcel meter (the whole near-term build)
> · the CPU entitlement coefficients + the capacity door ·
> the retention schedule as a polity question · the token/egress
> appropriation + its ceiling · the two committees · the sizing ↔
> allocation separation written as a rule
> **Size:** **the meter is a build**; the three economies are each a
> build of their own and none should start before the meter reports.

**Captured 2026-10-01**, replacing *"compute is the one scarcity"* as
stated in [land-compute-and-license](./land-compute-and-license.md)
Movement 2.

> **User: "right now we've been saying that 'compute' is the one scarcity
> and I think we need to rethink that framing… I think there are 4 things
> that are scarce: actual compute (cpu), memory (RAM), storage
> (mongo/s3/etc), and a new one but something I think we need: LLM
> tokens. these 4 things need to be independently budgeted."**

⭐⭐⭐ **The old framing was not merely coarse — it merged three different
kinds of legislative instrument into one word.** An allocation formula, a
retention schedule and an appropriation are not three settings of one
number; they are set by different bodies, on different cadences, against
different failure modes. One number cannot be a formula, a schedule and a
budget at once.

**What survives untouched:** compute is still a **metaresource** — out of
fiction, machine-level, subdivided by parcels, never costumed as in-game
energy. That correction stands for all four channels. The four are
*platform* scarcities; the in-game power economy is diegetic physics paid
in in-game money and is a different plane entirely.

---

## 1. The shapes — why the four cannot share an institution

| | CPU | RAM | storage | tokens *(+ egress)* |
|---|---|---|---|---|
| **shape** | flow (a rate; unused is lost forever) | stock (instantaneous occupancy) | ⚠ **ratchet** — accretes, never self-reduces | flow, **purchasable at the margin** |
| **deficit presents as** | everyone's world gets slower | things quietly fail to load | ⛔ **nothing — until the bill** | an NPC narrows / a stream degrades |
| **recovered by** | waiting | releasing | **deleting — an editorial act** | waiting, or money |
| **supply elasticity** | step (a bigger box) | step | near-continuous, cheap | **continuous, expensive** |
| **marginal $** | ~0 inside the box | ~0 inside the box | ~$0.02/GB·mo **forever** | ⛔ **$3–15/Mtok, every single use** |
| **who feels it** | everybody, simultaneously, as degradation | the unlucky — whoever's load lands badly | **nobody** | the person mid-conversation |

⭐⭐⭐ **The load-bearing axis is SUNK vs METERED.**

- **Sunk** (CPU, RAM) — a box at 10% costs exactly what a box at 90%
  costs. These are a textbook **congestible commons**: rivalrous, zero
  marginal cost. The economics of a zero-marginal-cost rivalrous good is
  **queueing and allocation**, never pricing. Charging for CPU would be
  charging for something that costs nothing to supply and everything to
  supply *more* of.
- **Metered** (tokens, egress) — every use spends real dollars that never
  come back. This is a **spending** problem, and spending problems are
  solved by appropriations, ceilings and audit.
- **Storage is the hybrid and therefore the nastiest**: metered *and*
  ratcheting. It is the only channel that can run away without any
  participant ever feeling it.

## 2. ⭐ Egress files with tokens — DECIDED

> **User: "egress files with tokens."**

AWS data transfer and Anthropic inference are the **same institutional
animal**: metered dollars per unit of use, continuous supply at a posted
price, no congestion semantics, and a bill that arrives monthly whether or
not anyone looked. A livestreaming-adjacent product has real egress, so
this is not a rounding error.

They are **one channel with two line items**, not two channels. The
reason to keep them joined is that they fail the same way (a spend
overrun), are governed by the same instrument (an appropriation with a
ceiling), and are audited by the same committee. Splitting them would
duplicate an institution to track two numbers that add.

⚠ **What egress is NOT:** it is not CPU with a different unit. The
temptation is to file egress under "the box" because it comes on the AWS
invoice. The invoice is not the taxonomy — **the taxonomy is sunk vs
metered**, and egress is metered.

## 3. Where each channel already lives

The surprise of the pass: **three of the four already have shipped or
designed mechanisms, and nobody called any of them an economy.**

| channel | what it actually is | its real home | state |
|---|---|---|---|
| **RAM** | **engine physics** — below the constitution | [residency.md](../../subsystems/residency.md) — self-eviction of the cold tail, the `canEvict` veto | ✅ ships |
| **CPU** | an **allocation** (rivalrous, zero marginal cost) | the land — title vs entitlement, subsidiarity, the capacity door ([land-compute](./land-compute-and-license.md) Movement 2) | designed, unbuilt |
| **storage** | a **retention** (a ratchet; a *memory* policy) | the record — `RESET_DISPOSITIONS`, the chronicle, the `onVanish` taxonomy, dormancy→escheat→reversion | ✅ partly ships, never budgeted |
| **tokens + egress** | an **appropriation** (real dollars, periodic, lapses) | the treasury — sponsorship, the parity floor, Art. I §2 ([llm-content](./llm-content-slate.md) § Funding) | designed, deliberately unmetered |

⭐⭐ **Storage's reframe is the most useful single move in this slate:**
*storage policy is not a resource policy, it is a memory policy.* The
question is never "how many gigabytes may you hold" — it is **"how much
past does this world pay to keep?"**, which is a lens-4 values question
and belongs beside the record-integrity rules, not beside CPU's formula.

## 4. ⛔⛔ RAM is not political, and the reason is measurement

Nobody wants anything about RAM. No chamber has an interest, no author has
a preference, no player has an experience of it. That is not a gap in the
analysis — it is the **necessity-kernel test passing cleanly**: *strip it
away, can the machine still decide?* The sweep is physics.

⭐⭐ **And the clinching argument is already written down.**
`residency.md § Deferred` concedes that per-object retained footprint
*"needs a heap walk we can't afford per-sweep"*, and that
memory-pressure-driven aggressiveness is a *"documented seam; not built."*

> **The RAM meter is itself unaffordable.** You cannot legislate what you
> cannot measure. RAM gets the sweep, the sweep gets a pressure threshold
> when someone builds one, and no chamber ever votes on it.

⚠ **One real hole, flagged not fixed:** `canEvict` is an **unpriced
veto**. An object may refuse to leave, indefinitely, at no cost to
anybody. Today that is correct and load-bearing (an exit must not be
culled out from under a live room; `PostmortemMixin` holds a body until
forensics finish). But if RAM ever becomes a budget rather than a sweep,
an unbounded free veto is the hole it leaks through. The honest position:
**RAM is a sweep, so the veto is fine** — and if that ever changes, this
is the first thing to revisit.

## 5. Deficit response — CPU's needs inverting

**CPU is the bad one**, because its natural deficit form is
**non-excludable degradation**: no door, no address, everybody simply has
a worse time and nobody can say why.

> ⭐⭐⭐ **The capacity door's real job is to make CPU scarcity
> EXCLUDABLE.** It converts invisible universal lag into a visible local
> refusal. A queue at 47/50 is strictly better than lag, because **a
> queue has an address and lag does not** — and *your waiting is the
> demand signal* only if there is a line to stand in.

That reframes the door from a rationing mechanism (which sounds like a
cost) to an **instrument** (which is a benefit). It is the same move as
the honest-state primitives: the system's job is not to hide the limit,
it is to give the limit a shape a person can point at.

**Storage is the exact opposite problem.** Nobody ever bumps into it, so
*felt scarcity* — the whole legitimating story of the land-compute slate —
**fails completely here.** Storage does not need a door. It needs
**something that is made to look** (§ 7).

**Tokens already have the right answer** in
[llm-content § Funding](./llm-content-slate.md): graceful narrowing over a
**complete** deterministic floor, never a mute NPC. The parity floor is
what makes exhaustion a texture change instead of a content outage.

## 6. ⭐⭐ Meter the parcel, never the person

Metering a *player's* consumption builds precisely the per-person dossier
[measurement.md](../../measurement.md) A3 forbids — a tracked quantity
about a citizen, derived from nothing, retained. The resolution is already
in the land slate and generalises to every channel:

> **Consumption attaches to places and things, never to citizens.**
> Entitlement is derived-on-read from standing × demand × activity;
> nothing stored, nothing seized, no per-parcel polling.

**Tokens are the hard case** — a conversation has a person on one end —
and this is where the sponsorship inversion earns its keep twice. Under
it the meter reads *"Rhonda spent 40k tokens today"*: a fact about a
**cast member**, an object the platform owns, not about a member of the
polity.

> ⭐⭐⭐ **Art. I §2 (no money buys advantage) and A3 (no dossier) arrive
> at the same answer for completely independent reasons.** The eternity
> clause bars per-player token budgets because a paying player with an
> articulate NPC has bought gameplay advantage; the measurement doctrine
> bars them because the meter would be a dossier. Agreement between two
> unrelated constraints is the strongest evidence a design decision is
> load-bearing rather than taste.

## 7. The politics

### What each chamber natively wants

| | producer | capital | consumer |
|---|---|---|---|
| **CPU** | **depth** — simulation richness *is* expression (lens 2). Producers want the box pushed to its limit | **the bill** — the only chamber that can grow the pie at all | ⭐ **speed** — the only chamber natively *opposed* to simulation depth |
| **RAM** | — | — | — |
| **storage** | ⭐ **memory** — the producer chamber runs on **attribution**, so erasing history is *disenfranchisement*. Structural retention hawks, not sentimental ones | **indifferent** — storage is ~free at our scale | ⭐ **forgetting** — it is their own past in the record |
| **tokens + egress** | ⚠ **split internally** — an LLM performing your NPC either amplifies your authorship or rewrites your character's voice | **the natural home** — *adopt Rhonda*; capital's cleanest legitimate act anywhere in the design | **texture**, with zero cost exposure |

### The four divergences, worst first

1. ⭐⭐⭐ **CPU sets producer against consumer with capital as the
   permanent swing.** Depth vs speed; neither carries alone under
   two-of-three; therefore **every CPU question is decided by the chamber
   that pays for the box.** The firewall says capital grows the *pie* and
   never buys a *slice* — but **a permanent swing vote on how big the pie
   is has acquired allocation power through the back door of sizing.**

   > ⭐⭐⭐ **The rule this slate asks for: capital decides HOW MUCH, the
   > other two decide WHO GETS IT.** Level 0 (box size) is capital +
   > legislature. The Level 1 entitlement **coefficients** are a polity
   > dial on which capital votes like anybody else, one tally of three.
   > The separation already exists structurally in the land slate; it has
   > never been stated as a constraint, and unstated it will erode,
   > because the party sizing the pie always has the strongest opinion
   > about the slices.

2. ⭐⭐ **Storage sets producer against consumer with capital
   INDIFFERENT.** The two interested parties cannot reach two-of-three
   between them, so a chamber with no stake becomes decisive on a memory
   question. That is the textbook precondition for log-rolling: capital
   trades its retention vote for CPU headroom it actually wants.
   ⭐ **This is the real argument for a committee** (§ 8) — a question one
   chamber is indifferent to is exactly a question that needs a body
   obliged to do the reading, because the indifferent chamber will vote on
   the report.

3. ⚠⚠ **Tokens have no natural brake.** Producers split internally, which
   delivers a weak tally; and the two chambers that *agree* — capital and
   consumer — are **both the ones not paying.** The legislature's natural
   majority on the only channel with a real dollar price is **"spend."**

   > **Representation cannot fix this.** A brake has to come from outside
   > the vote: an entrenched ceiling, or an executive duty to refuse.
   > ⭐ Which of those is a genuine lens-4 call (§ 10, Q3) — they are very
   > different constitutional animals.

4. **RAM has no constituency**, per § 4. Not legislated; engineered.

### ⚠ What the chamber analysis does NOT license

A chamber's native interest is a **prediction about pressure**, not a
licence to decide on its behalf, and not a claim about individuals. The
chambers are three tallies over one crowd — every member holds all three.
*"Consumers want speed"* means a bill that trades depth for speed will
tally well in the consumer column; it does not mean players are the speed
party. Reading the table as three factions is
[compact-political-science.md](../../compact-political-science.md)'s
headline teaching error.

## 8. Committees vs the general legislature

A committee has exactly three things the floor does not:

1. ⭐ **Standing attention** — it meets whether or not a bill is tabled.
   **The floor only acts when something is brought to it.**
2. **Compelled reading** — its members must look at the numbers; the
   floor votes on a summary. A committee is an institution for *making
   somebody look in the mirror* ([measurement.md](../../measurement.md)'s
   Mara/Aletheia property, as a procedure).
3. **Non-binding output** — it reports; the floor decides.

> ⭐⭐⭐ **A committee is structurally a CAMERA, not a wall.** On the
> enforcement ladder (*wall · camera · witness · norm*) a committee that
> could set the token ceiling itself would be a wall, and lens 33 holds
> that **implementing a law must not entrench it.** A committee that
> publishes the number is a camera, and the floor stays sovereign.

**Which tells you the roster, and it falls out of § 1's shapes rather
than being imposed:** committees belong on the scarcities that **do not
announce themselves.**

| channel | committee? | why |
|---|---|---|
| **CPU** | ⛔ **no** | ⭐ **the door is its own camera.** Standing in a queue at 47/50 *is* the report, published continuously to everyone affected, with the formula public beside it |
| **RAM** | ⛔ no | not political |
| **storage** | ✅ **yes** | a ratchet nobody feels; needs a body whose job is to notice |
| **tokens + egress** | ✅ **yes** | a spend nobody on the floor pays; needs audit, and the ceiling needs a reporter |

⭐⭐ **Two committees, and both exist because a deficit is invisible.**
That is a real finding: *the committee is the institutional answer to an
imperceptible scarcity.* Where the mechanism can be felt, build the
mechanism and skip the committee.

## 9. ⭐⭐⭐ What to build first — the meter, not the market

> **Four meters and a published ceiling is a build. Four economies is a
> fantasy until the meters exist.**

Every policy in §§ 5–8 is a function of a number that does not exist
today (the Status block's verification). This is
[lint-family.md](../../lint-family.md)'s **census-then-ratchet** pattern,
which is the strongest pattern in this repo: the best gates began as a
burn-down meter and became a ratchet. Write the census; **gate today's
number as the ceiling** (it may fall, never rise); a later build flips it
to a real entitlement function.

**The build:** a four-channel reading **per parcel** — CPU, RAM-ish
occupancy, bytes held, dollars spent — derived, published, with today's
value as the declared ceiling. It is an
[instrumentation.md](../../subsystems/instrumentation.md)-shaped problem
(a `Reading` per channel, warmed by a catalogue, competence resolving
**detail** and never **access**) pointed at the platform rather than the
fiction.

⚠⚠ **And the one warning that matters most here: the meter is made of the
thing it measures.** Per-parcel CPU accounting costs CPU. A retained time
series is storage — **forever**, in the one shape that cannot be undone.

> **So the meter is derive-on-read over a bounded window with NO retained
> series** — which is A3 arriving for a *third* independent reason. The
> reflex to "just log it" would create a permanent storage liability in
> order to manage a transient CPU problem. Measuring resources is the one
> place in the system where the instrument is built out of its own
> subject, and the usual answer is therefore the wrong one.

⚠ **RAM's channel is honest about itself or it is not shipped.** Per § 4
there is no affordable per-object footprint. The meter may report
process-level occupancy and *proxies* (resident object counts, sweep
yield) and must **say that is what they are** — B4: *a declared standard
is never a gauge*, and a proxy presented as a measurement is worse than
no channel.

## 10. Open questions — values, not mechanism

1. ⭐⭐ **Storage retention is already answered twice, in opposite
   directions, on purpose.** The chronicle is append-only (identity, deed
   vs claim); the record layer resets nightly. Both are deliberate. So:
   is there a polity-facing question *"how much past do we pay to keep"*
   at all, or does retention stay with whoever owns each ledger, with the
   committee merely reporting the total?
2. ⭐ **The CPU entitlement weights** — quality vs demand — inherited
   unanswered from [land-compute](./land-compute-and-license.md). The
   coefficients *are* the values choice, and § 7's divergence 1 says the
   vote on them must be separated from the vote on box size.
3. ⭐⭐⭐ **The token ceiling's constitutional form.** An entrenched cap or
   an executive duty to refuse? Not derivable — the floor's natural
   majority is "spend" either way, and the two answers differ in who is
   blamed when an NPC narrows.
4. **Does the appropriation lapse?** An appropriation that does not lapse
   is an allocation formula wearing a budget's clothes, and the whole
   taxonomy collapses back into the single number this slate split apart.

## Cross-refs

- [land-compute-and-license.md](./land-compute-and-license.md) — Movement
  2 is the **CPU** economy; this slate narrows its scope and keeps its
  machinery (title vs entitlement, subsidiarity, the capacity door).
- [llm-content-slate.md](./llm-content-slate.md) § Funding / § Cost shape
  — the **token** appropriation's substance (sponsorship, the parity
  floor, caching, Batch, model tiering).
- [residency.md](../../subsystems/residency.md) — **RAM**, in full, and
  the unaffordable-meter concession.
- [measurement.md](../../measurement.md) — A3 (derive, don't track), B4
  (a declared standard is never a gauge), the enforcement ladder.
- [compact-political-science.md](../../compact-political-science.md) § The
  three chambers — and its warning that they are not three groups.
- ⭐⭐⭐ [feedback-slate.md](./feedback-slate.md) — **what DRIVES the
  allocation** these institutions perform: *votes allocate, measurements
  mint*. The two slates are one loop seen from its two ends, and the
  meter of § 9 is the shared prerequisite.
- [balance-slate.md](./balance-slate.md) — *every global ledger is a
  currency*, which is why none of these four may be spendable by players.
