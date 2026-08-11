# Antecedents slate (working doc)

> **Status: design proposed, nothing built.** Two questions that turn out
> to be one: *how does an NPC arrive good at something without an authored
> biography of deeds*, and *how does a player carry competence between
> instances running the same content*. Both are **evidence that did not
> happen here** — one fictional, one foreign — and both are made tractable
> by the same property of [advancement](../../subsystems/advancement.md):
> Competence is derived on read and never stored.
>
> Phase A is a tail of advancement. Phase B is new substrate spanning many
> subsystems. Build-grouping left to the sweep.

---

## The one idea

Every character enters play with a past. A player gets a thin one (an
aspiration and a prologue); Dave the barkeep gets a thick one (twelve
years behind a dockside bar); a transferring player gets a *real* one
earned somewhere else.

Those are differences of **degree and provenance**, not of kind. The
substrate should have exactly one answer to *"what did this character do
before now"*, and three ways to fill it in:

| provenance | source | trust |
|---|---|---|
| **native** | happened here, this instance witnessed it | total |
| **authored** | a fiction the content author declares | content-trust |
| **foreign** | happened at another instance, attested | issuer-trust, discounted |

⭐ The payoff of unifying them: **an import is just a background whose
author was another world.** If Phase A is built as "a character can carry
antecedent evidence it did not earn here," Phase B is a new *producer* for
that seam, not a new mechanism.

---

# Phase A — Background: the authored prior

## The gap

An author needs to say *Dave is expert at bartending*. Today there is no
way to, short of fabricating hundreds of `TranscriptEntry` rows.

The obvious shortcut — let a template declare `competence: {mixology:
expert}` and have `bandFor` short-circuit — should be **rejected**:

- There are now **two answers** to "how good is X at Y," and every
  consumer (combat, craft-resolve, dialogue gates, appraisal, teaching)
  has to branch on which kind of character it is holding.
- **Dave can never learn.** A fiat band is a constant; the mentorship
  loop, the `command` Discipline's teaching payoff, and any "the NPC got
  better at this" story are foreclosed.
- It breaks the honesty firewall by making the band an *input you set*
  rather than an *output you observe* — the exact inversion
  [advancement](../../subsystems/advancement.md) and
  [renown](../../subsystems/renown.md) exist to prevent.

## The mechanism — author the prior, not the evidence

`Competence.derive` is a two-state BKT fold. A Bayesian estimator has a
prior by construction; today it is an implicit constant. Make it an
authored input:

```yaml
background:
  - discipline: mixology
    kind: practiced        # apprenticed | practiced | studied | credentialed
    years: 12
    at: hard               # the grain the work was done at
  - discipline: appraisal
    kind: studied
    years: 1
    at: routine
```

A **résumé, not a biography** — summary-shaped, not event-shaped. A pure
function maps the background to a starting `theta` per Discipline;
`derive` then folds real Transcript rows on top of it, unchanged.

Nothing is set. The derivation still runs. Dave still learns.

## ⭐ Stated effort, not stated band — DECIDED

The mapping takes **effort** (`kind` × `years` × `at`) and produces a
band. It does **not** take a band and invert to the prior that would
produce it.

The author never types `expert`. They type what the character *did*, and
the engine says what that makes them — which is the same contract a player
lives under. Consequences:

- "Twenty years pouring beer" and "three years in a cocktail lab" come out
  **differently**, because the grain (`at`) is part of the input and the
  estimator's difficulty coupling is already the thing that knows trivial
  repetition teaches nothing.
- The author is writing **fiction**, not tuning a dial. A background is a
  readable fact about a character that content, dialogue, and the wiki can
  all use; a band is a number that only the engine cares about.
- If the estimator is recalibrated, every NPC re-derives correctly, for
  free — the same property that makes re-legislating the estimator safe
  for players.

## ⭐ The crowd costs nothing

If the prior is a **pure function of the template**, a generated NPC with
no Transcript rows needs **zero database writes**:

```
bandFor(npc, disc)  =  derive(prior(background), [])
```

