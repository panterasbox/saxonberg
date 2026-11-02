# Water supply — requirements

**Kind:** feature
**Leads from:** kernel. The substrate is the water system's supply contract, the soil's
water budget (inlets, ponding, salt, drainage) and the aquifer. **First consumers,
shipped in this build:** the Terminus houses and the Hinkley Hills district (plumbing),
Rejection (wells and the aquifer), and the Heart's Delight valley (irrigation).

Water reaches a city and a valley through one model, at every epoch. Today the city is
**covered and nothing is connected**: one standpipe reads its main, and every other tap,
basin and bath in the realm runs forever from nowhere. Irrigation does not exist: soil
is watered only by rain and by hand. This build makes where water comes from a fact
you can reason about. A tap reads its supply. A house is plumbed by a plumber. A field
takes water from a ditch on its turn. A well draws on water that can run low, salt
builds up in soil that does not drain, and lead leaches from a pipe into soft water.
It gathers two slates into one build, joined by the irrigation slate's decision of
*one source, two scales*: a dry year in the valley shows in the city's taps, through
one shared river, with nobody authoring the link.

> ⚠ **Amended in planning (2026-11-02, all agreed with the owner).** Where
> this doc and [the plan](../plans/water-supply-plan.md) § *Requirements
> disagreements* (R1–R10) or its D20, D27–D30 differ, the plan's agreed rows
> win. The changes:
> - a well is **dug (`dig a well`) or drilled** (a bore strikes the same
>   water), not sunk with `sink`;
> - theft is **cutting the ditch bank**;
> - the weak top floor is tested in **the Hinkley loft**;
> - iron pipe comes over the ridge **from Rejection's foundry**;
> - a flooded field is **standing water on its floor**;
> - the NPC plumber **sells**, and players lay pipe;
> - **no `connect` or `plumb`**: a pipe run is an assembly laid with `fit`,
>   and finished rooms hide their plumbing **under and behind**;
> - the bucket at the deep well is **harbors' `bail`**;
> - Rejection's wells sit on **a shallow till aquifer**;
> - NPC turns **reconcile from the rota under the live refusals**;
> - **staged or live is chosen per row**;
> - Avila **hand-pumps into a cistern**.

Seeding slates: [running-water-slate](../slates/builds/running-water-slate.md),
[irrigation-slate](../slates/builds/irrigation-slate.md). The water trade (the third
part) is in at its two ends only, and is **the first thing cut** if scope must shrink.

## What already exists

The survey (2026-11-02) found more substrate than the slates assumed, but most of it is
**built and unconsumed**:

- **The supply side ships.** Mains (supply and disposal), with head, pump cost,
  capacity and treatment. The six supply words: *dry · cut · frozen · fouled · off ·
  overdrawn*. The river draws ledger. Contamination by kind (fouled water is cured by
  boiling or the stoneware filter; tainted water is defined but nothing produces it).
  The Terminus works at Wharfside: the intake and its underpowered electric pump, the
  outfall, and the aqueduct house. `switch` works on a main. `analyze water` and
  `analyze power` ship.
- **Unconsumed substrate:**
  - **Water rights:** prior appropriation, riparian shares, quotas. No caller, no
    verb, no authored right.
  - **The tank:** no fill, no draw, cannot feed a tap. The Hinkley District tank is
    permanently empty while its prose claims it gives the hill its pressure.
  - **The diversion:** water a weir or headgate diverts vanishes instead of arriving
    in its channel, and no verb opens or closes one.
  - **Taps:** only the market standpipe is plumbed, and it reads only on or off.
- **Endless fixtures:** fifteen rows — taps, basins, bath taps, standpipes, troughs and
  butts — run forever. The rain butt is not filled by rain.
- **Wells:** a shaft over an endless body. The suction pump's ceiling (about 10 m)
  ships.
- **Soil:** water lives in the soil at every scale. A pot is a bed with one slot, a bed
  has N slots, and a field is ground with area crops. Rain and the `water` can are its
  only inputs. Moisture tops out at "full", so waterlogging harms nothing. There is no
  salt. The ground's drainage rating is read only by `ditch` pricing.
- **Lead:** imported as pigs; it leaches from glaze and pewter into acidic contents.
  ⚠⚠ **A shipped defect:** lead and dysentery doses never reach a condition, because
  the producers name a condition key that does not exist. Fouled water makes nobody
  ill, and lead accumulates in nobody.
