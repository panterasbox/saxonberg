# World-scan — requirements

**Kind:** refactor/sweep (with infra: one call-security policy, two build
gates, one response note)
**Leads from:** kernel — first consumer is **the seventeen call sites that
already exist**. This substrate is not speculative: it is being built
because seventeen places in the shipped game already do the thing it
replaces, and one of them has already pinned a CPU core in a live drive.

The realm answers questions about itself by **reading every object it has
ever made**. Seventeen places in the running game ask *"where are all the
X?"* by walking the entire object registry — every instance and every
authored row — and filtering afterwards. Some of those places are cold
(once, at shutdown). Others run when you get paid, when you put a coat
on, when a shopkeeper notices you, and once per tick for every NPC
minding a property. The cost does not scale with the answer; it scales with
**how much world exists** — today 1,785 objects with nobody logged in,
and it never shrinks — multiplied by how often the question is asked.
⭐ At that size the second term is the one that hurts: one of these
questions, asked once per creature per tick, has already pinned a CPU
core in a live drive.

This build stops that. It makes the common question cheap by indexing the
one axis every object actually has, gives the rest of the questions to the
objects that own the answers, and then **closes the door** so the pattern
cannot come back — because it has come back once already, during the six
days this design sat unbuilt.

Seeded by [world-scan-perf-slate](../slates/tails/world-scan-perf-slate.md),
whose D1–D5 are the settled design.

---

## What already exists

**The mechanism is not new; it is *sanctioned*.** A build-time gate
already forbids hand-rolled registry loops and **herds them onto the
`world:` query instead** — the current antipattern entry shows a
hand-rolled scan as the wrong way and a `world:` query as the right way,
using as its worked example a call site that is *on this build's list*.
So the pattern is not drift. It is the documented house style, and
inverting the doc is part of the work rather than a footnote to it.

- **The player-facing query grammar** already documents `world:` and
  offers it as an example. **154 of 529 command views** accept a
  query-typed argument, and a typed seed overrides the view's declared
  scope — so that is the width of the door today.
- **The `who` roster, and every broadcast loop** (weather, fire,
  residency, presence) legitimately read the whole set of people who are
  logged in. ⭐ These are **not** in scope: their size is bounded by who
  is playing, and reporting on all of them *is* the operation.
- **Thirty build-time gates** exist, two of which are the exact shapes
  this build needs — an allowlist gate that forbids a mechanism outside
  named homes, and a facade gate that forbids reaching an internal
  singleton directly.
- **The wire suite** shipped, and a drive is now *born* as a wire file
  rather than a throwaway script.
- **The office apparatus** is shipped and constituted, with the Prime
  Minister's seat held by derivation and never by a stored grant.
- **A call-security policy family** exists that identifies a caller by
  its code provenance and its clone lineage — but **not** by the calling
  function, which is the basis this project prefers and has not built.

**Therefore what is genuinely new here is:** an index on mixin
composition; a call-security policy keyed on the calling function; the
refusal itself and the office-holder's exemption; one warning on the
response; and two build gates. **Everything else is rewriting questions
that are already being asked, so that they are asked of whoever owns the
answer.**

---

## Goals

- **No ordinary player can cause the server to read the whole world**, by
  any typed input, in any command, on any surface.
- **The Prime Minister can** — deliberately, for any command, and is
  **told what it cost**.
- **The realm's own questions are answered from an index**, so that the
  common case does not get slower as the world grows.
- **A question about one business, one item, one extent or one owner is
  asked of that owner**, not of the world — including on the two paths
  that move money and the one that runs per NPC per tick.
- **The pattern cannot return**: what is now forbidden is forbidden by a
  gate, and the guidance that recommends it says the opposite.
- **Nothing a player can do today stops working.** This build changes how
  the world answers, never what it answers.
- **A surface that grows without limit is not handed out whole** — the
  question is named and answered, the table stays private.

---

## Non-goals

- **A query grammar for the specialized rosters** — deferred to the
  slate's D5, revisited only if a pattern actually repeats.
- **Selecting on capabilities granted at runtime** rather than composed —
  recorded as open question 1 on the slate; the index hardens today's
  meaning deliberately.
