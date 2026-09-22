# Ranching slate (working doc) — livestock, husbandry, and the animal economy

> **Status: PARTIAL** — the farmstead build shipped the keeping: the
> herdbook, pasture-as-field, boundary acts, handling, the taps, the
> carcass yield (tallow · hide · bone · meat) and the hazards (hay fire ·
> slurry pit · fox) → [ranching.md](../../subsystems/ranching.md).
> ⚠ The intake side is unwired — nothing grazes (no class declares
> `grazingDemandPerGameDay`) and nothing feeds a head (compacted
> 2026-09-19; ledger `docs/plans/slate-compaction/ranching.md`)
> **Left:** the feed loop — grazing demand on the animal, a way to feed a
> head, hay as the stored form, the winter-feed budget · the paddock move
> — `move herd`, paddocks as subdivided fields, the open gate resolved at
> reconcile, fencing as a bound, the hired-hand cadence with its
> utilization penalty · breeding (gestation · birth · heredity; nothing
> writes `bornAt`, no `dam` column; the husbandry-wide genome, also kept
> in farming-slate) · the nutrients coupling's byre half — muck → midden
> → field (owned by `return-leg-requirements.md`) · bees — the hive,
> pollination, forage range, swarming (AC 14 unmet) · the training/skill
> axis (working-animal transcripts; beside pets) · disease (owned by
> disease-slate — the husbandry-is-immunity coupling) · herd UX (what
> `look` shows for a herd; count, split, pen) · the Tier 3 criteria (AC
> 36–47 — the record read by a buyer, agistment and stud service over
> contracts, a market day, joint capital, profits à prendre)
> **Size:** a build

> *Seam note (2026-09-03) discharged: the carcass comes apart into named
> materials — tallow, hide, bone, meat — scaled by condition, and culling is
> a decision because a carcass is worth something
> ([ranching.md § What the carcass opens onto](../../subsystems/ranching.md)); no knacker, tannery or
> chandler was authored. The chain is [rendering-slate](./rendering-slate.md)'s.*

See also: [farming-slate](../tails/farming-slate.md) (**the primary sibling** — same
guild, same production family; the feed loop + the shared genome) ·
[pets-slate](./pets-slate.md) (the *substrate* sibling — an owned animal, but a
different experience; see The family placement) ·
[fishing-slate](./fishing-slate.md) (aquaculture is ranching's aquatic casting;
`BodyPlan`→parts on cleaning is settled there) ·
[mining-slate](./mining-slate.md) (the commons-renewal counterpoint) ·
[stewardship-slate](./stewardship-slate.md) (**the gate** — land use decides
whether a parcel admits livestock and how many head; the allowance cascade
decides how much liveness the locality funds) ·
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

*The pet/livestock table is superseded: the individual is the base case
([ranching.md § The individual is the base case (D19)](../../subsystems/ranching.md)), a pet is a
`Creature` rung and not a `Character` ([pets.md](../../subsystems/pets.md)),
and the split is three ROLES on capabilities rather than two engine tiers
([ranching.md § Three ROLES](../../subsystems/ranching.md)).*

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

*One shared substrate under two distinct experiences* — realised and
documented: `KeptAnimal` is a rung over the same `Creature`, custody /
handling / persistence are kernel and identical, and the split is three
ROLES on capabilities where bond and yield part completely
([pets.md § The shape of it](../../subsystems/pets.md),
[ranching.md § Three ROLES](../../subsystems/ranching.md)).

---

## The five shared conventions **[DECIDED]**

These bind ranching, farming, and pets alike. Build them once; do not fork.
Conventions 1–4 are **substrate**; convention 5 is the **design** they all run.

### 1. Where identity lives — one density dial

*Shipped — the individual is the base case and the herd is a filed RECORD,
each head drafted by `(herdId, index)` and returned into a sparse overlay:
[ranching.md § The individual is the base case (D19)](../../subsystems/ranching.md), § The herdbook
(D20, D79, P4), § Draft and return (D21).*

### 2. Custody — `ChattelMixin` on the Creature stack

*Shipped — `ChattelMixin` + `BrandedMixin` compose on `Creature`
(`lib/creature/Creature.ts`); [ranching.md § Ownership, and the two
one-liners (D22, D98)](../../subsystems/ranching.md). The herd titles on the record
(`HerdRecord.holderRef`); a drafted head titles per instance.*

