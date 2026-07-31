# Ranching slate (working doc) — livestock, husbandry, and the animal economy

> **Status: conventions + the core loop DECIDED (2026-07-30/31 design sessions);
> disease, breeding depth, and herd UX still open.** Ranching is the
> **economic** half of owned animals: raising livestock (managed as herds, not
> befriended as individuals) for renewable products — milk, eggs, wool, meat,
> hide, draft labor, breeding stock.
>
> **Session 1** ran ranching against **both** its neighbors at once —
> [pets](./pets-slate.md) (the relationship half) and
> [farming](./farming-slate.md) (the plant half) — and settled the four
> conventions all three must agree on, plus the deliberate divergences.
>
> **Session 2** designed the loop. Three decisions carry the most weight:
> ranching's core model is **energy partitioning under a priority cascade** (not
> farming's limiting factor); **pasture is a field** and grazing is simply a
> second harvest method, which makes hay mechanically necessary and makes crop
> rotation through pasture *emerge* from correct soil accounting; and **paddock
> granularity is the player's dial, not our constant** — subdivision trades
> utilization against attention exactly as it does in real grazing management.

See also: [farming-slate](./farming-slate.md) (**the primary sibling** — same
guild, same production family; the feed loop + the shared genome) ·
[pets-slate](./pets-slate.md) (the *substrate* sibling — an owned animal, but a
different experience; see The family placement) ·
[fishing-slate](./fishing-slate.md) (aquaculture is ranching's aquatic casting;
`BodyPlan`→parts on cleaning is settled there) ·
[mining-slate](./mining-slate.md) (the commons-renewal counterpoint) ·
[guild-slate](./guild-slate.md) (**the Grange** — ranching is its herd wing) ·
substrates: [race.md](../../subsystems/race.md) (`Creature` tier · `Species` ·
`SexedMixin`) · [vitals.md](../../subsystems/vitals.md) +
[metabolism.md](../../subsystems/metabolism.md) (eat / grow / die; the
reconcile-on-read pattern) · [chattel.md](../../subsystems/chattel.md) (**the
custody answer**) · [persistence.md](../../subsystems/persistence.md) (the
`(scope, key)` multi-instance spine) · [reserve.md](../../subsystems/reserve.md)
· [crafting.md](../../subsystems/crafting.md) (yield → processed goods) ·
[banking.md](../../subsystems/banking.md) +
[employment.md](../../subsystems/employment.md) (the ranch as a `Business` +
ranch hands). Related: **[property-slate](./property-slate.md) (the parent — the
parcel half; ranching owns land *and* stock)**.

---

## The frame — animals as a managed resource, not a relationship

A rancher does not *win over* a cow. Livestock are **owned, fungible-ish,
managed at scale for yield** — the opposite content stance from a carved,
bonded pet:

| Axis | **Pet** | **Livestock** |
|---|---|---|
| Engine tier | `Character` (rich) | `Creature` (thin) |
| Content stance | individual **carve** | systemic **herd** |
| Relationship | **bond** (regard) — *won over* | **yield** — *managed resource* |
| Domesticability | mid — needs the taming encounter | max — born owned, no encounter |

The Creature/Character split **is** the livestock/pet split. Livestock need a
body, vitals, metabolism, sex, and containment (enough to eat, grow, breed,
yield, and be herded), but **not** the belief / regard / sensor / engaged stack
pets require. And **domesticability is one axis spanning wild → pet →
livestock**: livestock species are the maximally domesticated end —
fear-baseline zero, born into custody, no taming encounter.

---

## The family placement **[DECIDED]**

Ranching's nearest *slate* is pets (they were spun out of one conversation), but
its nearest *design family* is farming, fishing, and mining — and the
[guild roster](./guild-slate.md) already made this call, four weeks after the
pets/ranching/farming slates were written (none of them cite it):

- **The Grange** — "cultivation, soil, husbandry + breeding, genetics."
  **Farming and ranching are one vocation.** Ranching is its herd wing.
- **The Wardens** — survival, tracking, hazard-craft, **taming**; demand anchor
  is "the pet supply chain."

So the production family (farming · ranching · fishing · mining) shares a
convention set that three slates already converged on independently:
reconcile-on-read with no tick · a `Grade` band on the harvested thing ·
`BodyPlan`→parts on cleaning · an **automation ladder that caps at the boring
reward**. Ranching is a full member.

