# Locks, keys and lockcraft — the build

> **Status: SUBSTRATE SHIPPED, DESIGN OWED** — the mechanism landed with
> the reachability sweep (!345: the keyway and the bolt composed,
> `lock`/`unlock` reachable, the keyed-door family given a bolt) →
> [boundary.md § Locking](../../subsystems/boundary.md),
> [credential.md](../../subsystems/credential.md).
> ⭐⭐⭐ **What shipped was a REACHABILITY PATCH, not a design.** The
> owner's framing, 2026-10-09, and it is the reason this file is a build
> rather than a tail: *"I felt like patching the whole since we had
> verbs that did nothing, but it really needs a full design session."*
> **Left:** ⭐⭐ **`lockcraft` and the locksmith** (§ 3) — the trade, the
> competence, the guild, and the answer to the two lenses the shipped
> design outright fails · the master key's seat (§ 1) · a readable
> key-holder record and selective revocation (§ 2) · the
> lock-technology namespace and the gate that must own it (§ 4)
> **Size:** a build — ⚠ and §§ 1–2 should NOT be picked off ahead of
> it (see *Why this is one build*)

---

## ⭐⭐⭐ Why this is a build, and why the shipped part is not a design

The verbs `lock` and `unlock` shipped **afforded by nothing** — a
controller, passing unit tests, help text, and no way for any player to
say the word. The reachability sweep's job was to stop that class of lie,
and for ten other verbs the fix genuinely was one line. ⛔ For these two
it could not be, because the thing behind the verb did not exist: there
were two half-models and conferring either one would have afforded a
verb that lies *differently* (any player locking a university's gate
with no key).