- **A general "read the whole world" command for anyone else.** Not
  needed: the office holder's typed access covers it. If a case appears,
  it is a verb with a seat behind it — **nowhere yet, deliberately.**
- **Re-tightening the ~35 sealed-but-ungated mutators**, and the
  permit-and-watch audit rail → both belong to
  [call-security-pass-slate](../slates/builds/call-security-pass-slate.md),
  which this build feeds by proving its first new policy.
- **The `who` roster and the broadcast loops** → nowhere, deliberately.
  Their size is bounded by concurrency, and they consume the whole set on
  purpose. ⚠ Revisit only if concurrent sessions reach five digits.
- **The residence and holding subsystems' own design** — this build gives
  them a roster they lack; it does not change what a holding is.
- **Two unrelated defects observed while surveying**: a persistence index
  that fails to build at every boot, and the end-to-end suite's harness
  timing out. Both predate this work → **nowhere in this build**; raised
  separately.

---

## Placement

**Kernel-led**, and it must be: the registry, the query grammar, the
policy family and the response envelope are all engine, and no pack may
own any of them.

**Three packs are touched**, each in its own root, and each for the same
reason — a roster that belongs to whoever owns the content:

- the **transport** pack's lane roster,
- the **water** pack's river roster (which today holds the one sanctioned
  hand-rolled scan, granted precisely because a pack could not express
  the alternative),
- the **residence** system, which has no roster at all and needs one; two
  separate places in the engine currently go looking for its objects **by
  class name in a string**, which is a pack dependency the type system
  cannot see.

⭐ **The second-instance test passes**: once the residence roster exists, a
second locality with holdings needs **zero pack code** — it declares
content and is found. That is the test this placement is chosen against.

⚠ **No new namespace root, and no new collection.**

---

## Collisions

**Who already lives where this build works:**

- **Getting paid, being hired, and tipping** — the two hottest sites are
  on the wage path. Anything that miscounts here is money, so this
  collides with the most consequence-bearing surface in the game.
- **Wearing, wielding, sitting and resting** — the item-occupancy
  question runs on the metabolism path. This is where the live drive
  found the server pinned.
- **Being served in a shop**, **using a screen**, **walking/running/
  sneaking**, **banking at a branch**, **the press room**, **claiming a
  title**, and **logging back in where you logged out** — each is one
  rewritten site, and each is a way a player would notice a mistake.
- **An NPC minding a property** — the per-tick site, and the one caller
  that will be *refused* by the new gate rather than merely made faster,
  because of how it is invoked. It must be moved to the roster, not
  exempted.
- **The guidance itself.** The antipattern entry teaches this pattern and
  the build-time gate enforces the teaching. Both change here, in the same
  change as the refusal — a gate whose rationale still says the opposite
  will be argued away the first time it is inconvenient.
- ⚠ **A naming collision to avoid**: an existing gate abbreviates
  *persistence manager*, not *prime minister*.

---

## Surface decisions

### Which questions the world will still answer, and which it will not

A question about **what kind of thing something is** stays askable of the
world and becomes cheap, because every object has a composition and the
index describes the whole population rather than one feature's slice. A
question about **a particular roster** — the plats, the holdings, the
travel modes — is asked of whoever owns that roster. Slate D1/D2.

⭐ **Rosters take the cheapest rung that answers them**: if the content is
declared under one place, the existing path index already answers it and
nothing new is needed; if it is declared per locality, its owner keeps
the roster; and a roster is **memoized, never warmed**, so that reloading
it costs one re-derivation instead of one scan. That last point is the
answer to *"what happens if the singletons reload while hot"*.

### Who may ask the world, and how they are recognized

**Two arms, on two different bases** — this is the decision the design
took four attempts to get right, so it is stated plainly:

- **The realm's own code** is recognized by **which function in which
  object is asking**. Not by a module alone, and **not by any property of
  a person**.
- **A person** is recognized by **holding the Prime Minister's seat**,
  asked of the office directly, derived at the moment of asking so that
  authority follows a handoff in both directions.

