# Record-integrity slate — tamper-evidence, for real

> **Status: UNBUILT** — every ledger is still append-only by convention;
> the guarantee is entrenched in Art. VII and implemented nowhere
> (re-verified 2026-09-19: no `prevHash` / Merkle / beacon anywhere under
> `packages/server/src`; `positions` still upserts in place —
> `schema/positions.yaml:18` *"the write is an upsert"*; no
> `position_events`, docket or roll collection under `schema/`).
> **Left:** event-source `positions` → `position_events` · `prevHash`
> chaining with canonical serialization + the single-writer append
> discipline · the Merkle checkpoint ·
> anchoring via `GitApi` to third-party hosts · the published export +
> standalone verifier · the member self-audit view · an external beacon
> for draws (the grinding attack named in requirements) · ⭐ (2026-11-18) the
> interface — the ✓ line on every meta card and `verify` (§ *The interface*) ·
> chaining declared per collection, every append-only ledger · erasure by
> destroying data beside its fingerprint · a format version on every entry ·
> the break alarm and the standing bounty · realms witnessing each other
> **Size:** a build

**Captured 2026-07-31**, out of the government design run. The
guarantee is **specified and entrenched** — Art. VII of the
[draft constitution](../../compact/governance/draft-constitution.md), an
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
construction](../society/cooperative-slate.md) (the design-level treatment this
build-level slate serves), [legal-code-slate](../society/legal-code-slate.md),
[press-slate](../society/press-slate.md),
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
([legal-code-slate § The roll](../society/legal-code-slate.md)), and an
unexpected one: **the roll converts an undetectable attack into a
detectable one.**

*(Full per-actor signatures — cooperative-slate's "signed actions" —
remain the strict upgrade. They are deferred, not rejected: keys in a
browser game mean key loss, and key recovery through a trusted party
reintroduces exactly the trust the scheme exists to remove. Self-audit
plus the roll is the **proportionate** first cut.)*

## Scope: governance only

> ⛔ **Superseded 2026-11-18** (§ *The interface, the alarm, and witnessing*):
> **every append-only ledger is chained**, declared per collection — the cost is
> near zero, and chaining a chosen subset invites *"why not that one?"*. The bank
> ledger joins.

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

## ⭐⭐⭐ The interface, the alarm, and witnessing (2026-11-18)

Talked through with the owner, out of the courts design
([separation-of-powers-slate](../society/separation-of-powers-slate.md)). The
owner: *"In the manifesto I kinda say 'blockchain' and assume people know what
that means … my first question is what's it gonna cost me? And is this thing like
tape, where it's impossible to search but super cheap to append to?"* Then: *"What
interface, if any, do we need for the record, and who uses it?"*

### What it costs, and why it is not tape

- **A hash chain**: each entry carries the fingerprint (SHA-256) of the one before;
  edit an old entry and every later link visibly breaks. The rest of what people
  call *blockchain* — mining, tokens, consensus among strangers — solves a problem
  we do not have: agreeing on a record when **nobody is trusted to write it**. We
  have one writer; it need not be trusted, only **caught**.
- **The loophole is a recomputed chain; the fix is anchoring** — publishing the
  latest fingerprint where we do not control it: a git push to a public host, a
  free public timestamp (OpenTimestamps anchors into Bitcoin with no coin on our
  side), a public post. Anchoring publicly also stops showing different histories
  to different people.
- **Cost, in dollars, effectively zero**: microseconds per hash; about 64 bytes per
  entry (a million entries ≈ 64 MB); one published hash an hour; verification runs
  on the verifier's machine. **The real cost is discipline**: ordered appends per
  chain, canonical serialization, and no in-place updates (§ *Two implementation
  hazards*; `positions` first).
- ⭐ **Not tape.** The chain is two extra fields on ordinary rows; rows stay indexed
  and queryable exactly as now. What changes is **no edit, no delete — a correction
  is a reversing entry**, as accounting has always worked. A Merkle checkpoint folds
  new entries into one anchored fingerprint, and proving one entry is in it takes
  about 20 hashes for a million entries.
- **The two honest limits** (§ *The honest limits*): it proves nothing was changed
  afterward, never that an entry was true when written — the open code and the
  court's code review cover that half; and **erasure** (below).

### Who uses it

| who | needs | how often |
|---|---|---|
| **every player** | trust that what they see was not changed; a check of their own entries | rarely, by choice |
| **judges** | proof an entry is genuine and unaltered, as evidence | every case citing the record |
| **legislators and press** | history — what was enacted, when, the tallies | often, through `law` and `bill`, not the chain |
| **outside watchdogs** | the whole record, verified independently, no character needed | continuously, by tooling |
| **the server** | write, anchor, self-check | always, automatically |

### ⭐⭐ The interface — a ✓ on every card, and one verb