That is the "[derive the crowd / simulate the cast](./npc-behavior-slate.md)"
split falling out for free. The **cast** (Dave, named NPCs) accumulates
real rows and grows; the **crowd** is computed from its template and
persists nothing. A fiat-band design cannot do this — it has to store the
fiat somewhere, per instance, forever.

⚠ The seam to get right: a crowd NPC that *does* earn a row must
transparently become a cast NPC (rows exist, prior still applies). The
prior is not consumed by the first append.

## Background is a content-trust surface

A wizard-authored NPC with a fat background who then teaches, confers, or
appraises is a **competence laundry**. `background:` belongs on the same
gated field list as `class:` / `hydratorClass:` / `behaviors[].brain` —
wizard-only, per [access.md](../../subsystems/access.md).

Ordinary content-write permission on a parcel must not be enough to mint
competence, for the same reason it is not enough to mint money.

## Players have backgrounds too

The same field is the honest home for char-gen's *"I used to be a
bartender"* — which today produces a `bioSeed` and `claimSeeds` (prose)
but nothing measurable. An aspiration that says you apprenticed somewhere
should produce the antecedent rows that say so.

This is what makes Phase A worth building even if Phase B never happens:
it closes the gap between the prologue a player is handed and the
competence they start with.

## Open questions (Phase A)

1. **Where does the prior live** — a field on `Competence.derive(evidence,
   prior?)`, or synthesized `kind: 'claim'` Transcript rows at clone time?
   Rows are more uniform (one code path, replayable, inspectable via
   `entriesFor`); a prior parameter is cheaper for the crowd. Possibly
   both: crowd derives a prior, cast materializes rows on first append.
2. **Does background decay?** A bartender who has not poured a drink in
   ten game-years is arguably rusty. The estimator has no forgetting term
   today, and adding one affects players equally.
3. **Does background propagate along Catalog edges?** Twelve years of
   mixology plainly implies *some* recipe-knowledge. Edge propagation is
   already deferred for native evidence; background should not get it
   first.
4. **`conditioning` channel backgrounds** — "years" is a poor unit for
   alcohol tolerance. Does the conditioning channel need its own effort
   vocabulary, or does it simply not take backgrounds?
5. **Is `background` readable in-world?** A CV is a diegetic object. If
   the wiki or a `profile` verb can show it, it becomes content rather
   than config — which is probably right, and has spoiler consequences.

---

# Phase B — Federation: the foreign record

## Two engine facts do most of the work

**1. Competence is never stored.** There is no level to convert. Import
evidence, re-derive, done. A system that stored levels would need a
level-conversion table between every pair of instances — an intractable
negotiation. This one needs a **vocabulary map** and nothing else.

**2. `key`, not templatePath, is the durable join — and `iscedf` is
already on every Discipline.** That field was designed for the LMS bridge.
Federation is *the same bridge pointed sideways*: two instances that hang
their Disciplines on ISCED-F codes can map to each other with different
local keys, without either having heard of the other.

## ⭐ The three buckets

| | travels | why |
|---|---|---|
| **Portable** | `transcripts`, chronicle **claims**, (conditionally) `disposition_events` | facts about **you** — true regardless of which world you stand in |
| **Attestable, inert** | chronicle **deeds** | facts about a **world** — displayable and attributed, deriving nothing locally |
| **Never** | `bank_ledger`, `parcels`, `chattel`, `renown`, `participation`, `producer`, `office_holders`, `contracts`, `accountability_events` | claims against a **specific registry** — importing them is counterfeiting |

**The line: skill is in your hands; standing is in other people's heads.**
Your competence walks through the door with you. Your reputation cannot,
because it was never yours — it is a fact about a society you just left.

⚠ **This is not a blockchain, and the reason is structural.** Competence
is not conserved and not scarce, so **there is no double-spend**:
importing the same transcript into ten instances harms nobody. That is
precisely why competence is the right thing to federate and money is the
wrong thing. What this needs is **accreditation**, not consensus — a
unilateral, revocable acceptance decision by each sovereign instance.

## ⭐ Export the evidence, not the estimate

The official-transcript vs. self-reported-GPA distinction.

