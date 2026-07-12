# Materials response — requirements

The materials-response substrate is the **`response = f(mechanism,
material, construction)`** function — the physics that decides what a
force actually does when it meets a made thing. It exists because
"how do you model armor?" hits the wall that **chainmail and plate are
the same steel**: threat mitigation cannot live on the `Material` alone.
This cycle builds the **standalone physics core** and wires its **first
consumer** — the harm driver ([harm.md](../subsystems/harm.md)), whose
`ConditionApi.inflict` computes wound severity **magnitude-only** today
and gates coverage with a **binary presence check**. Materials-response
replaces both: `inflict` resolves a landed force outside-in through the
covering stack into the tissue, so a knife, a club, and a knife *through
a boot* produce honestly different wounds — **demonstrable with no combat
loop**. It seeds from
[materials-response-slate.md](../slates/deferred-rpg/materials-response-slate.md)
(design-locked; Settled decisions 1–11) and closes the `Material`
mechanism-response seam [vitals.md](../subsystems/vitals.md) parked "with
combat."

## Goals

- **The mechanism-channel vocabulary.** A closed, additively-growable
  channel set — v1 **`edge` / `point` / `blunt`** — as the single shared
  interface a weapon's *delivery*, an armor's *resistance*, and a
  tissue's *failure* all transact over.
- **Material mechanical properties.** `Material` gains grounded
  `hardness` and `toughness` (physically-shaped `Quantity`s, siblings of
  the existing `density` / `specificHeat`) — the *height* a material
  lends the response curve. Materials stay content (packs supply the
  roster); this adds their mechanism-response face.
- **The `Construction` value-object + v1 vocabularies.** A per-domain
  named value-object (the `Grade`/`ToolCapability`/`WeatherType`
  precedent — **not** a mixin) carrying a per-channel response profile:
  an **armor-form** *resist* vocabulary (plate / mail / padded / hide)
  and a **weapon-delivery-form** *deliver* vocabulary (bladed→edge /
  pointed→point / hafted→blunt). Construction picks the *shape* of the
  curve; Material scales its *height*; mechanism selects the *point*.
- **The response function, homed as a static Api surface.**
  `f(mechanism, material, construction) → outcome`, reading Material
  intrinsic properties and the Construction profile, scaled by
  `grade × condition`. One function, read from both sides of a blow.
- **Armor mitigation — emergent, layered, outside-in.** A piece of armor
  is `WearableMixin` + `GradedMixin`/wear + two data fields (`Material`,
  `Construction`) — no `ArmorMixin`. A covered `BodyPart` (via
  `SlotSpec.covers`) holds a **stack** of `{material, construction}`
  layers; a landed mechanism resolves outside-in (layer 1 → layer 2 → …
  → tissue), each layer attenuating residual mechanism/energy, the tail
  producing the `Trauma`.
- **Harm integration (the first consumer).** `ConditionApi.inflict`
  upgrades from magnitude-only to the response function: it resolves the
  covering stack at the site, attenuates through it, and lets the residual
  meet the tissue material — which yields **both** the `Trauma` *severity*
  **and** its *type* (blunt→bone ⇒ fracture, edge→flesh ⇒ laceration,
  edge→plate ⇒ deflected/no-wound, point→mail ⇒ puncture). Harm's binary
  `isSiteCovered` is **superseded** by this degree resolution, and harm's
  `sharp`/`blunt`/`thermal` mechanism vocab is **unified into** the shared
  channel vocab. `TraumaType` gains `puncture` (additive to the closed
  union) for the point channel.
- **Weapon delivery (delivery-forms only).** An implement carries
  `{material, construction}` and *derives its delivered channel(s)* from
  its weapon-delivery-form — a dagger delivers edge, a mace blunt — so
  harm can be driven by real objects. **No combat playstyle** (see
  non-goals).
- **Condition scales the response.** A `condition` field (the dynamic
  sibling of grade — as-made quality vs current state) that, with grade,
  scales the profile's *height* so the full function is
  `f(mechanism, material, construction) × grade × condition`. Wear-on-use
  drops condition (the existing `ToolMixin` wear seam); degraded gear is
  measurably worse. Solid-state at rest (presence-freeze respected — no
  offline decay).