- **Every meta card** — a bill, a law, a ruling, a notice, a vote, a ledger entry —
  shows one line: *on the record · entry 41,207 · verified ✓ · anchored 18 min ago*.
  The padlock in a browser: the interface for nearly everyone.
- **`verify`** **[DECIDED — lens 1]** — *record* is taken by the record layer behind
  `recall`, and the verb should say what you do:
  - `verify <bill · law · case · notice · entry>` — ⭐ **shows its work**: the entry,
    its fingerprint, the link to the one before, the checkpoint, the anchor, each
    step checked (the physics receipt's principle — "don't trust, verify" is itself
    the lesson);
  - `verify mine` — **the member self-audit**: every entry about you, checked and
    listed; ⭐ for a secret ballot, the record holds a sealed fingerprint of each
    vote, so you confirm *your* vote was counted without revealing it;
  - `verify status` — the record's health: last anchor, any reported break.
- **Outside the game:** the public export (every entry, or its fingerprint where it
  holds personal data) · **the standalone verifier**, open source and run on your own
  machine — deliberately outside our code, since a verifier we run proves little ·
  the anchor list.

### ⭐⭐ When it breaks

A failing proof is **self-evident** — anyone can re-run it — so a break settles the
facts at once; what remains for the court is *who*.

- **Anyone may report a break**, the failing proof attached.
- **A public alarm**: `verify status` turns red everywhere; every card shows it.
- **A conduct case files automatically** against whoever held write access at the
  time ([separation-of-powers-slate](../society/separation-of-powers-slate.md) § 7o).
- ⭐ **No automatic suspension** **[DECIDED — lens 7]**: suspending write access before
  a ruling would be punishment before process, and could halt the realm, since the
  writers run it. **Interim suspension is the court's to order.**
- **Recovery** goes back to the last good anchor; anchors are the restore points.
- ⭐ **A standing bounty for proving a break** **[DECIDED — lens 6]**: the most
  valuable labor for the Compact, standing by formula. Nobody can manufacture one to
  collect it — only write-access holders could, and they are excluded.

### ⭐ Realms witness each other **[DESIGNED now; built at the second realm]**

Each realm publishes its latest checkpoint into its neighbors' records. Rewriting
one realm's history would then mean rewriting every realm that witnessed it — the
federation as its own notary, and the most honest answer to *who watches the
watchers*: everyone else.

### Decisions

| question | answer | lens |
|---|---|---|
| the verb | `verify`, which shows each step; the ✓ is the summary | 1 |
| which collections | **declared in each collection's schema doc** — no code per ledger | 2 |
| how much | **every append-only ledger**, the bank ledger included | 6 |
| in-fiction documents | ⭐ **never certified** — forgery in the fiction (a forged letter, a laundered corpse) is gameplay; the chain vouches that a case happened, never that its evidence is genuine | 3a |
| anchoring | **Tier A** — *the record can never be faked* is a manifesto floor, meaningless if a polity can stop anchoring | 3b, 7 |
| a proven break | standing by formula; writers excluded | 6 |
| after a break | alarm and an automatic case; interim suspension only by court order | 7 |
| realm witnessing | designed now, built at the second realm | the owner |

### Gaps the pass found

- ⚠ **A format version on every entry** (lens 5) — the serialization will change; an
  old entry must re-hash the way it was first hashed, or an upgrade looks like
  tampering.
- **Genesis is now** — no players and no data, so the chain starts clean.
- **Erasure** (lens 4, the owner's to confirm) — the chain holds a *fingerprint* of
  personal data, the data lives beside it (encrypted with a per-person key where
  needed); erasing destroys the data or the key, the chain still verifies, and the
  person's data is gone. It is the *purge a person's data* operation
  ([separation-of-powers-slate](../society/separation-of-powers-slate.md) § 7l) and
  is designed with the chain from the start.

## Open questions (for requirements)

1. **One chain or many?** Per-log chains with a checkpoint hashing all
   heads is the instinct (flexible, and one head to anchor) — confirm
   against the single-writer constraint.
2. **Checkpoint cadence** — how often, and does it ride the same sweep
   as governance? (Cheap either way; the anchor push is the only cost.)
3. **Retention of the exportable log** — permanent, or checkpointed
   compaction with the old chain retained by replicas?
4. ~~**Does the bank ledger join in v1?**~~ **Yes** — every append-only
   ledger is chained (2026-11-18).
5. ~~**What exactly does the self-audit view show**~~ — `verify mine`: every
   entry about you on every chained ledger (2026-11-18).
6. **Signature upgrade path** — if per-actor keys land later, do
   historical unsigned entries stay valid (grandfathered, with the
   transition itself anchored)?
7. **Erasure** — confirm fingerprints in the chain with data stored beside
   them, destroyed to erase (2026-11-18).
