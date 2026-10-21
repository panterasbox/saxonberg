# Masonry & concrete slate — stone, the binder ladder, and two ways to set

> **Status: UNBUILT** — designed at high level 2026-10-20 with the owner, out of the
> gap walk; to be drilled further at planning. What exists or is decided: quicklime
> (quarrying's limekiln, ships); **the masonry Discipline**, shipping in the
> ceramics build (*"masonry, which relines here and is W7's next"*) with one firing
> rule (limestone → quicklime, gypsum → plaster); **lime mortar, repointing, the
> bricklayer and the hard-mortar spall** ([brickmaking-slate](./brickmaking-slate.md)
> § 7, routed to [repair](./repair-slate.md) W7); hydraulic lime named as *"the next
> rung"*; a `concrete` material row with no chemistry; and rgo-unification's one line
> *"cement is `burn-lime` + clay — rows"*, which misses the chemistry.
> **Left:** ⭐ the two set chemistries (carbonation, hydration) · the binder ladder
> (air lime → hydraulic → Roman pozzolanic → Portland → reinforced) · concrete as
> moulding into formwork, and curing · compression and tension as material
> properties · the stone mason (rubble, squared, ashlar), dry-stone walling, the arch
> and its centering · stone weathering by chemistry · the mason's mark · the crushing
> test · codes, the surveyor, listing
> **Size:** a build; mortar and repointing stay W7's, brick and plaster stay
> ceramics'

## 1. ⭐⭐⭐ Two set chemistries **[DECIDED — lens 1; invariant]**

- **Air lime sets by carbonation** — it takes CO₂ back from the air and slowly becomes
  limestone again: months, needs air, **will not set under water** (brickmaking's
  mortar and paint's limewash).
- **Hydraulic binders set by hydration** — a chemical reaction **with water**: fast,
  strong, **works under water** (hydraulic lime, Roman pozzolanic concrete, Portland
  cement).

Derived from the binder, never authored per use: a lime-mortared quay fails, and a
player who has learned why predicts it.

### The binder ladder

| rung | made by | sets by | real case |
|---|---|---|---|
| air lime | burning limestone | carbonation | every pre-modern wall |
| hydraulic lime | burning limestone that carries clay | hydration, partly | Smeaton's Eddystone lighthouse (1759) |
| ⭐ Roman concrete | lime + **pozzolana** (volcanic ash) | hydration | the Pantheon's dome; harbors that grow *stronger* in seawater |
| Portland cement | limestone + clay fired to **clinker** (~1450 °C, partly fused), ground | hydration | Aspdin (1824) |
| reinforced concrete | concrete + iron or steel bars | — | 1850s onward |

⭐ **Pozzolana is volcanic ash — and Waponi Woo is a volcano.** The sugar build's
island becomes Roman concrete's source; its ash is an export.

## 2. ⭐⭐ Concrete is moulding; curing needs water **[DECIDED]**

- ⭐ **Pouring into formwork is [mould.md](../../subsystems/mould.md)'s rule** — *the
  container decides the shape of what sets in it*; hydration is a new set process on
  the [moulding slate](./moulding-slate.md)'s list.
- ⭐ **Curing** — hydration consumes water, so concrete that **dries too fast is
  weak**; the wetness model derives it: keep it damp for days.
- **Aggregate** — sand and gravel from quarrying, the cheapest part.

## 3. ⭐⭐ Compression and tension **[DECIDED — lens 1 sets the depth]**

Stone and concrete resist crushing and fail when pulled. That one fact explains the
**arch**, the **dome**, the **buttress**, and why concrete needs **rebar** to span a
beam. ⭐ It is a **material property plus a rule per element** — never a structural
simulation; expression is inelastic, and lens 1 needs the principle, not the
analysis.

## 3a. ⭐⭐⭐ Thrust — dams, buttresses and the flying buttress **[DECIDED 2026-10-20]**

The owner asked whether dams and buttresses need their own abstractions. **For water
control the abstraction exists and is size-agnostic**: [watershed.md](../../subsystems/watershed.md)'s
`ControlStructure` — *"a dam, a headgate, a weir and a sluice are one thing"* — with the
reservoir behind it a `StorageNode` whose **level is its one piece of state**. A ditch's
headgate and a great dam are the same object with different numbers. **What does not exist
is the dam as a body** — what physically holds the water back — and that is where
buttresses come in.

**The shared idea is resisting a thrust.** A dam holds back water, a cathedral wall the
outward push of its vault, a retaining wall the earth: each an **element resisting a
sideways thrust**, and there are few ways to do it:

| way | how it resists | dam | elsewhere |
|---|---|---|---|
| **mass** | weight | gravity dam | the thick wall |
| **shape** | curves the thrust into compression against solid ends | arch dam, braced on the valley's rock | the arch and the vault (§ 3) |
| **struts** | a thin face held up by braces | ⭐ buttress dam — far less material | ⭐ **the buttress and the flying buttress** |
| **embankment** | a mound of earth round a clay core | earthfill, the oldest | the levee |

- **Thrust is a load type** beside § 3's compression and tension — still a material
  property and a rule per element, never a simulation — and the
  [construction slate](./construction-slate.md)'s elements gain these kinds. **A buttress
  is an element kind, not a system.**
- ⭐⭐ **The flying buttress is why Gothic walls became windows** — carry the vault's
  thrust outward over the aisle and the wall no longer bears it, so the wall can be mostly
  glass. The buttress makes the stained-glass window possible: masonry,
  [glass](../../subsystems/glass.md) and [paint](./paint-slate.md) in one structure.
- ⭐⭐ **The thrust derives from shipped state** — water pressure grows with depth and the
  total push on a dam with **the square of the depth**, so **the load rises as the
  reservoir fills**, read from the `StorageNode`'s level — and why a dam is thicker at
  the bottom.
- **Small and big** — one abstraction at every size; size changes **how it is built** (a
  farm pond's bank is dug; a great dam is a construction site with elements) and **what
  failure costs** (the stored volume), both derived. A beaver dam is a natural
  `ControlStructure`, when the bestiary arrives.
- **How a dam fails, and what it costs** → the [flooding slate](./flooding-slate.md)
  (overtopping, piping and its boil, sliding, the abutment; the released volume; Rylands
  v Fletcher and Johnstown).

## 4. The stone mason **[DECIDED]**

- **Dressing** — rubble (rough), squared, **ashlar** (precisely cut); quarrying's
  `split` gives the block, and dressing is the grade of work.
- ⭐ **Dry-stone walling** — walls with **no mortar**, held by placement and gravity:
  a real craft, pure skill.
- ⭐ **The arch** — compression made into a span: the keystone, and the **centering**
  (the timber form it is built on, then struck), already on the
  [construction slate](./construction-slate.md)'s bridge site.
- **Freestone** carves in any direction — why some stone becomes ornament and other
  stays rubble.

## 5. The lens pass (2026-10-20)

**1. Pedagogy** — Disciplines: masonry (ceramics), chemistry and physics (platform),
**engineering** (a named ISCED gap this opens).
- The two set chemistries; curing; compression and tension (§§ 1–3).
- **Water leaves through the more permeable material** — the hard-mortar spall
  (brickmaking).
- **Thermal mass** — thick stone walls cool in summer, warm at night; construction's
  exposure and the thermal model derive it.
- ⭐ **Stone weathers by its chemistry** — limestone and marble **dissolve in acid
  rain**: sulfur dioxide (a shipped gas) from coal smoke eats and blackens city
  buildings (the [potash slate](../tails/potash-slate.md)'s smoke ordinance has a
  second victim); granite barely weathers; sandstone spalls.

**2. Expression**
- A building's material is already authored — construction's enclosure layers are
  material and thickness; choosing local granite or imported marble *is* the
  expression.
- ⭐ **Local stone gives a region its character** (grain): the default comes from what
  is quarried nearby; an author may import.
- ⭐⭐ **The mason's mark** — medieval masons cut a personal mark into each stone they
  dressed, and cathedrals carry hundreds: **provenance in the fabric**, a player's
  signature in the wall, read by `look`, outlasting the player.
- Carving and ornament (gargoyles, capitals, the monument) are authored details; bonds
  stay prose.

**3. Immersion and participation**
- The stone yard and the banker (the mason's bench), the chisel's ring, the scaffold.
- ⭐ **Striking the centering** — knocked out from under a finished arch; it stands or
  it does not.
- ⭐ **The great project** — a cathedral or dome over generations: construction's site
  running for real months, a polity's multi-year commitment.
- ⭐ **Overreach** — a dome too wide for anyone to know how to build (Florence waited
  decades for Brunelleschi).
- ⭐ **Jerry-building** — concrete short on cement, mortar short on lime: it looks the
  same and fails later. The polity cutting corners, fully playable.
- **The masons' lodge** — a guild with trade secrets; the historical origin of
  freemasonry ([guild-slate](./guild-slate.md)).

**4. Values**
- Safety against cost — the accountability ledger makes a negligent builder answerable.
- Conservation against convenience — the hard-mortar spall, again.
- Heritage against progress — demolition.
- Credit — the architect against the masons; the mark is a quiet answer.
- ⭐ **The carbon in cement** — burning limestone releases its CO₂ (the ~44 % of mass
  the ceramics lime row already loses); real cement is around 8 % of global CO₂.
  ⚠ No realm-scale carbon model receives it yet — a fact to learn, not a consequence
  (grain).

**5. Continuity**
- Binder ladder and wall ladder (dry stone → rubble → ashlar → brick → concrete →
  reinforced): **mix, place, cure**; a wall answers `maintain` and `repair` at every
  rung.
- ⭐ **The failure changes kind** — lime is forgiving (soft, reversible, it heals small
  cracks by re-carbonating, and can be repointed); modern concrete is hard and
  irreversible (patched, never repointed); ⭐ **reinforced concrete hides its failure**
  — carbonation slowly reaches the steel, the rebar rusts unseen
  ([decomposition](./decomposition-slate.md)'s rust out of sight) until the concrete
  cracks off, so an inspector needs an instrument. The newer rung is stronger and more
  fragile in time.

**6. Economy**
- Produces walls, foundations, harbors, aqueducts, roads, monuments; consumes stone,
  sand and gravel, lime, ⭐ **a lot of fuel** (the limekiln and clinker kiln), water,
  and **labor above all** — construction was historically the largest employer.
- Who pays — the client's builder contract; **public works** (aqueducts, harbors,
  roads, [Saxonberg](./saxonberg-city-slate.md)'s axis) as the
  [markets slate](./markets-slate.md)'s faucet.
- The demand was there first — W7's walls, construction, underwater's footings, the
  harbors, [roads](./roads-slate.md), the [aqueducts](./running-water-slate.md).
- ⭐ **Value density decides what stone travels** — heavy and cheap, so towns are built
  of local stone or brick; only fine stone (Portland stone, marble) travels, by water.
- ⭐ **Itinerant masons** followed big projects — the settlement-mobility thread again.
- **The cement works is a LULU** — dust and kiln smoke.

**7. Governance**
- ⭐ **Codes after disaster** — London's Rebuilding Act after the Great Fire of 1666
  required brick and stone and set classes of house (title: a polity mandates
  materials).
- ⭐ **The district surveyor** — London's Building Act of 1774 created inspectors who
  checked work against the code: the criterion is the code, the appeal the magistrate.
- ⭐ **The crushing test** — a test cube of the batch crushed at 28 days reads its
  strength: engine measures, an institution certifies — the honest answer to
  jerry-building.
- **Heritage listing** — a polity protecting a building from its own owner (title
  against parcel title).
- **Party walls** — the fire wall two neighbors own; **the lodge as a closed shop**.

## 6. What it touches

| consumer | what it needs |
|---|---|
| construction | foundations, walls, the mason and plasterer as element trades, arches; collapse (its open question 4) |
| repair W7 | repointing and mortar (decided there) |
| [underwater](./underwater-slate.md) and [harbors](./ships-and-harbors-slate.md) | hydraulic binders — footings, quays, breakwaters, the cofferdam, the lighthouse |
| running water | aqueduct channels; cisterns lined with Roman waterproof plaster (*opus signinum*) |
| roads | setts; concrete as a surface rung |
| ceramics | masonry's Discipline; clinker under its firing rule |
| metallurgy | rebar |
| decomposition | frost spall; carbonation reaching the rebar |
| [paint](./paint-slate.md) | limewash on masonry |

## 7. Open — for the plan

1. **Collapse** — construction's open question 4: when, how fair, how read; it decides
   how jerry-building bites.
2. **Where masonry finally lives** — ceramics holds it *"until W7 gathers the building
   trades"*: a building-trades pack?
3. **Clinker's temperature** under ceramics' one firing rule.
4. **Carbon** — whether cement's CO₂ ever lands anywhere.
5. **The arch's depth** — the keystone and the centering as acts, or as prose.