An export is a signed bundle of **raw Transcript rows**. The receiving
instance re-derives with **its own** estimator and **its own** difficulty
calibration. B never has to trust A's math — only A's honesty about what
happened. Two instances can disagree about how hard bartending is without
breaking the protocol.

Exporting a *band* would reintroduce exactly the level-conversion problem
that derive-on-read already solved.

## The adapter — four rules

**1. The pack manifest is the interop contract, not the instance.**
[Content packs](../../subsystems/content-packs.md) already carry versions
and `sourcePack` stamps. An export declares *which packs at which
versions* the evidence was earned under; acceptance is decided **per
pack**. "Running the same content" becomes checkable rather than asserted.

**2. ⭐ Adapters narrow, never widen.** A map may fold evidence into a
*less* specific Discipline (A's `mixology` → B's `bartending`) or refuse
it; **never the reverse.** Otherwise import is a laundering vector — carry
in generic combat evidence, cash it as blades. Same shape as the `writers`
rule in [branch-policy-slate](./branch-policy-slate.md).

`iscedf` gives the fold for free: the code hierarchy *is* the specificity
ladder, so "map to the nearest common ancestor" is a real algorithm rather
than a hand-authored table.

**3. Refuse, don't drop.** Unmappable rows ride along as **foreign and
inert** — visible in the chronicle, attributed to their issuer, deriving
nothing. A record that silently loses your history is one nobody uses
twice.

**4. Rows carry a global id `(issuer, localId)`.** Cheap now, impossible
to retrofit — and it is what makes re-import idempotent, which the second
variant needs.

## ⚠ Difficulty is world-relative by construction

The advancement doc is explicit that difficulty is *"a world-measurement,
not a tag"* — the route's length, the lot's ambiguity, the live
competition. A `hard` check at A may be routine at B.

So `difficulty` is the one field that **cannot be taken at face value on
import**. The realistic answer is the one universities already use —
transfer at a threshold, no grade points — i.e. a **flat policy discount**,
not a clever cross-instance calibration. Any design that tries to compute
a true difficulty conversion is overreaching.

## ⚠ The `claim` faucet is where the anti-grind math stops

Competence is unfarmable **because every row is a check**: the estimator's
difficulty coupling means trivial attempts barely move the posterior, and
the ZPD learning rate peaks at the edge of ability.

A `claim` is not a check. It is an attestation, and it bypasses that
coupling entirely.

Therefore: **the acceptance cap is the whole safety mechanism** for
imported claims. Not a flaw — it is exactly why real institutions cap
transfer credit — but the cap belongs in the protocol from day one rather
than being bolted on when someone speedruns a curriculum. Concretely:
per-pack, per-Discipline, per-issuer ceilings, expressed as a **share of
the band ladder** an import may carry you to.

⚠ **An instance that both issues and accepts must cap its own claims
too.** The tempting exemption — "our own attestations are trustworthy, so
they ride uncapped here" — turns the issuing content into the pure grind
path *inside the issuer's own world*. Self-acceptance is acceptance; the
policy has no `self` case.

The pleasant reading of the same risk: if the optimal way to advance a
character is to actually learn the material, that is the
[practicum thesis](./eternal-university-slate.md) arriving by a different
road.

## The three variants

The obvious use case is the least interesting one.

1. **Migration** — a player moves instances, one-time import. The easy
   case, and the one that under-specifies the format.
2. **Dual residence** — a player plays both regularly; continuous,
   idempotent, bidirectional. This is what forces rule 4 (global row ids)
   and a cursor per issuer.
3. ⭐ **The institution that only issues** — an instance that mints nothing
   but `claim`s, and world instances that accept them at their own
   discount. This is the education vertical with a wire protocol, and it
   is the variant that should drive the export format. See
   [college-slate](./college-slate.md) and
   [../../study-com-transfer-network.md](../../study-com-transfer-network.md).

## Identity, consent, revocation

**Identity.** How does B know the importer is the same person? Two paths:
a shared identity provider (both instances use the same OAuth subject —
cheap, but a linkable identity provider is a **login vector**, so this
inherits that whole threat model), or a player-held keypair (sovereign,
and the honest answer for a federation with no central party). The
export is bound to a *person*, not to a character.

