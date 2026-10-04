# Labor standing slate — standing is individual, labor is collaborative

> **Status: UNBUILT, and one arm ships.** `CreditRouting` routes
> attributed engagement at a location to that content's author and into
> the producer stock; `CreditShare.weight` is hardcoded to `1` with the
> contributor-set model named in
> [provenance.md](../../subsystems/provenance.md) § Deferred.
> **Left:** ⭐ **`/studio/` in `UNRELEASED_PREFIXES`** (a one-line live
> gap) · ⭐ **path-grained routing** (which dissolves most of the problem)
> · the contributor set as a **declared fact** · the role × magnitude
> vocabularies · the renewing obligation + non-redistributive lapse · the
> six-ledger audit **join**
> **Size:** ⭐ **two one-line-ish fixes get most of it**; the contributor
> set is a tail; the join is a build.

**Captured 2026-10-04.**

> **User: "standing is individual but labor is collaborative."**

⚠ **Values frame lives elsewhere.**
[standing-mint-slate](./standing-mint-slate.md) owns *whether* standing
is a morality score, legibility as the only lever, and the pathologies as
required reachable states. **This slate is the mechanics of producer
credit for collaborative work**, and it takes that slate's framing as
given — including the founder's line that **how standing is minted is the
ballgame.**

---

## 1. ⭐⭐⭐ The unpublished rule exists — and `/studio/` slips through it

> **User: "we never wanna mint standing for unpublished code… even
> unpublished may be ambiguous because we have `/home/` but we also have
> `/studio/` and the latter is multiparty."**

`lib/standing/CreditRouting.ts`:

```ts
const UNRELEASED_PREFIXES = ['/home/'] as const;
static isReleased(path) { return !UNRELEASED_PREFIXES.some(p => path.startsWith(p)); }
```

> ⛔ **A one-element list. `/studio/<group>` — the multiparty WIP space —
> PASSES `isReleased` and would earn.**

⚠ It is probably protected today only because `/studio/` paths have no
covering zone, so `resolve` returns `[]` for want of a zone rather than
by the release test. **That is accidentally correct, which is the worst
kind** — it holds until studio content gets a zone, or until routing moves
to path-grain (§ 3), and then the accident stops protecting us.

⭐ **One-line fix**, and the area is already flagged: *"the richer
team-sandbox + explicit `release` action is deferred."*

## 2. ⭐⭐⭐ "A constant rate" is the right diagnosis; the remedy is already better

> **User: "unpublished code earns at some constant rate because we can't
> really measure quality, so any measure of quantity doesn't know how to
> multiply."**

Exactly right: **standing is `quantity × quality`, engagement supplies
the quality term**, and unpublished work has no engagement — so there is
no multiplier, only quantity, and **quantity alone pays for volume.**

But the problem a constant rate solves is already solved:

> ⭐⭐⭐ **Publishing is retroactive in effect.** `authorOf` returns the
> **earliest** author — *"a later save by a different player never changes
> it"* — so six months of unpublished work earns from **every subsequent
> engagement**, forever, with you as author of record.
>
> **Deferred, not denied.** No constant rate needed, and the incentive to
> publish is the mechanism rather than a nudge.

⚠ **The honest residue:** work that never publishes earns nothing, ever.
Correct — the polity got nothing — but harsh on ambitious failures. ⭐ And
that is the labor market's job: if somebody wants speculative work to
exist, they **commission** it on
[contract.md](../../subsystems/contract.md)'s board.
**Wages for speculative work; standing for delivered work.**

## 3. ⭐⭐⭐ Path-grained routing dissolves most of the collaborative problem

Before choosing between an algorithm and a human, notice what a one-line
narrowing already does. `CreditRouting` resolves *the covering zone's*
author; `authoring_events` is **already path-indexed**
([attribution-slate](./attribution-slate.md) says the same).

> **If I wrote the tavern and you wrote the smithy, engagement at the
> tavern credits me and at the smithy credits you — no committee
> decision, no declared split, no algorithm beyond `authorOf`.**
>
> ⭐⭐ **Most collaboration is partitioned by ARTIFACT even when it is not
> partitioned by parcel**, and path-grain reads that partition for free.

