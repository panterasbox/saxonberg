# Zoning slate — industrial land use & the settlement family

**Captured 2026-07-31.** Two live builds (a parcel with a farm on it;
generic residences — apartments, suburban homes) both want **raw
acreage**, and a third concern has emerged that the existing use
vocabulary names but has never designed: **industrial.** Ranching and
farming are rural, their output is not direct-to-consumer, and the
processing has to go *somewhere*.

> ⚠ **`stewardship-slate.md` lives on another branch** (commit
> `c130fa37`) and is not on master. This slate is its **sibling**,
> written against the recorded summary of it — the closed six-entry use
> vocabulary (**residential / agricultural / commercial / industrial /
> civic / wild**), each declaring **capability + ceiling**, as a field
> on `ParcelRecord` read through `ParcelApi`'s longest-prefix walk. Read
> that slate first when the branches meet; nothing here contradicts it.

Related: [freight-slate](./freight-slate.md) (the stockyard fight, the
turnpike, the depot-as-town-generator),
[parcel.md](../../subsystems/parcel.md),
[address.md](../../subsystems/address.md),
[civics.md](../../subsystems/civics.md),
[legal-code-slate](./legal-code-slate.md),
[instrumentation-slate](./instrumentation-slate.md),
[prison-slate](./prison-slate.md),
[ranged-slate](../tails/ranged-slate.md) (the shared extent dependency),
`docs/staging/terminus-city.md` (the map this sites against).

## ⭐⭐ What makes industrial categorically different

The other classes declare **capability + ceiling**, and **both terms
describe what happens *on* the parcel** — how many households, how many
head, how much trade. They are carrying-capacity limits.

> **Industrial is the only class primarily defined by what *leaves* the
> parcel.**

Noise, smoke, effluent, smell, traffic, risk. So it needs a **third
term — emission** — and that is a different *shape* of rule, not a
tweak:

| Class | The question it answers |
|---|---|
| agricultural / residential / commercial | **how much can this land support?** |
| **industrial** | **how far does this reach?** |

### ⭐ Which is why zoning exists at all

*Euclid v. Ambler* (1926) upheld zoning on exactly this ground:

> **"A nuisance may be merely a right thing in the wrong place — like a
> pig in the parlor instead of the barnyard."**

That is the whole doctrine, and it is what a use vocabulary encodes:
**nothing is inherently forbidden; things are forbidden *here*.**

### ⭐⭐ And here nuisance is *measurable*

Acoustics already attenuate over distance; smoke and atmosphere ride
the biome chain; effluent goes downstream because the river actually
runs somewhere. So:

> **"Is this a nuisance at my house" is a query, not an opinion.**

Two consequences:

1. **The nuisance suit is the courts' most natural civil case** — and
   it needs **no new evidence category**, because the perception
   substrates already produce readings.
2. It lands on the [instrumentation](./instrumentation-slate.md)
   thread: **you need a calibrated, certified instrument to prove the
   noise.** The press slate's certification hook — *"a certified
   instrument is the only one whose word counts legally"* — turns out
   to be a **zoning mechanic**.

> **Instrumentation, courts, zoning and industry converge on one
> sentence: you must measure to prove.**

## Acreage — and the dependency two live sessions share

**`ParcelRecord.extent` is a path, not an area.** There is no acreage in
the substrate today.

**Derive it, don't store it.** The zone already carries honest geometry,
so area should be a computation over *the space that actually exists* —
otherwise a parcel claims a hundred acres and contains three rooms, and
subdivision needs bookkeeping instead of re-derivation.

But the interior/exterior instinct is right, and it is the whole
difficulty:

> **Interior area is enumerable (rooms and cells). Exterior area is
> declarative — one room *is* a field of N acres.**

### ⭐⭐ Which makes the per-location extent a three-consumer dependency

| Consumer | Why it needs it |
|---|---|
| [ranged](../tails/ranged-slate.md) | distance bands from real room dimensions |
| [freight](./freight-slate.md) | an 8 m wagon does not fit a 3 m cell |
| **this slate** | outdoor parcel acreage |

**Three unrelated threads converging on one small field is as strong a
build signal as exists.** Size and build it **once, early** — before
either live session hardens around a workaround.

## Where industry goes — the map already decides

Terminus is *"a patchwork of privately-carved quarters, not a planned
civic grid."* Industry needs transport, water, space, and distance from
money, and the existing geography leaves one answer:

