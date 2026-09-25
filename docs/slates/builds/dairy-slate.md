# Dairy slate — the source with no sink, and the first business you cannot run alone

> **Status: UNBUILT** — the *tap* ships: `milk` verb, `ProducingMixin`, the
> milk material and its expire-behaviour lactation
> ([ranching.md § The taps](../../subsystems/ranching.md)). **Nothing
> consumes milk** — verified, zero recipes take it.
> **Left:** the dairy as a business (the hourly tap and the hired hand) ·
> pasteurization on the shipped kill curve · cheese as a maturation profile
> with whey as the lees · butter and cream as mechanical process · the
> per-species varietal · hygiene as the criterion (silent contamination
> harming a stranger) · the goat gap · fluid milk once the cold chain exists
> **Size:** a build

> **Captured 2026-09-25**, in the design conversation after the extraction
> build merged. Opened by the user: *"I wanna pivot to ranching but
> specifically I wanna talk dairies"* — ranching was one of the first RGOs
> shipped and a lot of it was never covered.

Substrate: [ranching.md](../../subsystems/ranching.md) ·
[spoilage.md](../../subsystems/spoilage.md) ·
[maturation.md](../../subsystems/maturation.md) ·
[thermal.md](../../subsystems/thermal.md) ·
[employment.md](../../subsystems/employment.md) ·
[behavior.md](../../subsystems/behavior.md) ·
[accountability.md](../../subsystems/accountability.md) ·
[ranching-slate](./ranching-slate.md) ·
[cold-chain-slate](./cold-chain-slate.md) ·
[rgo-unification-slate](./rgo-unification-slate.md).

---

## Why build it: the game's own lens doc names this exact failure

`milk.yaml` ships. The `milk` verb ships. `ProducingMixin` ships. And
**nothing in the game consumes milk** — every recipe checked, zero take it.

`design-lenses.md` uses that as its own worked example of a bad economy:
*"a source with no sink (**a byre producing milk nothing takes**)."* The lens
doc is describing this repo's actual state.

And the material row already states the thesis and the fix:

> *"⭐ It is where dairy becomes a BUSINESS rather than a store cupboard.
> ⚠ It keeps for hours. That single fact is why every dairying culture
> invented cheese, butter and yoghurt, and it is why milk lands on the
> shipped fermentation substrate rather than in a sack: **what you do with
> milk you have to do today.**"*

⚠ Milk deliberately lives in the **commons** (`/stuff/idea/material/food/`),
not under `/trade/ranching` — *"milk is a fact about mammals and not about
the trade. A cow gives it whether or not anybody is ranching."*

## ⭐⭐⭐ The dairy is the first business that cannot be run alone

`ranching.md` already calls the dairy cow *"a tyrant"* and says *"a player's
real-life cadence honestly decides what they can keep."* Put the clock on it:
at 12×, a game day is 2 real hours, so **twice-daily milking is every real
hour.**

Nobody plays that. But the honest conclusion is not to soften the cow:

> **Every other trade scales down to one person working when they feel like
> it. A dairy herd does not.**

So dairying becomes the **first genuine forcing function for employment** —
not an opportunity to hire, a requirement. The substrate is shipped:
positions, rosters, shifts, wages, and the hired-hand cadence with its
utilization penalty that [ranching-slate](./ranching-slate.md) already
designs. It is also just true: dairying is historically where family labour,
and then wage labour, concentrated, for exactly this reason.

The shipped softening then does the right job — milk's tap behaviour is
**expire**, and neglect means *"she dries off for that lactation — a large
**slope**, not a cliff."* Missing milkings costs yield gradually, so the
punishment for being human is **money**, not a dead animal.

### ⭐ Delegate the throughput, never the judgment

User direction, 2026-09-25: *"we can have npcs milking cows for us if need
be."* Accepted — brains live in packs under `src/behavior/` and the cellars
brain is the precedent for a cadence-driven one.

⚠ But it changes what the dairy *is*: if an NPC pulls the tap, the dairy
stops being a time obligation and becomes a **wage**, which is correct — that
is what employment is. The difficulty then has to live somewhere else, and
there are two honest homes:

- **Capital** — the herd, the vat, the press, the cellar. A dairy is
  expensive before it earns.
