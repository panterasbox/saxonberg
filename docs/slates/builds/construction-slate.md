# Construction slate — building something that is not there yet

> **Status: UNBUILT** — parked 2026-10-18 from the underwater session;
> **designed at high level 2026-10-19** with the owner inside the ships and
> harbors session (ships are its most demanding first consumer). Structures
> exist only finished → the rubber build's `construction.md` (what a place is
> made of), [assembly.md](../../subsystems/assembly.md), the repair build (W7,
> building upkeep).
> **Left:** the `ConstructionSite` as a third kind of `Structure` beside the
> building and the `Ship` · site KINDS (a building site, a shipyard slip, a
> bridge site) instanced per project, places budding by phase · the project's
> ELEMENTS with a derived bill, raised by their trades in a derived order (W7's
> `maintain` from zero) · completion popping the authored or minted structure
> into place · archetypes for all three kinds of Structure · who pays, codes
> and permission, the parcel (open)
> **Size:** a build

The owner: *"we don't really have a lot of actual construction mechanics; all
of our structures clone fully built or not at all."* And, 2026-10-19: *"we
should have a better answer than 'structures have materials'."*

## What is already decided around it

- **The underwater trade's demand is REPAIR, not construction**
  ([underwater-slate](./underwater-slate.md) § 11).
- **Upkeep is designed** — repair's W7: *"a building's walls and roof are
  layers, each weathers at its material's pace, and `maintain` replaces what
  time took — materials in hand, by that layer's trade, at the hand's band."*
  That already decides the **dependency** (what a layer consumes) and the
  **act** (`maintain`, by trade, consuming materials in hand).

## 1. ⭐⭐ Elements are built; the site is not the building **[DECIDED]**

**How real buildings go up** — by **phase across the whole building**, each on
the one beneath: the site cleared, **foundations** sized to what the ground
bears, **structure** storey by storey (each standing on the one below),
**roof** (*dried in* — everything inside sheltered), **openings** (doors,
windows, the glazier), **finish** (floors, plaster, fittings). Elements cross
rooms — a roof covers six; nobody builds the kitchen, then the bedroom.

> *"It's not very pedagogical — structures aren't really built room by room.
> But it's how our entire universe is organized. We have quantized space; real
> construction doesn't."*

So the work is real and the picture is a shortcut:

- ⭐ **The project has ELEMENTS** — foundation, walls by storey, roof, openings,
  finish (for a ship: keel, frames, hull planking, decks, masts) — each with a
  **derived bill** (material × thickness × area from the blueprint), raised by
  **its trade** (mason, carpenter or shipwright, bricklayer, tiler, glazier,
  plasterer) in the **derived order** (no roof before walls; storey two waits
  on storey one — the Structure already says *what stands on what*). The act is
  **W7's `maintain` run from zero**: erection is upkeep starting from nothing.
  Lens 1 decided it: sequencing, load paths and drying in are what room-by-room
  could not teach.
- ⭐⭐ **The site is not the building** (*"we have actual content for the fully
  formed structure… you're going to derive from that some procgen content
  that's the structure in progress? Sounds very tricky"* — and Cities:
  Skylines' shortcut: a generic construction animation, then the finished
  building pops in). **No rooms are derived from the authored building**; its
  rooms stay unloaded until it exists.
- ⭐ **Completion is the pop** — the last element done, the structure
  instantiates its rooms from its floorplan (authored or minted) and wakes; the
  site is reaped and replaced by the building's entrance. From then on upkeep is
  W7's per-room `maintain` (rubber's per-room envelope unchanged; the party-wall
  double-count stays deferred).
- **Shelter on site** — materials stockpiled on an un-roofed site are on
  decomposition's exposure clock; once *dried in* they are sheltered.

## 2. ⭐⭐⭐ The construction site is content **[DECIDED]**

*"If we're already conceding the construction content bears no resemblance to
the completed product"*, the site can be good content of its own:

- ⭐ **`ConstructionSite` is a third kind of `Structure`**, beside the plain
  building and the `Ship` — and **all three implement archetypes** (the shipped
  venue `archetype` document kind, lifted from the venue's room to the
  Structure — see [ships-and-harbors-slate](./ships-and-harbors-slate.md)
  § 4).
- **A site is instanced per project from a site KIND** — a floorplan of work
  places, with holding's keyed-instance machinery.
- ⭐ **Places bud by phase** (holding: *"the floorplan is the INITIAL mint,
  never the closed set"*) — the scaffold when the walls start, the cofferdam
  pumped out before the piers.

| site kind | its places |
|---|---|
| a building site | the yard (stockpiles; deliveries at the gate — haulage's drop point) · the footings trench · ⭐ the scaffold (aloft, budding with the walls) · the mortar board · the hoist or derrick (underwater's hoist) · the builder's hut (the plans, the foreman, the book of who is owed) |
| ⭐ a shipyard slip | the stocks · ⭐ **the mould loft** (the ship's lines drawn full size — *lofting*, her floorplan made physical) · ⭐ **the saw pit** (top-sawyer and pit-man) · the steam box (planks steamed to bend) · the caulkers' stage |
| ⭐ a bridge site | the abutments · **the cofferdam** (a pumped-dry pit — the diver and the pump crew) · the centering (the timber arch a stone arch is built on, then struck) |

- **The people** — the labourer and the hod carrier (exertion, encumbrance up
  the scaffold), the foreman sequencing the trades, the trades on their
  elements, deliveries at the gate; the **builder** (a business) coordinates;
  the **architect** authors the blueprint.
- **The hazards, derived** — falls from the scaffold (harm, by height); a trench
  collapsing (the mine's shoring); a swinging load; the cofferdam's leak against
  its pump.
- **The site reads its phase in words** — *"the walls stand to the eaves; the
  carpenters are on the roof timbers"*.
- ⭐ **A ship's site is the slip**: on completion the Ship mints with her rooms
  **alongside the slip**, and **the launch is a change of position** —
  alongside the water room (a ceremony: the bottle on the bow).

## 3. The lens pass (2026-10-19)

1. **Pedagogy** — load paths, sequencing, footings against the ground's bearing,
   drying in; lofting; the trades' order. **Decided the elements model.**
2. **Expression** — a blueprint (floorplan + elements) as content; *everyone is
   an author* applied to buildings; site kinds as reusable content; the finished
   structure untouched by its own construction.
3. **Immersion** — a site you walk, the scaffold, the saw pit, the slip.
   **Participation** — the builder, the architect, the trades meeting on one
   job, the labourer; *can the polity do something we didn't want?* —
   jerry-building.
4. **Values** — sound against cheap; codes against freedom; ⚠ collapse is the
   honest consequence and the hardest to make fair.
5. **Continuity** — timber frame → brick → steel; hand → crane: the same
   elements and acts.
6. **Economy** — historically the largest employer; **every material trade
   designed** (brick, lime, timber, glass, iron, slate, tar) gets its biggest
   customer; public works become real.
7. **Governance** — building codes (fire walls after a great fire), inspection,
   permission (zoning exists because of density) — each a criterion and an
   appeal.

## 4. Open

1. **Who pays and who it is for** — public works (the markets faucet), a
   player's own build, a commission; the builder's contract.
2. **How it meets the parcel and the author** — you build on ground you hold;
   does a player's blueprint become authored content (succession, not class
   change)?
3. **The blueprint's form** — the floorplan plus elements as rows (a document
   kind?); how an element's bill is derived from rubber's envelope specs.
4. **Collapse** — an element below its load: when, how fair, how read.
5. **Building in water** — the cofferdam and caisson (underwater § 7) as the
   bridge site's hardest case.
