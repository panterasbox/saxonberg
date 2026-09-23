# Rendering slate — the knacker, the tanner, the chandler

> **Status: UNBUILT** — leather ships as a sink with no source; no soap
> or candle exists. Code-verified 2026-09-19: no rendering / tanning /
> chandling pack; no `soap` or `candle` row anywhere (candle survives
> only as a lumen threshold in `light.md`); nothing tans a hide. ⚠ The
> ranching build shipped the seam this slate asked it to leave open —
> `butcher` yields tallow (a pail of fat), a green hide and bone, and
> `tallow` is now a material (`trade-cooking`'s `render-tallow` recipe +
> `material/tallow.yaml`, *the medieval kitchen's cooking fat and its
> candle stock*) — so the chain's front end exists for slaughtered stock;
> the knacker's dead-stock half, the tanner and the chandler do not.
> **Left:** the knacker (dead stock — a `Corpse` yields nothing) · the
> tanner (tannin is the dyeing trade's) · the chandler · `soap` /
> `candle` · bone → glue · buttons · the one-pack-or-three cut · where
> soap goes · leather: this pack makes it, textiles' venues sell it (and
> `leather-jerkin` currently takes a raw hide) · does the knacker collect
> **Size:** a build

> **Captured 2026-09-03**, out of the settlement-model pass, in answer to
> *"are there new trades to be chartered here?"*
>
> ⭐ **This is the only genuinely NEW trade the settlement pass produced.**
> Everything else it implied was already in
> [vocations.md](../../vocations.md) as *designed* or as a named **GAP**.

