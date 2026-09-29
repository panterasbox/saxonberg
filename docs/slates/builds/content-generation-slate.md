# Content generation slate — TypeScript that writes content, and what may bound it

> **Status: UNBUILT** — genuinely new territory: code that **creates
> content records** rather than persisting runtime state. But the pass
> below shrinks it a long way — most of what looked alarming is a
> **mint**, the security model is the shipped one (a generator is a
> **protowizard**), and the budget is **land**.
> **Left:** the operation vocabulary + its refusals · the generator as a
> **principal** (who is the author of record) · **generative capacity as
> a covenant term** (→ [land-use-covenant](./land-use-covenant-slate.md))
> · the succession primitive generalised off `divideBody` · what a
> density covenant actually says.
> **Size:** a build.

Opened 2026-09-25 out of the household conversation
([household-lifecycle](./household-lifecycle-slate.md)), from the user's
framing:

> *"that's new territory for us where we're writing typescript code that
> writes new content records directly and it's not just persisting
> runtime state it's actually creating. that's a lot and what do we
> expect of it?"*

---

## ⭐⭐⭐ Lifecycle states: nothing changes class — it is a SUCCESSION

The forcing question was *when a house goes to ruin, does its `class:`
change?* The repo has done this exact thing once and the answer is
sharper than "yes."

`mortality.md`'s `divideBody` is eight steps and the shape is the whole
doctrine:

> 5. **capture** — before anything is destructed
> 6. **mint the corpse**, hand it the gear
> 7. **revert-and-destruct the old body**

and above it:

> ⭐⭐⭐ **"What a corpse *is* is AUTHORED; whose it *was* is POURED IN"** —
> through the gated `adoptMaterialState`.

So a house does not become a ruin. **You mint a `Ruin` from an authored
template, pour in what carried over — the address, the title, the
rubble, who built it — and destruct the house.** The same act as death,
and the same act as an estate passing: **one doctrine covers all three.**

⚠ **A hard constraint falls out of step 7**: `byTemplatePath` throws on
two live objects at one path, so **the successor and the predecessor
cannot coexist**. Succession is atomic by necessity, not by taste.

⭐⭐ **And the payoff for code generation is large: the ruin needs no
generation at all.** `/stuff/location/Ruin` is a template a human writes
once, reviewed, in the content tree. The generator only *mints* from it.

---

## ⭐⭐⭐ Which splits "code generation" into two very different acts

| act | what it is | risk | precedent |
|---|---|---|---|
| **mint** | clone an existing authored template | ⭐ **none** — every verb in the game does this | `StuffApi.clone` |
| **author** | write a **new template row** into the tree | **the genuinely new thing** | the CMS, the pack installer |

> **Separate what a generator AUTHORS from what it MINTS, and most of
> what looks alarming turns out to be a mint.**

What is irreducibly *authoring* is small: the **person rows** of a
household, because a name, a look and a disposition are new data that did
not exist. The dwelling is a mint from an archetype. That is a far
narrower capability than *"a system that writes content."*

### The operation vocabulary, and where the line goes

| operation | verdict |
|---|---|
| **mint** — clone an authored template | ✅ unrestricted; it is what verbs do |
| **write** — a new row at a path it holds title to | ✅ **the new capability** |
| **succeed** — mint successor + pour in + destruct predecessor | ✅ the `divideBody` pattern, gated |
| **amend** — edit an existing row | ⛔ **never** |
| **retire** — delete a row | ⛔ **never** |

⭐ **A generator may mint and write; it may never amend or retire.** Those
two are where it could destroy human work, and the boundary matches the
pack reconcile's own posture — *never merge, never block*. A human who
edits a generated row **takes ownership permanently**, and the generator
has no operation that could reach back.

---

## ⭐⭐ When does a class change at all? The VERB SET decides

A class change is **expensive**. CLAUDE.md: *sharing the name is the
DEFAULT — a twin that renames is claiming to be a different thing, and
had better be one.* **Exactly three renames exist in the whole
codebase**: `Corpse`, `Extra`, `Cast`.

