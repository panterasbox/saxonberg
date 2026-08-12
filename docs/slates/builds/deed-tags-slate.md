# Deed-tag slate — what the world records that an act happened

> **Status: decided 2026-08-12, nothing built.** The vocabulary every
> readout over the chronicle points at — faith precepts, criminality,
> alignment, achievements, any future consumer of the *"dumb store, smart
> consumers"* ledger.
>
> **It unblocks two documents that both stalled on it:**
> [faith-slate](./faith-slate.md) (precepts need a *closed* vocabulary and
> `chronicle.tags` is open and inert) and
> [measurement.md](../../measurement.md) (Tier C's last row — *does the
> measurement vocabulary belong in the governed layer?*).

See also: [chronicle.md](../../subsystems/chronicle.md) (the store; `tags`
is *"open vocabulary — inert in v1"*) · [topics.md](../../subsystems/topics.md)
(**the object pattern and the resolver this copies**) ·
[accountability.md](../../subsystems/accountability.md) (*blame derived on
read, never stamped* — the doctrine one live tag violates) ·
[measurement.md](../../measurement.md) (the three layers).

---

## ⭐⭐⭐ The reframe that decides most of it

The question had been miscast — including in `measurement.md`, which
filed the vocabulary under "value-laden, therefore arguably governed." A
deed-tag is **descriptive, not normative.** It says *this act was of kind
X*. It does not say the act was good.

So the three layers apply *inside* the question:

| | |
|---|---|
| **what acts the engine can witness** | **layer 1** — this vocabulary |
| which witnessed acts are **transgressions** | layer 2 — a *faith* declares it |
| which are **crimes** | layer 3 — the *polity* declares it |

`harm.nonconsented` is a fact. Whether it is a sin is Eir's business;
whether it is a crime is the Compact's. **The vocabulary is layer 1 and
is not the polity's to set.**

⚠ **But the Part-3 objection survives in a sharper form.** Each tag is
descriptive, yet **the set of distinctions the vocabulary can draw is
value-laden** — a world that does not separate consented from
non-consented harm cannot have that argument at all.

> ⭐⭐⭐⭐ **The vocabulary is descriptive. Its RESOLUTION is political.**
>
> You cannot legislate a tag to lie. You *can* legitimately demand that
> the world start recording something it currently lumps together.

## The decision — petition, not override

The real-world anchor is **official statistics**, and it is pedagogically
rich rather than merely convenient: census categories and unemployment
definitions are famously political, and functioning states resolve it the
same way every time — an independent agency, a **published methodology**,
responsive to legislative pressure but never legislative override.

| Actor | May |
|---|---|
| **wizards / engineering** | **ADD** a distinction, freely. A finer true distinction cannot lie |
| **nobody** | **remove or redefine** a tag — that would falsify existing ledger rows |
| **the polity** | ⭐ **PETITION** for a distinction — *"the world shall record whether harm was done to a sleeping person"* becomes a **public, recorded work item** |

⭐ The petition is valuable **even when it is never implemented**: an
unmet measurement demand sitting on the public record is politically
legible, which is exactly what the "we impose only at the level of what
gets measured, and we put it where it can be argued about" claim needs to
be true rather than decorative.

---

## The object

Third use of the `Topic` / `Discipline` pattern, so nothing here is new
machinery.

| Piece | Shape |
|---|---|
| `DeedTag` | leaf `Idea` at `/obj/DeedTag/<dotted.key>`, pure data, never cloned |
| `DeedTagCatalogue` | singleton, warms a `Map` in `postRegister`; the `TopicCatalogue` shape verbatim |
| fields | `key` · `label` · `description` · `producer` (the subsystem that emits it) · `since` |

**Dotted paths with family inheritance**, reusing Topic's resolver:
`harm.nonconsented`, `aid.treat`, `passage.death`. A faith declaring
`harm` covers every child — which is how doctrine actually reads (*do no
harm*), and it means a new leaf lands under an existing precept without
every faith being re-authored.

## Five rules

