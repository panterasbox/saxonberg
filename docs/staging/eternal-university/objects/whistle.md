# Object — Gus's whistle (staging)

> **Status:** staging draft (full object spec).
> **Belongs to:** Gus, the crossing guard (the EU campus-gate stop).
> **Target seed paths:**
> - `Whistle` class (the reusable *kind*) → a thin `Thing` subclass under
>   `mud/obj/` *(like the watch and the biome instruments — a thin content
>   class; exact home TBD).*
> - Gus's specific whistle (the *instance*) → a seed under
>   `mud/seeds/obj/.../whistle.yaml`.
> - The **blow** verb → `mud/cmd/blow.yaml` + `mud/obj/command/BlowController.ts`
>   *(carried by the whistle, like the watch carries `wind`/`set`).*
> **Retire when:** the `Whistle` class, Gus's seed, and the `blow` verb are
> cemented in code/YAML. Then delete.
>
> **Why this doc exists in full even though most of it isn't demo scope:**
> the whistle is built because it **belongs on Gus** — it's what you'd see
> on any crossing guard, part of the silhouette — *not* because it has a
> job to do. We are explicitly not manufacturing a function to justify it.
> But the moment you build an honest whistle, the *act of blowing one*
> opens a genuinely rich, multi-system model (sound × breath × skill) that
> pays off the future **player whistle** (guards, refs, signalers). That
> model is worth preserving even though it needs subsystems that aren't
> built. So: the object is demo-real; the blow model is designed-and-banked.

A brass **referee's pea whistle on a boot-lace cord**, worn at the neck.
Old, like everything Gus carries — nickel plating worn down to raw brass
at the mouthpiece where decades of thumbs have rubbed it. Not the modern
plastic pealess kind; the vintage one with a cork pea inside that gives the
trill.

It is real, honest, and built **because it's his** — even if no verb ever
fires on it the whole demo. The dishonest version would be a flavor-only
string in his description pretending to be a template. This is the actual
object.

---

## Form

- A thin **`Whistle` class** (extends `Thing`) — the reusable *kind*;
  Gus's is one seeded *instance*. (Thin content classes are precedented —
  the watch and the biome instruments are thin `Thing` subclasses.)
- Composes **`Visible`** — the look.
- Composes **`Tangible`** — made of **brass** (the worn nickel plating is
  description, not a second material layer in v1). Brass = the `zinc` +
  brass-alloy additions the **watch** already surfaced for the material
  taxonomy; this is a second consumer of the same small addition, not a new
  cost.
- Composes **`Wearable`** — worn at the neck on its cord (see *The slot*).
- Composes **`Detailed`** — the **cork pea** inside (see *The pea*).
- **Carries the `blow` verb** (object-carried command, like the watch
  carries `wind`/`set` and `Thermometer` carries `measure`). No mixin
  grants `blow`; the whistle carries it.

---

## The slot (worn, not pocketed)

