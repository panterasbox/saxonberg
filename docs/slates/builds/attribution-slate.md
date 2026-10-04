# Attribution slate — existence, not execution; and what a grant actually says

> **Status: UNBUILT, and it is the model the other four scarcity slates
> assumed without stating.**
> ⭐ The goal, in the user's words: ***"making sure every bit of content
> and code has someone responsible for it."***
> **Left:** the template rating (sampled, amortised) · the mint ledger ·
> apportioning iterating work · the `every-template-resolves-to-a-parcel`
> lint · the five grant lines and their three forms · the **capacity
> read** and its reference basket · the cost-basis pin at mint ·
> per-template breakers
> **Size:** **a build**, and it gates the storage/CPU/RAM half of
> [scarcity-slate](./scarcity-slate.md) the way
> [llm-economy-slate](./llm-economy-slate.md) gates the token half.

**Captured 2026-10-04.** Worked out after the LLM economy, on the
observation that *the LLM economy is end-to-end implementable because
its accounting is easy* — and the question of why.

---

## 1. ⭐⭐⭐ Why tokens were easy — the diagnostic for everything else

Every LLM call has an obvious **principal** and an observable **price**:
the caller is named and the provider returns the number. **Nothing had to
be inferred.** Score the channels on exactly those two axes:

| | principal | price |
|---|---|---|
| **tokens** | ✅ the caller is named | ✅ returned by the provider |
| **storage** | ✅ parcel-partitioned | ✅ bytes are countable |
| **CPU** | ⚠ a call chain, not a principal | ⚠ only by sampling |
| **RAM** | ⚠ shared; a per-object heap walk is *"unaffordable per-sweep"* | ⚠ only by sampling |

> ⭐⭐ **You bill what you can price. You ration what you can only
> observe.**

⚠ **But § 3 revises how much "only by sampling" costs us** — the
unaffordable thing turned out to be the *granularity*, not the
measurement.

## 2. ⛔ The model that failed: the execution

The first pass made **the execution** the unit — a call stack rooted in a
wire command, attribution from the giver, measurement from the frames.
Three objections killed it, and they are worth keeping because each one
teaches something:

1. ⭐⭐⭐ **The greedy-item asymmetry.** A costly item in a player's
   inventory charges the **player**, who can do nothing about it; only
   the item's **author** can. **A price's job is to create a decision —
   charging a party with no lever is a tax, not a price.**
2. ⚠ **Not everything is a command.** Timers. And a timer may be
   attributable to a command, or to *an object having been loaded*, which
   may itself be command-attributable or not.
3. ⚠ **The async ambiguity.** A command that starts a timer *"may be one
   thing or two things, and it may not always be the same answer."*

And the empirical objection that settles it:

| | caused by | command root? |
|---|---|---|
| `look` derives and returns | a command | ✅ |
| a craft completes in ten minutes | a command, deferred | ⚠ one act, two executions |
| a lamp burns four hours | a command, recurring | ⚠ unbounded |
| ⭐ **spoilage · growth · maturation · wounds · soil · bees wintering** | ⛔ **the object exists and was loaded** | ⛔ **none** |
| weather · the celestial clock · the nightly reset | the world | ⛔ none |

> ⭐⭐⭐ **In our architecture the fourth row is the DOMINANT case.** The
> command-rooted execution is the minority of the work, so a model built
> on the call stack is built on the exception.

## 3. ⭐⭐⭐ The unit is EXISTENCE IN A STATE

> **Cost is a property of what EXISTS, not of what runs.** Attribution is
> **ownership**, which is already total — parcels partition everything.
> **Execution is merely how the cost is realised.**

⭐⭐ **And a command is a STATE TRANSITION, not a cause.** `light lamp`
moved the lamp from a cheap state to an expensive one; nobody has to
decide whether the command "caused" four hours of burning. **That
dissolves the async ambiguity rather than answering it** — and it puts
the economising act in the right place: *blowing the lamp out stops the
cost.*