### 3. The clock — nothing freezes but the body you inhabit

*Shipped — [husbandry.md § The clock rule](../../subsystems/husbandry.md)
(owned things reconcile against world time; no far-past guard) and
[ranching.md § Condition — `flesh`](../../subsystems/ranching.md) (the guard narrowed to bodies
nobody owns, read through the chattel stamp — `Metabolic.integratesLongAbsence`).
The pets-slate's "offline = freeze" line is retired there.*

### 4. Yield — two shapes, not four systems' worth

*Shipped — the standing tap as `ProducingMixin`, copying `Stock`'s reset
sweep and never its `par` ([ranching.md § The taps (D25, D93)](../../subsystems/ranching.md)); the
terminal harvest as `butcher` (§ slaughter).*

### 5. One care model, three outputs **[ADDED 2026-07-31, pets session]**

The cleanest statement of what the family actually *is*:

> **Every living thing you keep has needs. Meeting them well produces a better
> outcome. Only the *outcome* differs.**
>
> | Kept thing | Outcome that **differs** | Outcome they **share** |
> |---|---|---|
> | **Plant** | `Grade` — harvest quality | ⭐ **resistance** |
> | **Livestock** | yield **+** `Grade` | ⭐ **resistance** |
> | **Pet** | capability **+** bond | ⭐ **resistance** |

> **The shared column** *[amended 2026-07-31, disease session]*. The section
> title counts the outputs that **differ**; resistance is the one all three
> **share** — so it is a fourth *column*, not a fourth row.
> [disease-slate](./disease-slate.md) found that the resist substrate's
> susceptibility factor reads **live off host state**, so **the condition score
> this care model already computes becomes the resistance term**:
> **good husbandry *is* immunity.** That makes disease a consequence of care
> quality rather than a dice roll, and it means care produces a *fourth* output
> alongside yield, `Grade` and bond — the same input, one more consequence.
> (The section title's "three outputs" names the three that *differ*; resistance
> is the one they **share**.)

So the *practice* is genuinely shared, right down to the daily act: **the
rancher scoring body condition and the owner noticing the dog's coat are
performing the same read** — and since body-condition scoring is natively
banded in the real discipline, it is the same *surface* too.

**Common to all three:** food · water · warmth · safety · energy partitioning ·
the maturation driver · the genome · reconcile-on-read · forgiveness · the
one-interaction-per-login cadence.

**Pet-only, exactly two things:** an **attention** need, and an outcome that
**cannot be delegated**. That is the whole divergence, and it is why the
automation ladder's limit (*assets, never relationships*) is the same statement
as this one.

**The houseplant sits where you would predict** — the three material needs and
*not* the fourth. The plant is the pet minus the relationship, which is exactly
why it is farming's on-ramp: it teaches the entire care model with the
un-delegable part removed.

**One real divergence, not a shared mechanic:** **livestock care is measured in
aggregate; pet care is measured per head.** You body-condition-score a herd by
sampling; you notice *one* dog. That is the density dial (§1) showing up in the
daily act — and it is why the same practice feels completely different at the
two ends of it.

Detail on the pet end — the acts, the accept/refuse rule, and
care-quality-decides-what-it-becomes — lives in
[pets-slate § Bonding + needs](./pets-slate.md).

---

## The automation ladder — and the one thing it can't do

*Documented — [ranching.md § Working animals (D40–D42)](../../subsystems/ranching.md): the ladder
attention → wages → compute, the dog as its fourth rung, and *automation
maintains your assets; it cannot maintain your relationships*. The rung table
with its open rungs is [farming-slate § Maintenance & the automation
ladder](../tails/farming-slate.md)'s; the compute meter is
[property-slate](./property-slate.md)'s.*

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

*Shipped — `Metabolic.partitionFlesh` runs LAST in the slice so production
dies before condition; cold stress spends satiation (`ThermalRegulation`);
[ranching.md § Condition — `flesh` (D24, P7)](../../subsystems/ranching.md), where the why (two
optimisation idioms on one reconcile engine) was graduated 2026-09-19.
⚠ The cascade's INPUT is not built — nothing feeds or grazes a head (see
`Left`); the reproduction leg is § Breeding's.*

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
- ~~**Butchering / slaughter → crafting inputs.**~~ Shipped, tone settled — [ranching.md § slaughter](../../subsystems/ranching.md).
- ~~**Predators vs the herd**~~ shipped as the `raids` brain (the fox) — [ranching.md § Hazard (D45–D52)](../../subsystems/ranching.md).

