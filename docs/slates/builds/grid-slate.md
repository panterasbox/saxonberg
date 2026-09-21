# Grid slate — service, streets, and how a parcel answers for its power

> **Status: PARTIAL** — the network is unbuilt (verified 2026-09-19:
> `ParcelRecord` has no service field — `extent · zonePath · owner ·
> parentParcel · grants · allowance · landUse · area · storeys · reach`;
> exits carry no service attribute; no `Street.ts`; no lint). The two
> ENDS shipped: generation — `ControlStructure.generationW` computes real
> watts and `analyze power` reads it, a `GristMill` draws
> `availablePowerW` from the reach it stands on
> ([watershed.md](../../subsystems/watershed.md)); and the frontier tier
> — the τ charge economy ([magic-items.md](../../subsystems/magic-items.md))
> with TPA terminals drawing off `ManaPowered`
> ([fasttravel.md](../../subsystems/fasttravel.md)). Between them,
> nothing: power reaches a consumer by standing on the water, never by a
> wire.
> **Left:** the service declaration on `ParcelRecord` (default connected,
> author disconnection; a band, not a number) · service as an exit
> attribute + the three-edge walk (generation → street → connected) ·
> transmission from the falls to the city · connection-not-consumption
> metering · street dedication + municipal title acceptance · the
> every-declared-consumer-resolves-to-a-source lint · underground as an
> access point · the newbie wilds' declared posture
> **Size:** a build

**Captured 2026-08-04/05**, out of the mana-economy thread, when *"we've
been minting new content and just sorta assuming it's powered"* turned into
a topology question, a land-development question, and a review question.

> **User: "eventually we need process around this. Parcels attach at an
> exit, so that exit needs to be powered… streets and connective are where
> the grid lives… we have to decide what's mandatory for the purposes of
> zoning and land development and how it's all authored, organized and
> managed. This is an area where I'd hope a lot of the processes are
> emergent and we just provide the tools."**

Related: [delivery-slate](./delivery-slate.md) (⭐⭐ **the topology — read §
Distribution first**), [power-utility-slate](./power-utility-slate.md) (the
supply ref; the middle tier), [mana-economy-slate](./mana-economy-slate.md)
(sources, nodes, capacitors), [parcel.md](../../subsystems/parcel.md)
(`subdivide` / `transfer` — the dedication primitives),
[address.md](../../subsystems/address.md),
[boundary.md](../../subsystems/boundary.md) (exits carry the service),
[zoning-slate](./zoning-slate.md), [balance-slate](./balance-slate.md) (⭐
*a statute is a constraint on a meter*),
[attestation-slate](./attestation-slate.md) (the review tool this needs),
[story-bible.md](../../story-bible.md) (⭐⭐ **the watershed — it already
answers where the power comes from**), [freight-slate](./freight-slate.md).

---

# Part 1 — The topology was already solved

`delivery-slate § Distribution`, as cited by
[power-utility-slate](./power-utility-slate.md):

> ⭐⭐⭐ **"Coverage is legal, connection is physical."** The prefix claim
> stays the **franchise area**; the **distribution network is edge
> attributes on exits** (which exits carry which service), so connectivity
> derives from **a walk** — the same trick as freight's emergent road
> network, with **zero new topology.**

So *"a parcel attaches at an exit, so that exit needs to be powered"* is not
a new requirement — **it is the model.** And the payoff is already named:
*"a network fails locally and directionally — the line to Wharfside is cut
and only Wharfside goes dark,"* which is what gives outage work orders
somewhere to be, and linemen somewhere to go.

⭐ It also already carries the politics: *"utilities follow the road because
of **rights-of-way**, which makes the easement — and the **holdout
problem** — a live political object."*

## ⚠ But the full walk is overbuilt — the meter is the boundary

> **User: "the exit walk all the way back to the power source is excessive.
> Really you just need a parcel to generate power, a parcel for the
> streets, and a parcel to connect to the street. Everything after that is
> totally internal to that parcel and its subparcels, however they carve
> things up in quotas and content."**

> ⭐⭐⭐ **THE METER IS THE BOUNDARY.** The public network is **three
> edges** — *generation parcel → street parcel → connected parcel*. Past
> the connection it is the holder's own wiring, subdivided by their own
> quotas.

⭐ That is **the compute-allowance cascade, second consumer** — Appendix B:
*"the commons assigns a block to a top-level holder; that holder subdivides
and allocates within the block by its own policy; holders beneath do the
same. The central formula operates only at the boundary between the commons
and a top-level holder — below that boundary, internal division is the
holder's own affair."*

