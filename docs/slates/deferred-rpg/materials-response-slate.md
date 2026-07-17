# Materials response & construction (working slate)

> **Status: design-phase, deferred-rpg.** Born from the combat design pass
> (see [combat-slate.md](./combat-slate.md)) when "how do you model armor?"
> hit the wall that **chainmail and plate are the same steel** — so threat
> mitigation cannot live on the `Material` alone. This slate captures the
> substrate that resolves it: the **`mechanism × material × construction`
> response function**, of which **armor mitigation** and **vitals trauma
> generation** are the two v1 consumers. Nothing here is a build.
>
> This is the completion of the **channels-not-nouns** decomposition the
> codebase already runs everywhere: "damage type" was the wrong noun; the
> honest factoring is **channel** (the interaction) × **material** (the
> substance) × **construction** (the form). Armor, weapons, trauma,
> destructibility, and warmth all fall out of that one model.

See also:

- [combat-slate.md](./combat-slate.md) — the first consumer (armor
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
- [capability-magic-slate](./capability-magic-slate.md) — the magic-side
  mirror of the same channel grammar.
- [../../subsystems/boundary.md](../../subsystems/boundary.md) — a later
  consumer: destructibility (`forceX` / breaking a door = a `crush` channel
  meeting a structural construction).

---

## Principle

**Mechanical behavior is a function of three axes, not one:**

```
response = f(mechanism, material, construction)
```

- **Construction picks the *shape* of the response curve** (plate deflects
  edge / transmits blunt; mail resists edge / fails to a point).
- **Material scales its *height*** (steel plate > bronze plate; the curve
  is the construction's, the magnitude is the material's).
- **Mechanism selects the point on the curve** (this blow is `edge`).

`Material` = *what it's made of*. `Construction` = *how it's made*. The
**crafting substrate stamps** `{material, construction, grade}` onto every
made thing; the **physics substrates read** it. Construction is the bridge
from the economy (crafting makes forms) to the physics (forms respond to
forces).

---

## Legibility & authoring (the balance surface)

The risk of a layered model is the author's *"how much damage does this
do?"* The answer is **not** `set_damage(100)` — that's legible-but-a-lie:
once armor exists a flat number predicts the *outcome* no better, it just
moves the opacity to "…against **that**." The real requirement is that an
author can **predict and tune the outcome that matters**, and five things
make the layered model do that — the same instincts the engine runs
everywhere:

1. **Authors author concepts, not numbers.** Not a damage value — "a *steel
   longsword*, masterwork, 90cm." Humans have intuition for a fine steel
   sword; nobody has intuition for "100 damage."
2. **Derived outcomes are previewable.** The substrate ships a *"what would
   this do?"* inspector (point a weapon at a material/construction → the
   outcome band) and a per-item derived profile shown as pips for author
   *and* player (`edge ●●●○ · point ●●○○ · reach medium · guard good`). Tune
   by observing, not guessing — the help / inspection substrate's job
   (transparent-by-default).
3. **Few axes, each a real concept** — material / form / grade / size. No
   free-floating multipliers; the **tuning constants live in operator
   AppSettings**, never author-facing. Authors see concepts; the operator
   tunes the physics once, globally.
4. **Bands make the target forgiving.** Outcomes resolve to bands (turned /
   bites / bites deep), so the author lands in a *band*, not on a number —
   a much wider target. Band-balancing is *easier* than number-balancing.
5. **Sensible defaults = opt-in depth.** `form: sword, material: steel`
   yields a working weapon with zero tuning (the `sessile`-bodyplan /
   universe-default precedent); size/grade are reached for only to
   differentiate.

**The settled principle: the response substrate ships *with* its legibility
surface — preview + inspect + a lint that flags "does nothing to anything"
— or it doesn't ship.** The balance concern is a mandatory deliverable, not
a modeling compromise. (This also settles the derived-vs-authored dial in
favor of **derived-heavy**: derivation is safe precisely because the author
*observes* the result instead of guessing it.)

