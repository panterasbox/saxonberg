# LLM economy slate — three units, three lines, and nothing is minted

> **Status: UNBUILT.** Nothing meters inference today and nothing budgets
> it; [llm-content-slate](./llm-content-slate.md)'s first experiment is
> deliberately unmetered and operator-funded.
> **Left:** the appropriation document + its lapse · the share→quota
> derivation · the three budget lines and their non-fungibility · the
> declare/review/report/throttle loop · the cap stack (A–F) · the
> circuit breakers · the `budget` verb + panel · the published rate
> table · the export formats
> **Size:** **a build**, and it gates both LLM consumers —
> [llm-content-slate](./llm-content-slate.md) (the brain) and the
> automata.

**Captured 2026-10-04.** The mechanism behind
[scarcity-slate](./scarcity-slate.md)'s **token appropriation**, worked
out against two consumers that turn out to need different instruments.

---

## 1. The asymmetry that organises everything

| | **the automata** | **the NPC brain** |
|---|---|---|
| shape | cost/player-hour × concurrent users | ⭐ **an on-ramp**, not a line item |
| distribution | roughly even by construction | **explicitly uneven** |
| must work at | one funded level | **zero · low · high** |
| instrument | an entitlement + a bill | **a ladder** |

An allowance is the wrong tool for the brain because **demand
concentrates** — a handful of named characters absorb nearly all of it,
and most NPCs should never be listening anyway (the witness gate is a
design decision, not an optimisation).

### The brain's ladder

- **Rung 0 — no funding.** The deterministic tree, which **ships**
  ([npc-dialogue.md](../../subsystems/npc-dialogue.md)) and is governed
  by the parity floor: *"the tree must be complete, not a degraded
  stub."* ⭐ **This is the launch state and the permanent floor.**
- **Rung 1 — a quota from the pool.** Allocated by share (§ 3).
- **Rung 2 — the high end**, with ⭐⭐ **diminishing returns per
  character**: past a point more tokens make Rhonda verbose rather than
  better, so allocation hits a **per-character ceiling and spills over.**
  That is how money at the high end buys **breadth instead of depth.**

## 2. ⭐⭐⭐ Narration is PARCELLED — a correction

An earlier pass argued ambient narration is non-excludable and should be
commons-funded as a separate line. **Wrong**, and
[llm-content-slate](./llm-content-slate.md)'s own design says so:
*"Ambient is unattributed → one shared giver (the narrator/director),
**locality only in the prompt**."*

> **Locality in the prompt means the location is the subject** — so
> narration is attributable to a place, and it belongs to that place's
> parcel. It is not a public good; it is a **LOCAL** public good, which is
> exactly what a parcel is.

Three things the correction buys:

1. ⭐ **It unifies the model.** Narrator and NPCs are the *same agent*
   scoped to the same place → **one line, one allocation, one meter.**
2. ⭐ **It kills a special case.** The commons funds the *pool*; the pool
   is allocated to parcels. No atmosphere-everywhere carve-out.
3. ⭐⭐⭐ **It makes the declaration a creative decision with a budget
   behind it: the author chooses the mix.** A sparse wilderness declares
   a slow narrator and no NPCs; a tavern declares two NPCs and no
   narrator. **That only exists because narration is parcelled**, and it
   is lens 2 with teeth.

⭐ **And narration-for-the-player is a different product**: the automata
in *narrator mode* — scoped to you, funded from the automata line,
colouring your experience anywhere. The player's voice over the world's
voice, and the lines stay apart because the deciders do.

## 3. ⭐⭐⭐ Three units, one per layer

Both obvious candidates are wrong:

- ⚠ **Dollars are wrong as the allocation unit.** A dollar is a *price*,
  and model prices move. Grant `$10/month` and a price cut silently
  doubles the grant's capability. **An allocation in dollars means every
  grant changes meaning without a vote.**
- ⚠ **MTok is wrong, more subtly.** Output is 5× input, cached reads are
  0.1×, Haiku and Opus differ 5× — so "3 MTok" names no capability. Worse,
  it creates **an incentive to waste cache or pick a cheaper model to
  stretch the grant**, which are implementation choices the polity must
  not be steering.

