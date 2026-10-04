# Attribution slate — existence, not execution; and what a grant actually says

> **Status: UNBUILT, and it is the model the other four scarcity slates
> assumed without stating.**
> ⭐ The goal, in the user's words: ***"making sure every bit of content
> and code has someone responsible for it."***
> **Left:** ⭐ **the observe-only sampler** (§ 4 — the one new
> instrument, and the thing to prototype first) · the **bucketed use
> counter** (§ 4a — the denominator) · the offline RAM rating table
> (§ 4d) · the mint ledger · apportioning iterating work · the
> `every-template-resolves-to-a-parcel` lint · the **six** grant lines
> and their three forms · the **capacity read** and its reference basket
> (⭐ now load-bearing three ways) · the cost-basis pin at mint ·
> per-template breakers · the sandbox diagnostic producer (§ 4e)
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

## 4. ⭐⭐⭐ How CPU is actually measured — sample, don't instrument

> **User: "is it just a timer for how long a method takes to run? are you
> actually checking something more fundamental?"**

### ⛔ Instrumenting every call cannot work

The naive version wraps the proxy's dispatch in `process.cpuUsage()` and
accumulates per template. ⚠ **Cost is proportional to call volume**, and
our volume is *every method on every Stuff* — two `cpuUsage()` reads
around a three-line getter **cost more than the work being measured.**

⭐ That is [scarcity-slate](./scarcity-slate.md)'s *"the meter is made of
the thing it measures"* arriving concretely, and it is **fatal rather
than merely inefficient**, because the overhead lands hardest on exactly
the cheap methods that make up most of the volume.

### ⭐⭐⭐ Sampling is not a compromise — it is the right instrument

> **Sampling's cost is constant** — ~1,000 stack reads per second whether
> the process made a hundred calls or a hundred million.

And § 3 already decided the rating is **per-template and amortised**,
which is a *statistical* quantity. **So sampling is the correct
instrument for the thing we chose to measure**, not a worse version of
measurement.

**The pieces all ship** (`api/execution-context.ts`):

- `CallFrame` carries **`target`** (the receiver), `caller`, `method`,
  `timestamp`;
- the stack lives in **`AsyncLocalStorage<FrameNode>`** (line 161), so it
  propagates across awaits;
- `runRoot` plants a root whose context covers *"its whole async tree."*

```ts
// the sampler — one jittered timer, ~1kHz, reading state that exists
function sample() {
  const stack = ExecutionContextApi.getCallStack();
  const t = attributionTarget(stack);       // the ladder, below
  if (t) histogram[t.getTemplatePath()]++;  // ⚠ template, NEVER identity
}
```

> ⭐ **Per-call cost: zero new work.** The frame already exists and
> already holds the target. The proxy does not time anything — it keeps
> doing what it does.

### ⭐⭐⭐ Which solves async by construction

> **A wall-clock timer charges an awaiting object for the entire wait.**
> Sampling attributes CPU to **whoever is actually on the CPU** — and an
> awaiting frame is not on it.
>
> **The thing that breaks timers is automatically correct under
> sampling.**

⭐⭐ **And scheduled work becomes moot for the same reason.**
`ScheduleApi.recurring`/`schedule` already wrap callbacks in `runRoot`,
so a timer callback has a frame and the sample attributes to whatever
Stuff the callback is operating on. **Sampling never has to answer *who
caused this timer*** — the question § 2 showed has no stable answer. It
does not ask.

### ⭐⭐⭐ The attribution ladder — ordered by WHO HAS A LEVER

> **User: "this sampling algo needs a little more thought or we could get
> some numbers we can't actually easily act on and then whats the
> point."**

That is the design principle: **an attribution is only useful if it
names somebody with a lever.** So the ladder is not arbitrary precedence:

| the number lands on | can they act? |
|---|---|
| a parcel's content | ✅ cut it, cheapen it, checkpoint it |
| a mixin's maintainer | ✅ optimise the mixin |
| a controller's shipping pack | ✅ optimise the controller |
| ⛔ **a player** | ⛔ **only by playing less** |
| "the engine" | ⚠ only if small — if large, *that is the finding* |

Walk the stack **deepest-first** and take the most specific match:

1. a **content Stuff** — `templatePath` resolves into a parcel that is
   not `/platform` → ⭐ **that parcel**
2. a **mixin method on a shared host** (an Avatar, a platform class) →
   ⭐ **the mixin → its shipping pack**
