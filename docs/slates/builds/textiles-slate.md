# Textiles slate — the chain that clothes the world

> **Captured 2026-09-02**, design session in `build-1` while the TPA
> rewrite (`design/tpa-reform`) and cooking (`design/cooking`) were in
> design in the sibling worktrees. **Status: decided design,
> pre-requirements.**
>
> This slate owns **fibre → cloth → garment**, and the four trades that
> make it: textiles, leatherwork, dyeing, tailoring. It also owns the
> kernel wave that makes a garment a real object instead of a
> description.
>
> It does **not** own searching. The design session found that the
> viewer side of detection is missing an equipment term, and that gap is
> big enough to want its own cycle — see
> [search-slate](./search-slate.md), written alongside this one. Textiles
> builds the *target* half of that seam (a camouflaged cloak is clothing);
> the search slate builds the *viewer* half (a lens is not).
>
> Supersedes nothing. Consumes the **cosmetics slate's** load-bearing
> finding (*dye is a textiles input; cosmetics is a second customer*) and
> discharges four **GAP** rows: `textiles` and `leatherwork` on the
> [trade roster](./trade-roster-slate.md), `barber / tailor` and
> `miller / tanner` in [vocations.md](../../vocations.md).

---

## The gap — audited against the shipped tree, 2026-09-02

The headline, and it is worse than it looks from the fiction:

```
Armor   = Wearable(Slottable(Crafted(Durable(Constructed(Detailed(Thing))))))
Garment = Wearable(Slottable(Thing))
```

`Garment` composes **nothing**. And every one of the nine clothing rows
in `generic-objects/content/stuff/thing/clothes/` — blazer, canvas-shoes,
field-jacket, hood, lab-hoodie, student-shirt, student-trousers,
tweed-jacket, white-coat — authors **no material, no `clo`, no mass**.

Concretely, today:

- **Worn clothing contributes exactly 0 clo.** `ThermalRegulation` sums
  `occ.getClo()` over worn slots; `WearableMixin.clo` defaults to
  `Quantity.of(0, 'clo')`; nobody authored one. The thermal layer is
  wired to clothing and reads zero from all of it.
- **Clothing is weightless.** Encumbrance never sees it.
- **Clothing cannot get wet, wear out, be graded, be repaired, or be
  made.** No `Durable`, no `Constructed`, no `Crafted`. Materials author
  `waterAbsorptionCapacity` and no garment has a material to read it
  from.
- A tweed jacket and a field jacket are the same object with different
  `longDescription`.

The one contrast is `leather-boots`, which is classed `Armor` and
therefore carries `_materialPath`, `constructionForm: hide`,
`gradeBand: fair`, `mass: 1.4`. **The substrate works.** The combat build
wired armor to it and nobody ever wired clothes.

### The chain is a stub with both ends missing

- **One** soft-goods recipe exists —
  `trade-smithing/content/recipes/leather-jerkin.yaml`, `discipline:
  smithing`, consuming `category: hide`. A tailoring recipe squatting in
  the smithing pack.
- Its input, `hide-stock`, is **produced by nothing**. It is a `Prop`
  stocked on the Hearthworks smithy floor as authored inventory.
- The `mending` capability ships (`sewing-kit`, `sewing-machine` in the
  Terminus general store) and drives `repair`/`salvage` for soft goods —
  pointing at garments that cannot hold damage.
- Textile materials that ship: **wool, jute, down, leather**. No flax, no
  cotton, no silk, no dyestuffs, no mordants.
- Nothing spins, weaves, fulls, dyes, tans, cuts or sews.

`launch-worklist.md` states the deferral outright: *"the **tailoring
branch stays deferred** per the requirements (the jerkin recipe +
`mending` capability are its attach points; **waits on a fiber
faucet**)."* This slate is that faucet.

### Two hooks already cut and sitting unused

- Every `biped` slot declares `covers: [body.torso]` etc., with the
  comment *"coverage relation, for armor / hit-location — **no consumer
  yet**."* `BodyPlan.slotsCovering(part)` exists and has **zero
  callers**.
- `WetMixin` soaks and dries off `Material.waterAbsorptionCapacity`, and
  its own doc says *"wet wool lingers and a wet blade sheds at once,
  emergent from a tabulated number."* Exactly the model this build wants,
  already built, starving for a garment with a material.

---

