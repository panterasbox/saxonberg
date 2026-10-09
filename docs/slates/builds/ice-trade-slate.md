# Ice trade slate — the first RGO whose product is a weather condition

> **Status: UNBUILT**, and ⛔ **blocked on climate** —
> [climate-slate](./climate-slate.md): the temperature floor anywhere, in
> any season, is ~276 K, so **nothing in the realm can freeze.**
> **Left:** the ambient→`Bulkable` freeze driver · **thickness** as
> accumulated latent removal · the harvest act and its season · the ice
> house as a self-coolant store · ice's **grade** (clear vs cloudy) · the
> icehouse-keeper's vocation · retail · and ⚠ the **`AlloyedMixin`-on-ice
> promotion** (below).
> ⛔ **Three refusals:** climate is **not** this trade's (→ climate-slate)
> · **load-bearing surfaces** are cross-cutting (below) · and the demand
> side stays [preservation-slate](../tails/preservation-slate.md)'s.
> **Size:** a build, once climate ships.

*Designed 2026-10-09. The demand, the vocation and the seasonality were
already argued in `preservation-slate`; `thermal-slate` already named
"the ice economy (winter ice harvest, sawdust icehouses, ice as a traded
good)" as an unbuilt consumer; and `ice-block.yaml` already ships
"so a retail row can name it the day that trade ships." This slate is
the trade itself, its physics, and its lens pass.*

---

## 0. ⭐⭐⭐ Why this one and whaling are the last two RGOs

They are complementary **by construction**, which is the argument for
finishing with them rather than with two more of the same:

| | **whaling** | **ice** |
|---|---|---|
| reservoir | a population | ⭐ **a weather condition** |
| recharge | decades | ⭐⭐⭐ **100 %, every winter** |
| the commons question | the whole point | ⭐ **does not exist** |
| the act | a seven-stage pipeline, no partial credit | one act, in a short window |
| the credit | a fractional **share** (a lay) | ordinary |
| what it tests | **reservoir and recharge** | ⭐ **the act and the credit under free recharge** |

⭐⭐⭐ **Ice is the first RGO with no depletion and therefore no
conservation question at all**, which makes it the programme's **control
case**: every other RGO makes you weigh against the future, and ice makes
you weigh against *this season only*.

⚠ **And both keep hitting cross-cutting gaps, which is what "last"
means.** Glass refused **molds**; ice refuses **climate** and
**load-bearing surfaces**. The easy RGOs were the ones whose substrate
already existed; what remains is substrate wearing a trade's clothes.

## 1. The demand already ships and is fed by nothing

`preservation-slate`'s status block, verbatim:

> ⭐⭐ **WHO SELLS ICE** — the placement build shipped an icebox that
> **CONSUMES** ice (`/stuff/thing/ice-block`) and **nothing in the realm
> produces or retails it**, so the cookhouse's block is authored and never
> replaced. That is **a named demand with no supply and therefore an
> icehouse-keeper's whole vocation, seasonal by nature (free in winter,
> dear in summer)** — the sharpest unbuilt thing on this slate, and **the
> placement drive's `DIRTY_REASON` is the standing evidence it is
> missing.**

⭐⭐⭐ **Same lens-6 answer as whaling: the demand is authored, shipped,
and unfed.** The rarest answer that lens gets, and two trades have it.

## 2. The physics — three pieces, and ⛔ one is not ours

1. ⭐ **Ambient cold drives a `Bulkable` freeze.** `thermal.md`: *"only
   the powered cold source drives a `Bulkable` freeze (the
   ClimateControl content pass); **a jug of water in a cold weather room
   does not freeze this build.**"*
   ⭐⭐ **So a pond cannot freeze and the harvest has no source.** It is
   one driver, **symmetric with a fix already made for the melt** — the
   2026-09-28 change gave `reconcileThermal()` the melt *"immediately
   after the drift that makes a body warm,"* and the freeze rung kept its
   powered callers. ⚠⚠ **The melt got the weather and the freeze did
   not.**
2. ⭐⭐ **Thickness, as accumulated latent removal.** The plateau already
   banks `latentRemovedJ`; thickness is that read as a **depth of solid**
   rather than a boolean. ⚠ It makes ice **partially solid**, which
   nothing else in the game is.
