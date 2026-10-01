# Cold storage — the powered cold store, and the containment it makes legible

**Kind:** feature
**Leads from:** kernel — first consumers are the **Terminus infirmary's blood
fridge** (it fills the already-shipped `bloodBank` par with units that now
last weeks) and a **Terminus food cold-store**, both electrified the day the
appliance ships. The kernel substrate (active cooling, the spoilage-clock
correctness fix, the containment wire projection) is exercised by real content
on arrival — no inert substrate.

Cold storage is the payoff the energy build was for: the grid now powers a
thing that keeps other things cold, so blood and food last — and lose the
power and they warm and spoil. The build folds in two things the fridge
forces: a **correctness fix** to the spoilage clock (without it, a fridge's
signature moment — the power cut — is computed wrong), and **Rung 1 of the
containment read** (the server already knows how every item sits and whether
it's itself a container; today it throws that away, so a fridge with a freezer
reads as two anonymous boxes). Seeded by
[cold-chain-slate](../slates/builds/cold-chain-slate.md),
[fridge-design-pack](../slates/builds/fridge-design-pack.md), the blood
consumer framing in [blood-slate](../slates/builds/blood-slate.md), and the
containment-read seam in
[carded-prose-slate](../slates/tails/carded-prose-slate.md) +
[chambered-vessels-slate](../slates/tails/chambered-vessels-slate.md).

## What already exists

- **Passive cold is fully shipped and wired** (MR !302): an insulated icebox
  that holds its contents cold only as long as a carried-in ice block lasts,
  the cold-holder couple, the melt clock, the `coldStorage` archetype. There is
  **no active/powered cooler** — cold must be physically supplied and depletes.
- **Cold already slows spoilage, end to end.** The shipped spoilage clock reads
  a thing's *own current temperature* through an Arrhenius term, so a colder
  holder genuinely means slower decay and (below freezing) a pause. **A blood
  bag in a colder holder already lasts longer today, with zero new code** — the
  proof exists (~3 days warm vs ~4+ weeks cold). The clock is reconcile-on-read.