- ⭐ **Judgment, which stays yours.** The hand pulls the tap; *you* decide
  whether that animal is off her feed, when the curd is ready to cut, and
  whether today's milk is pasteurized or made into something. This keeps
  lens 4 intact — a player who hires well and reads their animals runs a
  better dairy than one who merely pays more, and the difference shows up in
  **grade**, not volume. It is also already the project's line on delegation
  twice over (*delegation is first-class, and itself a lesson*; delegation
  **steers**, it never transfers).

## ⭐⭐ Dairy is where the whole preservation stack becomes load-bearing

Three shipped mechanisms get their most demanding consumer at once:

1. **The freshness clock** — `μ = μ_max · f_T · f_aw`. Milk is the fastest
   clock in the game, and it is temperature-driven, so a cool room already
   helps with no new code.
2. **Silent contamination** — `ContaminableMixin` is event-seeded, reported by
   no sense, with its own kill curve and spore floor, and **butchering is
   currently its only source.** Raw milk is the other famous one: a second
   source, zero new mechanism.
3. ⭐⭐⭐ **Pasteurization IS the shipped kill curve.** `spoilage.md` models
   the kill as an Arrhenius **rate held for a recipe's `holdS`**. That is
   literally pasteurization: **72 °C for 15 s, or 63 °C for 30 min** — two
   points on one equation, which is also the epoch ladder (boil it → the vat
   → HTST). The most consequential public-health technology in history, and
   the model for it already ships.

⭐ **And the twist that makes it teach: pasteurizing kills the culture too**,
which is why cheesemakers re-inoculate. The culture machinery is shipped
(`wine-culture`, `ale-culture`, `levain-culture`, and the `requiresFlora`
strain gate). "Sterilize, then deliberately re-introduce one organism" is the
clearest available statement of what fermentation actually is.

⚠⚠ Same shipped trap as every microbial profile: **a profile with no strain
authored does nothing, silently** — two shipped profiles (retting, bleaching)
were frozen that way before the extraction build caught it.

## Cheese is a maturation profile, and whey is already the lees

The `MaturationProfile` shape fits almost suspiciously well:

| cheese needs | the shipped field |
|---|---|
| milk in | `inputCategory` |
| a culture | the strain gate / `requiresFlora` |
| a temperature band | `stallBelowK` · `happyK` · `damageAboveK` · `killK` |
| curd out | `productMaterial` |
| **whey out** | **`leesFraction` / `leesMaterial`** |
| spoiled instead | `turnedMaterial` / `turnDays` |

⭐ Whey as the lees split is the good one — and whey has a real use, **pig
feed**, so it loops back into ranching instead of being a disposal problem.
(Ricotta is the second recipe on the same byproduct.)

Aged cheese then behaves like mead: months in a cellar, `MaturingMixin` on
the vessel, the work boards, and **capital tied up** — sell the milk today,
or lock it into something worth more in a month.

## Butter is not a ferment, and the distinction is worth shipping

- **cheese** = a maturation **clock**, microbial, you wait.
- **butter** = a crafting **act**, mechanical, you work (a churn).

⭐ That teaches a real difference between a process and a transformation, and
it comes free from putting each on the substrate that actually fits.
Buttermilk falls out as the byproduct. **Cream separation is physical** —
gravity-set pans, then a separator: another clean epoch ladder.

## Varietal comes from the species, not a list

`nutrientAmounts` sits on the material (cow: `fat 34000, protein 33000,
sugar 48000, water 870000`). Sheep milk is far richer, and `ovis aries`
already ships. So **per-species milk is a row, and cheese yield and character
derive from its fat and protein** rather than being enumerated — sheep's-milk
cheese differing from cow's is a computed fact.

Grade runs end to end as it does from the smelt: the tap rate already scales
with `flesh`, so body condition → milk grade → cheese grade.

⚠ **The goat gap.** There is no `capra` species row. Goats are the
smallholder's dairy animal and the on-ramp below a cow, so this is probably
the first content to add.

## ⭐ Epochs: the dairy does NOT need the cold chain

[cold-chain-slate](./cold-chain-slate.md) is unbuilt and is a whole build
(*"the cold mirror of the fuel → fire → furnace chain"*), deferred out of
clinical medicine on 2026-09-24, listing blood, food and pharma as its first
consumers.