3. a **controller or Api** with no content frame beneath → **the pack
   that ships it**
4. nothing but framework → **overhead**

```ts
// classify by KIND OF OWNER, not by "is it framework"
function attributionTarget(stack: CallStack) { /* rungs 1-4 */ }
```

⚠ **A first sketch classified frames by *"is this a real receiver"* and
skipped only `ApiLogic`** — which lands rung 2 squarely on the player's
Avatar. The predicate has to be **owner-kind**, not framework-ness.

### ⛔ Never the player — two independent reasons

1. ⭐⭐⭐ **Charging a player for playing is a tax on the activity the
   game exists to provide.** It makes the quiet player the cheap one —
   the most perverse incentive available here.
2. It fails the lever test: the player's only response is *do less*.

⭐⭐ **And the Avatar's cost distributes across its composed mixins.** An
Avatar is not one thing with one owner; a sample inside
`VitalsMixin.reconcile` attributes to **`VitalsMixin` → whoever ships
it**, and `_mixinName` + `sourcePack` already name that party.

> **The cost of simulating a body belongs to whoever wrote the body
> simulation.** Which answers *"the avatar committee — or one of
> several?"*: **as many as there are mixins, and the attribution tells
> you which ones matter.**

⭐ The **three player-side bodies** (the Avatar, the shade, the sandbox
wire-body) are distinct templates, so the histogram separates them for
free — *what do shades cost, what does playtesting cost* become readable
with no new instrumentation.

### Verbs stay shared — and the stack carries what you need

⭐ We cannot mint per-parcel verbs; a common interface is the whole point
against EotL's **4,472** bespoke-verb files. And most of a `look`'s cost
is not in the controller — the downstream frames **already name the
content**:

```
LookController.lookAtLocation      ← framework, thin
  crossing (/world/terminus/…)     ← ⭐ content, owned
    DetailedMixin.getDetail        ← the 7 details
```

⚠ Samples landing in the controller's *own* code go to **the pack that
ships it** — platform for `look`, University Avenue for `tally`.
Actionable by a real maintainer either way.

### ⭐⭐ Exclusive vs inclusive — the bill vs the INTEREST LIST

> **User: "there's possibly more than one interested party in a thing. if
> a mixin is expensive then the mixin owner will care. but so should the
> person owning the content that depended on the mixin."**

| | who gets the sample | what it is |
|---|---|---|
| **exclusive** | the **deepest** attributable frame | ⭐ **the bill** — one winner, nothing double-charged |
| ⭐⭐ **inclusive** | **every** attributable frame on the stack | **the interest list** |

And the reason the interest list matters is that **both parties have
levers, but different ones:**

| party | lever |
|---|---|
| the mixin's maintainer | optimise it |
| ⭐ the content owner who composed it | **stop using it**, hit it less often, or wait for the fix |

> ⭐⭐⭐ **So inclusive attribution is how everyone with a lever learns
> they have one.**

⭐⭐ With a consequence worth having: **an expensive mixin is reported to
every parcel that composes it**, so pressure on its maintainer is
**distributed and visible** rather than depending on one person noticing.
Same market shape one layer up: *an expensive item is one players will
not carry* → **an expensive mixin is one authors will not compose.**

⚠ **Presentation rule, because it is the classic profiler misreading:
inclusive counts over-count by design and do not sum to 100%.** They are
a co-occurrence measure, and presenting one as a bill would discredit the
instrument.

⭐ Note the interest list lands on exactly § 5's three parties — **the
template's author (rating), the minter (mint), the holder (load)** — now
with one sampler feeding all three views.

## 4a. ⭐⭐⭐ Expensive vs popular — the denominator problem

> **User: "how do you separate expensive from popular from just sampling
> cpu? this feels like it makes the popularity feedback system actually
> load bearing."**

The identity is **`total CPU = rating × uses`**, and sampling gives only
**total.** So an expensive thing used once and a cheap thing used a
million times produce **identical sample counts** — with opposite
remedies:

| | remedy |
|---|---|
| expensive and rare | ⭐ optimise it — the author's lever |
| cheap and popular | ⭐⭐ **nothing is wrong. That is success.** The remedy is *more allocation* |

> ⚠⚠ **An undifferentiated total would systematically PUNISH POPULARITY**
> — the failure already deleted twice (owner-pays for brains,
> author-pays-forever for torches). **This would be the third time.**