| layer | unit | why this unit |
|---|---|---|
| **0 — the appropriation** | **$** | dollars are what the treasury can commit and what the bill is denominated in |
| **1a — the entitlement** | ⭐ **a SHARE** | **price-invariant and model-invariant**: a price cut makes every share worth more, correctly, with no vote |
| **1b — the quota** | ⭐ **a COUNT** | what an author plans against (§ 4) |
| **2 — the meter** | **tokens** | what is actually consumed and reported |

The share is already what [land-compute](./land-compute-and-license.md)
specifies — `f(standing, demand, activity)`, derived on read, *no
per-parcel polling*.

## 4. ⭐⭐⭐ The quota — a ceiling, not a balance

> **The SHARE is how the pool is divided. The QUOTA is what you are
> told.** `share × pool`, **fixed at period start.**

*"400K tokens today"* is plannable; *"2.7% of the pool"* is not. ⚠ And
fixing it at period start is what makes counting possible at all — a
continuously-recomputed share has a denominator that moves under you.

> ⭐⭐ **So the appropriation's lapse and the author's countdown are the
> same mechanism.** The period is what converts a share into a quantity.

**And the quota must not become the currency § 7 refuses:**

> ⭐ **Unused quota does not carry forward and cannot be assigned. It
> expires with the period.**
>
> A balance is a stock you own and can transfer; **a ceiling is a limit
> on your own consumption, and you cannot give somebody your speed
> limit.** Nothing accumulates, so there is no stock to trade.

(`banking.md` already has Terms and quotas — the concept is not new.)

### ⭐⭐ Nested periods: *a bad day costs a day*

Period length **is** the backstop parameter, and it pulls two ways: long
periods mean exhaustion darkens a lot of calendar; short ones make quotas
too small to plan against. So nest them:

| | period | whose cadence |
|---|---|---|
| **the appropriation** | monthly | the committee's — and **the lapse forces it to meet** |
| **the quota** | daily | the author's countdown |

⭐ This answers [scarcity-slate § 10](./scarcity-slate.md) Q4 — *an
appropriation that does not lapse is an allocation formula wearing a
budget's clothes.*

## 5. Three lines, cut by WHO DECIDES

A budget line exists to say **who may spend this without asking again**,
so that is the cut — not what is technically different.

| line | decider | holds |
|---|---|---|
| **automata** | the per-player entitlement (participation) | consults; narrator-mode |
| **world voice** | parcel share → quota, from the declaration | narrator **and** NPCs, ⭐ mix chosen by the author |
| **production** | the executive | images, authoring tools — one-time, self-controlled |

⚠⚠ **The lines are NOT fungible without a vote.** Otherwise it is one
pool wearing three names — the same rule as influence being non-fungible
across chambers, and it is what makes a budget a budget.

⭐ It also protects the thing most likely to be eaten: **without a
separate line, the automata's appetite-gated demand would quietly consume
the world's voice**, because players ask and NPCs do not.

⭐ And the commons needs no special case — `/platform`, the lounge,
Terminus are **parcels like any other, with shares like any other.**

## 6. ⭐⭐ The loop: declare → review → allocate → meter → report → throttle

The content-declaration doctrine applied to a resource.

| step | what happens |
|---|---|
| **declare** | the author declares the inference their content needs — *this locality runs a narrator at this cadence; these two NPCs are performed; that one is tree-only* |
| **review** | ⭐ **it is reviewable content.** A peer can say *"three brains for a two-room area is overbuilt"* |
| **allocate** | the share function reads **the declaration** plus standing × demand × activity → a quota |
| **meter** | coarse period counters on the parcel; ⭐ fine grain is the **warehouse's** job |
| **report** | ⭐⭐ **the mirror**: *you declared a narrator at this cadence — here is your actual consumption* |
| **throttle** | ⭐ **graceful narrowing** — the narrator quietens, the NPCs fall to the tree. **Nobody goes mute** |

Two properties a *request* model would not have:

- ⭐ **Overage is diagnostic, not punitive.** It means your declaration
  was wrong, which is information. Same remedy as the Star Trek
  `DESCRIPTION` finding — *you declared density, here is your density.*
- ⭐ **Over-declaring is not free.** Declared-vs-actual is published, and
  **activity is an input to the share function**, so chronic
  over-declaration costs allocation. Self-correcting without a rule.

⭐ And the declaration is **upstream** of the quota, so the function's two
inputs are the governance pair: *what you say you need* and *what the
polity thinks you have earned.*

⚠ **Where the meter lives:** owner-scoped content with a place → **a
document on the parcel** holding period counters (⚠⚠ *no new
collections*; *an index before a collection*). A per-consult fact table
would be write amplification for data the warehouse holds better.

## 7. ⛔ Nothing is minted, and nothing is traded

| | what it is |
|---|---|
| the **appropriation** | a **document** stating a dollar ceiling for a period |
| the **entitlement** | **derived on read** — never stored |
| the **quota** | a derived ceiling for one period — expires |
| the **meter** | append-only counters |
| the **rate** | a **published** dollar↔token table, read at spend time |

> ⭐⭐⭐ **There is no `llmdollar` object anywhere. Nothing is created, so
> nothing needs converting.** The only code is a rate table, a
> derive-on-read function, and a counter.

### Can a parcel sell 2 of its 3 MTok? — No, and the incentive is why

> **You cannot sell what you never held.** There is no balance; the share
> is recomputed on every read and the quota expires.

⚠⚠ **And a tradeable share inverts the behaviour we want: the optimal
play becomes acquire-and-hold-for-resale.** You would get a quiet world
with a liquid market in its own voice.

> ⭐⭐ **Non-tradeable derived shares invert that exactly: unused
> allocation flows to whoever has demand, automatically, because demand
> is in the function.** No counterparty, no price, no market-making — and
> the incentive becomes *be worth talking to.*

Two further reasons it stays non-tradeable:

1. ⭐ [balance-slate](./balance-slate.md): **every global ledger is a
   currency.** A transferable share *is* a ledger.
2. ⭐⭐ A share market means **a rich parcel buys a bigger slice of a
   commons allocation** — replacing the public formula with a wealth
   auction at precisely the seam the formula governs. A sword is a
   private good; **the world's voice is a commons allocation.**

### ⭐⭐ But the service layer IS tradeable

- a parcel **hosts** another's content — tenancy, which the parcel /
  holding substrate already does;
- a player **pays somebody to consult their automaton** — a contract on
  [contract.md](../../subsystems/contract.md)'s board;
- under-use reallocates automatically, which beats selling because it
  needs no buyer.

**Market at the service layer, never at the entitlement layer.**

## 8. ⚠⚠ The payola problem, and why directed sponsorship is out

[llm-content-slate § Funding](./llm-content-slate.md) proposes
**sponsorship** — a patron funds an NPC's inference, and she is
articulate for everyone. It was tested against **Art. I §2** (*no player
buys advantage*) and passes. **It was never tested against the chamber
structure**, and there it fails:

> ⭐⭐⭐ The benefit is non-excludable **among players** and fully
> excludable **among authors**: Rhonda's author benefits, the author next
> door does not.
>
> A dollar buys inference → inference buys engagement → engagement mints
> **producer** standing. **So the dollar minted producer standing**, which
> is the cross-chamber conversion the polity register forbids
> (*influence is non-fungible across chambers; no cross-chamber
> conversion*). It does not matter whose ledger it lands on — **money got
> into the producer chamber.**

⛔ **And "self-sponsorship earns no capital standing" does not fix it** —
*why else would you do it?* To make your content perform better, which is
what producer standing measures. That removes the honest, visible half of
the reward and leaves the actual one, which **hides** the conversion
rather than closing it.

**The rule that applies was already written**, in
[land-compute](./land-compute-and-license.md) Movement 2:

> ⭐⭐⭐ **"Capital grows the PIE, never buys a SLICE** — a whale funding a
> bigger box grows the commons' total compute, **allocated by quality,
> not by who paid."**