**And it is how utilities are actually regulated:** the utility answers to
the meter, never to your lamp.

---

# Part 2 — ⭐⭐⭐ Streets: subdivision and DEDICATION

> **User: "the streets is kind of a tough one… /terminus/ I think wants to
> be subdivided by neighborhoods. So do the streets belong to the
> neighborhood or just the buildings? Are the streets something top-level
> because they're managed by the municipality itself?"**

**Neither — because it is an act, not a schema.**

In real land development a developer subdivides a block into lots and
**dedicates** the streets to the municipality. Dedication is the actual
legal mechanism, and **both halves already ship**: `subdivide` carves the
child, `transfer` re-titles it.

> ⭐⭐⭐ **A street is a subparcel carved out of the neighborhood and
> dedicated to the municipality.**

So `/world/terminus/foundry-row/main-street` can sit **inside** the
neighborhood path while being **titled to the city**.

> **Path is location. Title is ownership. They were never the same
> question** — [parcel.md](../../subsystems/parcel.md) already holds title
> as an extent over the path tree, and
> [address.md](../../subsystems/address.md) already runs its own resolve
> walk.

Three things fall out:

- ⭐ **The municipal estate grows by development, not by decree.** Nobody
  plans the street grid centrally; it accumulates as ground is carved.
- **It creates the holdout problem** `delivery-slate` already wants — an
  undedicated strip between two blocks is a live political object.
- **A locality that never gets streets dedicated has no rights-of-way**, so
  it has no grid. Consequence, not rule.

## ⚠ No `Street.ts`

With the grid argument gone (Part 1 — service is an exit attribute, not a
property of streets), check what is left of "street":

| | already expressed by |
|---|---|
| title | a parcel owned by the locality |
| address | an address-tree segment |
| service | an **exit** attribute |
| footfall | derived demand (the compute entitlement function) |

> **Everything a street "is" is already a capability of something else. A
> class with no unique state is decoration.**

If zoning needs a predicate (*"does this lot front a public way?"*), it is
`isThoroughfare` **derived** from *locality-titled + declared-public + an
address segment* — not a stored type. ⭐ **Recommendation: do not mint
`Street.ts`.**

## Underground is an ACCESS POINT, not a layer

Under the edge-attribute model, "the line is buried" is cosmetic **unless
somebody has to physically reach it** — and they do, because outage work
needs a location.

> ⭐ **So the underground is a manhole, not a world.** The access point is an
> ordinary **exit**; the space behind it exists only where it is
> interesting. No parallel graph, no mandatory subsurface content, and a
> repair gig gets somewhere to happen.

*(`smallholding.md`'s acreage already splits ground from floors, so
subsurface title as a separate estate is available later — that is where
mineral rights live, and it is real law.)*

---

# Part 3 — Where Terminus gets its power: the story bible already answered

*Hydro — decided and shipped:* the water pack's `ControlStructure`
answers `generationW` (`ρ·g·Δh·Q·η`, real watts), `analyze power` reads
it, and the Wharfside aqueduct house generates — see
[watershed.md](../../subsystems/watershed.md).

And the geography does the design work:

- ⭐ **The falls are upstream in the highlands; the city is downstream at
  the confluence.** Generation and consumption are **in different places**,
  which makes **transmission the political object** — the thing localities
  invest in and fight over.
- ⭐⭐ **One watershed means upstream/downstream is a REALM-WIDE
  relationship.** Water rights stop being a local ordinance and become the
  structural conflict: **riparian vs. prior appropriation**, damming,
  diversion, pollution — all live, all between named places, and all an
  amendment-library module.
- **A river has a limited number of good fall sites.** Best taken first —
  the Ricardian supply curve, free, from geography.
- Historically correct (mills long preceded steam) and **rate-capped**,
  which is what eventually *creates* the demand for coal. **The transition
  builds itself.**

*One river, water and power, one set of rights* — shipped:
`watershed.md § rights` (`WaterRightRegistry`, prior appropriation records
· riparian derives) sits on the same `Watercourse` the generator draws
from.

## ⭐⭐⭐ And this is what magic is FOR — the frontier tier

> **User: "I just wanted to make sure we understood magic as a power source
> because we're going to need it out in the frontier for certain kinds of
> editorial decisions. Sometimes you just need to put something down
> somewhere, and in our world you can't just lie about it being powered if
> it needs to be powered."**

| | availability | cost per unit | needs |
|---|---|---|---|
| **cells + nodes** | ⭐ **anywhere, day one** | expensive | nothing |
| **the grid** | only where built | cheap | capital, rights-of-way, politics |