### ⭐⭐⭐ The use COUNTER is the denominator

```
rating = samples_attributed / uses_counted
```

Worked: `look crossing` runs **10,000** times for **72,000** samples →
**7.2/use.** Another room reaching the same total in **10** uses →
**7,200/use**, a thousandfold more expensive. **Identical totals,
radically different ratings.**

> ⭐⭐⭐ **The sample is the numerator; the counter is the denominator.
> Neither alone is a rating.** The counter is not a diagnostic
> nice-to-have — it is half the measurement, and it is one increment on a
> dispatch that already pushes a frame.

### ⛔ And ratings must NOT be the denominator

If player ratings supplied the divisor: **game your ratings → your
measured per-use cost falls → you look efficient.** That breaks the
property ratings are safe *because* of — being upstream of a bet rather
than an input to a measurement — and half-breaches
[feedback-slate](./feedback-slate.md)'s firewall, since raters would move
cost without being able to see it.

> ⭐⭐⭐ **A use counter is an ENGINE FACT** — unforgeable, free, nobody's
> judgment. **A rating is a PLAYER JUDGMENT** — gameable by design.
> **They must never be the same number.**
>
> So the counter is what **keeps** the feedback system from becoming
> load-bearing.

### ⭐⭐ Revealed vs expressed — which revises `feedback-slate`

| | |
|---|---|
| the **counter** | ⭐ **revealed** demand — people came |
| the **rating** | **expressed** demand — people want more |

And the standing rule is *reputation **revealed** beats **expressed***:

> ⭐⭐⭐ **Revealed demand (the counter) is the denominator, and the
> honest `demand` term in `f(standing, demand, activity)`. Expressed
> demand (the rating) is the allocation APPLICATION** — what a committee
> reads.

⚠ `feedback-slate` has ratings feeding the entitlement function
directly; this moves them one step out, to the thing a human weighs
rather than the thing a formula multiplies. **Ratings stay consequential
without becoming a measurement input.**

### ⭐⭐ And bucket the counter, because a mean hides the scaling

Even with the counter, a mean conceals whether a cost **scales** — and
the scaling factor is the thing an author can actually fix.

| occupancy | samples/use |
|---|---|
| 1–5 | 7 |
| 6–20 | 31 |
| ⚠ 21+ | **410** |

> **That table names the bug.** The mean (≈24) names nothing, and reads
> as *slightly expensive room* rather than *something here is O(n²) in
> occupants.*

⭐ Bucket a room by occupancy, a derive by event-count decade, a
container by contents — one increment into a bucketed counter instead of
a flat one.

⚠ **And this wants playing with.** Three cheap levers (samples, bucketed
counts, the ladder) interact, and the right combination is an empirical
question, not a derivation. ⭐ **The observe-only prototype is how it gets
answered**, not more design.

## 4b. ⭐⭐⭐ Why sampling is trustworthy — and where it is not

> **User: "I don't claim to totally understand why its so trustworthy. a
> lot is riding on people trusting these methods."**

Standard error is `√(p(1−p)/N)`. At 1 kHz over an hour — **3.6M
samples**:

| true share | measured as (95% CI) |
|---|---|
| 10% | 10% ± 0.03% |
| 1% | 1% ± 0.01% |
| ⚠ 0.001% | **± 17% of itself** (~36 samples) |

> ⭐⭐⭐ **Precision is proportional to the stakes** — three digits on the
> big consumers, nothing on the negligible ones. **Which is right: a
> template using 0.001% does not need an accurate rating, it needs to be
> known as negligible.**

⭐ That is the property a per-call timer lacks: uniformly precise and
uniformly expensive, paying full price for accuracy nobody needs.

**What sampling can be genuinely wrong about:**

- ⚠⚠ **Correlated sampling** — a sampler whose interval phase-locks with
  a periodic workload (a 1 Hz tick, a sweep cadence) systematically
  over- or under-counts it. ⭐ **Fix: jitter the interval.** The one real
  statistical trap here.
- **Short windows are noise** — so ratings are long-window and
  slow-moving, which also makes them **stable**, which is what a price
  needs.
- The sampler appears in no sample (it is not Stuff), so it lands in
  overhead. Honest.

### ⭐⭐⭐ And the trust argument that matters is constitutional

**Verify-don't-trust**, with Art. VII §2 requiring integrity outputs be
**independently re-derivable by any member.**