## ⭐⭐⭐ Decision 1 — the chain walks CONSTRUCTION, not material

> **One material per fibre. Spinning and weaving change the *form*, never
> the *substance*.**

Flax the plant and linen the cloth are the same cellulose; wool the
fleece and worsted the suiting are the same keratin. So the chain is a
walk up a form ladder on a constant material:

```
MATERIAL (constant)      CONSTRUCTION (the chain)
  flax      ─────────►   fibre → sliver → yarn → woven
  wool      ─────────►                  ↘ knit
  cotton    ─────────►     └──────────────► felted   (no yarn step)
  silk      ─────────►   fibre → ......... → woven
  jute ✅   ─────────►   fibre → yarn → woven (open)
```

This is not a new pattern — it is *the* pattern the engine already runs.
`response = f(mechanism, material, construction)`: material scales the
height of the curve, construction picks its shape. A textile form
vocabulary is a **third domain** in `lib/material/Construction.ts`
alongside `armor` and `weapon-delivery`, with the same shape (a closed
word list, a data table, `Construction.of`).

**What it buys:**

- **Felting branches for free.** Felt is fibre→cloth with no spinning. On
  this model that is a form that skips a rung, not a special case.
- **Grade is staple length** — a real physical quantity, not a band. Long
  line flax spins fine yarn; short tow spins coarse. It propagates to the
  cloth exactly as ore grade propagates to the smelt (⭐⭐ *ore grade is a
  SHIPPED composition fraction*, metal-chain slate).
- **Retting is where you can ruin it.** Under-ret and the fibre will not
  separate; over-ret and it rots. A genuine skill window on a real clock,
  and `FermentingMixin` already models exactly this shape.
- **Dye stays orthogonal** to both axes — see Decision 7.
- **It exposes a live bug.** `wool.yaml` authors `appearance: thick woven
  wool` — a *material* row asserting a *construction*. Raw fleece is not
  woven. This model deletes that string.

## ⭐⭐ Decision 2 — one covering vocabulary, not two

*(Session fork, user call: option (a).)*

`padded` is already an armor form, and a padded gambeson **is** quilted
cloth. Boiled leather, felt and quilting genuinely resist blows. So the
textile and armor vocabularies are not neighbours — they are one
vocabulary, and textiles extends it.

Cloth simply resists **poorly** on every channel, which is honest rather
than absent: **a linen shirt is armor that does not work.** Layering then
uses one machinery instead of two that have to agree.

⚠ **Consequence — a rename.** Once a linen shirt is in that table,
`ConstructionDomain = 'armor' | 'weapon-delivery'` is misnamed and
`responseFor()`'s domain guard reads wrong. A shirt is not armor; it *is*
a covering. `ARMOR_FORMS` → `COVERING_FORMS`, `ARMOR_PROFILES` →
`COVERING_PROFILES`, the domain word `'armor'` → `'covering'`. Cheap,
mechanical, and it makes the guard honest.

## ⭐⭐ Decision 3 — the covering stack resolves PER BODY PART

*(Session fork, user call: per-part, using `covers:`.)*

`Wearable.getClo()`'s doc defers this explicitly: *"Surface-weighted
per-region coverage is a deferred fidelity tier — v1 is a simple additive
sum."* This build takes that decision, because the flat sum cannot teach
the one thing coverage is for: **bare hands in a blizzard cost you
nothing** under a body-wide sum, and a cloak and a shirt are
interchangeable if their clo matches.

Per-part resolution uses `BodyPlan.slotsCovering(part)` — the relation
that has been cut and callerless since the vitals build.

### The layer order — form sets the band, wear-order breaks ties

`LAYER_DEPTH` derives depth from form (padded 0 … plate 3) so a stack
self-sorts with no authored number (Settled 11, *authors author
concepts*). That breaks the moment textiles arrive: a linen shirt and a
wool coat are **both `woven`**.

The rule, which preserves both principles:

> **Form sets the band. Wear-order breaks ties inside a band.**

You cannot put a shirt over your plate — the form ladder forbids it. But
shirt-then-coat versus coat-then-shirt is genuinely *your call*, and
getting it wrong should make you cold rather than be prevented. No new
authored field, and the layering decision survives exactly where it is
real.

### What the stack resolves, outermost-in

