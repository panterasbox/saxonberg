# Core-group decomposition slate — deleting `'core'`, and what replaces each of its five jobs

**Captured 2026-08-04**, out of the content-packs session. The ask:

> **User: "I want to get rid of the core group. There should be specific
> groups for specific operations, but for each class we need to talk if
> it's an office in an org or what, how it gets filled. So after you do
> the audit there's a conversation there."**

This slate is **the audit plus a proposed disposition**. The
office-vs-group calls are *not* all made — they are the conversation this
was written to enable.

> **Status: audit is real and reproducible (2026-08-04, against
> `packages/server/src/mud/`). Dispositions are proposals except where
> marked decided. NOT a build plan.**

> ⭐ **Sequencing is decided: this comes AFTER the content-pack
> migration** ([content-packs-slate](./content-packs-slate.md)). *User:
> "doing the core deletion after is fine."* And it is genuinely better —
> see § *It drains, it does not cut over*.

Related: [access.md](../../subsystems/access.md) (the six axes, the
code-trust lockdown, `requiresCoreAccess`),
[parcel.md](../../subsystems/parcel.md) (`ownerOf`'s state rung),
[balance-slate](./balance-slate.md) (the PM chain, the ops seat, the
office-vs-group test), [content-packs-slate](./content-packs-slate.md)
(structure vs. authority; the migration that drains job 2),
[governance.md](../../subsystems/governance.md),
[mql.md](../../subsystems/mql.md) (`:admin`).

---

# The audit — `'core'` is five jobs wearing one name

| # | Job | Where |
|---|---|---|
| 1 | **Default title holder** — untitled content resolves to `core` | `ParcelRegistry.STATE_GROUP_NAME`, `ParcelLogic.STATE_OWNER` |
| 2 | ⭐ **The implicit owner of everything unparcelled** — `write`/`read`/`rm`/`mkdir`/`clone`/`destruct`/`teleport`/`goto` all fall through when the target has no title | ~20 call sites |
| 3 | **`broadcast` + `soul` authority** | `requiresCoreAccess` — **exactly 2 verbs** (`cmd/social/broadcast.yaml`, `cmd/social/soul.yaml`) |
| 4 | **Author scope** for MQL pre-gates | `ensureAuthorGroups` = every group-kind parcel owner **+ `core`** |
| 5 | **The MQL `:admin` axis** | `coreMemberIds`, precomputed per dispatch in `CommandLogic` |

Axis call-counts for context: `isWizard` 24 · `canMutateZone` 10 ·
`isAuthor` 9 · `isArchwizard` 1 · `isStreamer` 1.

## ⭐⭐⭐⭐ Job 2 is the load-bearing one, and it is barely visible

> **`core` is the de-facto owner of every path nobody has titled.**

Which reframes the whole exercise:

> ⭐⭐⭐⭐⭐ **The `core` fallback is a SYMPTOM OF UNPARCELLED CONTENT, not
> a permission model.** If `/obj/whatever` needs an owner to decide who
> may write it, the answer is **give it a title** — the parcel registry
> already does exactly that, with a coverage trie and a longest-prefix
> walk.

## ⭐⭐ It drains, it does not cut over

Every pack that claims an extent gives content a real owner and removes
call sites from job 2. **You watch the number go down and delete the
group when it reaches zero**, instead of picking a cutover day. That is
the whole reason this sequences after the pack migration — *it is the
same work, not extra work.*

---

# Proposed disposition, job by job

| Job | Becomes | Filled how |
|---|---|---|
| 1. state title | **a state/commons principal, not a group** — zero members by construction | nothing to fill |
| 2. unparcelled content | **titles**, per pack extent | pack `requires: title` |
| 3a. `broadcast` | ⭐ **the ops seat** (decided — see below) | PM appoints |
| 3b. `soul` | ⭐⭐ **pack maintainership** — leaves the game entirely | out of game |
| 4. author scope | already *"holds any title"* + `core`; **drop the `+ core`** | falls out |
| 5. `:admin` | ⭐ **delete** (see below) | — |

## ⭐⭐⭐ `soul` dissolves rather than relocating

Once emotes are a content pack
([content-packs-slate](./content-packs-slate.md) § contribution model —
*emotes are the clearest case for a standalone pack: writers not
programmers, tiny units, huge volume, cosmetic tier*):

> **"Who may edit the emote catalogue" becomes "who may merge to that
> repo." The authority leaves the game.**

That is the strongest single argument for the contribution-model framing
— it does not relocate a permission, it **replaces it with a review
process** that already has tooling, history and a conversation attached.

## ⭐⭐ `:admin` is already dead — delete, do not migrate

> **Its only consumer is a test asserting it requires admin tier.** No
> content, no controller, no verb calls it. It exists *because* `core`
> exists.

Deletion covers: the predicate, the `coreMemberIds` precompute in
`CommandLogic`, the field on `MqlContext` / `api/command.ts`, and the doc
lines in mql.md + access.md.

## `broadcast` — decided, and it is not a group

Worked in [balance-slate](./balance-slate.md) § *Publishing is three
different problems*. The short form:

> **Operator announcements are ops, out of fiction.** No committee, no
> lineup, no editorial anything. **Ops is a function of the executive**
> (*user*), currently the PM, and wants its own seat because it
> **encapsulates what the engine cannot observe** — AWS, Mongo, the
> anchoring chain.

⚠ **Authority and delivery separate:** the office legitimates, but the
delivery path **must not require a healthy world**, or the outage eats
the outage announcement.

⚠ **Do NOT ride `isWizard` for it** — that conflates the megaphone with
code-trust in both directions. A community manager needs to announce and
should not get TS-escape.

---

# The office-vs-group test (for the remaining calls)

> ⭐ **Office when the answer must be ONE accountable person and the act
> is publicly attributable. Group when it is ongoing work many people do
> in parallel.**

`broadcast` is an office — someone is speaking *as the world*, and
*"which of the nine of you sent that"* is a question you will want
answered. Content stewardship is a group; nobody needs a single throat
for *"who edited a room."*

⚠ **Corollary: an office with no holder must fail closed and say so** —
otherwise deleting `core` just relocates the outage.

---

# Open questions

1. **Does the state/commons principal need to exist at all, or does
   `ownerOf` simply return `null` for untitled paths once everything is
   parcelled?** *Leans: a named principal* — `null` invites every caller
   to invent its own fallback.
2. **Is job 4 (`isAuthor`) still needed once title is universal?** It is
   an MQL pre-gate that cannot be resource-targeted; it may survive as
   *"holds any title anywhere."*
3. **Who holds the `soul` pack's merge rights before there is a
   community?** Founder-default, presumably — but it is worth stating,
   since it is the first authority to leave the game and should not
   quietly leave via an unowned repo.
4. **Does `requiresCoreAccess` survive as a validator at all?** With both
   its consumers reassigned, it may just be deleted.
5. ⚠ **What is the acceptance test for "core is gone"?** *Leans:* the
   group is absent, `ownerOf` never returns it, `lint:gates`-style script
   finds no literal `'core'` outside a migration note — and the number of
   untitled paths reachable by a write verb is zero.