**Pets shares *substrate* with ranching (an owned, individually-identified
animal) but not *experience*.** The design goal is therefore **one shared
substrate under two distinct experiences** — not one unified system. Where the
two touch (custody, maturation, persistence, the clock) they must be
*identical*; where they part (bond vs yield) they part completely.

---

## The four shared conventions **[DECIDED]**

These bind ranching, farming, and pets alike. Build them once; do not fork.

### 1. Where identity lives — one density dial

Farming already answered ranching's biggest open question. Its **field vs bed**
split — aggregate matter with coverage, versus a `Slotted` bed where each plant
is an individual — *is* the **herd vs breeding-stock** split. One dial spans all
three systems, chosen **per content, not per system**:

> aggregate matter → slotted individual → carved individual

- **Aggregate (default for a production herd).** Don't instance 100 cattle. The
  herd is headcount + condition + composition, modeled like farming's continuous
  crop. Scales cozily; no 100-object room, no per-head `look` spam.
- **Slotted individual (breeding stock, the prize bull).** Where identity
  genuinely matters — lineage, quality, a name — the animal is an instance.
- **Carved individual** is the pet, the far end of the same dial.

The dial *replaces* the old open question ("do we model 100 `Creature`s or a
herd abstraction?"). Both, and content picks.

### 2. Custody — `ChattelMixin` on the Creature stack

**Verified in code:** `ChattelMixin` is composed in exactly one place —
`lib/stuff/Thing.ts` — and `Creature` descends from `Agent`, not `Thing`. So
**no animal can be owned today**; `ChattelApi.stamp` refuses a cow or a pet. But
the chattel gate is *structural* (`MixinApi.isChattel`), not tier-based.

> **Adding `ChattelMixin` to the Creature stack gives pets, livestock, and
> aquaculture per-instance ownership with chain-of-title, from shipped code.**

This is the whole possession answer, and it retires the pets slate's sketched
`CompanionMixin` + `ownerPath` — which would have been exactly the pet-shaped
custody edge that slate's own guardrail warns a hundred cattle can't reuse. The
property slate already classes a pet as chattel ("real property bottoms out at
the zone; everything finer is chattel or slots"), so this is consolidation, not
a new primitive.

Aggregate herds title at the **herd** level; slotted individuals title per head.

### 3. The clock — nothing freezes but the body you inhabit

**One engine: reconcile-on-read** (metabolism's pattern, which farming already
copies wholesale). No tick, no per-system time model.

> **Things you own reconcile against world time. The body you inhabit reconciles
> against played time.**

The avatar's own metabolic clock **keeps freezing** on logout (shipped behavior:
`isHasInteractive() && isLinkdead()`) — you can't hire someone to eat for you,
so offline decay of your own body has no fair mitigation. Everything you *own* —
crops, herds, pets — runs on world time whether or not you're logged in. The
existing far-past guard (`MAX_REASONABLE_GAP_SEC`) clamps the six-month absence
without special-casing anything.

**This supersedes the pets slate's "offline = freeze / owner-proxy presence"
line.** The goal that line was protecting — respect the player's time — survives
intact, because it was never about the clock; it was about the **shape of the
consequence** (see §4 of the divergence table below).

### 4. Yield — two shapes, not four systems' worth

| Shape | What it covers | Precedent |
|---|---|---|
| **Standing tap** | milk, eggs, wool — *and* an orchard, *and* a deployed fish trap | retail's `Stock.reset()` tops a counter back to authored `par` on the game-time reset sweep (`lib/retail/Stock.ts`, `lib/residency/Resettable.ts`) — structurally milk, and already Law-2-safe (items, not money) |
| **Terminal harvest** | grain, slaughter, a landed fish | fishing settled `BodyPlan`→parts on cleaning; butchering is that, on land |

Both are **transforms** (feed → product), never faucets — the conserved-economy
rule. The standing tap is the headline ranching mechanic and does not exist
today; the reset sweep is the shape it should copy rather than a new driver.

---

## The automation ladder — and the one thing it can't do

Farming's anti-idle ladder is **also ranching's offline-care model, and pets'**.
Each rung changes *who pays*, never *whether*:

| Rung | Who shows up | The cost |
|---|---|---|
| **By hand** | you | your real-time attention (participation) |
| **Hired NPC** | a `Behaved` brain (the employment engine) | **wages out of your account** |
| **Script** | the command-native interpreter | **metered compute** |

The limit on automation is a principle, not a number:

> **Automation maintains your assets. It cannot maintain your relationships.**

A hired hand feeds the herd, waters the field, and keeps a pet fed and healthy —
the **material floor** is covered for whoever pays. But **bond is only earned in
person.** A kennel keeps your dog alive and well; it does not keep your dog
*yours*. This gives pets a cheap survival floor (what the slate's retracted
boarding-fee economy was groping for) while keeping the actual pet fantasy
un-automatable — and it reads correctly in a barn, a field, and a dorm room.

**Compute note:** reconcile-on-read is lazy and scales for free (it computes
only when someone looks). Anything needing a *live tick* — a brain running, a
predator raiding the herd while you're offline — is real compute and is what the
property slate's allowance meter prices. That's the clean line between the two
scarcities.

---

## The deliberate divergences

Same substrate, opposite surface — each with a stated reason:

| Axis | Farming / Ranching | Pets | Why they part |
|---|---|---|---|
| **What's measured** | yield | bond (regard) | never give a cow a bond or a pet a yield stat |
| **Content stance** | data rows (a herd is authored as a table) | a carve (NPCs are expensive carves) | fungibility vs identity |
| **Offline consequence** | material loss, up to death — that's the economic stake, and it's mitigable by wages | **bond drifts; the animal can go feral and leave — it never starves to death** | a business can hire; a relationship can't be delegated |
| **Renewal governance** | **private** — your seed, your breeding stock | n/a | — |
| *(vs mining/fishing)* | commons — quotas, office levers, catch limits | | **a property distinction, not a biological one** — same stock-and-recovery model, opposite political surface |

---

## The core model — energy partitioning, not the limiting factor **[DECIDED]**

Farming's central lesson is the **limiting factor**: independent inputs, yield
set by the scarcest one (Liebig's minimum — the weakest-link `Grade`). **If
ranching copies that, it is farming with legs.** Ranching's model is one shared
budget spent in a fixed priority order:

```
feed intake →  1. maintenance       (scales with body mass — nonnegotiable)
               2. thermoregulation  (cold raises it)
               3. growth            (juveniles)
               4. production        (milk / wool / eggs)
               5. reproduction      (gestation, lactation)
```

The priority order is real animal science, and every consequence we want falls
out of it rather than being written in:

- **Underfeed → production dies first**, then growth, then body condition, then
  the animal. That is farming's forgiveness curve in animal terms, with no
  special case.
- **A cold snap raises maintenance**, so milk drops at constant feed — which
  makes [thermal](../../subsystems/thermal.md) and shelter genuinely
  load-bearing instead of decorative.
- **A pregnant animal partitions to the fetus** and milks less. A real tradeoff
  the player feels without being told.

> **Farming teaches limiting factors; ranching teaches allocation under a
> priority cascade.** Two different optimization idioms on one reconcile engine
> — a player who learns both has learned two real things, not one thing twice.

It also hands ranching its own economics for free: a fallow field costs nothing,
but **a herd eats whether or not it produces.** Livestock are a depreciating
asset that consumes. That, not the yield tap, is why ranching *feels* different
from farming.

---

## The loop — three cadences **[DECIDED]**

- **Daily (cheap, cozy).** Read the herd (condition, headcount, what's off),
  collect the standing tap (`milk`, gather eggs), top up feed if the pasture is
  short. Minutes; forgiving; no failure state.
- **Weekly-ish (where the skill lives).** `move herd <paddock>` — rotational
  grazing. **This is ranching's signature verb and it is not a farming verb:**
  farming tends a fixed plot, ranching moves animals between plots. Same
  substrate, different game.
- **Seasonal (the deep game).** Breed (choose sires — the shared genome), cull
  and sell (the demographic decision), shear, and **lay in winter feed**.

### The year's spine — the winter-feed problem

Real temperate ranching organizes the whole year around one question: *is there
enough hay to get the herd through winter?* Making that the annual arc buys four
things at once — a **forecasting problem** (expected intake × expected winter
length), a hard **coupling to farming** (you grew or bought the hay), a
**consumer of weather** (a hard winter costs more), and a decision with a real
mitigation: **sell down the herd in autumn rather than starve it in February.**

No dominant answer, and it teaches budgeting under uncertainty. The herd size
you can carry becomes a number the player reasons about instead of a cap the
game hands them.

### Still ranching-specific, still open

- **Breeding at scale** — the herd-grows loop pets don't have; the substrate for
  selective breeding / stock quality. Rides the **shared genome** (below).
- **Butchering / slaughter → crafting inputs.** Mechanically settled (fishing's
  `BodyPlan`→parts); the open part is tone and the meat path's economics.
- **Predators vs the herd** — a real ranch threat, a fear-axis consumer, and the
  one live-tick compute consumer probably worth paying for.

---

## Land use — pasture **is** a field **[DECIDED]**

**Grazing is a second harvest method on the same plot — the animal is the
harvester instead of you.** A field-room already carries soil reserves plus
standing biomass; modeling "pasture" as its own system would be a special case
the engine doesn't need, and it would break the farming interlock. So a
field-room is a **land-use decision each season**:

| Use | Who harvests | When you get it | The catch |
|---|---|---|---|
| **Crop** | you, at maturity | one lump | field committed all season |
| **Graze** | the animal, continuously | as milk / wool / growth | **can't be stored**; only while grass grows |
| **Hay** | you cut, the animal eats later | deferred | cutting + storage losses |

This makes **hay mechanically necessary rather than an authored recipe.**
Grazing is far the most efficient path — no cutting, no hauling, no storage
loss, the animal works for free — but you cannot bank it. Hay is strictly worse
per unit and exists for exactly one reason: **it is the only form of grass you
can keep until February.** The winter-feed problem is therefore an honest price,
not a tax the game invented.

### The soil consequence — why rotation emerges

The three uses differ in what they do to the **soil**, not just what they yield:

| Use | Nutrient flow | Effect on the field |
|---|---|---|
| **Graze** | returned **in place** (the animal eats and deposits on the same ground) | ~neutral; with good rotation, building |
| **Hay** | **exported** to wherever the animals eat it | depleting |
| **Crop** | **exported** | depleting |

So a field hayed or cropped hard watches its reserves sag, and the fix — **put
the herd on the tired field for a season** — is something the player can
*derive*. That is why real mixed farms rotate land through pasture, and it falls
out of the model being correct rather than from a "+N grazing bonus."
(The *player derives it from principles* property, applied to dirt.)

It also splits the manure coupling in two: nutrients **cycle in place** when you
graze, and are **moved** when you cut and carry. *Where the herd stands is where
the fertility goes.*

### The gate you left open

The herd can get into the wheat, and this needs no new substrate: a paddock is a
field-room whose exits are gated, and gates are already
`Lockable`/`Switchable` boundary objects. Leave one open and the herd finds the
standing grain — the RimWorld moment, and the same emergent-consistency energy
the pets slate wants from NetHack.

**Resolve the escape at reconcile time, not as a live event.** The herd does not
wander while nobody is watching (that is a live tick, and live ticks are what
the property allowance prices). Instead, on your next read: *the gate was open
Tuesday; they were in the wheat by Wednesday; here is what's left.* Costs
nothing to compute, consistent with the family clock, and lands harder as a
discovery than as a notification. Fence maintenance then becomes a chore in the
*good* sense — farming's "upkeep should be fought, never an HP bar" rule.

---

## Paddock granularity — the player's dial, not our constant **[DECIDED]**

Real grazing runs a full spectrum: **continuous grazing** (one paddock, animals
in it all season, low utilization, zero management) through
**management-intensive grazing** (dozens of paddocks, moves every day or two,
much higher output per acre, lots of attention). The tradeoff between the poles
is exactly *more subdivision → better utilization → more animals per acre → more
management.*

> **So we do not pick a paddock count. The player subdivides, and the tradeoff
> prices itself.** Low-touch play is one big field at a low stocking rate and it
> works fine; maximizing output from fixed land means subdividing and paying
> attention. Granularity becomes a dial the player sets, and it self-balances —
> nobody is forced into a cadence they did not choose.

### The clock bounds the useful range **[CORRECTION 2026-07-31]**

Real management-intensive grazing moves stock **every 1–3 days**. At the
verified `DEFAULT_SCALE` of **12×** (2 real hours = 1 game day), a player
logging in once a real day skips **12 game days** — four to twelve missed moves,
and a paddock wrecked before they ever saw it. So:

> **Game paddock residency wants ~7–14 game days, meaning fewer and larger
> paddocks than real intensive grazing.** Do not port the real-world cadence.

The player-set dial survives intact; the clock simply **is a fourth bound**
alongside fencing, allowance, and attention. It also promotes the hired hand
from convenience to structure: **subdividing past ~weekly residency is what
actually makes hiring necessary**, which is the automation ladder doing its job
rather than a balance patch. Full clock math in [farming § The
clock](./farming-slate.md).

### The move is a *read*, not a timer

The chore risk is predictability, not frequency — "move every three days" is a
chore at any interval. The trigger is **sward height**: move at residual, return
at recovery. That varies from things already simulated (grass grows faster after
rain, a denser herd eats down quicker, growth slows at the season's shoulders),
so the same paddock carries the herd a couple of days in a dry spell and most of
a week after good weather. Same shape as farming's "is this field thirsty," and
it uses the same instrument tier: eyeball a band, or read a sward stick for a
number with error bars.

### Failure is two-sided in both directions

| Mistake | Cost |
|---|---|
| **Move too early** | grass left ungrazed — utilization loss, invisible unless measured |
| **Move too late** | grazed below residual → the sward recovers slowly |
| **Return too soon** | grazing regrowth that hasn't rebuilt reserves — same failure, other end |
| **Understock** | grass gets ahead of the herd, goes stemmy, **feed quality drops** |

**Understocking mattering is the non-obvious one, and it should ship.** Grass
not grazed at the right stage is low-nutrition, so stocking rate is a two-sided
problem rather than a "don't exceed this" cap. True, and it doubles the decision
space.

### Every failure is a slope, never a cliff

Overgrazing is a **recovery-rate penalty** — it kills neither the sward nor the
herd. A player away a week returns to a chewed-down paddock and a field that
will take longer to come back: a real setback, fully recoverable, no death.
Farming's forgiveness contract honored without a special case, which is what
lets the reconcile-on-read clock run freely (§ The clock) without absence ever
being catastrophic.

### The automation valve — and why it doesn't eat the skill

Moving the herd is **pure asset maintenance**, so it is fully delegable under
the ladder's rule (no relationship involved). That is the pressure valve: want
twelve paddocks without walking them, hire — and the wage line is the honest
cost.

But it must not be *as good*. **A hired hand runs a standing cadence; the player
runs the read.** A cadence cannot respond to Tuesday's rain, so the hand grazes
slightly wrong on both sides and gives up utilization. **Automation buys
reliability at a utilization penalty** — exactly the rule fishing set with nets
and farming set with farmhands: the automated path caps at the boring reward,
human judgment keeps the value. High- and low-engagement players both get a
working ranch; the difference is output per acre, never access.

### What bounds subdivision (so nothing arbitrary has to)

**Fencing** (materials + labor, and it wears — which finally gives fence
maintenance something to be other than a gauge; a **grown hedge** is the cheap-
in-materials, expensive-in-time third option — see [farming § Pests, thorns, and
navigability](./farming-slate.md)) · **compute allowance** (each paddock is a
room, and the property substrate prices persistent simulation, so subdividing
spends the game's real scarcity currency) · **attention** (the whole point) ·
**the clock** (above — residency below ~a game week can't be hand-run). A player
who subdivides absurdly pays in all four. **No maximum needs writing down.**

### Paddock = room, not slot

Worth being explicit, since farming uses both densities. A **crop is floor
state** (continuous matter on the field-room's `Floor`); a **herd is room
occupants** (containment is room-level — slots hold objects, not herds). A
field-room can carry floor state *and* occupants at once, and **grazing is
literally "the occupants consume the floor state."** One clean seam, identical
whether the floor is a sward, a hay crop, or your wheat when the gate was open.

---

## The farming coupling (the integration seam)

Ranching is the animal half of agriculture; it closes a conserved loop with the
crop half:

> **crops → feed → livestock → products → crafting → market** — all conserved,
> nothing from nothing.

That **feed-supply coupling** is the concrete integration point: grain grown by
farming becomes feed consumed by livestock metabolism, whose yield re-enters
crafting and the economy. Both halves share the `Business` + labor wrapper, land
tenure, and the Grange.

But the feed loop is only **one of two** couplings, and the second is the one
that makes a mixed operation genuinely better than either half alone:

1. **Feed** — crops → feed → livestock → products → crafting → market.
2. **Nutrients** — the manure cycle (§ Land use). Livestock convert feed into
   product *and* manure; manure returns N to the same soil reserves farming
   models. Grazing cycles it **in place**; haying and cropping **export** it.

And because **pasture is a field** (§ Land use), the two systems share the
*same* reserves rather than merely trading goods across a boundary — grazing
draws down the soil and biomass crop growth uses, so overstocking is a farming
problem too. **That is the interlock made mechanical rather than thematic**, and
it is what makes farm+ranch complementary by construction instead of by bonus
multiplier.

**The shared genome.** [Farming](./farming-slate.md) already claims the
`Genome` / reaction-norm genetics layer is **husbandry-wide**, not crop-only: an
animal has a `Species` + `BodyPlan` + vital-profile parameters, and
genes-as-reaction-norms bend *those* curves exactly as they bend a crop's
`GrowthParams`. Build it once, for crops and livestock both. The only divergence
is the surface verb (`pollinate` vs mate/gestation over `WorldClock`) and which
parameter set the genome bends. **Aquaculture is the third consumer** (fishing
names it explicitly), and pet breeding is a latent fourth.

**One catalog shape.** The `Species`/`Clade` taxonomy already spans `animalia`
*and* `plantae` (a sessile peace-lily row is the proof token). Crops, livestock,
and pets are one catalog shape — which resolves farming's open question 4 in
favor of the existing tree rather than a sibling catalog. *(Caveat: the
peace-lily row is documentation-only today — no seed exists in the tree.)*

---

## Pedagogy — a distinct curriculum, not farming's course again **[DECIDED]**

Ranching must teach *different* real things than farming, or the second system
is the first system's course a second time. Farming owns agronomy, genetics, and
chemistry. Ranching owns:

| Real discipline | Where it lives in the loop |
|---|---|
| **Animal nutrition** | the partitioning cascade; **feed conversion ratio** (kg feed per kg product) is the actual efficiency metric of real animal agriculture, and it is arithmetic a player can compute |
| **Population dynamics** | age structure, replacement rate, culling strategy — real demography |
| **Grazing management / range science** | stocking rate, carrying capacity, residual + recovery curves |
| **Nutrient cycling** | the manure loop; N conserved across the farm↔ranch boundary |
| **Farm-management economics** | the winter-feed budget under uncertainty |
| **Epidemiology** *(later wave — see Open questions)* | density-dependent transmission; a real tension against "stock more for more yield" |

Two things fit the engine's shipped conventions unusually well — we are not
imposing the house style on the discipline, the discipline already works this
way:

- **Body condition scoring is natively a band.** Real ranchers score animals on
  a 1–9 scale by eye; it is taught in every animal-science program. A novice
  reads *thin / good / fat*; an expert with a scale reads kilos **and** a BCS to
  a quarter point. That is precisely the honest-opacity convention (bands for
  the estimate, instruments with error bars for the world) arriving pre-built.
- **Records are the selection game, and they earn identity.** Real animal
  breeding runs on herdbooks — per-animal production over time is what makes
  selection possible at all. So the density dial (§1) gets a **diegetic** reason
  rather than a performance one: **you promote an animal out of the aggregate
  herd into individual identity precisely when you start recording it as a
  selection candidate.** *Identity is earned by being measured.* This answers
  the promotion question the first draft left open.

**The deep payoff worth building toward:** farming's breeder's equation is
`R = h²·S`, but the animal version divides by **generation interval** —
`R = h²·S / L`. That single term is *why* animal breeding is slow and why
selection intensity matters so much more when a generation costs seasons. Real,
computable, and it makes the two halves of the Grange feel like one discipline
taught at two speeds.

---

## Gap map — verified against the code (2026-07-30)

| Gap | State | Detail |
|---|---|---|
| **Custody** | **CLOSED, one line** | chattel shipped; `ChattelMixin` needs to reach the Creature stack (§2 above) |
| **Individual persistence** | **mostly CLOSED** | `PersistableMixin` is *not* Avatar-only (a `ConsignmentShelf` and a `DormRoom` compose it), and multi-instance `(scope, key)` hosts shipped with the leased dorm room. No NPC composes it yet, but nothing in it is Avatar-shaped |
| **Soil / reserves on a place** | **CLOSED, no new substrate** | `SealedCellar extends ReservedMixin(CartesianLocation)` already holds an `air` reserve on a room |
| **Maturation** | **REAL — the shared gap** | `Organism.age` + `lifecycleState` are persistent fields with *no driver*: `setAge` has zero callers anywhere, and `lifecycleState` only ever transitions to `dead`. `ageCurve` is a reserved comment in `lib/species/Species.ts`. Contained build; forced by ranching (calf→cow) |
| **Reproduction** | **REAL, attachment points ready** | `SexedMixin` composes into every Creature; `Species.reproductiveMode` is authored + persisted but has **no reader**. Gestation/offspring/breeding: absent |
| **Genome / genetics** | **ABSENT** | net-new, and husbandry-wide (above) |
| **Yield tap** | **ABSENT** | net-new; `Stock.reset()` is the shape to copy |
| **Fear / threat axis** | **ABSENT** | regard is the only attitude axis. The `dread` condition's `observableSigns` is a good precedent for behavior-legible inner state. Partial reuse only (herding, predation) — not central to ranching |
| **Follow / flee brains** | **ABSENT** | `wanders.ts` is the template (claims `body`, yields to `attention`) |

---

## Open questions (for the deep pass)

- **Disease [the biggest open call].** The most pedagogically interesting
  mechanic here (density-dependent transmission is a genuine tension against
  stocking for yield) **and** the one most likely to make a cozy loop feel
  punishing. Ships in v1, or waits for a wave?
- **Where yield lives** — a `Produces` mixin on the animal, or a ranch-level
  production tap? Per-head vs per-herd accounting under the aggregate density.
- **Breeding model** — gestation over `WorldClock`; offspring inheriting species
  + genome; how much of the `R = h²S/L` depth lands in v1. **Live tension
    (2026-07-31):** a game year is **30 real days**, so a realistic multi-year
    cattle generation interval is a **two-real-month** investment. The term that
    makes animal breeding pedagogically interesting is the same term that could
    make it unplayable — likely answer is compressing livestock maturation
    relative to reality (a game-cow matures in one game year).
- **Herd UX** — what `look` shows for an aggregate herd; how you count, split,
  and pen it. *(Promotion out of the aggregate is now answered — records earn
  identity; see Pedagogy. Demotion back down is still open.)*
- **Slaughter tone** — the meat path's ethics/economics.
- **Land dependency** — does ranching wait on the parcel/tenure substrate, or
  ship with the thin custody v1 above? *(Lean: chattel covers the stock; the
  land rides whatever farming does.)*
- **Sequence with farming** — the feed loop wants both halves to be meaningful.
  The [launch worklist](../../launch-worklist.md) ranks farming as an
  economy-blocking extraction faucet and schedules ranching to ride the farming
  session; that ordering still looks right. **Note the land-use model now makes
  the dependency sharper: pasture *is* farming's field-room + soil reserves, so
  ranching cannot ship its signature verb before farming's plot model exists.**

### Deferred to a running game (calibration, not design)

Residual + recovery thresholds, the utilization penalty a hired cadence gives
up, feed-conversion constants, winter length vs intake. Same deferral farming
made for its rates and curves — these want live play to tune against.

---

## Scope guardrails

- **Reuse the husbandry base; don't fork it.** Custody, the clock, maturation,
  persistence, and the genome are shared with pets and farming — build them
  once, for all consumers. **Don't build a custody edge a hundred cattle can't
  reuse.**
- **Livestock are systemic, not carves.** The deliberate inverse of the "NPCs
  are expensive carves" rule — a herd is data-driven and fungible; do not
  hand-author individual cattle. Slotted breeding stock is the *exception* the
  dial allows.
- **No new module categories.** Yield/breeding are mixins + a production driver
  on existing tiers; the ranch is a `Business` + Location; verbs are ordinary
  YAML+controller pairs.
- **The economy stays conserved.** Yield is a *transform* (feed → product), not
  a faucet.