Dairy would be a fourth consumer but **not a prerequisite**, and the reason
is the lens-5 answer: pre-refrigeration dairying invented cheese *because*
there was no cold. **The medieval rung's answer to "milk keeps hours" is
transformation, not refrigeration.**

⭐ Which gives the cold chain a lovely later role: **it turns the cheesemaker
into a milkman.** Once milk can be held cold, fluid milk becomes sellable to
a town and the whole business changes shape with no change to the mechanism.
Same machine, different dynamics.

## Governance: the first trade where your negligence harms a stranger

Spoiled food you eat is your own problem. **Milk you sell is not.**
Contamination is silent and event-seeded, so a dairy is where a producer can
harm a stranger without either of them knowing — which makes it the
**accountability ledger's natural second consumer**, and the honest basis for
inspection.

That is also the real history: milk is where food regulation was invented. So
a polity licensing dairies, or a court hearing a case about one, is a
**tier-C** criterion arriving because the simulation produced the problem
first. **Nobody has to invent demand for a health inspector.**

## Lens pass

1. **Pedagogy** — `stockmanship` already ships and is the animal-reading
   Discipline; the dairy's own knowledge is the **kill curve** (time ×
   temperature), which is derivable and among the most useful real facts the
   game could teach. Yield derives from flesh and feed; cheese yield derives
   from fat and protein.
2. **Expression** — cheeses are **rows on one profile shape**, and the
   varietal axis is the species row, so a new dairy animal is a new cheese
   family with no code. A creamery is a **venue binding**, not a pack.
3. **Immersion** — no gauge: you read the animal (body condition), the milk
   (it smells, it turns) and the curd (it sets, you cut it when it does).
   ⚠ The one hazard is the dairy reading as a spreadsheet of volumes; the
   answer is that every read is a perception, not a number.
4. **Values** — **the forced choice is what today's milk becomes**, made
   daily under a clock that does not wait, plus whether to pasteurize (safety
   against character — a real trade-off, not a dominant option). Standing is
   conferred by the people who buy your cheese twice.
5. **Epochs** — pail → vat → separator → HTST → refrigerated tanker. The
   mechanism (a rate held for a time) never changes; ⭐ cold converts the
   cheesemaker into a milkman.
6. **Economy & governance** — **produces** milk, cheese, butter, cream, whey
   (→ pig feed), and **employment**; **consumes** feed, fuel for the kill
   step, vessels, cellar space, and labour. **Who pays:** whoever buys the
   cheese — and, distinctively, the dairy **pays wages**, because it cannot
   staff itself. **Demand existed first** in the strongest possible sense:
   the supply already ships and nothing takes it. **Who can be wronged:** the
   person who drinks contaminated milk — criterion: the shipped
   contamination event; appeal: the accountability ledger, and a polity
   inspection regime as tier C.

## Open questions

1. **Can the shipped hired-hand cadence actually cover an hourly tap?** The
   ranching slate designs a cadence with a utilization penalty; whether it
   sustains 24/game-day attendance is unverified.
2. **Does the dairy want its own Discipline**, or is it `stockmanship` plus
   the kill-curve knowledge? (Cheesemaking may be a separate craft
   Discipline; the trades register has unminted candidates.)
3. **Where does cheesemaking live** — `trade-ranching`, or its own
   `trade-dairying`? The trade-is-the-process rule suggests the latter, since
   the cheesemaker need not keep the cow.
4. **The goat** (`capra`) — ship it here?
5. **Yoghurt and soured milk** — one more profile row each, or out of scope?
6. **Does `ProducingMixin` get promoted before or during this build?** See
   [rgo-unification-slate](./rgo-unification-slate.md).

## Not in this slate

- **The feed loop** — grazing demand, feeding a head, hay, the winter-feed
  budget. Owned by [ranching-slate](./ranching-slate.md); a dairy makes it
  urgent (a milking cow's intake is the largest in the roster) but it is not
  this build's.
- **The paddock move and fencing** — ranching's, and now unblocked by the
  enclosure work landing on `design/envelope`.
- **Breeding** — ranching's; note a dairy cow must calve to lactate, so the
  two couple, and `breed` currently writes SERVED only.
- **Cold production and storage** — [cold-chain-slate](./cold-chain-slate.md).
