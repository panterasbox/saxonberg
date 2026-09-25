# Land-use covenant slate — what the land allows to be done ON it

> **Status: PARTIAL** — the covenant, its predicate and the breach
> producer do not exist (verified 2026-09-19: no `covenant` field or
> row; `AccountabilityKind` is still the four); `ParcelRecord.landUse`
> (the closed six) restricts *what a parcel is for*, not *by what means*.
> The cheap half's substrate shipped with forestry: `Epoch` is a closed
> ordinal vocabulary (`lib/craft/Epoch.ts`), `ToolMixin.epoch` is an
> authorable stamp ([forestry.md](../../subsystems/forestry.md) § What
> this build does not do), the axe and billhook say `medieval` and
> nothing reads it yet; `lint:instrument-args` is merged and at zero
> ([lint-family.md](../../lint-family.md)). Only forestry's two rows are
> stamped — mining and the grain chain still owe theirs.
> **Left:** the covenant row on the title · the `epoch` stamp on every
> other trade's instrument rows + the act's declared `kind` · the one
> breach producer at the binder (a fifth `AccountabilityKind`) · the
> designation tier (polity-imposed, via legal-code) · the vehicle/act/time
> forms of the same predicate · the suppression twin, kept separate
> **Size:** a build — ⭐ **the seam the RGO-unification build hangs on**
> · ⭐⭐⭐ **and now a SECOND dimension (2026-09-25): GENERATIVE
> CAPACITY** — how much algorithmic content may be written under this
> extent, as a term of its provisioning rather than a per-run decision.
> See § below and [content-generation-slate](./content-generation-slate.md).

**Captured 2026-09-17**, out of the forestry design conversation, from
the user's framing:

> *"I kinda want parcels to set a technology level of what's allowed
> inside them. so a parcel could declare only handsaws for one forest
> but chainsaws for another. this is a system I'd want to extend itself
> uniformly across RGOs and I'm not sure if the limits are hard or soft
> … there's probably a 'unify all the RGO' build that we'll want to do
> after we've built out each individually."*

Related: [zoning-slate](./zoning-slate.md) (the sibling limit — by
*output*, not by means), [legal-code-slate](./legal-code-slate.md) (law
as content — the designation tier lives there),
[enforcement-slate](./enforcement-slate.md) +
[policing-slate](./policing-slate.md) (who writes the breach up),
[instrumentation-slate](./instrumentation-slate.md) (*you are as good as
your toolkit* — the instrument as the unit), [forestry-slate](../tails/forestry-slate.md)
(the forcing case: one wood by hand, another by engine),
[hunting-slate](./hunting-slate.md) (close seasons are a covenant on
TIME — the same shape), [logistics-slate](./logistics-slate.md) (wheels
are an instrument too), [capability-magic-slate](./capability-magic-slate.md)
(the suppression field — the hard twin this slate deliberately is
not). Substrates: [parcel.md](../../subsystems/parcel.md)
(`ParcelRecord.landUse`, the longest-prefix walk, `null` = inherit),
[access.md](../../subsystems/access.md) (`AccessApi.can(giver, action,
resource)`), [accountability.md](../../subsystems/accountability.md)
(producers, not a chokepoint; derive-on-read blame),
[magic.md](../../subsystems/magic.md) (`suppressesMagic` — the field
walk), [measurement.md](../../measurement.md) (the three layers: engine
measures · subject values · polity imposes),
[design-lenses.md](../../design-lenses.md) (lens 5's five epochs are
the vocabulary).

---

## The precedent, and it settles most of the design

This has a real-world name: the **US Wilderness Act of 1964**. Land
designated wilderness bans *means* — no chainsaws, no motorized
equipment, no wheels — and the Forest Service clears trail in those
areas with **crosscut saws to this day**. The chainsaw works perfectly
well inside the boundary; using one is a violation a ranger writes up.

Every property of that law is the property we want:

- **It restricts the means, not the end.** You may still fell a tree.
- **It is soft.** Physics is untouched; the polity enforces.
- **It is land-scoped.** The same saw is legal one ridge over.
- **It is declared by an authority over the land**, not by the tool's
  maker and not by the actor's competence.
- **It is bigger than tools.** *Wheels* — which is a logistics covenant
  — and mechanized *anything*.

Cousins worth keeping in view because they are the same shape in other
registers: an Amish *Ordnung* (a community's own covenant on its own
means), a historic-district ordinance (no aluminium windows), "no
engines on the lake", a fishery's gear rule (no nets, rod-and-line
only), the mining law's ban on blasting near a boundary. ⭐ And the
**close season**, which is a covenant on *when* rather than *with what*
— the hunting slate's, but the same predicate.

---

## Three limits on one act — do not collapse them

