# Patina design pack — the thing that gets better because you used it well

> **Status: design, planner-ready, captured 2026-08-11. Not requirements.**
> The stewardship pillar has **no mechanic for anything improving.** Every axis
> in it is degradation — `Durable` wears, `Keen` dulls, food spoils, rooms soil
> — so care only ever *resists loss*. This pack adds the missing positive half,
> which the [doctrine](../../stewardship-doctrine.md) explicitly asks for and
> nothing delivers.

See also: [stewardship-doctrine](../../stewardship-doctrine.md) (**the line
this closes**) · [crafting](../../subsystems/crafting.md) (`Durable`, `Keen`,
`Graded`, the repair economy) · [glob](../../subsystems/glob.md) (⭐
`globIdentity` — the identity half, already solved) ·
[chattel](../../subsystems/chattel.md) (per-instance ownership + chain of
title) · [retail](../../subsystems/retail.md) (the used-goods market) ·
[vocations](../../vocations.md) (the appraiser — a listed GAP) ·
[hearth-and-larder](./hearth-and-larder-design-pack.md) (the pan is the
worked example) · [room-condition](./room-condition-design-pack.md) ·
[household](./household-design-pack.md).

---

## Part 0 — The gap, stated from the doctrine's own words

> *"Care is rewarded through capability, relationship, and **the thing
> enduring** — never through avoiding a decay bill."*

Mechanically, **avoiding the decay bill is currently the only thing care does
to an object.** Capability lives on the *character* (the Discipline);
relationship lives in [pets](./pets-slate.md). An object's best possible
outcome today is *unchanged*.

> ⭐⭐⭐ **A cast-iron pan does not merely fail to rot. It gets better.** So
> does a broken-in boot, an oiled handle, a maintained edge, a played
> instrument. The pillar models none of it, and that absence is why care reads
> as defensive rather than generative.

**This is the third reward the doctrine names and the only one with no
mechanism.**

---

## Part 1 — ⭐⭐ The mechanism: patina is the CYCLE, not the act

The obvious implementations are both wrong. **Use-count** is a grind. **A care
counter** lets you polish an untouched pan to greatness. The honest rule is
that neither alone does anything:

| What you did | Result |
|---|---|
| **Use without care** | wear only — the shipped `Durable` path, unchanged |
| **Care without use** | ⛔ **nothing.** You cannot season a pan you never cooked in |
| ⭐ **Use, then care** | wear resisted **and patina accrued** |

> **Patina requires the cycle: use → care → use → care.** It cannot be farmed,
> because the ingredient it needs is *having actually done the work*.

That single rule is the anti-grind guard, and it makes the *existing*
maintenance verbs — `repair`, `sharpen`, and whatever the larder's oiling
verb turns out to be — do double duty instead of needing new ones.

⭐ **And it compounds honestly:** a seasoned surface is a *protective* layer,
so patina **slows future wear.** That is true of real cast iron and real
passivation, and it means care pays forward rather than merely holding the
line.

---

## Part 2 — ⭐⭐ What it buys: failure modes removed, never power added

⚠ **The trap is making patina a stat bonus**, which is both a grind treadmill
and a power-creep vector. The corpus already rules on this for people —
competence *"buys precision and access, never a multiplier"* — and the same
rule transfers to objects:

| Object | What patina removes |
|---|---|
| a seasoned pan | **sticking** — a cooking failure outcome disappears |
| a broken-in boot | **blisters** — a condition avoided |
| a familiar blade | **variance** — outcomes tighten, the mean does not move |
| an oiled handle | **slipping** — a fumble mode closed |

> ⭐ **Patina narrows the distribution; it never moves the ceiling.** A
> seasoned tool is not stronger. It is *reliable*, and reliability is what a
> craftsman actually values.

⚠⚠ **And the direction matters: patina is a band ABOVE baseline, never a
penalty below it.** A new pan must work perfectly well. If unseasoned gear is
*bad*, the early game becomes a slog and every new purchase feels like a
downgrade — which would invert the whole point.

---

## Part 3 — ⭐⭐⭐ Identity: the glob substrate already solves this

