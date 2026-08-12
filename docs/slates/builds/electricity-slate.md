# Electricity slate (working doc) — the `shock` channel + conduction

> **Status: sketch / pre-requirements.** A design pass, not a spec.
> Authored 2026-07-15 as the prerequisite subsystem for the **Lightning**
> frontier noun in
> [capability-magic-slate.md](../deferred-rpg/capability-magic-slate.md)
> Part IV — but built for its *own* sake: electrical hazards, stun
> weapons, and electrocution are worth having whether or not magic ships.
> Refined the same day through a design interview; the north star is an
> **honest model that yields a dynamic runtime of emergent strategies (+
> coolness)** — the NetHack / Dwarf-Fortress / Larian lineage, except we
> get the interactions from *real physics*, not element-tags, so ours is
> deeper and **learnable**.
>
> **Scope — real circuit *physics*, resolved the medium's way, and a hard
> stop there.** IN: a `shock` channel, electrical conductivity + potential
> as real properties, Ohm's-law resolution, **conduction-spread**, the
> vitals cardiac coupling, demonstrator sources, legibility. OUT —
> **explicitly not this build:** power/circuits *as infrastructure*,
> current-flow-over-wires, a grid, devices-that-draw-power; and **AC vs DC**
> (a real distinction — AC fibrillates, DC throws — but a v1 non-goal). The
> temporal model is **event-triggered + reconcile-on-read sustain** (§3):
> contact fires one discrete resolution; a *persisting* circuit becomes a
> "being-shocked" condition that integrates exposure lazily on read (the
> harm-bleed idiom) — **never** a ticking power sim. This is the medium's
> native grain (metabolism/thermal/harm), not a fight with it.

See also:

- [../../subsystems/materials-response.md](../../subsystems/materials-response.md) —
  supplies the **channel vocabulary** `shock` joins; but note (§2)
  electricity **resolves by Ohm's law, not the layered energy-attenuate
  fold.**
- [../../subsystems/harm.md](../../subsystems/harm.md) /
  [../../subsystems/vitals.md](../../subsystems/vitals.md) — the `inflict`
  door + the trauma/condition model; electricity finally **drives the
  undriven `heartRate` death seam.**
- [../../subsystems/perception.md](../../subsystems/perception.md) — the
  **`Audible` `AudienceGather`-over-a-graph** walk conduction-spread reuses.
- [../../subsystems/bulk.md](../../subsystems/bulk.md) — water pools as the
  **conductive medium** (the gem).
- [../../subsystems/thermal.md](../../subsystems/thermal.md) — Joule heating
  (the electricity→fire **stretch** coupling).
- [inquiry-slate.md](./inquiry-slate.md) — **electricity is the flagship
  inquiry domain**: Ohm's law is quite possibly the cleanest discoverable
  law in physics; a multimeter is just `analyze` revealing the numbers.
- [../../subsystems/quantities.md](../../subsystems/quantities.md) — new
  `V` / `A` / `Ω` / `S/m` units (the vitals-unit precedent).

---

## §1 — The honest core: Ohm's law + potential difference

The harm is **current** (amps) through the body, and the current is
**Ohm's law**: `I = V / R` — the *voltage across you* ÷ the *resistance of
your path*. **It is the current that hurts, not the voltage** (the famous
misconception this model gets to correct — static shock is thousands of
volts and harmless; the wet outlet is far fewer volts and kills, because
of the current it drives through a low-resistance path).

And a shock only happens when you **bridge two points at different
potential** — not merely "touched something live." This was a deliberate
granularity call (settled by *honest + emergent both pointing the same
way*): modeling **potentials** rather than a "path-to-ground" shortcut is
what makes the counterintuitive, teachable cases *true and discoverable* —

- **bird on a wire** — both feet at one potential, no voltage across it, no
  current;
- **the electrician's one-hand rule**, **insulated boots**, **two wires at
  the same potential are safe / at different potentials are lethal** —

each is emergent counterplay that falls out of modeling potentials, not a
scripted rule. This replaces the vague "energy attenuates through
conductivity" framing of the first draft.

## §2 — The `shock` channel + the material properties

`shock` joins the closed `Channel` vocabulary (`lib/material/Channel.ts`) —
so it's *delivered*, *resisted*, and *fails tissue* through the same
materials-response surface. **But its resolution is a circuit, not the
mechanical energy-attenuate fold:** "resistance" for shock means **series
resistance in the current path** (insulation adds it, conductive contact
removes it), and the outcome is `I = V / R_path`. Don't force it into the
covering-stack subtraction — the covering stack instead *contributes
resistances* to the path.

Two real `Material` properties carry it (grounded `Quantity`s, the
hardness/toughness siblings; values are content):