A single act — *fell this oak* — is subject to three independent
restrictions, and the game already has two of them. They must stay
separate because they are declared by different people and fail for
different reasons:

| limit | asks | declared by | shipped |
|---|---|---|---|
| **the ladder** | have you *earned* this? | the Discipline catalogue — *trades ship medieval and advance by exercised disciplines* | ✅ advancement |
| **zoning** | may this land be *used for* this? *(what leaves)* | `ParcelRecord.landUse`, the closed six | ✅ smallholding / [zoning-slate](./zoning-slate.md) |
| **the covenant** | may this be done here *by these means?* | the title, or a designation over it | ⚠ **this slate** |

⚠ The tempting collapse is covenant → ladder: *"a medieval parcel means
you are a medieval woodsman."* No. A modern forester walking into a
designated wilderness is still a modern forester; the land tells them to
put the chainsaw down, and whether they do is the story. The covenant is
about the land; the ladder is about the person.

---

## ⭐⭐ Hard or soft — the lenses decide it, and the answer is BOTH but as two mechanisms

**Soft by default.** A covenant is *law*: the act succeeds, and a breach
is recorded.

- **Lens 3** (immersion): a chainsaw that will not start because a
  parcel row says so is a fudge — the exact thing *unlit interiors are
  pitch black* exists to forbid. It works, it is loud, and it is illegal.
  The sim stays honest and the fiction stays legible.
- **Lens 4** (values): the interesting half is *who enforces*. A soft
  covenant forces a real choice — cut fast and be seen, or cut slow and
  be within the law — and the woodward, the warden, the parcel's owner or
  the polity confers the standing. That is the resilience posture applied
  to land: *friction + daylight; detect evasion, not malice.*
- **Lens 1** (pedagogy): the lesson is legal history, not physics. Why
  wilderness law bans means rather than ends is a genuinely interesting
  question with a real answer (ends are hard to police; means are visible
  from a distance), and a player who has been written up for a saw learns
  it the way people actually did.

**The hard case already exists, and it is a different mechanism.**
`Location.suppressesMagic` + `MagicApi.suppressionAt` is *"this does not
work here"* on the magic side. Lens 5 says tech and magic are **one axis
seen from two sides**, so *"the chainsaw will not start in the elder
wood"* is a **suppression field on the tech side** — honest only where
the world gives a reason (the Fallow; an aether dead zone; ground where
combustion will not sustain). It is a **world-physics field seeded from
the place, never a parcel property** — a title cannot repeal
thermodynamics. An author who wants the hard version has that tool and
owes a reason; one who wants *"the Commons voted no chainsaws"* has this
one and owes nothing but a vote.

⭐ Keeping them apart is what keeps both honest. The tell that a design
has merged them: a refusal message with no diegetic cause.

---

## ⭐⭐ The uniform seam — an instrument is an argument

The reason this extends across every RGO *without per-trade code* is a
seam the grain chain just built (`lint:instrument-args`, on
`design/grain-chain`, at zero): **an instrument is an ARGUMENT, not a
search.** Every RGO act — `fell`, `hew`, `mill`, `net`, `plough`,
`char` — declares the thing it acts *with* as a named view argument
resolved by the binder, and the controller reads it off the model.

So the covenant is a **predicate over the bound instrument's row**,
evaluated **once, in one place, for every trade**:

1. an instrument row carries an `epoch` stamp — lens 5's own ladder,
   **`prehistory · medieval · industrial · modern · future`**;
2. the parcel covering the actor's location (the shipped longest-prefix
   walk; `null` = inherit, exactly as `landUse`) carries a covenant;
3. after the binder resolves the act's instruments, one kernel producer
   compares them and — on a breach — **writes an accountability row
   and lets the act proceed.**

The gate never touches a trade pack. Each RGO build's obligation is only
what it should be doing anyway: declare its instruments as arguments,
and stamp them. That obligation is cheap, it is checkable by the
existing lint, and it is why this is the right candidate for the
unification build rather than any single RGO: **the gate costs the
same whether one trade or six declare instruments, and it is only worth
building once three do.**

### Coverage — the same predicate, per RGO

| RGO | a covenant it would express | the instrument row it reads |
|---|---|---|
| forestry | *handsaws only in this wood* · *coppice only — no standard felled* (an act covenant) | axe / billhook / handsaw / chainsaw; the felling act's `kind` |
| mining | *no powder within the claim's fringe* · *hand-got coal only* | pick / drill / blasting powder |
| farming | *no plough on the bench* (the Amish / no-till shape) · *no engine on the water meadow* | ard / plough / tractor |
| fishing | *rod and line only* · *no nets on this reach* | rod / trap / net / spear |
| hunting | *no firearms in the chase* · **the close season** (a covenant on time) | bow / gun; the calendar |
| logistics | *no wheels on the pilgrim road* · *no engines on the lake* | cart / wagon / engine — a vehicle is an instrument |