What genuinely remains is two things, wanting different answers:
**(a) the co-authored artifact** · **(b) non-authoring labor.**

## 4. ⭐⭐⭐ Don't pool it — the committee declares FACTS, not ALLOCATIONS

> **User: "part of me wants to say you award a pool of standing for the
> parcel and let the committee sort it out, but this is too important and
> we at least need controls."**

The instinct is natural and the hazard is specific:

> ⚠⚠ **Standing is the franchise.** A committee that allocates standing
> to its members **manufactures voters** — control a parcel, generate
> standing, control the chamber.

| | what it is | checkable? |
|---|---|---|
| ⭐ a **contributor set** | *these three co-wrote this room* | ✅ against `authoring_events` |
| ⛔ a **pool split** | *40/30/30 of the parcel's standing* | ⛔ pure distribution — nothing to check against |

> ⭐⭐⭐ **That is the control: committee discretion becomes FACTUAL rather
> than DISTRIBUTIVE**, which makes it reviewable, and declared-vs-derived
> is the audit.

⭐ And declaring it **per-artifact rather than per-parcel** collapses the
stakes: nobody manufactures standing wholesale, only asserts who wrote
one room.

## 5. ⭐⭐⭐ The contributor declares, not the committee

> **User: "contributors just declare their contribution and its up to the
> committee to audit it through whatever records are available to them."**

⭐ This fixes a hole an earlier draft had: *a contributor set the speaker
alone can write is a speaker who can write themselves into every
artifact.* **If each contributor declares their own, nobody declares on
anyone else's behalf.**

### ⭐⭐⭐ And the property that makes it self-policing: the shares must SUM

> **A declaration that must reconcile with other people's declarations is
> self-policing in a way a solo claim never is.** Four people each
> claiming half is immediately visible **to the four of them.**
>
> So it is not *audit my claim* — it is **a reconciliation among
> contributors**, which is how co-authorship actually gets settled.

⭐⭐⭐ **And until it reconciles, nothing mints.** A deadlock costs **the
claimants**, not the commons — the people with most to gain from
resolution are the ones who must resolve it.

### What gets declared: role × magnitude, never a percentage

⚠ **Equal weight fails**, and the user's case is why: *"a 2 line bugfix
and building out an entire experience both put you on a git log."*
⚠ **And percentages fail too** — they invite haggling over decimals, and
**granularity invites aspiration** (the Netflix lesson, third occurrence).
⚠ **Role alone also fails**: *author* on a 2-line fix and *author* on the
whole room are the same role.

| declared by | what |
|---|---|
| ⭐ **the contributor**, per artifact | **role** (*wrote · reviewed · tested · coordinated · designed*) **× magnitude** (*substantial · material · incidental*) |
| ⭐⭐ **the committee**, once | **what each (role × rung) is worth** |

> ⭐⭐ **The role × rung table IS the committee's organizing principle** —
> which is how *"unless the committees organize around it"* happens. A
> guild weights *wrote*; a municipality weights *coordinated*; a trust
> weights *reviewed*, because stewardship is the work.

⭐ It separates two decisions that were tangled: **what roles are worth is
POLICY** (declared once, reviewable, stable) and **who played which is
FACT** (declared per artifact, checkable).

## 6. ⭐⭐⭐ Non-authoring labor: two instruments, and the collaborators choose

> **The contributor set earns STANDING. The contract board pays WAGES.**
>
> If a reviewer should share the standing, **put them in the set.** If
> not, **pay them.**

⭐⭐ Because conflating them makes **every helpful act a political
claim** — the fastest way to inflate the producer chamber — and
review-count is as gameable as commit-count.

## 7. ⭐⭐⭐ The renewing obligation

> **User: "probably publish with a renewing obligation to confirm."**

⭐⭐ What it buys: **credit tracks who is still carrying the thing**, not
just who started it. A parcel earning for years on a 2019 split — one
contributor long gone, three others maintaining since — is wrong, and
only renewal catches it.

### ⭐⭐⭐ Lapse must NOT be redistributive