Substrate: [crafting](../../subsystems/crafting.md) ·
[materials-response](../../subsystems/materials-response.md) ·
[light](../../subsystems/light.md) ·
[thermal](../../subsystems/thermal.md) ·
[fire](../../subsystems/fire.md)
Siblings: [ranching](./ranching-slate.md) (**the gate**) ·
[zoning](./zoning-slate.md) (⭐ the nuisance trades) ·
[preservation](../tails/preservation-slate.md) ·
[textiles](../tails/cosmetics-slate.md) *(fibre's sibling — leather is not fibre)* ·
[../../settlement-model.md](../../settlement-model.md) § 1

---

## 1. ⭐⭐⭐ The evidence: a sink that ships with no source

*Seed the economy backwards from shipped sinks* is the pack-cutting rule,
and this fires it exactly:

- **`organic/leather` ships as a material.**
- So do `hide-stock`, `hide-jerkin`, `leather-boots`, `leather-whip`.
- **Nothing makes leather.**
- `tissue/bone`, `tissue/flesh`, `tissue/muscle` all ship — so a carcass
  already decomposes materially.
- ⚠ There is **no `tallow`, no `soap`, no `candle`.**

And the candle gap is worse than a missing item: **Rejection's entire
culture section is built on it** — *"a two-candle job"*, *"he's short of
candle"*, a miner buying his own light and knowing to the stub how much
working time is left. The bible makes claims the world cannot support.

## 2. The chain — one input, three outputs

```
                     ┌──▶ tallow ──▶ the CHANDLER ──▶ candles  (the LIGHT need)
   a carcass ────────┤                             └──▶ soap
   (the KNACKER)     ├──▶ hide ────▶ the TANNER ────▶ leather  (a shipped sink)
                     └──▶ bone ─────────────────────▶ glue · buttons
```

⭐⭐ **It closes two of the settlement model's three new needs at once** —
**light** outright, and the useful half of **waste** (a carcass is the
canonical thing nobody wants and somebody can use).

## 3. ⭐⭐⭐ And it is what gives the industrial land use teeth

Terminus separates `commercial` from `industrial`
([settlement-model § 4](../../settlement-model.md)), and
[vocations.md](../../vocations.md) already groups these as *"miller ·
tanner — **the classic nuisance trades**."* The tannery sits in
[zoning-slate](./zoning-slate.md)'s own LULU list beside the powder
magazine and the rendering works.

> **Until there is a trade that stinks, the industrial land use is a
> label. The tannery is the first thing you genuinely cannot do in a
> residential district.**

⭐ Which makes this pack the first real test of three decided-but-untested
things at once: the **commercial/industrial split**, the **home-occupation
rule** (*the nuisance is regulated, not the work*), and the **allowance
cascade** as the dial a locality sets.

⚠ And it is the first trade whose *siting* is a political question rather
than a convenience — which is the point.

## 4. ⚠ The demand is honest, and that had to be checked

DUPLICATE — the check as applied to light and waste is carried, near-verbatim, by
[settlement-model.md § 1 The sixteen needs](../../settlement-model.md) (the
*REVISED 2026-09-03* box: *NEVER INVENT A NEED* against light · waste · care)
and the rule itself is `vocations.md`'s (the five-criteria table). Leather
passes trivially: the goods ship; something has to make them.

## 5. ⚠⚠ The ranching seam — leave it open, do not build it

SHIPPED · DOCUMENTED, as asked: `butcher` takes the whole animal apart
into meat · offal · tallow · hide · bone (`trade-ranching`'s
`ButcherController.YIELDS`), the green hide is authored as *a SEAM rather
than a product* with no `leather` row minted, and no knacker / tannery /
chandler was authored inside the ranching pack — `ranching.md` (*slaughter
is sober and complete*; *the hide is a stated seam*).

## 6. ⚠ The cut: one pack or three?

The metal chain cut at **process** and shipped three
(`trade-mining` · `trade-fuel` · `trade-smelting`) because each carried
substantial mechanics — a deposit field, a clamp, a furnace.

Knacking, tanning and chandling are **simpler**: one is butchery-adjacent,
one is a long soak, one is a mould and a wick. So the lean is **one pack,
three processes** — but it is the same call the metal chain had to make and
it should be made deliberately, not defaulted.

⭐ A test that settles it: *does each step have a station, a Discipline and
a grade of its own?* Tanning plausibly does (the pit, the liquor, the
grade of the leather). Chandling probably does not.

## 7. What else the settlement pass implied — and did NOT need chartering

⭐ Recorded so nobody charters these twice. All are already in
[vocations.md](../../vocations.md):

| vocation | status there | the demand this pass added |
|---|---|---|
| **victualler** (preserving) | designed | ⭐ the packing house — drying, salting, the pack. **The strongest second candidate for a pack.** |
| **warehouseman** | designed — *premises + **bailee duty*** | the depot; the receipt-as-collateral chain |
| **pawnbroker** | designed — *capital + licence* | ⭐ the Gray's legitimate twin |
| **innkeeper** | designed *(condition met 2026-07-31)* | the Rest · Rovere's · the flophouse |
| **scavenger** | designed — *"none — the entry-level vocation"* | ⭐ waste, and it is the **rung-0 job** the business ladder wanted |
| **tanner · miller** | **GAP** | ⭐⭐ this slate (tanner) · barley (miller) |
| **cooper** | **GAP** | barrels — fermentation, brewing and distilling all need vessels |
| **monument mason** | **GAP** | the necropolis — ⚠ **too small to charter**; ride the necropolis locality pack |

## 8. Open

- **The cut** (§ 6).
- **Where does soap go?** It is a rendering output and a hygiene input —
  which touches [disease](./disease-slate.md) and the *care* need, and
  could easily become fabricated demand if hygiene is made an obligation
  rather than an advantage.
- **Is leather textiles' business or this pack's?** ⚠ Leather is **not**
  fibre — different process, different substrate — but a player will
  expect one place to buy both. Probably: this pack makes it, textiles'
  venues sell it.
- **Does the knacker collect, or do you bring it?** Collection is a
  service (a round, a cart, freight); delivery is a chore. The first is a
  vocation, the second is fabricated demand.

---

## 9. Soap — the chandler's second product (captured 2026-09-18)

Came out of the nutrition & fitness planning: *"an adjacent system we
should have talked about — hygiene."* Soap is where four designed-but-
unbuilt systems meet, and none of them had claimed it.

### ⭐⭐ Every input exists except one, and the one is a verb over a bulk

Soap is **fat + alkali + water, boiled, salted to harden, cured.** In the
tree today: `tallow` (ranching + `render-tallow`) and olive oil
(`press-olive-oil`) — the tallow bar and the Castile bar; `salt`; water
with chemistry; **`ash`** as a trade-fuel material (a spoiled clamp
yields it; fire's `charMaterialPath` is ash). The missing link is
**lye** — potash lye (KOH) leached from ash, which is `strain` over a
bulk, a shipped verb. Boiling is `boil`. The four-to-six-week cure is
**`MaturingMixin`'s third customer** after the cask and the dough (a
`MaturationProfile` row: a soft bar hardens as water leaves and the
last of the lye reacts out; a bar cured too short is harsh — the row
carries that as a grade term, exactly as the dough's does). Scent is
mint and whatever the orchard grows.

**So the trade is rows over shipped verbs:** two or three recipes, a
`soap` material, a maturation profile, a bar row. The only kernel edit
soap itself wants is in the consumer (below).

### The chemistry is the lesson, and it is real

**Saponification**: a triglyceride and an alkali give three fatty-acid
salts and a glycerol. Potash lye makes *soft* soap; salting it out
(sodium displacing potassium) makes the *hard* bar — which is why the
bar needs the salt trade and the soft soap does not. The byproduct,
**glycerin**, is a second product with its own customer
([cosmetics](../tails/cosmetics-slate.md) — soap is a chain cosmetics is a
second customer of, as dye already is).

**Surfactants**: water does not cut grease; a soap molecule has a head
that loves water and a tail that loves fat, and *that* is what a wash
does. It is why `wash` with water only should leave a greasy pan greasy
— and today it does not, because nothing is greasy (§ the consumer).

**The hazard**: lye is caustic, and build-4 has just shipped the caustic
channel and `rinse` — *"the caustic, and the verb that stops it."* The
soap-boiler's occupational injury lands in the harm model before the
trade does. ⭐ The abstraction law holds without effort: the activity
costs the boiler a burn if he is careless, and time in every case.

### ⭐⭐ The consumer is the unbuilt half — designed three times

`wash` today is free and water-only, and it comes from libations (a
glass). What soap acts *on* has been decided in three places and built
in none:

- [room-condition](./room-condition-design-pack.md) — **`Soilable`**:
  grease, grime, dirty hands, on items, surfaces *and bodies*; an
  act-deposited band (`clean / soiled / filthy`) that **freezes in
  absence**, cleared by `wash` / `wipe` / `bathe`.
- [bathroom](./bathroom-slate.md) — washing **decided as state,
  "enabling, never a decay meter"**: filth never nags; washing opens
  doors (the physician's *wash your hands*, scent and the stealth
  systems, food service). The bathhouse as a venue.
- [disease](./disease-design-pack.md) — hygiene as the fomite route: *a
  dirty hand from room-condition is a fomite*. [Food safety](./food-safety-slate.md)
  explicitly declined to put hands on `Creature` (*"every meal a hygiene
  chore for no new mechanism"*) and named the disease build the consumer.

**Soap is the consumable that makes `wash` do what water cannot.** The
one kernel change soap needs is in `wash`: with soap in reach it clears
grease; without, it clears only what water clears. And one honest
extension to the contamination model: washing **removes** microbes
mechanically, it does not kill them — a *removal fraction* on the
second population, a different curve from the Arrhenius kill spoilage.md
already runs. Semmelweis is the pedagogy.

⚠⚠ **Never an obligation.** The bathroom slate's rule stands and this
section inherits it: no filth meter, no penalty for not washing, no
"hygiene need." Soap is bought because it *opens* something — the
physician's competence, the kitchen's cross-contamination gate, the
launder that actually launders. That is the demand test passing without
anyone inventing a need.

### Where it touches nutrition & fitness — three seams

1. **Fat is a fork.** Tallow and olive oil go to the plate *or* the pot;
   soap was dear when fat was food. The trained body's protein/fat
   demand and the chandler's fat demand compete for the butcher's
   output — a lens-6 fact, nothing to build.
2. ⭐ **Exertion is the body-soiling producer room-condition lacks.** Its
   pack says *"nothing in this build soils anything."* Sweat does:
   build-4's heat load sheds by sweating, and the nutrition plan's
   `exert()` is the act that should deposit on a `Soilable` body. The
   gym makes you dirty; the bathhouse is the gym's neighbour — the
   workout has a destination, and the destination has a bar *and a
   bath*. Recorded in the nutrition plan as a deferred seam at
   `depositWorkHeat`.
3. **Lye is also food chemistry.** Nixtamalization (alkali-treated
   maize) is what frees niacin; pellagra is the deficiency that *needs
   an alkali* — and lye cures olives. The deficiency roster and the
   alkali chain meet again there.

### The trade cut — decided here, lens 2

**Chandler**, not "soap-boiler": one fat, two products, and the candle
is the light need this slate already closes. A soap-only trade would be
a pack whose one output waits on another pack's consumer; the chandler
ships candles the day he lands and soap the day `Soilable` does. The
station test (§ 6) holds: a rendering kettle, a mould, a wick, a curing
rack — one station family. Soap adds the **lye hopper** (the leaching
barrel — a `Vat` row over ash) and that is all.

**Zoning**: soap-boiling is a nuisance trade — the stench — and it
lands in the same industrial class as the tanner; § 3 already said the
industrial land use gets its teeth from exactly this cluster. ⭐ The
honest register entry is not "soap-boiler": it is that **the butcher's
outputs fan into three nuisance trades** — tanner (hide), chandler
(fat), the glue boiler (bone) — and [vocations.md](../../vocations.md)
carries all three under the one knacker · chandler row.

**The bathhouse** rides hospitality as a venue archetype (a second
venue needs zero pack code): hot water is a `heatK` slot, the tubs are
vessels, the soap is stock on the par sheet. The bathroom slate keeps
the *room* (privacy, the mirror, the restroom set); the bathhouse is a
business.

### Other trades it touches

- **Textiles** — the launder branch of `wash` already fades dye per
  wash; soap belongs in that formula (soap launders; water rinses).
  **Fulling** (`full`, which textiles' slate lists and does not ship —
  wool-only) is done *with soap or fuller's earth*; the chandler is the
  fuller's supplier the day wool arrives.
- **Cosmetics** — glycerin; scented soap is the first cosmetic that is
  also a commodity.
- **Medicine** — the physician's hand-washing as a competence read,
  not a chore; the infirmary's basin is the first fixture that wants
  soap on it.
- **Distilling / brewing** — nothing; the `wash` they name is a mash,
  a word collision to keep out of the material's keywords.

### Sequencing

Soap's *producer* is a content wave on this pack; its *consumer* is
room-condition's `Soilable`. Build the consumer first or together —
the scurvy precedent: the metabolism slate designed the deficiency in
June and it sat unshipped for three months because the consumer never
appeared. Candles do not wait; soap does.
