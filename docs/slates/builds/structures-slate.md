# Structures slate — the thing that says "these rooms are one building", and whether it is needed at all

> **Status: UNBUILT — and possibly unnecessary.** Nothing in the model
> says two Locations belong to one structure. Four things come close and
> none of them claims it: a **Locality** is an authored coverage prefix
> in the address namespace (*"any kind of place, at any depth… **never a
> street-address model**"* → [address.md](../../subsystems/address.md));
> a **Parcel** is an ownable titled extent, a **sparse** hierarchy, whose
> `storeys` exists only to compute the furnishing ceiling `area ×
> storeys` ([parcel.md](../../subsystems/parcel.md),
> [furnishing.md](../../subsystems/furnishing.md)); a **Zone** guarantees
> only that its Locations are internally contiguous and share a
> coordinate system ([zone.md](../../subsystems/zone.md)); and a
> **Warren** coordinates clones of **one** room template that bud and
> merge ([location.md](../../subsystems/location.md)) — a building is
> heterogeneous rooms, so it is not that either.
> **Left:** ⭐ the justification test FIRST — this slate's own question is
> whether the concept earns its existence. Then, only if it does: what a
> structure is a claim about, how membership is declared, what it owns
> that no room can own alone, and what it must never absorb.
> **Size:** a build, *if it is ever justified*. Today it is a question.

Captured 2026-09-24 out of the envelope build's design conversation,
where the concept was proposed, substituted for, and then **found
unnecessary for that build** — which is the most useful thing anyone has
learned about it so far.

---

## How the gap was found

The envelope build needed to know *how well a room holds heat*. The first
answer put construction on the **zone**, on the reasoning that a zone
subtree is "the rooms that belong together." The user rejected it, and
correctly:

> *"A closet in a mansion is a single room zone; the rest of the mansion
> may be multiple sub-zones. Or an office building by floors. Or any
> other way we want to carve up content. All a zone guarantees is that
> the locations are contiguous internally and they conform to a
> coordinate system. **Any relationship outside of that or between
> different zones is unexpressed anywhere.**"*

That last sentence is the gap, stated exactly. A zone is an authoring
carve-up. Nothing in the model expresses *structure*.

## ⚠⚠ The case AGAINST — read this first

**The build that discovered the gap then stopped needing it**, and how
that happened is the argument.

The envelope's second answer was to derive from what a room is **made
of** — a `fabric:` spec naming a material, over the 154 content rows that
already author real `thermalConductivity`. And that dissolved the
problem:

> ⭐⭐ A granite shopfront with a timber stockroom behind it is not
> dishonest. That is a stone shop with a timber lean-to. **The
> dishonesty was never *rooms differ* — it was *rooms differ for no
> reason*, and a material is a reason.**

So the thing a structure was wanted for — *making the rooms of one
building agree* — turned out to be a symptom of authoring an **effect**
(a U-value, a temperature) instead of a **cause** (what it is built of).
Fix the cause and the agreement problem mostly evaporates: rooms may
differ, and each difference answers for itself.

The same pattern holds elsewhere:

| the "building" question | already answered by |
|---|---|
| *what is this place called / where is it* | the address namespace — and *"one-building-one-address is how people think"* is already its stated rationale |
| *who owns it, how big, how many floors* | `ParcelRecord` — `owner`, `area`, `storeys` |
| *what is it built of, how does it hold heat* | the room's own fabric + the material table (the envelope build) |
| *does fire spread through it* | it already does — heat crosses **open boundaries only**, and a closed door is a firebreak ([fire.md](../../subsystems/fire.md)). A fire consuming a building **emerges** from the boundary graph without the concept |
| *can this set of rooms grow and shrink* | `Warren`, for the homogeneous case |

⚠ **A concept that is the answer to no question is drift.** This project
has a standing rule that a mechanism must have a consumer, and the one
consumer that reached for this one found a better answer. That is the
state of the evidence today.

## The case FOR — what would genuinely need it

The test worth applying, and the reason to keep this file:

> ⭐ **A structure is justified when something must be true of a SET of
> rooms that no room can decide alone.**

Candidates that actually pass it, none of them in scope anywhere today:

- **A shared roof.** Rain, snow load, a hole in it. One fact, many rooms
  under it, and no room owns it.
- **A chimney or a flue serving more than one hearth.** The envelope
  build scoped this out explicitly (room-to-outside only, S6), and the
  moment heat or smoke moves *between* rooms as a system rather than
  through an open door, something has to own the stack.
- **Vertical heat, smoke and sound.** Warm air rising from the taproom to
  the rooms above is a building fact. `thermal.md` lists inter-room
  ventilation as a deliberate non-goal and the envelope build only
  *narrowed* that to room-to-outside; the full version needs a container.
- **A building as a unit of destruction or repair** — arson, collapse,
  condemnation, a roof falling in. `fire.md` defers arson and wildfire;
  the courts slate lists **condemnation** as a docket matter, which
  presumes there is a *thing* to condemn.
- **A building as a unit of description** — *"a tall stone building with
  its shutters closed"*, read from outside, without authoring that
  sentence on every street room that can see it.
- **Entrances.** Which door is *the* door, for wayfinding, delivery, and
  the lamplighter's round.

Note how many of those are **fire, weather and vertical space**. If a
structure is ever built, that is the demand that will build it — not
insulation, which found its own answer.

## What it would be, if it is ever justified

Sketch only, to be argued with rather than implemented:

- **Membership is declared, not derived.** The address namespace is the
  precedent: a place belongs to a Locality because its address says so,
  not because of geometry. A room would name its structure. Geometry
  cannot be trusted to infer it — the mansion-carved-into-sub-zones case
  is exactly why.
- **Sparse, like a parcel.** Most rooms are in no structure and never
  need to be. A forest clearing has no building.
- **It owns only what no room can own** — the roof, the stack, the
  envelope *between* rooms, the outside description, the entrance. ⚠ The
  failure mode to write down in advance: a structure that starts
  absorbing what rooms already answer for becomes a second Location tier,
  and then the same "room classes by another name" drift the
  [biome-normalization slate](./biome-normalization-slate.md) records for
  biomes. **One mechanism, one job.**
- **Not a containment tier.** Rooms would stay roots, the way Warren
  members do; a structure coordinates, it does not contain.

## Open questions

1. **Is a structure a Parcel with more fields?** A parcel already has a
   footprint, floors and a title, and a building is the most natural
   thing to hold title to. The argument against is that parcels are
   *ground* and sparse, and a tenant's flat is a structure member without
   being a parcel — but this is the first fork to settle, because if the
   answer is yes then most of this slate is a parcel wave.
2. **Does it need to exist before the vertical questions do?** Every
   passing candidate is fire, weather or storeys. If those stay deferred,
   so does this.
3. **What does it do to the address?** *"One address per place, shared by
   every service"* is settled doctrine. A structure must not become a
   second naming scheme.
4. **Who authors one** — the content author, or does it derive from a
   parcel's `storeys > 1`?

## Cross-references

- [address.md](../../subsystems/address.md) — the Locality tier; a node is any place at any depth, never a street-address model
- [parcel.md](../../subsystems/parcel.md) · [furnishing.md](../../subsystems/furnishing.md) — `area`, `storeys`, and what they are actually for
- [zone.md](../../subsystems/zone.md) — contiguity and a coordinate system, and nothing else
- [location.md](../../subsystems/location.md) — the Warren substrate, and why it is not this
- [thermal.md](../../subsystems/thermal.md) — inter-room ventilation as a deliberate non-goal; the envelope narrowed it, it did not lift it
- [fire.md](../../subsystems/fire.md) — spread through open boundaries; arson and wildfire deferred
- [biome-normalization-slate](./biome-normalization-slate.md) — the sibling drift, and the "one mechanism, one job" lesson
- `docs/requirements/envelope-requirements.md` — the build that needed this and then did not