| when a contributor does not confirm | consequence |
|---|---|
| ⛔ their share goes to the others | ⚠⚠ **co-contributors are now incentivised not to remind each other** |
| ⭐⭐⭐ their share **stops minting** | **nobody profits from another's silence** |

> The artifact earns less in total and no one gains — the same
> share-never-a-transfer property as the endorsement pool
> ([feedback-slate § 4a](./feedback-slate.md)).

### ⭐⭐⭐ Authorship is permanent; the share is renewable

| | |
|---|---|
| **authorship** | ⭐ **permanent** — the deed. `chronicle`, `provenance`, the record. You are always author of record |
| **the credit share** | ⭐ **current** — a live thing you keep confirming |

⭐⭐ It is `land-compute`'s doctrine a third time: ***title is permanent,
entitlement is derived-on-read.*** **Authorship is title; the earning
share is entitlement.**

⭐⭐⭐ And it **removes an anomaly rather than adding decay**: standing is
already a rate, not a pool (`renown` and `participation` are both
decayed; *standing = a RATE* is a standing correction). **A permanent
earning share would have been the odd one out.**

### The cadence: renew on next publish, with a long backstop

> **The obligation renews when you next publish to that parcel**, plus a
> long timer behind it. ⭐⭐ So **active maintainers confirm as a side
> effect of working**, and only dormant parcels hit the timer —
> **the burden falls on the inactive, which is where a lapse belongs.**

⚠ Renew at the **bundle** grain, not per artifact. A prolific author with
two hundred artifacts should face one act, and *nothing changed* should be
one click — otherwise obligation fatigue makes it a formality people click
through, which is worse than not having it.

⭐ And **revising downward is a declarable act**: *"I don't maintain this
any more"* beats lapsing quietly.

### The backstop

⭐ `authorOf` — **earliest author takes all** when nobody declares. So
**the whole contributor-set mechanism is OPT-IN**; sole proprietors (most
of the corpus) never touch it.

⚠ **But the backstop must be the DEFAULT, not the failure mode.** If a
*lapsed* set fell back to earliest-author-takes-all, letting it lapse
would become a way to consolidate credit on the first author — the
redistributive hazard by another door.

> ⭐ **No declaration → `authorOf`. A declaration that lapses → nothing
> mints for the lapsed share**, and the rest of the set is unaffected.

## 8. ⭐⭐⭐ What is actually reconcilable

> **User: "we need to talk about whats actually reconcilable."**

> **A claim is reconcilable iff it contradicts a DERIVED fact.**

| the claim | reconcilable? |
|---|---|
| *I wrote the rooms* | ✅ `authoring_events` has your rows or it doesn't — **refutable** |
| *I reviewed this* | ✅ against forum activity on its subject |
| ⭐ *I'm still maintaining it* | ✅ no authoring rows in 18 months — **the renewal's own audit** |
| ⛔ *my two lines were substantial* | ⛔ **nothing derives intent** |

> ⭐⭐⭐ **The audit can refute PRESENCE claims and cannot refute MAGNITUDE
> claims.** Magnitude disputes are **irreducibly social** — settled by the
> people who were there, or by the committee, never by a record.

⭐⭐ **Design consequence: keep the rungs few and coarse.** Three is
arguable in good faith; ten invites litigating decimals nobody can
settle.

### Commit metadata — and the line that follows from renewability

> **User: "do we want metadata in commit messages that tell us about the
> contribution being made?"**

> ⭐⭐⭐ **A commit is immutable. A declaration renews.** And
> `git-workflow` makes history rewrites *"out of scope — rollback is
> additive `revert` only."* **So the live split cannot live in a commit.**
>
> **Commits carry FACTS about the act. The ledger carries CLAIMS about
> the contribution.**

| | source |
|---|---|
| **who** | ⭐ already in the synthetic committer — `<Name> <playerId@saxonberg.local>` |
| **what paths** | the diff; and `authoring_events.path` is indexed |
| **when** | ⭐ the ledger is *richer*: `at`/`realAt` — **game-time and wall-time**, where a commit has only wall |
| **role** | ⭐⭐ **partly derivable from diff shape** — a change touching only `__tests__/` is testing |
| ⛔ **magnitude · intent** | **claim only** |

