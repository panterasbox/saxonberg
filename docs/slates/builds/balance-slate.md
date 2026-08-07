# Balance slate — what the legislature actually governs, what a law looks like, and who enforces it

**Captured 2026-08-02.** The question that opened it:

> **User: "what can private parcel holders do on their own authority and
> what is prescribed by the Compact? … it's back to federalism and our
> version of the 10th amendment. The solution has to empower private
> content developers but also give the legislature authority over the
> rules of the game and all of it has to be enforced by the executive."**

And the correction that reframed the whole thing, one turn in:

> ⭐⭐⭐⭐⭐ **User: "it's not just physical crossings, it's any state that
> is changed by the locality and consumed outside of it. Which is all
> reputation and discipline, the entire advancement axis. This makes the
> legislature's main job establishing balance. It's interstate commerce
> but for every resource and economy in the game, of which there are
> many."**

> **Status: design conversation, captured. Not requirements. The
> mechanisms it needs are mostly shipped or already slated — the net-new
> artifacts are a list, a predicate, and one field.**

---

## ⚠ Already decided elsewhere — do NOT re-derive

This slate assumes all of the following and adds to it. Read them first;
nothing here restates them.

| Artifact | What it already settles |
|---|---|
| [legal-code-slate](./legal-code-slate.md) | instrument taxonomy (type IS its consumer), the Roll → Code → clause index, prose ⊗ clause, the enactment pipeline, the docket + its sweep, conviction weighting, the passage rule, *enactment has no human actor* |
| [branch-policy-slate](./branch-policy-slate.md) | `writers` as data-sourced `FromModule`; **narrows never widens**; nearest-wins; self-amendment; the wizard hatch stated honestly |
| [stewardship-slate](./stewardship-slate.md) | the allowance cascade (Compact → locality → parcel), the closed-six land use, *zoning governs land use, never self-expression* |
| [amendment-library-slate](./amendment-library-slate.md) | kernel/module split; governance choices as legos |
| [zoning-slate](./zoning-slate.md) | **industrial is defined by what LEAVES** — the externality test this generalizes |
| [enforcement-slate](./enforcement-slate.md) · [policing-slate](./policing-slate.md) | the evidence firewall; testimony as claims not queries; crime social, alignment intrinsic |
| [press-slate](./press-slate.md) | the three layers; **events, never significance** |
| [parcel.md](../../subsystems/parcel.md) | title stored outside content (the governing security invariant); `ownerOf`; the coverage trie; `landUse`/`area`; `subdivide`/`transfer` |
| [access.md](../../subsystems/access.md) | `can`/`canMutateZone`; the code-trust lockdown; **committee = the title-holding group** |
| [civics.md](../../subsystems/civics.md) · [governance.md](../../subsystems/governance.md) | Locality-declared jurisdiction; the Office substrate; seats-as-positions |

---

# Part 1 — What is reserved

## ⭐⭐⭐⭐⭐ Every global ledger is a currency, and every parcel that writes to one is a mint

The user's reframe, taken to its conclusion. A training dummy that grants
swordsmanship exports nothing physical — but the competence it writes is
read **everywhere**. That parcel is minting a global currency inside a
local jurisdiction.

So count the mints:

| Ledger | Chokepoint? |
|---|---|
| `bank_ledger` | ✅ `postTransaction`, conservation-enforced ([banking.md](../../subsystems/banking.md)) |
| `transcripts` (competence) | ❌ |
| `renown_events` | ❌ |
| `participation_events` | ❌ |
| `producer_events` | ❌ **— this one is voting weight** |
| `disposition_events` (traits) | ❌ |
| `chronicles` | ❌ |
| `authoring_events` | ❌ |
| `accountability_events` | ❌ |
| `positions` | ❌ |

> ⭐⭐⭐⭐ **Money already solved this. Nine other ledgers have the identical
> problem and no chokepoint** — and `producer_events` is the one that
> elects the government. *A parcel that can mint producer standing can
> mint votes.*

Which is why balance is not a game-design chore delegated to a designer.
It is **monetary policy for nine currencies**, and it is the legislature's
actual job.

## The test — and a sharpening

"Consumed outside" is *nearly* the rule but slightly too wide: if
everything read from elsewhere is reserved, holders have nothing and the
9th/10th promise is hollow.

> ⭐⭐⭐ **The test is not "is it read outside." It is "does it ADD to a
> global scale."** A ledger you can accumulate into is a currency. A fact
> you can read is just content.

Your fiction, your place, your stuff, your room descriptions — **yours**,
however widely read. **Only the ledgers are federal.**

## ⭐⭐⭐⭐ The enumeration is not philosophical — and it has TWO halves

The two axes are, notably, the two the US Constitution enumerates in
Art. I §8: **commerce among the several states** (externality — what
leaves) and **coinage + the standard of weights and measures**
(commensurability — what must mean the same thing everywhere for a
portable record to be legible). Plus the copyright clause, which the
project already holds un-fused as `authoring_events`.

⚠ **A first draft of this slate collapsed the enumeration to "the
collection list," which captures only the externality half** — and
therefore missed portable objects entirely (see below). Both halves are
independently enumerable **from the codebase**, which is what makes the
reserved list checkable rather than a matter of argument:

> ⭐⭐⭐⭐⭐ **Reserved = the cross-jurisdiction LEDGERS (what accumulates)
> ⊕ the closed VOCABULARIES (what things mean).**

| Half | What it is | Already enumerable as |
|---|---|---|
| **ledgers** | what accumulates on a global scale | the append-only cross-jurisdiction collections (the table above) |
| **vocabularies** | what a thing *means* anywhere | materials · Channels + the resist/deliver grids · Disciplines · Units · Modality · LocomotionModes · land use — **already closed engine code** |

Both give the same design-review trigger: **a build that adds an
accumulating cross-jurisdiction collection, or opens a closed vocabulary,
has added a reserved matter** — a question to answer at the time, not a
discovery three years later.

⭐ **The vocabularies half is load-bearing and mostly already won.** A
parcel cannot invent a new damage channel, a new material, or a new unit,
so the worst version of the portable-object problem is foreclosed by the
materials-response design before any of this ships.

## ⭐⭐⭐ Portable objects — and a retraction

> **User: "a weapon that's balanced inside its parcel but can be carried
> out — what's the determination there?"**

The case the ledger test misses: a sword does not accumulate onto a global
scale; it is a **durable capability that travels.**

### ⚠⚠ The retraction — recorded, because the reflex will come back

A first pass answered this with **chattel**: an item that should not leave
does not leave because the holder does not own it, lent-not-given, with
MMO soulbinding as precedent. **Rejected, correctly:**

> ⚠⚠ **User: "the whole thing with our game is the laser gun in Westeros
> — content of different genres can cross over and it all just sorta
> works."**

> **It solves balance by forbidding the one thing the game is FOR.**
> Precedent from MMOs is not a recommendation here — those games do not
> make this promise. ⚠ **"Just make it soulbound" is the reflex to refuse
> every time it returns.**

### ⭐⭐⭐⭐ The vocabularies are what MAKE crossover work

The same first pass filed the closed vocabularies under *restriction*.
**They are the opposite.** A laser gun works in Westeros because both are
expressed as mechanism → channel → material response; nothing
special-cases the encounter.

> **The shared terms are the INTEROPERABILITY LAYER** — the reason *"it
> all just sorta works"* is achievable rather than aspirational.

So a portable weapon gets the same treatment: **express it in shared terms
and let the terms carry it. Never reach for a fence.**

### ⭐⭐⭐⭐⭐ The item is never the problem — the exchange rate is

Walk the failure through. A sword that hits for 50 hits for 50 everywhere;
outside its parcel it is not *incoherent*, merely *strong*. **That is not
a crossover problem at all.**

> ⭐⭐ **A sword appropriate as the reward for a 20-hour raid is broken as
> the reward for a 5-minute tutorial. The item is fine. THE PRICE WAS
> WRONG.**

> ⭐⭐⭐⭐⭐ **You do not regulate the sword. You regulate the RATE AT WHICH
> SWORDS APPEAR.** The laser gun crosses freely; what is bounded is how
> cheaply the parcel produced it.

Which collapses back into Part 1 through the right door — **acquisition is
a mint**, and a parcel handing out powerful items cheaply is over-minting
*value*, not smuggling *objects*.

⭐ **Contextual calibration then takes care of itself.** *"3× damage to
Ice Wraiths"* carried out is a normal sword against everything else —
self-limiting **because** the context is expressed in shared vocabulary.
The dangerous item is never the contextual one; it is the **generically
strong one that was cheap.**

### ⭐⭐⭐⭐ Risk-weight the rate, or the bound is Basel I

> **User: "acquisition is also scaled by risk/reward calculation, so
> there's multiple factors there."**

Rate-per-hour needs an exemption for dangerous content ⇒ **the denominator
is wrong** (Part 2 § *The denominator is where all the design is*).

