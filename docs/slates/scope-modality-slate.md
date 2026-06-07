# Slate — modality-scoped resolution & feasibility validation

> **Status:** slate (design captured, build deferred-until-pulled).
> **Surfaced by:** the timepiece + crossing-log work at the EU bus stop
> (`docs/staging/eternal-university/objects/{pocket-watch,crossing-log}.md`).
> A `tally` verb that reads a timepiece, and an `eat` that has to cope with
> food in bags (and food in outer space), forced the general model out.
> **Touches:** MQL (`docs/subsystems/mql.md`), command-routing
> (`command-routing.md` — validators, the scope try-list, cardinality),
> perception (`perception.md`), light/containment (`light.md`,
> `collections.md` — the Boundary substrate, transparency).
> **Sequencing:** documented now, built when the first verb genuinely needs
> modality-correct scope (see *Sequencing* at the bottom). This is a
> "content pulls platform" foundation, parallel to how the watch surfaced
> the world-clock as its own subsystem.

---

## The premise

Today, "what object does this verb act on?" is answered loosely — a scope
try-list finds a reasonable nearby match for bare input, and that's mostly
fine. But two questions broke the looseness open:

1. **Can `tally` read a watch sealed inside a *clear* case?** (Yes — reading
   is sight; you read through glass.)
2. **Can `eat` reach a cake in an unsealed bag? What about a cake in outer
   space named via explicit MQL?** (Bag: yes. Outer space: no — even though
   MQL happily *resolves* the reference.)

Both collapse to one principle the engine doesn't currently model
first-class: **a verb's target scope is defined by the action's *modality*,
and container boundaries are permeable *per modality*.** And a second
principle the first one exposes: **resolution and feasibility are different
layers** — MQL resolves references widely; the *verb* must validate that the
resolved target is actionable, assuming nothing.

---

## Principle 1 — modality-scoped scope, per-modality permeability

Every verb resolves its target over a scope set by *how the action reaches
the world*:

| Modality | Verbs | Container boundary is permeable when… |
|---|---|---|
| **sight** | `look`, `read`, `tally`, `scry` | the boundary is **transparent** (clear case passes; opaque blocks; a shut hunter lid is a tiny opaque box) |
| **reach** | `eat`, `get`, `wield`, `put`, `give` | the container is **open / unsealed** and in possession/range (open bag passes; sealed bag blocks) |
| **audible** | `listen` | sound crosses per the sound substrate (phase 2) |
| *(ESP / emote)* | emotes | magic channel — out of scope; emotes ignore physical gating by design |

It's **one scope-walk** at every container boundary asking the same
question — "can this modality cross here?" — and answering with the
modality's permeability rule. Light for sight; open/sealed for reach. The
shut watch lid, the opaque pocket, and the sealed bag are *the same case*
(boundary blocks the modality); the clear case, the open bag, and the
wall-clock-across-a-lit-room are *the same case* (boundary passes).

### The scope logic is used two ways

The modality+permeability walk is **one primitive, two call sites:**

1. **Enumerator** — "find the reachable cakes / visible timepieces." Powers
   the scope try-list (bare `eat cake` finds the nearby one) and feeds the
   cardinality policy when there's more than one.
2. **Predicate / validator** — "is *this specific* resolved target
   reachable/visible to this actor now?" Runs on whatever was handed in,
   **regardless of how it was specified.**

Same walk; once to enumerate candidates, once to gate the chosen one.

---

## Principle 2 — resolution ≠ feasibility (you can't assume anything)

- **Resolution (MQL)** answers *"what does this reference point to?"* and is
  deliberately **wide** — permission tiers, cross-scope reach, online
  providers. You can name a cake in outer space from Narnia and MQL will
  resolve it. Resolving means *valid reference*, not *valid action*.
- **Feasibility (the verb)** answers *"can THIS actor do THIS to THAT, from
  here, now?"* — reach, sight, sealed boundaries, distance, is-it-even-food.
  MQL does **not** do this and must not be assumed to have.

**The scope try-list is a convenience default for unqualified input — not a
guarantee.** Explicit MQL bypasses it and can point anywhere permission
allows. So the **per-verb feasibility validator is the contract.** Without
it, `eat <explicit-mql-pointing-at-the-moon>` sails through.

Validators **return a reason, not a boolean** — because the **prose lives
there.** "It's sealed in the bag" / "you can't reach that" / "that's not
food" are different reasons → different diegetic lines, emitted via the
response-envelope `ctx.note({ kind, reason, detail }) + Scene.send` path.
The controller has to *know why* it's infeasible to say the right thing.

