# Feedback slate — votes allocate, measurements mint

> **Status: UNBUILT, and it is a LOOP, not a feature.** One arm already
> ships: `CreditRouting` routes attributed engagement at a location to
> that content's author and into the producer influence stock
> ([provenance.md](../../subsystems/provenance.md)).
> **Left:** the one fixed axis (template + engagement) · the solicited
> experience prompt at engagement termination · a template as a
> **Subject** (the forum layer's third `grain`) · the parcel's feedback
> menu above the commons seam · the A15 firewall (no author-keyed read) ·
> narrowing `CreditRouting` from the zone to the path · the
> contributor-set weight vector · the committee's composition, cadence
> and decay (all values questions, § 10)
> **Size:** **two builds.** The fixed axis + the Subject promotion is
> one; the committee/allocation half is the other and belongs with
> [scarcity-slate](./scarcity-slate.md)'s meter.

**Captured 2026-10-01**, immediately after
[scarcity-slate](./scarcity-slate.md) named the four channels. This slate
is **what drives the allocation** that slate's institutions perform.

> **User: "we need a very simple very broadly applied feedback mechanism
> where you can basically rate every object in the game… the thing is we
> dont use it for standing. rather parcel committees use it as a way to
> allocate resources… then based on those allocations the content
> performs how it will perform, and standing is earned… this isn't about
> a like button, it's about powering that loop."**

---

## 1. ⭐⭐⭐ The loop, and the one move that makes it safe

```
ratings ──▶ allocation ──▶ the content performs ──▶ standing earned
   ▲                                                      │
   └──────────── reallocation ◀───────────────────────────┘
```

A universal like button was previously dismissed as gameable: a vote that
mints standing **is** currency, so a vote ring is counterfeiting. The loop
breaks that, and the reason is sharper than *"we don't use it for
standing"*:

> ⭐⭐⭐ **Votes allocate. Measurements mint.**
>
> Ratings are **upstream of a bet**, not downstream of a judgment. Gaming
> the ratings gets a parcel funded; funded content must then perform under
> measurement, and the standing comes from the performance. **A vote ring
> buys an obligation, not a reward.**

**The gameable channel is wired to the thing that has a clawback; the
standing channel is wired to the thing nobody can fake — people showing
up.**

⚠⚠ **The load-bearing condition.** The defence holds *only* while
reallocation genuinely bites. A committee that can fund and never defund
makes the obligation free, and the loop degenerates into a like button
with extra steps. **Reallocation rides the existing dormancy ladder** —
flag + target + deadline → grace → dormancy, land kept, revivable
([land-compute](./land-compute-and-license.md) Movement 2) — rather than
inventing a punishment.

⭐⭐ **And the firewall of § 7 is affordable only because of this
split.** If votes minted standing, the rating→author join would be
*necessary*. Because measurements mint, the join is unnecessary — so it
can be forbidden outright.

## 2. What already ships (checked, not assumed)

| | state |
|---|---|
| **`AuthoringEvent`** / `authoring_events` — one append-only row per authoring act, `path` = the **authored template path**, *indexed on `path`* | ✅ ships, and is **path-grained** |
| **`ProvenanceApi.authorOf(path)`** — the earliest row's author; a later save never changes it | ✅ ships |
| **`CreditRouting.resolve(locationTemplatePath): CreditShare[]`** — the producer faucet's routing input | ✅ ships, ⚠ **zone-grained** |
| **`CreditRouting.isReleased`** — only `/home/…` is unreleased; `/platform/… + /stuff/…` and `/world/…` **earn** | ✅ ships |
| **`CreditShare.weight`** — the fraction; **v1 always `1`**, the team-split seam | ⚠ seam only |
| `participation_events`, real-time decay, the engagement×renown projection | ✅ ships |
| `renown_events` — **reaction** (active, signed) + **reception** (passive being-heard), log-saturated, per-scope derive | ✅ ships |
| the rating signal itself; any committee; any allocation | ⛔ nothing |

> ⭐⭐ **"The bigger the job, the more standing" is `CreditShare.weight`,**
> which exists as a seam hardcoded to `1`, with the contributor-set /
> co-authorship model and the dependency-DAG credit graph named in
> `provenance.md § Deferred`. The theory is not a new design — **it is the
> named deferral**, and that is the cheapest path to the half that matters
> most.

⚠ `CreditRouting` routes to the author of the **covering zone**.
*"Labourers who worked on it"* is a wider set than `authorOf`, and
widening it is exactly that deferred contributor-set.

## 3. ⭐⭐ It is participatory budgeting, not Reddit

Getting the reference right changes which failure modes are inherited.

**Reddit's upvote does one job: rank a feed under attention scarcity.** We
have no feed — we have a *world*, and the world's geography already
decides what gets seen. So the job Reddit's votes do is done by our map,
and the job these votes do — deciding what gets **resourced** — Reddit's
votes do not do at all.

The real institution is **participatory budgeting** (Porto Alegre, and
forty years of study since): citizens vote on how capital is allocated
among neighbourhood projects, projects are delivered or not, and the
delivery record feeds the next cycle. That is this loop, in a real polity,
with a real literature — and it is the right register for
[compact-political-science.md](../../compact-political-science.md), which
already teaches sortition through Ostbelgien rather than through theory.

> ⛔⛔ **And it hands us the empirically-confirmed failure mode:
> participatory budgeting is reliably captured by organised neighbourhoods
> and reliably ignored by unmobilised ones. Turnout concentrates where
> turnout already was.**

In our terms: **an unsolicited rating system measures exposure; exposure
is traffic; and traffic is the thing the allocation is supposed to be
deciding.** The brilliant-unvisited parcel does not get *low* ratings — it
gets **zero**. A loop whose input is its own output is an oscillator, and
it amplifies incumbency hard. §§ 4–5 are the mitigations; § 9's committee
is the backstop.

## 4. ⭐⭐⭐ One axis, because one axis is a REFUSAL

> **User: "I wasn't sure if we wanted more than a single signal
> like/dislike. because there are legitimately different facets an author
> wants feedback on. but you could also argue it all reduces to 'do you
> want to see more of this'."**

**Decided: one axis — `more / less`.** And the argument for it is not UX,
it is [measurement.md](../../measurement.md)'s **B4 — a declared standard
is never a gauge**:

> **Every facet is a gauge you have declared.** A *"writing quality"* axis
> tells every author in the game that writing quality is what gets
> measured. `more / less` says **nothing about what good is** — it is
> demand, not judgment — so the engine never opens its mouth about taste.
>
> ⭐⭐ **One axis is not a simplification. It is a refusal to adjudicate
> aesthetics**, which is the only position consistent with lens 2.

⭐ And the phrasing matters more than the mechanism. Of the candidates —
*did you like this* (a taste poll, and it invites *"I rated it 1 because
of the colour"*), *was this worth your time* (an opportunity-cost read),
*did this work* (a defect report — that is
[diagnostics.md](../../subsystems/diagnostics.md), a different
institution) — the one to ship is:

> ⭐⭐⭐ **"Should this have more?"** — the only phrasing where **the
> rating is literally what it is used for.** It retires the whole class of
> complaint about misread intent, and it recasts the player from *critic*
> to **constituent**: lens 3b, where the click is an actual lever on the
> world and the polity can fund something we did not want.

**So: the reducer is the signal, the facets are the comment** (§ 6). One
number cannot be both an allocation input and craft feedback; a five-axis
form is how you get a form nobody fills in.

⚠ **The honest cost:** an author with forty `less` clicks and no comments
learns nothing. The thing to design for is therefore the **comment
rate**, not the axis count — which lands on the menu (§ 8).

## 4a. ⭐⭐⭐ The Reddit model breaks on a PERSISTENT world — and conviction is the fix

**Added 2026-10-04.**

> **User: "the reddit model breaks down for us because reddit constantly
> gets new content. but our content just sits there serving itself to new
> and repeat players. so a simple thumbs up probably wont work."**

A Reddit vote does three things and **all three need flow**: it **ranks a
feed** of competing *new* submissions, it **time-decays** (hot/top/new
exist because recency is the axis), and it is a **one-shot verdict** cast
on first encounter before the thing expires.

Ours is **persistent and non-competing** — the crossing will be there in
five years, competes with no other crossing for a slot, and may be
visited two hundred times by one player. So:

> ⭐⭐⭐ **A lifetime thumbs-up on a permanent object is a cumulative count
> of visitors who liked it — an ATTENDANCE measure. And we already have
> attendance, measured better and for free, by the use counter**
> ([attribution-slate § 4a](./attribution-slate.md)).
>
> **The explicit signal would be measuring the same thing as revealed
> demand, worse.**

Two further breakages: it **cannot express change** (a room improved in
2027 carries 2026's votes — Reddit never hits this, because posts are
immutable), and it **cannot express the repeat relationship**, which is
the thing you most want to know about a *place*.

### ⭐⭐⭐ So the division of labour

> **Revealed demand measures ATTENDANCE. The explicit signal measures
> ENDORSEMENT** — *a trace you left by behaving* versus **a claim you are
> willing to make.**

And an endorsement has one property attendance never can: ⭐⭐ **it can be
made scarce.**

### ⭐⭐⭐ Scarce, reallocatable, decaying — which is CONVICTION, and it ships

> **User: "can they use it more than once? does it last forever?"**

| option | what you get |
|---|---|
| unlimited + permanent (Reddit) | ⛔ a cumulative attendance proxy |
| once per player, permanent | ⚠ **monotonic** — a room that got worse keeps its score; **old content always wins** |
| once per player, revocable | ⚠ monotonic in practice; nobody goes back to revoke |
| ⭐⭐⭐ **scarce + reallocatable + decaying** | **a CURRENT census of who endorses it** |

[influence.md](../../subsystems/influence.md) already has *conviction
hold/flip/tally*, and `compact-political-science.md`: *"Conviction
weighting means you feel the build and the decay; **moving an allocation
costs you something legible.**"*

> **You hold N endorsements at a time and move them.** Spending one on the
> crossing means taking it off something else.

- **once per thing** — one per player per template. ⚠ Unbounded intensity
  is noise (Medium's fifty claps proved it);
- ⭐⭐⭐ **it lasts only while allocated** — so a room that got worse
  **loses endorsement passively**, with nobody going back to revoke, and
  **old content must keep earning it**;
- ⭐⭐ **and a finite pool makes the signal a ranking without asking anyone
  to rank.** Reddit ranks because of the feed; we rank because the pool is
  scarce. **Same outcome, no feed.**

⚠ **A SEPARATE pool.** *I like this room* must not spend the same
currency as *I support this bill*, or the chambers are conflated after
§ 1 spent its case refusing exactly that.

### Systems that rose and fell — as lessons

| system | what it teaches |
|---|---|
| ⭐⭐ **Slashdot** (1997) — mod points **scarce and expiring**, moderators **drawn by lottery**, **metamoderation** rating the moderators | the conviction shape *and* sortition — which the Compact already uses for juries. Weirdly aligned with us |
| **Digg** (→2010) — unweighted upvote | ⭐ **an unweighted vote concentrates in whoever votes most.** The power-user cartel is the predictable end state |
| **StackOverflow** | ⭐⭐ keeps the **asker's "accepted"** separate from the crowd's votes — *two channels*. ⚠ But reputation-gated privileges bred a credentialist hierarchy: **never let a content signal become a people hierarchy** (§ 7) |
| **eBay feedback** | ⭐⭐⭐ **the right to rate is earned by an act.** ⚠ And it collapsed to 99.9% positive through retaliation — beware reciprocity |
| **Netflix 5-star → thumbs** (2017) | ⭐⭐ granularity invited *aspiration* — five stars for documentaries nobody watched. **Coarse is more honest**, which is § 4's case from a second direction |
| **YouTube dislikes removed** (2021) | ⚠ a negative on an **identified author's** work is a harassment vector — § 7's firewall, confirmed by somebody else's incident |
| ⭐ **Steam reviews** | gated on **ownership + playtime**, and **discloses playtime at review** |
| ⭐⭐⭐ **LittleBigPlanet · Mario Maker · Dreams** | **the closest analogue — player-made persistent levels served indefinitely.** Their failures are ours: incumbent accumulation; and Mario Maker's answers — **you must clear a level before rating it**, and **deleting unplayed levels**, a brutal but honest long-tail policy |
| **Metacritic review-bombing** | ⚠ a flood in a short window is a campaign, not an opinion. **Time-clustering is the tell** — and a conviction pool rate-limits it for free |

**Three rules taken from the survey:**

⭐⭐ **(a) The counter gates the ballot.** eBay, Steam and Mario Maker all
converge on *earn the right to rate with an act* — and for us the act is
**having been there**, which the use counter already knows. So **you
cannot endorse what you have not visited**, and the two signals couple in
the right direction.

⭐⭐⭐ **(b) Disclose the rater's EXPOSURE, never their identity.** Steam's
best move, and it is A15-safe:

> *"Endorsed by 40 people, median 12 visits"* is vastly more informative
> than *"40"* — it says whether this is loved by **regulars or by
> passers-by**, naming nobody.

⭐ **(c) Keep a designated channel separate from the popular one**
(StackOverflow's accepted answer) — a holder's or committee's pick, which
is the one thing a crowd signal cannot supply: *somebody who knows the
domain says this is the good one.*

### ⭐⭐⭐ Where the allocation is EARNED — and the odometer conflict

> **User: "I'd want to award more engaged players more endorsements… if we
> ever built that odometer, endorsements might be the one thing I'd earn
> with it."**

⚠⚠ **That violates the odometer's own standing rule.**
[odometer-slate](./odometer-slate.md), the **load-inert rule**: *"no
system's felt-progression story may DEPEND on the odometer… if removing
it would break a system's progression feel, that system is underbaked.
**This is a standing review question for every build.**"*

⭐⭐⭐ **The fix is in that slate's own description:** the odometer holds
**no counter store** — it *derives over kept ledgers*. So:

> **Award endorsements from the LEDGER the odometer derives over, not from
> the odometer.** The odometer then becomes **the place you see why you
> have fourteen endorsements** — legible without being load-bearing, and
> the rule holds.

**And which ledger — breadth, not volume:**

| ledger | measures |
|---|---|
| **participation** | ⚠ decayed engagement — **volume.** Walking in circles earns it |
| ⭐⭐⭐ **`DISCOVERY`** ([belief.md](../../subsystems/belief.md) realm) | **distinct things discovered — BREADTH.** Circles discover nothing |

> **Endorsement wants breadth**, because the qualification for having a
> say about content is *having seen content* — and `DISCOVERY` already
> counts exactly that, per viewer, as a kept ledger.

⭐⭐ **And why weighting by exposure is defensible here when it was NOT for
the automata** (`automata-slate`'s participation floor):

| | automata allowance | endorsements |
|---|---|---|
| what exposure buys | ⛔ **a tool that helps you play better** — a compounding personal advantage | ⭐ **a voice about other people's work** |
| the claim | *more hours = more capability* | ⭐⭐ *more exposure = more basis to compare* |

> **An endorsement is not a benefit to the endorser.** A critic who has
> read five hundred books has no more *rights* than one who has read five
> — they have more **basis**. ⭐⭐⭐ It is the eBay/Steam rule applied as a
> **gradient instead of a gate.**

**The curve: a floor plus log-saturated headroom.** `renown.md` already
uses `receptionValence × ln(1 + Σ decayed)`; the same shape gives a new
player real voice and caps the veteran premium at ~3–4× without anyone
tuning a cap. ⚠ **A 3× premium is an exposure premium; 40× is
plutocracy-by-playtime.**

### ⛔ No self-endorsement — and what that does to "gaming"

Same logic that killed self-sponsorship's standing reward in
[llm-economy § 8](./llm-economy-slate.md) — *why else would you do it?*
Self-endorsement is allocating resource to yourself, which is what the
grant already does. `ParcelApi.ownerOf` + group membership answers it at
exactly the right grain.

> ⭐⭐⭐ **And once self-endorsement is barred, "farming" and "playing a
> lot" become the same activity** — which is the intended qualification,
> not an exploit. *If you discovered two hundred places in order to have
> a bigger say in which of them thrive, you earned it by the system's own
> logic.*

⭐⭐ **And on gameability at scale**, which is the unusual part:

- endorsements **cannot be sold** — conviction is held, not transferable;
  no stock, nothing to trade;
- they drive a **share**, so one farmer's extra endorsements shift
  allocation by a vanishing amount in a large population;
- while the cost of farming stays **constant**.

> ⭐⭐⭐ **Endorsement farming is an exploit whose yield is inversely
> proportional to scale** — decisive at ten players, noise at ten
> thousand. The **opposite** of most exploits.

⚠ Which is a design note rather than a worry: **the dangerous window is
LAUNCH, not maturity.** So the gradient should **start flat and open up
once there is a population to dilute into.**

## 5. ⭐⭐⭐ Solicit the EXPERIENCE; leave the OBJECT unsolicited

> **User: "as far as prompting, that's a good idea in spirit but it
> doesn't scale unless you're giving up a lot of granularity… a really
> good combat session in an area is the result of a pageantry of stuff
> objects working together to create a unified experience. that's not
> expressible with just a like button unless you put it on the combat
> session itself."**

Correct on both halves, and they resolve each other. There are **two
different acts**, and they were being collapsed:

| | **the object** | **the experience** |
|---|---|---|
| collected | **unsolicited** — a click, any time | **solicited** — one prompt, at the end |
| naturally | abundant (the thing is always there) | **scarce (a moment ends)** |
| grain | identity / template path | the session |
| scale problem | coverage driven by exposure | ⭐ **none — the grain is already rare** |

> **Prompting does not scale at the object grain and scales perfectly at
> the experience grain.** They are not competing collection mechanics for
> one signal; they measure different things, and each one's natural
> abundance picks its own mechanic.

⭐⭐ **And the experience already has a host: it is an `Engagement`.**
[activity.md](../../subsystems/activity.md) ships the framework —
`SchedulerApi`, `EngagedMixin` slots, the `AbortReason` vocabulary. A
combat session, a dialogue, a shift, a journey, a craft are all
engagements, and **an engagement has an end, which is a prompt-shaped
moment.** So *"unless you put it on the combat session itself"* needs no
new abstraction — the session is a thing in the model, with a termination
hook, and `AbortReason` even carries *how* it ended, which is context the
rating badly wants.

⭐ **The engagement is also the only object that WAS the pageantry.**
Nothing else in the model holds the whole of a combat session; that is
precisely why a per-object axis cannot express it and why this is a second
channel rather than a finer grain of the first.

⭐ **Sparse coverage on the object channel then stops being a defect**,
because objects are not ranked against each other: three votes and three
hundred are not compared, they are *read* by an author and a committee.
The exposure bias that would wreck a leaderboard is tolerable in a funding
application.

## 6. The branches — and the verb

> **User: "this is one reason for the stuff branches Location/Agent/Thing
> but also Idea which can be rated on the same terms as any of the other
> tangible things to the player."**

Agreed, and sharper than *"Ideas are ratable too"*. Recipes, `Reading`
rows, emotes, dialogue trees, topics, biomes, materials, operations,
offers, governments — and **controllers are Ideas, so a verb is
ratable.** An author who ships a bespoke verb (EotL's **4,472** files, the
thing [eotl-census.md](../../eotl-census.md) says the craft actually went
into) gets feedback on the verb itself.

⭐ **And rating the KERNEL's verbs is already in the grain, not an edge
case:** `CreditRouting.isReleased` holds that only `/home/…` is
unreleased — **`/platform/…` and `/stuff/…` already earn producer
credit.** The commons is already a creator with a body of work. In a
polity that legislates its own platform, rating `look` is coherent.

## 7. ⭐⭐ A15 — the rating may never be read with an author as the key

*"We don't use it for standing"* protects the **use**. It does not protect
the **data**. A rating on a template is one `ProvenanceApi.authorOf` call
from being a per-author quality score — and that call is **already
implemented and already gated.** The moment both stores exist, the join
exists whether anyone performs it or not.

> ⭐⭐⭐ **The rule: a rating may never be read with an author as the
> key.** Ratings attach to templates, aggregate to parcels, and are
> queryable **by place**. There is no author-keyed read, and that absence
> is **a gate, not a convention** — [measurement.md](../../measurement.md)
> **A15**, the evidence firewall, in its exact shape.

An author sees their own; a committee sees its parcel's. Nothing in the
system can produce *"rank authors by mean rating"*, and that is deliberate.

### The identity-path question

> **User: "I really want metrics down to the identity path at least as
> content goes."**

Two readings, and both have an answer:

1. ⭐⭐ **The complaint about granularity is correct and the fix is
   cheap.** `CreditRouting` is **zone-grained** — credit for a lamppost
   detail accrues to whoever authored the zone. But `authoring_events` is
   **already path-grained** and *indexed on `path`*. **The ledger already
   supports the granularity; the routing is the coarse part.**
2. ⚠ **On identity path specifically:** for authored singletons identity
   == template, so it collapses. **Where it does not collapse, the
   difference between two instances is the player who occupies one** —
   rating dorm room A against dorm room B measures the tenant.

> **The rule: collect at identity, aggregate to template, and never report
> an identity-keyed aggregate for anything a player occupies.** Same key
> discipline as [location-graph-slate](../tails/location-graph-slate.md) —
> identity vs lineage vs `stuffId`.

## 8. ⭐⭐⭐ A template is a SUBJECT — the comment engine is not a stretch

> **User: "one reason I said the 'reddit model' was because I actually
> think we want this to be a comment engine too. maybe even an extension
> of our forum system where each stuff template is like a post. I dunno
> that might be stretching the metaphor too far."**

**It is not stretching it — the metaphor was already factored out into a
layer.** [forums.md § The Subject layer — the linking spine](../../subsystems/forums.md):
a `Subject` is a Document that *"sits between a surface and its
audience… so a single subject can light up à la carte across surfaces."*
It carries:

- **`owner`** — the mutation gate
- **`groupRef`**, three shapes — **curated** (a managed group), **bound**
  (an existing `guild:`/`mql:`/`contacts:` ref), **open** (every player)
- **`manifestations: {surface, ref}[]`** — the lit surfaces
- `lifecycleClass`, `state`, `parentSubject`

Chat rides it. The wiki's typed subjects ride it. Forums are it.
⭐⭐ **A stuff template as a subject is the FOURTH consumer of an
already-extracted layer** — promote-at-the-third-consumer, satisfied twice
over. Not a *post*: a **subject**, which is the thing the layer exists to
be. The rating is a tally on the subject; the comments are a thread on it;
it inherits the organizers, the audience shapes, the moderation and
`forum_events`.

⚠ **What is actually missing is small and nameable:** `grain` is a
**closed two-word vocabulary** (`venue | topic`) and a template is
neither. That is **a third grain** plus a resolution path template →
subject. A gap, not a substrate.

## 9. The menu — cut at the commons seam

> **User: "we may even want a menu of different systems that parcels can
> select from depending on… whatever the creators decide I guess. not sure
> why you'd pick one system over another, maybe scale or age or other
> factors."**

⭐⭐⭐ **The Subject already IS most of the menu.** *Who may comment* is
`groupRef`'s three shapes. *Which surfaces are lit* is `manifestations`.
*Who moderates* is `owner`. Three quarters of the menu is existing
configuration on a shipped record.

But it must be cut at exactly one seam:

> ⚠⚠ **The commons' channel is FIXED and not on the menu.** One axis, one
> meaning, always on, everywhere: *should this have more?* Because it is
> an input to allocation **across** parcels, and **a configurable
> instrument is not a measurement** — B4 arriving at the system level. A
> parcel that switched ratings off would read as zero demand; a five-star
> parcel and a `more/less` parcel cannot be compared.
>
> **Everything above that line is the parcel's.** Comments
> open/curated/closed, named or anonymous, facet polls, a guestbook, a
> review thread, a suggestion box, whether raters get a seat. **That is
> where lens 2 lives, and none of it feeds the commons.**

The same seam as subsidiarity: the public instrument operates only at the
boundary, and below it the commons does not reach in.

### ⭐⭐ Why you would pick one — it is not scale or age

> **What are you willing to be told, in public, by strangers, under your
> own name?**

A creative and temperamental choice, not a scaling one. A new author wants
an open thread and will read every word. A mature venue with four hundred
visitors a day wants comments curated and the one number. A memorial wants
a guestbook that only adds. **A dungeon wants anonymous, because the
honest note is *your puzzle is unfair* and nobody signs that.**

⭐ **Scale enters in exactly one real way: moderation is labour.** An open
comment thread on a busy parcel is a recurring job — a manhours cost
([contract.md](../../subsystems/contract.md)'s board), which the committee
may have to fund. **Opening comments is a spending decision**, which
closes the loop neatly.

⚠ **And the menu must not be a kernel enum.** Three hardcoded options is a
dial an amendment cannot reach (*don't escalate dials to kernel*). The
kernel ships the fixed commons channel plus two or three default regimes
**as rows**; a parcel may ship its own.

## ⚠ What the comment engine costs

§ 1 holds that ratings are safe because votes allocate and measurements
mint. **Comments partially break that**, because a comment is **persuasion
aimed at a committee**, and committees read prose. The capture vector moves
from vote rings to **lobbying** — the older, harder problem, and precisely
participatory budgeting's documented failure: organised groups
out-arguing unorganised ones at the meeting. **A comment engine is the
meeting.**

Not solvable. Containable by what
[scarcity-slate § 8](./scarcity-slate.md) already establishes a committee
to be: **a camera, not a wall — the committee's report is public and must
state what it read.** The asymmetry survives; it stops being invisible.

## 10. Open questions — values, not mechanism

1. ⭐⭐ **Who sits on a parcel committee?** Subsidiarity says it recurses,
   so it is that parcel's constituency — holders, workers, and arguably
   the visitors who rated it. **If raters get a seat, the rating is
   simultaneously a resource signal and a claim to office**, which is
   either elegant or a capture vector, and the slate cannot tell which.
2. ⭐⭐ **The cycle's period.** Allocate → perform → stand → reallocate is
   a loop with lag: short thrashes (parcels flickering), long means a bad
   call hurts for a season. Best guess: **the cycle is the committee's
   meeting** — which also answers
   [scarcity-slate § 10](./scarcity-slate.md) Q4, because an appropriation that
   never lapses is an allocation formula in a budget's clothes.
3. ⭐ **Does a funding vote decay?** Renown's receptions are decayed and
   log-saturated, but a funding vote probably should not behave like a
   reputation. ⚠ **If old ratings keep paying, incumbency wins again** (§
   3).
4. **Formula or committee, where they overlap.** The commons' formula
   sizes the top-level block; the committee sub-allocates within it. ⭐ The
   committee's whole justification over a formula is **cold start —
   discretion exists to fund what the measurement cannot see yet**, and
   new content has no ratings, no traffic and no standing by construction.

## Cross-refs

- [scarcity-slate.md](./scarcity-slate.md) — **what gets allocated**: the
  four channels, their institutions, the two committees, and the meter
  that must exist before any of this runs.
- [provenance.md](../../subsystems/provenance.md) — the shipped standing
  arm: `authoring_events`, `authorOf`, `CreditRouting`, the `weight` seam.
- [forums.md](../../subsystems/forums.md) § The Subject layer — the
  comment engine's substrate, and the closed `grain` vocabulary.
- [activity.md](../../subsystems/activity.md) — the `Engagement`, which is
  the experience channel's host.
- [measurement.md](../../measurement.md) — A15 (the evidence firewall),
  B4 (a declared standard is never a gauge), the Mara/Aletheia property.
- [renown.md](../../subsystems/renown.md) /
  [participation.md](../../subsystems/participation.md) — the measured
  signals that **mint**, as distinct from the voted signals that
  **allocate**.
- [land-compute-and-license.md](./land-compute-and-license.md) — the
  dormancy ladder reallocation rides, and subsidiarity.
