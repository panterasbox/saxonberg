# Dossier slate — priors for a character who never lived them

**Captured 2026-09-04**, out of the `/requirements` pass on the clinic
build, which walked into this problem at its first design decision and
could not get past it.

> **User: "the general problem is for values that are derived from some
> aggregate, that's fine for players but for NPCs you need a way to write
> some single document that tells you everything you need to know about
> the npc's history and what things *would* aggregate to if real records
> were modelled."**

> **Status: design conversation, captured. Not requirements.**

**Read first:**
[cast-archetype-slate](./cast-archetype-slate.md) — ⭐⭐⭐ **this slate is
its Change 2 given a home.** That slate reached the same missing axis from
the opposite direction (*"role is what you do, temperament is how you are,
and the missing axis is where you stand"*) and settled two things this one
inherits rather than re-argues: **standing is the INSTANCE**, and **the
minting archetype must be stamped on every seeded row**.

**Substrates:** [chronicle.md](../../subsystems/chronicle.md) (deed vs
claim — **the origin of the pattern**) ·
[trait.md](../../subsystems/trait.md) (its second adopter) ·
[advancement.md](../../subsystems/advancement.md) (§ *Competence is
expressed uniformly for players and NPCs* — where it is missing, and says
so) · [renown.md](../../subsystems/renown.md) ·
[participation.md](../../subsystems/participation.md) ·
[influence.md](../../subsystems/influence.md) (⚠ the three that are
booby-trapped) · [vitals.md](../../subsystems/vitals.md) ·
[behavior.md](../../subsystems/behavior.md) (the shipped seeding path) ·
[char-gen.md](../../subsystems/char-gen.md) (the player-side precedent) ·
[document-store.md](../../subsystems/document-store.md) (the closed
`DocumentKinds` vocabulary, if the answer is a document).

**Consumers waiting:** [medic-judgment-slate](./medic-judgment-slate.md) /
the clinic build (a patient's history) ·
[health-vertical-slate](./health-vertical-slate.md) ·
[npc-behavior-slate](./npc-behavior-slate.md) ·
[llm-npc-design](./llm-npc-design.md).

---

## The problem, precisely

**Derive-on-read is the house style, and it is right.** Competence bands
derive from a Transcript of deeds. Trait positions derive from
`disposition_events`. Blame derives from `accountability_events`. Renown,
participation and influence derive from their logs. Wounds reconcile on
read. Nothing stores a number somebody could have set.

For a **player** that is honest all the way down: they accumulate real
events, so the aggregate is a true statement about a lived life.

For an **authored NPC there are no events at all.** So every aggregate
reads as its floor:

> **Dave the Barkeep is a novice bartender.** Odo the cook is a novice
> cook. Mara is a novice at the bar she runs. Every venue this project has
> shipped is staffed by people who read as having never done the job.

`advancement.md` states it in plain text rather than implying it:

> ⚠⚠ *"This is uniform EXPRESSION, not uniform authoring. Nothing writes
> an NPC's Transcript except combat … and **there is currently no way to
> state that Dave is good at bartending**."*

That is not a gap in one subsystem. It is the same gap in every subsystem
that derives, and each one is currently discovering it alone.

---

## ⭐ The pattern already exists — invented twice, homed twice

**Chronicle got there first**, and it put the answer in the *data model*
rather than in a convention:

| | `deed` | `claim` |
|---|---|---|
| what it is | something that happened | authored backstory |
| `when` | game-time seconds | **`null` — backstory has no timestamp** |
| `order` | `null` | the authored prologue order |
| `text` | rendered by `ProseApi` | authored |

`recordDeed` / `recordClaim` are separate calls, and every caller must
declare which — the kind does not survive as a default.
`seedChronicleClaims(seeds)` mints prologue entries at char-gen.

**Trait copied it** and wrote the principle down:

> *"Authored NPCs need their defining character immediately, but
> derive-don't-track means a fresh ledger is near-neutral. The resolution:
> **seed disposition evidence, not a stat.**"*

`BehavedMixin.dispositions: ClaimSeed[]` (persistent, `authorable`),
applied at `postRegister` through the host's own `seedTraitClaims`, **once**
— idempotent across re-clone and CMS go-live, because it skips if any
`claim` row already exists. Mara derives *reserved and temperate* from a
seeded history rather than from a slider.

### ⭐⭐⭐ The property that makes this safe, and it is the whole idea

The `claim` marker means **the derivation never has to pretend.** `bandOf`
stays a pure function over whatever evidence exists; it simply also knows
which evidence was asserted rather than lived. Nothing is overridden,
nothing is clamped, and no reader needs a special case.

That is why *"seed evidence, not a stat"* is not a stylistic preference.
A declared stat is a second source of truth that every future consumer has
to remember to consult. A seeded claim is the *same* source of truth with
its provenance attached.

---

## The scorecard — three grades of not-solved

Verified against the tree, 2026-09-04.

| aggregate | reads from | authored priors? |
|---|---|---|
| **chronicle** | `chronicle` ledger | ✅ `kind: 'claim'` + `seedChronicleClaims` |
| **trait** | `disposition_events` | ✅ `dispositions: ClaimSeed[]` on `BehavedMixin` |
| **advancement** | `transcripts` | ❌ **nothing** — named in the doc, unresolved |
| **vitals / conditions** | the affliction record | ❌ nothing; no backward pointer to a cause |
| **accountability** | `accountability_events` | ❌ nothing (derives, so it *could* seed) |
| **renown** | ⚠ the **`renown`** collection | ⚠⚠ seeding the log is a **no-op** |
| **participation** | ⚠ materialized | ⚠⚠ same |
| **influence** (producer) | ⚠ materialized | ⚠⚠ same |

### Grade 1 — simply missing

Advancement and vitals. Advancement even names the fork it could not
settle: an authored competence could be **declared** as a floor `bandOf`
maxes against, or **seeded** as synthetic Transcript rows — *"which differ
on whether `bandOf` stays a pure derivation over real evidence, a property
this whole subsystem leans on."*

⭐ This slate's position: the chronicle/trait precedent already answered
that fork, and answered it **seed**. The reason a floor felt necessary is
that nobody had the claim marker in view.

### Grade 2 — ⚠⚠ actively booby-trapped

> **Revised twice, 2026-09-04.** First reading: *"these are the same gap,
> seed and fold all three."* Second: *"cut all three, seeding reputation
> violates measure-don't-assign."* Both wrong, and the second was wrong on
> a bad argument. The settled reading is below, and the vocabulary is what
> decides it.

⭐ **`standing` is not a synonym for renown — it is the PRODUCT:**

```
standing = max(0, renownOf) × participationOf
```

| | is | for an NPC |
|---|---|---|
| **renown** | the **quality** half — measured reputation | ✅ seedable, as events |
| **participation** | the **quantity** half — turning up | ❌ nobody turns up for an NPC |
| **standing** | the Compact's influence stock | ❌ zero, **by arithmetic** |

⭐⭐⭐ **The Compact stays players-only with no rule enforcing it.** Dave can
be famous in the lounge and politically weightless, because his
participation is zero and zero times anything is zero. No gate to forget,
no special case to drift.

**On *"measure, don't assign"*.** It forbids writing the **figure**. It
does not forbid authoring the **events** a figure derives from — which is
this slate's founding move everywhere else. Seeding renown is the same act
as seeding a disposition or a prologue, and is legitimate for the same
reason.

⚠ **But the trap is real and now in scope for renown.**
`RenownApi.renownOf` reads a boot-warmed map from the **materialized**
`renown` collection, not from `renown_events`. So seeding the log moves
nothing until a recompute folds it, and a bare restart re-warms from a
collection the seeding never wrote.

> ⚠ *"This is the trap that made a correctly-seeded character still read
> `dormant` through a whole live drive of the S1 build."*

`RenownLogic`'s recompute is the fold; seeding must trigger it.
**Participation and influence stay untouched**, so their share of the trap
stays somebody else's.

### Grade 3 — fragmented

Even where it works, it works twice in two places: chronicle claims are
seeded from `char-gen.yaml`, trait claims from a field on the NPC row.
**Two homes for one idea — and a third adopter would invent a third.**
That is the fragmentation the provocation is objecting to, stated
structurally.

---

## ⭐⭐⭐ The join: this is cast-archetype's Change 2, given a home

The cast-archetype slate ran the whole 41-character cast through
`role × temperament` and found the residue:

> *"Everything the model misses is **what is true of this person that they
> did not choose**. Role is what you do, temperament is how you are, and
> the missing axis is **where you stand**."*

with the proof that it is load-bearing: **Jory Hocking and Bia Rovere
compile to an identical profile** — Publican × Connector — and are not the
same person, because Jory holds the slate and Bia does not.

And its resolution:

> ⭐⭐ **Role and temperament are the ARCHETYPE. Standing is the INSTANCE.**

⚠ **A word collision worth heading off.** cast-archetype uses *"standing"*
in its plain sense — *where you stand*: what you hold, what happened to
you, who you are bound to. But **`standing` is a taken term** in this
codebase: it is the derived reputation figure a `standing` verb reports
and the political-influence stock consumes. Reading the two together
implies NPCs participate in the Compact's influence economy, which they do
not and should not (Grade 2). **This slate therefore says
"circumstance"** for cast-archetype's axis — *what is true of this person
that they did not choose*, which is that slate's own definition. The
rename is local to this document; cast-archetype keeps its word.

It then made standing **three pointers into shipped registries** — history
→ a chronicle prologue ref; holdings → a title or a seat; relationship → a
bond — explicitly so the archetype would not become a dumping ground.

**That is exactly right and it is not enough.** Pointers work for the
three axes that already have a registry to point *at*. They do not cover:

- **competence** — there is no registry of "Dave is good at bartending" to
  point at; the Transcript is the registry, and it is empty;
- **the body** — a scar, a healed break, a bout of something years ago;
- **the materialized trio**, where a pointer resolves to a figure that the
  seed never moved.

> **So: the archetype says who this kind of person is. The dossier says
> what this particular one has been through — including the parts no
> registry is holding yet.**

The two are one build's worth of design and should be settled together.
This slate is the standing axis; that slate is the archetype axis; and
[the stamp requirement](#the-stamp-requirement) below is shared.

---

## What a dossier is

**One authored artifact per character** holding every prior that any
derive-on-read aggregate needs, expressed as **seeded evidence carrying
the `claim` marker** — never as declared values.

Sketch, deliberately not a schema:

```yaml
# the standing axis — what is true of Dave that Dave did not choose
prologue:                    # → chronicle claims
  - "Kept the Rejection bar through the bad winter."
competence:                  # → transcript claims
  - { discipline: bartending, asserting: competent }
  - { discipline: mixology,   asserting: practised }
history:                     # → condition / body claims
  - { condition: healed-fracture, part: left-wrist, era: "long ago" }
circumstance:                # → pointers, per cast-archetype Change 2
  holdings: [ /world/rejection/parcel/bar ]
  bonds:    [ { to: /world/rejection/agent/mara, kind: employs } ]
renown:                      # → seeded events + a fold (Grade 2)
  - { scope: rejection, asserting: known }
# ⚠ no participation, ever — that zero is what keeps an NPC out of the
# Compact, and it wants no rule to hold.
```

Four properties that matter more than the shape:

1. **Evidence, not values.** Each entry expands into the same rows a lived
   history would have written, marked `claim`.
2. **Idempotent, once.** The `dispositions` precedent exactly — applied at
   `postRegister`, skipped if claims already exist, so re-clone and CMS
   go-live cannot mint a second history.
3. **It states its intent.** `asserting: competent` is the author saying
   what this *should* read as. Which makes it checkable — see below.
4. **It is not the row.** The row says what the character *is*; the dossier
   says what they *have been*. Whether that is a separate document or a
   block on the row is [an open question](#open-questions), not settled
   here.

### <a id="the-stamp-requirement"></a>⚠⚠ The stamp requirement, inherited

From cast-archetype, and it applies to every kind of seed this slate
introduces, not only dispositions:

> *"To compute deviation from archetype, a seeded row must record **which
> archetype minted it**. `DispositionEntry` today carries `kind: 'claim' |
> 'deed'` — enough to separate authored from earned, **not enough to
> separate archetype-claim from deviation-claim**. … Stamp the minting
> archetype on the row. It costs one field now and is unrecoverable
> later."*

⭐ And the reason it generalizes: *an authored deviation and an earned
drift are the same quantity*, differing only in when they were written and
by whom. `deviation = current derived position − archetype baseline` is
computable for competence and standing exactly as it is for dispositions —
but only if the seams survive. Provenance separability is the one property
that cannot be retrofitted; unwinding a sum with no seams is not possible
later at any price.

---

## ⭐⭐⭐ The identity rung — `Extra` and `Cast` as two classes

> **User: "split up our NPC class into cast vs prop NPCs. cast gets Named
> and a dossier, props just play roles like 'a guard' or 'a fisherman' …
> the reasoning is that cast is bespoke, they get customized and diverge
> from archetypes. not only because they get real deeds but also because
> authors will do that. extras or props don't get that treatment, so the
> thinking is that they're only archetype and nothing else."**

This is the same line as everything above, drawn at the class level — and
[cast-archetype-slate](./cast-archetype-slate.md) had already reached it
from the archetype side. Its answer stands and is not restated here:
**one archetype, two compilation targets** — *a mask on a prop; a birth
certificate on cast*. A lens is the same estimator with the save step
omitted, so the two sides cannot drift apart, and promotion is minting an
identity and re-running the archetypes in seed mode.

What this section adds is the **class**, the **name**, and the half that
was still open: **the write side**.

### ⭐ The finding: it protects a property that currently holds by accident

Every ledger keys on `Stuff.getIdentityPath()`, which returns
`#identityPath ?? getTemplatePath()`. So every instance cloned from one
template row shares one ledger.

**But every NPC row in the tree is instanced exactly once** (verified
2026-09-04 across all shipped locality rows — Dave, Mara, the registrar,
the collier, the smelterman, each one row and one body). So identity is
*already* individual for every named character, and the ledgers already
work — **for free, and by accident.**

⚠⚠ Which means the split is not about *granting* cast an identity. It is
about protecting a property nothing currently enforces. The moment
somebody writes `a guard` and stands it in six rooms — which is precisely
what "extras play roles" invites — those six guards silently share a
ledger, and one guard's deeds bank into all six. No error, no warning.

> ⭐ **The extra class is not the downgrade. It is the safety rail.** It
> exists so the ledger question is answered at authoring time instead of
> discovered later.

### The naming — `Extra`, not "prop"

⚠ `props:` and `cast:` already mean something precise one level down: a
**declared designation** on a location row with a `Behaved` gate in both
directions. The food-safety build hit it — a corpse under `cast:` refused
to hydrate and took the whole login with it.

A role-filling NPC **is** `Behaved` and therefore goes under `cast:`. So
calling it a "prop NPC" would make the word mean two different things one
level apart, in a codebase that has already paid for that confusion once.

Theatre owns the right word: an **extra** is exactly *a guard, a
fisherman*. So the two classes are **`Extra`** (the default) and
**`Cast`** (the one that earns a dossier), and the collision never
happens.

### ⭐⭐ The grammar already encodes it, and nobody planned that

39 characters ship. **26 carry a proper `name:`.** Of the 13 that do not,
the shortDescriptions split on the **article**, cleanly and consistently
(the remaining three are animals):

| | rows |
|---|---|
| **"*a* ___"** — one of a kind | *a* watchful sentry · *a* lean sellsword · *a* hewer on tutwork · *a* gentleman out of the fog · *a* rangy grey wolf |
| **"*the* ___"** — one specific person | *the* collier · *the* smelterman · *the* onsetter · *the* storekeeper · *the* ore buyer · *the* claims recorder |

⭐ **The definite article is the tell.** Nobody was asked to mark this and
every author did. It also settles the middle case that a proper-name test
alone gets wrong: **the Rejection collier is Cast** — one specific person
who happens to be referred to by their job, with a decade without sleep as
his defining fact — and he has no name field at all.

So the test is **singleton-ness**; a proper name is strong evidence of it,
not the gate. 26 named + 6 definite-article individuals = **32 Cast**; the
handful of indefinite role-fillers are the **Extras**. The whole corpus
classifies by hand today.

### The class difference is exactly one thing

⭐ Resist making `Cast` rich. The difference is **entitlement to an
individual ledger** — and everything else is a *consequence*, because
every ledger already keys on identity. A name, a prologue, a transcript,
bonds, a dossier: all of them fall out of being individually identified.
Nothing needs adding for them one at a time.

### ⭐⭐⭐ Three rungs, and every mechanism already ships

The two-class sketch was one rung short. Identity is decided at **mint**,
by which of three shipped channels a row uses:

| rung | how identity is set | own ledger | archetype is | example |
|---|---|---|---|---|
| **`Extra`** | cloned, nothing stamped ⇒ falls back to the row's path | no — shares its row's | a **lens** (read-time, unsaved) | *a* sentry |
| **minted individual** | **`asIdentityPath`** (D17) from a scheme | yes | a seed | a Warren node (`${parent}/${nodeId}`), a player Avatar |
| **`Cast`** | **`SingletonMixin`** ⇒ one instance, identity *is* its row | yes | a **seed** + a dossier | Odile · *the* collier |

Neither mechanism is new:

- **`SingletonMixin`** already allows at most one live instance per path
  and **throws at `clone()`** otherwise. It is composed by `Condition`,
  `Material`, `Clade`, `LocomotionMode`, `CombatFormation` — and by **no
  agent class**. Pointing it at NPCs is the whole of `Cast`.
- **`asIdentityPath`** is the shipped mint-time identity channel, used by
  `EnrollController`, the guest `Login` path, `PlayerLogic`, minted
  `CartesianLocation`s, and `OuterWarren` (whose nodes derive
  `${parentExtent}/${nodeId}`). ⭐ **That is "many bodies from one row,
  each its own person", already working.**

> ⭐⭐ **So `Cast = SingletonMixin(NPC)` + a dossier, and `Extra = NPC`
> unchanged.** The author picks the class, and that choice *is* the
> identity decision.

### ⭐ Promotion is an AUTHORING act, not a runtime one

> **User: "I dunno about promotion. that seems like an authorial decision
> not dynamic."**

Settled that way, and the engine agrees rather than merely permitting it:

**Identity is a stamp, deliberately.** `setTemplatePath` is `ApiOnly`-gated
and **re-keys the registry index**; the pre-register form is a
caller-allowlisted seam. It is set at mint precisely so every index is
stable. A runtime promotion would mutate the key every index is built on.

So cast-archetype's *"minting it a distinct identity path and re-running
its declared archetypes in seed mode"* is real, but it is **`asIdentityPath`
at mint** — not a lifecycle event. Promoting an extra means **authoring a
Cast row for it**: the same decision, made in the tree, reviewable, by a
person.

⚠ **Rejected: "everyone starts as an extra and there is a lifecycle."**
Same stamp reason, plus a smaller one — an authored Dave would have to be
promoted at boot, which is ceremony purchasing nothing.

⚠⚠ **The consequence, stated plainly because it is a design position and
not a technicality:** without runtime promotion an extra never becomes
somebody, so *"a guard killed me"* answers **"the watch killed you"** —
permanently, not until the guard gets interesting. If you want a blameable
guard, you author one. That is consistent and it is a commitment.

And the pair is enforceable, which is the point of making them classes:

> **`lint:identity`** — a dossier on an `Extra` is a build error, and so
> is an `Extra` row instanced more than once while carrying anything that
> writes to a ledger.

### ✅ DECIDED — what happens when an extra ACTS

The lens settles what an extra *is like*. It says nothing about what an
extra's **deeds** do, and that is undecided. Four limbs:

| limb | reading | cost |
|---|---|---|
| **A — nothing is written** | an extra's acts vanish | ⚠ three holes: who hurt you, who made this, who owns that |
| **B — the shared row** | *"the guards in this town are brutal"* — a reputation of the KIND | ⚠⚠ blame becomes collective: one guard's crime convicts the role |
| **C — the institution** | an extra acts *as* a role, so acts belong to the office / business / watch fielding them | needs the employment + governance seam, which ships |
| ~~**D — the act promotes**~~ | ⚠ **dropped** — promotion is an authoring act (below) | identity is a stamp; a runtime promotion re-keys every index |

⚠⚠ **B is not the safe limb — it is the default.** It is what happens if
this is left undecided, because sharing a row is sharing a ledger. So
whichever limb is taken must be a decision the class *encodes*, never a
fallback nobody chose.

> **User: "extras attribute to the institution, no writes otherwise."**

**Settled: C, with A as the residue. B is now a RULE against, not a
default** — an extra's acts must never reach its own row, and since
sharing a row is sharing a ledger, that has to be *actively* arranged
rather than left alone.

A guard arresting you *is the watch* arresting you — not a compromise for want of
identity, but how institutions work, and it holds from a Roman legion to a
modern police force (lens 5). It also gives institutions reputations
rather than having individuals accumulate them on the institution's
behalf, which is what the governance design wants anyway. An act the
institution cannot absorb — a killing, a fraud — is then the signal that
**an author should have written a Cast row**, and the world telling you so
is a better outcome than the engine papering over it.

#### ⚠⚠ SUPERSEDED — the mechanism is NOT an identity projection

*This section originally argued that an `Extra` should override
`getIdentityPath()` to return its institution, on the sandbox `WireBody`
precedent. **That was wrong and has been replaced** — see
[identity-ledgers-plan](../../plans/identity-ledgers-plan.md) § D7.*

Two things broke it:

1. **It made "who do you act for" an Extra-only concept**, when it is the
   whole of the office model. A `Cast` member acts for an institution
   too — Odile's bad ruling is her act *and* the Registry's failure.
2. **The ledger already had the right shape.**
   `AccountabilityEvent.directedBy` is *"the party bearing command
   responsibility … **derived, never stamped**"*, surfaced by
   `deriveBlame`. Institutional attribution is a **second attribution**,
   not an identity trick — so overriding an identity method with a policy
   meaning was solving it at the wrong layer.

⭐ The surviving statement, which is the one worth keeping: **an `Extra`
has no identity of its own, so its institutional attribution is the only
one it has.** Same field on both classes, different arity.

⭐⭐ And the institution mostly **resolves** rather than being authored —
an authored override, else the employer off the shipped `Business`
roster, else `ParcelApi.ownerOf(<declared home>)`, else `null`. Plan §
D7a.

#### The consequences, stated because they are positions and not details

- **An extra with no institution is un-blameable.** A masterless sellsword
  kills you and nothing is written anywhere. That is the decision working,
  not a hole: if you want a blameable sellsword, **author a Cast row.**
- **The institution needs a pointer, and mostly it already has one.** An
  employed extra reaches its `Business` through the roster — the archetype
  slate's finding that *"the position itself is authored on the Business
  roster"* is the link. A wolf has no institution and never will, which is
  correct: a wolf mauling you is nobody's fault.
- ✅ **The victim mirror is DECIDED the same way (2026-09-04): harms upon
  an extra land on the institution too.** Killing a sentry is an offence
  against the watch, which is roughly how real law reads assaulting an
  officer, and it resolves *"an extra cannot meaningfully be killed"*
  without any promotion machinery. ⭐ The fictional payoff is free and
  good: an institution accumulating harm rows **is a casualty list** —
  *"the watch has lost four guards this season"* becomes a true emergent
  fact, and attacking an institution's personnel becomes a legible act
  against that institution rather than a series of unattributable
  scuffles.

### ⚠⚠ Accountability is the outlier — and the reason this is not free

Stated last turn that *"every producer keeps working unchanged"* because
they all key on identity. **That is wrong for the one ledger this decision
is actually about**, and the cost estimate changes with it. Verified:

| ledger | keys on | identity-consistent? |
|---|---|---|
| trait · transcript · access · reactions · channels · subjects | `getIdentityPath()` | ✅ |
| **accountability** | **`getTemplatePath()`** | ❌ **the outlier** |

`ConditionLogic` writes `victim: host.getTemplatePath() ?? host.stuffId`,
and `CombatLogic` keys combatants, sides and initiators off
`getTemplatePath()` in six places. So an `Extra` projecting its
institution would attribute its *trait* rows and its *transcript* rows
correctly and its **blame rows not at all** — the exact opposite of the
intent.

⭐ The fix is still small and still one idea — **the accountability
producers key on `getIdentityPath()` like everything else** — but it is
seven call sites rather than zero, and it must be in the build's scope
rather than assumed away.

### ⚠⚠ A pre-existing inconsistency this exposes — **filed as #42**

Traced far enough to file, and it is not this build's:

- `sandbox.md`'s policy table classes `accountability_events` **PASS
  (mark)** — *"**Identity-real** … what happened to **you** stays yours"*;
- `WireBody` implements exactly that, overriding `getIdentityPath()` to
  return the real player's Avatar path;
- ⚠ **but no accountability producer reads that method** — they key on
  `getTemplatePath()`, which `WireBody` deliberately does *not* override.

⭐ **So the safety is coming from the wrong layer.** `deriveBlame` filters
circle-marked rows precisely so *"anyone who could open a circle"* cannot
*"stage a killing and mint a real crime row against a real identity"* —
but if the producers file under the vessel, that guard has never had to
hold. Safe by accident, with a gate that is not in the path: the class of
failure this codebase keeps rediscovering.

⚠⚠ **And it is why the seven-call-site change above is not a free
refactor.** Moving accountability onto `getIdentityPath()` makes
`deriveBlame`'s circle filter **load-bearing for the first time**. Whoever
does the extras work would silently switch on the path that filter was
written to defend — so the filter must be *verified under a real in-circle
killing* with the change, not after it.

**Not this slate's to fix → issue #42**, where it is now traced to the
bottom. The answer, because it changes this slate's risk:

> A `WireBody` is minted by **`StuffApi.create`**, which passes `null`
> where `clone` passes a template path — so its `getTemplatePath()` is
> **`null`**, and `CombatLogic.durableIdOf` turns that into **`""`**
> (`ConditionLogic` disagrees and uses the transient `stuffId`).

⭐ So in-circle blame is **inert but wrong**: not exploitable, because a
row keyed `""` never reaches a real person's key at all — which *confirms*
that `deriveBlame`'s circle filter has never had to hold. The PASS(mark)
*"identity-real"* contract is simply not implemented.

⚠⚠ **And that sharpens the warning above rather than softening it.** The
seven-call-site change this slate needs is the exact moment those rows
start landing on real identities — so it is the moment the filter has to
work, having never once been exercised by a row it could match. **#42
lands first**, with the test.

### ⚠ The victim mirror — and what checking the corpse actually found

`accountability` keys blame on the **victim's** durable path, so hurting
one extra hurts the row: an extra cannot meaningfully be killed.

The hopeful lead was that death might mint the individual anyway — a
corpse is a separate persistent Stuff, so the forensic record could be
individual even when the living extra never was. **Checked, and it is
false, for everyone:**

> `ConditionLogic.mintCorpseFrom` calls
> `StuffApi.clone(TemplatePaths.mortalityCorpse, undefined, { dataOverlay })`
> — **with no `asIdentityPath`.** So *every corpse in the world shares one
> identity*, a player's included.

⭐ Per-instance facts survive, because they arrive as hydrated **fields**
(`shortDescription: "the body of …"`, `_speciesPath`, `causeOfDeath`,
`diedAtGameSec`) rather than as ledger rows. So nothing is broken **today**
— the mortality build only ever needed fields.

⚠⚠ But it is latent and it will bite the moment anything keys a *ledger*
on a corpse, which is precisely what the **necropolis** content pass
(issue #40) is: *"a monument is chronicle made physical"*, graves as
titled extents, grave goods with owners. A chronicle on a shared corpse
identity is one chronicle for every death that has ever happened.

⭐ **And the fix is one argument at one call site** — the middle rung
above. `asIdentityPath` from a scheme keyed on the deceased is exactly
`OuterWarren`'s pattern. Cheap now; a data migration later, and there are
no migrations.

⭐⭐ **Sequenced ahead of #40 by decision (2026-09-04)**, and deliberately
**not** gated on the rest of this slate — it shares this slate's diagnosis
but none of its open questions. On the `roadmap.md` v1 punch list, and
flagged on #40 itself.

⚠ **Two things the scheme has to survive**, and both are cheap to get
right now and awkward afterwards:

- **`reembody`** — one person can leave several corpses, so the deceased's
  identity alone is not unique.
- **An `Extra`'s deceased key is shared with its siblings** — two dead
  sentries would collide on the deceased half. The *moment* is what
  separates them, which is another reason to key on both.

---

## ⭐⭐ The falsifiability property — the best thing in the provocation

> *"…and what things **would** aggregate to if real records were
> modelled."*

That phrasing is the design. A dossier is not setting a reading; it is
asserting **a history that was not simulated**, from which the reading
derives exactly as it would from lived events. Which means the author's
intent and the engine's answer are two independently computable things —
so they can be **compared**:

> **`pnpm lint:dossiers`** — for every dossier that says
> `asserting: competent`, seed it and check the derived band actually
> comes out `competent`.

This is the census-then-ratchet shape, and it is doing real work rather
than tidying:

- it catches an author who wrote three claims where the band needs
  thirty — the silent-underseed failure;
- it is the only thing that stops a dossier drifting back into a stat
  sheet, because a declared value cannot disagree with itself and a seeded
  history can;
- ⚠ it is the natural home for the **materialized trio's** trap: a
  dossier that asserts `known` and derives `dormant` fails the lint, which
  is precisely the S1 drive's silent failure turned into a build error.

The nearest precedent is `lint:topics`, which found 45 of 105 emitted
topics had no authored descriptor.

---

## ⚠⚠ A shipped defect this space already contains

Independent of everything above and **shippable alone** — recorded here so
it is not lost, and credited to the cast-archetype stress test:

Five uses of four `disposition:` keys in shipped content resolve to no
axis in the closed 17-axis `DISPOSITION_AXES` (`greed`, `gregariousness`,
`candor` ×2, `warmth`). `DISPOSITION_KEYS` is exported but nothing on the
seeding path validates against it, so **five authored personality traits
are almost certainly being dropped silently.**

⭐ Fix is `pnpm lint:dispositions`, ~20 lines. ⚠ But decide first whether
`candor` and `warmth` are typos or a real gap in the 17 axes — the answer
changes whether the fix is a rename or an addition. **This is the same
failure mode this whole slate is about**: authored intent that no reader
consumes, failing closed and silent.

---

## Non-goals

- **Retro-fitting histories onto the existing cast.** The substrate first;
  authoring 41 dossiers is a content pass. → a follow-on content pass.
- **A stat-block editor.** If the dossier ever grows a field that is read
  directly rather than seeded, the design has failed. → nowhere,
  deliberately.
- **Player dossiers as an authoring surface.** Char-gen already seeds
  claims for players and that path stays as it is; whether the two
  converge is an open question below, not a goal.
- **Reworking `accountability` around extras.** The victim mirror (§ the
  identity rung) is named there and settled with Q0; the ledger's own
  keying is not this build's to change. → `accountability.md` + Q0.
- **LLM-generated backstory.** Adjacent and tempting; the dossier is the
  artifact such a thing would *write*, not part of this build. →
  [llm-npc-design](./llm-npc-design.md).

---

## Open questions

0. ✅ **CLOSED 2026-09-04 — what an `Extra`'s deeds do, and what is done
   TO it.** Both attribute to the **institution**; where there is none,
   **nothing is written**. B (the shared row) is a rule against rather
   than a default. ⚠ The mechanism is **not** an identity projection —
   that first answer was wrong; it is a **second derived attribution**
   beside `directedBy` (plan § D7/D7c). It is also not free: the
   accountability producers key on `getTemplatePath()`, not
   `getIdentityPath()`, so seven call sites move with it.
1. ⭐ **One document, or a block on the row?** The provocation says
   *"single document"*. A block keeps one file per character and matches
   how `dispositions:` already works; a `DocumentKinds` entry (the closed
   registry — `archetype` is the recent precedent) is separable,
   reviewable, and could serve players too. ⚠ Note the hazards are
   *identical* either way: cast-archetype's deed-row hazard says a
   prologue attached on a **template** key would be read by every sibling
   instance and survive every re-mint, so **standing is cast-only and must
   be enforced rather than assumed** — a document keyed by path has
   exactly the same problem.
2. **The materialized trio — seed-and-fold, or make them derive?**
   Triggering a recompute after seeding is the cheap fix. Making
   `renownOf` derive from the log like `transcripts` does is the honest
   one, and would delete a warning that is currently copy-pasted into
   three docs. Cost unknown; the boot-warmed map exists for a reason
   nobody has restated recently.
3. **Does a seeded condition need a cause?** The clinic wants *"you have
   to reason backwards to what you did"* — but a claim has `when = null`
   by construction, and an affliction's `symptomsAt` is exactly a *when*.
   A seeded illness may be a third kind: not a deed, not timeless
   backstory, but **an asserted event with an asserted time**. Settle
   before the clinic depends on it.
4. **Do businesses and organizations get dossiers?** A firm's standing is
   as derived as a person's, and *"never half-grown"* argues for one
   substrate. Probably yes; deliberately out of the first build.
5. **Where does char-gen land?** It already seeds chronicle claims from
   `char-gen.yaml`, which is one of the two existing homes. Converging it
   onto the dossier would unify the last fragment — or would drag a
   player-facing intake flow into a content-authoring build for no gain.

---

## Build shape (sketch)

Ordered so each step is independently landable and the riskiest question
is settled by evidence rather than argument.

1. **`lint:dispositions`** — the shipped defect above. Twenty lines, no
   dependencies, and it proves the "authored intent nobody reads" failure
   is real before the slate spends a build on it.
2. **The seed spine** — one applier, the `dispositions` shape generalized:
   idempotent, `postRegister`, `claim`-marked, **archetype-stamped**.
3. **Competence claims** — advancement's unresolved fork, settled *seed*.
   The first consumer is Dave, and the acceptance is that he reads as good
   at bartending to a player who asks.
4. **`lint:dossiers`** — assert-vs-derive. Gate today's count as the
   ceiling; a later pass drives it to zero.
5. **The materialized trio** — whichever limb Q2 takes.
6. **Body/condition claims** — the clinic's slice, once Q3 is settled.
7. **`Extra` / `Cast` + `lint:identity`** — the class split, which is
   `SingletonMixin(NPC)` plus the lint, plus the **institution resolve
   and the second attribution** (Q0; plan § D7a/D7c). Sequenced last only because nothing
   repeats a row *yet*; the day one does, it moves to the front. ⭐ The
   acceptance is behavioural and cheap to state: **an extra's deed lands
   on its institution's ledger and on no row of its own**, an extra with
   no institution writes nothing anywhere, and **killing a sentry shows up
   as a harm to the watch**. ⚠ Includes moving the seven accountability
   producers onto `getIdentityPath()`.
8. **The corpse identity** — `asIdentityPath` at the one mint site.
   ⭐⭐ **DECIDED 2026-09-04: this lands BEFORE the necropolis (#40)**, and
   it does not wait for the rest of this slate — it is one argument at one
   call site and it is independent of every open question here. Tracked on
   the `roadmap.md` v1 punch list so it is visible to whoever picks up #40
   rather than buried in a slate that is not yet requirements.
   ⚠ The scheme must survive two things: **`reembody`** (one person can
   leave several corpses) and an **`Extra`'s shared deceased key** — so key
   on the deceased *and the moment*, never the deceased alone.

⭐ Steps 1–3 are the build; 4 is what keeps it honest; 5–6 are the
consumers. The clinic build waits on 6 and should not start before Q3 is
answered.
