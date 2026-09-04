# Towns slate — the realm outside Terminus

> **Captured 2026-09-02**, design session in the `master` worktree while
> textiles (`design/textiles`), TPA reform (`design/tpa-reform`) and
> cooking (`build/cooking`) were in flight.
> **Status: decided direction, pre-requirements.**
>
> This slate owns **the towns as places to live** — the half of each
> settlement that is not its industry, the trade relation that binds the
> three to Terminus, and the question of whether NPCs get homes.
>
> It deliberately does **not** own the industries themselves.
> [rejection-slate](./rejection-slate.md) +
> [metal-chain-slate](./metal-chain-slate.md) +
> [mining-slate](./mining-slate.md) own the mine.
> [farming-slate](./farming-slate.md) owns the orchard and the field.
> [property-slate](./property-slate.md) +
> [residence-ladder-design-pack](./residence-ladder-design-pack.md) own
> title and tenure. This slate owns **what those industries make of the
> people who work in them**, which is the part nobody has written.

Substrate: [watershed](../../subsystems/watershed.md) ·
[mining](../../subsystems/mining.md) ·
[smallholding](../../subsystems/smallholding.md) ·
[husbandry](../../subsystems/husbandry.md) ·
[residence](../../subsystems/residence.md) ·
[holding](../../subsystems/holding.md) ·
[employment](../../subsystems/employment.md) ·
[behavior](../../subsystems/behavior.md) ·
[address](../../subsystems/address.md) ·
[residency](../../subsystems/residency.md) ·
[retail](../../subsystems/retail.md) ·
[civics](../../subsystems/civics.md)

⭐⭐ **The model these towns are authored against is
[settlement-model.md](../../settlement-model.md)** (2026-09-03) — the
sixteen needs, the site/exit type taxonomy, the specialization gradient,
*zoning exists because of density*, singleton-vs-warren, and the one-
`PlatBook` growth mechanism. Read it first; this slate is its three
worked examples.

**Content for all three towns is staged under `docs/staging/`** — the
cast rosters, routines, room maps, culture and per-town build hooks. Those
are drafting docs and are deleted once they graduate into YAML; the design
rationale stays here.

Siblings: [freight](./freight-slate.md) · [delivery](./delivery-slate.md) ·
[cooperative](./cooperative-slate.md) ·
[campus-grounds](./campus-grounds-slate.md) ·
[cast-archetype](./cast-archetype-slate.md) ·
[household-design-pack](./household-design-pack.md) ·
[tenancy-design-pack](./tenancy-design-pack.md) ·
[preservation](./preservation-slate.md) ·
[zoning](./zoning-slate.md) · [saxonberg-city](./saxonberg-city-slate.md)

---

## ⭐ The frame: every town is two halves

> **The functional half is why the town exists. The support half is what
> the work does to the people who do it.**

This is economic base theory, and naming it matters because it makes the
"creative" half *non-arbitrary*. The basic sector exports — ore, fruit,
labor. The non-basic sector exists to serve the people the basic sector
employs. A mining town has a boarding house because miners are single men
on rotation. A fruit valley has a packing house because fruit rots.

So the generator for each town's second half is **one question**, and it
is not "what would be cool here":

> *What does this work do to the people who do it?*

That constraint is what makes the support half both **teachable** (it is
real economic geography, not decoration) and **expressive** (the answer
is different in every town, and the difference is character).

⚠ **Both halves are content, but they are not the same KIND of work.**
The functional half is mostly mechanism and mostly shipped — it wants
substrate, brains and gates. The support half is mostly rooms, cast and
prose, and it wants almost no engine work at all. That asymmetry is why
this slate is cheap relative to its payoff, and why it can be cut into
per-town slices that ship independently.

---

## ⭐⭐ The realm geometry — Terminus is the clearing house

The relation that was missing from every prior locality doc:

> **The towns do not trade with Terminus. They trade with each other
> THROUGH Terminus.**

| town | sends the city | takes from the city |
|---|---|---|
| **Rejection** | ingots — the input to every tool, rig, fixture and fitting | tools, timber, food, wages, and *people* (nobody is born there) |
| **Hinkley Hills** | nothing material — **labor**, and demand | everything; its income *is* Terminus wages |
| **Heart's Delight** | food — the only town that feeds the city | equipment, capital, the market, seasonal hands |

Rejection's storekeeper sells food grown in the valley. The valley's
cannery buys tin smelted at Rejection. **They never meet.** Terminus is
the room they meet in — which is what makes the market square
load-bearing rather than scenery: it is not where you shop, it is where
the realm clears.

Three ways the city is already the centre in **shipped** content, none of
them said out loud until now:

- **Capital.** Rejection's businesses declare `banksAt: goodkin` — the
  counting-houses. Every town's money is in a Terminus vault. That is not
  a convenience; it is why a river authority would ever have teeth, since
  the institution that can freeze an account can settle a diversion
  fight.
- **Entry.** The only arrival terminal is in Terminus
  (`/world/terminus/terminal/thing/arrival-terminal`). Every player lands
  in the city; every other town is somewhere you *choose* to go. The
  towns are destinations, never origins.
- **Knowledge.** The university is in the city. Every Discipline the
  towns exercise gets **credentialed** somewhere else.

⭐ So the city holds the money, the door and the schooling; the towns hold
the ground, the ore and the food. That is a real political geometry, and
it is the reason Terminus — founded by people who wanted no governing —
ends up governing anyway without ever passing a law.

### The second geometry, and it is deliberately misaligned