### ⭐⭐⭐ The two keys are the two numbers

| key | carries | whose lever |
|---|---|---|
| **`getTemplatePath()`** — the kind | ⭐ the **RATING** | the **author's** — and disclosed before you clone |
| **`getIdentityPath()`** — the instance | ⭐ the **CHARGE** | the **holder's** load |

> ⭐⭐⭐ **So you never measure per instance. You rate per template, once,
> and multiply by count** — exactly how weight works. A chair's weight is
> not weighed per chair, and the registry already knows the count.

⚠⚠ **This partially revises [scarcity-slate § 4](./scarcity-slate.md)**,
which concluded RAM is engine physics *because* per-object measurement is
unaffordable. A **per-template heap sample, taken once and amortised over
thousands of instances, is affordable.** So RAM may have a principal and
a price after all, and may belong in the accounting system.

⚠ With the caveat that slate itself states: **a sampled rating is a
RATING, not a weighing** — B4, *a declared standard is never a gauge*,
and a proxy presented as a measurement is worse than no channel. It ships
as a declared-and-checked figure. **Which is what weight is too.**

### ⭐⭐⭐ The asymmetry dissolves into encumbrance

| | whose | remedy |
|---|---|---|
| the thing's **cost rating** | ⭐ the **author's** — a template property, **disclosed before you pick it up** | the author makes it cheaper |
| the holder's **load** | ⭐ the **player's** — they chose to carry forty | **put something down** |