1. ⭐ **Conservative floor — an unregistered tag matches no precept.**
   Stolen directly from Topic's *"an unknown topic must be quiet, not
   loud."* Otherwise a new subsystem shipping a new tag **retroactively
   makes people sinners**, which is the worst failure this design can
   have.
2. **Additive-only; never redefined.** Tier A's append-only invariant
   extends here: **a tag's meaning is part of the record.** Deprecate by
   superseding, keep the row forever.
3. ⚠ **`since` on every row, and consumers must honour it.** The
   vocabulary has a history. A derivation must not read *absence of tag*
   as *absence of act* for entries that predate the tag. **This is
   subtle and it will bite whoever builds the fall** — a faith whose
   precept references a tag added last winter must not conclude that
   everyone was faithless before then.
4. **Producer-declared.** The minting subsystem owns its tags. An entry
   minted with an unregistered tag **throws**; a registered tag no
   producer emits is dead and lintable (`check-does-nothing`'s shape).
5. **Consumers point, never coin.** A faith precept — or a law, or an
   achievement — naming an unknown tag **fails at seed validation**. This
   is what kills dead precepts.

**Content packs** get a namespace (`<pack-key>.*`) so a pack cannot
fragment the core vocabulary.

---

## The migration — and one real finding

The vocabulary already exists, ad-hoc and unregistered. **Ten tags across
five producers**, live today:

| producer | tags today | proposed |
|---|---|---|
| `Avatar` | `arrival` · `death` · `recovery` | `passage.arrival` · `passage.death` · `passage.recovery` |
| `ConditionLogic` | `death` · `passage` | `passage.death` |
| `CombatLogic` | `combat` · `kill` · `victory` · ⚠ `crime` | `combat.kill` · `combat.victory` · ⚠ **retire `crime`** |
| `SpellKnowledge` | `spell` | `learn.spell` |
| `RecipeKnowledge` | `recipe` | `learn.recipe` |

⭐ Note that `ConditionLogic` already emits **`passage` alongside
`death`** — a family marker beside its leaf, hand-rolled. The hierarchy
is not imposed; it is already being reached for.

### ⚠⚠ `crime` is layer 3 leaking into layer 1

`CombatLogic` does `if (crime) tags.push('crime')`. That is a **stamped
normative judgment in a descriptive vocabulary**, and it contradicts a
shipped doctrine — [accountability.md](../../subsystems/accountability.md)
is explicit that *culpability is derived on read, never a stamped stat*.

**Retire it.** The tag should record what happened
(`combat.kill.nonconsented`); criminality derives from the act plus the
law in force, which is the only way it can survive the law *changing*.
A stamped `crime` is frozen at the moment of the act and cannot.

> This is the finding that justifies the whole exercise: **the vocabulary
> question is where wrong-layer judgments become visible.**

---

## Faith-relevant tags that do not exist yet

The [faith slate](./faith-slate.md)'s worked precepts need these minted
by their producers:

`aid.treat` · `aid.attend-dying` · `harm.nonconsented` · `ritual.attend`

⚠ Note `harm.nonconsented` is **already computable** — the
`accountability_events` ledger records consent on every harm fact. This
is a producer emitting a tag it already knows, not new modelling.

---

## Open questions

1. **Does the catalogue need a wire push?** Topics ship to the client at
   session-establish because the cockpit renders them. Deed-tags are
   mostly server-side — but a client that renders *"why did this land in
   my chronicle"* would want them. *(Lean: no push in v1; the snapshot
   shape stays forward-compatible, as Topic's did.)*
2. **Where does a petition live?** The
   [amendment-library](./amendment-library-slate.md)'s lego set, the
   forums' Subject layer, or a document-store branch under `/compact`?
   *(Lean: `/compact`, since it is a publication and not a law.)*
3. **Retiring `crime` is a behaviour change** with a live consumer path
   (the blame ledger reads the crime marker). Sequence it with the
   accountability work rather than as a drive-by.
4. **How deep should paths go?** `combat.kill.nonconsented` is three
   levels and readable; five would not be. No rule proposed — but the
   family-inheritance resolver makes depth cheap to add later and
   impossible to remove, so **start shallow.**