3. ⛔⛔ **A surface that bears load until it fails — CROSS-CUTTING, not
   ice's.** `materials-response` models **harm**; `encumbrance` models
   what **you carry**. **Nothing models what holds you up** — and the
   consumers are rotten floorboards, a roof under snow, a rope bridge, a
   cave-in, a cart on a weak bridge, the millsite's stage over the water.
   ⭐ *Never solve a cross-cutting capability in a trade build*: this
   slate names it and refuses it, as glass refused molds.

### ⭐⭐ A pattern worth having as a standing check

Three instances found in one session: **the column priced its passage and
the reach got a boolean** · **the melt got its ambient driver and the
freeze did not** · **glass's transmissivity carried light and withheld
sight.**

> ⭐⭐⭐ **When a bidirectional mechanism ships, one direction gets its
> driver and the other waits for a consumer — and the waiting half is
> invisible, because the engine looks complete.**

## 3. ⭐⭐⭐ The season, and the two gifts

**Altitude is available and latitude is not.** `Zone.elevation` is on the
base class *deliberately* (*"height above datum is a fact about a region
of the map"*) and the Kestrel's headwaters are authored at **1400 m**;
per-place latitude *"rides celestial's deferred planetary anchor."*

⭐⭐⭐ **So ice can ship on altitude alone** — a tarn high on the
headwaters freezes while the lowland does not. **The mountain is the ice
house**, and it is the historically right answer anyway: Mediterranean
ice came down from the mountains for two thousand years before anybody
shipped it from Boston. ⚠ Still blocked on climate's **baseline**, which
is a number rather than a system (§ 0 of climate-slate).

⭐⭐ **And ice is counter-seasonal to agriculture.** `time.md` worries
that at 6× *"winter becomes a 15-real-day dead season"* — so at 12× it is
**~30 real days when a farm does nothing.** That is exactly the harvest
window. ⭐ `soil.md` already defends winter's hardness because *"drying
and the cellar have no reason to exist"* without it; **ice is the third
thing winter exists for, and the only one that is a job rather than a
precaution.**

## 4. The trade

- ⭐⭐⭐ **The harvest site is the only industrial premises that is the
  same object as its own product.** You stand on the thing you are
  selling, and **taking too much of it is standing on less.**
- ⭐⭐ **Thickness is the gate and the content.** Load-bearing ice is
  roughly 4 inches for a person, 8 for a horse, 12 for a team and a
  plough — a derived read, and **the honest danger is going out too
  early**, when the ice is the hazard rather than the product. ⭐ It gives
  the season a beginning (when is it safe), a middle (the cut) and an end
  (the thaw): **Aristotle, from a temperature.**
- ⭐⭐⭐ **The ice house is a `Coolbox` whose coolant is its own
  inventory.** Not the passive twin and not `ClimateControl`: **it is cold
  because of what is in it, and what is in it is the product.** So
  performance is a function of how full it is — a half-empty house loses
  faster — which is a feedback loop nothing else has and which is
  historically exact.
- ⭐ **Insulation is sawdust**, which is forestry's waste stream. **Maine
  ice and Maine lumber** — so the margin depends on a sawmill being near,
  the same shape as glass eating the collier's ruined ash.
- ⭐⭐ **Ice has a grade:** *clear from still deep water, cloudy from
  agitated.* Real, and `gradeBand` already ships.
- ⭐ **Snow insulates ice, so a snowy winter makes worse ice** — a true,
  surprising inversion, and `watershed.md` already ships **snowpack**.

## 5. ⭐⭐ The epoch arc is the inverse of whaling's

Whale oil's killer — kerosene — is named in a `lamp-oil` keyword and
unbuilt. ⭐⭐⭐ **Ice's killer already ships: `ClimateControl`, the active
cold source, landed 2026-10-01.**

So building ice means building **the predecessor of something already in
the game**, and the transition is legible *immediately* rather than
deferred. Lens 5's cleanest case — **the capability survives (an icebox
and a refrigerator answer the same commands) and the trade dies.**

## 6. Lens pass

**1 · Pedagogy** — #65 · #28 · #17 · #2 · #33.
⭐⭐⭐ It teaches **latent heat**, one of the genuinely counterintuitive
facts in thermodynamics: ice at 0 °C and water at 0 °C are the same
temperature and wildly different energy — and you *feel* it, because the
box holds and holds and then goes off a cliff. ⭐⭐ Second: **insulation
is not cold.** Third: **snow makes worse ice.** ⭐ #17 **The Toy** passes
— cutting a hole in a frozen lake is fun with no goal.