**Consent is per-ledger, and traits are not skills.** A skill transcript
is a CV. A `disposition_events` export is a **psychological profile** —
and the [psychology slate](./psychology-slate.md)'s position is that you
cannot read yourself and disclosure *is* discovery. Default
`disposition_events` to **non-portable**; any export of them is an
explicit, per-axis, player-initiated act, never a bundle default.

**Revocation.** If A discovers an exploit that minted fake deeds, it needs
a way to say so. Issuer + row id gives a revocation list nearly for free;
B re-checks on a cadence or on read. Low priority, trivial to design in,
awkward to add later.

## ⭐ Acceptance policy is a published artifact

In the real world a student can read *"we accept up to 30 transfer hours,
C-or-better"* **before** enrolling. If an instance's adapter policy is
private config, the network is unusable to the person it is for.

So the policy should be a **readable, diegetic document** — closer in
shape to [legal-code-slate](./legal-code-slate.md) than to a config file.
It names: recognized issuers, per-pack acceptance, the discount, the caps,
and the refusal list. Publishing it is what makes the network legible, and
it is the artifact a prospective player (or a partner institution) reads.

## Open questions (Phase B)

1. **What signs?** Instance key, operator key, or player key. Probably
   instance-signed and player-presented.
2. **Push or pull?** Does A hand the player a bundle, or does B fetch from
   A on the player's authorization? Pull is better for revocation, worse
   for offline/dead instances.
3. **Does the chronicle's foreign section have a spoiler level?** "You
   saved Terminus" may name content B has not published.
4. **Do NPCs federate?** A content pack shipping Dave ships his
   background — which is Phase A, and is already how it should work. But
   an NPC that *earned* rows at one instance is a different question.
5. **Does an instance advertise its adapters**, or is the map authored
   locally by each acceptor? Locally, probably — accepting is a unilateral
   act — but a pack could ship a suggested map.
6. **What about content B has that A does not?** Nothing to import; the
   player simply arrives untrained in it. Worth stating so nobody tries to
   invent a bridging rule.

---

## What this slate does NOT cover

- **Polity federation.** The [cooperative slate](./cooperative-slate.md)'s
  inter-instance "UN" (Tier 3) federates *governments* and needs a shared
  constitutional floor. This federates *personal records* and needs no
  shared governance at all — which is why it is tractable now and that is
  not. **Keep the names apart.**
- **Money, title, or any registry claim.** Permanently out of scope; see
  the buckets table. [banking.md](../../subsystems/banking.md)'s
  conservation chokepoint is instance-local by design.
- **Account/character migration as data.** Moving an avatar wholesale —
  inventory, location, relationships — is not this. This moves a *record*,
  and the character is minted fresh at the destination.
- **The estimator itself.** Calibration, forgetting terms, and edge
  propagation stay advancement's business.

---

## Cross-references

- [advancement.md](../../subsystems/advancement.md) — Discipline / `key` /
  `iscedf`, Transcript, `Competence.derive`, the honesty firewall
- [chronicle.md](../../subsystems/chronicle.md) — deed vs. claim by
  provenance; the ledger the foreign section rides
- [content-packs.md](../../subsystems/content-packs.md) — versions and
  `sourcePack`; the interop contract
- [trait.md](../../subsystems/trait.md) +
  [psychology-slate](./psychology-slate.md) — why dispositions are not
  skills for consent purposes
- [access.md](../../subsystems/access.md) — the content-trust gate
  `background:` belongs behind
- [behavior.md](../../subsystems/behavior.md) +
  [npc-behavior-slate](./npc-behavior-slate.md) — the cast/crowd split
- [advancement-slate](./advancement-slate.md) — the deferred NPC-floor
  mediocrity knob this gives a mechanism to
- [college-slate](./college-slate.md),
  [eternal-university-slate](./eternal-university-slate.md) — the issuing
  institution
- [branch-policy-slate](./branch-policy-slate.md) — narrows-never-widens
- [legal-code-slate](./legal-code-slate.md) — the shape a published
  acceptance policy should take