*The "expensive" column is mechanical* — shipped:
[magic-items.md](../../subsystems/magic-items.md) § the charge economy
(`S* = inflow/d`, denominated in τ; caster-sourced, metabolism-capped).

> ⭐⭐⭐⭐ **A community's development arc IS the replacement of magic by
> infrastructure.** Portable-and-expensive → networked-and-cheap. It is what
> actually happened (artisanal power → reticulated power), it is
> **measurable**, and it means magic gives a new settlement what it needs on
> day one **without being the permanent answer.**

⭐ So Terminus can be wood-and-water today without cutting anyone off: **magic
covers the gap at a premium, and the visible sign of a place developing is
that the premium goes away.**

⚠ **The TPA is already exactly this and nobody noticed** — *"right now
everywhere it goes is developed."* Once terminals draw power, **the network's
reach becomes a statement about which places are developed**, which is a far
better map than a list.

---

# Part 4 — The declaration, and what is mandatory

> **User: "probably every single parcel needs to answer what its power needs
> are, or do a best guess."**

> ⭐⭐ **Make the field MANDATORY and the value FALLIBLE.** An *undeclared*
> parcel is a bug the lint catches. A *wrong* declaration is a
> disagreement — which is what review is for
> ([attestation-slate](./attestation-slate.md)).

## ⭐⭐⭐ Build the METER, never the RULE

[balance-slate](./balance-slate.md)'s doctrine applies directly: *a statute
is a constraint on a meter.*

> **The engine models service and access as FACTS. It never models
> requirements.** A zoning statute then says *"a dwelling must have water"*;
> the engine answers *"does it?"*; the locality decides the consequence.

⭐ That is what makes an unpowered shack legal in Hinkley Hills and illegal
in downtown Terminus — **a difference that emerges from law rather than from
code**, which is the emergent process the brief asks for.

## Authoring: default connected, and the tool is a lint

- ⭐ **Default to connected; author DISCONNECTION.** Preserves every room
  already minted, and the interesting state is the one worth declaring.
  Same present-but-inert pattern as `grants[]` / `allowance` in parcel 0a.
- ⭐⭐ **The process is not a document — it is a lint.** *Every declared
  consumer must resolve to a source.* Same shape as `lint:instanceable`: **a
  failing build, not a checklist.**
- **Ownership follows the pack seam already decided**: the **locality pack
  owns the premises**, so mains are locality content; a **trade pack
  declares that its kit requires service** and the locality supplies it.
  Annex knows host, never the reverse.

⚠ **The newbie wilds** are the open example — industrialized or not is
undecided. It does not block anything: **whoever holds that ground declares
its posture, and whoever reviews their branch signs it.** The point is that
it becomes a *recorded decision* rather than an assumption nobody wrote
down.

---

# Open questions

1. ⭐ **Is the declared power need a quantity or a band?** *Leans band* —
   "no number is an authority," and a band survives re-tuning. The lint only
   needs *declared vs. undeclared*.
2. **Who may dedicate?** Dedication transfers title to the municipality, so
   it needs the municipality's acceptance — ⚠ **a locality that refuses
   dedication refuses maintenance liability**, which is a real and
   interesting municipal decision.
3. ⚠ **Does a street's title carry an implied public easement**, or is
   passage a separate grant? *Leans implied* — otherwise every dedication
   needs a second act, and a street nobody may walk is nonsense.
4. **Metering: is consumption measured, or only connection?** *Leans
   connection for v1* — measured consumption means a meter reading, a
   billing cycle, and arrears, which is a whole build. ⭐ When it comes, a
   utility bill is an ordinary `payment` leg; no new banking substrate is
   needed.

   > ⭐⭐ **Added 2026-08-05, from the merged currency build: a locality
   > CANNOT bill in its own scrip.** Currency records are *code* —
   > *"adding a currency is a code edit at the wizard tier… a mint is
   > Compact-level, never a locality's own call"* — and a ledger leg may
   > never cross currencies. ⇒ **utility billing is denominated in the
   > Compact's currency by construction**, which forecloses the grid
   > becoming a private monetary system. That is the **truck-system** worry
   > [currency-slate](./currency-slate.md) raised (*wages in company scrip,
   > redeemable at the company store*), answered structurally: **a utility
   > can overcharge, but it cannot pay or bill you in something only it
   > issues.**
5. ⚠ **Do the newbie wilds have a grid?** Deliberately open; it is the first
   real consumer of the declaration process.
