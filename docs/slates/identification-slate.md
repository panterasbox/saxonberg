# Identification slate (working doc)

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

- [docs/slates/recognition-slate.md](./recognition-slate.md) — the
  parallel substrate for actors. Same `PerceptionMemoryRecord`
  shape (recognition-slate calls this `RecognitionRecord` — same
  record; name to be reconciled); different keying.
- [docs/subsystems/quantities.md](../subsystems/quantities.md) —
  measurement-based identification consumes typed quantities.
- [docs/slates/verb-provisioning-slate.md](./verb-provisioning-slate.md)
  — the trigger-verb roster (`read scroll of identify`,
  `analyze`, `taste`, `learn-from-teacher`) is the verb-
  provisioning taxonomy applied to the identify-an-item verb
  family.
- [docs/subsystems/race.md](../subsystems/race.md) — Material
  substrate already carries chemistry / composition data.
  Identification reveals it.
- [docs/design-philosophy.md](../design-philosophy.md) —
  layered presentation; same pattern at the item level.
- [docs/adjoining-systems.md](../adjoining-systems.md) — this
  slate graduates the item-id thread that emerged during the
  recognition discussion.

---

## Principle

Item identification is **per-viewer memory of item classes**.

Two structural differences from actor recognition:

1. **Granularity is by class, not by instance.** Identifying
   one blue potion typically identifies all blue potions of
   the same class. The store keys by an *identification
   signature* (template + visible appearance), not by
   individual Stuff.

2. **Identification verbs are domain-specific** and varied:
   reading a scroll of identify, analyzing with an
   instrument, tasting (risky), drinking (revealing),
   learning from a teacher, observing an experiment.

Otherwise the pattern mirrors recognition: per-viewer state;
DescribeApi-shaped composition; layered presentation;
persistence requirements.

> **Naming:** the describe pipeline is being renamed `DescribeApi`
> → `PerceptionApi.describe` / `Stuff.getPresentation()` per
> recognition-slate; treat the "DescribeApi v2" references below as
> that surface.

---

## The identification store — viewer-side

```ts
interface IdentificationRecord {
  signature: IdSignature;           // class key (template + appearance)
  knownAs: string;                  // 'a potion of healing' (when identified)
                                    // 'a blue potion' (when not)
  knownAttributes: Set<string>;     // facts the viewer knows
  identificationLevel: number;      // 0..1; partial knowledge possible
  firstSeen: Timestamp;
  identifiedAt?: Timestamp;
  identifiedBy?: 'reading' | 'experiment' | 'taught' | 'experience';
  notes?: string;
}

viewer.identifiedItemTypes: Map<IdSignature, IdentificationRecord>
```

### Identification signature

The key into the store. Must distinguish "items that should be
identified together" from "items that just look similar."

```ts
interface IdSignature {
  templatePath: string;             // canonical class
  appearance: string;               // visible appearance descriptor
  // optional: context-modifiers (lab origin, magical aura, etc.)
}
```

Examples:

| Item | templatePath | appearance |
|---|---|---|
| Blue potion of healing | `/lib/item/potion/healing` | 'blue' |
| Blue potion of poison | `/lib/item/potion/poison` | 'blue' |
| Red potion of healing | `/lib/item/potion/healing` | 'red' |
| Crystal vial of acid | `/lib/item/potion/acid` | 'crystal-clear' |

A blue-potion-of-healing and a blue-potion-of-poison have the
SAME appearance but DIFFERENT templatePath — visually
indistinguishable, mechanically distinct. **Identification by
appearance alone is unreliable.** Identifying a blue potion you
encountered as healing doesn't mean every blue potion is healing.

This is the design choice that makes identification a real
gameplay (and pedagogical) feature: appearance is suggestive
but not definitive; experiment / reading / consultation reveal
true class.

### Partial identification

`identificationLevel: 0..1` and `knownAttributes: Set<string>`
support partial knowledge:

- `0.0`: completely unknown (fresh observation)
- `0.3`: some attributes guessed ("this looks like alcohol; smells
  like ethanol")
- `0.7`: most attributes known ("this is some kind of healing
  potion; not sure of the strength")
- `1.0`: fully identified

`knownAttributes` carries the specific facts known: `'flammable'`,
`'liquid'`, `'restores-health'`, `'made-by-elven-druids'`. Each
verb-trigger updates a subset.

---

## Identification triggers

The verbs that update identification state:

### `read scroll of identify`

The classic. Player reads a magical scroll on a target item;
target's full IdentificationRecord populates. `identifiedBy:
'reading'`.

### `analyze X with Y`

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

## DescribeApi v2 integration

When a viewer perceives an item, DescribeApi v2 follows a
parallel pipeline to actors:

```
1. Visibility gate (same as actor)

2. Resolve presented identity
   • check for disguise/illusion on item
   • compute presented appearance

3. Identification lookup
   • V.identifiedItemTypes.get(signature)
   • if identified (level >= threshold):
       use record.knownAs ('a potion of healing')
   • if partially identified:
       compose: appearance + known-attributes
       ('a blue potion that smells of mint')
   • if unidentified:
       use raw appearance ('a blue potion')

4. Decoration (state, ownership, condition)

5. Combine: identity + decoration → MML
```

### Examples

| State | Display |
|---|---|
| Unknown blue potion | "a blue potion" |
| Partially identified (smelled, tasted) | "a blue potion that smells minty and tastes sweet" |
| Fully identified by reading scroll | "a potion of healing (blue, lesser)" |
| Identified but disguised by illusion | "a blue potion" (illusion overrides) |

---

## Item disguise / illusion

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

## Misidentification

Two ways:

**1. False identification.** A player believes a blue potion is
healing because they identified one before, but THIS blue
potion is actually poison (different templatePath, same
appearance). The signature matches by appearance but the
template differs.

The display should reflect the player's belief, not the truth:
*"a potion of healing"* (because that's what the viewer's
record says about blue potions). The player drinks it; the
actual effect (poison) plays out; the record updates to record
"appearance is unreliable."

This is a **rich gameplay scenario** — alchemy with mimicry,
deception, the stakes of careless identification. Pedagogically
honest: real-world chemicals can look alike and behave
differently.

**2. Identification expires / decays (v2).** Long-term not in
v1 scope. `identificationLevel` could decrement over time
without reinforcement, especially for complex chemistry.

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

### Recognition slate

Sister substrate; shares the `PerceptionMemoryRecord` pattern
(or a variant). Not a hard dependency — the records can be
typed differently per-domain.

### Disguise / illusion (recognition slate, embodiment slate)

Same shadow mechanism. Wearable / Adornable / Stuff disguises
work uniformly across actors and items.

### Persistence

Same long-term-memory considerations as recognition.
Per-player; thousands of records over time; lazy hydration
recommended.

### Activity slate

`AnalyzeActivity` for instrument-based ID is a concrete
activity (engagement: `attention`, possibly `hands`). Slow
analyses (chromatography, multi-step chemistry) take time;
short ones (quick reading) might be near-instant.

---

## Open questions

1. **Identification signature shape** — `templatePath +
   appearance` is the lean. What about modifiers (lab origin,
   magical aura)? Per-content; signature could include them
   when relevant.
2. **Cross-character identification sharing** — a player's
   chemistry-class character has identified a thousand
   compounds; their adventurer character starts fresh? Lean
   per-character v1; account-level federation v2.
3. **Mimics and disguised items** — a chest-shaped item is
   actually a creature. Does identification ever reveal this?
   Probably not by appearance-match; needs interaction.
4. **Cursed items** that auto-misidentify — a sword shows as
   "a sword of light" but is actually "a cursed sword of
   draining"? IllusionOverlay handles it. Discovering the
   curse is a gameplay event.
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
8. **Identification confidence intervals** — partial level
   reflects uncertainty. Should the display say "probably a
   healing potion" vs "a healing potion"? Lean yes for
   `identificationLevel < 1.0`.
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

**Wave 1** — substrate.

- `IdentificationRecord` + `viewer.identifiedItemTypes: Map`.
- `IdentificationApi` (`identifies`, `record`, `lookup`).
- DescribeApi v2 integration for items (parallel pipeline).

**Wave 2** — basic verbs.

- `read scroll of identify` (magical full-ID).
- `examine X` (basic visual ID; bumps level a notch).
- `taste X`, `drink X`, `wear X` (experience-based).

**Wave 3** — instrument-based pedagogical analysis.

- `analyze X with Y` family.
- First instruments: spectrometer, pH-meter, hardness-kit.
- Per-instrument attribute reveal mapping.

**Wave 4** — social transmission + advanced.

- `learn from teacher` verb.
- Identification propagation between actors.
- Misidentification handling (cursed/disguised items).
- Common-knowledge defaults.

**Adjacent / future**:

- Place-memory (parallel pattern for locations).
- Identification decay (v2 memory rule).
- Partial-confidence display.

---

## What this slate does NOT cover

- **Magical scroll content / authoring** — content packages.
- **Specific instrument inventories** — content; first set
  ships alongside the Quantities substrate
  ([docs/subsystems/quantities.md](../subsystems/quantities.md)).
- **Pedagogical curriculum mapping** — which compounds in
  which courses; content-team / educational-mod concern.
- **Item economy / pricing** — based on identification but
  out of substrate scope.
- **Quest reward integration** for identification — game-
  layer.
- **Cross-account identification federation** — far-future.