⛔ **Not the code-trust axis.** That axis is TypeScript authoring and
takes no new consumers. ⛔ **Not a caller-supplied flag**, which is not a
gate at all because the caller chooses it.

⭐ **Fail closed.** Where the asker cannot be identified exactly, the
answer is no. The accepted consequence is that a caller invoked outside
the normal dispatch — an NPC's behavior module among them — can never
hold this permission. That is correct: the one such caller here should be
reading a roster.

### What the Prime Minister sees

The office holder's query **runs, and reports its own cost** — how much of
the world was read, and whether the question was one the index could
answer. This is the one piece of new player-visible surface in the build.

⭐ The warning is *why* the office holder is allowed the expensive form at
all: a person at a keyboard running one costly query is fine, and the
report is how they learn it was costly. The realm's own code gets no such
latitude — it may only ask questions the index can answer.

### Live queries are refused to everyone

A **standing** query that re-runs whenever the world changes is refused
for everyone, the office holder included. A one-off costly question is a
choice; a standing one is a cost nobody remembers starting. Confirmed
directly, and **not a dial to widen later**.

### What counts as handing out a table

⚠ **Not "it returns a list."** The census found 83 candidate surfaces and
only **six** are defects. The three tests, together:

1. does the collection grow **with the world** (not with who is logged
   in, and not with what authors have written)?
2. does the caller **narrow it** — take one, find one, filter it — rather
   than use all of it?
3. is the collection **the answer**, or a table the caller was left to
   search?

⭐⭐ **A method can be keyed without taking a key.** Two money-path
surfaces derive the owner from context and issue a keyed lookup; a
signature-shaped reading condemned both, wrongly. The gate must not judge
on shape alone.

⭐ **And the defect can be in the caller, not the surface.** One roster is
consumed correctly by most of its callers and searched by three. The
surface stays; those three change.

---

## Lens pass

- **Pedagogy** — ⚠ **does not bite, and that is the finding.** No
  Discipline is exercised and nothing about the world becomes more
  derivable. This is hygiene, and claiming otherwise would be dressing.
- **Creative expression** — ⭐ **the one that bites.** The refusal removes
  a documented capability from whoever writes queries, and the ordinary
  authored case must not need code to get it back. ⚠ **Acceptance
  requirement**: before the door closes, confirm that the authored
  questions `world:` is serving today are served by the actor-anchored
  and path-scoped forms. Any that is not is a seed to add — **not** a
  reason to widen the gate.
- **Immersion & roleplay** — neutral. Nothing here is diegetic; the world
  should look identical, which is exactly what the drive checks.
- **Values** — ⭐ a genuine, small entry: *who may look at everything at
  once* is an authority question, and the answer is a **seat**, derived,
  visible, and lost on handoff. Total sight belongs to an office somebody
  can be voted out of, not to a permission somebody was granted once.
- **Epochs** — holds trivially. Nothing here is of an era.

---

## The drive

Runs against the live game before the MR opens, as a wire file. **Two
halves: the door, and everything the plumbing carries.** The second half
is the larger risk — the rewritten questions are invisible, so the only
way to know they still work is to do the things that depend on them.

**The door**

1. As an ordinary character, use a command that takes a target and type a
   world-wide query as the target. → **Refused**, with a message naming
   what to use instead. Nothing hangs.
2. Try it on several different commands, including one from a content
   pack. → Refused the same way each time; the refusal is a property of
   the query, not of one command.
3. Try to leave a *standing* world-wide query on a live surface. →
   Refused.