It hangs on a cord around the neck, so it claims the **neck slot** — the
same `Wearable` slot an amulet uses. That's just where it physically sits,
so carried/worn logic (and the watch's "protected by being carried" safety)
applies.

**Capacity (locked):** the neck slot has **capacity > 1** — a cord and a
chain coexist; a whistle and an amulet do **not** compete for it. (Single-
capacity would have forced whistle-vs-amulet exclusivity, which is wrong:
in reality a guard wears a whistle lanyard *and* a necklace at once —
different layers.) For Gus it's moot
— the whistle is his only neck item (his watch rides a *vest* chain, not
the neck). But the moment player-guards carry a whistle **and** an
enchanted amulet, you'll want both to fit. The slot subsystem already
supports per-slot capacity (incl. `UNBOUNDED_CAPACITY`); this is a body-plan
authoring call, not new code.

---

## The pea (`Detailed`)

A **cork pea** rides loose in the chamber — the literal reason a pea
whistle *trills* instead of toning. It's a real `Detailed` sub-feature
(`look whistle.pea`) and it's the honest physical cause of the sound, which
matters once the sound subsystem can ask *why* this emitter sounds the way
it does (a pea whistle vs a pealess one vs a tone whistle are physically
different sources). Worn-smooth brass + a swollen old cork pea is also why
*this* whistle's blast is a touch rough — character in the timbre.

**Locked: keep.** It's cheap (one Detail), it's the genuine cause of the
trill, and it's a nice "why does it sound like that" hook for the sound
work landing now.

---

## Does Gus blow it?

Yes — but as **character, not mechanism.** His idle loop already carries
*"a single short whistle now and then, 'to keep it sharp,' for no one."*
The man who runs crossing drills for traffic that never comes also blows a
whistle nobody needs. The whistle isn't built *so* he can blow it; he blows
it because it's in character, and we build it because it belongs on him.
Both true; neither justifies the other.

For Gus the blast is a **fixed, clean, canned** output — he's a pro, ~110
dB sharp, no modulation. He never signals with it (no traffic to signal);
it's an ambient flourish in the empty-routine loop. None of the
blow-modulation model below applies to him. It's all for the **player
whistle.**

---

## How loud (honest numbers)

This is the README's "honest numbers" promise made literal, and the sound
slate (requirements live, planner running) is the substrate.

- A real brass **pea whistle** is roughly **104–116 dB at 1 m.**
- Gus's is old, mouthpiece worn smooth — call the source **~110 dB.**
- That's a real SPL the sound substrate carries: loud enough to be a true
  event in a room, and **propagation (sound phase 2)** attenuates it over
  distance — a whistle down the avenue arrives faint in the haze.

So the whistle ships with an actual number, not "it's loud."

---

## The blow model — object × breath × skill *(designed, mostly banked)*

The key question — *does skill or vitals change the dB?* — forces the right
model, which is a clean three-way split:

| Layer | Sets | Owned by | System needed |
|---|---|---|---|
| **Ceiling** | the max SPL (~110 dB) — the whistle's physics: pea size, bore. You *cannot* blow it louder than it can ring. | the **object** | sound (landing now) |
| **Power** | *where under the ceiling you land.* A winded, gassed character can't drive 110 dB — they get a feeble ~70 dB wheeze. Breath/stamina is the throttle. | the **blower's vitals** | a **stamina/exhaustion** model (slated, unbuilt) |
| **Control** | *quality + pattern.* A novice gets a weak chirp; an expert gets the full clean blast and eventually **patterned** blasts (short-short-long = a real signal). | the **blower's skill** | a **skill** model (slated, unbuilt) |

Read it as: **`emitted_dB = object_ceiling × f(breath) × g(skill)`**, where
breath scales the magnitude and skill scales the cleanliness/controllability
(and unlocks multi-blast signal patterns at the top end).

**Exhaustion, specifically** (the part worth preserving even pre-build):
blowing hard is *work* — a full-power blast costs breath/stamina, repeated
blasts cost more, and a depleted character's blasts degrade (quieter,
rougher, can't sustain). That ties the whistle into whatever vitals model
lands: it's a small, concrete, honest consumer of a stamina pool — exactly
the kind of forcing-function spec a vitals slate wants. A guard who's been
blowing the whistle all shift can't summon the same blast as a fresh one.

**None of this is demo scope.** It needs sound (landing) + a stamina model
+ a skill model. For the demo the whistle exists, is look-able, is worn, is
honest brass, and Gus blows his fixed ~110 dB flourish. The
breath/skill/exhaustion modulation lands when those systems do — and *this
doc is the spec telling them what the whistle needs from them.*

---

## What this object surfaces (build list)

Content-pulls-platform — a crossing guard's neck forced/reinforced all of
this:

- **The `blow` verb** — object-carried; for Gus a canned blast, for players
  the modulated one above.
- **The thin `Whistle` class** (+ Gus's seed instance).
- **Sound emission + SPL** — the whistle is an emitter with a real source
  dB; propagation/attenuation is sound phase 2. *(Sound slate, landing.)*
- **Stamina/exhaustion model** — the breath throttle + the cost of blowing.
  *(Vitals slate; the whistle is one concrete consumer.)*
- **Skill model** — control/quality + signal-pattern unlocks at the top.
  *(Skill slate; far future.)*
- *(shared with the watch)* **`zinc` element + brass alloy** in the
  material taxonomy.
- **Neck-slot capacity > 1** on the body plan (whistle + amulet coexist).

Reuses, no new mixins: `Thing`, `Visible`, `Tangible`, `Wearable`,
`Detailed`, plus the carried-command mechanism the watch + instruments
already establish.

---

## The player whistle (why the model is worth banking)

Gus only needs the inert version. But the moment the game has **guards,
referees, signalers** — anyone whose job is to make a loud, deliberate,
*meaningful* noise — the player whistle is a fully-specced, ready object:
honest SPL, breath-gated power, skill-gated control and signal patterns.
The crossing guard's charming useless whistle is the design prototype for a
genuinely useful tool. That's the whole content-pulls-platform thesis in
one prop: we built it because it's Gus's, and it handed us a real
mechanic for free.

---

## Open dials

1. **Neck-slot capacity** — *locked: >1* (whistle + amulet coexist).
2. **The cork pea** — *locked: keep* as a `Detailed` sub-feature.
3. **Cord material** — boot-lace (leather) vs cotton lanyard. Cosmetic;
   *lean leather boot-lace* (matches the worn-brass vintage).
4. **Source dB default** — ~110; tunable, cosmetic.
5. **Signal patterns** — the set of recognizable multi-blast signals
   (one-long = stop, two-short = go, etc.) is skill-model-era; sketch later.