- **Seats and locks:** seats are employment positions (the city's Magistrate exists).
  Locks and keys ship. `switch` has no ownership check: any passer-by can shut off the
  city's intake.
- **Labor and time:** the employment rota (shifts, cover) and calendar entries ship.
- **Disciplines:** soil science, agriculture, chemistry, geology, mining,
  teamstering, health, masonry and smithing exist. Nothing covers plumbing or reading
  water.
- **Construction:** there is no construction act, and a building's bill of goods is
  unbuilt (construction and repair W7).
- **Energy, the parallel:** energy shipped the same shape for power. The premises is
  the boundary (a parcel cites its feeder), consumers read the supply, two epochs sit
  side by side, and metered billing was deferred.

**Therefore what is genuinely new here is:**
- the premises' water source as a fact, and the plumber's act that sets it;
- the per-room pipe as a layer of a room's fabric (frost, burst, lead);
- shortage sharing by the divider, and intermittent supply with premises storage;
- the soil's inlets, ponding and waterlogging, salt, and drainage;
- the aquifer (a lone well's own body, or a shared basin);
- the irrigator's gates, the rotation of turns and return flow;
- two Disciplines and one trade pack;
- the content that consumes all of it.

Most of the rest is **wiring what ships**: taps reading their supply, the tank feeding
taps, diversion arriving, and rights governing draws.

## Goals

- **Every tap's water comes from somewhere you can name.** Inside a main's delivered
  area, a tap reads its main's real state. Outside, it reads a well, a cistern, a butt
  or an authored natural source. Endless water survives only on natural sources an
  author declares (a spring, a pond, a leat).
- **A house is on the main because a plumber connected it.** A premises declares its
  water source. Existing buildings are authored as connected; a new holding is dry
  until plumbed.
- **The room is where pipes live.** A plumbed room has a pipe of a material. It
  freezes and bursts where the room is cold, leaks into that room on the thaw, and is
  mended with `repair`. A lead pipe leaches by the water's chemistry, so Flint is
  derivable.
- **Pressure is head.** A tank or main gives every outlet below it pressure. The top
  floor runs weak, and the highest outlet fails first.
- **A shortage is shared by the institution's rule:** priority (the castellum) or
  proportion. Rationing by valve is a person's act.
- **Three epochs of delivery play together:** continuous flow (the Roman fountain),
  intermittent supply with storage (the Victorian district and its roof cisterns), and
  pressure on demand (the modern tap).
- **Any soil — pot, bed or field — takes water through inlets.** An inlet is a gate
  onto a supply, with a method (flood, furrow, basin, overhead). The `water` can stays
  as a single pour.
- **Soil can be over-full.** Water ponds; crops drown unless they tolerate it; an
  overwatered pot without a drainage hole kills its plant.
- **Salt is a fifth soil reserve.** It comes in with delivered water, is concentrated
  by the crop and the sun, and is carried out only through drained ground. Drains (a
  ditch, tile laid in it) are the remedy. Sumer's switch from wheat to barley is
  derivable.
- **A well draws on water that can run low.** A lone well has its own seeded body.
  Where an author declares a shared aquifer, every well on it shares one hidden
  level, refilled by rain and by irrigation's deep percolation. The observation well
  is how a commons sees it.
- **Irrigation is a commons with law.** A headgate opens the river into a ditch, a
  turnout opens the ditch onto a field, the ditch boss posts the turns, and the ditch
  rider padlocks the junior gates in a shortage. Return flow from the ditch reaches
  the river below. Theft is possible, and the gauge shows it.
- **Water is measured.** The weir gives a flow and the staff gauge a stage. The
  miner's inch is a unit. Hydrology resolves the reading's detail, never the water.
- **Fouled water makes you ill, and you cannot see it.** By eye, water is water; the
  water test kit reads it. Snow's experiment is reproducible: an outfall above an
  intake, people who drank there fall ill, they remember where they filled, and the
  health officer takes the handle off.
- **The works belong to someone.** Locks keep them, seats hold the keys, and an appeal
  goes to a person who can reverse.
- **A dry holding has cheap ways out:** sink a well, set up a butt, carry water, or pay
  to connect. Carrying by hand is the fallback, never the only option.

## Non-goals

- **Recurring water bills, meters and rates** → a shared utility-billing build with
  power (power-utility-slate, Tier C). The rule is decided here: metered on use, never
  on connection or ownership (stewardship doctrine). The property-value rate is the
  one historical rung it bans.
- **Water closets, sewer connections, septic tanks, cesspits, privies and excretion**
  → sanitation-and-pollution-slate. This build leaves `plumb`, the room pipe and the
  aquifer as the seams it will use.
- **The Great Stink** → sanitation-and-pollution-slate.
- **Hydrants** → fire-combustion-slate (nothing consumes them until a fire service
  exists).
- **A true cholera organism in water, person-to-person spread, and NPCs drinking**
  (outbreak scale) → disease-slate.
- **Chronic lead symptoms beyond the shipped burden band** → health-vertical-slate.
- **Galena, lead mining and lead smelting** → the mining and smelting slates. This
  build consumes imported lead pigs.
- **Bored elm pipe** → forestry-slate.
- **The carrier as a trade:** delivery paid on arrival, haul pricing, carriers losing
  their living when the main arrives, and the extra who carries water for a household
  → freight-slate. This build ships both ends; the middle is *carry it yourself*.
- **Dowsing** → running-water-slate (kept).
- **The domestic sand-and-charcoal filter and the slow sand filter** →
  running-water-slate (kept).
- **Siphons and route geometry** → masonry-and-concrete-slate.
- **The building's general bill of goods** (walls and roof by trade, per-layer
  `maintain`) → construction-slate and repair W7. This build ships only the plumbing
  layer, shaped so that bill absorbs it.
- **A flood crop (rice or cranberry)** → farming-slate. Ponding ships; the crop waits.
- **Sprinkler frost protection, and foliar disease from overhead watering** →
  irrigation-slate (kept) and disease-slate.
- **Sprinkler heads, drip lines and pipe networks as made objects** →
  irrigation-slate (kept). The overhead method ships; the objects wait.
- **The cone of depression, and subsidence over an overdrawn aquifer** →
  irrigation-slate (kept).
- **Flood recession** → flooding-slate.
- **Switching on the Cold Fell aqueduct** → nowhere, deliberately. It is a civic
  decision the content can make.

## Placement

- **The water system** (`/system/water`) owns:
  - the supply contract;
  - shortage sharing;
  - gates and the rotation;
  - rights;
  - return flow;
  - the aquifer as a record;
  - the flow and stage readings and the hydrology Discipline.

  Its *instances* are the realm's: an aquifer under a valley sits in the commons beside
  the rivers, so a realm edits its own.
- **The kernel** owns:
  - soil's water budget (inlets, ponding, salt, drainage);
  - the fixtures and wells every pack composes;
  - the dose fix.
- **`trade-plumbing`** (`/trade/plumbing`), a new trade pack, owns:
  - the plumber;
  - lead pipe, lead sheet and the cistern;
  - `plumb`;
  - the plumbing Discipline;
  - the plumber's yard.
- **Existing trades gain rows:**
  - founding: iron pipe;
  - ceramics: drain tile;
  - smithing: the range boiler;
  - coopering and carpentry: the roof cistern's body.
- **Farming** owns how a field takes water: the methods, and furrows and basins made by
  its acts.
- **Mining's `sink`** sinks a well.
- **Venues** are their own packs' content: Terminus, Hinkley Hills, Rejection and
  Heart's Delight.

⭐ **A second instance needs no code.** A second city's mains, a second ditch company,
a second aquifer, a second plumber's yard: all rows.

## Collisions

- **The Wharfside works** (intake, pump, outfall, aqueduct house). The intake moves
  inside a locked pump house, and the Works department's keeper holds the key.
  ⚠ The intake's delivered area is `/world/terminus`, which covers Rejection, Heart's
  Delight and Hinkley too. It narrows to the city's own districts.
- **The market standpipe**, the one plumbed tap. It joins the city's main as a public
  outlet, and a running public fountain joins it in the market as the continuous
  outlet.
- **Seznick House and Mayfield Row** (let units, the generic bathroom). Pre-connected,
  with the landlord's lead.
- **Duncan Hall** (the university's dorm). Pre-connected, with the university's iron.
- **Hinkley Hills:** the district tank, the yard standpipe, the houses and the unsold
  lots. The tank becomes real and fills on the turncock's schedule. Houses get roof
  cisterns. A new lot is dry until plumbed.
- **The endless fixtures in trade packs** (brewing's and distilling's standpipes,
  hospitality's tap and basin, the campus trough "fed by a lead pipe"). Each one
  either reads its premises' supply or is declared a natural source. None stays
  endless by accident.
- **The tannery leat and the brickfield pond** become authored natural sources.
- **The rain butts** (Rejection, potash). They fill from their roofs.
- **Rejection's wells** (the village well, the deep well) cite Rejection's aquifer. The
  brine bore stays on its sump: drilling owns it.
- **Heart's Delight:**
  - The millrace and the sawmill race on the flats coexist with the new headgate.
  - Quist's upper bench stays "above the last ditch; no water", by its own row.
  - The buyable farmsteads are the dry holdings.
  - The valley gate's and bench lane's prose about senior and junior rights becomes
    true.
- **`analyze water`** stops reporting fouling by eye. This changes shipped behavior,
  deliberately (see Surface decisions).
- **The harbors build (build-4, `reqs/harbors`)** touches the river records and the
  well's lift interface. Whichever build merges second reconciles; neither waits.
- **The energy grid** powers the intake pump and any irrigation pump. Pump energy is
  energy's existing `Powered` reading.

## Surface decisions

### 1. Demand — where a tap's water comes from

**Q:** Every tap runs forever, so nobody needs a plumber. Does that change?
**A:** Yes. Inside a main's delivered area a tap reads the main; outside, it needs a
source it can name. Endless water survives only on natural sources an author
declares. Existing city buildings are pre-connected, because the landlord or builder
plumbed them, so nobody's bathroom goes dry when this ships. Demand appears at the
edges: new holdings, Rejection, and the valley.
**Lenses:** 1 and 3a decided it; 6 confirmed real demand.

### 2. The premises and the plumber

**Q:** Is a premises' connection authored (energy's shape), or an act?
**A:** Both. A premises declares its water source: a main, a well, a cistern, or none
(a deliberate declaration, like off-grid). **`plumb`** is the plumber's act that sets
it. It needs the premises inside the main's delivered area, consumes pipe and time,
and is paid once as a service rendered. The plumber may be a player or a hired NPC.
This is the first premises fact that an act changes rather than an author.

### 3. Inside the building — the room is the locality

**Q:** No interior, a building-level bill, or per room?
**A:** Per room. Plumbing is one more layer of a room's fabric, beside its walls and
roof. A room either has water or does not, and its pipe has a material. There is no
network between rooms: each plumbed room reads the premises' source. `plumb` connects
the lot and brings water into a room. "Getting a bathroom" is a plumbed room, paid
for, which matches the historical progression. The building's general bill of goods
stays with construction.

### 4. The charge model

**Q:** Who pays, and how?
**A:** No recurring bill in this build. The rule is decided: metered on use, never on
connection or ownership; payable without attendance; non-payment can cost credit and
comfort, never the holding. The Roman *calix* and the modern meter both fit; the
property-value rate does not. Every works has an owner (public or a company). The
plumber's one-time fee is paid as a service rendered. Billing is built once, for
power and water together.

### 5. Disciplines

**Q:** Which skills does water exercise, and which is dominant?
**A:** Two new Disciplines:
- **Plumbing**, a making trade. Its competence is the joint: how much a run weeps and
  how well it survives frost.
- **Hydrology**, a reading discipline built like soil science. It covers flow, head, a
  ditch's fall and the water table, and resolves a reading's bracket, never more
  water.

There is no irrigation Discipline. Irrigating is soil science plus hydrology, so the
dominant skill stays reading the ground and the gauge, not remembering the calendar.
The other roles map to shipped Disciplines: teamstering for carrying, mining for
sinking a well, health for making water safe.

### 6. Who runs the works, and the appeal

**Q:** Today anyone can shut off the city. Is operating the works a permission?
**A:** No: it is physical. Anyone at a gate can turn it unless it is locked, so water
theft at night stays possible (lens 3b). Owners lock their works; **seats** hold the
keys:
- the works keeper and the turncock (the city's Works department);
- the ditch boss and the ditch rider (the Delight Ditch Company);
- the public health officer.

Evidence comes from instruments: the weir reads more than the gates account for.
**The appeal is a person, not a trial** (civics rules out legal machinery): the
company's board, then the parish, for water; the Magistrate for the city.
How a shortage is shared is the polity's choice (tier C).

### 7. Load on use — the network is never booted

**Q:** Must the water network be in memory before a sink can answer?
**A:** No. This is a product constraint: *a tap, a field or a well answers correctly
without the rest of the network in memory.*
- Everything a fixture needs is on a short chain pointing toward its source, loaded
  when used.
- Head, weather and river flow are derived.
- The few real states live on the shared thing as a log or checkpoint, reconciled on
  read: a main's cut, a gate's openings, a tank's level, an aquifer's level, a room's
  pipe.
- Household draw is a district's rate, never a sum over live taps.
- A shortage is decided at the outlet by its own height, so nothing asks a main which
  taps hang off it.

A house nobody visits all winter works out in spring that its scullery froze in
January.

### 8. The supply chain

**Q:** What does the plumber consume, and who makes it?
**A:**
- **Lead:** imported pigs. Lead mining waits until the plumber is its customer.
- **Lead pipe and lead sheet:** cast by the plumber on a sand bed.
- **Iron pipe:** cast by the founder. Iron is the real alternative to lead: lead is
  ductile and bulges in a frost, iron is brittle and cracks; lead poisons and iron
  rusts. All of that comes from the materials.
- **Drain tile:** made by the potter.
- **The roof cistern:** a lead-lined body from the cooper or carpenter.
- **The range boiler:** copper or iron, from the smith, heating water behind the
  kitchen range.

### 9. The outflow

**Q:** Ship a sewer system, septic tanks, or neither?
**A:** Neither. What this build needs from the waste side already exists: the city's
outfall, whose authored load fouls the river below it. A water closet without
excretion would be designed blind, and septic tanks are the same family as privies.
Both go to sanitation, which designs excretion first.

### 10. Disease and lead

**Q:** What of Snow's cholera ships?
**A:**
- **Fix the dose defect.** Lead and dysentery doses reach their conditions, and
  dysentery is authored.
- **Lead leaching.** A lead pipe leaches by the water's softness and acidity, the same
  law as lead glaze.
- **Fouling is invisible without the test.** By eye, water is water; the water test
  kit reads it (an instrument, an epoch rung). The city's analyst holds one.
- **The evidence is the players' own memory.** The record of where you filled already
  exists, so nothing new is counted.
- **The handle comes off physically.** The health officer takes the pump off its well
  or shuts the outlet; anyone can, and the seat makes it legitimate.

### 11. The supply contract

**Q:** Running or opened, the divider's policy, and storage?
**A:**
- **Every source and outlet reports** its capacity, its head and its supply state.
- **Running or opened belongs to the district:** a continuous outlet has a fixed flow
  share (the *calix* bore) and runs whether used or not; a pressure outlet draws on
  demand and fails by height. Fixtures follow their district.
- **A divider shares a shortage by `priority`** (sill heights: the castellum) or by
  **`proportion`** (declared shares). Rationing by valve is the turncock's `switch`.
- **Intermittent supply:** a main can run on a schedule. The premises' own storage
  (the roof cistern) fills while it runs, and the premises draws from its level.
- **The rain butt** fills from its roof's catchment.

### 12. The soil's water — inlets, methods, ponding

**Q:** How does water reach a pot, a bed and a field, at every epoch?
**A:**
- **Water always enters the soil.** Any soil has zero or more **inlets**, each a gate
  onto a supply, with a flow and a **method**:
  - **flood** is the default;
  - **furrow** is made by the plough;
  - **basin** is bordered with `ditch`;
  - **overhead** is a sprinkler: rain you made.
- **The method decides where the excess goes:** runoff, deep percolation, or loss to
  the air (read from the weather's heat and wind). Overhead needs pressure and ignores
  the contour. Efficiency comes from the method and the soil's texture, not a table.
- **The can** stays as a single pour.
- **Ponding:** soil can be over-full. Water stands on the surface, crops drown unless
  their profile tolerates it, and a flooded field becomes a water place you wade.

### 13. Salt and drainage

**Q:** How does irrigation salt the land?
**A:**
- **Water carries salinity.** It is seeded on each river, rain carries none, and
  return flow carries leached salt back, so a river gets saltier down an irrigated
  valley.
- **Salt is a mass balance in the soil:** in with delivered water, concentrated as the
  water is used, out only by water draining through the root zone.
- **Ground that drains poorly** perches water, raises the water table, and brings salt
  up.
- **Drains are the remedy:** a ditch, made durable with drain tile.
- **Crops carry a salt tolerance:** two published numbers (threshold and slope).
- **You read it from the ground:** a white crust on `look`, and a salinity reading on
  survey.
- **Nitrate leaching** follows water passing through, from any source.

### 14. The aquifer

**Q:** How is groundwater modeled without modeling the underground?
**A:** A lone well is an aquifer with one well:
- **Its own body:** what it holds and how fast it refills are seeded at first use from
  the ground's character and the area's rainfall.
- **It refills from rain** and is lowered by your draws.

**Sharing exists only where an author declares it.** A zone cites an aquifer, as it
cites its ground or its river reach. On a shared aquifer:
- every well shares one hidden level;
- that level is refilled by rain and by irrigation's deep percolation;
- the water table is the level against the ground's elevation.

**Wells work only above their bottom.** A suction pump fails first, at about 10 m, and
then the well fails. Draws are recorded onto the aquifer as they happen, and a
running pump records its rate.

**The level is hidden**; the **observation well** reads it, using hydrology. An author
may still declare an aquifer effectively bottomless.

### 15. Irrigation's acts

**Q:** How does water get from the river to a field?
**A:**
- **A headgate** opens the river into the ditch. It is the ditch's institution's to
  work.
- **A turnout** opens the ditch onto a field. It is the farmer's.
- **Gates answer `open` and `close`** (the common words, joining doors), with a setting
  ("a quarter"). Diverted water arrives in its ditch.
- **A field names its ditch,** and takes water while both gates are open.
- **A ditch is earth or lined.** Return flow reaches the river at the ditch's tail.
  Lining cuts seepage, so it delivers more upstream and less to the downstream
  neighbor who lived on the leakage (the no-injury doctrine, on both sides).
- **Measuring:** the weir gives a flow reading, the staff gauge a stage, and rights are
  written in miner's inches with priority dates.
- **The rotation:** the ditch boss posts the turns on the rota, and each turn lands in
  the irrigator's calendar. Night turns are part of it.

### 16. The water trade — the two ends

**Q:** How much of the water trade ships?
**A:** Only the ends.
- **The source end:**
  - `fill` from any source (ships);
  - the well-sinker sinking a well with mining's `sink`, lined with brick, striking
    water into a lone well or the shared aquifer;
  - the town pump as content.
- **The destination end:** a butt, cistern or cask on the premises is a real store
  with a level that feeds the house, whether a main, the rain or a poured bucket
  filled it.
- **The middle is a placeholder:** carry it yourself, with buckets, a yoke, or a cask
  on a dray. The carrier as a trade is freight's.

### 17. The NPC irrigators

**Q:** Do Furtado and Avila work their own turns?
**A:** Yes. They open their turnouts on their hours, night turns included. The
commons is visibly alive with no players present, and in a dry year you watch Avila's
gate padlocked while Furtado's stays open. Lenses 3b and 1 decided it.

### 18. The venues

- **Terminus — the pressure city.**
  - The intake is in a locked pump house, with the Works department's keeper holding
    the key.
  - The city's main shares a shortage by **priority**: public outlets first, then the
    trades, then the houses. That is Vitruvius's order in a modern city, and who goes
    dry first is visible.
  - The market gets a running public fountain (the continuous outlet) beside the
    standpipe.
  - Houses are pre-connected: Seznick House with lead, Duncan Hall with iron.
  - The plumber's yard is in the goods yards, by the founders.
  - The public health officer and the city analyst's test kit are at the infirmary.
  - The Magistrate hears appeals.
- **Hinkley Hills — the Victorian district.**
  - The district tank fills from the main on the turncock's schedule.
  - Houses have roof cisterns, and the tank shares by **proportion**.
  - The standpipe reads the tank.
  - A newly bought lot is dry until plumbed.
- **Rejection — no main.**
  - It cites its aquifer. The village well is the town pump.
  - The 14 m deep well has no pump, and the suction ceiling is why.
  - Butts fill from their roofs, and you carry water yourself.
- **The Heart's Delight valley — irrigation.**
  - **The Delight Ditch Company,** a mutual company under the parish, has the ditch
    boss and the ditch rider; its board hears appeals.
  - **The works:** a headgate on the Delight at the flats, the ditch, a weir, a staff
    gauge on the river, and an observation well.
  - **The rights:** senior on the flats and junior on the bench, in miner's inches.
  - **Furtado** (new, a person) farms the flats on senior water.
  - **Avila** (new, a person) farms the bench on junior water, with his own pumped
    well on the valley aquifer.
  - **Quist's upper bench** stays dry, and the **buyable farmsteads** are the dry
    holdings.

## Lens pass

1. **Pedagogy.**
   - **Disciplines:** plumbing (dominant for the plumber: the joint), hydrology
     (dominant for the ditch boss, the keeper and the well-sinker: reading water),
     soil science (dominant for the irrigator: how much and when), health (the
     analyst).
   - **Derivable:**
     - head and the weak top floor;
     - the burst in the cold room and not the warm one;
     - lead in soft water (Flint);
     - the contour that decides a ditch's command;
     - return flow and the no-injury doctrine;
     - salt and Sumer's barley;
     - the suction pump failing before the well;
     - the overwatered houseplant;
     - Snow's natural experiment.
   - ⚠ **The risk** is a dominant skill of "flood in July". It is guarded by soil
     moisture and the gauge being readable.
2. **Expression.**
   - **Authors:** a town's water is its own, in rows (a castellum or a tower, a
     company or a department, an acequia or a district, a lone well or a shared
     basin), and a house's water is one line per room.
   - **Players:** plumb your house room by room; choose lead or iron; sink your own
     well; dig, line and tile your drains.
   - **Personalization comes from the supply chain:** pipe, cistern, boiler.
3. **Immersion and participation.**
   - **3a — debts paid:** the empty tank that claimed pressure, the ditches that were
     prose, taps running forever, fouled water that sickened nobody, and anyone
     shutting off the city.
   - **3b — roles opened:** plumber, well-sinker, works keeper, turncock, ditch boss,
     ditch rider, health officer, water thief.
   - **What the polity might do that we did not plan:** sell the valley's rights to
     the city, refuse to clean the ditch, buy the intake as a company.
4. **Values.**
   - **The undecidable choices:** this year's harvest against salting the land; lining
     your ditch against the neighbor who lived on its leakage; farms against the city
     in a drought; who goes dry first.
   - **Instruments turn them into arithmetic:** the weir, the gauge, the observation
     well, the test kit.
   - **Evidence, never a score:** the salt crust, the pump that sucks air, the leak on
     the floor.
5. **Continuity.**
   - **One contract across every epoch:** capacity, head, supply state; `fill`,
     `drink` and `water` answer the same way at a Roman fountain and a modern tap.
     Continuous, intermittent and pressure supply coexist; hand, gravity and pressure
     irrigation are one inlet model.
   - **Who holds the obsolete half:** the ditch company when the pump arrives (the
     institution that allocated the water); the castellum's order when pressure
     arrives; the carriers when the main arrives (freight's).
6. **Economy.**
   - **Produces:** delivered water, crops in dry country, a city that can grow.
   - **Consumes:** lead, iron, tile, brick, labor (plumbing, sinking, ditching, the
     clean-out), pump energy, rights.
   - **Who pays:** owners pay the plumber; a works owner pays to run the works;
     billing is deferred.
   - **The demand was there first** for water itself (drinking, cooking, brewing,
     washing, crops in drought). It is now there for supply at the edges.
   - **Chain walk:** the plumber makes the lead mine worth building next.
7. **Governance.**
   - **Who judges, by what criterion, with what appeal:**
     - the ditch rider's padlock: the priority date; appeal to the company's board,
       then the parish;
     - the health officer's handle: cases traced to that source; appeal to the
       Magistrate;
     - theft: gauge subtraction.
   - **Civic infrastructure redistributes:** the town pump and the fountain share
     access; the public gauge, the observation well and the analyst share knowledge.
   - **Whoever holds the standard** (the weir, the miner's inch) does layer-3 work
     while looking neutral, and is named here.
   - **Tier C:** the sharing rule is the institution's choice.

## The drive

Each step is tagged with its **pace** (`instant` · `short` · `staged` · `span`) and
with **how its assertion is made** (`player` = player verbs and player-held tools only;
`staged` = wizard setup is fine).

### Blocking drive

**The city (Terminus and Hinkley).**

1. `instant · player` At the market standpipe, `fill` a jug. Water comes. `analyze
   water standpipe` names the main and its state, and reads **no fouling verdict by
   eye**. With the analyst's water test kit in hand, it reads the water clean.
2. `instant · player` At the Wharfside bank, a passer-by tries the pump house: locked.
   The intake cannot be switched from outside.
3. `instant · staged` As the works keeper (seat held), unlock the pump house and
   `switch` the intake off. The market standpipe gives nothing and says why; a Seznick
   House tap is dry. The running fountain stops. Switch the intake on and everything
   runs again.
4. `staged · staged` Stage the main short (a draw well above capacity). By priority,
   the public standpipe and fountain still run while a Seznick House tap fails first.
   `analyze water` at each outlet says why.
5. `instant · player` Buy a Hinkley lot (`title buy`). Its kitchen tap gives nothing:
   the premises is not connected.
6. `short · player` At the plumber's yard, a player plumber with plumbing skill casts
   lead sheet from a pig and makes a length of lead pipe. With the pipe, they `plumb`
   the lot to the district main, then `plumb` the kitchen. The kitchen tap runs.
   `analyze water` names the district tank as its supply.
7. `staged · staged` Stage the district tank low (below the house's upper floor). The
   upstairs room's tap runs weak and the ground floor runs. The roof cistern carries
   the house: it draws down as the house draws, and refills while the turncock's
   scheduled fill runs.
8. `short · player` Jump to a hard-frost night (under a game day). The unheated
   scullery's lead run, holding water, freezes; the kitchen run beside the range does
   not. On the thaw, the scullery shows water on the floor and a burst pipe. The
   plumber `repair`s it.
9. `staged · staged` An iron run in an unheated room through the same frost cracks
   rather than bulging (its burst is worse than the lead's).
10. `staged · staged` Switch Seznick House's source to a soft, acidic water. Water
    standing in its lead pipes carries lead; `analyze water` with the kit reads lead.
    A body that drinks it carries a lead burden that `assess` can find (the dose
    defect fixed).
11. `staged · player` Stage the outfall's load so it fouls the river at an intake. A
    player drinks from an outlet on that intake and falls ill with dysentery. They
    `recall` where they filled. The public health officer takes that outlet out of
    service (shuts its valve or takes the pump off its well), and it gives nothing.

**Rejection and the dry holdings.**

12. `short · player` Jump through a pinned rain (under a game day). A Rejection rain
    butt's level rises with the rain on its roof.
13. `instant · player` `pump` at the village well: water into the trough. `fill` a
    bucket at the deep well (no pump) by hand.
14. `staged · staged` Stage Rejection's aquifer low. The village pump sucks air while
    a bucket still reaches water at the deep well.
15. `short · player` On a Heart's Delight farmstead (a dry holding), `sink` a well
    (well-sinker, brick lining). It strikes water and becomes a well. `fill` from it.
16. `short · player` Fill a cask on a dray at a well, drive it to a dry holding's
    cistern, and `pour` it in. The cistern's level rises, and the holding's tap runs
    from it.

**The valley (irrigation).**

17. `instant · player` At the Delight headgate: `measure` the flow at the weir
    (hydrology widens or narrows the bracket); read the staff gauge; read the filed
    rights (who holds what, in miner's inches, at what priority).
18. `instant · player` A player holding a turn finds it in their calendar, posted by
    the ditch boss.
19. `short · player` On their turn (at night), `open` their turnout. Over the hours
    the field's soil moisture rises (soil survey). `close` it on time.
20. `short · player` Furtado's turn comes round: he opens his own turnout at his
    hour and closes it after.
21. `staged · staged` Stage a dry year (the river low). The ditch rider walks the
    round and padlocks the junior gates in priority order: Avila's closes, Furtado's
    stays open. Avila's pumped well runs. The observation well's reading falls.
22. `instant · player` A player picks or breaks a junior padlock at night and opens
    the gate. The weir reads more than the gates account for. The gate's record shows
    who worked it.
23. `staged · staged` Compare an earth ditch and a lined ditch on the same flow. The
    lined ditch delivers more to its fields, and the river below its tail reads less.
24. `staged · staged` Stage a poorly drained field with high salt. A white crust shows
    on `look`, and soil survey reads salinity. The wheat stand names salt as its
    limit; barley on the same ground does better. Cut a drain (`ditch`) and lay tile.
25. `instant · player` Water a potted plant with no drainage hole well past full. The
    pot waterlogs, and the plant's cause line names drowning roots.
26. `staged · staged` Flood a field past saturation through its turnout. Water stands
    on it, it is wadeable, and a crop with no flood tolerance suffers.
27. `staged · staged` An overhead inlet on pressure waters bench ground above the
    ditch's command. At noon in a strong wind it delivers measurably less than at
    dawn.

### Soak drive

- **S1** `span` A dry summer of turns: the ditch rider's curtailment over weeks; the
  valley aquifer drawing down under Avila's pump and the observation well tracking it;
  recovery with the autumn rains. (Staged twins: steps 21 and 14.)
- **S2** `span` Years of flood irrigation salting a poorly drained field while a drained
  field holds; the drain leaching it back. (Staged twin: step 24.)
- **S3** `span` A real cold snap across weeks: which rooms' runs burst, and which leak
  on the thaw. (Staged twins: steps 8 and 9.)
- **S4** `span` Months of drinking soft water through lead pipe: the burden builds to
  its band. (Staged twin: step 10.)
- **S5** `span` A season of rain filling and drawing a rain butt and a roof cistern.
  (Staged twins: steps 7 and 12.)
- **S6** `span` A lone well leaned on through a dry season, then refilling. (Staged
  twin: step 14.)

## Acceptance criteria

1. No tap, basin, bath, standpipe, trough or butt in the realm runs from nowhere:
   each reads a main, a well, a store, or an authored natural source, and `analyze
   water` names which.
2. A tap on a main gives nothing when the main is cut, off, dry, frozen or overdrawn,
   and says which.
3. A newly bought holding inside a delivered area is dry until a plumber plumbs it;
   one outside a delivered area has no main to connect to.
4. Existing city houses run water as before on the day this ships.
5. A pipe in an unheated room freezes and bursts in a hard frost while one in a warm
   room does not; the leak shows in that room; `repair` mends it.
6. Lead pipe carrying soft or acidic water gives lead to whoever drinks from it, and a
   lead burden results.
7. Drinking fouled water makes a person ill.
8. Without a water test kit, nobody can tell fouled water from clean.
9. A room above its source's head runs weak; in a shortage the outlet the institution
   ranks last fails first.
10. A Hinkley house draws from its roof cistern between the turncock's fills.
11. A rain butt fills when rain falls on its roof.
12. The city's intake cannot be shut off by someone without the key; the works keeper
    can.
13. A field takes water only while its headgate and turnout are both open, and a
    player can see their own turn in their calendar.
14. Furtado and Avila work their own turns with no player present.
15. In a shortage the ditch rider padlocks the junior gates in priority order; an
    opened junior gate shows up as a discrepancy at the weir.
16. A lined ditch delivers more to its own fields and less to the river below than an
    earth one.
17. Ground that is irrigated and does not drain gains salt; it shows as a crust and on
    survey; salt-sensitive crops suffer first; drained ground loses it.
18. An overwatered pot without drainage drowns its plant; a flooded field holds
    standing water.
19. A lone well can be pumped low and recovers with rain; wells on a shared aquifer
    run low together; a hand pump fails before a bucket does.
20. The observation well reads the shared aquifer's level; nothing else does.
21. A player can sink a well where there is water and get a dry hole where there is
    none.
22. Water carried in a vessel and poured into a premises' cistern feeds that
    premises' taps.
23. A house nobody has visited for a season shows, on first visit, everything that
    happened to its water in that time.

## Cross-references

- **Seeding slates:** [running-water-slate](../slates/builds/running-water-slate.md),
  [irrigation-slate](../slates/builds/irrigation-slate.md).
- **Subsystems:** [watershed](../subsystems/watershed.md), [pump](../subsystems/pump.md),
  [soil](../subsystems/soil.md), [husbandry](../subsystems/husbandry.md),
  [smallholding](../subsystems/smallholding.md), [energy](../subsystems/energy.md) (the
  parallel), [construction](../subsystems/construction.md) (room fabric),
  [metabolism](../subsystems/metabolism.md), [spoilage](../subsystems/spoilage.md),
  [instrumentation](../subsystems/instrumentation.md),
  [employment](../subsystems/employment.md), [calendar](../subsystems/calendar.md),
  [civics](../subsystems/civics.md), [boundary](../subsystems/boundary.md) (locks),
  [underwater](../subsystems/underwater.md) (water places),
  [record-layer](../subsystems/record-layer.md).
- **Doctrine:** [stewardship-doctrine § the recurring-charge
  call](../stewardship-doctrine.md), [design-lenses](../design-lenses.md),
  [uncertainty](../uncertainty.md).
- **Where the cut pieces land:** sanitation-and-pollution-slate, freight-slate,
  disease-slate, fire-combustion-slate, construction-slate, power-utility-slate,
  masonry-and-concrete-slate, flooding-slate, farming-slate, health-vertical-slate.
- **In flight alongside:** the harbors build (`reqs/harbors`, build-4).