> **Bound the risk-adjusted rate, not the raw rate.**

Exact precedent: **Basel I's flat capital ratio was gamed in precisely
this direction** — safe lending penalized, risky lending rewarded — and
**risk-weighted assets were the fix.** The identical correction, already
made once in the real world.

The denominator is a **composite** built from ledgers that already exist:
harm taken · death exposure (the dying clock, reembody cost) · resources
burned (consumables, `Durable` wear) · time · scarcity · party size ·
execution difficulty.

> **Ship ONE crude denominator and let them fight about the weights.** The
> first one being wrong is the point — it is *meant* to be amended.

⚠ **The exploit: inflate the denominator** — take unnecessary damage to
justify a higher rate (the junk-in-risk-weighted-assets scam). Half of it
is self-honest: bleed for it and you did take the risk. The dishonest half
is **fake risk** — harm from a source you control, with no real chance of
death — and measuring *expected cost* does not catch it. But:

> ⭐⭐⭐ **Risk is not expected cost, it is the VARIANCE of outcomes.** Real
> danger sometimes kills someone; fake danger has a suspiciously tight
> distribution — **and that anomaly is its own detector.** Same shape as
> tier misdeclaration, no new machinery — and it folds in execution
> difficulty for free, since failure rate *is* dispersion.

⚠ **Small-N limit, honestly:** a parcel with three visitors has no
distribution, so the measure is weakest exactly where oversight is
thinnest — the same shape as differencing defeating aggregation (Part 7).
Not fixable by cleverness; it is why an early polity leans on
**adjudication rather than statistics.**

### What is left for the lint — and what chattel is actually for

| | Case | Answer |
|---|---|---|
| 1 | out-of-vocabulary stats | **impossible** — the vocabularies are closed engine code |
| 2 | declares novice tier, serves veterans | the declaration is a claim; the sweep audits it (Part 3) |
| 3 | legal parts combined into an **illegal whole** | ⭐ **caught downstream** — outcome-metering, below |

> ⭐⭐⭐ **Declared power is checked at save. Emergent power is caught by
> the meter.** The lint handles what can be specified; the meter handles
> what cannot.

**Chattel survives as FICTION, not as policy.** A gym's practice swords
being the gym's property is good, true and diegetic — *issued vs. owned*
is a real thing worth having. It must simply never be **the answer to
balance**, or it becomes the fence someone reaches for whenever a number
looks frightening.

⭐ **And the one legitimate "cannot leave" already exists and is not about
power:** the sandbox's **Layer-4 boundary**
([sandbox.md](../../subsystems/sandbox.md)) — provenance-**taint**. The
exception that shows the rule: *the only thing that cannot cross is
something whose ORIGIN is untrusted, never something that is merely
strong.*

### ⭐⭐⭐⭐ Meter outcomes, not objects

The reframe improves the instrumentation ask. Bounding acquisition *looks*
like it needs an absolute item-power metric — hard, arbitrary, and junk
bounds if done badly.

> **It does not. You never need to know what a sword is worth. You need to
> notice that players who pass through this parcel subsequently mint
> competence 3× faster.** A parcel's contribution is a **delta in its
> visitors' downstream rates.**

No item-power metric, no crafting-value model, and **emergent combinations
are caught for free** — an unanticipated stack shows up in outcomes even
though no lint could have predicted it.

⚠ **The honest cost is attribution.** Visit ten parcels — which caused the
delta? Real causal inference, and not clean. The saving grace: **you do
not need attribution to DETECT an anomaly, only to ACT on one.** Detection
stays statistical and automatic; the attribution argument is exactly where
a human adjudicator earns their keep. The ladder again.

⚠ **And not everything valuable is metered.** An item that trivializes a
puzzle without moving any mint rate is invisible to this. A real hole —
and the answer is instrumentation, not a fence.

⚠ The **export/import** asymmetry survives the retraction (the first draft
treated the boundary as one-directional). Real-world shape: **mutual
recognition by default, harmonized standards where it matters** (Cassis de
Dijon vs. the harmonized-standards regime). Item efficacy is squarely
harmonized — it is expressed entirely in reserved vocabulary.

## ⭐⭐⭐⭐ Federalism is already built — it is the longest-prefix walk

The finding nobody was looking for. Jurisdiction (civics), title
(`ownerOf`), land use, the allowance cascade, and branch `writers` policy
all resolve **identically**: nearest claimant wins, unclaimed inherits
upward.

That is not five mechanisms. It is **one topology used five times**.

> **A holder's authority is not a grant handed down. It is the interval
> of the tree they hold — and the Compact's interval is the root.**

## ⭐⭐⭐⭐ Supremacy needs no second walk

The obvious objection: nearest-wins is the *wrong direction* for reserved
matters. A locality declaring its own coinage would win by prefix.

But no root-wins resolver is needed:

> **A law on a reserved matter is VOID AT CODIFICATION.** It never enters
> the clause index, so ordinary nearest-wins resolution is already
> correct. **Constitutionality is a write-time predicate, not a read-time
> precedence rule.**

Which is also the legal truth — an unconstitutional law is not overridden,
it is void *ab initio*. And it collapses the build to **one list and one
predicate in the codification lint** (which already exists, for
conflicts). Every shipped resolver stays untouched. Same shape as
branch-policy's *validate at set time*.

## ⭐⭐⭐ Capability fails closed. Authority fails open.

The 9th amendment, and the half that actually empowers content
developers.

> **You may not call what you were not given. You may do what you were
> not forbidden.**

The security substrate must fail closed — `AccessApi.can`, the code-trust
lockdown, `writers`. The **political** substrate must fail open, or you
get a permission-slip culture where nothing gets built and every holder
waits on a grant.

They are safely separable because the project already separates them:
capability is `can()`, authority is law, and **law ships with no teeth by
default**. So the residual clause is not prose anyone must enforce — **the
fail-open default IS the residual clause.**

## ⚠ Three tiers, not two

A correction to the opening framing worth keeping in front:

> **The Compact is NOT ultimate authority over what the code does.** It is
> authority over the rules of the game. The runtime is wizard-gated and
> out of fiction.

| Tier | Governed by |
|---|---|
| the **runtime** | wizards; out of fiction. ⭐ Nothing *reaches in* — no content edit, no law, no clever composition escalates to code-trust. It is **assigned** from above (below), never climbed to |
| the **Compact** | the polity — the rules of the game |
| the **holder** | themselves, over everything unreserved |

⚠⚠ **CORRECTED 2026-08-04 — the original rule here was backwards.** It
read *"no law can make you a wizard,"* on the reasoning that a legal path
to code-trust would evaporate the capture-resistance claim. **Rejected:**

> **User: "if a new PM comes in and wants to change every wizard and
> archwizard in the game that's their prerogative. But no one ever loses
> the ability to create content with the exception of compute quotas,
> just typescript code."**

The guarantee was aimed at the wrong side of the transaction. Code-trust
is **a job assignment**, and an executive the polity chose is entitled to
make it. What matters is not what can be *granted* but:

> ⭐⭐⭐⭐⭐ **THE GUARANTEE IS ABOUT WHAT CANNOT BE TAKEN.**

| | |
|---|---|
| **TypeScript / code-trust** | grantable **and revocable** by the executive |
| ⭐ **content authorship** | **INALIENABLE** — nobody ever loses the ability to make things |
| **compute** | the *only* legitimate throttle, and a **quota**, never a permission |

So **"protowizard" is not a lesser tier — it is the floor nobody can be
pushed below**, which is what makes the tenure kernel's protected bundle
real: you can lose the keys to the engine and still hold your ground,
your builds, and your capacity to author.

> ⚠⚠ **Inalienable means the CAPACITY, not any particular WORK.** You can
> never be stripped of the ability to make things. A specific thing you
> made can still be removed — by moderation, by a locality's rules, by
> the owner of the ground it sits on.

**Clarified 2026-08-04**, because the unqualified phrasing reads as *"my
content can never be taken down"* and will be quoted that way.
**Authorship and hosting are different questions**: the floor is a
guarantee about *you*, not an easement over somebody else's parcel — and
it has to coexist with moderation or a community cannot govern its own
space. ⭐ The provenance record is the part that genuinely never goes:
`authoring_events` says you made it whether or not it still stands.

⭐ **The claim survives, bounded more honestly:** the polity governs
**who holds the keys**, not **what the engine does**. See Part 6 for the
chain.

---

# Part 2 — What a law looks like

## ⚠ Pseudocode is the trap

Three reasons, and the third is fatal:

1. only the ~5% who code can write it — the polity is disenfranchised by
   the medium;
2. whoever writes the interpreter holds the real power;
3. ⭐ **it duplicates the engine.** A law reading `competence += 0.1 *
   difficulty` is a second implementation, and it will drift from the
   first.

## ⭐⭐⭐⭐⭐ A statute is a constraint on a meter, never a procedure

> **The engine computes; the law bounds.** Anything that must *do*
> something is a **directive** — a work order for the executive — not a
> self-executing clause.