- **South and downstream, port-adjacent by the Gate** — heavy work,
  warehousing, the abattoir. Effluent flows *away* from the sacred
  Confluence and out to sea.
- **West bank** — and **Wharfside is already proto-industrial**:
  dockers, fish market, river-trade broker, labelled *labor +
  logistics* in the existing design.
- **Up-valley** stays extraction and agriculture, already off-map on
  purpose.

**Not arbitrary siting — the real pattern**: downwind, downstream, and
away from the wealthy bank. **The class geography Terminus already has
predicts where industry lands**, which beats authoring a district and
hoping it feels right.

### ⭐ The stockyard is the first zoning fight

Cattle driven down the valley roads, through the city, to a
slaughterhouse near the market — noise, smell, disease, traffic. Every
real city had this fight, and it has **two solutions, both playable**:

1. **technology** — refrigeration moves the industry up-valley to the
   source ([freight-slate](./freight-slate.md) § *the marquee*);
2. **politics** — the city zones it out.

Players watch one problem solved two different ways, and the ranching,
freight and legal builds all pay off in a single argument.

## The settlement family

The residential suburb is **one member of a family**, and the family
splits cleanly.

### ⭐⭐ Exit-driven — and the symmetry

> **Both are exit. The residential suburb exits to escape *nuisance*;
> the industry town exits to escape *regulation*.**

Same mechanism — a separate **locality**, with its own government,
zoning and tax base — pointed in opposite directions. One leaves to get
away from the smoke; the other leaves to be allowed to make it.

A **third motive** covers the odd ones: **exit to escape a
prohibition.** Cities did not zone burial to the margins, they **banned
it** — Roman law forbade burial inside the walls, and **San Francisco
evicted its cemeteries in 1900**, which is why **Colma** exists and
calls itself the City of the Silent, the dead outnumbering the living
about a thousand to one. Same category: the tannery, the powder
magazine, the lazaretto, the rendering works, the gallows.

> **The historical anchor is almost too on-the-nose:** Chicago's **Union
> Stock Yards sat in the Town of Lake, a separate municipality**, not
> annexed until 1889 — and the reason was jurisdictional: **outside the
> city's ordinances, its taxes, and its nuisance suits.**

### Site-driven — the other half

Not exit at all, and worth keeping distinct because the politics
differ:

- **resource towns** — the mine, the quarry, the mill at the falls. The
  thing is *there*; you go to it. **They die when the seam runs out.**
- **node towns** — the junction, the crossroads inn, the port-adjacent
  depot. **The transport network creates these**, which makes the
  freight build a **town generator**: site a depot and a settlement
  wants to exist around it.

### ⭐⭐ "Few permanent residents" is the defining political fact

A town of two hundred residents hosting a plant that employs three
thousand commuters. **The two hundred govern; the three thousand have
no vote there.**

This lands hard on the government build, because **residency is
derive-on-read and the franchise follows it**. A commuter is resident in
Terminus and votes in Terminus — so whoever actually *lives* in the mill
town runs it.

> **Which makes company housing the mechanism of control.** House your
> workers on company land in a town where the company owns every parcel,
> and **the electorate *is* your payroll.**

That is Pullman exactly — and it is **emergent, not authored**:
residency-derived franchise + concentrated land ownership produces it
with no company-town rules anywhere. The honest counter-trade is real
too: **the worker who lives in the city keeps their political freedom
and gives up any voice where they work.**

### ⭐ The necropolis, mechanically

Two things make it genuinely unlike every other use:

1. **It never releases land.** A farm can become a factory, a factory
   can become flats. **A grave is a permanent claim** — the actual
   source of the real problem (cemeteries filling, grave-reuse fights,
   the San Francisco eviction). **The one use class whose ceiling is
   cumulative rather than concurrent.**
2. **With our death model it is the chronicle made physical.** Players
   do not stay dead, so a necropolis is for **NPCs and memory** —
   **a grave is a place you can visit that points at a record.** That
   gives the [chronicle](../../subsystems/chronicle.md) a spatial
   expression it currently lacks, and makes the necropolis
   **content-rich while economically near-dead.** You go there to read
   about people.

### ⭐ Weird legacies have a mechanical explanation: path dependence

Every strange satellite is a **fossil of an old law** — the necropolis
because burial was banned in some year, the tannery town because of a
nuisance ordinance nobody remembers passing.

> **The Roll explains the map.** *"Why is there a necropolis out
> there?"* has an answer that is **a citation.**