---

## The three axes

### Mechanism channels — the shared interface

The "verbs" of physical interaction; **one vocabulary everyone transacts
over**, so a weapon's *delivery* and armor's *resistance* and tissue's
*failure* all speak the same language. v1: `edge` / `point` / `blunt`.
Grows additively (`crush`, `heat`, `cold`, `corrosion`, `pressure`,
`ballistic`…) — each new channel is a new column on every response profile,
defaulting sensibly.

### Material — intrinsic properties (existing substrate)

Hardness, toughness, density (→ mass). **Shared by steel-mail and
steel-plate and bone.** Already modeled (`lib/material/`, tissue Materials
carry masses today). This is where a material's *height* on the curve comes
from. Materials grow independently via content packs (the `base-library`
already ships them).

### Construction — the new primitive

**A material worked into a form**, carrying a **response profile over the
channels**, parameterized by material + quality. It is a **value-object
vocabulary** (a `lib/` named-value-object like `Grade`, `ToolCapability`,
`WeatherType`, `LocomotionMode` — the "home that kills the `types.ts`
reflex"), **not a mixin**.

It is **per-domain** — different vocabularies, same shape, all speaking the
channel interface:

- **armor-forms** carry a *resist* profile (plate / mail / padded / scale /
  hide),
- **weapon-forms** carry a *deliver* profile (bladed / pointed / hafted),
- **structural-forms** carry a *resist / integrity* profile (timber /
  masonry / …) — later.

The reusable thing is the **pattern** (material-worked-into-a-form-with-a-
response), NOT one flat enum spanning mail, swords, and doors.

---

## The response function: one model, two v1 consumers

The same `f(mechanism, material, construction)` is read from both sides of
a blow:

- **Armor mitigation** — resolve a landed hit *outside-in through the
  covering stack*, then into the body:
  > `mechanism` → **[covering layer 1 · construction × material]** →
  > **[covering layer 2 …]** → **tissue material of the part** → `Trauma`
- **Trauma generation** — the tail of that same chain: what reaches the
  tissue (with residual mechanism/energy) produces the `Trauma`
  (`type`/`site`/`severity`) the vitals substrate afflicts.

Worked examples, one function:

| mechanism | meets | → |
|---|---|---|
| edge | steel **plate** | deflect (little reaches tissue) |
| edge | flesh | laceration |
| point | steel **mail** | penetrate → then flesh → puncture |
| blunt | steel **plate** | **transmit** → bone → fracture (no cut) |

No armor-class, no damage-type — the interactions *are* the model. **Grade**
(as-made quality) and **condition** (current wear) scale the profile's
*height* — see Lifecycle.

---

## Armor (the origin consumer)

**Armor is not a bespoke mixin.** A piece of armor is `WearableMixin`
(worn into a covering slot) + `GradedMixin`/wear-on-use (a durable good
that dents — the `ToolMixin` precedent) + two **data fields**: its
**`Material`** (steel) and its **`Construction`** (mail vs plate). Armor-ness
is emergent: a hard-material Wearable covering a part *is* armor.

- **Coverage** comes from the anatomy seam that already exists —
  `SlotSpec.covers` maps a worn slot → a set of `BodyPart`s. A breastplate
  covers `body.torso`; a helm covers `body.head`. v1 anatomy granularity
  (head / torso / 4 limbs) is a fine *coverage* granularity (helm /
  breastplate / vambraces / greaves) — finger-level detail is not needed.
- **Layered from the start.** A covered site holds a **stack** of
  `{material, construction}` layers; the mechanism runs the stack outside-in.
  This is why you wear **gambeson under mail under plate** — padding covers
  mail's blunt hole, plate covers mail's point hole. Coverage extended into
  *depth*, and the reason the armor economy exists (you buy the gambeson
  *and* the mail because they answer different channels). *(Implement
  single-layer first if needed; the model is layered natively.)*
- **Gaps are the tactical game.** Full plate is near-immune to edge but has
  holes (visor, armpit, groin) and does nothing against blunt/grapple. The
  emergent counters: **aim the gap** (a called shot — an opening-exploit
  gambit), **switch mechanism** (bring a mace, go blunt), or **bypass**
  (grapple/subdue breaks poise without penetrating). An armored foe is
  "immune to the *wrong approach*," not immune.
- **Two honest costs, both existing substrate.** *Weight → fatigue → poise*
  (armor mass → `LoadBearingMixin` → drains the endurance reserve → caps
  poise recovery; the plate knight's guard wears down from 25kg, not an
  arbitrary penalty). And *armor protects affordances* (armoring the sword
  arm prevents the disarm/impair trauma that would grey its gambits).

---

## Weapons — the symmetric dual ✅ SHIPPED

**Realized** by the weapon-playstyle build (MR !140): this delivery/playstyle
model is now `WeaponProfile` + the derived reach/balance/guard bundle over the
`Construction` × `Material` grammar. See
[combat.md § Weapon playstyle](../../subsystems/combat.md#weapon-playstyle--the-hand-slot-economy).

A sword and a mace are **both steel**; construction decides which channel
each *delivers*. So the same axis sits on **both sides of the blow**,
meeting at the shared channel. But a weapon carries more than armor does —
armor answers one question ("what happens when a mechanism hits me?"), a
weapon carries a whole **playstyle**. Its construction is a **compact
property bundle**, mostly *derived* from `form-word × material × dimensions`
(symmetric with armor-forms carrying a resist-profile; weapon-forms carry a
deliver-profile + engagement properties). This resolves the earlier
one-vs-two-part question: **neither — a compact derived bundle.**

The six properties, each wired to a mechanic we already have:

1. **Delivery profile** — the channel(s) delivered, primary + secondary
   (weapons are often multi-channel: a sword cuts *and* thrusts; a poleaxe
   brings edge + point + blunt). Feeds the response function.
2. **Reach** — a **threat-graph engagement property**, discrete classes
   (short / medium / long / very-long — legible in the UI, no distance calc).
3. **Handedness** — hands occupied (1h / hand-and-half / 2h), gating the
   **off-hand loadout** via the hand slots.
4. **Balance / leverage** — where the mass sits → the weapon's **position in
   the poise overextend economy** *and* its **tempo rate** (light = faster /
   more actions per beat, heavy = slower; the tempo input in combat-slate
   Thesis 6).
5. **Guard** — defensive capability → whether it feeds the **parry-restores-
   poise / defense-is-generative** loop.
6. **Afforded gambits** — construction confers weapon-specific moves via
   `commandContributions` (hook/pull, bind, keep-at-bay, armor-pierce,
   entangle).

### The three emergent dynamics (why it's a playstyle, not a stat)

- **Reach = control-until-closed, reversed-inside** (geometry-free). The
  longer weapon engages first and controls the exchange, pressuring poise
  favorably while the shorter is kept out. To hurt a spearman, a dagger must
  **close** — a gambit spending poise/tempo to get *inside* the reach —
  after which the spear is the liability (can't bring its point to bear in
  the clinch) and the dagger dominates. The spearman spends to *reset
  distance*; the dagger fights to *stay inside*. Pikes, spears, and knives
  get distinct identities from one threat-graph property, no grid.
- **Balance × the poise economy = guard-breaker vs opening-exploiter.**
  Heavy/committal weapons (maul) spend more of *your* poise per commit (a
  big overextend) but do more to *theirs* and punch through armor (blunt) —
  the **guard-breakers** that *create* the opening. Light/fast weapons
  (dagger, rapier) are poise-efficient and safe to commit but do little to a
  guard or through armor — **exploiters** that cash openings with precise
  trauma to gaps (called shots). This maps directly onto the create-vs-
  exploit division of the poise economy and onto master/apprentice: **the
  heavy weapon makes the break, the light weapon cashes it.**
- **Channel × armor = the pre-fight counter-loadout decision.** Blunt
  transmits through plate, edge deflects — so you bring a mace to a plate
  fight, a sword to an unarmored brawl. "What do I carry?" becomes a real
  read on the opposition.

### Archetypes fall out of a few properties

| Weapon | channels | reach | hands | economy role | guard | identity |
|---|---|---|---|---|---|---|
| **Dagger** | edge/point | short | 1h (off-hand free) | exploiter | poor | close finisher; called shots to gaps |
| **Arming sword** | edge/point | medium | 1h (+shield) | balanced | good | the generalist; supports shield + defense |
| **Longsword** | edge/point | med-long | 1.5h | balanced-heavy | excellent | the duelist's / master's weapon |
| **Spear** | point (+haft blunt) | long | 1–2h | control | fair | keep-at-bay; vulnerable once closed |
| **Poleaxe** | edge+point+blunt | long | 2h | heavy | good | answers *any* armor; committal, needs space |
| **Mace / warhammer** | blunt (+spike pierce) | short-med | 1h/2h | guard-breaker | fair | armor-breaker; makes the opening |
| **Staff** | blunt | long | 2h | balanced | excellent | control + defense; the non-lethal subdual tool |

### Two unifications

- **Shield = armor-construction *wielded*.** A shield is an armor-
  construction (plate/hide form) held in a hand slot, providing **active
  guard** (parry/cover) instead of passive worn coverage. This is the
  "1h+shield vs 2h vs dual-wield" tradeoff: the off-hand trades *offense*
  for *guard* (defense-is-generative fuel). Shields sit exactly at the
  armor/weapon seam — a wielded armor-construction, no new concept.
- **Unarmed = the floor and the bypass path.** Fists (blunt, shortest reach
  so you must close, both hands free for the **grapple/clinch → subdue**
  line, guard = blocks). Grapple is the entangle/clinch channel that
  **bypasses armor entirely** and breaks poise without penetrating — the
  non-lethal subdual backbone (the bouncer's toolkit). Body parts as innate
  weapon-instruments; martial competence makes bare hands a real choice.

**Ranged / thrown** is owned by
[combat-tactics-slate.md](./combat-tactics-slate.md) Thesis 1 (a
relationship, not geometry: imposes no engagement lock; kiting =
break-engage-fire). A weapon carries a "delivers-at-range / imposes-no-lock"
property; not rebuilt here.

---

## Lifecycle — condition, wear, maintenance

Armor and weapons are **not solid-state** — but the lifecycle is **use-
driven, not time-driven**. The arc:

**crafted → used (wears) → maintained (repair) → broken → scrap → reforged.**

- **Wear from use** (`ToolMixin` wear-on-use, already in crafting): a blade
  dulls, plate dents, leather cracks. This drops the item's **condition** —
  the *dynamic* sibling of grade. Grade is *as-made quality*; condition is
  *current state relative to that* (a masterwork at 50% ≈ a common at 100%).
  **Condition scales the height of the response profile**, so the full
  function is `f(mechanism, material, construction) × grade × condition`.
  That's the wear loop's teeth — degraded gear is measurably worse.
- **Maintenance = the economic sink the economy wants.** Repair is a
  **reverse-craft**: a smith spends material + labor + tools to restore
  condition. So the **armorer is a career**, upkeep is *demand* for it, and
  the loop closes: *combat wears gear → gear needs smiths → smithing is a
  job → the job is income → income buys and maintains gear.* Tiered like
  everything else (a whetstone field touch-up vs a shop restoration) — an
  ongoing coin **sink** the conserved economy needs to balance its faucet.
- **Break → scrap → reforge.** Catastrophic failure (or a mace crushing a
  shield — the destructibility consumer) turns gear into **scrap**, which
  reforges into new gear. Conservation-consistent: matter degrades to scrap,
  it never vanishes.
- **Solid-state *at rest*.** Sitting in a pack, gear does **not** passively
  rot — this respects the **presence-freeze** discipline the metabolism /
  thermal / respiration builds established (no offline work, no far-past
  bookkeeping, no logging in to rusted kit). Passive **environmental decay**
  (rust/rot) is an **opt-in `material × medium` property** for specific
  content (a damp dungeon corrodes iron; the metabolism spoilage tail) —
  **off by default**. It's the `corrosion` channel acting over time in the
  wrong medium (channels-not-nouns again).

Two payoffs: it **replaces the gear treadmill with a maintenance
relationship** (gear never obsoletes you — no item levels — but degrades and
needs upkeep, so you *care for* a lasting investment with a maker's mark and
a repair history, not chase the next tier — the meaning-over-loot thesis);
and it's **all reused substrate** (`GradedMixin`, `ToolMixin` wear,
craft/repair, conservation, the maker's mark) — **condition** is the only
new field, and it slots straight into the response function.

---

## The taxonomy at the start

A tiny grid — **channels × constructions**, materials scaling each cell:

```
              edge      point     blunt
  plate       deflect   resist    transmit
  mail        resist    fail      transmit
  padded      poor      poor      absorb      (the under-layer)
  hide        moderate  poor      moderate    (cheap floor)
```

…plus the weapon-delivery forms (`bladed→edge`, `pointed→point`,
`hafted→blunt`) and the layered stack. ~a dozen cells lights up believable
armor **and** the trauma model for the first combat.

---

## How it grows

Two independent axes:

1. **New channels** (new interaction verbs) — `crush`/`leverage` when
   **destructibility** arrives (break the door); `heat`/`cold` when
   **thermal** pulls (`clo` insulation + `burn`); later `corrosion`,
   `pressure`, `ballistic`. Additive columns, never breaking.
2. **New constructions** (new forms) — `scale`/`brigandine`/`lamellar`
   (armor depth); `woven`/`knit`/`tanned` (clothing → thermal `clo`);
   `timber`/`masonry`/`wattle` (structures); `fired-clay`/`coopered`/`blown`
   (vessels). Each characterized against the *existing* channels when its
   consumer lands.

Rough wave order, each pulling a slice of the grid: **combat**
(edge/point/blunt × armor+weapon forms) → **destructibility** (crush ×
structural forms) → **thermal** (heat/cold × clothing forms + burn) →
**vessels / corrosion** when content asks.

### The other consumers (pull, don't front-load)

- **Weapons** — the dual, above (v1 alongside armor).
- **Structures / destructibility** — a wooden door vs plank vs beam: one
  material, three constructions, three integrities. `forceX`/boundary
  breaking seam.
- **Thermal insulation** — clothing construction drives `clo`; `burn`
  unifies with the existing scalding hook.
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
[combat-slate.md](./combat-slate.md) Thesis 2). Gear then has a use-driven
**lifecycle** — wear → repair (reverse-craft, the armorer career) → scrap →
reforge — an ongoing coin sink the conserved economy wants; see Lifecycle.

---

## Settled decisions

1. **Response is `mechanism × material × construction`** — not on `Material`
   alone (mail and plate are the same steel).
2. **`Construction` is a value-object vocabulary** (per-domain: armor-resist
   / weapon-deliver / structural-resist), NOT a mixin.
3. **The mechanism-channel set is the shared interface** both delivery and
   resistance speak.
4. **Armor is emergent** — `Wearable` + `Graded`/wear + `Material` +
   `Construction` data; no `ArmorMixin`.
5. **Layered coverage from the start** — a site is a stack of
   `{material, construction}` layers, resolved outside-in.
6. **One response function, two v1 consumers** — armor mitigation + trauma
   generation.
7. **Weapon construction is a compact derived property bundle** (delivery /
   reach / handedness / balance / guard / gambits), mostly derived from
   `form × material × dimensions` — resolving "one-part vs two-part."
8. **Reach is discrete classes** (short/medium/long/very-long) — legible in
   the UI, drives control-until-closed with no distance calc.
9. **Shield = a wielded armor-construction** (active guard in a hand slot).
10. **Condition scales the response profile** (the dynamic sibling of grade);
    the lifecycle is **use-driven, solid-state at rest** — no offline decay;
    passive environmental decay is opt-in content, off by default.
11. **The response substrate ships with its legibility surface** (preview +
    inspect + lint) or it doesn't ship; authors author concepts, tuning
    constants are operator-only; authoring is **derived-heavy**.

---

## Open questions

1. **The exact v1 channel set** — is `edge`/`point`/`blunt` enough, or does
   the first combat want `crush`/`grapple` distinct from `blunt`?
2. **Where the response function lives in code** — a static on a
   `Construction`/response Api reading `Material` properties? The homing of
   `f(mechanism, material, construction)`.
3. **Multi-channel weapon resolution** — does a sword auto-pick edge-vs-point
   by context/target, or is the channel a gambit choice (cut vs thrust)?
   (The one-vs-two-part construction question is **resolved** — a compact
   derived bundle; see Weapons.)
4. **Numeric resolution of the layered stack** — how residual mechanism/
   energy carries through each layer to the tissue (the tuning surface).
5. **Tissue as construction or material-only** — lean material-only v1.
6. **Grade × construction interaction** — does quality shift the curve
   shape or only its height? (Lean: height only; construction owns shape.)

---

## What this slate does NOT cover

- **The combat loop / session / poise** — owned by
  [combat-slate.md](./combat-slate.md); this is its materials substrate.
- **Specific numbers** — all curve magnitudes, the stack math, per-material
  constants. Tuning, deferred to a running game.
- **The material catalog itself** — Materials are content (content packs);
  this slate adds their *mechanism-response* face, not the roster.
- **Non-mechanical material properties** already modeled elsewhere (thermal
  `specificHeat`, optical, etc.) — construction joins them, doesn't replace
  them.

---

## Once shaped into formal requirements

1. The **mechanism-channel** vocabulary (v1: edge/point/blunt) as the shared
   interface.
2. The **`Construction`** value-object + the v1 armor-form vocabulary
   (plate/mail/padded/hide) and weapon-form vocabulary (bladed/pointed/
   hafted), each with its per-channel response profile.
3. The **`f(mechanism, material, construction)` response function**, reading
   `Material` intrinsic properties, homed as a static surface.
4. **Armor** = `Wearable + Graded/wear + {Material, Construction}` data;
   the **layered covering stack** on a `BodyPart` (via `SlotSpec.covers`);
   the outside-in resolution into `Trauma`.
5. **Weapon capabilities derived from construction** (feeding the loadout's
   instrument-capability model).
6. The **crafting stamp** — `Recipe` output carries `{material, construction,
   grade}`.
7. The **weapon-form** vocabulary + the compact property bundle (delivery /
   reach-class / handedness / balance / guard / gambits); **reach** as a
   threat-graph engagement modifier (control-until-closed); **shield** as a
   wielded armor-construction; unarmed/grapple as the bypass floor.
8. The **legibility surface** — the "what would this do?" preview, the
   per-item derived-profile pips, and the "does-nothing" lint. Ships *with*
   the model.
9. The **condition** field + the wear → repair (reverse-craft) → scrap →
   reforge lifecycle; condition scaling the profile; solid-state at rest.

Tests gating: edge vs plate deflects while edge vs flesh lacerates; blunt
vs plate transmits to a fracture; point defeats mail but edge does not;
padding-under-mail resolves blunt better than mail alone (the layered
stack); a mace (blunt weapon-form) beats a plated foe an edge weapon can't;
a called shot to an uncovered gap reaches tissue; a long weapon controls
until a short one spends to close, then reverses; a worn (low-condition)
blade underperforms its as-made grade; repair restores condition, breakage
yields scrap; the "what would this do?" preview matches the resolved outcome.

Structures, thermal `clo`, vessels, and the wider channel set wait for their
consumers.