- **`electricalConductivity: Quantity<'S/m'>`** — metal high, **salt water
  > fresh** > wood > rubber/air ≈ insulator.
- **potential** — a *runtime* state a source imposes on things it drives
  (a live wire holds its nodes at V; ground = 0; most things float).

**The armor inversion falls out for free:** plate is a low-resistance path
→ near-zero protection *and* it spreads the current across your body;
leather/rubber is series resistance → real protection. Same channel,
honest physics, metal betrays you.

## §3 — Conduction-spread (the soul)

A shock does **not** hit one target — current flows through the
**conductive-contact graph**, reusing the **`Audible` gather pattern**
exactly: source → walk the graph → collect `(victim, current-through-them)`
pairs → an `inflict(shock)` per victim.

- **nodes/edges** — two things are linked when *in contact* (containment /
  surface / **co-immersion in a conductive medium**) *and* the contact
  conducts; each edge carries a resistance from its materials.
- **the drive** — the source imposes a potential; **current flows toward
  ground** through the connected component, **dividing** by each path's
  resistance (Ohm's/Kirchhoff, tunable). A victim's harm = *the current
  that actually passes through them*.
- **grounding** — the room's **modeled `Floor` is the ground node** (reuse
  what's there); standing on it grounds you *unless* an insulator breaks the
  path (rubber boots, a wooden/insulating floor, a mat). Break your path and
  no current flows through you, live wire or not.

Water is the star: a bulk pool (`Floor` surface-bulk) is one conductive
node-set — everyone in it is bridged.

**Temporal model — event-triggered + reconcile-on-read sustain** (the
medium's grain, settled). "Discrete vs continuous" is a false binary here:

- **Contact = an event.** Stepping into the live pool / touching the wire /
  a baton landing fires the conduction walk **once**, resolving the circuit
  against the graph *as it stands at that instant* (the `inflict` /
  `Audible.emit` precedent).
- **A persisting circuit = a condition that reconciles on read.** If the
  circuit stays closed (still in the water; tetany won't let you release the
  wire), a **"being-shocked" condition** integrates exposure (current × time)
  **lazily on read** — the harm-bleed idiom, presence-frozen — until the
  circuit breaks (you leave, the source dies, someone pulls you free). No
  tick, no current-over-wires.
- **Tetany closes the loop** — "can't let go" *sustains the circuit*, so the
  reconcile keeps accruing until contact breaks. The honest horror is
  self-sustaining, driven by the reconcile you already have.

## §4 — The vitals coupling

Lethality is cardiac/nerve, not the burn — and current thresholds are real,
banded, honest:

- **perception** (a tingle) → **let-go / tetany** (mid current: a
  `paralysis` condition that *prevents release* — increases exposure, the
  real horror, and a weaponizable **disarm**) → **fibrillation** (high
  current disrupts `heartRate` → arrest → **drives the undriven death seam**,
  `setCauseOfDeath('electrocution')`).
- **burns** — local `burn` trauma at entry/exit contact sites.
- harm scales with **current × contact time**; a discrete pulse carries an
  implicit duration (grip/tetany extends it).

## §5 — Usage: the emergent experiences (why honest pays off)

The v1 target is *dynamic runtime + emergent strategy*, and the emergence
comes from electricity's **honest couplings** to systems we already have —
the Larian move, but physics-deep and learnable instead of tag-shallow.
What falls out with zero scripted interactions:

- **Chain lightning is just conduction** — a spell/hazard injects current at
  a point; the graph spreads it. Single-target and chain are the *same*
  effect; the *situation* decides. Nobody authors "it arcs to the next guy."
- **The caster obeys their own physics** — cast into a pool you're standing
  in and *you* fry. Magic-reflects-real-science means no self-immunity;
  positioning is a real skill (the honesty flagship).
- **Conduction is faction-blind** — the current doesn't know your allies.
  Lightning into a melee hits friends in the same water → coordination
  ("get out of the water!"), and in a public space it's the consent/blame
  vector (electrify a tavern floor, a bystander drops — the combat
  blame-ledger / crime seam).
- **Electricity is the anti-armor tool** — the plate knight who shrugs off
  your blade is the *most* vulnerable; real rock-paper-scissors, with real
  defender counterplay (insulate, stay dry, break the ground path).
- **Residuals = the impulse/modifier split** — a *bolt* is impulse
  (fires, done); a *lingering electrified field* is a modifier (sustained,
  drains mana, drops under anti-magic suppression).

## §6 — The couplings, and the v1 cut

Emergence = how many honest couplings we wire; we can't lay down all of
physics at once. **Locked v1 cut:**

| Coupling | v1? |
|---|---|
| **water** — conductive medium, spreads current | **v1 (core)** |
| **wet skin lowers your resistance** (~100×) | **v1 (core)** |
| **materials** — metal conducts / rubber insulates (armor inversion) | **v1 (core)** |
| **ground** — the room's `Floor` as the drain + grounding counterplay | **v1 (core)** |
| **thermal — Joule→fire** (current heats water, ignites gas/oil) | **stretch** (bridges the Fire noun) |
| cold→ice, humidity, hand-chains | deferred |

Water + wet-skin + materials + ground are irreducible — without them there
is no chain, no inversion, no counterplay, and no honest answer to *why*
water is deadly (wet skin dropping resistance is the real reason, more than
the pool being a medium). Joule→fire is the first stretch (the bridge to
cross-element combos — oil-on-water ignition).

**Weather is the natural driver for wet-skin** (rain → everyone wet → an
outdoor fight becomes an electrocution hazard for free). Electricity and
[weather](../tails/weather-slate.md) want to be neighbours; weather ships just
before this, so the coupling is cheap to light.

## §7 — The v1 demonstrable vertical (sources)

Magic is deferred, so the flashy `Create·Lightning` **cannot** be the v1
demo — v1 must prove the whole substrate with **mundane sources**. The cut:

- **The hazard vertical (primary)** — a **flooded room with a downed live
  wire** (the GlassAlley precedent — a reachable one-off room). It teaches
  the whole model with no combat and no magic: the pool bridges everyone in
  it, the `Floor` grounds you, insulated boots / a dry step save you, wet
  skin damns you, metal on your body betrays you. This is the demonstrable
  deliverable requirements should anchor on.
- **The stun baton (combat toe-hold)** — a `Wieldable` that delivers `shock`
  on hit; low-lethal, exercises tetany/disarm, proves the combat path.
- **(optional) an electric eel** — a creature source, if a second
  demonstrator is cheap.

**Chain lightning, the caster-in-the-graph, and faction-blind friendly fire
all arrive *free* when magic lands** — `Create·Lightning` is just one more
source imposing a potential into the same graph. v1 builds the substrate;
magic cashes the flashy usage later.

## §8 — Presentation & legibility (by precedent, not re-litigated)

The presentation pattern is settled across every subsystem: **real
`Quantity` V/A/Ω/S·m underneath, banded on top, numbers on measurement.**
The **multimeter is `analyze`** revealing volts/amps/ohms; Ohm's law is a
**discoverable law via the inquiry loop** (measure V, measure your
resistance wet vs dry, predict I, verify). Plus: pips render the armor
inversion (a steel breastplate near-empty on the shock column); a live-ness
cue (hum/ozone) and a path-to-ground read; own-insulation legible, a
hazard's live-ness opaque until probed (banding-is-presentation).

## Key architectural moves (the decisions)

1. **Channel vocabulary, but circuit resolution.** `shock` uses
   materials-response's channel surface; it resolves by **Ohm's law
   (`I = V/R`)**, with the covering stack *contributing series resistances*
   — **not** the mechanical energy-attenuate fold.
2. **Full potential-difference, not path-to-ground.** Model potentials on
   things (bird-on-a-wire true) — chosen because honesty *and* emergence
   both point there.
3. **Conduction = the `Audible` gather-walk** over a conductive graph with a
   ground sink; current divides by path.
4. **Event-triggered + reconcile-on-read sustain.** Contact fires one
   resolution; a persisting circuit is a "being-shocked" condition
   integrating on read (the harm-bleed idiom) — never a ticking power sim.
   The medium's grain. (Supersedes the earlier "discrete pulse" framing.)

## Resolved (this pass)

- **v1 demonstrable vertical** = the flooded-room + live-wire **hazard**
  (primary) + a **stun baton** (combat toe-hold); mundane sources, magic
  usage deferred (§7).
- **Temporal model** = event-trigger + reconcile-on-read sustain (§3).
- **Ground** = the room's modeled `Floor`; insulator breaks the path (§3).
- **Wet skin** pulled into v1 core; **weather/rain is its driver** (§6).
- **AC vs DC** = explicit v1 non-goal (scope blurb).

## Open questions (requirements-carryable)

- **Current-division fidelity** — full Kirchhoff-ish division by
  path-resistance vs. a simpler "near the source ⇒ big share, far ⇒ small"
  tunable. *(Lean: simple division + dials; upgrade if a consumer needs it.)*
- **Contact-graph reach** — containment + surface + shared pool is v1;
  hand-chains, damp-not-pooled floors, humidity are stretch.
- **`inflict` integration** — the walk computes current-through-victim →
  `resolveTrauma(shock, current)` → burn/cardiac bands, *skipping* the
  covering-stack fold (resistance already in the walk). Confirm the wiring.
- **Salt vs fresh** water conductivity — cheap teachable if Material values
  carry it.
- Deferred hard: power/circuits/devices, current-over-wires, the electricity
  economy — a *separate, later* build if ever.
