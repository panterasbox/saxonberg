# Record-integrity slate — tamper-evidence, for real

**Captured 2026-07-31**, out of the government design run. The
guarantee is **specified and entrenched** — Art. VII of the
[draft constitution](../../governance/draft-constitution.md), an
**eternity clause**, and a whole manifesto chapter (*The Record —
Don't Trust, Verify*). It is **implemented nowhere.**

Every ledger we have — including the three the legal build adds (the
Roll, the docket, `position_events`) — is append-only **by
convention**: the code only appends. That is not the same claim.

> **"We don't rewrite history" and "you can prove we didn't" are
> different products, and the second is the one the design sells.**

This is **record infrastructure**, not governance — its consumers
already include the bank ledger, the chronicle, `accountability_events`
and the authoring ledger. Governance is merely the caller whose
constitution makes it non-optional. (Same reason
[branch-policy-slate](./branch-policy-slate.md) is its own slate.)

Related: [cooperative-slate § tamper-evidence by
construction](./cooperative-slate.md) (the design-level treatment this
build-level slate serves), [legal-code-slate](./legal-code-slate.md),
[press-slate](./press-slate.md),
[git-workflow.md](../../subsystems/git-workflow.md),
[influence.md](../../subsystems/influence.md).

## Start with the uncomfortable part

> **A hash chain the operator can recompute is theater.**

If the server computes the hashes and holds the whole log, an operator
with database access rewrites entry 400 and re-derives every hash after
it. The chain is **internally consistent and completely false.**
Hash-chaining alone buys evidence against a careless or partial
attacker — **not** against the party the constitution explicitly says
integrity must be independent of.

## The guarantee decomposes into three — only two are cryptography

| Defends against | Mechanism | Notes |
|---|---|---|
| **revision** — altering what happened | **anchoring** — publish the chain head where the operator cannot reach it | **the load-bearing piece** |
| **fabrication** — inventing what did not happen | **member self-audit** (signatures are the upgrade) | crypto does not help here |
| **miscounting** — deriving the wrong answer honestly | **publish the inputs + the algorithm**; anyone recomputes | no signatures needed |

**You can rewrite the chain; you cannot rewrite yesterday's published
head.** Everything else is bookkeeping around that one fact.

## ⭐ Fabrication has a defense we already built

The operator appends five hundred fake yea positions — perfectly
chained, perfectly anchored, entirely false. Crypto does not help: the
log is honestly recording a lie.

The real defense is that **the victim notices.** Every member can see
their own acts, and no act should appear under their name that they did
not take. Which means mass fabrication only works from accounts nobody
is watching —

> — **and dormant accounts are off the roll.** Fabricated positions from
> disenfranchised members contribute nothing to numerator *or*
> denominator, so the operator must fabricate from **active** accounts,
> which have humans attached who can look.

**A third consumer for the disenfranchisement amendment**
([legal-code-slate § The roll](./legal-code-slate.md)), and an
unexpected one: **the roll converts an undetectable attack into a
detectable one.**

*(Full per-actor signatures — cooperative-slate's "signed actions" —
remain the strict upgrade. They are deferred, not rejected: keys in a
browser game mean key loss, and key recovery through a trusted party
reintroduces exactly the trust the scheme exists to remove. Self-audit
plus the roll is the **proportionate** first cut.)*

## Scope: governance only

Chain what the constitution names, not gameplay: **the Roll**, **the
docket**, **office handoffs**, **investiture / confidence**, **draws**,
**position events**. The bank ledger wants the same treatment
eventually (it already has a sealed single-writer chokepoint, which is
half the work) — **named, not scoped in.**

### ⭐ `positions` is the odd one out, and must be fixed first

Every other influence collection is a **rebuildable cache over an
append-only event log** — `participation_events`, `renown_events`,
`producer_events`. **`positions` stores current state and mutates rows
in place**, which a chain cannot sign: chains want immutable entries.

Event-sourcing it into **`position_events`** serves three things at
once:

1. **conviction** — `realSince` is already an *event* fact, not a state
   fact;
2. **the docket** — position events are what the sweep reads;
3. **this slate** — an immutable, chainable entry.

**First task regardless of the rest.**

## Anchoring — and we already ship the integration

**Push a checkpoint to a third-party git host.** A checkpoint is a
**Merkle root over all log heads** — a few hundred bytes — and
[`GitApi`](../../subsystems/git-workflow.md) already does
snapshot-and-push. That buys:

- **third-party timestamps** (the host's, not ours);
- **public history** anyone can read;
- **free replication** by anyone who clones.

Boring technology, no crypto-adjacent baggage, and **multiple anchors
are strictly better than one** because they cost nearly nothing.

## Then ship the verifier — and the acid test

> **If the verification runs on our box, it isn't verification.**

A **standalone script** plus an **exportable log**: check the chain,
check heads against the published anchors, **recompute tallies from
position events** and compare against the published counts. Art. VII §2
("re-derivable by any member") is satisfied by *shipping the
re-derivation*, not by asserting it.

Which settles the **integrity branch**'s real relationship to all this:

> **Its attestations are conveniences, never authorities** — anyone can
> re-derive them. **An integrity branch that must be trusted has
> failed.**

## Sealed records fall out free

Chain the **hash** of a sealed entry; publish **existence + hash**,
withhold content; on unsealing, anyone checks it against the hash.
That is Art. VII §4 ("integrity provable without disclosure") satisfied
with no new mechanism — and it is **seal-don't-hide** again, with the
docket carrying existence while content stays closed.

## Draws need an **external** beacon

⚠ Commit-reveal seeded from a checkpoint hash is **grindable**: the
operator controls what enters the log and can reorder or pad to shift
the result.

**Fix the pool, publish the commitment, draw from a public randomness
beacon** (drand or equivalent — one HTTPS call). Name the grinding
attack in the requirements so nobody later "simplifies" it back to a
self-seeded draw.

## The honest limits, stated precisely

Art. VII §5 already concedes *detectable, not impossible.* The
precision matters, because overclaiming here is the worst available
failure:

- **anchoring detects revision, never fabrication;**
- **self-audit + the roll detect fabrication — but only where someone
  looks;**
- **nothing prevents an operator from going dark.** There, *silence is
  itself evidence*, and **exit** is the remedy (Art. X §4);
- and — the one people conflate constantly —

> **Tamper-evidence guarantees the record, never the law.** A bad rule,
> honestly executed and faithfully recorded, is a **political**
> failure, not an integrity one.

## Two implementation hazards

| Hazard | Why it bites |
|---|---|
| **canonical serialization** | field order, float formatting, unicode normalization — verification fails on *honest* data. The classic footgun. |
| ⚠ **concurrent appends** | two writers reading the same `prevHash` **fork the chain**, and Mongo gives no serialization for free. **Every governance log needs a single-writer discipline** — this is the real design work in the build. |

## Build order

1. **Event-source `positions`** → `position_events` (wanted anyway).
2. **Chain the governance logs** — `prevHash` / `hash`, canonical
   serialization, single-writer append.
3. **Periodic checkpoint** — `ScheduleApi.recurring`, Merkle over heads.
4. **Anchor** via `GitApi` to one or more third-party hosts.
5. **Publish** the log export + the **standalone verifier**.
6. **Member self-audit view** — a `standing` / `chronicle` sibling:
   *my acts, on the record.*
7. **External beacon** for draws.

## Open questions (for requirements)

1. **One chain or many?** Per-log chains with a checkpoint hashing all
   heads is the instinct (flexible, and one head to anchor) — confirm
   against the single-writer constraint.
2. **Checkpoint cadence** — how often, and does it ride the same sweep
   as governance? (Cheap either way; the anchor push is the only cost.)
3. **Retention of the exportable log** — permanent, or checkpointed
   compaction with the old chain retained by replicas?
4. **Does the bank ledger join in v1?** It has the chokepoint already;
   the argument against is scope, not difficulty.
5. **What exactly does the self-audit view show** — every act, or the
   governance subset? (Instinct: governance first; the chronicle
   already covers deeds.)
6. **Signature upgrade path** — if per-actor keys land later, do
   historical unsigned entries stay valid (grandfathered, with the
   transition itself anchored)?