---

## Land use — pasture **is** a field **[DECIDED]**

*The land-use table and its D7 correction: shipped — [soil.md § The sward, and
the land uses nobody declares (D7)](../../subsystems/soil.md); there is no `use` field, and grazing
and `mow` are the same draw on the same sward. ⚠ The *graze* row has no mouth
yet — nothing declares grazing demand (see `Left`).*

This makes **hay mechanically necessary rather than an authored recipe.**
Grazing is far the most efficient path — no cutting, no hauling, no storage
loss, the animal works for free — but you cannot bank it. Hay is strictly worse
per unit and exists for exactly one reason: **it is the only form of grass you
can keep until February.** The winter-feed problem is therefore an honest price,
not a tax the game invented.

### The soil consequence — why rotation emerges

*Shipped — `Field.cycleGrazedNitrogen` / `onSwardIntegrated` (a grazing mouth
returns organic matter in place; `mow` and a crop export), `rotation.test.ts`;
[soil.md § The sward (D7)](../../subsystems/soil.md). ⚠ In play the in-place branch never fires
yet: no class declares `grazingDemandPerGameDay` (see `Left`).*

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
clock](../tails/farming-slate.md).

### The move is a *read*, not a timer

*Shipped on the sward side — `trade-farming/src/lib/Sward.ts` (move at
residual, return at recovery; growth varies with rain, season and stocking) and
the `look` band (`SWARD_BANDS`); [soil.md § Residual and recovery (D9)](../../subsystems/soil.md).
⚠ The instrument read (a sward stick with error bars) and the move itself are
not built.*

### Failure is two-sided in both directions · every failure is a slope