> ⭐⭐⭐ **The sample stream must be publishable, not just the
> conclusion.** If the histogram is the only artefact, you must trust us.
> If the raw counts (or a signed digest) are published, **anybody can
> recompute a rating and check our arithmetic.**

⭐⭐ And the cheap companion: **publish the error bars.** `0.8% ± 0.4%`
is self-evidently a rating; `0.8%` invites a precision it does not have.
B4 again — *a declared standard is never a gauge* — same countermeasure.

**Publish the samples, publish the error bars.** Together they convert
*trust our sampler* into **check our sampler.**

## 4c. ⚠⚠ The firewall between resource accounting and STANDING

> **User: "this instrumentation intersects with labor and consumer
> standing in possibly fraught ways."**

Three hazards, and the third needs a rule stated before anything ships.

⭐⭐⭐ **(a) Efficiency must never be a political qualification.**
**Resource consumption may never mint or reduce standing in any
chamber.** Efficiency is a *craft* property; standing measures
*contribution*. Conflate them and the cheapest content becomes the most
politically powerful — the producer chamber becomes a chamber of thrifty
engineers rather than of makers.

⭐ **(b) But scarcity constraining production is fine, and the line is
sharp.** If resource pressure makes me cut content, my engagement falls,
so my standing falls — that is an economy, the same as not affording the
land. What is unacceptable is the engine **docking standing for being
expensive.**

> **Scarcity may constrain what you produce. It may never score what you
> produced.**

⚠⚠ **(c) The consumer-chamber hazard.** The automata allowance derives
from **participation**, which is measured engagement. So **hours played
buy agent capability** — and for a chamber founded on *one verified
human = one seat*, a capability ladder keyed to activity is a soft
reintroduction of weighting.

> ⭐⭐⭐ **Fix: the allowance needs a floor that is NOT
> participation-derived.** Every citizen gets a baseline automata
> capability *as a citizen*; participation affects only the headroom
> above it — land-compute's floor pattern (*"a baseline it is never
> squeezed below"*) applied to a person.

⚠ **(d) And the nearly-invisible one.** A sampler recording which
template is executing a thousand times a second, with player Avatars as
targets, is **a behavioural trace at far higher resolution than the frame
store** — the dossier A3 forbids.

> ⭐⭐⭐ The fix falls out of the design: **the histogram is keyed on
> `templatePath`, and every player Avatar shares one `templatePath`** —
> so player activity aggregates into a single bucket and is
> **structurally un-individuated.** ⚠ The sampler must **never** key on
> identity path.
>
> ⭐⭐ A nice inversion: the shared-`templatePath` property that once cost
> a shared bank account is what makes CPU sampling privacy-safe.

## 4d. RAM — rate it OFFLINE, and a catalogue is `fixed + n × per_entry`

`v8.getHeapSnapshot()` is stop-the-world and enormous. **Never in
production.**

> ⭐⭐⭐ **Compute the RAM rating offline**: a staging box, a
> representative world, one snapshot, attribute retained size by
> constructor → template, **ship the table as data.**

⭐ Which resolves the contradiction with
[scarcity-slate § 4](./scarcity-slate.md) cleanly: **RAM is *rateable*
offline, not *measurable* online.** No production heap walk, ever — and
the rating is honest because it *is* a rating, same as weight.

### ⭐⭐ The Api layer's RAM — and you can have it both ways

> **User: "the api logic singletons may consume a lot of RAM, or the
> registry/catalogue singletons they reference… we may want to attribute
> some slice in the Api layer to a specific template or parcel instead of
> / in addition to the Api itself."**

Look at *what* they hold: `MaterialCatalogue` → 175 material rows ·
`ReadingCatalogue` → 32 readings · `SubjectCatalogue` → `byId`/`byTitle`
over every Subject · `HelpCatalogue` → the harvested index ·
`BiomeCatalogue`, `LaneCatalogue`, `ParcelRegistry`…

> ⭐⭐⭐ **A catalogue's retained size is almost entirely the rows it
> holds, and rows belong to parcels.** The catalogue is a **container**;
> its contents are attributable. **This is § 12's apportionment rule,
> applied to RAM.**

So the rating is two terms, which is the *"instead of / in addition to"*
answered as **both**:

> **`fixed + (n × per_entry)`**
>
> - the **fixed** part (the Maps, the singleton's own fields, the code) →
>   ⭐ **the Api's**, monitored as one body, `/platform`'s;
> - the **proportional** part → ⭐ **apportioned to whoever owns the
>   rows.**

⭐ A parcel adding 100 material rows sees its RAM line move by
`100 × per_entry`, attributed correctly, **with no production measurement
at all.** And an offline snapshot reads both terms directly — a
catalogue's entries *are* distinct objects with distinct constructors.

⚠ **One honest caveat: shared structure.** When two parcels' rows both
reference one interned string or one shared prototype, retained-size
attribution either double-counts or assigns arbitrarily. ⭐ **Report the
ambiguity rather than resolve it** — the genuinely shared part goes to
the fixed bucket, which is the overhead figure the committee already
watches.

## 4e. ⭐⭐⭐ The sandbox is where limits matter MOST

> **User: "your sandbox only has actual limits on the real scarcities…
> so the sandbox is actually where it's most important to enforce limits
> because its where unpublished code runs."**

⚠⚠ **A correction:** `sandbox.md`'s *"powerless by design"* was read as
covering resources. It does not.

> ⭐⭐⭐ **The sandbox's powerlessness is about STATE, not RESOURCES.** It
> cannot touch shared state — and it can absolutely burn the box, because
> CPU, RAM, storage and tokens are machine-level, not state-level.

| | production | sandbox |
|---|---|---|
| in-game scarcities (land, occupancy, the sixteen needs) | ⭐ bind | ⛔ **free — that is the point** |
| code review | published, reviewed | ⛔ **unreviewed by definition** |
| ⭐⭐⭐ **what brakes it** | the in-game economy **and** the real scarcities | **the real scarcities, alone** |

**So the sandbox needs TIGHTER limits than production**, not looser.

### ⭐⭐ A breaker trip there is a TEST RESULT, not an incident

An author iterating writes infinite loops **routinely** — that is what
development is.

| | a trip is |
|---|---|
| production | ⭐ **an incident** — public, attributed to a template, escalated |
| sandbox | ⭐⭐ **a test result** — fast, local, cheap, reported to you |

⭐⭐⭐ And the home exists: [diagnostics.md](../../subsystems/diagnostics.md)
— *three producers, the DiagnosticApi store, the `errors` verb + CMS
pane.* **A sandbox breaker trip is a diagnostic**, landing in `errors`
beside your type errors, because it **is** an authoring error. Nothing
new but a producer.

### ⭐⭐⭐ And the sandbox profile IS the publishing application

> **User: "it's also where the author is most going to want to know their
> usage because that's all going to come up when they request publishing
> through the state."**

> **Measuring it is not a cost imposed on testing — it is producing the
> evidence the author needs.** ⭐ An author *wants* their sandbox
> metered; an unmetered sandbox means arriving at the publish gate with
> nothing to show.

⭐⭐⭐ **And it supplies the enforcement step the content-declaration
doctrine was missing.** That doctrine says the produced output is
measured against the declarations, but never said *where* — before it
costs anybody.

> **The sandbox is the measurement chamber. Publishing is the review of
> the measurement.**

A publish request therefore carries three things:

1. the **declaration** — *this is a farm; it needs N inference, M heap*;
2. the **measured sandbox profile**;
3. ⭐⭐ **the comparison** — *you declared X, your sandbox measured Y* —
   which peers adjudicate, exactly *"peers review whether the
   declarations fit the form."*

### ⚠ Two caveats, and the first upgrades an open question

⚠⚠ **A sandbox profile is not a production profile.** Your sandbox has
one occupant; the published room has forty. So the useful figure is
**per-unit**, not total.

> ⭐⭐⭐ Which means it needs **the same normaliser the capacity read
> needs. The reference basket now serves THREE jobs**: the capacity read,
> the fingerprint comparison, and **sandbox→production extrapolation** —
> raising it from *a thing somebody must choose* to **the load-bearing
> shared denominator.**

⚠ **Second: a sandbox profile is gameable by testing gently.** Test with
one NPC, publish with twenty. ⭐ So the declaration still binds and **the
production profile is checked against the sandbox claim after go-live** —
the land-compute ladder doing its actual job.

**The full loop: declare → test → measure → apply → publish →
re-measure → flag on divergence.**

### The grant gets a sixth line, and it is the tighter one

```
cpu:         0.05 core      (live — reviewed code, in-game brakes too)
cpu-sandbox: 0.01 core      (⭐ TIGHTER — unreviewed, no other brake)
```

⭐ Non-fungible, so testing cannot starve your world and your world
cannot starve your testing. ⭐⭐ And it keeps `land-compute`'s rule
intact — *the publish gate is the security boundary, not the compute
boundary*: **compute still rides the parcel; the sandbox just gets its
own line on the same grant**, because the risk profile differs, not the
ownership.

⭐ `getCircleScope()` is the partition handle: a root planted with
`circleScope` *"runs its whole async tree as circle-context work"*, so
**one read per sample partitions ALL sandbox work** — not merely the
samples that land on a sandbox body.


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

## 7. ⭐⭐⭐ What a grant actually says — three forms, six lines

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
cpu:         0.05 core       (rate,    short-window enforced)
cpu-sandbox: 0.01 core       (rate,    ⭐ TIGHTER — see § 4e)
ram:         64 MB resident  (ceiling, eviction-enforced)
records:     50 MB           (ceiling, write-refused; also taxes ram + cpu)
assets:      2 GB            (ceiling; reads cost egress)
tokens:      400K / day      (quota,   expires, narrows)
```

⭐ **One document, six lines, three forms.** The lines are
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

> ⭐⭐ **Generalised 2026-10-04 into
> [committee-slate](./committee-slate.md)**, which defines what a
> committee must expose (**three questions**, not four — *given a path
> who is answerable* turned out never to be the commons' question), the
> menu of structures, and why `subdivide` beats a responsibility map
> wherever the division is territorial. ⚠ It also corrects a claim made
> below and elsewhere in this slate: **`ParcelApi.ownerOf` resolves
> TITLE** — who may write here — **and says nothing about who inside a
> committee answers for a given file.**

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

1. ⭐⭐⭐ **The reference basket** — now load-bearing **three** ways: the
   capacity read (*"supports a small tavern"*), the fingerprint
   comparison (*"farms cost about this"*), and **sandbox→production
   extrapolation** (§ 4e). **Choosing and publishing it is a content
   judgment somebody has to defend**, and three mechanisms break without
   it.
2. ⭐⭐ **How the three levers combine.** Samples, bucketed counts and the
   ladder interact, and the weighting is **empirical, not derivable** —
   *"something we'll have to play with, maybe multiple levers."* ⭐ The
   observe-only prototype answers it; more design does not.
3. ⭐ **Is the template rating published?** Disclosed-on-the-object makes
   the holder's load informed and the author's cost a market pressure —
   but a *public per-template cost table* is a leaderboard of expensive
   authors, the gauge § 11 guards against. ⚠ Instinct: **visible on the
   object (like weight), aggregated at the parcel (like a bill), no
   cross-author ranking anywhere.**
4. **Does the quadrant get a threshold?** A line is actionable and
   instantly gamed; a scatter is honest and requires somebody to look.
   ⭐ Instinct: **no threshold at the commons** (the executive sees only
   the parcel aggregate at the seam); the holder may draw their own
   internally, per the recursion rule.
5. ⚠⚠ **The `demand` revision needs ratifying.** § 4a moves player
   ratings **out** of `f(standing, demand, activity)` and puts the
   engine's **use counter** there instead, on the
   *revealed-beats-expressed* rule — ratings becoming the allocation
   **application** a committee reads. That contradicts
   [feedback-slate](./feedback-slate.md) as written and should be decided
   rather than left as two slates disagreeing.
6. **How much tighter is the sandbox line?** § 4e argues tighter on
   principle; the ratio is a guess until the sampler reports what
   authoring actually costs.

⭐ **Resolved by this pass:** *does RAM move into the accounting system?*
— **yes, as an offline rating** (§ 4d). The scarcity-slate contradiction
closes: **RAM is rateable offline, not measurable online** — no
production heap walk, no per-object measurement.

## Cross-refs

- [scarcity-slate.md](./scarcity-slate.md) — the four channels and their
  institutions; ⚠ **§ 3 and § 7 above revise its § 1 (storage splits in
  two) and § 4 (RAM's measurability).**
- [llm-economy-slate.md](./llm-economy-slate.md) — the token half built
  on this model: the quota, the cap stack, the breakers § 6 reuses.
- [feedback-slate.md](./feedback-slate.md) — the ratings § 11 joins, and
  the firewall its mirror image completes.
- ⭐⭐ [committee-slate.md](./committee-slate.md) — who the holder in § 9
  actually **is**: the three-question facade, per-committee seats, the
  model menu, and the `ownerOf` correction.
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
