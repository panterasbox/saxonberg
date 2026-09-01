# Fermentation — requirements

The liquid leg of the bar's supply chain: the **durative transform**
(ferment), the still's recipes, and the de-stubbing of winemaking and
brewing — so the wine, gin and vermouth on Dave's rail trace back to
grown fruit and honest chemistry instead of a census faucet. Seeded by
[supply-chain-slate](../slates/builds/supply-chain-slate.md) Parts 1 + 6
and [libations-slate](../slates/builds/libations-slate.md)'s ingredient
matrix; the requirements derive from the four core values — **pedagogy
and academic merit · author expressiveness and creative control ·
immersion and role-play · gamification and self-improvement** — and each
surface decision below cites the value it follows from.

The build closes the chain the martini walks (supply-chain Part 6): grow
→ crush → ferment → distil → fortify → bottle → the bar's shipped
recipe, with the independent producer (Crowsfoot) and the player-apex
arriving together.

## Goals

- **The durative transform exists** — a batch converts over game-time
  under conditions, with the reconcile-on-read / staged / own-checkpoint
  shape husbandry proved, and it is a **different mixin** from growth:
  *growth accretes, fermentation converts* (the user's ruling, captured
  in supply-chain Part 1).
- **The chemistry is a teachable mass balance.** Sugar → ethanol + CO₂
  off the fruit's actual sugar; ABV derived, never authored on a batch;
  temperature drives the rate; oxygen turns a finished batch. A player
  who measures can verify conservation.
- **The grape lane runs end to end**: grown grapes → must → wine →
  neutral spirit / fortification → vermouth; gin opens at the process
  tier over a bought-malt wash + juniper compounding. Dave's shipped
  martini recipe is made, unmodified, from lane output.
- **Authors mint fermentables from data.** A new drink (mead, cider,
  kvass) is template rows — an input, a ferment profile, an output
  material — with **zero kernel code**: the second-venue test applied to
  a second drink.
- **The producer NPCs work the lane** (the `farms`-brain shape): the
  winery and Crowsfoot produce on their own beats, so the chain runs
  DAU-independent; every verb they use is the player's verb.
- **The grade seam closes**: filling a receptacle from a batch carries
  the batch's band, so a player's `fine` gin is `fine` in the bottle and
  the bar's `minGrade` accepts it.
- **Mastery is knowledge.** The craft's skill curve is learning real
  bands and timing — read the vat, time the rack, hit the seal — with
  exercised Disciplines and the maker's mark carrying earned reputation
  onto every bottle.

## Non-goals

