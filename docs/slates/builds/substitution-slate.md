# Substitution slate — what an ingredient is FOR

> **Status: UNBUILT.** Designed 2026-10-24 with the owner during the sugar
> build's review (MR !439). The sugar build shipped an `IngredientFamily`:
> a kernel class, a field on every Material and one row, `sweetener`. It
> did one thing, the refusal sentence *"honey is a different sweetener"*.
> The owner judged it thin, and its host wrong. **It was removed in !439,**
> and the honey sentence went with it: a recipe that wants sugar now says
> only that there isn't enough sugar.
> **Left:** the slot's job (`for:`) · job rows over properties materials
> already carry · one acceptance predicate for every slot-matching site ·
> refusals whose detail grows with the cook · the honey checkpoint back in
> the sugar drive · the assembly analogue written down · novices allowed
> to try and ruin it
> **Size:** a build, mostly kernel crafting with a content tail (about
> fifteen recipe slots)

**Sits on:** [crafting.md](../../subsystems/crafting.md) (recipe slots,
craft-resolve, the blend that derives, weakest-link grade, the by-hand
build) · [assembly.md](../../subsystems/assembly.md) (the bill, part roles)
· [materials-response.md](../../subsystems/materials-response.md) ·
[instrumentation.md](../../subsystems/instrumentation.md) (competence
resolves DETAIL, never ACCESS) · [uncertainty.md](../../uncertainty.md) ·
[advancement.md](../../subsystems/advancement.md) (bands).

## 1. The owner's framing

> *"You can't always substitute sugar for any of these — it really depends
> on the application. Knowing that seems like an attribute of the cook and
> the recipe, not the ingredient."*

So nothing about substitution lives on the ingredient. The ingredient
carries only what it physically IS. Two separate questions, two owners:

1. **Does it work, and what comes out?** That is the WORLD's question. It
   is derived, never authored pair by pair.
2. **Does the maker know beforehand?** That is the COOK's: competence.

## 2. The recipe says what each ingredient is FOR

A recipe slot today asks for an exact tag (`category: sugar`, a measure, a
`minGrade`). Sugar does different jobs in different dishes:

- it **sweetens** a mojito;
- it **grains** (crystallizes) into a loaf;
- it **preserves** a jam;
- it **feeds** a ferment.

A slot names the job it needs: `{ category: sugar, for: [sweeten] }` for
the mojito, `for: [sweeten, grain]` where it must set. A candidate fits the
slot if it carries the category tag, OR meets every job named.

- Honey sweetens, preserves and ferments, and won't grain.
- So honey makes a mojito and is refused where the sugar must set, with the
  physical reason. Nobody authored "honey ≈ sugar" anywhere.
- The sugar build already encodes the grain fact in its rows: birch syrup
  is "too much fructose to grain".

**A slot with no `for:` keeps exact-tag matching,** so nothing shipped
changes.

It is the materials-response shape again: *response = f(mechanism,
material, construction)* becomes **outcome = f(slot's job, material's
properties)**.

## 3. Jobs are rows over properties materials already carry

A job is content: `<root>/idea/craft-job/<key>`, loaded when a slot first
cites it (load on use, no catalogue). It holds:

- a short list of conditions in a **closed** vocabulary, each reading a
  field Material already has: `nutrient.<key> ≥ x` (`nutrientAmounts`),
  `tag.<x>`, `waterActivity ≤ x`, `solidsKgPerL ≥ x`, a smoke point;
- its refusal words: *"won't grain"*, *"doesn't sweeten"*.

Starter set, every one reading shipped fields:

| job | reads |
|---|---|
| `sweeten` | the sugar nutrient |
| `grain` | the sucrose tag (the material that crystallizes) |
| `preserve` | water activity |
| `ferment` | fermentable sugar |
| `fry` | a fat with a smoke point |

⚠ **The over-modeling risk** (memory: expression is inelastic). The job
vocabulary stays small. A job that would need a NEW material property must
argue for it. A dish's character is the blend's business, not a job's.

## 4. What comes out is physics, not a penalty table

- **The blend already derives the output from its inputs.** A honey mojito
  tastes of honey, with no new code.
- **Weakest-link grading already prices a poor input.**
- No arbitrary "substitute penalty". If a substitute makes a worse dish,
  that should be a property showing through the blend, or the job saying
  no.

## 5. What the cook knows: competence resolves detail, never access

Anyone may TRY honey where the sugar must set. The world refuses it
honestly, with no dice (`uncertainty.md`: never roll what your action did).
Competence buys foresight, read as the cook's band in the recipe's
discipline (the `LyeStrength.eggWords(band)` shape):

- **untrained:** *"You haven't got what this needs."*
- **trained:** names the job: *"Honey won't grain — it'll never set."*
- **master:** also names what would do: *"Cane sugar would. Maple wouldn't
  either."*

The refusal is the progression UI: it exists for everyone, and its detail
grows with the cook.

**Open (a later step):** a novice allowed to try anyway and RUIN the batch,
and learn from the ruin (the transcript records the attempt), instead of
being stopped at the door. It needs a craft outcome that is a failed
product, which crafting does not have today.

## 6. Where this lands in the code (survey, 2026-10-24)

Five sites compare a slot's `category` against a material's tags:

- `CraftingLogic.pickCandidate` (bulk) and `pickItemInputs` (item);
- `CraftingLogic.buildSatisfies` (the by-hand build). Its contributions
  carry tags only and would need the material path;
- `trade-cooking`'s `PreserveController`;
- `trade-forestry`'s `RiveController` (wood; stays exact).

All of them call one acceptance method on the slot (the recipe's value
shape). 193 recipe files; the categories where substitution matters are a
handful: sugar 3, honey 3, syrup 4, fat 5, milk 4, lime-juice 6. The
assembly categories (wood 64, forgeable 36, metal 24) stay exact.

## 7. Crafting and assembly — one idea

- **Assembly mostly has it already.** A bill part has a `role`
  (structural, edge, seal…). A part made of a different material simply
  BEHAVES differently through materials-response and wear: a bronze edge
  works and dulls sooner. Nothing is refused; the consequence is physical.
  Write that down as the same doctrine, already shipped.
- **Crafting is the gap,** because its slots match exact tags. A slot's
  job is the crafting twin of a part's role: a predicate over material
  properties.

## 8. Lens pass

1. **Pedagogy:** what substitutes for what is derivable from what the
   ingredient has and what the dish needs. That is what a cook actually
   learns.
2. **Creative expression:** an author writes `for:` on a slot and gets
   substitution with no code. A new job is a row.
3. **Immersion:** the refusal names a physical reason, never a game rule.
5. **Continuity:** a beet sugar or a saccharin later answers the same
   jobs, with no recipe edits.
6. **Economy:** substitution is what makes honey a real competitor to
   sugar, which it historically was. The sugar trade gets a price ceiling
   set by the beekeepers.

## 9. The checkpoint that left the sugar drive

The sugar requirements' drive step 10 said: *"Honey offered instead is
refused, and the refusal says honey is a different sweetener."* It returns
as two observable steps:

- honey **sweetens** a mojito and is accepted;
- honey is **refused** where a job needs grain, with the reason in words.
