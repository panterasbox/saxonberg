# Object — Gus's camp chair (the relief's chair) (staging)

> **Status:** staging draft (full object spec).
> **Belongs to:** Gus, the crossing guard — except it *doesn't*. It's the
> relief's. (The EU campus-gate stop.)
> **Target seed paths:**
> - `Chair` class (the reusable sittable *kind*) → a thin `Thing` subclass
>   under `mud/obj/`.
> - `FoldingChair` class (`extends Chair`, adds `Foldable`) → the
>   collapsible variant; Gus's camp chair is one seeded *instance*.
> - Gus's specific chair (the *instance*) → a seed under
>   `mud/seeds/obj/.../camp-chair.yaml`.
> - **`Foldable` mixin** → `lib/<subsystem>/Foldable.ts` *(new capability;
>   see below for subsystem home)* + the global **fold** / **unfold** verbs
>   (`mud/cmd/{fold,unfold}.yaml` + controllers).
> **Retire when:** the `Chair` + `FoldingChair` classes, the `Foldable`
> mixin + fold/unfold verbs, and Gus's seed are cemented. Then delete.
>
> The fourth and last of Gus's props, and the only one that **isn't his.**
> The watch is endurance, the whistle the silhouette, the paddle the
> working tool — the chair is the *someday*, rendered in aluminum and
> canvas. It surfaces one new platform capability (`Foldable`) and two
> reusable furniture classes the campus will want everywhere.

A folding **camp chair** by the post — set up, clean, angled just so for
the next fellow, due any time now. Nobody has ever sat in it. Gus dusts it.

---

## The character (the spine — restated, full version in the NPC sheet)

It **isn't Gus's chair; it's the relief's.** He keeps it deployed and
spotless for the colleague who's coming to relieve him — "any time now" —
and has for forty years. It's the someday made furniture: the proof that he
believes, every day, that he'll be relieved, set up fresh each morning for a
person who never comes.

- **He won't sit in it.** It's spoken for. (Mechanically: a real sittable
  he declines — see *Postured*.)
- **A player who flops into it** gets a reaction beat (needs npc-dialogue):
  Gus allows it, deadpan, notes only that the seat is "spoken for" — never
  naming for whom — and won't make a scene. Habit, not hope.
- **The rhyme** (never announced): a player in the relief's chair is,
  unknowing, sitting in the seat of the thing Gus waits for — and *is*,
  structurally, the eventual relief (if player-jobs ever let someone take
  the post). The chair quietly rails the same someday the watch's engraving
  does. Let it sit; never point at it.

---

## Form

- A **`Chair` class** (extends `Thing`) — the reusable sittable *kind*
  (the campus will want chairs everywhere: lounge, dorms, classrooms), and
  a **`FoldingChair`** subclass (`extends Chair`, adds `Foldable`) for the
  collapsible variant. Gus's camp chair is a `FoldingChair` instance. (This
  decomposition is the honest reuse: most chairs don't fold; folding is the
  special capability. Two useful classes fall out, not one bespoke prop.)
- Composes **`Visible`** — the look.
- Composes **`Tangible`** — **aluminum frame + canvas seat** (two material
  zones; the per-detail material override is exactly what `Tangible`'s
  bulk-default-plus-overrides is for — see *Materials*).
- Composes **`Detailed`** — the **frame** and the **seat** as the two
  inspectable sub-features (`look chair.frame` / `look chair.seat`), and
  the natural carriers of the two materials.
- Composes **`Postured`** — it offers a **sit** slot; the global `sit` verb
  targets it. (Posture is shipped.)
- *(FoldingChair only)* Composes **`Foldable`** — fold/unfold state +
  verbs. New capability; see below.

---

## Postured — the sit slot he declines

`Postured` makes the chair a real **sit**-able host: the global `sit` verb
(shipped) lets an actor take its posture slot. The whole character beat
rides on the slot being *real* — Gus declining a chair nobody can sit in
would be hollow; Gus declining a chair you genuinely *can* (and do) sit in
is the bit. So:

- The slot is real and open. **A player can `sit chair`** and it works.
- **Gus never takes it** (NPC behavior — he simply never issues `sit` on
  it; his routine keeps him pacing the curb).
- The **flop reaction** (player sits) is the npc-dialogue beat above —
  degrades gracefully: until npc-dialogue ships, a player can sit with no
  comment; the "spoken for" line lands when the system does.