- **Aging / casks.** Nothing in the lane needs it (wine ships young;
  gin and vermouth don't age; whiskey is out of scope). It is the
  transform's obvious second profile when whiskey arrives — deferred,
  not forgotten.
- **Grain as a crop.** Stays with farming (locked here): this build
  buys **malt as a floor generic** (homed per D10 — the commons, until
  a malting trade earns its pack) — a deliberate, honestly-labelled
  stub upstream inside a de-stubbed trade, exactly what "stub" already
  means in this repo.
- **Cultured / pitched yeast.** v1 ferments wild (medieval doctrine);
  cultures are a later, historically honest tech rung on the discipline
  ladder.
- **Heads/hearts/tails cuts.** v1 distillation is one honest
  separation (heat + the still + time cost the activity, so the
  abstraction is legitimate); the cut is a later refinement rung.
- **De-stubbing trade-bottling.** Sodas need carbonation/pressure —
  its own physics, its own build. Ice stays bought bagged.
- **Fungible consignment (supply-chain Part 2).** Malt moves as
  sacks and liquid moves in receptacles — all discrete — so this build
  does not need it; it stays with the supply-chain middle.
- **The pharma/extraction branch, acquisition, brand politics
  mechanics.** Cited slates hold them.

## Surface decisions

### D1 — The transform is its own mixin, profile-driven — LOCKED

*(pedagogy · author control)* One new mixin (working name: the
fermenting vessel capability) with the husbandry shape: reconcile lazily
on read over game-time, staged, its own checkpoint, **no far-past
guard**. The driver is **temperature + time** (ThermalMixin ships), not
husbandry's min-of-four — different equation because the mass is already
present and what changes is what it *is*. Everything an author can vary
lives in a **ferment profile on the template row** (the
GrowthProfileData pattern): input material tags (sugar-bearing),
temperature band, conversion rate, product material, failure product.
The profile is the whole authoring surface — D4's second-drink test
checks it.

### D2 — The transform rides the VESSEL — LOCKED

*(immersion · substrate honesty)* The mixin composes on the vessel
family (vat / carboy over `Bulkable` + `Sealable` + `Thermal` + the new
capability), not on the liquid: bulk matter has no identity, vessels do
— the pot-as-bed precedent. The vat ferments whatever sugar-bearing must
its interior holds; ambient temperature reaches it through the room
(the cold cellar is a *place*, and storage is the skill — thermal's
second consumer).

### D3 — Oxygen is the trap; the seal is the skill — LOCKED

*(pedagogy — this IS the curriculum)* While sugar remains, the CO₂
blanket protects the wash — an open primary ferment is safe and
diegetically readable (it bubbles). When conversion completes, an
**unsealed** vessel begins converting ethanol → acetic acid; a sealed
one holds. "You have to be there to catch the batch" therefore means
**rack and seal when it finishes** — the airlock's real reason, taught
by consequence. The failure product is **vinegar**: a new material homed
in trade-winemaking (the process that makes it), bought by the cook —
the failure path still feeds someone (*everything is a business*).

### D4 — Derived numbers, discoverable curves, no rolls — LOCKED

*(pedagogy · uncertainty doctrine)* Starting sugar comes off the input
material (grape already authors `nutrients: [water, sugar]`); ABV =
starting sugar × fraction converted; the batch's state is a pure
function of its temperature history. **No resolutional randomness
anywhere** — the only uncertainty is what the player didn't measure.
The temperature/rate curve must be **discoverable by experiment** with
shipped instruments: two vats at two temperatures, gravity read over
time, different slopes per the authored profile.

### D5 — Reads: senses first, instruments for numbers — LOCKED

*(immersion · measurement doctrine)* Vat state rides the sense
channels: heard (bubbling = active, still = done), smelled (the
sharpening edge of a batch turning). Numbers cost an instrument: the
**hydrometer** joins the instrument shelf (the thermometer ships
already), per the instrumentation doctrine — readings are channels,
procedures are verbs; no floating gauges, the first screen is the
syllabus. (The shipped `gravity-meter` is geophysics kit — the
hydrometer is its own row.)

### D6 — Grade comes from the process; the seam closes first — LOCKED

*(gamification · symmetry)* A batch's band comes off its **worst
temperature stretch** over the active window — husbandry's worst-stretch
rule, second consumer, no new concept. And the load-bearing seam
verified missing (2026-09-01): nothing in `lib/bulk` carries grade on
transfer, so **filling a receptacle from a graded batch must stamp the
batch's band** (and the maker's mark) onto it, or every player spirit
arrives ungraded and `minGrade: fair` rejects the whole lane. Smallest
piece, built and tested first.

### D7 — Lane scope: grapes whole, malt bought, the convergence real — LOCKED

*(scope, user ruling)* The grape lane runs end to end with zero new
crops (A5 shipped grapes waiting). Gin and beer open at the **process
tier** over bought malt (`malt` = a floor generic sack). **Vermouth
must consume the distiller's spirit** — fortification takes neutral
spirit as a real input, so the vintner buys from the distiller: the B2B
relationship falls out of the chemistry, never authored. Beer =
mash bought malt → wort → ferment → ale/lager, closing brewing's
process tier the same way.

### D8 — Venues, cast, and the faucet discipline — LOCKED