A patinated object must stop being interchangeable with a shop copy. That
needs **no new machinery** — [glob](../../subsystems/glob.md) already keys
fungibility on `globIdentity` fields, and **the precedent is already in the
doc**: `Coin` carries `tarnished: { globIdentity: true }`, so a tarnished coin
will not merge with a clean one.

> **Mark the patina field `globIdentity: true` and fungibility breaks by
> construction.** A seasoned pan cannot merge with a new one, cannot be
> silently swapped, and is a *particular object* forever after.

And [chattel](../../subsystems/chattel.md) already gives every instance a
durable id and a chain of title — so a patinated object **already has a
recorded history**. The emotional payoff of the pillar (*"the thing
enduring"*) is one field away from being real.

⭐ This is also what makes the object **yours** in a sense the game can
actually check: not a label, but a state no other copy shares.

---

## Part 4 — Two quality axes, different authors

`GradedMixin` already carries an ordinal `gradeBand` set at craft time. Patina
is **not** an extension of it, and keeping them separate is the point:

> **Grade is what the MAKER gave it. Patina is what YOU gave it.**

Different provenance, different meaning, and both persist. Which produces a
genuinely interesting purchase decision that no single axis could:

| | New | Used |
|---|---|---|
| **`fine` grade, no patina** | expensive, perfect, characterless | — |
| **`fair` grade, deep patina** | — | ⭐ cheaper to make, better to *use* |

**Do you buy the better-made new one, or the well-loved old one?** That is a
real question with no dominant answer, and it is the foundation of the
used-goods market.

### ⭐ It inverts depreciation, which is the economic payoff

A seasoned tool is **worth more than a new one** — true of cast iron, violins,
and boots, and false of almost everything else in a game economy. That gives
[retail](../../subsystems/retail.md)'s second-hand trade a reason to exist
beyond "cheaper," and it gives the **appraiser** (a listed
[GAP](../../vocations.md) whose gate is *"a certified instrument"*) something
genuinely hard to assess: you can see *that* a pan is seasoned, but not *how
well*, which is the information-asymmetry family's exact test.

---

## Part 5 — Not everything takes it: a material property

Patina is **material-determined**, and the closed Material set takes one more
field — the same move the [mana pack](./mana-economy-design-pack.md) made
(*a field, not a new material*):

| Takes patina | Does not |
|---|---|
| iron & steel (seasoning, passivating oxide) · leather (moulds) · wood (polishes, absorbs oil) · brass & copper (oxide layer) | glass · ceramic · most fabric · rope · stone |

⭐ That keeps the feature **bounded by the material library** rather than
sprawling across every item, and it means an author gets patina by choosing a
material honestly rather than by opting in.

---

## Part 6 — Designed to the format

**1–2. What it is / composition.** One **mixin** carrying an accrual band, one
**material field** gating who can have it, and a **`globIdentity` flag**. No
new subsystem, no new Api.

**3. New / updated surfaces.**

| | Work | State |
|---|---|---|
| ⭐⭐ **`SeasonedMixin`** | the accrual band + the use-then-care rule; `globIdentity: true` | **new — the whole feature** |
| ⭐ **`takesPatina` material field** | which substances can accrue it | **new (a field on the closed set)** |
| ✳ **Maintenance verbs accrue** | `repair` / `sharpen` / oiling check "used since last care?" | **update to shipped verbs** |
| ✳ **Failure-mode reads** | cooking stick, blister, fumble, variance consult the band | **wire into existing outcome rolls** |
| ✳ **Wear slowed by patina** | the compounding term | **update to `Durable`** |
| ✳ **Appraisal** | patina depth is assayable, not readable | **rides the appraiser GAP** |

**4. Verbs & affordances.** ⭐ **No new verbs.** Patina rides the maintenance
verbs that already ship — which is the strongest argument for the cycle rule,
since it needs no player-facing addition at all.

**5. Persisted fields.** The accrual band, on the mixin, `globIdentity`-marked.

**6. Seams & dependencies.** **None hard.** `Durable`, `Keen`, `Graded`, glob
and chattel all ship. It reads better alongside
[hearth-and-larder](./hearth-and-larder-design-pack.md) (the pan is the
exemplar) but does not wait on it.

**7. Fault line.** ⭐ **This is buildable on shipped substrate with no
designed-but-unbuilt dependency** — rare in the stewardship family, and the
main argument for doing it early.

---

## Part 7 — ⚠ Dangers

**1. The grind.** Guarded by the cycle rule (Part 1): care without use accrues
nothing.

**2. Power creep.** Guarded by variance-not-mean (Part 2). ⚠ Every consumer
must be checked against this individually — the temptation to add "+1" at each
call site is exactly how the rule erodes.

**3. ⚠⚠ Loss aversion.** A patinated object hurts far more to lose, which
raises the stakes on theft, fire and destruction. Three guards: patina is
**earned by doing** (replaceable in kind, never unique-forever); the
anti-hoarding rule still bites (*holding more than you can steward is
negative-sum*); and **ordinary use must never destroy it** — only neglect or
catastrophe.

**4. ⚠ New gear feeling bad** (Part 2) — the direction of the band is
load-bearing and easy to get backwards.

**5. Patina as a second condition bar.** If a player has to *watch* it, it has
become a chore. It should be discovered by using the thing, mentioned when it
crosses a band, and otherwise silent.

---

## Part 8 — Pedagogy

- ⭐⭐ **Passivation** — that an oxide layer *protects* rather than damages is
  real chemistry (aluminium, stainless, copper), deeply counterintuitive, and
  the direct explanation for why patina slows wear.
- **Polymerisation** — seasoning cast iron is oil turned into a bonded solid
  film, not "oil left on the pan."
- ⭐ **Appreciation vs depreciation** — when does a used thing gain value?
  Almost never, and the exceptions are informative.
- **The maker's quality vs the user's care** (Part 4) — two independent
  contributions to one object, which is a real way to think about anything
  made and then lived with.

---

## Interop map

- **[Crafting](../../subsystems/crafting.md)** — `Durable`/`Keen` supply the
  wear axis this is the counterpart to; `Graded` is the other quality axis.
- **[Glob](../../subsystems/glob.md)** — `globIdentity` is the identity
  mechanism, already proven by `Coin.tarnished`.
- **[Chattel](../../subsystems/chattel.md)** — per-instance id + chain of
  title; a patinated object already has provenance.
- **[Retail](../../subsystems/retail.md)** — the used-goods market this makes
  interesting.
- **[Vocations](../../vocations.md)** — feeds the **appraiser** GAP.
- **[Hearth & larder](./hearth-and-larder-design-pack.md)** — the seasoned pan
  is the exemplar; the larder is where it will first be felt.
- **[Doctrine](../../stewardship-doctrine.md)** — closes the third reward.

---

## Open questions

1. ⭐ **The name.** `SeasonedMixin` / `PatinaMixin` / `WornInMixin`. *Lean:
   `SeasonedMixin`* — the most general real term for the phenomenon across
   iron, wood and leather, and it collides with neither `Durable` nor `Keen`.
   Worth a moment, since this is a long-lived surface.
2. **Is patina banded or continuous?** `Grade` is ordinal-categorical and
   `Durable.condition` is a scalar, so both precedents exist. *Lean: banded* —
   it is presentation-facing, and a band resists being read as a stat.
3. **Does patina survive a repair?** A reforged blade is arguably a new object.
   *Lean: major repair resets, minor maintenance accrues* — which gives
   `repair` a real cost it currently lacks and makes "should I fix it or
   replace it" a genuine question.
4. **Can patina transfer with ownership, or is it bonded to the holder?**
   *Lean: it stays with the object* — it is a property of the thing, and a
   heirloom that arrives already seasoned is a much better story than one that
   resets.
5. **Should a *place* take patina?** A well-kept workshop, a much-used kitchen.
   Tempting, and it would connect straight to property condition — but it
   risks becoming a second room gauge.
   [room-condition](./room-condition-design-pack.md) already warns about that.
   *Lean: objects only, for now.*