⚠⚠ **#28 fails** (*the machine is a teaching surface*): `ice-block.yaml`
documents its own defect — `Casting` composes `AlloyedMixin`, *"INERT on
ice… so this block will claim it can be alloyed and tempered. That is a
real misrepresentation,"* filed against `base-class-narrowing-slate`.
⭐⭐⭐ **Acceptable on one cookhouse prop; unacceptable on a trade's
staple**, because the mixin chips *are* the pedagogy. **Promote it — the
trade must not ship on a straight man that lies.**

**2 · Expression** — and the **named-work test**: ⭐ *can you make the
Walden harvest* (a hundred men, a horse plough, a railway siding, Thoreau
complaining about it), and ⭐⭐ *can you make an ice house that fails* (a
warm March, the lot lost, the keeper ruined). Constant: latent heat,
conduction, the freeze rate, thickness. Variable: where the ice is, who
cuts it, the house and its insulation, the season's quality, the grade.

**3a · Immersion** — ⭐ already on the page: *"clouded white at the heart
and **sweating along every edge**."* **A thing that is visibly losing** is
rare and excellent. ⚠ And the `AlloyedMixin` chip is a 3a failure too —
*every flag is transparency spent*, and **a mixin chip that lies spends
more than a flag.**

**3b · Participation** — ⭐⭐⭐ **the harvest is on somebody's water**, so
the holder sets the season and the licence (and *who owns the ice on a
frozen lake* was real litigation). ⭐ #86's vacancy test: the
**icehouse-keeper** is a named vacancy, plus a cutter, a hauler and ⭐ **a
sawyer who sells sawdust.**

**4 · Values** — ⚠ the usual question (*how much may be taken*)
**evaporates**, because recharge is total. What remains is
**distribution**: who gets the cut, and at what price in July. ⭐⭐⭐ And
#63 is satisfied for free — *show the dirt, never the score*: **the ice
house's state IS the dirt.** How full, how wet the floor, how much is
left in August. **No gauge, and the read is the business.**

**5 · Continuity** — ⛔ no Schell instrument, and **ice's strongest lens**
(§ 5).

**6 · Economy** — ⭐⭐⭐ demand authored and unfed, with live evidence
(`DIRTY_REASON`), and #30's chain walk runs **backward** from a consumer
that already exists. ⭐⭐⭐ #27 **Time** is the one to build on: **ice is
priced in time** — free in winter, dear in summer, and the whole business
is *storing a season while the goods evaporate.* **Nothing else in the
game is inventory-as-arbitrage-across-time**, and `spoilage.md` is the
demand side of the same clock. ⚠ #64's warning: *a dry interface over an
economy of labour is a job* — a hundred men on a lake with saws must not
render as a progress bar.

**7 · Governance** — ⭐ the water's holder licenses the cut (Tier C, by
the charter — [navigable-water-slate § 5](./navigable-water-slate.md)).
⭐⭐ And the ice house is a **bailment**: you store other people's ice, and
⚠ **who bears the loss when it melts** is a real question `contract.md`'s
**custodian rule** already answers. ⭐⭐⭐ *General average, on land.*

## 7. Open

1. ⛔⛔ **Climate.** Not this slate's; the whole trade waits on it.
2. ⚑ **Is harvested ice the same object as frozen-pool ice?** ⭐ The
   natural answer is yes — you cut the pool's ice into blocks — ⚠ and that
   lands the `AlloyedMixin` misrepresentation on the trade's primary good.
3. ⚑ **Does the pond "recover"?** ⭐ It is weather, not a stock, so the
   RGO law's reservoir/recharge reads strangely: ⭐⭐ **ice may be the
   first RGO whose recharge is a forecast.**
4. ⚑ **Thickness thresholds** — authored dials or derived from the freeze?
   ⭐ Derived, presumably, from accumulated latent removal and the ice's
   own `density`.
5. ⚑ **Where does the sawdust come from mechanically** — is it a forestry
   byproduct row, or a milling one?

---

**See also:**
[preservation-slate](../tails/preservation-slate.md) (the demand, the
vocation, WHO SELLS ICE) · [thermal-slate](../tails/thermal-slate.md)
(*"the engine shipped; the consumers below did not"*) ·
[climate-slate](./climate-slate.md) (⛔ the blocker) ·
[navigable-water-slate](./navigable-water-slate.md) (whose water, and the
frozen lake inverting from passage to corridor) ·
[base-class-narrowing-slate](./base-class-narrowing-slate.md) (the
`AlloyedMixin` promotion).