### The corrected pipeline

```
MQL resolves a reference (could be anywhere, subject to permission)
  → verb's feasibility validator gates it against the actor's
    MODALITY scope + per-container permeability, assuming nothing
    → on failure: a reasoned, located, diegetic Note (prose)
    → on success: controller acts (containment-agnostic; optional
      "take it out of the bag first" is action-side flavor, not required)
```

The grammar gives you reach *and the ability to overreach*; the validator
makes overreach fail gracefully instead of letting you eat the moon.

---

## What this needs built (the surface)

- **Modality as a first-class scope axis on verbs.** A verb declares the
  modality its target resolves over (`reach` for eat/get; `sight` for
  look/read/tally). Likely an extension of the YAML view + the scope
  try-list, not a new subsystem.
- **Per-modality container permeability in the scope-walk.** Crossing a
  container boundary consults the modality's rule (transparent? open?).
  Reach-into-open-containers may largely exist for `get`; the modality
  parameterization + sight rules are the new part.
- **Transparent containers.** A container whose wall passes *sight* (glass
  case, display dome) — you perceive the contents without reaching them.
  The light substrate already has the boundary pieces (`Window`, `Conduit`,
  glass) for *light* crossing a boundary; this applies the same idea to a
  *container's* wall for *perception of contents*. Likely the biggest gap.
- **Per-verb feasibility validators** that run the modality walk as a
  predicate on the resolved target and emit reasoned Notes. Extends the
  existing validator machinery; the key behavioral change is *never assume
  resolution pre-filtered.*

### Likely already-there vs. gap (verify at planning)

- **There / partial:** the scope try-list, MQL's viewer-aware perception
  (`via` augmentation, permission tiers), reach-into-open-containers for
  `get`-family verbs, the validator + cardinality machinery.
- **Gap / new:** modality as an explicit per-verb axis; per-modality
  permeability at boundaries; **transparent containers** (sight-through);
  the hard resolution-vs-feasibility discipline (validators that assume
  nothing about MQL's output).

---

## Consumers (why it's foundational, not a clipboard appendix)

- `tally` (sight-scoped timepiece read; the immediate trigger)
- `eat` / `get` / `put` / `give` / `wield` (reach-scoped; sealed-container
  gating, the cake-in-a-bag and cake-in-outer-space cases)
- `look` / `read` / `scry` (sight-scoped; transparent containers, the
  wall-clock-across-the-room case)
- eventually the whole verb surface — every verb that takes a world target
  has a modality and benefits from the resolution-vs-feasibility split.

---

## Sequencing — "on its own, or wait until we need it?"

**Document now (this slate); build when pulled.** The model is banked so
that whenever a verb needs modality-correct scope, the design is ready to
graduate to requirements → plan. It doesn't have to ship as one big change:

- **Reach modality first** is the broadest, most-reused slice (eat/get/put/
  give) and needs only open/sealed permeability — much of which may exist.
- **Sight modality + transparent containers** rides naturally with the
  **timepiece work** (`tally` reading a visible watch / wall clock / clear
  case). The clear-case is the forcing function for transparent containers.
- **The resolution-vs-feasibility discipline** is cross-cutting and worth
  landing as a stated rule the moment *any* verb starts accepting explicit
  MQL targets, so overreach is handled from day one.

Trigger to graduate: the first verb whose correctness genuinely depends on
modality-scoped resolution. Today that's `tally` (sight) and a real `eat`
(reach) — both EU-bus-stop-adjacent, neither demo-blocking on its own.

---

## Open questions

1. **Modality vocabulary** — is it just sight / reach / audible, or a richer
   set? Does "reach" subsume "in-possession" vs "in-range" as sub-cases?
2. **Where modality is declared** — verb YAML field? a property of the
   target-slot in the command spec? Pin with the command-routing owner.
3. **Transparent container model** — a boolean `transparent` on the
   container, or a typed boundary (reusing the light `Conduit`/`Window`
   substrate)? Lean: reuse the boundary substrate rather than a flat flag,
   so one notion of "see-through boundary" serves light and perception.
4. **Validator factoring** — feasibility as a generic per-modality validator
   the dispatcher applies from the verb's declared modality, vs. hand-rolled
   per controller. Lean: generic, driven by the declared modality, so
   controllers stay feasibility-thin.