Directed sponsorship *is* buying a slice.

### What survives: undirected patronage

| | |
|---|---|
| real dollars → | **the treasury**, earning **capital** standing — Art. I §2's permitted channel |
| treasury → | **the appropriation**, bounded by its committee |
| appropriation → | allocated by share, **by performance, not by payment** |

⭐ The sentiment survives intact — *standing for helping give the game
more liveliness* — **you just do not get to point at a slice.** Credit in
the world is fine and cheap: *this season's atmosphere is underwritten
by X.* **Public-radio underwriting done properly: underwriters do not
choose the programming.**

⭐⭐ **And it fixes the owner-pays problem by deletion.** The owner never
pays, so popularity is not punished — it is **rewarded with more
allocation**, the correct incentive and the opposite of what sponsorship
produced. *Sponsorship was solving a problem created by assuming the
owner pays.*

⚠ **One dial that needs care:** if a parcel pays a zorkmid utility bill
for its consumption (the [energy.md](../../subsystems/energy.md) civic-bill
shape, firewall-clean because zorkmids cannot be bought with real money),
the rate must make popularity **net positive** — or the punish-success
problem returns in the other currency.

## 9. The cap stack

| | guard | behaviour when hit |
|---|---|---|
| **A** | **per-actor rate** (token bucket) | ⭐ the burst guard — a week's quota cannot go in ten minutes |
| **B** | **per-actor soft cap** (~80%) | ⭐ **a report, not a block.** You learn the declaration was low *before* the throttle |
| **C** | **per-actor hard cap** | **graceful narrowing** |
| **D** | **aggregate soft cap** | ⭐⭐ a report **to the committee** — the scarcity that does not announce itself |
| **E** | **aggregate hard cap** (the appropriation) | ⭐ **everyone narrows at once** — *"legible and fair precisely because it hits everyone simultaneously"* |
| **F** | ⭐⭐⭐ **provider-side spend limit** | the only guard that survives **our own bugs** |

⭐ **C is safe to automate only because the tree is complete.** The parity
floor is what makes a hard cap degrade *texture* and never *function*.

⭐⭐ **A has an in-fiction precedent to copy rather than invent:** the
TPA's **arming floor and amber band** over a derived rate
([fasttravel.md](../../subsystems/fasttravel.md)).

### ⭐⭐⭐ F is the one to insist on

A–E are **our** logic, and our logic can be wrong: a retry loop, a cache
that stops hitting, a brain stuck in a tool loop. **The last line of
defence must not live inside the thing that might be causing the
problem.**

> ⭐⭐ **And give each budget line its own provider workspace with its own
> limit.** Then a runaway automata bug **cannot** eat the world-voice
> budget — § 5's non-fungibility rule enforced **by the provider instead
> of by us**, which is strictly stronger because it holds when our
> accounting is the bug.

### ⭐ The reserve — do not allocate 100%