- **The legibility surface (mandatory — ships with the model or it
  doesn't ship, Settled decision 11).** A **"what would this do?"**
  preview (point a mechanism/implement at a material/construction → the
  outcome band); **per-item derived-profile pips** for author *and* player
  (`edge ●●●○ · point ●●○○ · blunt ●○○○`); and a **does-nothing lint**
  that flags a construction/implement that does nothing to anything.
  Authors author concepts (a *steel longsword, masterwork, 90cm*), never
  numbers; the tuning constants are operator-only.

## Non-goals

- **The combat loop and the weapon playstyle.** No reach/control-until-
  closed, balance→poise/tempo, guard→parry, afforded gambits
  (`commandContributions`), shield-as-wielded-armor, or unarmed/grapple
  bypass — the whole "weapon carries a playstyle" bundle is the combat
  build ([combat-slate.md](../slates/deferred-rpg/combat-slate.md)). This
  cycle ships only the **delivery** half of weapon-forms.
- **Ranged / thrown.** A relationship-not-geometry concern owned by
  [combat-tactics-slate.md](../slates/deferred-rpg/combat-tactics-slate.md).
- **The economic lifecycle tail.** Repair (reverse-craft), scrap/reforge,
  and the `Recipe` crafting-stamp that carries `{material, construction,
  grade}` onto made things — the armorer-career economy loop. Deferred to
  the crafting/economy consumer as a named seam; this cycle ships wear +
  condition-scales-response, and armor/implements carry `{material,
  construction}` as **authored** data fields (not yet craft-stamped).
- **Specific numbers.** All curve magnitudes, the layered-stack
  attenuation constants, per-material values — operator `AppSettings`,
  tuned against a running game. This build fixes the *model* and ships
  *sensible defaults*, not the balance.
- **The other channel consumers.** Structures/destructibility (`crush` ×
  structural forms, `forceX`), thermal `clo` + `burn` unification,
  vessels/`Sealable` integrity, `corrosion`/environmental decay — each
  pulls its channel/construction slice when its consumer lands.
- **Additional channels.** `crush`/`grapple`/`heat`/`cold`/`ballistic`
  etc. stay out; v1 is edge/point/blunt. (Harm's `thermal` maps to a
  future `heat` channel; until it lands, the burn path stays a
  passthrough, not a response-function channel.)
- **Tissue as a construction axis.** Tissue stays **material-only** v1
  (structure implicit in the `BodyPart`); no per-part construction.
- **The material roster.** Materials are content packs; this adds the
  mechanism-response *face*, not new materials (beyond authoring the
  hardness/toughness of those the demo exercises).

## Surface decisions

### Response is three-axis, homed as a static Api

`response = f(mechanism, material, construction)`, not a property on
`Material` (mail and plate are the same steel). The function is a
**static Api surface** (the module-category home for gated utility over
the material/construction substrate) reading `Material` intrinsic
properties + the `Construction` per-channel profile, scaled by
`grade × condition`. Exact Api name is the planner's within the Api
convention; it is decorated (`SecurityApi.decorateApiClass`) like every
Api.

### `Construction` is a per-domain value-object, not a mixin

A `lib/` named value-object vocabulary (the `Grade`/`WeatherType`
precedent). Two v1 vocabularies sharing one shape: **armor-forms** (resist
profile) and **weapon-delivery-forms** (deliver profile). The reusable
thing is the *pattern* (material-worked-into-a-form-with-a-channel-
profile), not one flat enum spanning mail and swords.

### Armor is emergent; coverage is layered and outside-in

No `ArmorMixin`: armor is a `Wearable` + `Graded`/wear carrying `Material`
+ `Construction` data. Coverage reuses `SlotSpec.covers`; v1 anatomy
granularity (head/torso/4 limbs) is fine coverage granularity
(helm/breastplate/vambraces/greaves). A covered site holds a **layer
stack**, resolved outside-in — the model is layered natively (gambeson
under mail under plate), though the planner may land single-layer first
if the stack math needs staging.

### Grade and condition scale height; construction owns shape

Grade (as-made) and condition (current wear) scale the profile's *height*
only; the *shape* of the curve is the construction's. Resolves the
grade×construction open question (height-only).

### Layered resolution model fixed; constants deferred

Each layer attenuates the incoming mechanism/energy per its
`(channel, material, construction, condition)` resistance and passes the
residual inward; what reaches tissue generates the `Trauma`. The
*algorithm* is in scope; the *attenuation constants* are operator
`AppSettings`.

### Weapon channel is explicit at the inflict site (v1)

An implement *derives* which channel(s) it can deliver from its
weapon-delivery-form, but v1 the channel driving a given `inflict` is
**explicit** (the caller/hazard/harness picks edge vs point). The
auto-pick-by-context vs cut-vs-thrust-gambit-choice question is
combat-coupled and deferred.

### Harm's shipped surface is superseded, not duplicated

This build modifies `ConditionApi.inflict` (severity → the response
function; type from the tissue meeting) and retires the binary
`isSiteCovered` coverage gate in favor of the layered degree resolution.
The mechanism vocabularies are unified — the channel vocab is the single
source of truth.

## Constraints

- **Channels-not-nouns.** No "damage type," no armor-class, no
  `set_damage(n)`. The interactions *are* the model; a made thing is
  authored as concepts (material/form/grade/size), never a number.
- **Legibility is a hard deliverable**, not a follow-up (Settled decision
  11). The preview + pips + does-nothing lint gate the build's
  acceptance.
- **Tuning constants live in operator `AppSettings`**, never author-
  facing (the `app-settings.md` precedent); code ships no magic
  balance numbers as invariants.
- **`Material` mechanical props are grounded `Quantity`s** with strict
  unit shape, matching the existing `density`/`specificHeat` discipline
  (not resurrected 0–1 scalars).
- **`Construction` is a value-object / vocabulary module** — fits the
  fixed Module Categories; no new module type. `puncture` is an additive
  entry to the **closed** `TraumaType` union.
- **Presence-freeze respected** — wear is use-driven; gear is solid-state
  at rest (no offline/far-past decay), consistent with the
  metabolism/thermal/harm drivers.
- **Reuse, don't reinvent** — `WearableMixin`, `GradedMixin`,
  `ToolMixin` wear, `SlotSpec.covers`, `Quantity`, the `Trauma` value.
  `condition` is the primary new field.
- **Go through the Api layer** — the response function is the single
  chokepoint both armor mitigation and trauma generation read; nothing
  recomputes response ad hoc.

## Acceptance criteria

- **Channel × construction × material resolves believably** (tests, via
  `inflict` — no combat loop):
  - edge vs flesh → laceration; edge vs steel **plate** covering →
    deflected/no meaningful wound.
  - blunt vs flesh → contusion; blunt vs steel **plate** → *transmits* to
    a fracture (plate doesn't stop blunt).
  - point vs steel **mail** → penetrates → puncture; edge vs mail →
    resisted.
  - a **mace** (blunt delivery-form) wounds a plated body an **edge**
    weapon can't (same target, opposite outcome).
- **Layering resolves outside-in** — padding-under-mail resolves blunt
  measurably better than mail alone (the stack, ≥2 layers).
- **Coverage degree, not presence** — a called/aimed hit to an
  *uncovered* gap reaches tissue while the covered site turns it; the old
  binary `isSiteCovered` is gone.
- **Grade/condition scale height** — a worn (low-`condition`) blade
  underperforms its as-made grade; a masterwork-at-50% ≈ common-at-100%
  band.
- **Material mechanical properties** are grounded `Quantity`s on
  `Material`; the response function reads them (steel plate > bronze
  plate, same construction).
- **Weapon delivery** — an implement derives its delivered channel(s)
  from its weapon-delivery-form + material; a dagger delivers edge/point,
  a mace blunt.
- **The legibility surface exists and is correct** — the "what would this
  do?" preview's band **matches** the resolved `inflict` outcome for the
  same inputs; per-item pips render for author + player; the does-nothing
  lint flags a construction/implement that produces no effect against any
  material.
- **`ConditionApi.inflict` upgraded** — severity + type derive from the
  response function through the covering stack; harm's magnitude-only path
  and binary coverage are removed; the mechanism vocab is unified; harm's
  existing wound/bleed/medic tests still pass.
- **Subsystem doc** `docs/subsystems/materials-response.md` exists,
  documents the three axes / response function / armor resolution /
  legibility surface, names the deferred seams (combat playstyle, repair
  economy, other channels), and is cross-linked from harm.md + vitals.md.

## Cross-references

- Seeding slate:
  [materials-response-slate.md](../slates/deferred-rpg/materials-response-slate.md)
  (Settled decisions 1–11; the taxonomy grid; the tests-gating list).
- First consumer: [harm.md](../subsystems/harm.md) (`ConditionApi.inflict`,
  the `Trauma` value, `TraumaType`, the coverage gate this replaces).
- Substrate reused: [vitals.md](../subsystems/vitals.md) (`BodyPart`,
  tissue Materials, `SlotSpec.covers`),
  [crafting.md](../subsystems/crafting.md) (`GradedMixin`, `ToolMixin`
  wear, the maker's mark; the repair/stamp seam deferred here),
  [embodiment.md](../subsystems/embodiment.md) /
  [slot.md](../subsystems/slot.md) (`WearableMixin`, `SlotSpec.covers`),
  [quantities.md](../subsystems/quantities.md) (grounded `Quantity`
  material props), [app-settings.md](../subsystems/app-settings.md)
  (operator tuning constants).
- Downstream (deferred consumers named in the slate):
  [combat-slate.md](../slates/deferred-rpg/combat-slate.md) (the
  playstyle + loop),
  [combat-tactics-slate.md](../slates/deferred-rpg/combat-tactics-slate.md)
  (reach/ranged), [thermal.md](../subsystems/thermal.md) (`clo`/`burn`),
  [boundary.md](../subsystems/boundary.md) (destructibility).
