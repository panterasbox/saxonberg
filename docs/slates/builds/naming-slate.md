# Naming slate — non-unique names, renaming, and impersonation

**Captured 2026-08-12**, from a design conversation about the cost of the
platform's founding naming choice: **names are not unique.** Any player
may take any proper name. The recommendation is a surname, for
disambiguation, but nothing enforces one.

That choice is right and stays. This slate is the bill it comes with,
and how it gets paid.

> **Status: design conversation, captured. Not requirements.** The
> substrate it rides — belief, chronicle, renown, accountability — is all
> shipped; nothing here needs new architecture. What it needs is one gate
> at one sink and one notification.

Related: [belief.md](../../subsystems/belief.md) (**read first — it
already does most of this**), [chronicle.md](../../subsystems/chronicle.md)
(the identity ledger; deeds), [contacts.md](../../subsystems/contacts.md)
(*durable identifiers only — "stable across name changes"*),
[renown.md](../../subsystems/renown.md) (per-scope measured standing),
[accountability.md](../../subsystems/accountability.md) (the harm ledger),
[measurement.md](../../measurement.md) (**Part 9 — what a display may
never show**), [corpo.md](../../subsystems/corpo.md) (the mark substrate —
where a *contested* name eventually goes),
[char-gen.md](../../subsystems/char-gen.md) (where a name is first taken).

---

# ⭐ The premise most of this rests on

`RecognitionApi.describe` **never shows a stranger your name.**

> an unknown being renders the **bare stem** — its `shortDescription`
> ("a crossing guard"), else a species fallback — **never its true name**.
> — [belief.md](../../subsystems/belief.md)

You see someone's name only after a recognition record exists for them:
they introduced themselves, someone vouched for them, or you learned it
another way. This is already shipped and it reshapes every problem below,
because it means **the casual observer never had your name to begin
with.**

Three consequences, all load-bearing:

- The worry that *"changing your name makes you look like a different
  person to everyone"* is mostly already answered. To almost everyone you
  pass, you were never a name — you were "a tall khazadicus," and you
  still are.