⭐⭐⭐ **One convention worth adopting, and git already has it:
`Co-Authored-By` trailers** — parseable, standard, and exactly right
because **immutability makes them good evidence of what was asserted
THEN**, while the ledger holds what is true *now*. ⭐ Plus a trailer
naming the **work item**, because a diff across twelve files says what
changed and not what it was part of — which is what a magnitude claim is
about.

### ⭐⭐⭐ The audit surface is a JOIN — six ledgers, five shipped

| ledger | shows | state |
|---|---|---|
| `authoring_events` | who authored which path, when, earliest-first | ✅ |
| git — committer + diff + trailers | the act, its shape, who was claimed then | ✅ |
| ⭐ `forum_events` + **template-as-Subject** | **review and discussion per artifact** | ⭐ needs the third `grain` |
| `contract_events` | commissioned work, who was paid for what | ✅ |
| `participation_events` | that somebody was present and active in the period | ✅ |
| `chronicle` | prior claims and adjudications — **deed vs claim** | ✅ |

> ⭐⭐⭐ **So "what else do we need to record" is: nothing. We need a
> JOIN.** The only genuinely new record is **the claim itself.**

⭐⭐ And note row three: **review may already be a ledger** if a template
is a Subject — `feedback-slate`'s template-as-Subject paying off a second
time, which makes that one small vocabulary addition load-bearing for two
separate features.

## 9. The controls, since standing is the franchise

| | control |
|---|---|
| ⭐⭐⭐ | **declared facts, never allocations** — discretion is checkable |
| ⭐⭐ | **declared-vs-derived is published** — a set naming someone with no authoring rows is *visible* |
| ⭐⭐⭐ | **standing mints on ENGAGEMENT, not on declaration** — a false set earns nothing until somebody shows up |
| ⭐ | **a re-split is prospective only** — same shape as the cost-basis pin |
| ⭐⭐ | **appeal has shipped vocabulary** — `chronicle` distinguishes **deed from claim** |
| ⭐ | **the audit is the COMMITTEE's** — the commons sees the attestation, never the deliberation |

## 10. Open questions

1. ⚠⚠ **Can an omission be appealed after the fact?** A re-split is
   prospective, so somebody left out can win a *future* share and never
   recover the past. ⭐ I think that is right (it matches the cost-basis
   pin and keeps minting stable) — but it means **being left out and not
   noticing is unrecoverable**, which is the sharpest edge on this design.
2. ⚠ **Does the commons ever override a false attestation?** It lands with
   the courts — [courts-slate](./courts-slate.md)'s *a clerk not a judge*
   — and a standing dispute is exactly what a sortition jury is for.
3. ⭐⭐ **Who may write the contributor set at the committee level?** § 5
   moves the declaration to each contributor, which mostly answers it —
   but the *attestation* binds the committee, and that is
   [committee-slate](./committee-slate.md)'s facade question (b).
4. ⭐ **Sole proprietorship is most of the corpus**, so the contributor-set
   machinery serves the minority. ⭐⭐ **Path-grained routing plus
   `/studio/` in the prefix list may get 90% of the way with two small
   changes** — worth knowing before the tail is built.

## Cross-refs

- [standing-mint-slate.md](./standing-mint-slate.md) — the values frame
  this slate takes as given: *it is a morality score*, legibility as the
  only lever, the pathologies as reachable states.
- [provenance.md](../../subsystems/provenance.md) — `authoring_events`,
  `authorOf`, `CreditRouting`, and the `CreditShare.weight` seam this
  slate fills.
- [attribution-slate.md](./attribution-slate.md) — the path-grain
  recommendation, and the declared/derived pattern reused here.
- [committee-slate.md](./committee-slate.md) — who attests, the facade,
  and why the commons never audits a contributor declaration.
- [contribution-slate.md](./contribution-slate.md) — where the
  declaration is made, and why landing is the recording act.
- [feedback-slate.md](./feedback-slate.md) — the share-never-a-transfer
  property § 7 reuses, and template-as-Subject.
- [contract.md](../../subsystems/contract.md) — wages, for the labor § 6
  routes away from standing.
