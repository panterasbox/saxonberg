# Materials response & construction (working slate)

> **Status:** PARTIAL — the three axes, the response function, layered
> armor mitigation, weapon playstyle (reach/guard/gambits), shield-as-
> armor, the heat/cold/corrosion/shock channels, and the crafting
> repair/salvage lifecycle all shipped →
> [materials-response.md](../../subsystems/materials-response.md)
> **Left:** the `Recipe` craft-stamp of {material, construction, grade} ·
> the `crush` channel (structural destructibility) · tissue as a
> construction axis · armor weight→fatigue→poise + armor-protects-
> affordances wiring · vessels/containers construction-response ·
> construction-driven tool-wear rate · the deep grapple/choke armor-
> bypass · opt-in passive environmental decay (rust/rot) · ⭐ **the
> elasticity / impermeability property axis + containment under pressure**
> (rubber's mandate, 2026-09-25) · ⭐ **whether `Material`'s property set is
> extensible at all** — three designs now want new fields on it
> **Size:** a wave

See also:

- [combat-slate.md](../builds/combat-slate.md) — the first consumer (armor
  mitigation + `Trauma` generation in the resolution chain; the loadout's
  "instruments expose capabilities").
- [../../subsystems/vitals.md](../../subsystems/vitals.md) — `Trauma`
  (mechanism + site + severity), `BodyPart` + tissue composition +
  `SlotSpec.covers` (the coverage seam), and the **`Material` mechanism-
  response the vitals slate deferred "with combat"** — this is where it
  lands.
- [../../subsystems/crafting.md](../../subsystems/crafting.md) — the
  stamper: `Recipe` turns a material into a *form*; `GradedMixin` quality;
  `ToolMixin` wear-on-use (armor is a degrading durable good).
- [../../subsystems/thermal.md](../../subsystems/thermal.md) — a later
  consumer: worn `clo` insulation as `material × construction`; `burn` as
  the `heat` channel meeting a material.
- [capability-magic-slate](../builds/capability-magic-slate.md) — the magic-side
  mirror of the same channel grammar.
- [../../subsystems/boundary.md](../../subsystems/boundary.md) — a later
  consumer: destructibility (`forceX` / breaking a door = a `crush` channel
  meeting a structural construction).

---

*The three axes — channel selects the point on the curve, construction
shapes it, material scales its height — shipped as designed. See
[materials-response.md § The three axes](../../subsystems/materials-response.md#the-three-axes).*

---

*The legibility surface (preview, per-item pips, the does-nothing lint)
shipped as a mandatory deliverable, not an afterthought. See
[materials-response.md § The legibility surface](../../subsystems/materials-response.md#the-legibility-surface-mandatory--settled-11).*

---

*Channel (the closed, additively-growable mechanism vocabulary),
Material (hardness/toughness alongside density/specificHeat), and
Construction (the per-domain value-object — armor-resist and
weapon-deliver forms — never a mixin) all shipped. See
[materials-response.md § The three axes](../../subsystems/materials-response.md#the-three-axes).*

---

*`MaterialApi.attenuate` / `resolveTrauma` shipped as the one function
read from both sides of a blow, including the worked-example grid
(transcribed verbatim into the doc). See
[materials-response.md § The response function](../../subsystems/materials-response.md#the-response-function-the-api-home).*

---

## Armor (the origin consumer)

Armor-as-emergent-composition, coverage via `SlotSpec.covers`, and the
layered outside-in stack all shipped — see
[materials-response.md § Armor mitigation](../../subsystems/materials-response.md#armor-mitigation--emergent-layered-outside-in).
"Aim the gap" shipped as the called-shot gambit (see [combat.md](../../subsystems/combat.md)).

- **Two honest costs, both existing substrate.** *Weight → fatigue → poise*
  (armor mass → `LoadBearingMixin` → drains the endurance reserve → caps
  poise recovery; the plate knight's guard wears down from 25kg, not an
  arbitrary penalty). And *armor protects affordances* (armoring the sword
  arm prevents the disarm/impair trauma that would grey its gambits).

---

*Weapon construction as a compact derived bundle (delivery / reach /
handedness / balance / guard / gambits), the archetypes table, and
shield-as-a-wielded-armor-construction all shipped in the weapon-
playstyle build (MR !140). See
[combat.md § Weapon playstyle & the hand-slot economy](../../subsystems/combat.md#weapon-playstyle--the-hand-slot-economy).
Ranged/thrown is [ranged.md](../../subsystems/ranged.md)'s, not this slate's.*

---

## Lifecycle — condition, wear, maintenance

Wear-from-use, repair (deficit-priced reverse-craft), and break→salvage→
recraft all shipped — see
[crafting.md § The lifecycle: two wear axes, repair, broken, salvage](../../subsystems/crafting.md#the-lifecycle-two-wear-axes-repair-broken-salvage)
and [materials-response.md](../../subsystems/materials-response.md) (the wear-on-use fold).

- **Solid-state *at rest*.** Sitting in a pack, gear does **not** passively
  rot — this respects the **presence-freeze** discipline the metabolism /
  thermal / respiration builds established (no offline work, no far-past
  bookkeeping, no logging in to rusted kit). Passive **environmental decay**
  (rust/rot) is an **opt-in `material × medium` property** for specific
  content (a damp dungeon corrodes iron; the metabolism spoilage tail) —
  **off by default**. It's the `corrosion` channel acting over time in the
  wrong medium (channels-not-nouns again).

---

*The channels × constructions grid shipped, transcribed verbatim into
the subsystem doc. See
[materials-response.md § The taxonomy grid](../../subsystems/materials-response.md#the-taxonomy-grid-shape-in-code).*

---

## How it grows

*The additive-growth discipline played out for real — heat/cold,
corrosion, and shock all landed as named seams pulled by their own
consumers, out of the rough order predicted here. See
[materials-response.md § The seven channels, and the THREE folds](../../subsystems/materials-response.md#-the-seven-channels-and-the-three-folds).*

### The other consumers (pull, don't front-load)

- **Structures / destructibility** — a wooden door vs plank vs beam: one
  material, three constructions, three integrities. `forceX`/boundary
  breaking seam.
- **Thermal insulation** — shipped: clothing construction drives `clo`;
  see [materials-response.md § One insulation number](../../subsystems/materials-response.md#-one-insulation-number--the-thermal-fold-reads-the-garments-clo).
- **Vessels / containers** — clay pot vs steel canteen vs waterskin;
  `Sealable`/`Flask` seal integrity.
- **Tool durability** — construction feeds `ToolMixin` wear rate.
- **Tissue** *(maybe)* — a skull dome vs a rib vs a long-bone shaft respond
  differently to blunt; could gain a construction-like axis, or stay
  material-only with structure implicit in the `BodyPart`. Lean
  material-only v1 to avoid overreach.

Discipline: **build for armor + weapons first, expose the seam, let the
rest pull it.** Don't enumerate the universe up front.

---

## The crafting / economy bridge

Construction is a **craft property**: a `Recipe` turns steel into mail *or*
plate (more material + more labor for plate). So **gear tiers are grounded**
in `material × construction × grade` — not arbitrary item levels. That's the
"gear matters but isn't a treadmill" outcome, straight out of the crafting
substrate (`Recipe`, `GradedMixin`, the maker's mark). Buying/crafting your
kit is how combat plugs into the economy (no loot-for-coin; see
[combat-slate.md](../builds/combat-slate.md) Thesis 2). Gear then has a use-driven
**lifecycle** — wear → repair (reverse-craft, the armorer career) → scrap →
reforge — an ongoing coin sink the conserved economy wants; see Lifecycle.

---

*All 11 settled decisions shipped and are cited by number in the
subsystem doc (`Settled-4`, `Settled-6`, `Settled-11`). See
[materials-response.md](../../subsystems/materials-response.md).*

---

## Open questions

1. ~~The exact v1 channel set~~ — resolved by growth: heat/cold,
   corrosion, and shock landed as needed; `crush` remains the one gap
   (structural destructibility). See
   [materials-response.md § The seven channels](../../subsystems/materials-response.md#-the-seven-channels-and-the-three-folds).
2. ~~Where the response function lives in code~~ — resolved:
   `MaterialApi`/`MaterialLogic`. See
   [materials-response.md § The response function](../../subsystems/materials-response.md#the-response-function-the-api-home).
3. ~~Multi-channel weapon resolution~~ — resolved: the channel is
   explicit at the `inflict` call site, no auto-pick. See
   [materials-response.md § Weapon delivery](../../subsystems/materials-response.md#weapon-delivery-delivery-forms-only).
4. ~~Numeric resolution of the layered stack~~ — resolved: `attenuate`
   folds residual energy inward layer by layer. See
   [materials-response.md § The response function](../../subsystems/materials-response.md#the-response-function-the-api-home).
5. **Tissue as construction or material-only** — lean material-only v1.
6. ~~Grade × construction interaction~~ — resolved: height only,
   construction owns shape. See
   [materials-response.md § The response function](../../subsystems/materials-response.md#the-response-function-the-api-home)
   (`materialScale`).

---

## What this slate does NOT cover

- **The combat loop / session / poise** — owned by
  [combat-slate.md](../builds/combat-slate.md); this is its materials substrate.
- **Specific numbers** — all curve magnitudes, the stack math, per-material
  constants. Tuning, deferred to a running game.
- **The material catalog itself** — Materials are content (content packs);
  this slate adds their *mechanism-response* face, not the roster.
- **Non-mechanical material properties** already modeled elsewhere (thermal
  `specificHeat`, optical, etc.) — construction joins them, doesn't replace
  them.

---

## Once shaped into formal requirements

*Items 1–5, 7, 8, and (mostly) 9 — the mechanism-channel vocabulary,
`Construction` + v1 forms, the response function, armor's layered
stack, weapon capabilities derived from construction (reach/handedness/
balance/guard/gambits/shield), the legibility surface, and the
condition/wear/repair/salvage lifecycle — shipped. See
[materials-response.md](../../subsystems/materials-response.md) and
[combat.md § Weapon playstyle](../../subsystems/combat.md#weapon-playstyle--the-hand-slot-economy).
Remaining:*

6. The **crafting stamp** — `Recipe` output carries `{material, construction,
   grade}`.



---

## ⭐⭐ 2026-09-25 — rubber needs a property axis that does not exist

From the RGO forward pass (see
[rgo-unification-slate](../builds/rgo-unification-slate.md) § *The forward
pass*). The `master` worktree is designing tapping → **rubber** → drilling →
oil → plastics, and rubber is the first of those with a **kernel** mandate.

**What `Material` carries today:** density · specific heat · thermal
conductivity · electrical conductivity · water absorption · hardness ·
toughness. **There is no elasticity and no impermeability-under-deformation**
— which is rubber's entire distinguishing property, with nowhere to live.

⚠ **And containment under pressure is essentially unmodelled.** `bulk.md` and
`thermal.md` mention pressure **zero times**; `SealableMixin` is a binary
open/closed latch for doors and windows. **A gasket only matters where
containment can FAIL**, so the property axis without the failure mode buys
nothing.

⭐ **Why it is worth the kernel change: rubber is the missing property for FOUR
shipped subsystems at once** — insulation ([electricity](../../subsystems/electricity.md)),
seals ([watershed](../../subsystems/watershed.md)'s conduits), tyres
([conveyance](../../subsystems/conveyance.md)), waterproofing
([textiles](../../subsystems/textiles.md)). It is not a product; it is a
property those systems have been quietly doing without. That is why one tapped
tree unlocks a realm of consumer goods, and it is the answer to *"which
resources force platform-level support"* for this one.

⚠⚠ **Sequencing warning:** the master session's path puts **rubber before
drilling**. Rubber reads like a content step and is not.

### ⭐⭐⭐ The third-consumer case: is `Material`'s property set extensible?

This is now the **third** independent design asking for new fields on
`Material`:

1. **mana density** and **mana conductivity** — canon in `arcane-science.md`,
   and [mana-economy-design-pack](../builds/mana-economy-design-pack.md)'s
   own Left block records *"no field on `Material` yet"*;
2. **elasticity / impermeability** — rubber, above;
3. **derived properties** — plastics, where a polymer's properties are
   *synthesized to spec* rather than authored, so a material becomes a
   **result** rather than a row of constants.

The first two are additive fields. **The third is a different question** — it
asks whether a material's properties can be computed from a process at all,
which is a change in the relationship between content and mechanism, not a
change to a shape. Worth separating when this is planned: two of these are
cheap and one is a doctrine call.