```
        wind ──┐   rain ──┐          ← outermost soaks first
   ┌───────────▼──────────▼─────┐
   │ shell   oiled wool  woven  │  dense weave → windproof (multiplies)
   ├────────────────────────────┤
   │ mid     wool        knit   │  loft → adds clo
   ├────────────────────────────┤
   │ skin    linen       woven  │  wet here = heat sink
   └────────────────────────────┘
              body.torso            ← via the slot's `covers:`
```

- **⭐⭐ clo DERIVES, never authored.** `f(material.thermalConductivity,
  form loft, mass/thickness, wetness)`. Wool insulates because it is
  0.04 W/mK, not because an author typed 4. **Windproofing derives from
  weave density** — no `shell` role word is needed; the dense-woven oiled
  thing simply *is* one.
- **Wet is the payoff.** Soaked cloth loses most of its clo and gains
  real mass. Wet linen is a heat sink; wet wool still works. That is the
  single most teachable fact in the chain, it is why oiled wool exists,
  and `WetMixin` already computes it per-object today.
- **Protection** rides the existing resist chain unchanged.

---

## ⭐⭐ Decision 4 — the chain is a DIAMOND, and the packs cut on it

The trade roster already hinted at this: `leatherwork | skill | 0723 |
shares the code with textiles`. Made literal:

```
  trade-farming (EXISTING pack, content only)
    flax · cotton · madder · weld · woad
              │
              ▼
    ┌─── trade-TEXTILES ────┐        ┌── trade-LEATHERWORK ──┐
    │  ret → dress → spin   │        │  hide → tan → leather │
    │  → weave / felt       │        │       (the tannery)   │
    │        → cloth        │        └───────────┬───────────┘
    └───────────┬───────────┘                    │
                └──────────┬─────────────────────┘
                           ▼
                   trade-TAILORING
                    cut → sew → garment
                           ▲
                           │
                    trade-DYEING  ── colour, a customer of BOTH
                                     (and later, of hair)
```

Textiles and leatherwork are **parallel input trades**, not sequential.
Tailoring's `cut`/`sew` take either — one code path, two materials.
Dyeing hangs off the side as a customer of both, with cosmetics arriving
later as a *third*.

**Placement calls:**

- **Flax and the dye plants are `trade-farming` rows.** Cultivation is
  farming's mechanism; textiles' mechanism starts at the retting pit.
  Precedent: farming already grows juniper for gin and grapes for wine,
  so industrial crops are in scope. New files in an existing pack ⇒
  conflict-free against the cooking build's food crops.
- **Tanning lives inside `trade-leatherwork`**, not its own pack — but
  the *tannery* is a zoned nuisance venue, which is the `miller / tanner`
  GAP the vocations register wants.
- **A kernel wave comes first**, then the packs. Same shape as the metal
  chain.

## ⭐ Decision 5 — a verb per DECISION, not per motion

The real process has eleven-ish steps. Eleven verbs would be a mill
simulator. The rule:

> **A verb exists where a decision exists.**

Break, scutch and hackle are three motions with one decision between them
(*remove more woody matter, lose some staple length*) — historically,
collectively, *dressing* the flax. They fold into one `dress`. Retting
has a genuine decision (when to pull it) and `FermentingMixin` already
runs that clock, so like the fermentation build it may need **zero
verbs**: put flax in a water tank, judge the moment, take it out.

| verb | the decision it carries | pack |
|---|---|---|
| `dress` | how hard to work it — purity vs staple length | textiles |
| `spin` | how fine — speed traded against yarn grade | textiles |
| `weave` | weave density — yield vs windproofing + wear | textiles |
| `full` | felting / finishing pass (wool) | textiles |
| `tan` | the liquor, and how long | leatherwork |
| `dye` | `f(dyestuff, mordant, fibre)` | dyeing |
| `cut` | pattern + fit — where tailored beats stock | tailoring |
| `sew` | assembly | tailoring |

Eight verbs, four packs. `mending` already ships and finally has
something to repair. `shear` waits on ranching, as does wool's whole left
edge.

### ⭐ The tool ladder

*(User call: yes.)* The general store already ships the precedent —
`sewing-kit` (`{kind: mending}`) and `sewing-machine` (`{kind: mending,
rate: 3, control: fine}`): the same capability at different rates.

Drop spindle → spinning wheel → mill is that ladder exactly, and it is
the clearest **capital-deepening** story available: the wheel does not
let you do anything new, it lets you do it three times faster. Same for
the loom ladder and the tanning pit ladder.