A real payoff from the legal build: the world's geography becomes
legible through its legislative history, and the **docket** makes it
queryable.

### ⭐ Settlement type is DERIVED, not declared

**No town-kind enum.** Parcels carry use classes; **a locality has a use
*profile*** — the derived distribution of its parcels. So "industry
town" is a **shape, not a type**.

Which buys the thing you would want anyway: **a mill town whose mill
closes changes character by itself**, because the profile moves when the
parcels do. Same derive-on-read discipline as everything else.

## ⭐⭐ Somebody has to host the abattoir (the LULU problem)

The sharpest problem in the slate, because **every locality acting
rationally produces a metro-wide failure.** Hinkley Hills zones out
industry. Terminus zones out the slaughterhouse. The mill town does not
want the prison either. **And the region still needs all three.**

That is **LULU — Locally Unwanted Land Use** — a genuine
collective-action failure, which is exactly what a higher tier exists to
resolve. The **deadlock rule already says it resolves upward** to the
realm or the Compact. The interesting part is *how*:

> **Compensation is the honest resolution.** The higher tier does not
> site it by fiat — it **pays a locality to host it.** Host-community
> agreements are real policy, and a natural consumer of the **fiscal
> cycle** (Art. VIII §4 — one of the four named government gaps).

And it produces a town with a genuine identity: **the place that took
the money.** Which is precisely how those towns feel in life — a little
resentful, a little wealthy, and permanently defined by a decision made
once.

**Pairs with [prison-slate](./prison-slate.md)**, whose reserved federal
site is a LULU by construction — and with **the dump**
([sanitation-slate](./sanitation-slate.md)), the **third instance**
after the abattoir and the prison. Three unwanted facilities, one
collective-action failure, one resolution: **pay a locality to host
it.**

## ⭐ Nonconforming use — free from the founding fiction

Because Terminus was built with **no master plan**, zoning necessarily
arrives **retroactively** — so **half the city is immediately
nonconforming.**

That is not a wrinkle; it is **the single most litigated part of real
zoning**: existing uses may continue but **not expand**, and **lapse if
abandoned**. Your grandfather's foundry in what is now a residential
quarter is **free content, a permanent grievance, and a genuinely hard
question for a legislature** — generated by the patchwork fiction
without anyone planning it.

## The emission model

### ⭐ Emission is NOT a new propagation system

The world already propagates sound, light, heat, air and water. A second
"pollution field" would be **a parallel physics that disagrees with the
real one at the edges.**

> **A nuisance is a persistent source on a channel that already
> propagates.**

A foundry is a heat source + a sound source + a smoke source; a tannery
is odour + water contamination; a stockyard is smell + sound + disease.
**Nothing new emits — things that already emit are sited badly.**

### ⭐⭐ Three kinds of externality, three regulatory forms

Lumping these is the trap; they are not the same shape.

| Kind | Members | Regulated as | Real-world instrument |
|---|---|---|---|
| **continuous field** | sound, air, water, heat, light | **a level at the boundary** | noise ordinance |
| **traffic** | induced journeys | **a count** over a period | traffic-impact limits |
| **risk** | the powder magazine | **a distance** (setback) | buffer zones |

- **Traffic is not a field** — it is *induced movement*, counted by
  journeys through a room, and it **falls out of the freight build for
  free.**
- **Risk is not continuous** — a tail event, regulated by **distance**
  rather than level, which is exactly why real codes have **setbacks**.

**Each of the three is a `parameter` clause** a legislature can set —
a nice confirmation that the instrument taxonomy fits.

### Measurement reuses `signalAt`, and stores nothing

Light already answers *"what is the level here, given sources"* per
viewer, on demand. Nuisance is **the same query on other channels** —
`emissionAt(location, channel)`, walking from sources with attenuation.

> **No stored pollution map.** Derive-on-read, like everything else.

#### ⭐ Which surfaces the second shared dependency

The acoustics fix [ranged](../tails/ranged-slate.md) already wants —
**per-meter attenuation instead of flat per-hop, and killing
`MAX_HOPS = 2`** — is exactly what nuisance measurement needs. *A
factory whose noise stops after two rooms is useless.* And per-meter
attenuation **needs the extent field**:

> **extent → per-meter attenuation → both ranged bands and nuisance
> measurement.**

That is the **third and fourth** thing hanging off extent. **It really
is the first thing to build.**

#### ⭐ Water is the one directional channel