Which yields three law shapes, sorted by **what reads them** (extending
legal-code's *type IS its consumer*):

| Shape | Read by | Interpretation | Example |
|---|---|---|---|
| **parameter** | the runtime | none | `vote.quorum = 0.3` |
| **bound** ⬅ **missing today** | the docket sweep | arithmetic | competence mint ≤ 4.0 band-fractions / player-hour |
| **standard** | people | judgment | *"content must not be deceptive"* |

**The middle row does not exist in the corpus and it is the entire balance
layer.**

## The bound, concretely — a form, not a program

```yaml
matter:     advancement.competence     # from the closed enumeration
scope:      /domain/hinkley/**
class:      novice                     # the declared audience (Part 3)
bound:      <= 1.0 band-fractions per player-hour
measure:    transcripts, 7-day trailing
on-breach:  throttle
```

Fillable by anyone. It names a **matter** from the enumeration, a
**meter the engine already produces**, and a **number**. It reimplements
nothing.

## ⭐⭐⭐ The precedent exists — it is regulatory, not constitutional

The substrate combination is genuinely novel; **the law shape is not.**
Basel III capital adequacy is a ratio. Clean Air standards are
concentrations. Spectrum allocation is a band. **Modern administrative law
is overwhelmingly bounds on measured quantities**, precisely because that
is the only kind of rule that can be checked.

> ⭐⭐⭐⭐ **We are not teaching people to write a criminal code. We are
> teaching them to be a REGULATOR.** That is arithmetic plus tradeoffs —
> teachable, and squarely inside the econ pedagogy the college slate
> already wants.

## Two hard constraints that fall out

### ⭐⭐⭐ A matter cannot be legislated until it is metered

You cannot bound what you do not measure. So the legislature's reach is
bounded by the **instrumentation**, not by ambition, and *adding a meter*
is an engine release — constitutional scale. Self-limiting in the right
direction, and it makes
[instrumentation-slate](./instrumentation-slate.md) politically
load-bearing rather than plumbing.

#### ⚠⚠ And the binding instance of this is the jurisdiction stamp

The ledgers record **who** and **what**. Balance needs **rates per
jurisdiction** — so every ledger write needs a **parcel stamp**, derived
from the acting location at write time, the same shape as provenance's
context-derived author.

> ⚠⚠ **Until ledger writes carry a jurisdiction stamp, a parcel's mint
> rate is not computable and this entire slate is theory.** It is the
> first build item; everything else queues behind it.

#### ✅ AUDITED 2026-08-06 — the claim was right, and wrong in two ways that matter

Every ledger's event shape read directly. Result below; the headline is
that **the blocker is smaller than stated and differently shaped.**

| Ledger | Spatial field | Vocabulary | Populated on the write path? |
|---|---|---|---|
| `producer_events` | `zonePath` | **template path** | ✅ **yes** — every row |
| `authoring_events` | `path` | template path | ✅ yes (but it is the *authored* path, not where the act happened) |
| `renown_events` | `locality` | **address prefix** | ✅ yes — `RenownLogic.resolveScope` |
| `chronicles` | `where` | template path | partial — authored, not derived |
| `bank_ledger` | `locality` | address prefix | ❌ **never** — always `null` |
| `accountability_events` | `locality` | address prefix | ❌ **never** — always `null` |
| `transcripts` | — | — | ❌ no field |
| `disposition_events` | — | — | ❌ no field |
| `participation_events` | — | — | ❌ no field, **deliberately** |
| `chattel_events` | — | — | ❌ no field |

##### ⭐⭐⭐⭐⭐ Finding 1 — there are TWO prefix hierarchies and the ledgers mostly chose the wrong one

Part 1 concluded *"federalism is already built — it is one longest-prefix
walk used five times."* **That is not quite true, and the difference lands
exactly here.** There are two trees:

- **Title** — `ParcelRecord.extent`, *"the path this parcel claims — the
  coverage-index key"*. A **template path**. This is what `ownerOf`
  resolves and what a mint rate must be keyed by.
- **Jurisdiction** — the `AddressApi` rooted address namespace
  (`/university-avenue`), resolved by `coverageChainOf`. An **address**.

Both are longest-prefix, both are derivable from an acting location, and
**neither derives from the other.** The three ledgers carrying `locality`
carry the *address*, documented as *"address-prefix scope where it
happened."* ⇒ **even where populated, `locality` does not resolve to a
parcel.** Renown is jurisdiction-attributable and *not* title-attributable
today.

⚠ Whether the two trees are congruent in practice is **not audited** and
is now the first question, because if they are not, "which regulator" and
"which owner" can disagree for the same act — and that is an arbitrage
surface of exactly the kind the span-of-parcels rule below worries about.

##### ⭐⭐⭐⭐ Finding 2 — the most important ledger is already done

`ProducerEvent.zonePath` is *"the engaged zone's template path"*, written
on **every** row from `CommandDispatchedPayload.locationTemplatePath`,
which `CommandGiver` fills from `args.location?.getTemplatePath()` at
dispatch. That is the parcel coverage key, in the right vocabulary,
derived at the right moment.

And by Part 1's own reframe, **`producer_events` is voting weight.** So
the one ledger where jurisdiction attribution matters most is the one that
already has it. ⇒ **blocker #0 downgrades from "nothing is computable" to
"one is, nine are not."** A producer-only balance instrument is shippable
today, which makes a much cheaper v1 than the slate assumed.

##### ⚠⚠ Finding 3 — two `locality` fields are DEAD, and the tests say otherwise

`bank_ledger` and `accountability_events` both declare `locality`, mark it
persistent, and **never write it non-null**:

- `postTransaction(kind, legs, opts)` takes `opts.locality` — and **all
  thirteen call sites are module-private and pass no `opts`.** Every row:
  `locality = null`.
- `AccountabilityLogic`: `ev.locality = fields.locality ?? null`, and no
  producer passes it.

⚠⚠ **This is [[reference-ideas-inert-at-boot]] in a fourth subsystem.**
`lib/banking/__tests__/LedgerEntry.test.ts` hand-constructs
`e.locality = "/university-avenue"` and asserts the round-trip — proving
the *field* persists while proving nothing about the *write path*. Green
CI, dead column, and a query against it returns clean empty results rather
than an error.

⭐ **Worse, the banking signature is spoofable by design.** A
caller-passed stamp is precisely the arbitrage surface this section warns
about two paragraphs down. `AuthoringEvent` already states the correct
contract — *"the author is derived from the execution context, **never
passed** — the anti-spoof contract."* The stamp must be derived, and
`opts.locality` should be **removed**, not filled in.

##### Finding 4 — the advancement axis has no spatial field at all

`transcripts`, `disposition_events`, `participation_events`,
`chattel_events` carry nothing. These are exactly the ledgers Part 1's
reframe named as the whole point (*"the boundary is any state written
locally and consumed globally — which is the whole advancement axis"*).

⚠ **`participation_events` is a deliberate refusal, not an oversight.**
`CommandDispatchedEvent` carries the location, and the participation
consumer is documented as ignoring it so *"its rows are byte-identical
whether present or not."* Stamping it **reverses a stated decision** and
needs its own argument, not a patch.

##### ⭐⭐⭐⭐ Finding 5 — the seam already exists, planted for something else

`ExecutionContextApi.getJurisdictionBound()` returns *"the governed-eval
jurisdiction bound (**a parcel extent**) for the current execution tree"*
— a frame-0 metadata slot with a documented set-once discipline, storing
**exactly the right type**, planted today only by the governed-eval root
and `null` on every ordinary path.

⇒ the fix is not new plumbing. It is **planting that slot at the command
root**, where `CommandGiver` already computes the location's template path
one line away, and giving ledger writers an `actingParcelKey()` companion
to `BankingLogic`'s existing `actingActorKey()`. **One seam, existing
shape, existing anti-spoof contract.**

⚠ Not audited: whether frame-0 set-once survives the schedule/root cases
(`ScheduleApi.recurring` composes its own root), which is where a
stamp would silently go null.

⚠ **And it needs a stated rule for acts that span parcels** — a blow
struck across a boundary, a trade concluded in one place and delivered in
another. *Leans "where the acting principal stood,"* for the same reason
`getActingAuthor` resolves the way it does — but it must be **declared,
not defaulted**, or the stamp becomes an arbitrage surface: pick where you
stand to pick your regulator.

### ⭐⭐⭐⭐ A bound that needs exemptions is measured in the wrong unit

The general rule, and the answer to most of the targeting problem
(Part 3). A novice zone granting fast progress and a veteran zone granting
slow progress look wildly different in raw transcript entries — and
**identical measured in fraction-of-a-band**, because Competence is
already banded and derive-on-read ([advancement.md](../../subsystems/advancement.md)).
The engine has already normalized the curve.

⚠ **Reach for the unit before reaching for the carve-out.** Every
exemption is a lobbying surface — a thing someone campaigns for.

### ⭐⭐⭐⭐⭐ The denominator is where all the design is

The generalization, and **the rule this slate kept rediscovering.** Three
separate problems, three times the answer was a better divisor:

| Problem | Naive unit | The right denominator |
|---|---|---|
| novice vs veteran zones | competence granted | **per band-fraction** — the engine already banded the curve |
| a portable weapon | the item's power | **per visitor's downstream rate** — meter outcomes, not objects |
| dangerous vs safe content | rewards per hour | **per unit of risk carried** — Basel's risk-weighting |

> ⭐⭐⭐⭐⭐ **The numerator is always obvious — what got minted. All the
> contested, political, genuinely hard work is in choosing what to divide
> by.**

Which yields the pedagogical dividend, and it is a large one:

> ⭐⭐⭐ **The legislature's real debates will be about DENOMINATORS** —
> exactly like real regulatory politics, where the fight over Basel's risk
> weights is where every lobbyist went, because that is where the money
> was.

**Nobody has to author "an interesting policy debate."** Arguing over
weights *is* the job, and it is the genuinely educational kind of argument
— it has right and wrong answers that are nonetheless contested.

⭐ **Corollary for build order:** ship one crude denominator per matter.
The first is *meant* to be wrong, because being amendable is the point
(Part 7's thermostat).

---

# Part 3 — Targeted content

> **User: "bounds need to be dynamic enough to accommodate content
> directed at specific players — veteran vs newbie, but there could be
> other dimensions. This can't be seen as preferential… I suspect the
> completely universal stuff is pretty limited."**

Correct, and it breaks a flat-rate model. It decomposes into three
problems and only the third is new.

## 1. Most apparent targeting is a different MATTER

Dave's Bar mints renown and participation. A delve mints competence in a
combat Discipline. **They are not competing for the same bound** — the
`matter` field already separates them. Much of what reads as *"this is for
a different audience"* is actually *"this is on a different ledger,"* and
that is free.

## 2. Genuine mixed use — subdivide, plus the accessory-use doctrine

- **The declaration is a class PER MATTER** — a small map, not a scalar,
  and not a new "mixed" category. A tavern that is also a shop declares on
  two ledgers and conflicts on neither.
- **Mixed on one matter is what `subdivide` is for.** A building with a
  novice floor and a veteran basement is **two parcels**, and that already
  ships. It is also what real zoning does — one lot does not get two
  principal uses; you split the lot.
- ⭐ **The de minimis case needs the accessory-use doctrine** (zoning has
  had it for a century): *a use subordinate and customarily incidental to
  the principal use needs no declaration of its own.* Otherwise selling
  one apple makes you commercial. A threshold: below X% of the parcel's
  minting on that matter, it rides the principal declaration.

## ⭐⭐⭐ 3. Targeting is zoning

For genuinely different content that no unit unifies, the shipped
mechanism is the right one:

> **A parcel declares its class from a closed vocabulary, and the bound is
> written against the declaration.** Exactly land use — capability +
> ceiling, closed engine vocabulary, assignment local and political.

⚠ **The brake must be that the axis vocabulary is closed engine code.**
Assignment is political; **adding an axis is an engine release.**
Otherwise *"I need a new targeting dimension"* becomes the exemption
generator under another name. Start with **one** axis (progression tier).
The likeliest second is **solo vs. group**, since party content genuinely
cannot be rate-matched to solo content in any unit.

⚠ **Residual, honestly:** content targeted at a dimension the engine does
not measure **cannot be a declared class**, by the same rule that says an
unmetered matter cannot be legislated. That will bite. The answer is
instrumentation, not an exception.

## ⭐⭐⭐⭐⭐ Undeclared ground mints nothing

> **User: "that stuff was somewhat discretionary before, but if it
> determines balance parameters now there's public interest embedded in
> the data — and it requires people actually use the parcel model the way
> we're hoping."**

The sharpest observation in the session. `landUse` and `area` are declared
at provision and explicitly **not policed** today. The moment they set
balance parameters, **non-declaration is an exploit and misdeclaration is
an offense** — and neither is fixed by hoping.

The fix inverts the incentive rather than policing it:

> ⭐⭐⭐⭐⭐ **Undeclared ground mints nothing.** Declaring is not paperwork
> asked of people for the public good — **it is how you turn your parcel
> on.** Nobody needs to want the system to work; they need their content
> to function.

And this is not new doctrine — it is the argument parcel.md **already
makes** for `landUse`:

> *"⚠ `wild` admits nothing, and that default is load-bearing. Were `wild`
> to admit cultivation, it would be legal on every branch nobody thought
> to zone."*

Same argument, new axis. It is also **capability-fails-closed /
authority-fails-open doing exactly its job**: the capability side fails
closed *so that* the political side can safely fail open.

**Misdeclaration then handles itself.** The declaration is a *claim*, and
the sweep already measures who is actually present. Claiming novice tier
while serving veterans is a **metered mismatch**, not an investigation. No
new machinery.

⚠ **Localities need the same medicine** — they are pure addressing today
and allocate nothing. If jurisdiction becomes load-bearing for balance,
the incentive to declare has to be the same one.

## ⭐⭐⭐⭐ Particular legislation is legitimate. Particular EXEMPTION is the abuse.

An earlier draft proposed a **special-legislation prohibition** (many
state constitutions flatly ban laws aimed at a named person or place).
**Rejected, correctly:**

> **User: "we've been using 'nerf that NPC 10 units' as a literal example
> in our marketing material. We've said the legislature writes laws from
> the abstract to the particular so long as they can be enforced."**

A flat prohibition bans the headline feature. That was a bad rule, not a
misplaced one. The real asymmetry:

> ⭐⭐⭐⭐ **Nerfing a named NPC imposes a BURDEN on a named target — the
> legislature doing its job. Granting a named parcel a higher mint rate
> confers a BENEFIT on a named target — that is capture.**

And unlike the prohibition, it is **mechanically checkable**: does this
instrument make the target's bound *tighter* or *looser* than its class
default? **Tighter passes normally. Looser is a special benefit** and
needs the higher bar — supermajority, sunset, or compensation. All
**module**, all amendment-library shaped (the user's call).

> **The holder's protection against being nerfed was never a prohibition.
> It is COMPENSATION** — the `appropriation` instrument, which the
> taxonomy already has. Consistent with the rest: quarantine not
> confiscation, price your own retroactivity.

### ⚠ The parked case this rule already names: the Compact's own allowance

> **Recorded 2026-08 by the organizations build, which carved `/compact`
> and deliberately did not decide this.**

`/compact` is now a claimed, core-held path-branch title
([parcel.md](../../subsystems/parcel.md)) — the **publications** namespace,
where the Compact's documents live. It will eventually need a resource
allowance of its own, separate from any locality's.

⚠ **Who sets it is genuinely unresolved, and the reason is exactly the
rule above:** *the executive is the same branch that provisions parcels in
the first place.* An executive that grants its own branch a looser bound
than the class default is not doing its job; it is the textbook **particular
EXEMPTION**, self-dealing through the provisioning power rather than
through the legislative one. And a Compact that cannot fund its own
publications is a different failure.

Nothing decides it yet, and nothing needs to: `ParcelRecord.allowance` is
an **inert 0a seam** and the allowance cascade is unbuilt. The cascade
build settles it **with the mint model in front of it**, which is the only
place the trade-off is legible. This paragraph exists so that build does
not rediscover the tension from scratch — it belongs here, where the meter
doctrine already lives, rather than in a slate of its own.

---

# Part 4 — Detection and adjudication

## ⭐⭐⭐⭐ Detection is not a police function — it is the docket sweep

> **You do not detect violations. You measure rates.** A breach is a ratio
> crossing a declared line — **structurally identical** to a bill crossing
> its threshold.

Same machinery, same skip-test proof, same idempotent state comparison,
same collection. A breach entry sits next to an enactment entry **because
they are the same event shape.** Free, and — the load-bearing part —
**non-discretionary**. *Nobody decides to investigate you.*

## ⭐⭐⭐ The machine throttles; it never punishes

Breaches are frequently innocent (a streamer's parcel genuinely got 10×
traffic this week).

> **Automatic detection → automatic proportionate response → human
> adjudication only for the exception.** A throttle is not a sanction; it
> is **the bound doing its job**. The actual sanction (quarantine)
> requires a human.

A false positive costs you throughput, never your parcel. **Fail-safe.**

## Adjudication splits by law shape

| Shape | Adjudicated by | The question |
|---|---|---|
| **parameter** | nobody — impossible to violate | — |
| **bound** | court, **on exception only** | not *"did you exceed"* (arithmetic) but *"should you be excused"* (judgment) |
| **standard** | court, always | pure judgment; the venire pool primitive |

The rules-vs-standards fork from legal-code, now with the middle term
where all the balance work actually lives.

## ⭐⭐⭐⭐ The standing ladder

An earlier draft said *"the detection is public, so anyone can bring the
case."* **Overshot** — user pushback: *"you can't say any random schmo is
representing the people, not like an elected or appointed official has a
mandate to."* Correct.

But there is a wrinkle that matters: **balance violations are exactly the
injury type standing doctrine excludes.** If a parcel over-mints
competence, everyone is harmed slightly and nobody particularly — a
**generalized grievance**, which courts reject. So requiring injury-in-fact
collapses enforcement onto the executive alone, arriving at the capture
risk from the other direction.

Hence a ladder, and rung 3 is the valve:

| Who | When | Analogue |
|---|---|---|
| **the supervising office** | any breach — the default | prosecution; the mandate is real, since the seat is filled by the same conviction process as everything else |
| **an injured party** | your over-minting concretely devalued *their* position on that ledger | private civil suit, injury-in-fact |
| **a relator — anyone** | ⭐ **only after the office has publicly DECLINED** | qui tam (False Claims Act) / statutory citizen suits |

> ⭐⭐⭐⭐ **Not "anyone can sue." "Anyone can sue if the office won't."**

The office gets first refusal — and because **the declination lands on the
docket**, an executive that systematically declines is *visible*. That is
what keeps it honest.

It also puts the press in its correct role, which an earlier draft
inflated:

> ⭐⭐⭐ **The press has no standing. It has PUBLICITY.** A journalist
> reading the docket is not a litigant — they are **what makes declination
> expensive.**

⚠ **The relator's share is a live question.** Qui tam pays a cut, which is
what makes it work in reality **and** what generates nuisance suits. A
money bounty here would get farmed and collides with the shipped rail
*never reward holding a position*. **Lean: credit and renown, not coin** —
the relator's name on the docket entry. Consistent with standing being
earned rather than bought, and it fails soft if abused.

⭐ **A defence bar is a real vocation.** If the office can bring a case,
the holder needs representation — genuine unmet demand, a real skill
(reading the record), real stakes. For [vocations.md](../../vocations.md),
not for this build.

---

# Part 5 — Retroactivity: new statute over already-published content

## ⭐⭐⭐⭐ Existing content is a NONCONFORMING USE

Zoning already has the doctrine, in vocabulary the project already uses:

| Rule | Here |
|---|---|
| **it continues** | nothing you built stops working — *this is the promise that makes people build at all* |
| **it may not expand** | you cannot add more of the now-noncompliant thing |
| ⭐ **it conforms on the next substantial alteration** | **the next `saveTemplate` runs the current lint** |
| **no retroactive blame** | the breach ledger starts at enactment — Art. I §9, here just *"the sweep begins when the law does"* |

⭐ **The conform-on-touch rung is nearly free**, because
`TemplateApi.saveTemplate` is *already* a universal chokepoint — the
code-trust gate lives there. **The CMS save path is the compliance
boundary.**

And the notification path already exists: a compliance failure surfaces as
a **diagnostic on the holder's own content**
([diagnostics.md](../../subsystems/diagnostics.md)), in the `errors` pane
they already use.

## When grandfathering cannot apply

Sometimes continuation is the very thing being stopped — the parcel is
minting votes at 100× and that is the point of the statute.

> ⭐⭐⭐ **A statute that cannot grandfather must declare its own sunset
> window and its own compensation.** No silent breakage — and the cost of
> breaking someone's work is paid by the legislature that chose to break
> it, out of `appropriation`.

**Making the legislature price its own retroactivity** keeps disruption
possible but expensive, which is the correct incentive. It is the takings
clause, and it costs one existing instrument type.

## ⚠ The sneaky third case — old law, new engine

Not new law over old content: **an engine release that changes what a
meter means.** Every bound written against it silently re-scopes.

> **An engine release that redefines a meter must lapse-or-migrate every
> bound written against it, visibly on the docket.** Silent re-scoping is
> the one failure mode that would make the whole record untrustworthy.

---

# Part 6 — The institution

## ⭐⭐⭐ Regulatory in shape, prosecutorial in nothing

> **User: "enforcement is executive not legislative isn't it? Some kinda
> DOJ, isn't that the model? Or is it more corporate, some kinda
> regulatory body?"**

**DOJ is the wrong shape.** Prosecution is discretionary, adversarial,
case-by-case and punitive. What is actually being enforced is *a bound on
a meter, measured continuously, with a throttle as the automatic
response.* That is **supervision**. Basel is the closest fit: the ratio is
in law, the supervisor monitors, breach triggers automatic consequences,
and only the exceptional case goes adversarial.

But "regulatory agency" carries the hazard to design against:

> ⭐⭐⭐⭐ **The office supervises. It does NOT make rules.** No delegated
> rulemaking — that is what makes real agencies powerful, and it collapses
> the legislature into the executive. The bound comes from the
> legislature, the meter from the engine; the office's only discretion is
> **whether to bring the exception case**, and the relator rung checks
> even that.

## ⭐⭐ The PM heads the executive, period

⚠⚠ **CORRECTED 2026-08-04.** This section previously argued *"two hats,
never one office"* — that the diegetic PM must be kept apart from the
code-trust chain or the executive would inherit code-trust by succession.
**That was the same backwards guarantee as Part 1's, and it is rejected
for the same reason.** The user's call:

> **User: "the PM. And the PM seats the ops office. The PM heads the
> executive period."**

So the seat access.md defers *above* `archwizards` is now specified, and
it is one office:

> **PM → archwizards → wizards**, with the PM seated by the polity.

⭐⭐ **This makes code-trust politically accountable for the first
time.** Archwizard membership is env-seeded and operator-managed today —
entirely outside the fiction. An elected seat above it means the whole
chain answers to somebody, and the *"community governs its world"* claim
stops being partial.

⚠ The obvious risk — **a captured PM revoking every wizard** — is exactly
what Part 1's inalienable-content floor absorbs. They can take the keys
to the engine; they can never take your ability to author. **That floor
is the backstop, not decoration.**

⭐ **Appointment is not exercise.** Build-1's organization doctrine keeps
the powers apart with no extra machinery: *the appointing authority
appoints, the position acts.* The PM **seats** the ops office without
**holding** ops — and a PM who wants to do ops themselves must appoint
themselves, which is a visible line on the chart rather than a quiet
capability.

### ⭐⭐⭐ Why ops is its own seat: it encapsulates the unmeasurable

> **User: "we'd want to encapsulate everything we can't track inside the
> engine: aws, mongo, the blockchain. We probably don't want that leaking
> out to other institutions."**

That is a principled reason for the office rather than an org-chart
convenience, and it is **the exact complement of this slate's own rule**:

| | |
|---|---|
| *A matter cannot be legislated until it is metered* (Part 2) | everything else |
| ⭐ **Ops is the domain where metering is IMPOSSIBLE — so it gets a person instead of a bound** | AWS · Mongo · the anchoring chain |

Consequences worth holding:

- ⚠ **Its accountability is TESTIMONY, not measurement.** Everywhere else
  the record derives and cannot be forged; here it is self-reported.
  Pretending otherwise would be the dishonest move — the answer is not a
  better audit but **keeping the surface small**.
- ⭐ **The office should SHRINK.** Anything that becomes measurable leaves
  ops for ordinary governance. **Compute is the first candidate** — a
  metaresource today whose allowance ships inert, so it sits in ops until
  the meter exists and then departs.
- **Containment is the point**: these capabilities must not be reachable
  from a locality committee, a guild or a corpo — not because those
  bodies are untrustworthy, but because **no mechanism could hold them to
  account for it.** There is no ledger to check them against.

⚠ **Authority and delivery separate.** The office is the *legitimating*
fact; the **delivery path must not require a healthy world.** An
operational announcement is needed precisely when things are broken, so
if it depends on the office registry being readable, the outage eats the
outage announcement.

## ⭐⭐⭐⭐ Publishing is three different problems, and only one is governed

Captured 2026-08-04, after an earlier draft built an elaborate editorial
apparatus for all of it. **User: *"you're overthinking a lot of this."***
Their decomposition, which is the one to keep:

| | What it actually is | What it needs |
|---|---|---|
| **operator announcements** | ops, out of fiction; *"the medium doesn't really matter"* | the ops seat above. **No committee, no lineup, no editorial anything** |
| **"she's live"** | a **product feature** | a notification default, **opt-out**. ⭐ No authority near it |
| **everything else** | *"an industry publishing and broadcasting, modelled in fiction, staffed by committee"* | the editorial apparatus — **and it is CONTENT** |

### ⭐⭐ The third case is a trade pack, not platform architecture

Broadcasting is an industry like any other — tools, a workspace, roles,
output, consumers. So it ships in a pack
([content-packs-slate](./content-packs-slate.md)) and gets staffed like
any organization. Which dissolves most of what an earlier draft was
building:

> ⭐⭐⭐ **There is no "the" editorial office.** There are **many
> publishers**, each governed by whoever holds it — a council channel by
> its committee, a corpo affiliate by its owner. The front page is not a
> seat of power; it is whichever publisher the client shows first.

Same for ranking. It is not one legislated formula for the world, it is
**a publisher's editorial policy**, and how it is authored depends on who
owns that publisher.

### ⭐⭐⭐ Authority is required to PUSH, never to PUBLISH

The rule underneath all three cases, and **the third time it has
appeared** — [gazette-slate](./gazette-slate.md) reached it as *"the
state publishes to a PLACE; a publisher pushes to PEOPLE."*

> **Anyone may speak. Only a position may make everyone hear it.**

- **Tuning in is unrestricted** — ⭐ and the source *need not be a player,
  in the fiction, or a user at all*. **You can tune into anyone.**
- **Syndication is the editorial act** — deciding what goes on a channel
  others receive by default. That is the thing worth democratizing.
- ⭐ **Promotion is therefore a publication, not a permission.** A
  publisher does not grant you a capability; it publishes *"X is live."*
  Attributed, on the record, no new mechanism.

⭐ **Democratic ≠ algorithm-free** (user's correction). *"It just means
the algorithm is authored democratically as well."* An algorithm is not
undemocratic — **an unamendable one is.** And a ranking formula is a
weighted composite, so this is Part 2's rule again: **the weights are the
denominator, and the denominator is where all the design is.**

### The two senses of public/private that actually cause trouble

User's, and worth fixing as vocabulary because they cross-cut:

> ⭐⭐ **Fiction-public means answerable to a CONSTITUENCY. Parcel-public
> means NOBODY HOLDS TITLE.**

A Terminus city council is the first without the second — a public body
operating on privately-held ground, which is the normal case rather than
a contradiction. A corpo network affiliate is neither.

⚠ Note `/compact` is **not a parcel at all** — build-1 is carving it as a
publications namespace that is explicitly *not a place*. Which reinforces
the split: **the public tier is a namespace, not land.** Public bodies
publish there; everything else publishes where its owner's title is.

### The one concrete gap in case 2

Notifications are **already per-user**, with **no way to set a default or
mandate one**. That is a tier in an existing chain, not a subsystem —
`LocomotionApi.defaultModeFor` already resolves *explicit setting →
bodyplan → universe*:

> **explicit user setting → community default → platform default**

**Opt-out falls out for free**, because the user's explicit value already
wins. ⚠ Keep *default* and *mandate* separate and be stingy with the
second — an unoverridable notification is a spam vector, and the only
honest use is ops-critical, which is case 1 and a different path anyway.

### ⚠ Proposals here that the user has NOT ruled on

Recorded so they are not mistaken for decisions:

- **A docket of what was NOT carried.** Editorial power is the power to
  exclude, so a lineup alone shows only winners — *the same Roll/docket
  split legal-code already uses.* Argued twice; not adjudicated. Cheap to
  add while build-1's feed is being built, expensive after.
- **Must-carry obligations** (emergencies, right of reply, *"N slots for
  first-timers"*) as legislated floors under editorial discretion.
- ⭐ **Putting something on air is editorial; taking it off is
  operational.** Different act, different gate — and a kill switch that
  needs an appointment is not a kill switch. Watch that it does not
  quietly become a backdoor editorial veto.
- **Discovery by world context rather than category** — *"three people
  are streaming from the Ferrow delve."* ⚠ Only matters at scale; with a
  dozen streamers a complete list *is* discovery.
- **The lounge screen + remote** as the same problem at room scale (the
  remote is pull, the channel is push). User: *"I don't hate any of it."*

## ⭐⭐⭐ Removal, not confirmation, is the lever — and conviction already provides it

Appointment power without removal power is weak. **Removal is where
control lives** — the whole unitary-executive fight turns on for-cause
removal protection. So the question is never *"does the legislature
confirm"* but *"can the PM fire the supervisor for enforcing against the
PM's allies."*

**Fixed terms are foreign to this substrate** — conviction is continuous,
there are no election days. Instead:

> ⭐⭐⭐⭐ **Removal requires a conviction crossing, like everything else.
> The build period IS the tenure protection.** You cannot remove the
> supervisor in a bad week; you must hold the position long enough for it
> to mature.

**Settled shape:** PM-appointed · legislative confirmation as an ordinary
vote (free — same enactment path, different resolver) · **removal only by
a crossing** · **its own conviction question**, not riding the PM's (user's
call — it is what makes removal-by-crossing mean anything).

## The inflation risk — and why we are NOT building an independent regulator

> ⚠ **A legislature of players will vote itself faster progression.** That
> is inflation, and it is the most predictable failure mode of player
> governance.

The three chambers are the designed answer, and the fund chamber is a
better anchor than first credited: **its standing is the only one tied to
a signal from outside the game.** Three honest weaknesses, specific to
this question:

1. ⚠ **The timescale is inverted.** Faster progression feels good
   immediately; churn shows up months later; conviction build periods are
   days. Textbook **time-inconsistency** — precisely why central banks were
   made independent. *The mechanism is right, the clock is wrong.*
2. ⚠ **Play + make are not natural opponents here.** Players want richer
   progression; content makers largely want their content to feel
   rewarding. Fund is the only likely objector and **2-of-3 outvotes it.**
   The check is weakest exactly where it is needed.
3. ⭐⭐ **Patronage is not equity, and that cuts against the guard.**
   *(User: "we're not actually representing capital, we're only
   representing patronage, since you don't have equity — but that's what
   it's supposed to simulate.")* **An equity holder is exposed to terminal
   value; a patron is exposed to this month's enjoyment.** Confirmed
   mechanically rather than by analogy: **fund standing decays in real
   time**, so it is a *flow* measure. It structurally cannot hold a long
   horizon.

### ⭐⭐⭐⭐⭐ But patronage is a worse steward and a BETTER SENSOR

Equity can be trapped — a locked-in owner votes badly for years.
**Patronage cancels.** The signal is short-horizoned but it is *current*
and *fast*, which is exactly what the timescale problem needs.

> ⭐⭐⭐⭐⭐ **So do not ask the fund chamber to RESIST inflation by voting.
> Ask it to REVEAL inflation before the churn arrives.** Publish total
> fund standing as a **trend** — bad progression policy then has a
> **leading** indicator instead of a lagging one, patronage turns down
> weeks before anyone quits, it is already a computed number, and the
> gazette already exists to carry it.

That converts *"build an institution to restrain the polity"* into *"make
the consequence visible before the vote matures"* — which is this
project's actual thesis, and roughly free.

### ⭐⭐⭐ Therefore: ship the cheap version

For a polity that might be twelve people, an insulated office with removal
protections is heavy apparatus against a risk that two cheap things
already cover:

1. ⭐⭐⭐⭐ **The asymmetric ratchet — loosening is always the harder act.**
   Structural, no institution, and it is **the same rule as
   particular-exemption**, so one principle covers self-dealing in both
   directions. It also fails toward a *deflationary* world, which is
   recoverable; runaway inflation is not.
2. **The fund-standing trend, published.** Leading indicator, free, and it
   hands the press the story.
3. **The supervisor is an ordinary cabinet seat**, insulated by the build
   period rather than a special regime.

> **Independence stays an amendment-library MODULE for when the polity is
> big enough that it is a live problem. Ship the cheap version; the
> expensive one is an entry, not a default.**

---

# Part 7 — Teaching it, and disclosure

## ⭐⭐⭐⭐ The tutorial for governance is a THERMOSTAT, not a civics lesson

> **User: "we have to teach people how to actually govern this game, and
> if we don't know ourselves we can't design a system that's intuitive."**

If someone's first encounter with legislation is *"draft a statute,"* they
are lost. If it is:

> *"This locality mints competence at 4.0/hr. This proposal moves it to
> 3.5. Here are the ten parcels affected. It passes Thursday 14:00 unless
> something changes."*

— that is legible to anyone, and the countdown half already exists.

**One bound, one number, a visible effect, a reversible decision.**

Which argues for shipping the founding statutes **already in bound form**
as received law (`enactment.process: founding`), so the first governing act
anyone performs is an **amendment**, not a draft.

⭐ And the honest pitch: balance is contested, unglamorous and never
finished — good for retention, it is a permanent job — but it means you
are selling **"you run the economy,"** not *"you write the laws."*

## Disclosure — positions, not standing (and what that cannot hold)

Settled: **positions are public; standing is not.** Delegation confirms the
cut — **accountability needs DIRECTION, not MAGNITUDE.** Since delegation
steers rather than transfers, the delegate's displayed position is their
own and that is the whole audit surface.

⚠ **But the split leaks.** Positions public + tally public ⇒
**differencing recovers individual standing** (a solo flip moves the tally
by exactly twice that person's weight). Not an attack — subtraction. And
**do not reach for banding**: *band never defends.*

> ⚠⚠ **In a polity of a few dozen, NOTHING AGGREGATE IS PRIVATE.** Small
> population + frequent observation defeats aggregation generally.
> Aggregation must never be load-bearing for privacy here.

The leak bites in one place — fund standing is ~proportional to money
spent — and the right response is to reframe rather than plug:

> ⭐⭐⭐ **The private thing is the PAYMENT, not the political weight.**
> *"Bob paid $40"* is a financial fact and stays in the ledger. *"Bob
> carries weight w in the fund chamber"* is a **political** fact — and in a
> polity where money buys voice, **that is precisely what the polity is
> entitled to know.** Campaign-finance disclosure exists for this reason;
> concealed money-derived influence is the failure mode.

**Adopt disclosure deliberately and say so**, rather than promising a
privacy that differencing quietly removes. The **aggregate trend gauge** is
untouched by this — chamber health as a published number is a different
artifact from per-person weight, and stays aggregate.

### The delegation graph — a ratification knob with a one-way hinge

*(User: "personally I like public, but probably I'm in the minority. Either
way this is something that can be configured easily during ratification.")*

Agreed, and it should **extend the existing ballot-secrecy
amendment-library entry** rather than mint a sibling — it is the same
question one level up.

Lean: **received weight public** (or you cannot see who the real power
brokers are); **the edges private** (delegation is trust in a *person*,
more socially loaded than a stance, and a public graph invites *"why are
you backing them"*). Stated as a **norm, not a guarantee** — at this scale
a solo delegation change is visible by subtraction anyway.

> ⚠⚠ **The one asymmetry that must be written into the entry: this
> ratchets ONE WAY.** Private → public is a switch. Public → private is
> not — what has been observed stays observed. **So the reversible
> direction is the safe default even for someone who prefers public**: ship
> private-by-default, and a polity that wants public gets there in one act,
> losing nothing and keeping the option that cannot be recovered later.

---

# Part 8 — The micro layer: what an author claims, and what the machine may never touch

Parts 1–7 are macro: mint rates, denominators, the docket. They leave the
per-object question open — *is this sword right, is this encounter's
payout right* — and they leave unanswered how a technologically advanced
locality is supposed to coexist with a prehistoric one without either
flattening both or auditing every item. This part is that half.

## ⭐⭐⭐⭐⭐ A declaration may never be an INPUT to a meter — only a PREDICTION it is checked against

The obvious micro design is *let content authors declare how risky and how
rewarding their content is.* **Advancement already refused exactly that,
and its reason is the general one.** From
[advancement.md](../../subsystems/advancement.md) on `ActSignature`:

> **Difficulty is a world-measurement, not a tag** — the route's length,
> the lot's ambiguity, the live competition. You can't farm a hard attempt
> by relabeling.

Correct, because that difficulty feeds the BKT estimator directly: it is a
**numerator input**, so a tag would be a mint with an author-controlled
dial. Any declaration wired that way is broken the moment it exists.

But this does not forbid claims — it tells you the shape a safe one has:

> **A declaration may never be an INPUT to a meter. It may only be a
> PREDICTION the meter is compared against.**

Declared risk and reward are safe **precisely because they compute
nothing**. The claim is the null hypothesis; measurement is the test. This
also retro-explains *undeclared ground mints nothing* (Part 3): the
declaration gates **permission**, never **magnitude** — and that was
always why it was safe to let holders write it themselves.

⭐ **The enforcement dividend: nobody has to inspect content.** The
machine never forms an opinion about a sword or an encounter. It compares
what a parcel claimed against what it did, and divergence is the entire
signal. That is what keeps the micro layer from becoming a content-review
bureaucracy the polity cannot possibly staff.

### ⭐⭐⭐⭐ The mirror-image firewall — and why ops does not become a shadow regulator

Part 6 puts capacity/compute under ops, whose accountability is
**testimony, not measurement**. Pricing content by its claim therefore
looks like it hands a balance lever to the one seat that cannot be
audited. The rule above has a mirror that closes this:

> **Provisioning responds to the DECLARATION. The regulator responds to
> the MEASUREMENT. Neither reads the other's input.**

Ops sizes capacity from what you *claimed*; the sweep throttles on what
you *did*. Ops never sees an outcome, so it has nothing to punish with,
and the seat keeps shrinking as instrumentation grows exactly as Part 6
wants.

⚠ This is a **structural** firewall, not a policy one — it has to be true
of the wiring, or it is worth nothing. Compute allocation reading a
realized mint rate is the specific thing that must be impossible.

### ⭐⭐⭐⭐ Why the honest declaration is the optimum

The two consumers push on **one number from opposite sides**:

| | Over-declare | Under-declare |
|---|---|---|
| **Provisioning** (reads the claim) | pay for capacity and allowance you don't use | cheap |
| **The sweep** (reads the outcome) | slack, never binds | measurement overruns the claim → throttled |

⇒ **incentive-compatible without an enforcement act.** Same mechanism as
*declaring is how you turn your parcel on*, one axis over: the machine
never has to decide whether you were honest, because dishonesty in either
direction costs you.

⚠ It is only incentive-compatible **if capacity is genuinely scarce and
genuinely priced.** If declaring big is free, the pressure is one-sided
and every parcel declares maximum. That makes the compute quota
load-bearing for balance — a real coupling, and the reason the firewall
above has to be structural rather than a convention.

## ⭐⭐⭐⭐ The shape of the stock decides which lever exists

Money, gear and advancement are not three subsystems needing three
policies. They are three **shapes**, and the shape determines which levers
are even available:

| Shape | Example | Regulator | Why |
|---|---|---|---|
| **Flow with a drain** | money | the conservation chokepoint (`bank_ledger`) | two-sided; a wrong rate self-corrects through sinks |
| **Damped stock** | gear | a **negative-feedback faucet** — the census | a drain exists (`DurableMixin` wears on strike and on blow), so the faucet backing off is sufficient |
| **Monotone stock** | advancement | the faucet, and nothing else | no drain is *possible* — Competence cannot be un-granted |

⭐⭐ **The gear regulator is already shipped, and it is deliberately not an
allocation.** [magic-items.md](../../subsystems/magic-items.md) § *The
census*:

> **Authored placement counts and spends nothing.** It simply shows up in
> the census, and the random channel backs off on its own. **No
> allocation, no budget, no new economy** — an allocation would be a new
> resource needing an owner, a ledger and administration, and the
> corrective already exists: **decay**.

And it **binds regionally, never globally**, so one author's hoard cannot
starve the world. Generalizing *that* is the gear-side build: a damper,
not a quota. It needs no owner, no ledger, and — the point — **no
politics**, which is why it should be the model wherever a stock has any
drain at all.

⚠ **The census's own precondition is the drain.** A damped stock whose
drain doesn't actually bite is a monotone stock wearing a disguise, and
rate regulation on it is theater. Before treating any new stock this way,
check that its sink is real and that players cannot opt out of it.

### ⭐⭐⭐ The doctrine that falls out: irreversibility sets the difficulty of the lever

This is the asymmetric ratchet of Part 6 derived from mechanics rather
than from politics, and it generalizes past self-dealing:

- A **flow** may be tuned freely — errors drain.
- A **damped stock** may be tuned only if the drain is also in scope. A
  statute that opens a faucet without touching the sink is measured in the
  wrong unit (Part 2's rule, applied to stocks).
- A **monotone stock** ratchets one way, and **loosening is the hardest
  act in the system** — because there is no mechanism, at any price, to
  take it back.

⭐ **This is also the honest answer to "can the legislature vote itself
faster progression?"** (Part 6's inflation risk). It can — and advancement
is precisely the stock where that vote is *irreversible*. The trend
sensor is the early warning; the ratchet is the brake; neither is a
prohibition, and neither should be.

## ⭐⭐⭐⭐ Tech tier: immersion is a REVIEW-time concern, and the machine must not defend it

A technologically advanced locality has better armor than a prehistoric
one. That is not an imbalance to be corrected — flattening it *is* the
immersion break. The distinction the machine has to hold:

> **Effectiveness and reward are different quantities.** The plasma rifle
> really is better than the flint spear on the shared
> mechanism→channel→material grid. The neolithic parcel really is weaker.
> That is the interoperability layer working as designed.

⇒ **the machine regulates price and never touches power.** Tech tiers are
therefore **free** — they cost the balance system nothing, because an
advanced civilization's gear being hard to come by is already the fiction,
and where it isn't, the parcel is a mint and Parts 1–4 already handle it.

⚠⚠ **A mechanical tier gate is the soulbound reflex in a new costume.**
Part 1 retracted "just make it soulbound" because it forbids the thing the
game is for — *the laser gun in Westeros*. "Content may not exceed its
declared tier" is the same prohibition re-derived from immersion instead
of from balance, and it must be refused the same way and for the same
reason.

⇒ **coherence is defended at review time, by the pack layer** — a human
saying *"your bronze-age locality mints plasma rifles"* during the trade
that a pack already is (see
[content-packs-slate](./content-packs-slate.md)). Editorial, revisable,
and carrying no runtime authority. A declared tech tier is then useful
**metadata for discovery, the wiki and the press**, and reads into no
meter — Part 2's *banding is presentation, not security*, one more time.

### ⭐⭐⭐ The real hazard tech tiers create is adjacency, and it is not a balance problem

A spacefaring parcel next door to a bronze-age one kills the bronze-age
one: nobody plays it, or its content is farmed for nothing by visitors it
was never priced against. **That is map topology, not numbers** — travel
cost is what has always separated difficulty tiers, and the freight
slate's von Thünen geometry is the instrument.

⇒ keep it **out of the balance machine deliberately.** Attacking it with
rate regulation would mean regulating a parcel for what its *neighbour*
can afford, which is the exemption-generator shape all over again.

## ⭐⭐⭐ The set of meters is the real constitution

Part 2 says *a matter cannot be legislated until it is metered.* Stated
from the other end:

> **The meter set bounds what the polity may even discuss, and it is
> amended only by an engine release.** It is not legislation, not
> executive, not judicial. It is the thing all three sit inside.

This is the same guarantee as Part 1's *code-trust is revocable, content
authorship is inalienable* — read from the constitutional side rather than
the personal one. **Adding a meter is the most consequential act available
to anyone**, more so than any statute written against it, because it
creates a subject the polity did not previously have. ⚠ It also carries
Part 5's third retroactivity case: a release that redefines a meter must
**lapse-or-migrate** every bound written against it.

## The three branches, and the one thing that is not a branch

| | Reads | Writes | Failure it owns |
|---|---|---|---|
| **Legislature** | the meters | the **schedule** — declared class → entitled rate, and the denominators | a wrong denominator |
| **Executive** | measurement (sweep) · declarations (provisioning), **never crossed** | throttles · capacity · the docket | a missed or over-eager throttle |
| **Judiciary** | the divergence record | findings on **particular** cases | attribution being wrong |
| *(not a branch)* **the engine** | — | the meter set | a matter that cannot be discussed at all |

### What the judiciary actually hears

Parts 1–7 leave this thinnest, and Part 8 makes it concrete: **the court
is the residual for particularity**, which both other branches are
structurally denied. Two dockets:

1. **Attribution disputes** — *"the mint the sweep attributed to me was my
   neighbour's exploit routed through my ground"*, or the cross-parcel
   act of open question #8. Part 1 already accepted the cost: **detect
   statistically, act by adjudication.** This is that adjudication.
2. **Misprice petitions** — content the schedule genuinely prices wrong,
   where Part 2's answer (*a bound needing exemptions is measured in the
   wrong unit*) is right in general and cannot be waited for in
   particular.

⭐ **Neither docket is discretionary to open** — the standing ladder of
Part 4 already says who may raise them, and the sweep already produces the
record they argue over. **The court never inspects content either.** It
argues about a divergence the machine found, which keeps its workload
proportional to anomalies rather than to the size of the world — the only
version a twelve-person polity can staff (open question #7).

⚠ **The remedy vocabulary is the danger.** Part 4's *the machine
throttles, never punishes* must survive contact with a court, or the
judiciary becomes the punitive organ the executive was deliberately not
given. *Leans: the court may adjust an attribution or grant a variance,
and has no remedy the sweep does not already have.*

---

# What is actually net-new (the build surface)

Small, which is the argument for doing it:

| # | Artifact | Size |
|---|---|---|
| **0** | ⚠⚠ **The jurisdiction stamp on ledger writes** — ✅ **audited 2026-08-06**; `producer_events` already has it, 2 fields are dead, 4 ledgers have none. Reshaped into 0a–0c below | **the blocker** |
| **0a** | **Plant the parcel extent at the command root** — the `getJurisdictionBound` slot exists; `CommandGiver` computes the path one line away | small |
| **0b** | **`actingParcelKey()`** beside `actingActorKey()`, and **DELETE `postTransaction`'s `opts.locality`** (a caller-passed stamp is spoofable) | small |
| **0c** | ⚠ **Decide whether title and jurisdiction trees are congruent** — two longest-prefix hierarchies, neither derived from the other | **a design question** |
| 1 | **The enumeration** — both halves: the cross-jurisdiction ledgers ⊕ the closed vocabularies | a list |
| 2 | **The validity predicate** in the codification lint (void-at-write) | a predicate |
| 3 | **The `bound` instrument** — the missing middle law shape | the real work |
| 4 | **The class-per-matter declaration** on `ParcelRecord`, beside `landUse` | one field |
| 5 | **Undeclared ⇒ mints nothing** — the fail-closed capability default | a default |
| 6 | **Breach entries in the docket sweep** — reuses the shipped skip-test | small |
| 7 | **Quarantine** — closing a crossing; nothing can do this today | new |
| 8 | **Conform-on-`saveTemplate`** — the compliance boundary at an existing chokepoint | small |
| 9 | **Lapse-on-amendment** for bounds whose meter was redefined | small |
| 10 | **The cross-parcel attribution rule** (#0's stated edge case) | a rule |
| 11 | **The prediction half of the declaration** (Part 8) — claimed risk/reward beside #4's class, feeding nothing | one field |
| 12 | ⚠ **The provisioning↔measurement firewall** — structural, or Part 8 is worth nothing | a wiring rule |
| 13 | **The census damper generalized past magic items** — any stock whose drain is real | medium |
| 14 | **The two divergence dockets** — attribution and misprice; reuses #6's sweep record | small |

⚠ **Sequencing: #0 gates literally everything.** Then #1–#2 are
meaningless without #3, and #3 is meaningless without meters that exist.
**The instrumentation gates the rest** — see the Part 2 constraint.

⭐ **Portable objects need no new gate** — the vocabularies half of the
enumeration is already closed engine code, and the rest is a denominator
question, not a mechanism. But #0 grows: outcome-metering needs the stamp
on **both** the visit and the downstream write, or the delta is not
attributable to a parcel at all.

⚠ **What #3 must NOT become:** a per-item power metric. Outcome-metering
exists precisely so no one has to price a sword.

# Open questions

1. **Does the class-per-matter declaration ride `landUse`'s row or a
   sibling field?** *Leans same row* — same act, same politics, same audit
   path.
2. **Accessory-use threshold: a constant or a parameter?** Parameter makes
   it legislable (right) but is also a dial someone will aim at a rival's
   side business.
3. **Is the throttle visible to the PLAYER or only the holder?** A player
   whose competence silently stops accruing will report a bug. *Leans
   visible and named* — *"this ground has reached its rate"* — which also
   makes the politics felt at the point of contact.
4. **Does `on-breach` need a vocabulary at all, or is throttle always the
   answer?** More remedies is more expressive; every entry is a lever
   someone will aim at a rival.
5. **Bound per-parcel, per-locality, or per-player?** Per-parcel is
   checkable and targets the actual mint; per-player is what balance
   actually cares about but is gameable by spreading across parcels.
   *Leans: bound the parcel, MEASURE per-player* — the ratio is the honest
   unit.
6. **Relator's share — credit only, or is that too weak to motivate?**
7. **Who staffs the courts** for the exception cases in a twelve-person
   polity? The venire pool primitive exists; the population may not.
8. ⚠ **Where does a ledger write land when the act spans parcels?**
   *Leans "where the acting principal stood"* — but it must be declared,
   or it is an arbitrage surface.
9. ⭐ **What is the first crude denominator for each matter?** It is meant
   to be wrong and amendable — but *"wrong"* and *"junk"* are different,
   and a junk v1 discredits the whole instrument before anyone amends it.
10. **How long is the downstream window for outcome-metering?** Too short
    and slow-burn rewards are invisible; too long and attribution
    dissolves entirely.
11. ⚠ **Does risk-as-variance need a floor for low-traffic parcels, or do
    they simply go unmeasured?** Unmeasured is the honest answer and also
    the exploitable one — *"stay small to stay invisible"* is a strategy.
12. ⚠⚠ **Is capacity scarce enough to price?** Part 8's incentive
    compatibility depends on over-declaring actually costing something.
    On one Lightsail box it plausibly is; if the answer is *no*, the
    declaration has one-sided pressure and every parcel declares maximum,
    and the prediction half needs a different counterweight.
13. **What unit does a claim attach to?** *Leans the parcel × matter* —
    the same row as #4, because that is what the sweep can already see and
    what longest-prefix already resolves. The engagement is the tempting
    alternative (bounded, typed, has an outcome) but too fine, and much
    minted value never passes through one (crafting output, growth, sale).
14. **Does the census damper need a declared par per matter, or does
    regional stock alone suffice?** Magic items get par from
    `ResettableMixin` holders; a general stock may have no such holder.
15. ⚠ **Can a court's variance be granted without becoming the
    particular-exemption abuse of Part 3?** A variance IS a named
    benefit. *Leans: time-boxed and published, so it is a visible
    standing invitation to legislate rather than a quiet carve-out* —
    but this is the sharpest unresolved tension in Part 8.
