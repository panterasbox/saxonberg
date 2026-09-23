# Identification slate (working doc)

> **Status: PARTIAL** — the `IDENTIFICATION` belief realm,
> `IdentifiableMixin` and the scroll-carried `identify` shipped 2026-06 →
> [belief.md](../../subsystems/belief.md)
> **Left:** the instrument seam that WRITES to belief (`analyze X with
> Y` — the readout verb exists, the identification write doesn't) ·
> appearance-keying (one template, many appearances) · the
> experience/social ID verbs (`taste`/`drink`/`wear`, `learn from
> teacher`, `compare`) · item illusion / mimic disguise · place-memory
> · common-knowledge defaults · identification as quest reward ·
> forced-identification-by-ownership · cross-character sharing
> **Size:** a build

> ⭐⭐ **This slate is the *epistemic* half of a pair, and the other half
> already shipped.** The [wiki's reveal
> model](../../subsystems/wiki.md#-what-reveal-does-not-answer--appetite-is-not-epistemics)
> answers **appetite** (*does this reader want to be spoiled?* — a
> preference, one click) and **capability** (*is this reader allowed?*).
> Neither answers ***does this character know this***, and nothing else
> does either: there is no per-viewer knowledge state over world facts,
> no way to earn a measurement, and no way to be **wrong** about one.
> That is what this slate is for. ⚠ The two are complements — **a
> collapse toggle is not a lock, and a lock is not knowledge** — and the
> live failure mode is mistaking one for the other (a surface printing a
> `spoiler: 1` density is *not* leaking a secret; level 1 is collapsed,
> never forbidden). Until this lands, "what a player knows about oak" is
> a **UI preference**, not a fact about anybody.

Working slate for item identification — the parallel of
recognition for *items* rather than *actors*. A blue potion is
"a blue potion" until identified; thereafter it's "a potion of
healing." The same memory-of-perception pattern, with two key
differences from actor recognition: identification keys by
**item class**, not individual instance, and the trigger verbs
are domain-specific (read scroll of identify, analyze, taste,
drink, learn-from-teacher).

The pedagogical seam runs deepest here. Identifying a chemical
compound by experiment IS science.

See also:

- [docs/slates/tails/magic-items-slate.md](../tails/magic-items-slate.md) —
  the **orthogonal axis**. This slate is item *identity* (class-level,
  deductive: "a blue potion" → "healing"); that one is *BUC* (per-instance:
  blessed/uncursed/cursed as potency). Both ride belief; different facts,
  different keys. The magic-items slate also holds the NetHack catalog map.
- [docs/slates/recognition-slate.md](../tails/recognition-slate.md) — the
  parallel substrate for actors. Same `PerceptionMemoryRecord`
  shape (recognition-slate calls this `RecognitionRecord` — same
  record; name to be reconciled); different keying.
- [docs/subsystems/quantities.md](../../subsystems/quantities.md) —
  measurement-based identification consumes typed quantities.
- [command-routing.md § Affordance attribution](../../subsystems/command-routing.md)
  — the trigger-verb roster (`read scroll of identify`, `analyze`,
  `taste`, `learn-from-teacher`) is the identify verb afforded by
  different source objects (scroll, instrument, palate, teacher). Each
  source is a different class landing through `pushCommandSource`; the
  source object decides how the reveal renders.
- [docs/subsystems/race.md](../../subsystems/race.md) — Material
  substrate already carries chemistry / composition data.
  Identification reveals it.
- [docs/design-philosophy.md](../../design-philosophy.md) —
  layered presentation; same pattern at the item level.
- [docs/adjoining-systems.md](../../adjoining-systems.md) — this
  slate graduates the item-id thread that emerged during the
  recognition discussion.

---

## Identification triggers

The verbs that update identification state:

### `analyze X with Y`

⚠ **Overlaps the instrumentation slate.** The platform ships a generic
`analyze`/`measure` readout verb family today (`analyze chemistry`,
`measure acidity`, `measure density` — real numbers off the Material
substrate), but as pure READOUTS: they write nothing to the
`IDENTIFICATION` belief realm. This section's design is *the write* —
an instrument reveal that also updates what the viewer knows about the
item's class — which the shipped `analyze` verb does not do. The
instrument SHAPE (the verb, its subcommands, the real-chemistry
backing) is the instrumentation slate's; kept in both, see this batch's
ledger.

Use a scientific instrument:

- `analyze potion with spectrometer` — full chemical
  composition (consults `Material.composition` from race.md).
- `analyze sword with crystal-of-truth` — magical properties.
- `analyze food with palate` — taste / quality.

Each instrument identifies a subset of `knownAttributes`. The
spectrometer reveals chemistry; the crystal-of-truth reveals
enchantments; the palate reveals taste.

This is the **pedagogical seam** in action — the spectrometer
is a real instrument, returns real composition data from the
Material substrate.

### `taste X` (risky)

Taking a small sample; reveals taste-related attributes;
exposes the player to side effects (poison, etc.).
`identificationLevel` increment partial.

### `drink X` / `eat X` / `wear X`

Full-experience identification. You find out what it does by
using it. `identificationLevel: 1.0` after; `identifiedBy:
'experience'`.

### `learn from <teacher>`

Social identification. A teacher / scholar / merchant explains.
The teacher's identification propagates to the learner's record.
`identifiedBy: 'taught'`.

### `compare X to Y`

If Y is identified and X is similar, partial identification
transfers. *"This looks like the blue potion of healing I
remember, but the smell is different."*

---

## Item disguise / illusion

⚠ **The proposed mechanism is likely the wrong shape.** This describes
an item-side `IllusionOverlay` as a *shadow* on the presented identity —
the same shadow-based design belief.md explicitly rejects for creature
disguise (*"disguise is NOT a shadow on the synthesizer — it's
`getPresentation` deferring to `getDisguise`"*). No item-illusion code
exists at all yet (belief.md: *"the masking mechanism supports
item-identity illusion by design but no illusion content ships"*), so
this is genuinely unbuilt — kept, but whoever builds it should design
against the creature precedent's baseline-defers-to-a-resolver shape,
not this section's shadow.

Same Wearable-shadow pattern as actor disguise. An item can
have an illusion overlay that overrides its presented appearance:

```ts
class IllusionOverlay extends Disguise(Thing) {
  appearsAs: 'a blue potion';
  appliesToFeatures: ['appearance', 'smell'];
}
```

While the overlay is active on a target, viewers see the
illusion's appearance instead of the true. Identification is
gated — you can't identify what you can't perceive correctly.

Dispel illusion (verb / item) removes the overlay; subsequent
perception lookups reveal the true item, which the viewer may
now identify.

---

## The pedagogical seam

This is where identification is most pedagogically rich.

### Chemistry: the experiment IS the identification

```
> add phenolphthalein to solution
The solution turns pink.

> analyze solution
Solution is alkaline (pH > 8.2 from indicator response).

> [Identification record updated: solution.attributes = {alkaline}]
```

Real chemistry. The pH indicator turns pink in basic solutions.
The framework doesn't fudge — it returns the right indicator
response based on actual modeled molarity (race.md material
composition + acid/base data).

### Biology: dissection / observation

```
> examine specimen
Six legs, three body segments, one pair of compound eyes,
membranous wings.

> classify specimen
Family: Apidae (bees). Possibly genus Apis.
[Record: known as 'a honeybee', knownAttributes: {hymenopteran,
 social-insect, makes-honey}]
```

Biology curriculum: real taxonomic keys. The student practices
classification using real morphological criteria.

### Physics: instrument readings

```
> measure distance to star with parallax-instrument
Parallax angle: 0.769 arcsec.
Distance: 1.30 parsecs (4.24 light-years).
[Record: star = Proxima Centauri, distance: 1.30 pc]
```

Real astronomy. The instrument exposes real numbers; the
student uses real techniques.

### Geology: mineral identification

```
> test mineral with hardness-kit
Scratches glass; isn't scratched by quartz. Mohs ~7.

> analyze color
Color: pale yellow, vitreous luster.

> measure density of mineral
2.65 g/cm³.

[Identification: quartz; possibly citrine variety. Confirmed
 with another test or reference.]
```

Real geology. Standard mineral-identification pipeline.

The framework's job is to expose **real properties** from the
Material substrate so that real-world identification techniques
work. The pedagogical seam isn't an extra feature — it's the
*default behavior* of analyzing items.

---

## What this stresses for existing slates

### Material substrate (race.md)

Already carries the right shape — `composition`, `chemistry`,
`tags`, etc. Identification queries this data directly. No
changes needed; the substrate is forward-compatible by design.

### Quantities slate

Measurement-based identification consumes `Quantity<T>` values
(pH, density, refractive index, etc.). Already aligned.

### Activity slate

`AnalyzeActivity` for instrument-based ID is a concrete
activity (engagement: `attention`, possibly `hands`). Slow
analyses (chromatography, multi-step chemistry) take time;
short ones (quick reading) might be near-instant.

---

## Open questions

1. **Identification signature shape** — resolved differently: v1 keys
   on the item's `templatePath` alone (belief.md § Identification);
   **appearance-keying** (one template, many appearances — a blue vs.
   red potion of the same class) explicitly **defers**, still open.
   Modifiers (lab origin, magical aura) remain unaddressed either way.
2. **Cross-character identification sharing** — a player's
   chemistry-class character has identified a thousand
   compounds; their adventurer character starts fresh? Lean
   per-character v1; account-level federation v2.
3. **Mimics and disguised items** — a chest-shaped item is
   actually a creature. Does identification ever reveal this?
   Probably not by appearance-match; needs interaction.
4. Cursed items that auto-misidentify resolved, shipped — **not** by
   `IllusionOverlay` (unbuilt) but by `payload.believedName`: a cursed
   identify plants a false-but-plausible name naming a different real
   thing; discovering the curse is finding out the belief was wrong
   (magic-items.md § `knownAttributes`, and the hedge).
5. **Knowledge transfer between players** — Bob teaches Mara
   that blue potion is healing. Mara's record updates with
   `identifiedBy: 'taught'`. Knowledge can be wrong if Bob's
   was wrong.
6. **NPC identification of items** — NPCs have the same
   store; behavior layer reads it (a merchant prices items
   based on what they've identified).
7. **Forced identification** by ownership — picking up a
   sword auto-identifies its name? Or just by holding /
   wielding? Lean: holding doesn't ID; wielding for a turn
   does (you feel its weight, balance).
8. Identification confidence intervals resolved differently, shipped —
   there is no continuous confidence level to display; instead a
   **generation stamp** hedges a stale belief (*"a blue potion — you
   once knew blue to mean healing"*) rather than a probability
   ("probably a healing potion" phrasing doesn't apply). See
   magic-items.md § `knownAttributes`, and the hedge.
9. **Identification of *places*** (place-memory) — a parallel
   case. Defer; the pattern extends naturally if we want.
10. **Pedagogical-seam pacing** — how long do `analyze X with
    Y` activities take? Per-instrument, per-target. Author
    choice.
11. **Identification as quest reward** — completing a quest
    grants identification of related items. Just a verb that
    adds records to the player's store.
12. **Common-knowledge items** — basic things (water, dirt)
    auto-identified for everyone. A `commonKnowledge`
    flag on the IdSignature triggers default-identified.

---

## Build order

**Wave 2** — basic verbs (partially shipped: `read scroll of identify`
shipped as the binary `IdentifiableMixin` trigger; `examine X` did not
ship as a level-bumping visual-ID step — `examine` is now a plain `look`
alias with no identification effect).

- `taste X`, `drink X`, `wear X` (experience-based).

**Wave 3** — instrument-based pedagogical analysis.

- `analyze X with Y` family.
- First instruments: spectrometer, pH-meter, hardness-kit.
- Per-instrument attribute reveal mapping.

**Wave 4** — social transmission + advanced (misidentification handling
shipped — see Open Questions #4 — the rest remains open).

- `learn from teacher` verb.
- Identification propagation between actors.
- Common-knowledge defaults.

**Adjacent / future**:

- Place-memory (parallel pattern for locations).

---

## What this slate does NOT cover

- **Magical scroll content / authoring** — content packages.
- **Specific instrument inventories** — content; first set
  ships alongside the Quantities substrate
  ([docs/subsystems/quantities.md](../../subsystems/quantities.md)).
- **Pedagogical curriculum mapping** — which compounds in
  which courses; content-team / educational-mod concern.
- **Item economy / pricing** — based on identification but
  out of substrate scope.
- **Quest reward integration** for identification — game-
  layer.
- **Cross-account identification federation** — far-future.