If the aggregate cap is hit on day 3 of a period, everyone is narrowed
for the rest of it. So the appropriation is not fully allocatable; hold
headroom. ([credit.md](../../subsystems/credit.md) already has *the
reserve's window and the two rules* — reuse the vocabulary.)

⭐⭐ **And the reserve does double duty: it is where committee discretion
grants cold-start content from.** The thing that protects against
exhaustion is the thing that funds new authors.

### Who may lift what

- the **aggregate hard cap is the appropriation** — only a **new
  appropriation** raises it, which means a vote;
- the **per-actor hard cap is derived**, so it cannot be lifted at all —
  it changes when its inputs change (*you never downsize a parcel; its
  entitlement falls and recovers*);
- the **executive holds a duty to cut BELOW the ceiling** in an
  emergency.

> ⭐⭐⭐ **The executive can always spend less, never more.** An emergency
> throttle needs no new authority; a raise always needs a vote.
>
> ⚠ And: **a hard cap a person can raise in the moment is not a hard
> cap.** Every mechanism here is derived, voted, or enforced by the
> provider — none is a number an operator can edit under pressure, which
> is exactly when it would be edited.

⭐ This answers [scarcity-slate § 10](./scarcity-slate.md) Q3 — the token
brake is **both**: an entrenched ceiling *and* an executive duty, at
different layers.

## 10. Circuit breakers

> ⭐⭐⭐ **A cap trips on the LEVEL. A breaker trips on the DERIVATIVE.**
>
> A cap fires when the money is gone — too late to catch a bug, because a
> bug burns the period *inside the rules*. A breaker fires when the rate
> or the shape looks wrong.

A breaker is also not a rate limit: a rate limit **shapes** traffic
(*slow down*); a breaker **stops** it (*something is broken*).

### Cost-anomaly — and the first is the highest-value guard here

| trip on | why |
|---|---|
| ⭐⭐⭐ **cache hit-rate collapse** (`cache_read_input_tokens` → 0) | **this is how a surprise bill happens** |
| ⭐⭐ **burn rate vs expected** | catches the bug no cap can see |
| ⭐⭐ **context size vs expected** | the assembler is broken, and it has a signature |

> **A cache invalidator throws no error.** It makes everything ~10× more
> expensive, quietly, indefinitely — a timestamp in the prefix, a
> reordered key, a varying tool list. No cap catches it until the money is
> gone; a breaker on the ratio catches it in minutes.

⭐ The context-size check is nearly free **because our prompt is
derived**, so its expected size is predictable and 10× expected is a
defect with a fingerprint.

### Provider health — with one finding that bites

Error rate, 429s, p99 latency. And the reason it is a *cost* guard:

> ⚠⚠ **The SDK retries twice by default on 408/409/429/5xx**, so a
> flapping provider gets **3× the calls, billed** — and an outage is
> exactly when a cost multiplier hurts most.

⭐ Latency earns its own trip here: with **no streaming** (§ 11), *a slow
consult is worse than no consult.* "Your automaton is thinking slowly
today" beats a twelve-second hang.

### Behaviour

- **tool-loop detection** for the brain — task budgets are *advisory*; a
  breaker is enforcement;
- ⭐ **refusal-rate spike** — a provider policy shift mid-period makes
  every call wasted spend *and* a broken feature, and it can happen
  without notice;
- **output-length anomaly** — hitting `max_tokens` costs twice when there
  is no streaming.

### What opening does, and who closes it

⭐ **Fall to the floor, visibly.** Tree-only NPCs; the automaton reports
unavailable. ⚠ `Figure`'s discipline applies — *live · empty · unwired
must look nothing alike*: **an unwired automaton must not resemble a
thoughtful one**, because silence that reads as a considered answer is
the worst failure this feature has.

⭐ The *narrowing* is visible in the fiction (terse NPCs). The *reason*
belongs in the honest-state panel — **compute is a metaresource and the
breaker gets no costume.**

| | reset |
|---|---|
| **health breakers** | half-open with a timeout; self-healing |
| ⚠ **cost-anomaly breakers** | **never self-close** — auto-closing re-runs the bug |

⭐ Authority is already settled by § 9: holding a breaker open needs no
new authority, and **closing it is the act that needs a reason on the
record.** The dangerous direction is the one that must be justified.

⭐ **Scope: per budget line, plus one global** tied to F — trip
everything *gracefully* while there is headroom, because the alternative
is the provider refusing calls, which is an outage instead of a
degradation.

**The full stack, by how far outside our control each layer sits:**

> **rate limit** (shapes) → **soft cap** (reports) → **hard cap**
> (narrows) → **breakers** (stop on anomaly) → **provider spend limit**
> (survives our bugs).

## 11. The automata's own numbers

Priced against the Anthropic table (first-party, cached 2026-06-24);
⚠ **token counts are estimates and want `count_tokens` against real
frames.**

A consult ≈ 15–25K in, ~300 out:

| | cold | warm |
|---|---|---|
| **Haiku 4.5** ($1/$5) | ~$0.021 | ~**$0.004** |
| Sonnet 5 ($2/$10) | ~$0.042 | ~$0.008 |
| Opus 5 ($5/$25) | ~$0.105 | ~$0.020 |

⭐⭐⭐ **The frame store is the ideal cache shape**: `player_frames` is
append-only, so each consult in a session shares a byte-identical prefix
with the last — **consult #2 onward reads almost everything at 0.1×.**

⭐⭐ **And the comparison that matters:** `llm-content-slate` estimates
**$0.50–$1.00 per player-hour** for three live NPCs at frontier pricing.
An automata at ten warm consults an hour on Haiku is about **$0.05 per
player-hour** — **an order of magnitude cheaper than NPC dialogue.** It
*feels* like the bigger exposure because it is appetite-gated rather than
witness-gated, which is what the entitlement is for.

**Configuration:** Haiku 4.5 · **thinking off** (its default — and the
lowest-latency configuration available) · **no streaming** (the message
frame is the atomic unit; there is nowhere for a character stream to
land) · 1-hour cache TTL · overnight **Batch** digests at 50%.

⭐ **Tier the instrument by memory depth, not by model** — caches are
model-scoped, so a model tier would make every tier separately cold and
cost a player their warm cache on upgrade.

## 12. The budget is a reviewed document

⭐⭐ Make it a document in the tree and the rest falls out: **CLI-manageable
through the document/source path, versioned, reviewable, and
provenance-stamped for free.**

> **An appropriation should be a reviewed commit, not a database row.**

- the client half has a precedent — `git-workflow` is **GitApi + the
  `git` verb + a CMS panel** behind the same gate a direct write passes.
  So: **a `budget` verb over a budget document**, with
  [civics.md](../../subsystems/civics.md)'s `government` verb over a
  Government data Idea as the closer in-fiction model;
- ⚠ **an appropriation the executive can edit at will is not an
  appropriation** — the title belongs to the committee, via the
  `soul` / `/expression` pattern.

### Export formats — adopt for the EXPORT, never the ledger

⚠ **Unverified, from memory; read before adopting.** The shapes are
right:

| layer | candidate |
|---|---|
| **metering** | ⭐ **OpenTelemetry GenAI semantic conventions** — token counts, model, operation |
| **cost reporting** | ⭐ **FOCUS** (FinOps Open Cost & Usage Spec) |
| **publishing the budget** | ⭐⭐ **Open Fiscal Data Package / OpenSpending** — literally *a budget as data* |

⭐ Internal representation stays our documents; the published view speaks
what third-party tools read. Same split as the CMS.

## 13. Open questions

1. ⭐⭐ **The share coefficients** — quality vs demand — still inherited
   unanswered from `land-compute`, and now they allocate a *dollar* cost
   rather than sunk capacity, which sharpens them.
2. **The zorkmid utility rate**, set so popularity is net positive (§ 8).
3. ⭐ **Does the declaration bind?** A declaration that cannot be refused
   is a request; one that can is a permit. Peer review implies the
   second, which means an author can be told *no, not three brains* —
   and that is a real editorial power worth naming before it is used.
4. **Period lengths** — monthly/daily is a starting guess, not a measured
   one.

## Cross-refs

- [scarcity-slate.md](./scarcity-slate.md) — the four channels; tokens as
  an **appropriation**; this slate answers its Q3 and Q4.
- [llm-content-slate.md](./llm-content-slate.md) — the brain, the parity
  floor, the cost levers; ⚠ **and § 8 above corrects its sponsorship
  model.**
- [feedback-slate.md](./feedback-slate.md) — ⭐ ratings feed
  `f(standing, demand, activity)`; **this is the resource they allocate.**
- [land-compute-and-license.md](./land-compute-and-license.md) — *capital
  grows the pie, never buys a slice*; the entitlement function;
  subsidiarity.
- [record-layer.md](../../subsystems/record-layer.md) +
  `schema/player_frames.yaml` — the automata's memory: Mongo-backed,
  windowed, owner-only, `reset: wipe`.
- [npc-dialogue.md](../../subsystems/npc-dialogue.md) — rung 0, which
  must stay complete.
- [measurement.md](../../measurement.md) — the mirror-not-a-gauge remedy
  § 6 depends on.
