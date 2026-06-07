# Object — Gus's STOP paddle (staging)

> **Status:** staging draft (full object spec).
> **Belongs to:** Gus, the crossing guard (the EU campus-gate stop).
> **Target seed paths:**
> - `Paddle` (or `StopPaddle`) class (the reusable *kind*) → a thin `Thing`
>   subclass under `mud/obj/` *(like the watch, whistle, and biome
>   instruments — a thin content class; exact home TBD).*
> - Gus's specific paddle (the *instance*) → a seed under
>   `mud/seeds/obj/.../stop-paddle.yaml`.
> - **No new verbs.** It's wielded via the global wield/look surface; it
>   carries no command of its own.
> **Retire when:** the class and Gus's seed are cemented in code/YAML.
> Then delete.
>
> The crossing guard's working tool — the thing in his hand. The watch is
> the deepest-mined object, the whistle the iconic-worn one; the paddle is
> the one Gus **handles most.** It's the center of his idle loop (raise,
> check both ways, "…clear," lower) and he polishes it on his sleeve. So
> it's modest by design — but it's his constant companion, and it carries
> the bit: he raises it at traffic that never comes.

A handheld **octagonal STOP paddle** — a red stop-sign on a stick, the
kind a school crossing guard holds up. Well-worn: the red gone matte, the
reflective sheeting crazed at the edges, the grip polished smooth by forty
years of the same hand.

It is real and built **because it's his** — the most iconic crossing-guard
object there is, part of the silhouette alongside the whistle. It does no
mechanical work; it doesn't need to.

---

## Form

- A thin **`Paddle` class** (extends `Thing`) — the reusable *kind*; Gus's
  is one seeded *instance*. (Thin content classes are precedented — the
  watch, the whistle, the biome instruments.)
- Composes **`Visible`** — the look.
- Composes **`Tangible`** — **one molded plastic piece** (sign + handle,
  not two materials). The worn grip is description, not a second layer.
- Composes **`Wieldable`** — held in the hand slot; he raises and lowers
  it. This is the only body-side affordance it needs.
- Composes **`Detailed`** — the **face** (the STOP octagon / lettering) and
  the **reflective sheeting** (see below). Both purely visual.
- **No carried command, no new mixin.** Unlike the watch (`wind`/`set`) and
  whistle (`blow`), the paddle carries no verb. It's wielded and looked at
  through the global surface; that's all it does.

---

## STOP only (locked) — never SLOW

Real crossing paddles are double-sided: red **STOP** octagon / yellow
**SLOW** diamond, with a flip between them. Gus's paddle is **single-faced,
STOP only** — and not to dodge a `flip` verb. It's character: **Gus never
lets the imaginary traffic merely *slow*.** It's always a full stop, full
ceremony, both-ways-checked, c'mon-across. A SLOW side he'd never turn to is
a side that shouldn't exist on *his* paddle. So: no flip state, no flip
verb, one face. (If a *player* traffic-paddle ever wants the STOP/SLOW
flip, that's a clean little stateful object — spec it then, for that one.)

---

## Does not block movement

The paddle is **theatrical, not a barrier.** Raising it does not stop
anyone from crossing — there is no mechanical movement-gate on it. This is
deliberate and consistent across Gus:

- The **soft-wall** down University Avenue (the deferred-city haze) is
  enforced by *dialogue / in-character refusal*, not by the paddle.
- "Build because we like it, no manufactured function" — the paddle doesn't
  need to mechanically stop people to justify existing. He raises it at
  traffic that never comes; the player walks past it; that's the joke and
  the small ache, and a movement-block would *ruin* both.

So the paddle has zero gameplay-restriction behavior. It is wielded, raised
in the routine, looked at, polished. That's the whole object.

---

## The reflective sheeting (`Detailed`, visual only — and why)

The face carries **retroreflective sheeting** as a `Detailed` sub-feature
you can `look` at — "scuffed reflective sheeting, the red gone matte and
crazed at the edges." It is **purely visual; it is *not* wired into
`LightApi`,** and we deliberately do not pretend it is.

**Why we don't simulate retroreflection** (the honest call): `LightApi` is
a **scalar field**, not a ray tracer. It answers *how much* light reaches a
point (`lightAt`), *what band* that is (`bandAt`), and *can this viewer
see* at that band (`canSee` / `perceivedBand`) — per-location and
per-viewer, but with **no geometry of beams or angles.** Retroreflection is
*entirely* that missing geometry: it bounces light back toward its source,
so whether it "lights up" depends on the source→surface→eye angle. To
realize it you'd need directional sources and viewer-relative angles the
engine doesn't have and shouldn't grow for one paddle. Bolting on a fake
"it glows when there's a light source nearby" would be exactly the
flavor-pretending-to-be-a-system fake we don't ship. So the sheeting is a
real, look-able, described Detail — and honestly nothing more.

**The one honest hook, if ever wanted (banked, unbuilt):** the thing the
scalar model *could* support isn't retroreflection — it's **low-light
legibility**: an object that stays visible at a band where ordinary things
have gone dark (a lower `canSee` threshold). That's the gameplay essence of
high-vis material and it fits the model cleanly. But Gus stands at a lit
stop — there's no dark scene where it matters — so per "don't manufacture
function," for *his* paddle it's description, not behavior. If a
night-traffic paddle (a player guard directing traffic in the dark) ever
wants it, that's the honest minimal shape; spec it then. Banked like the
whistle's blow-model, not faked now.

---

## The worn-grip throughline

Gus's whole kit is **worn smooth at the exact points his body touches** —
the whistle's mouthpiece rubbed down to raw brass, the watch's
well-thumbed case, and the paddle's grip polished by forty years of the
same hand closing on the same spot. Same motif as the watch's "worn by the
body." It's the quiet evidence of how long he's stood this post — three
objects, each carrying the fingerprint of one unchanging routine. Worth a
consistent one-line note in each object's description; it reads as a set.

---

## What this object surfaces (build list)

Almost nothing new — the paddle is the *cheap* one, and that's fine.
Content doesn't have to pull platform every time.

- **The thin `Paddle` class** (+ Gus's seed instance).
- *(shared, not new)* `Thing`, `Visible`, `Tangible`, `Wieldable`,
  `Detailed`, and the global wield/look surface.
- *(banked, unbuilt)* **low-light legibility** as a perception-threshold
  property — only if a night-traffic paddle ever wants it.

No new verb, no new mixin, no material additions (molded plastic is
available), no light-system work.

---

## Open dials

1. **Class name** — `Paddle` vs `StopPaddle`. *Lean `Paddle`* (the kind is
   "a sign-on-a-stick"; STOP-only is this instance's content).
2. **Reflective-sheeting wording** — committed above as flavor; dial freely.
3. *(deferred to a player paddle, not this one)* the STOP/SLOW flip state +
   verb, and the low-light-legibility behavior.