> **The test: does the set of legal verbs change?**

A house is a dwelling — you enter it, furnish it, lock it. A ruin is a
**site** — not furnishable, not habitable, scavengeable. Different
affordances ⇒ a different thing ⇒ a mint. But *well-kept → shabby →
derelict* is the **same thing looking worse**, and that is a field.

> **Most of a lifecycle is a condition on ONE class. Only the transition
> that changes what the thing IS gets a class and a succession.**

⭐ And this closes a loop with the conferral retirement. Capabilities may
not vanish on a measured threshold because *absence cannot carry a
reason* — but **a class change is the honest way for affordances to
disappear.** Nothing gated the player; the object stopped being a house.
The verb did not go away, the thing did.

---

## ⭐⭐⭐ The generator is a PROTOWIZARD, and its budget is LAND

`access.md` already names the role:

> **A content author who is not a wizard is a protowizard** — content-write
> access **without code trust**.

> **The generator is a protowizard.**

- It writes **content**, never code. `class:`, `hydratorClass:` and
  `behaviors[].brain` are the wizard axis and are closed to it by the
  shipped code-trust lockdown — so **a generator can never change what a
  thing IS**, only make one.
- `AccessApi.canAtPath` gates it **by parcel title**, exactly like a human
  author. This is **not a new security model**; it is the shipped one.

⭐⭐ **And that makes the budget concrete without inventing a quota:**

> **The generator's budget is the extent it holds title to.**

Not a rate limit, not a cap — the same constraint every author operates
under, which is the author budget the design has always described and
never exercised.

### ⭐ The author of record is the TITLEHOLDER

If the generator writes under an extent's title, it writes **as the
holder**. The committee that holds Hinkley is the author of record for
every household generated in it, stamped in the authoring ledger like any
other content.

That has teeth in the right direction: if Hinkley's families are
garbage, **that is visibly the committee's work**, and producer standing
flows accordingly. It is the only mechanism that would ever make a
holder curate what is generated under them.

---

## ⭐⭐⭐ Capacity is a COVENANT TERM — set at provisioning, never per run

⚠ **This corrects an earlier answer in this conversation that was
wrong**, and the user named the error:

> *"you're saying the lots just exist? someone has to decide to create
> them and we're operating with the assumption that's not decided on a
> case by case basis, **it's decided when the parcel is provisioned as
> terms of its provisioning**… what you described sounds like it's up to
> the committee to house procgen content or not — **which why even make
> it procgen then if we have to involve the committee every time the algo
> runs.**"*

Exactly right. Treating capacity as a live platting decision puts the
holder in the loop **forever**, which defeats generation entirely.

> **Generative capacity is a term on the title, set when the parcel is
> provisioned. The generator runs unattended within it, and nobody is
> consulted per household.**

The mechanism exists as a slate:
[land-use-covenant](./land-use-covenant-slate.md) — *"the covenant row on
the title"*, restricting not what a parcel is **for** but **by what
means** things happen on it. Scoped today to technology level; this is
its **second dimension**.

What it fixes:

- ⭐ **"The lots just exist" becomes honest.** The covenant declares the
  density; the plat **expresses** it. Nobody plats per family.
- **The holder decided once** — taking the ground on those terms, or
  subdividing under them.
- ⭐⭐ **It binds successors.** That is what makes it a covenant and not a
  policy: a new committee inherits Hinkley's density rather than
  relitigating it.

### The politics move to where politics belongs

The question is never *"will you take this family"* — nobody should ever
be asked that. It is **"what density did you accept when you took the
ground"**, argued at grant time, in public, once.

⭐ The hierarchy already matches the parcel registry: the Compact sets
terms granting Hinkley; the committee sets terms on child parcels
**within** its own; longest-prefix chain-of-title resolves who bound
what. No new structure.

⚠ **How a covenant CHANGES is then the real governance object** — which
is rezoning, and rezoning *should* be a fight. Expect it to land on the
entrenchment tiers: some terms the grantor's to amend, some the polity's,
some permanent.