*Shipped — [soil.md § Residual and recovery (D9)](../../subsystems/soil.md): overstocking and
understocking are both faults (`grazed-out` · `ahead-of-them`), the bands say
which, and overgrazing is a recovery-rate penalty — never a dead field, never a
dead herd (`Sward.ts`). ⚠ Exercised by `mow` only until something grazes.*

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
navigability](../tails/farming-slate.md)) · **compute allowance** (each paddock is a
room, and the property substrate prices persistent simulation, so subdividing
spends the game's real scarcity currency) · **attention** (the whole point) ·
**the clock** (above — residency below ~a game week can't be hand-run). A player
who subdivides absurdly pays in all four. **No maximum needs writing down.**

### Paddock = room, not slot

*Superseded by the code: `Field` composes `SoilMixin` + `SwardMixin` directly
(no `Floor` surface-bulk), and the mouths are the field's OCCUPANTS —
`Field.swardGrazingDemandPerGameDay()` sums `grazingDemandPerGameDay()` over
`getContents()`. ⚠ No class declares that method, so the seam is open on the
animal's side (see `Left`).*

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

**The shared genome.** [Farming](../tails/farming-slate.md) already claims the
`Genome` / reaction-norm genetics layer is **husbandry-wide**, not crop-only: an
animal has a `Species` + `BodyPlan` + vital-profile parameters, and
genes-as-reaction-norms bend *those* curves exactly as they bend a crop's
`GrowthParams`. Build it once, for crops and livestock both. The only divergence
is the surface verb (`pollinate` vs mate/gestation over `WorldClock`) and which
parameter set the genome bends. **Aquaculture is the third consumer** (fishing
names it explicitly), and pet breeding is a latent fourth.

*One catalog shape — shipped: the `Species`/`Clade` tree carries `animalia`
and `plantae` alike (25 crop rows in `trade-farming`, the roster in
`trade-ranching`'s `species/` tree); [race.md](../../subsystems/race.md).*

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

*Two of the discipline's own conventions shipped as written: body-condition
scoring is a band by eye and a number by hand (`handle`), and records earn
identity — [ranching.md § `handle` — precision costs an act (D24)](../../subsystems/ranching.md),
§ Draft and return (D21).*

*The `R = h²·S / L` payoff: [ranching.md § Breeding (D26)](../../subsystems/ranching.md) and § Breeding below.*

---

## Breeding — everything we know **[the follow-on's brief]**

*(Written 2026-09-05, after the farmstead build shipped `breed` and it was
cut back to honesty. This section is the design; the shipped surface is
[ranching.md § Breeding](../../subsystems/ranching.md).)*

### What shipped, and what it is allowed to claim

*Shipped and documented — [ranching.md § What `breed` does: it writes SERVED](../../subsystems/ranching.md)
carries the three traps of the first cut (gestation announced not modelled ·
heredity claimed and absent · offspring born adult) and the daylength refusal
that the follow-on must not redesign.*

### ⭐⭐ The two axes, and they are separable

**Time** and **genetics** are different builds' worth of work and they do
not depend on each other. Either can land first.

#### Axis 1 — time (gestation, birth, the generation interval)

The seams exist and are deliberately unwritten:

| seam | shipped | what breeding does with it |
|---|---|---|
| `HeadOverlay.served` | ✅ written by `breed` | the clock starts here |
| `HeadOverlay.bornAt` | ✅ read, never written | `calved` writes it; a head with one is as old as the time since |
| `HerdRecord.foundingMeanAgeDays` | ✅ | founding stock ages from here + elapsed |
| `Species.BreedingSpec.gestationDays` | ✅ authored | the wait |

⭐ The birth itself should be **reconcile-on-read, not an event** — the
house pattern everywhere else in this build. A herd read after
`served + gestation` has calved; nobody schedules anything, and a herd
nobody looks at costs nothing. The tally grows and the new indices carry
`bornAt`, which the age derive already reads FIRST, so a lamb is a lamb
at the draft with no special case.

⚠ **Two things the tally cannot express and the follow-on must decide:**
a birth that failed, and a dam that died carrying. The overlay is the
place for both (it is already the herd's sparse memory), and *"she did
not hold"* must be a possible outcome or the season gate is the only
risk in the whole loop.

⭐⭐ **The generation interval `L` is the payoff**, and it is why this is
worth building at all: the animal breeder's equation is **`R = h²·S / L`**
against farming's `R = h²·S`. That single divided term is *why* animal
breeding is slow, why selection intensity matters more when a generation
costs seasons, and why the Grange's two halves are one discipline taught
at two speeds. **A gestation you can feel is what makes `L` legible.**

#### Axis 2 — genetics (heredity, and what selection can actually move)

⚠⚠ **Do not re-do the note-in-the-overlay version.** Parentage that
nothing reads is worse than no parentage, because it reads as designed.

The shape is already decided elsewhere and this build must consume it,
not fork it: the **shared genome / reaction-norm layer is
husbandry-wide** (§ The farming coupling), genes bend the same curves for
a crop's `GrowthParams` and an animal's vital-profile parameters, and
**aquaculture is the third consumer with pet breeding a latent fourth**.
Build it once.

What ranching adds on top:

- **`dam` is the herdbook's second ruled column and it is not written
  yet.** Parentage belongs on the record, because the record is what a
  BUYER trusts (D79) — a pedigree the seller can edit is worth nothing.
- **Heritability `h²` must be per-trait**, or selection is a single
  slider. Frame and yield are moderately heritable; temperament less so;
  condition is almost entirely management. That spread *is* the lesson —
  a keeper who tries to breed their way out of bad feeding should fail.
- **The seeded head is the floor, not the ceiling.** `HeadSeed` gives
  every head a stable character from `(herdId, index)`. Heredity replaces
  the *seeding function* for born heads while founding stock keeps
  theirs — so a herd has a founding population with variance, which is
  exactly what selection needs to bite on.

### ⭐ Records are the selection game

Already decided in § The five shared conventions, and breeding is what
makes it true: **you promote an animal out of the aggregate herd into
individual identity precisely when you start recording it as a selection
candidate.** *Identity is earned by being measured.* A keeper who never
drafts, never handles and never writes anything down cannot select,
because they do not know which one is the good one — and that is the
honest reason the herdbook exists rather than a UI for it.

### Scope note

⚠ Breeding is **its own build**. It is not a wave of something else: it
needs time, it needs genetics, it needs a failure mode, and it touches
farming and pets through the shared genome. The farmstead build's
contribution is the season gate, the maturity gate, the record, and four
named seams — and the discipline of having cut the rest rather than
shipping a claim.

---

## Gap map — verified against the code (2026-07-30)

*Retired 2026-09-19 — superseded by the shipped state ([ranching.md](../../subsystems/ranching.md)):
custody, the yield tap, soil-on-a-place and individual persistence closed;
maturation shipped as derived age + `Species.ageCurve` life stages
(`Organism.getLifeStage`, `Species.massAt`); reproduction is `breed` → SERVED
only. Still absent: the genome (§ Breeding, Axis 2) and the fear/threat axis
([pets-slate](./pets-slate.md)'s `Left`); `follows` / `herds` / `raids` brains
ship, a flee brain does not.*

---

## Open questions (for the deep pass)

- ~~**Disease [the biggest open call].**~~ **DESIGNED 2026-07-31 →
  [disease-slate](./disease-slate.md)**, which owns it (the husbandry-is-immunity
  coupling and density-as-transmission are in its `Left`).
- ~~**Where yield lives**~~ resolved: `ProducingMixin` on the animal — [ranching.md § Three ROLES](../../subsystems/ranching.md) (the verb table).
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
- ~~**Slaughter tone**~~ resolved: sober and complete — [ranching.md § slaughter (D28)](../../subsystems/ranching.md).
- ~~**Land dependency**~~ resolved: the stock rides the chattel stamp on `Creature`; the ground is `trade-farming`'s.
- ~~**Sequence with farming**~~ resolved: shipped riding the farmstead build; `trade-ranching` depends on `trade-farming`.

### Dependency — the time-parameterised weather resolve

*Superseded by the code: `WeatherApi.precipitationBetween(t0, t1, locality)`
shipped — [weather.md § precipitationBetween](../../subsystems/weather.md).*

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

---

## ⭐ Tier 3 criteria, salvaged from the retired farmstead plan

*Extracted 2026-09-06 when `farmstead-plan.md` was retired. Deferred design does not live in a plan — the plan is an
execution artifact and gets deleted at the sweep; this is the
surface that outlived it. Verbatim below.*

### Tier 3 — the criteria this MR does NOT gate

⚠ **Salvaged verbatim from the requirements doc at `/finalize`**, which
retires. The requirements said outright that it was keeping these *"so the
follow-on build inherits them rather than re-deriving them"*, so retiring
the doc without moving them would have thrown away the one thing it asked
to keep. They gate the tier-3 build, not this one.

```
36. A coppice stand is cut and regrows on a rotation, and a single stand cannot
    simultaneously satisfy charcoal, mine timber and winter firewood — the
    contest is observable.
37. A saltern yields salt as a function of weather over elapsed time, with no
    plant involved; brine boiling yields it faster and consumes fuel that
    heating and charcoal also want.
38. Cut peat does not measurably regrow, and a drained peat field subsides.
39. A flooded bog can be harvested by flotation, and draining ground upstream
    changes water reaching ground downstream.
40. A right to take produce from land somebody else holds — grazing, mast, wood,
    turf — is expressible and enforceable without transferring title.
41. No spell, item or working improves a field's fertility, waters a field, or
    warms one at production scale; attempts are priced out by the shipped price
    list rather than refused by a special case.
42. A caster can read soil and animal condition as instrument-tier readings with
    error bars, and can quiet an animal — and doing so requires being present at
    the thing read.
43. An animal's record is readable by a prospective buyer, not only by its
    keeper, and a recorded animal fetches more than an unrecorded one.
44. Two producers can trade hay, manure, stud service and grazing (agistment)
    through the contract substrate, including forward and in-kind terms.
45. A market day occurs on the calendar; prices at it are set by what sellers and
    buyers do rather than by an authored figure.
46. A specialist producer's output is measurably better than a generalist's, so
    buying beats making without anything being withheld.
47. An indivisible capital asset can be owned jointly and its use scheduled
    between the owners.
```

⭐ AC 41–42 (the magic negatives — no working improves fertility, waters or
warms at production scale; a caster reads instrument-tier with error bars
and must be present) are **this MR's** and are met by absence plus the
shipped price list, which is what D75–D78 asked for.

## Risks & opens

*Retired 2026-09-19 — the farmstead build's plan risks (compaction ledger:
`docs/plans/slate-compaction/ranching.md`). The pack dependency is declared
(`trade-ranching/package.json` → `@saxonberg/content-trade-farming`); the
read-side prefix check shipped (`HerdRegistry.ts`); the archetype is reported,
never enforced (`archetypes/byre.yaml`); bees were cut in the predicted order.
Tier 3's forward obligations are the criteria above.*