Sound and light **radiate**; effluent **flows.** So water is the only
channel needing a genuinely new relation — **"downstream of"** — and it
is cheap (an edge on locations, or derived from elevation).

Worth it, because *"the tannery upstream of the town"* is one of the
great nuisance stories — and it **explains the siting analysis above**:
**industry goes downstream because the water channel is directional**,
which the Terminus map already encodes with its rivers running south to
the sea.

### ⭐⭐ Odour is the nuisance you can only prove by testimony

Carve it out deliberately. An instrument reads **concentration**; it
cannot read **offensiveness**, which is a human judgment — and real
odour disputes genuinely turn on **witness panels**, not meters.

So odour is the one channel that **does not yield to instrumentation**,
sending its cases to the [enforcement slate](./enforcement-slate.md)'s
testimony machinery instead: **claims not queries, with corroboration
as the mechanic.**

> **One channel that resists measurement keeps the courts from becoming
> a readout** — and it is honest rather than cute: this is how odour
> nuisance actually litigates.

### ⭐ The activity emits, not the building

**A cold forge is silent.** Emission is a function of *operating* — so
night shifts, seasonal runs and shutdowns all change the nuisance, and
*"they only run it after dark"* becomes a real complaint.

It also means **most emissions already exist as physical facts** (a lit
furnace already has thermal output; a fire already makes smoke), so the
model's job is narrower than it looks:

> **Make what already emits legible and attributable at a boundary.**

### ⭐ The instrument reads the total, not the breakdown

Three foundries near your fence and the meter says 78 dB. It does
**not** say which one.

Deliberate: a per-source contribution would be **kernel omniscience
leaking into diegetic evidence**, straight through the firewall.
Attribution requires going and measuring at each source — **which is
investigation, and therefore a job.** The query stays honest about what
an instrument can actually do.

### ⭐⭐ Cap at the BOUNDARY — which makes land the pollution control device

This settles open question #3, and the reasoning is the payoff.
Capping the **activity** is unfair to scale (you cannot run a mill on a
hundred acres because the rule is per-mill). Capping at the
**boundary** means you comply either by reducing the emission **or by
owning more buffer** — put the plant in the middle of the parcel and
the fence line is quiet.

> **Buy the buffer or cut the emission.** A genuine economic choice —
> and it is **Coase**.

It is what real industry does, it **internalizes the externality
honestly**, and it gives large parcels a *reason* to be valuable to
industry that **feeds straight back into land economics.**

### Remedies — and two doctrines you get free

The ladder a court can reach for: **damages**, **injunction**,
**abatement** (the constitution's own word), and the interesting one —
**compensated coexistence**.

> ⭐ ***Boomer v. Atlantic Cement*** is the case to aim at: the court
> **refused to shut a cement plant and awarded permanent damages
> instead**, because the plant employed three hundred people. The whole
> efficiency-versus-rights argument in one decision — and here it is
> **playable**: the plaintiff is right, and closing the works still
> costs more than the harm.

> ⭐ **"Coming to the nuisance" is free from the parcel event chain.**
> Build a house beside an existing foundry and should you get to
> complain? Real doctrine says it is **a factor, not a defense** — and
> because parcel events are **timestamped, the world already knows who
> was there first.**

## Open questions (for requirements)

1. ~~The emission model's shape~~ · ~~how far it reaches~~ ·
   ~~where the ceiling lives~~ — **all three RESOLVED above**
   (§ *The emission model*): per-channel sources on **existing**
   propagation, a `signalAt`-shaped **room-graph walk with per-meter
   attenuation**, and the cap **at the boundary**. What remains is the
   **channel-by-channel attenuation constants**, and whether
   **vibration** folds into sound or earns its own channel (blasting
   and stamping mills are the cases).
4. **Does a locality's use profile need caching**, or is the derive
   cheap enough on the parcel trie? (Instinct: cheap; measure first.)
5. **Nonconforming-use bookkeeping** — "may continue, may not expand,
   lapses if abandoned" needs a *stamp of when the use predated the
   rule*. Does that ride the parcel event chain
   ([parcel.md](../../subsystems/parcel.md)) rather than a new field?
6. **Grave permanence vs. residency** — does a necropolis parcel need a
   distinct sub-class, or is "cumulative ceiling" a property any class
   may carry?
7. **Commuter voice** — is the residency-derived franchise the final
   answer for company towns, or is there an amendment-library module
   for *"those who work here may vote here"*? (It is a real historical
   demand and a good lego.)