This is demo-real today on shipped posture — the chair is sittable now.

---

## Foldable — the new capability (content-pulls-platform)

A folding camp chair *folds*, so an honest one needs a real **`Foldable`**
capability — two states (deployed / folded) and a **fold** / **unfold**
verb pair. Per the verb rule, the verbs are **global, gated by the
`Foldable` capability** (the way `open`/`close` are gated by `Sealable`),
not minted per-object. Folded vs deployed is a real state that affects what
the thing affords: you can't `sit` a folded chair; a folded chair packs
down (smaller, carriable). It's the same shape as `Sealable`'s open/close,
applied to collapsibility.

**`Foldable` is genuinely general** — not a one-object mixin. Folding/
collapsing is everywhere the campus is headed: folding tables and cots in
the dorms, folding screens, event-setup furniture, maybe umbrellas/cots/
ladders. So it earns mixin status on its own (it supplies shared state +
behavior; the verbs stay global). *Subsystem home:* it's a furniture/
affordance capability — likely alongside the posture/embodiment furniture
work (`lib/posture/` neighbors) rather than a new subsystem; confirm the
folder when it's built, don't invent `lib/foldable/`.

**Gus's chair stays deployed forever** — he never folds it; it must be
*ready*, set up for the relief. So like the whistle's blow-model and the
watch's `set`, the capability is present-but-Gus-doesn't-exercise-it: he
performs the shape of keeping a chair without ever collapsing it. The
folded state exists; his never goes into it.

**Demo vs banked:** the chair is demo-real as a *sittable* (Postured,
shipped) the moment it's seeded. **`Foldable` is the new build** the chair
surfaces — bank it or build it with the dorm furniture; Gus doesn't need it
exercised for his beat (deployed-forever), so it's not demo-blocking.

---

## Materials (aluminum frame / canvas seat)

`Tangible`'s bulk-default-plus-per-detail-override is the exact tool: the
chair's two `Detailed` zones carry the two materials —

- **frame → aluminum**
- **seat → canvas** (woven cotton)

*Taxonomy check (the watch's brass precedent):* if `aluminum` and/or
`canvas`/`cotton` aren't yet in the material taxonomy, adding them is a
small, broadly-useful content-pulls-platform addition (aluminum especially
— it's everywhere: cans, frames, foil, vehicles). *Lean: accept the
additions* the same way we accepted `zinc`/brass for the watch. (Verify
against the actual taxonomy at build; don't assume either is present.)

---

## The pristine-chair inversion (a note for the set)

Gus's other three objects are **worn smooth at the points he touches** (the
whistle's mouthpiece, the watch's case, the paddle's grip — the worn-grip
throughline). The chair is the **inversion**: it's the one object kept
*pristine* — unworn precisely because he *won't* use it. His gear is worn by
use; the chair is spotless from devoted disuse, dusted daily, never sat in.
Same hand, opposite evidence: three objects bearing his fingerprints, one
he refuses to mark. Worth a one-line description note that plays against the
worn-grip set.

---

## What this object surfaces (build list)

- **The `Chair` class** + **`FoldingChair`** subclass (two reusable
  furniture kinds for the whole campus, not just Gus).
- **The `Foldable` mixin** + global **fold** / **unfold** verbs — new
  general capability (dorm furniture, event setups, etc.).
- *(maybe)* **`aluminum` + `canvas`/`cotton`** in the material taxonomy
  (verify; broadly useful if absent).
- Gus's seed instance + the **flop reaction** line (npc-dialogue era).

Reuses, shipped: `Thing`, `Visible`, `Tangible`, `Detailed`, `Postured`
and the global `sit`/`look`.

---

## Open dials

1. **Class decomposition** — `Chair` base + `FoldingChair` subclass (lean)
   vs a single bespoke `CampChair`. *Lean the two-class split* — the plain
   `Chair` is reused all over campus.
2. **`Foldable` subsystem home** — confirm at build (lean: with the
   posture/embodiment furniture neighbors; **not** a new `lib/foldable/`).
3. **Material taxonomy** — confirm `aluminum`/`canvas` presence; add if
   absent.
4. **Folded-state affordance details** — exactly what folding gates
   (no-`sit`, smaller bulk, carriable) — pin when `Foldable` is built.