⭐ Note the two non-tool forms in that table — **the act** (*coppice
only*) and **the time** (*close season*). The predicate is the same; it
just reads the act's declared `kind` or the world clock instead of a
tool row. Design the predicate over *the bound act* from the start and
all three come for free; design it over *tools* and the other two get
bolted on.

---

## Who declares it — three tiers, already written down

[measurement.md](../../measurement.md)'s layers answer it, and the
ordering is what stops this becoming a kernel dial:

| tier | declares | shape | this slate |
|---|---|---|---|
| **the title** | the owner's rule about their own land — a group's forest, a lord's chase, a farm's own rule | a `covenants` row on `ParcelRecord` beside `landUse` | ⭐ **ships first** |
| **the polity** | a *designation* over parcels it governs — the Wilderness Act shape | law as content, [legal-code-slate](./legal-code-slate.md) | a later wave, when law is content |
| **the realm** | the world's epoch by default — *trades ship medieval* | already the case | nothing to build |

The title tier alone is enough to express both forests in the user's
example, and it never escalates: a covenant is **a row on a title, not
a setting** (*don't escalate dials to the kernel*). ⭐ `landUse: wild`
is already one of the closed six and today has no teeth; a covenant is
what gives it some.

---

## Enforcement — a producer, not a chokepoint

- The breach is an **accountability row** — a fifth `AccountabilityKind`
  beside `opened · violated · death · harm`, written by the one producer
  above with the actor, the parcel, the instrument and the covenant it
  crossed. Blame derives on read, as everything in that ledger does.
- **Who sees it** is a perception question, not a feed: the parcel's
  owner, the polity's officer (the woodward / the warden — the guild
  slate's Wardens; the hunting slate's gamekeeper, *vert and venison*
  being one law), and anybody who was in earshot of a chainsaw. No
  gauge, no notification, no sin counter.
- **What it costs** is the polity's to decide — a fine, a forfeiture, a
  loss of standing, nothing at all in a lawless wood. The engine measures
  the breach; the subject values it; the polity imposes.
- **Hidden covenants are not a thing.** The covenant is readable on the
  title (*"the notice at the ride's end"*) the way a close season is
  posted. A rule nobody could have known is not a covenant, it is a trap,
  and the honesty rule from discovery applies: *a restriction that is
  not visible in the prose is a lie about the land.*

---

## Lens pass

1. **Pedagogy** — legal history (wilderness designation; why law
   restricts *means*; the commons governing its own gear); the
   Disciplines are the RGO's own — the covenant changes which rung a
   player exercises, not whether. Derivable: a posted rule, a visible
   breach, a predictable consequence.
2. **Expression** — the ordinary case is *one row on a title, no code*:
   `covenants: [{ on: instrument, maxEpoch: medieval }]`. The bespoke
   case is the designation (a polity's law), the act form (*coppice
   only*), the time form (the close season) — all the same predicate.
   ⭐ And a second forest with a different covenant is a second row, not
   a second pack.
3. **Immersion** — the saw works; the wood is loud; someone heard it.
   Nothing is asserted in a refusal that the sim does not back. The hard
   twin (suppression) stays where physics is.
4. **Values** — the choice is *fast and seen vs slow and lawful*; the
   standing is conferred by the woodward, the owner, the polity. A
   community that covenants its own commons is doing Ostrom out loud.
5. **Epochs** — the vocabulary IS the epoch ladder, so the mechanism
   holds by construction: a Roman *lex* on iron tools in a sacred grove
   and a 1964 Act on chainsaws are one row with different values.

---

## What must not happen

- **No hard refusal without a physical cause.** A covenant never stops
  an act. If a design needs "it will not work here," that is a
  suppression field and it owes a diegetic reason.
- **No collapse into the ladder.** The land's rule and the person's
  competence are different facts about different things.
- **No kernel dial.** Not a setting, not a zone field, not a world
  epoch switch. A row on a title; a designation in law.
- **No per-room tool allowlist.** The predicate reads an *epoch* (and
  an act kind, and a clock), never a list of template paths — a list
  only grows by somebody adding to it, which fails lens 2 outright.
- **No tech-tree unlock.** A covenant saying *chainsaws allowed* confers
  no chainsaw. Whether one exists in the realm is the trades' business.
- **Not the zoning slate's job, and not built inside any single RGO.**
  It waits for the unification build.

## What each RGO build does NOW — the cheap half

So that the gate has something to read when it arrives:

- **declare instruments as arguments** (`lint:instrument-args` — the
  grain chain's gate; keep it at zero as trades land);
- **stamp `epoch` on instrument rows** — one line beside `capabilities:`
  on the axe, the pick, the quern, the rod;
- **declare the act's `kind`** where an act has one (felling a standard
  vs cutting coppice; hand-got vs blasted).

Forestry is the first to ship under this rule; mining and the grain
chain back-fill it at their next touch.

## Open questions

- **Is the covenant a ceiling only, or a range?** *Lean: a ceiling
  (`maxEpoch`)* — "no chainsaws" is the real case; "no handsaws" has no
  precedent worth serving.
- **Does a covenant cover the parcel's tenants** (a use-grant holder) as
  it covers strangers? *Lean: yes, a covenant runs with the land — that is
  what the word means.*
- **Who may write the row** — the title holder alone, or the group that
  holds it by its own governance? *Lean: whoever `AccessApi.can(giver,
  'covenant', parcel)` says, which is the title's owner kind dispatch
  already shipped.*
- **Does the breach need a witness to derive blame** (the coup-only-bites-
  with-witnesses precedent), or is the ledger row enough for an officer
  to act on? *Lean: the row is enough for the owner; the polity's own law
  decides what it needs.*
- Where does the **designation tier** attach once law is content — a
  polity's law naming parcels, or a parcel's row citing a law?

---

## ⭐ Consumer — the RGO-unification build

Named by the user on the same day: after mining, farming, ranching,
forestry and fishing have each been built individually, **one build
draws the symmetry through all of them.** This slate is one of its
seams. The others, for the record so that build has a list to start
from:

- **the taxonomy** — every RGO as *seeded character × derived stock ×
  a record materialized on engagement*, with civilization vs wilderness
  being whether a record sits over the field (see
  [field-substrate-slate](../tails/field-substrate-slate.md) and the
  forestry slate's *a stand is a record*);
- **the three-pack chain** — *RGO trade → conversion trade → maker
  trade* (`mining → smelting → smithing`, `farming → milling → baking`,
  `forestry → sawing → carpentry`), with the conversion trade's working
  head reading power from the water pack's `generationW` sibling — the
  grain chain's `GristMill` shape;
- **this covenant gate**, once three trades declare instruments;
- **instrument declaration at zero across every trade.**

---

## ⭐⭐⭐ The second dimension — generative capacity (2026-09-25)

Raised designing NPC household generation
([household-lifecycle](./household-lifecycle-slate.md),
[content-generation](./content-generation-slate.md)). The covenant was
captured as *what technology may be used on this ground*. The same row
answers a second question, and the user's framing is the whole argument:

> *"someone has to decide to create them and we're operating with the
> assumption that's not decided on a case by case basis, **it's decided
> when the parcel is provisioned as terms of its provisioning**… why even
> make it procgen then if we have to involve the committee every time the
> algo runs."*

> **Generative capacity is a term on the title. The generator runs
> unattended within it, and nobody is consulted per record.**

⚠ **The failure mode this rules out** is treating capacity as a live
platting decision: that puts the holder in the loop **forever** and
defeats generation entirely. A covenant is agreed **once**, at
provisioning or subdivision.

**Why it belongs on the covenant and not somewhere new:**

- It is a restriction on **what may be done on the ground**, which is
  this row's whole job — the sibling of *by what means*.
- ⭐⭐ **It binds successors.** That is what separates a covenant from a
  policy: a new committee inherits the density rather than relitigating
  it.
- The hierarchy already matches the parcel registry — the grantor sets
  terms, a holder sets terms on child parcels **within** its own,
  longest-prefix chain-of-title resolves who bound what.

**What it buys beyond the feature:**

- ⭐ **The politics land at GRANT TIME.** The question is never *"will you
  house this family"* — it is *"what density did you accept when you took
  the ground,"* argued in public, once. **Changing it is rezoning**, which
  should be a fight, and which wants an entrenchment-tier answer.
- **Exhaustion becomes a FACT, not a refusal** — a place at capacity is
  simply not offered, legible in advance, decided by nobody in the
  moment.
- ⭐⭐ **It dissolves the in-fiction/meta budget conflict.** *Land is
  in-fiction, compute is meta*, and the engine may never refuse with an
  out-of-fiction reason. But **the realm's total generative capacity is
  the sum of its covenants** — knowable and bounded by deliberate governed
  acts rather than a hidden limiter players would learn to optimise
  against.

⚠ **Two open questions this adds:**

1. **What the capacity term SAYS.** A lot count is crude — it cannot tell
   a tenement from an estate. Wants a real unit.
2. ⭐ **Is it priced by the SETTLEMENT MODEL'S SIXTEEN NEEDS?** Water,
   waste, roads and services are the natural in-fiction limiter on
   density. If servicing turns out to be cosmetic, density is an unpriced
   dial and the budget conflict returns.