`Locality/rejection.yaml` already says this and it is the best sentence in
the content tree: the **address tree is political containment**
(`terminus/rejection`), the **watershed is hydrological ordering**
(Rejection → Heart's Delight → Terminus). Terminus governs its own streets
and has no say over what Rejection puts in the water.

| | Rejection | Hinkley Hills | Heart's Delight |
|---|---|---|---|
| economy | extraction | tenure | cultivation |
| the resource is a… | **stock** — finite, depletes | **space** — fixed, subdividable | **flow** — renewable, seasonal |
| contested good | the seam; the coppice | frontage | **water** |
| on the river | headwaters — *fouls* | side slope — *head problem* | the flats — *diverts* |
| polity | **none** — unchartered | inherited paper District (charter `""`) | ⭐ a **co-operative** — private ordering, no legal authority |
| its road to a polity | **charter from nothing** | **capture an empty shell** | **face the commons** |
| ⭐⭐ its civic failure | needs public authority, cannot get it | has it, will not use it | built an institution for the **wrong commons** |

⭐⭐ **That last row is the whole civics curriculum**, and it is three
different lessons rather than three instances of one. It is also entirely
latent in shipped rows — nothing below needs to be invented, only built.

---

## Rejection — extraction

> ⭐ **Worked out in full 2026-09-02** — the sources, the three acts, the
> cast and the charter decision are staged under `docs/staging/`. This
> section holds only what a *slate* should: the decisions and why.

**Functional half (shipped).** The Ferrow, four businesses, the grade
chain end-to-end to the ingot, the damps and the canary, the register.
39 files, no TypeScript.

**The gap.** Eight surface rooms and **all eight are workplaces.** There
is nowhere in Rejection to *be* that is not work.

### The sources are a sequence, not a blend

**Perfection, Nevada** (*Tremors*) · **Deadwood** · **Matewan** — one per
act, each a different lens, each causing the next, and none of it
requiring anyone to decide to be a villain.

| act | lens | what it leaves behind |
|---|---|---|
| **I — Tremors** | survival | the town has no mechanism for unowned ground |
| **II — Deadwood** | civics | a charter, worth what Terminus says it is worth |
| **III — Matewan** | political economy | who the charter covers, and who it does not |

### ⭐⭐ The geology carries Act I

**A mine manufactures soft ground** — broken waste and fine tailings
dumped downslope, over the placer gravels the first prospectors washed. So
the lode is in rock and the town sits above unconsolidated fill. Two
consequences:

- ⭐⭐⭐ **The safe place is down the adit.** The mine — dust, damps,
  falls, the thing the creed is built around fearing — is where you *run*.
  Everything they know is backwards.
- ⭐⭐ **The spoil bank is nobody's claim.** The habitat is a by-product of
  the industry, on the one ground the town has no owner for. The Act I
  problem, stated as geography.

And the creed **blinds them first**: a mining camp already has a category
for *the ground took him*, so the first three deaths are filed — honestly,
correctly, by a competent surgeon — as ordinary industrial accidents.

### ⭐⭐ Val and Earl are the labor question

Handymen. Not on any roster, no claim, no wage rate, and no Institute
subscription because casual labour cannot afford a check-off. Every job in
Rejection has an owner — the co-op owns the face, the fuel yard the clamp,
the smelter the furnace. **They do the work with no owner**: clearing
spoil, digging ditch, hauling the dead.

> *Who is responsible for the work nobody employs anyone to do?*

The labor plot, stated without a strike in it — and it pays off in Act III,
because **they cannot strike.** Nobody employs them; there is nothing to
withhold from. The town's one weapon does not fit the two people most
exposed, and the charter's first real test is whether it covers a man with
no employer.

### The support half, derived

- **the Ferrow Institute** — ⭐ the load-bearing new room. A real
  institution: a wage check-off funding the library, the reading room, the
  mutual-aid fund and the meeting hall. The town's school, its insurance,
  and the room it charters itself in. One room, three acts.
- **the Tallow** — the public house, and ⭐ per Deadwood the publican is
  the most powerful person in town: he holds **the slate**, which is every
  man's tab and therefore every man's business. *Whoever holds the debt is
  the government until there is one.*
- **the print shop** — the register says who owns what; the paper says it
  **happened**. And in Act III it is the only detector, because police
  catch what someone saw and journalists catch what is in the books.
- **the Rest** — lodging. ⚠ Not the first rental market (Mayfield Row
  ships that); the rung *below* a lease — a bed by the week, no
  instrument, no term.
- **the infirmary**, **the sharpening shop**, **the spoil bank**, **the
  Row**.

### ⭐⭐⭐ The charter is only worth what Terminus says it is worth

The pressure to charter is **not internal**. Rejection's titles are
honoured by a book only Rejection respects, and its money already banks at
goodkin, in a city that owes it nothing. The town organises so there is
something for a larger power to ratify.

So the charter is a **petition, not a victory**: what they build is *de
facto* authority, real inside Rejection and worth nothing at its edge. An
unrecognized sheriff can arrest a man in Rejection and cannot follow him
to Terminus. ⭐⭐ And **nothing that happens in Rejection is cognizable
anywhere that matters** — which is not colourful lawlessness, it is *why
men get sent there.*

**The knife:** you cannot purchase what nobody owns, and enclosure
requires title. **Terminus recognizes the charter because the corpo needs
clean title to buy.** Legitimacy granted for the purpose of making the
town sellable, handed over by the people who intend to take it. They win
Act II; that is how they lose Act III.

**And the counterweight:** ⭐ Rejection is where the game shows you *why
the Compact exists* — a polity whose legitimacy is entirely at another's
discretion, which is what nearly every real polity is. The fiction may be
bleak precisely because the platform is not. ⚠ Never said in-world.

### The Pinkertons

The pattern already ships in `policing-slate` as *predator and instrument*
— a corpo that wants a strike broken **hires muscle rather than sending
its own**, for deniability. Three facts:

1. **Private force has capacity and no authority.** Authority comes from
   an office; hired men are just men.
2. ⭐⭐ **The frightening one is the deputized one.** Baldwin-Felts agents
   at Matewan were sworn as deputy sheriffs. Your alignment model already
   names that pole **capture**.
3. ⭐ **Rejection has no office to capture, which is worse.** With no law
   they break nothing — and no one has standing to refuse, because
   standing is a thing an office confers.

**The Pinkertons are the reason you need a sheriff**, and the corpo would
prefer the town stayed unchartered. The interests invert cleanly.

⭐ Policing mode: Rejection runs **the hue and cry** (the frontier, per
policing-slate's Tiebout axis) against Terminus's **Peelers**. Two
arguments about law, one road between them, felt by walking.


## Hinkley Hills — tenure

> ⭐ **Worked out in full 2026-09-02** — the sources, the Death Man, the
> District razor and the open-door policy are staged under `docs/staging/`.
> This section holds the decisions and why.

**Functional half (shipped).** 40 generative lots, the plat plan, the
keyed house programme, the garden bed, the standpipe, the District tank,
`title buy`. 14 files, of which **three are authored rooms** — everything
a player touches is a keyed mint. And **zero NPCs live here.**

**Sources:** The 'Burbs · Edward Scissorhands · Blue Velvet ·
Pleasantville. Themes, never cast.

### ⭐⭐ The engine is idle attention

Rejection's engine is exhaustion. Hinkley is the inverse — **not enough to
do and too much to look at**, which is the honest condition of a suburb
and *The 'Burbs* precisely.

> ⭐⭐⭐ **Hinkley's content is other people.** Not a trade, not a
> resource, not a verb — the one locality whose play surface is the
> **social graph**, which ships in full and has almost nothing to point at.

⭐ And it has no acts, it has a **loop**: nothing happens in a suburb,
things accumulate.

### The facades

Hinkley is the only ground a player owns and **the street shows nothing.**
One owner-authored `longDescription` per lot plus a sign, rendered into the
lane, is **the highest-value single addition in the realm** — one field and
one render pass.

### ⭐⭐⭐ The Death Man is permanently ambiguous

Not *innocent and you were the maniac*; not *guilty and you were right*.
**Unresolved, forever** — The 'Burbs shot an alternate ending, the Klopeks
were guilty in both, and the same ending plays either way. It was never
about the Klopeks.

⚠ **The ambiguity cannot live in the ground** — this is an AGPL repo and a
player can read the content, so a hidden body is found in an afternoon and
a hidden *nothing* is confirmed just as fast. Therefore:

> **You can resolve the ground. You can never resolve the man.**

Dig the garden, find nothing a court would care about, and it changes
nothing: he is still at the window, still hasn't spoken to a neighbour in
nine years, still buying forty bags of soil a month. Nothing is hidden in
the source, so there is nothing to spoil.

⭐ **And the weird house is a role, not a secret** — let your front go and
keep your back beautiful and *you are the weird house*. He is the
demonstration of a state the player can enter, not a puzzle. The general
rule for every weird house after him: **it always has something, and it is
never a crime.**

### ⭐⭐ The street sees condition and infers the person

⚠ **No stewardship score exists.** Land use shipped (Hinkley built it), the
allowance cascade is inert, and the **Stewardship** layer is absent. When
it lands, keep two things apart: **Stewardship is a Discipline** (a fact
about a *person*), **condition is a fact about a property** — and condition
is the only thing visible from the street.

So a run-down front supports the inference *careless man* and the inference
is false. **A true measurement carrying a false conclusion**, which is how
prejudice operates — and it puts the lane on the wrong side of the
measurement doctrine, running an unlicensed layer-2 move on somebody else's
reading.

### ⭐⭐⭐ Blue Velvet: the record of your pursuit is the content

Curiosity as complicity — Jeffrey chooses to look and is implicated by
looking. Which answers how an unresolvable mystery satisfies:

> **The mystery is never the content. The record of your pursuit is.**

⭐⭐ **Hinkley is the mirror town** — what you get at the end is a file on
yourself, and `accountability_events` + belief + renown already keep it.

**Every rung of the ladder is a shipped subsystem** — notice (perception) ·
theorize (**belief**) · share (social graph) · judge (**renown at a
nine-person scope**, where every opinion is a measurable fraction) ·
surveil (concealment) · trespass (parcel title, ⭐ *no lock involved*) ·
dig (cultivation on ground you do not hold). **No quest chain is
authored.**

### ⭐⭐ Scissorhands: the decent path is free and socially expensive

The crowd that adores and the crowd that hunts are the same crowd. So:
**just knock.** Nobody has in nine years — not because it is hard, but
because doing it publicly marks you, and a player shown that garden
legitimately becomes the weird one by association. Two ladders: the decent
one nobody climbs because it costs, and the escalation everyone is on
because it is free.

⚠ **Pleasantville guardrail: people judge, the system never does.** No
mechanical penalty for authoring an odd facade, no gauge, no dinged score —
the NPCs have views and the District cannot touch it, which puts the player
in Prentice's position with nothing enforced.

### ⭐⭐⭐ The District is the road not taken

**Rejection has no institution and needs one. Hinkley has one and will not
use it.** Two failure modes of civic life, one road apart.

The stewardship doctrine — *zoning governs use, never self-expression;
never your couch* — **forbids the HOA**, so the grievance has no legitimate
channel and the neighbours invent an illegitimate one.

> ⭐⭐ **The razor: the District can act on what you DO, never on what you
> look like.** The mob is right that there is no channel, and the reason
> there is no channel is that their grievance is not legitimate.

⭐ **Which is what the potting soil is for.** They think it is a body; the
mundane explanation is that he sells cuttings out of a residential lot — a
real land-use violation, the one thing the District *can* act on, and it
rules nothing out. *You cannot get a man for being strange, so you get him
for the thing his fence is four inches over.* Regulatory capture at
nine-house scale, and the same theme as Rejection Act III.


## Heart's Delight — cultivation

> ⭐ **Worked out in full 2026-09-03** — the sources, the founding
> sequence, the tower and the cast are staged under `docs/staging/`. This
> section holds the decisions and why.

**It does not exist.** No Locality row, no zone, no rooms — only its
hydrology (`Watercourse/delight`: spring 720 m → **the flats, 180 m**,
240 km² → mouth 35 m). The flats node's own comment: *"the diversion
fight, when it comes, is here."*

⭐⭐ **The Stage B gate is CLEARED** — `roadmap.md` and `farming-plan.md`
§Stage B both name residences Waves 0–5, and those shipped. B0 re-grounds
first.

### ⚠⚠ But winter does not exist for plants

The **clock** has seasons (`DefaultCalendar`, `CelestialApi.seasonFor`,
`SEASON_BIAS` in weather). Husbandry does not: *"no bloom, no season of
readiness"*, *"with no global season, supply arrives in pulses."* And
`farming-slate` lists winter **first** among what is unbuilt.

⭐ **That is the reason to build the valley, not to defer it.** Greenhouses
are what winter is for; a fruit valley is what a *season* is for. One
piece of substrate per town: Rejection needs the `stocks:` fix, Hinkley
needs `knock`, the valley needs winter.

### Sources — and ⚠ Chinatown is the wrong one

**Cannery Row** (primary) · **Twain** · *Field of Dreams* (the
foreclosure, not the ghosts) · *Children of the Corn* (one thing: the
countryside is legible to insiders and opaque to outsiders).

⚠ Chinatown is the obvious water-rights reference and it needs a
**conspiracy**. Heart's Delight needs **nobody to do anything wrong.**

⭐⭐ **Cannery Row is a tone correction.** Not a postcard with a problem —
**warm and shabby**, with a demimonde: the people who came for the pack
and stayed. The orchards are beautiful and there are people asleep in the
packing house, and both are the same town. Rejection is deadpan-grim,
Hinkley is paranoid, **the valley is comic with the sadness underneath.**

### ⭐⭐⭐ The lesson is how towns form

Seven steps, in order, each a thing you can walk to: **the water** (why
anyone farmed here) → **the land** (Halloran held it first) → **the rail**
(he gave the right-of-way, so the stop went on *his* land) → **the
shipping point** → **the store** → **the name** → **the map.**

Walk depot → store → packing house and you have walked the town's
formation.

**The name.** The town was Halloran, and a postal clerk said the name was
taken. So they picked a **sales pitch** — *Heart's Delight* was what the
land agents called it and no local ever had. ⭐⭐ Halloran gave the land,
the town took his name, a clerk took it back: the Rejection theme
(*legitimacy is granted elsewhere*) in a comic register.

> ⭐⭐⭐ And the engine already enforces the post office's rule —
> `AddressRegistry`: **"One Locality per prefix — a duplicate claim is an
> authoring error."**

### ⭐⭐⭐ Why Halloran gave the land

**Because he had been cut off.** A generation earlier he came over the
pass with a party that made it, and went back in winter for one that had
not. A man who has been on the wrong side of a mountain understands what a
rail line is.

> **The town exists because its founder had been trapped.**

⭐ And the geography agrees: Rejection is at the headwaters, so the road
Halloran came down is the valley road that now carries ore, and the
mountains that nearly killed him are where the mine is.

⭐⭐ **The realm needs this.** Rejection Act I is a town with no mechanism
for trouble on nobody's claim; Act III is a charter that does not cover
the people who need it. The valley was founded by a man who went back for
strangers with **no mechanism at all** — the collective action problem
*solved*, once, and forgotten. Without it the three towns are three
flavours of institutional failure.

⚠ **Leave the cannibalism alone.** The usable half is a party trapped over
a winter and a relief that went back.

⭐⭐⭐ **And a player publishes it.** The lore is findable (the depot's
railroad paperwork, the co-op's oldest minute book, the post-office
correspondence) and unremembered — then **recovered by a player and
written to the wiki, attributed through `provenance`.** History as a
permanent, attributed mark on the world.

⭐⭐ **The last Halloran works the pack** — seasonal labor on ground his
family gave away the best of, with no idea. The person who is the evidence
is right there stacking trays.

### ⭐⭐⭐ The water tower

The landmark is a **water tower painted as a can of peaches**: a
`StorageNode` wearing a `BrandedMixin` mark. Two shipped systems, no new
code, and the valley's arrival image. The town's water is held in a
container shaped like the thing the water becomes — and the mark on it is
the **buyer's**, not the town's.

**Three artifacts, one theme:** the **name** (a postal clerk), the
**tower** (a buyer's brand), the **land** (sold one owner at a time) — all
somebody else's decision, and **nobody does anything wrong.**

### The calendar is the town

Bloom (a postcard, ~3 wks) · thinning & the water (the anxious season) ·
the drying season (⭐ rain is a disaster — the first place weather costs
money) · the pack (~6 wks, a factory, 200 hands) · the off-season (~5
months, empty and genuinely lonely). ⭐ **Seasonal employment is a labor
pattern nothing else in the game has**, and money arrives **once a year in
a lump**, which is why a bad drying season is a solvency event.

### ⭐⭐ Nobody takes the valley. The valley sells.

Rejection loses to a **buyer**. The valley must not, because the true
story is worse: **nobody paved the valley — everybody sold, individually,
for a good price, and the aggregate was paving paradise.** Same shape as
the subsidence: individually rational, collectively ruinous, no villain.
⭐ One theme expressed twice, in water and in land.

**And the water doctrine is the engine of both:** prior appropriation
allocates the river (senior takes all, junior takes *nothing*, and neither
is a villain) — ⭐⭐⭐ **so the juniors go to the aquifer, and the aquifer
has no doctrine at all.**

### ⭐⭐⭐ The civic triptych

| town | its institution | the failure |
|---|---|---|
| **Rejection** | none | needs public authority, cannot get it |
| **Hinkley** | a special district | has it, will not use it |
| **Heart's Delight** | **a co-operative** | private ordering that works — **in the wrong domain** |

The Growers' Association has no legal authority and does real work
(Ostrom). ⭐⭐⭐ **They built an institution for the wrong commons**: the
co-op solves *market power*, the aquifer is a *physical* commons, and a
marketing co-op has no instrument for it. **Institutions are shaped by
their founders' problem and do not adapt.**

⭐⭐ **And each town holds the institution the next one needs** — Hinkley's
district is what the valley needs for water; the valley's co-op is what
Rejection's tutworkers need for labor; Rejection's charter fight is what
would make Hinkley's district real. **And none of them talk.**

### Two entry points, class-marked

**Arrive with capital** → buy ground, become a grower (a long loop).
**Arrive with nothing** → take the pack (six weeks, paid in a lump, then
nothing). They do not easily become each other, which is the real
agricultural economy — and ⭐ a Rejection miner on off-cores can work the
pack, so two labor markets meet on the valley road.

⚠ **Not a repeat of Rejection's labor story.** Mining labor is a union of
the employed with something to withhold; farm labor is **migrant,
seasonal, and historically written out of labor law** (Delano happened
outside the NLRA). Different problem, different instrument.

### ⭐ Hendy: the site, not the building

An ironworks gives the valley a **direct** relation to Rejection (it built
mining machinery). ⚠ But `trade-smithing` ships and a village smith can
make a pick; a works is justified by what a smith *cannot* make — a hoist,
a pump, a stamp mill — and metal-chain Stage A shipped none. **Its real
customer is the pump, and the pump does not exist.**

⭐ So author **a yard with rail frontage and no building.** One room,
commits nothing, and the works then arrives *in response to an event*
rather than as furniture — the first beat of the valley losing to land
price, which is an ending rather than a phase.


## The connective tissue — goods and services in and out

This is not a separate feature. It is what makes the three towns
*necessary* rather than arbitrary, and the realm layout is **already von
Thünen** — nobody has cashed it:

- heavy, low-value, loses mass on processing → **process at the source.**
  Rejection smelts on site rather than shipping ore. Already true, already
  right, and it happened by good instinct rather than by rule.
- perishable, high-value, short window → **preserve, or be close.** Heart's
  Delight gets the cannery and the drying yards for exactly this reason.
- residential outbids agriculture near the centre → **Hinkley is the near
  ring** and grows gardens, not fields.

All three follow from one condition: **transport costing something.**
[freight-slate](./freight-slate.md) has direction set, teamster/drover
designed, wainwright flagged as a gap, and says explicitly that it is the
slate which pulls locomotion-as-activity. That is the build which turns
the map into an argument.

### ⭐ The depot — one room per town, and it is the character piece

The concrete deliverable: **a depot in each town** — the single room where
goods enter and leave. Same function, three rooms that could not look less
alike, each saying what its town is in one `look`:

| town | the depot is… |
|---|---|
| Rejection | a weighbridge and a tally board at the adit mouth |
| Hinkley Hills | a rail platform with a shelter and a noticeboard |
| Heart's Delight | a loading dock on the packing house, stacked with empty trays |

`consign` already works ([retail](../../subsystems/retail.md)), so the
depot rides shipped substrate and needs **no new verb**.

### The valley road

Today every town is a TPA spoke off Terminus — Rejection has *no inbound
exit wired at all*, Hinkley has a rail stop. The watershed is the only
thing that genuinely relates the three, and it is invisible because you
never travel along it.

⭐ **Make the Delight valley the road.** Rejection upstream, Heart's
Delight the middle reach, Terminus at the mouth. One road down one valley
and the fouling becomes something you *walk past*: you leave the pithead,
you follow the water that leaves it, you see what it does to the flats,
you arrive at the city drinking it. Hinkley stays on the side slope,
looking down at all of it, which is why it has a tank.

That converts three separate demonstrations of a water model into a single
legible argument, for one build's worth of rooms.

⚠ It does **not** remove TPA. Fast travel stays the default; the road is
what a hauler uses and what a player walks once.

---

## NPC residence — the interrogation

### The cost is already paid

**28 NPCs. Total. In the whole game.** 8 Terminus, 7 Rejection, 5 Lounge,
4 wilds, 2 Hearthworks, 2 university. Not hundreds.

And **the mechanism already ships.** `lib/behavior/shifts` is a two-state
machine driven off the employment roster: `on-shift` → the workplace,
`off-shift` → `Offstage`, a **no-exit holding room**, moved by `teleport`.
Six NPCs run it today.

Now read what an `Offstage` room already says
(`hearthworks/location/offstage.yaml`):

> *A low back room behind the cookhouse: a cot, a row of pegs heavy with
> aprons, a bench with a whetstone and a bowl of cold stew on it. Where
> the Hearthworks' people are when they are not at the forge or the
> hearth.*

⭐⭐ **That is already a home.** It is already written as one. It has no
address, no door, and is not anywhere — and that is the entire delta. The
roster tick, the presence poll and the off-shift migration are **already
being paid for**.

### The question splits in two, with different answers

**"Should NPCs have homes?" — Yes, and it is nearly free.**

Turn `Offstage` from a void into a real room with a door and an address:
Berta lives above the cookhouse, the storekeeper lives behind
Provisioning, the collier sleeps at the fuel yard because he has not had a
full night in a decade. One exit per NPC, **zero traversal.**

⭐ It is also **historically exact** — live-above-the-shop is how
essentially all pre-industrial urban labor worked, and it is the pattern
the content already stumbled into. You get: you can knock, you can find
someone off-shift, everyone has a place. Most of the immersion, almost
none of the cost.

**"Should NPCs commute?" — Mostly no.**

The throughput cost is small: ~28 NPCs × 2 trips × 15–25 transitions is
about a hundred traversals a day-cycle. Cheap.

⚠ **The real risk is not CPU, it is that you convert a total function into
a partial one.** `teleport` cannot fail. A walk can — blocked, locked,
intercepted, stuck — twice a day, unwatched, forever.

And the benefit is conditional in a way that matters: **an NPC walking
home through rooms nobody is standing in is a tree falling in a forest.**
You pay the cost and get nothing. The immersion only lands *when
observed*.

Which gives the governing rule:

> ⭐⭐ **Commuting is a character trait, not a world rule.**

Live-above-the-shop is the default because it is *true*. The commuter is
the exception, and the exception is the interesting part: the
counting-house clerk who takes the rail up to Hinkley every evening
because he bought lot 7 and is going to make something of it. One NPC, the
commute is his whole personality, and you meet him on the platform. You do
not pay 28× for a texture you need three times.

### The props/cast split does the sorting

⭐ **Props never get homes.** They are minted fresh; a prop with a
residence is a category error, and the designation already declares which
is which. **Cast** gets a home. A handful of cast get a commute. See
[cast-archetype-slate](./cast-archetype-slate.md) — a `residence` is a
natural archetype axis, and `commutes` is a deviation on it.

### ⭐ Where to spend the commuting budget: Hinkley Hills only

The strongest argument for any of this is the one that has nothing to do
with routine: **it instantly gives you neighbours.** A player who buys lot
7 and finds lot 6 belongs to somebody — with a name, a shift, a job in the
city and a light on at 22:00 — has a relationship the engine handed them
for free. Every social substrate shipped (belief, regard, contacts,
notify, reactions) currently has almost nobody to point at outside a
workplace.

So put four or five cast in lots on the lane. They work in Terminus, take
the rail down at 06:00 and back at 18:00, and their houses are the **same
keyed programme** a player buys into. Then:

- the empty subdivision has *some* families, which makes "surveyed for a
  hundred, got one" land as poignant rather than as unbuilt;
- the rail stop is a place where people are, at two predictable times;
- a player's house has a street on it;
- Hinkley's dormitory-suburb economics become **visible** — you can watch
  the town empty out in the morning.

Highest-value version of the idea, at roughly a sixth of the cost of doing
it everywhere.

### ⚠⚠ The residency hazard to prove before building

`canEvict` is overridden on ~20 classes and **every one of them is a
singleton or catalogue** (`ResetWarden`, `MaterialCatalogue`,
`Interactive`, `HelpCatalogue`, …). **No agent class overrides it.** An
NPC idle at home in a room no player visits is a cold-tail eviction
candidate by the default rule.

What appears to save it: the security gate refreshes `lastTouched` on the
raw target **on every successful dispatch**, so a beating brain keeps its
own host warm. Which means the profile most at risk is precisely the one
this slate creates — ⚠ **an NPC whose only brain is `shifts` at a slow
cadence, asleep at home, off-camera.** And it would fail *silently*, at
03:00.

⭐ **Prove this before authoring homes, not after.** It is a one-test
question and the answer decides whether "cast gets a home" needs a
`canEvict` veto on the cast designation.

---

## The teaching venues are not towns

Hearthworks, the Practicum and the Drowned Substation declare **no
address at all** — no Locality, no prefix, no room-level `_address` — and
sit at roots beside `terminus`. They look like orphan towns and are not:
the Hearthworks business row says *"a teaching venue never closes"*, both
positions confer `MakerMixin` on a 24/7 roster.

⭐ They are **teaching venues without a campus**, which is exactly what
[campus-grounds-slate](./campus-grounds-slate.md) is for. Re-homing them
there is that slate's work, not this one's — but it is worth naming here
because it is what leaves the town question clean: **three towns, not
six.**

⚠ The Weeping Moor is a different case — it holds a root prefix
deliberately, in the *other* basin, and `Locality/moor.yaml` explains why.
Leave it.

---

## ⭐ The venue scorecard

Every settlement scores against
[settlement-model.md](../../settlement-model.md)'s sixteen needs. What it
cannot meet locally is either **imported** (correctly) or a **gap that
wants a venue** — and ⭐ **the gaps are the character, not a to-do list.**

✓ met · **im** imported · ⚠ a gap

| need | **Rejection** | **Hinkley** | **Heart's Delight** |
|---|---|---|---|
| food, raw | im | ✓ beds (subsistence) | ✓✓✓ the basic sector |
| food, prepared | ⚠ | im — home kitchens | ⚠ |
| food, retail | ✓ Provisioning | ⚠ the shop | ⚠ the store |
| water | ⚠⚠ **none, and it fouls a river** | ✓✓ standpipe + tank | ⚠ pump house + tower |
| fuel | ✓ the fuel yard | im | ⚠ a woodlot |
| clothing | im | im | ⚠ ← where fibre goes |
| health | ⚠⚠ | im | ⚠ |
| tools | im (sold, not made) | im | ⚠ ← Hendy's seat |
| repair | ⚠ the sharpening shop | ⚠ or a home workshop | ⚠ implement smith |
| storage & exchange | ✓ assay + provisioning | ⚠ the platform | ✓✓ packing house + depot |
| transport | ⚠ the weighbridge | ✓ the rail stop | ✓ the depot |
| housing | ⚠⚠ **nobody sleeps anywhere** | ✓✓ the whole point | ✓ farmsteads |
| drink & assembly | ⚠⚠ the Tallow | ⚠⚠ **and see below** | ✓ Rovere's |
| education | ⚠ the Institute | im | ⚠ |
| ceremony | ⚠⚠ | ⚠ the hall | ⚠ |
| law | ✓ the register (property only) | ⚠ the District, unused | ~ the co-op (not law) |

⭐⭐ **Rejection meets 4 of 16. Hinkley meets 4 of 16** — same score,
opposite causes. The camp is too new and remote to have acquired them; the
suburb is close enough to import them. Identical scores, completely
different lists.

### Rejection — tiered by what a camp cannot run without

**Tier 1** — the Rest (lodging **and board**: in a camp the boarding house
*is* the cookhouse) · the sharpening shop (⭐ Banished: no tools = everyone
at 25 %, so this is the most load-bearing building in town, and Ines'
six-years-frozen rate has real weight) · the infirmary.
**Tier 2** — the Tallow · the Institute · the weighbridge depot.
**Tier 3** — the print shop, and:

> ⭐⭐⭐ **a burial ground — the thing that turns a camp into a town. You
> can leave a camp. You cannot leave your dead.**

Rejection kills people and there is currently nowhere for any of them to
go. Act I hands it three occupants in the first week.

### Hinkley — and its missing venue *is* the theme

Short list, because a suburb correctly imports nearly everything: the shop
at the stop · the District office · the hall · **the home workshop** (the
burgage rung — see settlement-model § 4).

> ⭐⭐⭐ **Hinkley's real gap is drink & assembly, and its absence is why
> the town is paranoid.**

Groceries come off the train. What cannot be imported is **a room where
nine people can be together** — so the only social mechanism left is
watching each other from the front step. ⚠ Which means **giving Hinkley a
pub would defuse the death man.** Either a reason not to, or a reason that
*getting one* is the arc. The hall exists, the District owns it, and it has
been used four times; somebody asking to use it is a bigger event than it
sounds.

### Heart's Delight — and this is where the farm count derives

The crossroads (node town): the store + post office · the packing house ·
the depot · the co-op hall · Rovere's · the pump house + the tower.

The farms derive from three constraints — **every input category the
trades need** (`lint:supply`), **food variety** (Farthest Frontier's rule
that a monotonous diet sickens), and **a ladder of scales**:

| farm | shape | crop | its downstream consumer |
|---|---|---|---|
| **Furtado's** | orchard | apricot, cherry — flats, **senior** water | the pack; the drying yards |
| **Avila's** | orchard | prune — bench, **junior**, his own well | the pack |
| a **vineyard** | vineyard | grape | `trade-winemaking` |
| a **citrus grove** | orchard | citrus ×4 | `trade-hospitality`'s house juices |
| a **market garden** | market garden | mixed veg, mint, carrot | `trade-hearth-cooking`; **food variety** |
| a **grain farm** | row crop | ⚠ **barley — species gap** | brewing, distilling |
| a **woodlot** | coppice | wood | ⭐ the valley's *own* fuel gap |
| the **hill outfits** | pasture | stock | manure ↔ feed; ranching |

⭐⭐⭐ **Eight, each justified by a named downstream consumer** — a
derivation, not a count, which is what survives the 10×. And the ladder
falls out: the market garden is rung 2, Avila's rung 3, **Furtado's rung 4
(seniority, which money cannot buy).**

---

## ⭐⭐ The necropolis — a sixth locality, and a LULU town

Already designed twice, and the two agree. `zoning-slate` has the
mechanism — *exit to escape a **prohibition***: cities did not zone burial
to the margins, they **banned** it; Roman law forbade it inside the walls,
San Francisco evicted its cemeteries in 1900, and that is why **Colma**
exists. Same category as the tannery, the powder magazine, the lazaretto,
the rendering works, the gallows.

And `vocations.md` has the venue, answering chronicle's empty-substrate
question: **the monument mason at the necropolis — *the chronicle made
physical*.**

### ⭐⭐⭐ Which dissolves the respawn objection

> **It is not a grave. It is a chronicle entry you can stand in front of.**

The chronicle is the append-only *identity* ledger — deeds and claims — so
a monument commemorates **what somebody did**, not where their body is. A
living person can have one. Mortality agrees: `reembody` **never reads the
corpse**, because a body decays, can be destroyed, and does not survive a
restart.

⭐ A monument to somebody who *came back* is more interesting, not less — a
stone recording a death that happened and was undone is exactly what an
append-only ledger should carry, and something a person should have to walk
past. And there are permanent occupants regardless: **NPCs stay dead.**

### Its mechanical seat is pre-authorized

`mortality.md` says `passage` is the **floor** — zero arguments, always
available, drains your reserves, leaves a `recovering` affliction — and
then, explicitly: *"`reembody` takes no position on what dying should cost
— that is the caller's business, which is exactly what lets **a temple or
a clinic offer a better return**."*

⭐⭐ So a necropolis is the place that charges you and gives you more back.
A business with customers, not a memorial park.

⚠ **And a monument is BOUGHT.** Otherwise the place becomes a million
identical stones (literally Colma's condition, and bad play). The monument
mason is a vocation; somebody pays for stone and carving, and everyone else
goes to potter's field — which teaches something sharp: **who is
remembered is a function of who could pay.**

⚠ **Open, and it decides whether this is scenery or consequence: did
Terminus ban burial, when, and could a player-held office repeal it?**

---

## Decisions

- **D1 — Every town is two halves, and the support half is derived.** The
  generator is *what does this work do to the people who do it*, not
  free invention. Non-negotiable: it is what keeps the character half
  teachable.
- **D2 — Terminus is a clearing house, not a trading partner.** The towns
  trade with each other through it. Content that has Rejection selling
  directly to Heart's Delight is wrong.
- **D3 — The address tree and the watershed stay misaligned.** Already
  shipped doctrine (`Locality/rejection.yaml`); this slate depends on it.
- **D4 — Each town reaches its polity by a different road**, and they are
  three *failure modes*, not three instances. Rejection needs public
  authority and cannot get it; Hinkley has it and will not use it; the
  valley built a working institution **for the wrong commons**. Do not
  converge them on one civics mechanism.
  ⭐⭐ **And each town holds the institution the next one needs** —
  Hinkley's district is the valley's water answer, the valley's co-op is
  Rejection's labor answer, Rejection's charter fight is what would make
  Hinkley's district real. **And none of them talk.**
- **D5 — Heart's Delight ships both halves in one build.** Its support
  half is richer than its functional half.
- **D6 — Rejection's support half is a lodging house first.** ⚠ Not the
  first rental market — Mayfield Row ships that. The lodging house is the
  *instrument-free* rung: a bed by the week, no lease, no term. The
  ladder is dorm → lodging → lease → lot.
- **D7 — Hinkley's support half is a facade, then a civic room.** The
  owner-authored exterior + sign rendered into the lane comes before the
  hall.
- **D8 — One depot per town**, riding shipped `consign`. No new verb.
- **D9 — The valley road is authored; TPA stays.** The road is what a
  hauler uses and what a player walks once, not a replacement for fast
  travel.
- **D10 — NPCs get homes; `Offstage` becomes a real addressed room with a
  door.** Cheap, historically exact, and most of the payoff.
- **D11 — Commuting is a character trait, not a world rule**, and the
  budget is spent in Hinkley Hills.
- **D12 — Props never get a residence.** Structural, off the shipped
  designation.
- **D13 — Prove the residency/eviction interaction before authoring
  homes.** ⚠ Silent failure mode.
- **D14 — ⭐⭐⭐ Rejection's charter is only worth what Terminus says it is
  worth.** *De facto* authority is the town's to take; *de jure* is
  Terminus's to grant, discretionarily, by an office a player can hold.
  A player in Rejection petitions, a player in Terminus decides, the corpo
  lobbies the seat and the town has nothing to lobby with.
  ⚠ Design against both degenerate ends — always-decline is a treadmill,
  always-grant has no tension.
- **D15 — Act I is a hazard, not a boss.** The rule is *you cannot be on
  soft ground*; the creature needs no stats. This is the accurate
  adaptation — *Tremors* is a terrain-and-logistics film, not a fight
  film. A fought graboid needs a **scale layer** (multi-cell occupancy,
  submergence) that does not exist; deferred, and worth building on its
  own merits later.
- **D16 — Private force has capacity and no authority.** Authority comes
  from an office. The frightening agent is the *deputized* one, and
  Rejection has no office to deputize into — which is worse, not safer.
- **D17 — Rejection runs the hue and cry; Terminus runs Peelers.** The
  policing slate's aesthetic arc is a Tiebout axis; two arguments about
  law with one road between them.
- **D18 — ⭐⭐⭐ The Death Man is permanently ambiguous, and the ambiguity
  lives in the man, not the ground.** The garden is resolvable; he is not.
  ⚠ Nothing is hidden in the source — this is an AGPL repo, and an
  ambiguity a player can settle by reading YAML is not one.
- **D19 — The weird house is a role a player can enter, not a secret to
  reveal.** And every weird house **always has something, and it is never
  a crime.** ⚠ The game never teases danger; a game that rewards paranoia
  teaches the opposite of what this one is for.
- **D20 — Doors: closed to the wire, open to the fiction.** The door is
  not the mechanism, **witness is**. `ownerOf` is already a *total*
  function (`stamp ?? parcel-extent ?? authorOf`), so nothing in an NPC
  home is unowned and the Bethesda ambiguity cannot arise — ⭐ **the
  anti-exploit is the ledger, not the lock**, and disposal is the hard
  problem (the fence, per policing-slate). ⚠ `knock` does not exist and is
  wanted here first; **regard is the INPUT to the door, never the
  output.**
- **D21 — Locks are locality characterization, not global policy.**
  Rejection does not lock (hue-and-cry; nothing worth taking and the town
  would know); Hinkley locks everything (strangers with property, nobody
  home by day). ⭐ You learn a town's theory of trust by trying a handle.
- ⚠⚠ **D22 — UNSOLVED: an NPC house as free storage.** Stashing goods
  where you pay no upkeep is a real hole in the open-door design and needs
  a rule before any of it ships.
- **D23 — ⭐⭐ Nobody takes the valley; the valley sells.** Rejection loses
  to a buyer. Heart's Delight loses to **the price of land**, one owner at
  a time, each making a decision correct for them — the same shape as the
  subsidence, and no villain anywhere. ⚠ Which is why **Chinatown is the
  wrong reference**: it needs a conspiracy and this needs nobody to do
  anything wrong.
- **D24 — The valley's lesson is how towns form.** Seven steps, in order,
  each walkable: water → land → rail → shipping point → store → **name** →
  map. ⭐ And the name is assigned by a postal clerk, which is
  `AddressRegistry`'s own rule (*one Locality per prefix*) as the founding
  joke.
- **D25 — ⭐⭐⭐ The founding is findable, unremembered, and published by a
  PLAYER.** Halloran gave the right-of-way because he had been cut off —
  he came over the pass and went back in winter for a party that had not.
  The town exists because its founder was trapped, and nobody knows. It is
  recovered from a document and written to the **wiki**, attributed
  through `provenance`. ⚠ Leave the cannibalism alone; the usable half is
  a party trapped over a winter and a relief that went back.
- **D26 — Hendy is a site, not a building.** An ironworks is justified by
  what a village smith cannot make — a hoist, a pump, a stamp mill — and
  metal-chain Stage A shipped none. Author a yard with rail frontage and
  no building; the works arrives later *in response to an event*.
- **D27 — ⚠⚠ The valley is gated on WINTER.** The clock has seasons; the
  crop does not (*"no bloom, no season of readiness"*). ⭐ That is the
  reason to build the valley rather than defer it — a fruit valley is what
  a season is *for*.

---

## Grounding (verified 2026-09-02, at `053c891a2`)

- **13 Locality rows ship.** Heart's Delight is not among them and has no
  content of any kind; only `Watercourse/delight` exists.
- **Content volume:** Rejection 39 files, Hinkley Hills 14, Hearthworks
  12, Practicum 7, Moor 4, Substation 4.
- **Rejection**: 8 surface rooms, all workplaces; 8 workings rooms; the
  Hush; 7 cast; 4 businesses. No `_governmentKey` (deliberate).
- **Hinkley Hills**: 3 authored rooms (stop, lane, + the lots zone);
  everything else keyed-minted from `house-programme`. `_governmentKey:
  hinkley-hills`. Tank is the District's first job (D27).
- **28 agent rows total** across all packs.
- **`shifts` brain** = `on-shift → workplace` / `off-shift → Offstage`,
  via `teleport`, not presence-gated, `ambient = false`.
- **`Offstage`** is `/platform/location/Offstage`, no `Exitable`,
  materialized on demand by `singletonOrClone`.
- **Shift schedules**: only the Lounge, the budget, the general store and
  the counting-houses have non-24/7 rosters. Rejection and Hearthworks are
  24/7, so their `Offstage` rooms are **never used in practice**.
- **`canEvict` overrides**: ~20, all singletons/catalogues; **no agent
  class**. `lastTouched` refreshed by the security gate on every
  successful dispatch.
- **Hearthworks / Practicum / Substation**: zero `_address` declarations
  anywhere in their trees.
- **Stage B gate**: `roadmap.md:27` + `farming-plan.md:28` name residences
  Waves 0–5; those shipped. ⚠ Both docs still read as though it is
  pending — fix at sweep time.
- **`banksAt: goodkin`** on Rejection's fuel-yard and provisioning
  businesses.
- **Only TPA arrival terminal**: `/world/terminus/terminal/thing/arrival-terminal`.
- **Combat readiness**: ships a 1v1 poise session + cycle 2's N-party
  melee (threat graph, focus-fire, `defend`, fleeing); ranged bands
  `close·reach·near·far` **derived from the room's real extent in
  metres**. `HazardMixin` is armed→sprung, triggered by the locomotion
  traverse, delivery through the weapon grammar, detection gated by
  concealment. ⚠ **No representation for a creature bigger than the
  room**, no multi-cell occupancy, no submergence state. One shipped
  monster (the wolf, `naturalAttackChannel: point`).
- **The Ferrow `stocks:` table** ships three species as taxonomy only
  (`Gryllus tenebrarum`, `Rattus fodinae`, `Subterracavia pallida`) with
  no creature rows — a prey pyramid with the top missing, and
  ⚠ **inert as shipped, failing silently**.
- **`policing-slate`** already carries the Pinkerton pattern (*predator
  and instrument* — a corpo hires rather than sends), the doctrine line
  *organized crime is governance without license, corpo malfeasance is
  license without accountability*, the press as the only detector for
  ledger crime, and the aesthetic arc as a Tiebout axis (frontier = hue
  and cry, Terminus = Peelers).
- **Mayfield Row** ships the lease tier: Walter, `lease`/`unlease`, the
  Seznick House unit programme; Ricky fronts `title buy`.
- **`ownerOf(item)`** is the total three-rung chain `stamp ??
  parcel-extent ?? authorOf`; it never returns *nobody*. A good in a
  Hinkley house resolves to the lot's owner with **no stamp required**.
- **No `knock` verb exists** anywhere in the tree.
- **Stewardship**: land use SHIPPED (Hinkley built it — the closed
  six-entry vocabulary on `ParcelRecord`, longest-prefix resolve, the
  cultivation gate); the **allowance cascade is an inert field**; the
  **Stewardship layer is absent**, and no Stewardship Discipline is in the
  shipped roster (which holds 24, incl. `horticulture`).
- **The Hinkley house programme** already ships the house door
  `locked: true` to the lot's keyway.
- **Seasons**: the clock has them (`DefaultCalendar` 360d/12mo/4 seasons,
  pure `CelestialApi.seasonFor`, `SEASON_BIAS` in weather transitions).
  ⚠ **Husbandry does not** — *"no bloom, no season of readiness"*, *"with
  no global season, supply arrives in pulses."* `farming-slate` lists
  **winter first** among what is unbuilt and argues to keep it hard.
- **`AddressRegistry`**: *"One Locality per prefix — a duplicate claim is
  an authoring error."*
- **The tower** composes two shipped systems and needs no new code:
  `StorageNode` (water — Hinkley's tank is one) + `BrandedMixin` (corpo,
  resolve-on-read).

---

## Sequencing

Rough order, each independently shippable:

0. ⭐ **Rejection Act I — the hunt** (GREENLIT 2026-09-02). Hazard-shaped,
   buildable on shipped substrate, and it seeds Acts II/III mechanically:
   a town that has just lost six people and cannot work its own ground is
   a town that sells cheap. Needs the `stocks:` inertness fixed in the
   same wave.
1. **Heart's Delight** (both halves) — completes the spine and is the only
   *new* town. Biggest; B0 re-grounds first. ⚠⚠ **Gated on winter** (D27),
   which it is also the justification for — so the honest order is
   *winter, then the valley*, in one cycle or two.
2. **Hinkley: facades + neighbours + the death man** — the owner-authored
   exterior, the sign in the lane, six cast, and the escalation ladder
   (which authors no quest chain: every rung is a shipped subsystem). ⭐
   The highest immersion-per-line in the slate, and it needs almost no new
   mechanics — only `knock`, and a rule for D22.
3. **Rejection's support half** — boarding house, public house, sharpening
   shop, infirmary, hall. Mostly rooms and cast.
4. **Homes everywhere** — `Offstage` → addressed rooms with doors, after
   D13's proof.
5. **Depots + the valley road** — cheap to author, inert until freight
   makes travel cost something, and a good room either way.
6. **Freight** — pulls the whole von Thünen payoff. Its own build.

⚠ Steps 2–5 are each far smaller than a normal build cycle. They are
candidates for riding another build's branch rather than opening one.

---

## What this slate does not answer

- **How the polities actually get chartered.** D4 names three roads and
  builds none. That is [civics](../../subsystems/civics.md) +
  [legal-code](./legal-code-slate.md) work.
- **The river authority.** Named as the one institution following the
  hydrological hierarchy; nobody has designed it.
- **Subsidence as a mechanism.** The pedagogy is identified and the field
  (`elevation`) exists; the coupling from draw to elevation is unwritten.
- **Seasonal employment.** The cannery needs a labor pattern the
  employment engine does not have.
- **Whether lots vary.** D7's sibling — an aspect/soil/corner axis on the
  plat is named as a gap and not specified.
- **The wood contest.** Flagged in shipped Rejection content, unwired,
  and it belongs to whoever builds Rejection's second half.