---

## ⭐⭐ Decision 6 — fit, and the `baseMass` find

### ⚠⚠ The find: every species masses 70 kg

```
halfling    "Small, quick, and comfortable"    →  baseMass 70
dragonborn                                      →  baseMass 70
dwarf       "Stone-sturdy and stout"            →  baseMass 70
half-orc    "Broad and powerful"                →  baseMass 70
```

**No species overrides `BodyPlan.biped.baseMass`.** All seven share the
plan and inherit 70. The fiction says they are different sizes; the
engine says they are identical — and `massScaled: true` on the unarmed
fist means **combat is already reading that uniform mass**, as are
encumbrance carry capacity, metabolism basal drain and thermal mass.

Fit cannot key on a number that is the same for everybody, so this build
walks straight into it. *(User call: fix it in this build.)*

- Species get a real `baseMass` **and** a `stature`. Stature is already a
  designed concept with no field — the lineage slate lists it as
  affecting *"ranged bands, tight spaces, concealment, heat
  dissipation."*
- ⚠ This moves live numbers in combat, encumbrance and metabolism. It is
  a balance change riding a textiles MR and wants its own wave, its own
  gym run, and its own review attention.

### The model — measurements derive

- A body's measurements derive from **species stature × species baseMass
  × that individual's mass and composition**. No new authored fields on
  the character.
- A garment stamps the measurements it was **cut to**, at `cut` time,
  from whoever it was cut for.
- **Fit is the distance between the two.** Loose → air gaps → clo loss.
  Tight → mobility penalty + accelerated seam wear.

**Three things fall out free:**

- ⭐ **The tailor's reason to exist.** Stock is cut to the body plan's
  average; bespoke is cut to *you*. That is the whole economic argument
  for the trade — and it makes the char-gen freebies read correctly as
  ill-fitting hand-me-downs.
- **A secondhand market.** A garment cut for someone else fits you badly.
  No new mechanism.
- **Cross-species clothing fails properly.** A coat cut for a halfling on
  a dragonborn is not a size penalty, it is a non-starter.

### ⭐⭐ The lineage seam — build the consumer, not the variance