- **Blood is a perishable bulk material** in a bag, carrying its identity
  (donor species, true ABO type, whether it's been tested) and a freshness
  clock; `transfuse` already refuses a spoiled unit. The infirmary carries a
  `bloodBank` 2 L reorder target **with nothing producing blood to fill it**.
- **The grid powers devices.** The energy build shipped the wall-socket seam a
  device composes to draw grid power and know, synchronously, whether its
  premises is live right now — explicitly reserved for "the cold-chain fridge."
- **Food (`Provision`) carries the same thermal + freshness pairing**, so food
  benefits from cold the same way blood does.
- **The containment model is rich; the wire is flat.** The server knows, for
  every item, how it sits (on / in / from a host) and whether it is itself a
  container — a desk already composes both a drawer (a container) and a surface
  (placement) as independent collections. But the client is sent, per contained
  item, only `{ name, quantity, keyword }`: no placement, no container-ness, one
  level only. The one channel that does carry placement (the "On it / In it"
  drill-in prose) is suppressed under carding and never rendered.
- **A multi-compartment appliance is already proven.** The apiculture hive is
  one object that contains sealable sub-boxes, each with its own enclosed air —
  built from shipped containment + sealing + atmosphere, no bespoke mixin. The
  fridge/freezer is the same shape.

**Therefore what is genuinely new here is:** (1) an **actively-cooled, powered
appliance** that drives its interior to a setpoint while its premises is live
and drifts to ambient when the power is cut; (2) **cold production** — the
freezer makes carryable cold (ice) and a carried cooler holds it, closing the
long-open "who makes the ice the iceboxes eat" for electrified places; (3) a
**correctness fix** so spoilage across a temperature change (a power cut) is
integrated, not sampled; and (4) **Rung 1 of the containment read** — the
server stops discarding how each item sits and whether it's a container, and
the client shows it. The cold→blood and cold→food links themselves are already
built and need no new mechanism — only something that *makes* the cold.

## Goals

- A **powered cold store** keeps its contents at a cold setpoint while its
  premises has grid power; a blood unit or food kept in it lasts far longer
  than at room temperature.
- **Cutting the power makes it warm and its contents spoil** — correctly read
  whether you observe it mid-outage or after it has warmed and re-cooled.
- The **freezer produces carryable cold** (ice), and a **portable cooler**
  holds a unit cold off the grid (a medic can walk a transfusion to a hunt).
- The **Terminus infirmary's blood bank becomes a real cold store** — units it
  holds survive long enough to be a stock rather than a same-day perishable.
- **Looking at any container shows how each item sits in it** (on / in / from)
  and **which items are themselves containers** — so a fridge reads as one
  appliance with a fridge compartment and a freezer compartment, not two
  anonymous boxes, and a chest reads as what's *on* the lid vs *in* the box.

## Non-goals

- **The nesting view** — an inline expand/collapse tree of a container's
  nested contents, a reusable tree/disclosure widget, the structured-layout
  terminal vocabulary, and "compartments spoken as parts" → **Rung 2, the
  immediate next build** (the containment-presentation build). This build ships
  Rung 1 (the honest *bytes* + a per-item placement/container read); it does
  **not** ship the recursive view.
- **The preindustrial ice trade** — harvesting ice, the ice house, the
  seasonal pond, the iceman / cold-chain-courier vocation → **its own later
  build**, the cold twin of the fuel trade. This build's cold production is
  electric only; an un-electrified town (Heart's Delight) gets no cold store
  here, exactly as it got no grid light.
- **The blood-bank economy** — donor-supplier restock, requisition, the courier
  vocation, gift-vs-paid markets, screening → **blood-slate**. Cold storage
  *enables* a stockable bank (longer shelf life) but ships no donor/market loop.
- **Metered billing** — charging for the power the appliance draws → stays
  deferred to [power-utility-slate](../slates/builds/power-utility-slate.md), as
  in energy. The appliance draws for free this build.
- **The two-temperature "parts-as-parts" describer polish** (a compartment
  reading as an intrinsic part rather than a contained sub-object) → folded into
  **Rung 2 / chambered-vessels-slate**. This build accepts the proven
  container-of-containers reading for compartments.

## Placement

- **A `/system`/platform appliance substrate** owns the active-cooling
  capability and the powered-appliance behaviour — kernel, because it is a
  mechanism (a cooler run against ambient, gated on grid power) many future
  consumers will compose (the cold store now, a cold room later, any powered
  appliance). The **correctness fix** and the **containment wire projection**
  are kernel (the spoilage clock and the container field projection are both
  kernel). ⭐ Second-instance test: a second kind of cold store, or a second
  powered appliance, is a **row**, not code.
- **The cold-store objects and the carried cooler** are content rows over that
  substrate (a fridge, a freezer, an iced cooler), placed by the realm.
- **The ice** the freezer makes is a commons good (the thing passive iceboxes
  already consume).

## Collisions

- **The Terminus infirmary** — already carries the `bloodBank` par and the
  medic loop; it gains the blood fridge. This is the headline placement.
- **The shipped passive `Icebox`** — this build gives its phantom ice a real
  electric source (the freezer) and adds the *carryable* sibling the fixed
  icebox could never be; it must not duplicate or break the passive rung.
- **A Terminus food premises** — the general store / a kitchen gains a food cold
  store (grain: the plan picks the exact row). Must be an electrified premises.
- **Heart's Delight (gas-lit)** — deliberately gets **no** cold store; its cold
  waits for the ice trade. No new faucet-from-nowhere there.
- **Every existing container** — the Rung 1 containment read changes how *all*
  of them present (a chest, a bag, the hive, a corpse's pockets). The read must
  improve them, not regress the current flat list.
- **The `transfuse` / blood vertical** — already reads a unit's freshness band;
  cold storage only changes how long a unit stays in the good band. No change to
  the transfusion path itself.

## Surface decisions

### The appliance is a plain powered device — no money leg
It draws grid power and works while the premises is live; it stops and warms
when the power is cut. There is no bill, no meter reading, no ownership economy
in this build (deferred to power-utility-slate / blood-slate). A second
appliance is a row. **Reasoning:** energy deferred metered billing for the same
reason; the value (cold that keeps things, and dies with the grid) lands
without it, and a money leg would couple this to the unbuilt bank economy.

### The freezer makes the ice (the electric answer to "who sells ice")
A powered freezer drives its interior below freezing and yields carryable ice
blocks — the exact good the passive iceboxes already consume and nobody made.
**Reasoning:** it closes a long-standing open question for electrified places
with the thing we're already building, and it bridges the powered chain to the
passive/portable chain (freezer → ice → cooler/icebox). The preindustrial
answer (harvest) is the deferred ice trade.

### The carried cooler is in
An insulated cooler loaded with the freezer's ice keeps a unit cold while
carried off the grid. **Reasoning:** it's the one thing the shipped fixed
icebox can't do, it's the medic's real need (a transfusion walked to a hunt),
and it's the portable half of the cold chain. Alternative considered: fridge
only — rejected, it leaves cold trapped where the grid reaches.

### A fridge is one appliance with two compartments, via a container-of-containers
Fridge and freezer are two cold compartments of one object, each at its own
setpoint — the fridge is a cold container whose shipped-with contents include a
second, colder cold container (the freezer box), the way `Chest`/`Icebox`
already ship contents via `props:`. Not a bespoke chamber mechanism, and (the
plan corrected this) **not** minted at `postRegister` — the hive mints nothing;
the proven shape is simply a container row that ships containers. **Reasoning:**
the container-of-containers shape is already proven by every `props:`-shipping
container. The polish that makes compartments read as *parts* rather than
contained sub-objects is Rung 2.

### Spoilage across a temperature change is integrated, not sampled (B)
The spoilage clock today applies a single end-of-interval temperature over a
whole unobserved gap, so a fridge that warmed during a power cut and re-cooled
**under-spoils silently**, and one observed mid-outage **insta-spoils**. This
build fixes it so the warm-up curve across an outage is reconstructed
correctly. **Reasoning:** the power cut is the fridge's signature moment; a
headline feature whose signature failure is computed wrong is not shippable.
This is the one piece that is pure correctness, not player-facing surface.

### Rung 1 of the containment read: ship the honest bytes + a per-item read
The server projects, per contained item, **how it sits** (on / in / from its
host) and **whether it is itself a container**; the client shows both — so a
`look` at any container tells you what's *on* it vs *in* it, and marks the
things that hold more. **No inline nesting/expand view** (Rung 2).
**Reasoning:** the model already knows all of this and discards it at the wire;
"stop throwing it away" is small, server-mostly, independently valuable for
every container, and it's what lets the new fridge debut reading honestly
instead of as two anonymous boxes. The recursive *view* is the genuine design
problem and is deferred whole to Rung 2.

## Lens pass

- **Pedagogy (1):** the cold chain is derivable — colder is slower is already a
  readable curve; the outage→spoil consequence teaches why the grid matters;
  the containment read teaches the world's structure (what's on vs in a thing).
- **Creative expression (2):** a second cold store, a second powered appliance,
  a third kind of perishable are rows; the substrate carries them with no code.
- **Immersion & participation (3):** the one beat to get right is the power cut
  — the fridge warming and its contents turning is the drama, and it must read
  true. Low roleplay surface otherwise; it's infrastructure.
- **Values (4):** no standing/judgement surface; a gap, recorded (the bank
  economy, where gift-vs-paid blood *does* raise a values question, is deferred
  to blood-slate).
- **Continuity (5):** the clean one — same preservation need, source changes by
  epoch (harvested ice in the frontier → powered cold in the city), and the
  appliance answers the same commands the icebox does. The ice trade is the
  deferred frontier twin.
- **Economy (6):** demand was there first (a `bloodBank` nobody fills; food
  that rots). Produces cold (and ice); consumes grid power. "Who makes the ice"
  gets its electric answer; the full market is deferred.

## The drive

In electrified Terminus, at the infirmary:

1. `look` the **blood fridge** — it reads as one appliance with a **fridge
   compartment and a freezer compartment**, and it is **running** (powered).
2. Bleed a donor into a bag; put the bag **in the fridge compartment** (blood
   banks at 1–6 °C, not frozen — the freezer holds the ice pan).
   `look` the fridge again — the read shows the bag **sits in the fridge
   compartment**, and marks each compartment as a thing that holds more
   (Rung 1: placement + container-ness, no expand view).
3. Advance several game-days. The stored unit is **still fresh**; an identical
   unit left on the counter has **spoiled** (~3 days warm).
4. **Sever the avenue feeder.** The fridge **warms**; the stored unit begins to
   spoil — and the reading is **correct whether you look mid-outage or after it
   has warmed and re-cooled** (the B payoff). `transfuse` refuses it once it's
   crossed into spoiled.
5. **Splice** the feeder — the fridge cools again.
6. The **freezer makes ice**; take an ice block, load the **carried cooler**,
   carry a unit into an **unpowered room** — it **stays cold on the move**.
7. A **food provision** kept in the fridge **outlasts** one on the shelf.
8. `look` an unrelated container (a chest, the hive) — each item now shows
   **how it sits** (on / in) and whether it **holds more**; a chest reads as
   what's on the lid vs in the box, not one flat list.

## Acceptance criteria

*(Observable from outside the code.)*

- A powered cold store keeps a blood unit (and food) in the good/fresh band far
  longer than room temperature; the same unit left out spoils on the shipped
  warm timescale.
- Cutting the store's grid power makes it warm and its contents spoil; restoring
  power cools it again — and the spoilage you can read is correct both during
  the outage and after a warm-then-cool cycle (no insta-spoil, no silent
  under-spoil).
- The freezer yields ice a player can carry; a loaded cooler keeps a unit cold
  in a room with no grid.
- A `look` at a fridge reads as one appliance with two compartments; a `look`
  at any container shows, per item, how it sits (on/in/from) and whether it is
  itself a container.
- An un-electrified premises (Heart's Delight) has no cold store, and nothing
  pretends to supply it with cold.
- `transfuse` still refuses a unit once it has spoiled; a unit kept cold stays
  transfusable long enough to be stocked.

## Cross-references

- Seeding slates: `cold-chain-slate`, `fridge-design-pack`, `blood-slate`
  (consumer framing), `carded-prose-slate` + `chambered-vessels-slate`
  (the containment read), `reconcile-chains-slate` (the correctness fix).
- Subsystems: `thermal.md`, `spoilage.md`, `blood.md`, `energy.md`,
  `spatial.md` (§ Placement), `card-surface.md`, `message-rendering.md`,
  `presentation.md`.
- Deferred to: Rung 2 (containment-presentation build), the ice-trade build,
  `blood-slate` (bank economy), `power-utility-slate` (metered billing).