### Exhaustion is a FACT, not a refusal

Covenant capacity used up ⇒ the place is simply not offered in char-gen.
**Legible in advance, and nobody decided it in the moment.** A holder who
wants more goes back to the grantor.

### ⭐⭐ And this dissolves the two-budget problem

The worry was that **land is in-fiction and compute is meta**, with no
honest way to refuse a committee platting ten thousand lots — the engine
cannot refuse with an out-of-fiction reason.

> **The realm's total generative capacity is the SUM OF ITS COVENANTS** —
> knowable, boundable, and set by deliberate governed acts rather than by
> a hidden limiter.

⭐ No operator circuit-breaker that players can feel. The budget **is**
the covenants, granted one at a time by somebody who had to justify it.
⚠ Keep a meta backstop if you like, but the moment players optimise
against a compute quota the fiction is gone.

### ⚠ The floor — nothing load-bearing may depend on a private holder

If every holder's covenant is exhausted or zero, char-gen has no `Place`.
The guild pass already binds here: **nothing load-bearing may depend on a
player institution existing.**

> **There is always a public option, and it is not a nice one.**

The parish, the tenements, municipal ground the Compact cannot refuse.
⭐ **Not a degraded fallback — content.** Being from the wrong side of
town is a real starting position with real consequences, and the lineage
card's `Standing` cell already models it. Which in turn makes
exclusionary neighbourhoods **safe to allow** — the guild pass already
established that institutions are allowed to be unfair.

---

## Decided

1. **Nothing changes class.** A lifecycle transition is a **succession** —
   mint the authored successor, pour in the continuity, destruct the
   predecessor.
2. **What a thing IS is authored; what it WAS is poured in.**
3. **Mint ≠ author.** The ruin, the corpse, the dwelling are mints and
   need no generation.
4. **A generator may mint, write and succeed. Never amend, never retire.**
5. **A class change requires the verb set to change**; everything else is
   a field.
6. **The generator is a protowizard** — content-write, no code trust,
   gated by `canAtPath` on parcel title.
7. **Its budget is land.**
8. **The author of record is the titleholder.**
9. ⭐⭐⭐ **Generative capacity is a covenant term set at provisioning** —
   never a per-run decision.
10. **Exhaustion is a fact, not a refusal**; there is always a public
    floor.

## Open

1. ⭐ **What a density covenant actually SAYS.** A lot count is the
   obvious answer and probably too crude — it cannot distinguish a
   tenement from an estate. Wants a real unit (dwellings per hectare?
   serviced capacity? — see below).
2. **Is the covenant's capacity really priced by the SIXTEEN NEEDS?**
   Water, waste, roads, services are the natural in-fiction limiter on
   density. ⚠ If servicing costs turn out cosmetic, density is an
   unpriced dial and the two-budget tension returns.
3. **What the generator IS as an object.** A protowizard is a
   **principal** — it has an identity, holds or acts under title, and
   appears in the authoring ledger. ⚠ **No precedent exists** for a
   non-person principal that authors. Is it the holder's agent? A seat?
   The `agency-slate`'s delegation with a non-person grantee?
4. **Where the succession primitive lives.** `divideBody` is mortality's;
   a ruin is structure's; an estate passing is credit's. Three copies of
   one pattern ⇒ the third instance is the promote signal.
5. **Does a generated row carry a marker** beyond an absent `sourcePack`
   (→ [pack-boundary](./pack-boundary-slate.md) open Q2)?

---

See also: [household-lifecycle](./household-lifecycle-slate.md) (the case
that forced this) · [pack-boundary](./pack-boundary-slate.md) (where
generated rows live) ·
[land-use-covenant](./land-use-covenant-slate.md) (**the capacity term**)
· [mortality.md](../../subsystems/mortality.md) (the succession
exemplar) · [access.md](../../subsystems/access.md) (the protowizard
axis) · [ref-shapes.md](../../ref-shapes.md)