*(User: "the measurements will both derive and be char gen… you pick your
parents, your parents have a body build, you inherit some value.")*

[lineage-slate](./lineage-slate.md) is **shell now, generator later** —
its own phasing says the generator is *"probably one of the last things
we build before we go live."* Its body budget is **fat / muscle / bone at
one mass**, incomparable by construction.

So the split is:

> **Textiles ships the consumer and the derivation. Lineage later
> supplies the variance.**

Species-level facts make fit real across seven species *today*, with no
individual variation existing yet. Individual variance is left as a seam;
when lineage phase 2 lands, inherited body build feeds that seam and fit
gains per-character variation **with zero textiles changes**. Textiles
must not need re-opening when lineage lands.

⭐ **It runs both ways.** The lineage slate says fat is *thermal
insulation* and stature affects *heat dissipation*, but little consumes
that today. The per-part covering stack is what makes *"I am built for
the cold"* a real claim — one you cash out as clothing you do not have to
buy. **This build makes lineage phase 2 better.**

---

## ⭐ Decision 7 — soiling, and the wash/fade loop

Soiling stays **thin**. It rides the same neutral-capacity shape
`WetMixin` uses (its own doc calls that axis neutral, and `lib/reserve.ts`
says so outright), `wash` already ships from the libations build, and its
primary consumer is *appearance*, not mechanics. **No laundry vocation in
this build.**

But it closes Decision 1's loop:

> **Washing removes soil. It also removes colour, if the mordant was
> poor.**

So the dyer's skill is not a one-shot cosmetic — it is measured in **how
many washes the colour survives**. `f(dyestuff, mordant, fibre)` produces
both a hue and a **fastness**; fastness decays per wash; a faded coat is
legible on sight. That answers the cosmetics slate's open question 4
(*"does a colour fade?"*) as **yes**, and gives dyeing a durable quality
axis instead of a palette.

⚠ **Naming.** "Outfit" is **taken** — `farm-outfit.yaml` is a `Business`
(the producer-annex pattern: Business + Stock + a hand with the
`consigns` brain). Only char-gen uses "outfit" in the clothing sense
(`aspirations[].outfit`). A uniform concept must be called **livery**.

---

## ⭐⭐⭐ Decision 8 — a garment's PURPOSE is which channel it intercepts

The session's biggest find, prompted by *"why wear a lab coat beyond
roleplay?"*:

> **A garment's purpose is not a property of the garment. It is which of
> the body's exposure channels the covering intercepts.**

Nobody authors *"this is a lab coat, it reads as professional."* You
author **white, cheap, woven cotton, covers torso+arms, sits outermost,
low clo** — and lab-coat-ness *emerges*.

The codebase already states this rule, in `lib/vitals/Dressing.ts`: a
dressing *"is not a **kind** — it's a role an item plays,"* gated on
capability, never `instanceof Bandage`. Same discipline, applied to the
whole wardrobe.

So the garment taxonomy **is the channel list**:

| exposure channel | the garment that exists for it | engine status |
|---|---|---|
| cold / heat | coat, parka, sun robe | **this build** — per-part clo |
| wet / wind | oilskin, cloak | **this build** — `WetMixin` + weave density |
| mechanical harm | armor, boots, butcher's glove | ✅ ships (`Construction` resist) |
| **soiling** | **apron, lab coat, overalls** | **this build** — outermost takes it |
| light into the eyes | tinted goggles, brimmed hat | ✅ `Light`/perception ships — nothing wearable uses it |
| sound | ear protection | ✅ `SenseChannel` ships — unused |
| air quality | respirator, veil | ✅ `breathableMedia` ships — unused |
| **being seen — less** | **camouflage** | ⚠ concealment reads no terrain or biome |
| **being seen — more** | **hi-vis** | ⚠ no band past `obvious` |
| identity | hood, mask | ✅ `DisguiseGarment` ships |
| carrying | belt, apron pockets, pack | ✅ `Pack` ships |
| social signal | livery, finery, lingerie | **this build** — legibility |

Worked examples:

- **Apron** — soiling, and only soiling. The purest case in the space:
  its entire reason to exist is that it is outermost and cheap. It takes
  the stain so your shirt does not. Falls out of Decision 3 for free.
- **Lab coat** — *two* channels at once, which is what makes it
  interesting: sacrificial soiling **plus** station signal. Also why it
  is white — visible soiling is the point; it advertises that you
  replaced it.
- **Hi-vis** — nowhere to go today (see Decision 10).
- **Camouflage** — the honest version is **terrain-matched**: woodland
  camo in a desert is *worse* than plain cloth. Much better than a flat
  stealth bonus, and it makes dyeing matter to somebody who is not
  shopping for looks.
- **Lingerie** — signal-only, next-to-skin, ~zero on every protective
  channel. A real and distinct point in the space, and the model needs it
  to be complete: **not everything you wear is *for* something
  physical.**

### ⚠ On adults-only content — no seam needed

Lingerie as a garment class is not adult content; it is a garment with
high signal and no protection, and every department store sells it. What
would be adults-only is **depiction**, not the existence of the point in
the space.

The architecture already answers it: a pack is a unit of review, opt-in
via `SAXONBERG_PACKS`, and may ship its own classes and content. An
adults-only pack is not a special case — it is the pack mechanism working
as designed. **So: build the full spectrum of purpose in the base chain,
author nothing that needs gating, and do not add a seam that already
exists.**

---

## Decision 9 — the social half: legibility, one brain, no kernel gauge

Everything the social half needs is already built: `belief` (per-viewer
identity memory, `describeFor`), `DisguiseGarment`
(`appearsAs`/`covers`/`masksIdentity`), `BrandedMixin` resolve-on-read,
`renown`, `regard`. The lineage slate already establishes the principle —
*"the body is public… the allocation is a social fact, not a private
optimization."*

What clothing adds is that it becomes **the highest-bandwidth honest
signal in the game.** Everything else you would read off a stranger —
renown, competence, wealth — is hidden or needs a query. Clothes are on
their body and described on sight, and after this build they carry five
real facts:

```
grade     ← staple length, carried from the field
condition ← Durable, wear-on-use
fit       ← cut for you, or for a body plan's average
colour    ← hue + fastness, fading per wash
brand     ← BrandedMixin, already resolve-on-read
```

None of them authored as a "quality" number. **A good coat signals wealth
because it cost wealth** — costly signalling that emerges from the supply
chain rather than being declared.

### ⚠ Where the line is drawn

There is a tempting third step: have the engine read your dress into a
regard or first-impression score. **Refused.**
[measurement.md](../../measurement.md)'s split is *engine
measures · subject values*, with the no-gauge reading rules. Converting an
outfit into a number the engine then applies is precisely the engine
valuing. Let people judge; the signal is legible, the verdict is not
ours.

But NPCs need something to react to, and that has a proper home: a
**brain**, in a pack, under `src/behavior/`. A shopkeeper brain deciding
*"this one's dressed like they can pay"* is content making a judgment,
not the kernel scoring you. Per-brain, per-venue, arguable, replaceable.

So the social half is: **legibility, plus `livery`, plus one demonstrator
brain, and no kernel gauge.**

---

## ⭐⭐ Decision 10 — the concealment seam (and where it stops)

Audited 2026-09-02. Concealment is in **much** better shape than the
session expected.

**What ships:** a five-band monotone scale `obvious | subtle | hidden |
deep | buried` with per-band magnitude as AppSettings dials;
`effectivePerception = capacityOf(viewer) + attention + lightConditions`;
`perceives = effectivePerception ≥ requirementFor(concealment)`; the
`awareness` Discipline (no conferrals — universally afforded, competence
only grades); passive `hintsFor` lines rendered by `LookController` on
entry, so attention is directed and you never have to type `search` to
know something is there; sneak/walk/run as a care↔speed attention axis;
`search` as a costed engaged act holding `hands` (abortable ⇒ genuinely
ambushable), broad-shallow vs narrow-deep; and per-viewer `DISCOVERY`
belief, so **once found, always seen**.

**The gap, and it is one gap on two sides:**

```
        VIEWER SIDE                          TARGET SIDE
capacity + attention + light        vs      requirementFor(getConcealment())
         ▲                                            ▲
    no equipment term                    single AUTHORED field — no worn
                                            contribution
```

⚠ Also found: `setConcealment` has **two callers in the whole tree**
(`ArmController` arming a trap, and `Exit`). **Nothing spawns anything
hidden** — concealment is authored on rows by hand, and the census-gated
magic-item distribution does not touch it.

### What textiles takes

> **`getConcealment()` becomes derive-on-read: authored base + worn
> covering contributions.**

That is *the same architectural move as `clo`*, on a different channel.
Once it exists a camo cloak contributes negatively to its wearer's
detectability and a hi-vis vest positively, with no new machinery.

| textiles takes | [search-slate](./search-slate.md) takes |
|---|---|
| target-side derive over the covering stack | viewer-side equipment term (lenses, rings, goggles, augments) |
| the conspicuity band past `obvious` | terrain / biome matching for camo |
| | spawn-hidden distribution |
| | implicit-search cadence beyond what ships |

Textiles builds the *target* half because that is a garment; it leaves
the *viewer* half alone because a magnifying glass is not clothing. The
search pass then lands on a proven, tested
derive-on-read-over-the-covering-stack pattern.

⚠ **The conspicuity band needs care.** `obvious` is a **hardcoded 0** and
the vocabulary is documented as monotone weakest→strongest. Extending
below it means either a negative-index band or rebasing the scale.
Rebasing is cleaner, and the vocabulary is small and well tested — but it
touches trap and delve content, so it is a deliberate wave, not a
footnote.

---

## Proposed wave structure

Kernel first, then packs — the metal-chain shape.

| wave | what | why here |
|---|---|---|
| **W0** | `Construction`: the covering rename + textile forms + depth | everything reads it |
| **W1** | `Garment` composes like `Armor`; the nine clothing rows gain material + form + mass | the chain needs a real terminus |
| **W2** | species `baseMass` + `stature`; the balance pass + gym run | ⚠ moves live combat/encumbrance/metabolism numbers |
| **W3** | per-part covering stack: `covers:` walk, clo derives, wet feeds it | the thermal payoff |
| **W4** | fit: derived measurements, cut-to stamp, the lineage seam | needs W2 |
| **W5** | soiling + the wash/fade loop | needs W3's stack ordering |
| **W6** | `getConcealment()` derive-on-read + the conspicuity band | the camo/hi-vis seam |
| **W7** | `trade-farming` rows: flax, cotton, madder, weld, woad | content only, existing pack |
| **W8** | `trade-textiles` pack: ret · dress · spin · weave · full + the tool ladder | the faucet |
| **W9** | `trade-leatherwork` pack: tan + the tannery as a zoned nuisance venue | parallel input; produces `hide-stock` at last |
| **W10** | `trade-dyeing` pack: dyestuffs, mordants, fastness | customer of both |
| **W11** | `trade-tailoring` pack: cut · sew · livery; the jerkin recipe leaves smithing | closes the loop |
| **W12** | content placement + the demonstrator brain | expression |

---

## Open questions

1. **Which locality gets which trade?** Terminus has a rostered `tailor`
   and 52 built rooms; Hinkley Hills is the farming locality and wants
   the dye plants; the tannery is a nuisance trade wanting industrial
   zoning and may not belong in either. This is the cosmetics slate's
   open question 9, still open.
2. **Is `dyeing` its own Discipline, or does it ride `apothecary`?**
   Cosmetics open question 1, unchanged. Extraction overlaps; a dedicated
   `dyeing` is cleaner but adds a roster row.
3. **How many dyestuffs × mordants?** Cosmetics open question 2. Three
   dyestuffs × four mordants is twelve outcomes from seven authored rows;
   the multiplicative shape is the point, the counts are not settled.
4. **Does cotton ship in stage one, or only flax + wool?** Cotton needs a
   warm biome and a gin; flax needs neither. Possibly a later crop.
5. **Does `stature` want to be a scalar or a two-axis (height × build)?**
   Fit reads better with two; every other consumer named in the lineage
   slate reads fine with one.
6. **Does felting need `full`, or is felting its own verb?** Fulling
   woven wool and felting loose fibre are different acts that share a
   mechanism (heat + agitation + moisture). One verb or two.
7. **What produces `hide` before ranching?** Leatherwork's faucet is an
   animal. Hunting? Butchery of an existing Creature? Or does
   leatherwork's left edge wait on ranching the way wool does — in which
   case W9 ships the *tannery* against imported hide.
8. **Does the conspicuity extension rebase the scale or add a negative
   index?** See Decision 10.

---

## Cross-references

**Consumed / discharged:**
[cosmetics-slate](./cosmetics-slate.md) (⭐⭐⭐ *dye is a textiles input*;
open questions 1, 2, 4 and 9 carried forward) ·
[trade-roster-slate](./trade-roster-slate.md) (`textiles` + `leatherwork`
GAP rows; `tailor`/`tanner` rostered) · [vocations.md](../../vocations.md)
(`barber / tailor`, `miller / tanner` GAPs) ·
[launch-worklist.md](../../launch-worklist.md) (the deferred tailoring
branch + its fiber-faucet condition).

**Depends on / seams with:** [lineage-slate](./lineage-slate.md) (the
body-composition budget; textiles ships the consumer, lineage the
variance) · [search-slate](./search-slate.md) (the viewer half of
detection) · [ranching-slate](./ranching-slate.md) (wool's left edge;
possibly hide's) · [zoning-slate](./zoning-slate.md) (the tannery as
industrial nuisance) · [guild-slate](./guild-slate.md).

**Shipped substrate:**
[materials-response.md](../../subsystems/materials-response.md) (`response
= f(mechanism, material, construction)`) ·
[crafting.md](../../subsystems/crafting.md) (recipes, Grade, Tool,
Durable, Crafted; `repair`/`salvage`) ·
[embodiment.md](../../subsystems/embodiment.md) +
[slot.md](../../subsystems/slot.md) (Wearable, slotClaims) ·
[thermal.md](../../subsystems/thermal.md) (clo → effective ambient) ·
[weather.md](../../subsystems/weather.md) (wetness) ·
[husbandry.md](../../subsystems/husbandry.md) +
[smallholding.md](../../subsystems/smallholding.md) (the crop faucet) ·
[fermentation.md](../../subsystems/fermentation.md) (retting's clock) ·
[concealment.md](../../subsystems/concealment.md) +
[stealth.md](../../subsystems/stealth.md) ·
[perception.md](../../subsystems/perception.md) ·
[belief.md](../../subsystems/belief.md) ·
[measurement.md](../../measurement.md) (the no-gauge rules) ·
[content-packs.md](../../subsystems/content-packs.md) (the capability
rung; `SAXONBERG_PACKS`) · [race.md](../../subsystems/race.md) +
[vitals.md](../../subsystems/vitals.md) (BodyPlan, `covers:`, baseMass) ·
[corpo.md](../../subsystems/corpo.md) (BrandedMixin).