> **`LoadBearing`'s derived burden and the consequence ladder: a thing has
> a weight (the author's), you have a load (yours), the consequence is
> yours and the remedy is to drop it.**
>
> ⭐⭐⭐ **Computational cost is a second kind of weight**, and the
> player's lever is the lever they already have.

So a greedy item is not an unfair charge — it is a **heavy** item,
visible as heavy, and carrying it is informed. ⚠ The author gets the
right pressure with no bill: **an expensive item is one players will not
carry.** The market disciplines the author; the holder feels the weight.

⭐ And per `exertion.md`'s rule — *reach as a body read, never a number* —
**the load is a read in words**, not a figure.

### What this fixes that needed a special case before

⭐⭐ **Derive-on-read amplification needs no rule.** A long event history
is a property of the *object*, so it is the **owner's** cost by
construction — the reader never pays, and the grief vector (author an
expensive object, let the curious pay) does not exist. The checkpointing
incentive survives free: **an object expensive to derive is expensive to
own.**

⭐ **Shared code is still never a principal**, for a better reason than
*it has no appetite*: **an Api is not a thing that exists in a parcel.**
`/platform` holds no inventory.

## 4. What is measured — two instruments, not one

| instrument | cost | for |
|---|---|---|
| **a counter on the proxy** (calls per Stuff) | cheap, continuous | ⭐ a **shape signal** — is this object chatty? |
| **a sampled duration / heap walk**, per **template** | expensive, rare | ⭐ the **rating** |

⚠ Call *counts* are not cost: a call that does nothing and a call that
walks ten thousand rows are both one call. **Counts find anomalies;
samples set prices.**

⭐⭐ **Command controllers resolve cleanly**: a platform controller is
`/platform`'s, has no appetite, runs on another's behalf → **overhead**.
A *domain-local* controller — University Avenue's `blow`/`tally`, Duncan
Hall's `provision` — **is content somebody authored in a parcel.** So **a
controller is rated to the pack that ships it**, and `sourcePack` already
draws that line.

## 5. ⭐⭐⭐ Three charges, not one

> **User: "if you bring a narnia torch into middle earth, narnia still
> eats the cost because they gave you the torch."**

Two candidate answers fail first:

- ⛔ **charge where it sits** (the cave a visitor walks into) — worse than
  unfair, it is **a grief vector**: fill somebody's parcel with expensive
  objects and drain their quota;
- ⛔ **charge the author forever** — ⚠⚠ **the punish-success problem we
  already deleted once** for NPC brains. Write a great torch, a thousand
  people carry it, your parcel goes dark. **Shipping useful shared
  content becomes financially suicidal**, and it is *uncancellable* — the
  author cannot un-give it.

The instinct is right; it lands on the **act of giving**:

| | charged to | when |
|---|---|---|
| **the mint** — creating an instance | ⭐ **whoever caused the creation** | **once** |
| **the load** — holding it | ⭐ **the holder** (encumbrance) | **continuously** |
| **the rating** — how expensive the kind is | ⭐ **the author** — as *reputation and review*, never a bill | derived per template |

So Narnia stamping a thousand torches as gifts **paid a thousand mints.**
A player buying one from a shop — **the shop minted it and the price
covers it.** The cave pays **nothing**.

⭐⭐⭐ **And it prices PROLIFERATION, which is the actual resource
problem.** A million torches is a storage and RAM problem, and what
caused it was a million mints. **Charging the mint charges the cause.**

⭐ The attribution point already exists: the frame-kind vocabulary
includes a *"synthetic frame planted by `StuffApi.create` / `clone`
around hydrate + onCreate."* **The minter is identifiable at exactly that
boundary**, for an unrelated reason.

### Cross-parcel cloning is a settlement, not a privilege violation

> **User: "what if middle earth gave them a narnia torch? should that be
> a privilege violation?"**

Under the mint rule it settles itself with shipped machinery:

- the **mint** was Middle Earth's → their charge;
- the **rating** is Narnia's → their fingerprint and reputation;
- the **load** is the player's;
- ⭐⭐⭐ and `authoring_events` / `CreditRouting` mean **Narnia earns
  producer credit for engagement with their torch.**

> **You pay to make it; they get credit for having designed it.**

⚠ **What genuinely wants governing is authorship, not accounting** — an
author may not want a signature NPC or a plot-critical item cloned at
all. Its homes exist: **publish-state** (unpublished is unclonable),
**`canAtPath`**, and ⭐ `corpo.md`'s **mark substrate** — cloning a
branded good without licence is **counterfeiting**, a *legal* question
inside the game rather than an engine permission.

> ⭐⭐ **The engine permits it; the law may not.** Law as content,
> enforcement declared by the owner, remedy in court rather than in a
> gate.

⭐⭐⭐ **And that fixes the commons' role:** private parcels police their
own templates, but **you cannot police cloning you cannot see.** So the
commons neither permits nor forbids — **it makes the provenance
legible.** `authoring_events` records who authored a path and
`sourcePack` who shipped it; ⭐ what is missing is **the mint ledger** —
*who instantiated whose template, and how many times.* **That one record
serves the mint charge, the counterfeiting claim, and an author's own
curiosity about where their work went, and it is the only new record this
model requires.**

## 6. ⭐⭐⭐ Three declarations, three measurements, three owners

| # | the declaration | measured against | whose problem on mismatch |
|---|---|---|---|
| **D1** | **the template's cost** — *a torch costs about this* | the **sampled rating** | ⭐ the **author's** — a review finding, **not a bill** |
| **D2** | **the parcel's usage** — *this locality runs N of these kinds, this many clocks, this much inference* | the parcel's **actual consumption** | ⭐ the **holder's** — quota, caps, narrowing |
| **D3** | **the appropriation** | aggregate spend | ⭐ the **executive's** |

### The four cases

1. **Narnia makes a slightly expensive torch.** D1 mismatch → Narnia's
   review finding. **No charge** — nobody minted one. ⭐ *The rating is a
   disclosure, not an invoice.*
2. **Middle Earth clones one.** One mint + one load. D2 should have
   declared *we use torches*. Narnia unaffected.
3. **Middle Earth clones a million.** A million mints + a million loads →
   **quota blown, caps hit, narrowing, dormancy** — with a real lever
   (stop minting, destroy some). D2 mismatch is glaring. ⭐ **Narnia's D1
   is unchanged.**
4. ⭐⭐⭐ **Narnia edits the torch into an infinite loop.**

### ⭐⭐⭐ Case 4: bugs are BREAKERS, not budgets

> **An infinite loop is not *expensive*. It is unbounded. You cannot bill
> infinity.**

Ratings, quotas and bills price **bounded** cost. This is what the
circuit breakers are for ([llm-economy § 10](./llm-economy-slate.md)) —
*something is wrong, stop before it gets worse.*

> ⭐⭐⭐ **And because the rating is template-keyed, the breaker is
> template-keyed: one trip quarantines all million clones at once. The
> blast radius of the fix equals the blast radius of the bug.**
>
> That is the strongest argument for the template being the unit.

Accountability follows the trip, not the bill:

- the incident is attributed to **the template** → **Narnia's**, publicly;
- Middle Earth's torches go **inert**, a visible degradation **with a
  named cause** (*your torches are quarantined; the template's author
  broke it*) — the honest-state rule doing real work;
- ⭐⭐ **nobody is billed for Narnia's bug. The cost of a bug is an
  OUTAGE, not an invoice**, attributed to its cause.

⚠ So a per-object breaker trips the **object** inert, **never the parcel
dark.** A parcel going dormant because one item has a bad upstream is the
wrong failure.

### ⚠⚠ And the deeper exposure: the cost basis pins at mint

Strip the bug out and the problem survives — Narnia doubles the torch's
clock rate. `extends:` is *"resolved at read, never flattened"*, so:

> **An upstream author can retroactively change the cost of inventory
> somebody already minted.** A supply-chain exposure accounting alone
> cannot answer.

⭐⭐ **The answer that preserves the doctrine: behaviour resolves at
read; the COST BASIS is pinned at mint.**

- the holder is charged at the rating in effect **when they minted**;
- a re-rate is **an event they must acknowledge** before it applies to
  existing stock;
- **nothing is flattened** — behaviour still resolves through the parent.

> ⭐ Exactly how a utility tariff change works: the supplier may change
> the price, but must notify, and you get to react.

⭐⭐⭐ And it gives the author the right pressure with no penalty:
**raising a shared template's rating is a visible act that generates
downstream notifications.** An author who keeps making public content
more expensive acquires a reputation for it — which a private committee
will weigh before extending from them again.

## 7. ⭐⭐⭐ What a grant actually says — three forms, five lines

> **User: "we named 4 scarcities but we never actually said what a grant
> looks like."**

The form follows the resource's **shape**:

| scarcity | shape | **the grant is** | enforcement |
|---|---|---|---|
| **CPU** | flow, unpriced | ⭐ **a RATE** — a share of a core | refuse / queue at the door |
| **RAM** | stock, occupancy | ⭐ **a CEILING** — resident bytes | evict the cold tail |
| **records** (Mongo) | stock, **ratcheting** | ⭐ **a CEILING** — durable bytes | refuse the write + retention |
| **assets** (object store) | stock, ratcheting | ⭐ **a CEILING** | tier or delete |
| **tokens** | flow, **priced** | ⭐ **a QUOTA** — a count per period, **expires** | narrow |

```
cpu:      0.05 core          (rate,    short-window enforced)
ram:      64 MB resident     (ceiling, eviction-enforced)
records:  50 MB              (ceiling, write-refused; also taxes ram + cpu)
assets:   2 GB               (ceiling; reads cost egress)
tokens:   400K / day         (quota,   expires, narrows)
```

⭐ **One document, five lines, three forms.** The lines are
**non-fungible** (a rule), but granted together, to one holder, in one
act.

### Why CPU is a rate and not a total

> **CPU is a flow: you cannot bank yesterday's idle seconds.** A
> "CPU-seconds per month" grant is wrong *in kind* — it would let a parcel
> idle for twenty-nine days and stall the box on the thirtieth.

⭐ A rate is honest, and it is how cgroups express it (`cpu.max` as
quota-per-period), so there is a real enforcement point. ⚠ **And it wants
two windows:**

| window | purpose |
|---|---|
| **short** (~1s) | the **rate** — what gets refused. Longer, and a parcel stalls the box while staying "within grant" |
| **long** (~1h/day) | the **report** — what gets reviewed. Shorter, and every GC pause reads as a violation |

### ⭐⭐ The share divides three different pools

One entitlement function, `f(standing, demand, activity)`, produces five
numbers in three units against **three different pools**:

| | the pool |
|---|---|
| **tokens** | ⭐ a **dollar appropriation** — why it expires and needs a committee |
| **CPU · RAM** | ⭐ **the box** — fixed until capital buys a bigger one (land-compute Level 0) |
| **records · assets** | a **dollar ratchet** — cheap per unit, permanent; the lever is retention |

⚠ **Only the token line genuinely lapses**, because it is the only one
where unused capacity is lost **money** rather than lost opportunity. An
unspent CPU second did not happen; an unspent token was never bought.

### ⭐⭐ Mongo and object storage are different RESOURCES, not prices

> **Records are WORKING SET** — bytes **and** RAM **and** query CPU, and
> ⚠ **the indexes are a multiple of the raw size.**
> **Assets are ARCHIVE** — bytes, and **reads cost egress.**

⭐⭐ The split is an incentive worth having: **assets are cheap, records
are dear**, which pushes the discipline `media.md` already follows —
*content holds a key, bytes live in the bucket.*

⚠⚠ **And it corrects an earlier claim.** Generated illustrations were
called *"a permanent storage ratchet"*; under this split they are the
**cheap** ratchet.

> ⭐⭐⭐ **The expensive ratchet is the event collections** —
> `authoring_events`, `renown_events`, `participation_events`, the ten
> `*_events` tables. Mongo, indexed, append-only. **The scary ratchet is
> not images, it is the ledgers** — and the ledgers are what
> derive-on-read *requires.*

⭐ Different remedy per line: a Mongo event stream **compacts** (roll old
events into checkpoints — what `soil.md` already does and the automata
digest pyramid does); assets **tier or delete**.

⚠ **One coupling, named:** asset reads generate egress, and egress rides
the metered line. That is **attribution across lines, not fungibility
between them** — the metered line pays the read, the assets line pays the
keeping, and neither is spendable as the other.

## 8. ⭐⭐⭐ A proportion is not an allocation — the capacity READ

> **User: "5% of 5% is meaningless as anything other than a
> proportion."**

Correct, and the reason: **a committee is not allocating machine
capacity — it is allocating permission to run content.** Its decision is
*can this sub-holding do what it wants*, not *what fraction of a core is
this.*

⭐⭐ The template rating works in both directions:

> **charge = rating × count.** **capacity = grant ÷ rating.**
>
> The number that makes a load chargeable makes a grant **legible.**

| presentation | for | example |
|---|---|---|
| **machine units** | the engine's enforcement | `0.0025 core · 4 MB · 400K tok/day` |
| ⭐ **a capacity read, in content units** | **the committee's decision** | *"supports a small tavern: ~40 simulated objects, 2 performed NPCs, no narrator"* |
| ⭐ **a live utilisation read** | the truth | *"your content uses about 60% of this"* |

⭐⭐⭐ **This is the project's own doctrine, not a new idea** —
`exertion.md`'s *reach as a body read, never a number*, every limit soft;
`encumbrance`'s consequence ladder. **A limit is a read, not a figure.**

⚠ The capacity read is a **projection**, and projections lie when the mix
changes — which is why the third row exists. **Project to decide, measure
to know.**

⭐ **And it recurses where the proportion does not:** at every depth it is
still *"this supports a small tavern,"* just a smaller one. The fraction
collapses into noise; the content read does not.

## 9. Governance layering — the seam is TITLE, not the org chart

> **User: "parcels don't have to subdivide with the same lines as
> management does. all the compact cares about is who is at the top."**

| level | enforcer | against | failure mode |
|---|---|---|---|
| **the seam** (commons ↔ top-level grant) | ⭐ the **executive** | quotas the **legislature** allocated | the land-compute ladder: flag → target → grace → dormancy. Visible, procedural, appealable |
| **inside** | ⭐ the holder's own committee(s), at any depth | their own policy, **within the grant** | ⭐⭐ **the holder's problem and the holder's remedy** |

> ⭐⭐⭐ **As many committees as the holder wants, zero of which the
> Compact names.** The grant is to a **path**; accountability is to
> **whoever holds that path.** Management structure is invisible to the
> commons by design.

⭐⭐ **And internal mismanagement is invisible until it breaches the
seam** — correct (autonomy) *and* self-limiting (the aggregate shows at
the boundary, and then it is the executive's). Nobody polices the inside
because the outside eventually catches it.

### State-mandated vs the ordinary author's levers

| **state-mandated** (not yours) | **the author's levers** (inside the grant) |
|---|---|
| the appropriation + its lapse | ⭐ **the declaration** — what you say you need |
| your top-level grant | ⭐⭐ **the mix** — narrator vs NPCs, details vs props, how many clocks tick |
| the enforcement ladder at the seam | **checkpointing** — reconcile vs replay |
| the caps and breakers — unliftable | **what you ship** — a cheaper item is yours to write |
| ⭐ **the floor** — the complete tree, the baseline allowance | **sub-allocation** — your internal structure, committees or not |
| honest-state disclosure — you cannot hide your profile | ⭐ **publish state and deliberate dormancy** |
| ⭐ the rating's **derivation** — no self-reporting your own cost | **the archetype you declare**, which your profile is read against |

> ⭐⭐⭐ **The state sets the ceiling and the floor. The author sets
> everything in between.** And the state **never says what to cut** —
> land-compute verbatim: *"the system sets the budget + the ultimatum;
> the OWNER does the cutting — the editorial choice is never the
> system's."*

⭐ That line does more work here than it was written for: **it is what
makes a derived rating tolerable.** The engine may say *your farm costs
three times what farms cost*; it may never say which NPC to delete.

## 10. ⭐⭐⭐ A usage declaration IS a content declaration

> **User: "farms use more land than an apartment building but have fewer
> occupants. that's a claim about the content in that parcel and it
> should align with the parcels runtime limits."**

That is **a cross-check between two independent declarations**: the
author declares *this is a farm* (land use, occupancy, the sixteen needs,
the zoning type) **and separately** *this needs N inference, M heap, K
bytes.* They should agree, and the disagreement is diagnostic:

| mismatch | likely meaning |
|---|---|
| an apartment block with a farm's compute | ⭐ **overbuilt** — 200 NPCs where 20 would do |
| a farm with an apartment's compute | ⚠ **hollow** — the fields are not actually simulating |
| a locality whose compute is all in one room | ⭐ **that room is the content; the rest is scenery** |

> ⭐⭐⭐ **The resource profile is a FINGERPRINT of the content**, and
> comparing it against the declared archetype is a **content review
> tool**, not merely an accounting check.

⭐⭐ **And there is proof it works, from the census:** **Culhaven is 560
rooms at 8% populated** — the emptiest area in the corpus, in the cabal
with the most elaborate governance paperwork. **A storage-per-room
profile would have flagged it automatically.** Hollow content is the
number-one failure pattern in `eotl-craft.md`, and this is the first
instrument that finds it without reading 560 files.

⚠ **The guard**, because a fingerprint that *judges* is a gauge: **the
declaration is an input to allocation; the profile is a report to the
author and their reviewers.** Declared-vs-actual drives conversation,
never the formula — otherwise *make your profile look like a farm*
becomes the objective.

## 11. ⭐⭐⭐ The feedback join — one key, both numbers

[feedback-slate](./feedback-slate.md) puts ratings on the **template
path** and refuses author-keying. The accounting unit is the **template
path**. So:

> **One key carries what a thing costs and whether anyone wants it** —
> which together answer the only question about any piece of content:
> *is it worth it?* Cost alone is accounting; reception alone is
> applause.

### A quadrant, not a ratio

| | **low cost** | **high cost** |
|---|---|---|
| **high rating** | ⭐ efficient — the craft ideal | ⭐ **earning it** |
| **low rating** | ⚠ **inert — and that is fine.** Scenery; a world needs it | ⛔ **dead weight** |

> ⭐⭐ **Only one corner is a problem. A ratio ranks everything; a
> quadrant flags one corner.** A ratio would condemn scenery — which is
> the single difference between a mirror and a score.

### ⭐⭐ And it fills a hole in `land-compute`

That slate insists *the owner does the cutting.* **With what
information?** It never said.

> **The state says *cut 30%*. The cost-and-reception view says *here is
> what nobody misses*.** ⭐⭐⭐ It answers the question the state is
> **forbidden** to answer.

⭐ It also tightens the anti-gaming argument: performance is now measured
**on the same key as the bet**, so **gaming your ratings buys an
obligation at precisely the grain it will be judged at.**

### ⛔ The second firewall, running the other way

`feedback-slate`: *a rating may never be read with an author as the key.*
Its mirror image:

> ⛔ **Cost must never be visible to raters.** A player who can see *this
> room costs 4× the average* stops answering *do you want more of this* —
> and **expensive content becomes unpopular because it is expensive**,
> inverting the point of funding ambitious work.

⭐⭐ **Two firewalls, one on each side of the same key.** The template path
is the join, legible only to those with a decision to make: **the author,
and their committee.**

⭐ Byproduct: a template's cost-and-reception pair is what a prospective
*consumer* of that template wants — *"well-received and cheap"* is a
pack's selling point. **A review system for content packs, from data
already collected.**

## 12. Shrinking the unattributable pool

> **User: "making sure every bit of content and code has someone
> responsible for it."**

Three mechanisms, in order of how much pool they drain:

### ⭐⭐⭐ (a) Apportion iterating work by what it iterates

| work | iterates | attributable to |
|---|---|---|
| the residency sweep | resident objects | ⭐ their holders |
| the nightly reset | rows by disposition | ⭐ their owners |
| a catalogue warm | rows (175 materials, 32 readings…) | ⭐ **apportioned by whose rows** |
| reconcile-on-read | one object's history | ⭐ its owner |

> **If `MaterialCatalogue` warms 175 rows and 100 are yours, 100/175 of
> that warm is yours.** ⭐⭐⭐ **Almost nothing is truly fixed overhead** —
> most apparent engine cost is work *proportional to somebody's content*,
> and the proportion is the attribution.

### ⭐⭐ (b) The invariant is a LINT

> **"Every template resolves to a parcel" is a gate you can write** — and
> census-then-ratchet applies: count today's orphans, gate that count as
> a ceiling, drive it to zero. **That guarantees the invariant rather
> than hoping the accounting produces it.**

### ⭐ (c) Abstract templates — for INVENTORY, not accounting

> **User: "there's a common torch yes, but every parcel must mint their
> own torch for reasons of accounting."**

The mechanism is coherent — `extends:` ships, and `lint:instanceable`
already enforces *nothing instances `/lib/`*, so **an abstract template
is the row-level analogue of a `lib/` class.**

⚠ **But it does not buy the accounting.** A torch that `extends:` and
changes nothing **has the parent's rating**, and count-attribution was
already free via the identity path. ⭐ And the parent's rating staying
shared is a *feature*: **one fix at the commons beats forty holders
patching their own torch.**

> ⭐⭐ **What it actually buys is better: it forces a declaration at the
> point of use.** A parcel that mints its own torch has declared, in a
> reviewable row in its own namespace, that it uses torches — which makes
> a parcel's content **enumerable from its own namespace**, worth a lot
> for review, for § 10's fingerprint, and for an author simply knowing
> what they have.

⭐⭐⭐ **The test for where to apply it:** *abstract if a parcel would
want to change it; concrete if changing it would be wrong.* A torch's
description is parcel flavour; copper's density is physics — and
materials are a **closed** vocabulary, so those stay shared. Same
altitude rule: invariant · grain · title.

⭐ One relief: `extends:` resolves at read, so a minted torch **inherits
the parent's `illustration` key** — the shared-asset economics survives
and a library stays sublinear in content.

### And the commons is a holder, not a void

`/platform`, `/stuff`, the lounge and Terminus are **parcels like any
other, with shares like any other.** So *"the commons eats it"* names **a
party with title, a committee and a budget** — the `soul` / `/expression`
precedent exactly. ⭐ And for code, **`sourcePack` is a universal
attribution key**: an Api has no appetite, but it has a **shipper**.

⭐⭐ **What is genuinely left:** the driver, the socket layer, the
scheduler itself, Mongo connection pooling. Fixed, small, and **the
operator's** — nobody chose it and no vote changes it. Which means ⭐ **the
overhead fraction the committee watches should be small by construction,
and if it grows, something apportionable stopped being apportioned.**

## 13. Open questions

1. ⭐⭐⭐ **The reference basket for the capacity read** (§ 8). *"Supports
   a small tavern"* requires a published basket of reference content to
   divide by, and **choosing that basket is a content judgment somebody
   has to make and defend.**
2. ⭐ **Is the template rating published?** Disclosed-on-the-object makes
   the holder's load informed and the author's cost a market pressure —
   but a *public per-template cost table* is a leaderboard of expensive
   authors, which is the gauge § 11 guards against. ⚠ Instinct: **visible
   on the object (like weight), aggregated at the parcel (like a bill),
   no cross-author ranking anywhere.** A values call, not a derivation.
3. **Does the quadrant get a threshold?** A line is actionable and
   instantly gamed; a scatter is honest and requires somebody to look.
   ⭐ Instinct: **no threshold at the commons** (the executive sees only
   the parcel aggregate at the seam); **the holder may draw their own
   internally**, because the recursion rule says the commons does not
   reach in.
4. ⚠ **Does RAM move into the accounting system?** § 3 says per-template
   sampling makes it affordable; `scarcity-slate § 4` says it is engine
   physics. **The revision is real and unresolved.**

## Cross-refs

- [scarcity-slate.md](./scarcity-slate.md) — the four channels and their
  institutions; ⚠ **§ 3 and § 7 above revise its § 1 (storage splits in
  two) and § 4 (RAM's measurability).**
- [llm-economy-slate.md](./llm-economy-slate.md) — the token half built
  on this model: the quota, the cap stack, the breakers § 6 reuses.
- [feedback-slate.md](./feedback-slate.md) — the ratings § 11 joins, and
  the firewall its mirror image completes.
- [land-compute-and-license.md](./land-compute-and-license.md) — the
  entitlement function, subsidiarity, the dormancy ladder, and *the owner
  does the cutting*.
- [eotl-census.md](../../eotl-census.md) + [eotl-craft.md](../../eotl-craft.md)
  — Culhaven, and hollow content as the failure § 10's fingerprint
  detects.
- [measurement.md](../../measurement.md) — B4 (a declared standard is
  never a gauge), A3, the mirror-not-a-score discipline.
- [exertion.md](../../subsystems/exertion.md) +
  [encumbrance.md](../../subsystems/encumbrance.md) — *a limit is a read,
  not a figure*; the load/weight split § 3 borrows wholesale.