- The set of people a rename can mislead is **exactly** the set holding a
  recognition record about you. That set is enumerable
  (belief's `{realm, referent}` reverse index), which makes the honest
  fix cheap.
- A name is never *seen*, only ever *given*. So every false name that
  reaches a screen got there through an **act**, at a moment, in front of
  witnesses — which is the only reason any of this is tractable.

---

# Part 1 — A name is not an identifier

Already true throughout the engine, and it must be written down as an
invariant because everything else leans on it:

| Subsystem | Keys on |
|---|---|
| belief — recognition / identification / regard / discovery | `templatePath` (`/obj/Avatar/<playerId>`) |
| chronicle | `owner` templatePath |
| contacts | `playerId` — *the doc already says "stable across name changes"* |
| renown · participation · producer · authoring | identity |
| accountability · contracts · parcels · chattel · bank accounts · offices | identity |
| MQL targeting | per-viewer `perceivedKeywords`, not the true name |

> ⚠ **Nothing may ever key on a name string, and names may never be made
> unique.** A rename is display text and nothing else; every consequence
> follows you.

**This is also the exoneration mechanism** (Part 4). Because every trace
keys on identity, an impostor's deeds land on the impostor's ledger and
never on the ledger of the person whose name he wore.

---

# Part 2 — Renaming

## The kernel / dial split

Run the necessity-kernel test
([dont-escalate-dials-to-kernel](../../CLAUDE.md)): *can it be added by
amendment?*

- **Kernel: the announcement.** A rename that can happen *silently* makes
  the fact unrecoverable — lost evidence, the one category that is
  genuinely kernel.
- **Dial: the frequency.** How often you may rename changes no evidence
  and is pure social friction. Ships as an `app_settings` default,
  polity-amendable.

Once the announcement is kernel, notice what the cooldown stops doing.
Walk the scam: the con man scams Alice, renames — **Alice is told.** He
gained nothing against Alice. Against Bob, who never met him, he already
had a clean slate. **The rename buys nothing against anyone.** So the
cooldown is not a security control and can be set generously.

## The rename act

1. **Every holder of a recognition record about you is updated and
   told.** Exactly the set who could have been misled — no more, no less.
   Strangers aren't notified because strangers had nothing to un-learn.
   This is the **first consumer of the `{realm, referent}` reverse index**
   belief.md shipped and noted nobody reads yet.

2. **Offline players learn on next login.** The belief record is durable
   and hydrates at `Avatar.enter`.

3. **A decay window.** The client renders `Ash Vale (was Bran Corrigan)`
   for a period, then drops it. Temporary, and visible only to people who
   already knew.

4. **Free and silent while nobody knows your name.** *Derived, not a
   timer* — belief's write-through gate only persists records that
   actually learned something, so "how many people know my name" is a
   real, cheap query. The regret window ends when you become somebody.

   > ⭐ **The price of a name is the number of people who know it.**

5. **After that, one rename per interval, announced.** ~30 real days as
   the shipped default.

6. **On the record.** A chronicle **deed** (engine-witnessed = deed, never
   claim), plus the prior name into `alternateNames` as
   `{ kind: 'maiden' | 'alias' }` — the field already exists on
   `NamedMixin`.

## Prior names are private, and that is free

⚠ Real people have real reasons to want a name change to actually stick:
escaping harassment, and a character rename that mirrors a real-life
transition. A design that stamps *"formerly X"* on someone forever is
harmful.

Full generosity is affordable here **because Parts 1 and 3 do all the
anti-exploit work.** The prior name is known to precisely those who
already knew it. Never published, never searchable, never on a public
profile.

Public accountability is untouched: it lands on **identity**. An office's
chain of holders is public, and identity is stable across names.

## Dials, with recommendations

| Dial | Recommendation |
|---|---|
| A fee at a records office | **No.** A diegetic hook for the civics layer later; inventing a sink to solve a problem the announcement already solved is easy to add and annoying to remove. |
| A notice period (deed-poll banns — both names render for some days) | **No.** The announcement plus the `(was …)` decay window covers the same ground more cheaply. |

---

# Part 3 — Impersonation

## The disaster case

Not a player sharing reputation between two of their own characters. **A
different user entirely**, trading on the standing of someone they are
not — renaming to match a feared or respected character so that people
who don't know better submit to a peril that isn't real.

## Two channels, very unequal

| Channel | What it plants | Danger |
|---|---|---|
| **Engine-mediated** — rename, then `introduce` | A real recognition record. The client genuinely **renders** the false name. Durable, silent, propagates. | ⚠⚠ The disaster. One entry point: the rename. |
| **Plain speech** — "I'm Vex Corrigan" | Nothing. The room list still reads "a tall khazadicus" — **the interface contradicts the claim.** | Low, and unclosable by any engine. |

`IntroduceController` plants `actor.getName()` — your **own** name. So a
false name cannot enter the belief store without a rename first. That is
the chokepoint.

⚠ **The amplifier:** third-party `introduce` passes
`actor.recall(RECOGNITION, referent)?.knownAs` — *the actor's belief.* One
successful plant then propagates through honest people who sincerely
vouch for the impostor, with no further act by him.

## The one fact both defenses run on

> ⭐ **A name's weight is the number of people who currently hold it for
> someone.**

Not renown, not a platform score. Queryable off the same reverse index.
An **internal check, never a displayed gauge** —
[measurement.md](../../measurement.md) Part 9 forbids "the platform
ranking players on a valuation it chose," which rules out a standing
badge beside a name.

## Defense A — the guarantee: a conflicting name cannot be planted

`RecognitionApi.learnIdentity(viewer, subject, name)` first asks: **does
this viewer already hold that name for a different identity?** That is
`recallRealm(RECOGNITION)` over the viewer's own small in-memory working
set — a rare write path, no index, no Mongo, no hot-path cost.

If yes, **the name is refused, not planted.** The existing record for the
real Vex is untouched, and the claimant renders as *"someone claiming to
be Vex Corrigan."* Honest fog, and it reads well.

Three properties make this the guarantee rather than a mitigation:

- **It fires for the whole room.** `IntroduceController` loops
  `learnIdentity` over every sensor in perception range, so every witness
  who knows the real Vex sees the contradiction **at the moment of the
  claim**, publicly, in front of the people equipped to call it out.
- **It closes the amplifier for free.** Third-party introduce goes
  through the same sink, so a well-meaning victim vouching for the
  impostor is caught on the next honest listener.
- ⭐ **Fame makes you harder to fake, not easier.** The more people know
  the real Vex, the more of them are in any given room to catch it. The
  attack requires isolation from everyone who knows the target — which is
  what a con requires in life.

It is honest by construction: it tells a viewer only what **their own
memory** entitles them to know. No global name registry, nothing to
consult, nothing leaked.

## Defense B — the cheap prevention: taking is gated, holding is not

You may not **take** a name that is currently load-bearing in a scope you
share. You may **keep** one you already had.

The asymmetry is the design:

- Collision by **coincidence** is legal forever. Two unknown Ash Vales,
  fine — and if one later becomes famous, the other is grandfathered.
- Collision by **choice**, after the name became load-bearing, is
  refused.

That is trademark logic — likelihood of confusion plus later adoption —
and the same shape as the corpo mark substrate.

> ⚠ **This does not make names unique.** The check is not *"is this
> string taken"* but *"does this string already mean somebody to people
> here."* Approximately every name means nothing to anybody and stays
> freely duplicable.

Applies to **rename and char-gen alike**. When char-gen refuses, the
natural remedy it offers is *"add a surname"* — which is the nudge the
design already wanted.

Prevention cannot be complete: a name can be squatted before it becomes
valuable. That is fine. **B is convenience; A is the guarantee** — the
squatter still trips A the moment he introduces himself to anyone who
knows the real one.

## Defense C — the name-holder is told

⭐⭐ Every defense above protects **observers**. The party with the actual
claim — the person whose name is being worn — is the one nobody tells,
and may never find out at all.

- **A plant of your name onto another identity notifies you.** Not a
  hidden measurement and not a platform valuation: the engine reporting
  **use of your own identity**, the same principle as the authorship
  ledger.
- ⚠ **Scoped tight: *that* it happened, and when.** Not the impostor's
  location — otherwise it becomes a scrying vector (bait a plant to find
  someone).
- **What you learn beyond that scales with witnesses.** If someone who
  knows you was in the room, you learn who and where — through them. So
  having people who know you is *mechanically* protective. Same inversion
  as A: fame is a network, and the network is what reports back.
- A **refused** rename attempt does not notify (nobody was harmed) but
  **is recorded**, so a repeated pattern is evidence.

---

# Part 4 — Two victims, not one

The fooled observer is the obvious victim. The impersonated party is the
second, harmed differently and arguably worse: the impostor's bad acts
get attributed to their name by everyone who cannot tell them apart.

**That harm is already recoverable, and Part 1 is why.** Regard, renown,
accountability blame, contracts, chronicle deeds — every mechanical trace
lands on the impostor's identity, none on the victim's. The victim's
chronicle has no such deed.

> ⭐ **The damage is confined to human word-of-mouth, and the ledger is
> the answer to it.**

---

# Part 5 — Ambiguity and the client

The everyday cost of non-unique names — two people you know as "Ash" in
one room. Nothing here is about fraud.

- **Never silently resolve.** A bare ambiguous name prefers the one you
  recognize; if still ambiguous, it **prompts** (`PromptApi`'s cardinality
  policy already does this). Arbitrary-order picks are banned.
- **Reuse the salient-feature mechanism.** `describe` already composes
  distinguishing features for the stranger case. Extend the same
  machinery to the *collision* case — "Ash in the red coat" — so the
  engine never pretends two people are distinguishable when they aren't.
- **Names are references, not text.** Identity tags already reach the
  wire carrying `stuff-id`, so every rendered name is clickable and the
  client can ask who that is. ⚠ `stuffId` is reboot-ephemeral — a session
  handle, fine for clicking, never for storage.

---

# The never list

- **Never key anything on a name string.**
- **Never make names unique.**
- **Never publish a prior name to anyone who didn't already know it.**
- **Never let a rename be silent to those who knew you.**
- **Never let a rename be permanently blocking** — there is always
  another one, eventually.
- **Never let a rename change any measured standing.**
- **Never show a standing gauge beside a name** to solve impersonation
  ([measurement.md](../../measurement.md) Part 9).

---

# The residual, stated plainly

Someone who knows the real Vex **only by reputation** — never met him,
holds no record — alone in a room with an impostor, gets no warning.
Defense A cannot fire for them; there is nothing in their memory to
contradict. The doctrine-clean options for closing it (a standing badge
on the name) are exactly what measurement.md forbids.

What catches it instead: rename and introduce are both engine-witnessed,
so the sequence sits on the accountability ledger and impersonation is
**prosecutable after the fact**. That is the polity's job, not the
engine's — the same answer the design gives everywhere else a con is
possible.

And the honest limit on renaming generally:

> **A rename does not launder a reputation — leaving the people who know
> you does.** Renown is already per-scope. Moving town and being unknown
> is a real, legitimate human thing, and the rename adds nothing the move
> did not already buy.

---

# Deferred

- **A contested name adjudicated rather than auto-refused.** Defense B
  refuses mechanically; a *disputed* claim wants a civic process, and it
  has an obvious home in the corpo mark substrate
  ([corpo.md](../../subsystems/corpo.md) — `MARK + approval`). Not built.
- **Player-set nicknames** — already deferred in
  [belief.md](../../subsystems/belief.md), and a good fit here: *you do
  not get to control what I call you.* A viewer's `knownAs` is theirs.
- **Surname semantics** — marriage / adoption / business names changing a
  surname is a lighter act than a full identity change and should
  probably cost less. Needs the lineage substrate
  ([blood-slate](./blood-slate.md)) first.
</content>