*(immersion · role-play · never-half-grown)* Crowsfoot de-stubs as the
**working independent distillery** (the player-apex and the independent
producer arrive together, per the slate); the vintner floor becomes a
working winery. Their hands run producer brains (the `farms` shape:
literal player verbs, bounded, home in `finally`), shipped in their
packs on the capability rung. The stub floor product stays at target
until this build's own **atomic switchover wave** (farming's P0
discipline) — the bar never goes dry in the interim. Trade = mechanism,
locality = expression: a second winery anywhere needs zero pack code.

### D9 — Disciplines and the maker's mark — LOCKED

*(gamification)* Fermenting and distilling are exercised Discipline
leaves (the horticulture pattern — credit at the act, competence
derived on read). Batches carry the maker's mark through the seam
(D6), so a bottle is attributable and a reputation for `fine` is
earned, portable, and readable on the rail.

### D10 — Packaging: no trade-fermentation pack; siblings stay independent — LOCKED

*(taxonomy · pack doctrine)* **Fermentation is a process, not a trade**,
and the trades that ferment already have packs — so nothing new is
minted for it:

- **Kernel**: the transform mixin + profile type (`lib/` substrate —
  packs cannot ship mixins), the D6 grade seam, the shared **vat**
  concrete at `platform/thing/` (the `Crate`/`Bottle` precedent — one
  class every trade's rows name), and `docs/subsystems/fermentation.md`.
  The hydrometer row rides generic-objects beside the thermometer.
- **The trade packs absorb production** on the capability rung:
  trade-winemaking (press/vat rows, wine + vinegar materials and
  profiles, the working winery, a cellar brain in `src/behavior/`),
  trade-brewing (mash/wort, ale/lager profiles, its brain),
  trade-distilling (the Still's recipes, the wash tun, juniper
  compounding, and the Crowsfoot floor — the veshko-yard precedent).
  One MR ships kernel + packs together.
- **⭐ Sibling trades must not depend on each other.** Today
  trade-brewing (and every producing trade) depends on trade-distilling
  for exactly one reason: the consign target
  `/trade/distilling/thing/counter` — the cash-and-carry, which is
  **distribution infrastructure, not distilling**. This build removes
  that coupling: the distributor venue moves to a neutral home
  (recommended: a small `distribution` pack depending only on the
  platform, so every trade and locality can point at it without cycles
  — exact mechanics are the plan's). With it goes the malt question:
  **shared inputs whose owning trade does not exist yet live in the
  commons** — malt is base-library's until a malting trade earns its
  pack (the vocations demand test), at which point it moves out, the
  same direction of travel salt and coffee took.

### D11 — The carbonation boundary, and the still's hazards — LOCKED

*(pedagogy · never-half-grown)* **Carbonation is a fact about the
liquid, never about who made it.** It stays a material-level fact (the
shipped tag); vessel conditioning (this build's `sealedOnly` profile —
sparkling wine, and cask-conditioned real ale) is the first honest
PRODUCER of that fact, historically exact for the medieval rung. Forced
carbonation (CO₂ injection, pressure, the bottling line) is a different
process and stays trade-bottling's future de-stub — the sodas cannot
honestly fizz until it lands. Kernel guard: nothing may assume
producer == packager or carbonated == fermented-in-vessel; the
distribution seam keeps the division of labor growable.

**The still is hazardous the way it really is.** Fire ships now:
high-proof spirit materials author flammability and ride the shipped
combustion substrate — a spilled, ignited spirit burns. Methanol is the
deferred cuts rung's stake: profiles record the wash's foreshot
character now, and when cuts arrive, kept foreshots become a
metabolism toxin dose while pouring off the first draw becomes the
skill (still zero new verbs). Excise — the actual historical ban — is
polity CONTENT, not mechanics: a locality licensing stills rides the
civics/charter machinery when the fiction wants it.

## Constraints

- **Uncertainty doctrine**: no resolutional randomness; seeded, not
  drawn ([uncertainty.md](../uncertainty.md)).
- **Measurement doctrine**: no gauges; the mirror shows you, the feed
  hides the measurement ([measurement.md](../measurement.md)); check
  the instrumentation slate before designing any new read.
- **Medieval-tech doctrine**: everything here ships at the medieval
  rung; refinements (cultures, cuts, the ice machine) are later
  conferral-gated rungs, never authored ahead of demand.
- **Verbs are physical acts; operations are apps on displays** —
  crush/rack/seal/bottle are verbs; a cellar ledger is a display.
- **Materials are a closed set**; new materials (vinegar, malt, wort,
  must, neutral spirit if distinct) are authored rows in their owning
  trade packs; blends derive.
- **Module taxonomy**: pack classes ride the capability rung; a pack
  needing an Api needs a kernel MR — surface it in the plan, don't
  improvise. No new module categories, no free helpers.
- **Husbandry's no-far-past-guard stands** — the mitigation is the
  cellar (a place), never a rule.
- **The faucet stays open until the switchover wave** — and farming's
  produce faucet (open until its own B4) is untouched by this build.
- **Build coordination**: build-2 holds water infra (the well, mains).
  The wash takes water; v1 draws from shipped standpipe-shaped sources
  and must not design new water infrastructure.

## Acceptance criteria

- A wine batch runs end to end from grown grapes: crush → must in a
  vat → active ferment (audible) → conversion completes → racked and
  sealed in time → wine at a band derived from its worst temperature
  stretch. The same batch left unsealed past completion turns to
  vinegar, and the vinegar is buyable by the cook's trade.
- Conservation is checkable: the must's sugar, the wine's ABV, and the
  gravity readings along the way agree with the profile's mass balance.
- The experiment is possible: two vats, two temperatures, hydrometer
  readings over time — the recorded slopes differ and match the
  authored profile. No roll appears anywhere in the transform.
- The martini closes end to end: lane gin (bought-malt wash → still →
  juniper compounding) + lane vermouth (wine + the distiller's own
  spirit + botanicals) satisfy Dave's **unmodified** shipped recipe,
  `minGrade` passing on the strength of the D6 seam.
- Beer closes at the process tier: mash → wort → ferment → a keg of
  ale whose band came from the batch.
- A **new fermentable authored from rows alone** (e.g. cider from an
  existing fruit) ferments correctly with zero kernel edits — the
  author-expressiveness proof, run as a test.
- The producer brains keep Crowsfoot and the winery stocked without a
  player online; the vintner's purchase of spirit appears in the
  distiller's ledger (the B2B leg observable in `bank_ledger`).
- The switchover wave replaces the winemaking/brewing floor faucets
  atomically; before it, the floors stand as today.
- Disciplines: fermenting/distilling leaves exist and credit at the
  act; a bottle displays band + maker's mark.
- Docs: a new subsystem doc (`docs/subsystems/fermentation.md` or the
  planner's better name) owns the transform; content-packs rows for the
  de-stubbed trades refreshed; the supply-chain and libations slates'
  overtaken claims annotated. Full suite green at finalize; the lint
  families green throughout.

## Cross-references

- Seeding slates:
  [supply-chain-slate](../slates/builds/supply-chain-slate.md) (Parts
  1 + 6) · [libations-slate](../slates/builds/libations-slate.md) (the
  ingredient matrix, the stub definition)
- Subsystems: [husbandry](../subsystems/husbandry.md) (the shape) ·
  [thermal](../subsystems/thermal.md) · [bulk](../subsystems/bulk.md) ·
  [crafting](../subsystems/crafting.md) ·
  [fire](../subsystems/fire.md) (phase change, the still's heat) ·
  [retail](../subsystems/retail.md) ·
  [banking](../subsystems/banking.md) (the B2B leg) ·
  [advancement](../subsystems/advancement.md) ·
  [content-packs](../subsystems/content-packs.md) (the capability rung)
- Doctrine: [uncertainty](../uncertainty.md) ·
  [measurement](../measurement.md) ·
  [vocations](../vocations.md) (the demand test)
- Adjacent in flight: build-2 water infra (`design/water`) — the
  wash's water source; build-1 metal chain (`design/metal-chain`) —
  the still as a made object, someday.