4. As the founder (default holder of the Prime Minister's seat), repeat
   step 1. → **It runs**, returns the right things, and reports what it
   cost.
5. As the same character, try step 3. → **Still refused.** The seat buys
   the one-off, never the standing one.

**What the plumbing carries** — each step exercises one rewritten site:

6. Take a job, work a shift, and **get paid**; leave a tip. → Wages and
   tips arrive, correct, to the right people.
7. **Wear something, wield something, sit down, stand up, rest.** → All
   work; resting recovers; the server stays responsive throughout.
   ⚠ This is the path that pinned a core.
8. **Walk, run, and sneak** between rooms. → All three modes available
   and behaving differently.
9. **Be served** at a counter by an attendant, and **bank** at a branch.
10. **Use a screen** you are carrying, and one you are not.
11. **Claim a title**, and look at what a subdivision has for sale.
12. **Log out inside a holding, and log back in.** → You are where you
    left, not at the front door.
13. Leave an NPC property-minder running for several ticks. → It keeps
    working; nothing throws; nothing is refused.
14. Look at the press room, and at a wiki page found by search.

**And the point of it all**

15. With a populated world, do steps 6–8 repeatedly and watch the
    server. → No stall, no pinned core.

---

## Acceptance criteria

Observable from outside the code, by a person:

1. **No typed input from an ordinary character can make the server read
   the whole world** — on any of the command views that take a query
   argument, and on any live surface.
2. **The refusal tells you what to do instead**, in words, and the game
   continues normally afterwards.
3. **The Prime Minister's query runs and reports its cost.** A character
   who is handed the seat gains this; a character who hands it away
   **loses it**, with no restart.
4. **No standing world-wide query can be created by anyone**, including
   the office holder.
5. **Every behaviour in drive steps 6–14 works exactly as it does
   today.** This build is invisible to a player except for 1–4.
6. **The rest/recovery path no longer stalls the server** under a
   populated world.
7. **An author's ordinary questions are still answerable** without
   writing code — confirmed against the authored uses `world:` serves
   today, per the creative-expression lens.
8. **The guidance no longer recommends what the game now refuses**, and a
   new instance of the pattern cannot be added without the addition being
   visible and deliberate.

### The measurement, and what it corrects

**A booted world holds 1,785 objects, with nobody logged in.** Measured
during this phase against the shipped content set.

⚠ **That is smaller than the framing above implies, and it sharpens the
diagnosis rather than weakening it.** The rest/recovery path pinned a CPU
core *at this size*. So the dominant term is **not how big the world is —
it is how often the question is asked**: a scan of ~1,800 objects, each
costing a walk up its own class chain, run once per creature per tick, is
what stalls a server. Size is the multiplier; frequency is the problem.

Three consequences, and they are why this sits in requirements rather
than the plan:

1. **The priority order is confirmed by measurement**, not asserted: the
   hot and repeated callers are fixed first, and the index — the
   satisfying piece of substrate — comes after them, because at this size
   an index alone would not have saved the path that actually broke.
2. ⚠ **"Indexed but still too big" is a future risk, not a present one.**
   At 1,785 an indexed question over even a broad category is cheap. The
   guard against growth is that the realm's own code may only ask
   questions the index can answer — not that any given category happens
   to be small today. **Category sizes must be re-measured, never
   assumed.**
3. **This number is a baseline worth keeping.** It grows with every
   locality shipped and every player housed, and it never shrinks. Worth
   re-reading after the next content build to see what the curve does.

---

## Cross-references

**Seeding slate** — [world-scan-perf-slate](../slates/tails/world-scan-perf-slate.md)
(D1–D5, the triaged inventory, the rejected alternatives).

**Fed by this build** — [call-security-pass-slate](../slates/builds/call-security-pass-slate.md):
its first future primitive is built and proven here.

**Subsystem docs whose truth this changes** —
[mql.md](../subsystems/mql.md) (the seed and its refusal),
[call-security.md](../subsystems/call-security.md) (the new policy),
[lint-family.md](../lint-family.md) (two gates),
[response-envelope.md](../subsystems/response-envelope.md) (the warning),
[governance.md](../subsystems/governance.md) +
[access.md](../subsystems/access.md) (what the seat now confers),
[employment.md](../subsystems/employment.md),
[holding.md](../subsystems/holding.md),
[residence.md](../subsystems/residence.md),
[watershed.md](../subsystems/watershed.md),
[logistics.md](../subsystems/logistics.md),
[locomotion.md](../subsystems/locomotion.md),
[parcel.md](../subsystems/parcel.md),
[wiki.md](../subsystems/wiki.md).

**Guidance inverted here** — [antipatterns.md](../antipatterns.md)
§ *Bespoke Object-Search Algorithms*.

**The player-facing grammar** — [mql-grammar.md](../mql-grammar.md).