So the sweep built the smallest honest mechanism — a keyway and a bolt,
composed — and that is what is merged. ⚠ **It was decided from a
three-option menu in a review thread, not through a design pass.** A
lens pass run afterwards ([below](#the-lens-pass)) found three defects
that were fixable and fixed, and **two lenses the design fails
outright**:

| lens | the shipped verdict |
|---|---|
| **1 Pedagogy** | ⛔ **fails.** Turning a key exercises no Discipline; the model is a boolean and a token match, and nothing is derivable. |
| **6 Economy** | ⛔ **fails.** A key is cloned from nothing, with hardcoded prose, in a realm that has smelting and smithing. No producer, no price, no locksmith. |

⭐ And lens 2's named-work test says the same thing from the player's
end: *The Great Escape*, *Rear Window* and *Ocean's Eleven* are all
unmakeable, because **every story about a lock is about defeating it and
you cannot defeat one.** That is not a gap a patch can close.

### ⚠ Why §§ 1–2 should not be picked off first

They look like cheap tails and they are **not independent of § 3**:

- **§ 1, the master key's seat** — the holder is plausibly a constable
  with a warrant, which is `policing-slate`'s, which is also
  `lockcraft`'s home. Wiring a master key to some other seat first
  would decide the governance question that build needs to make.
- **§ 2, the key-holder record** — what a record is *for* depends on
  whether keys can be copied, forged or picked. Build the record first
  and it will be a record of the wrong things.

⭐ So the sequencing is: **§ 3 decides, §§ 1–2 and § 4 follow.** A build
that starts anywhere else pays for it twice.

### ⭐⭐ The general finding, measured — a conferred verb reveals how thin its subject is

This is worth carrying beyond locks, because the reachability sweep made
it checkable for the first time. Conferring a verb does not make it
*designed*; it makes it **sayable**, and then you can see what is behind
it. Counted on the merged tree:

| verb | what is behind it |
|---|---|
| `lock` / `unlock` | **2** `Door` rows + 3 keyed Exit classes |
| `fold` / `unfold` | **1** row — a camp chair at the University Avenue crossing |
| `drive` | **1** placed vehicle — the wharfside barge (the coach exists only in an archetype) |

⭐ That is [#30 Emergence](../../lenses/30-emergence.md)'s *objects per
verb* read as a to-do list rather than a prohibition: the remedy is
never fewer verbs, it is more things the verb reaches. `Lockable`
composes anywhere — a chest, a strongbox, a cabinet, a gate, a
tool-chest — and **that is the cheapest item in this whole file**, worth
doing even if § 3 waits, because it is what makes every other item worth
more.

⚠ The other two are somebody else's and are noted here only so the
pattern is on record: `fold` wants a second foldable thing,
`drive` wants the coach placed (`passenger-conveyance` is an archetype
nobody binds). Neither is this build's.

---

## What shipped, in one paragraph

For most of the project there were two lock models and neither was a
lock: `LockableMixin` was a **bolt with no key** (a boolean any player
could throw), and `lib/lock/Lock.ts` was a **keyway with no bolt**,
carried by three Exit subclasses that are therefore permanently locked.
Strictly disjoint — which is why `lock`/`unlock` shipped afforded by
nothing. They compose now: `canPass = !isLocked() || opensFor(mover)`.
**The bolt refuses, the key excuses**, so a key-holder never unlocks to
get in and unlocking is how you let everyone *else* through.

---

## ⭐⭐⭐ The lens pass
<a id="the-lens-pass"></a>

Run against [design-lenses.md](../../design-lenses.md) on 2026-10-09,
over a design that had already shipped. Recorded in full because the
gaps are the useful part, and because a pass run late is still the only
pass this design has had.

**1 · Pedagogy — ⛔ FAILS, and this is the headline.** Disciplines
exercised: **none**. Turning a key is not a skill; the model is a
boolean plus a token match, and nothing is derivable — there is no
principle from which a player could predict anything. ⭐ And the
Discipline that belongs here **is already designed**:
[policing-slate.md](../builds/policing-slate.md) names **`lockcraft`**
— *"the burglar **and** the locksmith"* — as a dual-use competence, with
a locksmiths' guild gatekeeping dangerous skill. So the lock shipped
with its pedagogy home written down and unconnected. Defensible only as
**infrastructure** (a precondition for residence, which carries its own
pedagogy) — and lens 1 decides forks, so *this design must not be called
done.* → § 3.

**2 · Expression — the floor is solid and the named-work test finds the
structural gap.** A locked door is `locked: true` plus a keyway; a
second keyed building is rows and a warren. Then name titles: *The Great
Escape* (forge a key) — no. *Rear Window* (get in without one) — no.
*Ocean's Eleven* (crack a safe) — no, `Lock` is binary. The only passing
work is *an inn hands you a room key*.

> ⭐⭐⭐ **Every story about a lock is about defeating it, and you cannot
> defeat one.**

The same shape as the water audit's *nobody can be in the water* — a
floor that looked solid because the standard case is cheap. ⚠ And the
constant/variable split has the failure signature: the engine keeps
keyway identity, technology matching and the bolt; the author gets
**which doors exist**, and nothing else. No lock has a *character* — no
quality, no age, no "this one is cheap and everyone knows it." → § 3.

**3a · Immersion — two betrayals, both FIXED before merge.** (i) Both exit
listings rendered `(university gate, closed)` for a **locked** gate, so
the bolt was invisible until you walked into it — now `Door.stateWord()`,
in one place, with a test that refuses the inline form's return. (ii)
`lock`/`unlock` asked for the key *before* reading the bolt, which
sounded like discretion and was the engine hiding something a character
can see; the order is now observable-state-then-secret.

**3b · Participation — real, but uncontested.** ⭐ Players can now
exclude each other from spaces by holding keys and throwing bolts, which
is a genuine *the polity can do something we did not want*. ⚠ But there
is **no counter-power** — no picking, no warrant, no master key held by
an office — so exclusion is absolute, which is a stage rather than a
contest. → § 1 and § 3.

**4 · Values — ⭐⭐⭐ the strongest heading, and what the build actually
bought.** The forced choice with no calculable right answer: **do you
lock up behind you?** Trust against exposure; convenience for people you
like against a door a stranger can walk through. And it has **stakes
rather than a score** — `get` gates only *hung fixtures* on ownership,
so loose possessions in an unlocked room are takeable by anyone who can
reach them. Nothing measures your diligence, which is correct.
⚠ **This only became expressible when the bolt separated from the
keyway**, so the option picked off a menu is the lens-4 payload. It
deserved the argument it did not get, and that is the process finding.

**5 · Continuity — the strongest pass, and its one defect is FIXED.**
`{keyway, technology}` already *is* the epoch axis: pin-tumbler →
keycard → ward → retina-reader. A keycard door answers exactly what a
brass one does — you `lock`, you `unlock`, you present a credential.
⚠ `LockType` is a closed kernel union, so `arcana` cannot ship a warded
lock without a kernel MR. It was opened on the `AnyMixinName` precedent
and **reverted at the pre-merge sweep** — see § 4, which is the more
useful finding than the change was. ⭐ Note the other half is already
open (`KeyCredential.authorize` takes `technology: string`), so the lock
side is the only narrow one.

**6 · Economy — ⛔ a key is minted from nothing.** Produces exclusion;
consumes nothing; nobody pays. `mintKeyway()` is free, re-keying is
free, and `issueKeyTo` **clones a `Key` out of thin air** with a
hardcoded *"worn brass key"* — a small forged brass object, in a realm
that has smelting and smithing, bypassing the metal chain entirely. A
good with no producer. ⭐ Demand exists first (every residence and
holding issues keys today), so this is a **missing producer, not an
invented need** — which is what makes it legitimate work rather than a
fabricated market. → § 3.

**7 · Governance — criterion named, appeal absent.** The criterion is
*you present a key matching this keyway and technology*, and the refusal
says it — good. ⚠⚠ But there is **no appeal**: nothing tells you who
could issue one. And **you cannot see who holds a key, nor revoke one
person's** — re-keying is all-or-nothing, so the remedy against a single
bad guest is to re-key and re-issue to everybody. Tier: the keyway match
is engine physics (A/B), but **who gets a key is tier C** and has no
record for the polity to read. → § 1 and § 2.

### The borrowed instruments, where they bit

- **[#30 Emergence](../../lenses/30-emergence.md) — *objects per verb,
  never more verbs.*** The build added two verbs over a population of
  **two `Door` rows and three exit classes.** The remedy is not fewer
  verbs: `Lockable` composes anywhere, so it is a chest, a strongbox, a
  cabinet, a gate. ⭐ **The cheapest item on this slate**, and the one
  that makes every other item worth more.
- **[#93 Nameless quality](../../lenses/93-the-nameless-quality.md) —
  *does the substrate impose properties nobody asked for?*** ⚠
  `boltedByDefault()` is exactly that. The overridable seam is the
  honest form and it preserves shipped behaviour, but it is an
  **imposition** and should be read as one rather than as a neutral
  default.
- **[#7 Endogenous value](../../lenses/7-endogenous-value.md).** A key
  is worth something only because a door refuses. Self-contained — no
  roulette.
- **[#62 Transparency](../../lenses/62-transparency.md).** No syntax
  spent: `lock north` is a verb and a direction.

---

## § 1 · The master key has no seat

⛔⛔ **`Lock.issueMasterKeyTo` has ZERO production callers.** A master
key — a super's ring, opening every lock of a technology — exists in the
kernel and **nothing in the world issues one.** Its only caller is
`DormWarren.test.ts:390`, so the dorm design clearly intends master
keys; nothing wires them.

⭐ This is the reachability failure class MR !345 was built to close,
surviving in the **method** surface where `lint:reachability` does not
look. That gate reads command views and `thing` rows; a kernel method
with no caller is invisible to it. **Worth considering as a fifth arm**
— "an exported capability no production code reaches" — though the
false-positive rate over a kernel is the open question.

**Why it was not wired.** A master key is a *property-role*
capability — a landlord, a warden, a superintendent — and no such role
exists. `OFFICE_APPARATUS` holds five constituted offices of the realm
(Prime Minister, three Speakers, the Central Bank Governor, the Finance
Minister) and **none of them is a building superintendent.**

> ⚠⚠ **And parcel title is NOT the landlord.** The tempting shortcut is
> `ParcelApi.ownerOf` / `AccessApi.can`, since a holding sits on a
> parcel. **Do not.** Parcel title is *who maintains the code*, not who
> owns the land in the fiction — two unconnected axes that have been
> conflated twice already. A master key is a fiction-side property
> right and needs a fiction-side holder.

**What lifts it:** a property role with a holder. Either the
holding/residence design names a warden seat, or
[policing-slate](../builds/policing-slate.md) names a constable with a
warrant — and ⭐ the second is the better answer, because it is also
§ 3b's missing counter-power. Until then the method stays, documented,
rather than deleted: it is unwired design, not dead code.

## § 2 · No record of who holds a key

Today a lock knows its keyway and a wallet knows its keys, and **nothing
joins them.** Consequences:

- **No appeal** (lens 7). The refusal names the criterion and nothing
  names who could satisfy it. The issuers are `TitleController`,
  `LeaseController` and the dorm's `ProvisionController`, none
  discoverable from the door.
- **No selective revocation.** ⭐ The primitive is **already there** —
  `KeyCredential.removeKey(keyway)` exists and returns whether anything
  was held, and `getKeys()` is documented *"for display / audit"*. So
  this is **not a mechanism to build**; it is a *join* and a verb.
- **Nothing for the polity to read**, which is what makes "who gets a
  key" an unreadable tier-C criterion.

**What it probably is:** the lock side answering *who holds a key to
me*, which means either a record on the lock or a reverse index. ⚠ Not a
new Mongo collection — the document tree is where parcel-local
persistence goes. The verb is plausibly `key` (list / revoke), and ⚠ it
collides with nothing today but must be checked against
`lint:verb-collisions` before anyone writes it.

## § 3 · ⭐⭐ `lockcraft` and the locksmith — the two failed lenses

**This is the build.** It answers lens 1 and lens 6, and it is already
designed in three other documents, none of which knows the lock
substrate now exists:

- [policing-slate.md](../builds/policing-slate.md) — **`lockcraft`**, a
  dual-use competence serving *"the burglar and the locksmith"*, with a
  locksmiths' guild gatekeeping it (*"a genuine historical guild role …
  and a fine source of conflict when the guild refuses someone"*).
  ⭐ Note the slate's own framing: **crime is a legal status, not a
  skill** — nobody's transcript says "criminal," it says what they can
  do.
- [launch-worklist.md](../../launch-worklist.md) — locksmithing is
  parked pending *"a security design."* ⭐ **That design is now half
  written**: the keyway/bolt split, the technology axis and the
  credential match are the mechanism it was waiting on.
- [settlement-model.md](../../settlement-model.md) — a **locksmith** is
  listed among the specialisations a city's general store fragments
  into, so the settlement model already has the hole.

**What it would add, against the lenses it fixes:**

| | today | with § 3 |
|---|---|---|
| **1 Pedagogy** | no Discipline; nothing derivable | `lockcraft`; a lock's resistance derivable from its technology and condition |
| **2 Expression** | you cannot defeat a lock, so no lock story is makeable | *The Great Escape*, *Rear Window*; and a lock gains a **character** an author can set |
| **3b Participation** | exclusion is absolute | a counter-power, and a guild that can refuse someone |
| **6 Economy** | a key is cloned from nothing | a key is a **smith's product**; re-keying is a service somebody sells |

### ⭐⭐⭐ What the design session must decide

Written now, cold, so the session starts on questions rather than on
re-deriving the ground. Ordered by how much else depends on them.

**Q1 · ⛔⛔ What resolves a pick, given that a ROLL IS BANNED?** This is
the load-bearing constraint and the one a session will otherwise
reinvent wrongly. [uncertainty.md](../../uncertainty.md)'s provenance
rule is *roll to decide what the world IS, never what your action DID* —
**resolutional randomness is banned outright.** So "d20 against a
difficulty" is not available, and neither is a hidden success chance per
attempt. ⭐ The shipped shapes that ARE available: a **durative engaged
act** that consumes time and can be interrupted (the lock yields when
your competence exceeds its resistance, and the only question is *how
long* and *who walks past*), and a **seeded** property so a given lock
is the same lock every time you meet it. ⚠ Note what that buys
pedagogically: it makes a lock's resistance a thing you can *read* and
*plan against* rather than gamble on, which is lens 1 passing instead of
failing.

**Q2 · What is `lockcraft`'s DOMINANT act?** Lens 1 insists on naming
which Discipline *decides the outcome*, because *"fake pedagogy lives in
the gap"* — a craft can honestly exercise three while the deciding skill
is menu-recall. If picking reduces to *own the right pick for the
technology*, the dominant skill is inventory lookup and the Discipline
is decoration. What is the judgment? Candidate: **reading a lock** —
inferring technology, quality and condition from what you can observe,
which is the same shape as the survey ladder and as tasting in cooking.

**Q3 · What is a lock's CHARACTER, and is it authored or derived?** The
lens-2 gap. Today a lock is `{keyway, technology}` and nothing else, so
every lock in the realm is identical. Candidates: quality (a grade, from
who made it), age/condition (a reconcile-on-read wear), and fit. ⭐ Check the shipped
`GradedMixin` (`lib/craft/Grade.ts`) and `DurableMixin`
(`lib/material/Durable.ts`) before minting anything — a lock is a
crafted durable good, so quality-from-its-maker and wear-over-time may
already exist and only need composing onto the host.

**Q4 · Who produces a key, and does that make a keyway PHYSICAL?** The
lens-6 gap. `Lock.mintKeyway()` returns an opaque token and
`keyDescription` hardcodes *"worn brass key"* in a kernel switch. If a
smith forges a blank and a locksmith cuts it, the keyway stops being
opaque and becomes a **shape** — which is what makes copying,
forging and a blank market possible. ⚠ That is a bigger change than it
looks and it decides Q5.

**Q5 · Can a key be COPIED, and by whom?** § 2's record is a record of
*whatever this answers*. If keys copy freely, a key-holder list is
fiction; if copying is a locksmith's service, the list is real and the
locksmith is its registrar — which is a governance role nobody has
designed.

**Q6 · The counter-power's governance (lens 7).** A constable with a
warrant is the obvious holder of § 1's master key. Name the criterion,
the appeal, and the **entrenchment tier** — and ⚠ remember *the size of
tier C is the measure of how real the participation is*. A warrant the
polity cannot amend is a stage with a ballot box on it.

**Q7 · Where does the trade live, and does the guild gate learning?**
`/trade/locksmithing` as its own pack, or `lockcraft` as a competence
inside smithing? And `policing-slate` wants a locksmiths' guild
*"gatekeeping dangerous skill"* — a tier-C question with a real conflict
in it (what happens when the guild refuses someone), which is lens 3b's
*can the polity do something we did not want*.

⚠ **Not an open question:** whether the shipped keyway/bolt split
survives. It does — it is the mechanism this build sits on, and
`canPass = !isLocked() || opensFor(mover)` is the seam everything above
attaches to.

⚠ **Scope warning.** Picking at a lock is the obvious half and the
smaller one; the lens-2 gap is **a lock with a character** (quality,
age, condition) and the lens-6 gap is **a key with a producer**. A build
that ships picking and leaves keys minted from nothing has fixed the
least interesting third. ⛔ And do not solve this inside a trade build
— the counter-power half is cross-cutting and belongs with policing.

---

## What this slate is NOT

Not a plan, and not a complaint about what shipped — that work landed a
correct mechanism and its own fixes for everything the pass found that
was fixable, which is exactly what a reachability patch should do. ⭐ The one process finding worth carrying: **the design was
decided from a three-option menu in a review thread.** The menu was
honest and the chosen limb turned out to be the lens-4 payload, which is
luck rather than method. A lens pass at the slate would have found
§§ 1–3 before any code was written, and the pass is cheap.

## Related

- [boundary.md § Locking](../../subsystems/boundary.md) — the shipped
  model, the policy seam, and the `open north` defect the drive found.
- [credential.md](../../subsystems/credential.md) — the wallet, the
  `KeyCredential` match, `removeKey`.
- [policing-slate.md](../builds/policing-slate.md) — `lockcraft`, the
  guild, and the levelling mechanic (§ 3's owner).
- [parcel.md](../../subsystems/parcel.md) +
  [access.md](../../subsystems/access.md) — ⚠ read before reaching for
  title as a landlord proxy (§ 1).
- [design-lenses.md](../../design-lenses.md) — the rubric this pass ran.

## § 4 · The lock-technology namespace, and the gate that must own it

**Attempted and reverted at the pre-merge sweep, 2026-10-09** — recorded
because the reasoning is worth more than the change was.

`LockType` is `"pin-tumbler" | "keycard"`, a closed kernel union. Lens 5
wants it open (the technology **is** the epoch axis) and `CLAUDE.md`'s
pack doctrine is explicit that *a pack must never need a kernel list
edit* — `arcana` cannot ship a warded lock today without a kernel MR.
So it was widened to `… | (string & {})` on the shipped `AnyMixinName`
precedent, which does exactly this for mixin names.

⭐⭐ **Then the linter refused it, and the refusal was right.** The
precedent needs `// eslint-disable-next-line @typescript-eslint/ban-types`,
and the comment above that line states the condition the widening has to
meet:

> *"What it gives up is the compiler catching a typo, and that check did
> not disappear — it moved to `pnpm lint:mixin-names`, which reads every
> `_mixinName` on disk and so can see what the type system never will.
> Same move as `requires:`: **when the type system cannot see packs, the
> gate owns the namespace.**"*

⚠⚠ **Nothing owns the lock-technology namespace.** And the failure a
typo produces is the worst shape this project has: a misspelled
`lockTechnology:` in a content row does not throw and does not warn —
`KeyCredential.authorize` compares two strings, they differ, and **the
door opens for nobody.** A keyed door that admits no one, silently, in a
realm where the only doors worth locking are somebody's home.

**So the order of work is fixed:** the gate first, the type second.

**What the gate reads.** Every authored `lockTechnology:` across all
packs' content, plus every technology a pack *declares*. The declaration
half is the open question — mixin names solved it by having each pack's
class carry `static _mixinName`, registered at pack discovery. A lock
technology has no natural carrier yet; candidates are a row
(`<root>/idea/lock-technology/<name>`, the `Reading` shape, warmed by a
catalogue) or a manifest key. ⭐ The row is probably right, because a
technology wants prose anyway — `Lock.keyDescription` hardcodes *"worn
brass key"* and *"plastic keycard"* in a kernel switch, which is the
same closed-vocabulary smell one layer down, and a row would carry its
own key's description instead of the kernel guessing.

⭐ **Cheap and worth doing together:** that switch and this union are one
problem. A `lock-technology` row holding `{ displayName, keyProse,
masterProse }` retires both, and `LOCK_TYPES` becomes the catalogue's
warm roster rather than a literal array.
